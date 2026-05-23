# Multi-Event Release Gate

Use this checklist before enabling the multi-event foundation on staging or production. This gate is intentionally conservative: it verifies the additive foundation while preserving the current single-event workflow.

## Migration Order Review

Reviewed migrations:

1. `202605220003_events_default_event.sql`
2. `202605230001_people_foundation.sql`
3. `202605230002_people_legacy_link_tools.sql`
4. `202605230003_event_registration_application_foundation.sql`
5. `202605230004_attendance_event_scope_foundation.sql`
6. `202605230005_event_scoped_announcements_documents_foundation.sql`
7. `202605230006_staff_attendance_method_constraint_repair.sql`
8. `202605230007_seed_core_platform_events.sql`
9. `202605230008_year2_people_import_staging.sql`
10. `202605230009_people_admin_directory_health.sql`
11. `202605230010_people_dedupe_merge_tools.sql`
12. `202605230011_staff_application_review_workflow.sql`
13. `202605230012_event_staff_promotion.sql`
14. `202605230013_public_event_announcements_application_status.sql`

Findings:

- `public.events` is created before later migrations reference it.
- `public.people` is created before event participant/application tables reference it.
- `public.default_event_id()` is created before announcements/documents use it.
- Legacy `event_id` additions are nullable and additive.
- Legacy `person_id` additions are nullable and additive.
- RLS remains enabled on new tables.
- Public event reads are limited to `visibility = 'public'`.
- Direct `people`, `staff_applications`, `event_participants`, and `event_form_responses` access is admin-only.
- Public staff/participant submissions go through RPCs.
- No migration in this gate redirects routes or replaces public search behavior.
- `people_import_year2_2569` is a staging/import table protected by admin-only RLS.
- `event_staff` promotion is additive and does not mutate legacy `staff_profiles`.
- Staff application status lookup requires event slug plus matching email and phone.

## Pre-Release Checklist

- [ ] Backup taken and backup identifier recorded.
- [ ] Migrations applied on staging in timestamp order.
- [ ] Migration application log reviewed for `ERROR`, `NOTICE`, and constraint repair output.
- [ ] `npm run build` passes.
- [ ] `npm run lint` passes if available.
- [ ] `npm run check:multi-event-staging` passes.
- [ ] `people_import_year2_2569` table exists and is not readable by anon/public users.
- [ ] Year 2 people import completed on staging if this release depends on prefill.
- [ ] `preview_year2_people_import()` reviewed before importing staging rows.
- [ ] `import_year2_people_from_staging()` result counts recorded if import was run.
- [ ] `preview_people_legacy_link()` output reviewed with an authenticated admin token.
- [ ] Duplicate person risk reviewed.
- [ ] People dedupe dashboard reviewed for duplicate student IDs, emails, phones, and similar names.
- [ ] `link_legacy_profiles_to_people()` tested on staging only after preview review.
- [ ] `staff_profiles.person_id` missing count recorded after linking.
- [ ] `profiles.person_id` missing count recorded after linking.
- [ ] Old routes verified:
  - `/`
  - `/edit`
  - `/announcements`
  - `/staff/attendance`
  - `/admin/dashboard`
  - `/admin/staff/attendance`
  - `/admin/documents`
- [ ] New routes verified:
  - `/events`
  - `/events/entaneer-bonding-69`
  - `/events/parent-orientation-staff-2569`
  - `/events/parent-orientation-staff-2569/staff/apply`
  - `/events/parent-orientation-staff-2569/staff/application-status`
  - `/events/parent-orientation-staff-2569/announcements`
  - `/admin/events`
  - `/admin/events/:eventId`
  - `/admin/events/:eventId/applications`
  - `/admin/people`
  - `/admin/people/import-year2`
  - `/admin/people/dedupe`
- [ ] RLS tested:
  - anon can read public events
  - anon cannot read `people`
  - anon cannot read `people_import_year2_2569`
  - anon cannot read all staff applications
  - anon cannot read `event_staff`
  - non-admin cannot access admin event pages
  - admin can read/manage events
- [ ] Public privacy checked:
  - no budget displayed publicly
  - no individual phone/email displayed publicly
  - no medical data displayed publicly
  - no staff QR tokens displayed publicly
  - rain contingency shows public summary only
- [ ] Staff application tested:
  - empty required fields show friendly validation
  - unknown email/phone fails with friendly error
  - successful submission does not promise approval
  - status checker requires matching email + phone before showing status
  - wrong identity does not reveal another applicant
- [ ] Admin review tested:
  - status changes save through `review_staff_application`
  - final duty saves and appears in review/export views
  - contact export excludes health/limitations
  - full admin export is clearly labeled before including sensitive/detail fields
- [ ] Event staff promotion tested if `202605230012_event_staff_promotion.sql` is deployed:
  - approved application can be promoted
  - repeated promotion does not duplicate `event_staff`
  - legacy `staff_profiles` remains unchanged
- [ ] Event announcements tested:
  - public event announcement route loads
  - staff-only/admin-only announcements stay hidden
- [ ] Attendance event filter tested:
  - selected event appears on admin attendance pages
  - newly created sessions get the selected `event_id`
  - legacy sessions with null `event_id` remain visible under fallback behavior
- [ ] Document Center tested:
  - selected-event context card appears on all document admin pages
  - global templates and event templates are clearly labeled
  - generated history shows event context, template scope, version, and download action
- [ ] Attendance QR tested after migrations:
  - admin can create session
  - admin can see selected event and session event badge
  - admin QR card shows event name and session title
  - existing sessions still load
  - legacy/default session warning appears when applicable
  - QR check-in still works
  - staff scan result shows event context when available
  - manual check-in still works
- [ ] Rollback plan ready and understood.

## Evidence To Record

Before approving production, attach or record:

- Staging project ref and backup identifier.
- Migration command/log location.
- `npm run build` timestamp and result.
- `npm run lint` timestamp and result.
- `npm run check:multi-event-staging` output summary.
- People import preview/import counts, if import was run.
- People linking preview/link counts, if link was run.
- Duplicate review decision.
- Manual QA owner and date.
- Rollback owner and rollback communication channel.

## Production Approval Gate

Do not apply production migrations until all of these are true:

- [ ] Staging release gate completed.
- [ ] Staging QA screenshots or notes recorded.
- [ ] Production backup/snapshot is available.
- [ ] Migration owner and rollback owner are assigned.
- [ ] A quiet deployment window is chosen.
- [ ] Team agrees not to run `link_legacy_profiles_to_people()` in production until preview counts are reviewed.

## Deferred / Risky

These are intentionally not approved by this gate:

- Full legacy route migration.
- Making `event_id` non-null on legacy tables.
- Replacing `/` with platform homepage.
- Event-role permission rewrite.
- Event-scoped public participant search.
- Event-scoped staff attendance requirement for staff users.
- Automatic linking of legacy profiles to people without preview review.
