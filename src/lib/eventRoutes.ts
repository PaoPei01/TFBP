import { DEFAULT_EVENT_SLUG } from './defaultEvent';

export function eventPath(eventSlug = DEFAULT_EVENT_SLUG) {
  return `/events/${eventSlug}`;
}

export function eventRegisterPath(eventSlug = DEFAULT_EVENT_SLUG) {
  return `${eventPath(eventSlug)}/register`;
}

export function eventStaffApplyPath(eventSlug = DEFAULT_EVENT_SLUG) {
  return `${eventPath(eventSlug)}/staff/apply`;
}

export function eventCheckPath(eventSlug = DEFAULT_EVENT_SLUG) {
  return `${eventPath(eventSlug)}/check`;
}

export function adminEventPath(eventId = 'default') {
  return `/admin/events/${eventId}`;
}

export function adminEventApplicationsPath(eventId = 'default') {
  return `${adminEventPath(eventId)}/applications`;
}

export function adminEventsPath() {
  return '/admin/events';
}

export function legacyDefaultEventRoute(route: 'home' | 'edit' | 'admin-dashboard' | 'staff-attendance') {
  const routes = {
    home: '/',
    edit: '/edit',
    'admin-dashboard': '/admin/dashboard',
    'staff-attendance': '/staff/attendance',
  } as const;
  return routes[route];
}
