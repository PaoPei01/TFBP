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
  if raw in ('ไม่ระบุ', 'อื่น ๆ', '-', '—', 'ไม่มี')
    or lower_raw in ('n/a', 'na', 'none', 'null', 'undefined') then
    return null;
  end if;
  return raw;
end;
$$;

create or replace function public.normalize_major_text(input text)
returns text
language sql
immutable
as $$
  select public.normalize_major(public.clean_placeholder_text(input));
$$;

create or replace function public.normalize_all_major_values()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  participant_count integer;
  staff_count integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  update public.profiles
  set major = public.normalize_major_text(major),
      updated_at = now()
  where major is distinct from public.normalize_major_text(major);
  get diagnostics participant_count = row_count;

  update public.staff_profiles
  set major = public.normalize_major_text(major),
      updated_at = now()
  where major is distinct from public.normalize_major_text(major);
  get diagnostics staff_count = row_count;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'data_health_normalize_majors', '{}'::jsonb, jsonb_build_object('participants', participant_count, 'staff', staff_count));

  return jsonb_build_object('participants', participant_count, 'staff', staff_count);
end;
$$;

create or replace function public.clean_placeholder_values_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  participant_count integer;
  staff_count integer;
  staff_medical_count integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  update public.profiles
  set email = public.clean_placeholder_text(email),
      student_id = public.clean_placeholder_text(student_id),
      name_th = public.clean_placeholder_text(name_th),
      name_en = public.clean_placeholder_text(name_en),
      nickname = public.clean_placeholder_text(nickname),
      nickname_en = public.clean_placeholder_text(nickname_en),
      major = public.normalize_major_text(major),
      phone = public.clean_placeholder_text(phone),
      emergency_phone = public.clean_placeholder_text(emergency_phone),
      line_id = public.clean_placeholder_text(line_id),
      instagram = public.clean_placeholder_text(instagram),
      facebook = public.clean_placeholder_text(facebook),
      other_contact = public.clean_placeholder_text(other_contact),
      food_allergy = public.clean_placeholder_text(food_allergy),
      disease = public.clean_placeholder_text(disease),
      drug_allergy = public.clean_placeholder_text(drug_allergy),
      gender = public.clean_placeholder_text(gender),
      hometown = public.clean_placeholder_text(hometown),
      interests = public.clean_placeholder_text(interests),
      updated_at = now()
  where true;
  get diagnostics participant_count = row_count;

  update public.staff_profiles
  set student_id = public.clean_placeholder_text(student_id),
      email = public.clean_placeholder_text(email),
      name_th = public.clean_placeholder_text(name_th),
      name_en = public.clean_placeholder_text(name_en),
      nickname = public.clean_placeholder_text(nickname),
      nickname_th = public.clean_placeholder_text(nickname_th),
      nickname_en = public.clean_placeholder_text(nickname_en),
      phone = public.clean_placeholder_text(phone),
      major = public.normalize_major_text(major),
      instagram = public.clean_placeholder_text(instagram),
      line_id = public.clean_placeholder_text(line_id),
      facebook = public.clean_placeholder_text(facebook),
      other_contact = public.clean_placeholder_text(other_contact),
      position = public.clean_placeholder_text(position),
      updated_at = now()
  where true;
  get diagnostics staff_count = row_count;

  update public.staff_medical_info
  set disease = public.clean_placeholder_text(disease),
      drug_allergy = public.clean_placeholder_text(drug_allergy),
      food_allergy = public.clean_placeholder_text(food_allergy),
      medical_note = public.clean_placeholder_text(medical_note),
      updated_at = now()
  where true;
  get diagnostics staff_medical_count = row_count;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'data_health_clean_placeholders', '{}'::jsonb, jsonb_build_object('participants', participant_count, 'staff', staff_count, 'staff_medical', staff_medical_count));

  return jsonb_build_object('participants', participant_count, 'staff', staff_count, 'staff_medical', staff_medical_count);
end;
$$;

create or replace function public.repair_staff_assignment_roles()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  fixed_count integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  update public.staff_assignments sa
  set primary_role = coalesce(
        public.normalize_staff_operational_role(sa.primary_role),
        public.normalize_staff_operational_role(sa.role),
        public.normalize_staff_operational_role((select sp.position from public.staff_profiles sp where sp.id = sa.staff_profile_id)),
        sa.primary_role
      ),
      secondary_roles = coalesce(array(
        select distinct public.normalize_staff_operational_role(role_name)
        from unnest(coalesce(sa.secondary_roles, '{}'::text[])) role_name
        where public.normalize_staff_operational_role(role_name) is not null
      ), '{}'::text[]),
      role = coalesce(public.normalize_staff_system_role(sa.role, coalesce(sa.primary_role, (select sp.position from public.staff_profiles sp where sp.id = sa.staff_profile_id))), 'staff')
  where sa.staff_profile_id is null
     or sa.role is null
     or sa.role not in ('staff', 'mentor', 'viewer', 'emergency_staff')
     or public.normalize_staff_operational_role(sa.primary_role) is distinct from sa.primary_role;
  get diagnostics fixed_count = row_count;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'data_health_repair_staff_assignment_roles', '{}'::jsonb, jsonb_build_object('fixed', fixed_count));

  return jsonb_build_object('fixed', fixed_count);
end;
$$;

create or replace function public.repair_orphan_staff_assignments()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  reconnected_count integer := 0;
  unresolved jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  update public.staff_assignments sa
  set staff_profile_id = sp.id
  from public.staff_profiles sp
  where sa.staff_profile_id is null
    and sa.user_id is not null
    and sp.user_id = sa.user_id;
  get diagnostics reconnected_count = row_count;

  select coalesce(jsonb_agg(to_jsonb(sa)), '[]'::jsonb)
  into unresolved
  from public.staff_assignments sa
  left join public.staff_profiles sp on sp.id = sa.staff_profile_id
  where sa.staff_profile_id is null or sp.id is null;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'data_health_repair_orphan_staff_assignments', '{}'::jsonb, jsonb_build_object('reconnected', reconnected_count, 'unresolved', jsonb_array_length(unresolved)));

  return jsonb_build_object('reconnected', reconnected_count, 'unresolved', unresolved);
end;
$$;

create or replace function public.sync_staff_roster_safe()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;
  result := public.rebuild_staff_roster_sync();
  return jsonb_build_object('result', result, 'warnings', coalesce((select count(*) from public.staff_profiles sp where not exists (select 1 from public.staff_assignments sa where sa.staff_profile_id = sp.id)), 0));
end;
$$;

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

  with placeholder_rows as (
    select 'profiles' as source, id, student_id, email, name_th, value
    from public.profiles p
    cross join lateral (values (p.major), (p.phone), (p.disease), (p.drug_allergy), (p.food_allergy), (p.line_id), (p.instagram), (p.facebook)) v(value)
    where v.value is not null and public.clean_placeholder_text(v.value) is null
    union all
    select 'staff_profiles', id, student_id, email, name_th, value
    from public.staff_profiles sp
    cross join lateral (values (sp.major), (sp.phone), (sp.position), (sp.line_id), (sp.instagram), (sp.facebook)) v(value)
    where v.value is not null and public.clean_placeholder_text(v.value) is null
  ),
  duplicate_records as (
    select key_type, key_value, count(*) as duplicate_count
    from (
      select 'student_id' key_type, student_id key_value from public.profiles
      union all select 'student_id', student_id from public.staff_profiles
      union all select 'email', lower(email) from public.profiles
      union all select 'email', lower(email) from public.staff_profiles
      union all select 'phone', regexp_replace(coalesce(phone, ''), '\D', '', 'g') from public.profiles
      union all select 'phone', regexp_replace(coalesce(phone, ''), '\D', '', 'g') from public.staff_profiles
    ) d
    where key_value is not null and key_value <> ''
    group by key_type, key_value
    having count(*) > 1
  ),
  invalid_major_rows as (
    select 'profiles' as source, id, student_id, name_th, major from public.profiles where major is not null and public.normalize_major_text(major) is distinct from major
    union all
    select 'staff_profiles', id, student_id, name_th, major from public.staff_profiles where major is not null and public.normalize_major_text(major) is distinct from major
  ),
  staff_without_assignment as (
    select sp.id, sp.student_id, sp.name_th, sp.email, sp.major
    from public.staff_profiles sp
    where not exists (select 1 from public.staff_assignments sa where sa.staff_profile_id = sp.id)
  ),
  orphan_staff_assignments as (
    select sa.*
    from public.staff_assignments sa
    left join public.staff_profiles sp on sp.id = sa.staff_profile_id
    where sa.staff_profile_id is null or sp.id is null
  ),
  orphan_group_assignments as (
    select ga.*
    from public.group_assignments ga
    left join public.profiles p on p.id = ga.profile_id
    where p.id is null
  )
  select jsonb_build_object(
    'participant_total', (select count(*) from public.profiles),
    'staff_total', (select count(*) from public.staff_profiles),
    'missing_participant_major', (select count(*) from public.profiles where major is null or btrim(coalesce(major, '')) = '' or public.clean_placeholder_text(major) is null),
    'missing_staff_major', (select count(*) from public.staff_profiles where major is null or btrim(coalesce(major, '')) = '' or public.clean_placeholder_text(major) is null),
    'invalid_major_format', (select count(*) from invalid_major_rows),
    'placeholder_values', (select count(*) from placeholder_rows),
    'duplicate_student_id', (select coalesce(sum(duplicate_count), 0) from duplicate_records where key_type = 'student_id'),
    'duplicate_email', (select coalesce(sum(duplicate_count), 0) from duplicate_records where key_type = 'email'),
    'duplicate_phone', (select coalesce(sum(duplicate_count), 0) from duplicate_records where key_type = 'phone'),
    'staff_without_assignment', (select count(*) from staff_without_assignment),
    'orphan_staff_assignments', (select count(*) from orphan_staff_assignments),
    'orphan_group_assignments', (select count(*) from orphan_group_assignments)
  )
  into summary;

  select coalesce(jsonb_agg(item), '[]'::jsonb)
  into warnings
  from (
    select jsonb_build_object('type', key, 'severity', 'warning', 'count', (value)::int, 'message', key || ': ' || value) item
    from jsonb_each_text(summary)
    where key not like 'orphan_%' and key not in ('participant_total', 'staff_total') and (value)::int > 0
  ) rows;

  select coalesce(jsonb_agg(item), '[]'::jsonb)
  into errors
  from (
    select jsonb_build_object('type', key, 'severity', 'error', 'count', (value)::int, 'message', key || ': ' || value) item
    from jsonb_each_text(summary)
    where key like 'orphan_%' and (value)::int > 0
  ) rows;

  with placeholder_rows as (
    select 'profiles' as source, id, student_id, email, name_th, value
    from public.profiles p
    cross join lateral (values (p.major), (p.phone), (p.disease), (p.drug_allergy), (p.food_allergy), (p.line_id), (p.instagram), (p.facebook)) v(value)
    where v.value is not null and public.clean_placeholder_text(v.value) is null
    union all
    select 'staff_profiles', id, student_id, email, name_th, value
    from public.staff_profiles sp
    cross join lateral (values (sp.major), (sp.phone), (sp.position), (sp.line_id), (sp.instagram), (sp.facebook)) v(value)
    where v.value is not null and public.clean_placeholder_text(v.value) is null
  ),
  duplicate_records as (
    select key_type, key_value, count(*) as duplicate_count
    from (
      select 'student_id' key_type, student_id key_value from public.profiles
      union all select 'student_id', student_id from public.staff_profiles
      union all select 'email', lower(email) from public.profiles
      union all select 'email', lower(email) from public.staff_profiles
      union all select 'phone', regexp_replace(coalesce(phone, ''), '\D', '', 'g') from public.profiles
      union all select 'phone', regexp_replace(coalesce(phone, ''), '\D', '', 'g') from public.staff_profiles
    ) d
    where key_value is not null and key_value <> ''
    group by key_type, key_value
    having count(*) > 1
  )
  select jsonb_build_object(
    'missing_staff_major', coalesce((select jsonb_agg(to_jsonb(sp)) from public.staff_profiles sp where sp.major is null or btrim(coalesce(sp.major, '')) = '' or public.clean_placeholder_text(sp.major) is null), '[]'::jsonb),
    'invalid_major_format', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select 'profiles' as source, id, student_id, name_th, major from public.profiles where major is not null and public.normalize_major_text(major) is distinct from major
      union all
      select 'staff_profiles', id, student_id, name_th, major from public.staff_profiles where major is not null and public.normalize_major_text(major) is distinct from major
    ) x), '[]'::jsonb),
    'placeholder_values', coalesce((select jsonb_agg(to_jsonb(placeholder_rows)) from placeholder_rows), '[]'::jsonb),
    'duplicate_records', coalesce((select jsonb_agg(to_jsonb(duplicate_records)) from duplicate_records), '[]'::jsonb),
    'orphan_staff_assignments', coalesce((select jsonb_agg(to_jsonb(sa)) from public.staff_assignments sa left join public.staff_profiles sp on sp.id = sa.staff_profile_id where sa.staff_profile_id is null or sp.id is null), '[]'::jsonb),
    'staff_without_assignment', coalesce((select jsonb_agg(to_jsonb(sp)) from public.staff_profiles sp where not exists (select 1 from public.staff_assignments sa where sa.staff_profile_id = sp.id)), '[]'::jsonb)
  )
  into details;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'data_health_viewed', '{}'::jsonb, summary);

  return jsonb_build_object('summary', summary, 'warnings', warnings, 'errors', errors, 'details', details);
end;
$$;

create or replace function public.import_staff_records_admin(input_rows jsonb, input_mode text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mode text := coalesce(nullif(input_mode, ''), 'full');
  item jsonb;
  profile_input jsonb;
  medical_input jsonb;
  profile_row public.staff_profiles;
  updated_count integer := 0;
  skipped_count integer := 0;
  full_result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  if mode = 'full' then
    full_result := public.import_staff_records_admin(input_rows);
    return full_result || jsonb_build_object('mode', mode);
  end if;

  if mode not in ('major_only', 'contact_only', 'medical_only') then
    raise exception 'unsupported import mode: %', mode;
  end if;

  for item in select * from jsonb_array_elements(input_rows)
  loop
    profile_input := coalesce(item->'profile', '{}'::jsonb);
    medical_input := coalesce(item->'medical', '{}'::jsonb);
    profile_row := null;

    if public.clean_placeholder_text(profile_input->>'student_id') is not null then
      select * into profile_row
      from public.staff_profiles
      where student_id = public.clean_placeholder_text(profile_input->>'student_id')
      limit 1;
    end if;

    if profile_row.id is null and public.clean_placeholder_text(profile_input->>'email') is not null then
      select * into profile_row
      from public.staff_profiles
      where lower(email) = lower(public.clean_placeholder_text(profile_input->>'email'))
      limit 1;
    end if;

    if profile_row.id is null and public.clean_placeholder_text(profile_input->>'phone') is not null then
      select * into profile_row
      from public.staff_profiles
      where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = regexp_replace(public.clean_placeholder_text(profile_input->>'phone'), '\D', '', 'g')
        and regexp_replace(coalesce(phone, ''), '\D', '', 'g') <> ''
      limit 1;
    end if;

    if profile_row.id is null then
      skipped_count := skipped_count + 1;
      continue;
    end if;

    if mode = 'major_only' then
      update public.staff_profiles
      set major = coalesce(public.normalize_major_text(profile_input->>'major'), major),
          updated_at = now()
      where id = profile_row.id
        and public.normalize_major_text(profile_input->>'major') is not null;
    elsif mode = 'contact_only' then
      update public.staff_profiles
      set email = case when profile_input ? 'email' then lower(public.clean_placeholder_text(profile_input->>'email')) else email end,
          phone = case when profile_input ? 'phone' then public.clean_placeholder_text(profile_input->>'phone') else phone end,
          instagram = case when profile_input ? 'instagram' then public.clean_placeholder_text(profile_input->>'instagram') else instagram end,
          line_id = case when profile_input ? 'line_id' then public.clean_placeholder_text(profile_input->>'line_id') else line_id end,
          facebook = case when profile_input ? 'facebook' then public.clean_placeholder_text(profile_input->>'facebook') else facebook end,
          other_contact = case when profile_input ? 'other_contact' then public.clean_placeholder_text(profile_input->>'other_contact') else other_contact end,
          updated_at = now()
      where id = profile_row.id;
    elsif mode = 'medical_only' then
      insert into public.staff_medical_info (staff_profile_id, disease, drug_allergy, food_allergy, medical_note, updated_at)
      values (
        profile_row.id,
        public.clean_placeholder_text(medical_input->>'disease'),
        public.clean_placeholder_text(medical_input->>'drug_allergy'),
        public.clean_placeholder_text(medical_input->>'food_allergy'),
        public.clean_placeholder_text(medical_input->>'medical_note'),
        now()
      )
      on conflict (staff_profile_id) do update
      set disease = case when medical_input ? 'disease' then excluded.disease else staff_medical_info.disease end,
          drug_allergy = case when medical_input ? 'drug_allergy' then excluded.drug_allergy else staff_medical_info.drug_allergy end,
          food_allergy = case when medical_input ? 'food_allergy' then excluded.food_allergy else staff_medical_info.food_allergy end,
          medical_note = case when medical_input ? 'medical_note' then excluded.medical_note else staff_medical_info.medical_note end,
          updated_at = now();
    end if;

    updated_count := updated_count + 1;
  end loop;

  insert into public.staff_audit_logs (actor_id, action, new_data)
  values (auth.uid(), 'staff_import_limited_committed', jsonb_build_object('mode', mode, 'updated', updated_count, 'skipped', skipped_count));

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'staff_import_limited_committed', '{}'::jsonb, jsonb_build_object('mode', mode, 'updated', updated_count, 'skipped', skipped_count));

  return jsonb_build_object('mode', mode, 'updated', updated_count, 'skipped', skipped_count);
end;
$$;

grant execute on function public.clean_placeholder_text(text) to anon, authenticated;
grant execute on function public.normalize_major_text(text) to anon, authenticated;
grant execute on function public.validate_data_integrity() to authenticated;
grant execute on function public.normalize_all_major_values() to authenticated;
grant execute on function public.clean_placeholder_values_admin() to authenticated;
grant execute on function public.repair_staff_assignment_roles() to authenticated;
grant execute on function public.repair_orphan_staff_assignments() to authenticated;
grant execute on function public.sync_staff_roster_safe() to authenticated;
grant execute on function public.import_staff_records_admin(jsonb, text) to authenticated;
