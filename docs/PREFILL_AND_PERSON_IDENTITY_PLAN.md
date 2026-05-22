# Prefill and Person Identity Plan

## Goal

Known Engineering Faculty year 2 students/staff candidates should not re-enter the same identity information for every event.

The platform should reuse stable person data and ask only event-specific questions.

## Identity Model

Use `people` as the stable identity layer.

Stable fields:

- student ID
- name TH/EN
- nickname
- faculty
- department
- major
- year level
- email
- phone
- LINE/Instagram if intentionally stored as reusable contact data

Event-specific fields:

- participant registration status
- staff application answers
- preferred team/role
- event availability
- group assignment
- attendance records
- event-specific consent
- health info if collected per event

## Lookup Methods

Allow lookup by:

- `student_id`
- email
- phone
- CMU email if available

For sensitive verification, use at least two factors:

- email + phone
- student ID + phone
- CMU email + phone

Do not reveal full profile from a single identifier.

## Public Lookup UX

Step 1: Enter identifier.

If found:

- show "พบข้อมูลของคุณ"
- show partial safe confirmation:
  - nickname or partial name
  - major/year
  - no phone/email display

Then ask second factor before showing/editing sensitive fields.

If not found:

- if event allows external registration, show new person form
- otherwise show "ไม่พบข้อมูล กรุณาติดต่อผู้ดูแล"

## Registration Prefill Flow

Stepper:

1. ยืนยันตัวตน
2. ตรวจสอบข้อมูล
3. ตอบคำถามกิจกรรม
4. ส่งข้อมูล

When known person is found:

- prefill name, major, year
- allow updating missing/outdated contact fields
- lock or mark identity fields that require admin review
- ask event-specific form questions only

When unknown:

- create a new person only if event allows it
- collect minimum identity fields
- mark source as `self_registration`

## Staff Application Prefill Flow

Known Engineering year 2 data should prefill:

- name
- nickname
- student ID
- major
- year level
- email/phone if present

Ask only:

- preferred role/team
- availability
- experience
- motivation
- event-specific answers
- consent

## Deduplication Rules

Match priority:

1. exact normalized `student_id`
2. exact normalized CMU email/email
3. exact normalized phone
4. manual admin merge if conflicts remain

Normalization:

- trim whitespace
- lowercase email
- normalize phone to Thai local format where possible
- clean placeholders such as `-`, `N/A`, `ไม่มี`, `ไม่ระบุ`

## Merge Strategy

Never silently overwrite high-confidence identity fields.

Suggested merge levels:

- automatic: missing contact field can be filled
- review: conflicting email/phone
- admin-only: name, student ID, major/year conflicts

Keep audit logs for merges:

- old data
- new data
- reason
- changed_by

## Security

Rules:

- Do not store raw email/phone in localStorage.
- Do not expose full profile from single-factor lookup.
- Verified local identity should be short-lived or revocable.
- Public lookup should return minimal confirmation only.
- Event application responses should not expose other events.

## Implementation Note: Foundation RPC

Initial foundation now supports a future prefill lookup through `verify_person_identity_for_prefill(input_email, input_phone)`.

Current behavior:

- Requires both email and phone.
- Matches against `public.people`.
- Returns minimal safe identity data only.
- Does not return raw email, phone, health information, or internal notes.

Important limitation:

- This RPC will only find people after `public.people` has been safely populated. Backfill from `profiles` and `staff_profiles` is intentionally deferred until duplicate rules are tested on staging data.

## UX Copy

Known person:

> พบข้อมูลของคุณแล้ว กรุณาตรวจสอบข้อมูลพื้นฐาน จากนั้นตอบคำถามเฉพาะกิจกรรมนี้

Unknown person:

> ไม่พบข้อมูลในฐานข้อมูลเดิม กรุณาตรวจสอบข้อมูลอีกครั้งหรือติดต่อผู้ดูแล

Outdated contact:

> หากเบอร์หรืออีเมลเปลี่ยน สามารถอัปเดตช่องทางติดต่อสำหรับกิจกรรมนี้ได้

## Data Quality Checklist

- [ ] normalized email
- [ ] normalized phone
- [ ] duplicate student ID check
- [ ] duplicate email check
- [ ] duplicate phone check
- [ ] placeholder cleanup
- [ ] manual merge process
- [ ] audit log for merge/update

## What Not To Do

- Do not make public lookup reveal phone/email.
- Do not assume phone alone is enough for sensitive data.
- Do not create duplicate people for the same student ID.
- Do not write event-specific answers into `people`.
- Do not force known people to fill all base fields again.
