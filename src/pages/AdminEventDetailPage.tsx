import { Eye, RefreshCw, Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import type { EventRecord, EventStatus, EventVisibility } from '../lib/eventTypes';
import { adminEventApplicationsPath, eventPath } from '../lib/eventRoutes';
import { fetchAdminEventById, updateAdminEvent } from '../services/events';
import { errorMessage } from '../utils/error';

const statuses: EventStatus[] = ['draft', 'published', 'registration_open', 'staff_recruiting', 'active', 'completed', 'archived'];
const visibilities: EventVisibility[] = ['private', 'unlisted', 'public'];

function emptyForm(): Partial<EventRecord> {
  return {
    name_th: '',
    name_en: '',
    slug: '',
    description: '',
    event_type: 'activity',
    academic_year: '',
    start_date: '',
    end_date: '',
    location: '',
    status: 'draft',
    visibility: 'private',
    cover_image_path: '',
  };
}

export function AdminEventDetailPage() {
  const { language } = useLanguage();
  const { eventId = '' } = useParams();
  const state = useAsync(() => fetchAdminEventById(eventId), [eventId]);
  const [form, setForm] = useState<Partial<EventRecord>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const event = state.data;

  useEffect(() => {
    if (!event) return;
    setForm({
      name_th: event.name_th,
      name_en: event.name_en ?? '',
      slug: event.slug,
      description: event.description ?? '',
      event_type: event.event_type ?? 'activity',
      academic_year: event.academic_year ?? '',
      start_date: event.start_date ?? '',
      end_date: event.end_date ?? '',
      location: event.location ?? '',
      status: event.status,
      visibility: event.visibility,
      cover_image_path: event.cover_image_path ?? '',
    });
  }, [event]);

  async function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    if (!event) return;
    try {
      setSaving(true);
      await updateAdminEvent(event.id, {
        ...form,
        name_en: form.name_en || null,
        description: form.description || null,
        event_type: form.event_type || null,
        academic_year: form.academic_year || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        location: form.location || null,
        cover_image_path: form.cover_image_path || null,
      });
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกกิจกรรมแล้ว' : 'Event saved' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกกิจกรรมไม่สำเร็จ' : 'Could not save event') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="events-page page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Event Admin"
        title={event ? (language === 'th' ? event.name_th : event.name_en || event.name_th) : (language === 'th' ? 'จัดการกิจกรรม' : 'Manage Event')}
        description={language === 'th' ? 'แก้ไขข้อมูลกิจกรรมและสถานะการเปิดใช้งาน โดยยังไม่กระทบข้อมูลเดิมของรายชื่อ/เช็กชื่อ' : 'Edit event metadata and lifecycle status without changing legacy participant or attendance flows.'}
        actions={(
          <>
            {event ? <Link className="btn btn-secondary" to={eventPath(event.slug)}><Eye size={17} />{language === 'th' ? 'ดูหน้าสาธารณะ' : 'Public page'}</Link> : null}
            {event?.event_type === 'staff_recruitment' ? <Link className="btn btn-secondary" to={adminEventApplicationsPath(event.id)}>{language === 'th' ? 'ใบสมัคร' : 'Applications'}</Link> : null}
            <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>
          </>
        )}
      />

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <EmptyState title={language === 'th' ? 'โหลดกิจกรรมไม่สำเร็จ' : 'Could not load event'} action={<Button variant="secondary" onClick={state.reload}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>} /> : null}
      {!state.loading && !state.error && !event ? (
        <EmptyState title={language === 'th' ? 'ไม่พบกิจกรรมนี้' : 'Event not found'} action={<Link className="btn btn-primary" to="/admin/events">{language === 'th' ? 'กลับไปรายการกิจกรรม' : 'Back to events'}</Link>} />
      ) : null}

      {event ? (
        <form className="page-stack" onSubmit={submit}>
          <Card className="event-form-card">
            <div>
              <p className="eyebrow">{language === 'th' ? 'ข้อมูลหลัก' : 'Core details'}</p>
              <h2>{language === 'th' ? 'รายละเอียดกิจกรรม' : 'Event details'}</h2>
            </div>
            <div className="form-grid">
              <Input label={language === 'th' ? 'ชื่อกิจกรรม (ไทย)' : 'Thai name'} value={form.name_th ?? ''} onChange={(inputEvent) => setForm({ ...form, name_th: inputEvent.target.value })} required />
              <Input label={language === 'th' ? 'ชื่อกิจกรรม (อังกฤษ)' : 'English name'} value={form.name_en ?? ''} onChange={(inputEvent) => setForm({ ...form, name_en: inputEvent.target.value })} />
              <Input label="Slug" value={form.slug ?? ''} onChange={(inputEvent) => setForm({ ...form, slug: inputEvent.target.value })} required />
              <Input label={language === 'th' ? 'ประเภทกิจกรรม' : 'Event type'} value={form.event_type ?? ''} onChange={(inputEvent) => setForm({ ...form, event_type: inputEvent.target.value })} />
              <Input label={language === 'th' ? 'ปีการศึกษา' : 'Academic year'} value={form.academic_year ?? ''} onChange={(inputEvent) => setForm({ ...form, academic_year: inputEvent.target.value })} />
              <Input label={language === 'th' ? 'สถานที่' : 'Location'} value={form.location ?? ''} onChange={(inputEvent) => setForm({ ...form, location: inputEvent.target.value })} />
              <Input label={language === 'th' ? 'วันเริ่ม' : 'Start date'} type="date" value={form.start_date ?? ''} onChange={(inputEvent) => setForm({ ...form, start_date: inputEvent.target.value })} />
              <Input label={language === 'th' ? 'วันสิ้นสุด' : 'End date'} type="date" value={form.end_date ?? ''} onChange={(inputEvent) => setForm({ ...form, end_date: inputEvent.target.value })} />
              <Select label={language === 'th' ? 'สถานะ' : 'Status'} value={form.status ?? 'draft'} onChange={(inputEvent) => setForm({ ...form, status: inputEvent.target.value as EventStatus })} options={statuses} />
              <Select label={language === 'th' ? 'การมองเห็น' : 'Visibility'} value={form.visibility ?? 'private'} onChange={(inputEvent) => setForm({ ...form, visibility: inputEvent.target.value as EventVisibility })} options={visibilities} />
              <label className="field full-span">
                <span>{language === 'th' ? 'คำอธิบาย' : 'Description'}</span>
                <textarea value={form.description ?? ''} onChange={(inputEvent) => setForm({ ...form, description: inputEvent.target.value })} rows={4} />
              </label>
            </div>
          </Card>
          <div className="form-actions">
            <Link className="btn btn-secondary" to="/admin/events">{language === 'th' ? 'กลับ' : 'Back'}</Link>
            <Button type="submit" icon={<Save size={18} />} loading={saving}>{language === 'th' ? 'บันทึก' : 'Save'}</Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
