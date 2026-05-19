import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminGuard } from './components/AdminGuard';
import { Layout } from './components/Layout';
import { StaffGuard } from './components/StaffGuard';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ChangeLogPage } from './pages/ChangeLogPage';
import { EmergencyDashboardPage } from './pages/EmergencyDashboardPage';
import { GroupDashboardPage } from './pages/GroupDashboardPage';
import { PendingRequestsPage } from './pages/PendingRequestsPage';
import { PublicListPage } from './pages/PublicListPage';
import { StaffAttendancePage } from './pages/StaffAttendancePage';
import { StaffDashboardPage } from './pages/StaffDashboardPage';
import { StaffMobilePage } from './pages/StaffMobilePage';
import { VerifyEditPage } from './pages/VerifyEditPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PublicListPage />} />
        <Route path="edit" element={<VerifyEditPage />} />
        <Route path="admin" element={<AdminLoginPage />} />
        <Route element={<StaffGuard roles={['staff', 'mentor', 'viewer', 'emergency_staff']} />}>
          <Route path="staff" element={<StaffDashboardPage />} />
        </Route>
        <Route element={<StaffGuard roles={['staff', 'mentor', 'viewer']} />}>
          <Route path="staff/my-group" element={<StaffMobilePage />} />
        </Route>
        <Route element={<StaffGuard requireAttendance />}>
          <Route path="staff/attendance" element={<StaffAttendancePage />} />
        </Route>
        <Route element={<StaffGuard requireEmergency />}>
          <Route path="staff/emergency" element={<EmergencyDashboardPage />} />
        </Route>
        <Route element={<AdminGuard />}>
          <Route path="admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="admin/emergency" element={<EmergencyDashboardPage />} />
          <Route path="admin/groups" element={<GroupDashboardPage />} />
          <Route path="admin/requests" element={<PendingRequestsPage />} />
          <Route path="admin/logs" element={<ChangeLogPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
