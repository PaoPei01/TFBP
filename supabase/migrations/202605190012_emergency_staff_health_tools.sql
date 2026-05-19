create or replace function public.is_emergency_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_assignments
    where user_id = uid
      and role = 'emergency_staff'
  );
$$;

create or replace function public.save_emergency_note(
  input_profile_id uuid,
  input_note text,
  input_needs_special_care boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_note jsonb;
begin
  if not (public.is_admin(auth.uid()) or public.is_emergency_staff(auth.uid())) then
    raise exception 'health tools access required';
  end if;

  if not public.can_view_emergency_profile(input_profile_id) then
    raise exception 'emergency profile access required';
  end if;

  select to_jsonb(en) into old_note
  from public.emergency_notes en
  where en.profile_id = input_profile_id;

  insert into public.emergency_notes (profile_id, note, needs_special_care, updated_by, updated_at)
  values (input_profile_id, input_note, input_needs_special_care, auth.uid(), now())
  on conflict (profile_id) do update
  set note = excluded.note,
      needs_special_care = excluded.needs_special_care,
      updated_by = auth.uid(),
      updated_at = now();

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (
    input_profile_id,
    auth.uid(),
    'emergency_note_updated',
    coalesce(old_note, '{}'::jsonb),
    jsonb_build_object(
      'note', input_note,
      'needs_special_care', input_needs_special_care,
      'health_tools_role', case when public.is_admin(auth.uid()) then 'admin' else 'emergency_staff' end
    )
  );
end;
$$;

grant execute on function public.is_emergency_staff(uuid) to authenticated;
grant execute on function public.save_emergency_note(uuid, text, boolean) to authenticated;
