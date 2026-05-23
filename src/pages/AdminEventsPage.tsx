import { CalendarDays, Eye, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { DEFAULT_EVENT_SLUG } from '../lib/defaultEvent';
import { formatBangkokDate } from '../lib/dateTime';
import type { EventRecord } from '../lib/eventTypes';
import { adminEventApplicationsPath, adminEventPath, eventPath } from '../lib/eventRoutes';
import { fetchAdminEvents } from '../services/events';

function eventName(event: EventRecord, language: 'th' | 'en') {
  return language === 'th' ? event.name_th : event.name_en || event.name_th;
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

function eventDate(event: EventRecord, language: 'th' | 'en') {
  if (!event.start_date && !event.end_date) return '-';
  if (event.start_date && event.end_date && event.start_date !== event.end_date) {
    return `${formatBangkokDate(event.start_date, language)} - ${formatBangkokDate(event.end_date, language)}`;
  }
  return formatBangkokDate(event.start_date ?? event.end_date, language);
}

export function AdminEventsPage() {
  const { language } = useLanguage();
  const state = useAsync(() => fetchAdminEvents(), []);
  const events = state.data ?? [];
  const defaultEvent = events.find((event) => event.slug === DEFAULT_EVENT_SLUG);

  return (
    <section className="events-page page-stack">
      <PageHeader
        eyebrow="Events"
        title={language === 'th' ? 'จัดการกิจกรรม' : 'Manage Events'}
        description={language === 'th'
          ? 'รายการกิจกรรมในระบบ เริ่มจากกิจกรรมปัจจุบันและขยายสำหรับกิจกรรมในอนาคต'
          : 'Events in the system, starting with the current event and future expansion.'}
        actions={<Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>}
      />

      {defaultEvent ? (
        <Card className="event-admin-current" variant="soft">
          <CalendarDays size={22} aria-hidden="true" />
          <div>
            <strong>{language === 'th' ? 'กิจกรรมหลักปัจจุบัน' : 'Current default event'}</strong>
            <span>{eventName(defaultEvent, language)} · {statusLabel(defaultEvent.status, language)}</span>
          </div>
          <Link className="btn btn-secondary" to={eventPath(defaultEvent.slug)}><Eye size={17} />{language === 'th' ? 'ดูหน้าสาธารณะ' : 'Public page'}</Link>
        </Card>
      ) : null}

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? (
        <EmptyState
          title={language === 'th' ? 'โหลดรายการกิจกรรมไม่สำเร็จ' : 'Could not load events'}
          description={language === 'th' ? 'กรุณาลองใหม่ หรือยืนยันว่า migration events ถูก apply แล้ว' : 'Please retry or confirm that the events migration has been applied.'}
          action={<Button variant="secondary" onClick={state.reload}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>}
        />
      ) : null}

      {!state.loading && !state.error ? (
        <ResponsiveDataTable
          rows={events}
          getKey={(row) => row.id}
          emptyText={language === 'th' ? 'ยังไม่มีกิจกรรมในระบบ' : 'No events yet'}
          mobileTitle={(row) => eventName(row, language)}
          mobileSubtitle={(row) => `${statusLabel(row.status, language)} · ${row.visibility}`}
          mobileMeta={(row) => eventDate(row, language)}
          mobileActions={(row) => (
            <div className="event-card-actions">
              <Link className="btn btn-secondary" to={adminEventPath(row.id)}>{language === 'th' ? 'จัดการ' : 'Manage'}</Link>
              {row.event_type === 'staff_recruitment' ? <Link className="btn btn-secondary" to={adminEventApplicationsPath(row.id)}>{language === 'th' ? 'ใบสมัคร' : 'Applications'}</Link> : null}
            </div>
          )}
          columns={[
            { key: 'name', header: language === 'th' ? 'กิจกรรม' : 'Event', render: (row) => <strong>{eventName(row, language)}</strong>, priority: 'primary' },
            { key: 'slug', header: 'Slug', render: (row) => row.slug, mobileHidden: true },
            { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => <span className={`status-pill status-${row.status}`}>{statusLabel(row.status, language)}</span> },
            { key: 'visibility', header: language === 'th' ? 'การมองเห็น' : 'Visibility', render: (row) => row.visibility },
            { key: 'date', header: language === 'th' ? 'วันกิจกรรม' : 'Date', render: (row) => eventDate(row, language), mobileLabel: language === 'th' ? 'วัน' : 'Date' },
            { key: 'action', header: '', render: (row) => (
              <div className="table-action-row">
                <Link className="btn btn-secondary" to={adminEventPath(row.id)}>{language === 'th' ? 'จัดการ' : 'Manage'}</Link>
                {row.event_type === 'staff_recruitment' ? <Link className="btn btn-secondary" to={adminEventApplicationsPath(row.id)}>{language === 'th' ? 'ใบสมัคร' : 'Applications'}</Link> : null}
              </div>
            ), align: 'right' },
          ]}
        />
      ) : null}
    </section>
  );
}
