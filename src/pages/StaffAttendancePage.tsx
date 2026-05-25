import { Camera, History, Home, LogOut, QrCode, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Toast, ToastState } from '../components/ui/Toast';
import { useEventContext } from '../context/EventContext';
import { useLanguage } from '../context/LanguageContext';
import { attendanceMethodLabel, staffAttendanceStatusLabel, type MyStaffAttendanceData, type VerifiedStaffAttendanceIdentity } from '../lib/attendanceTypes';
import { attendanceEventLabel } from '../lib/attendanceEventContext';
import { formatBangkokDateTime } from '../lib/dateTime';
import { groupLabel } from '../lib/grouping';
import { supabase } from '../lib/supabase';
import {
  clearVerifiedStaffIdentity,
  getVerifiedStaffIdentity,
  identityFromAttendanceResult,
  saveVerifiedStaffIdentity,
} from '../lib/verifiedStaffIdentity';
import { fetchMyStaffAttendance, fetchStaffAttendanceHistoryByVerifiedToken, getMyStaffPersonalQr, verifyStaffAttendanceIdentity } from '../services/staffAttendance';
import { errorMessage } from '../utils/error';

const StaffPersonalQrModal = lazy(() => import('../components/attendance/StaffPersonalQrModal').then((module) => ({ default: module.StaffPersonalQrModal })));
const SessionQrScannerModal = lazy(() => import('../components/attendance/SessionQrScannerModal').then((module) => ({ default: module.SessionQrScannerModal })));

function displayName(profile: { nickname_th?: string | null; nickname?: string | null; nickname_en?: string | null; name_th?: string | null; name_en?: string | null; email?: string | null } | null | undefined) {
  return profile?.nickname_th || profile?.nickname || profile?.nickname_en || profile?.name_th || profile?.name_en || profile?.email || '-';
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
  const { events } = useEventContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<MyStaffAttendanceData | null>(null);
  const [verifiedIdentity, setVerifiedIdentity] = useState<VerifiedStaffAttendanceIdentity | null>(() => getVerifiedStaffIdentity());
  const [authPersonalQrPayload, setAuthPersonalQrPayload] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [personalQrOpen, setPersonalQrOpen] = useState(false);
  const [sessionScannerOpen, setSessionScannerOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const personalQrAutoOpenedRef = useRef(false);
  const records = useMemo(() => data?.records ?? [], [data?.records]);
  const latest = data?.latest_record;
  const activeIdentity = isAuthenticated ? authIdentityFromData(data, authPersonalQrPayload) : verifiedIdentity;
  const latestEventLabel = latest?.session?.event_id ? attendanceEventLabel(latest.session, events, language) : '';
  const shouldOpenPersonalQr = searchParams.get('open') === 'personal-qr';

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    setHistoryError('');
    try {
      const { data: userData } = await supabase.auth.getUser();
      setIsAuthenticated(Boolean(userData.user));
      if (userData.user) {
        const nextData = await fetchMyStaffAttendance();
        setData(nextData);
        return;
      }

      const rememberedIdentity = getVerifiedStaffIdentity();
      setVerifiedIdentity(rememberedIdentity);
      if (!rememberedIdentity?.verified_staff_token) {
        setData(null);
        return;
      }

      try {
        const nextData = await fetchStaffAttendanceHistoryByVerifiedToken(rememberedIdentity.verified_staff_token);
        setData(nextData);
      } catch {
        clearVerifiedStaffIdentity();
        setVerifiedIdentity(null);
        setData(null);
        setHistoryError(language === 'th' ? 'ข้อมูลยืนยันตัวตนเดิมหมดอายุ กรุณายืนยันตัวตนอีกครั้ง' : 'Your saved verification has expired. Please verify again.');
      }
    } catch (err) {
      setError(errorMessage(err, language === 'th' ? 'โหลดข้อมูลเช็กชื่อไม่สำเร็จ' : 'Could not load attendance'));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const openPersonalQr = useCallback(async () => {
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
  }, [authPersonalQrPayload, isAuthenticated, language]);

  useEffect(() => {
    if (!shouldOpenPersonalQr || loading || personalQrAutoOpenedRef.current || !activeIdentity) return;
    personalQrAutoOpenedRef.current = true;
    void openPersonalQr();
  }, [activeIdentity, loading, openPersonalQr, shouldOpenPersonalQr]);

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
      try {
        const nextData = await fetchStaffAttendanceHistoryByVerifiedToken(identity.verified_staff_token);
        setData(nextData);
        setHistoryError('');
      } catch {
        setData(null);
        setHistoryError(language === 'th' ? 'ยังไม่สามารถโหลดประวัติการเช็กชื่อได้ กรุณาลองอัปเดตสถานะอีกครั้ง' : 'Could not load attendance history. Please refresh status again.');
      }
      setToast({ type: 'success', message: language === 'th' ? 'ยืนยันตัวตนสำเร็จ' : 'Identity verified' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ยืนยันตัวตนไม่สำเร็จ' : 'Verification failed') });
    } finally {
      setVerifying(false);
    }
  }

  function clearIdentity() {
    clearVerifiedStaffIdentity();
    setVerifiedIdentity(null);
    setData(null);
    setHistoryError('');
    setEmail('');
    setPhone('');
    setToast({ type: 'success', message: language === 'th' ? 'ล้างข้อมูลที่จำไว้แล้ว' : 'Remembered identity cleared' });
  }

  function switchStaffIdentity() {
    clearVerifiedStaffIdentity();
    setVerifiedIdentity(null);
    setData(null);
    setHistoryError('');
    setEmail('');
    setPhone('');
    navigate('/staff/profile/verify');
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
  const canShowHistory = !showVerification;

  return (
    <section className="page-stack staff-page staff-attendance-home staff-attendance-simple">
      <Toast toast={toast} />
      <PageHeader
        eyebrow={language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff check-in'}
        title={language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff check-in'}
        description={language === 'th' ? 'ยืนยันตัวตนครั้งเดียว แล้วเลือกว่าจะให้แอดมินสแกนคุณ หรือสแกน QR รอบเช็กชื่อด้วยตัวเอง' : 'Verify once, then choose whether an admin scans you or you scan the session QR yourself.'}
        actions={(
          <>
            <HelpButton topicId="staff-attendance.overview" variant="link" />
            <Link className="btn btn-secondary" to="/staff/profile/verify">
              <UserRound size={18} />
              {language === 'th' ? 'กลับไปศูนย์ทีมงานทั่วไป' : 'Back to General Staff Access'}
            </Link>
            {isAuthenticated ? <Link className="btn btn-secondary" to="/staff"><Home size={18} />{language === 'th' ? 'หน้าทีมงาน' : 'Staff home'}</Link> : null}
          </>
        )}
      />

      {showVerification ? (
        <Card className="scan-verify-card">
          <div>
            <p className="eyebrow">{language === 'th' ? 'ยืนยันตัวตนทีมงาน' : 'Staff verification'}</p>
            <h2>{language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff check-in'}</h2>
            <p>{language === 'th' ? 'กรอกอีเมลและเบอร์โทรที่ใช้ลงทะเบียนทีมงานเพื่อใช้งานเมนูเช็กชื่อ' : 'Enter the email and phone used for staff registration to use attendance tools.'}</p>
          </div>
          <form className="form-grid" onSubmit={verifyIdentity}>
            <Input label={language === 'th' ? 'อีเมล' : 'Email'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
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
                  <h2>{language === 'th' ? 'วันนี้ใครเป็นคนสแกน?' : 'Who is scanning today?'}</h2>
                </div>
              </div>
            </div>
            <div className="help-chip-row">
              <HelpButton topicId="staff-attendance.personal-qr" variant="link" label={language === 'th' ? 'QR ส่วนตัวคืออะไร' : 'What is personal QR?'} />
              <HelpButton topicId="staff-attendance.session-qr" variant="link" label={language === 'th' ? 'สแกน QR รอบอย่างไร' : 'How to scan session QR'} />
            </div>
            <div className="staff-attendance-action-grid">
              <button className="staff-attendance-action-card" type="button" onClick={openPersonalQr}>
                <QrCode size={28} />
                <strong>{language === 'th' ? 'ให้แอดมินสแกนฉัน' : 'Let admin scan me'}</strong>
                <span>{language === 'th' ? 'เปิด QR ของตัวเองให้แอดมินหรือหัวหน้าทีมสแกน' : 'Show your personal QR so an admin or team lead can check you in.'}</span>
                <em>{language === 'th' ? 'แสดง QR ของฉัน' : 'Show my QR'}</em>
              </button>
              <button className="staff-attendance-action-card" type="button" onClick={() => setSessionScannerOpen(true)}>
                <Camera size={28} />
                <strong>{language === 'th' ? 'ฉันสแกน QR รอบเช็กชื่อเอง' : 'I will scan the session QR'}</strong>
                <span>{language === 'th' ? 'ใช้กล้องมือถือสแกน QR รอบเช็กชื่อที่แอดมินแสดง' : 'Use your phone camera to scan the attendance QR shown by admin.'}</span>
                <em>{language === 'th' ? 'เปิดกล้องสแกน' : 'Open scanner'}</em>
              </button>
            </div>
            {!isAuthenticated ? (
              <div className="staff-attendance-secondary-actions">
                <button type="button" onClick={switchStaffIdentity}><LogOut size={16} />{language === 'th' ? 'เปลี่ยนบัญชีทีมงานนี้' : 'Switch staff identity'}</button>
                <button type="button" onClick={clearIdentity}>{language === 'th' ? 'ล้างข้อมูลที่จำไว้ในเครื่อง' : 'Clear remembered identity'}</button>
              </div>
            ) : null}
          </Card>
        </>
      ) : null}

      {latest ? (
        <Card className="privacy-notice" variant="success">
          <strong>{language === 'th' ? 'สถานะล่าสุด' : 'Latest status'}</strong>
          <span>
            {[
              staffAttendanceStatusLabel(latest.status, language),
              latest.session?.title ?? '-',
              formatBangkokDateTime(latest.scanned_at ?? latest.updated_at, language),
              attendanceMethodLabel(latest.method, language),
            ].filter(Boolean).join(' · ')}
          </span>
          {latestEventLabel ? <small>{latestEventLabel}</small> : null}
        </Card>
      ) : null}

      {!showVerification && !latest ? (
        <Card className="privacy-notice" variant="soft">
          <strong>{language === 'th' ? 'สถานะล่าสุด' : 'Latest status'}</strong>
          <span>{language === 'th' ? 'ยังไม่พบประวัติการเช็กชื่อ' : 'No attendance record yet'}</span>
        </Card>
      ) : null}

      {historyError ? (
        <Card className="privacy-notice" variant="warning">
          <strong>{language === 'th' ? 'โหลดประวัติไม่สำเร็จ' : 'Could not load history'}</strong>
          <span>{historyError}</span>
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => void loadAttendance()}>
            {language === 'th' ? 'อัปเดตสถานะ' : 'Refresh status'}
          </Button>
        </Card>
      ) : null}

      {canShowHistory ? (
        <section className="page-stack">
          <div className="staff-section-head">
            <h2><History size={19} />{language === 'th' ? 'ประวัติของฉัน' : 'My history'}</h2>
            <div className="action-row">
              <span>{records.length} {language === 'th' ? 'รายการ' : 'records'}</span>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={16} />} onClick={() => void loadAttendance()}>
                {language === 'th' ? 'อัปเดตสถานะ' : 'Refresh status'}
              </Button>
            </div>
          </div>
          <ResponsiveDataTable
            rows={records}
            getKey={(row) => row.id}
            emptyText={language === 'th' ? 'ยังไม่พบประวัติการเช็กชื่อ' : 'No attendance record yet'}
            mobileTitle={(row) => row.session?.event_id ? attendanceEventLabel(row.session, events, language) : row.session?.title ?? '-'}
            mobileSubtitle={(row) => row.session?.event_id ? `${row.session.title} · ${staffAttendanceStatusLabel(row.status, language)}` : staffAttendanceStatusLabel(row.status, language)}
            mobileMeta={(row) => formatBangkokDateTime(row.scanned_at ?? row.updated_at, language)}
            columns={[
              { key: 'session', header: language === 'th' ? 'รอบ' : 'Session', render: (row) => <div className="participant-admin-cell"><strong>{row.session?.title ?? '-'}</strong>{row.session?.event_id ? <span>{attendanceEventLabel(row.session, events, language)}</span> : null}</div> },
              { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => <span className={`status-pill status-${row.status}`}>{staffAttendanceStatusLabel(row.status, language)}</span> },
              { key: 'time', header: language === 'th' ? 'เวลา' : 'Time', render: (row) => formatBangkokDateTime(row.scanned_at ?? row.updated_at, language) },
              { key: 'method', header: language === 'th' ? 'วิธี' : 'Method', render: (row) => attendanceMethodLabel(row.method, language) },
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
              if (result.success) await loadAttendance();
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
  return messages[code]?.[language] ?? (language === 'th' ? 'เช็กชื่อสำเร็จ' : 'Check-in successful');
}
