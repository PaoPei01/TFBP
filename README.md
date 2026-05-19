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

7. Create an admin account in Supabase Auth.

8. Add that account to `admins`:

   ```sql
   insert into public.admins (user_id, role)
   values ('AUTH_USER_UUID_HERE', 'admin');
   ```

9. Run locally:

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
- `/admin` - admin login
- `/admin/dashboard` - admin dashboard
- `/admin/groups` - smart group assignment dashboard
- `/admin/requests` - pending edit requests
- `/admin/logs` - change log

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

## Build

```bash
npm run build
```
