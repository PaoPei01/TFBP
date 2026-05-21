alter table public.staff_public_profiles
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'staff-avatars',
  'staff-avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

drop policy if exists "public read staff avatar files" on storage.objects;
drop policy if exists "verified staff avatar uploads" on storage.objects;
drop policy if exists "admin manage staff avatar files" on storage.objects;
drop policy if exists "staff avatars read signed" on storage.objects;
drop policy if exists "staff avatars insert own" on storage.objects;
drop policy if exists "staff avatars update own" on storage.objects;
drop policy if exists "staff avatars delete own" on storage.objects;
drop policy if exists "staff avatars admin manage" on storage.objects;

create policy "staff avatars read signed"
on storage.objects for select
using (
  bucket_id = 'staff-avatars'
  and (storage.foldername(name))[1] = 'staff'
);

create policy "staff avatars insert own"
on storage.objects for insert
with check (
  bucket_id = 'staff-avatars'
  and auth.uid() is not null
  and name = 'staff/' || (storage.foldername(name))[2] || '/avatar.webp'
  and lower(storage.extension(name)) = 'webp'
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.staff_profiles sp
      where sp.id = case
          when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then ((storage.foldername(name))[2])::uuid
          else null
        end
        and sp.user_id = auth.uid()
    )
  )
);

create policy "staff avatars update own"
on storage.objects for update
using (
  bucket_id = 'staff-avatars'
  and auth.uid() is not null
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.staff_profiles sp
      where sp.id = case
          when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then ((storage.foldername(name))[2])::uuid
          else null
        end
        and sp.user_id = auth.uid()
    )
  )
)
with check (
  bucket_id = 'staff-avatars'
  and auth.uid() is not null
  and name = 'staff/' || (storage.foldername(name))[2] || '/avatar.webp'
  and lower(storage.extension(name)) = 'webp'
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.staff_profiles sp
      where sp.id = case
          when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then ((storage.foldername(name))[2])::uuid
          else null
        end
        and sp.user_id = auth.uid()
    )
  )
);

create policy "staff avatars delete own"
on storage.objects for delete
using (
  bucket_id = 'staff-avatars'
  and auth.uid() is not null
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.staff_profiles sp
      where sp.id = case
          when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then ((storage.foldername(name))[2])::uuid
          else null
        end
        and sp.user_id = auth.uid()
    )
  )
);

create policy "staff avatars admin manage"
on storage.objects for all
using (bucket_id = 'staff-avatars' and public.is_admin(auth.uid()))
with check (bucket_id = 'staff-avatars' and public.is_admin(auth.uid()));

create or replace function public.can_manage_staff_avatar(input_staff_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin(auth.uid())
    or exists (
      select 1
      from public.staff_profiles sp
      where sp.id = input_staff_profile_id
        and sp.user_id = auth.uid()
    );
$$;

create or replace function public.update_staff_avatar_path(input_staff_profile_id uuid, input_avatar_path text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_path text := 'staff/' || input_staff_profile_id::text || '/avatar.webp';
  cleaned_path text := public.clean_placeholder_text(input_avatar_path);
  updated public.staff_public_profiles;
begin
  if not public.can_manage_staff_avatar(input_staff_profile_id) then
    raise exception 'staff avatar access denied';
  end if;

  if cleaned_path is distinct from expected_path then
    raise exception 'invalid avatar path';
  end if;

  insert into public.staff_public_profiles (staff_profile_id)
  values (input_staff_profile_id)
  on conflict (staff_profile_id) do nothing;

  update public.staff_public_profiles
  set avatar_path = cleaned_path,
      updated_at = now()
  where staff_profile_id = input_staff_profile_id
  returning * into updated;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, new_data)
  values (input_staff_profile_id, auth.uid(), 'staff_avatar_updated', jsonb_build_object('avatar_path', cleaned_path));

  return to_jsonb(updated);
end;
$$;

create or replace function public.clear_staff_avatar_path(input_staff_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_path text;
  updated public.staff_public_profiles;
begin
  if not public.can_manage_staff_avatar(input_staff_profile_id) then
    raise exception 'staff avatar access denied';
  end if;

  select avatar_path into previous_path
  from public.staff_public_profiles
  where staff_profile_id = input_staff_profile_id;

  insert into public.staff_public_profiles (staff_profile_id)
  values (input_staff_profile_id)
  on conflict (staff_profile_id) do nothing;

  update public.staff_public_profiles
  set avatar_path = null,
      updated_at = now()
  where staff_profile_id = input_staff_profile_id
  returning * into updated;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (
    input_staff_profile_id,
    auth.uid(),
    'staff_avatar_cleared',
    jsonb_build_object('avatar_path', previous_path),
    jsonb_build_object('avatar_path', null)
  );

  return to_jsonb(updated);
end;
$$;

create or replace function public.get_public_staff_cards(input_main_group text default null, input_subgroup text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'staff_profile_id', sp.id,
    'avatar_path', spp.avatar_path,
    'avatar_url', spp.avatar_url,
    'nickname', sp.nickname,
    'nickname_th', sp.nickname_th,
    'nickname_en', sp.nickname_en,
    'name_th', sp.name_th,
    'name_en', sp.name_en,
    'position', sp.position,
    'primary_role', sa.primary_role,
    'main_group', sa.main_group,
    'subgroup', sa.subgroup,
    'bio', spp.bio,
    'interests', coalesce(to_jsonb(spp.interests), '[]'::jsonb),
    'instagram', case when spp.show_instagram then sp.instagram else null end,
    'line_id', case when spp.show_line_id then sp.line_id else null end,
    'facebook', case when spp.show_facebook then sp.facebook else null end,
    'phone', case when spp.show_phone_to_public then sp.phone else null end
  ) order by sa.primary_role, sp.nickname_th, sp.name_th), '[]'::jsonb)
  from public.staff_profiles sp
  join public.staff_public_profiles spp on spp.staff_profile_id = sp.id and spp.public_profile_enabled = true
  left join public.staff_assignments sa on sa.staff_profile_id = sp.id
  where (input_main_group is null or sa.main_group = input_main_group)
    and (input_subgroup is null or sa.subgroup = input_subgroup);
$$;

create or replace function public.get_staff_directory()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not (public.is_admin(auth.uid()) or public.is_staff(auth.uid())) then
    raise exception 'staff access required';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'staff_profile_id', sp.id,
    'avatar_path', spp.avatar_path,
    'avatar_url', spp.avatar_url,
    'nickname', sp.nickname,
    'nickname_th', sp.nickname_th,
    'nickname_en', sp.nickname_en,
    'name_th', sp.name_th,
    'name_en', sp.name_en,
    'email', sp.email,
    'position', sp.position,
    'primary_role', sa.primary_role,
    'main_group', sa.main_group,
    'subgroup', sa.subgroup,
    'bio', spp.bio,
    'interests', coalesce(to_jsonb(spp.interests), '[]'::jsonb),
    'show_phone_to_staff', coalesce(spp.show_phone_to_staff, true),
    'phone', case when coalesce(spp.show_phone_to_staff, true) or public.is_admin(auth.uid()) then sp.phone else null end,
    'instagram', case when coalesce(spp.show_instagram, true) then sp.instagram else null end,
    'line_id', case when coalesce(spp.show_line_id, false) then sp.line_id else null end,
    'facebook', case when coalesce(spp.show_facebook, false) then sp.facebook else null end
  ) order by sa.primary_role, sp.nickname_th, sp.name_th), '[]'::jsonb)
  into result
  from public.staff_profiles sp
  left join public.staff_public_profiles spp on spp.staff_profile_id = sp.id
  left join public.staff_assignments sa on sa.staff_profile_id = sp.id;

  return result;
end;
$$;

grant execute on function public.can_manage_staff_avatar(uuid) to authenticated;
grant execute on function public.update_staff_avatar_path(uuid, text) to authenticated;
grant execute on function public.clear_staff_avatar_path(uuid) to authenticated;
grant execute on function public.get_public_staff_cards(text, text) to anon, authenticated;
grant execute on function public.get_staff_directory() to authenticated;
