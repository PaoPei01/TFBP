import { CheckCircle2, RefreshCw } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { eventPath } from '../lib/eventRoutes';
import type { EventSubmissionResult } from '../lib/eventTypes';
import { fetchEventBySlug, submitEventParticipantRegistration } from '../services/events';
import { errorMessage } from '../utils/error';

export function EventRegisterPage() {
  const { language } = useLanguage();
  const { eventSlug = '' } = useParams();
  const state = useAsync(() => fetchEventBySlug(eventSlug), [eventSlug]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [result, setResult] = useState<EventSubmissionResult | null>(null);
  const event = state.data;
  const eventName = event ? (language === 'th' ? event.name_th : event.name_en || event.name_th) : '';

  async function submit(eventObject: FormEvent) {
    eventObject.preventDefault();
    try {
      setSaving(true);
      const submitted = await submitEventParticipantRegistration({
        eventSlug,
        email,
        phone,
        answers: { note },
      });
      setResult(submitted);
      if (!submitted.success) {
        setToast({ type: 'error', message: submitted.code === 'identity_verification_failed'
          ? (language === 'th' ? 'ไม่พบข้อมูลจากอีเมลและเบอร์โทรนี้' : 'No matching person was found for this email and phone.')
          : (language === 'th' ? 'กิจกรรมนี้ยังไม่เปิดรับลงทะเบียน' : 'This event is not open for registration.') });
        return;
      }
      setToast({ type: 'success', message: language === 'th' ? 'ส่งข้อมูลลงทะเบียนแล้ว' : 'Registration submitted' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ส่งข้อมูลไม่สำเร็จ' : 'Could not submit registration') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="events-page narrow-page page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Event Registration"
        title={language === 'th' ? 'ลงทะเบียนเข้าร่วมกิจกรรม' : 'Event Registration'}
        description={language === 'th'
          ? 'ยืนยันตัวตนด้วยอีเมลและเบอร์โทร ระบบจะใช้ข้อมูลพื้นฐานที่มีอยู่เพื่อลดการกรอกซ้ำ'
          : 'Verify with email and phone. Known profile data will be reused to reduce repeated form filling.'}
        actions={<Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>}
      />

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <EmptyState title={language === 'th' ? 'โหลดกิจกรรมไม่สำเร็จ' : 'Could not load event'} action={<Button variant="secondary" onClick={state.reload}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>} /> : null}
      {!state.loading && !state.error && !event ? (
        <EmptyState title={language === 'th' ? 'ไม่พบกิจกรรมนี้' : 'Event not found'} action={<Link className="btn btn-primary" to="/events">{language === 'th' ? 'ดูกิจกรรมทั้งหมด' : 'View events'}</Link>} />
      ) : null}

      {event ? (
        <Card className="event-form-card">
          <div>
            <p className="eyebrow">{eventName}</p>
            <h2>{language === 'th' ? 'ยืนยันข้อมูลเพื่อส่งคำขอลงทะเบียน' : 'Verify to submit registration'}</h2>
            <p className="muted">{language === 'th' ? 'เฟสนี้เป็นโครงสร้างลงทะเบียนแบบปลอดภัย ข้อมูลจะถูกส่งเป็นคำขอและรอขั้นตอนจัดการในเฟสถัดไป' : 'This is the safe registration foundation. Submission is stored for later admin review features.'}</p>
          </div>
          {result?.success ? (
            <div className="edit-success-card" role="status">
              <CheckCircle2 size={28} />
              <strong>{language === 'th' ? 'ส่งคำขอลงทะเบียนแล้ว' : 'Registration submitted'}</strong>
              <span>{language === 'th' ? 'สถานะเริ่มต้น: รอตรวจสอบ' : 'Initial status: pending review'}</span>
              <Link className="btn btn-secondary" to={eventPath(event.slug)}>{language === 'th' ? 'กลับไปหน้ากิจกรรม' : 'Back to event'}</Link>
            </div>
          ) : (
            <form className="form-grid" onSubmit={submit}>
              <Input label={language === 'th' ? 'อีเมล' : 'Email'} type="email" value={email} onChange={(eventInput) => setEmail(eventInput.target.value)} required />
              <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(eventInput) => setPhone(eventInput.target.value)} required />
              <label className="field full-span">
                <span>{language === 'th' ? 'หมายเหตุเพิ่มเติม' : 'Additional note'}</span>
                <textarea value={note} onChange={(eventInput) => setNote(eventInput.target.value)} rows={4} />
                <small>{language === 'th' ? 'ไม่ต้องกรอกข้อมูลสุขภาพในช่องนี้' : 'Do not enter health information here.'}</small>
              </label>
              <div className="form-actions full-span">
                <Link className="btn btn-secondary" to={eventPath(event.slug)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Link>
                <Button type="submit" loading={saving}>{language === 'th' ? 'ส่งคำขอลงทะเบียน' : 'Submit registration'}</Button>
              </div>
            </form>
          )}
        </Card>
      ) : null}
    </section>
  );
}
