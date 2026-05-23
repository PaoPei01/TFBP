# Year 2 People Import Guide

## Purpose

This workflow imports the Engineering Faculty year 2 student dataset into the central `people` table for future multi-event prefill, registration, and staff recruitment.

The import is intentionally staged first through `public.people_import_year2_2569`. Admins preview and repair staging data before running the final upsert RPC.

## Why Import To People, Not Profiles

`profiles` is the legacy participant table for the current public participant list. `staff_profiles` is the operational staff table. The year 2 dataset is a broader identity base and must not overwrite either table directly.

Use `people` because it is the multi-event identity/contact base. Existing public pages continue to use legacy public-safe views and should not expose newly imported people rows.

## Convert Excel To CSV

1. Open the Excel file in Numbers, Excel, or Google Sheets.
2. Confirm the header row contains the expected columns:
   `ON`, `Email`, `StudentID`, `FullNameEN`, `FullNameTH`, `NicknameEN`, `NicknameTH`, `PhoneNumber`, `Instagram`, `IDLine`, `MajorEN`, `MajorTH`, `CurriculumTypeEN`, `CurriculumTypeTH`, `ProgramType`, `MedicalCondition`, `DrugAllergy`, `FoodAllergy`.
3. Export or download as CSV.
4. Keep a private copy of the original file and CSV. Do not commit either file.

## Import CSV Into Staging

Use Supabase Table Editor:

1. Open `public.people_import_year2_2569`.
2. Import the CSV.
3. Map CSV columns to staging columns:
   - `ON` -> `source_order`
   - `Email` -> `email_raw`
   - `StudentID` -> `student_id_raw`
   - `FullNameEN` or `FullNameEN (nameEN)` -> `name_en_raw`
   - `FullNameTH` or `FullNameTH (nameTH)` -> `name_th_raw`
   - `NicknameEN` -> `nickname_en_raw`
   - `NicknameTH` -> `nickname_th_raw`
   - `PhoneNumber` -> `phone_raw`
   - `Instagram` -> `instagram_raw`
   - `IDLine` -> `line_id_raw`
   - `MajorEN` -> `major_en_raw`
   - `MajorTH` -> `major_th_raw`
   - `CurriculumTypeEN` -> `curriculum_type_en_raw`
   - `CurriculumTypeTH` -> `curriculum_type_th_raw`
   - `ProgramType` -> `program_type_raw`
   - `MedicalCondition` -> `medical_condition_raw`
   - `DrugAllergy` -> `drug_allergy_raw`
   - `FoodAllergy` -> `food_allergy_raw`

Only admins should be able to read or write the staging table. Do not grant anon access.

## Run Preview

From SQL editor:

```sql
select public.preview_year2_people_import();
```

Or open `/admin/people/import-year2` as an admin and click preview.

Check:

- `total_rows` is about 1111.
- `rows_ready_to_import` is reasonable.
- duplicate student IDs are reviewed.
- invalid phone and email examples are repaired in staging.
- `rows_with_health_data` is detected.

## Run Import

From SQL editor:

```sql
select public.import_year2_people_from_staging();
```

Or open `/admin/people/import-year2` as an admin and click import after preview.

The RPC:

- matches existing people by `student_id` first.
- falls back to matching by normalized email when student ID is missing.
- inserts new people when no match exists.
- updates safe identity/contact fields on existing people.
- sets `faculty = 'คณะวิศวกรรมศาสตร์'`.
- sets `year_level = 2`.
- sets `source = 'eng_year2_2569_excel'`.
- stores non-sensitive import context in `people.metadata`.

## Privacy Notes

Health fields are staged only for detection and review:

- `medical_condition_raw`
- `drug_allergy_raw`
- `food_allergy_raw`

They are not imported into `people`, `people.metadata`, legacy `profiles`, or `staff_profiles` in this pass.

Public pages must continue reading from public-safe participant views/routes. `people` is admin-only by RLS.

## Rollback Notes

Before production import, take a database backup or snapshot.

For a dry rollback after a test import, filter rows with:

```sql
select *
from public.people
where source = 'eng_year2_2569_excel';
```

Do not delete production rows without first confirming whether they were inserted by this import or updated because they already existed. For a conservative rollback, use the change log summary and staging `import_status`/`import_note` values to identify affected rows, then review manually.

## Manual QA Checklist

- [ ] Latest migration is applied.
- [ ] `public.people_import_year2_2569` exists.
- [ ] Staging RLS blocks anon users.
- [ ] Admin can upload/select staging rows.
- [ ] `preview_year2_people_import()` returns a JSON summary.
- [ ] Preview total row count is about 1111.
- [ ] Duplicate student ID examples are visible.
- [ ] Phone numbers that lost a leading zero normalize to 10 digits.
- [ ] Hidden characters in emails are cleaned.
- [ ] Health data row count is detected.
- [ ] `import_year2_people_from_staging()` returns inserted/updated/skipped/error counts.
- [ ] `people` rows are inserted or updated.
- [ ] `people.metadata` contains source context only, not health fields.
- [ ] Public routes still work and do not expose imported `people` rows.
- [ ] No `service_role` key is exposed in frontend code.

## Inspect Imported People

After import, open `/admin/people` as an admin.

Use the People Directory to:

- search by student ID, name, email, or phone.
- filter `source = eng_year2_2569_excel`.
- check missing student ID/email/phone counts.
- confirm duplicate counts before using prefill heavily.
- confirm no health fields appear in the admin directory.

This page is read-only in this phase. It does not merge, delete, or write back to legacy `profiles` or `staff_profiles`.

## Review Duplicates

After inspecting `/admin/people`, admins can open `/admin/people/dedupe`.

Use the dedupe tool only after reviewing source data:

- duplicate groups are candidates, not automatic decisions.
- choose one kept record and one merged record manually.
- confirm the checkbox only when both records are the same person.
- merged records are archived with `merged_into`; they are not hard deleted.
- health fields are not shown or merged by this tool.

## Staff Application Identity Policy

For `parent-orientation-staff-2569`, staff application identity now uses a review-friendly policy:

- Primary identity key is `student_id`.
- Applicants must enter current CMU Mail ending with `@cmu.ac.th`.
- Phone is treated as current contact information, not the main blocking identity factor.
- If student ID exists and CMU Mail matches `people.email`, the application is marked `verified`.
- If student ID exists but CMU Mail differs from old data, the application is allowed with `identity_status = email_mismatch`.
- If student ID exists but old email is missing/uncertain, the application is allowed with `identity_status = pending_identity_review`.
- If student ID is not found, the application is allowed with `identity_status = not_found` and requested identity fields for admin review.

Important privacy rule:

- Public lookup never returns full old email or full old phone.
- Public lookup never returns health data.
- Public users cannot update `people` directly.
- Corrections go to `person_update_requests` and require admin review.

Admin review:

- Open `/admin/people/update-requests`.
- Approve valid CMU Mail/phone/name/major corrections after checking the request.
- Approval updates `people` safe identity/contact fields only.
- Health data is never updated through this flow.
