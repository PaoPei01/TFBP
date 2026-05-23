import { Edit3, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Toast, ToastState } from '../components/ui/Toast';
import { useEventContext } from '../context/EventContext';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { deleteAnnouncement, fetchAdminAnnouncements } from '../services/announcements';
import { useState } from 'react';
import { errorMessage } from '../utils/error';

export function AdminAnnouncementsPage() {
  const { language } = useLanguage();
  const { currentEventId, events } = useEventContext();
  const state = useAsync(() => fetchAdminAnnouncements(currentEventId), [currentEventId]);
  const [toast, setToast] = useState<ToastState>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function remove() {
    if (!deleteId) return;
    try {
      await deleteAnnouncement(deleteId);
      setToast({ type: 'success', message: language === 'th' ? 'ลบประกาศแล้ว' : 'Announcement deleted' });
      setDeleteId(null);
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ลบไม่สำเร็จ' : 'Delete failed') });
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <ConfirmDialog
        open={Boolean(deleteId)}
        title={language === 'th' ? 'ลบประกาศ' : 'Delete announcement'}
        message={language === 'th' ? 'ประกาศนี้จะถูกลบออกจากหน้าผู้ใช้และทีมงาน' : 'This announcement will be removed from user and staff views.'}
        confirmLabel={language === 'th' ? 'ลบประกาศ' : 'Delete'}
        onConfirm={remove}
        onClose={() => setDeleteId(null)}
      />
      <PageHeader eyebrow="Announcements" title={language === 'th' ? 'จัดการประกาศกิจกรรม' : 'Manage Announcements'} description={language === 'th' ? 'แผนที่ กำหนดการ จราจร FAQ และอัปเดตสำคัญ' : 'Maps, schedules, traffic plans, FAQs, and important updates.'} meta={<EventSwitcher compact />} actions={<Link className="btn btn-primary" to="/admin/announcements/new"><Plus size={18} />{language === 'th' ? 'สร้างประกาศ' : 'New'}</Link>} />
      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}
      <ResponsiveDataTable
        rows={state.data ?? []}
        getKey={(row) => row.id}
        emptyText={language === 'th' ? 'ยังไม่มีประกาศ' : 'No announcements'}
        mobileTitle={(row) => row.title}
        mobileSubtitle={(row) => `${row.type} · ${row.audience}`}
        columns={[
          { key: 'title', header: language === 'th' ? 'หัวข้อ' : 'Title', render: (row) => row.title },
          { key: 'type', header: 'Type', render: (row) => row.type },
          { key: 'audience', header: language === 'th' ? 'ผู้เห็น' : 'Audience', render: (row) => row.audience },
          { key: 'event', header: language === 'th' ? 'กิจกรรม' : 'Event', render: (row) => events.find((event) => event.id === row.event_id)?.name_th ?? (row.event_id ? row.event_id : (language === 'th' ? 'ทุกกิจกรรม' : 'Global')) },
          { key: 'priority', header: language === 'th' ? 'ความสำคัญ' : 'Priority', render: (row) => <Badge status={row.priority === 'critical' ? 'rejected' : row.priority === 'important' ? 'pending' : 'approved'}>{row.priority}</Badge> },
          { key: 'visible', header: language === 'th' ? 'แสดง' : 'Visible', render: (row) => row.visible ? 'ON' : 'OFF' },
          { key: 'actions', header: language === 'th' ? 'จัดการ' : 'Actions', render: (row) => <div className="row-actions"><Link className="btn btn-secondary" to={`/admin/announcements/${row.id}/edit`}><Edit3 size={16} />Edit</Link><Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setDeleteId(row.id)}>Delete</Button></div> },
        ]}
      />
    </section>
  );
}
