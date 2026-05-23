alter table public.staff_applications
  alter column person_id drop not null,
  add column if not exists identity_status text default 'unverified',
  add column if not exists identity_review_note text,
  add column if not exists requested_email text,
  add column if not exists requested_phone text,
  add column if not exists requested_student_id text,
  add column if not exists requested_name_th text,
  add column if not exists requested_name_en text,
  add column if not exists requested_major text,
  add column if not exists update_request_id uuid;

alter table public.staff_applications
  drop constraint if exists staff_applications_identity_status_check;

alter table public.staff_applications
  add constraint staff_applications_identity_status_check
  check (identity_status in ('unverified', 'verified', 'email_mismatch', 'pending_identity_review', 'not_found', 'rejected_identity'));

create index if not exists staff_applications_identity_status_idx
  on public.staff_applications (event_id, identity_status);

create table if not exists public.person_update_requests (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  request_type text not null,
  requested_email text,
  requested_phone text,
  requested_name_th text,
  requested_name_en text,
  requested_nickname text,
  requested_major text,
  verification_data jsonb not null default '{}'::jsonb,
  evidence_note text,
  status text not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.person_update_requests
  add column if not exists requested_student_id text;

alter table public.person_update_requests
  drop constraint if exists person_update_requests_request_type_check;

alter table public.person_update_requests
  add constraint person_update_requests_request_type_check
  check (request_type in ('email_correction', 'phone_update', 'profile_update', 'identity_not_found'));

alter table public.person_update_requests
  drop constraint if exists person_update_requests_status_check;

alter table public.person_update_requests
  add constraint person_update_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled'));

create index if not exists person_update_requests_event_idx on public.person_update_requests (event_id);
create index if not exists person_update_requests_person_idx on public.person_update_requests (person_id);
create index if not exists person_update_requests_status_idx on public.person_update_requests (status, created_at desc);

drop trigger if exists person_update_requests_touch_updated_at on public.person_update_requests;
create trigger person_update_requests_touch_updated_at
before update on public.person_update_requests
for each row execute function public.touch_updated_at();

alter table public.person_update_requests enable row level security;

drop policy if exists "admins manage person update requests" on public.person_update_requests;
create policy "admins manage person update requests"
on public.person_update_requests for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

grant select, update, delete on public.person_update_requests to authenticated;

create or replace function public.normalize_cmu_email(input text)
returns text
language sql
immutable
as $$
  select lower(public.clean_placeholder_text(input));
$$;

create or replace function public.is_valid_cmu_email(input text)
returns boolean
language sql
immutable
as $$
  select coalesce(public.normalize_cmu_email(input) ~ '^[a-z0-9._%+\-]+@cmu\.ac\.th$', false);
$$;

create or replace function public.mask_cmu_email(input text)
returns text
language plpgsql
immutable
as $$
declare
  email_value text := public.normalize_cmu_email(input);
  local_part text;
  domain_part text;
begin
  if email_value is null then
    return null;
  end if;

  local_part := split_part(email_value, '@', 1);
  domain_part := split_part(email_value, '@', 2);

  if local_part = '' or domain_part = '' then
    return null;
  end if;

  return left(local_part, 1) || repeat('*', greatest(length(local_part) - 1, 3)) || '@' || domain_part;
end;
$$;

create or replace function public.mask_phone(input text)
returns text
language plpgsql
immutable
as $$
declare
  phone_value text := public.normalize_phone(input);
begin
  if phone_value is null then
    return null;
  end if;

  if length(phone_value) < 7 then
    return repeat('*', length(phone_value));
  end if;

  return left(phone_value, 3) || '-xxx-' || right(phone_value, 4);
end;
$$;

create or replace function public.lookup_person_for_application(
  input_event_slug text,
  input_student_id text,
  input_email text default '',
  input_phone text default '',
  input_name_th text default '',
  input_name_en text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.events;
  student_id_value text := public.clean_placeholder_text(input_student_id);
  email_value text := public.normalize_cmu_email(input_email);
  phone_value text := public.normalize_phone(input_phone);
  person_row public.people;
  identity_status_value text;
  email_matches boolean := false;
begin
  select * into event_row
  from public.events
  where slug = public.clean_placeholder_text(input_event_slug)
    and visibility = 'public'
    and status in ('staff_recruiting', 'registration_open', 'active')
  limit 1;

  if event_row.id is null then
    return jsonb_build_object('success', false, 'code', 'event_not_open', 'message_th', 'กิจกรรมนี้ยังไม่เปิดรับสมัคร');
  end if;

  if student_id_value is null then
    return jsonb_build_object('success', false, 'code', 'student_id_required', 'message_th', 'กรุณากรอกรหัสนักศึกษา');
  end if;

  if not public.is_valid_cmu_email(email_value) then
    return jsonb_build_object('success', false, 'code', 'invalid_cmu_email', 'message_th', 'กรุณากรอก CMU Mail ที่ลงท้ายด้วย @cmu.ac.th เท่านั้น');
  end if;

  select * into person_row
  from public.people p
  where public.clean_placeholder_text(p.student_id) = student_id_value
    and p.merged_into is null
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  if person_row.id is null then
    return jsonb_build_object(
      'success', true,
      'found', false,
      'identity_status', 'not_found',
      'can_continue_application', true,
      'requires_update_request', true,
      'message_th', 'ไม่พบข้อมูลจากรหัสนักศึกษานี้ กรุณากรอกข้อมูลเพิ่มเติมเพื่อส่งให้ผู้ดูแลตรวจสอบ'
    );
  end if;

  email_matches := public.normalize_cmu_email(person_row.email) = email_value;
  identity_status_value := case
    when email_matches then 'verified'
    when public.normalize_cmu_email(person_row.email) is null then 'pending_identity_review'
    else 'email_mismatch'
  end;

  return jsonb_build_object(
    'success', true,
    'found', true,
    'person_id', person_row.id,
    'identity_status', identity_status_value,
    'safe_person', jsonb_build_object(
      'student_id', person_row.student_id,
      'display_name', coalesce(person_row.nickname, person_row.nickname_th, person_row.name_th, person_row.name_en, 'นักศึกษา'),
      'nickname', coalesce(person_row.nickname, person_row.nickname_th, person_row.nickname_en),
      'major', person_row.major,
      'year_level', person_row.year_level,
      'masked_email', public.mask_cmu_email(person_row.email),
      'masked_phone', public.mask_phone(person_row.phone)
    ),
    'can_continue_application', true,
    'requires_update_request', not email_matches,
    'message_th', case
      when email_matches then 'พบข้อมูลของคุณแล้ว'
      when public.normalize_cmu_email(person_row.email) is null then 'พบข้อมูลนักศึกษา แต่ยังต้องให้ผู้ดูแลตรวจสอบ CMU Mail'
      else 'พบข้อมูลนักศึกษา แต่ CMU Mail ที่กรอกไม่ตรงกับข้อมูลเดิม'
    end
  );
end;
$$;

create or replace function public.submit_person_update_request(
  input_event_slug text,
  input_student_id text,
  input_email text,
  input_phone text,
  input_name_th text,
  input_name_en text default '',
  input_major text default '',
  input_request_type text default 'email_correction',
  input_evidence_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.events;
  student_id_value text := public.clean_placeholder_text(input_student_id);
  email_value text := public.normalize_cmu_email(input_email);
  phone_value text := public.normalize_phone(input_phone);
  request_type_value text := coalesce(public.clean_placeholder_text(input_request_type), 'email_correction');
  person_row public.people;
  request_row public.person_update_requests;
begin
  select * into event_row
  from public.events
  where slug = public.clean_placeholder_text(input_event_slug)
    and visibility = 'public'
  limit 1;

  if event_row.id is null then
    return jsonb_build_object('success', false, 'code', 'event_not_found', 'message_th', 'ไม่พบกิจกรรมนี้');
  end if;

  if student_id_value is null then
    return jsonb_build_object('success', false, 'code', 'student_id_required', 'message_th', 'กรุณากรอกรหัสนักศึกษา');
  end if;

  if not public.is_valid_cmu_email(email_value) then
    return jsonb_build_object('success', false, 'code', 'invalid_cmu_email', 'message_th', 'กรุณากรอก CMU Mail ที่ลงท้ายด้วย @cmu.ac.th เท่านั้น');
  end if;

  if request_type_value not in ('email_correction', 'phone_update', 'profile_update', 'identity_not_found') then
    request_type_value := 'email_correction';
  end if;

  select * into person_row
  from public.people p
  where public.clean_placeholder_text(p.student_id) = student_id_value
    and p.merged_into is null
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  insert into public.person_update_requests (
    person_id,
    event_id,
    request_type,
    requested_student_id,
    requested_email,
    requested_phone,
    requested_name_th,
    requested_name_en,
    requested_major,
    verification_data,
    evidence_note
  )
  values (
    person_row.id,
    event_row.id,
    case when person_row.id is null then 'identity_not_found' else request_type_value end,
    student_id_value,
    email_value,
    phone_value,
    public.clean_placeholder_text(input_name_th),
    public.clean_placeholder_text(input_name_en),
    public.clean_placeholder_text(input_major),
    jsonb_build_object(
      'student_id', student_id_value,
      'person_found', person_row.id is not null,
      'submitted_from', 'public_event_profile_check'
    ),
    public.clean_placeholder_text(input_evidence_note)
  )
  returning * into request_row;

  return jsonb_build_object(
    'success', true,
    'code', 'submitted',
    'request', jsonb_build_object('id', request_row.id, 'status', request_row.status),
    'message_th', 'ส่งคำร้องแก้ไขข้อมูลแล้ว'
  );
end;
$$;

create or replace function public.submit_event_staff_application(
  input_event_slug text,
  input_email text,
  input_phone text,
  input_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.events;
  person_row public.people;
  form_row public.event_forms;
  application_row public.staff_applications;
  student_id_value text := public.clean_placeholder_text(coalesce(input_data->>'student_id', input_data->>'requested_student_id'));
  email_value text := public.normalize_cmu_email(coalesce(input_data->>'requested_email', input_email));
  phone_value text := public.normalize_phone(coalesce(input_data->>'requested_phone', input_phone));
  requested_name_th_value text := public.clean_placeholder_text(input_data->>'requested_name_th');
  requested_name_en_value text := public.clean_placeholder_text(input_data->>'requested_name_en');
  requested_major_value text := public.clean_placeholder_text(input_data->>'requested_major');
  identity_status_value text := public.clean_placeholder_text(input_data->>'identity_status');
  update_request_id_value uuid := nullif(input_data->>'update_request_id', '')::uuid;
begin
  select * into event_row
  from public.events
  where slug = input_event_slug
    and visibility = 'public'
    and status in ('staff_recruiting', 'active')
  limit 1;

  if event_row.id is null then
    return jsonb_build_object('success', false, 'code', 'staff_recruiting_closed', 'message', 'Staff recruiting is not open');
  end if;

  if student_id_value is null then
    return jsonb_build_object('success', false, 'code', 'student_id_required', 'message_th', 'กรุณากรอกรหัสนักศึกษา');
  end if;

  if not public.is_valid_cmu_email(email_value) then
    return jsonb_build_object('success', false, 'code', 'invalid_cmu_email', 'message_th', 'กรุณากรอก CMU Mail ที่ลงท้ายด้วย @cmu.ac.th เท่านั้น');
  end if;

  if coalesce((input_data->>'consent_confirmed')::boolean, false) is not true then
    return jsonb_build_object('success', false, 'code', 'consent_required', 'message_th', 'กรุณายืนยันข้อมูลก่อนส่งใบสมัคร');
  end if;

  if coalesce(jsonb_typeof(input_data->'preferred_duties'), '') <> 'array' then
    return jsonb_build_object('success', false, 'code', 'preferred_duties_required', 'message_th', 'กรุณาเลือกฝ่ายที่สนใจอย่างน้อย 1 ฝ่าย');
  end if;

  if jsonb_array_length(input_data->'preferred_duties') = 0 then
    return jsonb_build_object('success', false, 'code', 'preferred_duties_required', 'message_th', 'กรุณาเลือกฝ่ายที่สนใจอย่างน้อย 1 ฝ่าย');
  end if;

  select * into person_row
  from public.people p
  where public.clean_placeholder_text(p.student_id) = student_id_value
    and p.merged_into is null
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  identity_status_value := case
    when person_row.id is null then 'not_found'
    when public.normalize_cmu_email(person_row.email) = email_value then 'verified'
    when public.normalize_cmu_email(person_row.email) is null then 'pending_identity_review'
    else 'email_mismatch'
  end;

  select * into form_row
  from public.event_forms
  where event_id = event_row.id
    and form_type = 'staff_application'
    and is_open = true
    and (opens_at is null or opens_at <= now())
    and (closes_at is null or now() <= closes_at)
  order by created_at desc
  limit 1;

  insert into public.staff_applications (
    event_id, person_id, preferred_role, preferred_team, availability,
    experience, motivation, status, answers, identity_status, requested_email,
    requested_phone, requested_student_id, requested_name_th, requested_name_en,
    requested_major, update_request_id
  )
  values (
    event_row.id,
    person_row.id,
    public.clean_placeholder_text(input_data->>'preferred_role'),
    public.clean_placeholder_text(input_data->>'preferred_team'),
    coalesce(input_data->'availability', '{}'::jsonb),
    public.clean_placeholder_text(input_data->>'experience'),
    public.clean_placeholder_text(input_data->>'motivation'),
    'submitted',
    coalesce(input_data, '{}'::jsonb)
      || jsonb_build_object(
        'student_id', student_id_value,
        'requested_email', email_value,
        'requested_phone', phone_value,
        'identity_status', identity_status_value,
        'identity_review_pending', identity_status_value <> 'verified'
      ),
    identity_status_value,
    email_value,
    phone_value,
    student_id_value,
    requested_name_th_value,
    requested_name_en_value,
    requested_major_value,
    update_request_id_value
  )
  returning * into application_row;

  insert into public.event_form_responses (event_id, form_id, person_id, response_json, status)
  values (event_row.id, form_row.id, person_row.id, coalesce(input_data, '{}'::jsonb), 'submitted');

  return jsonb_build_object(
    'success', true,
    'code', case when identity_status_value = 'verified' then 'submitted' else 'submitted_pending_identity_review' end,
    'event', jsonb_build_object('id', event_row.id, 'slug', event_row.slug, 'name_th', event_row.name_th, 'name_en', event_row.name_en),
    'application', jsonb_build_object('id', application_row.id, 'status', application_row.status, 'identity_status', application_row.identity_status),
    'person', case when person_row.id is null then null else jsonb_build_object('person_id', person_row.id, 'display_name', coalesce(person_row.nickname, person_row.name_th, person_row.name_en, 'ผู้สมัคร')) end,
    'message_th', case when identity_status_value = 'verified' then 'ส่งใบสมัครแล้ว' else 'ส่งใบสมัครแล้ว แต่ยังรอตรวจสอบตัวตน' end
  );
end;
$$;

create or replace function public.review_person_update_request(
  input_request_id uuid,
  input_status text,
  input_review_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.person_update_requests%rowtype;
  updated_row public.person_update_requests%rowtype;
  status_value text := public.clean_placeholder_text(input_status);
  old_person jsonb;
  new_person jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  if status_value not in ('approved', 'rejected', 'cancelled') then
    raise exception 'invalid request status';
  end if;

  select * into request_row
  from public.person_update_requests
  where id = input_request_id
  for update;

  if request_row.id is null then
    raise exception 'person update request not found';
  end if;

  if status_value = 'approved' and request_row.person_id is not null then
    select to_jsonb(p) into old_person
    from public.people p
    where p.id = request_row.person_id;

    update public.people
    set
      email = case when public.is_valid_cmu_email(request_row.requested_email) then public.normalize_cmu_email(request_row.requested_email) else email end,
      phone = coalesce(public.normalize_phone(request_row.requested_phone), phone),
      name_th = coalesce(public.clean_placeholder_text(request_row.requested_name_th), name_th),
      name_en = coalesce(public.clean_placeholder_text(request_row.requested_name_en), name_en),
      major = coalesce(public.clean_placeholder_text(request_row.requested_major), major),
      updated_at = now()
    where id = request_row.person_id;

    select to_jsonb(p) into new_person
    from public.people p
    where p.id = request_row.person_id;

    insert into public.change_logs (changed_by, action, old_data, new_data)
    values (
      auth.uid(),
      'review_person_update_request',
      coalesce(old_person, '{}'::jsonb),
      jsonb_build_object('request_id', request_row.id, 'person', coalesce(new_person, '{}'::jsonb))
    );
  end if;

  update public.person_update_requests
  set
    status = status_value,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_note = public.clean_placeholder_text(input_review_note)
  where id = request_row.id
  returning * into updated_row;

  return jsonb_build_object(
    'success', true,
    'request', to_jsonb(updated_row) - 'requested_email' - 'requested_phone',
    'message_th', case when status_value = 'approved' then 'อนุมัติคำร้องแล้ว' when status_value = 'rejected' then 'ปฏิเสธคำร้องแล้ว' else 'ยกเลิกคำร้องแล้ว' end
  );
end;
$$;

grant execute on function public.lookup_person_for_application(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.submit_person_update_request(text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.review_person_update_request(uuid, text, text) to authenticated;
