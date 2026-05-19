drop policy if exists "Permitted staff can read emergency notes" on public.emergency_notes;
create policy "Permitted staff can read emergency notes"
on public.emergency_notes for select
to authenticated
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.staff_assignments sa
    join public.group_assignments ga on ga.profile_id = emergency_notes.profile_id
    where sa.user_id = auth.uid()
      and sa.role in ('staff', 'mentor', 'emergency_staff', 'viewer')
      and sa.main_group = ga.main_group
      and (
        (sa.role = 'mentor' and sa.subgroup = ga.subgroup)
        or (sa.role <> 'mentor' and (sa.subgroup is null or sa.subgroup = ga.subgroup))
      )
  )
);

create or replace function public.can_view_emergency_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin(auth.uid())
    or exists (
      select 1
      from public.staff_assignments sa
      join public.group_assignments ga on ga.profile_id = can_view_emergency_profile.profile_id
      where sa.user_id = auth.uid()
        and sa.role in ('staff', 'mentor', 'emergency_staff', 'viewer')
        and sa.main_group = ga.main_group
        and (
          (sa.role = 'mentor' and sa.subgroup = ga.subgroup)
          or (sa.role <> 'mentor' and (sa.subgroup is null or sa.subgroup = ga.subgroup))
        )
    );
$$;

create or replace function public.get_staff_access_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  is_admin_user boolean := public.is_admin(auth.uid());
  assignments jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'is_admin', false,
      'assignments', '[]'::jsonb,
      'roles', '[]'::jsonb,
      'can_view_staff', false,
      'can_mark_attendance', false,
      'can_view_emergency', false,
      'read_only', true
    );
  end if;

  select coalesce(jsonb_agg(to_jsonb(sa) order by sa.created_at), '[]'::jsonb)
  into assignments
  from public.staff_assignments sa
  where sa.user_id = auth.uid();

  return jsonb_build_object(
    'is_admin', is_admin_user,
    'assignments', assignments,
    'roles', coalesce((select jsonb_agg(distinct role) from public.staff_assignments where user_id = auth.uid()), '[]'::jsonb),
    'can_view_staff', is_admin_user or exists (
      select 1 from public.staff_assignments where user_id = auth.uid() and role in ('staff','mentor','viewer')
    ),
    'can_mark_attendance', is_admin_user or exists (
      select 1 from public.staff_assignments where user_id = auth.uid() and role in ('staff','mentor')
    ),
    'can_view_emergency', is_admin_user or exists (
      select 1 from public.staff_assignments where user_id = auth.uid() and role in ('staff','mentor','emergency_staff','viewer')
    ),
    'read_only', (not is_admin_user) and not exists (
      select 1 from public.staff_assignments where user_id = auth.uid() and role in ('staff','mentor')
    )
  );
end;
$$;
