# TFBP UI/UX Guidelines

## Principles

- Mobile-first for live event operations.
- Thai-first wording; English must be complete, not decorative.
- Public pages never expose private contact, emergency contact, or medical data.
- Emergency pages prioritize speed, contrast, and one-tap calling over decoration.
- Use Apple-inspired clarity: light surfaces, soft borders, restrained shadow, minimal blur.

## Layout

- Every page starts with the same header pattern: eyebrow, title, short helper text, optional meta.
- Primary actions are visible. Secondary actions may move into grouped toolbars or action sheets.
- Destructive actions must use `ConfirmDialog`; high-risk resets require typing `RESET` or `ยืนยัน`.
- On mobile, use cards instead of wide tables.
- Keep touch targets at least 44px.

## Components

- `PageHeader`: page title and context.
- `Card`: neutral content container.
- `Button`: commands only; use icons for quick recognition.
- `Badge`: status label with text and color.
- `Modal` / `ConfirmDialog`: edits, confirmations, dangerous actions.
- `MobileSearchHeader`: sticky/compact mobile search.
- `StickyBottomBar`: fast mobile actions.
- `ResponsiveDataTable`: desktop table, mobile cards.

## Wording

- Use operational labels:
  - “นำเข้าข้อมูลจริง” instead of “Commit Import”.
  - “ซิงค์ข้อมูลทีมงาน” instead of “Sync Staff Roster”.
  - “จัดกลุ่มใหม่แล้ว อย่าลืมกดบันทึก”.
  - “ซ่อนเพื่อความเป็นส่วนตัว” for public hidden fields.
- Error messages should say what to do next.

## Privacy

- Public pages show only safe profile fields.
- Staff pages show medical details only to admin or emergency staff.
- Emergency data requires a confidentiality banner.
- Do not cache participant medical data unless the access and expiry rules are explicit.

## Future Features

Announcements, maps, duty schedules, push notifications, and operations tools must follow:

- same header pattern
- same mobile navigation behavior
- same privacy rules
- same action hierarchy
- same confirmation dialog pattern
- same responsive table/card rules
