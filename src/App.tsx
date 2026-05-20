import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AdminGuard } from './components/AdminGuard';
import { Layout } from './components/Layout';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { StaffGuard } from './components/StaffGuard';
import { PublicListPage } from './pages/PublicListPage';
import { VerifyEditPage } from './pages/VerifyEditPage';

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })));
const ChangeLogPage = lazy(() => import('./pages/ChangeLogPage').then((module) => ({ default: module.ChangeLogPage })));
const EmergencyDashboardPage = lazy(() => import('./pages/EmergencyDashboardPage').then((module) => ({ default: module.EmergencyDashboardPage })));
const GroupDashboardPage = lazy(() => import('./pages/GroupDashboardPage').then((module) => ({ default: module.GroupDashboardPage })));
const PendingRequestsPage = lazy(() => import('./pages/PendingRequestsPage').then((module) => ({ default: module.PendingRequestsPage })));
const StaffAttendancePage = lazy(() => import('./pages/StaffAttendancePage').then((module) => ({ default: module.StaffAttendancePage })));
const StaffDashboardPage = lazy(() => import('./pages/StaffDashboardPage').then((module) => ({ default: module.StaffDashboardPage })));
const StaffImportPage = lazy(() => import('./pages/StaffImportPage').then((module) => ({ default: module.StaffImportPage })));
const StaffManagementPage = lazy(() => import('./pages/StaffManagementPage').then((module) => ({ default: module.StaffManagementPage })));
const StaffMobilePage = lazy(() => import('./pages/StaffMobilePage').then((module) => ({ default: module.StaffMobilePage })));
const StaffOperationsPage = lazy(() => import('./pages/StaffOperationsPage').then((module) => ({ default: module.StaffOperationsPage })));

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PublicListPage />} />
        <Route path="edit" element={<VerifyEditPage />} />
        <Route path="admin" element={<Suspense fallback={<LoadingSkeleton />}><AdminLoginPage /></Suspense>} />
        <Route element={<StaffGuard roles={['staff', 'mentor', 'viewer', 'emergency_staff']} />}>
          <Route path="staff" element={<Suspense fallback={<LoadingSkeleton />}><StaffDashboardPage /></Suspense>} />
        </Route>
        <Route element={<StaffGuard roles={['staff', 'mentor', 'viewer']} />}>
          <Route path="staff/my-group" element={<Suspense fallback={<LoadingSkeleton />}><StaffMobilePage /></Suspense>} />
        </Route>
        <Route element={<StaffGuard requireAttendance />}>
          <Route path="staff/attendance" element={<Suspense fallback={<LoadingSkeleton />}><StaffAttendancePage /></Suspense>} />
        </Route>
        <Route element={<StaffGuard requireEmergency />}>
          <Route path="staff/emergency" element={<Suspense fallback={<LoadingSkeleton />}><EmergencyDashboardPage /></Suspense>} />
        </Route>
        <Route element={<AdminGuard />}>
          <Route path="admin/dashboard" element={<Suspense fallback={<LoadingSkeleton />}><AdminDashboardPage /></Suspense>} />
          <Route path="admin/emergency" element={<Suspense fallback={<LoadingSkeleton />}><EmergencyDashboardPage /></Suspense>} />
          <Route path="admin/groups" element={<Suspense fallback={<LoadingSkeleton />}><GroupDashboardPage /></Suspense>} />
          <Route path="admin/staff" element={<Suspense fallback={<LoadingSkeleton />}><StaffManagementPage /></Suspense>} />
          <Route path="admin/staff/import" element={<Suspense fallback={<LoadingSkeleton />}><StaffImportPage /></Suspense>} />
          <Route path="admin/staff/operations" element={<Suspense fallback={<LoadingSkeleton />}><StaffOperationsPage /></Suspense>} />
          <Route path="admin/requests" element={<Suspense fallback={<LoadingSkeleton />}><PendingRequestsPage /></Suspense>} />
          <Route path="admin/logs" element={<Suspense fallback={<LoadingSkeleton />}><ChangeLogPage /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
