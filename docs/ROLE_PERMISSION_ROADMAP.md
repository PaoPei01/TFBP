# Role Permission Roadmap

Purpose: prepare future role-based access control without weakening the current admin/staff guards.

## Current Direction

- Keep `AdminGuard` strict for admin-only pages.
- Keep `StaffGuard` for authenticated staff routes.
- Keep verified email + phone flows limited to specific staff actions such as attendance identity and profile verification.
- Do not make staff users admins.

## Proposed Future Roles

- `super_admin`: full platform and event setup access.
- `admin`: event administration, participant management, staff management, attendance, announcements, exports.
- `staff_manager`: staff applications, staff assignment, staff attendance operations.
- `group_leader`: assigned group views, attendance support, group communication.
- `mentor`: staff/group participant support with limited data.
- `emergency_staff`: emergency and health safety workflows only.
- `document_manager`: Document Center templates, generation, and history.
- `viewer`: read-only dashboards and reports.

## Route Access Sketch

| Area | Suggested roles |
| --- | --- |
| `/admin/dashboard` | `super_admin`, `admin` |
| `/admin/staff` | `super_admin`, `admin`, `staff_manager` |
| `/admin/staff/attendance` | `super_admin`, `admin`, `staff_manager` |
| `/admin/documents` | `super_admin`, `admin`, `document_manager` |
| `/admin/emergency` | `super_admin`, `admin`, `emergency_staff` |
| `/staff/my-group` | `group_leader`, `mentor`, `staff` scoped by assignment |
| `/staff/emergency` | `emergency_staff` |

## Migration Strategy

1. Document existing admin/staff permissions and RPC checks.
2. Add event-scoped role tables only after the multi-event model is ready.
3. Update RPCs first so server-side authorization is authoritative.
4. Update frontend guards after server-side checks exist.
5. Keep old admin behavior as a fallback during transition.

## Risks

- A frontend-only permission rewrite would be unsafe.
- Role names can drift between UI and RPCs if not centralized.
- Event-scoped roles require careful migration from existing single-event admin/staff assumptions.

