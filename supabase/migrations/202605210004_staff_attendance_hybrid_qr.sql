create table if not exists public.staff_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  session_type text not null default 'check_in',
  target_scope text not null default 'all',
  main_group text,
  subgroup text,
  role_filter text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  late_after timestamptz,
  status text not null default 'draft',
  qr_token text unique,
  qr_expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.staff_attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.staff_attendance_sessions(id) on delete cascade,
  staff_profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  status text not null default 'present',
  method text not null default 'session_qr',
  scanned_at timestamptz,
  checked_by uuid references auth.users(id),
  note text,
  device_info jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (session_id, staff_profile_id)
);

create table if not exists public.staff_attendance_identity_tokens (
  id uuid primary key default gen_random_uuid(),
  staff_profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  token text not null unique,
  status text not null default 'active',
  created_at timestamptz default now(),
  regenerated_at timestamptz,
  unique (staff_profile_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'staff_attendance_sessions_type_check' and conrelid = 'public.staff_attendance_sessions'::regclass) then
    alter table public.staff_attendance_sessions
      add constraint staff_attendance_sessions_type_check
      check (session_type in ('check_in', 'check_out', 'shift_start', 'shift_end', 'roll_call', 'emergency', 'meeting'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'staff_attendance_sessions_status_check' and conrelid = 'public.staff_attendance_sessions'::regclass) then
    alter table public.staff_attendance_sessions
      add constraint staff_attendance_sessions_status_check
      check (status in ('draft', 'active', 'closed', 'archived'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'staff_attendance_sessions_target_scope_check' and conrelid = 'public.staff_attendance_sessions'::regclass) then
    alter table public.staff_attendance_sessions
      add constraint staff_attendance_sessions_target_scope_check
      check (target_scope in ('all', 'main_group', 'subgroup', 'role', 'emergency_staff'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'staff_attendance_records_status_check' and conrelid = 'public.staff_attendance_records'::regclass) then
    alter table public.staff_attendance_records
      add constraint staff_attendance_records_status_check
      check (status in ('present', 'late', 'absent', 'excused', 'checked_out', 'cancelled'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'staff_attendance_records_method_check' and conrelid = 'public.staff_attendance_records'::regclass) then
    alter table public.staff_attendance_records
      add constraint staff_attendance_records_method_check
      check (method in ('session_qr', 'manual', 'admin_scan_staff_qr', 'import', 'system'));
  end if;
end;
$$;

create index if not exists staff_attendance_sessions_status_idx on public.staff_attendance_sessions (status, starts_at, ends_at);
create index if not exists staff_attendance_sessions_qr_token_idx on public.staff_attendance_sessions (qr_token);
create index if not exists staff_attendance_records_session_idx on public.staff_attendance_records (session_id, status);
create index if not exists staff_attendance_records_staff_idx on public.staff_attendance_records (staff_profile_id, scanned_at);

drop trigger if exists staff_attendance_sessions_touch_updated_at on public.staff_attendance_sessions;
create trigger staff_attendance_sessions_touch_updated_at
before update on public.staff_attendance_sessions
for each row execute function public.touch_updated_at();

drop trigger if exists staff_attendance_records_touch_updated_at on public.staff_attendance_records;
create trigger staff_attendance_records_touch_updated_at
before update on public.staff_attendance_records
for each row execute function public.touch_updated_at();

create or replace function public.staff_attendance_random_token()
returns text
language sql
volatile
as $$
  select encode(gen_random_bytes(24), 'hex');
$$;

create or replace function public.staff_attendance_current_staff_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sp.id
  from public.staff_profiles sp
  left join public.staff_assignments sa on sa.staff_profile_id = sp.id
  where sp.user_id = auth.uid()
     or sa.user_id = auth.uid()
  order by case when sp.user_id = auth.uid() then 0 else 1 end, sp.created_at
  limit 1;
$$;

create or replace function public.staff_attendance_session_targets_staff(input_session_id uuid, input_staff_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select *
    from public.staff_attendance_sessions
    where id = input_session_id
  )
  select exists (
    select 1
    from s
    join public.staff_profiles sp on sp.id = input_staff_profile_id
    left join public.staff_assignments sa on sa.staff_profile_id = sp.id
    where
      s.target_scope = 'all'
      or (
        s.target_scope = 'main_group'
        and sa.main_group = s.main_group
      )
      or (
        s.target_scope = 'subgroup'
        and sa.main_group = s.main_group
        and sa.subgroup = s.subgroup
      )
      or (
        s.target_scope = 'role'
        and public.clean_placeholder_text(s.role_filter) is not null
        and (
          sa.role = s.role_filter
          or sa.primary_role = s.role_filter
          or s.role_filter = any(coalesce(sa.secondary_roles, '{}'::text[]))
        )
      )
      or (
        s.target_scope = 'emergency_staff'
        and (sa.role = 'emergency_staff' or sa.primary_role = 'พยาบาล')
      )
  );
$$;

create or replace function public.staff_attendance_session_targets_current_user(input_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.staff_attendance_session_targets_staff(input_session_id, public.staff_attendance_current_staff_profile_id());
$$;

create or replace function public.staff_attendance_session_summary(input_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with targeted as (
    select sp.id
    from public.staff_profiles sp
    where public.staff_attendance_session_targets_staff(input_session_id, sp.id)
  ),
  counts as (
    select
      count(*) filter (where sar.status = 'present') as present,
      count(*) filter (where sar.status = 'late') as late,
      count(*) filter (where sar.status = 'absent') as absent,
      count(*) filter (where sar.status = 'excused') as excused,
      count(*) filter (where sar.status = 'checked_out') as checked_out,
      count(*) filter (where sar.status = 'cancelled') as cancelled,
      count(sar.id) filter (where sar.status <> 'cancelled') as marked
    from targeted t
    left join public.staff_attendance_records sar on sar.session_id = input_session_id and sar.staff_profile_id = t.id
  )
  select jsonb_build_object(
    'total_targeted', (select count(*) from targeted),
    'present', coalesce((select present from counts), 0),
    'late', coalesce((select late from counts), 0),
    'absent', coalesce((select absent from counts), 0),
    'excused', coalesce((select excused from counts), 0),
    'checked_out', coalesce((select checked_out from counts), 0),
    'cancelled', coalesce((select cancelled from counts), 0),
    'missing', greatest((select count(*) from targeted) - coalesce((select marked from counts), 0), 0)
  );
$$;

alter table public.staff_attendance_sessions enable row level security;
alter table public.staff_attendance_records enable row level security;
alter table public.staff_attendance_identity_tokens enable row level security;

drop policy if exists "Admins manage staff attendance sessions" on public.staff_attendance_sessions;
create policy "Admins manage staff attendance sessions"
on public.staff_attendance_sessions for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Targeted staff read active attendance sessions" on public.staff_attendance_sessions;
create policy "Targeted staff read active attendance sessions"
on public.staff_attendance_sessions for select
to authenticated
using (
  public.is_admin(auth.uid())
  or (
    status = 'active'
    and now() >= starts_at
    and (ends_at is null or now() <= ends_at)
    and public.staff_attendance_session_targets_current_user(id)
  )
);

drop policy if exists "Admins manage staff attendance records" on public.staff_attendance_records;
create policy "Admins manage staff attendance records"
on public.staff_attendance_records for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Staff read own attendance records" on public.staff_attendance_records;
create policy "Staff read own attendance records"
on public.staff_attendance_records for select
to authenticated
using (
  public.is_admin(auth.uid())
  or staff_profile_id = public.staff_attendance_current_staff_profile_id()
);

drop policy if exists "Admins manage staff attendance identity tokens" on public.staff_attendance_identity_tokens;
create policy "Admins manage staff attendance identity tokens"
on public.staff_attendance_identity_tokens for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Staff read own attendance identity token" on public.staff_attendance_identity_tokens;
create policy "Staff read own attendance identity token"
on public.staff_attendance_identity_tokens for select
to authenticated
using (staff_profile_id = public.staff_attendance_current_staff_profile_id());

create or replace function public.create_staff_attendance_session(input_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_row public.staff_attendance_sessions;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  insert into public.staff_attendance_sessions (
    title,
    description,
    session_type,
    target_scope,
    main_group,
    subgroup,
    role_filter,
    starts_at,
    ends_at,
    late_after,
    status,
    qr_token,
    qr_expires_at,
    created_by
  )
  values (
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
  set title = case when input_data ? 'title' then nullif(btrim(input_data->>'title'), '') else title end,
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

create or replace function public.regenerate_staff_attendance_qr(input_session_id uuid)
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

  update public.staff_attendance_sessions
  set qr_token = public.staff_attendance_random_token(),
      qr_expires_at = null
  where id = input_session_id
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'attendance session not found';
  end if;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (null, auth.uid(), 'staff_attendance_qr_regenerated', old_row, to_jsonb(updated_row));

  return to_jsonb(updated_row) || jsonb_build_object('summary', public.staff_attendance_session_summary(updated_row.id));
end;
$$;

create or replace function public.close_staff_attendance_session(input_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.update_staff_attendance_session(input_session_id, jsonb_build_object('status', 'closed'));
end;
$$;

create or replace function public.get_staff_attendance_admin(input_session_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_id uuid;
  sessions_json jsonb;
  selected_json jsonb;
  roster_json jsonb;
  records_json jsonb;
  summary_json jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(s) || jsonb_build_object('summary', public.staff_attendance_session_summary(s.id)) order by s.starts_at desc),
    '[]'::jsonb
  )
  into sessions_json
  from public.staff_attendance_sessions s;

  if input_session_id is not null then
    selected_id := input_session_id;
  else
    select id into selected_id
    from public.staff_attendance_sessions
    order by starts_at desc
    limit 1;
  end if;

  if selected_id is null then
    return jsonb_build_object(
      'sessions', sessions_json,
      'selected_session', null,
      'roster', '[]'::jsonb,
      'records', '[]'::jsonb,
      'summary', jsonb_build_object('total_targeted', 0, 'present', 0, 'late', 0, 'absent', 0, 'excused', 0, 'checked_out', 0, 'missing', 0)
    );
  end if;

  select to_jsonb(s) || jsonb_build_object('summary', public.staff_attendance_session_summary(s.id))
  into selected_json
  from public.staff_attendance_sessions s
  where s.id = selected_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'staff_profile_id', sp.id,
      'student_id', sp.student_id,
      'email', sp.email,
      'name_th', sp.name_th,
      'name_en', sp.name_en,
      'nickname', sp.nickname,
      'nickname_th', sp.nickname_th,
      'nickname_en', sp.nickname_en,
      'phone', sp.phone,
      'position', sp.position,
      'main_group', sa.main_group,
      'subgroup', sa.subgroup,
      'system_role', sa.role,
      'primary_role', sa.primary_role,
      'secondary_roles', sa.secondary_roles,
      'base_number', sa.base_number,
      'record', to_jsonb(r)
    )
    order by coalesce(sa.main_group, ''), coalesce(sa.subgroup, ''), sp.name_th, sp.name_en
  ), '[]'::jsonb)
  into roster_json
  from public.staff_profiles sp
  left join public.staff_assignments sa on sa.staff_profile_id = sp.id
  left join public.staff_attendance_records r on r.session_id = selected_id and r.staff_profile_id = sp.id
  where public.staff_attendance_session_targets_staff(selected_id, sp.id);

  select coalesce(jsonb_agg(to_jsonb(r) order by r.scanned_at desc nulls last, r.updated_at desc), '[]'::jsonb)
  into records_json
  from public.staff_attendance_records r
  where r.session_id = selected_id;

  summary_json := public.staff_attendance_session_summary(selected_id);

  return jsonb_build_object(
    'sessions', sessions_json,
    'selected_session', selected_json,
    'roster', roster_json,
    'records', records_json,
    'summary', summary_json
  );
end;
$$;

create or replace function public.get_my_staff_attendance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid := public.staff_attendance_current_staff_profile_id();
  staff_json jsonb;
  active_sessions jsonb;
  records_json jsonb;
begin
  if staff_id is null then
    raise exception 'staff access required';
  end if;

  select to_jsonb(sp)
    || jsonb_build_object(
      'assignment', to_jsonb(sa),
      'public_profile', to_jsonb(spp)
    )
  into staff_json
  from public.staff_profiles sp
  left join public.staff_assignments sa on sa.staff_profile_id = sp.id
  left join public.staff_public_profiles spp on spp.staff_profile_id = sp.id
  where sp.id = staff_id
  limit 1;

  select coalesce(jsonb_agg(
    to_jsonb(s)
    || jsonb_build_object(
      'record', to_jsonb(r),
      'summary', public.staff_attendance_session_summary(s.id)
    )
    order by s.starts_at
  ), '[]'::jsonb)
  into active_sessions
  from public.staff_attendance_sessions s
  left join public.staff_attendance_records r on r.session_id = s.id and r.staff_profile_id = staff_id
  where s.status = 'active'
    and now() >= s.starts_at
    and (s.ends_at is null or now() <= s.ends_at)
    and public.staff_attendance_session_targets_staff(s.id, staff_id);

  select coalesce(jsonb_agg(
    to_jsonb(r) || jsonb_build_object('session', to_jsonb(s))
    order by r.scanned_at desc nulls last, r.updated_at desc
  ), '[]'::jsonb)
  into records_json
  from public.staff_attendance_records r
  join public.staff_attendance_sessions s on s.id = r.session_id
  where r.staff_profile_id = staff_id;

  return jsonb_build_object(
    'staff_profile', staff_json,
    'active_sessions', active_sessions,
    'records', records_json,
    'latest_record', case when jsonb_array_length(records_json) > 0 then records_json->0 else null end
  );
end;
$$;

create or replace function public.scan_staff_attendance_session_qr(input_token text, input_device_info jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  token_value text := public.clean_placeholder_text(input_token);
  session_row public.staff_attendance_sessions;
  staff_id uuid := public.staff_attendance_current_staff_profile_id();
  existing_record public.staff_attendance_records;
  new_status text;
  record_row public.staff_attendance_records;
begin
  select * into session_row
  from public.staff_attendance_sessions
  where qr_token = token_value;

  if not found then
    return jsonb_build_object('success', false, 'code', 'session_not_found', 'message', 'attendance session not found');
  end if;

  if session_row.status <> 'active' then
    return jsonb_build_object('success', false, 'code', 'session_not_active', 'message', 'attendance session is not active', 'session', to_jsonb(session_row));
  end if;

  if now() < session_row.starts_at then
    return jsonb_build_object('success', false, 'code', 'session_not_started', 'message', 'attendance session has not started', 'session', to_jsonb(session_row));
  end if;

  if session_row.ends_at is not null and now() > session_row.ends_at then
    return jsonb_build_object('success', false, 'code', 'session_closed', 'message', 'attendance session is closed', 'session', to_jsonb(session_row));
  end if;

  if session_row.qr_expires_at is not null and now() > session_row.qr_expires_at then
    return jsonb_build_object('success', false, 'code', 'qr_expired', 'message', 'qr expired', 'session', to_jsonb(session_row));
  end if;

  if staff_id is null then
    return jsonb_build_object('success', false, 'code', 'staff_not_found', 'message', 'staff profile not found', 'session', to_jsonb(session_row));
  end if;

  if not public.staff_attendance_session_targets_staff(session_row.id, staff_id) then
    return jsonb_build_object('success', false, 'code', 'not_in_target_scope', 'message', 'staff is not in target scope', 'session', to_jsonb(session_row));
  end if;

  select * into existing_record
  from public.staff_attendance_records
  where session_id = session_row.id
    and staff_profile_id = staff_id;

  if found then
    return jsonb_build_object(
      'success', true,
      'code', 'already_checked',
      'message', 'already checked',
      'session', to_jsonb(session_row),
      'record', to_jsonb(existing_record)
    );
  end if;

  new_status := case
    when session_row.session_type in ('check_out', 'shift_end') then 'checked_out'
    when session_row.late_after is not null and now() > session_row.late_after then 'late'
    else 'present'
  end;

  insert into public.staff_attendance_records (session_id, staff_profile_id, status, method, scanned_at, checked_by, device_info)
  values (session_row.id, staff_id, new_status, 'session_qr', now(), auth.uid(), coalesce(input_device_info, '{}'::jsonb))
  returning * into record_row;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (staff_id, auth.uid(), 'staff_attendance_session_qr_scanned', '{}'::jsonb, to_jsonb(record_row));

  return jsonb_build_object(
    'success', true,
    'code', case when new_status = 'late' then 'late' when new_status = 'checked_out' then 'checked_out' else 'checked_in' end,
    'message', 'attendance recorded',
    'session', to_jsonb(session_row),
    'record', to_jsonb(record_row)
  );
end;
$$;

create or replace function public.manual_staff_attendance_update(
  input_session_id uuid,
  input_staff_profile_id uuid,
  input_status text,
  input_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb;
  record_row public.staff_attendance_records;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  if not exists (select 1 from public.staff_attendance_sessions where id = input_session_id) then
    raise exception 'attendance session not found';
  end if;

  if input_status not in ('present', 'late', 'absent', 'excused', 'checked_out', 'cancelled') then
    raise exception 'invalid attendance status';
  end if;

  if not public.staff_attendance_session_targets_staff(input_session_id, input_staff_profile_id) then
    raise exception 'staff is not in target scope';
  end if;

  select to_jsonb(r) into old_row
  from public.staff_attendance_records r
  where r.session_id = input_session_id
    and r.staff_profile_id = input_staff_profile_id;

  insert into public.staff_attendance_records (session_id, staff_profile_id, status, method, scanned_at, checked_by, note)
  values (input_session_id, input_staff_profile_id, input_status, 'manual', now(), auth.uid(), public.clean_placeholder_text(input_note))
  on conflict (session_id, staff_profile_id) do update
  set status = excluded.status,
      method = 'manual',
      scanned_at = now(),
      checked_by = auth.uid(),
      note = excluded.note,
      updated_at = now()
  returning * into record_row;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (input_staff_profile_id, auth.uid(), 'staff_attendance_manual_update', coalesce(old_row, '{}'::jsonb), to_jsonb(record_row));

  return to_jsonb(record_row);
end;
$$;

create or replace function public.get_my_staff_personal_qr()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid := public.staff_attendance_current_staff_profile_id();
  token_row public.staff_attendance_identity_tokens;
begin
  if staff_id is null then
    raise exception 'staff access required';
  end if;

  insert into public.staff_attendance_identity_tokens (staff_profile_id, token)
  values (staff_id, public.staff_attendance_random_token())
  on conflict (staff_profile_id) do update
  set token = staff_attendance_identity_tokens.token
  returning * into token_row;

  return to_jsonb(token_row);
end;
$$;

create or replace function public.regenerate_my_staff_personal_qr()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid := public.staff_attendance_current_staff_profile_id();
  token_row public.staff_attendance_identity_tokens;
begin
  if staff_id is null then
    raise exception 'staff access required';
  end if;

  insert into public.staff_attendance_identity_tokens (staff_profile_id, token, regenerated_at)
  values (staff_id, public.staff_attendance_random_token(), now())
  on conflict (staff_profile_id) do update
  set token = excluded.token,
      regenerated_at = now(),
      status = 'active'
  returning * into token_row;

  return to_jsonb(token_row);
end;
$$;

create or replace function public.admin_scan_staff_personal_qr(
  input_session_id uuid,
  input_staff_token text,
  input_status text default null,
  input_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  token_value text := public.clean_placeholder_text(input_staff_token);
  session_row public.staff_attendance_sessions;
  staff_id uuid;
  old_row jsonb;
  final_status text;
  record_row public.staff_attendance_records;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  select staff_profile_id into staff_id
  from public.staff_attendance_identity_tokens
  where token = token_value
    and status = 'active';

  if staff_id is null then
    raise exception 'staff personal QR not found';
  end if;

  select * into session_row
  from public.staff_attendance_sessions
  where id = input_session_id;

  if not found then
    raise exception 'attendance session not found';
  end if;

  if not public.staff_attendance_session_targets_staff(input_session_id, staff_id) then
    raise exception 'staff is not in target scope';
  end if;

  final_status := coalesce(public.clean_placeholder_text(input_status), case
    when session_row.session_type in ('check_out', 'shift_end') then 'checked_out'
    when session_row.late_after is not null and now() > session_row.late_after then 'late'
    else 'present'
  end);

  if final_status not in ('present', 'late', 'absent', 'excused', 'checked_out', 'cancelled') then
    raise exception 'invalid attendance status';
  end if;

  select to_jsonb(r) into old_row
  from public.staff_attendance_records r
  where r.session_id = input_session_id
    and r.staff_profile_id = staff_id;

  insert into public.staff_attendance_records (session_id, staff_profile_id, status, method, scanned_at, checked_by, note)
  values (input_session_id, staff_id, final_status, 'admin_scan_staff_qr', now(), auth.uid(), public.clean_placeholder_text(input_note))
  on conflict (session_id, staff_profile_id) do update
  set status = excluded.status,
      method = 'admin_scan_staff_qr',
      scanned_at = now(),
      checked_by = auth.uid(),
      note = excluded.note,
      updated_at = now()
  returning * into record_row;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (staff_id, auth.uid(), 'staff_attendance_admin_scan_staff_qr', coalesce(old_row, '{}'::jsonb), to_jsonb(record_row));

  return to_jsonb(record_row);
end;
$$;

grant select on public.staff_attendance_sessions to authenticated;
grant select on public.staff_attendance_records to authenticated;
grant execute on function public.staff_attendance_current_staff_profile_id() to authenticated;
grant execute on function public.staff_attendance_session_targets_staff(uuid, uuid) to authenticated;
grant execute on function public.staff_attendance_session_targets_current_user(uuid) to authenticated;
grant execute on function public.create_staff_attendance_session(jsonb) to authenticated;
grant execute on function public.update_staff_attendance_session(uuid, jsonb) to authenticated;
grant execute on function public.regenerate_staff_attendance_qr(uuid) to authenticated;
grant execute on function public.close_staff_attendance_session(uuid) to authenticated;
grant execute on function public.get_staff_attendance_admin(uuid) to authenticated;
grant execute on function public.get_my_staff_attendance() to authenticated;
grant execute on function public.scan_staff_attendance_session_qr(text, jsonb) to authenticated;
grant execute on function public.manual_staff_attendance_update(uuid, uuid, text, text) to authenticated;
grant execute on function public.get_my_staff_personal_qr() to authenticated;
grant execute on function public.regenerate_my_staff_personal_qr() to authenticated;
grant execute on function public.admin_scan_staff_personal_qr(uuid, text, text, text) to authenticated;
