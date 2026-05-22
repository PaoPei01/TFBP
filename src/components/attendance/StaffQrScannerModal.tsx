import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CheckCircle2, Keyboard, ShieldAlert } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { StaffAttendanceScanResult } from '../../lib/attendanceTypes';
import { adminScanStaffPersonalQr, parseStaffPersonalQrToken } from '../../services/staffAttendance';
import { errorMessage } from '../../utils/error';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { HelpButton } from '../help/HelpButton';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Toast, ToastState } from '../ui/Toast';

type StaffQrScannerModalProps = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  onScanSuccess?: (result: StaffAttendanceScanResult) => void;
};

export function parseStaffQrToken(input: string): string | null {
  const token = parseStaffPersonalQrToken(input);
  return token || null;
}

export function StaffQrScannerModal({ open, onClose, sessionId, onScanSuccess }: StaffQrScannerModalProps) {
  const { language } = useLanguage();
  const scannerId = useMemo(() => `staff-qr-scanner-${Math.random().toString(36).slice(2)}`, []);
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
      if (cameraActiveRef.current) {
        await scanner.stop();
      }
    } catch {
      // Camera cleanup is best-effort; a stopped scanner can throw here.
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
    await checkToken(decodedText);
  }

  async function checkToken(input: string) {
    const token = parseStaffQrToken(input);
    if (!token) {
      setInlineError(language === 'th' ? 'กรุณาวาง token หรือข้อความจาก QR' : 'Paste a token or QR text first.');
      setToast({ type: 'error', message: language === 'th' ? 'QR ไม่ถูกต้อง' : 'Invalid QR' });
      handlingScanRef.current = false;
      return;
    }
    try {
      setChecking(true);
      setInlineError('');
      const nextResult = await adminScanStaffPersonalQr(sessionId, token);
      setResult(nextResult);
      setToast({ type: nextResult.success ? 'success' : 'error', message: resultMessage(nextResult.code, language) });
      if (nextResult.success) {
        onScanSuccess?.(nextResult);
      } else {
        handlingScanRef.current = false;
      }
    } catch (err) {
      setInlineError(errorMessage(err, language === 'th' ? 'เช็กชื่อจาก QR ไม่สำเร็จ' : 'Could not check in from QR'));
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'เช็กชื่อจาก QR ไม่สำเร็จ' : 'Could not check in from QR') });
      handlingScanRef.current = false;
    } finally {
      setChecking(false);
    }
  }

  async function submitManual(event: FormEvent) {
    event.preventDefault();
    await checkToken(manualInput);
  }

  async function close() {
    await stopScanner();
    onClose();
  }

  return (
    <Modal open={open} title={language === 'th' ? 'สแกน QR ส่วนตัวทีมงาน' : 'Scan staff personal QR'} onClose={() => void close()}>
      <Toast toast={toast} />
      <div className="staff-qr-scanner-modal">
        <div className="section-title-row">
          <p className="form-hint">
            {language === 'th'
              ? 'ให้ทีมงานแสดง QR ส่วนตัว แล้วนำกล้องสแกนเพื่อเช็กชื่อเข้ารอบนี้'
              : 'Ask staff to show their personal QR, then scan it to check them into this session.'}
          </p>
          <HelpButton topicId="admin-attendance.scan-staff-qr" variant="compact" />
        </div>

        <div className={`staff-qr-camera-frame ${cameraActive ? 'staff-qr-camera-active' : ''}`}>
          <div id={scannerId} className="staff-qr-reader" />
          {!cameraActive ? (
            <div className="staff-qr-camera-placeholder">
              <Camera size={38} />
              <strong>{language === 'th' ? 'พร้อมสแกน QR ทีมงาน' : 'Ready to scan staff QR'}</strong>
              <span>{language === 'th' ? 'ระบบจะขอสิทธิ์กล้องหลังจากกดเปิดกล้องเท่านั้น' : 'Camera permission is requested only after you tap open camera.'}</span>
            </div>
          ) : null}
        </div>

        {inlineError ? <div className="edit-inline-error" role="alert">{inlineError}</div> : null}

        <div className="form-actions">
          <Button type="button" size="lg" icon={<Camera size={18} />} loading={startingCamera} onClick={openCamera}>
            {cameraActive ? language === 'th' ? 'สแกนอยู่' : 'Scanning' : language === 'th' ? 'เปิดกล้อง' : 'Open camera'}
          </Button>
          {cameraActive ? (
            <Button type="button" variant="secondary" onClick={() => void stopScanner()}>{language === 'th' ? 'หยุดกล้อง' : 'Stop camera'}</Button>
          ) : null}
        </div>

        {result ? (
          <Card className="staff-qr-scan-result" variant={result.success ? 'success' : 'warning'}>
            {result.success ? <CheckCircle2 size={26} /> : <ShieldAlert size={26} />}
            <div>
              <strong>{resultMessage(result.code, language)}</strong>
              <span>{result.staff?.display_name ?? ''}</span>
              {result.record?.status ? <em>{statusLabel(result.record.status, language)}</em> : null}
            </div>
          </Card>
        ) : null}

        <Card className="staff-qr-manual-card" variant="soft">
          <form className="form-grid" onSubmit={submitManual}>
            <Input
              label={language === 'th' ? 'วาง token หรือข้อความจาก QR' : 'Paste token or QR text'}
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
              placeholder="staff_identity:..."
              hint={language === 'th' ? 'รองรับ raw token, staff_identity:<token> หรือ URL ที่มี ?token=' : 'Supports raw token, staff_identity:<token>, or a URL with ?token='}
            />
            <Button type="submit" icon={<Keyboard size={18} />} loading={checking}>
              {language === 'th' ? 'เช็กชื่อจาก QR' : 'Check in from QR'}
            </Button>
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
    already_checked: { th: 'ทีมงานคนนี้เช็กชื่อรอบนี้แล้ว', en: 'This staff member has already checked in.' },
    invalid_token: { th: 'QR ไม่ถูกต้อง', en: 'Invalid QR' },
    not_in_target_scope: { th: 'ทีมงานคนนี้ไม่อยู่ในกลุ่มเป้าหมายของรอบนี้', en: 'This staff member is not in the target scope.' },
    session_not_active: { th: 'รอบนี้ยังไม่เปิดใช้งาน', en: 'Session is not active' },
    session_not_started: { th: 'รอบนี้ยังไม่เริ่ม', en: 'Session has not started' },
    session_closed: { th: 'รอบนี้ปิดแล้ว', en: 'Session is closed' },
    qr_expired: { th: 'QR รอบเช็กชื่อหมดอายุแล้ว', en: 'Session QR has expired' },
    admin_required: { th: 'ต้องเป็นแอดมินเท่านั้น', en: 'Admin access required' },
  };
  return messages[code]?.[language] ?? (language === 'th' ? 'ดำเนินการแล้ว' : 'Done');
}

function statusLabel(status: string, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    present: { th: 'มาแล้ว', en: 'Present' },
    late: { th: 'มาสาย', en: 'Late' },
    checked_out: { th: 'เช็กออก', en: 'Checked out' },
    absent: { th: 'ขาด', en: 'Absent' },
    excused: { th: 'ขออนุญาต', en: 'Excused' },
  };
  return labels[status]?.[language] ?? status;
}
