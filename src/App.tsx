import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AdminGuard } from './components/AdminGuard';
import { Layout } from './components/Layout';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { StaffGuard } from './components/StaffGuard';
import { PublicListPage } from './pages/PublicListPage';
import { VerifyEditPage } from './pages/VerifyEditPage';

// Auth, public, admin, and staff pages are grouped here to keep route ownership readable.
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const AdminAnnouncementsPage = lazy(() => import('./pages/AdminAnnouncementsPage').then((module) => ({ default: module.AdminAnnouncementsPage })));
const AuthLoginPage = lazy(() => import('./pages/AuthLoginPage').then((module) => ({ default: module.AuthLoginPage })));
const AdminStaffProfilePage = lazy(() => import('./pages/AdminStaffProfilePage').then((module) => ({ default: module.AdminStaffProfilePage })));
const AnnouncementDetailPage = lazy(() => import('./pages/AnnouncementDetailPage').then((module) => ({ default: module.AnnouncementDetailPage })));
const AnnouncementEditPage = lazy(() => import('./pages/AnnouncementEditPage').then((module) => ({ default: module.AnnouncementEditPage })));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage').then((module) => ({ default: module.AnnouncementsPage })));
const ChangeLogPage = lazy(() => import('./pages/ChangeLogPage').then((module) => ({ default: module.ChangeLogPage })));
const DataHealthPage = lazy(() => import('./pages/DataHealthPage').then((module) => ({ default: module.DataHealthPage })));
const EmergencyDashboardPage = lazy(() => import('./pages/EmergencyDashboardPage').then((module) => ({ default: module.EmergencyDashboardPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then((module) => ({ default: module.EventsPage })));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then((module) => ({ default: module.EventDetailPage })));
const EventRegisterPage = lazy(() => import('./pages/EventRegisterPage').then((module) => ({ default: module.EventRegisterPage })));
const EventStaffApplyPage = lazy(() => import('./pages/EventStaffApplyPage').then((module) => ({ default: module.EventStaffApplyPage })));
const GroupDashboardPage = lazy(() => import('./pages/GroupDashboardPage').then((module) => ({ default: module.GroupDashboardPage })));
const DocumentCenterPage = lazy(() => import('./pages/DocumentCenterPage').then((module) => ({ default: module.DocumentCenterPage })));
const DocumentGeneratePage = lazy(() => import('./pages/DocumentGeneratePage').then((module) => ({ default: module.DocumentGeneratePage })));
const DocumentHistoryPage = lazy(() => import('./pages/DocumentHistoryPage').then((module) => ({ default: module.DocumentHistoryPage })));
const DocumentSettingsPage = lazy(() => import('./pages/DocumentSettingsPage').then((module) => ({ default: module.DocumentSettingsPage })));
const DocumentTemplatesPage = lazy(() => import('./pages/DocumentTemplatesPage').then((module) => ({ default: module.DocumentTemplatesPage })));
const GuideCenterPage = lazy(() => import('./pages/GuideCenterPage').then((module) => ({ default: module.GuideCenterPage })));
const GuideCategoryPage = lazy(() => import('./pages/GuideCategoryPage').then((module) => ({ default: module.GuideCategoryPage })));
const GuideTopicPage = lazy(() => import('./pages/GuideTopicPage').then((module) => ({ default: module.GuideTopicPage })));
const PendingRequestsPage = lazy(() => import('./pages/PendingRequestsPage').then((module) => ({ default: module.PendingRequestsPage })));
const AdminEventsPage = lazy(() => import('./pages/AdminEventsPage').then((module) => ({ default: module.AdminEventsPage })));
const AdminEventDetailPage = lazy(() => import('./pages/AdminEventDetailPage').then((module) => ({ default: module.AdminEventDetailPage })));
const AdminEventApplicationsPage = lazy(() => import('./pages/AdminEventApplicationsPage').then((module) => ({ default: module.AdminEventApplicationsPage })));
const AdminPeopleDedupePage = lazy(() => import('./pages/AdminPeopleDedupePage').then((module) => ({ default: module.AdminPeopleDedupePage })));
const AdminPeoplePage = lazy(() => import('./pages/AdminPeoplePage').then((module) => ({ default: module.AdminPeoplePage })));
const AdminStaffAttendancePage = lazy(() => import('./pages/AdminStaffAttendancePage').then((module) => ({ default: module.AdminStaffAttendancePage })));
const AdminStaffAttendanceSessionPage = lazy(() => import('./pages/AdminStaffAttendanceSessionPage').then((module) => ({ default: module.AdminStaffAttendanceSessionPage })));
const StaffAttendancePage = lazy(() => import('./pages/StaffAttendancePage').then((module) => ({ default: module.StaffAttendancePage })));
const StaffAttendanceScanPage = lazy(() => import('./pages/StaffAttendanceScanPage').then((module) => ({ default: module.StaffAttendanceScanPage })));
const StaffDashboardPage = lazy(() => import('./pages/StaffDashboardPage').then((module) => ({ default: module.StaffDashboardPage })));
const StaffDirectoryPage = lazy(() => import('./pages/StaffDirectoryPage').then((module) => ({ default: module.StaffDirectoryPage })));
const StaffEditRequestsPage = lazy(() => import('./pages/StaffEditRequestsPage').then((module) => ({ default: module.StaffEditRequestsPage })));
const StaffImportPage = lazy(() => import('./pages/StaffImportPage').then((module) => ({ default: module.StaffImportPage })));
const StaffManagementPage = lazy(() => import('./pages/StaffManagementPage').then((module) => ({ default: module.StaffManagementPage })));
const StaffMobilePage = lazy(() => import('./pages/StaffMobilePage').then((module) => ({ default: module.StaffMobilePage })));
const StaffOperationsPage = lazy(() => import('./pages/StaffOperationsPage').then((module) => ({ default: module.StaffOperationsPage })));
const StaffProfileEditPage = lazy(() => import('./pages/StaffProfileEditPage').then((module) => ({ default: module.StaffProfileEditPage })));
const StaffProfilePage = lazy(() => import('./pages/StaffProfilePage').then((module) => ({ default: module.StaffProfilePage })));
const StaffProfileVerifyPage = lazy(() => import('./pages/StaffProfileVerifyPage').then((module) => ({ default: module.StaffProfileVerifyPage })));
const StaffPersonalQrPage = lazy(() => import('./pages/StaffPersonalQrPage').then((module) => ({ default: module.StaffPersonalQrPage })));
const Year2PeopleImportPage = lazy(() => import('./pages/Year2PeopleImportPage').then((module) => ({ default: module.Year2PeopleImportPage })));

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PublicListPage />} />
        <Route path="announcements" element={<Suspense fallback={<LoadingSkeleton />}><AnnouncementsPage /></Suspense>} />
        <Route path="announcements/:id" element={<Suspense fallback={<LoadingSkeleton />}><AnnouncementDetailPage /></Suspense>} />
        <Route path="events" element={<Suspense fallback={<LoadingSkeleton />}><EventsPage /></Suspense>} />
        <Route path="events/:eventSlug" element={<Suspense fallback={<LoadingSkeleton />}><EventDetailPage /></Suspense>} />
        <Route path="events/:eventSlug/register" element={<Suspense fallback={<LoadingSkeleton />}><EventRegisterPage /></Suspense>} />
        <Route path="events/:eventSlug/staff/apply" element={<Suspense fallback={<LoadingSkeleton />}><EventStaffApplyPage /></Suspense>} />
        <Route path="guide" element={<Suspense fallback={<LoadingSkeleton />}><GuideCenterPage /></Suspense>} />
        <Route path="guide/:category" element={<Suspense fallback={<LoadingSkeleton />}><GuideCategoryPage /></Suspense>} />
        <Route path="guide/:category/:topic" element={<Suspense fallback={<LoadingSkeleton />}><GuideTopicPage /></Suspense>} />
        <Route path="edit" element={<VerifyEditPage />} />
        <Route path="staff/profile/verify" element={<Suspense fallback={<LoadingSkeleton />}><StaffProfileVerifyPage /></Suspense>} />
        <Route path="staff/profile/qr" element={<Suspense fallback={<LoadingSkeleton />}><StaffPersonalQrPage /></Suspense>} />
        <Route path="staff/attendance" element={<Suspense fallback={<LoadingSkeleton />}><StaffAttendancePage /></Suspense>} />
        <Route path="staff/attendance/scan" element={<Suspense fallback={<LoadingSkeleton />}><StaffAttendanceScanPage /></Suspense>} />
        <Route path="login" element={<Suspense fallback={<LoadingSkeleton />}><AuthLoginPage /></Suspense>} />
        <Route path="admin" element={<Suspense fallback={<LoadingSkeleton />}><AuthLoginPage /></Suspense>} />
        <Route element={<StaffGuard roles={['staff', 'mentor', 'viewer', 'emergency_staff']} />}>
          <Route path="staff" element={<Suspense fallback={<LoadingSkeleton />}><StaffDashboardPage /></Suspense>} />
          <Route path="staff/profile" element={<Suspense fallback={<LoadingSkeleton />}><StaffProfilePage /></Suspense>} />
          <Route path="staff/profile/edit" element={<Suspense fallback={<LoadingSkeleton />}><StaffProfileEditPage /></Suspense>} />
          <Route path="staff/directory" element={<Suspense fallback={<LoadingSkeleton />}><StaffDirectoryPage /></Suspense>} />
        </Route>
        <Route element={<StaffGuard roles={['staff', 'mentor', 'viewer']} />}>
          <Route path="staff/my-group" element={<Suspense fallback={<LoadingSkeleton />}><StaffMobilePage /></Suspense>} />
        </Route>
        <Route element={<StaffGuard requireEmergency />}>
          <Route path="staff/emergency" element={<Suspense fallback={<LoadingSkeleton />}><EmergencyDashboardPage /></Suspense>} />
        </Route>
        <Route element={<AdminGuard />}>
          <Route path="admin/dashboard" element={<Suspense fallback={<LoadingSkeleton />}><AdminDashboardPage /></Suspense>} />
          <Route path="admin/events" element={<Suspense fallback={<LoadingSkeleton />}><AdminEventsPage /></Suspense>} />
          <Route path="admin/events/:eventId/applications" element={<Suspense fallback={<LoadingSkeleton />}><AdminEventApplicationsPage /></Suspense>} />
          <Route path="admin/events/:eventId" element={<Suspense fallback={<LoadingSkeleton />}><AdminEventDetailPage /></Suspense>} />
          <Route path="admin/announcements" element={<Suspense fallback={<LoadingSkeleton />}><AdminAnnouncementsPage /></Suspense>} />
          <Route path="admin/announcements/new" element={<Suspense fallback={<LoadingSkeleton />}><AnnouncementEditPage /></Suspense>} />
          <Route path="admin/announcements/:id/edit" element={<Suspense fallback={<LoadingSkeleton />}><AnnouncementEditPage /></Suspense>} />
          <Route path="admin/emergency" element={<Suspense fallback={<LoadingSkeleton />}><EmergencyDashboardPage /></Suspense>} />
          <Route path="admin/groups" element={<Suspense fallback={<LoadingSkeleton />}><GroupDashboardPage /></Suspense>} />
          <Route path="admin/staff" element={<Suspense fallback={<LoadingSkeleton />}><StaffManagementPage /></Suspense>} />
          <Route path="admin/staff/attendance" element={<Suspense fallback={<LoadingSkeleton />}><AdminStaffAttendancePage /></Suspense>} />
          <Route path="admin/staff/attendance/:sessionId" element={<Suspense fallback={<LoadingSkeleton />}><AdminStaffAttendanceSessionPage /></Suspense>} />
          <Route path="admin/staff/:id" element={<Suspense fallback={<LoadingSkeleton />}><AdminStaffProfilePage /></Suspense>} />
          <Route path="admin/staff/:id/profile" element={<Suspense fallback={<LoadingSkeleton />}><AdminStaffProfilePage /></Suspense>} />
          <Route path="admin/staff/import" element={<Suspense fallback={<LoadingSkeleton />}><StaffImportPage /></Suspense>} />
          <Route path="admin/staff/operations" element={<Suspense fallback={<LoadingSkeleton />}><StaffOperationsPage /></Suspense>} />
          <Route path="admin/staff/requests" element={<Suspense fallback={<LoadingSkeleton />}><StaffEditRequestsPage /></Suspense>} />
          <Route path="admin/people" element={<Suspense fallback={<LoadingSkeleton />}><AdminPeoplePage /></Suspense>} />
          <Route path="admin/people/dedupe" element={<Suspense fallback={<LoadingSkeleton />}><AdminPeopleDedupePage /></Suspense>} />
          <Route path="admin/people/import-year2" element={<Suspense fallback={<LoadingSkeleton />}><Year2PeopleImportPage /></Suspense>} />
          <Route path="admin/documents" element={<Suspense fallback={<LoadingSkeleton />}><DocumentCenterPage /></Suspense>} />
          <Route path="admin/documents/settings" element={<Suspense fallback={<LoadingSkeleton />}><DocumentSettingsPage /></Suspense>} />
          <Route path="admin/documents/templates" element={<Suspense fallback={<LoadingSkeleton />}><DocumentTemplatesPage /></Suspense>} />
          <Route path="admin/documents/generate" element={<Suspense fallback={<LoadingSkeleton />}><DocumentGeneratePage /></Suspense>} />
          <Route path="admin/documents/history" element={<Suspense fallback={<LoadingSkeleton />}><DocumentHistoryPage /></Suspense>} />
          <Route path="admin/requests" element={<Suspense fallback={<LoadingSkeleton />}><PendingRequestsPage /></Suspense>} />
          <Route path="admin/logs" element={<Suspense fallback={<LoadingSkeleton />}><ChangeLogPage /></Suspense>} />
          <Route path="admin/data-health" element={<Suspense fallback={<LoadingSkeleton />}><DataHealthPage /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
