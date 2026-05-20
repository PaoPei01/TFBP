alter table public.staff_assignments
  add column if not exists primary_role text,
  add column if not exists secondary_roles text[] not null default '{}';

create or replace function public.normalize_staff_operational_role(input_role text)
returns text
language plpgsql
immutable
as $$
declare
  raw text := nullif(btrim(coalesce(input_role, '')), '');
  lower_raw text;
begin
  if raw is null then
    return null;
  end if;

  lower_raw := lower(raw);

  if lower_raw in ('staff', 'mentor', 'viewer', 'emergency_staff') then
    return null;
  end if;

  if lower_raw like '%ทีมบอ%' or lower_raw like '%วางแผน%' or lower_raw like '%planner%' or lower_raw like '%plan%' then
    return 'วางแผน (ทีมบอ)';
  elsif lower_raw like '%พี่กลุ่ม%' or lower_raw like '%mentor%' or lower_raw like '%group staff%' then
    return 'พี่กลุ่ม';
  elsif lower_raw like '%พี่ฐาน%' or lower_raw like '%ฐาน%' or lower_raw like '%base%' then
    return 'พี่ฐาน';
  elsif lower_raw like '%ไทม์%' or lower_raw like '%timer%' then
    return 'ไทม์เมอร์';
  elsif lower_raw like '%พยาบาล%' or lower_raw like '%medic%' or lower_raw like '%medical%' or lower_raw like '%nurse%' then
    return 'พยาบาล';
  elsif lower_raw like '%จราจร%' or lower_raw like '%traffic%' then
    return 'จราจร';
  elsif lower_raw like '%สวัสดิการ%' or lower_raw like '%welfare%' then
    return 'สวัสดิการ';
  elsif lower_raw like '%โสต%' or lower_raw like '%audio%' or lower_raw like '%visual%' or lower_raw like '%av%' then
    return 'โสตทัศนูปกรณ์';
  elsif lower_raw like '%บันเทิง%' or lower_raw like '%สันทนาการ%' or lower_raw like '%entertain%' then
    return 'สตาฟให้ความบันเทิง';
  elsif lower_raw like '%โฟโต้%' or lower_raw like '%photo%' or lower_raw like '%photographer%' then
    return 'โฟโต้';
  elsif lower_raw like '%พิธีกร%' or lower_raw like '%mc%' then
    return 'พิธีกร';
  end if;

  return raw;
end;
$$;

create or replace function public.normalize_staff_system_role(input_role text, input_primary_role text default null)
returns text
language plpgsql
immutable
as $$
declare
  raw text := lower(nullif(btrim(coalesce(input_role, '')), ''));
  duty text := public.normalize_staff_operational_role(coalesce(input_primary_role, input_role));
begin
  if raw = 'mentor' or raw like '%mentor%' then
    return 'mentor';
  elsif raw = 'viewer' or raw like '%viewer%' or raw like '%read%' then
    return 'viewer';
  elsif raw = 'emergency_staff' or raw like '%emergency%' or duty = 'พยาบาล' then
    return 'emergency_staff';
  elsif raw = 'staff' or raw like '%staff%' or raw like '%สตาฟ%' then
    return 'staff';
  elsif input_role is not null or duty is not null then
    return 'staff';
  end if;

  return null;
end;
$$;

create or replace function public.staff_ops_roles(sa public.staff_assignments)
returns text[]
language sql
immutable
as $$
  select array_remove(
    array(
      select distinct public.normalize_staff_operational_role(role_name)
      from unnest(array_prepend(nullif(sa.primary_role, ''), coalesce(sa.secondary_roles, '{}'::text[]))) role_name
    ),
    null
  );
$$;

update public.staff_assignments
set primary_role = coalesce(
      public.normalize_staff_operational_role(primary_role),
      public.normalize_staff_operational_role(role),
      'ทีมงาน'
    ),
    secondary_roles = coalesce(array(
      select distinct public.normalize_staff_operational_role(role_name)
      from unnest(coalesce(secondary_roles, '{}'::text[])) role_name
      where public.normalize_staff_operational_role(role_name) is not null
    ), '{}'::text[]);

update public.staff_assignments
set role = public.normalize_staff_system_role(role, primary_role);

update public.staff_assignments
set role = 'staff'
where role is null;

alter table public.staff_assignments
  alter column role set default 'staff',
  alter column role set not null,
  alter column primary_role drop not null,
  alter column primary_role drop default;

alter table public.staff_assignments
  drop constraint if exists staff_assignments_role_scope_check;

alter table public.staff_assignments
  add constraint staff_assignments_role_scope_check
  check (role in ('staff', 'mentor', 'viewer', 'emergency_staff'));

delete from public.staff_role_quotas
where role_name in ('สตาฟให้ความบันเทิง', 'พิธีกร');

insert into public.staff_role_quotas (role_name, target_count, warning_threshold, critical_threshold)
values
  ('วางแผน (ทีมบอ)', 7, 1, 2),
  ('พี่กลุ่ม', 60, 5, 10),
  ('พี่ฐาน', 112, 10, 20),
  ('ไทม์เมอร์', 9, 2, 3),
  ('พยาบาล', 9, 2, 3),
  ('จราจร', 13, 2, 4),
  ('สวัสดิการ', 5, 1, 2),
  ('โสตทัศนูปกรณ์', 3, 1, 1),
  ('โฟโต้', 7, 1, 2)
on conflict (role_name) do update
set target_count = excluded.target_count,
    warning_threshold = excluded.warning_threshold,
    critical_threshold = excluded.critical_threshold,
    updated_at = now();

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
        public.normalize_staff_operational_role(sa.primary_role) as primary_role,
        unnest(coalesce(sa.secondary_roles, '{}'::text[])) as secondary_role
      from public.staff_assignments sa
    ),
    distinct_roles as (
      select role_name from public.staff_role_quotas
      union
      select unnest(public.staff_ops_roles(sa)) as role_name
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
    ),
    role_rows as (
      select
        dr.role_name,
        coalesce(q.target_count, 0) as target_count,
        coalesce(q.warning_threshold, 0) as warning_threshold,
        coalesce(q.critical_threshold, 0) as critical_threshold,
        coalesce(primary_counts.count, 0) as current_primary_count,
        coalesce(secondary_counts.count, 0) as current_secondary_count,
        coalesce(unique_counts.count, 0) as unique_staff_count,
        coalesce(overlap_counts.count, 0) as overlap_count,
        q.id is not null as has_quota
      from distinct_roles dr
      left join public.staff_role_quotas q on q.role_name = dr.role_name
      left join lateral (
        select count(distinct staff_profile_id) as count
        from public.staff_assignments sa
        where public.normalize_staff_operational_role(sa.primary_role) = dr.role_name
      ) primary_counts on true
      left join lateral (
        select count(distinct staff_profile_id) as count
        from assignment_roles ar
        where public.normalize_staff_operational_role(ar.secondary_role) = dr.role_name
      ) secondary_counts on true
      left join lateral (
        select count(distinct sa.staff_profile_id) as count
        from public.staff_assignments sa
        where dr.role_name = any(public.staff_ops_roles(sa))
      ) unique_counts on true
      left join lateral (
        select count(*) as count
        from public.staff_assignments sa
        where dr.role_name = any(public.staff_ops_roles(sa))
          and cardinality(public.staff_ops_roles(sa)) > 1
      ) overlap_counts on true
      where dr.role_name is not null and dr.role_name <> ''
    )
    select jsonb_build_object(
      'rows', coalesce(jsonb_agg(jsonb_build_object(
        'role_name', role_name,
        'target_count', target_count,
        'current_primary_count', current_primary_count,
        'current_secondary_count', current_secondary_count,
        'unique_staff_count', unique_staff_count,
        'shortage_count', case when has_quota then greatest(target_count - unique_staff_count, 0) else 0 end,
        'overflow_count', case when has_quota then greatest(unique_staff_count - target_count, 0) else 0 end,
        'health_status', case
          when not has_quota then 'neutral'
          when unique_staff_count >= target_count then 'green'
          when target_count - unique_staff_count <= warning_threshold then 'yellow'
          when target_count - unique_staff_count >= critical_threshold then 'red'
          else 'red'
        end,
        'overlap_count', overlap_count,
        'missing_assignment_count', (select count(*) from public.staff_profiles sp where not exists (select 1 from public.staff_assignments sa where sa.staff_profile_id = sp.id)),
        'has_quota', has_quota
      ) order by has_quota desc, role_name), '[]'::jsonb),
      'total_staff', (select count(*) from public.staff_profiles),
      'unique_staff', (select count(distinct id) from public.staff_profiles),
      'active_assignments', (select count(*) from public.staff_assignments),
      'duplicate_record_count', (select coalesce(sum(duplicate_count - 1), 0) from duplicate_staff)
    )
    from role_rows
  );
end;
$$;

grant execute on function public.normalize_staff_system_role(text, text) to authenticated;
grant execute on function public.get_staff_quota_analytics() to authenticated;

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
        public.staff_ops_roles(sa) as roles
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
          case when 'พยาบาล' = any(sr.roles) and 'โสตทัศนูปกรณ์' = any(sr.roles) then 'พยาบาล + โสตทัศนูปกรณ์' end,
          case when 'พยาบาล' = any(sr.roles) and 'ไทม์เมอร์' = any(sr.roles) then 'พยาบาล + Timer' end,
          case when 'ไทม์เมอร์' = any(sr.roles) and 'พิธีกร' = any(sr.roles) then 'Timer + MC' end,
          case when 'วางแผน (ทีมบอ)' = any(sr.roles) and cardinality(sr.roles) > 2 then 'Planner has too many operational roles' end,
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

grant execute on function public.detect_staff_role_conflicts() to authenticated;
