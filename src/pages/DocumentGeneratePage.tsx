import { Download, Eye } from 'lucide-react';
import { useMemo, useState } from 'react';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { buildDocumentData, documentTypeLabel, downloadBlob, findMissingFields, renderDocxBlob, renderPreviewHtml } from '../lib/documentGeneration';
import type { DocumentType } from '../lib/documentTypes';
import { useAsync } from '../hooks/useAsync';
import { downloadTemplateBuffer, fetchDocumentCenterData, recordGeneratedDocument, uploadGeneratedDocx } from '../services/documents';
import { errorMessage } from '../utils/error';

export function DocumentGeneratePage() {
  const state = useAsync(fetchDocumentCenterData, []);
  const [templateId, setTemplateId] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('project_approval');
  const [title, setTitle] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const data = state.data;
  const templates = (data?.templates ?? []).filter((item) => item.is_active !== false && item.document_type === documentType);
  const template = templates.find((item) => item.id === templateId) ?? null;
  const payload = useMemo(() => data ? buildDocumentData(data) : {}, [data]);
  const missing = useMemo(() => template ? findMissingFields(documentType, template.placeholders, payload) : findMissingFields(documentType, [], payload), [documentType, payload, template]);

  function preview() {
    setPreviewHtml(renderPreviewHtml(documentType, title || template?.name || documentTypeLabel(documentType), payload, missing));
  }

  async function download() {
    if (!template || !data) return;
    setGenerating(true);
    try {
      const fileTitle = title || template.name || documentTypeLabel(documentType);
      const html = previewHtml || renderPreviewHtml(documentType, fileTitle, payload, missing);
      const reserved = await recordGeneratedDocument({
        project_profile_id: data.profile?.id ?? null,
        template_id: template.id,
        file_name: `${fileTitle.replace(/[^\wก-๙.-]+/g, '-')}.docx`,
        title: fileTitle,
        document_type: documentType,
        version: 0,
        status: 'generating',
        output_docx_path: '',
        placeholders: payload,
        snapshot_data: payload,
        missing_fields: missing.map((item) => item.field),
        preview_html: html,
      });
      const fileName = `${fileTitle.replace(/[^\wก-๙.-]+/g, '-')}_v${reserved.version}.docx`;
      const buffer = await downloadTemplateBuffer(template);
      const blob = renderDocxBlob(buffer, payload);
      const outputPath = await uploadGeneratedDocx(fileName, blob);
      downloadBlob(blob, fileName);
      await recordGeneratedDocument({
        id: reserved.id,
        project_profile_id: data.profile?.id ?? null,
        template_id: template.id,
        file_name: fileName,
        title: fileTitle,
        document_type: documentType,
        version: reserved.version,
        status: missing.length ? 'incomplete' : 'generated',
        output_docx_path: outputPath,
        placeholders: payload,
        snapshot_data: payload,
        missing_fields: missing.map((item) => item.field),
        preview_html: html,
      });
      setToast({ type: 'success', message: `สร้าง DOCX v${reserved.version} และบันทึกลง Storage แล้ว` });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'สร้าง DOCX ไม่สำเร็จ ตรวจ template และ Storage permission อีกครั้ง') });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Document Center"
        title="Generate DOCX"
        description="เลือกประเภทเอกสาร ตรวจข้อมูลที่ขาด ดูตัวอย่าง และดาวน์โหลดไฟล์"
        actions={<HelpButton topicId="documents.generate" variant="link" />}
      />
      {state.loading ? <LoadingSkeleton /> : null}
      {data ? (
        <>
          <Card className="form-grid two-col">
            <Select label="ประเภทเอกสาร" value={documentType} onChange={(event) => { setDocumentType(event.target.value as DocumentType); setTemplateId(''); setPreviewHtml(''); }} options={[
              { value: 'project_approval', label: 'เอกสารขออนุมัติโครงการ' },
              { value: 'venue_request', label: 'หนังสือขอใช้สถานที่' },
              { value: 'equipment_borrow', label: 'เอกสารยืมอุปกรณ์' },
              { value: 'support_request', label: 'หนังสือขอความอนุเคราะห์' },
              { value: 'invitation_letter', label: 'หนังสือเชิญ' },
              { value: 'closing_report', label: 'รายงานสรุปโครงการ' },
              { value: 'custom', label: 'กำหนดเอง' },
            ]} />
            <Select label="Template" value={templateId} onChange={(event) => { setTemplateId(event.target.value); setPreviewHtml(''); }} options={templates.map((item) => ({ value: item.id, label: item.name }))} placeholder="เลือก template" />
            <Input label="ชื่อเอกสาร" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={template?.name ?? documentTypeLabel(documentType)} />
            <div className="document-readiness">
              <Badge status={missing.length ? 'pending' : 'approved'}>{missing.length ? `ขาด ${missing.length} ช่อง` : 'ข้อมูลพร้อม'}</Badge>
              <span>{template ? `${template.placeholders.length} placeholders · ${missing.length ? 'ยังไม่พร้อมเต็มที่' : 'พร้อมสร้าง'}` : 'ยังไม่ได้เลือก template'}</span>
            </div>
            <div className="form-actions full-span">
              <Button variant="secondary" icon={<Eye size={18} />} onClick={preview}>HTML Preview</Button>
              <Button icon={<Download size={18} />} onClick={download} disabled={!template || generating}>{generating ? 'กำลังสร้าง...' : 'ดาวน์โหลด DOCX'}</Button>
            </div>
          </Card>
          <Card className="document-missing-card">
            <div className="section-title-row">
              <h2>Missing info checker</h2>
              <HelpButton topicId="documents.generate" variant="compact" />
            </div>
            {missing.length ? <div className="filter-chip-row">{missing.map((item) => <span className="filter-chip" key={item.field}>{item.label}</span>)}</div> : <p>ไม่มีข้อมูลที่ขาดสำหรับเอกสารประเภทนี้</p>}
          </Card>
          {previewHtml ? <Card className="document-preview-card"><div dangerouslySetInnerHTML={{ __html: previewHtml }} /></Card> : null}
        </>
      ) : null}
    </section>
  );
}
