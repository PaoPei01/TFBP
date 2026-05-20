# UI Testing Checklist

## Viewports

- iPhone SE width
- iPhone 12/13/14 width
- Android mid-range width
- tablet
- desktop

## Roles

- public user sees only Home, Search, Edit info
- staff sees only allowed staff routes
- emergency_staff sees emergency tools without admin tools
- admin sees dashboard, groups, staff, emergency, logs

## Critical Flows

- public search does not leak email, phone, Line, Instagram, Facebook, emergency phone, disease, allergies, or drug allergies
- staff can mark present, late, absent, excused on mobile with visible buttons
- attendance offline queue banner appears and sync button is reachable
- emergency numbers are reachable in one tap
- emergency page still shows hotline cache when offline
- admin can clear groups only after typed confirmation
- admin can import staff with preview, warnings, duplicates, and confirmation

## Data States

- long Thai names
- long English names
- empty data states
- duplicate staff import rows
- import rows with missing fields
- group imbalance warnings
- locked group state
- unsaved group draft state

## Accessibility

- keyboard focus is visible
- Escape closes modals
- icon-only buttons have aria-label
- touch targets are at least 44px
- status indicators include text, not only color
- tables have visible headers on desktop
