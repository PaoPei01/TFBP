# UI Responsive Review

Date: 2026-05-23

Scope: global responsive UI/UX cleanup for high-use public, staff, and admin routes. This pass intentionally avoided database/schema changes and business-logic changes.

## Pages Audited

Public:
- `/`
- `/events`
- `/events/:eventSlug`
- `/events/:eventSlug/staff/apply`
- `/edit`
- `/announcements`
- `/guide`

Staff:
- `/staff`
- `/staff/attendance`
- `/staff/profile`
- `/staff/profile/edit`
- `/staff/directory`
- `/staff/emergency`

Admin:
- `/admin/dashboard`
- `/admin/events`
- `/admin/events/:eventId`
- `/admin/events/:eventId/applications`
- `/admin/people`
- `/admin/people/import-year2`
- `/admin/staff`
- `/admin/staff/attendance`
- `/admin/staff/attendance/:sessionId`
- `/admin/documents`
- `/admin/announcements`
- `/admin/data-health`

## Issues Found

- Some safety spacing depends on `:has()` selectors, so older mobile browsers need explicit utility fallbacks such as `.safe-bottom-space`.
- Dense admin actions can still produce too many buttons in one mobile row when pages do not provide custom mobile actions.
- Long names, badges, emails, phone strings, and IDs can overflow if nested inside flexible headers without `min-width: 0`.
- Modals were mostly accessible, but the shared modal used a static title id and did not keep Tab focus inside the dialog.
- Mobile More and Filter sheets closed with Escape/backdrop but did not restore focus to the trigger.
- Phone inputs in several public/staff identity forms did not request the phone keyboard.
- Staff profile sensitive edit request fields showed raw field keys, which made the mobile form harder to scan.

## Pages Fixed

- Global layout and mobile safety were improved in `src/styles.css`:
  - added horizontal overflow guards for `html`, `body`, media, flexible headers, badges, action rows, and mobile cards.
  - standardized `page-content`, `responsive-grid`, `mobile-card-list`, `action-row`, `overflow-safe`, `safe-bottom-space`, `status-badge`, and `help-icon-button`.
  - improved sticky action safe-area padding.
  - made mobile table/card action rows collapse to one column when there are many buttons.
  - improved modal max-height using dynamic viewport units so mobile dialogs scroll internally.
- Shared modal accessibility improved in `src/components/ui/Modal.tsx`:
  - unique `aria-labelledby` id per modal.
  - Escape close preserved.
  - basic Tab focus containment.
  - focus restore on close preserved.
- Mobile More and Filter sheets now focus the sheet when opened and restore focus when closed.
- Identity/contact forms now use phone keyboard hints:
  - `/events/:eventSlug/staff/apply`
  - `/events/:eventSlug/staff/application-status`
  - `/events/:eventSlug/register`
  - `/edit`
- Staff profile edit request modal now uses Thai-first labels instead of raw field keys.

## Pages Deferred

- Admin Staff Management full edit modal remains dense. Recommended next step: keep modal for quick edits and route full edits to a dedicated page.
- Document Settings remains a long operational form. Recommended next step: split advanced groups into collapsible sections with a sticky save summary.
- Attendance session manual check-in can still show many operational actions. Recommended next step: keep one primary mobile action visible and move secondary actions to an action sheet.
- A full Playwright visual regression suite for all listed routes is still deferred; this pass uses targeted responsive checks plus build/lint validation.

## QA Notes

- Check 375px width for no horizontal scroll on public routes and guarded admin/staff shells.
- Confirm bottom nav does not cover submit buttons or sticky action bars.
- Confirm modals, More menu, and Filter sheets close with Escape and backdrop.
- Confirm forms show errors near fields and phone inputs open a phone keypad on mobile.
