# Multi-Event Implementation Roadmap

## P0: Architecture and Documentation

Status: current phase.

Tasks:

- audit single-event assumptions
- document multi-event architecture
- document DB plan
- document UX plan
- document prefill/person identity plan
- add safe event types/constants/helpers

Risk: low.

## P1: Add Events Table and Default Event

Status: completed initial read-only pass on 2026-05-22.

Tasks:

- create `events`
- insert default event:
  - `สานสัมพันธ์ 69`
  - `Entaneer Bonding 69`
  - `entaneer-bonding-69`
- add event context utilities
- keep existing UI reading the same legacy data

Completed in initial pass:

- Added additive migration `202605220003_events_default_event.sql`.
- Added `public.events` with RLS policies for public event read and admin management.
- Seeded default event `entaneer-bonding-69`.
- Added event service helpers and read-only routes:
  - `/events`
  - `/events/:eventSlug`
  - `/admin/events`
- Kept `/`, `/edit`, `/staff/attendance`, `/admin/dashboard`, attendance, documents, and public search on legacy single-event data.

Do not:

- make `event_id` non-null on old tables yet
- change public search behavior yet

Risk: low to medium.

Deferred from P1:

- Event CRUD.
- Admin event detail management.
- Event switcher connected to real event context.
- `event_id` on legacy tables.
- Public search/event-specific registration.

## P2: Add People Table and Mapping

Tasks:

- create `people`
- map `profiles` to `people`
- map `staff_profiles` to `people`
- add nullable `person_id` references where safe
- add lookup RPC for known Engineering year 2 data

Compatibility:

- legacy tables continue powering existing app
- new event registration uses `people`

Risk: medium because deduplication must be careful.

## P3: Event-Scoped Registration and Staff Application

Routes:

- `/events/:eventSlug/register`
- `/events/:eventSlug/staff/apply`

Tasks:

- create `event_forms`
- create `event_form_responses`
- create `event_participants`
- create `staff_applications`
- add safe prefill flow

Risk: medium.

## P4: Admin Event Dashboard

Routes:

- `/admin/events`
- `/admin/events/:eventId`

Tasks:

- event CRUD
- event status controls
- registration open/close
- staff recruitment open/close
- staff application review
- event switcher

Risk: medium.

## P5: Event-Scoped Attendance

Tasks:

- add nullable `event_id` to `staff_attendance_sessions`
- backfill existing sessions to default event
- update attendance RPCs to filter by event
- keep legacy `/staff/attendance` default event fallback
- add event name to QR/result UI

Risk: high if done without fallback.

## P6: Event-Scoped Announcements and Documents

Tasks:

- add nullable `event_id` to announcements
- add nullable `event_id` to document project profiles/generated documents
- decide whether templates are global or event-scoped
- add event filters to services and admin pages

Risk: medium.

## P7: Full Legacy Route Migration

Tasks:

- redirect old routes to default/current event where appropriate
- make platform homepage the default if desired
- remove remaining global assumptions gradually
- update docs and QA

Risk: medium to high.

## Recommended Next Migration Prompt

Use this as the next Codex prompt when ready:

> Add the first safe multi-event database migration. Create public.events, insert the default event `entaneer-bonding-69`, add TypeScript service helpers to fetch/list events, and add an admin-only `/admin/events` read-only list page. Do not add event_id to legacy tables yet. Do not migrate profiles yet. Build must pass.

## Release Gate Before Real Multi-Event Use

- [ ] default event exists in production
- [ ] backup taken
- [ ] people dedupe tested on staging data
- [ ] public search verified not to leak cross-event data
- [ ] attendance QR verified with event scope
- [ ] admin event switcher clearly visible
- [ ] RLS event-role checks tested
- [ ] rollback plan documented
