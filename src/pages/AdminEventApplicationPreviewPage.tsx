import { Link, useParams } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { adminEventPath } from '../lib/eventRoutes';
import { fetchAdminEventById } from '../services/events';
import { EventStaffApplyPage } from './EventStaffApplyPage';

export function AdminEventApplicationPreviewPage() {
  const { language } = useLanguage();
  const { eventId = '' } = useParams();
  const state = useAsync(() => fetchAdminEventById(eventId), [eventId]);
  const event = state.data;

  if (state.loading) return <LoadingSkeleton />;
  if (state.error) {
    return (
      <section className="narrow-page page-stack">
        <EmptyState
          title={language === 'th' ? 'โหลดกิจกรรมไม่สำเร็จ' : 'Could not load event'}
          action={<Button variant="secondary" onClick={state.reload}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>}
        />
      </section>
    );
  }
  if (!event) {
    return (
      <section className="narrow-page page-stack">
        <EmptyState
          title={language === 'th' ? 'ไม่พบกิจกรรมนี้' : 'Event not found'}
          action={<Link className="btn btn-primary" to="/admin/events">{language === 'th' ? 'กลับไปรายการกิจกรรม' : 'Back to events'}</Link>}
        />
      </section>
    );
  }

  return (
    <EventStaffApplyPage
      previewMode
      previewEventSlug={event.slug}
      previewBackTo={adminEventPath(event.id)}
    />
  );
}
