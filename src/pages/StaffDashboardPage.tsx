import { AlertTriangle, ClipboardCheck, Search, ShieldAlert, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { fetchStaffAccessContext, fetchStaffGroupContext } from '../services/staff';

export function StaffDashboardPage() {
  const { language } = useLanguage();
  const state = useAsync(fetchStaffGroupContext, []);
  const accessState = useAsync(fetchStaffAccessContext, []);
  const context = state.data;
  const access = context?.access ?? accessState.data;
  const assignedLabel = context?.assignment?.main_group ? groupLabel(context.assignment.main_group, context.assignment.subgroup, language) : access?.is_admin || access?.roles.includes('emergency_staff') ? (language === 'th' ? 'ทุกกลุ่ม' : 'All groups') : '-';
  const medicalCount = (context?.participants ?? []).filter((profile) => profile.disease || profile.drug_allergy || profile.food_allergy).length;
  const isEmergencyOnly = Boolean(access?.roles.includes('emergency_staff') && !access?.roles.some((role) => ['staff', 'mentor', 'viewer'].includes(role)));

  if (state.loading || accessState.loading) return <LoadingSkeleton />;
  if (state.error && !accessState.data?.can_view_emergency) return <div className="error-state">{state.error}</div>;
  if (!access?.can_view_staff && !access?.can_view_emergency) return <div className="empty-state">{language === 'th' ? 'บัญชีนี้ยังไม่มีสิทธิ์ Staff Mode' : 'This account does not have Staff Mode access.'}</div>;

  return (
    <section className="page-stack staff-page">
      <div className="section-heading">
        <p className="eyebrow">{language === 'th' ? 'โหมดสตาฟ' : 'Staff App Mode'}</p>
        <h1>{language === 'th' ? 'วันนี้ต้องทำอะไร' : 'Today’s operations'}</h1>
        <p>{language === 'th' ? 'ใช้ปุ่มด้านล่างเพื่อเข้ารายชื่อกลุ่ม เช็กชื่อ หรือเปิดเครื่องมือฉุกเฉินระหว่างกิจกรรม' : 'Use the actions below for group lookup, attendance, and emergency tools during the event.'}</p>
      </div>

      <div className="staff-role-strip">
        <Badge status="approved">{access.is_admin ? 'admin' : access.roles.join(', ')}</Badge>
        <span>{assignedLabel}</span>
        {access.read_only ? <span>Read-only</span> : null}
      </div>

      <div className="stats-grid">
        <DashboardStatCard label={isEmergencyOnly ? (language === 'th' ? 'ขอบเขตสุขภาพ' : 'Health scope') : (language === 'th' ? 'ข้อมูลกลุ่มของฉัน' : 'My group data')} value={context?.participants.length ?? (isEmergencyOnly ? assignedLabel : 0)} icon={<UsersRound size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'พี่กลุ่ม' : 'Group staff'} value={context?.staff_roster.length ?? 0} />
        <DashboardStatCard label={language === 'th' ? 'ข้อมูลสุขภาพที่เห็น' : 'Medical visible'} value={medicalCount} icon={<AlertTriangle size={20} />} />
      </div>

      <div className="staff-action-grid">
        {!isEmergencyOnly && access.can_view_staff ? (
          <Link className="staff-action-card" to="/staff/my-group">
            <Search size={28} />
            <strong>{language === 'th' ? 'กลุ่มของฉัน' : 'My Group'}</strong>
            <span>{language === 'th' ? 'ค้นหารายชื่อ เบอร์ที่ได้รับอนุญาต และจุดนัดพบ' : 'Find participants, allowed contacts, and meeting point'}</span>
          </Link>
        ) : null}
        {access.can_mark_attendance ? (
          <Link className="staff-action-card" to="/staff/attendance">
            <ClipboardCheck size={28} />
            <strong>{language === 'th' ? 'เช็กชื่อ' : 'Attendance'}</strong>
            <span>{language === 'th' ? 'เช็กชื่อแบบเก็บคิว offline ได้' : 'Offline-friendly attendance queue'}</span>
          </Link>
        ) : null}
        {access.can_view_emergency ? (
          <Link className="staff-action-card danger-card" to="/staff/emergency">
            <ShieldAlert size={28} />
            <strong>{language === 'th' ? 'ปุ่มฉุกเฉิน' : 'Emergency shortcut'}</strong>
            <span>{language === 'th' ? 'เบอร์ด่วนและข้อมูลช่วยเหลือฉุกเฉิน' : 'Hotlines and emergency support data'}</span>
          </Link>
        ) : null}
      </div>

      <Card className="staff-confidential-card">
        <strong>{language === 'th' ? 'กติกาสิทธิ์' : 'Role rules'}</strong>
        <span>{language === 'th' ? 'emergency_staff ใช้เฉพาะเครื่องมือสุขภาพ: ดูข้อมูลฉุกเฉินทุกกลุ่ม บันทึก note และ special care ได้ แต่ไม่แตะงานสตาฟกลุ่มหรือแอดมิน' : 'emergency_staff can only use health tools: view all emergency data, save notes, and mark special care without accessing group staff or admin tools.'}</span>
      </Card>
    </section>
  );
}
