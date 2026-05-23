import { CalendarClock, Plus, RefreshCw, UsersRound } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useEventContext } from '../context/EventContext';
import { useAsync } from '../hooks/useAsync';
import { groupMeta, mainGroups, subgroups } from '../lib/groups';
import { staffOperationalRoles } from '../lib/staffRoles';
import type { StaffAttendanceSessionInput } from '../lib/attendanceTypes';
import { formatBangkokDateTime, isoToDatetimeLocal } from '../lib/dateTime';
import { createStaffAttendanceSession, fetchAdminStaffAttendance } from '../services/staffAttendance';
import { errorMessage } from '../utils/error';

const sessionTypes = ['check_in', 'check_out', 'shift_start', 'shift_end', 'roll_call', 'emergency', 'meeting'];
const targetScopes = ['all', 'main_group', 'subgroup', 'role', 'emergency_staff'];

function localDatetimeValue(offsetMinutes = 0) {
  return isoToDatetimeLocal(new Date(Date.now() + offsetMinutes * 60_000).toISOString());
}

function statusLabel(status: string, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    draft: { th: 'แบบร่าง', en: 'Draft' },
    active: { th: 'เปิดใช้งาน', en: 'Active' },
    closed: { th: 'ปิดรอบ', en: 'Closed' },
    archived: { th: 'เก็บถาวร', en: 'Archived' },
  };
  return labels[status]?.[language] ?? status;
}

export function AdminStaffAttendancePage() {
  const { language } = useLanguage();
  const { currentEvent, currentEventId } = useEventContext();
  const navigate = useNavigate();
  const state = useAsync(() => fetchAdminStaffAttendance(null, currentEventId), [currentEventId]);
  const [toast, setToast] = useState<ToastState>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StaffAttendanceSessionInput>({
    title: language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff check-in',
    session_type: 'check_in',
    target_scope: 'all',
    starts_at: localDatetimeValue(),
    late_after: localDatetimeValue(30),
    status: 'active',
  });

  const sessions = useMemo(() => state.data?.sessions ?? [], [state.data?.sessions]);
  const timezoneHint = language === 'th' ? 'เวลาไทย (Asia/Bangkok)' : 'Thailand local time (Asia/Bangkok)';
  const totals = useMemo(() => sessions.reduce(
    (sum, session) => {
      sum.total += session.summary?.total_targeted ?? 0;
      sum.present += session.summary?.present ?? 0;
      sum.late += session.summary?.late ?? 0;
      sum.missing += session.summary?.missing ?? 0;
      return sum;
    },
    { total: 0, present: 0, late: 0, missing: 0 },
  ), [sessions]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      const created = await createStaffAttendanceSession({ ...form, event_id: currentEventId ?? undefined });
      setToast({ type: 'success', message: language === 'th' ? 'สร้างรอบเช็กชื่อแล้ว' : 'Attendance session created' });
      setCreating(false);
      await state.reload();
      navigate(`/admin/staff/attendance/${created.id}`);
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'สร้างรอบไม่สำเร็จ' : 'Could not create session') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack admin-staff-attendance-page">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Staff Attendance"
        title={language === 'th' ? 'ระบบเช็กชื่อทีมงาน' : 'Staff Attendance'}
        description={language === 'th'
          ? `สร้างรอบเช็กชื่อ แสดง QR ให้ทีมงานสแกน และเช็กชื่อสำรองแบบ manual ได้${currentEvent ? ` · กิจกรรมปัจจุบัน: ${currentEvent.name_th}` : ''}`
          : `Create sessions, show QR links for staff, and manually check staff in when needed.${currentEvent ? ` Current event: ${currentEvent.name_en || currentEvent.name_th}` : ''}`}
        meta={<EventSwitcher compact />}
        actions={(
          <>
            <HelpButton topicId="admin-attendance.create-session" variant="link" />
            <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>
            <Button icon={<Plus size={18} />} onClick={() => setCreating(true)}>{language === 'th' ? 'สร้างรอบเช็กชื่อ' : 'Create session'}</Button>
          </>
        )}
      />

      <div className="stats-grid">
        <DashboardStatCard label={language === 'th' ? 'จำนวนรอบ' : 'Sessions'} value={sessions.length} icon={<CalendarClock size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'ทีมงานในรอบทั้งหมด' : 'Targeted staff'} value={totals.total} icon={<UsersRound size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'มาแล้ว' : 'Present'} value={totals.present} />
        <DashboardStatCard label={language === 'th' ? 'ยังไม่เช็ก' : 'Missing'} value={totals.missing} />
      </div>

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}

      <ResponsiveDataTable
        rows={sessions}
        getKey={(row) => row.id}
        emptyText={language === 'th' ? 'ยังไม่มีรอบเช็กชื่อ' : 'No attendance sessions yet'}
        mobileTitle={(row) => row.title}
        mobileSubtitle={(row) => `${statusLabel(row.status, language)} · ${formatBangkokDateTime(row.starts_at, language)}`}
        mobileMeta={(row) => `${language === 'th' ? 'มาแล้ว' : 'Present'} ${row.summary?.present ?? 0} · ${language === 'th' ? 'ยังไม่เช็ก' : 'Missing'} ${row.summary?.missing ?? 0}`}
        mobileActions={(row) => <Link className="btn btn-primary" to={`/admin/staff/attendance/${row.id}`}>{language === 'th' ? 'เปิดรายละเอียด' : 'Open detail'}</Link>}
        columns={[
          { key: 'title', header: language === 'th' ? 'รอบเช็กชื่อ' : 'Session', render: (row) => <strong>{row.title}</strong> },
          { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => <span className={`status-pill status-${row.status}`}>{statusLabel(row.status, language)}</span> },
          { key: 'type', header: language === 'th' ? 'ประเภท' : 'Type', render: (row) => row.session_type },
          { key: 'time', header: language === 'th' ? 'เวลาเริ่ม' : 'Starts', render: (row) => formatBangkokDateTime(row.starts_at, language) },
          { key: 'summary', header: language === 'th' ? 'สรุป' : 'Summary', render: (row) => `${row.summary?.present ?? 0}/${row.summary?.total_targeted ?? 0} · late ${row.summary?.late ?? 0}` },
          { key: 'action', header: '', render: (row) => <Link className="btn btn-secondary" to={`/admin/staff/attendance/${row.id}`}>{language === 'th' ? 'รายละเอียด' : 'Detail'}</Link>, align: 'right' },
        ]}
      />

      <Modal open={creating} title={language === 'th' ? 'สร้างรอบเช็กชื่อ' : 'Create attendance session'} onClose={() => setCreating(false)}>
        <form className="form-grid" onSubmit={submit}>
          <Card className="privacy-notice full-span" variant="soft">
            <strong>{language === 'th' ? 'เวลาทั้งหมดเป็นเวลาไทย' : 'All times use Thailand local time'}</strong>
            <span>{language === 'th' ? 'กรอกเวลาตามเครื่องของคุณ ไม่ต้องบวกหรือลบ 7 ชั่วโมงเอง' : 'Enter the time from your device. Do not add or subtract 7 hours manually.'}</span>
            <HelpButton topicId="admin-attendance.create-session" variant="compact" />
          </Card>
          <Input label={language === 'th' ? 'ชื่อรอบ' : 'Title'} value={form.title ?? ''} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          <div className="field">
            <span>{language === 'th' ? 'กิจกรรม' : 'Event'}</span>
            <div className="form-static-value">{currentEvent ? (language === 'th' ? currentEvent.name_th : currentEvent.name_en || currentEvent.name_th) : (language === 'th' ? 'กิจกรรมเดิม' : 'Legacy/default event')}</div>
          </div>
          <Select label={language === 'th' ? 'ประเภท' : 'Type'} value={form.session_type ?? 'check_in'} onChange={(event) => setForm({ ...form, session_type: event.target.value as StaffAttendanceSessionInput['session_type'] })} options={sessionTypes} />
          <Select label={language === 'th' ? 'กลุ่มเป้าหมาย' : 'Target'} value={form.target_scope ?? 'all'} onChange={(event) => setForm({ ...form, target_scope: event.target.value as StaffAttendanceSessionInput['target_scope'] })} options={targetScopes} />
          {form.target_scope === 'main_group' || form.target_scope === 'subgroup' ? (
            <Select label={language === 'th' ? 'สี' : 'Color'} value={form.main_group ?? ''} onChange={(event) => setForm({ ...form, main_group: event.target.value as StaffAttendanceSessionInput['main_group'] })} options={mainGroups.map((group) => ({ value: group, label: language === 'th' ? groupMeta[group].th : groupMeta[group].en }))} />
          ) : null}
          {form.target_scope === 'subgroup' ? (
            <Select label={language === 'th' ? 'กลุ่มย่อย' : 'Subgroup'} value={form.subgroup ?? ''} onChange={(event) => setForm({ ...form, subgroup: event.target.value as StaffAttendanceSessionInput['subgroup'] })} options={subgroups} />
          ) : null}
          {form.target_scope === 'role' ? (
            <Select label={language === 'th' ? 'ฝ่าย/หน้าที่' : 'Role'} value={form.role_filter ?? ''} onChange={(event) => setForm({ ...form, role_filter: event.target.value })} options={staffOperationalRoles} />
          ) : null}
          <Input label={language === 'th' ? 'เริ่ม' : 'Starts'} type="datetime-local" value={form.starts_at ?? ''} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} hint={timezoneHint} required />
          <Input label={language === 'th' ? 'นับว่าสายหลัง' : 'Late after'} type="datetime-local" value={form.late_after ?? ''} onChange={(event) => setForm({ ...form, late_after: event.target.value })} hint={timezoneHint} />
          <Input label={language === 'th' ? 'สิ้นสุด' : 'Ends'} type="datetime-local" value={form.ends_at ?? ''} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} hint={timezoneHint} />
          <Select label={language === 'th' ? 'สถานะ' : 'Status'} value={form.status ?? 'draft'} onChange={(event) => setForm({ ...form, status: event.target.value as StaffAttendanceSessionInput['status'] })} options={['draft', 'active']} />
          <details className="filter-disclosure">
            <summary>{language === 'th' ? 'ตัวเลือกขั้นสูง' : 'Advanced options'}</summary>
            <div className="form-grid">
              <Input label={language === 'th' ? 'คำอธิบาย' : 'Description'} value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              <Input label={language === 'th' ? 'QR หมดอายุ' : 'QR expires at'} type="datetime-local" value={form.qr_expires_at ?? ''} onChange={(event) => setForm({ ...form, qr_expires_at: event.target.value })} hint={timezoneHint} />
            </div>
          </details>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
            <Button type="submit" loading={saving}>{language === 'th' ? 'สร้างรอบ' : 'Create session'}</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
