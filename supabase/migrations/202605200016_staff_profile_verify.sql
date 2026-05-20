create or replace function public.normalize_staff_verify_phone(input_phone text)
returns text
language plpgsql
immutable
as $$
declare
  digits text := regexp_replace(coalesce(input_phone, ''), '\D', '', 'g');
begin
  if digits = '' then
    return null;
  end if;
  if left(digits, 4) = '0066' then
    digits := '0' || substr(digits, 5);
  elsif left(digits, 2) = '66' and length(digits) >= 10 then
    digits := '0' || substr(digits, 3);
  end if;
  return digits;
end;
$$;

create or replace function public.find_verified_staff_profile(input_email text, input_phone text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sp.id
  from public.staff_profiles sp
  where lower(btrim(coalesce(sp.email, ''))) = lower(btrim(coalesce(input_email, '')))
    and public.normalize_staff_verify_phone(sp.phone) = public.normalize_staff_verify_phone(input_phone)
    and public.normalize_staff_verify_phone(input_phone) is not null
  limit 1;
$$;

create or replace function public.verified_staff_profile_context(input_staff_profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', sp.id,
      'student_id', sp.student_id,
      'email', sp.email,
      'name_th', sp.name_th,
      'name_en', sp.name_en,
      'nickname', sp.nickname,
      'nickname_th', sp.nickname_th,
      'nickname_en', sp.nickname_en,
      'major', sp.major,
      'instagram', sp.instagram,
      'facebook', sp.facebook,
      'position', sp.position
    ),
    'public_profile', to_jsonb(spp),
    'assignment', case when sa.id is null then null else jsonb_build_object(
      'main_group', sa.main_group,
      'subgroup', sa.subgroup,
      'primary_role', sa.primary_role,
      'secondary_roles', coalesce(to_jsonb(sa.secondary_roles), '[]'::jsonb)
    ) end,
    'edit_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ser.id,
        'status', ser.status,
        'created_at', ser.created_at,
        'admin_note', ser.admin_note
      ) order by ser.created_at desc)
      from public.staff_edit_requests ser
      where ser.staff_profile_id = sp.id
      limit 10
    ), '[]'::jsonb)
  )
  from public.staff_profiles sp
  left join public.staff_public_profiles spp on spp.staff_profile_id = sp.id
  left join public.staff_assignments sa on sa.staff_profile_id = sp.id
  where sp.id = input_staff_profile_id;
$$;

create or replace function public.verify_staff_identity(input_email text, input_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid := public.find_verified_staff_profile(input_email, input_phone);
begin
  if staff_id is null then
    return null;
  end if;

  insert into public.staff_public_profiles (staff_profile_id)
  values (staff_id)
  on conflict (staff_profile_id) do nothing;

  insert into public.staff_profile_view_logs (staff_profile_id, viewed_by, viewer_role, view_scope)
  values (staff_id, null, 'verified_email_phone', 'staff_profile_verify');

  return public.verified_staff_profile_context(staff_id);
end;
$$;

create or replace function public.update_staff_public_profile_verified(input_email text, input_phone text, input_public_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid := public.find_verified_staff_profile(input_email, input_phone);
  interests_value text[];
begin
  if staff_id is null then
    raise exception 'ไม่พบข้อมูลทีมงานที่ตรงกับอีเมลและเบอร์โทรนี้';
  end if;

  select coalesce(array_agg(public.clean_placeholder_text(value)), '{}'::text[])
  into interests_value
  from jsonb_array_elements_text(coalesce(input_public_data->'interests', '[]'::jsonb)) value
  where public.clean_placeholder_text(value) is not null;

  insert into public.staff_public_profiles (staff_profile_id)
  values (staff_id)
  on conflict (staff_profile_id) do nothing;

  update public.staff_public_profiles
  set avatar_url = case when input_public_data ? 'avatar_url' then public.clean_placeholder_text(input_public_data->>'avatar_url') else avatar_url end,
      bio = case when input_public_data ? 'bio' then public.clean_placeholder_text(input_public_data->>'bio') else bio end,
      hometown = case when input_public_data ? 'hometown' then public.clean_placeholder_text(input_public_data->>'hometown') else hometown end,
      interests = case when input_public_data ? 'interests' then interests_value else interests end,
      public_profile_enabled = case when input_public_data ? 'public_profile_enabled' then (input_public_data->>'public_profile_enabled')::boolean else public_profile_enabled end,
      show_instagram = case when input_public_data ? 'show_instagram' then (input_public_data->>'show_instagram')::boolean else show_instagram end,
      show_facebook = case when input_public_data ? 'show_facebook' then (input_public_data->>'show_facebook')::boolean else show_facebook end,
      show_line_id = case when input_public_data ? 'show_line_id' then (input_public_data->>'show_line_id')::boolean else show_line_id end,
      show_phone_to_staff = case when input_public_data ? 'show_phone_to_staff' then (input_public_data->>'show_phone_to_staff')::boolean else show_phone_to_staff end,
      show_phone_to_public = false,
      profile_completed_at = coalesce(profile_completed_at, now()),
      updated_at = now()
  where staff_profile_id = staff_id;

  update public.staff_profiles
  set instagram = case when input_public_data ? 'instagram' then public.clean_placeholder_text(input_public_data->>'instagram') else instagram end,
      facebook = case when input_public_data ? 'facebook' then public.clean_placeholder_text(input_public_data->>'facebook') else facebook end,
      updated_at = now()
  where id = staff_id;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, new_data)
  values (staff_id, null, 'staff_public_profile_verified_updated', input_public_data);

  return public.verified_staff_profile_context(staff_id);
end;
$$;

create or replace function public.submit_staff_edit_request_verified(input_email text, input_phone text, input_new_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid := public.find_verified_staff_profile(input_email, input_phone);
  created public.staff_edit_requests;
  old_snapshot jsonb;
begin
  if staff_id is null then
    raise exception 'ไม่พบข้อมูลทีมงานที่ตรงกับอีเมลและเบอร์โทรนี้';
  end if;

  select jsonb_build_object(
    'profile', jsonb_build_object('id', sp.id, 'phone', sp.phone, 'line_id', sp.line_id),
    'medical', to_jsonb(smi),
    'assignment', to_jsonb(sa)
  )
  into old_snapshot
  from public.staff_profiles sp
  left join public.staff_medical_info smi on smi.staff_profile_id = sp.id
  left join public.staff_assignments sa on sa.staff_profile_id = sp.id
  where sp.id = staff_id;

  insert into public.staff_edit_requests (staff_profile_id, requested_by, old_data, new_data)
  values (staff_id, null, old_snapshot, input_new_data)
  returning * into created;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (staff_id, null, 'staff_edit_request_verified_submitted', old_snapshot, input_new_data);

  return jsonb_build_object('id', created.id, 'status', created.status, 'created_at', created.created_at);
end;
$$;

create or replace function public.get_staff_edit_requests_admin()
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

  select coalesce(jsonb_agg(to_jsonb(ser) || jsonb_build_object(
    'staff_profile', jsonb_build_object(
      'id', sp.id,
      'student_id', sp.student_id,
      'email', sp.email,
      'name_th', sp.name_th,
      'name_en', sp.name_en,
      'nickname', sp.nickname,
      'nickname_th', sp.nickname_th,
      'nickname_en', sp.nickname_en
    )
  ) order by ser.created_at desc), '[]'::jsonb)
  into result
  from public.staff_edit_requests ser
  left join public.staff_profiles sp on sp.id = ser.staff_profile_id;

  return result;
end;
$$;

create or replace function public.approve_staff_edit_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.staff_edit_requests;
  profile_data jsonb;
  medical_data jsonb;
  assignment_data jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;
  select * into req from public.staff_edit_requests where id = request_id and status = 'pending';
  if req.id is null then raise exception 'request not found'; end if;

  profile_data := coalesce(req.new_data->'profile', '{}'::jsonb);
  medical_data := coalesce(req.new_data->'medical', '{}'::jsonb);
  assignment_data := coalesce(req.new_data->'assignment', '{}'::jsonb);

  update public.staff_profiles
  set phone = case when profile_data ? 'phone' then public.clean_placeholder_text(profile_data->>'phone') else phone end,
      line_id = case when profile_data ? 'line_id' then public.clean_placeholder_text(profile_data->>'line_id') else line_id end,
      instagram = case when profile_data ? 'instagram' then public.clean_placeholder_text(profile_data->>'instagram') else instagram end,
      facebook = case when profile_data ? 'facebook' then public.clean_placeholder_text(profile_data->>'facebook') else facebook end,
      updated_at = now()
  where id = req.staff_profile_id;

  if medical_data <> '{}'::jsonb then
    insert into public.staff_medical_info (staff_profile_id, disease, drug_allergy, food_allergy, medical_note, updated_at)
    values (
      req.staff_profile_id,
      public.clean_placeholder_text(medical_data->>'disease'),
      public.clean_placeholder_text(medical_data->>'drug_allergy'),
      public.clean_placeholder_text(medical_data->>'food_allergy'),
      public.clean_placeholder_text(medical_data->>'medical_note'),
      now()
    )
    on conflict (staff_profile_id) do update
    set disease = case when medical_data ? 'disease' then excluded.disease else staff_medical_info.disease end,
        drug_allergy = case when medical_data ? 'drug_allergy' then excluded.drug_allergy else staff_medical_info.drug_allergy end,
        food_allergy = case when medical_data ? 'food_allergy' then excluded.food_allergy else staff_medical_info.food_allergy end,
        medical_note = case when medical_data ? 'medical_note' then excluded.medical_note else staff_medical_info.medical_note end,
        updated_at = now();
  end if;

  if assignment_data <> '{}'::jsonb then
    insert into public.staff_assignments (staff_profile_id, role, main_group, subgroup, primary_role, secondary_roles)
    values (
      req.staff_profile_id,
      coalesce(public.normalize_staff_system_role(assignment_data->>'role', assignment_data->>'primary_role'), 'staff'),
      public.clean_placeholder_text(assignment_data->>'main_group'),
      public.clean_placeholder_text(assignment_data->>'subgroup'),
      public.normalize_staff_operational_role(public.clean_placeholder_text(assignment_data->>'primary_role')),
      coalesce(array(
        select distinct public.normalize_staff_operational_role(value)
        from jsonb_array_elements_text(coalesce(assignment_data->'secondary_roles', '[]'::jsonb)) value
        where public.normalize_staff_operational_role(value) is not null
      ), '{}'::text[])
    )
    on conflict (staff_profile_id) do update
    set role = case when assignment_data ? 'role' then excluded.role else staff_assignments.role end,
        main_group = case when assignment_data ? 'main_group' then excluded.main_group else staff_assignments.main_group end,
        subgroup = case when assignment_data ? 'subgroup' then excluded.subgroup else staff_assignments.subgroup end,
        primary_role = case when assignment_data ? 'primary_role' then excluded.primary_role else staff_assignments.primary_role end,
        secondary_roles = case when assignment_data ? 'secondary_roles' then excluded.secondary_roles else staff_assignments.secondary_roles end;
  end if;

  update public.staff_edit_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = req.id;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (req.staff_profile_id, auth.uid(), 'staff_edit_request_approved', req.old_data, req.new_data);
end;
$$;

revoke all on function public.find_verified_staff_profile(text, text) from public, anon, authenticated;
revoke all on function public.verified_staff_profile_context(uuid) from public, anon, authenticated;
grant execute on function public.normalize_staff_verify_phone(text) to anon, authenticated;
grant execute on function public.verify_staff_identity(text, text) to anon, authenticated;
grant execute on function public.update_staff_public_profile_verified(text, text, jsonb) to anon, authenticated;
grant execute on function public.submit_staff_edit_request_verified(text, text, jsonb) to anon, authenticated;
grant execute on function public.get_staff_edit_requests_admin() to authenticated;
grant execute on function public.approve_staff_edit_request(uuid) to authenticated;
