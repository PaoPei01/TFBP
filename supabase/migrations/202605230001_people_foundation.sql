create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  student_id text,
  name_th text,
  name_en text,
  nickname text,
  email text,
  phone text,
  faculty text,
  department text,
  major text,
  year_level int,
  line_id text,
  instagram text,
  source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists people_student_id_unique
  on public.people (student_id)
  where student_id is not null and btrim(student_id) <> '';

create index if not exists people_email_idx on public.people (lower(email));
create index if not exists people_phone_idx on public.people (regexp_replace(coalesce(phone, ''), '\D', '', 'g'));
create index if not exists people_name_idx on public.people using gin (
  to_tsvector(
    'simple',
    coalesce(name_th, '') || ' ' ||
    coalesce(name_en, '') || ' ' ||
    coalesce(nickname, '') || ' ' ||
    coalesce(major, '') || ' ' ||
    coalesce(student_id, '')
  )
);

drop trigger if exists people_touch_updated_at on public.people;
create trigger people_touch_updated_at
before update on public.people
for each row execute function public.touch_updated_at();

alter table public.people enable row level security;

drop policy if exists "admins read people" on public.people;
create policy "admins read people"
on public.people
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admins insert people" on public.people;
create policy "admins insert people"
on public.people
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "admins update people" on public.people;
create policy "admins update people"
on public.people
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admins delete people" on public.people;
create policy "admins delete people"
on public.people
for delete
using (public.is_admin(auth.uid()));

create or replace function public.verify_person_identity_for_prefill(
  input_email text,
  input_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_person public.people;
begin
  select *
  into matched_person
  from public.people p
  where lower(coalesce(p.email, '')) = lower(btrim(coalesce(input_email, '')))
    and public.normalize_phone(p.phone) = public.normalize_phone(input_phone)
  limit 1;

  if matched_person.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'identity_verification_failed',
      'message', 'No matching person found'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'code', 'ok',
    'person', jsonb_build_object(
      'person_id', matched_person.id,
      'student_id', matched_person.student_id,
      'display_name', coalesce(matched_person.nickname, matched_person.name_th, matched_person.name_en, 'คนที่ยืนยันแล้ว'),
      'nickname', matched_person.nickname,
      'name_th', matched_person.name_th,
      'name_en', matched_person.name_en,
      'faculty', matched_person.faculty,
      'department', matched_person.department,
      'major', matched_person.major,
      'year_level', matched_person.year_level
    )
  );
end;
$$;
