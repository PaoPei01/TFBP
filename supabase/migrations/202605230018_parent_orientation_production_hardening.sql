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

  -- Serialize preliminary duty assignment per event for the duration of this
  -- function transaction, so concurrent applicants cannot consume the same
  -- final remaining quota slot before the staff_applications insert happens.
  perform pg_advisory_xact_lock(hashtext('staff-duty-quota:' || event_row.id::text));

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

create or replace function public.log_staff_application_export(input_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_data jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  safe_data := jsonb_build_object(
    'event_id', input_data->>'event_id',
    'export_scope', input_data->>'export_scope',
    'row_count', coalesce((input_data->>'row_count')::int, 0),
    'includes_sensitive_fields', coalesce((input_data->>'includes_sensitive_fields')::boolean, false),
    'filters', coalesce(input_data->'filters', '{}'::jsonb),
    'exported_at', coalesce(input_data->>'exported_at', now()::text)
  );

  insert into public.change_logs (changed_by, action, old_data, new_data)
  values (auth.uid(), 'export_staff_applications_excel', '{}'::jsonb, safe_data);

  return jsonb_build_object('success', true, 'code', 'logged');
end;
$$;

create or replace function public.get_system_readiness_report()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  required_tables text[] := array[
    'events',
    'people',
    'staff_applications',
    'event_staff',
    'event_staff_duty_quotas',
    'event_forms',
    'event_form_responses',
    'person_update_requests',
    'change_logs',
    'admins'
  ];
  required_columns text[] := array[
    'staff_applications.assigned_duty',
    'staff_applications.assignment_method',
    'staff_applications.assignment_note',
    'staff_applications.identity_status',
    'staff_applications.requested_email',
    'staff_applications.requested_phone',
    'staff_applications.requested_student_id',
    'staff_applications.requested_name_th',
    'staff_applications.requested_name_en',
    'staff_applications.requested_major',
    'staff_applications.update_request_id'
  ];
  required_functions text[] := array[
    'get_event_staff_duty_quota_status',
    'assign_parent_orientation_duty',
    'update_staff_application_assignment',
    'submit_event_staff_application',
    'lookup_person_for_application',
    'submit_person_update_request',
    'review_staff_application',
    'promote_staff_application_to_event_staff',
    'is_admin'
  ];
  missing_tables text[] := array[]::text[];
  missing_columns text[] := array[]::text[];
  missing_functions text[] := array[]::text[];
  rls_enabled_tables text[] := array[]::text[];
  rls_missing_tables text[] := array[]::text[];
  parent_event public.events;
  duty_quota_count integer := 0;
  duty_quota_total integer := 0;
  quota_status jsonb := null;
  recommendations text[] := array[]::text[];
  report_ok boolean := true;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  select coalesce(array_agg(name), array[]::text[])
  into missing_tables
  from unnest(required_tables) as required_table(name)
  where not exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_name = required_table.name
  );

  select coalesce(array_agg(name), array[]::text[])
  into missing_columns
  from unnest(required_columns) as required_column(name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = split_part(required_column.name, '.', 1)
      and c.column_name = split_part(required_column.name, '.', 2)
  );

  select coalesce(array_agg(name), array[]::text[])
  into missing_functions
  from unnest(required_functions) as required_function(name)
  where not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = required_function.name
  );

  select coalesce(array_agg(name), array[]::text[])
  into rls_enabled_tables
  from unnest(required_tables) as required_table(name)
  where exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = required_table.name
      and c.relrowsecurity = true
  );

  select coalesce(array_agg(name), array[]::text[])
  into rls_missing_tables
  from unnest(required_tables) as required_table(name)
  where exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_name = required_table.name
  )
  and not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = required_table.name
      and c.relrowsecurity = true
  );

  select *
  into parent_event
  from public.events
  where slug = 'parent-orientation-staff-2569'
  limit 1;

  if parent_event.id is not null then
    select count(*)::int, coalesce(sum(quota), 0)::int
    into duty_quota_count, duty_quota_total
    from public.event_staff_duty_quotas
    where event_id = parent_event.id;

    quota_status := public.get_event_staff_duty_quota_status(parent_event.id);
  else
    recommendations := array_append(recommendations, 'ยังไม่พบกิจกรรม parent-orientation-staff-2569 กรุณารัน migration seed event');
  end if;

  if array_length(missing_tables, 1) is not null then
    recommendations := array_append(recommendations, 'มีตารางที่ยังไม่ครบ กรุณารัน migration ล่าสุดบน Supabase');
  end if;
  if array_length(missing_columns, 1) is not null then
    recommendations := array_append(recommendations, 'มีคอลัมน์ที่ยังไม่ครบ กรุณารัน migration ล่าสุดก่อนเปิดรับสมัคร');
  end if;
  if array_length(missing_functions, 1) is not null then
    recommendations := array_append(recommendations, 'มี RPC ที่ยังไม่ครบ กรุณาตรวจ migration และ grant execute');
  end if;
  if array_length(rls_missing_tables, 1) is not null then
    recommendations := array_append(recommendations, 'มีตารางที่ยังไม่ได้เปิด RLS กรุณาตรวจ policy ก่อนใช้งานจริง');
  end if;
  if parent_event.id is not null and duty_quota_total <> 130 then
    recommendations := array_append(recommendations, 'โควต้ารวมงานปฐมนิเทศผู้ปกครองไม่เท่ากับ 130 กรุณาตรวจ duty quota seed');
  end if;

  report_ok := coalesce(array_length(missing_tables, 1), 0) = 0
    and coalesce(array_length(missing_columns, 1), 0) = 0
    and coalesce(array_length(missing_functions, 1), 0) = 0
    and coalesce(array_length(rls_missing_tables, 1), 0) = 0
    and parent_event.id is not null
    and duty_quota_total = 130;

  if report_ok and array_length(recommendations, 1) is null then
    recommendations := array_append(recommendations, 'ระบบพื้นฐานพร้อมสำหรับ staging/production smoke test');
  end if;

  return jsonb_build_object(
    'ok', report_ok,
    'checked_at', now(),
    'database', jsonb_build_object(
      'required_tables', required_tables,
      'missing_tables', missing_tables,
      'required_columns', required_columns,
      'missing_columns', missing_columns,
      'required_functions', required_functions,
      'missing_functions', missing_functions
    ),
    'parent_orientation', jsonb_build_object(
      'event_exists', parent_event.id is not null,
      'event_id', parent_event.id,
      'event_status', parent_event.status,
      'event_visibility', parent_event.visibility,
      'duty_quota_count', duty_quota_count,
      'duty_quota_total', duty_quota_total,
      'expected_quota_total', 130,
      'quota_total_ok', duty_quota_total = 130,
      'quota_status', quota_status
    ),
    'security', jsonb_build_object(
      'rls_enabled_tables', rls_enabled_tables,
      'rls_missing_tables', rls_missing_tables
    ),
    'recommendations', recommendations
  );
end;
$$;

grant execute on function public.submit_event_staff_application(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.log_staff_application_export(jsonb) to authenticated;
grant execute on function public.get_system_readiness_report() to authenticated;
