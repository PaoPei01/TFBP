# Multi-Event UX Plan

## UX Principle

The platform should feel like:

> choose an event, then complete the task for that event

not:

> use one giant admin system and remember which activity you are editing

Every event-scoped page must make the current event visible.

## 1. New Homepage

Route:

- `/events`
- optionally `/` if platform mode is enabled later

Main sections:

- hero: "กิจกรรมทั้งหมด"
- active/upcoming event cards
- "กิจกรรมที่เปิดรับสมัคร"
- "กิจกรรมที่เปิดรับสตาฟ"
- guide/help entry

Event card content:

- event name
- date/location
- registration status
- staff recruitment status
- primary action

Mobile:

- one-column cards
- main action visible without horizontal scroll
- filters collapsed

Desktop:

- grid cards with summary badges
- quick filters by status/type

## 2. Event Detail Page

Route:

- `/events/:eventSlug`

Sections:

- event overview
- registration status
- staff recruitment status
- announcements
- action buttons:
  - `ลงทะเบียนเข้าร่วม`
  - `สมัครเป็นทีมงาน`
  - `ตรวจสอบข้อมูลของฉัน`
  - `ดูประกาศ`

UX notes:

- Keep the event name visible in the first viewport.
- Show disabled/closed states clearly.
- Avoid showing admin controls to public users.

## 3. Participant Registration Flow

Route:

- `/events/:eventSlug/register`

Stepper:

1. ยืนยันตัวตน
2. ตรวจสอบข้อมูล
3. ตอบคำถามกิจกรรม
4. ส่งข้อมูล

Flow:

1. User enters student ID, email, or phone.
2. If found, show safe confirmation card:
   - partial name/nickname
   - major/year
   - no full sensitive fields until second factor if needed
3. If not found:
   - allow new person if event accepts external users
   - otherwise show "ไม่พบข้อมูล กรุณาติดต่อผู้ดูแล"
4. Ask only event-specific questions.
5. Submit registration.
6. Show status and next steps.

## 4. Staff Application Flow

Route:

- `/events/:eventSlug/staff/apply`

Stepper:

1. ยืนยันตัวตน
2. ตรวจสอบข้อมูลพื้นฐาน
3. เลือกทีม/หน้าที่
4. ส่งใบสมัคร

Fields:

- preferred role/team
- availability
- experience
- motivation
- consent
- event-specific questions

Prefill:

- name
- major
- year
- known contact fields

UX notes:

- Make clear this is an application, not instant staff access.
- Show application status after submission.
- Let known Engineering year 2 students avoid retyping base identity fields.

## 5. Admin Event Dashboard

Routes:

- `/admin/events`
- `/admin/events/:eventId`

Admin can:

- create event
- edit event
- open/close registration
- open/close staff recruitment
- manage participants
- review staff applications
- assign staff roles
- run attendance
- generate documents
- export reports

Event admin page layout:

1. Event header
2. Status controls
3. Summary cards
4. Primary operations
5. Recent issues/pending approvals

Operations:

- Participants
- Staff applications
- Staff assignments
- Attendance
- Announcements
- Documents
- Reports

## 6. Event Switcher

Component:

- `EventSwitcher`

Placement:

- admin top area or page header meta
- staff pages if staff has access to more than one event

Behavior:

- show current event name
- dropdown/list of accessible events
- remember last selected event
- avoid changing legacy data in first placeholder implementation

Mobile:

- use compact select/action sheet
- keep touch target at least 44px

Desktop:

- dropdown button in page header/top nav

## 7. Backward Compatibility

Existing routes should keep working:

- `/` remains default event public list or later platform home based on config.
- `/edit` maps to default event check/edit flow.
- `/admin/dashboard` maps to default event admin dashboard.
- `/staff/attendance` maps to current/default event attendance.
- `/admin/documents` maps to default event document center.

Future redirects:

- `/edit` -> `/events/entaneer-bonding-69/check`
- `/admin/dashboard` -> `/admin/events/default`
- `/staff/attendance` -> current/default event attendance

Do this only after event context is implemented.

## UX Risks

- Event switcher hidden on mobile can cause admins to edit the wrong event.
- Old routes without event labels may confuse users once multiple events exist.
- Registration lookup can leak identity if it reveals too much before verification.
- Staff applications must not look like immediate approval.
- Attendance QR must show event/session name clearly.

## Safe UX First Steps

- Add default event constants for labels/links.
- Add guide topics explaining multi-event concepts.
- Add placeholder EventSwitcher that displays current default event without changing data.
- Do not change homepage behavior yet.
