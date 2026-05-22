# TFBP System UX/UI Audit

Date: 2026-05-22  
Scope: React + Vite + TypeScript + Supabase app for public participant search, edit requests, staff operations, attendance, emergency tools, announcements, data health, and Document Center.

This audit is based on a repository-wide static review of routes, pages, UI components, services, migrations, CSS, and current product flows. It is intentionally product-quality focused, not only a code review.

## 1. Executive Summary

### Overall Status

TFBP is feature-rich and close to a real operations platform. The strongest recent improvements are the unified staff/admin login, mobile-aware public search, staff profile verification, staff attendance with QR/manual fallback, staff avatar upload, and the new Guide Center. The app has the right building blocks for live event use.

The main UX risk is not missing capability; it is density. Many pages expose too many controls at once, especially admin/staff management, Document Center settings, data health, and attendance session detail. On mobile, the system often works, but several flows depend on dense cards, long forms, tables, or modals that can slow tired staff under pressure.

### Biggest Strengths

- Thai-first UX is present across most pages, with English fallback where needed.
- Public participant search is privacy-aware and does not intentionally expose contact or health fields.
- Staff without Supabase Auth are now supported in attendance and profile verification flows.
- Attendance has multiple fallback modes: session QR, verified email+phone, manual check-in, and staff personal QR.
- Core admin actions use Supabase RPCs for important writes such as attendance and document project save.
- Mobile bottom nav, Mobile More menu, mobile filter sheet, sticky actions, and responsive data table patterns already exist.
- Modal and toast components include baseline accessibility attributes.
- Data Health and import preview exist, which is critical for operational reliability.
- Document Center has moved important version/profile writes server-side.
- Staff avatar upload uses a storage-efficient path strategy rather than base64 in database.

### Biggest Risks

- `src/styles.css` is almost 5,000 lines and mixes global tokens, components, page-specific styles, mobile rules, and feature styles. This makes regressions likely.
- Several large pages combine data fetching, filtering, form state, modals, tables, and exports in one component, increasing maintenance cost.
- Error handling still often passes raw Supabase/Postgres error messages to users through `errorMessage`.
- Some date/time display still uses `new Date(...).toLocaleString(...)` directly instead of the shared Bangkok helper.
- Admin and staff pages rely on many visible controls; the primary action is not always obvious on small screens.
- Document Settings is a very long form with repeated row groups; it is functionally powerful but high-friction on mobile.
- Some dense mobile rows still show too many action buttons at once.
- Local verified staff identity is intentionally minimal, but the UX should make expiry/change identity clearer.
- QR/camera flows are implemented, but camera permissions, fallback input, and result recovery need repeated real-device testing.
- Some admin direct table writes remain for announcements and document templates; they may be acceptable with RLS, but server-side RPCs are safer for operational auditing.

### Top 10 Changes That Improve Usability Most

1. Add a global friendly error sanitizer so raw RPC/Postgres messages do not reach users.
2. Add explicit mobile safe-area padding for pages with sticky actions, not only `:has()`-based spacing.
3. Add Thailand timezone hints near attendance datetime fields.
4. Keep Staff Attendance focused on two actions: show my QR and scan attendance QR; keep history secondary.
5. Keep Admin Attendance session detail grouped into Summary, Session QR, and Check-in tools only.
6. Convert long admin/staff/document forms into collapsible sections with sticky safe submit actions.
7. Reduce visible table columns on mobile using `mobileHidden` and prioritize mobile row actions.
8. Standardize PageHeader usage on Staff Management, Staff Import, Auth Login, Document Center pages.
9. Split `styles.css` into feature CSS files only after current UI stabilizes.
10. Add a real event-day QA checklist and run it on iPhone SE, common Android, tablet, and desktop.

## 2. User Roles and Main Tasks

### Participant

Main tasks:
- Search their name and group.
- Open participant profile modal.
- Verify with email + phone.
- Review group information.
- Submit an edit request.
- Read announcements and guide content.

Current pain points:
- Public flow is much cleaner than before, but participant modal CTA can still feel like a dead end if `/edit` verification data is mistyped.
- Privacy concepts appear in multiple places; copy is good but should stay short on mobile.
- Friend/group/staff cards can distract from the core edit task if not secondary.

Recommended ideal flow:
- Home page opens with search immediately visible.
- Participant searches name, sees only safe fields, opens modal, then taps one clear CTA: "ตรวจสอบ/แก้ไขข้อมูลของฉัน".
- `/edit` shows stepper, verifies identity, displays group if available, then puts edit request form first.
- Group/friend recommendations stay optional and secondary.

### Staff Without Auth

Main tasks:
- Verify identity with email + phone.
- Use `/staff/attendance` without Supabase login.
- Keep verified identity remembered on the device.
- Show personal QR for admin-assisted check-in.
- Scan a session QR with in-browser camera or fallback input.
- Clear/change remembered identity.

Current pain points:
- The concept of "personal QR" vs "session QR" is easy to confuse; current copy is mostly clear but must remain short and consistent.
- Expired remembered identity handling is silent; users are simply asked to verify again.
- Staff without Auth cannot upload avatar files from verified profile flow, which is secure but should be explained where expected.

Recommended ideal flow:
- `/staff/attendance` first screen shows current identity or a short verification form.
- After verification, only two large actions appear: "แสดง QR ของฉัน" and "สแกน QR รอบเช็กชื่อ".
- "เปลี่ยนบัญชีทีมงานนี้" is visible but quiet.
- All errors say exactly what to do next: ask admin, request new QR, retry, or verify again.

### Staff With Auth

Main tasks:
- Login through `/login`.
- Open Staff Mode.
- View profile and edit safe fields.
- Upload profile photo.
- Check attendance.
- View group responsibilities.
- Access emergency tools if allowed.

Current pain points:
- Staff dashboard is task-first but can still compete with navigation density.
- Staff profile edit has good avatar UI, but sensitive request modal currently labels fields as raw keys in one place.
- Attendance history is useful but should remain secondary on mobile.

Recommended ideal flow:
- After login, staff lands on a compact dashboard with primary next action first.
- Attendance is one tap from bottom nav or Staff Mode.
- Profile edit shows avatar and public preview first, then visibility settings, then sensitive request.

### Admin

Main tasks:
- Login securely.
- Monitor dashboard.
- Manage participants, groups, staff, imports, data health.
- Create attendance sessions quickly.
- Show/copy QR.
- Manually check staff in.
- Scan staff personal QR.
- Export data.
- Manage announcements and documents.

Current pain points:
- Admin tools are broad; Mobile More menu helps, but desktop Tools menu is still dense.
- Admin dashboard and Staff Management tables are data-heavy and action-heavy.
- Staff Import and Document Settings are powerful but high-friction on mobile.
- Data Health repair actions can be intimidating; explanations are present but could be more specific per action.

Recommended ideal flow:
- Dashboard shows only live-critical status and next actions.
- Attendance creation requires minimal fields by default; advanced fields collapsed.
- Staff/participant management uses filters in mobile sheets and desktop panels.
- Repair/import/document operations always show preview, confirmation, result, and next step.

### Emergency Staff

Main tasks:
- Access emergency page fast.
- See emergency contact shortcuts.
- Search/review sensitive health info only when authorized.
- Create and update incident records.

Current pain points:
- Emergency page has local fallback/cache behavior, but sensitivity rules need ongoing QA.
- Red/danger visual hierarchy must stay reserved for emergency actions, not generic warnings.
- Offline stale-data warning must be highly visible but not noisy.

Recommended ideal flow:
- Emergency page opens with one-tap call actions.
- Search and incident creation are immediately reachable.
- Sensitive data is clearly marked restricted.
- Offline data shows age and "verify before acting" warning.

## 3. Device Audit

### iPhone SE / 375px Width

Navigation usability:
- Mobile top nav is simplified and bottom nav is role-aware, which is good.
- More menu is required for many tools; it must always close on click/Escape/backdrop.

Form usability:
- Single-column forms generally work.
- Long admin forms such as Document Settings and Staff Management edit modal remain difficult.

Table/card usability:
- ResponsiveDataTable converts to cards; key actions are usually available.
- Some mobile cards still show dense action groups, especially attendance manual check-in.

Button visibility:
- Sticky bars and bottom nav can coexist, but critical pages should not rely only on `:has()` for spacing.

Bottom nav overlap:
- Current CSS has safe-area variables and `:has()` rules. Add explicit padding on `.has-sticky-actions` as fallback.

Modal usability:
- Modal becomes bottom-sheet-like through CSS, focus handling exists.
- Very long modal bodies can still feel cramped.

QR/camera usability:
- Camera modals request permission after tapping open camera, which is correct.
- Fallback input exists, critical for camera denial or weak browser support.

### Common Mobile / 390-430px

Navigation usability:
- Public home and guide are accessible; guide is in More menu and desktop top nav, not bottom nav, which avoids clutter.

Form usability:
- Participant edit and staff attendance are mostly task-focused.
- Admin creation modals should show timezone hints and minimal fields.

Table/card usability:
- Mobile cards are readable, but row action density should be reduced where possible.

Button visibility:
- Most primary actions are large enough; some inline action groups use small buttons but acceptable for admin tools.

Bottom nav overlap:
- Needs explicit fallback spacing for sticky action pages and scanner modals.

Modal usability:
- ConfirmDialog/Modal baseline accessibility is solid.
- Scanner modal content should be tested on real devices for camera frame height.

QR/camera usability:
- QR frame is large enough. Need test with phone camera and in-browser camera.

### Tablet

Navigation usability:
- Top nav may still show many items but is acceptable.
- Some pages would benefit from 2-column layouts rather than full-width cards.

Form usability:
- Document Settings and Admin Staff edit modal can use two columns, but section grouping is more important.

Table/card usability:
- Tables are useful on tablet if columns are not too dense.

Button visibility:
- Good overall.

Bottom nav overlap:
- Depends on breakpoint; tablet should avoid bottom nav if desktop nav is available.

Modal usability:
- Good when modal width and scrolling are controlled.

QR/camera usability:
- Tablet can show QR and scanner comfortably.

### Desktop

Navigation usability:
- Desktop top nav is usable but Tools menu has many entries. Grouping helps.

Form usability:
- Desktop forms sometimes span too wide or show too many fields at once.

Table/card usability:
- Tables are appropriate but should use sticky headers and density controls.

Button visibility:
- Export/action buttons are visible but can compete with primary actions.

Bottom nav overlap:
- Not applicable.

Modal usability:
- Long edit modals need section navigation or more progressive disclosure.

QR/camera usability:
- Admin session detail works well for showing QR; scanner is secondary.

### Large Desktop

Navigation usability:
- App should cap content width to avoid long lines. Most pages use page stacks, but some dashboard grids may feel sparse.

Form usability:
- Large admin forms need constrained sections; wide full-page forms become hard to scan.

Table/card usability:
- Tables benefit from sticky headers and readable spacing.

Button visibility:
- Good, but visual hierarchy should avoid too many same-weight secondary buttons.

Modal usability:
- Modals should not become giant full-screen forms.

QR/camera usability:
- QR can be shown large enough for staff phones.

## 4. Page-by-Page Audit

### `/` Public Participant List

Purpose:
- Public, privacy-safe participant search and group lookup.

Current UX problems:
- Search is visible early and filters are mobile-friendly.
- Participant card keyboard handler supports Enter; Space should also activate for button-like cards.
- Error state shows raw error if service returns a technical message.

UI clutter level: low  
Mobile readiness: good  
Accessibility issues:
- Card with `role="button"` should support Space key and could use clearer aria label.

Recommended improvements:
- Keep privacy notice compact on mobile.
- Add Space key activation.
- Keep filters in bottom sheet.

Safe quick wins:
- Add Space key support on participant cards.
- Sanitize raw service errors.

Risky/deeper refactors:
- Full virtualization for very large public lists if data grows.

### `/announcements` and `/announcements/:id`

Purpose:
- Public event information hub.

Current UX problems:
- Basic cards are clear.
- Needs ongoing audit for staff-only/public audience separation.

UI clutter level: low  
Mobile readiness: good  
Accessibility issues:
- Ensure image/file links have labels when uploads are added.

Recommended improvements:
- Add empty state and loading skeleton consistency if not present.

Safe quick wins:
- Friendly error fallback through shared error handling.

Risky/deeper refactors:
- Signed URL handling for staff-only files.

### `/guide`

Purpose:
- Help participants, staff, and admins understand the system.

Current UX problems:
- The page is task-based and uses safe fake data.
- It is available from top nav and mobile More, not bottom nav.

UI clutter level: low  
Mobile readiness: good  
Accessibility issues:
- FAQ uses native details, which is keyboard accessible.

Recommended improvements:
- Add contextual links from complex attendance/document pages to the guide.

Safe quick wins:
- None urgent.

Risky/deeper refactors:
- None.

### `/edit` Participant Edit Request

Purpose:
- Verify identity, show optional group info, submit edit request.

Current UX problems:
- Stepper and sections are much clearer now.
- Group/friends are optional, which protects the primary task.
- Friend section is collapsed and secondary.

UI clutter level: medium  
Mobile readiness: good  
Accessibility issues:
- Good inline verification error.
- Sticky submit requires safe-area QA.

Recommended improvements:
- Add "only changed fields will be reviewed" copy near submit.
- Consider disabling submit until changed values differ from current values.

Safe quick wins:
- Error sanitizer.

Risky/deeper refactors:
- Field diff detection and partial submit preview.

### `/login` and `/admin` Unified Login

Purpose:
- Staff/admin Auth login.

Current UX problems:
- Flow correctly checks admin then staff.
- Page name is now conceptually correct.
- Existing signed-in account card is clear.

UI clutter level: low  
Mobile readiness: good  
Accessibility issues:
- Good labels, but route-state messages can be expanded for denied role-specific cases.

Recommended improvements:
- Add link to `/guide` for confused users.

Safe quick wins:
- Error sanitizer already protects lower-level failures.

Risky/deeper refactors:
- Centralized auth shell if more auth flows appear.

### `/staff/attendance`

Purpose:
- Staff attendance home for Auth and non-Auth staff.

Current UX problems:
- Strong two-action design: show my QR and scan attendance QR.
- Remembered verified identity is shown.
- Auth staff history appears below, which is appropriate.

UI clutter level: low  
Mobile readiness: good  
Accessibility issues:
- Action cards are buttons with clear text.

Recommended improvements:
- Add explicit "remembered on this device for 7 days" helper.
- Add retry card if authenticated attendance load fails.

Safe quick wins:
- Improve error state to include retry and plain-language fallback.

Risky/deeper refactors:
- Offline mode for attendance history.

### `/staff/attendance/scan`

Purpose:
- Direct QR link check-in.

Current UX problems:
- Handles Auth, remembered verified identity, and email+phone fallback.
- Result states explain recovery steps.

UI clutter level: low  
Mobile readiness: good  
Accessibility issues:
- Result status should translate raw record status in the result meta.

Recommended improvements:
- Use friendly status labels in result meta.

Safe quick wins:
- Error sanitizer.

Risky/deeper refactors:
- Preserve intended scan URL through Auth login for staff accounts.

### `/staff/profile/qr`

Purpose:
- Staff personal QR access through verification.

Current UX problems:
- Secure concept: personal QR is admin-assisted, not self check-in.
- Needs to stay very distinct from session QR.

UI clutter level: low  
Mobile readiness: good  
Accessibility issues:
- QR image should have clear alt text.

Recommended improvements:
- Add expiry/remembered identity guidance if using cached identity.

Safe quick wins:
- None urgent.

Risky/deeper refactors:
- Token lifecycle UX and revocation history.

### `/staff/profile/verify`

Purpose:
- Staff without Auth can edit safe public profile fields and submit sensitive requests.

Current UX problems:
- Good explanation that this is not operational staff login.
- Avatar upload is intentionally unavailable, with explanation.
- Sensitive request modal still uses mixed/raw field names in some places.

UI clutter level: medium  
Mobile readiness: okay  
Accessibility issues:
- Modal field labels are mostly understandable, but some English technical labels remain.

Recommended improvements:
- Use Thai labels for all sensitive request fields.
- Show request status with friendly cards.

Safe quick wins:
- Add clearer loading labels and avoid duplicate save actions.

Risky/deeper refactors:
- Verified upload flow through secure signed upload or edge function.

### `/staff/profile/edit`

Purpose:
- Auth staff public profile editing and avatar upload.

Current UX problems:
- Avatar upload UI is good and not raw file input.
- Sensitive request modal maps over raw keys, showing labels like `drug_allergy`.

UI clutter level: medium  
Mobile readiness: okay  
Accessibility issues:
- Raw key labels reduce recognition and create language mismatch.

Recommended improvements:
- Replace raw sensitive request labels with Thai/English labels and section headings.

Safe quick wins:
- Add field-label mapping.

Risky/deeper refactors:
- Split profile preview and form into route-level subcomponents.

### `/staff` Staff Dashboard

Purpose:
- Staff operations home.

Current UX problems:
- Task-first layout is present.
- Needs live-event ordering: attendance or emergency should be first when permitted.

UI clutter level: low/medium  
Mobile readiness: good  
Accessibility issues:
- Check action cards are real links/buttons with text.

Recommended improvements:
- Ensure emergency action is visually distinct but not over-red unless active.

Safe quick wins:
- None urgent.

Risky/deeper refactors:
- Personalized dashboard ordering by permission and event state.

### `/staff/directory`

Purpose:
- Staff internal directory.

Current UX problems:
- Uses ResponsiveDataTable/card patterns.
- Must avoid exposing hidden contacts.

UI clutter level: medium  
Mobile readiness: okay  
Accessibility issues:
- Ensure filter controls are not desktop-only.

Recommended improvements:
- Apply MobileFilterSheet if not already present.

Safe quick wins:
- Error sanitizer.

Risky/deeper refactors:
- Role-aware column personalization.

### `/staff/my-group`

Purpose:
- Staff group responsibilities.

Current UX problems:
- Mobile-oriented page likely matches field use.
- Needs offline/weak-signal fallback for roster basics if event day requires it.

UI clutter level: medium  
Mobile readiness: good  
Accessibility issues:
- Quick filters should expose selected state; current role tab pattern helps.

Recommended improvements:
- Add stale data timestamp if data is cached later.

Safe quick wins:
- Error sanitizer.

Risky/deeper refactors:
- Offline roster snapshot.

### `/staff/emergency` and `/admin/emergency`

Purpose:
- Emergency contact/search/incident support.

Current UX problems:
- Emergency quick dock exists and local cache exists.
- Health data access must stay explicit and restricted.

UI clutter level: medium/high  
Mobile readiness: okay  
Accessibility issues:
- Emergency call controls need large targets and strong labels.

Recommended improvements:
- Keep emergency actions at top and avoid red for non-critical info.
- Display offline cache age and warning clearly.

Safe quick wins:
- Error sanitizer and safe-area padding.

Risky/deeper refactors:
- Full incident workflow with server persistence if not already deployed.

### `/admin/dashboard`

Purpose:
- Admin participant management and overview.

Current UX problems:
- Strong functionality, but dense.
- Summary, filters, table, edit modal, delete modal are all present on one page.
- Edit modal maps many fields dynamically, which can produce hard-to-scan form order.

UI clutter level: high  
Mobile readiness: okay  
Accessibility issues:
- Delete confirmation exists through Modal, not browser confirm.
- Table mobile cards are present.

Recommended improvements:
- Keep filters in mobile sheet and desktop panel.
- Split edit modal into sections with a small sticky action footer.
- Hide lower-priority table columns on mobile.

Safe quick wins:
- Add `mobileHidden` to low-priority columns where obvious.
- Error sanitizer.

Risky/deeper refactors:
- Move edit profile form into dedicated component/page.

### `/admin/groups`

Purpose:
- Group generation, save/lock/export.

Current UX problems:
- Large operational page with many controls.
- Needs clear status: unsaved, saved, locked.

UI clutter level: high  
Mobile readiness: okay/poor depending data volume  
Accessibility issues:
- Group color must not be the only meaning.

Recommended improvements:
- Separate generation, review, and lock into steps.

Safe quick wins:
- Better empty/error messages and safe spacing.

Risky/deeper refactors:
- Dedicated wizard for group generation.

### `/admin/staff`

Purpose:
- Staff management table, filters, imports, exports, profile links.

Current UX problems:
- Dense action panel and many table columns.
- Edit modal contains identity, contact, assignment, medical fields in one long body.

UI clutter level: high  
Mobile readiness: okay  
Accessibility issues:
- Many small row action buttons; acceptable for admin but heavy on mobile.

Recommended improvements:
- Use PageHeader instead of raw section-heading.
- Keep import/ops/export actions in secondary action group.
- Split edit modal by sections.

Safe quick wins:
- Standardize PageHeader.
- Hide lower-priority columns in mobile details.

Risky/deeper refactors:
- Move admin staff edit into dedicated `/admin/staff/:id/profile` first.

### `/admin/staff/import`

Purpose:
- Staff import preview and commit.

Current UX problems:
- Preview-first import is strong.
- Import mode is clear.
- The page is still information-heavy on mobile.

UI clutter level: high  
Mobile readiness: okay  
Accessibility issues:
- File input is hidden behind a styled label, which is good.

Recommended improvements:
- Use PageHeader.
- Keep warnings/duplicates as collapsible groups.

Safe quick wins:
- Standardize PageHeader.

Risky/deeper refactors:
- Multi-step import wizard with persistent draft.

### `/admin/staff/operations`

Purpose:
- Staff quota, readiness, conflicts.

Current UX problems:
- Good operational concept.
- Needs event-day "readiness score" as the top signal.

UI clutter level: medium/high  
Mobile readiness: okay  
Accessibility issues:
- Progress bars must include labels; some aria labels exist.

Recommended improvements:
- Separate shortages, conflicts, coverage, and recommendations.

Safe quick wins:
- Error sanitizer.

Risky/deeper refactors:
- Dedicated repair action workflow.

### `/admin/staff/requests`

Purpose:
- Review staff edit requests.

Current UX problems:
- UI is better than raw JSON in recent work, but nested diffs should keep improving.

UI clutter level: medium  
Mobile readiness: okay  
Accessibility issues:
- Approve/reject controls need clear destructive hierarchy.

Recommended improvements:
- Require reject note and show before/after field labels.

Safe quick wins:
- Error sanitizer.

Risky/deeper refactors:
- Diff component shared with participant requests.

### `/admin/staff/attendance`

Purpose:
- Attendance sessions dashboard.

Current UX problems:
- Minimal create modal with advanced details is good.
- Timezone helper exists in code, but the visible form lacks a Thailand timezone hint.

UI clutter level: low/medium  
Mobile readiness: good  
Accessibility issues:
- Datetime fields are labeled but not timezone-contextual.

Recommended improvements:
- Add hint: "เวลาไทย (Asia/Bangkok)" to datetime fields.
- Make error message for create failure friendly.

Safe quick wins:
- Add timezone hints.
- Error sanitizer.

Risky/deeper refactors:
- Session templates.

### `/admin/staff/attendance/:sessionId`

Purpose:
- Session detail: summary, QR, manual check-in, staff personal QR scan, export.

Current UX problems:
- The page is correctly organized into Summary, QR, Check-in tools, then roster.
- Manual buttons can be dense on mobile.
- QR card copy still says staff must sign in, but verified email+phone check-in also works.

UI clutter level: medium  
Mobile readiness: good/okay  
Accessibility issues:
- Scanner modal is accessible through Modal; camera frame needs real-device test.

Recommended improvements:
- Update QR copy to include email+phone verification.
- Keep personal QR scanning inside collapsed tool by default.
- Reduce manual row actions to key statuses on mobile if needed.

Safe quick wins:
- Update QR copy.
- Error sanitizer.

Risky/deeper refactors:
- Bulk status update or action sheet for manual check-in.

### `/admin/announcements`

Purpose:
- Manage public/staff/admin announcements.

Current UX problems:
- Direct table/storage operations are simple but less auditable than RPC.

UI clutter level: medium  
Mobile readiness: okay  
Accessibility issues:
- Archive/delete confirmation should be explicit.

Recommended improvements:
- Add preview mode and audience clarity.

Safe quick wins:
- Error sanitizer.

Risky/deeper refactors:
- Server-side RPC for create/update/delete with audit log.

### `/admin/documents`

Purpose:
- Document Center hub.

Current UX problems:
- Good hub pattern.
- Most UI text is Thai only; acceptable for admin if Thai-first, but English toggle not reflected.

UI clutter level: low  
Mobile readiness: good  
Accessibility issues:
- Action cards are links with text.

Recommended improvements:
- Add language support where consistent.

Safe quick wins:
- None urgent.

Risky/deeper refactors:
- Separate document module layout.

### `/admin/documents/settings`

Purpose:
- Project profile, budget, schedule, venues, equipment.

Current UX problems:
- Very long form; high cognitive load.
- Repeated row grids can be difficult on mobile.
- Save button exists at bottom, but a sticky mobile save could help.

UI clutter level: high  
Mobile readiness: okay/poor for long sessions  
Accessibility issues:
- Many repeated fields with similar labels; difficult for screen reader context.

Recommended improvements:
- Split into collapsible sections: basics, dates/location, people, participants, budget, schedule, venue, equipment.
- Add PageSection/FieldGroup components.

Safe quick wins:
- Error sanitizer.

Risky/deeper refactors:
- Dedicated multi-tab document settings editor.

### `/admin/documents/templates`

Purpose:
- Upload/manage DOCX templates.

Current UX problems:
- Placeholder chips are useful.
- Upload rollback exists in service.

UI clutter level: medium  
Mobile readiness: okay  
Accessibility issues:
- File upload should expose accepted format in text.

Recommended improvements:
- Invalid placeholder warning should remain prominent.

Safe quick wins:
- Error sanitizer.

Risky/deeper refactors:
- Template version diffing.

### `/admin/documents/generate`

Purpose:
- Select template, preview, generate DOCX.

Current UX problems:
- Preview uses escaped HTML in generation helper, but page still uses `dangerouslySetInnerHTML`; this is acceptable only if helper remains the single renderer.
- Generation state should show "ready/missing/generated" clearly.

UI clutter level: medium  
Mobile readiness: okay  
Accessibility issues:
- Preview content may not be screen-reader optimal.

Recommended improvements:
- Add visible readiness state and missing fields grouped by type.

Safe quick wins:
- Error sanitizer.

Risky/deeper refactors:
- Replace HTML preview with structured preview components.

### `/admin/data-health`

Purpose:
- Detect and repair import/data issues.

Current UX problems:
- Overall status and repair actions exist.
- Repair result toast currently includes JSON; this is too technical for real admins.

UI clutter level: medium/high  
Mobile readiness: okay  
Accessibility issues:
- Repair actions use text labels and confirm dialog, good.

Recommended improvements:
- Replace JSON repair result toast with plain Thai summary.
- Add per-action short explanation.

Safe quick wins:
- Error sanitizer.

Risky/deeper refactors:
- Guided repair wizard with before/after preview.

### `/admin/logs`

Purpose:
- Change/audit logs.

Current UX problems:
- Simple table likely sufficient.
- Direct date formatting should use shared helper.

UI clutter level: low/medium  
Mobile readiness: okay  
Accessibility issues:
- Table label needed if not present.

Recommended improvements:
- Use `formatBangkokDateTime`.

Safe quick wins:
- Date helper migration.

Risky/deeper refactors:
- Log filters and detail drawer.

## 5. Component Audit

### Button

What works:
- Supports variants, sizes, fullWidth, loading, icon.
- Loading disables button and sets `aria-busy`.

Needs improvement:
- Loading text is caller-owned, so some buttons may show unchanged text while busy.

Accessibility concerns:
- Icon-only buttons require caller-provided aria-label.

Reusability concerns:
- Good primitive; keep stable.

### Card

What works:
- Supports variants and className.

Needs improvement:
- Too many page sections use cards; visual hierarchy can become noisy.

Accessibility concerns:
- None by itself.

Reusability concerns:
- Good primitive, but should not replace semantic sections everywhere.

### Input

What works:
- Label wraps input.
- Supports hint/error and `aria-describedby`.

Needs improvement:
- Generated `id` from label can include spaces/Thai text; works in DOM but explicit names/ids are cleaner for repeated fields.

Accessibility concerns:
- Repeated dynamic fields with same label may create duplicate ids.

Reusability concerns:
- Good primitive. Consider generated `useId` fallback later.

### Select

What works:
- Supports labels and options.

Needs improvement:
- Check if hint/error parity with Input is needed.

Accessibility concerns:
- Repeated labels may need explicit ids later.

Reusability concerns:
- Good enough.

### Modal

What works:
- `role="dialog"`, `aria-modal`, Escape close, backdrop close, focus on open, focus restore.

Needs improvement:
- `aria-labelledby="modal-title"` is static. Multiple simultaneous modals are unlikely, but unique ids are safer.

Accessibility concerns:
- No focus trap. For short modals this is acceptable, but scanner/long forms could leak focus behind modal.

Reusability concerns:
- Solid baseline.

### Toast

What works:
- `role="status"` and `aria-live`.

Needs improvement:
- No dismiss button and no queue. Acceptable for now.

Accessibility concerns:
- Error uses assertive, good.

Reusability concerns:
- Good primitive.

### PageHeader

What works:
- Consistent title/description/actions/meta.
- Supports compact.

Needs improvement:
- Not all pages use it yet.
- Mobile title sizing needs continued restraint.

Accessibility concerns:
- Good semantic header.

Reusability concerns:
- Should be standard across admin pages.

### ResponsiveDataTable

What works:
- Desktop table plus mobile card pattern.
- Supports density, stickyHeader, mobileTitle/subtitle/meta/actions, mobileHidden, rowTone.

Needs improvement:
- Some pages do not use `mobileHidden` enough.
- If no `mobileActions`, action column can render outside a wrapper.

Accessibility concerns:
- `ariaLabel` optional; important tables should pass it.

Reusability concerns:
- Strong component; keep improving mobile priority usage.

### MobileMoreMenu

What works:
- Dialog role, Escape close, backdrop close, close on link/button click.

Needs improvement:
- Close button label is English-only.
- Focus is not moved into sheet.

Accessibility concerns:
- Add localized close label.

Reusability concerns:
- Good role-aware container.

### MobileFilterSheet

What works:
- Dialog role, Escape/backdrop close, clear/apply actions.

Needs improvement:
- Close label is English-only.
- Focus is not moved into sheet.

Accessibility concerns:
- Add localized close label later or prop.

Reusability concerns:
- Good. Use more consistently on staff directory/data-heavy pages.

### QR Scanner Components

What works:
- Camera permission requested only after user click.
- Rear camera preferred.
- Scanner stops on close/unmount/success.
- Manual fallback input exists.

Needs improvement:
- Duplicated scanner logic between staff personal QR and session QR modals.
- Result copy should be fully plain-language.

Accessibility concerns:
- Camera preview itself is not screen-reader meaningful; fallback input covers accessibility.

Reusability concerns:
- Extract shared scanner lifecycle hook later.

### StaffAvatar

What works:
- Prefers avatar path with signed URL, falls back to legacy URL and initials.
- Avoids broken image.

Needs improvement:
- Signed URL caching policy should be watched for many cards.

Accessibility concerns:
- Avatar should remain decorative unless used as the only identity signal.

Reusability concerns:
- Good shared component.

### EmptyState

What works:
- Exists and is used on public list.

Needs improvement:
- Not every data page uses it; many still use raw `div.empty-state`.

Accessibility concerns:
- Fine.

Reusability concerns:
- Standardize across admin pages.

### LoadingSkeleton

What works:
- Simple and localized aria-label.

Needs improvement:
- Some pages show skeleton and error/content in close proximity if not carefully gated.

Accessibility concerns:
- Good baseline.

Reusability concerns:
- Good.

## 6. Code Organization Audit

### `src/pages`

Findings:
- Several pages are large and own too many concerns:
  - `GuidePage.tsx` 445 lines: acceptable for a static guide but could be split later.
  - `GroupDashboardPage.tsx` 405 lines.
  - `EmergencyDashboardPage.tsx` 357 lines.
  - `VerifyEditPage.tsx` 356 lines.
  - `AdminDashboardPage.tsx` 355 lines.
  - `AdminStaffAttendanceSessionPage.tsx` 335 lines.
  - `StaffManagementPage.tsx` 301 lines.
  - `StaffImportPage.tsx` 285 lines.
  - `StaffAttendancePage.tsx` 285 lines.

Risks:
- Large files increase regression risk.
- Repeated modal/form/table patterns make UX consistency harder.

Recommendations:
- Extract page-local components after behavior stabilizes.
- Start with `AdminStaffAttendanceSessionPage` sections and `DocumentSettingsPage` sections.

### `src/components`

Findings:
- Shared UI primitives are useful and relatively small.
- Attendance scanner components duplicate lifecycle logic.

Recommendations:
- Add a shared `useQrScanner` or `QrScannerFrame` later.
- Keep `StaffAvatar`, `PublicStaffCard`, and upload card as single sources of avatar behavior.

### `src/components/ui`

Findings:
- Design system is present but still thin.
- Good primitives: Button, Card, Input, Modal, ResponsiveDataTable, EmptyState, ConfirmDialog.

Recommendations:
- Add `PageSection`/`FieldGroup` usage to long forms.
- Add unique id generation to Input/Select later.

### `src/components/mobile`

Findings:
- Good mobile-specific primitives exist.
- Mobile More menu and filter sheet are solid.

Recommendations:
- Add localized close labels and focus handling.
- Use explicit safe-area spacers for sticky pages.

### `src/components/attendance`

Findings:
- Scanner components are well-contained and lazy-loaded by pages.
- Duplication exists between admin personal QR scanner and staff session QR scanner.

Recommendations:
- Extract token parsing tests and scanner lifecycle hook later.

### `src/services`

Findings:
- Good service boundaries for profiles, staffProfiles, staffAttendance, documents, dataHealth.
- Many functions throw raw Supabase errors; UI uses `errorMessage`, which currently returns raw message.
- Attendance writes go through RPCs, which is correct.
- Documents project save and generated record are RPC-backed, good.
- Some announcements/document template operations write direct tables/storage.

Recommendations:
- Keep attendance writes RPC-only.
- Add friendly error translation.
- Consider RPCs for announcement mutations if audit trail is required.

### `src/lib`

Findings:
- Shared date/time helper exists.
- Verified staff identity avoids phone/email/medical data in localStorage.
- Types file is large at 645 lines.

Recommendations:
- Continue moving domain types into feature type files.
- Use dateTime helper consistently.

### `src/hooks`

Findings:
- `useAsync` is compact and useful.
- It uses generic fallback Thai error, but raw `errorMessage` can leak technical messages.

Recommendations:
- Error sanitizer improves all useAsync pages.

### `src/styles.css`

Findings:
- 4,902 lines; largest maintainability risk.
- Contains tokens, base, layout, components, pages, mobile, attendance, guide, document, emergency styles.
- Critical mobile padding uses `:has()` selectors in some cases.

Recommendations:
- Do not rewrite immediately.
- Add section comments and explicit fallback safe-area classes.
- Split later into `base.css`, `layout.css`, `components.css`, `mobile.css`, `attendance.css`, `documents.css`.

### `supabase/migrations`

Findings:
- Migrations are numerous and cover schema hardening, data health, staff profile, attendance, avatar storage.
- Recent migrations use idempotent patterns and RPC security-definer where important.

Recommendations:
- Keep new schema changes migration-only.
- Avoid changing old migrations.
- Continue documenting RPC contracts.

### Repeated Logic and Risk Areas

- Date formatting repeats in several pages with `new Date(...).toLocaleString`.
- QR token parsing exists in service and scanner component wrapper; service function should remain canonical.
- Error display is repeated and should depend on a friendly error utility.
- Long dynamic forms repeat raw key labels.
- Table columns often repeat mobile data; use `mobileHidden` more.

## 7. Security and Privacy UX Audit

### Public Data Exposure

Status:
- Public participant search returns safe fields only through public view/RPC.
- Public modal deliberately hides email, phone, and health fields.
- Public staff cards use opt-in contact flags.

Risks:
- Any future public announcements/files must preserve audience rules and storage privacy.

Recommendation:
- Keep public services separate from admin services.

### Staff Identity Verification

Status:
- Staff without Auth verify by email + phone.
- Verified attendance identity returns minimal staff data plus a token.

Risks:
- Email+phone is lower assurance than Auth; use only for profile/attendance, never operational permissions.

Recommendation:
- Make this distinction user-facing but not technical.

### LocalStorage Verified Identity

Status:
- Stores staff_profile_id, display_name, nickname, group, role, verified_staff_token, personal_qr_payload, saved_at.
- Does not store phone, email, medical data, or admin permissions.
- Expires after 7 days.

Risks:
- Token can identify the staff for attendance/profile-related flows on that device.

Recommendation:
- Keep clear/change identity visible.
- Consider server-side revocation and shorter TTL for future high-security use.

### Personal QR Token Handling

Status:
- Personal QR contains token/payload only, not email/phone/student_id/medical data.
- Admin scan requires admin RPC.

Risks:
- A screenshot of personal QR can be reused until token regeneration/revocation.

Recommendation:
- Add "regenerate QR" education and token revocation audit.

### Attendance Check-In Methods

Status:
- Session QR requires Auth or verified staff token/email+phone RPC.
- Manual check-in requires admin.
- Admin personal QR scan requires admin.

Risks:
- Target-scope validation must remain server-side.

Recommendation:
- Keep all writes RPC-only.

### Admin-Only Actions

Status:
- AdminGuard protects admin routes.
- Important RPCs are expected to check `is_admin`.

Risks:
- Direct table operations for announcements/templates rely on RLS and may not create audit logs.

Recommendation:
- Move operationally sensitive mutations to RPCs over time.

### Manual Check-In Audit Trail

Status:
- Attendance records include method, checked_by, scanned_at, note.

Risks:
- UI does not always show who checked a record clearly.

Recommendation:
- Add checked_by display or audit detail in session history.

### Error Messages Revealing Too Much

Status:
- Many UI paths call `errorMessage`, which currently returns raw `error.message`.

Risks:
- Users may see "function does not exist", "invalid input syntax", or policy details.

Recommendation:
- Sanitize technical error messages and show fallback Thai action text.

## 8. Supabase / RPC / RLS Risks

- Public search should continue using `search_public_profiles` and safe `public_profiles` view only.
- Attendance writes are correctly RPC-based and should remain that way.
- Staff verified flows should never return medical fields unless a specific, authorized emergency/admin RPC does so.
- Document template upload does Storage first then DB insert with cleanup on failure; good, but still direct table insert.
- Announcement admin service uses direct table writes and storage upload; acceptable only if RLS policies are strict.
- Data Health repair actions must remain admin-only and audit logged.
- Avatar Storage uses stable path and database stores `avatar_path`, good.
- RLS coverage should be verified in Supabase for all new tables, especially attendance identity tokens and announcements files.
- SQL token generation should always use `extensions.gen_random_bytes`, not unqualified `gen_random_bytes`.
- Client-side filtering after full admin fetch is acceptable for admin volume today, but public search must stay SQL-filtered.

## 9. Prioritized Roadmap

### P0: Must Fix Before Real Use

1. Problem: Raw technical errors can reach users.  
   Why it matters: Staff/admins under pressure need next steps, not RPC/Postgres messages.  
   Recommended fix: Sanitize `errorMessage` and use plain fallback copy.  
   Files likely affected: `src/utils/error.ts`.  
   Estimated risk: low.

2. Problem: Sticky action pages rely partly on `:has()` safe-area spacing.  
   Why it matters: Some mobile browsers can hide submit/action buttons behind bottom nav.  
   Recommended fix: Add explicit mobile `.has-sticky-actions` padding fallback.  
   Files likely affected: `src/styles.css`.  
   Estimated risk: low.

3. Problem: Attendance datetime fields do not visibly explain Bangkok time.  
   Why it matters: Wrong session time breaks live check-in.  
   Recommended fix: Add timezone hints to create/update attendance datetime fields.  
   Files likely affected: `src/pages/AdminStaffAttendancePage.tsx`.  
   Estimated risk: low.

4. Problem: Session QR copy says staff must sign in, but verified non-Auth flow is supported.  
   Why it matters: Non-Auth staff may think they cannot check in.  
   Recommended fix: Update QR instruction copy.  
   Files likely affected: `src/pages/AdminStaffAttendanceSessionPage.tsx`.  
   Estimated risk: low.

5. Problem: Public participant cards with `role=button` do not support Space activation.  
   Why it matters: Keyboard accessibility expectation for button-like controls.  
   Recommended fix: Add Space key handler.  
   Files likely affected: `src/pages/PublicListPage.tsx`.  
   Estimated risk: low.

### P1: Should Fix Soon

1. Problem: Staff profile sensitive request modal uses raw keys.  
   Why it matters: Thai-first staff should not see `drug_allergy`/`medical_note` style labels.  
   Recommended fix: Add field label mapping and sections.  
   Files likely affected: `src/pages/StaffProfileEditPage.tsx`.  
   Estimated risk: low/medium.

2. Problem: Document Settings is too long and dense.  
   Why it matters: Admins can make mistakes in long forms.  
   Recommended fix: Collapsible sections and sticky save.  
   Files likely affected: `src/pages/DocumentSettingsPage.tsx`, `src/styles.css`.  
   Estimated risk: medium.

3. Problem: Staff Management edit modal is too large.  
   Why it matters: Mobile editing is difficult and error-prone.  
   Recommended fix: Route users to `/admin/staff/:id/profile` for full edit; keep modal for quick edits only.  
   Files likely affected: `src/pages/StaffManagementPage.tsx`, `src/pages/AdminStaffProfilePage.tsx`.  
   Estimated risk: medium.

4. Problem: Data Health repair toast displays JSON.  
   Why it matters: Admins need a human summary.  
   Recommended fix: Summarize repair result with counts and link to details.  
   Files likely affected: `src/pages/DataHealthPage.tsx`.  
   Estimated risk: low.

5. Problem: Multiple direct date formats remain.  
   Why it matters: Timezone consistency and Thai display.  
   Recommended fix: Replace with `formatBangkokDateTime` where user-facing.  
   Files likely affected: logs, staff request pages, document history/templates.  
   Estimated risk: low.

### P2: Nice to Improve

1. Problem: Scanner lifecycle duplicated.  
   Why it matters: Fixes must be applied twice.  
   Recommended fix: Extract shared QR scanner hook/component.  
   Files likely affected: `src/components/attendance/*`.  
   Estimated risk: medium.

2. Problem: `styles.css` is too large.  
   Why it matters: Regressions and dead CSS are hard to track.  
   Recommended fix: Split after UI stabilization.  
   Files likely affected: `src/styles.css`, `src/main.tsx`.  
   Estimated risk: medium.

3. Problem: Public/staff/admin guide is static.  
   Why it matters: It can drift from product behavior.  
   Recommended fix: Link contextual help from complex pages and update with QA.  
   Files likely affected: `src/pages/GuidePage.tsx`, relevant pages.  
   Estimated risk: low.

4. Problem: Admin tools menu is dense.  
   Why it matters: Tool discovery slows under pressure.  
   Recommended fix: Add admin tools landing page or grouped drawer.  
   Files likely affected: `Layout`, new admin tools page.  
   Estimated risk: medium.

### P3: Future Enhancement

1. Offline-first event mode for staff roster, attendance fallback notes, and emergency contacts.
2. Push notifications for urgent announcements and staff duty updates.
3. Full audit log viewer per staff/participant profile.
4. Attendance session templates and recurring sessions.
5. Import wizard with resumable drafts and stronger preview diff.
6. Document template version comparison and approval workflow.
7. Performance virtualization for very large admin tables.

## 10. Safe Quick Wins Selected for Implementation

The following are safe enough to implement after this audit report:

- Sanitize technical error messages in `src/utils/error.ts`.
- Add explicit mobile safe-area padding for `.has-sticky-actions`, `.has-emergency-dock`, and sticky bars.
- Add localized close labels to mobile menu/filter sheet where low-risk.
- Add Bangkok timezone hints to attendance session creation datetime fields.
- Update Admin Attendance session QR copy to include non-Auth email+phone verification.
- Add Space key activation to public participant cards.
- Add a clearer retry/error card on `/staff/attendance`.

## 11. Recommendations Not Implemented in Quick Wins

- Splitting `styles.css` into multiple files.
- Refactoring large pages into subcomponents.
- Reworking Document Settings into a full multi-section editor.
- Moving announcement mutations to RPCs.
- Building offline event mode.
- Adding full focus trap to Modal.
- Adding scanner shared hook.
- Adding virtualization for large tables.
