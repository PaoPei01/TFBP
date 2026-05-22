# Multi-Event Migration Audit

Date: 2026-05-22

## Executive Summary

TFBP is currently a strong single-event operations app for `สานสัมพันธ์ 69 / Entaneer Bonding 69`. The product surface is broad: participant search, verified edit requests, group assignment, staff profile operations, attendance QR, emergency dashboard, announcements, data health, and document generation.

The main single-event assumption is that a person, participant profile, staff profile, group assignment, attendance record, announcement, and document all implicitly belong to the current event. There is no first-class `events` table and most frontend services fetch global rows without an event filter.

The safest path is an additive migration:

1. Add `events` and a default event.
2. Add `people` as the identity layer.
3. Link legacy `profiles` and `staff_profiles` to `people` and default event without changing existing routes.
4. Add event-scoped tables for new flows.
5. Gradually route admin/staff/public views through an event context.

Do not add `event_id` everywhere in one migration. That would risk breaking public search, staff attendance, document center, RLS, and RPCs at the same time.

## Current Single-Event Assumptions

| Area | Current assumption | Risk in multi-event mode | Safe first step |
|---|---|---|---|
| `profiles` | One profile row means participant for the current activity | Same person registering for multiple events would duplicate identity fields | Create `people`, then map profile rows to `people` + default event participant |
| `staff_profiles` | Staff identity and event staff assignment are blended | A person can be staff in one event and participant in another | Keep staff identity legacy; add future `event_staff` mapping |
| `group_assignments` | Group color/subgroup belongs to the single activity | Group assignment may differ per event | Future event-scoped participant/staff group fields |
| Staff assignments | `staff_assignments` and roles are global to current activity | Role/team/base differs per event | Add `event_staff`, `event_roles` later |
| Attendance | `staff_attendance_sessions` and records are global | Staff could check into wrong event session | Add `event_id` with default event fallback later |
| Announcements | Announcements are global | Future events would show wrong announcements | Add `event_id`, default event mapping, and event filter |
| Document Center | Project profile/templates/history are global | Templates and generated docs can mix between events | Add event-scoped document project/profile/history |
| Edit requests | Participant/staff requests assume one current profile | Need event-specific edit requests vs person identity changes | Split person updates from event participation updates |
| Staff verified flows | Email+phone identifies a staff profile for current event | Same person may be staff candidate across events | Verify against `people`, then event-specific staff/application context |
| Public list | `/` searches current activity only | Platform homepage needs active events first | Keep legacy `/` as default event until event homepage is ready |
| Admin dashboard | `/admin/dashboard` summarizes global current activity | Multi-event admins need event switcher and scoped metrics | Redirect or wrap with current/default event context later |
| Storage buckets | Avatars/templates/outputs are not event namespaced, except stable staff avatar path | Document/template files can mix by event | Use event folder prefixes for future document storage |

## Database and RPC Audit

### Participant and Profile Data

Existing tables/RPCs are optimized for the current event:

- `profiles`
- `edit_requests`
- `group_assignments`
- `public_profiles` view
- `search_public_profiles`
- `submit_edit_request`
- `approve_edit_request`
- `update_profile_admin`

Single-event risks:

- Public search has no event filter.
- Edit requests cannot distinguish person identity updates from event participation updates.
- Admin profile update writes directly to the current global profile row.
- Data Health checks are event-global and should later be event-scoped plus identity-global.

### Staff Data

Existing staff system:

- `staff_profiles`
- `staff_assignments`
- `staff_public_profiles`
- `staff_edit_requests`
- verified staff profile RPCs
- staff avatar bucket `staff-avatars`

Single-event risks:

- Staff public visibility is not event-scoped.
- `primary_role`, `base_number`, `main_group`, `subgroup` are event role/assignment data but are attached to a global staff record.
- Personal QR currently identifies staff for attendance; it should eventually identify a `person` or `event_staff` depending on the flow.

### Attendance

Current attendance system:

- `staff_attendance_sessions`
- `staff_attendance_records`
- `staff_attendance_identity_tokens`
- QR scan RPCs
- verified identity cache support

Single-event risks:

- Sessions are not tied to an event.
- Personal QR admin scan must ensure the selected session belongs to current event later.
- CSV exports are event-global today.

Safe future migration:

- Add `event_id` nullable initially.
- Backfill existing sessions to default event.
- Make RPCs default to current/default event when `event_id` is null.
- Require event filter only after all services support it.

### Announcements

Current:

- `announcements`
- public announcements list/detail
- admin announcement CRUD

Risks:

- Future event users may see announcements from the wrong event.
- Public homepage cannot split general platform announcements from event announcements.

Safe future migration:

- Add `event_id` nullable.
- Backfill to default event.
- Allow platform-level announcements with `event_id is null` only if explicitly needed.

### Document Center

Current:

- `document_project_profiles`
- `document_templates`
- child rows for budget/schedule/venue/equipment
- `generated_documents`
- private storage buckets `document-templates`, `document-outputs`
- RPCs `save_document_project_profile`, `create_generated_document_record`

Risks:

- Project profile is effectively the current event profile.
- Templates may be reusable across events, but generated output must be event-scoped.
- Storage paths do not include event slug.

Safe future migration:

- Add `event_id` to project profile and generated docs.
- Optionally make templates global or event-scoped with `event_id nullable`.
- Prefix generated output paths with `events/{event_slug}/...`.

### Routes

Current routes are single-event oriented:

- `/`
- `/edit`
- `/announcements`
- `/admin/dashboard`
- `/admin/groups`
- `/admin/staff`
- `/admin/staff/attendance`
- `/staff/attendance`
- `/staff/my-group`
- `/admin/documents`

Future event routes:

- `/events`
- `/events/:eventSlug`
- `/events/:eventSlug/register`
- `/events/:eventSlug/staff/apply`
- `/events/:eventSlug/check`
- `/admin/events`
- `/admin/events/:eventId`

Backward compatibility:

- Keep current routes.
- Map current routes to the default event until the event context is fully shipped.

### Services

Services currently fetch global data:

- `profiles.ts`
- `staffProfiles.ts`
- `staffAttendance.ts`
- `announcements.ts`
- `documents.ts`
- `groups.ts`
- `emergency.ts`

Required future pattern:

- Accept optional `eventId` or `eventSlug`.
- Default to `DEFAULT_EVENT_SLUG`.
- Never expose private fields in public event routes.

### RLS and Security

Current RLS is mostly role/RPC focused. Multi-event introduces event-specific permissions:

- A person may be event admin for one event but not another.
- Staff may view only their assigned event.
- Public event pages must not expose global people records.
- Verified lookup must reveal minimal confirmation only.

Future RLS needs:

- `event_roles`
- helper RPC `has_event_role(event_id, roles[])`
- public views that filter by event visibility and event-specific public flags.

## Storage Buckets

Current buckets:

- `staff-avatars`: stable staff avatar path.
- `document-templates`: private document templates.
- `document-outputs`: private generated outputs.

Multi-event notes:

- Staff avatar should remain person/staff identity scoped, not event-scoped.
- Generated documents should be event-scoped.
- Event cover images should use a new bucket or path namespace, e.g. `event-assets/events/{event_id}/cover.webp`.

## Risky Areas

P0 risks before any real multi-event migration:

- Public search could leak participants across events if event filters are optional or missed.
- Admin dashboards could mix current and archived events.
- Attendance QR could check staff into the wrong event if sessions are not scoped.
- Staff verified identity cache could be reused across events without confirming the event role.
- Document outputs could mix event files if event pathing is not added.
- RLS could grant global admin behavior where only event admin should be allowed.

## Recommended Migration Strategy

1. Add documentation, types, and route helpers only.
2. Add `events` with default event.
3. Add `people`.
4. Backfill legacy data into people and default event bridge rows.
5. Add event context utilities and event switcher.
6. Add new event-scoped registration/staff application flows.
7. Add event_id to attendance and announcements with fallback.
8. Scope documents and generated reports.
9. Gradually convert legacy routes to default/current event wrappers.

## Safe First Steps

- Add `eventTypes.ts`, `defaultEvent.ts`, `eventRoutes.ts`.
- Add an `EventSwitcher` placeholder that does not change active data.
- Extend Guide content with multi-event planning topics.
- Do not create destructive migrations.
- Do not change existing Supabase RPC behavior yet.
