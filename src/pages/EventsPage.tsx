import { CalendarDays, MapPin, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { formatBangkokDate } from '../lib/dateTime';
import type { EventRecord } from '../lib/eventTypes';
import { eventPath, legacyDefaultEventRoute } from '../lib/eventRoutes';
import { fetchPublicEvents } from '../services/events';

function eventName(event: EventRecord, language: 'th' | 'en') {
  return language === 'th' ? event.name_th : event.name_en || event.name_th;
}

function eventDate(event: EventRecord, language: 'th' | 'en') {
  if (!event.start_date && !event.end_date) return language === 'th' ? 'ยังไม่ระบุวันกิจกรรม' : 'Date to be announced';
  if (event.start_date && event.end_date && event.start_date !== event.end_date) {
    return `${formatBangkokDate(event.start_date, language)} - ${formatBangkokDate(event.end_date, language)}`;
  }
  return formatBangkokDate(event.start_date ?? event.end_date, language);
}

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

export function EventsPage() {
  const { language } = useLanguage();
  const state = useAsync(() => fetchPublicEvents(), []);
  const events = state.data ?? [];

  return (
    <section className="events-page page-stack">
      <PageHeader
        eyebrow="Events"
        title={language === 'th' ? 'กิจกรรมทั้งหมด' : 'Events'}
        description={language === 'th'
          ? 'เลือกกิจกรรมที่ต้องการดูรายละเอียด ลงทะเบียน หรือสมัครเป็นทีมงาน'
          : 'Choose an event to view details, register, or apply as staff.'}
        actions={<Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>}
      />

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? (
        <EmptyState
          title={language === 'th' ? 'โหลดกิจกรรมไม่สำเร็จ' : 'Could not load events'}
          description={language === 'th' ? 'กรุณาลองใหม่อีกครั้ง หากยังไม่ได้อาจต้องตรวจ migration events' : 'Please try again. If this keeps happening, the events migration may need to be applied.'}
          action={<Button variant="secondary" onClick={state.reload}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>}
        />
      ) : null}

      {!state.loading && !state.error && events.length === 0 ? (
        <EmptyState
          title={language === 'th' ? 'ยังไม่มีกิจกรรมที่เผยแพร่' : 'No public events yet'}
          description={language === 'th' ? 'กิจกรรมปัจจุบันยังใช้งานผ่านหน้ารายชื่อเดิมได้ตามปกติ' : 'The current event still works through the existing participant list.'}
          action={<Link className="btn btn-primary" to={legacyDefaultEventRoute('home')}>{language === 'th' ? 'ไปหน้ารายชื่อ' : 'Open participant list'}</Link>}
        />
      ) : null}

      {events.length ? (
        <div className="event-card-grid">
          {events.map((event) => (
            <Card className="event-card" key={event.id}>
              <div className="event-card-head">
                <span className={`status-pill status-${event.status}`}>{statusLabel(event.status, language)}</span>
                {event.academic_year ? <em>{language === 'th' ? `ปี ${event.academic_year}` : `Year ${event.academic_year}`}</em> : null}
              </div>
              <div>
                <h2>{eventName(event, language)}</h2>
                {event.description ? <p>{event.description}</p> : null}
              </div>
              <div className="event-card-meta">
                <span><CalendarDays size={16} /> {eventDate(event, language)}</span>
                <span><MapPin size={16} /> {event.location || (language === 'th' ? 'ยังไม่ระบุสถานที่' : 'Location to be announced')}</span>
              </div>
              <div className="event-card-actions">
                <Link className="btn btn-primary" to={eventPath(event.slug)}>{language === 'th' ? 'ดูรายละเอียด' : 'View details'}</Link>
                <Link className="btn btn-secondary" to={legacyDefaultEventRoute('home')}>{language === 'th' ? 'ดูรายชื่อปัจจุบัน' : 'Current list'}</Link>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
