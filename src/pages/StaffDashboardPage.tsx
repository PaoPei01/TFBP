import { AlertTriangle, Bell, ClipboardCheck, Search, ShieldAlert, UserRound, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MobileSafeAreaSpacer } from '../components/mobile/MobileSafeAreaSpacer';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { PageHeader } from '../components/ui/PageHeader';
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
      <PageHeader
        eyebrow={language === 'th' ? 'โหมดสตาฟ' : 'Staff App Mode'}
        title={language === 'th' ? 'วันนี้ต้องทำอะไร' : 'Today’s operations'}
        description={language === 'th' ? 'เลือกงานที่ต้องใช้หน้างานได้เร็วใน 1-2 แตะ' : 'Fast one-handed access to live event tools.'}
        meta={<Badge status="approved">{access.is_admin ? 'admin' : access.roles.join(', ')}</Badge>}
        compact
      />

      <div className="staff-role-strip">
        <span>{assignedLabel}</span>
        {access.read_only ? <span>Read-only</span> : null}
      </div>

      <div className="today-action-strip">
        {access.can_mark_attendance ? <Link className="today-primary-action" to="/staff/attendance"><ClipboardCheck size={24} /><strong>{language === 'th' ? 'เริ่มเช็กชื่อ' : 'Start attendance'}</strong><span>{language === 'th' ? 'ปุ่มหลักสำหรับหน้างาน' : 'Primary live-operation action'}</span></Link> : null}
        {access.can_view_emergency ? <Link className="today-primary-action emergency" to="/staff/emergency"><ShieldAlert size={24} /><strong>{language === 'th' ? 'เปิดฉุกเฉิน' : 'Open emergency'}</strong><span>{language === 'th' ? 'เบอร์ด่วนและข้อมูลสุขภาพ' : 'Hotlines and health data'}</span></Link> : null}
      </div>

      <div className="stats-grid">
        <DashboardStatCard label={isEmergencyOnly ? (language === 'th' ? 'ขอบเขตสุขภาพ' : 'Health scope') : (language === 'th' ? 'ข้อมูลกลุ่มของฉัน' : 'My group data')} value={context?.participants.length ?? (isEmergencyOnly ? assignedLabel : 0)} icon={<UsersRound size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'พี่กลุ่ม' : 'Group staff'} value={context?.staff_roster.length ?? 0} />
        <DashboardStatCard label={language === 'th' ? 'ข้อมูลสุขภาพที่เห็น' : 'Medical visible'} value={medicalCount} icon={<AlertTriangle size={20} />} />
      </div>

      <div className="staff-action-grid">
        <Link className="staff-action-card" to="/staff/profile">
          <UserRound size={28} />
          <strong>{language === 'th' ? 'โปรไฟล์ทีมงานของฉัน' : 'My Staff Profile'}</strong>
          <span>{language === 'th' ? 'จัดการข้อมูลที่น้องเห็นและส่งคำขอแก้ไขข้อมูลสำคัญ' : 'Manage public visibility and request sensitive changes'}</span>
        </Link>
        <Link className="staff-action-card" to="/staff/directory">
          <UsersRound size={28} />
          <strong>{language === 'th' ? 'ไดเรกทอรีทีมงาน' : 'Staff Directory'}</strong>
          <span>{language === 'th' ? 'ค้นหาช่องทางติดต่อภายในตามสิทธิ์' : 'Find internal staff contacts based on permissions'}</span>
        </Link>
        <Link className="staff-action-card" to="/announcements">
          <Bell size={28} />
          <strong>{language === 'th' ? 'ประกาศและไฟล์กิจกรรม' : 'Announcements & files'}</strong>
          <span>{language === 'th' ? 'กำหนดการ แผนที่ จุดนัดพบ และอัปเดตสำคัญ' : 'Schedules, maps, meeting points, and important updates'}</span>
        </Link>
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

      <details className="filter-disclosure staff-role-note">
        <summary>{language === 'th' ? 'เกี่ยวกับสิทธิ์ของบัญชีนี้' : 'About this account access'}</summary>
        <Card className="staff-confidential-card">
          <strong>{language === 'th' ? 'กติกาสิทธิ์' : 'Role rules'}</strong>
          <span>{language === 'th' ? 'emergency_staff ใช้เฉพาะเครื่องมือสุขภาพ: ดูข้อมูลฉุกเฉินทุกกลุ่ม บันทึก note และ special care ได้ แต่ไม่แตะงานสตาฟกลุ่มหรือแอดมิน' : 'emergency_staff can only use health tools: view all emergency data, save notes, and mark special care without accessing group staff or admin tools.'}</span>
        </Card>
      </details>
      <MobileSafeAreaSpacer />
    </section>
  );
}
