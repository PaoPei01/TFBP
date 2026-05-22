import { AlertTriangle, CheckCircle2, Clock, Home } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import type { StaffAttendanceScanResult } from '../lib/attendanceTypes';
import { formatBangkokDateTime } from '../lib/dateTime';
import { supabase } from '../lib/supabase';
import { getVerifiedStaffIdentity, identityFromAttendanceResult, saveVerifiedStaffIdentity } from '../lib/verifiedStaffIdentity';
import { scanStaffAttendanceSessionQr, scanStaffAttendanceSessionQrByVerifiedToken, verifyStaffAttendanceIdentity } from '../services/staffAttendance';
import { errorMessage } from '../utils/error';

function resultCopy(code: string, language: 'th' | 'en') {
  const messages: Record<string, { titleTh: string; titleEn: string; bodyTh: string; bodyEn: string }> = {
    checked_in: { titleTh: 'เช็กชื่อสำเร็จ', titleEn: 'Check-in successful', bodyTh: 'ระบบบันทึกการเช็กชื่อของคุณแล้ว', bodyEn: 'Your attendance has been recorded.' },
    late: { titleTh: 'เช็กชื่อสำเร็จ', titleEn: 'Checked in', bodyTh: 'ระบบบันทึกเป็นมาสายตามเวลาที่กำหนด', bodyEn: 'You were recorded as late based on the session time.' },
    checked_out: { titleTh: 'เช็กออกสำเร็จ', titleEn: 'Checked out', bodyTh: 'ระบบบันทึกเวลาเช็กออกแล้ว', bodyEn: 'Your check-out has been recorded.' },
    already_checked: { titleTh: 'คุณเช็กชื่อรอบนี้แล้ว', titleEn: 'Already checked', bodyTh: 'ไม่ต้องสแกนซ้ำ ระบบมีข้อมูลของคุณแล้ว', bodyEn: 'No need to scan again. Your record already exists.' },
    invalid_token: { titleTh: 'QR ไม่ถูกต้อง', titleEn: 'Invalid QR', bodyTh: 'QR นี้อาจไม่ใช่ QR รอบเช็กชื่อ', bodyEn: 'This may not be a session attendance QR.' },
    session_not_found: { titleTh: 'ไม่พบรอบเช็กชื่อ', titleEn: 'Session not found', bodyTh: 'QR นี้อาจไม่ถูกต้องหรือถูกสร้างใหม่แล้ว', bodyEn: 'This QR may be invalid or has been regenerated.' },
    session_not_active: { titleTh: 'รอบยังไม่เปิดใช้งาน', titleEn: 'Session not active', bodyTh: 'กรุณาติดต่อแอดมินหน้างาน', bodyEn: 'Please contact an admin at the event.' },
    session_not_started: { titleTh: 'รอบยังไม่เริ่ม', titleEn: 'Session has not started', bodyTh: 'ลองสแกนอีกครั้งเมื่อถึงเวลา', bodyEn: 'Try scanning again when the session starts.' },
    session_closed: { titleTh: 'รอบเช็กชื่อนี้ปิดแล้ว', titleEn: 'Session closed', bodyTh: 'หากต้องแก้ไขให้แจ้งแอดมินเช็กชื่อแบบ manual', bodyEn: 'Ask an admin for manual check-in if needed.' },
    qr_expired: { titleTh: 'QR หมดอายุแล้ว', titleEn: 'QR expired', bodyTh: 'ขอ QR ใหม่จากแอดมิน', bodyEn: 'Ask an admin for a new QR.' },
    staff_not_found: { titleTh: 'ไม่พบข้อมูลทีมงาน', titleEn: 'Staff not found', bodyTh: 'บัญชีนี้ยังไม่ผูกกับข้อมูลทีมงาน', bodyEn: 'This account is not linked to a staff profile.' },
    identity_verification_failed: { titleTh: 'ไม่พบข้อมูลทีมงาน', titleEn: 'Staff not found', bodyTh: 'ไม่พบข้อมูลทีมงานจากอีเมลและเบอร์โทรนี้', bodyEn: 'No staff profile found for this email and phone.' },
    not_in_target_scope: { titleTh: 'ไม่มีสิทธิ์เช็กชื่อรอบนี้', titleEn: 'Not allowed for this session', bodyTh: 'บัญชีนี้ไม่ได้อยู่ในกลุ่มเป้าหมายของรอบนี้', bodyEn: 'This account is not in the target scope for this session.' },
  };
  const item = messages[code] ?? messages.session_not_found;
  return {
    title: language === 'th' ? item.titleTh : item.titleEn,
    body: language === 'th' ? item.bodyTh : item.bodyEn,
  };
}

export function StaffAttendanceScanPage() {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [result, setResult] = useState<StaffAttendanceScanResult | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [checking, setChecking] = useState(false);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      return undefined;
    }
    supabase.auth.getUser()
      .then(({ data }) => {
        if (!active) return null;
        if (!data.user) {
          const remembered = getVerifiedStaffIdentity();
          if (remembered) {
            return scanStaffAttendanceSessionQrByVerifiedToken(token, remembered.verified_staff_token, { source: 'scan_route_remembered_verified', userAgent: navigator.userAgent });
          }
          setShowVerifyForm(true);
          return null;
        }
        return scanStaffAttendanceSessionQr(token, { source: 'scan_route_auth', userAgent: navigator.userAgent });
      })
      .then((data) => {
        if (!active || !data) return;
        if (data.code === 'staff_not_found') {
          setShowVerifyForm(true);
          setResult(null);
          return;
        }
        setResult(data);
      })
      .catch((err) => {
        if (active) {
          setShowVerifyForm(true);
          setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'เช็กชื่อด้วยบัญชีไม่สำเร็จ ใช้อีเมลและเบอร์โทรแทนได้' : 'Account check-in failed. You can verify by email and phone instead.') });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [language, token]);

  async function submitVerified(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    try {
      setChecking(true);
      setToast(null);
      const identityResult = await verifyStaffAttendanceIdentity(email, phone);
      const identity = identityFromAttendanceResult(identityResult);
      if (!identity) {
        setResult({
          success: false,
          code: 'identity_verification_failed',
          message: 'staff identity verification failed',
        });
        setShowVerifyForm(false);
        return;
      }
      saveVerifiedStaffIdentity(identity);
      const data = await scanStaffAttendanceSessionQrByVerifiedToken(token, identity.verified_staff_token, { source: 'scan_route_verified_token', userAgent: navigator.userAgent });
      setResult(data);
      setShowVerifyForm(false);
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'เช็กชื่อไม่สำเร็จ' : 'Check-in failed') });
    } finally {
      setChecking(false);
    }
  }

  const copy = result ? resultCopy(result.code, language) : null;
  const success = Boolean(result?.success && !['session_not_found', 'session_not_active', 'session_not_started', 'session_closed', 'qr_expired', 'staff_not_found', 'identity_verification_failed', 'not_in_target_scope'].includes(result.code));

  return (
    <section className="narrow-page page-stack staff-attendance-scan-page">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Staff Attendance"
        title={language === 'th' ? 'เช็กชื่อด้วย QR รอบกิจกรรม' : 'Session QR Check-in'}
        description={language === 'th' ? 'กรอกอีเมลและเบอร์โทรที่ใช้ลงทะเบียนทีมงาน หากไม่ได้เข้าสู่ระบบ' : 'Enter the email and phone used for staff registration if you are not signed in.'}
        actions={<HelpButton topicId="staff-attendance.session-qr" variant="link" />}
      />
      {loading ? <LoadingSkeleton /> : null}
      {!loading && !token ? (
        <Card className="error-state">
          <AlertTriangle size={28} />
          <h2>{language === 'th' ? 'ไม่พบ token QR' : 'Missing QR token'}</h2>
          <p>{language === 'th' ? 'กรุณาสแกน QR Code ของรอบเช็กชื่ออีกครั้ง' : 'Please scan the attendance QR code again.'}</p>
          <Link className="btn btn-primary" to="/staff/attendance">{language === 'th' ? 'กลับหน้าเช็กชื่อ' : 'Back to attendance'}</Link>
        </Card>
      ) : null}
      {!loading && token && showVerifyForm ? (
        <Card className="scan-verify-card">
          <div>
            <p className="eyebrow">{language === 'th' ? 'ยืนยันตัวตนทีมงาน' : 'Staff verification'}</p>
            <h2>{language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff Attendance'}</h2>
            <p>{language === 'th' ? 'กรอกอีเมลและเบอร์โทรที่ใช้ลงทะเบียนทีมงาน' : 'Enter the email and phone used for staff registration.'}</p>
          </div>
          <form className="form-grid" onSubmit={submitVerified}>
            <Input label={language === 'th' ? 'อีเมล' : 'Email'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} value={phone} onChange={(event) => setPhone(event.target.value)} required />
            <Button type="submit" size="lg" fullWidth loading={checking}>
              {language === 'th' ? 'ยืนยันและเช็กชื่อ' : 'Verify and check in'}
            </Button>
          </form>
        </Card>
      ) : null}
      {!loading && result && copy ? (
        <Card className={`scan-result-card ${success ? 'scan-success' : 'scan-warning'}`} variant={success ? 'success' : 'warning'}>
          {success ? <CheckCircle2 size={34} /> : <AlertTriangle size={34} />}
          <div>
            <p className="eyebrow">{result.session?.title ?? (language === 'th' ? 'รอบเช็กชื่อ' : 'Attendance session')}</p>
            <h2>{copy.title}</h2>
            <p>{copy.body}</p>
          </div>
          {result.record ? (
            <div className="scan-result-meta">
              <span><Clock size={16} /> {formatBangkokDateTime(result.record.scanned_at ?? result.record.updated_at, language)}</span>
              <span>{result.record.status}</span>
            </div>
          ) : null}
          {result.staff ? <span className="form-hint">{result.staff.display_name}</span> : null}
          <div className="form-actions">
            <Link className="btn btn-primary" to="/staff/attendance">{language === 'th' ? 'กลับหน้าทีมงาน' : 'Back to Staff'}</Link>
            <Link className="btn btn-secondary" to="/"><Home size={18} />{language === 'th' ? 'หน้าหลัก' : 'Home'}</Link>
          </div>
        </Card>
      ) : null}
      {!loading && !result && token && !showVerifyForm ? (
        <Card className="error-state">
          <AlertTriangle size={28} />
          <h2>{language === 'th' ? 'ยังเช็กชื่อไม่สำเร็จ' : 'Check-in did not complete'}</h2>
          <p>{language === 'th' ? 'กรุณาลองใหม่อีกครั้ง หรือติดต่อแอดมินให้เช็กชื่อแบบ manual' : 'Please try again or ask an admin for manual check-in.'}</p>
          <Button onClick={() => window.location.reload()}>{language === 'th' ? 'ลองใหม่' : 'Try again'}</Button>
        </Card>
      ) : null}
    </section>
  );
}
