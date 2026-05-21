import { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Card } from './ui/Card';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { StaffRole } from '../lib/types';
import { supabase } from '../lib/supabase';
import { fetchStaffAccessContext } from '../services/staff';

type StaffGuardProps = {
  roles?: StaffRole[];
  requireEmergency?: boolean;
  requireAttendance?: boolean;
};

export function StaffGuard({ roles, requireEmergency = false, requireAttendance = false }: StaffGuardProps) {
  const [state, setState] = useState<'loading' | 'allowed' | 'login' | 'forbidden'>('loading');
  const location = useLocation();

  useEffect(() => {
    async function check() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setState('login');
          return;
        }
        const access = await fetchStaffAccessContext();
        const roleAllowed = roles?.length ? access.roles.some((role) => roles.includes(role)) : access.can_view_staff;
        const allowed = access.is_admin || (requireEmergency ? access.can_view_emergency : requireAttendance ? access.can_mark_attendance : roleAllowed);
        setState(allowed ? 'allowed' : 'forbidden');
      } catch {
        setState('login');
      }
    }
    void check();
  }, [requireAttendance, requireEmergency, roles]);

  if (state === 'loading') return <LoadingSkeleton />;
  if (state === 'login') return <Navigate to="/login" replace state={{ message: 'staff_required', returnTo: `${location.pathname}${location.search}` }} />;
  if (state === 'forbidden') {
    return (
      <section className="narrow-page page-stack">
        <Card className="error-state">
          <h1>ไม่มีสิทธิ์เข้าหน้านี้</h1>
          <p>บัญชีนี้เข้าสู่ระบบแล้ว แต่ยังไม่มีสิทธิ์สำหรับเครื่องมือทีมงานหน้านี้</p>
          <div className="form-actions">
            <Link className="btn btn-primary" to="/staff">กลับหน้า Staff Mode</Link>
            <Link className="btn btn-secondary" to="/login">จัดการบัญชี</Link>
          </div>
        </Card>
      </section>
    );
  }
  return <Outlet />;
}
