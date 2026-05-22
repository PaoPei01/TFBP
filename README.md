# Activity Registration Management System

ระบบจัดการรายชื่อผู้เข้าร่วมกิจกรรมแบบ full-stack ด้วย React + Vite และ Supabase

## Features

- Public participant list with privacy-safe fields only: Thai name, nickname, and major
- Search public list by Thai name, English name, nickname, and major without exposing sensitive fields
- User edit-request flow with email + phone verification
- Admin login with Supabase Auth
- Admin dashboard with full participant data, search, major filter, summary cards, CSV export, direct edit, and delete
- Pending edit-request approval/rejection flow with change logs
- Thai/English UI toggle
- Mobile-first operational UX with sticky bottom navigation, stacked mobile cards, sticky action bars, emergency dock, swipe attendance, and lazy-loaded admin/staff pages
- Staff Management import system with separated staff profiles, staff medical info, staff group assignments, Excel preview, duplicate warnings, and admin-only commit
- Smart group assignment for 7 color groups x A/B subgroups with balancing by size, major, and admission round
- Admin drag-and-drop group adjustment, lock workflow, imbalance warnings, CSV and XLSX group exports
- Verified participant group reveal with mentors, schedule, meeting point, and privacy-safe friend recommendations
- Supabase PostgreSQL schema, RPC functions, and Row Level Security
- Contact parser for imported single-field contact data
- Thai UI with Apple-inspired iOS/Liquid Glass visual style

## Tech Stack

- Frontend: React + Vite + TypeScript
- Backend/database: Supabase
- Auth: Supabase Auth
- Database: Supabase PostgreSQL
- Security: Supabase Row Level Security

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project.

3. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

4. Fill in `.env`:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   Do not put the Supabase `service_role` key in the frontend.

5. Apply the migration in `supabase/migrations/202605190001_activity_registration_system.sql`.

   You can paste it into the Supabase SQL editor, or run it with the Supabase CLI after linking your project.

6. Apply the second migration:

   ```text
   supabase/migrations/202605190002_group_system_and_bilingual_fields.sql
   ```

   This adds group assignments, bilingual/group profile fields, group RPCs, and privacy-safe friend recommendation RPCs.

7. Apply the later production/stabilization migrations in order. The newest hardening migration is:

   ```text
   supabase/migrations/202605200020_schema_alignment_and_production_hardening.sql
   ```

   It aligns frontend fields with Supabase, rebuilds privacy-safe public search with group filters, hardens edit request approval, moves Document Center saves into atomic RPCs, and assigns generated document versions server-side.

8. Create an admin account in Supabase Auth.

9. Add that account to `admins`:

   ```sql
   insert into public.admins (user_id, role)
   values ('AUTH_USER_UUID_HERE', 'admin');
   ```

10. Run locally:

   ```bash
   npm run dev
   ```

## Import Registration Excel

The importer reads the Google Forms Excel export and upserts rows into `profiles` by `email`.
It also normalizes major aliases, so `Industrial Engineering and Logistics Management (IEL)` and `ภาควิชาวิศวกรรมอุตสาหการและการจัดการ โลจิสติกส์ (IEL)` are treated as the same major. The importer stores the Google Forms timestamp and row order as `form_submitted_at` and `registration_order`, which the group balancer uses as a registration-wave proxy.

Dry run first:

```bash
npm run import:registrations -- "/Users/macintoshhd/Downloads/แบบฟอร์มลงทะเบียนรับน้องสานสัมพันธ์ รอบที่1 (Registration form for the freshman   bonding program, Round 1)  (การตอบกลับ).xlsx"
```

Import into Supabase:

```bash
npm run import:registrations -- "/Users/macintoshhd/Downloads/แบบฟอร์มลงทะเบียนรับน้องสานสัมพันธ์ รอบที่1 (Registration form for the freshman   bonding program, Round 1)  (การตอบกลับ).xlsx" --commit
```

Required for `--commit`:

```bash
VITE_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Keep `SUPABASE_SERVICE_ROLE_KEY` only in local/server-side environments. Do not deploy it to Vite hosting.

## Important Security Notes

- Public users read from `public_profiles` and `search_public_profiles`, which only return safe public fields.
- Sensitive participant data is protected by RLS and admin checks.
- Users cannot update `profiles` directly.
- Edit requests are created through `submit_edit_request`, which verifies email and phone server-side before inserting.
- Admin-only changes run through RPC functions that check the `admins` table and write `change_logs`.
- The app uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the browser.

## Contact Parser

The migration includes:

```sql
select * from public.parse_contact('line: pao01, IG @pao.pei, fb paopei, 0891234567');
```

It extracts:

- `line_id`
- `instagram`
- `facebook`
- `phone`
- `other_contact`

The frontend also includes the same helper in `src/lib/contactParser.ts` for import tooling or previews.

## Pages

- `/` - public participant list
- `/edit` - verify identity and submit edit request
- `/login` - unified staff/admin sign in
- `/admin` - backward-compatible sign-in entry, renders the same unified login page
- `/admin/dashboard` - admin dashboard
- `/admin/groups` - smart group assignment dashboard
- `/admin/staff` - staff management
- `/admin/staff/import` - staff Excel import preview and commit
- `/admin/staff/operations` - staff quota and operations readiness
- `/admin/staff/requests` - staff profile edit requests
- `/admin/data-health` - data health checks and repair actions
- `/admin/documents` - admin Document Center dashboard
- `/admin/documents/settings` - project profile, budget, schedule, venue, and equipment data
- `/admin/documents/templates` - private DOCX template upload/list
- `/admin/documents/generate` - missing-info check, Thai preview, DOCX generation, and download
- `/admin/documents/history` - generated document history and old DOCX downloads
- `/admin/requests` - pending edit requests
- `/admin/logs` - change log
- `/staff` - staff operations home
- `/staff/profile` - logged-in staff profile
- `/staff/profile/edit` - logged-in staff public profile editor
- `/staff/profile/verify` - individual staff profile verification by email + phone
- `/staff/my-group` - assigned group view
- `/staff/attendance` - staff attendance mode
- `/staff/emergency` - staff emergency tools
- `/announcements` - public announcement hub

## Document Center

The Document Center is admin-only and uses Supabase RLS plus private Supabase Storage. It does not expose participant medical/contact data or the Supabase `service_role` key in the browser.

Template uploads are stored in the private `document-templates` bucket before metadata is inserted. If metadata insertion fails, the app now attempts to remove the uploaded object so private Storage does not collect orphan templates. Generated document history uses the server-side `create_generated_document_record` RPC for the final version number; client-side version guesses must not be used as the source of truth.

Apply these migrations before using it:

```text
supabase/migrations/202605200011_document_center.sql
supabase/migrations/202605200012_document_center_production_ready.sql
supabase/migrations/202605200020_schema_alignment_and_production_hardening.sql
```

The second migration creates private Storage buckets:

```text
document-templates
document-outputs
```

Keep both buckets private. Admin users upload `.docx` templates to `document-templates`; generated DOCX files are stored in `document-outputs` and can be downloaded again from `/admin/documents/history`. Project profile saves now go through `save_document_project_profile(input_data jsonb)` so the profile, budget, schedule, venue, and equipment rows are saved atomically. Generated document history uses `create_generated_document_record(input_data jsonb)` so the final version number is assigned inside PostgreSQL instead of relying on a race-prone client-side counter.

The HTML preview escapes dynamic values before rendering. DOCX templates still use docxtemplater placeholders as usual.

### Template Variables

Use docxtemplater syntax with lowercase placeholders only. Do not mix it with `{{PROJECT_NAME}}` or uppercase variables.

Common placeholders:

```text
{project_name}
{event_date_th}
{event_time_range}
{location}
{total_participants}
{freshmen_count}
{staff_count}
{budget_total}
{advisor_name}
{project_chair_name}
{coordinator_name}
{coordinator_phone}
```

Schedule loop:

```text
{#schedule_items}
{time_range} {title} {duration_minutes}
{/schedule_items}
```

Budget loop:

```text
{#budget_items}
{item_name} {quantity} {unit} {unit_price} {amount}
{/budget_items}
```

Upload `.docx` files only. The upload page detects placeholders, stores the template file in private Storage, and saves only metadata such as `storage_path`, `file_name`, `document_type`, `placeholders`, and active status in PostgreSQL.

Document types supported by the missing-info checker:

- `project_approval` - เอกสารขออนุมัติโครงการ
- `venue_request` - หนังสือขอใช้สถานที่
- `equipment_borrow` - เอกสารยืมอุปกรณ์
- `support_request` - หนังสือขอความอนุเคราะห์
- `invitation_letter` - หนังสือเชิญ
- `closing_report` - รายงานสรุปโครงการ
- `custom` - กำหนดเอง

## Public Search and Privacy

Public participant search uses `search_public_profiles(search_text, major_filter, main_group_filter, subgroup_filter)`. Filtering happens in PostgreSQL and the result only contains:

- `id`
- `name_th`
- `name_en`
- `nickname`
- `nickname_en`
- `major`
- `main_group`
- `subgroup`

It must never return email, phone, emergency phone, LINE, Instagram, Facebook, medical fields, allergy fields, or emergency notes. Group badges are joined from `group_assignments` only for display.

## Data Health

The admin Data Health page uses:

```text
validate_data_integrity()
run_data_health_repair(input_action text)
```

The health check reports missing/invalid majors, duplicate student IDs/emails/phones, placeholder values such as `-`, `N/A`, `ไม่มี`, orphan group/staff assignments, invalid staff roles, invalid group scopes, and Thai duty text stored in system role fields.

Supported repair actions:

- `clean_placeholders`
- `normalize_majors`
- `repair_staff_roles`
- `repair_orphans`
- `sync_staff_roster`
- `rebuild_group_settings_mentors`
- `major_only_repair`

Repairs are admin-only and write audit/change log records where possible.

## Group Workflow

1. Login as admin.
2. Go to `/admin/groups`.
3. Click **Auto Generate Groups** to balance participants across 14 subgroups.
   - Highest priority: major distribution
   - Next: registration time/order distribution
   - Next: medical condition distribution
   - Optional/future: admission round distribution when that data exists
4. Drag participants between subgroup cards for manual adjustment.
5. Review imbalance warnings, group size bars, major distribution, and admission round distribution.
6. Click **บันทึกการจัดกลุ่ม** to save assignments.
7. Export CSV or Excel for:
   - Full participant list
   - Group summary
   - Major distribution
   - Admission round distribution
   - Attendance sheet
8. Click **Lock Groups** when assignments are final. Locked groups cannot be regenerated accidentally.

Participants who verify identity on `/edit` will see their color group, subgroup, mentors, activity schedule, meeting point, and privacy-safe friend recommendations.

## Import Group Staff Roster

Because group staff data contains phone numbers and medical details, keep the source file local and untracked.

1. Create a private local file:

   ```bash
   mkdir -p private
   nano private/group-staff-roster.txt
   ```

2. Paste the staff roster text into that file.

3. Dry run:

   ```bash
   npm run import:group-staff -- "private/group-staff-roster.txt"
   ```

4. Import:

   ```bash
   npm run import:group-staff -- "private/group-staff-roster.txt" --commit
   ```

The script imports into `group_staff` and updates `group_settings.mentors` for each color/subgroup.

## Import Staff Profiles Excel

Staff profile data is stored separately from participant `profiles`.

1. Apply the staff management migration:

   ```text
   supabase/migrations/202605200002_staff_management_import.sql
   ```

2. Use the web UI:

   ```text
   /admin/staff/import
   ```

   Upload the Excel file, review duplicate warnings, contact parsing, missing data warnings, then commit as admin.

3. Or use the CLI dry run:

   ```bash
   npm run import:staff -- "/Users/macintoshhd/Downloads/staff_import_ready_TFBP_base_fixed.xlsx"
   ```

4. Commit from CLI with a local-only service role key:

   ```bash
   npm run import:staff -- "/Users/macintoshhd/Downloads/staff_import_ready_TFBP_base_fixed.xlsx" --commit
   ```

Supported sheets include `ข้อมูลทีมงาน`, `ข้อมูลสตาฟ`, `staff_profiles_import`, `staff_medical_info_import`, and `staff_group_assignments`.

## Staff Avatar Upload

Staff profile photos are uploaded as files instead of pasted image links. Apply this migration before using the production avatar flow:

```text
supabase/migrations/202605210002_staff_avatar_storage_hardening.sql
```

Avatar storage rules:

- Bucket: `staff-avatars`
- Privacy model: private bucket with runtime signed URLs.
- Database field: `staff_public_profiles.avatar_path`
- Legacy fallback field: `staff_public_profiles.avatar_url`
- Stable object path: `staff/{staff_profile_id}/avatar.webp`
- The database stores only the Storage path, never base64 data and never signed URLs.
- Staff/admin uploads are resized and compressed in the browser before upload.
- Supported original files: JPG, PNG, WEBP up to 5 MB.
- Target output: WebP, longest side around 800px, usually under 300 KB.
- Replacing a photo overwrites the same stable object path with `upsert: true`, preventing old avatar files from accumulating.
- Removing a photo clears `avatar_path` through RPC first, then removes the stable Storage object as best effort, so a Storage cleanup failure does not leave a broken public profile reference.

Storage access is restricted by policy:

- Admins can manage any staff avatar.
- Authenticated staff can manage only their own `staff/{staff_profile_id}/avatar.webp` object when their Auth user is linked to that staff profile.
- Public/anonymous users cannot upload, update, or delete avatar files.
- Public staff cards resolve avatars at runtime through signed URLs and fall back to legacy `avatar_url` or initials if the file is unavailable.

Unauthenticated staff profile verification (`/staff/profile/verify`) does not upload avatar files for safety. Individual staff can still edit text/visibility there, while avatar file upload is available after staff login or through admin staff profile editing.

## Staff Attendance Hybrid QR

The production staff attendance system uses session QR check-in as the primary flow and admin manual check-in as the required fallback. Apply this migration before using it:

```text
supabase/migrations/202605210004_staff_attendance_hybrid_qr.sql
```

If the database already has the first attendance migration, also apply the follow-up hardening migration:

```text
supabase/migrations/202605210005_staff_attendance_verified_qr_fix.sql
```

For timezone-safe session creation and non-Auth staff personal QR support, also apply:

```text
supabase/migrations/202605220001_staff_attendance_timezone_personal_qr.sql
```

For remembered verified staff identity and staff-side in-browser session QR scanning, also apply:

```text
supabase/migrations/202605220002_staff_attendance_verified_identity_cache.sql
```

Routes:

- Admin dashboard: `/admin/staff/attendance`
- Admin session detail and manual roster: `/admin/staff/attendance/:sessionId`
- Staff attendance home: `/staff/attendance`
- Staff QR scan route: `/staff/attendance/scan?token=...`
- Staff personal QR by email + phone verification: `/staff/profile/qr`

Security model:

- Staff must be authenticated to check in from a session QR.
- Staff QR check-in records only the currently signed-in staff member.
- Staff without Supabase Auth accounts can scan the same session QR and verify with the email + phone stored in `staff_profiles`.
- Staff without Supabase Auth accounts can also generate a personal QR after email + phone verification. This QR contains only a random token and is for admin-assisted check-in only.
- Staff without Supabase Auth accounts can verify once on `/staff/attendance`; the app stores only minimal staff identity and a random verified token in `localStorage` for 7 days under `tfbp_verified_staff_identity`.
- Remembered verified staff can scan an admin/session QR in-browser through `scan_staff_attendance_session_qr_by_verified_token` without retyping email and phone.
- Admin-assisted personal QR check-in uses `admin_scan_staff_personal_qr` and requires `public.is_admin(auth.uid())`.
- Admin manual check-in uses `manual_staff_attendance_update` and requires `public.is_admin(auth.uid())`.
- The session QR token identifies only the attendance session, not staff personal data.
- Personal QR tokens identify only a staff profile through `staff_attendance_identity_tokens`; they do not contain email, phone, student ID, or medical data.
- Attendance records store `method`, `checked_by`, `scanned_at`, and optional `note`.
- Token generation uses `extensions.gen_random_bytes(...)` through a helper, so it does not rely on `search_path`.
- New tables have RLS enabled; writes happen through admin/staff RPCs, not through frontend service-role access.
- Staff personal QR token storage/RPCs are included for admin-assisted check-in (`staff_attendance_identity_tokens`, `admin_scan_staff_personal_qr`), but the MVP UI keeps session QR and manual check-in as the primary operational flows.

QR deployment note:

- QR links are generated for the HashRouter deployment format:
  `/#/staff/attendance/scan?token=...`
- Staff can scan using their phone camera. No in-app camera scanner is required for the MVP.
- Staff attendance now also supports an in-browser camera scanner for session QR codes. Camera permission is requested only after tapping the open-camera button.
- Admins can regenerate a session QR; the old QR token stops working immediately.
- Admins can paste a personal QR token or `staff_identity:<token>` text in the attendance session detail page as a faster manual fallback.

Timezone note:

- Attendance form fields use browser-local `datetime-local` values and convert them to ISO before sending to Supabase.
- Attendance timestamps are stored as `timestamptz` and displayed with the `Asia/Bangkok` timezone helper.
- Do not append `Z` to raw `datetime-local` values and do not manually add/subtract seven hours.

## Build

```bash
npm run build
```

## UI/UX Guidelines

TFBP is designed as a mobile-first event operations platform. Public pages should stay simple and privacy-safe, staff pages should prioritize one-hand use during live activities, and admin pages should keep dense data organized with clear sections, filters, and responsive tables.

- Use the shared UI primitives in `src/components/ui` first: `Button`, `Card`, `Input`, `Select`, `PageHeader`, `ResponsiveDataTable`, `Toast`, and modal/confirmation components.
- Keep primary actions obvious. Put secondary or risky actions behind grouped toolbars, action sheets, or confirmation dialogs.
- On mobile, tables should become stacked cards and all touch targets should be at least 44px high.
- Bottom navigation, sticky action bars, and emergency docks must respect `env(safe-area-inset-bottom)` and must not cover Save, Submit, Approve, Reject, Check-in, or emergency call buttons.
- The visual direction is Apple/iOS-inspired: clean surfaces, soft radius, subtle shadow, light glass only where useful, and high contrast for emergency states.
- Avoid exposing sensitive fields in public UI. Public participant and staff cards must default to privacy-safe data only.
- Test long Thai names, long English names, empty states, duplicate warnings, and reduced-motion behavior before event day.

## Production Checklist Before Event Day

- `.env` contains only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for frontend use.
- Supabase migrations are applied through `202605200020_schema_alignment_and_production_hardening.sql`.
- Apply `202605210004_staff_attendance_hybrid_qr.sql` before using staff attendance sessions.
- At least one Supabase Auth user exists in `public.admins`.
- RLS is enabled and public search returns only privacy-safe fields.
- `document-templates` and `document-outputs` Storage buckets are private.
- Public participant search works by name, nickname, major, color group, and subgroup.
- Participant edit request works, including `nickname_en` and consent fields.
- Admin login rejects non-admin Supabase Auth users.
- Unified `/login` sends admins to `/admin/dashboard`, staff accounts to `/staff`, and signs out accounts with no admin/staff access.
- Staff login and no-auth staff profile verify are tested separately.
- Mobile More menu closes on link/button selection, Escape, and backdrop click.
- Data Health shows no critical errors before group announcement.
- Document generation creates a DOCX, stores it in private Storage, and history download works.
- Mobile safe-area spacing is tested on iPhone SE, iPhone 12/13/14, and Android Chrome.

## Mobile Event-Operations Checklist

Before using the app at the event, test on at least one iPhone-sized screen and one Android Chrome device:

- Public search can be reached in 1 tap and results are readable without horizontal scrolling.
- Admin participant lists render as stacked cards on phones; desktop tables remain available on larger screens.
- Bottom navigation is visible, does not cover important buttons, and respects the iPhone safe area.
- Emergency dashboard shows one-tap call buttons for EMS, Head Medic, and Police from any scroll position.
- Staff attendance QR links open `/staff/attendance/scan`, require login, and return staff to the scan flow after sign-in.
- Admin staff attendance manual check-in works on mobile cards without horizontal scrolling.
- Group management can select color/subgroup with horizontal tabs and quick-move participants on touch devices.
- Forms keep Save/Approve/Reject actions reachable near the bottom and do not hide behind the keyboard.
- Text remains readable on iPhone SE width, iPhone 12/13/14 width, Android mid-range widths, tablets, and desktop.
- Focus states are visible with keyboard navigation and all touch targets are at least 44px high.
- `prefers-reduced-motion` disables nonessential motion.
