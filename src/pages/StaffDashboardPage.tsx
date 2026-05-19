import { AlertTriangle, ClipboardCheck, Search, ShieldAlert, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { fetchStaffAccessContext, fetchStaffGroupContext } from '../services/staff';

export function StaffDashboardPage() {
  const state = useAsync(fetchStaffGroupContext, []);
  const accessState = useAsync(fetchStaffAccessContext, []);
  const context = state.data;
  const access = context?.access ?? accessState.data;
  const assignedLabel = context?.assignment ? groupLabel(context.assignment.main_group, context.assignment.subgroup) : access?.is_admin || access?.roles.includes('emergency_staff') ? 'ทุกกลุ่ม' : '-';
  const medicalCount = (context?.participants ?? []).filter((profile) => profile.disease || profile.drug_allergy || profile.food_allergy).length;
  const isEmergencyOnly = Boolean(access?.roles.includes('emergency_staff') && !access?.roles.some((role) => ['staff', 'mentor', 'viewer'].includes(role)));

  if (state.loading || accessState.loading) return <LoadingSkeleton />;
  if (state.error && !accessState.data?.can_view_emergency) return <div className="error-state">{state.error}</div>;
  if (!access?.can_view_staff && !access?.can_view_emergency) return <div className="empty-state">บัญชีนี้ยังไม่มีสิทธิ์ Staff Mode</div>;

  return (
    <section className="page-stack staff-page">
      <div className="section-heading">
        <p className="eyebrow">Staff App Mode</p>
        <h1>Staff Dashboard</h1>
        <p>โหมดมือถือสำหรับหน้างาน สิทธิ์จะแยกตาม role และไม่เปิดเครื่องมือแอดมินให้ staff</p>
      </div>

      <div className="staff-role-strip">
        <Badge status="approved">{access.is_admin ? 'admin' : access.roles.join(', ')}</Badge>
        <span>{assignedLabel}</span>
        {access.read_only ? <span>Read-only</span> : null}
      </div>

      <div className="stats-grid">
        <DashboardStatCard label={isEmergencyOnly ? 'ขอบเขตสุขภาพ' : 'ในความรับผิดชอบ'} value={context?.participants.length ?? (isEmergencyOnly ? 'ทุกกลุ่ม' : 0)} icon={<UsersRound size={20} />} />
        <DashboardStatCard label="พี่กลุ่ม" value={context?.staff_roster.length ?? 0} />
        <DashboardStatCard label="Medical visible" value={medicalCount} icon={<AlertTriangle size={20} />} />
      </div>

      <div className="staff-action-grid">
        <Link className={`staff-action-card ${isEmergencyOnly ? 'disabled-link' : ''}`} to={isEmergencyOnly ? '#' : '/staff/my-group'} aria-disabled={isEmergencyOnly}>
          <Search size={28} />
          <strong>My Group</strong>
          <span>รายชื่อและช่องทางติดต่อในกลุ่ม</span>
        </Link>
        <Link className={`staff-action-card ${access.can_mark_attendance ? '' : 'disabled-link'}`} to={access.can_mark_attendance ? '/staff/attendance' : '#'} aria-disabled={!access.can_mark_attendance}>
          <ClipboardCheck size={28} />
          <strong>Attendance</strong>
          <span>เช็กชื่อแบบเก็บคิว offline ได้</span>
        </Link>
        <Link className={`staff-action-card ${access.can_view_emergency ? 'danger-card' : 'disabled-link'}`} to={access.can_view_emergency ? '/staff/emergency' : '#'} aria-disabled={!access.can_view_emergency}>
          <ShieldAlert size={28} />
          <strong>Health Tools</strong>
          <span>emergency_staff ใช้เครื่องมือสุขภาพได้เต็มรูปแบบทุกกลุ่ม</span>
        </Link>
      </div>

      <Card className="staff-confidential-card">
        <strong>Role rules</strong>
        <span>emergency_staff ใช้เฉพาะเครื่องมือสุขภาพ: ดูข้อมูลฉุกเฉินทุกกลุ่ม บันทึก note และ special care ได้ แต่ไม่แตะงานสตาฟกลุ่มหรือแอดมิน</span>
      </Card>
    </section>
  );
}
