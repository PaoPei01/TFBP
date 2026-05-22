import { Camera, History, Home, LogOut, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import type { MyStaffAttendanceData, VerifiedStaffAttendanceIdentity } from '../lib/attendanceTypes';
import { formatBangkokDateTime } from '../lib/dateTime';
import { groupLabel } from '../lib/grouping';
import { supabase } from '../lib/supabase';
import {
  clearVerifiedStaffIdentity,
  getVerifiedStaffIdentity,
  identityFromAttendanceResult,
  saveVerifiedStaffIdentity,
} from '../lib/verifiedStaffIdentity';
import { fetchMyStaffAttendance, getMyStaffPersonalQr, verifyStaffAttendanceIdentity } from '../services/staffAttendance';
import { errorMessage } from '../utils/error';

const StaffPersonalQrModal = lazy(() => import('../components/attendance/StaffPersonalQrModal').then((module) => ({ default: module.StaffPersonalQrModal })));
const SessionQrScannerModal = lazy(() => import('../components/attendance/SessionQrScannerModal').then((module) => ({ default: module.SessionQrScannerModal })));

function displayName(profile: { nickname_th?: string | null; nickname?: string | null; nickname_en?: string | null; name_th?: string | null; name_en?: string | null; email?: string | null } | null | undefined) {
  return profile?.nickname_th || profile?.nickname || profile?.nickname_en || profile?.name_th || profile?.name_en || profile?.email || '-';
}

function statusLabel(status: string | null | undefined, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    present: { th: 'มาแล้ว', en: 'Present' },
    late: { th: 'มาสาย', en: 'Late' },
    absent: { th: 'ขาด', en: 'Absent' },
    excused: { th: 'ขออนุญาต', en: 'Excused' },
    checked_out: { th: 'เช็กออก', en: 'Checked out' },
    cancelled: { th: 'ยกเลิก', en: 'Cancelled' },
  };
  return status ? labels[status]?.[language] ?? status : language === 'th' ? 'ยังไม่เช็ก' : 'Not checked';
}

function authIdentityFromData(data: MyStaffAttendanceData | null, personalQrPayload: string): VerifiedStaffAttendanceIdentity | null {
  const profile = data?.staff_profile;
  if (!profile || !personalQrPayload) return null;
  const assignment = profile.assignment as { main_group?: string | null; subgroup?: string | null; primary_role?: string | null } | null | undefined;
  return {
    staff_profile_id: profile.id,
    display_name: displayName(profile),
    nickname: profile.nickname_th || profile.nickname || profile.nickname_en || null,
    main_group: (assignment?.main_group ?? null) as VerifiedStaffAttendanceIdentity['main_group'],
    subgroup: (assignment?.subgroup ?? null) as VerifiedStaffAttendanceIdentity['subgroup'],
    primary_role: assignment?.primary_role ?? null,
    verified_staff_token: '',
    personal_qr_payload: personalQrPayload,
    saved_at: new Date().toISOString(),
  };
}

export function StaffAttendancePage() {
  const { language } = useLanguage();
  const [data, setData] = useState<MyStaffAttendanceData | null>(null);
  const [verifiedIdentity, setVerifiedIdentity] = useState<VerifiedStaffAttendanceIdentity | null>(() => getVerifiedStaffIdentity());
  const [authPersonalQrPayload, setAuthPersonalQrPayload] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [personalQrOpen, setPersonalQrOpen] = useState(false);
  const [sessionScannerOpen, setSessionScannerOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const records = useMemo(() => data?.records ?? [], [data?.records]);
  const latest = data?.latest_record;
  const activeIdentity = isAuthenticated ? authIdentityFromData(data, authPersonalQrPayload) : verifiedIdentity;

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: userData } = await supabase.auth.getUser();
      setIsAuthenticated(Boolean(userData.user));
      if (!userData.user) {
        setData(null);
        setLoading(false);
        return;
      }
      const nextData = await fetchMyStaffAttendance();
      setData(nextData);
    } catch (err) {
      setError(errorMessage(err, language === 'th' ? 'โหลดข้อมูลเช็กชื่อไม่สำเร็จ' : 'Could not load attendance'));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  async function verifyIdentity(event: FormEvent) {
    event.preventDefault();
    try {
      setVerifying(true);
      const result = await verifyStaffAttendanceIdentity(email, phone);
      const identity = identityFromAttendanceResult(result);
      if (!identity) {
        setToast({ type: 'error', message: language === 'th' ? 'ไม่พบข้อมูลทีมงานจากอีเมลและเบอร์โทรนี้' : 'No staff profile found for this email and phone.' });
        return;
      }
      saveVerifiedStaffIdentity(identity);
      setVerifiedIdentity(identity);
      setToast({ type: 'success', message: language === 'th' ? 'ยืนยันตัวตนสำเร็จ' : 'Identity verified' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ยืนยันตัวตนไม่สำเร็จ' : 'Verification failed') });
    } finally {
      setVerifying(false);
    }
  }

  async function openPersonalQr() {
    if (isAuthenticated && !authPersonalQrPayload) {
      try {
        const qr = await getMyStaffPersonalQr();
        if (qr.qr_payload) setAuthPersonalQrPayload(qr.qr_payload);
      } catch (err) {
        setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'โหลด QR ส่วนตัวไม่สำเร็จ' : 'Could not load personal QR') });
        return;
      }
    }
    setPersonalQrOpen(true);
  }

  function clearIdentity() {
    clearVerifiedStaffIdentity();
    setVerifiedIdentity(null);
    setEmail('');
    setPhone('');
    setToast({ type: 'success', message: language === 'th' ? 'ล้างข้อมูลที่จำไว้แล้ว' : 'Remembered identity cleared' });
  }

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <section className="narrow-page page-stack">
        <Toast toast={toast} />
        <Card className="error-state" variant="warning">
          <h1>{language === 'th' ? 'โหลดข้อมูลเช็กชื่อไม่สำเร็จ' : 'Could not load attendance'}</h1>
          <p>{error}</p>
          <Button icon={<RefreshCw size={18} />} onClick={() => void loadAttendance()}>
            {language === 'th' ? 'ลองใหม่' : 'Try again'}
          </Button>
        </Card>
      </section>
    );
  }

  const showVerification = !isAuthenticated && !verifiedIdentity;

  return (
    <section className="page-stack staff-page staff-attendance-home staff-attendance-simple">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Staff Attendance"
        title={language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff Attendance'}
        description={language === 'th' ? 'ยืนยันตัวตนครั้งเดียว แล้วเลือกแสดง QR หรือสแกน QR รอบเช็กชื่อ' : 'Verify once, then show your QR or scan an attendance QR.'}
        actions={(
          <>
            <HelpButton topicId="staff-attendance.overview" variant="link" />
            {isAuthenticated ? <Link className="btn btn-secondary" to="/staff"><Home size={18} />{language === 'th' ? 'หน้าสตาฟ' : 'Staff Home'}</Link> : null}
          </>
        )}
      />

      {showVerification ? (
        <Card className="scan-verify-card">
          <div>
            <p className="eyebrow">{language === 'th' ? 'ยืนยันตัวตนทีมงาน' : 'Staff verification'}</p>
            <h2>{language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff Attendance'}</h2>
            <p>{language === 'th' ? 'กรอกอีเมลและเบอร์โทรที่ใช้ลงทะเบียนทีมงานเพื่อใช้งานเมนูเช็กชื่อ' : 'Enter the email and phone used for staff registration to use attendance tools.'}</p>
          </div>
          <form className="form-grid" onSubmit={verifyIdentity}>
            <Input label={language === 'th' ? 'อีเมล' : 'Email'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} value={phone} onChange={(event) => setPhone(event.target.value)} required />
            <Button type="submit" size="lg" fullWidth loading={verifying}>{language === 'th' ? 'ยืนยันตัวตน' : 'Verify identity'}</Button>
          </form>
        </Card>
      ) : null}

      {!showVerification ? (
        <>
          <Card className="staff-attendance-identity-card" variant="soft">
            <ShieldCheck size={28} />
            <div>
              <p className="eyebrow">{language === 'th' ? 'กำลังใช้งานในชื่อ' : 'Using attendance as'}</p>
              <h2>{activeIdentity?.display_name ?? displayName(data?.staff_profile)}</h2>
              <span>{groupLabel(activeIdentity?.main_group ?? null, activeIdentity?.subgroup ?? null, language)} · {activeIdentity?.primary_role ?? '-'}</span>
            </div>
          </Card>

          <Card className="staff-attendance-choice-card">
            <div>
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">{language === 'th' ? 'เลือกวิธีเช็กชื่อ' : 'Choose check-in method'}</p>
                  <h2>{language === 'th' ? 'คุณต้องการเช็กชื่อแบบไหน' : 'How do you want to check in?'}</h2>
                </div>
                <HelpButton topicId="staff-attendance.overview" variant="compact" />
              </div>
            </div>
            <div className="help-chip-row">
              <HelpButton topicId="staff-attendance.personal-qr" variant="link" label={language === 'th' ? 'QR ส่วนตัวคืออะไร' : 'What is personal QR?'} />
              <HelpButton topicId="staff-attendance.session-qr" variant="link" label={language === 'th' ? 'สแกน QR รอบอย่างไร' : 'How to scan session QR'} />
            </div>
            <div className="staff-attendance-action-grid">
              <button className="staff-attendance-action-card" type="button" onClick={openPersonalQr}>
                <QrCode size={28} />
                <strong>{language === 'th' ? 'เปิด QR ของฉันให้แอดมินสแกน' : 'Show my QR for admin scan'}</strong>
                <span>{language === 'th' ? 'ใช้เมื่อแอดมินหรือหัวหน้าทีมเป็นคนเช็กชื่อให้' : 'Use when an admin or team lead checks you in.'}</span>
                <em>{language === 'th' ? 'แสดง QR ของฉัน' : 'Show my QR'}</em>
              </button>
              <button className="staff-attendance-action-card" type="button" onClick={() => setSessionScannerOpen(true)}>
                <Camera size={28} />
                <strong>{language === 'th' ? 'สแกน QR รอบเช็กชื่อ' : 'Scan attendance QR'}</strong>
                <span>{language === 'th' ? 'ใช้กล้องมือถือสแกน QR ที่แอดมินแสดง' : 'Use your phone camera to scan the QR shown by admin.'}</span>
                <em>{language === 'th' ? 'เปิดกล้องสแกน QR' : 'Open QR scanner'}</em>
              </button>
            </div>
            {!isAuthenticated ? (
              <div className="staff-attendance-secondary-actions">
                <button type="button" onClick={clearIdentity}><LogOut size={16} />{language === 'th' ? 'เปลี่ยนบัญชีทีมงานนี้' : 'Change staff identity'}</button>
                <button type="button" onClick={clearIdentity}>{language === 'th' ? 'ล้างข้อมูลที่จำไว้ในเครื่อง' : 'Clear remembered identity'}</button>
              </div>
            ) : null}
          </Card>
        </>
      ) : null}

      {latest ? (
        <Card className="privacy-notice" variant="success">
          <strong>{language === 'th' ? 'สถานะล่าสุด' : 'Latest status'}</strong>
          <span>{latest.session?.title ?? '-'} · {statusLabel(latest.status, language)} · {formatBangkokDateTime(latest.scanned_at ?? latest.updated_at, language)}</span>
        </Card>
      ) : null}

      {isAuthenticated ? (
        <section className="page-stack">
          <div className="staff-section-head">
            <h2><History size={19} />{language === 'th' ? 'ประวัติของฉัน' : 'My history'}</h2>
            <span>{records.length} {language === 'th' ? 'รายการ' : 'records'}</span>
          </div>
          <ResponsiveDataTable
            rows={records}
            getKey={(row) => row.id}
            emptyText={language === 'th' ? 'ยังไม่มีประวัติการเช็กชื่อ' : 'No attendance history yet'}
            mobileTitle={(row) => row.session?.title ?? '-'}
            mobileSubtitle={(row) => statusLabel(row.status, language)}
            mobileMeta={(row) => formatBangkokDateTime(row.scanned_at ?? row.updated_at, language)}
            columns={[
              { key: 'session', header: language === 'th' ? 'รอบ' : 'Session', render: (row) => row.session?.title ?? '-' },
              { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => <span className={`status-pill status-${row.status}`}>{statusLabel(row.status, language)}</span> },
              { key: 'time', header: language === 'th' ? 'เวลา' : 'Time', render: (row) => formatBangkokDateTime(row.scanned_at ?? row.updated_at, language) },
              { key: 'method', header: language === 'th' ? 'วิธี' : 'Method', render: (row) => row.method },
            ]}
          />
        </section>
      ) : null}

      {personalQrOpen ? (
        <Suspense fallback={<LoadingSkeleton />}>
          <StaffPersonalQrModal
            open={personalQrOpen}
            onClose={() => setPersonalQrOpen(false)}
            staffIdentity={activeIdentity}
            qrPayload={activeIdentity?.personal_qr_payload}
          />
        </Suspense>
      ) : null}

      {sessionScannerOpen ? (
        <Suspense fallback={<LoadingSkeleton />}>
          <SessionQrScannerModal
            open={sessionScannerOpen}
            onClose={() => setSessionScannerOpen(false)}
            verifiedStaffIdentity={verifiedIdentity}
            useAuthStaff={isAuthenticated}
            onScanSuccess={async (result) => {
              setToast({ type: result.success ? 'success' : 'error', message: scanResultMessage(result.code, language) });
              if (isAuthenticated) await loadAttendance();
            }}
          />
        </Suspense>
      ) : null}
    </section>
  );
}

function scanResultMessage(code: string, language: 'th' | 'en') {
  const messages: Record<string, { th: string; en: string }> = {
    checked_in: { th: 'เช็กชื่อสำเร็จ', en: 'Check-in successful' },
    late: { th: 'เช็กชื่อสำเร็จ บันทึกเป็นมาสาย', en: 'Checked in as late' },
    checked_out: { th: 'เช็กออกแล้ว', en: 'Checked out' },
    already_checked: { th: 'คุณเช็กชื่อรอบนี้แล้ว', en: 'You have already checked in' },
    invalid_token: { th: 'QR ไม่ถูกต้อง', en: 'Invalid QR' },
    session_closed: { th: 'รอบเช็กชื่อนี้ปิดแล้ว', en: 'Session is closed' },
    qr_expired: { th: 'QR หมดอายุแล้ว', en: 'QR has expired' },
    not_in_target_scope: { th: 'คุณไม่มีสิทธิ์เช็กชื่อรอบนี้', en: 'You are not allowed for this session' },
  };
  return messages[code]?.[language] ?? (language === 'th' ? 'ดำเนินการแล้ว' : 'Done');
}
