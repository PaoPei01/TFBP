import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { StaffRole } from '../lib/types';
import { fetchStaffAccessContext } from '../services/staff';

type StaffGuardProps = {
  roles?: StaffRole[];
  requireEmergency?: boolean;
  requireAttendance?: boolean;
};

export function StaffGuard({ roles, requireEmergency = false, requireAttendance = false }: StaffGuardProps) {
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    async function check() {
      try {
        const access = await fetchStaffAccessContext();
        const roleAllowed = roles?.length ? access.roles.some((role) => roles.includes(role)) : access.can_view_staff;
        const allowed = access.is_admin || (requireEmergency ? access.can_view_emergency : requireAttendance ? access.can_mark_attendance : roleAllowed);
        setState(allowed ? 'allowed' : 'denied');
      } catch {
        setState('denied');
      }
    }
    void check();
  }, [requireAttendance, requireEmergency, roles]);

  if (state === 'loading') return <LoadingSkeleton />;
  if (state === 'denied') return <Navigate to="/login" replace />;
  return <Outlet />;
}
