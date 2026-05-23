import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { getApplicationStatusLabel, getApplicationStatusTone } from '../lib/applicationStatus';
import { formatBangkokDateTime } from '../lib/dateTime';
import { eventPath } from '../lib/eventRoutes';
import { checkStaffApplicationStatus, type StaffApplicationStatusResult } from '../services/events';
import { errorMessage } from '../utils/error';

export function EventStaffApplicationStatusPage() {
  const { language } = useLanguage();
  const { eventSlug = '' } = useParams();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StaffApplicationStatusResult | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setLoading(true);
      setToast(null);
      const nextResult = await checkStaffApplicationStatus({ eventSlug, email, phone });
      setResult(nextResult);
      if (!nextResult.success) {
        setToast({ type: 'error', message: language === 'th' ? 'ไม่พบสถานะจากอีเมลและเบอร์โทรนี้' : 'No application status found for this email and phone.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ตรวจสอบสถานะไม่สำเร็จ' : 'Could not check application status') });
    } finally {
      setLoading(false);
    }
  }

  const eventName = result?.event ? (language === 'th' ? result.event.name_th : result.event.name_en || result.event.name_th) : '';
  const application = result?.success ? result.application : null;

  return (
    <section className="events-page narrow-page page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Staff Application"
        title={language === 'th' ? 'ตรวจสอบสถานะใบสมัคร' : 'Check application status'}
        description={language === 'th' ? 'กรอกอีเมลและเบอร์โทรที่ใช้สมัคร เพื่อดูสถานะของใบสมัครของคุณเท่านั้น' : 'Enter the email and phone used to apply. Only your own application status will be shown.'}
        meta={<Link className="btn btn-secondary" to={eventPath(eventSlug)}>{language === 'th' ? 'กลับหน้ากิจกรรม' : 'Back to event'}</Link>}
      />

      <Card className="event-status-check-card">
        <div>
          <p className="eyebrow">{language === 'th' ? 'ยืนยันตัวตนผู้สมัคร' : 'Applicant verification'}</p>
          <h2>{language === 'th' ? 'ตรวจจากอีเมลและเบอร์โทร' : 'Check by email and phone'}</h2>
          <p>{language === 'th' ? 'ระบบจะไม่แสดงข้อมูลใบสมัคร หากอีเมลและเบอร์โทรไม่ตรงกับข้อมูลที่สมัครไว้' : 'No application information is shown unless both email and phone match the application identity.'}</p>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <Input label={language === 'th' ? 'อีเมลที่ใช้สมัคร' : 'Application email'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label={language === 'th' ? 'เบอร์โทรที่ใช้สมัคร' : 'Application phone'} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          <Button type="submit" size="lg" fullWidth loading={loading}>
            {language === 'th' ? 'ตรวจสอบสถานะ' : 'Check status'}
          </Button>
        </form>
      </Card>

      {application ? (
        <Card className="event-status-result-card" variant={application.status === 'approved' ? 'success' : application.status === 'rejected' ? 'warning' : 'soft'}>
          <ClipboardCheck size={30} />
          <div>
            <p className="eyebrow">{eventName || (language === 'th' ? 'ผลการตรวจสอบ' : 'Status result')}</p>
            <h2>{getApplicationStatusLabel(application.status, language)}</h2>
            <div className="badge-row">
              <Badge status={getApplicationStatusTone(application.status)}>{getApplicationStatusLabel(application.status, language)}</Badge>
              {application.submitted_at ? <Badge>{formatBangkokDateTime(application.submitted_at, language)}</Badge> : null}
            </div>
            {application.status === 'approved' && application.final_duty ? (
              <p><strong>{language === 'th' ? 'หน้าที่จริง:' : 'Final duty:'}</strong> {application.final_duty}</p>
            ) : null}
            {application.review_note ? <p>{application.review_note}</p> : null}
          </div>
        </Card>
      ) : null}

      {result && !result.success ? (
        <Card className="event-status-result-card" variant="warning">
          <RefreshCw size={28} />
          <div>
            <p className="eyebrow">{language === 'th' ? 'ไม่พบข้อมูล' : 'No result'}</p>
            <h2>{language === 'th' ? 'ไม่พบสถานะใบสมัคร' : 'Application status not found'}</h2>
            <p>{language === 'th' ? 'กรุณาตรวจสอบว่าใช้อีเมลและเบอร์โทรเดียวกับตอนสมัคร ระบบจะไม่เปิดเผยข้อมูลของผู้สมัครคนอื่น' : 'Please use the same email and phone from your application. Other applicants are never shown.'}</p>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
