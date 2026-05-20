create or replace function public.normalize_staff_operational_role(input_role text)
returns text
language plpgsql
immutable
as $$
declare
  raw text := nullif(btrim(coalesce(input_role, '')), '');
  lower_raw text;
begin
  if raw is null then
    return null;
  end if;

  lower_raw := lower(raw);

  if lower_raw like '%ทีมบอ%' or lower_raw like '%วางแผน%' or lower_raw like '%planner%' or lower_raw like '%plan%' then
    return 'วางแผน (ทีมบอ)';
  elsif lower_raw like '%พี่กลุ่ม%' or lower_raw like '%mentor%' or lower_raw like '%group staff%' then
    return 'พี่กลุ่ม';
  elsif lower_raw like '%พี่ฐาน%' or lower_raw like '%ฐาน%' or lower_raw like '%base%' then
    return 'พี่ฐาน';
  elsif lower_raw like '%ไทม์%' or lower_raw like '%timer%' then
    return 'ไทม์เมอร์';
  elsif lower_raw like '%พยาบาล%' or lower_raw like '%medic%' or lower_raw like '%medical%' or lower_raw like '%nurse%' then
    return 'พยาบาล';
  elsif lower_raw like '%จราจร%' or lower_raw like '%traffic%' then
    return 'จราจร';
  elsif lower_raw like '%สวัสดิการ%' or lower_raw like '%welfare%' then
    return 'สวัสดิการ';
  elsif lower_raw like '%บันเทิง%' or lower_raw like '%สันทนาการ%' or lower_raw like '%entertain%' then
    return 'สตาฟให้ความบันเทิง';
  elsif lower_raw like '%โฟโต้%' or lower_raw like '%photo%' or lower_raw like '%photographer%' then
    return 'โฟโต้';
  elsif lower_raw like '%พิธีกร%' or lower_raw like '%mc%' then
    return 'พิธีกร';
  end if;

  return raw;
end;
$$;

create or replace function public.staff_ops_roles(sa public.staff_assignments)
returns text[]
language sql
immutable
as $$
  select array_remove(
    array(
      select distinct public.normalize_staff_operational_role(role_name)
      from unnest(array_prepend(nullif(sa.primary_role, ''), coalesce(sa.secondary_roles, '{}'::text[]))) role_name
    ),
    null
  );
$$;

update public.staff_assignments
set primary_role = public.normalize_staff_operational_role(primary_role),
    secondary_roles = coalesce(array(
      select distinct public.normalize_staff_operational_role(role_name)
      from unnest(coalesce(secondary_roles, '{}'::text[])) role_name
      where public.normalize_staff_operational_role(role_name) is not null
    ), '{}'::text[])
where true;

update public.staff_assignments sa
set primary_role = coalesce(
  nullif(public.normalize_staff_operational_role(sa.primary_role), ''),
  nullif(public.normalize_staff_operational_role(sp.position), ''),
  case
    when sa.role = 'emergency_staff' then 'พยาบาล'
    when sa.role in ('staff', 'mentor') then 'พี่กลุ่ม'
    else 'ทีมงาน'
  end
)
from public.staff_profiles sp
where sp.id = sa.staff_profile_id
  and (sa.primary_role is null or sa.primary_role = '' or sa.primary_role = 'ทีมงาน');

update public.staff_profiles
set major = public.normalize_major(facebook),
    facebook = null,
    updated_at = now()
where (major is null or btrim(major) = '')
  and facebook is not null
  and public.normalize_major(facebook) <> facebook;

create or replace function public.clear_group_assignments()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_assignments jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  select coalesce(jsonb_agg(to_jsonb(ga)), '[]'::jsonb)
  into old_assignments
  from public.group_assignments ga;

  delete from public.group_assignments
  where true;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'group_assignments_cleared', old_assignments, jsonb_build_object('cleared_at', now()));
end;
$$;

create or replace function public.update_staff_profile_admin(
  input_staff_profile_id uuid,
  input_profile jsonb,
  input_medical jsonb default '{}'::jsonb,
  input_assignment jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_payload jsonb;
  updated_profile public.staff_profiles;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  if input_profile ? 'major'
    and public.normalize_major(nullif(input_profile->>'major', '')) is null
    and input_profile ? 'facebook'
    and public.normalize_major(nullif(input_profile->>'facebook', '')) <> nullif(input_profile->>'facebook', '') then
    input_profile := input_profile || jsonb_build_object('major', public.normalize_major(input_profile->>'facebook'), 'facebook', null);
  end if;

  select to_jsonb(sp) || jsonb_build_object('medical_info', to_jsonb(smi), 'assignment', to_jsonb(sa))
  into old_payload
  from public.staff_profiles sp
  left join public.staff_medical_info smi on smi.staff_profile_id = sp.id
  left join public.staff_assignments sa on sa.staff_profile_id = sp.id
  where sp.id = input_staff_profile_id;

  update public.staff_profiles
  set user_id = case when input_profile ? 'user_id' and nullif(input_profile->>'user_id', '') is not null then (input_profile->>'user_id')::uuid when input_profile ? 'user_id' then null else user_id end,
      student_id = case when input_profile ? 'student_id' then nullif(input_profile->>'student_id', '') else student_id end,
      email = case when input_profile ? 'email' then lower(nullif(input_profile->>'email', '')) else email end,
      name_th = case when input_profile ? 'name_th' then nullif(input_profile->>'name_th', '') else name_th end,
      name_en = case when input_profile ? 'name_en' then nullif(input_profile->>'name_en', '') else name_en end,
      nickname = case when input_profile ? 'nickname' then nullif(input_profile->>'nickname', '') else nickname end,
      nickname_th = case when input_profile ? 'nickname_th' then nullif(input_profile->>'nickname_th', '') else nickname_th end,
      nickname_en = case when input_profile ? 'nickname_en' then nullif(input_profile->>'nickname_en', '') else nickname_en end,
      phone = case when input_profile ? 'phone' then nullif(input_profile->>'phone', '') else phone end,
      major = case when input_profile ? 'major' then public.normalize_major(nullif(input_profile->>'major', '')) else major end,
      instagram = case when input_profile ? 'instagram' then nullif(input_profile->>'instagram', '') else instagram end,
      line_id = case when input_profile ? 'line_id' then nullif(input_profile->>'line_id', '') else line_id end,
      facebook = case when input_profile ? 'facebook' then nullif(input_profile->>'facebook', '') else facebook end,
      other_contact = case when input_profile ? 'other_contact' then nullif(input_profile->>'other_contact', '') else other_contact end,
      position = case when input_profile ? 'position' then nullif(input_profile->>'position', '') else position end,
      updated_at = now()
  where id = input_staff_profile_id
  returning * into updated_profile;

  if not found then
    raise exception 'staff profile not found';
  end if;

  if input_medical <> '{}'::jsonb then
    insert into public.staff_medical_info (staff_profile_id, disease, drug_allergy, food_allergy, medical_note, updated_at)
    values (
      input_staff_profile_id,
      case when input_medical ? 'disease' then nullif(input_medical->>'disease', '') else null end,
      case when input_medical ? 'drug_allergy' then nullif(input_medical->>'drug_allergy', '') else null end,
      case when input_medical ? 'food_allergy' then nullif(input_medical->>'food_allergy', '') else null end,
      case when input_medical ? 'medical_note' then nullif(input_medical->>'medical_note', '') else null end,
      now()
    )
    on conflict (staff_profile_id) do update
    set disease = case when input_medical ? 'disease' then excluded.disease else public.staff_medical_info.disease end,
        drug_allergy = case when input_medical ? 'drug_allergy' then excluded.drug_allergy else public.staff_medical_info.drug_allergy end,
        food_allergy = case when input_medical ? 'food_allergy' then excluded.food_allergy else public.staff_medical_info.food_allergy end,
        medical_note = case when input_medical ? 'medical_note' then excluded.medical_note else public.staff_medical_info.medical_note end,
        updated_at = now();
  end if;

  if input_assignment <> '{}'::jsonb then
    insert into public.staff_assignments (staff_profile_id, user_id, role, main_group, subgroup, primary_role, secondary_roles)
    values (
      input_staff_profile_id,
      updated_profile.user_id,
      coalesce(nullif(input_assignment->>'role', ''), 'staff'),
      case when input_assignment->>'role' = 'emergency_staff' then null else nullif(input_assignment->>'main_group', '') end,
      case when input_assignment->>'role' = 'emergency_staff' then null else nullif(input_assignment->>'subgroup', '') end,
      coalesce(public.normalize_staff_operational_role(nullif(input_assignment->>'primary_role', '')), public.normalize_staff_operational_role(nullif(updated_profile.position, '')), 'ทีมงาน'),
      coalesce(array(select distinct public.normalize_staff_operational_role(role_name) from jsonb_array_elements_text(coalesce(input_assignment->'secondary_roles', '[]'::jsonb)) role_name where public.normalize_staff_operational_role(role_name) is not null), '{}'::text[])
    )
    on conflict (staff_profile_id) do update
    set user_id = excluded.user_id,
        role = excluded.role,
        main_group = excluded.main_group,
        subgroup = excluded.subgroup,
        primary_role = excluded.primary_role,
        secondary_roles = excluded.secondary_roles;
  end if;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (input_staff_profile_id, auth.uid(), 'staff_profile_updated', coalesce(old_payload, '{}'::jsonb), jsonb_build_object('profile', input_profile, 'medical', input_medical, 'assignment', input_assignment));

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'staff_profile_updated', coalesce(old_payload, '{}'::jsonb), jsonb_build_object('staff_profile_id', input_staff_profile_id));
end;
$$;

create or replace function public.import_staff_records_admin(input_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  profile_input jsonb;
  medical_input jsonb;
  assignment_input jsonb;
  profile_row public.staff_profiles;
  imported_count integer := 0;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  for item in select * from jsonb_array_elements(input_rows)
  loop
    profile_input := item->'profile';
    medical_input := coalesce(item->'medical', '{}'::jsonb);
    assignment_input := coalesce(item->'assignment', '{}'::jsonb);

    if (profile_input->>'major' is null or profile_input->>'major' = '')
      and public.normalize_major(nullif(profile_input->>'facebook', '')) <> nullif(profile_input->>'facebook', '') then
      profile_input := profile_input || jsonb_build_object('major', public.normalize_major(profile_input->>'facebook'), 'facebook', null);
    end if;

    insert into public.staff_profiles (
      student_id, email, name_th, name_en, nickname, nickname_th, nickname_en, phone, major,
      instagram, line_id, facebook, other_contact, position
    )
    values (
      nullif(profile_input->>'student_id', ''),
      lower(nullif(profile_input->>'email', '')),
      nullif(profile_input->>'name_th', ''),
      nullif(profile_input->>'name_en', ''),
      coalesce(nullif(profile_input->>'nickname', ''), nullif(profile_input->>'nickname_th', ''), nullif(profile_input->>'nickname_en', '')),
      nullif(profile_input->>'nickname_th', ''),
      nullif(profile_input->>'nickname_en', ''),
      nullif(profile_input->>'phone', ''),
      public.normalize_major(nullif(profile_input->>'major', '')),
      nullif(profile_input->>'instagram', ''),
      nullif(profile_input->>'line_id', ''),
      nullif(profile_input->>'facebook', ''),
      nullif(profile_input->>'other_contact', ''),
      nullif(profile_input->>'position', '')
    )
    on conflict (student_id) do update
    set email = excluded.email,
        name_th = excluded.name_th,
        name_en = excluded.name_en,
        nickname = excluded.nickname,
        nickname_th = excluded.nickname_th,
        nickname_en = excluded.nickname_en,
        phone = excluded.phone,
        major = excluded.major,
        instagram = excluded.instagram,
        line_id = excluded.line_id,
        facebook = excluded.facebook,
        other_contact = excluded.other_contact,
        position = excluded.position,
        updated_at = now()
    returning * into profile_row;

    if medical_input <> '{}'::jsonb then
      insert into public.staff_medical_info (staff_profile_id, disease, drug_allergy, food_allergy, medical_note, updated_at)
      values (
        profile_row.id,
        nullif(medical_input->>'disease', ''),
        nullif(medical_input->>'drug_allergy', ''),
        nullif(medical_input->>'food_allergy', ''),
        nullif(medical_input->>'medical_note', ''),
        now()
      )
      on conflict (staff_profile_id) do update
      set disease = excluded.disease,
          drug_allergy = excluded.drug_allergy,
          food_allergy = excluded.food_allergy,
          medical_note = excluded.medical_note,
          updated_at = now();
    end if;

    if assignment_input <> '{}'::jsonb
      and (
        assignment_input->>'role' = 'emergency_staff'
        or nullif(assignment_input->>'main_group', '') is not null
        or nullif(assignment_input->>'primary_role', '') is not null
      ) then
      insert into public.staff_assignments (staff_profile_id, user_id, role, main_group, subgroup, primary_role, secondary_roles)
      values (
        profile_row.id,
        profile_row.user_id,
        coalesce(nullif(assignment_input->>'role', ''), 'staff'),
        case when assignment_input->>'role' = 'emergency_staff' then null else nullif(assignment_input->>'main_group', '') end,
        case when assignment_input->>'role' = 'emergency_staff' then null else nullif(assignment_input->>'subgroup', '') end,
        coalesce(public.normalize_staff_operational_role(nullif(assignment_input->>'primary_role', '')), public.normalize_staff_operational_role(nullif(profile_row.position, '')), 'ทีมงาน'),
        coalesce(array(select distinct public.normalize_staff_operational_role(role_name) from jsonb_array_elements_text(coalesce(assignment_input->'secondary_roles', '[]'::jsonb)) role_name where public.normalize_staff_operational_role(role_name) is not null), '{}'::text[])
      )
      on conflict (staff_profile_id) do update
      set user_id = excluded.user_id,
          role = excluded.role,
          main_group = excluded.main_group,
          subgroup = excluded.subgroup,
          primary_role = excluded.primary_role,
          secondary_roles = excluded.secondary_roles;
    end if;

    imported_count := imported_count + 1;
  end loop;

  insert into public.staff_audit_logs (actor_id, action, new_data)
  values (auth.uid(), 'staff_import_committed', jsonb_build_object('count', imported_count));

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'staff_import_committed', '{}'::jsonb, jsonb_build_object('count', imported_count));

  return jsonb_build_object('imported', imported_count);
end;
$$;

grant execute on function public.normalize_staff_operational_role(text) to authenticated;
grant execute on function public.clear_group_assignments() to authenticated;
grant execute on function public.update_staff_profile_admin(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.import_staff_records_admin(jsonb) to authenticated;
