import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CheckCircle2, Keyboard, ShieldAlert } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { StaffAttendanceScanResult, VerifiedStaffAttendanceIdentity } from '../../lib/attendanceTypes';
import { formatBangkokDateTime } from '../../lib/dateTime';
import {
  parseStaffAttendanceSessionToken,
  scanStaffAttendanceSessionQr,
  scanStaffAttendanceSessionQrByVerifiedToken,
} from '../../services/staffAttendance';
import { errorMessage } from '../../utils/error';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { HelpButton } from '../help/HelpButton';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Toast, ToastState } from '../ui/Toast';

type SessionQrScannerModalProps = {
  open: boolean;
  onClose: () => void;
  verifiedStaffIdentity?: VerifiedStaffAttendanceIdentity | null;
  useAuthStaff?: boolean;
  onScanSuccess?: (result: StaffAttendanceScanResult) => void;
};

export function SessionQrScannerModal({ open, onClose, verifiedStaffIdentity, useAuthStaff = false, onScanSuccess }: SessionQrScannerModalProps) {
  const { language } = useLanguage();
  const scannerId = useMemo(() => `session-qr-scanner-${Math.random().toString(36).slice(2)}`, []);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraActiveRef = useRef(false);
  const handlingScanRef = useRef(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [result, setResult] = useState<StaffAttendanceScanResult | null>(null);
  const [inlineError, setInlineError] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      return;
    }
    setManualInput('');
    setResult(null);
    setInlineError('');
    setToast(null);
    handlingScanRef.current = false;
    return () => {
      void stopScanner();
    };
  }, [open]);

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (cameraActiveRef.current) await scanner.stop();
    } catch {
      // Stopping an already-stopped camera can throw; cleanup remains best-effort.
    }
    try {
      scanner.clear();
    } catch {
      // Ignore cleanup errors so the modal can close reliably.
    }
    scannerRef.current = null;
    cameraActiveRef.current = false;
    setCameraActive(false);
  }

  async function openCamera() {
    try {
      setStartingCamera(true);
      setInlineError('');
      setResult(null);
      handlingScanRef.current = false;
      await stopScanner();
      const scanner = new Html5Qrcode(scannerId, false);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (handlingScanRef.current) return;
          handlingScanRef.current = true;
          void handleDecodedText(decodedText);
        },
        () => undefined,
      );
      cameraActiveRef.current = true;
      setCameraActive(true);
    } catch (err) {
      cameraActiveRef.current = false;
      setCameraActive(false);
      setInlineError(language === 'th'
        ? 'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง หรือกรอก token ด้วยตนเอง'
        : 'Could not open the camera. Please allow camera access or enter the token manually.');
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'เปิดกล้องไม่สำเร็จ' : 'Could not open camera') });
    } finally {
      setStartingCamera(false);
    }
  }

  async function handleDecodedText(decodedText: string) {
    await stopScanner();
    await checkSessionToken(decodedText);
  }

  async function checkSessionToken(input: string) {
    const sessionToken = parseStaffAttendanceSessionToken(input);
    if (!sessionToken) {
      setInlineError(language === 'th' ? 'กรุณาวางลิงก์หรือ token จาก QR รอบเช็กชื่อ' : 'Paste an attendance QR link or token first.');
      setToast({ type: 'error', message: language === 'th' ? 'QR ไม่ถูกต้อง' : 'Invalid QR' });
      handlingScanRef.current = false;
      return;
    }
    if (!useAuthStaff && !verifiedStaffIdentity?.verified_staff_token) {
      setInlineError(language === 'th' ? 'กรุณายืนยันตัวตนทีมงานก่อนสแกน' : 'Verify staff identity before scanning.');
      handlingScanRef.current = false;
      return;
    }
    try {
      setChecking(true);
      setInlineError('');
      const nextResult = useAuthStaff
        ? await scanStaffAttendanceSessionQr(sessionToken, { source: 'staff_camera_scan_auth', userAgent: navigator.userAgent })
        : await scanStaffAttendanceSessionQrByVerifiedToken(sessionToken, verifiedStaffIdentity?.verified_staff_token ?? '', { source: 'staff_camera_scan_verified', userAgent: navigator.userAgent });
      setResult(nextResult);
      setToast({ type: nextResult.success ? 'success' : 'error', message: resultMessage(nextResult.code, language) });
      if (nextResult.success) onScanSuccess?.(nextResult);
      if (!nextResult.success) handlingScanRef.current = false;
    } catch (err) {
      setInlineError(errorMessage(err, language === 'th' ? 'เช็กชื่อไม่สำเร็จ' : 'Check-in failed'));
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'เช็กชื่อไม่สำเร็จ' : 'Check-in failed') });
      handlingScanRef.current = false;
    } finally {
      setChecking(false);
    }
  }

  async function submitManual(event: FormEvent) {
    event.preventDefault();
    await checkSessionToken(manualInput);
  }

  async function close() {
    await stopScanner();
    onClose();
  }

  return (
    <Modal open={open} title={language === 'th' ? 'สแกน QR รอบเช็กชื่อ' : 'Scan Attendance QR'} onClose={() => void close()}>
      <Toast toast={toast} />
      <div className="staff-qr-scanner-modal">
        <div className="section-title-row">
          <p className="form-hint">{language === 'th' ? 'นำกล้องไปสแกน QR ที่แอดมินแสดง' : 'Point the camera at the QR shown by admin.'}</p>
          <HelpButton topicId="staff-attendance.camera-scan" variant="compact" />
        </div>
        <div className={`staff-qr-camera-frame ${cameraActive ? 'staff-qr-camera-active' : ''}`}>
          <div id={scannerId} className="staff-qr-reader" />
          {!cameraActive ? (
            <div className="staff-qr-camera-placeholder">
              <Camera size={38} />
              <strong>{language === 'th' ? 'พร้อมสแกน QR รอบเช็กชื่อ' : 'Ready to scan attendance QR'}</strong>
              <span>{language === 'th' ? 'ระบบจะขอสิทธิ์กล้องหลังจากกดเปิดกล้องเท่านั้น' : 'Camera permission is requested only after you tap open camera.'}</span>
            </div>
          ) : null}
        </div>
        {inlineError ? <div className="edit-inline-error" role="alert">{inlineError}</div> : null}
        <div className="form-actions">
          <Button type="button" size="lg" icon={<Camera size={18} />} loading={startingCamera} onClick={openCamera}>
            {cameraActive ? language === 'th' ? 'สแกนอยู่' : 'Scanning' : language === 'th' ? 'เปิดกล้อง' : 'Open camera'}
          </Button>
          {cameraActive ? <Button type="button" variant="secondary" onClick={() => void stopScanner()}>{language === 'th' ? 'หยุดกล้อง' : 'Stop camera'}</Button> : null}
        </div>
        {result ? (
          <Card className="staff-qr-scan-result" variant={result.success ? 'success' : 'warning'}>
            {result.success ? <CheckCircle2 size={26} /> : <ShieldAlert size={26} />}
            <div>
              <strong>{resultMessage(result.code, language)}</strong>
              <span>{result.session?.title ?? ''}</span>
              {result.record?.scanned_at ? <em>{formatBangkokDateTime(result.record.scanned_at, language)} · {statusLabel(result.record.status, language)}</em> : null}
            </div>
          </Card>
        ) : null}
        <Card className="staff-qr-manual-card" variant="soft">
          <form className="form-grid" onSubmit={submitManual}>
            <Input
              label={language === 'th' ? 'วางลิงก์หรือ token จาก QR' : 'Paste QR link or token'}
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
              placeholder="https://.../#/staff/attendance/scan?token=..."
            />
            <Button type="submit" icon={<Keyboard size={18} />} loading={checking}>{language === 'th' ? 'เช็กชื่อ' : 'Check in'}</Button>
          </form>
        </Card>
      </div>
    </Modal>
  );
}

function resultMessage(code: string, language: 'th' | 'en') {
  const messages: Record<string, { th: string; en: string }> = {
    checked_in: { th: 'เช็กชื่อสำเร็จ', en: 'Check-in successful' },
    late: { th: 'เช็กชื่อสำเร็จ บันทึกเป็นมาสาย', en: 'Checked in as late' },
    checked_out: { th: 'เช็กออกแล้ว', en: 'Checked out' },
    already_checked: { th: 'คุณเช็กชื่อรอบนี้แล้ว', en: 'You have already checked in.' },
    invalid_token: { th: 'QR ไม่ถูกต้อง', en: 'Invalid QR' },
    session_not_found: { th: 'ไม่พบรอบเช็กชื่อ', en: 'Session not found' },
    not_in_target_scope: { th: 'คุณไม่มีสิทธิ์เช็กชื่อรอบนี้', en: 'You are not allowed for this session.' },
    session_not_active: { th: 'รอบนี้ยังไม่เปิดใช้งาน', en: 'Session is not active' },
    session_not_started: { th: 'รอบนี้ยังไม่เริ่ม', en: 'Session has not started' },
    session_closed: { th: 'รอบเช็กชื่อนี้ปิดแล้ว', en: 'Session is closed' },
    qr_expired: { th: 'QR หมดอายุแล้ว', en: 'QR has expired' },
  };
  return messages[code]?.[language] ?? (language === 'th' ? 'ดำเนินการแล้ว' : 'Done');
}

function statusLabel(status: string, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    present: { th: 'มาแล้ว', en: 'Present' },
    late: { th: 'มาสาย', en: 'Late' },
    checked_out: { th: 'เช็กออก', en: 'Checked out' },
  };
  return labels[status]?.[language] ?? status;
}
