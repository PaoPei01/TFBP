# Staff Attendance Readiness Checklist

Purpose: confirm the QR attendance workflow is ready for a real event day before staff depend on it.

## 1. Supabase and Migrations

- [ ] Attendance tables exist and RLS is enabled.
- [ ] `pgcrypto` exists in the `extensions` schema.
- [ ] QR token generation uses `extensions.gen_random_bytes`, not unqualified `gen_random_bytes`.
- [ ] RPCs exist for session QR, verified QR, manual check-in, personal QR, and admin scan.
- [ ] Attendance writes go through RPCs only.
- [ ] Personal QR tokens contain only random token payloads.
- [ ] No service role key is exposed in frontend code.

## 2. Timezone

- [ ] Create a session at `2026-05-21T22:25` in Thailand time.
- [ ] Session list displays `21 พ.ค. 2569 22:25`, not `22 พ.ค. 05:25`.
- [ ] `starts_at`, `ends_at`, `late_after`, and `qr_expires_at` display in Asia/Bangkok.
- [ ] CSV export uses readable Bangkok time.
- [ ] No code manually adds or subtracts 7 hours.

## 3. Staff Self Check-In

- [ ] Auth staff can open `/staff/attendance`.
- [ ] Auth staff can scan/open session QR and check in.
- [ ] Re-scanning shows already checked, not duplicate.
- [ ] Late check-in after `late_after` becomes `late`.
- [ ] Closed and expired sessions reject check-in with friendly text.

## 4. Staff Without Auth

- [ ] Non-Auth staff can verify identity with email + phone.
- [ ] The app remembers only minimal verified identity on this device.
- [ ] LocalStorage does not contain raw email, phone, medical data, or admin permissions.
- [ ] Remembered identity can show personal QR.
- [ ] Remembered identity can scan session QR without retyping email + phone.
- [ ] Staff can clear/change remembered identity.
- [ ] Expired remembered identity asks for verification again.

## 5. Admin Operations

- [ ] Admin can create a session quickly.
- [ ] Admin can activate, close, and regenerate QR.
- [ ] Session detail shows only Summary, Session QR, and Check-in tools as primary areas.
- [ ] Manual check-in works for present, late, absent, and excused.
- [ ] Manual note is optional and not visually dominant.
- [ ] Admin can scan or paste staff personal QR.
- [ ] Invalid personal QR fails safely.
- [ ] Staff outside target scope cannot be checked in.
- [ ] CSV export includes status, method, checked time, checked by, and note.

## 6. Mobile Readiness

- [ ] iPhone SE width has no horizontal scroll.
- [ ] Bottom nav does not cover QR, submit, or manual check-in buttons.
- [ ] Scanner modal fits mobile screen.
- [ ] Camera permission denied shows fallback token input.
- [ ] Touch targets are at least 44px where practical.
- [ ] QR display is large enough to scan from another phone.

## 7. Fallback Plan

- [ ] Manual check-in remains available if camera fails.
- [ ] Token paste remains available if camera permission fails.
- [ ] Admins know who to contact if Supabase RPC/migration errors appear.
- [ ] Staff know to ask admin for manual check-in if QR is expired or closed.

