# Emergency Incident Roadmap

Purpose: outline a future restricted incident workflow without adding sensitive features prematurely.

## Goal

Create a fast, mobile-friendly incident log for emergency staff and admins while protecting health and contact data.

## Potential Routes

- `/admin/emergency/incidents`
- `/staff/emergency/incidents`

## Suggested Incident Fields

- Incident time.
- Person involved.
- Main symptom or issue.
- Action taken.
- Referred to hospital or clinic.
- Responsible staff.
- Status.
- Private note.

## Security Rules

- Emergency incidents must be admin/emergency-staff only.
- Do not expose incident data publicly.
- Writes should go through RPCs with server-side permission checks.
- Change log/audit trail should capture actor, time, status changes, and notes.
- Export must be restricted and clearly labeled as sensitive.

## UX Principles

- Mobile-first, one-column form.
- Minimal required fields.
- Large primary action.
- Clear privacy warning.
- Fast status update buttons.
- Avoid raw medical terminology unless needed by the safety team.

## Recommended Implementation Phases

1. Audit existing emergency data fields and access rules.
2. Design RLS/RPCs for incident create/update/list.
3. Add incident list and create form behind existing emergency permissions.
4. Add export only after audit trail is verified.
5. Add guide/help topic and manual QA cases.

