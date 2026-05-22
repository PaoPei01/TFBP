# TFBP Manual QA Checklist

Use this checklist before real event operations and after every production-readiness change.

## Test Setup

- [ ] Supabase project points to the intended environment.
- [ ] Latest migrations are applied.
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
- [ ] Default event `สานสัมพันธ์ 69 / Entaneer Bonding 69` appears after applying migrations.
- [ ] Event card action opens `/events/entaneer-bonding-69`.
- [ ] Event detail page shows event status and coming-soon actions.
- [ ] Event detail page links back to the existing participant list and `/edit`.
- [ ] `/` still loads the existing public participant list and does not depend on the events table.
- [ ] Mobile `/events` cards fit iPhone SE width without horizontal scroll.

## Announcements

- [ ] Open `/announcements`.
- [ ] Public visible announcements load.
- [ ] Pinned/important announcements are clear.
- [ ] Open announcement detail.
- [ ] Image/file links, if present, open correctly.
- [ ] Staff-only/admin-only announcements are not visible publicly.

## Guide

- [ ] Open `/guide`.
- [ ] Role selector cards scroll to the correct sections.
- [ ] Participant guide exists.
- [ ] Staff guide exists.
- [ ] Attendance guide exists.
- [ ] Admin guide exists.
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
- [ ] Admin Events page is read-only in this phase.
- [ ] Public/non-admin users cannot access `/admin/events`.
- [ ] Existing `/admin/dashboard` still loads normally.

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
- [ ] Create attendance session.
- [ ] Confirm datetime displays in Asia/Bangkok as entered.
- [ ] Set late_after and verify late behavior.
- [ ] Open session detail.
- [ ] Summary cards show total/present/late/missing.
- [ ] Session QR image is visible and scannable.
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
- [ ] Auth staff checks in directly.
- [ ] Non-Auth staff with remembered identity checks in without retyping email/phone.
- [ ] Non-Auth staff without remembered identity sees verification form.
- [ ] Wrong email/phone does not check in.
- [ ] Staff outside target scope is blocked.
- [ ] Closed session is blocked.
- [ ] Expired QR is blocked.
- [ ] Already checked state is clear.

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
- [ ] Create announcement.
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
- [ ] Open settings.
- [ ] Save project settings.
- [ ] Add budget item.
- [ ] Add schedule item.
- [ ] Add venue.
- [ ] Add equipment.
- [ ] Open templates.
- [ ] Upload valid `.docx`.
- [ ] Invalid file type is rejected.
- [ ] Placeholder detection is visible.
- [ ] Missing placeholder warnings are clear.
- [ ] Open generate page.
- [ ] Select template.
- [ ] Preview escapes HTML/script-like content.
- [ ] Generate document.
- [ ] Generated version is server-assigned.
- [ ] Download generated DOCX.
- [ ] Open history.
- [ ] History row exists.

## Guide and Contextual Help

- [ ] Open `/guide`.
- [ ] Search for `เช็กชื่อ`.
- [ ] Search for `QR`.
- [ ] Search for `แก้ไขข้อมูล`.
- [ ] Open `/guide/staff-attendance/session-qr`.
- [ ] Open `/guide/admin-attendance/create-session`.
- [ ] Open `/guide/documents/generate`.
- [ ] Open an invalid guide topic and confirm friendly fallback.
- [ ] Click HelpButton on `/staff/attendance`.
- [ ] HelpDrawer opens with the correct topic.
- [ ] Click `อ่านวิธีใช้เต็ม`.
- [ ] Full guide topic opens.
- [ ] Close HelpDrawer with close button.
- [ ] Close HelpDrawer with Escape.
- [ ] Close HelpDrawer with backdrop click.
- [ ] HelpDrawer is usable on mobile bottom-sheet layout.
- [ ] Thai/English switching updates guide text.
- [ ] No real user data appears in guide examples.

## Change Logs

- [ ] Open `/admin/logs`.
- [ ] Logs load.
- [ ] Date/time is understandable.
- [ ] Data health repairs are logged.
- [ ] Approve/reject actions are logged if expected.

## Mobile QA

- [ ] iPhone SE width: no horizontal scroll.
- [ ] iPhone SE width: public search appears near top.
- [ ] iPhone SE width: bottom nav does not cover CTAs.
- [ ] iPhone SE width: modals fit screen and scroll internally.
- [ ] Common Android width: camera scanner opens and fallback input works.
- [ ] Common Android width: bottom nav labels do not overflow.
- [ ] Tablet: admin tables/forms remain readable.
- [ ] Desktop: tables use readable spacing.
- [ ] Large desktop: content max-width prevents overly long lines.

## Accessibility

- [ ] Keyboard can reach top nav, More menu, forms, modals.
- [ ] Focus visible on links/buttons/inputs.
- [ ] Modal opens with focus inside.
- [ ] Escape closes modal/menu/filter sheet.
- [ ] Backdrop click closes modal/menu/filter sheet.
- [ ] Important icon-only buttons have aria-label.
- [ ] Toast has aria-live.
- [ ] Errors appear near fields where possible.
- [ ] Status badges include text, not color only.
- [ ] QR/camera flows have manual fallback input.
- [ ] Color contrast rough check passes for primary text, buttons, warning/error states.

## Build and Release

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] No service_role key is exposed in frontend.
- [ ] No raw real user data appears in Guide/Preview mock cards.
- [ ] Git status is clean before deployment.
