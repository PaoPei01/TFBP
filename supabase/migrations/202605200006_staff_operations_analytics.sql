alter table public.staff_assignments
  add column if not exists primary_role text,
  add column if not exists secondary_roles text[] not null default '{}';

update public.staff_assignments sa
set primary_role = coalesce(
  nullif(sa.primary_role, ''),
  nullif(sp.position, ''),
  case
    when sa.role = 'emergency_staff' then 'พยาบาล'
    when sa.role in ('staff', 'mentor') then 'พี่กลุ่ม'
    else 'ทีมงาน'
  end
)
from public.staff_profiles sp
where sp.id = sa.staff_profile_id
  and nullif(sa.primary_role, '') is null;

update public.staff_assignments
set primary_role = coalesce(
  nullif(primary_role, ''),
  case
    when role = 'emergency_staff' then 'พยาบาล'
    when role in ('staff', 'mentor') then 'พี่กลุ่ม'
    else 'ทีมงาน'
  end
)
where nullif(primary_role, '') is null;

alter table public.staff_assignments
  alter column primary_role set default 'ทีมงาน',
  alter column primary_role set not null;

create table if not exists public.staff_role_quotas (
  id uuid primary key default gen_random_uuid(),
  role_name text unique not null,
  target_count integer not null default 0 check (target_count >= 0),
  warning_threshold integer not null default 0 check (warning_threshold >= 0),
  critical_threshold integer not null default 0 check (critical_threshold >= 0),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.staff_role_quotas enable row level security;

drop policy if exists "Admins can manage staff role quotas" on public.staff_role_quotas;
create policy "Admins can manage staff role quotas"
on public.staff_role_quotas for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Staff can read staff role quotas" on public.staff_role_quotas;
create policy "Staff can read staff role quotas"
on public.staff_role_quotas for select
to authenticated
using (
  public.is_admin(auth.uid())
  or exists (select 1 from public.staff_assignments where user_id = auth.uid())
);

insert into public.staff_role_quotas (role_name, target_count, warning_threshold, critical_threshold)
values
  ('วางแผน (ทีมบอ)', 7, 1, 2),
  ('พี่กลุ่ม', 60, 5, 10),
  ('พี่ฐาน', 112, 10, 20),
  ('ไทม์เมอร์', 9, 2, 3),
  ('พยาบาล', 9, 2, 3),
  ('จราจร', 13, 2, 4),
  ('สวัสดิการ', 5, 1, 2),
  ('สตาฟให้ความบันเทิง', 4, 1, 2),
  ('โฟโต้', 7, 1, 2)
on conflict (role_name) do update
set target_count = excluded.target_count,
    warning_threshold = excluded.warning_threshold,
    critical_threshold = excluded.critical_threshold,
    updated_at = now();

create or replace function public.audit_staff_role_quota_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.staff_audit_logs (actor_id, action, old_data, new_data)
  values (
    auth.uid(),
    case when tg_op = 'INSERT' then 'staff_quota_created' else 'staff_quota_updated' end,
    case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end,
    to_jsonb(new)
  );
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists staff_role_quotas_audit on public.staff_role_quotas;
create trigger staff_role_quotas_audit
before insert or update on public.staff_role_quotas
for each row execute function public.audit_staff_role_quota_change();

create or replace function public.staff_ops_roles(sa public.staff_assignments)
returns text[]
language sql
immutable
as $$
  select array_remove(array_prepend(nullif(sa.primary_role, ''), coalesce(sa.secondary_roles, '{}'::text[])), null);
$$;

create or replace function public.get_staff_quota_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  return (
    with assignment_roles as (
      select
        sa.staff_profile_id,
        sa.primary_role,
        unnest(coalesce(sa.secondary_roles, '{}'::text[])) as secondary_role
      from public.staff_assignments sa
    ),
    duplicate_staff as (
      select key_value, count(*) as duplicate_count
      from (
        select lower(nullif(email, '')) as key_value from public.staff_profiles
        union all
        select regexp_replace(coalesce(phone, ''), '\D', '', 'g') from public.staff_profiles
        union all
        select nullif(student_id, '') from public.staff_profiles
      ) keys
      where key_value is not null and key_value <> ''
      group by key_value
      having count(*) > 1
    )
    select jsonb_build_object(
      'rows', coalesce(jsonb_agg(jsonb_build_object(
        'role_name', q.role_name,
        'target_count', q.target_count,
        'current_primary_count', coalesce(primary_counts.count, 0),
        'current_secondary_count', coalesce(secondary_counts.count, 0),
        'unique_staff_count', coalesce(unique_counts.count, 0),
        'shortage_count', greatest(q.target_count - coalesce(unique_counts.count, 0), 0),
        'overflow_count', greatest(coalesce(unique_counts.count, 0) - q.target_count, 0),
        'health_status', case
          when coalesce(unique_counts.count, 0) >= q.target_count then 'green'
          when q.target_count - coalesce(unique_counts.count, 0) <= q.warning_threshold then 'yellow'
          when q.target_count - coalesce(unique_counts.count, 0) >= q.critical_threshold then 'red'
          else 'red'
        end,
        'overlap_count', coalesce(overlap_counts.count, 0),
        'missing_assignment_count', (select count(*) from public.staff_profiles sp where not exists (select 1 from public.staff_assignments sa where sa.staff_profile_id = sp.id))
      ) order by q.role_name), '[]'::jsonb),
      'total_staff', (select count(*) from public.staff_profiles),
      'unique_staff', (select count(distinct id) from public.staff_profiles),
      'active_assignments', (select count(*) from public.staff_assignments),
      'duplicate_record_count', (select coalesce(sum(duplicate_count - 1), 0) from duplicate_staff)
    )
    from public.staff_role_quotas q
    left join lateral (
      select count(distinct staff_profile_id) as count
      from public.staff_assignments sa
      where sa.primary_role = q.role_name
    ) primary_counts on true
    left join lateral (
      select count(distinct staff_profile_id) as count
      from assignment_roles ar
      where ar.secondary_role = q.role_name
    ) secondary_counts on true
    left join lateral (
      select count(distinct sa.staff_profile_id) as count
      from public.staff_assignments sa
      where q.role_name = any(public.staff_ops_roles(sa))
    ) unique_counts on true
    left join lateral (
      select count(*) as count
      from public.staff_assignments sa
      where q.role_name = any(public.staff_ops_roles(sa))
        and cardinality(public.staff_ops_roles(sa)) > 1
    ) overlap_counts on true
  );
end;
$$;

create or replace function public.detect_staff_role_conflicts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  return (
    with staff_rows as (
      select
        sp.id,
        coalesce(sp.name_th, sp.name_en, sp.nickname_th, sp.nickname, sp.nickname_en, sp.email, sp.student_id, 'Unknown Staff') as name,
        sp.student_id,
        sp.email,
        sp.phone,
        sa.primary_role,
        coalesce(sa.secondary_roles, '{}'::text[]) as secondary_roles,
        public.staff_ops_roles(sa) as roles,
        sa.main_group,
        sa.subgroup
      from public.staff_profiles sp
      left join public.staff_assignments sa on sa.staff_profile_id = sp.id
    ),
    conflict_rows as (
      select
        sr.id,
        sr.name,
        array_remove(array[
          case when sr.primary_role is null or sr.primary_role = '' then 'missing_primary_role' end,
          case when cardinality(sr.secondary_roles) > 3 then 'too_many_secondary_roles' end,
          case when cardinality(sr.roles) > 4 then 'too_many_operational_roles' end,
          case when 'พยาบาล' = any(sr.roles) and 'จราจร' = any(sr.roles) then 'พยาบาล + จราจร' end,
          case when 'พยาบาล' = any(sr.roles) and 'สตาฟให้ความบันเทิง' = any(sr.roles) then 'พยาบาล + Entertainment' end,
          case when 'พยาบาล' = any(sr.roles) and 'ไทม์เมอร์' = any(sr.roles) then 'พยาบาล + Timer' end,
          case when 'ไทม์เมอร์' = any(sr.roles) and 'พิธีกร' = any(sr.roles) then 'Timer + MC' end,
          case when 'วางแผน (ทีมบอ)' = any(sr.roles) and cardinality(sr.roles) > 2 then 'Planner has too many operational roles' end,
          case when sr.primary_role in ('พี่กลุ่ม', 'พี่ฐาน') and (sr.main_group is null or sr.subgroup is null) then 'missing_group_assignment' end,
          case when exists (
            select 1 from public.staff_profiles dup
            where dup.id <> sr.id
              and (
                (dup.student_id is not null and dup.student_id = sr.student_id)
                or (dup.email is not null and lower(dup.email) = lower(sr.email))
                or (dup.phone is not null and regexp_replace(dup.phone, '\D', '', 'g') = regexp_replace(coalesce(sr.phone, ''), '\D', '', 'g'))
              )
          ) then 'duplicated_record' end
        ], null) as detected_conflicts
      from staff_rows sr
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'staff_id', id,
      'name', name,
      'detected_conflicts', detected_conflicts,
      'severity', case
        when detected_conflicts && array['missing_primary_role','พยาบาล + จราจร','พยาบาล + Timer','duplicated_record'] then 'red'
        when cardinality(detected_conflicts) >= 2 then 'yellow'
        else 'yellow'
      end
    ) order by name), '[]'::jsonb)
    from conflict_rows
    where cardinality(detected_conflicts) > 0
  );
end;
$$;

create or replace function public.validate_staff_structure()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  warnings text[] := '{}';
  errors text[] := '{}';
  score integer := 100;
  missing_groups integer;
  empty_subgroups integer;
  base_count integer;
  medic_count integer;
  duplicate_count integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  select count(*) into missing_groups
  from public.group_settings gs
  where not exists (
    select 1
    from public.staff_assignments sa
    where sa.main_group = gs.main_group
      and sa.subgroup = gs.subgroup
      and 'พี่กลุ่ม' = any(public.staff_ops_roles(sa))
  );
  if missing_groups > 0 then
    errors := array_append(errors, 'มีกลุ่มย่อยที่ยังไม่มีพี่กลุ่ม ' || missing_groups || ' กลุ่ม');
    score := score - least(25, missing_groups * 3);
  end if;

  select count(*) into empty_subgroups
  from public.group_settings gs
  where not exists (
    select 1 from public.group_assignments ga
    where ga.main_group = gs.main_group
      and ga.subgroup = gs.subgroup
  );
  if empty_subgroups > 0 then
    warnings := array_append(warnings, 'มีกลุ่มย่อยที่ยังไม่มีผู้เข้าร่วม ' || empty_subgroups || ' กลุ่ม');
    score := score - least(10, empty_subgroups * 2);
  end if;

  select count(distinct staff_profile_id) into base_count
  from public.staff_assignments sa
  where 'พี่ฐาน' = any(public.staff_ops_roles(sa));
  if base_count = 0 then
    errors := array_append(errors, 'ยังไม่มีพี่ฐาน');
    score := score - 15;
  end if;

  select count(distinct staff_profile_id) into medic_count
  from public.staff_assignments sa
  where 'พยาบาล' = any(public.staff_ops_roles(sa));
  if medic_count = 0 then
    errors := array_append(errors, 'ยังไม่มีทีมพยาบาล');
    score := score - 20;
  elsif medic_count < 9 then
    warnings := array_append(warnings, 'ทีมพยาบาลยังไม่ครบ quota: ' || medic_count || '/9');
    score := score - least(10, 9 - medic_count);
  end if;

  if not exists (
    select 1 from public.staff_profiles sp
    join public.staff_assignments sa on sa.staff_profile_id = sp.id
    where 'พยาบาล' = any(public.staff_ops_roles(sa))
      and nullif(sp.phone, '') is not null
  ) then
    warnings := array_append(warnings, 'ยังไม่มีเบอร์ติดต่อทีมพยาบาลใน staff_profiles');
    score := score - 5;
  end if;

  select count(*) into duplicate_count
  from (
    select student_id from public.staff_profiles where student_id is not null group by student_id having count(*) > 1
    union all
    select lower(email) from public.staff_profiles where email is not null group by lower(email) having count(*) > 1
    union all
    select regexp_replace(phone, '\D', '', 'g') from public.staff_profiles where phone is not null group by regexp_replace(phone, '\D', '', 'g') having count(*) > 1
  ) duplicates;
  if duplicate_count > 0 then
    warnings := array_append(warnings, 'พบข้อมูลทีมงานซ้ำ ' || duplicate_count || ' จุด');
    score := score - least(10, duplicate_count * 2);
  end if;

  return jsonb_build_object(
    'warnings', warnings,
    'errors', errors,
    'readiness_score', greatest(score, 0)
  );
end;
$$;

create or replace function public.get_staff_assignment_recommendations()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  return (
    with analytics as (
      select *
      from jsonb_to_recordset((public.get_staff_quota_analytics()->'rows'))
        as row(role_name text, target_count integer, unique_staff_count integer, shortage_count integer, overflow_count integer, health_status text)
    ),
    shortages as (
      select * from analytics where shortage_count > 0
    ),
    overflow as (
      select * from analytics where overflow_count > 0
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'recommendation_type', case when o.role_name is not null then 'move_overflow' else 'fill_shortage' end,
      'source_role', o.role_name,
      'target_role', s.role_name,
      'suggested_staff', coalesce((
        select jsonb_agg(to_jsonb(suggested_rows) order by suggested_rows.name)
        from (
          select
            sp.id,
            coalesce(sp.name_th, sp.name_en, sp.nickname_th, sp.nickname, sp.student_id) as name,
            sp.phone,
            sa.primary_role,
            sa.secondary_roles
          from public.staff_profiles sp
          join public.staff_assignments sa on sa.staff_profile_id = sp.id
          where (o.role_name is null or o.role_name = any(public.staff_ops_roles(sa)))
            and not s.role_name = any(public.staff_ops_roles(sa))
          order by sp.name_th
          limit 5
        ) suggested_rows
      ), '[]'::jsonb),
      'reason', case
        when o.role_name is not null then o.role_name || ' เกิน quota และ ' || s.role_name || ' ขาด ' || s.shortage_count
        else s.role_name || ' ขาด ' || s.shortage_count || ' คน'
      end
    ) order by s.shortage_count desc), '[]'::jsonb)
    from shortages s
    left join overflow o on true
  );
end;
$$;

create or replace function public.get_staff_operations_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  total_target integer;
  total_current integer;
  medic_count integer;
  group_staff_count integer;
  score integer := 100;
begin
  if not (
    public.is_admin(auth.uid())
    or exists (select 1 from public.staff_assignments where user_id = auth.uid())
  ) then
    raise exception 'staff access required';
  end if;

  select
    coalesce(sum(q.target_count), 0),
    coalesce(sum(least(coalesce(role_counts.count, 0), q.target_count)), 0)
  into total_target, total_current
  from public.staff_role_quotas q
  left join lateral (
    select count(distinct sa.staff_profile_id) as count
    from public.staff_assignments sa
    where q.role_name = any(public.staff_ops_roles(sa))
  ) role_counts on true;

  select count(distinct staff_profile_id) into medic_count
  from public.staff_assignments sa
  where 'พยาบาล' = any(public.staff_ops_roles(sa));

  select count(distinct staff_profile_id) into group_staff_count
  from public.staff_assignments sa
  where 'พี่กลุ่ม' = any(public.staff_ops_roles(sa));

  if medic_count = 0 then
    score := score - 20;
  end if;
  if group_staff_count < 14 then
    score := score - 20;
  end if;
  if total_target > 0 and total_current < total_target then
    score := score - least(30, total_target - total_current);
  end if;

  return jsonb_build_object(
    'quota_completion_percent', case when total_target = 0 then 0 else round((total_current::numeric / total_target::numeric) * 100)::integer end,
    'readiness_score', greatest(score, 0),
    'warning_count', case when total_current < total_target then 1 else 0 end,
    'error_count', case when medic_count = 0 or group_staff_count < 14 then 1 else 0 end
  );
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
      coalesce(nullif(input_assignment->>'primary_role', ''), nullif(updated_profile.position, ''), 'ทีมงาน'),
      coalesce(array(select jsonb_array_elements_text(coalesce(input_assignment->'secondary_roles', '[]'::jsonb))), '{}'::text[])
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
        coalesce(nullif(assignment_input->>'primary_role', ''), nullif(profile_row.position, ''), 'ทีมงาน'),
        coalesce(array(select jsonb_array_elements_text(coalesce(assignment_input->'secondary_roles', '[]'::jsonb))), '{}'::text[])
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

grant select on public.staff_role_quotas to authenticated;
grant execute on function public.get_staff_quota_analytics() to authenticated;
grant execute on function public.detect_staff_role_conflicts() to authenticated;
grant execute on function public.validate_staff_structure() to authenticated;
grant execute on function public.get_staff_assignment_recommendations() to authenticated;
grant execute on function public.get_staff_operations_summary() to authenticated;
grant execute on function public.update_staff_profile_admin(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.import_staff_records_admin(jsonb) to authenticated;
