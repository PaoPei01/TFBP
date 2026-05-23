alter table public.people
  add column if not exists nickname_en text,
  add column if not exists nickname_th text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.people_import_year2_2569 (
  id uuid primary key default gen_random_uuid(),
  source_order integer,
  email_raw text,
  student_id_raw text,
  name_en_raw text,
  name_th_raw text,
  nickname_en_raw text,
  nickname_th_raw text,
  phone_raw text,
  instagram_raw text,
  line_id_raw text,
  major_en_raw text,
  major_th_raw text,
  curriculum_type_en_raw text,
  curriculum_type_th_raw text,
  program_type_raw text,
  medical_condition_raw text,
  drug_allergy_raw text,
  food_allergy_raw text,
  import_status text default 'pending',
  import_note text,
  created_at timestamptz default now()
);

alter table public.people_import_year2_2569 enable row level security;

drop policy if exists "admins read year2 people import staging" on public.people_import_year2_2569;
create policy "admins read year2 people import staging"
on public.people_import_year2_2569
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admins insert year2 people import staging" on public.people_import_year2_2569;
create policy "admins insert year2 people import staging"
on public.people_import_year2_2569
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "admins update year2 people import staging" on public.people_import_year2_2569;
create policy "admins update year2 people import staging"
on public.people_import_year2_2569
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admins delete year2 people import staging" on public.people_import_year2_2569;
create policy "admins delete year2 people import staging"
on public.people_import_year2_2569
for delete
using (public.is_admin(auth.uid()));

grant select, insert, update, delete on public.people_import_year2_2569 to authenticated;

create or replace function public.clean_import_text(input text)
returns text
language plpgsql
immutable
as $$
declare
  cleaned text;
begin
  if input is null then
    return null;
  end if;

  cleaned := input;
  cleaned := replace(cleaned, chr(160), ' ');
  cleaned := replace(cleaned, chr(8203), '');
  cleaned := replace(cleaned, chr(8204), '');
  cleaned := replace(cleaned, chr(8205), '');
  cleaned := replace(cleaned, chr(65279), '');
  cleaned := btrim(cleaned);

  return nullif(cleaned, '');
end;
$$;

create or replace function public.normalize_import_email(input text)
returns text
language sql
immutable
as $$
  select lower(public.clean_import_text(input));
$$;

create or replace function public.normalize_import_phone(input text)
returns text
language plpgsql
immutable
as $$
declare
  digits text := regexp_replace(coalesce(public.clean_import_text(input), ''), '\D', '', 'g');
begin
  if digits = '' then
    return null;
  end if;

  if length(digits) = 9 then
    return '0' || digits;
  end if;

  if length(digits) = 10 then
    return digits;
  end if;

  return digits;
end;
$$;

create or replace function public.preview_year2_people_import()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can preview year 2 people imports';
  end if;

  with normalized as (
    select
      id,
      source_order,
      public.clean_import_text(student_id_raw) as student_id,
      public.normalize_import_email(email_raw) as email,
      public.normalize_import_phone(phone_raw) as phone,
      public.clean_import_text(medical_condition_raw) as medical_condition,
      public.clean_import_text(drug_allergy_raw) as drug_allergy,
      public.clean_import_text(food_allergy_raw) as food_allergy
    from public.people_import_year2_2569
  ),
  duplicate_student_ids as (
    select student_id, count(*) as duplicate_count
    from normalized
    where student_id is not null
    group by student_id
    having count(*) > 1
  ),
  counts as (
    select
      count(*)::int as total_rows,
      count(*) filter (where student_id is not null)::int as valid_student_id_count,
      count(*) filter (where email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$')::int as valid_email_count,
      count(*) filter (where length(phone) = 10)::int as valid_phone_count,
      coalesce((select sum(duplicate_count)::int from duplicate_student_ids), 0) as duplicate_student_id_count,
      count(*) filter (where medical_condition is not null or drug_allergy is not null or food_allergy is not null)::int as rows_with_health_data,
      count(*) filter (
        where (student_id is not null or email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$')
          and (phone is null or length(phone) = 10)
          and (student_id is null or student_id not in (select student_id from duplicate_student_ids))
      )::int as rows_ready_to_import,
      count(*) filter (where student_id is null)::int as rows_missing_student_id,
      count(*) filter (where email is null)::int as rows_missing_email,
      count(*) filter (where phone is null)::int as rows_missing_phone
    from normalized
  )
  select jsonb_build_object(
    'total_rows', total_rows,
    'valid_student_id_count', valid_student_id_count,
    'valid_email_count', valid_email_count,
    'valid_phone_count', valid_phone_count,
    'duplicate_student_id_count', duplicate_student_id_count,
    'rows_with_health_data', rows_with_health_data,
    'rows_ready_to_import', rows_ready_to_import,
    'rows_missing_student_id', rows_missing_student_id,
    'rows_missing_email', rows_missing_email,
    'rows_missing_phone', rows_missing_phone,
    'warnings', jsonb_build_object(
      'duplicate_student_ids', coalesce((select jsonb_agg(jsonb_build_object('student_id', student_id, 'count', duplicate_count) order by student_id) from (select * from duplicate_student_ids limit 10) d), '[]'::jsonb),
      'invalid_phone_examples', coalesce((select jsonb_agg(jsonb_build_object('source_order', source_order, 'phone', phone) order by source_order) from (select source_order, phone from normalized where phone is not null and length(phone) <> 10 limit 10) p), '[]'::jsonb),
      'invalid_email_examples', coalesce((select jsonb_agg(jsonb_build_object('source_order', source_order, 'email', email) order by source_order) from (select source_order, email from normalized where email is not null and email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' limit 10) e), '[]'::jsonb)
    )
  )
  into summary
  from counts;

  return summary;
end;
$$;

create or replace function public.import_year2_people_from_staging()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  staging_row public.people_import_year2_2569%rowtype;
  normalized_student_id text;
  normalized_email text;
  normalized_phone text;
  normalized_name_th text;
  normalized_name_en text;
  normalized_nickname_th text;
  normalized_nickname_en text;
  normalized_major_th text;
  normalized_line_id text;
  normalized_instagram text;
  target_person_id uuid;
  duplicate_student_ids text[];
  row_has_health_data boolean;
  row_metadata jsonb;
  inserted_count integer := 0;
  updated_count integer := 0;
  skipped_count integer := 0;
  health_data_not_imported_count integer := 0;
  errors_count integer := 0;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can import year 2 people data';
  end if;

  select coalesce(array_agg(student_id), '{}')
  into duplicate_student_ids
  from (
    select public.clean_import_text(student_id_raw) as student_id
    from public.people_import_year2_2569
    where public.clean_import_text(student_id_raw) is not null
    group by public.clean_import_text(student_id_raw)
    having count(*) > 1
  ) duplicates;

  for staging_row in
    select *
    from public.people_import_year2_2569
    where coalesce(import_status, 'pending') <> 'imported'
    order by source_order nulls last, created_at, id
  loop
    begin
      normalized_student_id := public.clean_import_text(staging_row.student_id_raw);
      normalized_email := public.normalize_import_email(staging_row.email_raw);
      normalized_phone := public.normalize_import_phone(staging_row.phone_raw);
      normalized_name_th := public.clean_import_text(staging_row.name_th_raw);
      normalized_name_en := public.clean_import_text(staging_row.name_en_raw);
      normalized_nickname_th := public.clean_import_text(staging_row.nickname_th_raw);
      normalized_nickname_en := public.clean_import_text(staging_row.nickname_en_raw);
      normalized_major_th := public.clean_import_text(staging_row.major_th_raw);
      normalized_line_id := public.clean_import_text(staging_row.line_id_raw);
      normalized_instagram := public.clean_import_text(staging_row.instagram_raw);
      row_has_health_data := public.clean_import_text(staging_row.medical_condition_raw) is not null
        or public.clean_import_text(staging_row.drug_allergy_raw) is not null
        or public.clean_import_text(staging_row.food_allergy_raw) is not null;

      if normalized_student_id is null and normalized_email is null then
        skipped_count := skipped_count + 1;
        update public.people_import_year2_2569
        set import_status = 'skipped',
            import_note = 'Skipped because both student_id and email are missing'
        where id = staging_row.id;
        continue;
      end if;

      if normalized_student_id is not null and normalized_student_id = any(duplicate_student_ids) then
        skipped_count := skipped_count + 1;
        update public.people_import_year2_2569
        set import_status = 'skipped',
            import_note = 'Skipped because student_id is duplicated in staging'
        where id = staging_row.id;
        continue;
      end if;

      if normalized_email is not null and normalized_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
        skipped_count := skipped_count + 1;
        update public.people_import_year2_2569
        set import_status = 'skipped',
            import_note = 'Skipped because email format is invalid'
        where id = staging_row.id;
        continue;
      end if;

      if normalized_phone is not null and length(normalized_phone) <> 10 then
        skipped_count := skipped_count + 1;
        update public.people_import_year2_2569
        set import_status = 'skipped',
            import_note = 'Skipped because phone cannot be normalized to 10 digits'
        where id = staging_row.id;
        continue;
      end if;

      row_metadata := jsonb_strip_nulls(jsonb_build_object(
        'source_order', staging_row.source_order,
        'major_en', public.clean_import_text(staging_row.major_en_raw),
        'curriculum_type_en', public.clean_import_text(staging_row.curriculum_type_en_raw),
        'curriculum_type_th', public.clean_import_text(staging_row.curriculum_type_th_raw),
        'program_type', public.clean_import_text(staging_row.program_type_raw)
      ));

      target_person_id := null;
      if normalized_student_id is not null then
        select id into target_person_id
        from public.people
        where student_id = normalized_student_id
        limit 1;
      end if;

      if target_person_id is null and normalized_email is not null then
        select id into target_person_id
        from public.people
        where lower(email) = normalized_email
        order by updated_at desc nulls last, created_at desc nulls last
        limit 1;
      end if;

      if target_person_id is null then
        insert into public.people (
          student_id,
          name_th,
          name_en,
          nickname,
          nickname_th,
          nickname_en,
          email,
          phone,
          faculty,
          major,
          year_level,
          line_id,
          instagram,
          source,
          metadata
        )
        values (
          normalized_student_id,
          normalized_name_th,
          normalized_name_en,
          normalized_nickname_th,
          normalized_nickname_th,
          normalized_nickname_en,
          normalized_email,
          normalized_phone,
          'คณะวิศวกรรมศาสตร์',
          normalized_major_th,
          2,
          normalized_line_id,
          normalized_instagram,
          'eng_year2_2569_excel',
          row_metadata
        );
        inserted_count := inserted_count + 1;
      else
        update public.people
        set student_id = coalesce(normalized_student_id, student_id),
            name_th = coalesce(normalized_name_th, name_th),
            name_en = coalesce(normalized_name_en, name_en),
            nickname = coalesce(normalized_nickname_th, nickname),
            nickname_th = coalesce(normalized_nickname_th, nickname_th),
            nickname_en = coalesce(normalized_nickname_en, nickname_en),
            email = coalesce(normalized_email, email),
            phone = coalesce(normalized_phone, phone),
            faculty = 'คณะวิศวกรรมศาสตร์',
            major = coalesce(normalized_major_th, major),
            year_level = 2,
            line_id = coalesce(normalized_line_id, line_id),
            instagram = coalesce(normalized_instagram, instagram),
            source = 'eng_year2_2569_excel',
            metadata = coalesce(metadata, '{}'::jsonb) || row_metadata
        where id = target_person_id;
        updated_count := updated_count + 1;
      end if;

      if row_has_health_data then
        health_data_not_imported_count := health_data_not_imported_count + 1;
      end if;

      update public.people_import_year2_2569
      set import_status = 'imported',
          import_note = case
            when row_has_health_data then 'Imported identity/contact fields. Health data intentionally not imported to people.'
            else 'Imported identity/contact fields.'
          end
      where id = staging_row.id;
    exception when others then
      errors_count := errors_count + 1;
      update public.people_import_year2_2569
      set import_status = 'error',
          import_note = left(sqlerrm, 500)
      where id = staging_row.id;
    end;
  end loop;

  insert into public.change_logs (profile_id, changed_by, action, old_data, new_data)
  values (
    null,
    auth.uid(),
    'import_year2_people_from_staging',
    null,
    jsonb_build_object(
      'inserted_count', inserted_count,
      'updated_count', updated_count,
      'skipped_count', skipped_count,
      'health_data_not_imported_count', health_data_not_imported_count,
      'errors_count', errors_count
    )
  );

  return jsonb_build_object(
    'inserted_count', inserted_count,
    'updated_count', updated_count,
    'skipped_count', skipped_count,
    'health_data_not_imported_count', health_data_not_imported_count,
    'errors_count', errors_count
  );
end;
$$;

grant execute on function public.clean_import_text(text) to anon, authenticated;
grant execute on function public.normalize_import_email(text) to anon, authenticated;
grant execute on function public.normalize_import_phone(text) to anon, authenticated;
grant execute on function public.preview_year2_people_import() to authenticated;
grant execute on function public.import_year2_people_from_staging() to authenticated;
