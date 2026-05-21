import { AlertTriangle, CheckCircle2, Clock, Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import type { StaffAttendanceScanResult } from '../lib/attendanceTypes';
import { scanStaffAttendanceSessionQr } from '../services/staffAttendance';
import { errorMessage } from '../utils/error';

function formatDateTime(value: string | null | undefined, language: 'th' | 'en') {
  if (!value) return '-';
  return new Date(value).toLocaleString(language === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function resultCopy(code: string, language: 'th' | 'en') {
  const messages: Record<string, { titleTh: string; titleEn: string; bodyTh: string; bodyEn: string }> = {
    checked_in: { titleTh: 'เช็กชื่อสำเร็จ', titleEn: 'Check-in successful', bodyTh: 'ระบบบันทึกการเช็กชื่อของคุณแล้ว', bodyEn: 'Your attendance has been recorded.' },
    late: { titleTh: 'เช็กชื่อสำเร็จ', titleEn: 'Checked in', bodyTh: 'ระบบบันทึกเป็นมาสายตามเวลาที่กำหนด', bodyEn: 'You were recorded as late based on the session time.' },
    checked_out: { titleTh: 'เช็กออกสำเร็จ', titleEn: 'Checked out', bodyTh: 'ระบบบันทึกเวลาเช็กออกแล้ว', bodyEn: 'Your check-out has been recorded.' },
    already_checked: { titleTh: 'คุณเช็กชื่อรอบนี้แล้ว', titleEn: 'Already checked', bodyTh: 'ไม่ต้องสแกนซ้ำ ระบบมีข้อมูลของคุณแล้ว', bodyEn: 'No need to scan again. Your record already exists.' },
    session_not_found: { titleTh: 'ไม่พบรอบเช็กชื่อ', titleEn: 'Session not found', bodyTh: 'QR นี้อาจไม่ถูกต้องหรือถูกสร้างใหม่แล้ว', bodyEn: 'This QR may be invalid or has been regenerated.' },
    session_not_active: { titleTh: 'รอบยังไม่เปิดใช้งาน', titleEn: 'Session not active', bodyTh: 'กรุณาติดต่อแอดมินหน้างาน', bodyEn: 'Please contact an admin at the event.' },
    session_not_started: { titleTh: 'รอบยังไม่เริ่ม', titleEn: 'Session has not started', bodyTh: 'ลองสแกนอีกครั้งเมื่อถึงเวลา', bodyEn: 'Try scanning again when the session starts.' },
    session_closed: { titleTh: 'รอบเช็กชื่อนี้ปิดแล้ว', titleEn: 'Session closed', bodyTh: 'หากต้องแก้ไขให้แจ้งแอดมินเช็กชื่อแบบ manual', bodyEn: 'Ask an admin for manual check-in if needed.' },
    qr_expired: { titleTh: 'QR หมดอายุแล้ว', titleEn: 'QR expired', bodyTh: 'ขอ QR ใหม่จากแอดมิน', bodyEn: 'Ask an admin for a new QR.' },
    staff_not_found: { titleTh: 'ไม่พบข้อมูลทีมงาน', titleEn: 'Staff not found', bodyTh: 'บัญชีนี้ยังไม่ผูกกับข้อมูลทีมงาน', bodyEn: 'This account is not linked to a staff profile.' },
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
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      return undefined;
    }
    scanStaffAttendanceSessionQr(token, { source: 'scan_route', userAgent: navigator.userAgent })
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((err) => {
        if (active) setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'เช็กชื่อไม่สำเร็จ' : 'Check-in failed') });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [language, token]);

  const copy = result ? resultCopy(result.code, language) : null;
  const success = Boolean(result?.success && !['session_not_found', 'session_not_active', 'session_not_started', 'session_closed', 'qr_expired', 'staff_not_found', 'not_in_target_scope'].includes(result.code));

  return (
    <section className="narrow-page page-stack staff-attendance-scan-page">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Staff Attendance"
        title={language === 'th' ? 'เช็กชื่อจาก QR' : 'QR Check-in'}
        description={language === 'th' ? 'ระบบจะเช็กชื่อให้บัญชีทีมงานที่กำลังเข้าสู่ระบบอยู่เท่านั้น' : 'This checks in only the currently signed-in staff account.'}
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
              <span><Clock size={16} /> {formatDateTime(result.record.scanned_at ?? result.record.updated_at, language)}</span>
              <span>{result.record.status}</span>
            </div>
          ) : null}
          <div className="form-actions">
            <Link className="btn btn-primary" to="/staff/attendance">{language === 'th' ? 'กลับหน้าเช็กชื่อ' : 'Back to attendance'}</Link>
            <Link className="btn btn-secondary" to="/staff"><Home size={18} />{language === 'th' ? 'หน้าสตาฟ' : 'Staff Home'}</Link>
          </div>
        </Card>
      ) : null}
      {!loading && !result && token ? (
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
