# Multi-Event Database Plan

This is a design plan, not an applied migration. Do not run a full data migration until the default event and people mapping have been tested on a copy of production data.

## Phase 1 Tables

### `public.people`

Stable person identity.

```sql
create table public.people (
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
```

Recommended indexes:

```sql
create unique index people_student_id_unique
  on public.people (student_id)
  where student_id is not null and btrim(student_id) <> '';

create index people_email_idx on public.people (lower(email));
create index people_phone_idx on public.people (regexp_replace(coalesce(phone, ''), '\D', '', 'g'));
```

### `public.events`

```sql
create table public.events (
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
```

Status values:

- `draft`
- `published`
- `registration_open`
- `staff_recruiting`
- `active`
- `completed`
- `archived`

Visibility values:

- `private`
- `unlisted`
- `public`

Default event seed:

```sql
insert into public.events (name_th, name_en, slug, event_type, academic_year, status, visibility)
values ('สานสัมพันธ์ 69', 'Entaneer Bonding 69', 'entaneer-bonding-69', 'activity', '2569', 'active', 'public')
on conflict (slug) do nothing;
```

### `public.event_participants`

```sql
create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  participant_type text,
  registration_status text not null default 'pending',
  main_group text,
  subgroup text,
  registered_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  unique(event_id, person_id)
);
```

Suggested statuses:

- `draft`
- `pending`
- `approved`
- `waitlisted`
- `rejected`
- `cancelled`

### `public.event_staff`

```sql
create table public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  staff_role text,
  team text,
  main_group text,
  subgroup text,
  status text not null default 'pending',
  application_id uuid,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(event_id, person_id)
);
```

Suggested statuses:

- `pending`
- `approved`
- `active`
- `inactive`
- `rejected`
- `withdrawn`

### `public.staff_applications`

```sql
create table public.staff_applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  preferred_role text,
  preferred_team text,
  availability jsonb not null default '{}'::jsonb,
  experience text,
  motivation text,
  status text not null default 'submitted',
  submitted_at timestamptz default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  answers jsonb not null default '{}'::jsonb
);
```

### `public.event_roles`

```sql
create table public.event_roles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(event_id, person_id, role)
);
```

Roles:

- `event_admin`
- `staff_manager`
- `group_leader`
- `staff`
- `emergency_staff`
- `document_manager`
- `viewer`

### `public.event_forms`

```sql
create table public.event_forms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  form_type text not null,
  title text not null,
  description text,
  opens_at timestamptz,
  closes_at timestamptz,
  is_open boolean not null default false,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
```

Form types:

- `participant_registration`
- `staff_application`
- `staff_profile_update`
- `health_info`
- `attendance_precheck`

### `public.event_form_responses`

```sql
create table public.event_form_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  form_id uuid not null references public.event_forms(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  response_json jsonb not null default '{}'::jsonb,
  status text not null default 'submitted',
  submitted_at timestamptz default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);
```

## Adding Event Scope to Existing Areas

### Announcements

Add:

```sql
alter table public.announcements add column if not exists event_id uuid references public.events(id);
```

Backfill to default event. Later, public announcement queries should filter:

- current event announcements
- optional platform-level announcements if `event_id is null`

### Attendance

Add:

```sql
alter table public.staff_attendance_sessions
  add column if not exists event_id uuid references public.events(id);
```

Records inherit event through session. Do not duplicate `event_id` on records unless reporting performance requires it.

### Documents

Add:

```sql
alter table public.document_project_profiles
  add column if not exists event_id uuid references public.events(id);

alter table public.generated_documents
  add column if not exists event_id uuid references public.events(id);

alter table public.document_templates
  add column if not exists event_id uuid references public.events(id);
```

`document_templates.event_id` can be nullable to support global templates.

### Edit Requests

Recommended split:

- person identity update request
- event participant update request
- event staff update request

Short-term compatibility:

```sql
alter table public.edit_requests
  add column if not exists event_id uuid references public.events(id),
  add column if not exists person_id uuid references public.people(id);
```

Do the same concept for `staff_edit_requests` later.

## RLS Plan

Helper functions:

```sql
public.is_platform_admin(uid uuid)
public.has_event_role(input_event_id uuid, input_roles text[])
public.current_person_id()
```

RLS rules:

- Public can read published/public events.
- Public can submit open public forms through RPC only.
- Participants can read their own event participation after verification/auth.
- Staff can read event data only if in `event_staff` or `event_roles`.
- Event admins can manage their event.
- Platform admins can manage all events.

## Backfill Strategy

1. Insert default event.
2. Create `people` from `profiles`, dedupe by `student_id`, then email/phone.
3. Create `event_participants` from `profiles` + `group_assignments`.
4. Create/match `people` from `staff_profiles`.
5. Create `event_staff` from `staff_profiles` + `staff_assignments`.
6. Backfill `event_id` on announcements, attendance sessions, project profiles, generated docs.
7. Run Data Health checks before making event fields non-null.

## Implementation Note: People Foundation

The first P2 implementation should stop at the identity foundation unless staging data has been deduplicated.

Implemented foundation:

- `public.people`
- admin-only direct RLS policies
- normalized email/phone indexes
- safe two-factor prefill verification RPC:
  - `verify_person_identity_for_prefill(input_email, input_phone)`

The RPC is designed for future registration/staff application prefill flows. It requires email + phone and returns only minimal non-medical identity fields. It does not expose phone, email, medical data, or internal notes in the returned JSON.

Deferred:

- bulk insert/backfill from `profiles`
- bulk insert/backfill from `staff_profiles`
- `person_id` columns on existing legacy tables
- event participant/staff relationship tables

## What Not To Do Yet

- Do not make `event_id` non-null in legacy tables immediately.
- Do not remove legacy `profiles` or `staff_profiles`.
- Do not replace public search in one step.
- Do not change attendance RPC signatures without fallback.
- Do not assume student_id is always present or unique in old imported data.

## First Safe Migration Later

When ready, first SQL migration should only:

- create `events`
- insert default event
- possibly create `people`
- add nullable `person_id`/`event_id` references
- no destructive updates
- no non-null constraints on existing data
