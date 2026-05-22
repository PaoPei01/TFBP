# Multi-Event Architecture

## Core Concept

The platform should separate identity from event participation.

Today, a row in `profiles` behaves like "this person in this event." In a reusable platform, those concerns must split:

- `people`: stable person identity.
- `events`: activity/event metadata.
- `event_participants`: a person's participant status for one event.
- `event_staff`: a person's staff assignment for one event.
- `event_roles`: event-specific permissions.
- event-scoped attendance, announcements, documents, forms, reports.

This allows:

- One person to participate in many events.
- One person to be staff in one event and participant in another.
- Known Engineering Faculty year 2 people to reuse existing identity data.
- Event-specific questions to stay event-specific rather than polluting the base identity profile.

## Default Event

The current app should be represented as the first event:

```ts
name_th: "สานสัมพันธ์ 69"
name_en: "Entaneer Bonding 69"
slug: "entaneer-bonding-69"
```

All existing data should initially map to this default event.

## Proposed Core Tables

### `people`

Stable identity and reusable base data:

- student ID
- Thai/English names
- nickname
- major/faculty/department/year
- email/phone/contact channels
- source and timestamps

This table should not contain event-specific answers such as preferred staff team, group assignment, attendance status, or document data.

### `events`

Event metadata and lifecycle:

- Thai/English names
- slug
- event type
- academic year
- start/end dates
- location
- status
- visibility
- cover image path

### `event_participants`

Participant relationship for a person in one event:

- registration status
- participant type
- main group/subgroup for that event
- registration/approval timestamps
- metadata for event-specific operational data

### `event_staff`

Staff relationship for a person in one event:

- staff role/team
- main group/subgroup/base/event assignment
- status
- linked staff application
- approval metadata

### `staff_applications`

Staff recruitment answers:

- preferred role/team
- availability
- experience
- motivation
- status/review notes
- answers JSON for event-specific form questions

### `event_roles`

Event-scoped permission model:

- `event_admin`
- `staff_manager`
- `group_leader`
- `staff`
- `emergency_staff`
- `document_manager`
- `viewer`

This prevents a staff/admin role in one event from becoming global.

### `event_forms`

Configurable event forms:

- participant registration
- staff application
- staff profile update
- health info
- attendance precheck

### `event_form_responses`

Event-specific responses. These should link to `people` but not rewrite stable identity fields without review.

### `event_attendance_sessions` and `event_attendance_records`

Attendance should be event-scoped from the beginning in the new model. Legacy attendance can map to the default event.

### `event_announcements`

Announcements should belong to an event, with optional platform-level announcements if needed.

### `event_documents`

Generated documents and project profiles should belong to an event.

## Legacy Mapping

| Legacy object | Future object |
|---|---|
| `profiles` | `people` + `event_participants` for default event |
| `staff_profiles` | `people` + `event_staff` for default event |
| `group_assignments` | default event `event_participants.main_group/subgroup` |
| `staff_assignments` | default event `event_staff` fields and `event_roles` |
| `staff_attendance_sessions` | `event_attendance_sessions` or add `event_id` |
| `staff_attendance_records` | `event_attendance_records` or add `event_id` through session |
| `announcements` | `event_announcements` or add `event_id` |
| `document_project_profiles` | event document project profile |
| `document_templates` | global or event-scoped templates |
| `generated_documents` | event generated documents |
| participant edit requests | person update requests and event participant update requests |
| staff edit requests | person update requests and event staff update requests |

## Event Context

Frontend should eventually have a current event context:

- selected event from URL
- default event fallback
- admin event switcher
- last selected event in local storage

Services should accept event context:

```ts
fetchPublicProfiles({ eventSlug, search, major, mainGroup, subgroup })
fetchAdminSummary({ eventId })
fetchAdminStaffAttendance({ eventId, sessionId })
fetchAnnouncements({ eventSlug })
```

## Backward Compatibility

Do not remove existing routes.

Initial mapping:

- `/` -> default event participant search or platform home depending config.
- `/edit` -> default event check/edit flow.
- `/admin/dashboard` -> default event admin dashboard.
- `/staff/attendance` -> current/default event staff attendance.
- `/admin/documents` -> default event document center.

Later, event-specific routes can be introduced without breaking existing bookmarks:

- `/events/:eventSlug`
- `/events/:eventSlug/register`
- `/events/:eventSlug/staff/apply`
- `/admin/events/:eventId`

## Security Model

Use two levels:

1. Platform-level admin for superuser/project owners.
2. Event-level roles for each event.

Public access should use privacy-safe views/RPCs:

- no phone
- no email
- no medical data
- no emergency data
- no internal notes

Verified flows should require enough proof for sensitive data:

- event participant self-check: email + phone or authenticated account
- staff verified flow: email + phone
- admin actions: server-side admin/event-role checks

## Storage Model

Recommended future paths:

- Event cover images: `event-assets/events/{event_id}/cover.webp`
- Document templates: `document-templates/events/{event_id}/...` or `document-templates/global/...`
- Document outputs: `document-outputs/events/{event_id}/{yyyy-mm-dd}/...`
- Staff avatars can remain stable by staff/person identity: `staff/{staff_profile_id}/avatar.webp`

## Architecture Principle

The app should evolve from:

> one activity app with global tables

to:

> event platform with a default event compatibility layer

The compatibility layer is what keeps the current single-event workflow stable while future events are added.
