import QRCode from 'qrcode';
import { Copy, RefreshCw, ShieldCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { HelpButton } from '../components/help/HelpButton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import type { StaffPersonalQrResult } from '../lib/attendanceTypes';
import { groupLabel } from '../lib/grouping';
import { getStaffPersonalQrVerified, regenerateStaffPersonalQrVerified } from '../services/staffAttendance';
import { errorMessage } from '../utils/error';

export function StaffPersonalQrPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [result, setResult] = useState<StaffPersonalQrResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  const payload = result?.qr_payload ?? (result?.token ? `staff_identity:${result.token}` : '');

  useEffect(() => {
    let active = true;
    if (!payload) {
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
  }, [payload]);

  async function verify(event: FormEvent) {
    event.preventDefault();
    try {
      setLoading(true);
      setToast(null);
      const data = await getStaffPersonalQrVerified(email, phone);
      setResult(data);
      setToast({
        type: data.success ? 'success' : 'error',
        message: data.success
          ? language === 'th' ? 'ยืนยันสำเร็จ' : 'Verified'
          : language === 'th' ? 'ไม่พบข้อมูลทีมงานจากอีเมลและเบอร์โทรนี้' : 'No staff profile found for this email and phone',
      });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'แสดง QR ไม่สำเร็จ' : 'Could not show QR') });
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setRegenerating(true);
      const data = await regenerateStaffPersonalQrVerified(email, phone);
      setResult(data);
      setToast({ type: 'success', message: language === 'th' ? 'สร้าง QR ใหม่แล้ว QR เก่าจะใช้ไม่ได้' : 'QR regenerated. The old QR no longer works.' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'สร้าง QR ใหม่ไม่สำเร็จ' : 'Could not regenerate QR') });
    } finally {
      setRegenerating(false);
    }
  }

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(payload);
      setToast({ type: 'success', message: language === 'th' ? 'คัดลอก QR token แล้ว' : 'QR token copied' });
    } catch {
      setToast({ type: 'error', message: language === 'th' ? 'คัดลอกไม่สำเร็จ' : 'Copy failed' });
    }
  }

  return (
    <section className="narrow-page page-stack staff-personal-qr-page">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Staff Personal QR"
        title={language === 'th' ? 'QR ส่วนตัวทีมงาน' : 'Staff Personal QR'}
        description={language === 'th'
          ? 'ยืนยันด้วยอีเมลและเบอร์โทรเพื่อแสดง QR สำหรับให้แอดมินสแกนเช็กชื่อแทน'
          : 'Verify with email and phone to show a QR for admin-assisted attendance.'}
        actions={<HelpButton topicId="staff.personal-qr" variant="link" />}
      />

      {!result?.success ? (
        <Card className="scan-verify-card">
          <div>
            <p className="eyebrow">{language === 'th' ? 'ยืนยันตัวตนทีมงาน' : 'Staff verification'}</p>
            <h2>{language === 'th' ? 'แสดง QR ส่วนตัว' : 'Show personal QR'}</h2>
            <p>{language === 'th' ? 'ใช้ข้อมูลเดียวกับที่ลงทะเบียนทีมงานไว้' : 'Use the same details registered in your staff profile.'}</p>
          </div>
          <form className="form-grid" onSubmit={verify}>
            <Input label={language === 'th' ? 'อีเมล' : 'Email'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} value={phone} onChange={(event) => setPhone(event.target.value)} required />
            <Button type="submit" size="lg" fullWidth loading={loading}>{language === 'th' ? 'ยืนยันและแสดง QR' : 'Verify and show QR'}</Button>
          </form>
        </Card>
      ) : null}

      {result?.success ? (
        <Card className="staff-personal-qr-card" variant="soft">
          <div className="staff-personal-qr-head">
            <ShieldCheck size={30} />
            <div>
              <p className="eyebrow">{language === 'th' ? 'QR ส่วนตัวทีมงาน สำหรับให้แอดมินสแกน' : 'Personal QR for admin scanning'}</p>
              <h2>{result.staff?.display_name ?? (language === 'th' ? 'ทีมงาน' : 'Staff')}</h2>
              <span>{groupLabel(result.staff?.main_group ?? null, result.staff?.subgroup ?? null, language)} · {result.staff?.primary_role ?? '-'}</span>
            </div>
          </div>
          {qrDataUrl ? <img className="attendance-qr-image" src={qrDataUrl} alt={language === 'th' ? 'QR ส่วนตัวทีมงาน' : 'Staff personal QR'} /> : null}
          <p className="form-hint">
            {language === 'th'
              ? 'ใช้ QR นี้ให้แอดมินสแกนเมื่อต้องเช็กชื่อแทน ไม่ใช่ QR สำหรับเช็กชื่อด้วยตัวเอง'
              : 'Use this QR for admin-assisted check-in. This is not a self check-in QR.'}
          </p>
          <code className="attendance-scan-url">{payload}</code>
          <div className="form-actions">
            <Button type="button" variant="secondary" icon={<Copy size={18} />} onClick={copyPayload}>{language === 'th' ? 'คัดลอก token' : 'Copy token'}</Button>
            <Button type="button" variant="secondary" icon={<RefreshCw size={18} />} loading={regenerating} onClick={regenerate}>{language === 'th' ? 'สร้าง QR ใหม่' : 'Regenerate QR'}</Button>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
