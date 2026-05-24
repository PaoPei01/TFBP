import { Download, History } from 'lucide-react';
import { useState } from 'react';
import { DocumentEventContextCard } from '../components/documents/DocumentEventContextCard';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Toast, ToastState } from '../components/ui/Toast';
import { useEventContext } from '../context/EventContext';
import { documentTypeLabel, downloadBlob } from '../lib/documentGeneration';
import { documentEventName, documentScopeLabel, documentScopeTone } from '../lib/documentEventContext';
import { useAsync } from '../hooks/useAsync';
import { downloadGeneratedDocument, fetchDocumentCenterData } from '../services/documents';
import { errorMessage } from '../utils/error';

export function DocumentHistoryPage() {
  const { currentEvent, currentEventId } = useEventContext();
  const state = useAsync(() => fetchDocumentCenterData(currentEventId), [currentEventId]);
  const [toast, setToast] = useState<ToastState>(null);
  const history = state.data?.history ?? [];
  const templates = state.data?.templates ?? [];

  async function download(row: typeof history[number]) {
    try {
      const blob = await downloadGeneratedDocument(row);
      downloadBlob(blob, row.file_name);
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'ดาวน์โหลดเอกสารไม่สำเร็จ') });
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader eyebrow="ศูนย์เอกสาร" title="ประวัติเอกสาร" description="ดูและดาวน์โหลดเอกสารที่เคยสร้างไว้" meta={<EventSwitcher compact />} />
      {state.loading ? <LoadingSkeleton /> : null}
      <DocumentEventContextCard />
      <ResponsiveDataTable
        rows={history}
        getKey={(row) => row.id}
        emptyText="ยังไม่มีประวัติเอกสาร"
        mobileTitle={(row) => row.title || row.file_name}
        mobileSubtitle={(row) => `${documentEventName(currentEvent, 'th')} · ${documentTypeLabel(row.document_type)} v${row.version}`}
        mobileMeta={(row) => {
          const template = templates.find((item) => item.id === row.template_id);
          return `${documentScopeLabel(template?.event_id, currentEventId, 'th')} · ${row.status ?? 'generated'}`;
        }}
        mobileActions={(row) => <Button variant="secondary" icon={<Download size={16} />} onClick={() => download(row)}>ดาวน์โหลด</Button>}
        columns={[
          { key: 'file', header: 'ไฟล์', render: (row) => <div className="participant-admin-cell"><strong>{row.title || row.file_name}</strong><span>{row.file_name}</span></div> },
          { key: 'event', header: 'กิจกรรม', render: (row) => <div className="participant-admin-cell"><strong>{row.event_id ? documentEventName(currentEvent, 'th') : 'ทุกกิจกรรม'}</strong><span>{row.event_id ? 'ข้อมูลกิจกรรมที่เลือก' : 'global/history เดิม'}</span></div> },
          { key: 'scope', header: 'ขอบเขตเทมเพลต', render: (row) => {
            const template = templates.find((item) => item.id === row.template_id);
            return <Badge status={documentScopeTone(template?.event_id, currentEventId)}>{documentScopeLabel(template?.event_id, currentEventId, 'th')}</Badge>;
          } },
          { key: 'type', header: 'ประเภท', render: (row) => documentTypeLabel(row.document_type) },
          { key: 'version', header: 'เวอร์ชัน', render: (row) => `v${row.version}` },
          { key: 'status', header: 'สถานะ', render: (row) => row.status ?? '-' },
          { key: 'generated', header: 'สร้างเมื่อ', render: (row) => (row.generated_at ?? row.created_at) ? new Date(row.generated_at ?? row.created_at ?? '').toLocaleString('th-TH') : '-' },
          { key: 'missing', header: 'ข้อมูลที่ขาด', render: (row) => row.missing_fields.join(', ') || '-' },
          { key: 'preview', header: 'ดูตัวอย่าง', render: (row) => row.preview_html ? <Card className="document-history-preview"><History size={16} /> มีตัวอย่าง</Card> : '-' },
          { key: 'actions', header: 'ดาวน์โหลด', render: (row) => <Button variant="secondary" icon={<Download size={16} />} onClick={() => download(row)}>ดาวน์โหลด</Button> },
        ]}
      />
    </section>
  );
}
