create or replace function public.get_people_admin_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  with people_counts as (
    select
      count(*)::int as total_people,
      count(*) filter (where source = 'eng_year2_2569_excel' or (year_level = 2 and faculty = 'คณะวิศวกรรมศาสตร์'))::int as year2_people,
      count(*) filter (where source = 'legacy_profiles')::int as legacy_profiles_people,
      count(*) filter (where source = 'legacy_staff_profiles')::int as legacy_staff_people,
      count(*) filter (where public.clean_placeholder_text(student_id) is null)::int as missing_student_id,
      count(*) filter (where public.clean_placeholder_text(email) is null)::int as missing_email,
      count(*) filter (where public.clean_placeholder_text(phone) is null)::int as missing_phone
    from public.people
  ),
  link_counts as (
    select
      (select count(distinct person_id)::int from public.staff_profiles where person_id is not null) as linked_staff_profiles,
      (select count(distinct person_id)::int from public.profiles where person_id is not null) as linked_participant_profiles,
      (select count(distinct person_id)::int from public.staff_applications where person_id is not null) as staff_applicant_people,
      (select count(*)::int from public.staff_profiles where person_id is null) as staff_profiles_without_person_id,
      (select count(*)::int from public.profiles where person_id is null) as profiles_without_person_id,
      (select count(*)::int from public.staff_applications where person_id is null) as staff_applications_without_person_id
  ),
  duplicate_counts as (
    select
      (select count(*)::int from (
        select public.clean_placeholder_text(student_id)
        from public.people
        where public.clean_placeholder_text(student_id) is not null
        group by public.clean_placeholder_text(student_id)
        having count(*) > 1
      ) d) as duplicate_student_id_count,
      (select count(*)::int from (
        select lower(public.clean_placeholder_text(email))
        from public.people
        where public.clean_placeholder_text(email) is not null
        group by lower(public.clean_placeholder_text(email))
        having count(*) > 1
      ) d) as duplicate_email_count,
      (select count(*)::int from (
        select public.normalize_import_phone(phone)
        from public.people
        where public.normalize_import_phone(phone) is not null
        group by public.normalize_import_phone(phone)
        having count(*) > 1
      ) d) as duplicate_phone_count
  ),
  staging_counts as (
    select
      case
        when to_regclass('public.people_import_year2_2569') is null then 0
        else (select count(*)::int from public.people_import_year2_2569 where import_status = 'skipped')
      end as year2_import_skipped_count
  )
  select to_jsonb(people_counts.*)
    || to_jsonb(link_counts.*)
    || to_jsonb(duplicate_counts.*)
    || to_jsonb(staging_counts.*)
  into summary
  from people_counts, link_counts, duplicate_counts, staging_counts;

  return summary;
end;
$$;

create or replace function public.search_admin_people(input jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  search_text text := nullif(btrim(coalesce(input->>'search', '')), '');
  search_digits text := nullif(regexp_replace(coalesce(input->>'search', ''), '\D', '', 'g'), '');
  source_filter text := nullif(btrim(coalesce(input->>'source', '')), '');
  year_filter int := nullif(input->>'year_level', '')::int;
  major_filter text := nullif(btrim(coalesce(input->>'major', '')), '');
  missing_field_filter text := nullif(btrim(coalesce(input->>'missing_field', '')), '');
  has_staff_profile_filter boolean := nullif(input->>'has_staff_profile', '')::boolean;
  has_participant_profile_filter boolean := nullif(input->>'has_participant_profile', '')::boolean;
  has_staff_application_filter boolean := nullif(input->>'has_staff_application', '')::boolean;
  page_limit int := least(greatest(coalesce(nullif(input->>'limit', '')::int, 100), 1), 500);
  page_offset int := greatest(coalesce(nullif(input->>'offset', '')::int, 0), 0);
  result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  with linked as (
    select
      p.id,
      p.student_id,
      p.name_th,
      p.name_en,
      p.nickname,
      p.nickname_th,
      p.nickname_en,
      p.email,
      p.phone,
      p.faculty,
      p.department,
      p.major,
      p.year_level,
      p.source,
      p.created_at,
      p.updated_at,
      coalesce(sp.staff_profile_count, 0)::int as staff_profile_count,
      coalesce(lp.participant_profile_count, 0)::int as participant_profile_count,
      coalesce(sa.staff_application_count, 0)::int as staff_application_count
    from public.people p
    left join (
      select person_id, count(*) as staff_profile_count
      from public.staff_profiles
      where person_id is not null
      group by person_id
    ) sp on sp.person_id = p.id
    left join (
      select person_id, count(*) as participant_profile_count
      from public.profiles
      where person_id is not null
      group by person_id
    ) lp on lp.person_id = p.id
    left join (
      select person_id, count(*) as staff_application_count
      from public.staff_applications
      where person_id is not null
      group by person_id
    ) sa on sa.person_id = p.id
  ),
  filtered as (
    select *
    from linked
    where (
      search_text is null
      or lower(coalesce(name_th, '')) like '%' || lower(search_text) || '%'
      or lower(coalesce(name_en, '')) like '%' || lower(search_text) || '%'
      or lower(coalesce(nickname, '')) like '%' || lower(search_text) || '%'
      or lower(coalesce(nickname_th, '')) like '%' || lower(search_text) || '%'
      or lower(coalesce(nickname_en, '')) like '%' || lower(search_text) || '%'
      or lower(coalesce(student_id, '')) like '%' || lower(search_text) || '%'
      or lower(coalesce(email, '')) like '%' || lower(search_text) || '%'
      or (search_digits is not null and regexp_replace(coalesce(phone, ''), '\D', '', 'g') like '%' || search_digits || '%')
    )
      and (source_filter is null or source = source_filter)
      and (year_filter is null or year_level = year_filter)
      and (major_filter is null or major = major_filter)
      and (
        missing_field_filter is null
        or (missing_field_filter = 'student_id' and public.clean_placeholder_text(student_id) is null)
        or (missing_field_filter = 'email' and public.clean_placeholder_text(email) is null)
        or (missing_field_filter = 'phone' and public.clean_placeholder_text(phone) is null)
      )
      and (has_staff_profile_filter is null or (staff_profile_count > 0) = has_staff_profile_filter)
      and (has_participant_profile_filter is null or (participant_profile_count > 0) = has_participant_profile_filter)
      and (has_staff_application_filter is null or (staff_application_count > 0) = has_staff_application_filter)
  ),
  page_rows as (
    select *
    from filtered
    order by updated_at desc nulls last, created_at desc nulls last, name_th nulls last
    limit page_limit offset page_offset
  ),
  filter_options as (
    select jsonb_build_object(
      'sources', coalesce((select jsonb_agg(source order by source) from (select distinct source from public.people where source is not null and btrim(source) <> '') s), '[]'::jsonb),
      'year_levels', coalesce((select jsonb_agg(year_level order by year_level) from (select distinct year_level from public.people where year_level is not null) y), '[]'::jsonb),
      'majors', coalesce((select jsonb_agg(major order by major) from (select distinct major from public.people where major is not null and btrim(major) <> '') m), '[]'::jsonb)
    ) as options
  )
  select jsonb_build_object(
    'total_count', (select count(*)::int from filtered),
    'limit', page_limit,
    'offset', page_offset,
    'rows', coalesce((select jsonb_agg(to_jsonb(page_rows.*)) from page_rows), '[]'::jsonb),
    'filter_options', (select options from filter_options)
  )
  into result;

  return result;
end;
$$;

create or replace function public.get_people_data_health()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary jsonb := public.get_people_admin_summary();
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  return jsonb_build_object(
    'issues', jsonb_build_array(
      jsonb_build_object(
        'key', 'duplicate_student_id',
        'count', coalesce((summary->>'duplicate_student_id_count')::int, 0),
        'severity', case when coalesce((summary->>'duplicate_student_id_count')::int, 0) > 0 then 'critical' else 'info' end,
        'message_th', 'พบรหัสนักศึกษาซ้ำ ควรตรวจสอบก่อนเปิดใช้ prefill จริง',
        'message_en', 'Duplicate student IDs found. Review before enabling production prefill.',
        'next_action_th', 'ตรวจแถวที่ซ้ำและวางแผน merge ในเฟสถัดไป',
        'next_action_en', 'Review duplicates and plan merge tools in a later phase.'
      ),
      jsonb_build_object(
        'key', 'duplicate_email',
        'count', coalesce((summary->>'duplicate_email_count')::int, 0),
        'severity', case when coalesce((summary->>'duplicate_email_count')::int, 0) > 0 then 'warning' else 'info' end,
        'message_th', 'พบอีเมลซ้ำ ควรตรวจสอบก่อนเปิดรับสมัครจริง',
        'message_en', 'Duplicate emails found. Review before real recruitment.',
        'next_action_th', 'ค้นหาด้วยอีเมลและตรวจว่าคือคนเดียวกันหรือข้อมูลผิด',
        'next_action_en', 'Search by email and verify whether rows represent the same person.'
      ),
      jsonb_build_object(
        'key', 'duplicate_phone',
        'count', coalesce((summary->>'duplicate_phone_count')::int, 0),
        'severity', case when coalesce((summary->>'duplicate_phone_count')::int, 0) > 0 then 'warning' else 'info' end,
        'message_th', 'พบเบอร์โทรซ้ำ ควรตรวจสอบก่อนใช้ยืนยันตัวตน',
        'message_en', 'Duplicate phone numbers found. Review before using for identity checks.',
        'next_action_th', 'ตรวจรูปแบบเบอร์และเจ้าของเบอร์ในข้อมูลต้นทาง',
        'next_action_en', 'Review phone formatting and source ownership.'
      ),
      jsonb_build_object(
        'key', 'missing_student_id',
        'count', coalesce((summary->>'missing_student_id')::int, 0),
        'severity', 'warning',
        'message_th', 'มี people ที่ไม่มีรหัสนักศึกษา',
        'message_en', 'Some people are missing student IDs.',
        'next_action_th', 'เติมจากข้อมูลต้นทางถ้ามี หรือใช้ email เป็นตัวช่วย match ชั่วคราว',
        'next_action_en', 'Fill from source data when available, or use email matching temporarily.'
      ),
      jsonb_build_object(
        'key', 'missing_email',
        'count', coalesce((summary->>'missing_email')::int, 0),
        'severity', 'warning',
        'message_th', 'มี people ที่ไม่มีอีเมล',
        'message_en', 'Some people are missing emails.',
        'next_action_th', 'เติมอีเมลก่อนเปิด workflow ที่ต้องยืนยันตัวตน',
        'next_action_en', 'Fill emails before workflows that require identity verification.'
      ),
      jsonb_build_object(
        'key', 'missing_phone',
        'count', coalesce((summary->>'missing_phone')::int, 0),
        'severity', 'warning',
        'message_th', 'มี people ที่ไม่มีเบอร์โทร',
        'message_en', 'Some people are missing phone numbers.',
        'next_action_th', 'เติมเบอร์โทรและตรวจเลข 10 หลักก่อนเปิด prefill',
        'next_action_en', 'Fill and verify 10-digit phone numbers before enabling prefill.'
      ),
      jsonb_build_object(
        'key', 'staff_profiles_without_person_id',
        'count', coalesce((summary->>'staff_profiles_without_person_id')::int, 0),
        'severity', case when coalesce((summary->>'staff_profiles_without_person_id')::int, 0) > 0 then 'warning' else 'info' end,
        'message_th', 'ยังมี staff_profiles ที่ไม่เชื่อมกับ people',
        'message_en', 'Some staff_profiles are not linked to people.',
        'next_action_th', 'รัน preview/link legacy people ใน staging ก่อน production',
        'next_action_en', 'Run legacy people preview/link on staging before production.'
      ),
      jsonb_build_object(
        'key', 'profiles_without_person_id',
        'count', coalesce((summary->>'profiles_without_person_id')::int, 0),
        'severity', case when coalesce((summary->>'profiles_without_person_id')::int, 0) > 0 then 'warning' else 'info' end,
        'message_th', 'ยังมี profiles ที่ไม่เชื่อมกับ people',
        'message_en', 'Some profiles are not linked to people.',
        'next_action_th', 'ตรวจ preview legacy link ก่อนเชื่อมข้อมูลจริง',
        'next_action_en', 'Review legacy link preview before linking data.'
      ),
      jsonb_build_object(
        'key', 'staff_applications_without_person_id',
        'count', coalesce((summary->>'staff_applications_without_person_id')::int, 0),
        'severity', case when coalesce((summary->>'staff_applications_without_person_id')::int, 0) > 0 then 'critical' else 'info' end,
        'message_th', 'มี staff_applications ที่ไม่เชื่อมกับ people',
        'message_en', 'Some staff applications are not linked to people.',
        'next_action_th', 'ตรวจ RPC สมัครสตาฟและข้อมูลเก่าก่อนรับสมัครจริง',
        'next_action_en', 'Review staff application RPCs and legacy rows before real recruitment.'
      ),
      jsonb_build_object(
        'key', 'year2_import_skipped_count',
        'count', coalesce((summary->>'year2_import_skipped_count')::int, 0),
        'severity', case when coalesce((summary->>'year2_import_skipped_count')::int, 0) > 0 then 'warning' else 'info' end,
        'message_th', 'มีแถว year2 import ที่ถูกข้ามใน staging',
        'message_en', 'Some year 2 staging rows were skipped.',
        'next_action_th', 'เปิด staging table เพื่อตรวจ import_note แล้วแก้ข้อมูลต้นทาง',
        'next_action_en', 'Inspect staging import_note values and repair source rows.'
      )
    )
  );
end;
$$;

grant execute on function public.get_people_admin_summary() to authenticated;
grant execute on function public.search_admin_people(jsonb) to authenticated;
grant execute on function public.get_people_data_health() to authenticated;
