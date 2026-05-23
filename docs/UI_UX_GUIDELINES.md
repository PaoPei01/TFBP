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
- Staff copy should be action-oriented.
- Admin copy should be precise.
- Emergency copy should be short and direct.
- Avoid technical user-facing words such as Auth, RPC, token, database error, JSON, RLS, invalid input syntax, and function does not exist. Use plain recovery copy instead.
- Use `โปรดเลือก` for form select placeholders. Use `ทั้งหมด` only for admin filters where the empty value truly means all results.
- Keep full name and nickname separate. A full-name field must never fall back to nickname; show `ไม่พบชื่อ-นามสกุลในระบบ` instead.
- CMU Mail mismatch should use warning tone and explain that the applicant can continue while admins review identity later.

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

## Accessibility

- Touch targets must be at least 44px.
- Focus states must be visible.
- Icon-only buttons need `aria-label`.
- Modals must keep focus inside the dialog, restore focus on close, and close on Escape/backdrop where safe.
- Mobile bottom sheets and menus must focus the sheet on open and restore focus on close.
- Do not rely on color alone.
- Form inputs need labels.
- Phone fields should use `type="tel"` and `inputMode="tel"`; email fields should use `type="email"`.
- Tables need headers.
- Respect `prefers-reduced-motion`.

## Future Features Checklist

New pages for announcements, maps, duty schedule, staff quota, push notifications, emergency incident reports, attendance analytics, and event tools must follow:

- Same header pattern.
- Same card pattern.
- Same mobile navigation behavior.
- Same privacy rules.
- Same action hierarchy.
- Same confirmation dialog pattern.
- Same bottom safe-area spacing.
