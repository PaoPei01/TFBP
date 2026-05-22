create extension if not exists pgcrypto with schema extensions;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name_th text not null,
  name_en text,
  slug text unique not null,
  description text,
  event_type text,
  academic_year text,
  start_date date,
  end_date date,
  location text,
  status text not null default 'draft',
  visibility text not null default 'private',
  cover_image_path text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists events_slug_unique_idx on public.events (slug);
create index if not exists events_status_idx on public.events (status);
create index if not exists events_visibility_idx on public.events (visibility);
create index if not exists events_start_date_idx on public.events (start_date);

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
before update on public.events
for each row execute function public.touch_updated_at();

alter table public.events enable row level security;

drop policy if exists "public read public events" on public.events;
create policy "public read public events"
on public.events
for select
using (visibility = 'public');

drop policy if exists "admins read all events" on public.events;
create policy "admins read all events"
on public.events
for select
using (public.is_admin(auth.uid()));

drop policy if exists "admins insert events" on public.events;
create policy "admins insert events"
on public.events
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "admins update events" on public.events;
create policy "admins update events"
on public.events
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admins delete events" on public.events;
create policy "admins delete events"
on public.events
for delete
using (public.is_admin(auth.uid()));

insert into public.events (
  name_th,
  name_en,
  slug,
  event_type,
  academic_year,
  status,
  visibility
)
values (
  'สานสัมพันธ์ 69',
  'Entaneer Bonding 69',
  'entaneer-bonding-69',
  'activity',
  '2569',
  'active',
  'public'
)
on conflict (slug) do nothing;
