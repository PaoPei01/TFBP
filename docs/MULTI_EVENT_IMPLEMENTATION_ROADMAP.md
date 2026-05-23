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

Status: foundation started on 2026-05-23.

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

Completed in foundation pass:

- Added additive migration `202605230001_people_foundation.sql`.
- Created `public.people` with identity/contact fields and non-destructive indexes.
- Enabled RLS so only admins can directly read/manage `people`.
- Added `verify_person_identity_for_prefill(input_email, input_phone)` RPC for future prefill flows.
- Added TypeScript person types and service helpers:
  - `fetchAdminPeople()`
  - `verifyPersonIdentityForPrefill(email, phone)`
- Added additive migration `202605230002_people_legacy_link_tools.sql`.
- Added nullable `person_id` references on `profiles` and `staff_profiles`.
- Added admin-only preview/link RPCs:
  - `preview_people_legacy_link()`
  - `link_legacy_profiles_to_people()`
- Added matching service helpers for the preview/link RPCs.

Deferred from P2 until staging/dedupe review:

- Running legacy-to-people linking in production without reviewing preview counts.
- Creating `event_participants` or `event_staff`.
- Replacing any existing public/staff/admin flow with `people`.

## P3: Event-Scoped Registration and Staff Application

Status: foundation started on 2026-05-23.

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

Completed in foundation pass:

- Added additive migration `202605230003_event_registration_application_foundation.sql`.
- Created event-scoped tables:
  - `event_participants`
  - `staff_applications`
  - `event_forms`
  - `event_form_responses`
- Added RLS so admins manage tables directly; public users submit only through RPC.
- Added RPCs:
  - `get_public_event_form(input_event_slug, input_form_type)`
  - `submit_event_participant_registration(input_event_slug, input_email, input_phone, input_answers)`
  - `submit_event_staff_application(input_event_slug, input_email, input_phone, input_data)`
- Added public routes:
  - `/events/:eventSlug/register`
  - `/events/:eventSlug/staff/apply`
- Added pilot staff recruitment content and form for `parent-orientation-staff-2569`.
- Seeded two core platform events through `202605230007_seed_core_platform_events.sql`:
  - `entaneer-bonding-69`
  - `parent-orientation-staff-2569`
- Existing single-event routes remain unchanged.

Deferred:

- Approve/reject workflow for event participants and staff applications.
- Dynamic form rendering from `event_forms.config_json`.
- Creating unknown people from public registration.
- Event staff approval into `event_staff`.

## P4: Admin Event Dashboard

Status: lightweight event admin detail started on 2026-05-23.

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

Completed in lightweight pass:

- Added `/admin/events/:eventId`.
- Added admin event detail/edit page for event metadata, status, visibility, dates, and location.
- Added `/admin/events/:eventId/applications` for staff recruitment review.
- Added duty summary cards for total applications, waitlisted, rejected, and approved applicants missing a final duty.
- Added approved-per-duty summary, filters by status/final duty/preferred duty/year/major/rehearsal/event-day availability, and quick final-duty assignment stored in `staff_applications.answers.final_duty`.
- Added CSV export presets for all applications, approved only, by final duty, rehearsal list, contact list, and a clearly labeled full admin export that includes sensitive health/limitations text.
- Added `EventContext` and upgraded `EventSwitcher` to load accessible events, remember the selected event in `tfbp_current_event_id`, and show a migration note that some legacy pages still use default-event data.
- Placed the EventSwitcher only on safe admin/event surfaces for now: admin dashboard, admin events, admin event detail, and staff application review.
- Added admin event service helpers:
  - `fetchAdminEventById(id)`
  - `updateAdminEvent(id, input)`
  - `fetchAdminEventStaffApplications(eventId)`
  - `updateAdminStaffApplicationReview(input)`
- Kept legacy dashboards and event-scoped operations unchanged.

Deferred:

- Event CRUD create/delete.
- Registration open/close controls beyond event status field.
- Staff application approve/reject/waitlist actions.
- Event-scoped attendance/documents/announcements.
- Promoting approved applications into `event_staff`.

## P5: Event-Scoped Attendance

Status: compatibility foundation started on 2026-05-23.

Tasks:

- add nullable `event_id` to `staff_attendance_sessions`
- backfill existing sessions to default event
- update attendance RPCs to filter by event
- keep legacy `/staff/attendance` default event fallback
- add event name to QR/result UI

Risk: high if done without fallback.

Completed in compatibility pass:

- Added nullable `event_id` to `staff_attendance_sessions`.
- Backfilled existing null attendance sessions to the default event when available.
- Updated create/update attendance session RPCs to keep legacy behavior while storing `event_id`.
- Added `event_id` to TypeScript attendance session types.
- Updated admin attendance service calls to accept optional `eventId`.
- Updated `/admin/staff/attendance` to show the current event, filter sessions by the selected event, and create new sessions with `event_id = currentEventId`.
- Updated `/admin/staff/attendance/:sessionId` to show the session event name, with a "legacy/default event" label when `event_id` is null.
- Kept `/staff/attendance` and all QR scan flows unchanged for compatibility.

Deferred:

- Deeper attendance dashboard redesign by event.
- Event-aware QR result UI.
- Staff-side event selection.
- Event-role RLS for attendance.

## P6: Event-Scoped Announcements and Documents

Status: compatibility foundation started on 2026-05-23.

Tasks:

- add nullable `event_id` to announcements
- add nullable `event_id` to document project profiles/generated documents
- decide whether templates are global or event-scoped
- add event filters to services and admin pages

Risk: medium.

Completed in compatibility pass:

- Added nullable `event_id` to:
  - `announcements`
  - `document_project_profiles`
  - `document_templates`
  - `generated_documents`
- Backfilled existing null rows to the default event when available.
- Added TypeScript type support for `event_id` in announcements/documents.

Deferred:

- Filtering public/admin announcements by current event.
- Event-aware Document Center selection.
- Event namespaced Storage paths.
- Deciding global vs event-scoped templates in UI.

## P7: Full Legacy Route Migration

Status: intentionally deferred after foundation passes.

Tasks:

- redirect old routes to default/current event where appropriate
- make platform homepage the default if desired
- remove remaining global assumptions gradually
- update docs and QA

Risk: medium to high.

Do not execute yet:

- Do not redirect `/`, `/edit`, `/staff/attendance`, `/admin/dashboard`, or `/admin/documents` until event context has been tested end-to-end.
- Do not remove single-event assumptions from public search until event participant data exists and is validated.
- Do not require event selection for staff/admin workflows until an accessible event switcher is backed by real permissions.

Safe prerequisites before P7:

- Apply all foundation migrations on staging.
- Run `preview_people_legacy_link()` and review duplicate data.
- Run `link_legacy_profiles_to_people()` only after duplicate review.
- Confirm `event_participants` and `staff_applications` can be reviewed by admins.
- Add event-aware filters to attendance, announcements, and documents.
- Test old routes and new event routes side by side.

Recommended P7 approach:

1. Keep old routes working as default event aliases.
2. Add visible current-event context on admin/staff pages.
3. Add event switcher for admins only.
4. Add event-scoped public routes.
5. Only then consider platform homepage mode for `/`.

## Recommended Next Migration Prompt

Use this as the next Codex prompt when ready:

> Add the first safe multi-event database migration. Create public.events, insert the default event `entaneer-bonding-69`, add TypeScript service helpers to fetch/list events, and add an admin-only `/admin/events` read-only list page. Do not add event_id to legacy tables yet. Do not migrate profiles yet. Build must pass.

## Release Gate Before Real Multi-Event Use

- [x] default event foundation exists in code
- [x] staging runbook exists: `docs/STAGING_MIGRATION_RUNBOOK.md`
- [x] read-only staging verification script exists: `npm run check:multi-event-staging`
- [x] current environment schema check result documented: `docs/MULTI_EVENT_STAGING_CHECK_RESULTS.md`
- [x] release gate checklist exists: `docs/MULTI_EVENT_RELEASE_GATE.md`
- [ ] default event migration applied in production
- [ ] backup taken
- [ ] people dedupe tested on staging data
- [ ] public search verified not to leak cross-event data
- [ ] attendance QR verified with event scope
- [ ] admin event switcher clearly visible and backed by real permissions
- [ ] RLS event-role checks tested
- [ ] rollback plan documented
- [ ] old routes verified after event-scoped migrations
