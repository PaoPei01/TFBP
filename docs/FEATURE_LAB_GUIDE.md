# Feature Lab Guide

## Purpose

Feature Lab is a preview area for future development ideas for Entaneer Gear 56 / สานสัมพันธ์ 69.

It is not a production workflow, not an admin tool, and not a place for real user data.

## Feature Lab vs Production

- Feature Lab uses mock data only.
- Feature Lab actions update local React state only.
- Feature Lab pages do not write to Supabase.
- Feature Lab pages should not be used for real event operations.
- Production routes such as public search, staff tools, admin tools, attendance, and emergency workflows remain separate.

## Routes

- `/#/lab`
- `/#/lab/station-readiness`
- `/#/lab/incident-board`
- `/#/lab/round-control`
- `/#/lab/readiness-checklist`
- `/#/lab/broadcast`

Legacy demo links now redirect:

- `/#/demo` -> `/#/lab`
- `/#/demo/*` -> `/#/lab`

## Mock Data Policy

Mock data lives in:

```text
src/data/featureLabEntaneerGear56.ts
```

Do not put real names, student IDs, phone numbers, emails, health details, incident reports, or operational logs in Feature Lab data.

## Included Ideas

### Station Readiness

Shows a future dashboard idea for checking each station's staff check-in count, equipment status, area status, and coordination needs.

Problem it may solve:

- See every station in one place.
- Reduce repeated messages asking whether a station is ready.
- Help system staff know where to follow up.

### Incident Board

Shows a future field coordination board for mock cases such as lost group, participant feeling unwell, crowded registration area, or rain near a station.

Problem it may solve:

- Prevent cases from getting lost in chat.
- Show who has accepted or forwarded a case.
- Keep a summary after the event.

### Round Control

Shows a future station rotation dashboard for tracking each color group, current station, next station, delay status, and current round.

Problem it may solve:

- Answer where a group is now.
- Help station staff know whether the next group is coming.
- Help timer staff see delays.

### Readiness Checklist

Shows a future checklist for station/faction readiness before the event starts.

Problem it may solve:

- Reduce forgotten setup items.
- Help station leads report readiness consistently.
- Connect to Station Readiness later.

### Broadcast Announcement

Shows a future important announcement feed for staff.

Problem it may solve:

- Keep important messages from sinking in chat.
- Show pinned or important messages quickly.
- Target announcements by role in the future.

## Line and Radio

These ideas do not replace Line or radio.

- Radio is still best for urgent real-time coordination.
- Line is still useful for conversation and photos.
- Feature Lab ideas are about shared state, follow-up, and after-action summaries.

## Safety Notes

- Do not import Supabase write services into Feature Lab pages.
- Do not call insert, update, delete, or write RPCs from Feature Lab pages.
- Do not include Parent Orientation, Document Center, document generation, public applicant demos, or production-like application flows.
- Keep visible warnings that Feature Lab is mock-only and not live operations.
