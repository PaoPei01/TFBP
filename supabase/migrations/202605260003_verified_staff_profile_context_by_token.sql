create or replace function public.get_verified_staff_profile_context_by_token(input_verified_staff_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  verified_token text := public.normalize_staff_identity_qr_token(input_verified_staff_token);
  staff_id uuid;
begin
  select staff_profile_id into staff_id
  from public.staff_attendance_identity_tokens
  where token = verified_token
    and status = 'active';

  if staff_id is null then
    return null;
  end if;

  return public.verified_staff_profile_context(staff_id);
end;
$$;

grant execute on function public.get_verified_staff_profile_context_by_token(text) to anon, authenticated;
