# TFBP UI/UX QOL Audit

Date: 2026-05-23

Scope: full product-quality review of wording, translation, layout, accessibility, responsive behavior, and quality-of-life issues across the TFBP web app. This is not a database/schema phase.

## Executive Summary

Overall status: TFBP has strong foundations for real event operations. The app already has clear role separation, mobile navigation, responsive table/card primitives, admin-only review surfaces, event-aware attendance/document contexts, and contextual guide/help infrastructure. The main product risk is density: many admin/staff pages are powerful but visually busy on mobile, and some wording still reflects internal implementation instead of plain Thai.

Biggest strengths:
- Thai-first content is already present across most public and admin flows.
- Admin and staff workflows use cards, responsive tables, modals, toasts, and bottom navigation consistently.
- Staff application, people directory, import, dedupe, attendance, documents, and guide systems are connected enough for real operations.
- Sensitive health/contact data is generally protected from public pages.

Biggest usability risks:
- Mobile admin pages can still feel cramped when several actions are visible at once.
- Some form selects use "ทั้งหมด" when the user expects a placeholder such as "โปรดเลือก".
- Staff application identity mismatch copy must stay calm and non-blocking.
- Name/nickname display can become misleading if display helpers fall back to nickname for a full-name field.
- Export flows need consistently strong privacy warnings before downloading personal data.

Top 10 quality-of-life improvements:
1. Use "โปรดเลือก" as the default form placeholder and reserve "ทั้งหมด" for admin filters.
2. Keep full name and nickname as separate concepts everywhere.
3. Make staff application confirmation and success screens more explicit.
4. Add calmer CMU Mail mismatch messaging.
5. Make full duty cards visibly disabled but still readable.
6. Improve export modal wording and button labels.
7. Add Thai-first guide topics for staff application, identity, preliminary duty, status check, export, and update requests.
8. Improve modal/drawer focus behavior and safe mobile scrolling.
9. Keep mobile action rows stacked when there are many actions.
10. Replace raw technical error language with friendly Thai fallbacks.

## Device Audit

### iPhone SE / 375px

- Navigation usability: bottom nav and More menu are essential. Avoid adding more bottom-nav items; keep secondary links in More.
- Form usability: long forms need step sections, sticky-safe bottom spacing, phone/email keyboard types, and concise helper text.
- Table/card usability: admin tables must render as cards. Actions should show one primary action and "เพิ่มเติม".
- CTA visibility: submit buttons need safe-area spacing and must not sit behind bottom nav.
- Bottom nav overlap: generally managed by global spacing, but long forms and sticky bars need explicit `.safe-bottom-space`.
- Modal/drawer usability: modal max-height and internal scroll are required.
- Text readability: paragraphs should stay short; avoid technical words in public flows.
- Horizontal scroll risk: long badges, emails, student IDs, and filenames need wrapping.

### Common Mobile / 390-430px

- Navigation usability: More menu is usable if focus returns after close and links close the sheet.
- Form usability: two-column grids must collapse. Large admin forms should use sections.
- Table/card usability: mobile cards are readable if details are collapsed by default.
- CTA visibility: primary buttons should be full width or clearly dominant.
- Bottom nav overlap: safe-area padding must remain on sticky action bars.
- Modal/drawer usability: drawers should close by Escape/backdrop and scroll body content internally.
- Text readability: Thai labels should avoid abbreviation except common terms like CMU Mail.
- Horizontal scroll risk: medium risk on admin review/export rows if action groups do not stack.

### Tablet

- Navigation usability: top nav can show more links, but admin tools should still be grouped.
- Form usability: two-column grids are useful for compact forms; long forms still need sections.
- Table/card usability: tables can reappear if readable. Keep sticky headers for dense data.
- CTA visibility: actions can be inline, but destructive actions should remain visually separated.
- Modal/drawer usability: modal width should be capped and readable.
- Text readability: content max-width should prevent very long lines.
- Horizontal scroll risk: low if table wrappers are used.

### Desktop

- Navigation usability: top nav works, but avoid overcrowding with rarely used admin links.
- Form usability: admin filters should be compact and clear.
- Table/card usability: desktop tables are appropriate for admin review.
- CTA visibility: export/actions should sit near the data they affect.
- Modal/drawer usability: review dialogs should keep focus inside.
- Text readability: cards and page sections should use consistent widths.
- Horizontal scroll risk: low except very wide tables.

### Large Desktop

- Navigation usability: page max-widths should keep operation surfaces centered.
- Form usability: avoid stretching text fields across the whole screen.
- Table/card usability: large data tables are fine but should keep readable density.
- CTA visibility: primary actions should not drift too far from the page context.
- Text readability: constrain long paragraphs and guide content.
- Horizontal scroll risk: low.

## Page-by-Page Audit

### `/`
- Purpose: public participant list/search.
- Current UX issue: public search is useful; privacy copy must stay compact.
- Layout issue: long names/majors need wrapping.
- Wording issue: avoid technical "database" language for public users.
- Mobile issue: search and cards must remain above bottom nav.
- Accessibility issue: modal actions need clear focus order.
- Safe quick wins: keep CTA wording simple, protect overflow.
- Deferred: advanced search education.

### `/edit`
- Purpose: participant identity verification and edit request.
- Current UX issue: users may not know why edits require review.
- Layout issue: verification form should stay short on mobile.
- Wording issue: use "ตรวจสอบข้อมูล" and "คำร้องแก้ไขข้อมูล".
- Mobile issue: phone field should use phone keyboard.
- Accessibility issue: errors should remain near fields.
- Safe quick wins: friendly helper text and tel input.
- Deferred: request status tracker.

### `/events`
- Purpose: browse public events.
- Current UX issue: event status and CTAs must be obvious.
- Layout issue: event cards should avoid dense metadata.
- Wording issue: use Thai-first event action labels.
- Mobile issue: card CTAs should stack.
- Accessibility issue: status badges need text.
- Safe quick wins: overflow-safe cards.
- Deferred: event filtering.

### `/events/:eventSlug`
- Purpose: event detail and public CTAs.
- Current UX issue: avoid a wall of text.
- Layout issue: sections need clear rhythm.
- Wording issue: staff apply/status/profile check labels must be plain.
- Mobile issue: primary CTA should be visible without hunting.
- Accessibility issue: link labels should describe destination.
- Safe quick wins: concise CTAs.
- Deferred: richer schedule visualization.

### `/events/:eventSlug/staff/apply`
- Purpose: Parent Orientation staff application.
- Current UX issue: already has stepper; needs final wording polish and safer name/nickname display.
- Layout issue: duty cards need strong selected/full states.
- Wording issue: CMU Mail mismatch should be warning, not scary blocking copy.
- Mobile issue: stepper must stay compact and forms must preserve data when going back.
- Accessibility issue: disabled duty cards need text, not color only.
- Safe quick wins: confirmation/success details, tel input, placeholder fixes.
- Deferred: server-side quota race messaging if quota changes after confirmation.

### `/events/:eventSlug/profile-check`
- Purpose: safe public profile lookup and update request.
- Current UX issue: should explicitly say it checks central people data.
- Layout issue: results should separate safe found data from request form.
- Wording issue: "ข้อมูลที่พบในระบบ" is clearer than "Lookup result".
- Mobile issue: fields should stay one column.
- Accessibility issue: no full contact/health data should appear.
- Safe quick wins: title/copy, tel input, safe name helper.
- Deferred: separate request review status page.

### `/announcements`
- Purpose: public announcement list.
- Current UX issue: empty states should guide next action.
- Layout issue: pinned/important badges need wrapping.
- Wording issue: avoid internal visibility labels publicly.
- Mobile issue: cards should not overflow.
- Accessibility issue: card links need clear titles.
- Safe quick wins: keep badges textual.
- Deferred: announcement filters.

### `/guide`
- Purpose: help center.
- Current UX issue: guide topics exist; new staff application topics should be easier to find.
- Layout issue: search/cards should stay scannable.
- Wording issue: avoid internal terms unless explaining admin concepts.
- Mobile issue: topic cards should stack.
- Accessibility issue: Help drawer should close predictably.
- Safe quick wins: add targeted topics.
- Deferred: guide search highlighting.

### `/staff`
- Purpose: staff home/operations entry.
- Current UX issue: live-event actions should be prioritized.
- Layout issue: avoid too many cards above attendance/emergency.
- Wording issue: use action language.
- Mobile issue: one-hand navigation matters.
- Accessibility issue: icon-only actions need labels.
- Safe quick wins: no new changes this pass.
- Deferred: personalized task queue.

### `/staff/attendance`
- Purpose: staff check-in and history.
- Current UX issue: event/session context should remain obvious.
- Layout issue: recent history should not dominate.
- Wording issue: QR/token copy should be user-friendly.
- Mobile issue: scanner/fallback must fit.
- Accessibility issue: manual fallback inputs need labels.
- Safe quick wins: existing flow acceptable.
- Deferred: offline-first state.

### `/staff/profile`
- Purpose: view staff profile.
- Current UX issue: contact visibility can be confusing.
- Layout issue: avatar/name header should be compact.
- Wording issue: explain public-safe profile plainly.
- Mobile issue: edit CTA should be obvious.
- Accessibility issue: avatar alt/fallback text.
- Safe quick wins: no risky edits.
- Deferred: profile completeness meter.

### `/staff/profile/edit`
- Purpose: edit safe public profile and request sensitive updates.
- Current UX issue: sensitive request fields should not show raw keys.
- Layout issue: request modal can be long.
- Wording issue: Thai labels needed.
- Mobile issue: sticky save must avoid bottom nav.
- Accessibility issue: modal focus needs containment.
- Safe quick wins: localized field labels and phone keyboard.
- Deferred: split sensitive request into sections.

### `/staff/directory`
- Purpose: staff directory.
- Current UX issue: search/filter density.
- Layout issue: cards on mobile work.
- Wording issue: use role/group labels consistently.
- Mobile issue: avoid tiny contact actions.
- Accessibility issue: badges need text.
- Safe quick wins: no change.
- Deferred: staff grouping quick filters.

### `/staff/emergency`
- Purpose: emergency staff tools.
- Current UX issue: high-pressure flows need minimal copy.
- Layout issue: quick call actions must stay sticky-safe.
- Wording issue: direct Thai action labels.
- Mobile issue: no bottom overlap.
- Accessibility issue: not color-only severity.
- Safe quick wins: no change.
- Deferred: incident log refinements.

### `/admin/dashboard`
- Purpose: admin participant overview.
- Current UX issue: dense controls.
- Layout issue: table/cards already responsive.
- Wording issue: admin terms acceptable but still Thai-first.
- Mobile issue: actions can crowd.
- Accessibility issue: row actions need clear labels.
- Safe quick wins: global action wrapping.
- Deferred: split dashboard by task.

### `/admin/events`
- Purpose: admin event list.
- Current UX issue: event status/visibility should be clear.
- Layout issue: cards work.
- Wording issue: use public/admin scope labels.
- Mobile issue: CTAs stack.
- Accessibility issue: status text included.
- Safe quick wins: none.
- Deferred: event templates.

### `/admin/events/:eventId`
- Purpose: admin event detail.
- Current UX issue: many operational links.
- Layout issue: group actions by workflow.
- Wording issue: clarify public vs admin route.
- Mobile issue: cards should stack.
- Accessibility issue: no icon-only unlabeled actions.
- Safe quick wins: existing HelpButton.
- Deferred: event command center.

### `/admin/events/:eventId/applications`
- Purpose: review staff applications, assign duties, export.
- Current UX issue: strong page, but export wording and filter placeholders need polish.
- Layout issue: mobile rows should hide secondary actions behind "เพิ่มเติม".
- Wording issue: "filter" should be "ตัวกรองปัจจุบัน"; export warning should be explicit.
- Mobile issue: many row buttons.
- Accessibility issue: export modal checkbox text should be clear.
- Safe quick wins: export modal wording, all-filter placeholders, name conflict warning.
- Deferred: full action sheet for every row action.

### `/admin/people`
- Purpose: admin people directory and health panel.
- Current UX issue: rich filters but dense.
- Layout issue: mobile cards are appropriate.
- Wording issue: "ฐานข้อมูลกลาง" is good.
- Mobile issue: filters should remain collapsible.
- Accessibility issue: masked contact fields should be labeled.
- Safe quick wins: keep normal list hiding merged people.
- Deferred: saved filter views.

### `/admin/people/import-year2`
- Purpose: safe Year 2 import workflow.
- Current UX issue: instructions are clear but technical.
- Layout issue: mapping table can be dense.
- Wording issue: staging/previews need plain Thai.
- Mobile issue: cards should replace dense tables.
- Accessibility issue: import action should be confirmed.
- Safe quick wins: no schema changes.
- Deferred: upload wizard.

### `/admin/people/update-requests`
- Purpose: review person update requests.
- Current UX issue: needs clearer public-safe source context.
- Layout issue: table/cards work.
- Wording issue: use "คำร้องแก้ไขข้อมูล".
- Mobile issue: details modal should scroll.
- Accessibility issue: approval/rejection buttons need clear labels.
- Safe quick wins: filter placeholders.
- Deferred: diff visualization.

### `/admin/staff`
- Purpose: staff management.
- Current UX issue: very powerful, dense.
- Layout issue: edit modal can be long.
- Wording issue: role/group labels need consistency.
- Mobile issue: actions can crowd.
- Accessibility issue: many controls in a modal.
- Safe quick wins: global action wrapping.
- Deferred: dedicated full edit page.

### `/admin/staff/attendance`
- Purpose: attendance sessions overview.
- Current UX issue: event context recently improved.
- Layout issue: session cards need clear badges.
- Wording issue: QR/session terms should be plain.
- Mobile issue: create modal must fit.
- Accessibility issue: scanner fallback labels.
- Safe quick wins: no new changes.
- Deferred: session analytics.

### `/admin/staff/attendance/:sessionId`
- Purpose: session detail, QR, manual check-in.
- Current UX issue: dense manual controls.
- Layout issue: table-to-card works but action density remains.
- Wording issue: closed/expired states must be clear.
- Mobile issue: QR/actions safe area.
- Accessibility issue: scanner modal focus.
- Safe quick wins: global modal/action safety.
- Deferred: action sheet.

### `/admin/documents`
- Purpose: document center overview.
- Current UX issue: event/global template distinction improved.
- Layout issue: long generated names can wrap.
- Wording issue: global vs event-specific must remain explicit.
- Mobile issue: cards over tables.
- Accessibility issue: download actions labeled.
- Safe quick wins: global overflow wrapping.
- Deferred: document setup wizard.

### `/admin/announcements`
- Purpose: announcement management.
- Current UX issue: visibility language must be clear.
- Layout issue: list cards/table.
- Wording issue: public/staff/admin scopes should not be ambiguous.
- Mobile issue: actions may crowd.
- Accessibility issue: publish controls need labels.
- Safe quick wins: none.
- Deferred: preview mode.

### `/admin/data-health`
- Purpose: data quality report and repair actions.
- Current UX issue: technical by nature; warnings must be precise.
- Layout issue: repair cards work but can be dense.
- Wording issue: explain risk before repair.
- Mobile issue: cards should stack.
- Accessibility issue: destructive actions need confirmation.
- Safe quick wins: no database changes.
- Deferred: data health detail drilldowns.

### `/admin/logs`
- Purpose: audit/change logs.
- Current UX issue: dates/actions should be understandable.
- Layout issue: table/card responsive.
- Wording issue: avoid raw internal action strings where possible.
- Mobile issue: long JSON/details can overflow.
- Accessibility issue: log rows need semantic labels.
- Safe quick wins: global overflow wrapping.
- Deferred: formatted log detail viewer.

## Component Audit

- Button: strong visual hierarchy; ensure icon-only use always has `aria-label`.
- Card: consistent soft visual language; avoid card-inside-card unless truly grouped content.
- Input: labeled and supports hints/errors; phone/email input types should be used.
- Select: labeled; default placeholder should be "โปรดเลือก" for forms and "ทั้งหมด" only for filters.
- Checkbox card: duty card pattern is useful; selected/full states need text plus visual state.
- Radio group: no central primitive yet; future candidate.
- Modal: now has role/aria-modal; needs focus containment and internal mobile scroll.
- Drawer: Mobile More/Filter sheets close by Escape/backdrop; focus restore should be kept.
- Toast: has aria-live; copy should avoid technical errors.
- PageHeader: consistent; avoid overly long descriptions.
- ResponsiveDataTable: excellent desktop/table plus mobile/card primitive; mobile actions should be curated.
- MobileMoreMenu: important for avoiding bottom nav clutter.
- Filter drawer/sheet: good for admin density; use plain Thai labels.
- StaffAvatar: good visual identity; ensure fallback text remains readable.
- EmptyState: useful; should include one clear next action.
- LoadingSkeleton: good perceived performance.
- StatusBadge: text labels included; do not rely on color.
- HelpButton: useful when sparse; avoid adding to every small card.
- StickyActionBar: important on mobile; must respect safe-area and bottom nav.

## Wording and Translation Audit

- Avoid public-facing words: Auth, RPC, token, database error, invalid input syntax, function does not exist, JSON, RLS.
- Use "ไม่สามารถยืนยันตัวตนได้", "ส่งข้อมูลไม่สำเร็จ", "กรุณาตรวจสอบข้อมูลและลองใหม่", "ไม่พบข้อมูลในระบบ".
- Identity labels should use: ยืนยันตัวตน, ตรวจสอบข้อมูล, รอตรวจสอบตัวตน, ยืนยันแล้ว, CMU Mail ไม่ตรง, ไม่พบข้อมูลในฐาน, ไม่ผ่านการยืนยัน.
- Application labels should use: ส่งใบสมัครแล้ว, กำลังตรวจสอบ, ผ่านการคัดเลือก, สำรอง, ไม่ผ่านการคัดเลือก, ถอนใบสมัคร.
- Duty labels should use: ฝ่ายที่สนใจ, ฝ่ายที่ระบบจัดให้เบื้องต้น, ระบบจัดให้ตามโควต้า, จัดเข้าฝ่ายทั่วไป, ผู้ดูแลปรับเอง, รอผู้ดูแลจัดสรร.
- People labels should use: ฐานข้อมูลกลาง, ข้อมูลที่พบในระบบ, คำร้องแก้ไขข้อมูล, ขอแก้ไขข้อมูล.
- Export labels should use: ดาวน์โหลดข้อมูลผู้สมัคร, ดาวน์โหลด Excel ทั้งหมด, ดาวน์โหลด Excel ตามตัวกรองปัจจุบัน, ดาวน์โหลด Excel ฝ่ายนี้, ยืนยันการดาวน์โหลดข้อมูล.
- "ทั้งหมด" should be used only where an admin filter truly means all results. Form placeholders should use "โปรดเลือก".

## Quality-of-Life Roadmap

### P0: Must Fix Before Public Use

- Do not show nickname as full name.
- Staff application must show confirmation before submit.
- Success screen must be clear and ask applicant to screenshot.
- Export modal must warn about personal/sensitive data before download.
- No raw technical errors in public-facing flows.

### P1: Should Fix Soon

- Add guide topics for staff application and update requests.
- Use consistent identity/application/duty labels across admin review.
- Keep duty cards readable when full.
- Ensure admin application filters are usable on mobile.
- Improve update request review with clearer diffs.

### P2: Polish

- Add saved admin filters.
- Add profile completeness signals.
- Add formatted change log detail viewer.
- Improve guide search and topic discovery.

### P3: Future Enhancement

- Application status notifications and email automation.
- Dedicated mobile action sheets for every dense admin row.
- Full visual regression suite at 375/390/430/tablet/desktop.
- Event operations command center.
