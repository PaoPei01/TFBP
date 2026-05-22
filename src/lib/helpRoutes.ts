import { getGuideTopicById } from './guideRegistry';

export const routeHelpTopics = [
  { pattern: '/', topicId: 'participant.search' },
  { pattern: '/edit', topicId: 'participant.edit-info' },
  { pattern: '/staff/profile/verify', topicId: 'staff.profile-verify' },
  { pattern: '/staff/attendance', topicId: 'staff-attendance.overview' },
  { pattern: '/staff/attendance/scan', topicId: 'staff-attendance.session-qr' },
  { pattern: '/staff/profile/qr', topicId: 'staff.personal-qr' },
  { pattern: '/admin/dashboard', topicId: 'admin.dashboard' },
  { pattern: '/admin/groups', topicId: 'admin.groups' },
  { pattern: '/admin/staff', topicId: 'admin.participants' },
  { pattern: '/admin/staff/attendance', topicId: 'admin-attendance.create-session' },
  { pattern: '/admin/staff/attendance/:sessionId', topicId: 'admin-attendance.session-qr' },
  { pattern: '/admin/documents', topicId: 'documents.overview' },
  { pattern: '/admin/documents/templates', topicId: 'documents.templates' },
  { pattern: '/admin/documents/generate', topicId: 'documents.generate' },
  { pattern: '/admin/emergency', topicId: 'emergency.overview' },
  { pattern: '/staff/emergency', topicId: 'emergency.overview' },
] as const;

export function getDefaultHelpTopicForPath(pathname: string): string | null {
  const normalized = pathname === '' ? '/' : pathname;
  const exact = routeHelpTopics.find((item) => item.pattern === normalized);
  if (exact && getGuideTopicById(exact.topicId)) return exact.topicId;
  const dynamic = routeHelpTopics.find((item) => {
    if (!item.pattern.includes('/:')) return false;
    const prefix = item.pattern.split('/:')[0];
    return normalized.startsWith(`${prefix}/`);
  });
  return dynamic && getGuideTopicById(dynamic.topicId) ? dynamic.topicId : null;
}
