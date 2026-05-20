create table if not exists public.staff_public_profiles (
  staff_profile_id uuid primary key references public.staff_profiles(id) on delete cascade,
  avatar_url text,
  bio text,
  hometown text,
  interests text[] default '{}'::text[],
  public_profile_enabled boolean default false,
  show_instagram boolean default true,
  show_line_id boolean default false,
  show_facebook boolean default false,
  show_phone_to_staff boolean default true,
  show_phone_to_public boolean default false,
  staff_badges text[] default '{}'::text[],
  qr_token text unique default encode(gen_random_bytes(16), 'hex'),
  profile_completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.staff_edit_requests (
  id uuid primary key default gen_random_uuid(),
  staff_profile_id uuid references public.staff_profiles(id) on delete cascade,
  requested_by uuid references auth.users(id),
  old_data jsonb,
  new_data jsonb,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create table if not exists public.staff_profile_view_logs (
  id uuid primary key default gen_random_uuid(),
  staff_profile_id uuid references public.staff_profiles(id) on delete set null,
  viewed_by uuid references auth.users(id),
  viewer_role text,
  view_scope text,
  created_at timestamptz default now()
);

alter table public.staff_public_profiles enable row level security;
alter table public.staff_edit_requests enable row level security;
alter table public.staff_profile_view_logs enable row level security;

drop policy if exists staff_public_profiles_admin_all on public.staff_public_profiles;
create policy staff_public_profiles_admin_all on public.staff_public_profiles
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists staff_public_profiles_self_select on public.staff_public_profiles;
create policy staff_public_profiles_self_select on public.staff_public_profiles
  for select using (exists (select 1 from public.staff_profiles sp where sp.id = staff_profile_id and sp.user_id = auth.uid()));

drop policy if exists staff_public_profiles_self_update on public.staff_public_profiles;
create policy staff_public_profiles_self_update on public.staff_public_profiles
  for update using (exists (select 1 from public.staff_profiles sp where sp.id = staff_profile_id and sp.user_id = auth.uid()))
  with check (exists (select 1 from public.staff_profiles sp where sp.id = staff_profile_id and sp.user_id = auth.uid()));

drop policy if exists staff_public_profiles_self_insert on public.staff_public_profiles;
create policy staff_public_profiles_self_insert on public.staff_public_profiles
  for insert with check (exists (select 1 from public.staff_profiles sp where sp.id = staff_profile_id and sp.user_id = auth.uid()));

drop policy if exists staff_edit_requests_admin_all on public.staff_edit_requests;
create policy staff_edit_requests_admin_all on public.staff_edit_requests
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists staff_edit_requests_self_select on public.staff_edit_requests;
create policy staff_edit_requests_self_select on public.staff_edit_requests
  for select using (exists (select 1 from public.staff_profiles sp where sp.id = staff_profile_id and sp.user_id = auth.uid()));

drop policy if exists staff_edit_requests_self_insert on public.staff_edit_requests;
create policy staff_edit_requests_self_insert on public.staff_edit_requests
  for insert with check (exists (select 1 from public.staff_profiles sp where sp.id = staff_profile_id and sp.user_id = auth.uid()));

drop policy if exists staff_profile_view_logs_admin_select on public.staff_profile_view_logs;
create policy staff_profile_view_logs_admin_select on public.staff_profile_view_logs
  for select using (public.is_admin(auth.uid()));

create or replace function public.my_staff_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.staff_profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.staff_profile_context(input_staff_profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile', to_jsonb(sp),
    'public_profile', to_jsonb(spp),
    'assignment', to_jsonb(sa),
    'medical_info', to_jsonb(smi),
    'edit_requests', coalesce((
      select jsonb_agg(to_jsonb(ser) order by ser.created_at desc)
      from public.staff_edit_requests ser
      where ser.staff_profile_id = sp.id
    ), '[]'::jsonb)
  )
  from public.staff_profiles sp
  left join public.staff_public_profiles spp on spp.staff_profile_id = sp.id
  left join public.staff_assignments sa on sa.staff_profile_id = sp.id
  left join public.staff_medical_info smi on smi.staff_profile_id = sp.id
  where sp.id = input_staff_profile_id;
$$;

create or replace function public.get_my_staff_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid := public.my_staff_profile_id();
  result jsonb;
begin
  if staff_id is null then
    raise exception 'staff access required';
  end if;

  insert into public.staff_public_profiles (staff_profile_id)
  values (staff_id)
  on conflict (staff_profile_id) do nothing;

  result := public.staff_profile_context(staff_id);
  insert into public.staff_profile_view_logs (staff_profile_id, viewed_by, viewer_role, view_scope)
  values (staff_id, auth.uid(), 'self', 'self_profile');
  return result;
end;
$$;

create or replace function public.update_my_staff_public_profile(input_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid := public.my_staff_profile_id();
  updated public.staff_public_profiles;
  interests_value text[];
begin
  if staff_id is null then
    raise exception 'staff access required';
  end if;

  select coalesce(array_agg(public.clean_placeholder_text(value)), '{}'::text[])
  into interests_value
  from jsonb_array_elements_text(coalesce(input_data->'interests', '[]'::jsonb)) value
  where public.clean_placeholder_text(value) is not null;

  insert into public.staff_public_profiles (
    staff_profile_id, avatar_url, bio, hometown, interests,
    public_profile_enabled, show_instagram, show_line_id, show_facebook,
    show_phone_to_staff, show_phone_to_public, profile_completed_at, updated_at
  )
  values (
    staff_id,
    public.clean_placeholder_text(input_data->>'avatar_url'),
    public.clean_placeholder_text(input_data->>'bio'),
    public.clean_placeholder_text(input_data->>'hometown'),
    interests_value,
    coalesce((input_data->>'public_profile_enabled')::boolean, false),
    coalesce((input_data->>'show_instagram')::boolean, true),
    coalesce((input_data->>'show_line_id')::boolean, false),
    coalesce((input_data->>'show_facebook')::boolean, false),
    coalesce((input_data->>'show_phone_to_staff')::boolean, true),
    coalesce((input_data->>'show_phone_to_public')::boolean, false),
    case when public.clean_placeholder_text(input_data->>'bio') is not null then now() else null end,
    now()
  )
  on conflict (staff_profile_id) do update
  set avatar_url = case when input_data ? 'avatar_url' then excluded.avatar_url else staff_public_profiles.avatar_url end,
      bio = case when input_data ? 'bio' then excluded.bio else staff_public_profiles.bio end,
      hometown = case when input_data ? 'hometown' then excluded.hometown else staff_public_profiles.hometown end,
      interests = case when input_data ? 'interests' then excluded.interests else staff_public_profiles.interests end,
      public_profile_enabled = case when input_data ? 'public_profile_enabled' then excluded.public_profile_enabled else staff_public_profiles.public_profile_enabled end,
      show_instagram = case when input_data ? 'show_instagram' then excluded.show_instagram else staff_public_profiles.show_instagram end,
      show_line_id = case when input_data ? 'show_line_id' then excluded.show_line_id else staff_public_profiles.show_line_id end,
      show_facebook = case when input_data ? 'show_facebook' then excluded.show_facebook else staff_public_profiles.show_facebook end,
      show_phone_to_staff = case when input_data ? 'show_phone_to_staff' then excluded.show_phone_to_staff else staff_public_profiles.show_phone_to_staff end,
      show_phone_to_public = case when input_data ? 'show_phone_to_public' then excluded.show_phone_to_public else staff_public_profiles.show_phone_to_public end,
      profile_completed_at = coalesce(staff_public_profiles.profile_completed_at, excluded.profile_completed_at),
      updated_at = now()
  returning * into updated;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, new_data)
  values (staff_id, auth.uid(), 'staff_public_profile_updated', to_jsonb(updated));

  return to_jsonb(updated);
end;
$$;

create or replace function public.submit_staff_edit_request(input_new_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid := public.my_staff_profile_id();
  created public.staff_edit_requests;
  old_snapshot jsonb;
begin
  if staff_id is null then
    raise exception 'staff access required';
  end if;

  select jsonb_build_object('profile', to_jsonb(sp), 'medical', to_jsonb(smi))
  into old_snapshot
  from public.staff_profiles sp
  left join public.staff_medical_info smi on smi.staff_profile_id = sp.id
  where sp.id = staff_id;

  insert into public.staff_edit_requests (staff_profile_id, requested_by, old_data, new_data)
  values (staff_id, auth.uid(), old_snapshot, input_new_data)
  returning * into created;

  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (staff_id, auth.uid(), 'staff_edit_request_submitted', old_snapshot, input_new_data);

  return to_jsonb(created);
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

create or replace function public.get_admin_staff_profile_detail(input_staff_profile_id uuid)
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
  result := public.staff_profile_context(input_staff_profile_id);
  result := result || jsonb_build_object('audit_logs', coalesce((
    select jsonb_agg(to_jsonb(logs) order by logs.created_at desc)
    from public.staff_audit_logs logs
    where logs.staff_profile_id = input_staff_profile_id
  ), '[]'::jsonb));
  insert into public.staff_profile_view_logs (staff_profile_id, viewed_by, viewer_role, view_scope)
  values (input_staff_profile_id, auth.uid(), 'admin', 'admin_full_profile');
  return result;
end;
$$;

create or replace function public.update_staff_public_profile_admin(input_staff_profile_id uuid, input_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  previous jsonb;
  updated jsonb;
  updated_row public.staff_public_profiles;
  interests_value text[];
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;
  select to_jsonb(spp) into previous from public.staff_public_profiles spp where spp.staff_profile_id = input_staff_profile_id;
  select coalesce(array_agg(public.clean_placeholder_text(value)), '{}'::text[])
  into interests_value
  from jsonb_array_elements_text(coalesce(input_data->'interests', '[]'::jsonb)) value
  where public.clean_placeholder_text(value) is not null;
  insert into public.staff_public_profiles (staff_profile_id) values (input_staff_profile_id) on conflict do nothing;
  update public.staff_public_profiles
  set avatar_url = case when input_data ? 'avatar_url' then public.clean_placeholder_text(input_data->>'avatar_url') else avatar_url end,
      bio = case when input_data ? 'bio' then public.clean_placeholder_text(input_data->>'bio') else bio end,
      hometown = case when input_data ? 'hometown' then public.clean_placeholder_text(input_data->>'hometown') else hometown end,
      interests = case when input_data ? 'interests' then interests_value else interests end,
      public_profile_enabled = case when input_data ? 'public_profile_enabled' then (input_data->>'public_profile_enabled')::boolean else public_profile_enabled end,
      show_instagram = case when input_data ? 'show_instagram' then (input_data->>'show_instagram')::boolean else show_instagram end,
      show_line_id = case when input_data ? 'show_line_id' then (input_data->>'show_line_id')::boolean else show_line_id end,
      show_facebook = case when input_data ? 'show_facebook' then (input_data->>'show_facebook')::boolean else show_facebook end,
      show_phone_to_staff = case when input_data ? 'show_phone_to_staff' then (input_data->>'show_phone_to_staff')::boolean else show_phone_to_staff end,
      show_phone_to_public = case when input_data ? 'show_phone_to_public' then (input_data->>'show_phone_to_public')::boolean else show_phone_to_public end,
      updated_at = now()
  where staff_profile_id = input_staff_profile_id
  returning * into updated_row;
  updated := to_jsonb(updated_row);
  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (input_staff_profile_id, auth.uid(), 'admin_staff_public_profile_updated', previous, updated);
  return updated;
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
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;
  select * into req from public.staff_edit_requests where id = request_id and status = 'pending';
  if req.id is null then raise exception 'request not found'; end if;
  profile_data := coalesce(req.new_data->'profile', '{}'::jsonb);
  medical_data := coalesce(req.new_data->'medical', '{}'::jsonb);

  update public.staff_profiles
  set phone = case when profile_data ? 'phone' then public.clean_placeholder_text(profile_data->>'phone') else phone end,
      line_id = case when profile_data ? 'line_id' then public.clean_placeholder_text(profile_data->>'line_id') else line_id end,
      instagram = case when profile_data ? 'instagram' then public.clean_placeholder_text(profile_data->>'instagram') else instagram end,
      facebook = case when profile_data ? 'facebook' then public.clean_placeholder_text(profile_data->>'facebook') else facebook end,
      updated_at = now()
  where id = req.staff_profile_id;

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

  update public.staff_edit_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = req.id;
  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (req.staff_profile_id, auth.uid(), 'staff_edit_request_approved', req.old_data, req.new_data);
end;
$$;

create or replace function public.reject_staff_edit_request(request_id uuid, note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.staff_edit_requests;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;
  select * into req from public.staff_edit_requests where id = request_id and status = 'pending';
  if req.id is null then raise exception 'request not found'; end if;
  update public.staff_edit_requests
  set status = 'rejected', admin_note = public.clean_placeholder_text(note), reviewed_at = now(), reviewed_by = auth.uid()
  where id = req.id;
  insert into public.staff_audit_logs (staff_profile_id, actor_id, action, old_data, new_data)
  values (req.staff_profile_id, auth.uid(), 'staff_edit_request_rejected', req.new_data, jsonb_build_object('note', note));
end;
$$;

create or replace function public.get_admin_staff_profiles()
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

  select coalesce(jsonb_agg(to_jsonb(sp) || jsonb_build_object(
    'medical_info', to_jsonb(smi),
    'assignment', to_jsonb(sa),
    'public_profile', to_jsonb(spp),
    'pending_staff_edit_requests', coalesce(req.pending_count, 0)
  ) order by sp.created_at desc), '[]'::jsonb)
  into result
  from public.staff_profiles sp
  left join public.staff_medical_info smi on smi.staff_profile_id = sp.id
  left join public.staff_assignments sa on sa.staff_profile_id = sp.id
  left join public.staff_public_profiles spp on spp.staff_profile_id = sp.id
  left join lateral (
    select count(*)::int pending_count
    from public.staff_edit_requests ser
    where ser.staff_profile_id = sp.id and ser.status = 'pending'
  ) req on true;

  return result;
end;
$$;

insert into storage.buckets (id, name, public)
values ('staff-avatars', 'staff-avatars', false)
on conflict (id) do nothing;

revoke all on function public.my_staff_profile_id() from public, anon, authenticated;
revoke all on function public.staff_profile_context(uuid) from public, anon, authenticated;
grant execute on function public.get_my_staff_profile() to authenticated;
grant execute on function public.update_my_staff_public_profile(jsonb) to authenticated;
grant execute on function public.submit_staff_edit_request(jsonb) to authenticated;
grant execute on function public.get_public_staff_cards(text, text) to anon, authenticated;
grant execute on function public.get_staff_directory() to authenticated;
grant execute on function public.get_admin_staff_profile_detail(uuid) to authenticated;
grant execute on function public.update_staff_public_profile_admin(uuid, jsonb) to authenticated;
grant execute on function public.approve_staff_edit_request(uuid) to authenticated;
grant execute on function public.reject_staff_edit_request(uuid, text) to authenticated;
