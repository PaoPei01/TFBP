create table if not exists public.event_staff_duty_quotas (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  duty_key text not null,
  duty_label_th text not null,
  description_th text,
  quota integer not null,
  priority integer not null default 100,
  is_general boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(event_id, duty_key)
);

drop trigger if exists event_staff_duty_quotas_touch_updated_at on public.event_staff_duty_quotas;
create trigger event_staff_duty_quotas_touch_updated_at
before update on public.event_staff_duty_quotas
for each row execute function public.touch_updated_at();

create index if not exists event_staff_duty_quotas_event_idx
  on public.event_staff_duty_quotas (event_id, priority, duty_key);

alter table public.event_staff_duty_quotas enable row level security;

drop policy if exists "public read public event duty quotas" on public.event_staff_duty_quotas;
create policy "public read public event duty quotas"
on public.event_staff_duty_quotas
for select
using (
  exists (
    select 1
    from public.events e
    where e.id = event_staff_duty_quotas.event_id
      and e.visibility = 'public'
  )
);

drop policy if exists "admins manage event duty quotas" on public.event_staff_duty_quotas;
create policy "admins manage event duty quotas"
on public.event_staff_duty_quotas
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

alter table public.staff_applications
  add column if not exists assigned_duty text,
  add column if not exists assignment_method text,
  add column if not exists assignment_note text;

alter table public.staff_applications
  drop constraint if exists staff_applications_assignment_method_check;

alter table public.staff_applications
  add constraint staff_applications_assignment_method_check
  check (assignment_method is null or assignment_method in ('auto_quota', 'manual_admin', 'fallback_general', 'pending'));

create index if not exists staff_applications_assigned_duty_idx
  on public.staff_applications (event_id, assigned_duty);

with parent_event as (
  select id
  from public.events
  where slug = 'parent-orientation-staff-2569'
  limit 1
)
insert into public.event_staff_duty_quotas (
  event_id,
  duty_key,
  duty_label_th,
  description_th,
  quota,
  priority,
  is_general
)
select parent_event.id, seed.duty_key, seed.duty_label_th, seed.description_th, seed.quota, seed.priority, seed.is_general
from parent_event
cross join (
  values
    ('traffic', 'ฝ่ายจราจรและอำนวยทาง', 'ดูแลการเดินทาง การบอกทาง และช่วยจัดระเบียบเส้นทางภายในพื้นที่กิจกรรม', 10, 10, false),
    ('medical', 'ฝ่ายพยาบาลและดูแลความปลอดภัย', 'ดูแลการปฐมพยาบาลเบื้องต้น ประสานงานกรณีฉุกเฉิน และช่วยดูแลความปลอดภัยของผู้เข้าร่วม', 5, 5, false),
    ('registration', 'ฝ่ายลงทะเบียน', 'ตรวจสอบรายชื่อ ต้อนรับผู้เข้าร่วม และช่วยจัดการจุดลงทะเบียนให้เป็นระเบียบ', 15, 20, false),
    ('welfare', 'ฝ่ายสวัสดิการ', 'ดูแลอาหาร น้ำดื่ม อุปกรณ์ และความเรียบร้อยด้านสวัสดิการของทีมงานและผู้เข้าร่วม', 10, 15, false),
    ('benefits_sales', 'ฝ่ายสิทธิประโยชน์และจำหน่ายสินค้า', 'ดูแลบูธสิทธิประโยชน์ การจำหน่ายสินค้า หรือกิจกรรมสนับสนุนรายได้และประชาสัมพันธ์ของงาน', 5, 8, false),
    ('registration_it', 'ฝ่ายสนับสนุนระบบลงทะเบียน (IT)', 'ช่วยดูแลอุปกรณ์ ระบบลงทะเบียน การแก้ปัญหาหน้างาน และการประสานงานด้านเทคนิค', 3, 3, false),
    ('backstage', 'ฝ่าย Backstage และประสานงานเวที', 'ดูแลหลังเวที คิวกิจกรรม การประสานงานผู้เกี่ยวข้อง และความพร้อมของช่วงพิธีการหรือการแสดง', 5, 7, false),
    ('general', 'ฝ่ายทั่วไป', 'สนับสนุนงานทั่วไปตามที่ได้รับมอบหมาย เช่น ช่วยประจำจุดต่าง ๆ อำนวยความสะดวก และช่วยเสริมกำลังฝ่ายที่ต้องการคนเพิ่ม', 77, 100, true)
) as seed(duty_key, duty_label_th, description_th, quota, priority, is_general)
on conflict (event_id, duty_key) do update
set duty_label_th = excluded.duty_label_th,
    description_th = excluded.description_th,
    quota = excluded.quota,
    priority = excluded.priority,
    is_general = excluded.is_general;

create or replace function public.get_event_staff_duty_quota_status(input_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with quota_rows as (
    select
      q.duty_key,
      q.duty_label_th,
      q.description_th,
      q.quota,
      q.priority,
      q.is_general,
      coalesce(count(sa.id) filter (
        where sa.status not in ('rejected', 'withdrawn')
          and sa.assigned_duty = q.duty_key
      ), 0)::int as assigned_count
    from public.event_staff_duty_quotas q
    left join public.staff_applications sa on sa.event_id = q.event_id
    where q.event_id = input_event_id
      and exists (
        select 1
        from public.events e
        where e.id = q.event_id
          and (e.visibility = 'public' or public.is_admin(auth.uid()))
      )
    group by q.id
  )
  select jsonb_build_object(
    'duties', coalesce(jsonb_agg(jsonb_build_object(
      'duty_key', duty_key,
      'duty_label_th', duty_label_th,
      'description_th', description_th,
      'quota', quota,
      'assigned_count', assigned_count,
      'remaining', greatest(quota - assigned_count, 0),
      'is_full', assigned_count >= quota,
      'priority', priority,
      'is_general', is_general
    ) order by priority, duty_label_th), '[]'::jsonb),
    'total_quota', coalesce(sum(quota), 0)::int,
    'total_assigned', coalesce(sum(assigned_count), 0)::int,
    'total_remaining', greatest(coalesce(sum(quota - assigned_count), 0), 0)::int
  )
  from quota_rows;
$$;

create or replace function public.assign_parent_orientation_duty(
  input_event_id uuid,
  input_preferred_duties text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_quota public.event_staff_duty_quotas%rowtype;
  used_count integer := 0;
  remaining_count integer := 0;
begin
  with usage as (
    select
      q.*,
      coalesce(count(sa.id) filter (
        where sa.status not in ('rejected', 'withdrawn')
          and sa.assigned_duty = q.duty_key
      ), 0)::int as assigned_count
    from public.event_staff_duty_quotas q
    left join public.staff_applications sa on sa.event_id = q.event_id
    where q.event_id = input_event_id
      and exists (
        select 1
        from public.events e
        where e.id = q.event_id
          and e.visibility = 'public'
          and e.status in ('staff_recruiting', 'active')
      )
    group by q.id
  )
  select *
  into selected_quota
  from (
    select q.*
    from usage q
    where assigned_count < quota
      and (
        duty_key = any(coalesce(input_preferred_duties, array[]::text[]))
        or duty_label_th = any(coalesce(input_preferred_duties, array[]::text[]))
      )
    order by priority asc, (quota - assigned_count) asc, duty_label_th
    limit 1
  ) candidate
  ;

  if selected_quota.id is null then
    with usage as (
      select
        q.*,
        coalesce(count(sa.id) filter (
          where sa.status not in ('rejected', 'withdrawn')
            and sa.assigned_duty = q.duty_key
        ), 0)::int as assigned_count
      from public.event_staff_duty_quotas q
      left join public.staff_applications sa on sa.event_id = q.event_id
      where q.event_id = input_event_id
        and exists (
          select 1
          from public.events e
          where e.id = q.event_id
            and e.visibility = 'public'
            and e.status in ('staff_recruiting', 'active')
        )
      group by q.id
    )
    select *
    into selected_quota
    from (
      select q.*
      from usage q
      where is_general = true
        and assigned_count < quota
      order by priority asc, duty_label_th
      limit 1
    ) candidate;

    if selected_quota.id is null then
      return jsonb_build_object(
        'assigned_duty', null,
        'assigned_label_th', null,
        'assignment_method', 'pending',
        'assignment_note', 'โควต้าฝ่ายเต็มแล้ว รอผู้ดูแลจัดสรรเพิ่มเติม',
        'quota', null,
        'used', null,
        'remaining', null
      );
    end if;

    select count(*)::int
    into used_count
    from public.staff_applications
    where event_id = input_event_id
      and status not in ('rejected', 'withdrawn')
      and assigned_duty = selected_quota.duty_key;

    remaining_count := greatest(selected_quota.quota - used_count - 1, 0);

    return jsonb_build_object(
      'assigned_duty', selected_quota.duty_key,
      'assigned_label_th', selected_quota.duty_label_th,
      'assignment_method', 'fallback_general',
      'assignment_note', 'ฝ่ายที่เลือกเต็มแล้ว ระบบจัดให้อยู่ฝ่ายทั่วไปเบื้องต้น',
      'quota', selected_quota.quota,
      'used', used_count + 1,
      'remaining', remaining_count
    );
  end if;

  select count(*)::int
  into used_count
  from public.staff_applications
  where event_id = input_event_id
    and status not in ('rejected', 'withdrawn')
    and assigned_duty = selected_quota.duty_key;

  remaining_count := greatest(selected_quota.quota - used_count - 1, 0);

  return jsonb_build_object(
    'assigned_duty', selected_quota.duty_key,
    'assigned_label_th', selected_quota.duty_label_th,
    'assignment_method', 'auto_quota',
    'assignment_note', 'ระบบจัดฝ่ายเบื้องต้นตามโควต้าและฝ่ายที่เลือก',
    'quota', selected_quota.quota,
    'used', used_count + 1,
    'remaining', remaining_count
  );
end;
$$;

create or replace function public.update_staff_application_assignment(
  input_application_id uuid,
  input_assigned_duty text,
  input_assignment_note text default ''
)
returns public.staff_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  application_row public.staff_applications;
  updated_row public.staff_applications;
  quota_row public.event_staff_duty_quotas;
  clean_duty text := public.clean_placeholder_text(input_assigned_duty);
  clean_note text := public.clean_placeholder_text(input_assignment_note);
  quota_status jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  select *
  into application_row
  from public.staff_applications
  where id = input_application_id
  for update;

  if application_row.id is null then
    raise exception 'Staff application not found';
  end if;

  if clean_duty is not null then
    select *
    into quota_row
    from public.event_staff_duty_quotas
    where event_id = application_row.event_id
      and duty_key = clean_duty
    limit 1;

    if quota_row.id is null then
      raise exception 'Duty quota not found';
    end if;
  end if;

  quota_status := public.get_event_staff_duty_quota_status(application_row.event_id);

  update public.staff_applications
  set
    assigned_duty = clean_duty,
    assignment_method = case when clean_duty is null then 'pending' else 'manual_admin' end,
    assignment_note = coalesce(clean_note, case when clean_duty is null then 'รอผู้ดูแลจัดสรรเพิ่มเติม' else 'ผู้ดูแลปรับฝ่ายเบื้องต้นด้วยตนเอง' end),
    answers = coalesce(answers, '{}'::jsonb)
      || jsonb_build_object(
        'assigned_duty_label_th', quota_row.duty_label_th,
        'assignment_snapshot', jsonb_build_object(
          'assigned_duty', clean_duty,
          'assigned_label_th', quota_row.duty_label_th,
          'assignment_method', case when clean_duty is null then 'pending' else 'manual_admin' end,
          'assignment_note', coalesce(clean_note, case when clean_duty is null then 'รอผู้ดูแลจัดสรรเพิ่มเติม' else 'ผู้ดูแลปรับฝ่ายเบื้องต้นด้วยตนเอง' end),
          'quota_status_before_override', quota_status
        )
      )
  where id = input_application_id
  returning * into updated_row;

  insert into public.change_logs (changed_by, action, old_data, new_data)
  values (
    auth.uid(),
    'update_staff_application_assignment',
    jsonb_build_object(
      'id', application_row.id,
      'assigned_duty', application_row.assigned_duty,
      'assignment_method', application_row.assignment_method,
      'assignment_note', application_row.assignment_note
    ),
    jsonb_build_object(
      'id', updated_row.id,
      'event_id', updated_row.event_id,
      'assigned_duty', updated_row.assigned_duty,
      'assignment_method', updated_row.assignment_method,
      'assignment_note', updated_row.assignment_note
    )
  );

  return updated_row;
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
  preferred_duties_value text[];
  assignment_result jsonb := '{}'::jsonb;
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

  select array_agg(value::text)
  into preferred_duties_value
  from jsonb_array_elements_text(input_data->'preferred_duties') as value;

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

  assignment_result := public.assign_parent_orientation_duty(event_row.id, preferred_duties_value);

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
    requested_major, update_request_id, assigned_duty, assignment_method, assignment_note
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
        'identity_review_pending', identity_status_value <> 'verified',
        'assigned_duty_label_th', assignment_result->>'assigned_label_th',
        'assignment_snapshot', assignment_result
      ),
    identity_status_value,
    email_value,
    phone_value,
    student_id_value,
    requested_name_th_value,
    requested_name_en_value,
    requested_major_value,
    update_request_id_value,
    assignment_result->>'assigned_duty',
    assignment_result->>'assignment_method',
    assignment_result->>'assignment_note'
  )
  returning * into application_row;

  insert into public.event_form_responses (event_id, form_id, person_id, response_json, status)
  values (event_row.id, form_row.id, person_row.id, coalesce(input_data, '{}'::jsonb) || jsonb_build_object('assignment_snapshot', assignment_result), 'submitted');

  return jsonb_build_object(
    'success', true,
    'code', case when identity_status_value = 'verified' then 'submitted' else 'submitted_pending_identity_review' end,
    'event', jsonb_build_object('id', event_row.id, 'slug', event_row.slug, 'name_th', event_row.name_th, 'name_en', event_row.name_en),
    'application', jsonb_build_object(
      'id', application_row.id,
      'status', application_row.status,
      'identity_status', application_row.identity_status,
      'assigned_duty', application_row.assigned_duty,
      'assigned_duty_label_th', assignment_result->>'assigned_label_th',
      'assignment_method', application_row.assignment_method,
      'assignment_note', application_row.assignment_note
    ),
    'assignment', assignment_result,
    'person', case when person_row.id is null then null else jsonb_build_object('person_id', person_row.id, 'display_name', coalesce(person_row.nickname, person_row.name_th, person_row.name_en, 'ผู้สมัคร')) end,
    'message_th', case when identity_status_value = 'verified' then 'ส่งใบสมัครแล้ว' else 'ส่งใบสมัครแล้ว แต่ยังรอตรวจสอบตัวตน' end
  );
end;
$$;

grant execute on function public.get_event_staff_duty_quota_status(uuid) to anon, authenticated;
grant execute on function public.assign_parent_orientation_duty(uuid, text[]) to anon, authenticated;
grant execute on function public.update_staff_application_assignment(uuid, text, text) to authenticated;
