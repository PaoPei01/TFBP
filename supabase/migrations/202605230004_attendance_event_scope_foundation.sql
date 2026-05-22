alter table public.staff_attendance_sessions
  add column if not exists event_id uuid references public.events(id) on delete set null;

create index if not exists staff_attendance_sessions_event_id_idx
on public.staff_attendance_sessions (event_id);

create or replace function public.default_event_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.events where slug = 'entaneer-bonding-69' limit 1;
$$;

update public.staff_attendance_sessions
set event_id = public.default_event_id()
where event_id is null
  and public.default_event_id() is not null;

create or replace function public.create_staff_attendance_session(input_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_row public.staff_attendance_sessions;
  target_event_id uuid := coalesce(nullif(input_data->>'event_id', '')::uuid, public.default_event_id());
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  insert into public.staff_attendance_sessions (
    event_id, title, description, session_type, target_scope, main_group, subgroup,
    role_filter, starts_at, ends_at, late_after, status, qr_token, qr_expires_at, created_by
  )
  values (
    target_event_id,
    nullif(btrim(input_data->>'title'), ''),
    public.clean_placeholder_text(input_data->>'description'),
    coalesce(public.clean_placeholder_text(input_data->>'session_type'), 'check_in'),
    coalesce(public.clean_placeholder_text(input_data->>'target_scope'), 'all'),
    public.clean_placeholder_text(input_data->>'main_group'),
    public.clean_placeholder_text(input_data->>'subgroup'),
    public.clean_placeholder_text(input_data->>'role_filter'),
    coalesce(nullif(input_data->>'starts_at', '')::timestamptz, now()),
    nullif(input_data->>'ends_at', '')::timestamptz,
    nullif(input_data->>'late_after', '')::timestamptz,
    coalesce(public.clean_placeholder_text(input_data->>'status'), 'draft'),
    public.staff_attendance_random_token(),
    nullif(input_data->>'qr_expires_at', '')::timestamptz,
    auth.uid()
  )
  returning * into created_row;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (null, auth.uid(), 'staff_attendance_session_created', '{}'::jsonb, to_jsonb(created_row));

  return to_jsonb(created_row) || jsonb_build_object('summary', public.staff_attendance_session_summary(created_row.id));
end;
$$;

create or replace function public.update_staff_attendance_session(input_session_id uuid, input_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb;
  updated_row public.staff_attendance_sessions;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  select to_jsonb(s) into old_row
  from public.staff_attendance_sessions s
  where s.id = input_session_id;

  if old_row is null then
    raise exception 'attendance session not found';
  end if;

  update public.staff_attendance_sessions
  set event_id = case when input_data ? 'event_id' then nullif(input_data->>'event_id', '')::uuid else event_id end,
      title = case when input_data ? 'title' then nullif(btrim(input_data->>'title'), '') else title end,
      description = case when input_data ? 'description' then public.clean_placeholder_text(input_data->>'description') else description end,
      session_type = case when input_data ? 'session_type' then coalesce(public.clean_placeholder_text(input_data->>'session_type'), session_type) else session_type end,
      target_scope = case when input_data ? 'target_scope' then coalesce(public.clean_placeholder_text(input_data->>'target_scope'), target_scope) else target_scope end,
      main_group = case when input_data ? 'main_group' then public.clean_placeholder_text(input_data->>'main_group') else main_group end,
      subgroup = case when input_data ? 'subgroup' then public.clean_placeholder_text(input_data->>'subgroup') else subgroup end,
      role_filter = case when input_data ? 'role_filter' then public.clean_placeholder_text(input_data->>'role_filter') else role_filter end,
      starts_at = case when input_data ? 'starts_at' then coalesce(nullif(input_data->>'starts_at', '')::timestamptz, starts_at) else starts_at end,
      ends_at = case when input_data ? 'ends_at' then nullif(input_data->>'ends_at', '')::timestamptz else ends_at end,
      late_after = case when input_data ? 'late_after' then nullif(input_data->>'late_after', '')::timestamptz else late_after end,
      status = case when input_data ? 'status' then coalesce(public.clean_placeholder_text(input_data->>'status'), status) else status end,
      qr_expires_at = case when input_data ? 'qr_expires_at' then nullif(input_data->>'qr_expires_at', '')::timestamptz else qr_expires_at end
  where id = input_session_id
  returning * into updated_row;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (null, auth.uid(), 'staff_attendance_session_updated', old_row, to_jsonb(updated_row));

  return to_jsonb(updated_row) || jsonb_build_object('summary', public.staff_attendance_session_summary(updated_row.id));
end;
$$;
