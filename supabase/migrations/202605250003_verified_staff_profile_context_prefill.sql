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
      'phone', sp.phone,
      'instagram', sp.instagram,
      'line_id', sp.line_id,
      'facebook', sp.facebook,
      'position', sp.position
    ),
    'public_profile', to_jsonb(spp),
    'medical_info', case when smi.id is null then null else jsonb_build_object(
      'disease', smi.disease,
      'drug_allergy', smi.drug_allergy,
      'food_allergy', smi.food_allergy,
      'medical_note', smi.medical_note
    ) end,
    'assignment', case when sa.id is null then null else jsonb_build_object(
      'main_group', sa.main_group,
      'subgroup', sa.subgroup,
      'primary_role', sa.primary_role,
      'secondary_roles', coalesce(to_jsonb(sa.secondary_roles), '[]'::jsonb),
      'base_number', sa.base_number
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
  left join public.staff_medical_info smi on smi.staff_profile_id = sp.id
  left join public.staff_assignments sa on sa.staff_profile_id = sp.id
  where sp.id = input_staff_profile_id;
$$;
