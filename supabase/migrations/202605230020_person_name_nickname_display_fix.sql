create or replace function public.lookup_person_for_application(
  input_event_slug text,
  input_student_id text,
  input_email text default '',
  input_phone text default '',
  input_name_th text default '',
  input_name_en text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.events;
  student_id_value text := public.clean_placeholder_text(input_student_id);
  email_value text := public.normalize_cmu_email(input_email);
  phone_value text := public.normalize_phone(input_phone);
  person_row public.people;
  identity_status_value text;
  email_matches boolean := false;
  display_full_name_value text;
  display_nickname_value text;
begin
  select * into event_row
  from public.events
  where slug = public.clean_placeholder_text(input_event_slug)
    and visibility = 'public'
    and status in ('staff_recruiting', 'registration_open', 'active')
  limit 1;

  if event_row.id is null then
    return jsonb_build_object('success', false, 'code', 'event_not_open', 'message_th', 'กิจกรรมนี้ยังไม่เปิดรับสมัคร');
  end if;

  if student_id_value is null then
    return jsonb_build_object('success', false, 'code', 'student_id_required', 'message_th', 'กรุณากรอกรหัสนักศึกษา');
  end if;

  if not public.is_valid_cmu_email(email_value) then
    return jsonb_build_object('success', false, 'code', 'invalid_cmu_email', 'message_th', 'กรุณากรอก CMU Mail ที่ลงท้ายด้วย @cmu.ac.th เท่านั้น');
  end if;

  select * into person_row
  from public.people p
  where public.clean_placeholder_text(p.student_id) = student_id_value
    and p.merged_into is null
  order by p.updated_at desc nulls last, p.created_at desc nulls last
  limit 1;

  if person_row.id is null then
    return jsonb_build_object(
      'success', true,
      'found', false,
      'identity_status', 'not_found',
      'can_continue_application', true,
      'requires_update_request', true,
      'message_th', 'ไม่พบข้อมูลจากรหัสนักศึกษานี้ กรุณากรอกข้อมูลเพิ่มเติมเพื่อส่งให้ผู้ดูแลตรวจสอบ'
    );
  end if;

  display_full_name_value := coalesce(
    nullif(btrim(person_row.name_th), ''),
    nullif(btrim(person_row.name_en), '')
  );
  display_nickname_value := coalesce(
    nullif(btrim(person_row.nickname), ''),
    nullif(btrim(person_row.nickname_th), ''),
    nullif(btrim(person_row.nickname_en), '')
  );

  email_matches := public.normalize_cmu_email(person_row.email) = email_value;
  identity_status_value := case
    when email_matches then 'verified'
    when public.normalize_cmu_email(person_row.email) is null then 'pending_identity_review'
    else 'email_mismatch'
  end;

  return jsonb_build_object(
    'success', true,
    'found', true,
    'person_id', person_row.id,
    'identity_status', identity_status_value,
    'safe_person', jsonb_build_object(
      'person_id', person_row.id,
      'student_id', person_row.student_id,
      'name_th', person_row.name_th,
      'name_en', person_row.name_en,
      'full_name_th', person_row.name_th,
      'full_name_en', person_row.name_en,
      'display_full_name', display_full_name_value,
      'display_name', display_full_name_value,
      'nickname', person_row.nickname,
      'nickname_th', person_row.nickname_th,
      'nickname_en', person_row.nickname_en,
      'display_nickname', display_nickname_value,
      'major', person_row.major,
      'year_level', person_row.year_level,
      'masked_email', public.mask_cmu_email(person_row.email),
      'masked_phone', public.mask_phone(person_row.phone)
    ),
    'can_continue_application', true,
    'requires_update_request', not email_matches,
    'message_th', case
      when email_matches then 'พบข้อมูลของคุณแล้ว'
      when public.normalize_cmu_email(person_row.email) is null then 'พบข้อมูลนักศึกษา แต่ยังต้องให้ผู้ดูแลตรวจสอบ CMU Mail'
      else 'พบข้อมูลนักศึกษา แต่ CMU Mail ที่กรอกไม่ตรงกับข้อมูลเดิม'
    end
  );
end;
$$;

grant execute on function public.lookup_person_for_application(text, text, text, text, text, text) to anon, authenticated;
