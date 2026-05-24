create or replace function public.preview_person_health_profiles_year2_backfill()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can preview year 2 health profile backfills';
  end if;

  with source_rows as (
    select
      s.id,
      s.source_order,
      public.clean_import_text(s.student_id_raw) as student_id,
      public.clean_import_text(s.medical_condition_raw) as medical_condition,
      public.clean_import_text(s.drug_allergy_raw) as drug_allergy,
      public.clean_import_text(s.food_allergy_raw) as food_allergy
    from public.people_import_year2_2569 s
  ),
  health_rows as (
    select *
    from source_rows
    where medical_condition is not null
      or drug_allergy is not null
      or food_allergy is not null
  ),
  matched_rows as (
    select
      h.*,
      p.id as person_id,
      p.name_th,
      p.name_en,
      hp.id as health_profile_id
    from health_rows h
    join public.people p
      on public.clean_placeholder_text(p.student_id) = h.student_id
     and p.merged_into is null
    left join public.person_health_profiles hp
      on hp.person_id = p.id
  ),
  matched_people_rows as (
    select distinct on (person_id)
      *
    from matched_rows
    order by person_id, source_order nulls last, id
  ),
  unmatched_rows_detail as (
    select h.*
    from health_rows h
    where not exists (
      select 1
      from public.people p
      where public.clean_placeholder_text(p.student_id) = h.student_id
        and p.merged_into is null
    )
  )
  select jsonb_build_object(
    'source_rows_with_health_data', (select count(*)::int from health_rows),
    'matched_people', (select count(*)::int from matched_people_rows),
    'already_existing_profiles', (select count(*)::int from matched_people_rows where health_profile_id is not null),
    'rows_that_would_insert', (select count(*)::int from matched_people_rows where health_profile_id is null),
    'rows_that_would_update', (select count(*)::int from matched_people_rows where health_profile_id is not null),
    'unmatched_rows', (select count(*)::int from unmatched_rows_detail),
    'sample_matched_rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source_order', source_order,
        'student_id', student_id,
        'person_id', person_id,
        'display_name', coalesce(name_th, name_en),
        'has_existing_profile', health_profile_id is not null
      ) order by source_order nulls last, student_id)
      from (
        select *
        from matched_people_rows
        order by source_order nulls last, student_id
        limit 10
      ) sample
    ), '[]'::jsonb),
    'sample_unmatched_rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source_order', source_order,
        'student_id', student_id
      ) order by source_order nulls last, student_id)
      from (
        select *
        from unmatched_rows_detail
        order by source_order nulls last, student_id
        limit 10
      ) sample
    ), '[]'::jsonb)
  )
  into summary;

  return summary;
end;
$$;

create or replace function public.backfill_person_health_profiles_from_year2_import()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can backfill year 2 health profiles';
  end if;

  with source_rows as (
    select
      s.id,
      s.source_order,
      public.clean_import_text(s.student_id_raw) as student_id,
      public.clean_import_text(s.medical_condition_raw) as medical_condition,
      public.clean_import_text(s.drug_allergy_raw) as drug_allergy,
      public.clean_import_text(s.food_allergy_raw) as food_allergy
    from public.people_import_year2_2569 s
  ),
  health_rows as (
    select *
    from source_rows
    where medical_condition is not null
      or drug_allergy is not null
      or food_allergy is not null
  ),
  matched_rows as (
    select
      h.*,
      p.id as person_id
    from health_rows h
    join public.people p
      on public.clean_placeholder_text(p.student_id) = h.student_id
     and p.merged_into is null
  ),
  matched_people_rows as (
    select distinct on (person_id)
      *
    from matched_rows
    order by person_id, source_order nulls last, id
  ),
  unmatched_rows_detail as (
    select h.*
    from health_rows h
    where not exists (
      select 1
      from public.people p
      where public.clean_placeholder_text(p.student_id) = h.student_id
        and p.merged_into is null
    )
  ),
  existing_profiles as (
    select m.*
    from matched_people_rows m
    join public.person_health_profiles hp
      on hp.person_id = m.person_id
  ),
  updated_profiles as (
    update public.person_health_profiles hp
    set medical_condition = e.medical_condition,
        chronic_condition = e.medical_condition,
        food_allergy = e.food_allergy,
        drug_allergy = e.drug_allergy,
        health_note = hp.health_note,
        source = 'people_import_year2_2569',
        updated_at = now()
    from existing_profiles e
    where hp.person_id = e.person_id
    returning hp.id
  ),
  missing_profiles as (
    select m.*
    from matched_people_rows m
    where not exists (
      select 1
      from public.person_health_profiles hp
      where hp.person_id = m.person_id
    )
  ),
  inserted_profiles as (
    insert into public.person_health_profiles (
      person_id,
      medical_condition,
      chronic_condition,
      food_allergy,
      drug_allergy,
      health_note,
      source,
      updated_at
    )
    select
      person_id,
      medical_condition,
      medical_condition,
      food_allergy,
      drug_allergy,
      null,
      'people_import_year2_2569',
      now()
    from missing_profiles
    returning id
  )
  select jsonb_build_object(
    'success', true,
    'source_rows_with_health_data', (select count(*)::int from health_rows),
    'matched_people', (select count(*)::int from matched_people_rows),
    'inserted_profiles', (select count(*)::int from inserted_profiles),
    'updated_profiles', (select count(*)::int from updated_profiles),
    'unmatched_rows', (select count(*)::int from unmatched_rows_detail)
  )
  into summary;

  return summary;
end;
$$;

revoke all on function public.preview_person_health_profiles_year2_backfill() from public;
grant execute on function public.preview_person_health_profiles_year2_backfill() to authenticated;

revoke all on function public.backfill_person_health_profiles_from_year2_import() from public;
grant execute on function public.backfill_person_health_profiles_from_year2_import() to authenticated;
