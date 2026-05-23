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

Completed in year 2 import staging pass:

- Added additive migration `202605230008_year2_people_import_staging.sql`.
- Added `people.nickname_en`, `people.nickname_th`, and `people.metadata`.
- Added admin-only staging table `public.people_import_year2_2569`.
- Added import cleanup helpers:
  - `clean_import_text(input)`
  - `normalize_import_email(input)`
  - `normalize_import_phone(input)`
- Added admin-only RPCs:
  - `preview_year2_people_import()`
  - `import_year2_people_from_staging()`
- Added admin page `/admin/people/import-year2`.
- Added import guide `docs/YEAR2_PEOPLE_IMPORT_GUIDE.md`.

Year 2 import safety checklist:

- [ ] staging table exists
- [ ] preview RPC works
- [ ] import RPC works
- [ ] phone numbers preserve leading zero
- [ ] email hidden characters are cleaned
- [ ] health fields are not imported to `people`
- [ ] public pages do not expose imported `people`

Completed in People Directory/Data Health pass:

- Added additive migration `202605230009_people_admin_directory_health.sql`.
- Added admin-only read RPCs:
  - `get_people_admin_summary()`
  - `search_admin_people(input)`
  - `get_people_data_health()`
- Added `/admin/people` for the central people base.
- Added search/filter by identity fields, source, year, major, link status, staff application status, and missing fields.
- Added read-only people data health panel for duplicate, missing, unlinked, and skipped staging counts.
- Kept public routes and legacy profile/staff behavior unchanged.

People Directory QA checklist:

- [ ] `/admin/people` loads for admins
- [ ] public/non-admin users cannot access `/admin/people`
- [ ] search by student ID works
- [ ] source/year/major filters work
- [ ] linked profile/staff/application filters work
- [ ] duplicate/missing/linking counts appear
- [ ] health data is not shown
- [ ] mobile cards do not overflow

Completed in People Dedupe/Merge pass:

- Added additive migration `202605230010_people_dedupe_merge_tools.sql`.
- Added nullable merge archive fields on `people`:
  - `merged_into`
  - `merged_at`
  - `merged_by`
  - `merge_note`
- Added admin-only RPCs:
  - `find_people_duplicates()`
  - `merge_people_records(keep_person_id, merge_person_id, note)`
- Added `/admin/people/dedupe`.
- Added safe manual merge UI with keep/merge selection, mismatch warnings, required confirmation checkbox, and optional note.
- Merge repoints linked records and archives the merged person instead of hard deleting it.
- Normal `/admin/people` hides archived merged records by default.
- Kept public routes and legacy behavior unchanged.

People Dedupe QA checklist:

- [ ] `/admin/people/dedupe` loads for admins
- [ ] public/non-admin users cannot access `/admin/people/dedupe`
- [ ] duplicate groups load by student ID/email/phone/name
- [ ] merge modal requires explicit confirmation
- [ ] modal warns when student IDs or names differ
- [ ] merge repoints `staff_profiles.person_id`
- [ ] merge repoints `profiles.person_id`
- [ ] merge repoints `staff_applications.person_id`
- [ ] merge archives the merged person with `merged_into`
- [ ] merged record is hidden from normal `/admin/people`
- [ ] no health data is merged or shown
- [ ] mobile merge cards do not overflow

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

Completed in staff application review workflow pass:

- Added additive migration `202605230011_staff_application_review_workflow.sql`.
- Added admin-only RPC `review_staff_application(application_id, status, final_duty, review_note)`.
- Added shared status helper `src/lib/applicationStatus.ts`.
- Updated `/admin/events/:eventId/applications` with status labels and review actions:
  - submitted
  - under_review
  - approved
  - waitlisted
  - rejected
  - withdrawn
- Added review modal with optional note, final duty, approval warning when final duty is missing, and rejection note guidance.
- Added application detail modal with applicant info, availability, experience, health/limitations privacy warning, consent, final duty, review note, reviewed_by, and reviewed_at.
- Kept filters, CSV exports, public staff application submission, and legacy routes unchanged.

Completed in event staff promotion pass:

- Added additive migration `202605230012_event_staff_promotion.sql`.
- Created `public.event_staff` when missing, with admin-only RLS and unique `(event_id, person_id)`.
- Added admin-only RPC `promote_staff_application_to_event_staff(application_id, staff_role, team)`.
- Promotion requires `staff_applications.status = 'approved'`.
- Promotion upserts into `event_staff` and updates `staff_applications.answers.promoted_to_event_staff` plus `event_staff_id`.
- Added “เพิ่มเป็นสตาฟกิจกรรม / Add to event staff” action on approved applications.
- Added promoted-state badge in application review.
- Added event staff count section on admin event detail.
- Kept legacy `staff_profiles`, public application submission, filters, and exports unchanged.

Completed in event operations dashboard pass:

- Upgraded `/admin/events/:eventId` from a metadata-only page into a two-tab event operations dashboard:
  - Overview
  - Settings
- Added `fetchAdminEventOverview(eventId)` service helper with fail-soft counts for:
  - participant registrations
  - staff applications
  - approved/waitlisted/rejected applications
  - missing final duty
  - event staff
  - attendance sessions
  - announcements
  - generated documents
- Added mobile-first overview cards and quick actions for public page, staff applications, staff management, attendance, announcements, and Document Center.
- Added a staff recruitment summary panel for `parent-orientation-staff-2569`, including capacity, total applications, approved count, estimated remaining capacity, and missing final duty.
- Kept the metadata edit form intact in the Settings tab.

Deferred:

- Event CRUD create/delete.
- Registration open/close controls beyond event status field.
- Event-scoped attendance/documents/announcements.
- Event staff list/detail route beyond the lightweight count.

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

Completed in event-aware attendance UX polish:

- Added a clear selected-event context card on `/admin/staff/attendance`.
- Added event badges to admin attendance session lists and mobile cards.
- Added a session event context warning for legacy/default attendance sessions.
- Updated the admin QR card to show event name, session title, and clear closed/expired/missing QR states.
- Updated staff QR scan result UI to show event name when the existing RPC returns `session.event_id` and the app can resolve the public event name.
- Updated staff attendance history to show event name when available without requiring staff-side event selection.
- Kept QR token generation, scan RPCs, and staff compatibility behavior unchanged.

Deferred:

- Deeper attendance dashboard redesign by event.
- Backend RPC enhancement to return event display names directly for non-public/unresolved events.
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
- Updated announcement services and admin announcement pages to filter by current event plus global rows, while leaving public announcements on the existing default behavior.
- Added event selection to announcement edit/create so admins can choose a specific event or global visibility.
- Updated Document Center data loading to use the current event plus global rows for project profiles, templates, and generated document history.
- New document templates and generated document records are associated with the selected event through admin-safe writes without changing Storage paths or the DOCX generation RPC contract.
- Added EventSwitcher to Document Center overview, settings, templates, generate, and history pages.

Completed in Document Center event-aware UX polish:

- Added a selected-event context card to Document Center overview, settings, templates, generate, and history.
- Clarified that document data below each page belongs to the selected event.
- Clarified that global templates appear together with event-specific templates.
- Added template scope badges for "กิจกรรมนี้" and "ทุกกิจกรรม".
- Added template scope filters: all, selected event, and global.
- Added upload scope selection with current event as the default and global as an explicit choice.
- Updated generate page to show template scope, selected event data context, and clearer missing-field grouping.
- Updated history page mobile/table rows to show event context, template scope, generated version, and download action.
- Kept DOCX generation contract and existing Storage paths unchanged.

Completed in public event announcements/status pass:

- Added public event announcement routes:
  - `/events/:eventSlug/announcements`
  - `/events/:eventSlug/announcements/:announcementId`
- Event announcement routes use public-visible announcement data only and include global rows through the existing event filter behavior.
- Added a safe public staff application status checker route:
  - `/events/:eventSlug/staff/application-status`
- Added `check_staff_application_status(input_event_slug, input_email, input_phone)` RPC that returns only the matching applicant's safe status fields after email + phone verification.
- Added a secondary "ตรวจสอบสถานะใบสมัคร" CTA on `parent-orientation-staff-2569`.
- Kept legacy `/announcements` behavior unchanged.

Completed in contextual guide/help pass:

- Added guide topics for people import, people directory, people dedupe, staff application review, promote-to-event-staff, event documents, and event-aware attendance.
- Expanded multi-event and staff application topics to explain event id vs slug, email + phone verification, and status checking.
- Added scoped HelpButtons only on the requested main surfaces: people import/directory/dedupe, event staff application, admin event detail/applications, Document Center event context, and Admin Attendance event context.
- Kept guide examples generic and avoided real user data.

Deferred:

- Event namespaced Storage paths.
- Public copy workflow for review notes beyond `answers.public_review_note`.

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

## Staff Application Identity Review Pass

Status: implemented as an additive identity-review layer for `parent-orientation-staff-2569`.

Completed:

- Added `identity_status` and requested identity/contact fields to `staff_applications`.
- Added `person_update_requests` for admin-reviewed corrections.
- Added `lookup_person_for_application()` with student ID as the primary key.
- Required CMU Mail (`@cmu.ac.th`) for public staff applications and profile checks.
- Updated `submit_event_staff_application()` so outdated email/phone no longer hard-blocks real applicants.
- Added `/events/:eventSlug/profile-check` for safe profile lookup and correction requests.
- Added `/admin/people/update-requests` for admin review of person update requests.
- Added identity status badges/filter/warnings to admin staff application review.

Privacy/security notes:

- Public users cannot directly update `people`.
- Public lookup returns only safe/masked old email and phone.
- Health data is not returned by lookup, update requests, or public profile check.
- Admin approval updates only safe identity/contact fields and never health data.
- No email sending or duty auto-assignment was added in this pass.

QA focus:

- CMU Mail validation rejects Gmail/personal email and malformed CMU addresses.
- Student ID + mismatched CMU Mail can continue with `email_mismatch`.
- Unknown student ID can continue with `not_found` / pending review.
- Admin can approve/reject correction requests.

## Parent Orientation Duty Quota Assignment Pass

Status: implemented as an additive staff-application operations layer for `parent-orientation-staff-2569`.

Completed:

- Added `event_staff_duty_quotas` with eight seeded Parent Orientation duties totaling 130 people.
- Added preliminary assignment fields on `staff_applications`: `assigned_duty`, `assignment_method`, and `assignment_note`.
- Added quota status RPC and preliminary duty assignment RPC.
- Updated staff application submission so the backend stores "ฝ่ายที่ระบบจัดให้เบื้องต้น" based on quotas and preferred duties.
- Added applicant duty cards with quota/remaining counts and disabled full-duty states.
- Added applicant confirmation and success copy that clearly says the assignment is preliminary and can be adjusted later by admins.
- Added admin quota summary, assigned-duty and assignment-method filters, and manual preliminary duty override with an over-quota warning.
- Added Excel `.xlsx` export for all applications, current filtered rows, and per-duty rows, with a sensitive-data warning before download.

Security/privacy notes:

- No identity verification rules were changed in this pass.
- No automatic email sending was added.
- Public quota reads are limited to public events; application rows remain admin-only.
- Excel export warns admins before including health/limitation text and is intended for event operations only.

QA focus:

- Quotas total 130.
- Full duties are disabled in the applicant UI and backend assignment falls back safely.
- Specialized/smaller roles fill before general by priority.
- Applicant sees "ฝ่ายที่ระบบจัดให้เบื้องต้น" before and after submit.
- Admin can override preliminary duty and sees a warning when a selected duty is already full.
- Excel export includes base `people` data plus application-submitted data.

## Staff Application Status Assignment Display Pass

Status: implemented as a small follow-up to the duty quota pass.

Completed:

- Updated `check_staff_application_status()` so applicants can check status using the email/phone they submitted, even when old `people.email` or `people.phone` is outdated.
- Added safe status response fields for `identity_status`, preliminary assigned duty, assignment method, and assignment note.
- Updated `/events/:eventSlug/staff/application-status` to show "ฝ่ายที่ระบบจัดให้เบื้องต้น" with the same preliminary-assignment warning copy.
- Kept final duty hidden unless the application is approved.

Privacy/security notes:

- Status lookup still requires both submitted email and phone.
- The RPC returns only the matching applicant's safe status and does not expose health data.
- No email sending or automatic notification was added.

## Staff Application UX Polish Pass

Status: implemented as a UI/UX and Thai wording polish pass.

Completed:

- Converted Parent Orientation staff application into a four-step flow: identity verification, safe data review, duties/questions, and final confirmation.
- Added clearer Thai-first helper text, placeholders, and non-blocking identity mismatch copy.
- Improved safe person preview wording and update-request modal copy so applicants know they can continue applying.
- Updated duty cards with selected state, full state, remaining-slot wording, and keyboard-accessible checkbox cards.
- Standardized Parent Orientation duty labels to shorter Thai labels such as `ฝ่ายจราจร`, `ฝ่ายพยาบาล`, and `ฝ่ายประสานงานเวที`.
- Improved admin application review with search, richer top summary cards, clearer assignment-method labels, and refined Excel export wording.

QA focus:

- Mobile step flow shows one main task at a time.
- Applicants can go back without losing entered data.
- Duty cards show `เลือกแล้ว` and `รับเต็มจำนวนแล้ว` as text, not color only.
- Final confirmation clearly shows identity status and "ฝ่ายที่ระบบจัดให้เบื้องต้น".
- Admin filters/search remain readable on mobile cards and desktop table.

## Production Readiness Hardening Pass

Status: implemented as an additive hardening layer for real Parent Orientation staff recruitment.

Completed:

- Replaced `submit_event_staff_application()` with a concurrency-safe version that uses a per-event `pg_advisory_xact_lock` before quota assignment and insert.
- Added admin-only `get_system_readiness_report()` to check required tables, columns, RPCs, RLS, and Parent Orientation quota status.
- Added admin-only `log_staff_application_export()` so Excel export events are logged without storing applicant row data.
- Added `/admin/system-readiness` with build metadata, refresh, copy-summary, and friendly missing-migration diagnostics.
- Strengthened admin application quota summary with total quota, assigned, remaining, over-quota warnings, progress bars, and duty filter shortcuts.
- Added required confirmation checkbox before Excel export of personal/sensitive fields.
- Added static `npm run check:production-readiness` repo verification.

Deferred:

- Production migrations still must be applied manually in Supabase after backup and staging verification.
- Email notification is intentionally not implemented.
- Advanced real-time monitoring remains out of scope until core launch is stable.

## UI/UX QOL Audit and Polish Pass

Status: implemented as a product quality pass with no database/schema changes.

Completed:

- Added `docs/UI_UX_QOL_AUDIT.md` covering device, page, component, wording, and QOL roadmap findings.
- Standardized safe form select placeholder behavior so forms use `โปรดเลือก`, while touched admin filters explicitly use `ทั้งหมด`.
- Tightened full-name/nickname display rules in staff application and profile-check surfaces.
- Improved Parent Orientation staff application success/confirmation details with nickname, submitted time, preliminary duty, screenshot reminder, and calmer identity-warning copy.
- Updated duty card descriptions, disabled/full state affordance, and keyboard focus styling.
- Refined admin application export wording and sensitive-data confirmation modal.
- Added guide topics for staff application, CMU Mail identity, preliminary duty assignment, status check, admin export, and people update requests.

QA focus:

- Full name never falls back to nickname.
- CMU Mail mismatch remains non-blocking where admin review is allowed.
- Full duty cards are readable, disabled, and not color-only.
- Excel export warning appears before download.
- No public sensitive data exposure or schema/RLS change was introduced.
