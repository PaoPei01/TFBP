alter table public.staff_assignments
  add column if not exists primary_role text,
  add column if not exists secondary_roles text[] not null default '{}',
  add column if not exists base_number integer;

create or replace function public.clean_placeholder_text(input text)
returns text
language plpgsql
immutable
as $$
declare
  raw text := nullif(btrim(coalesce(input, '')), '');
  lower_raw text;
begin
  if raw is null then
    return null;
  end if;

  lower_raw := lower(raw);
  if raw in ('ไม่ระบุ', 'อื่น ๆ', 'อื่นๆ', '-', '–', '—', 'ไม่มี', 'ไม่มื')
    or lower_raw in ('n/a', 'na', 'none', 'null', 'undefined') then
    return null;
  end if;

  return raw;
end;
$$;

create or replace function public.normalize_phone(value text)
returns text
language plpgsql
immutable
as $$
declare
  digits text := regexp_replace(coalesce(value, ''), '\D', '', 'g');
begin
  if digits = '' then
    return null;
  end if;
  if left(digits, 4) = '0066' then
    digits := '0' || substring(digits from 5);
  elsif left(digits, 2) = '66' and length(digits) in (11, 12) then
    digits := '0' || substring(digits from 3);
  elsif length(digits) = 9 and left(digits, 1) <> '0' then
    digits := '0' || digits;
  end if;
  return digits;
end;
$$;

create or replace function public.normalize_major(input_major text)
returns text
language plpgsql
immutable
as $$
declare
  raw text := public.clean_placeholder_text(input_major);
  normalized text;
  compact text;
begin
  if raw is null then
    return null;
  end if;

  normalized := lower(regexp_replace(replace(raw, 'ภาควิชา', ''), '\s+', ' ', 'g'));
  compact := regexp_replace(normalized, '\s+', '', 'g');

  if compact ~ '(^|\()ce(\)|$)' or compact like '%civilengineering%' or compact like '%วิศวกรรมโยธา%' and compact not like '%นานาชาติ%' then
    return 'วิศวกรรมโยธา (CE)';
  elsif compact ~ '(^|\()cie(\)|$)' or compact like '%civilengineering(international)%' or compact like '%โยธา%นานาชาติ%' then
    return 'วิศวกรรมโยธา (นานาชาติ) (CIE)';
  elsif compact ~ '(^|\()ee(\)|$)' or compact like '%electricalengineering%' and compact not like '%smartgrid%' or compact like '%วิศวกรรมไฟฟ้า%' and compact not like '%โครงข่ายไฟฟ้า%' then
    return 'วิศวกรรมไฟฟ้า (EE)';
  elsif compact ~ '(^|\()eesg(\)|$)' or compact like '%smartgrid%' or compact like '%โครงข่ายไฟฟ้าอัจฉริยะ%' then
    return 'วิศวกรรมไฟฟ้าและเทคโนโลยีโครงข่ายไฟฟ้าอัจฉริยะ (EESG)';
  elsif compact ~ '(^|\()envi(\)|$)' or compact like '%environmentalengineering%' or compact like '%สิ่งแวดล้อม%' then
    return 'วิศวกรรมสิ่งแวดล้อม (ENVI)';
  elsif compact ~ '(^|\()ie(\)|$)' or compact like '%industrialengineering%' and compact not like '%logistics%' or compact like '%อุตสาหการ%' and compact not like '%โลจิสติกส์%' then
    return 'วิศวกรรมอุตสาหการ (IE)';
  elsif compact ~ '(^|\()iel(\)|$)' or compact like '%logistics%' or compact like '%โลจิสติกส์%' then
    return 'วิศวกรรมอุตสาหการและการจัดการ โลจิสติกส์ (IEL)';
  elsif compact ~ '(^|\()cpe(\)|$)' or compact like '%computerengineering%' or compact like '%คอมพิวเตอร์%' then
    return 'วิศวกรรมคอมพิวเตอร์ (CPE)';
  elsif compact ~ '(^|\()mnp(\)|$)' or compact like '%mining%' or compact like '%petroleum%' or compact like '%เหมืองแร่%' or compact like '%ปิโตรเลียม%' then
    return 'วิศวกรรมเหมืองแร่และปิโตรเลียม (MNP)';
  elsif compact ~ '(^|\()reai(\)|$)' or compact like '%robotics%' or compact like '%artificialintelligence%' or compact like '%หุ่นยนต์%' or compact like '%ปัญญาประดิษฐ์%' then
    return 'วิศวกรรมหุ่นยนต์และปัญญาประดิษฐ์ (REAI)';
  elsif compact ~ '(^|\()mepm(\)|$)' or compact like '%projectmanagement%' or compact like '%บริหารโครงการ%' then
    return 'วิศวกรรมเครื่องกลและการบริหารโครงการวิศวกรรม (MEPM)';
  elsif compact ~ '(^|\()isce(\)|$)' or compact like '%cybersecurity%' or compact like '%ความมั่นคงปลอดภัยไซเบอร์%' then
    return 'วิศวกรรมระบบสารสนเทศและความมั่นคงปลอดภัยไซเบอร์ (ISCE)';
  elsif compact ~ '(^|\()isne(\)|$)' or compact like '%networkengineering%' or compact like '%ระบบสารสนเทศและเครือข่าย%' then
    return 'วิศวกรรมระบบสารสนเทศและเครือข่าย (ISNE)';
  elsif compact ~ '(^|\()me(\)|$)' or compact like '%mechanicalengineering%' and compact not like '%projectmanagement%' or compact like '%เครื่องกล%' and compact not like '%บริหารโครงการ%' then
    return 'วิศวกรรมเครื่องกล (ME)';
  elsif compact ~ '(^|\()igme(\)|$)' or compact like '%igeinternational%' or compact like '%multi-disciplinary%' or compact like '%multidisciplinary%' or compact like '%พหุวิทยาการ%' then
    return 'วิศวกรรมบูรณาการ และพหุวิทยาการ (IGE international)';
  elsif compact ~ '(^|\()ige(\)|$)' or compact like '%integratedengineering%' or compact like '%บูรณาการ%' then
    return 'วิศวกรรมบูรณาการ (IGE)';
  elsif compact ~ '(^|\()sce(\)|$)' or compact like '%semiconductor%' or compact like '%เซมิคอนดักเตอร์%' then
    return 'วิศวกรรมเซมิคอนดักเตอร์ (SCE)';
  end if;

  return raw;
end;
$$;

create or replace function public.normalize_major_text(input text)
returns text
language sql
immutable
as $$
  select public.normalize_major(input);
$$;

alter table public.staff_assignments
  drop constraint if exists staff_assignments_role_scope_check;

update public.staff_assignments
set primary_role = coalesce(public.normalize_staff_operational_role(primary_role), public.normalize_staff_operational_role(role), primary_role),
    role = case
      when public.normalize_staff_operational_role(coalesce(primary_role, role)) = 'พยาบาล' then 'emergency_staff'
      when role in ('staff', 'mentor', 'viewer', 'emergency_staff') then role
      else 'staff'
    end,
    secondary_roles = coalesce(array(
      select distinct public.normalize_staff_operational_role(role_name)
      from unnest(coalesce(secondary_roles, '{}'::text[])) role_name
      where public.normalize_staff_operational_role(role_name) is not null
    ), '{}'::text[]);

alter table public.staff_assignments
  alter column role set default 'staff',
  alter column role set not null;

alter table public.staff_assignments
  add constraint staff_assignments_role_scope_check
  check (role in ('staff', 'mentor', 'viewer', 'emergency_staff'));

insert into public.staff_role_quotas (role_name, target_count, warning_threshold, critical_threshold)
values
  ('วางแผน (ทีมบอ)', 7, 1, 2),
  ('พี่กลุ่ม', 60, 5, 10),
  ('พี่ฐาน', 112, 10, 20),
  ('ไทม์เมอร์', 9, 2, 3),
  ('พยาบาล', 9, 2, 3),
  ('จราจร', 13, 2, 4),
  ('สวัสดิการ', 5, 1, 2),
  ('สตาฟให้ความบันเทิง', 4, 1, 1),
  ('โฟโต้', 7, 1, 2)
on conflict (role_name) do update
set target_count = excluded.target_count,
    warning_threshold = excluded.warning_threshold,
    critical_threshold = excluded.critical_threshold,
    updated_at = now();

update public.profiles
set major = public.normalize_major(major),
    phone = public.normalize_phone(phone),
    emergency_phone = public.normalize_phone(emergency_phone),
    updated_at = now()
where major is distinct from public.normalize_major(major)
   or phone is distinct from public.normalize_phone(phone)
   or emergency_phone is distinct from public.normalize_phone(emergency_phone);

update public.staff_profiles
set major = public.normalize_major(major),
    phone = public.normalize_phone(phone),
    updated_at = now()
where major is distinct from public.normalize_major(major)
   or phone is distinct from public.normalize_phone(phone);

create or replace function public.validate_data_integrity()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary jsonb;
  warnings jsonb;
  errors jsonb;
  details jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  with canonical_majors(major) as (
    values
      ('วิศวกรรมโยธา (CE)'),
      ('วิศวกรรมไฟฟ้า (EE)'),
      ('วิศวกรรมสิ่งแวดล้อม (ENVI)'),
      ('วิศวกรรมอุตสาหการ (IE)'),
      ('วิศวกรรมเครื่องกล (ME)'),
      ('วิศวกรรมคอมพิวเตอร์ (CPE)'),
      ('วิศวกรรมเหมืองแร่และปิโตรเลียม (MNP)'),
      ('วิศวกรรมหุ่นยนต์และปัญญาประดิษฐ์ (REAI)'),
      ('วิศวกรรมบูรณาการ (IGE)'),
      ('วิศวกรรมเครื่องกลและการบริหารโครงการวิศวกรรม (MEPM)'),
      ('วิศวกรรมระบบสารสนเทศและความมั่นคงปลอดภัยไซเบอร์ (ISCE)'),
      ('วิศวกรรมไฟฟ้าและเทคโนโลยีโครงข่ายไฟฟ้าอัจฉริยะ (EESG)'),
      ('วิศวกรรมโยธา (นานาชาติ) (CIE)'),
      ('วิศวกรรมอุตสาหการและการจัดการ โลจิสติกส์ (IEL)'),
      ('วิศวกรรมบูรณาการ และพหุวิทยาการ (IGE international)'),
      ('วิศวกรรมเซมิคอนดักเตอร์ (SCE)'),
      ('วิศวกรรมระบบสารสนเทศและเครือข่าย (ISNE)')
  ),
  placeholder_rows as (
    select 'profiles' as source, id::text, student_id, email, name_th as name, value
    from public.profiles p
    cross join lateral (values (p.major), (p.phone), (p.disease), (p.drug_allergy), (p.food_allergy), (p.line_id), (p.instagram), (p.facebook)) v(value)
    where v.value is not null and public.clean_placeholder_text(v.value) is null
    union all
    select 'staff_profiles', id::text, student_id, email, name_th, value
    from public.staff_profiles sp
    cross join lateral (values (sp.major), (sp.phone), (sp.position), (sp.line_id), (sp.instagram), (sp.facebook)) v(value)
    where v.value is not null and public.clean_placeholder_text(v.value) is null
  ),
  duplicate_records as (
    select key_type, key_value, count(*) as duplicate_count
    from (
      select 'student_id' key_type, public.clean_placeholder_text(student_id) key_value from public.profiles
      union all select 'student_id', public.clean_placeholder_text(student_id) from public.staff_profiles
      union all select 'email', lower(public.clean_placeholder_text(email)) from public.profiles
      union all select 'email', lower(public.clean_placeholder_text(email)) from public.staff_profiles
      union all select 'phone', public.normalize_phone(phone) from public.profiles
      union all select 'phone', public.normalize_phone(phone) from public.staff_profiles
    ) d
    where key_value is not null and key_value <> ''
    group by key_type, key_value
    having count(*) > 1
  ),
  invalid_major_rows as (
    select 'profiles' as source, id::text, student_id, name_th as name, major from public.profiles p where major is not null and not exists (select 1 from canonical_majors cm where cm.major = public.normalize_major(p.major))
    union all
    select 'staff_profiles', id::text, student_id, name_th, major from public.staff_profiles sp where major is not null and not exists (select 1 from canonical_majors cm where cm.major = public.normalize_major(sp.major))
  ),
  staff_without_assignment as (
    select sp.id::text, sp.student_id, sp.name_th, sp.email, sp.major
    from public.staff_profiles sp
    where not exists (select 1 from public.staff_assignments sa where sa.staff_profile_id = sp.id)
  ),
  orphan_staff_assignments as (
    select sa.id::text, sa.staff_profile_id::text, sa.user_id::text, sa.role, sa.primary_role, sa.main_group, sa.subgroup
    from public.staff_assignments sa
    left join public.staff_profiles sp on sp.id = sa.staff_profile_id
    where sa.staff_profile_id is null or sp.id is null
  ),
  orphan_group_assignments as (
    select ga.id::text, ga.profile_id::text, ga.main_group, ga.subgroup
    from public.group_assignments ga
    left join public.profiles p on p.id = ga.profile_id
    where p.id is null
  ),
  invalid_roles as (
    select id::text, staff_profile_id::text, role, primary_role
    from public.staff_assignments
    where role is null or role not in ('staff', 'mentor', 'viewer', 'emergency_staff')
  ),
  thai_roles as (
    select id::text, staff_profile_id::text, role, primary_role
    from public.staff_assignments
    where public.normalize_staff_operational_role(role) is not null
  ),
  invalid_scope as (
    select id::text, staff_profile_id::text, role, main_group, subgroup
    from public.staff_assignments
    where (main_group is not null and main_group not in ('Red', 'Blue', 'Yellow', 'Green', 'Pink', 'Purple', 'Orange'))
       or (subgroup is not null and subgroup not in ('A', 'B'))
  )
  select jsonb_build_object(
    'participant_total', (select count(*) from public.profiles),
    'staff_total', (select count(*) from public.staff_profiles),
    'missing_participant_major', (select count(*) from public.profiles where public.clean_placeholder_text(major) is null),
    'missing_staff_major', (select count(*) from public.staff_profiles where public.clean_placeholder_text(major) is null),
    'invalid_major_format', (select count(*) from invalid_major_rows),
    'placeholder_values', (select count(*) from placeholder_rows),
    'duplicate_student_id', (select coalesce(sum(duplicate_count), 0) from duplicate_records where key_type = 'student_id'),
    'duplicate_email', (select coalesce(sum(duplicate_count), 0) from duplicate_records where key_type = 'email'),
    'duplicate_phone', (select coalesce(sum(duplicate_count), 0) from duplicate_records where key_type = 'phone'),
    'staff_without_assignment', (select count(*) from staff_without_assignment),
    'orphan_staff_assignments', (select count(*) from orphan_staff_assignments),
    'orphan_group_assignments', (select count(*) from orphan_group_assignments),
    'assignment_without_staff_profile', (select count(*) from orphan_staff_assignments),
    'staff_missing_email_or_phone', (select count(*) from public.staff_profiles where public.clean_placeholder_text(email) is null or public.normalize_phone(phone) is null),
    'invalid_staff_role', (select count(*) from invalid_roles),
    'thai_duty_in_role', (select count(*) from thai_roles),
    'invalid_group_scope', (select count(*) from invalid_scope)
  )
  into summary;

  select coalesce(jsonb_agg(jsonb_build_object('type', key, 'severity', 'warning', 'count', (value)::int, 'message', key || ': ' || value)), '[]'::jsonb)
  into warnings
  from jsonb_each_text(summary)
  where key not in ('participant_total', 'staff_total') and key not like 'orphan_%' and key not in ('assignment_without_staff_profile') and (value)::int > 0;

  select coalesce(jsonb_agg(jsonb_build_object('type', key, 'severity', 'error', 'count', (value)::int, 'message', key || ': ' || value)), '[]'::jsonb)
  into errors
  from jsonb_each_text(summary)
  where (key like 'orphan_%' or key in ('assignment_without_staff_profile', 'invalid_staff_role')) and (value)::int > 0;

  with canonical_majors(major) as (
    values
      ('วิศวกรรมโยธา (CE)'), ('วิศวกรรมไฟฟ้า (EE)'), ('วิศวกรรมสิ่งแวดล้อม (ENVI)'), ('วิศวกรรมอุตสาหการ (IE)'),
      ('วิศวกรรมเครื่องกล (ME)'), ('วิศวกรรมคอมพิวเตอร์ (CPE)'), ('วิศวกรรมเหมืองแร่และปิโตรเลียม (MNP)'),
      ('วิศวกรรมหุ่นยนต์และปัญญาประดิษฐ์ (REAI)'), ('วิศวกรรมบูรณาการ (IGE)'),
      ('วิศวกรรมเครื่องกลและการบริหารโครงการวิศวกรรม (MEPM)'),
      ('วิศวกรรมระบบสารสนเทศและความมั่นคงปลอดภัยไซเบอร์ (ISCE)'),
      ('วิศวกรรมไฟฟ้าและเทคโนโลยีโครงข่ายไฟฟ้าอัจฉริยะ (EESG)'),
      ('วิศวกรรมโยธา (นานาชาติ) (CIE)'), ('วิศวกรรมอุตสาหการและการจัดการ โลจิสติกส์ (IEL)'),
      ('วิศวกรรมบูรณาการ และพหุวิทยาการ (IGE international)'), ('วิศวกรรมเซมิคอนดักเตอร์ (SCE)'),
      ('วิศวกรรมระบบสารสนเทศและเครือข่าย (ISNE)')
  ),
  invalid_major_sample as (
    select 'profiles' as source, id::text, student_id, name_th as name, major from public.profiles p where major is not null and not exists (select 1 from canonical_majors cm where cm.major = public.normalize_major(p.major))
    union all
    select 'staff_profiles', id::text, student_id, name_th, major from public.staff_profiles sp where major is not null and not exists (select 1 from canonical_majors cm where cm.major = public.normalize_major(sp.major))
  ),
  placeholder_sample as (
    select 'profiles' as source, id::text, student_id, email, name_th as name, value
    from public.profiles p
    cross join lateral (values (p.major), (p.phone), (p.disease), (p.drug_allergy), (p.food_allergy), (p.line_id), (p.instagram), (p.facebook)) v(value)
    where v.value is not null and public.clean_placeholder_text(v.value) is null
    union all
    select 'staff_profiles', id::text, student_id, email, name_th, value
    from public.staff_profiles sp
    cross join lateral (values (sp.major), (sp.phone), (sp.position), (sp.line_id), (sp.instagram), (sp.facebook)) v(value)
    where v.value is not null and public.clean_placeholder_text(v.value) is null
  ),
  duplicate_sample as (
    select key_type, key_value, count(*) as duplicate_count
    from (
      select 'student_id' key_type, public.clean_placeholder_text(student_id) key_value from public.profiles
      union all select 'student_id', public.clean_placeholder_text(student_id) from public.staff_profiles
      union all select 'email', lower(public.clean_placeholder_text(email)) from public.profiles
      union all select 'email', lower(public.clean_placeholder_text(email)) from public.staff_profiles
      union all select 'phone', public.normalize_phone(phone) from public.profiles
      union all select 'phone', public.normalize_phone(phone) from public.staff_profiles
    ) d
    where key_value is not null and key_value <> ''
    group by key_type, key_value
    having count(*) > 1
  )
  select jsonb_build_object(
    'missing_staff_major', coalesce((select jsonb_agg(to_jsonb(x)) from (select id::text, student_id, name_th, email, major from public.staff_profiles where public.clean_placeholder_text(major) is null limit 50) x), '[]'::jsonb),
    'invalid_major_format', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from invalid_major_sample limit 50) x), '[]'::jsonb),
    'placeholder_values', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from placeholder_sample limit 50) x), '[]'::jsonb),
    'duplicate_records', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from duplicate_sample limit 50) x), '[]'::jsonb),
    'orphan_staff_assignments', coalesce((select jsonb_agg(to_jsonb(x)) from (select sa.id::text, sa.staff_profile_id::text, sa.user_id::text, sa.role, sa.primary_role from public.staff_assignments sa left join public.staff_profiles sp on sp.id = sa.staff_profile_id where sa.staff_profile_id is null or sp.id is null limit 50) x), '[]'::jsonb),
    'staff_without_assignment', coalesce((select jsonb_agg(to_jsonb(x)) from (select sp.id::text, sp.student_id, sp.name_th, sp.email, sp.major from public.staff_profiles sp where not exists (select 1 from public.staff_assignments sa where sa.staff_profile_id = sp.id) limit 50) x), '[]'::jsonb),
    'invalid_staff_role', coalesce((select jsonb_agg(to_jsonb(x)) from (select id::text, staff_profile_id::text, role, primary_role from public.staff_assignments where role is null or role not in ('staff', 'mentor', 'viewer', 'emergency_staff') limit 50) x), '[]'::jsonb),
    'thai_duty_in_role', coalesce((select jsonb_agg(to_jsonb(x)) from (select id::text, staff_profile_id::text, role, primary_role from public.staff_assignments where public.normalize_staff_operational_role(role) is not null limit 50) x), '[]'::jsonb),
    'invalid_group_scope', coalesce((select jsonb_agg(to_jsonb(x)) from (select id::text, staff_profile_id::text, role, main_group, subgroup from public.staff_assignments where (main_group is not null and main_group not in ('Red', 'Blue', 'Yellow', 'Green', 'Pink', 'Purple', 'Orange')) or (subgroup is not null and subgroup not in ('A', 'B')) limit 50) x), '[]'::jsonb)
  )
  into details;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'data_health_viewed', '{}'::jsonb, summary);

  return jsonb_build_object('summary', summary, 'warnings', warnings, 'errors', errors, 'details', details);
end;
$$;

create or replace function public.run_data_health_repair(input_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  action text := public.clean_placeholder_text(input_action);
  result jsonb := '{}'::jsonb;
  participant_count integer := 0;
  staff_count integer := 0;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  if action = 'clean_placeholders' then
    result := public.clean_placeholder_values_admin();
  elsif action = 'normalize_majors' or action = 'major_only_repair' then
    result := public.normalize_all_major_values();

    update public.staff_profiles sp
    set major = public.normalize_major(p.major),
        updated_at = now()
    from public.profiles p
    where sp.student_id is not null
      and p.student_id = sp.student_id
      and public.clean_placeholder_text(sp.major) is null
      and public.clean_placeholder_text(p.major) is not null;
    get diagnostics staff_count = row_count;
    result := result || jsonb_build_object('staff_major_filled_from_participants', staff_count);
  elsif action = 'repair_staff_roles' then
    result := public.repair_staff_assignment_roles();
  elsif action = 'repair_orphans' then
    result := public.repair_orphan_staff_assignments();
  elsif action = 'sync_staff_roster' then
    result := public.sync_staff_roster_safe();
  elsif action = 'rebuild_group_settings_mentors' then
    if to_regprocedure('public.refresh_group_setting_mentors_from_staff()') is not null then
      execute 'select public.refresh_group_setting_mentors_from_staff()' into staff_count;
      result := jsonb_build_object('groups', staff_count);
    else
      result := jsonb_build_object('skipped', true, 'reason', 'refresh_group_setting_mentors_from_staff() is not installed');
    end if;
  else
    raise exception 'unsupported data health repair action: %', input_action;
  end if;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'data_health_repair_' || action, '{}'::jsonb, result);

  return jsonb_build_object('action', action, 'result', result);
end;
$$;

grant execute on function public.clean_placeholder_text(text) to anon, authenticated;
grant execute on function public.normalize_phone(text) to anon, authenticated;
grant execute on function public.normalize_major(text) to anon, authenticated;
grant execute on function public.normalize_major_text(text) to anon, authenticated;
grant execute on function public.validate_data_integrity() to authenticated;
grant execute on function public.run_data_health_repair(text) to authenticated;
