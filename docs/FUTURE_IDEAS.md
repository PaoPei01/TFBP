# Future Ideas

These ideas are intentionally not part of the current stabilization pass. They may be useful later, but each adds operational complexity and should wait until the core event workflows are stable.

## Do Not Implement Yet

- GPS-based check-in.
- Face recognition.
- Rotating QR every 30 seconds.
- Push notifications.
- Full offline sync.
- AI assistant inside the app.
- A separate mobile app.
- Complex real-time dashboards with subscriptions everywhere.

## Why They Are Deferred

- They can make event-day failures harder to diagnose.
- They often need additional privacy review and user consent.
- They can increase battery, camera, network, and permission issues on phones.
- They may distract from the critical workflows: search, edit requests, staff attendance, manual fallback, emergency access, and reports.

## Safer Future Sequence

1. Stabilize timezone, QR, verified identity, and manual attendance fallback.
2. Run event-day dry runs with real phones and weak network conditions.
3. Add test mode for attendance sessions.
4. Add live operations dashboard with manual refresh.
5. Improve reporting and Document Center integration.
6. Revisit advanced automation only after the real-event core is reliable.

