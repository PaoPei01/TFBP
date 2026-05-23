# Real Event Readiness Checklist

Use this checklist before running TFBP for a real event. It focuses on practical operations, privacy, fallback plans, and post-event closeout.

## Before Opening Staff Recruitment

- [ ] Confirm the target Supabase project is staging or production as intended.
- [ ] Confirm a database backup/snapshot is available.
- [ ] Confirm `docs/MULTI_EVENT_RELEASE_GATE.md` is complete for this release.
- [ ] Confirm `npm run build`, `npm run lint`, and `npm run check:multi-event-staging` are recorded.
- [ ] Confirm public event page content is accurate: date, time, location, eligibility, duties, dress code.
- [ ] Confirm no budget, medical data, private contact data, or staff QR tokens appear publicly.
- [ ] Confirm staff application form has friendly Thai validation messages.
- [ ] Confirm staff application status lookup requires matching email and phone.
- [ ] Prepare admin accounts for reviewers.
- [ ] Prepare support contact/channel for applicants who cannot verify their identity.

## During Recruitment

- [ ] Monitor staff application count daily.
- [ ] Check that applicants can submit from mobile phones.
- [ ] Check that failed submissions show friendly next steps.
- [ ] Watch for duplicate applicants or suspicious repeated submissions.
- [ ] Keep public announcements short and event-specific.
- [ ] Do not export health/limitations data unless it is explicitly needed for safe duty assignment.
- [ ] Keep a manual fallback list for urgent applicants who cannot submit online.

## Reviewing Applications

- [ ] Review applications in `/admin/events/:eventId/applications`.
- [ ] Use filters for status, preferred duty, final duty, year level, major, rehearsal availability, and event-day availability.
- [ ] Assign final duty before or during approval when possible.
- [ ] Use `waitlisted` for applicants who may be accepted later.
- [ ] Use review notes for decisions that need context.
- [ ] Confirm approved applicants missing final duty are visible in the summary.
- [ ] Promote approved applicants to `event_staff` only after the final duty/team decision is clear.
- [ ] Confirm repeated promotion does not duplicate `event_staff`.

## Exporting Staff List

- [ ] Export an approved-only list for operational planning.
- [ ] Export by final duty for team leads.
- [ ] Export rehearsal list before rehearsal day.
- [ ] Export contact list only for people who need to coordinate staff.
- [ ] Use full admin export only when sensitive/detail fields are explicitly needed.
- [ ] Store exports in a restricted location.
- [ ] Do not share health/limitations fields in general chat groups.
- [ ] Verify Thai names, duties, phone numbers, and rehearsal availability before distribution.

## Before Event Day

- [ ] Confirm all active events and selected current event are correct.
- [ ] Confirm announcements are scoped to the correct event.
- [ ] Confirm Document Center templates and generated documents are scoped or clearly marked global.
- [ ] Create a test attendance session and run:
  - [ ] staff session QR scan
  - [ ] staff personal QR admin scan
  - [ ] manual check-in
  - [ ] attendance export
- [ ] Close or mark test sessions clearly so they are not mistaken for real records.
- [ ] Confirm QR scanner fallback paste input works.
- [ ] Confirm staff without Auth can verify once and use remembered identity.
- [ ] Confirm bottom navigation does not cover primary buttons on iPhone SE width.
- [ ] Prepare printed/manual fallback sheets for attendance and emergency notes.

## Attendance Day

- [ ] Admin opens the correct event before creating attendance sessions.
- [ ] Create attendance sessions with Thailand local time.
- [ ] Confirm session QR displays the correct event/session name.
- [ ] Assign one admin to show QR and one admin to handle manual fallback.
- [ ] Use manual check-in when camera/network/login fails.
- [ ] Use staff personal QR scan only inside an active attendance session.
- [ ] Keep an eye on present/late/missing counts.
- [ ] Export attendance after major checkpoints.
- [ ] Do not expose personal QR tokens or staff contact data publicly.
- [ ] Record any incident where online check-in failed and how it was resolved.

## Emergency/Data Privacy

- [ ] Emergency access is limited to authorized emergency/admin users.
- [ ] Health/limitations data is used only for safety and duty assignment.
- [ ] Emergency notes are not posted in public channels.
- [ ] Public event pages show only public rain/contingency summaries.
- [ ] Staff and participant contact exports are shared only with people who need them.
- [ ] Lost/stolen admin device is reported immediately and account access is revoked/reset.
- [ ] Any suspected data leak is documented with time, affected data, and mitigation.

## After Event

- [ ] Close attendance sessions.
- [ ] Export final attendance and staff lists.
- [ ] Archive staff application exports in a restricted location.
- [ ] Remove temporary access for reviewers who no longer need admin rights.
- [ ] Review change logs for unusual admin activity.
- [ ] Record operational issues and fixes needed before the next event.
- [ ] Confirm public pages no longer advertise closed recruitment as open.
- [ ] Keep database backup and release notes with the final commit hash.
- [ ] Decide whether to archive, complete, or keep the event active for reports.
