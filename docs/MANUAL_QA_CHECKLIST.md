# TFBP Manual QA Checklist

Use this checklist before real event operations and after every production-readiness change.

## Test Setup

- [ ] Supabase project points to the intended environment.
- [ ] Latest migrations are applied.
- [ ] `docs/MULTI_EVENT_RELEASE_GATE.md` is reviewed for this release.
- [ ] `docs/STAGING_MIGRATION_RUNBOOK.md` has been followed on staging.
- [ ] Staging backup identifier is recorded before migration checks.
- [ ] Multi-event staging runbook has been followed if testing multi-event foundation.
- [ ] `npm run check:multi-event-staging` passes after applying foundation migrations.
- [ ] Any skipped staging checks are reviewed and either completed with staging credentials or accepted by the release owner.
- [ ] `docs/MULTI_EVENT_STAGING_CHECK_RESULTS.md` is updated with latest result notes.
- [ ] Admin account exists.
- [ ] Staff Auth account exists.
- [ ] Non-Auth staff profile exists with email + phone.
- [ ] At least one participant profile exists.
- [ ] At least one group assignment exists.
- [ ] At least one active staff attendance session can be created.
- [ ] Test on iPhone SE width, common Android width, tablet, desktop.

## Public

- [ ] Open `/`.
- [ ] Participant list loads.
- [ ] Search by Thai name.
- [ ] Search by nickname.
- [ ] Search by major.
- [ ] Open mobile filter sheet.
- [ ] Filter by major.
- [ ] Filter by main group.
- [ ] Filter by subgroup.
- [ ] Clear filters.
- [ ] Open participant modal.
- [ ] Confirm modal shows only privacy-safe fields.
- [ ] Confirm email, phone, LINE, Instagram, Facebook, emergency contact, disease, food allergy, and drug allergy are hidden.
- [ ] Tap "ดูข้อมูลเต็ม / แก้ไขข้อมูล" and confirm it goes to `/edit`.
- [ ] Bottom nav does not cover modal buttons.

## Events

- [ ] Open `/events`.
- [ ] Default event `รับน้องสานสัมพันธ์ 69 / Entaneer CMU 69` appears after applying migrations.
- [ ] Parent Orientation staff recruitment event appears after applying migrations.
- [ ] Event card action opens `/events/entaneer-bonding-69`.
- [ ] Open `/events/parent-orientation-staff-2569`.
- [ ] Event detail page shows event status, date, location, target audience, and clear actions.
- [ ] `/events/entaneer-bonding-69` shows objectives, schedule preview, stations, dress code, registration points, and public rain plan.
- [ ] `/events/entaneer-bonding-69` does not show detailed budget publicly.
- [ ] `/events/parent-orientation-staff-2569` shows capacity, eligible years, duties, important dates, and dress code.
- [ ] Event detail page links back to the existing participant list and `/edit`.
- [ ] `/` still loads the existing public participant list and does not depend on the events table.
- [ ] Mobile `/events` cards fit iPhone SE width without horizontal scroll.
- [ ] Open `/events/entaneer-bonding-69/register`.
- [ ] Registration page asks for email + phone and optional note.
- [ ] Registration submit fails safely if no matching `people` row exists.
- [ ] Open `/events/parent-orientation-staff-2569/staff/apply`.
- [ ] Staff application page asks for student ID, email, phone, duties, availability, rehearsal availability, event-day availability, optional experience, health limitations, note, and consent.
- [ ] Staff application uses a 4-step layout: identity verification, data review, duties/questions, confirmation.
- [ ] Stepper shows current step clearly on mobile and desktop.
- [ ] Applicant can go back to earlier steps without losing entered data.
- [ ] Identity fields show placeholders and helpers for student ID, CMU Mail, and phone.
- [ ] Staff application requires CMU Mail ending with `@cmu.ac.th`.
- [ ] Staff application rejects Gmail/Hotmail/personal email.
- [ ] Staff application rejects malformed CMU Mail and CMU Mail with spaces.
- [ ] Staff application identity lookup uses student ID as the primary key.
- [ ] Student ID + matching CMU Mail shows verified identity.
- [ ] Student ID + different CMU Mail shows "พบข้อมูลนักศึกษา แต่ CMU Mail ที่กรอกไม่ตรงกับข้อมูลเดิม" and still allows continuing.
- [ ] Unknown student ID shows "ไม่พบข้อมูลจากรหัสนักศึกษานี้" and still allows submitting for admin identity review.
- [ ] Email/phone mismatch does not hard-block a real applicant.
- [ ] Applicant can submit a person update request from the staff application flow.
- [ ] `/events/parent-orientation-staff-2569/profile-check` loads.
- [ ] Profile check shows only safe/masked old email/phone.
- [ ] Profile check does not show health data, private notes, or full old contact fields publicly.
- [ ] Staff application submit fails safely if staff recruiting is closed or identity is missing.
- [ ] Open `/events/parent-orientation-staff-2569/staff/application-status`.
- [ ] Status checker requires email and phone.
- [ ] Correct applicant identity shows only that applicant's status.
- [ ] Wrong email/phone shows a generic "not found" state and does not reveal whether another applicant exists.
- [ ] Status checker works for applicants whose submitted CMU Mail differs from the old `people.email`.
- [ ] Status checker shows `ฝ่ายที่ระบบจัดให้เบื้องต้น`.
- [ ] Status checker says the preliminary duty may be adjusted later by admins.
- [ ] Status checker shows pending identity review copy when identity is not verified.
- [ ] Approved applicant sees final duty only after correct identity verification.
- [ ] Participant registration does not ask for medical information.
- [ ] Staff application health/limitations text is shown only inside the application form and admin review/export tools.
- [ ] Old `/`, `/edit`, `/staff/attendance`, `/admin/dashboard`, and `/admin/documents` routes still work after applying multi-event foundation migrations.
- [ ] Do not enable platform homepage redirects until event-scoped participant data is validated.

## Multi-Event Release Gate

- [ ] `events`, `people`, `people_import_year2_2569`, `staff_applications`, `event_participants`, and `event_forms` exist on staging.
- [ ] `event_staff` exists if event staff promotion is deployed.
- [ ] `staff_attendance_sessions.event_id`, `announcements.event_id`, and document table `event_id` columns exist.
- [ ] `entaneer-bonding-69` and `parent-orientation-staff-2569` are present and public.
- [ ] Public users can read public events only.
- [ ] Public users cannot read `people`.
- [ ] Public users cannot read `people_import_year2_2569`.
- [ ] Public users cannot read all `staff_applications`.
- [ ] Public users cannot read `event_staff`.
- [ ] `preview_year2_people_import()` has been reviewed before importing year 2 rows.
- [ ] `import_year2_people_from_staging()` result counts are recorded if import was run.
- [ ] People duplicate review is completed before linking legacy rows.
- [ ] `preview_people_legacy_link()` has been reviewed before linking legacy profiles/staff profiles.
- [ ] `link_legacy_profiles_to_people()` result counts are recorded if linking was run on staging.
- [ ] `staff_profiles.person_id` missing count is recorded.
- [ ] `profiles.person_id` missing count is recorded.
- [ ] Staff application submission, status lookup, admin review, export, and promotion are tested.
- [ ] Admin attendance event filter is tested and legacy/null-event sessions remain visible.
- [ ] Admin announcements and Document Center event filters are tested.
- [ ] Old routes `/`, `/edit`, `/announcements`, `/staff/attendance`, `/admin/dashboard`, `/admin/staff/attendance`, and `/admin/documents` still work.
- [ ] Rollback owner and communication channel are recorded.

## Announcements

- [ ] Open `/announcements`.
- [ ] Public visible announcements load.
- [ ] Existing announcements keep loading after nullable `event_id` is added.
- [ ] Pinned/important announcements are clear.
- [ ] Open announcement detail.
- [ ] Image/file links, if present, open correctly.
- [ ] Staff-only/admin-only announcements are not visible publicly.
- [ ] Admin announcements can be filtered by selected event plus global rows.
- [ ] Public announcements still load with the existing default behavior.
- [ ] Open `/events/parent-orientation-staff-2569/announcements`.
- [ ] Public event announcement page loads event-specific and global public announcements only.
- [ ] Staff-only/admin-only event announcements are hidden from the public event route.
- [ ] Open `/events/parent-orientation-staff-2569/announcements/:announcementId`.
- [ ] Event announcement detail does not show hidden/staff/admin announcements.

## Guide

- [ ] Open `/guide`.
- [ ] Role selector cards scroll to the correct sections.
- [ ] Participant guide exists.
- [ ] Staff guide exists.
- [ ] Attendance guide exists.
- [ ] Admin guide exists.
- [ ] Multi-event guide topic `/guide/events/overview` explains event id vs slug.
- [ ] Staff application guide topic explains email + phone verification and status checking.
- [ ] People import, people directory, and people dedupe guide topics exist.
- [ ] Admin event application and promote-to-event-staff guide topics exist.
- [ ] Document event-documents and attendance event-attendance guide topics exist.
- [ ] Preview mock cards contain only fake data.
- [ ] FAQ expands and collapses with keyboard and touch.
- [ ] Guide link exists in desktop nav.
- [ ] Guide link exists in mobile More menu.

## Participant Edit Request

- [ ] Open `/edit`.
- [ ] Verify with valid email + phone.
- [ ] Verify with wrong email + phone shows clear inline error.
- [ ] Edit form appears immediately after successful identity verification.
- [ ] Edit form still appears if group assignment is missing.
- [ ] Edit form still appears if group/friend RPC fails.
- [ ] Group card appears only when assignment exists.
- [ ] Friend section is collapsed by default.
- [ ] Submit edit request.
- [ ] Success card appears.
- [ ] Duplicate submit is prevented while loading/submitted.
- [ ] Mobile sticky submit is not covered by bottom nav.

## Staff Without Auth

- [ ] Open `/staff/attendance` without logging in.
- [ ] Enter staff email + phone.
- [ ] Valid identity verifies successfully.
- [ ] Invalid identity shows clear error.
- [ ] After verification, page shows current staff identity.
- [ ] Reload `/staff/attendance`.
- [ ] Remembered identity remains available.
- [ ] No raw email or phone is shown after verification.
- [ ] Show personal QR modal.
- [ ] Confirm QR contains token/payload only, not email/phone/student ID.
- [ ] Copy token/link if available.
- [ ] Open session QR scanner modal.
- [ ] Camera permission is requested only after tapping open camera.
- [ ] Paste a valid session QR URL/token and check in.
- [ ] Already checked state is clear on repeat scan.
- [ ] Clear/change remembered identity.
- [ ] Reload and confirm verification is required again.
- [ ] Expired identity asks user to verify again.

## Staff Auth

- [ ] Open `/login`.
- [ ] Login with valid staff account.
- [ ] Staff account routes to `/staff`.
- [ ] Staff account cannot access `/admin/dashboard`.
- [ ] Open Staff Dashboard.
- [ ] Open Staff Attendance.
- [ ] Show personal QR.
- [ ] Scan/paste session QR.
- [ ] Open Staff Profile.
- [ ] Open Staff Profile Edit.
- [ ] Upload valid JPG/PNG/WEBP avatar under 5 MB.
- [ ] Invalid avatar type is rejected.
- [ ] Avatar appears in profile/public staff cards.
- [ ] Remove avatar.
- [ ] Submit contact/medical edit request.
- [ ] Sign out.

## Admin Login and Access

- [ ] Open `/login`.
- [ ] Login with valid admin account.
- [ ] Admin account routes to `/admin/dashboard`.
- [ ] Non-admin Auth account does not route to admin dashboard.
- [ ] Staff account gets staff access, not admin access.
- [ ] Unauthorized Auth account is signed out with clear no-access message.

## Admin Dashboard

- [ ] Open `/admin/dashboard`.
- [ ] Summary cards load.
- [ ] Search participant.
- [ ] Filter by major.
- [ ] Filter by group/subgroup.
- [ ] Filter by health flag.
- [ ] Export CSV.
- [ ] Export Excel.
- [ ] Open edit modal.
- [ ] Save participant edit.
- [ ] Open delete confirmation.
- [ ] Cancel delete.
- [ ] Mobile filter sheet works.
- [ ] Mobile card actions are visible and tappable.

## Admin Events

- [ ] Admin can open `/admin/events`.
- [ ] `/admin/events` shows the default event after applying migrations.
- [ ] `/admin/events` shows parent orientation staff recruitment after applying migrations.
- [ ] Admin can open `/admin/events/:eventId`.
- [ ] `/admin/events/:eventId` opens on the Overview tab first.
- [ ] Overview cards show event status, visibility, participant registrations, staff applications, approved staff, waitlisted, rejected, missing final duty, attendance sessions, announcements, and generated documents.
- [ ] Overview count cards do not crash if an optional data source is unavailable; unavailable counts show 0.
- [ ] Quick actions work for public page, staff applications, staff management, attendance, announcements, and Document Center.
- [ ] Parent orientation event shows capacity 300, total applications, approved count, estimated remaining capacity, and missing final duty.
- [ ] Settings tab still shows the metadata edit form.
- [ ] Admin can edit event name, status, visibility, dates, and location.
- [ ] EventSwitcher appears on admin dashboard and admin event pages.
- [ ] Changing EventSwitcher selection persists after reload on the same device.
- [ ] Switching events does not redirect or change legacy public search; admin attendance, announcements, and documents use the selected event where implemented.
- [ ] Admin can open `/admin/events/:eventId/applications` from the parent orientation event.
- [ ] Application review shows identity status badges: verified, CMU Mail mismatch, pending identity review, not found, rejected identity.
- [ ] Application review can filter by identity status.
- [ ] Application detail shows requested CMU Mail, requested phone, requested student ID, matched person, and a warning for pending identity review.
- [ ] Approving an application with pending identity review shows a clear warning but is not blocked.
- [ ] Application review shows duty summary, waitlisted count, rejected count, and approved applicants missing final duty.
- [ ] Filters work for status, final duty, preferred duty, year level, major, rehearsal availability, and event day availability.
- [ ] Admin can assign a final duty from the dropdown and sees a success toast after saving.
- [ ] Admin can mark an application as under review.
- [ ] Admin can approve an application.
- [ ] Admin can waitlist an application.
- [ ] Admin can reject an application.
- [ ] Review note saves and appears in application details.
- [ ] Status label updates with Thai-friendly labels.
- [ ] Approving without final duty shows a warning but is allowed.
- [ ] Rejecting encourages a review note.
- [ ] Application detail modal shows applicant info, preferred duties, availability, rehearsal availability, event-day availability, staff experience, note, consent, current status, final duty, review note, reviewed_by, and reviewed_at.
- [ ] Health/limitations field is shown only in admin detail with the privacy warning.
- [ ] Mobile application cards show primary approve action plus additional actions without horizontal scroll.
- [ ] Approved application shows "เพิ่มเป็นสตาฟกิจกรรม".
- [ ] Rejected, waitlisted, submitted, and under_review applications do not show the promote action.
- [ ] Promoting an approved application creates or updates one `event_staff` row.
- [ ] Promoting the same application twice does not duplicate `event_staff`.
- [ ] Promoted application shows "เพิ่มเป็นสตาฟแล้ว".
- [ ] `event_staff` references the correct event, person, and application.
- [ ] Public/non-admin users cannot access `event_staff`.
- [ ] Legacy `staff_profiles` is unchanged after promotion.
- [ ] Admin event detail shows event staff count after promotion.
- [ ] Export presets work for all applications, approved only, by final duty, rehearsal list, contact list, and full admin export.
- [ ] Export reflects the latest status after review actions.
- [ ] Contact list export does not include health/limitations fields.
- [ ] Full admin export is clearly labeled as including sensitive/detail fields before use.
- [ ] Event edit does not change legacy public search or attendance behavior.
- [ ] Public/non-admin users cannot access `/admin/events`.
- [ ] Existing `/admin/dashboard` still loads normally.

## People Update Requests

- [ ] Migration `202605230014_staff_application_identity_review.sql` applies successfully.
- [ ] `public.person_update_requests` exists.
- [ ] Public/anon users cannot read `person_update_requests` directly.
- [ ] Public users can submit a correction only through `submit_person_update_request`.
- [ ] Open `/admin/people/update-requests` as admin.
- [ ] Public/non-admin users cannot access `/admin/people/update-requests`.
- [ ] Requests can be filtered by status, request type, event, and search text.
- [ ] Detail modal shows submitted values and matched person data for admin review.
- [ ] Approving an email correction updates `people.email` only when requested email is valid CMU Mail.
- [ ] Approving can update phone/name/major when provided.
- [ ] Approving does not update health data.
- [ ] Rejecting sets request status to rejected and saves review note.
- [ ] Review actions create an audit trail in `change_logs` if available.

## People Foundation

- [ ] Migration `202605230001_people_foundation.sql` applies successfully.
- [ ] `public.people` exists.
- [ ] Public users cannot directly read `public.people`.
- [ ] Admin users can read `public.people`.
- [ ] `verify_person_identity_for_prefill` returns `identity_verification_failed` when no matching person exists.
- [ ] `verify_person_identity_for_prefill` returns only minimal safe identity fields when a matching person exists.
- [ ] The RPC response does not include phone, email, medical data, or internal notes.
- [ ] `profiles.person_id` exists and is nullable.
- [ ] `staff_profiles.person_id` exists and is nullable.
- [ ] `preview_people_legacy_link()` returns counts for participant and staff rows.
- [ ] Do not run `link_legacy_profiles_to_people()` on production until preview counts and duplicate data are reviewed.
- [ ] Existing `/`, `/edit`, `/staff/attendance`, and `/admin/dashboard` behavior is unchanged.

## Year 2 People Import

- [ ] Migration `202605230008_year2_people_import_staging.sql` applies successfully.
- [ ] `public.people_import_year2_2569` exists.
- [ ] Admin-only RLS exists for staging select/insert/update/delete.
- [ ] Public/anon users cannot read staging rows.
- [ ] Open `/admin/people/import-year2`.
- [ ] Column mapping is visible.
- [ ] Convert the Engineering year 2 Excel file to CSV manually.
- [ ] Upload CSV into `people_import_year2_2569` using Supabase Table Editor.
- [ ] Run `preview_year2_people_import()`.
- [ ] Confirm row count is about 1111.
- [ ] Confirm duplicate student IDs, invalid phones, and invalid emails are surfaced when present.
- [ ] Confirm phone numbers preserve leading zero or restore it when the source has 9 digits.
- [ ] Confirm hidden characters in emails are cleaned.
- [ ] Confirm health data count is detected.
- [ ] Run `import_year2_people_from_staging()`.
- [ ] Confirm inserted/updated/skipped/errors result counts are useful.
- [ ] Confirm `people` rows are inserted or updated.
- [ ] Confirm no health data appears in `people.metadata`.
- [ ] Confirm imported rows do not alter legacy `profiles` directly.
- [ ] Confirm imported rows do not alter `staff_profiles` directly.
- [ ] Confirm public pages do not expose imported `people` rows.

## Admin People Directory

- [ ] Migration `202605230009_people_admin_directory_health.sql` applies successfully.
- [ ] Open `/admin/people` as admin.
- [ ] Public/non-admin users cannot access `/admin/people`.
- [ ] Summary cards show total people, year 2 Excel rows, legacy source counts, linked profile/staff counts, staff applicants, and incomplete contact counts.
- [ ] Search by student ID works.
- [ ] Search by Thai name, English name, nickname, email, and phone works.
- [ ] Source filter works.
- [ ] Year level filter works.
- [ ] Major filter works.
- [ ] Has staff profile filter works.
- [ ] Has participant profile filter works.
- [ ] Has staff application filter works.
- [ ] Missing email/phone/student ID filter works.
- [ ] Data Health panel shows duplicate student ID/email/phone counts.
- [ ] Data Health panel shows missing student ID/email/phone counts.
- [ ] Data Health panel shows unlinked `staff_profiles`, `profiles`, and `staff_applications` counts.
- [ ] Data Health panel shows skipped year2 staging row count if available.
- [ ] No medical condition, drug allergy, or food allergy appears anywhere on `/admin/people`.
- [ ] Mobile cards show name, student ID, major/year, source, and linked badges without horizontal scroll.
- [ ] Detail sections expand on mobile and are not covered by bottom nav.
- [ ] Existing public routes still do not expose `people`.

## People Dedupe / Merge

- [ ] Migration `202605230010_people_dedupe_merge_tools.sql` applies successfully.
- [ ] Open `/admin/people/dedupe` as admin.
- [ ] Public/non-admin users cannot access `/admin/people/dedupe`.
- [ ] Admin tools menu includes People Dedupe.
- [ ] `/admin/people` links to `/admin/people/dedupe`.
- [ ] Duplicate groups load for same student ID.
- [ ] Duplicate groups load for same normalized email.
- [ ] Duplicate groups load for same normalized phone.
- [ ] Similar-name groups appear only as review candidates.
- [ ] Merge review modal opens from a duplicate group.
- [ ] Admin can choose keep record and merge record.
- [ ] Merge is blocked when keep and merge are the same record.
- [ ] Modal warns when both student IDs exist and differ.
- [ ] Modal warns when names differ strongly.
- [ ] Confirmation checkbox is required before merge.
- [ ] Optional merge note is saved.
- [ ] Merge repoints `staff_profiles.person_id`.
- [ ] Merge repoints `profiles.person_id`.
- [ ] Merge repoints `staff_applications.person_id`.
- [ ] Merge repoints `event_participants.person_id` when no same-event collision exists.
- [ ] Merge blocks safely if both people already have participant rows for the same event.
- [ ] Merged record is archived with `merged_into`, `merged_at`, `merged_by`, and `merge_note`.
- [ ] Merged record is hidden from normal `/admin/people`.
- [ ] `change_logs` records the merge.
- [ ] No medical condition, drug allergy, or food allergy is shown or merged.
- [ ] Mobile duplicate cards stack cleanly without horizontal scroll.
- [ ] Existing public routes are unchanged after merge.

## Pending Participant Requests

- [ ] Open `/admin/requests`.
- [ ] Pending requests load.
- [ ] Request diff only highlights changed fields.
- [ ] Approve request.
- [ ] Reject request with note.
- [ ] Toast messages are clear.

## Groups

- [ ] Open `/admin/groups`.
- [ ] Group dashboard loads.
- [ ] Auto group generation works.
- [ ] Save group assignments.
- [ ] Lock assignments.
- [ ] Export data.
- [ ] Staff roster sync still works.
- [ ] Mobile controls are reachable.

## Staff Management

- [ ] Open `/admin/staff`.
- [ ] Staff table loads.
- [ ] Search staff.
- [ ] Filter by position/duty.
- [ ] Filter by group/subgroup.
- [ ] Filter by major.
- [ ] Open staff profile page.
- [ ] Open quick edit modal.
- [ ] Save staff edit.
- [ ] Delete confirmation opens.
- [ ] Cancel delete.
- [ ] Export CSV.
- [ ] Export Excel.
- [ ] Sync staff roster.
- [ ] Mobile cards show profile/edit/delete actions.

## Staff Import

- [ ] Open `/admin/staff/import`.
- [ ] Download template.
- [ ] Upload valid Excel file.
- [ ] Preview rows load.
- [ ] Placeholder cleanup preview is visible.
- [ ] Duplicate detection appears.
- [ ] Missing data warnings appear.
- [ ] Full import mode works.
- [ ] Major-only update mode only updates major.
- [ ] Contact-only update mode only updates contact.
- [ ] Medical-only update mode only updates medical data.
- [ ] Confirm dialog appears before commit.
- [ ] Import success toast shows next step.
- [ ] Sync roster after import.
- [ ] Download flagged rows.

## Staff Operations

- [ ] Open `/admin/staff/operations`.
- [ ] Overview/readiness cards load.
- [ ] Quota dashboard loads.
- [ ] Shortages are visible.
- [ ] Conflicts are visible.
- [ ] Recommendations are readable.
- [ ] Mobile view is card-based and readable.

## Staff Edit Requests

- [ ] Open `/admin/staff/requests`.
- [ ] Requests load.
- [ ] Contact request diff is human-readable.
- [ ] Medical request diff is human-readable.
- [ ] Role/assignment request diff is human-readable.
- [ ] Approve request.
- [ ] Reject request with note.
- [ ] Audit/log is written if visible.

## Admin Staff Attendance

- [ ] Open `/admin/staff/attendance`.
- [ ] Admin attendance page shows the current EventSwitcher event.
- [ ] Admin attendance page shows a selected-event context card and keeps actions usable on mobile.
- [ ] Switching EventSwitcher filters the admin attendance session list without breaking old routes.
- [ ] Session list cards/table show event badges for the selected event.
- [ ] Create attendance session.
- [ ] Create session modal shows the selected event clearly and keeps Thailand time hint.
- [ ] New attendance session stores `event_id` from the currently selected event after applying P5 migration.
- [ ] Existing/legacy sessions with null `event_id` remain visible as fallback and still work.
- [ ] Confirm datetime displays in Asia/Bangkok as entered.
- [ ] Set late_after and verify late behavior.
- [ ] Open session detail.
- [ ] Attendance session detail shows the event name or "กิจกรรมเดิม" for legacy sessions.
- [ ] Legacy/default session detail shows a clear warning before showing QR onsite.
- [ ] Summary cards show total/present/late/missing.
- [ ] Session QR image is visible and scannable.
- [ ] QR card shows event name and session title.
- [ ] Closed/expired/missing QR states show friendly text and do not expose tokens publicly.
- [ ] Copy session QR link.
- [ ] Regenerate QR and confirm old QR no longer works.
- [ ] Close session and confirm QR check-in is blocked.
- [ ] Export attendance CSV.

## Admin Attendance Manual Check-In

- [ ] Search staff in session detail.
- [ ] Filter by status.
- [ ] Mark present.
- [ ] Mark late.
- [ ] Mark absent.
- [ ] Mark excused.
- [ ] Add optional note.
- [ ] Repeat action does not duplicate records.
- [ ] checked_by/method are recorded in exported CSV.

## Admin Scans Staff Personal QR

- [ ] Open attendance session detail.
- [ ] Open "สแกน QR ทีมงาน".
- [ ] Camera permission is requested only after clicking open camera.
- [ ] Scan valid staff personal QR.
- [ ] Attendance is recorded through admin RPC.
- [ ] Invalid QR shows clear error.
- [ ] Staff outside target scope is blocked.
- [ ] Paste raw token works.
- [ ] Paste `staff_identity:<token>` works.
- [ ] Paste URL with `?token=` works.
- [ ] Closing modal stops camera.

## Staff Session QR Check-In

- [ ] Staff scans session QR with phone camera.
- [ ] Staff scan result shows event name when the session event can be resolved.
- [ ] Auth staff checks in directly.
- [ ] Non-Auth staff with remembered identity checks in without retyping email/phone.
- [ ] Non-Auth staff without remembered identity sees verification form.
- [ ] Wrong email/phone does not check in.
- [ ] Staff outside target scope is blocked.
- [ ] Closed session is blocked.
- [ ] Expired QR is blocked.
- [ ] Already checked state is clear.
- [ ] `/staff/attendance` history shows event names when available and keeps old behavior when unavailable.

## Emergency

- [ ] Open emergency page as authorized staff/admin.
- [ ] Unauthorized staff cannot access emergency page.
- [ ] Quick call buttons are one tap.
- [ ] Search participant/staff health data only when authorized.
- [ ] Create incident.
- [ ] Resolve incident.
- [ ] Offline/low-signal warning appears if cached data is used.
- [ ] Sensitive health data is not cached longer than intended.
- [ ] Mobile emergency dock does not overlap bottom nav.

## Announcements Admin

- [ ] Open `/admin/announcements`.
- [ ] EventSwitcher appears on `/admin/announcements`.
- [ ] Create announcement.
- [ ] Assign announcement to the current event.
- [ ] Assign announcement to global/ทุกกิจกรรม.
- [ ] Upload image/PDF if supported.
- [ ] Public announcement appears on public page.
- [ ] Staff-only announcement does not appear publicly.
- [ ] Pin/unpin announcement.
- [ ] Popup mode is dismissible if enabled.
- [ ] Edit announcement.
- [ ] Delete/archive announcement with confirmation.

## Data Health

- [ ] Open `/admin/data-health`.
- [ ] validate_data_integrity loads.
- [ ] Missing major is detected.
- [ ] Placeholder value is detected.
- [ ] Duplicate email/phone/student ID is detected.
- [ ] Orphan group assignment is detected.
- [ ] Orphan staff assignment is detected.
- [ ] Invalid staff role is detected.
- [ ] Download issue CSV.
- [ ] Run clean_placeholders with confirmation.
- [ ] Run normalize_majors with confirmation.
- [ ] Run repair_staff_roles with confirmation.
- [ ] Run repair_orphans with confirmation on test data only.
- [ ] Audit/change log exists where expected.

## Document Center

- [ ] Open `/admin/documents`.
- [ ] Existing Document Center data still loads after nullable `event_id` is added.
- [ ] EventSwitcher appears on Document Center pages.
- [ ] Overview/settings/templates/generate/history show the selected-event context card.
- [ ] Context card explains that document data belongs to the selected event.
- [ ] Context card notes that global templates are shown together where relevant.
- [ ] Switching event reloads project profile, templates, and generated history without breaking legacy data.
- [ ] Open settings.
- [ ] Save project settings.
- [ ] Saved project settings are associated with the selected event.
- [ ] Add budget item.
- [ ] Add schedule item.
- [ ] Add venue.
- [ ] Add equipment.
- [ ] Open templates.
- [ ] Template list shows scope badge: `กิจกรรมนี้` or `ทุกกิจกรรม`.
- [ ] Template filter works for all, selected event, and global.
- [ ] Upload valid `.docx`.
- [ ] Uploaded template is associated with the selected event.
- [ ] Upload form can explicitly choose selected event or global, defaulting to selected event.
- [ ] Global templates remain visible across event selections when present.
- [ ] Invalid file type is rejected.
- [ ] Placeholder detection is visible.
- [ ] Missing placeholder warnings are clear.
- [ ] Open generate page.
- [ ] Select template.
- [ ] Selected template shows whether it is event-specific or global.
- [ ] Generate page clearly states selected event data is used.
- [ ] Missing fields are grouped clearly and do not overflow on mobile.
- [ ] Preview escapes HTML/script-like content.
- [ ] Generate document.
- [ ] Generated document history row is associated with the selected event.
- [ ] Generated version is server-assigned.
- [ ] Download generated DOCX.
- [ ] Open history.
- [ ] History row exists.
- [ ] History mobile cards show event context, template scope, version, status, and download action.

## Guide and Contextual Help

- [ ] Open `/guide`.
- [ ] Search for `เช็กชื่อ`.
- [ ] Search for `QR`.
- [ ] Search for `แก้ไขข้อมูล`.
- [ ] Open `/guide/staff-attendance/session-qr`.
- [ ] Open `/guide/admin-attendance/create-session`.
- [ ] Open `/guide/documents/generate`.
- [ ] Open `/guide/admin/people-import`.
- [ ] Open `/guide/admin/people-directory`.
- [ ] Open `/guide/admin/people-dedupe`.
- [ ] Open `/guide/admin/event-applications`.
- [ ] Open `/guide/admin/promote-event-staff`.
- [ ] Open `/guide/documents/event-documents`.
- [ ] Open `/guide/staff-attendance/event-attendance`.
- [ ] Open an invalid guide topic and confirm friendly fallback.
- [ ] Click HelpButton on `/staff/attendance`.
- [ ] Click HelpButton on `/admin/people/import-year2`.
- [ ] Click HelpButton on `/admin/people`.
- [ ] Click HelpButton on `/admin/people/dedupe`.
- [ ] Click HelpButton on `/events/parent-orientation-staff-2569/staff/apply`.
- [ ] Click HelpButton on `/admin/events/:eventId/applications`.
- [ ] Click HelpButton on Document Center event context card.
- [ ] Click HelpButton on Admin Attendance event context card.
- [ ] HelpDrawer opens with the correct topic.
- [ ] Click `อ่านวิธีใช้เต็ม`.
- [ ] Full guide topic opens.
- [ ] Close HelpDrawer with close button.
- [ ] Close HelpDrawer with Escape.
- [ ] Close HelpDrawer with backdrop click.
- [ ] HelpDrawer is usable on mobile bottom-sheet layout.
- [ ] Thai/English switching updates guide text.
- [ ] No real user data appears in guide examples.

## Parent Orientation Duty Quotas and Excel Export

- [ ] Parent Orientation duty quotas total 130.
- [ ] If `people.name_th = "นายจิรภัทร ตัวอย่าง"` and `people.nickname = "ซาลาเปา"`, staff application/profile check shows `ชื่อ-นามสกุล = นายจิรภัทร ตัวอย่าง` and `ชื่อเล่น = ซาลาเปา`.
- [ ] If `people.name_th` is missing, `people.name_en = "Jiraphat Example"`, and `people.nickname = "Salapao"`, staff application/profile check shows English full name and nickname separately.
- [ ] If both full-name fields are missing but nickname exists, staff application/profile check shows `ชื่อ-นามสกุล = ไม่พบชื่อ-นามสกุลในระบบ` and shows the nickname only in `ชื่อเล่น`.
- [ ] Safe person preview never uses nickname as fallback for full legal/display name.
- [ ] Admin application review title uses full name first and shows nickname as secondary text.
- [ ] Data Health shows possible `people` rows where full name equals nickname without auto-fixing them.
- [ ] Concurrent submissions do not assign two applicants into the same final remaining slot.
- [ ] `/admin/system-readiness` loads for admins.
- [ ] `/admin/system-readiness` shows schema/RPC/RLS/Parent Orientation quota status.
- [ ] `/admin/system-readiness` copy-summary button works.
- [ ] Applicant can select multiple preferred duties.
- [ ] Duty cards show quota, remaining slots, and descriptions.
- [ ] Selected duty cards show text `เลือกแล้ว`.
- [ ] A full duty is disabled/dimmed and shows `รับเต็มจำนวนแล้ว`.
- [ ] Full duty helper says `ฝ่ายนี้รับครบตามจำนวนแล้ว กรุณาเลือกฝ่ายอื่น`.
- [ ] Backend does not assign into a full duty when another selected duty or general fallback is available.
- [ ] Smaller/specialized quotas fill before general according to priority.
- [ ] General fallback works when selected duties are full.
- [ ] All-full state returns pending assignment and does not fail the application.
- [ ] Confirmation summary shows `ฝ่ายที่ระบบจัดให้เบื้องต้น`.
- [ ] Confirmation summary shows name, student ID, major, year, CMU Mail, phone, selected duties, rehearsal answer, event-day answer, availability, note, identity status, and preliminary assigned duty.
- [ ] Confirmation and success screens say the duty is preliminary and admins may adjust it later.
- [ ] Success screen asks the applicant to screenshot the page.
- [ ] Admin application review shows assigned duty, assignment method, and assignment note.
- [ ] Admin can filter by assigned duty.
- [ ] Admin can filter by assignment method.
- [ ] Admin can manually override assigned duty.
- [ ] Admin sees warning `ฝ่ายนี้เต็มแล้ว หากบันทึกต่อจะเกินโควต้า` before over-quota override.
- [ ] Admin can export Excel for all applications.
- [ ] Admin can export Excel for current filters.
- [ ] Admin can export Excel by duty from the duty summary.
- [ ] Excel export requires the personal-data confirmation checkbox.
- [ ] Excel export writes a `change_logs` audit record without storing applicant row data.
- [ ] Excel includes `people` base data and application-submitted data.
- [ ] Excel export warning appears before files that include health/limitation text.
- [ ] Exported file uses `.xlsx`, not CSV-only.
- [ ] Mobile admin review keeps export actions inside a readable card and does not cover bottom navigation.

## Change Logs

- [ ] Open `/admin/logs`.
- [ ] Logs load.
- [ ] Date/time is understandable.
- [ ] Data health repairs are logged.
- [ ] Approve/reject actions are logged if expected.

## Mobile QA

- [ ] iPhone SE width: no horizontal scroll.
- [ ] iPhone SE width: staff application stepper, duty cards, confirmation screen, and success screen do not overflow.
- [ ] iPhone SE width: `/events/parent-orientation-staff-2569/profile-check`, `/admin/events/:eventId/applications`, `/admin/people/update-requests`, and `/admin/people` do not horizontally scroll.
- [ ] iPhone SE width: public `/`, `/events`, event detail, staff application, `/edit`, `/announcements`, and `/guide` do not horizontally scroll.
- [ ] iPhone SE width: admin dashboard, admin applications, people directory, year 2 import, staff list, attendance, documents, announcements, and data health either show mobile cards or clean responsive layouts.
- [ ] iPhone SE width: public search appears near top.
- [ ] iPhone SE width: bottom nav does not cover CTAs.
- [ ] iPhone SE width: modals fit screen and scroll internally.
- [ ] Common Android width: camera scanner opens and fallback input works.
- [ ] Common Android width: bottom nav labels do not overflow.
- [ ] Common Android width: sticky action bars include safe-area padding and do not cover submit buttons.
- [ ] Tablet: admin tables/forms remain readable.
- [ ] Desktop: tables use readable spacing.
- [ ] Large desktop: content max-width prevents overly long lines.
- [ ] Long names, emails, student IDs, phone numbers, and badges wrap without breaking cards.
- [ ] Mobile admin application review uses one obvious primary action and keeps secondary actions readable.
- [ ] Phone fields open a phone keypad on mobile; email fields open an email keyboard.
- [ ] Full name and nickname display correctly and never duplicate by fallback.
- [ ] CMU Mail mismatch warning is clear, calm, and does not block submitting when admin review is allowed.
- [ ] Not-found student flow explains that admins will review identity later.
- [ ] Full duty cards remain visible, disabled, and readable.
- [ ] Confirmation screen appears before staff application submit.
- [ ] Success screen asks the applicant to screenshot the page.
- [ ] Excel export warning appears before downloading applicant data.
- [ ] Admin application filters are usable on mobile and use `ทั้งหมด` only as all-results filters.
- [ ] Form selects use `โปรดเลือก` instead of `ทั้งหมด`.

## Accessibility

- [ ] Keyboard can reach top nav, More menu, forms, modals.
- [ ] Focus visible on links/buttons/inputs.
- [ ] Modal opens with focus inside.
- [ ] Modal Tab focus stays inside the dialog and returns to the trigger on close.
- [ ] Escape closes modal/menu/filter sheet.
- [ ] Backdrop click closes modal/menu/filter sheet.
- [ ] Mobile More menu and Filter sheet focus the sheet on open and restore focus after close.
- [ ] Important icon-only buttons have aria-label.
- [ ] Toast has aria-live.
- [ ] Errors appear near fields where possible.
- [ ] Status badges include text, not color only.
- [ ] QR/camera flows have manual fallback input.
- [ ] Color contrast rough check passes for primary text, buttons, warning/error states.

## Build and Release

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npm run check:production-readiness` passes.
- [ ] No service_role key is exposed in frontend.
- [ ] No raw real user data appears in Guide/Preview mock cards.
- [ ] Git status is clean before deployment.
