import QRCode from 'qrcode';
import { Copy, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { VerifiedStaffAttendanceIdentity } from '../../lib/attendanceTypes';
import { groupLabel } from '../../lib/grouping';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Toast, ToastState } from '../ui/Toast';

type StaffPersonalQrModalProps = {
  open: boolean;
  onClose: () => void;
  staffIdentity: VerifiedStaffAttendanceIdentity | null;
  qrPayload?: string | null;
};

export function StaffPersonalQrModal({ open, onClose, staffIdentity, qrPayload }: StaffPersonalQrModalProps) {
  const { language } = useLanguage();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const payload = qrPayload || staffIdentity?.personal_qr_payload || '';

  useEffect(() => {
    let active = true;
    if (!open || !payload) {
      setQrDataUrl('');
      return undefined;
    }
    QRCode.toDataURL(payload, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [open, payload]);

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(payload);
      setToast({ type: 'success', message: language === 'th' ? 'คัดลอก token แล้ว' : 'Token copied' });
    } catch {
      setToast({ type: 'error', message: language === 'th' ? 'คัดลอกไม่สำเร็จ' : 'Copy failed' });
    }
  }

  return (
    <Modal open={open} title={language === 'th' ? 'QR ส่วนตัวทีมงาน' : 'Staff Personal QR'} onClose={onClose}>
      <Toast toast={toast} />
      <div className="staff-personal-qr-modal">
        <div className="staff-personal-qr-head">
          <ShieldCheck size={30} />
          <div>
            <p className="eyebrow">{language === 'th' ? 'ให้แอดมินสแกน QR นี้เพื่อเช็กชื่อให้คุณ' : 'Let an admin scan this QR to check you in.'}</p>
            <h2>{staffIdentity?.display_name ?? (language === 'th' ? 'ทีมงาน' : 'Staff')}</h2>
            <span>{groupLabel(staffIdentity?.main_group ?? null, staffIdentity?.subgroup ?? null, language)} · {staffIdentity?.primary_role ?? '-'}</span>
          </div>
        </div>
        {qrDataUrl ? <img className="attendance-qr-image" src={qrDataUrl} alt={language === 'th' ? 'QR ส่วนตัวทีมงาน' : 'Staff personal QR'} /> : null}
        <p className="form-hint">{language === 'th' ? 'QR นี้ไม่ใช่ QR สำหรับเช็กชื่อด้วยตัวเอง' : 'This QR is not for self check-in.'}</p>
        <code className="attendance-scan-url">{payload}</code>
        <div className="form-actions">
          <Button type="button" variant="secondary" icon={<Copy size={18} />} onClick={copyPayload}>{language === 'th' ? 'คัดลอก token' : 'Copy token'}</Button>
          <Button type="button" onClick={onClose}>{language === 'th' ? 'ปิด' : 'Close'}</Button>
        </div>
      </div>
    </Modal>
  );
}
