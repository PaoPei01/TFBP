import { FileUp, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DocumentEventContextCard } from '../components/documents/DocumentEventContextCard';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useEventContext } from '../context/EventContext';
import { documentTypeLabel, documentTypeOptions, extractDocxPlaceholders, templateVariableGuide } from '../lib/documentGeneration';
import { documentScopeLabel, documentScopeTone } from '../lib/documentEventContext';
import type { DocumentTemplate, DocumentType } from '../lib/documentTypes';
import { useAsync } from '../hooks/useAsync';
import { deleteDocumentTemplate, fetchDocumentCenterData, uploadDocumentTemplate } from '../services/documents';
import { errorMessage } from '../utils/error';

export function DocumentTemplatesPage() {
  const { currentEventId } = useEventContext();
  const state = useAsync(() => fetchDocumentCenterData(currentEventId), [currentEventId]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('project_approval');
  const [active, setActive] = useState(true);
  const [scope, setScope] = useState<'event' | 'global'>('event');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'event' | 'global'>('all');
  const [file, setFile] = useState<File | null>(null);
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const templates = (state.data?.templates ?? []).filter((template) => {
    if (scopeFilter === 'event') return template.event_id === currentEventId;
    if (scopeFilter === 'global') return !template.event_id;
    return true;
  });
  const invalidPlaceholders = detectedPlaceholders.filter((item) => !/^[a-z0-9_.-]+$/.test(item));

  async function inspectFile(nextFile: File | null) {
    setFile(nextFile);
    setDetectedPlaceholders([]);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith('.docx')) {
      setToast({ type: 'error', message: 'รองรับเฉพาะไฟล์ .docx เท่านั้น' });
      return;
    }
    try {
      setDetectedPlaceholders(extractDocxPlaceholders(await nextFile.arrayBuffer()));
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'อ่านช่องข้อมูลในไฟล์ไม่สำเร็จ') });
    }
  }

  async function upload() {
    if (!file) return setToast({ type: 'error', message: 'กรุณาเลือกไฟล์ .docx' });
    if (!file.name.toLowerCase().endsWith('.docx')) return setToast({ type: 'error', message: 'รองรับเฉพาะไฟล์ .docx เท่านั้น' });
    try {
      const buffer = await file.arrayBuffer();
      const placeholders = extractDocxPlaceholders(buffer);
      await uploadDocumentTemplate({
        name: name || file.name.replace(/\.docx$/i, ''),
        description,
        document_type: documentType,
        file,
        placeholders,
        is_active: active,
        event_id: scope === 'global' ? null : currentEventId,
      });
      setToast({ type: 'success', message: `อัปโหลดเทมเพลตแล้ว พบช่องข้อมูล ${placeholders.length} ช่อง` });
      setName('');
      setDescription('');
      setFile(null);
      setDetectedPlaceholders([]);
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'อัปโหลดเทมเพลตไม่สำเร็จ กรุณาตรวจไฟล์แล้วลองอีกครั้ง') });
    }
  }

  async function remove(template: DocumentTemplate) {
    try {
      await deleteDocumentTemplate(template);
      setToast({ type: 'success', message: 'ลบเทมเพลตแล้ว' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'ลบเทมเพลตไม่สำเร็จ กรุณาลองอีกครั้ง') });
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="ศูนย์เอกสาร"
        title="เทมเพลตเอกสาร"
        description="อัปโหลดเทมเพลต .docx และตรวจช่องข้อมูลที่ใช้เติมเอกสาร เช่น {project_name}, {event_date_th}"
        meta={<EventSwitcher compact />}
        actions={<HelpButton topicId="documents.templates" variant="link" />}
      />
      <DocumentEventContextCard />
      <Card className="template-upload-card" variant="soft">
        <div>
          <p className="eyebrow">อัปโหลดเทมเพลต</p>
          <h2>อัปโหลดไฟล์ .docx</h2>
          <span>ระบบจะอ่านช่องข้อมูลในไฟล์ และเก็บไฟล์ไว้ใน Storage ส่วนตัว</span>
          <HelpButton topicId="documents.templates" variant="compact" />
        </div>
        <label className="file-drop-zone">
          <FileUp size={28} />
          <strong>{file?.name ?? 'เลือกไฟล์ .docx'}</strong>
          <span>รองรับเฉพาะ .docx เท่านั้น</span>
          <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => void inspectFile(event.target.files?.[0] ?? null)} />
        </label>
      </Card>
      <Card className="form-grid two-col">
        <Input label="ชื่อเทมเพลต" value={name} onChange={(event) => setName(event.target.value)} placeholder="เช่น หนังสือขอใช้สถานที่" />
        <Select label="ประเภทเอกสาร" value={documentType} options={documentTypeOptions} onChange={(event) => setDocumentType(event.target.value as DocumentType)} />
        <Select label="ใช้กับ" value={scope} options={[
          { value: 'event', label: 'กิจกรรมนี้' },
          { value: 'global', label: 'ทุกกิจกรรม' },
        ]} onChange={(event) => setScope(event.target.value as 'event' | 'global')} />
        <Input label="คำอธิบาย" value={description} onChange={(event) => setDescription(event.target.value)} />
        <label className="field checkbox-field"><span>เปิดใช้งาน</span><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /></label>
        {detectedPlaceholders.length ? (
          <div className="full-span">
            <strong>ช่องข้อมูลที่พบ</strong>
            <div className="filter-chip-row">
              {detectedPlaceholders.map((item) => <span className="filter-chip" key={item}>{`{${item}}`}</span>)}
            </div>
            {invalidPlaceholders.length ? <p className="error-state">พบช่องข้อมูลที่ยังไม่ตรงรูปแบบตัวพิมพ์เล็ก: {invalidPlaceholders.join(', ')}</p> : null}
          </div>
        ) : null}
        <div className="form-actions full-span">
        <Button icon={<FileUp size={18} />} onClick={upload}>อัปโหลดเทมเพลต</Button>
        </div>
      </Card>
      <Card className="privacy-notice">
        <strong>ตัวอย่างช่องข้อมูลที่ใช้ได้</strong>
        <span>{templateVariableGuide.map((item) => `{${item}}`).join('  ')}</span>
      </Card>
      <Card className="toolbar">
        <Select label="กรองเทมเพลต" value={scopeFilter} options={[
          { value: 'all', label: 'ทั้งหมด' },
          { value: 'event', label: 'กิจกรรมนี้' },
          { value: 'global', label: 'ทุกกิจกรรม' },
        ]} onChange={(event) => setScopeFilter(event.target.value as 'all' | 'event' | 'global')} />
      </Card>
      {state.loading ? <LoadingSkeleton /> : null}
      <ResponsiveDataTable
        rows={templates}
        getKey={(row) => row.id}
        emptyText="ยังไม่มีเทมเพลต"
        mobileTitle={(row) => row.name}
        mobileSubtitle={(row) => documentTypeLabel(row.document_type)}
        mobileMeta={(row) => documentScopeLabel(row.event_id, currentEventId, 'th')}
        columns={[
          { key: 'name', header: 'เทมเพลต', render: (row) => <div className="participant-admin-cell"><strong>{row.name}</strong><span>{row.file_name}</span></div> },
          { key: 'type', header: 'ประเภท', render: (row) => documentTypeLabel(row.document_type) },
          { key: 'placeholders', header: 'ช่องข้อมูล', render: (row) => <span>{row.placeholders.slice(0, 8).join(', ') || '-'}</span> },
          { key: 'active', header: 'สถานะ', render: (row) => row.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' },
          { key: 'event', header: 'ขอบเขต', render: (row) => <span className={`badge badge-${documentScopeTone(row.event_id, currentEventId)}`}>{documentScopeLabel(row.event_id, currentEventId, 'th')}</span> },
          { key: 'created', header: 'สร้างเมื่อ', render: (row) => row.created_at ? new Date(row.created_at).toLocaleString('th-TH') : '-' },
          { key: 'actions', header: 'จัดการ', render: (row) => <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => remove(row)}>ลบ</Button> },
        ]}
      />
    </section>
  );
}
