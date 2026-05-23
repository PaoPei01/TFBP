# Multi-Event Staging Check Results

Last updated: 2026-05-23

This file records staging verification results for the multi-event foundation. Use placeholders until the check is run against the intended staging Supabase project.

## Command

```bash
npm run check:multi-event-staging
```

Optional complete check:

```bash
SUPABASE_SERVICE_ROLE_KEY="staging-only" \
SUPABASE_ADMIN_ACCESS_TOKEN="temporary-admin-session-token" \
npm run check:multi-event-staging
```

Do not commit service role keys or admin access tokens.

## Latest Result

- Environment checked: local `.env` Supabase target
- Checked by: Codex
- Checked at: 2026-05-23
- App commit: working tree before release-doc commit
- Supabase migration version: includes multi-event foundation through `202605230013_public_event_announcements_application_status.sql`
- Result: pass with 5 skips requiring `SUPABASE_ADMIN_ACCESS_TOKEN`

## Required Pass/Skip Review

The script should pass or explicitly skip these checks:

- [x] `events` table exists and public events are readable.
- [x] `entaneer-bonding-69` exists.
- [x] `parent-orientation-staff-2569` exists.
- [x] `people` table exists.
- [x] `people_import_year2_2569` table exists.
- [x] `staff_applications` table exists.
- [x] `event_participants` table exists.
- [x] `event_forms` table exists.
- [x] `event_form_responses` table exists.
- [x] `event_staff` table exists if promotion migration is deployed.
- [x] `staff_attendance_sessions.event_id` exists.
- [x] `announcements.event_id` exists.
- [x] document table `event_id` columns exist.
- [x] `default_event_id()` exists.
- [x] `verify_person_identity_for_prefill()` exists.
- [x] event form/submission/status RPCs exist.
- [ ] `preview_people_legacy_link()` runs with admin token or is explicitly skipped. Latest run skipped because no admin token was provided.
- [ ] `preview_year2_people_import()` runs with admin token or is explicitly skipped. Latest run skipped because no admin token was provided.
- [ ] `review_staff_application()` is deployed. Latest run skipped because no admin token was provided.
- [ ] `promote_staff_application_to_event_staff()` is deployed if event staff promotion is deployed. Latest run skipped because no admin token was provided.
- [x] `staff_profiles.person_id` missing count is recorded or explicitly skipped.
- [x] `profiles.person_id` missing count is recorded or explicitly skipped.
- [ ] duplicate people/data-health summary is recorded or explicitly skipped. Latest run skipped because no admin token was provided.
- [x] anon cannot read `people`.
- [x] anon cannot read `staff_applications`.

## Result Notes

Use this table after each staging run:

| Check area | Result | Notes |
| --- | --- | --- |
| Public events | Pass | 2 public events readable; both required slugs present. |
| Protected schema | Pass | Service role checks found protected tables and event columns. |
| Admin-only RPCs | Skipped | Requires temporary admin access token. |
| People import preview | Skipped | Run before importing year 2 data. |
| People legacy link preview | Skipped | Run before linking profiles/staff_profiles. |
| Public RLS sanity | Pass | Anon returned no `people` or `staff_applications` rows. |

## Manual Counts To Record

- `people` total: `1460`
- `people_import_year2_2569` total: `1111`
- `staff_profiles.person_id` missing: `0`
- `profiles.person_id` missing: `0`
- duplicate student ID groups: `TODO`
- duplicate email groups: `TODO`
- duplicate phone groups: `TODO`
- staff applications total: `7`
- approved staff applications: `TODO`
- event_staff total: `0`

## Latest Script Output Summary

- Pass: public event reads, event seeds, protected schema, event columns, required public RPCs, missing person-id counts, anon RLS sanity.
- Skip: admin-only preview/review/promotion/data-health checks because `SUPABASE_ADMIN_ACCESS_TOKEN` was not supplied.
- Fail: none in the escalated network run.

## Interpretation Rules

- A failed public event check blocks release.
- A failed protected schema check blocks release when service role credentials were provided.
- A skipped protected schema check does not prove readiness; complete it before production.
- A skipped admin preview check does not prove people import/link safety; complete it before importing or linking.
- Any anon-readable `people`, `staff_applications`, `people_import_year2_2569`, or `event_staff` rows block release.

## Attendance Constraint Repair Note

If applying attendance migrations manually fails with:

```text
check constraint "staff_attendance_records_method_check" of relation "staff_attendance_records" is violated by some row
```

the database likely already has attendance records with `method = 'verified_camera_scan'` while an older constraint definition only allowed `session_qr`, `verified_qr`, `manual`, `admin_scan_staff_qr`, `import`, and `system`.

Apply the repair migration:

```text
supabase/migrations/202605230006_staff_attendance_method_constraint_repair.sql
```

The intended method set is:

- `session_qr`
- `verified_qr`
- `verified_camera_scan`
- `manual`
- `admin_scan_staff_qr`
- `import`
- `system`
