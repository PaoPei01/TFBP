create table if not exists public.group_staff (
  id uuid primary key default gen_random_uuid(),
  student_id text,
  name text not null,
  nickname text,
  phone text,
  disease text,
  drug_allergy text,
  food_allergy text,
  main_group text not null check (main_group in ('Red', 'Blue', 'Yellow', 'Green', 'Pink', 'Purple', 'Orange')),
  subgroup text not null check (subgroup in ('A', 'B')),
  duty text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (student_id, main_group, subgroup)
);

alter table public.group_staff enable row level security;

drop policy if exists "Admins can manage group staff" on public.group_staff;
create policy "Admins can manage group staff"
on public.group_staff for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Staff can read group staff roster" on public.group_staff;
create policy "Staff can read group staff roster"
on public.group_staff for select
to authenticated
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.staff_assignments sa
    where sa.user_id = auth.uid()
      and sa.main_group = group_staff.main_group
      and (sa.subgroup is null or sa.subgroup = group_staff.subgroup)
  )
);

create or replace function public.get_staff_group_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  staff_row public.staff_assignments;
begin
  select * into staff_row
  from public.staff_assignments
  where user_id = auth.uid()
  order by created_at asc
  limit 1;

  if not found and not public.is_admin(auth.uid()) then
    return null;
  end if;

  return jsonb_build_object(
    'assignment', to_jsonb(staff_row),
    'settings', (
      select coalesce(jsonb_agg(to_jsonb(gs)), '[]'::jsonb)
      from public.group_settings gs
      where public.is_admin(auth.uid())
         or (gs.main_group = staff_row.main_group and (staff_row.subgroup is null or gs.subgroup = staff_row.subgroup))
    ),
    'staff_roster', (
      select coalesce(jsonb_agg(to_jsonb(gst) order by gst.subgroup, gst.name), '[]'::jsonb)
      from public.group_staff gst
      where public.is_admin(auth.uid())
         or (gst.main_group = staff_row.main_group and (staff_row.subgroup is null or gst.subgroup = staff_row.subgroup))
    ),
    'participants', (
      select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object('group_assignment', to_jsonb(ga)) order by p.name_th), '[]'::jsonb)
      from public.group_assignments ga
      join public.profiles p on p.id = ga.profile_id
      where public.is_admin(auth.uid())
         or (ga.main_group = staff_row.main_group and (staff_row.subgroup is null or ga.subgroup = staff_row.subgroup))
    )
  );
end;
$$;

create or replace function public.get_verified_group_context(input_email text, input_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  profile_row public.profiles;
  assignment_row public.group_assignments;
  setting_row public.group_settings;
begin
  select *
  into profile_row
  from public.profiles
  where lower(email) = lower(trim(input_email))
    and public.normalize_phone(phone) = public.normalize_phone(input_phone)
  limit 1;

  if not found then
    return null;
  end if;

  select * into assignment_row from public.group_assignments where profile_id = profile_row.id;
  select * into setting_row from public.group_settings where main_group = assignment_row.main_group and subgroup = assignment_row.subgroup;

  return jsonb_build_object(
    'profile', to_jsonb(profile_row) - array['phone', 'emergency_phone', 'food_allergy', 'disease', 'drug_allergy'],
    'assignment', to_jsonb(assignment_row),
    'setting', to_jsonb(setting_row),
    'staff_roster', (
      select coalesce(jsonb_agg(to_jsonb(gst) - array['phone', 'disease', 'drug_allergy', 'food_allergy'] order by gst.name), '[]'::jsonb)
      from public.group_staff gst
      where gst.main_group = assignment_row.main_group
        and gst.subgroup = assignment_row.subgroup
    )
  );
end;
$$;

grant select on public.group_staff to authenticated;
