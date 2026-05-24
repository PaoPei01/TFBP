# TFBP UI/UX Guidelines

TFBP is an event operations platform, not only a registration website. Every new page must stay clear, fast, role-aware, and privacy-safe for public participants, staff, emergency staff, and admins.

## Design Principles

- Thai-first, mobile-first, operations-first.
- Public pages must feel friendly and simple.
- Staff pages must support one-hand use during live activities.
- Emergency pages must be high contrast and action-oriented.
- Admin pages may be dense on desktop, but mobile must use cards, filters, and progressive disclosure.
- Keep the Apple-inspired iOS style: soft cards, rounded corners, subtle shadows, clean typography.
- Reduce blur on mobile and avoid nested decorative cards.

## Layout Patterns

- Use `PageHeader` for page title, short description, and top-level metadata.
- Use `PageSection` for major sections with optional actions.
- Use `Card`, `InfoCard`, or `ActionCard` for grouped content.
- Use `ResponsiveDataTable` for desktop table plus mobile card behavior.
- Use `FilterDrawer` for mobile filters and dense admin filters.
- Use `StickyActionBar` for important mobile actions.
- Add `MobileSafeAreaSpacer` or equivalent bottom spacing when a page has bottom actions.
- Use shared layout utilities for new pages: `page-shell`, `page-content`, `page-section`, `section-title-row`, `responsive-grid`, `mobile-card-list`, `form-grid`, `action-row`, `overflow-safe`, and `safe-bottom-space`.
- On mobile, action rows should wrap or stack. Avoid showing more than two equally prominent buttons in one row.
- Long names, emails, IDs, badges, and generated filenames must sit inside an `overflow-safe` or equivalent `min-width: 0` container.

## Action Hierarchy

- Primary: the main action, such as Save, Check-in, Call 1669, Commit Import.
- Secondary: useful but not primary, such as Export, Rebalance, Copy.
- Utility: small helpers, such as Clear Filter, Copy ID, Refresh.
- Destructive: delete, reset, clear, or irreversible actions.

Destructive actions must live in `DangerZone` or use `ConfirmDialog`. Do not place destructive buttons directly beside primary actions unless visually separated. For irreversible actions, require typed confirmation such as `DELETE`, `RESET`, `ลบ`, or `ยืนยัน`.

## Role-Based UI

- Public users see only public-safe routes and fields.
- Staff users see Staff Home, My Group, Attendance if allowed, and Emergency if allowed.
- Emergency staff see health/emergency tools without unrelated admin or group operations.
- Admin users see dashboard, groups, staff, emergency, and more tools.
- Do not show inaccessible links as disabled primary navigation.
- While access is loading, show public-safe navigation first.

## Privacy Rules

- Public pages must never show email, phone, emergency phone, Line, Instagram, Facebook, disease, food allergy, or drug allergy.
- Public identity lookup may show masked old CMU Mail/phone only when the user provides student ID plus CMU Mail.
- Public staff application flows must not hard-block real users only because old email/phone data is outdated; use pending admin review copy instead.
- Public copy for identity mismatch should say: "หาก CMU Mail ในฐานข้อมูลเดิมไม่ถูกต้อง สามารถส่งใบสมัครได้ตามปกติ ระบบจะให้ผู้ดูแลตรวจสอบตัวตนเพิ่มเติมภายหลัง"
- Applicant-facing duty assignment must use the wording "ฝ่ายที่ระบบจัดให้เบื้องต้น" and must say admins may adjust it later.
- Full-duty choices should be disabled, visually subdued, and labelled "รับเต็มจำนวนแล้ว" with a clear next step to choose another duty.
- Long applicant forms should use step-based layouts so each screen has one main task and preserves entered data when going back.
- Duty checkbox cards should include text for selected/unavailable states such as "เลือกแล้ว" and "รับเต็มจำนวนแล้ว"; do not rely on color alone.
- Admin exports that include health/limitation text must show a privacy warning before download.
- Display full name and nickname as separate fields. Nickname must not be used as fallback for full legal/display name.
- If full name is missing, show "ไม่พบชื่อ-นามสกุลในระบบ" instead of substituting nickname.
- If nickname is missing, show "ไม่พบชื่อเล่นในระบบ" instead of repeating full name.
- Medical data is visible only to admin and emergency_staff.
- If medical data is visible, show a confidentiality notice.
- Do not cache private medical data unless it is access-controlled and short-lived.
- Never expose Supabase service_role keys in frontend code.

## Emergency UI

- Emergency numbers must be reachable in one tap on mobile.
- Top actions should include 1669, Head Medic Staff, University Hospital, Police, and Fire.
- Use short labels: โทร 1669, คัดลอกเบอร์, บันทึกเหตุการณ์.
- Keep `EmergencyQuickDock` visible on mobile.
- Provide offline fallback hotlines.
- Use red/orange/yellow status colors with text labels, not color alone.

## Wording

- Use Thai-first operational wording.
- Public copy should be friendly and reassuring.
- Public participant entry should feel like one participant portal: search, my information, events, and announcements should be visible without requiring users to understand internal route names.
- Public profile modals should show only safe public fields. Do not show email, phone, health, or other private field rows, even as masked placeholders, unless the user has verified their own identity.
- Use `ข้อมูลของฉัน / My information` for participant self-service flows. Avoid framing the main public flow as an internal edit-request form.
- Edit request submit buttons should appear only after a real editable-field change; otherwise show a calm hint that users can edit a field first.
- Event detail pages should act as event hubs with clear actions: `สมัครเข้าร่วมกิจกรรม`, `สมัครเป็นทีมงาน`, `ตรวจสถานะใบสมัคร`, `ตรวจข้อมูลของฉัน`, and `อ่านประกาศกิจกรรม`.
- Staff copy should be action-oriented.
- Staff public entry should start at `ศูนย์ทีมงาน / Staff Center` with three clear paths: sign in, verify with email and phone, and check application status.
- Authenticated `/staff` should be a Today’s Operations hub. Keep live-event actions visually primary and move profile, directory, personal QR, announcements, and guide into a quieter More tools section.
- Keep both staff attendance paths visible inside `/staff/attendance`: `ให้แอดมินสแกนฉัน` and `ฉันสแกน QR รอบเช็กชื่อเอง`.
- Do not expose health flags, special-care badges, health counts, or health filters to staff roles that are not allowed to know those flags exist.
- Admin copy should be precise.
- Admin IA should group tools into focused hubs: `ภาพรวม`, `รายชื่อและกลุ่ม`, `งานทีมงาน`, `เอกสารและระบบ`, and `เหตุฉุกเฉิน`.
- `/admin` should act as the Admin Command Center with `งานที่ควรตรวจสอบ` and `ทางลัดหลัก` before long tables or secondary tools.
- Mobile admin navigation should prefer hub-level destinations and grouped More sections instead of one long flat list.
- Emergency copy should be short and direct.
- Avoid technical user-facing words such as Auth, RPC, token, database error, JSON, RLS, invalid input syntax, and function does not exist. Use plain recovery copy instead.
- Use `โปรดเลือก` for form select placeholders. Use `ทั้งหมด` only for admin filters where the empty value truly means all results.
- Keep full name and nickname separate. A full-name field must never fall back to nickname; show `ไม่พบชื่อ-นามสกุลในระบบ` instead.
- CMU Mail mismatch should use warning tone and explain that the applicant can continue while admins review identity later.
- Duplicate/idempotent submissions should be shown as informational, not as scary errors. Use `คุณได้ส่งใบสมัครสำหรับกิจกรรมนี้แล้ว ไม่จำเป็นต้องส่งซ้ำ`.

Preferred wording:

- Commit Import -> นำเข้าข้อมูลจริง
- Sync Staff Roster -> ซิงค์ข้อมูลทีมงาน
- Clear all groups -> ลบการจัดกลุ่มทั้งหมด
- Medical visible -> ข้อมูลสุขภาพที่มองเห็น
- No participants match your search -> ไม่พบรายชื่อ ลองค้นด้วยชื่อเล่นหรือสาขา
- Groups generated -> จัดกลุ่มใหม่แล้ว อย่าลืมกดบันทึก
- Download all Excel -> ดาวน์โหลด Excel ทั้งหมด
- Download filtered Excel -> ดาวน์โหลด Excel ตามตัวกรองปัจจุบัน
- Confirm data download -> ยืนยันการดาวน์โหลดข้อมูล
- Preliminary duty -> ฝ่ายที่ระบบจัดให้เบื้องต้น
- Pending admin assignment -> รอผู้ดูแลจัดสรร

## Localization and Theme Readiness

- Keep Thai-first copy natural and concise; English should be simple and consistent.
- Extend the existing `LanguageContext` and `src/lib/i18n.ts` instead of creating a second language system.
- Validate stored language values before using them.
- Browser/device language detection should run only when there is no manual language preference.
- Browser/device language detection should choose Thai when any browser language starts with `th`; otherwise choose English.
- Manual language override must remain obvious and reversible.
- Store manual language preference in `tfbp_language`.
- Keep `src/lib/translations.ts` organized by namespaces such as `common`, `navigation`, `identity`, `staffApplication`, and `statuses`.
- Prefer shared translation keys for navigation, common buttons, status labels, identity labels, staff-application status copy, event chrome, and announcement section labels.
- Leave database-owned content in the database. Event names, announcement bodies, person names, uploaded document names, admin notes, and applicant notes must not be auto-translated.
- Missing translation keys must fall back safely to Thai or the key string, never crash the UI.
- Store only preference values for language/theme in localStorage; never store personal data for UI preferences.
- Do not auto-translate database content such as names, announcements, event descriptions, or document data unless localized fields are explicitly available.
- Future theme support should use `system`, `light`, and `dark` as preference concepts, with resolved theme applied to the document root.
- Theme preference should be stored in `tfbp_theme` and applied through `data-theme` plus `data-theme-preference` on the document root.
- Dark mode should use semantic CSS variables and tested component surfaces. Do not rely on color inversion.
- Convert color usage by component group, not by broad search-and-replace.
- QR codes, scanner targets, and document previews must remain high contrast and readable in every theme.
- Shared components should prefer `--surface`, `--surface-soft`, `--text`, `--text-muted`, `--border`, `--primary`, `--primary-soft`, and status tokens instead of hardcoded white/black/light-blue values.
- When polishing dark mode, start with shared surfaces and high-impact route shells: cards, forms, filters, tables, modals, drawers, toasts, bottom navigation, status badges, duty cards, QR/scanner panels, and export/update-request modals.
- Keep dark-mode fixes semantic. Do not blanket-invert screenshots, QR canvases, document previews, maps, or imported content.
- Keep theme controls compact and out of the mobile bottom nav.
- Admin-only technical language may mention migrations/RPCs when needed; public and staff recovery copy should avoid Auth, RPC, token, database error, JSON, RLS, invalid input syntax, and function does not exist.

## Accessibility

- Touch targets must be at least 44px.
- Focus states must be visible.
- Icon-only buttons need `aria-label`.
- Modals, help drawers, mobile More menus, and mobile filter sheets must keep focus inside the dialog, restore focus on close, and close on Escape/backdrop where safe.
- Mobile bottom sheets and menus must lock body scroll while open and restore scroll position on close.
- Do not rely on color alone.
- Form inputs need labels.
- Phone fields should use `type="tel"` and `inputMode="tel"`; email fields should use `type="email"`.
- Tables need headers.
- Respect `prefers-reduced-motion`.
- Export buttons should be grouped under `ส่งออก / Export` or visually treated as secondary actions when multiple export formats exist.
- Use `ส่งออก CSV / Export CSV` and `ส่งออกข้อมูล / Export data` instead of mixing raw `Download CSV` labels into Thai UI.

## Layout Stability

- Do not use `word-break: break-all` globally.
- Do not use `overflow-wrap: anywhere` on headings, buttons, labels, or normal Thai copy.
- Use `.break-safe` only for long URLs, emails, IDs, file paths, and other technical strings.
- Page headers must keep long Thai titles in a `minmax(0, 1fr)` title area and move actions below the title on narrow screens.
- EventSwitcher belongs in a bounded toolbar/header meta area and must not squeeze a page title.
- Add `min-width: 0` to grid/flex children that contain long text.
- Admin pages should use practical header heights and avoid decorative empty hero space.

## Future Features Checklist

New pages for announcements, maps, duty schedule, staff quota, push notifications, emergency incident reports, attendance analytics, and event tools must follow:

- Same header pattern.
- Same card pattern.
- Same mobile navigation behavior.
- Same privacy rules.
- Same action hierarchy.
- Same confirmation dialog pattern.
- Same bottom safe-area spacing.
