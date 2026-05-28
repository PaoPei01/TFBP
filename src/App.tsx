import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AdminGuard } from './components/AdminGuard';
import { Layout } from './components/Layout';
import { RouteLoadingFallback } from './components/RouteLoadingFallback';
import { StaffGuard } from './components/StaffGuard';
import { PublicListPage } from './pages/PublicListPage';
import { VerifyEditPage } from './pages/VerifyEditPage';

// Auth, public, admin, and staff pages are grouped here to keep route ownership readable.
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const AdminCommandCenterPage = lazy(() => import('./pages/AdminCommandCenterPage').then((module) => ({ default: module.AdminCommandCenterPage })));
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
const EventAnnouncementDetailPage = lazy(() => import('./pages/EventAnnouncementDetailPage').then((module) => ({ default: module.EventAnnouncementDetailPage })));
const EventAnnouncementsPage = lazy(() => import('./pages/EventAnnouncementsPage').then((module) => ({ default: module.EventAnnouncementsPage })));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then((module) => ({ default: module.EventDetailPage })));
const EventProfileCheckPage = lazy(() => import('./pages/EventProfileCheckPage').then((module) => ({ default: module.EventProfileCheckPage })));
const EventRegisterPage = lazy(() => import('./pages/EventRegisterPage').then((module) => ({ default: module.EventRegisterPage })));
const EventStaffApplyPage = lazy(() => import('./pages/EventStaffApplyPage').then((module) => ({ default: module.EventStaffApplyPage })));
const EventStaffApplicationStatusPage = lazy(() => import('./pages/EventStaffApplicationStatusPage').then((module) => ({ default: module.EventStaffApplicationStatusPage })));
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
const PortalPage = lazy(() => import('./pages/PortalPage').then((module) => ({ default: module.PortalPage })));
const AdminEventsPage = lazy(() => import('./pages/AdminEventsPage').then((module) => ({ default: module.AdminEventsPage })));
const AdminEventApplicationPreviewPage = lazy(() => import('./pages/AdminEventApplicationPreviewPage').then((module) => ({ default: module.AdminEventApplicationPreviewPage })));
const AdminEventDetailPage = lazy(() => import('./pages/AdminEventDetailPage').then((module) => ({ default: module.AdminEventDetailPage })));
const AdminEventApplicationsPage = lazy(() => import('./pages/AdminEventApplicationsPage').then((module) => ({ default: module.AdminEventApplicationsPage })));
const AdminPeopleDedupePage = lazy(() => import('./pages/AdminPeopleDedupePage').then((module) => ({ default: module.AdminPeopleDedupePage })));
const AdminPeopleGroupsHubPage = lazy(() => import('./pages/AdminPeopleGroupsHubPage').then((module) => ({ default: module.AdminPeopleGroupsHubPage })));
const AdminPeoplePage = lazy(() => import('./pages/AdminPeoplePage').then((module) => ({ default: module.AdminPeoplePage })));
const AdminPeopleUpdateRequestsPage = lazy(() => import('./pages/AdminPeopleUpdateRequestsPage').then((module) => ({ default: module.AdminPeopleUpdateRequestsPage })));
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
const AdminStaffOpsHubPage = lazy(() => import('./pages/AdminStaffOpsHubPage').then((module) => ({ default: module.AdminStaffOpsHubPage })));
const StaffStartPage = lazy(() => import('./pages/StaffStartPage').then((module) => ({ default: module.StaffStartPage })));
const StaffProfileEditPage = lazy(() => import('./pages/StaffProfileEditPage').then((module) => ({ default: module.StaffProfileEditPage })));
const StaffProfilePage = lazy(() => import('./pages/StaffProfilePage').then((module) => ({ default: module.StaffProfilePage })));
const StaffProfileVerifyPage = lazy(() => import('./pages/StaffProfileVerifyPage').then((module) => ({ default: module.StaffProfileVerifyPage })));
const StaffPersonalQrPage = lazy(() => import('./pages/StaffPersonalQrPage').then((module) => ({ default: module.StaffPersonalQrPage })));
const SystemReadinessPage = lazy(() => import('./pages/SystemReadinessPage').then((module) => ({ default: module.SystemReadinessPage })));
const Year2PeopleImportPage = lazy(() => import('./pages/Year2PeopleImportPage').then((module) => ({ default: module.Year2PeopleImportPage })));
const FeatureLabPage = lazy(() => import('./pages/FeatureLabPage').then((module) => ({ default: module.FeatureLabPage })));
const StationReadinessLabPage = lazy(() => import('./pages/lab/StationReadinessLabPage').then((module) => ({ default: module.StationReadinessLabPage })));
const IncidentBoardLabPage = lazy(() => import('./pages/lab/IncidentBoardLabPage').then((module) => ({ default: module.IncidentBoardLabPage })));
const RoundControlLabPage = lazy(() => import('./pages/lab/RoundControlLabPage').then((module) => ({ default: module.RoundControlLabPage })));
const ReadinessChecklistLabPage = lazy(() => import('./pages/lab/ReadinessChecklistLabPage').then((module) => ({ default: module.ReadinessChecklistLabPage })));
const BroadcastLabPage = lazy(() => import('./pages/lab/BroadcastLabPage').then((module) => ({ default: module.BroadcastLabPage })));

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PublicListPage />} />
        <Route path="portal" element={<Suspense fallback={<RouteLoadingFallback />}><PortalPage /></Suspense>} />
        <Route path="announcements" element={<Suspense fallback={<RouteLoadingFallback />}><AnnouncementsPage /></Suspense>} />
        <Route path="announcements/:id" element={<Suspense fallback={<RouteLoadingFallback />}><AnnouncementDetailPage /></Suspense>} />
        <Route path="lab" element={<Suspense fallback={<RouteLoadingFallback />}><FeatureLabPage /></Suspense>} />
        <Route path="lab/station-readiness" element={<Suspense fallback={<RouteLoadingFallback />}><StationReadinessLabPage /></Suspense>} />
        <Route path="lab/incident-board" element={<Suspense fallback={<RouteLoadingFallback />}><IncidentBoardLabPage /></Suspense>} />
        <Route path="lab/round-control" element={<Suspense fallback={<RouteLoadingFallback />}><RoundControlLabPage /></Suspense>} />
        <Route path="lab/readiness-checklist" element={<Suspense fallback={<RouteLoadingFallback />}><ReadinessChecklistLabPage /></Suspense>} />
        <Route path="lab/broadcast" element={<Suspense fallback={<RouteLoadingFallback />}><BroadcastLabPage /></Suspense>} />
        <Route path="demo" element={<Navigate to="/lab" replace />} />
        <Route path="demo/*" element={<Navigate to="/lab" replace />} />
        <Route path="events" element={<Suspense fallback={<RouteLoadingFallback />}><EventsPage /></Suspense>} />
        <Route path="events/:eventSlug" element={<Suspense fallback={<RouteLoadingFallback />}><EventDetailPage /></Suspense>} />
        <Route path="events/:eventSlug/announcements" element={<Suspense fallback={<RouteLoadingFallback />}><EventAnnouncementsPage /></Suspense>} />
        <Route path="events/:eventSlug/announcements/:announcementId" element={<Suspense fallback={<RouteLoadingFallback />}><EventAnnouncementDetailPage /></Suspense>} />
        <Route path="events/:eventSlug/profile-check" element={<Suspense fallback={<RouteLoadingFallback />}><EventProfileCheckPage /></Suspense>} />
        <Route path="events/:eventSlug/register" element={<Suspense fallback={<RouteLoadingFallback />}><EventRegisterPage /></Suspense>} />
        <Route path="events/:eventSlug/staff/apply" element={<Suspense fallback={<RouteLoadingFallback />}><EventStaffApplyPage /></Suspense>} />
        <Route path="events/:eventSlug/staff/application-status" element={<Suspense fallback={<RouteLoadingFallback />}><EventStaffApplicationStatusPage /></Suspense>} />
        <Route path="guide" element={<Suspense fallback={<RouteLoadingFallback />}><GuideCenterPage /></Suspense>} />
        <Route path="guide/:category" element={<Suspense fallback={<RouteLoadingFallback />}><GuideCategoryPage /></Suspense>} />
        <Route path="guide/:category/:topic" element={<Suspense fallback={<RouteLoadingFallback />}><GuideTopicPage /></Suspense>} />
        <Route path="me" element={<VerifyEditPage titleMode="me" />} />
        <Route path="edit" element={<VerifyEditPage />} />
        <Route path="staff/start" element={<Suspense fallback={<RouteLoadingFallback />}><StaffStartPage /></Suspense>} />
        <Route path="staff/profile/verify" element={<Suspense fallback={<RouteLoadingFallback />}><StaffProfileVerifyPage /></Suspense>} />
        <Route path="staff/profile/qr" element={<Suspense fallback={<RouteLoadingFallback />}><StaffPersonalQrPage /></Suspense>} />
        <Route path="staff/attendance" element={<Suspense fallback={<RouteLoadingFallback />}><StaffAttendancePage /></Suspense>} />
        <Route path="staff/attendance/scan" element={<Suspense fallback={<RouteLoadingFallback />}><StaffAttendanceScanPage /></Suspense>} />
        <Route path="login" element={<Suspense fallback={<RouteLoadingFallback />}><AuthLoginPage /></Suspense>} />
        <Route element={<StaffGuard roles={['staff', 'mentor', 'viewer', 'emergency_staff']} />}>
          <Route path="staff" element={<Suspense fallback={<RouteLoadingFallback />}><StaffDashboardPage /></Suspense>} />
          <Route path="staff/profile" element={<Suspense fallback={<RouteLoadingFallback />}><StaffProfilePage /></Suspense>} />
          <Route path="staff/profile/edit" element={<Suspense fallback={<RouteLoadingFallback />}><StaffProfileEditPage /></Suspense>} />
          <Route path="staff/directory" element={<Suspense fallback={<RouteLoadingFallback />}><StaffDirectoryPage /></Suspense>} />
        </Route>
        <Route element={<StaffGuard roles={['staff', 'mentor', 'viewer']} />}>
          <Route path="staff/my-group" element={<Suspense fallback={<RouteLoadingFallback />}><StaffMobilePage /></Suspense>} />
        </Route>
        <Route element={<StaffGuard requireEmergency />}>
          <Route path="staff/emergency" element={<Suspense fallback={<RouteLoadingFallback />}><EmergencyDashboardPage /></Suspense>} />
        </Route>
        <Route element={<AdminGuard />}>
          <Route path="admin" element={<Suspense fallback={<RouteLoadingFallback />}><AdminCommandCenterPage /></Suspense>} />
          <Route path="admin/dashboard" element={<Suspense fallback={<RouteLoadingFallback />}><AdminDashboardPage /></Suspense>} />
          <Route path="admin/events" element={<Suspense fallback={<RouteLoadingFallback />}><AdminEventsPage /></Suspense>} />
          <Route path="admin/events/:eventId/applications" element={<Suspense fallback={<RouteLoadingFallback />}><AdminEventApplicationsPage /></Suspense>} />
          <Route path="admin/events/:eventId/staff-application-preview" element={<Suspense fallback={<RouteLoadingFallback />}><AdminEventApplicationPreviewPage /></Suspense>} />
          <Route path="admin/events/:eventId" element={<Suspense fallback={<RouteLoadingFallback />}><AdminEventDetailPage /></Suspense>} />
          <Route path="admin/announcements" element={<Suspense fallback={<RouteLoadingFallback />}><AdminAnnouncementsPage /></Suspense>} />
          <Route path="admin/announcements/new" element={<Suspense fallback={<RouteLoadingFallback />}><AnnouncementEditPage /></Suspense>} />
          <Route path="admin/announcements/:id/edit" element={<Suspense fallback={<RouteLoadingFallback />}><AnnouncementEditPage /></Suspense>} />
          <Route path="admin/emergency" element={<Suspense fallback={<RouteLoadingFallback />}><EmergencyDashboardPage /></Suspense>} />
          <Route path="admin/groups" element={<Suspense fallback={<RouteLoadingFallback />}><GroupDashboardPage /></Suspense>} />
          <Route path="admin/people-groups" element={<Suspense fallback={<RouteLoadingFallback />}><AdminPeopleGroupsHubPage /></Suspense>} />
          <Route path="admin/staff-ops" element={<Suspense fallback={<RouteLoadingFallback />}><AdminStaffOpsHubPage /></Suspense>} />
          <Route path="admin/staff" element={<Suspense fallback={<RouteLoadingFallback />}><StaffManagementPage /></Suspense>} />
          <Route path="admin/staff/attendance" element={<Suspense fallback={<RouteLoadingFallback />}><AdminStaffAttendancePage /></Suspense>} />
          <Route path="admin/staff/attendance/:sessionId" element={<Suspense fallback={<RouteLoadingFallback />}><AdminStaffAttendanceSessionPage /></Suspense>} />
          <Route path="admin/staff/:id" element={<Suspense fallback={<RouteLoadingFallback />}><AdminStaffProfilePage /></Suspense>} />
          <Route path="admin/staff/:id/profile" element={<Suspense fallback={<RouteLoadingFallback />}><AdminStaffProfilePage /></Suspense>} />
          <Route path="admin/staff/import" element={<Suspense fallback={<RouteLoadingFallback />}><StaffImportPage /></Suspense>} />
          <Route path="admin/staff/operations" element={<Suspense fallback={<RouteLoadingFallback />}><StaffOperationsPage /></Suspense>} />
          <Route path="admin/staff/requests" element={<Suspense fallback={<RouteLoadingFallback />}><StaffEditRequestsPage /></Suspense>} />
          <Route path="admin/people" element={<Suspense fallback={<RouteLoadingFallback />}><AdminPeoplePage /></Suspense>} />
          <Route path="admin/people/dedupe" element={<Suspense fallback={<RouteLoadingFallback />}><AdminPeopleDedupePage /></Suspense>} />
          <Route path="admin/people/import-year2" element={<Suspense fallback={<RouteLoadingFallback />}><Year2PeopleImportPage /></Suspense>} />
          <Route path="admin/people/update-requests" element={<Suspense fallback={<RouteLoadingFallback />}><AdminPeopleUpdateRequestsPage /></Suspense>} />
          <Route path="admin/documents" element={<Suspense fallback={<RouteLoadingFallback />}><DocumentCenterPage /></Suspense>} />
          <Route path="admin/documents/settings" element={<Suspense fallback={<RouteLoadingFallback />}><DocumentSettingsPage /></Suspense>} />
          <Route path="admin/documents/templates" element={<Suspense fallback={<RouteLoadingFallback />}><DocumentTemplatesPage /></Suspense>} />
          <Route path="admin/documents/generate" element={<Suspense fallback={<RouteLoadingFallback />}><DocumentGeneratePage /></Suspense>} />
          <Route path="admin/documents/history" element={<Suspense fallback={<RouteLoadingFallback />}><DocumentHistoryPage /></Suspense>} />
          <Route path="admin/requests" element={<Suspense fallback={<RouteLoadingFallback />}><PendingRequestsPage /></Suspense>} />
          <Route path="admin/logs" element={<Suspense fallback={<RouteLoadingFallback />}><ChangeLogPage /></Suspense>} />
          <Route path="admin/data-health" element={<Suspense fallback={<RouteLoadingFallback />}><DataHealthPage /></Suspense>} />
          <Route path="admin/system-readiness" element={<Suspense fallback={<RouteLoadingFallback />}><SystemReadinessPage /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
