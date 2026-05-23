alter table public.people
  add column if not exists merged_into uuid references public.people(id) on delete set null,
  add column if not exists merged_at timestamptz,
  add column if not exists merged_by uuid references auth.users(id),
  add column if not exists merge_note text;

create index if not exists people_merged_into_idx on public.people (merged_into);

create or replace function public.people_link_counts(input_person_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  event_participant_count integer := 0;
  event_staff_count integer := 0;
  event_role_count integer := 0;
begin
  if to_regclass('public.event_participants') is not null then
    execute 'select count(*)::int from public.event_participants where person_id = $1'
    into event_participant_count
    using input_person_id;
  end if;

  if to_regclass('public.event_staff') is not null and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'event_staff' and column_name = 'person_id'
  ) then
    execute 'select count(*)::int from public.event_staff where person_id = $1'
    into event_staff_count
    using input_person_id;
  end if;

  if to_regclass('public.event_roles') is not null and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'event_roles' and column_name = 'person_id'
  ) then
    execute 'select count(*)::int from public.event_roles where person_id = $1'
    into event_role_count
    using input_person_id;
  end if;

  return jsonb_build_object(
    'staff_profiles', (select count(*)::int from public.staff_profiles where person_id = input_person_id),
    'profiles', (select count(*)::int from public.profiles where person_id = input_person_id),
    'staff_applications', (select count(*)::int from public.staff_applications where person_id = input_person_id),
    'event_participants', event_participant_count,
    'event_staff', event_staff_count,
    'event_roles', event_role_count
  );
end;
$$;

create or replace function public.people_duplicate_record(input_person_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'student_id', p.student_id,
    'name_th', p.name_th,
    'name_en', p.name_en,
    'nickname', p.nickname,
    'nickname_th', p.nickname_th,
    'nickname_en', p.nickname_en,
    'email', p.email,
    'phone', p.phone,
    'major', p.major,
    'year_level', p.year_level,
    'source', p.source,
    'created_at', p.created_at,
    'linked_counts', public.people_link_counts(p.id)
  )
  from public.people p
  where p.id = input_person_id;
$$;

create or replace function public.find_people_duplicates()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  duplicate_student_ids jsonb;
  duplicate_emails jsonb;
  duplicate_phones jsonb;
  duplicate_names jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  with active_people as (
    select *
    from public.people
    where merged_into is null
  ),
  grouped as (
    select
      public.clean_placeholder_text(student_id) as match_value,
      array_agg(id order by updated_at desc nulls last, created_at desc nulls last) as person_ids
    from active_people
    where public.clean_placeholder_text(student_id) is not null
    group by public.clean_placeholder_text(student_id)
    having count(*) > 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'group_type', 'student_id',
    'match_value', match_value,
    'people', (select jsonb_agg(public.people_duplicate_record(person_id)) from unnest(person_ids) person_id)
  ) order by match_value), '[]'::jsonb)
  into duplicate_student_ids
  from grouped;

  with active_people as (
    select *
    from public.people
    where merged_into is null
  ),
  grouped as (
    select
      lower(public.clean_placeholder_text(email)) as match_value,
      array_agg(id order by updated_at desc nulls last, created_at desc nulls last) as person_ids
    from active_people
    where public.clean_placeholder_text(email) is not null
    group by lower(public.clean_placeholder_text(email))
    having count(*) > 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'group_type', 'email',
    'match_value', match_value,
    'people', (select jsonb_agg(public.people_duplicate_record(person_id)) from unnest(person_ids) person_id)
  ) order by match_value), '[]'::jsonb)
  into duplicate_emails
  from grouped;

  with active_people as (
    select *
    from public.people
    where merged_into is null
  ),
  grouped as (
    select
      public.normalize_import_phone(phone) as match_value,
      array_agg(id order by updated_at desc nulls last, created_at desc nulls last) as person_ids
    from active_people
    where public.normalize_import_phone(phone) is not null
    group by public.normalize_import_phone(phone)
    having count(*) > 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'group_type', 'phone',
    'match_value', match_value,
    'people', (select jsonb_agg(public.people_duplicate_record(person_id)) from unnest(person_ids) person_id)
  ) order by match_value), '[]'::jsonb)
  into duplicate_phones
  from grouped;

  with active_people as (
    select
      *,
      lower(regexp_replace(coalesce(public.clean_placeholder_text(name_th), public.clean_placeholder_text(name_en), ''), '\s+', '', 'g')) as normalized_name
    from public.people
    where merged_into is null
  ),
  grouped as (
    select
      normalized_name as match_value,
      array_agg(id order by updated_at desc nulls last, created_at desc nulls last) as person_ids
    from active_people
    where length(normalized_name) >= 6
    group by normalized_name
    having count(*) > 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'group_type', 'name',
    'match_value', match_value,
    'people', (select jsonb_agg(public.people_duplicate_record(person_id)) from unnest(person_ids) person_id)
  ) order by match_value), '[]'::jsonb)
  into duplicate_names
  from grouped;

  return jsonb_build_object(
    'duplicate_student_ids', duplicate_student_ids,
    'duplicate_emails', duplicate_emails,
    'duplicate_phones', duplicate_phones,
    'duplicate_names', duplicate_names,
    'summary', jsonb_build_object(
      'duplicate_student_id_groups', jsonb_array_length(duplicate_student_ids),
      'duplicate_email_groups', jsonb_array_length(duplicate_emails),
      'duplicate_phone_groups', jsonb_array_length(duplicate_phones),
      'similar_name_groups', jsonb_array_length(duplicate_names),
      'merged_records', (select count(*)::int from public.people where merged_into is not null)
    )
  );
end;
$$;

create or replace function public.merge_people_records(
  input_keep_person_id uuid,
  input_merge_person_id uuid,
  input_merge_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  keep_person public.people%rowtype;
  merge_person public.people%rowtype;
  staff_profiles_count integer := 0;
  profiles_count integer := 0;
  staff_applications_count integer := 0;
  event_participants_count integer := 0;
  event_form_responses_count integer := 0;
  event_staff_count integer := 0;
  event_roles_count integer := 0;
  unsafe_metadata_keys text[] := array['medical_condition', 'drug_allergy', 'food_allergy', 'disease', 'health', 'medical', 'allergy'];
  safe_merge_metadata jsonb;
  i integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  if input_keep_person_id is null or input_merge_person_id is null then
    raise exception 'Both keep_person_id and merge_person_id are required';
  end if;

  if input_keep_person_id = input_merge_person_id then
    raise exception 'Cannot merge a person into itself';
  end if;

  select * into keep_person
  from public.people
  where id = input_keep_person_id
  for update;

  select * into merge_person
  from public.people
  where id = input_merge_person_id
  for update;

  if keep_person.id is null or merge_person.id is null then
    raise exception 'Person record not found';
  end if;

  if keep_person.merged_into is not null or merge_person.merged_into is not null then
    raise exception 'Cannot merge records that are already archived as merged';
  end if;

  if to_regclass('public.event_participants') is not null and exists (
    select 1
    from public.event_participants keep_ep
    join public.event_participants merge_ep on merge_ep.event_id = keep_ep.event_id
    where keep_ep.person_id = input_keep_person_id
      and merge_ep.person_id = input_merge_person_id
  ) then
    raise exception 'Cannot merge because both people already have participant rows in the same event';
  end if;

  safe_merge_metadata := coalesce(merge_person.metadata, '{}'::jsonb);
  for i in array_lower(unsafe_metadata_keys, 1)..array_upper(unsafe_metadata_keys, 1) loop
    safe_merge_metadata := safe_merge_metadata - unsafe_metadata_keys[i];
  end loop;

  if public.clean_placeholder_text(keep_person.student_id) is null
    and public.clean_placeholder_text(merge_person.student_id) is not null then
    update public.people
    set student_id = null,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('archived_student_id', merge_person.student_id)
    where id = input_merge_person_id;
  end if;

  update public.staff_profiles
  set person_id = input_keep_person_id
  where person_id = input_merge_person_id;
  get diagnostics staff_profiles_count = row_count;

  update public.profiles
  set person_id = input_keep_person_id
  where person_id = input_merge_person_id;
  get diagnostics profiles_count = row_count;

  update public.staff_applications
  set person_id = input_keep_person_id
  where person_id = input_merge_person_id;
  get diagnostics staff_applications_count = row_count;

  if to_regclass('public.event_participants') is not null then
    execute 'update public.event_participants set person_id = $1 where person_id = $2'
    using input_keep_person_id, input_merge_person_id;
    get diagnostics event_participants_count = row_count;
  end if;

  if to_regclass('public.event_form_responses') is not null then
    execute 'update public.event_form_responses set person_id = $1 where person_id = $2'
    using input_keep_person_id, input_merge_person_id;
    get diagnostics event_form_responses_count = row_count;
  end if;

  if to_regclass('public.event_staff') is not null and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'event_staff' and column_name = 'person_id'
  ) then
    execute 'update public.event_staff set person_id = $1 where person_id = $2'
    using input_keep_person_id, input_merge_person_id;
    get diagnostics event_staff_count = row_count;
  end if;

  if to_regclass('public.event_roles') is not null and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'event_roles' and column_name = 'person_id'
  ) then
    execute 'update public.event_roles set person_id = $1 where person_id = $2'
    using input_keep_person_id, input_merge_person_id;
    get diagnostics event_roles_count = row_count;
  end if;

  update public.people
  set
    student_id = coalesce(public.clean_placeholder_text(people.student_id), public.clean_placeholder_text(merge_person.student_id)),
    name_th = coalesce(public.clean_placeholder_text(people.name_th), public.clean_placeholder_text(merge_person.name_th)),
    name_en = coalesce(public.clean_placeholder_text(people.name_en), public.clean_placeholder_text(merge_person.name_en)),
    nickname = coalesce(public.clean_placeholder_text(people.nickname), public.clean_placeholder_text(merge_person.nickname)),
    nickname_th = coalesce(public.clean_placeholder_text(people.nickname_th), public.clean_placeholder_text(merge_person.nickname_th)),
    nickname_en = coalesce(public.clean_placeholder_text(people.nickname_en), public.clean_placeholder_text(merge_person.nickname_en)),
    email = coalesce(public.clean_placeholder_text(people.email), public.clean_placeholder_text(merge_person.email)),
    phone = coalesce(public.clean_placeholder_text(people.phone), public.clean_placeholder_text(merge_person.phone)),
    faculty = coalesce(public.clean_placeholder_text(people.faculty), public.clean_placeholder_text(merge_person.faculty)),
    department = coalesce(public.clean_placeholder_text(people.department), public.clean_placeholder_text(merge_person.department)),
    major = coalesce(public.clean_placeholder_text(people.major), public.clean_placeholder_text(merge_person.major)),
    year_level = coalesce(people.year_level, merge_person.year_level),
    line_id = coalesce(public.clean_placeholder_text(people.line_id), public.clean_placeholder_text(merge_person.line_id)),
    instagram = coalesce(public.clean_placeholder_text(people.instagram), public.clean_placeholder_text(merge_person.instagram)),
    metadata = coalesce(people.metadata, '{}'::jsonb) || safe_merge_metadata,
    updated_at = now()
  where id = input_keep_person_id;

  update public.people
  set
    merged_into = input_keep_person_id,
    merged_at = now(),
    merged_by = auth.uid(),
    merge_note = public.clean_import_text(input_merge_note),
    updated_at = now()
  where id = input_merge_person_id;

  insert into public.change_logs (changed_by, action, old_data, new_data)
  values (
    auth.uid(),
    'people_merge',
    jsonb_build_object(
      'keep_person', public.people_duplicate_record(input_keep_person_id),
      'merge_person', public.people_duplicate_record(input_merge_person_id)
    ),
    jsonb_build_object(
      'keep_person_id', input_keep_person_id,
      'merged_person_id', input_merge_person_id,
      'merge_note', public.clean_import_text(input_merge_note),
      'repointed', jsonb_build_object(
        'staff_profiles', staff_profiles_count,
        'profiles', profiles_count,
        'staff_applications', staff_applications_count,
        'event_participants', event_participants_count,
        'event_form_responses', event_form_responses_count,
        'event_staff', event_staff_count,
        'event_roles', event_roles_count
      )
    )
  );

  return jsonb_build_object(
    'success', true,
    'keep_person_id', input_keep_person_id,
    'merged_person_id', input_merge_person_id,
    'repointed', jsonb_build_object(
      'staff_profiles', staff_profiles_count,
      'profiles', profiles_count,
      'staff_applications', staff_applications_count,
      'event_participants', event_participants_count,
      'event_form_responses', event_form_responses_count,
      'event_staff', event_staff_count,
      'event_roles', event_roles_count
    )
  );
end;
$$;

create or replace function public.get_people_admin_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  with people_counts as (
    select
      count(*) filter (where merged_into is null)::int as total_people,
      count(*) filter (where merged_into is not null)::int as merged_records,
      count(*) filter (where merged_into is null and (source = 'eng_year2_2569_excel' or (year_level = 2 and faculty = 'คณะวิศวกรรมศาสตร์')))::int as year2_people,
      count(*) filter (where merged_into is null and source = 'legacy_profiles')::int as legacy_profiles_people,
      count(*) filter (where merged_into is null and source = 'legacy_staff_profiles')::int as legacy_staff_people,
      count(*) filter (where merged_into is null and public.clean_placeholder_text(student_id) is null)::int as missing_student_id,
      count(*) filter (where merged_into is null and public.clean_placeholder_text(email) is null)::int as missing_email,
      count(*) filter (where merged_into is null and public.clean_placeholder_text(phone) is null)::int as missing_phone
    from public.people
  ),
  link_counts as (
    select
      (select count(distinct person_id)::int from public.staff_profiles where person_id is not null) as linked_staff_profiles,
      (select count(distinct person_id)::int from public.profiles where person_id is not null) as linked_participant_profiles,
      (select count(distinct person_id)::int from public.staff_applications where person_id is not null) as staff_applicant_people,
      (select count(*)::int from public.staff_profiles where person_id is null) as staff_profiles_without_person_id,
      (select count(*)::int from public.profiles where person_id is null) as profiles_without_person_id,
      (select count(*)::int from public.staff_applications where person_id is null) as staff_applications_without_person_id
  ),
  duplicate_counts as (
    select
      (select count(*)::int from (
        select public.clean_placeholder_text(student_id)
        from public.people
        where merged_into is null and public.clean_placeholder_text(student_id) is not null
        group by public.clean_placeholder_text(student_id)
        having count(*) > 1
      ) d) as duplicate_student_id_count,
      (select count(*)::int from (
        select lower(public.clean_placeholder_text(email))
        from public.people
        where merged_into is null and public.clean_placeholder_text(email) is not null
        group by lower(public.clean_placeholder_text(email))
        having count(*) > 1
      ) d) as duplicate_email_count,
      (select count(*)::int from (
        select public.normalize_import_phone(phone)
        from public.people
        where merged_into is null and public.normalize_import_phone(phone) is not null
        group by public.normalize_import_phone(phone)
        having count(*) > 1
      ) d) as duplicate_phone_count
  ),
  staging_counts as (
    select
      case
        when to_regclass('public.people_import_year2_2569') is null then 0
        else (select count(*)::int from public.people_import_year2_2569 where import_status = 'skipped')
      end as year2_import_skipped_count
  )
  select to_jsonb(people_counts.*)
    || to_jsonb(link_counts.*)
    || to_jsonb(duplicate_counts.*)
    || to_jsonb(staging_counts.*)
  into summary
  from people_counts, link_counts, duplicate_counts, staging_counts;

  return summary;
end;
$$;

create or replace function public.search_admin_people(input jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  search_text text := nullif(btrim(coalesce(input->>'search', '')), '');
  search_digits text := nullif(regexp_replace(coalesce(input->>'search', ''), '\D', '', 'g'), '');
  source_filter text := nullif(btrim(coalesce(input->>'source', '')), '');
  year_filter int := nullif(input->>'year_level', '')::int;
  major_filter text := nullif(btrim(coalesce(input->>'major', '')), '');
  missing_field_filter text := nullif(btrim(coalesce(input->>'missing_field', '')), '');
  has_staff_profile_filter boolean := nullif(input->>'has_staff_profile', '')::boolean;
  has_participant_profile_filter boolean := nullif(input->>'has_participant_profile', '')::boolean;
  has_staff_application_filter boolean := nullif(input->>'has_staff_application', '')::boolean;
  include_merged boolean := coalesce(nullif(input->>'include_merged', '')::boolean, false);
  page_limit int := least(greatest(coalesce(nullif(input->>'limit', '')::int, 100), 1), 500);
  page_offset int := greatest(coalesce(nullif(input->>'offset', '')::int, 0), 0);
  result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin access required';
  end if;

  with linked as (
    select
      p.id,
      p.student_id,
      p.name_th,
      p.name_en,
      p.nickname,
      p.nickname_th,
      p.nickname_en,
      p.email,
      p.phone,
      p.faculty,
      p.department,
      p.major,
      p.year_level,
      p.source,
      p.created_at,
      p.updated_at,
      p.merged_into,
      p.merged_at,
      coalesce(sp.staff_profile_count, 0)::int as staff_profile_count,
      coalesce(lp.participant_profile_count, 0)::int as participant_profile_count,
      coalesce(sa.staff_application_count, 0)::int as staff_application_count
    from public.people p
    left join (
      select person_id, count(*) as staff_profile_count
      from public.staff_profiles
      where person_id is not null
      group by person_id
    ) sp on sp.person_id = p.id
    left join (
      select person_id, count(*) as participant_profile_count
      from public.profiles
      where person_id is not null
      group by person_id
    ) lp on lp.person_id = p.id
    left join (
      select person_id, count(*) as staff_application_count
      from public.staff_applications
      where person_id is not null
      group by person_id
    ) sa on sa.person_id = p.id
  ),
  filtered as (
    select *
    from linked
    where (include_merged or merged_into is null)
      and (
        search_text is null
        or lower(coalesce(name_th, '')) like '%' || lower(search_text) || '%'
        or lower(coalesce(name_en, '')) like '%' || lower(search_text) || '%'
        or lower(coalesce(nickname, '')) like '%' || lower(search_text) || '%'
        or lower(coalesce(nickname_th, '')) like '%' || lower(search_text) || '%'
        or lower(coalesce(nickname_en, '')) like '%' || lower(search_text) || '%'
        or lower(coalesce(student_id, '')) like '%' || lower(search_text) || '%'
        or lower(coalesce(email, '')) like '%' || lower(search_text) || '%'
        or (search_digits is not null and regexp_replace(coalesce(phone, ''), '\D', '', 'g') like '%' || search_digits || '%')
      )
      and (source_filter is null or source = source_filter)
      and (year_filter is null or year_level = year_filter)
      and (major_filter is null or major = major_filter)
      and (
        missing_field_filter is null
        or (missing_field_filter = 'student_id' and public.clean_placeholder_text(student_id) is null)
        or (missing_field_filter = 'email' and public.clean_placeholder_text(email) is null)
        or (missing_field_filter = 'phone' and public.clean_placeholder_text(phone) is null)
      )
      and (has_staff_profile_filter is null or (staff_profile_count > 0) = has_staff_profile_filter)
      and (has_participant_profile_filter is null or (participant_profile_count > 0) = has_participant_profile_filter)
      and (has_staff_application_filter is null or (staff_application_count > 0) = has_staff_application_filter)
  ),
  page_rows as (
    select *
    from filtered
    order by updated_at desc nulls last, created_at desc nulls last, name_th nulls last
    limit page_limit offset page_offset
  ),
  filter_options as (
    select jsonb_build_object(
      'sources', coalesce((select jsonb_agg(source order by source) from (select distinct source from public.people where source is not null and btrim(source) <> '') s), '[]'::jsonb),
      'year_levels', coalesce((select jsonb_agg(year_level order by year_level) from (select distinct year_level from public.people where year_level is not null and (include_merged or merged_into is null)) y), '[]'::jsonb),
      'majors', coalesce((select jsonb_agg(major order by major) from (select distinct major from public.people where major is not null and btrim(major) <> '' and (include_merged or merged_into is null)) m), '[]'::jsonb)
    ) as options
  )
  select jsonb_build_object(
    'total_count', (select count(*)::int from filtered),
    'limit', page_limit,
    'offset', page_offset,
    'rows', coalesce((select jsonb_agg(to_jsonb(page_rows.*)) from page_rows), '[]'::jsonb),
    'filter_options', (select options from filter_options)
  )
  into result;

  return result;
end;
$$;

grant execute on function public.people_link_counts(uuid) to authenticated;
grant execute on function public.people_duplicate_record(uuid) to authenticated;
grant execute on function public.find_people_duplicates() to authenticated;
grant execute on function public.merge_people_records(uuid, uuid, text) to authenticated;
grant execute on function public.get_people_admin_summary() to authenticated;
grant execute on function public.search_admin_people(jsonb) to authenticated;
