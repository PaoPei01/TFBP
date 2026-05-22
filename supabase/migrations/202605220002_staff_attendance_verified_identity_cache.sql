create extension if not exists pgcrypto with schema extensions;

create or replace function public.generate_secure_token()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select encode(extensions.gen_random_bytes(32), 'hex');
$$;

alter table public.staff_attendance_records
  drop constraint if exists staff_attendance_records_method_check;

alter table public.staff_attendance_records
  add constraint staff_attendance_records_method_check
  check (method in ('session_qr', 'verified_qr', 'verified_camera_scan', 'manual', 'admin_scan_staff_qr', 'import', 'system'));

create or replace function public.normalize_staff_attendance_session_token(input_value text)
returns text
language plpgsql
immutable
as $$
declare
  raw text := public.clean_placeholder_text(input_value);
  found text;
begin
  if raw is null then
    return null;
  end if;

  if position('attendance_session:' in raw) = 1 then
    return public.clean_placeholder_text(substring(raw from length('attendance_session:') + 1));
  end if;

  found := substring(raw from '[?&]token=([^&[:space:]]+)');
  if found is not null then
    return public.clean_placeholder_text(found);
  end if;

  return raw;
end;
$$;

create or replace function public.verify_staff_attendance_identity(input_email text, input_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  email_value text := lower(public.clean_placeholder_text(input_email));
  phone_value text := public.normalize_phone(input_phone);
  staff_row public.staff_profiles;
  token_row public.staff_attendance_identity_tokens;
begin
  if email_value is null or phone_value is null then
    return jsonb_build_object('success', false, 'code', 'identity_verification_failed', 'message', 'email and phone are required');
  end if;

  select * into staff_row
  from public.staff_profiles sp
  where lower(public.clean_placeholder_text(sp.email)) = email_value
    and public.normalize_phone(sp.phone) = phone_value
  order by sp.updated_at desc nulls last, sp.created_at desc nulls last
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'code', 'identity_verification_failed', 'message', 'No staff profile found');
  end if;

  insert into public.staff_attendance_identity_tokens (staff_profile_id, token, status)
  values (staff_row.id, public.generate_secure_token(), 'active')
  on conflict (staff_profile_id) do update
  set token = case
        when public.staff_attendance_identity_tokens.status = 'active' then public.staff_attendance_identity_tokens.token
        else excluded.token
      end,
      status = 'active'
  returning * into token_row;

  return jsonb_build_object(
    'success', true,
    'code', 'ok',
    'message', 'ok',
    'staff', public.staff_personal_qr_safe_staff_json(staff_row.id),
    'verified_staff_token', token_row.token,
    'personal_qr_payload', 'staff_identity:' || token_row.token
  );
end;
$$;

create or replace function public.scan_staff_attendance_session_qr_by_verified_token(
  input_session_token text,
  input_verified_staff_token text,
  input_device_info jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_token text := public.normalize_staff_attendance_session_token(input_session_token);
  verified_token text := public.normalize_staff_identity_qr_token(input_verified_staff_token);
  session_row public.staff_attendance_sessions;
  safe_session jsonb;
  staff_id uuid;
  existing_record public.staff_attendance_records;
  new_status text;
  record_row public.staff_attendance_records;
begin
  select staff_profile_id into staff_id
  from public.staff_attendance_identity_tokens
  where token = verified_token
    and status = 'active';

  if staff_id is null then
    return jsonb_build_object('success', false, 'code', 'invalid_token', 'message', 'verified staff token is invalid');
  end if;

  select * into session_row
  from public.staff_attendance_sessions
  where qr_token = session_token;

  if not found then
    return jsonb_build_object('success', false, 'code', 'session_not_found', 'message', 'attendance session not found', 'staff', public.staff_personal_qr_safe_staff_json(staff_id));
  end if;

  safe_session := to_jsonb(session_row) - 'qr_token' - 'created_by';

  if session_row.status <> 'active' then
    return jsonb_build_object('success', false, 'code', 'session_not_active', 'message', 'attendance session is not active', 'session', safe_session, 'staff', public.staff_personal_qr_safe_staff_json(staff_id));
  end if;

  if now() < session_row.starts_at then
    return jsonb_build_object('success', false, 'code', 'session_not_started', 'message', 'attendance session has not started', 'session', safe_session, 'staff', public.staff_personal_qr_safe_staff_json(staff_id));
  end if;

  if session_row.ends_at is not null and now() > session_row.ends_at then
    return jsonb_build_object('success', false, 'code', 'session_closed', 'message', 'attendance session is closed', 'session', safe_session, 'staff', public.staff_personal_qr_safe_staff_json(staff_id));
  end if;

  if session_row.qr_expires_at is not null and now() > session_row.qr_expires_at then
    return jsonb_build_object('success', false, 'code', 'qr_expired', 'message', 'qr expired', 'session', safe_session, 'staff', public.staff_personal_qr_safe_staff_json(staff_id));
  end if;

  if not public.staff_attendance_session_targets_staff(session_row.id, staff_id) then
    return jsonb_build_object('success', false, 'code', 'not_in_target_scope', 'message', 'staff is not in target scope', 'session', safe_session, 'staff', public.staff_personal_qr_safe_staff_json(staff_id));
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
      'session', safe_session,
      'record', to_jsonb(existing_record),
      'staff', public.staff_personal_qr_safe_staff_json(staff_id)
    );
  end if;

  new_status := case
    when session_row.session_type in ('check_out', 'shift_end') then 'checked_out'
    when session_row.late_after is not null and now() > session_row.late_after then 'late'
    else 'present'
  end;

  insert into public.staff_attendance_records (session_id, staff_profile_id, status, method, scanned_at, checked_by, note, device_info)
  values (session_row.id, staff_id, new_status, 'verified_camera_scan', now(), null, 'verified staff token camera scan', coalesce(input_device_info, '{}'::jsonb))
  returning * into record_row;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (staff_id, null, 'staff_attendance_verified_camera_scan', '{}'::jsonb, to_jsonb(record_row));

  return jsonb_build_object(
    'success', true,
    'code', case when new_status = 'late' then 'late' when new_status = 'checked_out' then 'checked_out' else 'checked_in' end,
    'message', 'attendance recorded',
    'session', safe_session,
    'record', to_jsonb(record_row),
    'staff', public.staff_personal_qr_safe_staff_json(staff_id)
  );
end;
$$;

grant execute on function public.normalize_staff_attendance_session_token(text) to anon, authenticated;
grant execute on function public.verify_staff_attendance_identity(text, text) to anon, authenticated;
grant execute on function public.scan_staff_attendance_session_qr_by_verified_token(text, text, jsonb) to anon, authenticated;
