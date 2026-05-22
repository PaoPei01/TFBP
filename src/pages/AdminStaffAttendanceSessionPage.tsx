import QRCode from 'qrcode';
import { CheckCircle2, Clock, Copy, Download, QrCode, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
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
import { formatBangkokDateTime } from '../lib/dateTime';
import { groupLabel } from '../lib/grouping';
import {
  adminScanStaffPersonalQr,
  buildStaffAttendanceScanUrl,
  closeStaffAttendanceSession,
  exportStaffAttendanceCsv,
  fetchAdminStaffAttendance,
  manualStaffAttendanceUpdate,
  parseStaffPersonalQrToken,
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

const StaffQrScannerModal = lazy(() => import('../components/attendance/StaffQrScannerModal').then((module) => ({ default: module.StaffQrScannerModal })));

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
  const [staffQrInput, setStaffQrInput] = useState('');
  const [scanWorking, setScanWorking] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
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

  async function scanPersonalQr() {
    if (!session) return;
    const token = parseStaffPersonalQrToken(staffQrInput);
    if (!token) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณาวาง token หรือข้อความจาก QR ส่วนตัว' : 'Paste a staff personal QR token first.' });
      return;
    }
    try {
      setScanWorking(true);
      const result = await adminScanStaffPersonalQr(session.id, token, null, note);
      setToast({ type: result.success ? 'success' : 'error', message: attendanceScanMessage(result.code, language) });
      if (result.success) {
        setStaffQrInput('');
        await state.reload();
      }
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'เช็กชื่อจาก QR ส่วนตัวไม่สำเร็จ' : 'Could not check in from personal QR') });
    } finally {
      setScanWorking(false);
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
        description={`${formatBangkokDateTime(session.starts_at, language)} · ${session.status}`}
        actions={(
          <>
            <Link className="btn btn-secondary" to="/admin/staff/attendance">{language === 'th' ? 'ทุกรอบ' : 'All sessions'}</Link>
            <HelpButton topicId="admin-attendance.export" variant="compact" />
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
            <div className="section-title-row">
              <div>
                <p className="eyebrow">{language === 'th' ? 'แสดง QR Code' : 'Show QR Code'}</p>
                <h2>{language === 'th' ? 'ให้ทีมงานสแกน QR นี้' : 'Let staff scan this QR'}</h2>
              </div>
              <HelpButton topicId="admin-attendance.session-qr" variant="compact" />
            </div>
            <p>{language === 'th' ? 'ทีมงานสแกนด้วยมือถือของตัวเอง แล้วเข้าสู่ระบบหรือยืนยันอีเมลและเบอร์โทรเพื่อเช็กชื่อ' : 'Staff scan this with their own phone, then sign in or verify by email and phone to check in.'}</p>
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
            <div className="section-title-row">
              <div>
                <p className="eyebrow">{language === 'th' ? 'เครื่องมือเช็กชื่อ' : 'Check-in tools'}</p>
                <h2>{language === 'th' ? 'Manual และ QR ส่วนตัวทีมงาน' : 'Manual and staff personal QR'}</h2>
              </div>
              <HelpButton topicId="admin-attendance.manual-checkin" variant="compact" />
            </div>
            <p>{language === 'th' ? 'ใช้เมื่อทีมงานสแกนเองไม่ได้ หรือใช้ QR ส่วนตัวเพื่อเช็กชื่อแทนอย่างรวดเร็ว' : 'Use manual controls or a staff personal QR when staff cannot self check-in.'}</p>
          </div>
          <details className="filter-disclosure">
            <summary>{language === 'th' ? 'เพิ่มหมายเหตุ' : 'Add note'}</summary>
            <Input label={language === 'th' ? 'หมายเหตุ' : 'Note'} value={note} onChange={(event) => setNote(event.target.value)} placeholder={language === 'th' ? 'เช่น มาลงทะเบียนกับแอดมิน' : 'e.g. checked in by admin'} />
          </details>
          <details className="filter-disclosure attendance-personal-qr-tool">
            <summary>{language === 'th' ? 'สแกน QR ส่วนตัวทีมงาน' : 'Scan staff personal QR'}</summary>
            <div className="form-grid">
              <div className="section-title-row full-span">
                <span className="form-hint">{language === 'th' ? 'ใช้เมื่อทีมงานเปิด QR ส่วนตัวให้แอดมินสแกน' : 'Use when staff show their personal QR for admin-assisted check-in.'}</span>
                <HelpButton topicId="admin-attendance.scan-staff-qr" variant="compact" />
              </div>
              <Button type="button" icon={<QrCode size={18} />} onClick={() => setScannerOpen(true)}>
                {language === 'th' ? 'สแกน QR ทีมงาน' : 'Scan Staff QR'}
              </Button>
              <Input
                label={language === 'th' ? 'Token หรือข้อความจาก QR' : 'Token or QR text'}
                value={staffQrInput}
                onChange={(event) => setStaffQrInput(event.target.value)}
                placeholder="staff_identity:..."
                hint={language === 'th' ? 'รองรับ raw token, staff_identity:<token> หรือ URL ที่มี ?token=' : 'Supports raw token, staff_identity:<token>, or a URL with ?token='}
              />
              <Button type="button" icon={<QrCode size={18} />} loading={scanWorking} onClick={scanPersonalQr}>
                {language === 'th' ? 'เช็กชื่อจาก QR ส่วนตัว' : 'Check in from personal QR'}
              </Button>
            </div>
          </details>
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
          { key: 'time', header: language === 'th' ? 'เวลา' : 'Time', render: (row) => formatBangkokDateTime(row.record?.scanned_at ?? null, language) },
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

      {scannerOpen ? (
        <Suspense fallback={<LoadingSkeleton />}>
          <StaffQrScannerModal
            open={scannerOpen}
            sessionId={session.id}
            onClose={() => setScannerOpen(false)}
            onScanSuccess={async (result) => {
              setToast({ type: 'success', message: attendanceScanMessage(result.code, language) });
              await state.reload();
            }}
          />
        </Suspense>
      ) : null}
    </section>
  );
}

function attendanceScanMessage(code: string, language: 'th' | 'en') {
  const messages: Record<string, { th: string; en: string }> = {
    checked_in: { th: 'เช็กชื่อสำเร็จ', en: 'Check-in successful' },
    late: { th: 'บันทึกเป็นมาสายแล้ว', en: 'Recorded as late' },
    checked_out: { th: 'เช็กออกแล้ว', en: 'Checked out' },
    already_checked: { th: 'ทีมงานคนนี้เช็กชื่อแล้วก่อนหน้า', en: 'This staff member was already checked.' },
    invalid_token: { th: 'QR ส่วนตัวไม่ถูกต้อง', en: 'Invalid staff personal QR' },
    invalid_status: { th: 'สถานะเช็กชื่อไม่ถูกต้อง', en: 'Invalid attendance status' },
    session_not_found: { th: 'ไม่พบรอบเช็กชื่อ', en: 'Session not found' },
    session_not_active: { th: 'รอบนี้ยังไม่เปิดใช้งาน', en: 'Session is not active' },
    session_not_started: { th: 'รอบนี้ยังไม่เริ่ม', en: 'Session has not started' },
    session_closed: { th: 'รอบนี้ปิดแล้ว', en: 'Session is closed' },
    qr_expired: { th: 'QR รอบเช็กชื่อหมดอายุแล้ว', en: 'Session QR has expired' },
    not_in_target_scope: { th: 'ทีมงานคนนี้ไม่อยู่ในกลุ่มเป้าหมาย', en: 'This staff member is not in the target scope' },
    admin_required: { th: 'ต้องเป็นแอดมินเท่านั้น', en: 'Admin access required' },
  };
  return messages[code]?.[language] ?? (language === 'th' ? 'ดำเนินการแล้ว' : 'Done');
}
