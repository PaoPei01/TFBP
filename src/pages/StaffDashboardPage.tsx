import { AlertTriangle, ClipboardCheck, Search, ShieldAlert, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { fetchStaffGroupContext } from '../services/staff';

export function StaffDashboardPage() {
  const state = useAsync(fetchStaffGroupContext, []);
  const context = state.data;
  const access = context?.access;
  const assignedLabel = context?.assignment ? groupLabel(context.assignment.main_group, context.assignment.subgroup) : access?.is_admin ? 'ทุกกลุ่ม' : '-';
  const medicalCount = (context?.participants ?? []).filter((profile) => profile.disease || profile.drug_allergy || profile.food_allergy).length;

  if (state.loading) return <LoadingSkeleton />;
  if (state.error) return <div className="error-state">{state.error}</div>;
  if (!context || !access?.can_view_staff) return <div className="empty-state">บัญชีนี้ยังไม่มีสิทธิ์ Staff Mode</div>;

  return (
    <section className="page-stack staff-page">
      <div className="section-heading">
        <p className="eyebrow">Staff App Mode</p>
        <h1>Staff Dashboard</h1>
        <p>โหมดมือถือสำหรับหน้างาน เห็นเฉพาะกลุ่มที่ได้รับมอบหมายตาม role</p>
      </div>

      <div className="staff-role-strip">
        <Badge status="approved">{access.is_admin ? 'admin' : access.roles.join(', ')}</Badge>
        <span>{assignedLabel}</span>
        {access.read_only ? <span>Read-only</span> : null}
      </div>

      <div className="stats-grid">
        <DashboardStatCard label="ในความรับผิดชอบ" value={context.participants.length} icon={<UsersRound size={20} />} />
        <DashboardStatCard label="พี่กลุ่ม" value={context.staff_roster.length} />
        <DashboardStatCard label="Medical visible" value={medicalCount} icon={<AlertTriangle size={20} />} />
      </div>

      <div className="staff-action-grid">
        <Link className="staff-action-card" to="/staff/my-group">
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
          <strong>Emergency</strong>
          <span>admin และ staff ทุก role เข้าได้ตามกลุ่มที่ได้รับมอบหมาย</span>
        </Link>
      </div>

      <Card className="staff-confidential-card">
        <strong>Role rules</strong>
        <span>staff เห็นเฉพาะสี/กลุ่มที่ assign, mentor เห็นเฉพาะ subgroup, viewer ดูได้อย่างเดียว, emergency ใช้ได้ทุก role แต่ยังจำกัดข้อมูลตามกลุ่ม</span>
      </Card>
    </section>
  );
}
