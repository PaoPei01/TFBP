import { Download, History } from 'lucide-react';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Toast, ToastState } from '../components/ui/Toast';
import { useEventContext } from '../context/EventContext';
import { documentTypeLabel, downloadBlob } from '../lib/documentGeneration';
import { useAsync } from '../hooks/useAsync';
import { downloadGeneratedDocument, fetchDocumentCenterData } from '../services/documents';
import { errorMessage } from '../utils/error';
import { useState } from 'react';

export function DocumentHistoryPage() {
  const { currentEventId } = useEventContext();
  const state = useAsync(() => fetchDocumentCenterData(currentEventId), [currentEventId]);
  const [toast, setToast] = useState<ToastState>(null);
  const history = state.data?.history ?? [];

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
      <PageHeader eyebrow="Document Center" title="ประวัติเอกสาร" description="ดาวน์โหลดไฟล์ DOCX ที่เคย generate จาก private Supabase Storage" meta={<EventSwitcher compact />} />
      {state.loading ? <LoadingSkeleton /> : null}
      <ResponsiveDataTable
        rows={history}
        getKey={(row) => row.id}
        emptyText="ยังไม่มีประวัติเอกสาร"
        mobileTitle={(row) => row.title || row.file_name}
        mobileSubtitle={(row) => `${documentTypeLabel(row.document_type)} v${row.version}`}
        mobileMeta={(row) => row.status ?? 'generated'}
        mobileActions={(row) => <Button variant="secondary" icon={<Download size={16} />} onClick={() => download(row)}>ดาวน์โหลด</Button>}
        columns={[
          { key: 'file', header: 'ไฟล์', render: (row) => <div className="participant-admin-cell"><strong>{row.title || row.file_name}</strong><span>{row.file_name}</span></div> },
          { key: 'type', header: 'ประเภท', render: (row) => documentTypeLabel(row.document_type) },
          { key: 'version', header: 'เวอร์ชัน', render: (row) => `v${row.version}` },
          { key: 'status', header: 'สถานะ', render: (row) => row.status ?? '-' },
          { key: 'generated', header: 'สร้างเมื่อ', render: (row) => (row.generated_at ?? row.created_at) ? new Date(row.generated_at ?? row.created_at ?? '').toLocaleString('th-TH') : '-' },
          { key: 'missing', header: 'ข้อมูลที่ขาด', render: (row) => row.missing_fields.join(', ') || '-' },
          { key: 'preview', header: 'Preview', render: (row) => row.preview_html ? <Card className="document-history-preview"><History size={16} /> มี HTML preview</Card> : '-' },
          { key: 'actions', header: 'ดาวน์โหลด', render: (row) => <Button variant="secondary" icon={<Download size={16} />} onClick={() => download(row)}>DOCX</Button> },
        ]}
      />
    </section>
  );
}
