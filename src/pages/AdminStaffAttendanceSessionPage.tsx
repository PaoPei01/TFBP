import QRCode from 'qrcode';
import { CheckCircle2, Clock, Copy, Download, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MobileSearchHeader } from '../components/mobile/MobileSearchHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import type { StaffAttendanceAdminRow, StaffAttendanceStatus } from '../lib/attendanceTypes';
import { groupLabel } from '../lib/grouping';
import {
  buildStaffAttendanceScanUrl,
  closeStaffAttendanceSession,
  exportStaffAttendanceCsv,
  fetchAdminStaffAttendance,
  manualStaffAttendanceUpdate,
  regenerateStaffAttendanceQr,
  staffAttendanceDisplayName,
} from '../services/staffAttendance';
import { errorMessage } from '../utils/error';

const manualStatuses: Array<{ value: StaffAttendanceStatus; th: string; en: string }> = [
  { value: 'present', th: 'มาแล้ว', en: 'Present' },
  { value: 'late', th: 'มาสาย', en: 'Late' },
  { value: 'absent', th: 'ขาด', en: 'Absent' },
  { value: 'excused', th: 'ขออนุญาต', en: 'Excused' },
  { value: 'checked_out', th: 'เช็กออก', en: 'Checked out' },
];

function formatDateTime(value: string | null, language: 'th' | 'en') {
  if (!value) return '-';
  return new Date(value).toLocaleString(language === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusText(status: string | undefined | null, language: 'th' | 'en') {
  const found = manualStatuses.find((item) => item.value === status);
  if (found) return language === 'th' ? found.th : found.en;
  if (status === 'cancelled') return language === 'th' ? 'ยกเลิก' : 'Cancelled';
  return language === 'th' ? 'ยังไม่เช็ก' : 'Not checked';
}

export function AdminStaffAttendanceSessionPage() {
  const { sessionId } = useParams();
  const { language } = useLanguage();
  const state = useAsync(() => fetchAdminStaffAttendance(sessionId), [sessionId]);
  const [toast, setToast] = useState<ToastState>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [note, setNote] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const session = state.data?.selected_session ?? null;
  const scanUrl = session?.qr_token ? buildStaffAttendanceScanUrl(session.qr_token) : '';
  const roster = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (state.data?.roster ?? []).filter((row) => {
      const recordStatus = row.record?.status ?? 'missing';
      if (statusFilter && recordStatus !== statusFilter) return false;
      if (!term) return true;
      return [
        row.name_th,
        row.name_en,
        row.nickname,
        row.nickname_th,
        row.nickname_en,
        row.email,
        row.phone,
        row.student_id,
        row.primary_role,
        row.main_group,
        row.subgroup,
      ].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }, [search, state.data?.roster, statusFilter]);

  useEffect(() => {
    let active = true;
    if (!scanUrl) {
      setQrDataUrl('');
      return undefined;
    }
    QRCode.toDataURL(scanUrl, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [scanUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(scanUrl);
      setToast({ type: 'success', message: language === 'th' ? 'คัดลอกลิงก์แล้ว' : 'Link copied' });
    } catch {
      setToast({ type: 'error', message: language === 'th' ? 'คัดลอกไม่สำเร็จ' : 'Copy failed' });
    }
  }

  async function regenerateQr() {
    if (!session) return;
    try {
      await regenerateStaffAttendanceQr(session.id);
      setToast({ type: 'success', message: language === 'th' ? 'สร้าง QR ใหม่แล้ว QR เก่าจะใช้ไม่ได้' : 'QR regenerated. The old QR no longer works.' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'สร้าง QR ไม่สำเร็จ' : 'Could not regenerate QR') });
    }
  }

  async function closeSession() {
    if (!session) return;
    try {
      await closeStaffAttendanceSession(session.id);
      setToast({ type: 'success', message: language === 'th' ? 'ปิดรอบเช็กชื่อแล้ว' : 'Session closed' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ปิดรอบไม่สำเร็จ' : 'Could not close session') });
    }
  }

  async function mark(row: StaffAttendanceAdminRow, status: StaffAttendanceStatus) {
    if (!session) return;
    try {
      setWorkingId(`${row.staff_profile_id}-${status}`);
      await manualStaffAttendanceUpdate(session.id, row.staff_profile_id, status, note);
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกเช็กชื่อแล้ว' : 'Attendance saved' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed') });
    } finally {
      setWorkingId(null);
    }
  }

  if (state.loading) return <LoadingSkeleton />;
  if (state.error) return <div className="error-state">{state.error}</div>;
  if (!session) return <div className="empty-state">{language === 'th' ? 'ไม่พบรอบเช็กชื่อ' : 'Attendance session not found'}</div>;

  const summary = state.data?.summary ?? session.summary;

  return (
    <section className="page-stack admin-staff-attendance-page has-sticky-actions">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Attendance Session"
        title={session.title}
        description={`${formatDateTime(session.starts_at, language)} · ${session.status}`}
        actions={(
          <>
            <Link className="btn btn-secondary" to="/admin/staff/attendance">{language === 'th' ? 'ทุกรอบ' : 'All sessions'}</Link>
            <Button variant="secondary" icon={<Download size={18} />} onClick={() => exportStaffAttendanceCsv(state.data?.roster ?? [], `${session.title}.csv`)}>CSV</Button>
            <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>
          </>
        )}
      />

      <div className="stats-grid">
        <DashboardStatCard label={language === 'th' ? 'ทีมงานทั้งหมด' : 'Total'} value={summary?.total_targeted ?? 0} icon={<ShieldCheck size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'มาแล้ว' : 'Present'} value={summary?.present ?? 0} icon={<CheckCircle2 size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'มาสาย' : 'Late'} value={summary?.late ?? 0} icon={<Clock size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'ยังไม่เช็ก' : 'Missing'} value={summary?.missing ?? 0} icon={<XCircle size={20} />} />
      </div>

      <div className="attendance-session-layout">
        <Card className="attendance-qr-card" variant="soft">
          <div>
            <p className="eyebrow">{language === 'th' ? 'แสดง QR Code' : 'Show QR Code'}</p>
            <h2>{language === 'th' ? 'ให้ทีมงานสแกน QR นี้' : 'Let staff scan this QR'}</h2>
            <p>{language === 'th' ? 'ทีมงานต้องสแกนด้วยมือถือของตัวเองและเข้าสู่ระบบทีมงานเพื่อเช็กชื่อ' : 'Staff should scan this QR with their own phone and sign in to check in.'}</p>
          </div>
          {qrDataUrl ? <img className="attendance-qr-image" src={qrDataUrl} alt={language === 'th' ? 'QR เช็กชื่อทีมงาน' : 'Staff attendance QR'} /> : <div className="attendance-qr-fallback">{language === 'th' ? 'ไม่สามารถสร้างรูป QR ได้' : 'Could not render QR image'}</div>}
          <code className="attendance-scan-url">{scanUrl}</code>
          <div className="form-actions">
            <Button variant="secondary" icon={<Copy size={18} />} onClick={copyLink}>{language === 'th' ? 'คัดลอกลิงก์' : 'Copy link'}</Button>
            <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={regenerateQr}>{language === 'th' ? 'สร้าง QR ใหม่' : 'Regenerate QR'}</Button>
            <Button variant="danger" onClick={closeSession}>{language === 'th' ? 'ปิดรอบเช็กชื่อ' : 'Close session'}</Button>
          </div>
        </Card>

        <Card className="attendance-manual-panel">
          <div>
            <p className="eyebrow">{language === 'th' ? 'เช็กชื่อแบบ Manual' : 'Manual check-in'}</p>
            <h2>{language === 'th' ? 'สำรองสำหรับหน้างาน' : 'Fallback for operations'}</h2>
            <p>{language === 'th' ? 'ใช้เมื่อทีมงานสแกนไม่ได้หรือแอดมินต้องแก้สถานะให้ทันที' : 'Use when staff cannot scan or admins need to fix a status quickly.'}</p>
          </div>
          <Input label={language === 'th' ? 'หมายเหตุ' : 'Note'} value={note} onChange={(event) => setNote(event.target.value)} placeholder={language === 'th' ? 'เช่น มาลงทะเบียนกับแอดมิน' : 'e.g. checked in by admin'} />
        </Card>
      </div>

      <MobileSearchHeader
        label={language === 'th' ? 'ค้นหาทีมงาน' : 'Search staff'}
        value={search}
        onChange={setSearch}
        placeholder={language === 'th' ? 'ชื่อ เบอร์ อีเมล หน้าที่' : 'Name, phone, email, role'}
        resultText={`${roster.length} ${language === 'th' ? 'คน' : 'people'}`}
        trailing={<Select label={language === 'th' ? 'สถานะ' : 'Status'} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} options={[{ value: 'missing', label: language === 'th' ? 'ยังไม่เช็ก' : 'Missing' }, ...manualStatuses.map((item) => ({ value: item.value, label: language === 'th' ? item.th : item.en }))]} />}
      />

      <Card className="toolbar desktop-filter-panel">
        <div className="search-shell">
          <Search size={18} />
          <Input label={language === 'th' ? 'ค้นหาทีมงาน' : 'Search staff'} value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select label={language === 'th' ? 'สถานะ' : 'Status'} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} options={[{ value: 'missing', label: language === 'th' ? 'ยังไม่เช็ก' : 'Missing' }, ...manualStatuses.map((item) => ({ value: item.value, label: language === 'th' ? item.th : item.en }))]} />
      </Card>

      <ResponsiveDataTable
        rows={roster}
        getKey={(row) => row.staff_profile_id}
        emptyText={language === 'th' ? 'ไม่พบทีมงานในรอบนี้' : 'No staff in this session'}
        mobileTitle={(row) => staffAttendanceDisplayName(row)}
        mobileSubtitle={(row) => `${row.primary_role || row.position || '-'} · ${groupLabel(row.main_group, row.subgroup, language)}`}
        mobileMeta={(row) => statusText(row.record?.status, language)}
        mobileActions={(row) => (
          <div className="attendance-manual-actions">
            {manualStatuses.map((item) => (
              <Button key={item.value} size="sm" variant={row.record?.status === item.value ? 'primary' : 'secondary'} loading={workingId === `${row.staff_profile_id}-${item.value}`} onClick={() => mark(row, item.value)}>
                {language === 'th' ? item.th : item.en}
              </Button>
            ))}
          </div>
        )}
        columns={[
          { key: 'name', header: language === 'th' ? 'ทีมงาน' : 'Staff', render: (row) => <div className="participant-admin-cell"><strong>{staffAttendanceDisplayName(row)}</strong><span>{row.name_th || row.name_en || row.email}</span></div> },
          { key: 'role', header: language === 'th' ? 'หน้าที่' : 'Role', render: (row) => row.primary_role || row.position || '-' },
          { key: 'group', header: language === 'th' ? 'กลุ่ม' : 'Group', render: (row) => groupLabel(row.main_group, row.subgroup, language) },
          { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => <span className={`status-pill status-${row.record?.status ?? 'missing'}`}>{statusText(row.record?.status, language)}</span> },
          { key: 'time', header: language === 'th' ? 'เวลา' : 'Time', render: (row) => formatDateTime(row.record?.scanned_at ?? null, language) },
          { key: 'method', header: language === 'th' ? 'วิธี' : 'Method', render: (row) => row.record?.method ?? '-' },
          { key: 'actions', header: language === 'th' ? 'Manual' : 'Manual', render: (row) => (
            <div className="attendance-row-actions">
              {manualStatuses.slice(0, 4).map((item) => (
                <Button key={item.value} size="sm" variant={row.record?.status === item.value ? 'primary' : 'secondary'} loading={workingId === `${row.staff_profile_id}-${item.value}`} onClick={() => mark(row, item.value)}>
                  {language === 'th' ? item.th : item.en}
                </Button>
              ))}
            </div>
          ) },
        ]}
      />
    </section>
  );
}
