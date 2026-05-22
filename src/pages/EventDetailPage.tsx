import { CalendarDays, MapPin, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { formatBangkokDate } from '../lib/dateTime';
import { legacyDefaultEventRoute } from '../lib/eventRoutes';
import { fetchEventBySlug } from '../services/events';

function statusLabel(status: string, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    active: { th: 'กำลังใช้งาน', en: 'Active' },
    published: { th: 'เผยแพร่แล้ว', en: 'Published' },
    registration_open: { th: 'เปิดรับสมัคร', en: 'Registration open' },
    staff_recruiting: { th: 'เปิดรับสตาฟ', en: 'Staff recruiting' },
    draft: { th: 'แบบร่าง', en: 'Draft' },
    completed: { th: 'จบกิจกรรมแล้ว', en: 'Completed' },
    archived: { th: 'เก็บถาวร', en: 'Archived' },
  };
  return labels[status]?.[language] ?? status;
}

function eventDate(start?: string | null, end?: string | null, language: 'th' | 'en' = 'th') {
  if (!start && !end) return language === 'th' ? 'ยังไม่ระบุวันกิจกรรม' : 'Date to be announced';
  if (start && end && start !== end) return `${formatBangkokDate(start, language)} - ${formatBangkokDate(end, language)}`;
  return formatBangkokDate(start ?? end, language);
}

export function EventDetailPage() {
  const { language } = useLanguage();
  const { eventSlug = '' } = useParams();
  const state = useAsync(() => fetchEventBySlug(eventSlug), [eventSlug]);
  const event = state.data;
  const title = event ? (language === 'th' ? event.name_th : event.name_en || event.name_th) : (language === 'th' ? 'รายละเอียดกิจกรรม' : 'Event details');

  return (
    <section className="events-page page-stack">
      <PageHeader
        eyebrow="Event"
        title={title}
        description={language === 'th'
          ? 'ระบบหลายกิจกรรมกำลังอยู่ระหว่างการขยาย ฟีเจอร์ลงทะเบียนและสมัครสตาฟจะเปิดใช้งานในขั้นถัดไป'
          : 'Multi-event support is being expanded. Registration and staff application will be enabled in the next phase.'}
        actions={<Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>}
      />

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? (
        <EmptyState
          title={language === 'th' ? 'โหลดรายละเอียดกิจกรรมไม่สำเร็จ' : 'Could not load event'}
          description={language === 'th' ? 'กรุณาลองใหม่ หรือกลับไปหน้ากิจกรรมทั้งหมด' : 'Please retry or return to the events list.'}
          action={<Link className="btn btn-secondary" to="/events">{language === 'th' ? 'กลับไปหน้ากิจกรรม' : 'Back to events'}</Link>}
        />
      ) : null}
      {!state.loading && !state.error && !event ? (
        <EmptyState
          title={language === 'th' ? 'ไม่พบกิจกรรมนี้' : 'Event not found'}
          description={language === 'th' ? 'ลิงก์นี้อาจไม่ถูกต้อง หรือกิจกรรมยังไม่เปิดเผย' : 'This link may be incorrect or the event is not public yet.'}
          action={<Link className="btn btn-primary" to="/events">{language === 'th' ? 'ดูกิจกรรมทั้งหมด' : 'View events'}</Link>}
        />
      ) : null}

      {event ? (
        <>
          <Card className="event-detail-card">
            <div className="event-card-head">
              <span className={`status-pill status-${event.status}`}>{statusLabel(event.status, language)}</span>
              <span className={`status-pill status-${event.visibility}`}>{event.visibility}</span>
            </div>
            <div className="event-detail-meta">
              <span><CalendarDays size={18} /> {eventDate(event.start_date, event.end_date, language)}</span>
              <span><MapPin size={18} /> {event.location || (language === 'th' ? 'ยังไม่ระบุสถานที่' : 'Location to be announced')}</span>
            </div>
            {event.description ? <p>{event.description}</p> : null}
          </Card>

          <Card className="event-actions-card" variant="soft">
            <div>
              <p className="eyebrow">{language === 'th' ? 'ขั้นถัดไป' : 'Next phase'}</p>
              <h2>{language === 'th' ? 'การลงทะเบียนจะเปิดในเฟสถัดไป' : 'Registration is coming in a later phase'}</h2>
              <p>{language === 'th' ? 'ตอนนี้ระบบยังคงใช้หน้ารายชื่อและแก้ไขข้อมูลเดิมสำหรับกิจกรรมปัจจุบัน เพื่อไม่ให้ workflow เดิมเสียหาย' : 'For now, the current participant list and edit flow remain unchanged to preserve the existing workflow.'}</p>
            </div>
            <div className="event-card-actions">
              <button className="btn btn-secondary" type="button" disabled>{language === 'th' ? 'ลงทะเบียนเข้าร่วม' : 'Register'}</button>
              <button className="btn btn-secondary" type="button" disabled>{language === 'th' ? 'สมัครเป็นทีมงาน' : 'Apply as staff'}</button>
              <Link className="btn btn-primary" to={legacyDefaultEventRoute('edit')}>{language === 'th' ? 'ตรวจสอบข้อมูลของฉัน' : 'Check my info'}</Link>
              <Link className="btn btn-secondary" to={legacyDefaultEventRoute('home')}>{language === 'th' ? 'ดูรายชื่อ' : 'Participant list'}</Link>
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}
