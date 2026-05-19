alter table public.profiles
  add column if not exists nickname_en text;

create or replace function public.jsonb_text_or_null(input_data jsonb, input_key text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when not (input_data ? input_key) then null
    when jsonb_typeof(input_data -> input_key) = 'null' then null
    when btrim(input_data ->> input_key) = '' then null
    else input_data ->> input_key
  end;
$$;

create or replace function public.update_profile_admin(input_profile_id uuid, input_new_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_profile jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  select to_jsonb(p) into old_profile from public.profiles p where p.id = input_profile_id;

  update public.profiles
  set
    email = case when input_new_data ? 'email' then public.jsonb_text_or_null(input_new_data, 'email') else email end,
    student_id = case when input_new_data ? 'student_id' then public.jsonb_text_or_null(input_new_data, 'student_id') else student_id end,
    name_th = case when input_new_data ? 'name_th' then public.jsonb_text_or_null(input_new_data, 'name_th') else name_th end,
    name_en = case when input_new_data ? 'name_en' then public.jsonb_text_or_null(input_new_data, 'name_en') else name_en end,
    nickname = case when input_new_data ? 'nickname' then public.jsonb_text_or_null(input_new_data, 'nickname') else nickname end,
    nickname_en = case when input_new_data ? 'nickname_en' then public.jsonb_text_or_null(input_new_data, 'nickname_en') else nickname_en end,
    major = case when input_new_data ? 'major' then public.jsonb_text_or_null(input_new_data, 'major') else major end,
    phone = case when input_new_data ? 'phone' then public.jsonb_text_or_null(input_new_data, 'phone') else phone end,
    emergency_phone = case when input_new_data ? 'emergency_phone' then public.jsonb_text_or_null(input_new_data, 'emergency_phone') else emergency_phone end,
    line_id = case when input_new_data ? 'line_id' then public.jsonb_text_or_null(input_new_data, 'line_id') else line_id end,
    instagram = case when input_new_data ? 'instagram' then public.jsonb_text_or_null(input_new_data, 'instagram') else instagram end,
    facebook = case when input_new_data ? 'facebook' then public.jsonb_text_or_null(input_new_data, 'facebook') else facebook end,
    other_contact = case when input_new_data ? 'other_contact' then public.jsonb_text_or_null(input_new_data, 'other_contact') else other_contact end,
    food_allergy = case when input_new_data ? 'food_allergy' then public.jsonb_text_or_null(input_new_data, 'food_allergy') else food_allergy end,
    disease = case when input_new_data ? 'disease' then public.jsonb_text_or_null(input_new_data, 'disease') else disease end,
    drug_allergy = case when input_new_data ? 'drug_allergy' then public.jsonb_text_or_null(input_new_data, 'drug_allergy') else drug_allergy end,
    admission_round = case when input_new_data ? 'admission_round' then public.jsonb_text_or_null(input_new_data, 'admission_round') else admission_round end,
    form_submitted_at = case when input_new_data ? 'form_submitted_at' then (public.jsonb_text_or_null(input_new_data, 'form_submitted_at'))::timestamp with time zone else form_submitted_at end,
    registration_order = case when input_new_data ? 'registration_order' then (public.jsonb_text_or_null(input_new_data, 'registration_order'))::integer else registration_order end,
    gender = case when input_new_data ? 'gender' then public.jsonb_text_or_null(input_new_data, 'gender') else gender end,
    hometown = case when input_new_data ? 'hometown' then public.jsonb_text_or_null(input_new_data, 'hometown') else hometown end,
    interests = case when input_new_data ? 'interests' then public.jsonb_text_or_null(input_new_data, 'interests') else interests end,
    public_profile = case when input_new_data ? 'public_profile' then (input_new_data->>'public_profile')::boolean else public_profile end,
    show_instagram = case when input_new_data ? 'show_instagram' then (input_new_data->>'show_instagram')::boolean else show_instagram end,
    show_line_id = case when input_new_data ? 'show_line_id' then (input_new_data->>'show_line_id')::boolean else show_line_id end
  where id = input_profile_id;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (input_profile_id, auth.uid(), 'direct_update', old_profile, input_new_data);
end;
$$;

create or replace function public.approve_edit_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.edit_requests;
  old_profile jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  select * into request_row
  from public.edit_requests
  where id = request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'pending request not found';
  end if;

  select to_jsonb(p) into old_profile from public.profiles p where p.id = request_row.profile_id;

  update public.profiles
  set
    nickname = case when request_row.new_data ? 'nickname' then public.jsonb_text_or_null(request_row.new_data, 'nickname') else nickname end,
    nickname_en = case when request_row.new_data ? 'nickname_en' then public.jsonb_text_or_null(request_row.new_data, 'nickname_en') else nickname_en end,
    phone = case when request_row.new_data ? 'phone' then public.jsonb_text_or_null(request_row.new_data, 'phone') else phone end,
    emergency_phone = case when request_row.new_data ? 'emergency_phone' then public.jsonb_text_or_null(request_row.new_data, 'emergency_phone') else emergency_phone end,
    line_id = case when request_row.new_data ? 'line_id' then public.jsonb_text_or_null(request_row.new_data, 'line_id') else line_id end,
    instagram = case when request_row.new_data ? 'instagram' then public.jsonb_text_or_null(request_row.new_data, 'instagram') else instagram end,
    facebook = case when request_row.new_data ? 'facebook' then public.jsonb_text_or_null(request_row.new_data, 'facebook') else facebook end,
    other_contact = case when request_row.new_data ? 'other_contact' then public.jsonb_text_or_null(request_row.new_data, 'other_contact') else other_contact end,
    food_allergy = case when request_row.new_data ? 'food_allergy' then public.jsonb_text_or_null(request_row.new_data, 'food_allergy') else food_allergy end,
    disease = case when request_row.new_data ? 'disease' then public.jsonb_text_or_null(request_row.new_data, 'disease') else disease end,
    drug_allergy = case when request_row.new_data ? 'drug_allergy' then public.jsonb_text_or_null(request_row.new_data, 'drug_allergy') else drug_allergy end,
    public_profile = case when request_row.new_data ? 'public_profile' then (request_row.new_data->>'public_profile')::boolean else public_profile end,
    show_instagram = case when request_row.new_data ? 'show_instagram' then (request_row.new_data->>'show_instagram')::boolean else show_instagram end,
    show_line_id = case when request_row.new_data ? 'show_line_id' then (request_row.new_data->>'show_line_id')::boolean else show_line_id end
  where id = request_row.profile_id;

  update public.edit_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = request_id;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (request_row.profile_id, auth.uid(), 'approved', old_profile, request_row.new_data);
end;
$$;

create or replace function public.submit_edit_request(
  input_email text,
  input_phone text,
  input_profile_id uuid,
  input_new_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles;
  allowed_keys text[] := array[
    'nickname',
    'nickname_en',
    'phone',
    'emergency_phone',
    'line_id',
    'instagram',
    'facebook',
    'other_contact',
    'food_allergy',
    'disease',
    'drug_allergy',
    'public_profile',
    'show_instagram',
    'show_line_id'
  ];
  clean_new_data jsonb;
begin
  select *
  into profile_row
  from public.profiles
  where id = input_profile_id
    and lower(email) = lower(trim(input_email))
    and public.normalize_phone(phone) = public.normalize_phone(input_phone);

  if not found then
    raise exception 'identity verification failed';
  end if;

  select jsonb_object_agg(key, value)
  into clean_new_data
  from jsonb_each(input_new_data)
  where key = any(allowed_keys);

  insert into public.edit_requests (profile_id, requested_by_email, old_data, new_data, status)
  values (
    profile_row.id,
    profile_row.email,
    to_jsonb(profile_row) - array['id', 'email', 'student_id', 'name_th', 'name_en', 'major', 'created_at', 'updated_at'],
    coalesce(clean_new_data, '{}'::jsonb),
    'pending'
  );
end;
$$;

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

  delete from public.group_assignments;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (null, auth.uid(), 'group_assignments_cleared', old_assignments, jsonb_build_object('cleared_at', now()));
end;
$$;

grant execute on function public.update_profile_admin(uuid, jsonb) to authenticated;
grant execute on function public.approve_edit_request(uuid) to authenticated;
grant execute on function public.submit_edit_request(text, text, uuid, jsonb) to anon, authenticated;
grant execute on function public.clear_group_assignments() to authenticated;

drop function if exists public.search_public_profiles(text, text);

create or replace function public.search_public_profiles(search_text text default '', major_filter text default '')
returns table (
  id uuid,
  name_th text,
  name_en text,
  nickname text,
  nickname_en text,
  major text,
  main_group text,
  subgroup text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name_th, p.name_en, p.nickname, p.nickname_en, p.major, ga.main_group, ga.subgroup
  from public.profiles p
  left join public.group_assignments ga on ga.profile_id = p.id
  where (
    coalesce(search_text, '') = ''
    or p.name_th ilike '%' || search_text || '%'
    or p.name_en ilike '%' || search_text || '%'
    or p.nickname ilike '%' || search_text || '%'
    or p.nickname_en ilike '%' || search_text || '%'
    or p.major ilike '%' || search_text || '%'
  )
  and (
    coalesce(major_filter, '') = ''
    or p.major ilike '%' || major_filter || '%'
  )
  order by p.name_th nulls last;
$$;

grant execute on function public.search_public_profiles(text, text) to anon, authenticated;
