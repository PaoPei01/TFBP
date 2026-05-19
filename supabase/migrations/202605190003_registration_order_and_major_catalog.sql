alter table public.profiles
  add column if not exists form_submitted_at timestamp with time zone,
  add column if not exists registration_order integer;

update public.profiles
set major = 'ภาควิชาวิศวกรรมอุตสาหการและการจัดการ โลจิสติกส์ (IEL)'
where major ilike '%Industrial Engineering and Logistics Management%'
   or major ilike '%โลจิสติกส์ (IEL)%';

update public.profiles
set major = 'ภาควิชาวิศวกรรมบูรณาการ และพหุวิทยาการ (IGE International)'
where major ilike '%Integrated and Multi-disciplinary Engineering%'
   or major ilike '%พหุวิทยาการ%';

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
    email = coalesce(input_new_data->>'email', email),
    student_id = coalesce(input_new_data->>'student_id', student_id),
    name_th = coalesce(input_new_data->>'name_th', name_th),
    name_en = coalesce(input_new_data->>'name_en', name_en),
    nickname = coalesce(input_new_data->>'nickname', nickname),
    major = coalesce(input_new_data->>'major', major),
    phone = coalesce(input_new_data->>'phone', phone),
    emergency_phone = coalesce(input_new_data->>'emergency_phone', emergency_phone),
    line_id = coalesce(input_new_data->>'line_id', line_id),
    instagram = coalesce(input_new_data->>'instagram', instagram),
    facebook = coalesce(input_new_data->>'facebook', facebook),
    other_contact = coalesce(input_new_data->>'other_contact', other_contact),
    food_allergy = coalesce(input_new_data->>'food_allergy', food_allergy),
    disease = coalesce(input_new_data->>'disease', disease),
    drug_allergy = coalesce(input_new_data->>'drug_allergy', drug_allergy),
    admission_round = coalesce(input_new_data->>'admission_round', admission_round),
    form_submitted_at = coalesce((input_new_data->>'form_submitted_at')::timestamp with time zone, form_submitted_at),
    registration_order = coalesce((input_new_data->>'registration_order')::integer, registration_order),
    gender = coalesce(input_new_data->>'gender', gender),
    hometown = coalesce(input_new_data->>'hometown', hometown),
    interests = coalesce(input_new_data->>'interests', interests),
    public_profile = coalesce((input_new_data->>'public_profile')::boolean, public_profile),
    show_instagram = coalesce((input_new_data->>'show_instagram')::boolean, show_instagram),
    show_line_id = coalesce((input_new_data->>'show_line_id')::boolean, show_line_id)
  where id = input_profile_id;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (input_profile_id, auth.uid(), 'direct_update', old_profile, input_new_data);
end;
$$;
