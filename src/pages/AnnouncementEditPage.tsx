import { Save, UploadCloud } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { StickyActionBar } from '../components/mobile/StickyActionBar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useEventContext } from '../context/EventContext';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { fetchAnnouncement, saveAnnouncement, uploadAnnouncementFile, type AnnouncementInput } from '../services/announcements';
import { errorMessage } from '../utils/error';

export function AnnouncementEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { currentEventId, events } = useEventContext();
  const isNew = !id;
  const state = useAsync(() => (id ? fetchAnnouncement(id) : Promise.resolve(null)), [id]);
  const [form, setForm] = useState<AnnouncementInput>({ title: '', type: 'update', priority: 'normal', audience: 'public', visible: true, event_id: currentEventId });
  const [toast, setToast] = useState<ToastState>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.data) setForm(state.data);
    else if (isNew) setForm((current) => ({ ...current, event_id: currentEventId }));
  }, [currentEventId, isNew, state.data]);

  function patch(values: AnnouncementInput) {
    setForm((current) => ({ ...current, ...values }));
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setSaving(true);
    try {
      const saved = await saveAnnouncement(form);
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกประกาศแล้ว' : 'Announcement saved' });
      navigate(`/admin/announcements/${saved.id}/edit`);
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed') });
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    setSaving(true);
    try {
      const uploaded = await uploadAnnouncementFile(file);
      if (uploaded.type === 'application/pdf') {
        patch({ file_url: uploaded.url });
      } else {
        patch({ image_url: uploaded.url });
      }
      setToast({ type: 'success', message: language === 'th' ? 'อัปโหลดไฟล์แล้ว' : 'File uploaded' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'อัปโหลดไม่สำเร็จ' : 'Upload failed') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack has-sticky-actions">
      <Toast toast={toast} />
      <PageHeader eyebrow="Announcement" title={isNew ? (language === 'th' ? 'สร้างประกาศ' : 'New Announcement') : (language === 'th' ? 'แก้ไขประกาศ' : 'Edit Announcement')} meta={<EventSwitcher compact />} actions={<Link className="btn btn-secondary" to="/admin/announcements">{language === 'th' ? 'กลับ' : 'Back'}</Link>} />
      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}
      <Card>
        <form className="form-grid two-col" onSubmit={save}>
          <Input className="full-span" label={language === 'th' ? 'หัวข้อ' : 'Title'} value={form.title ?? ''} onChange={(event) => patch({ title: event.target.value })} required />
          <label className="field full-span">
            <span>{language === 'th' ? 'รายละเอียด' : 'Description'}</span>
            <textarea rows={5} value={form.description ?? ''} onChange={(event) => patch({ description: event.target.value })} />
          </label>
          <Select label="Type" value={form.type ?? 'update'} onChange={(event) => patch({ type: event.target.value as AnnouncementInput['type'] })} options={['banner', 'schedule', 'map', 'traffic', 'emergency', 'faq', 'update', 'document']} />
          <Select label={language === 'th' ? 'ความสำคัญ' : 'Priority'} value={form.priority ?? 'normal'} onChange={(event) => patch({ priority: event.target.value as AnnouncementInput['priority'] })} options={['critical', 'important', 'normal']} />
          <Select label={language === 'th' ? 'ผู้เห็น' : 'Audience'} value={form.audience ?? 'public'} onChange={(event) => patch({ audience: event.target.value as AnnouncementInput['audience'] })} options={['public', 'staff', 'admin']} />
          <Select label={language === 'th' ? 'กิจกรรม' : 'Event'} value={form.event_id ?? ''} onChange={(event) => patch({ event_id: event.target.value || null })} options={events.map((event) => ({ value: event.id, label: language === 'th' ? event.name_th : event.name_en || event.name_th }))} placeholder={language === 'th' ? 'ทุกกิจกรรม' : 'Global'} />
          <label className="field full-span">
            <span>{language === 'th' ? 'อัปโหลดรูป/PDF' : 'Upload image/PDF'}</span>
            <span className="btn btn-secondary">
              <UploadCloud size={18} />
              {language === 'th' ? 'เลือกไฟล์' : 'Choose file'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </span>
          </label>
          <Input label="Image URL" value={form.image_url ?? ''} onChange={(event) => patch({ image_url: event.target.value })} />
          <Input label="File URL / PDF" value={form.file_url ?? ''} onChange={(event) => patch({ file_url: event.target.value })} />
          <Input label="External URL" value={form.external_url ?? ''} onChange={(event) => patch({ external_url: event.target.value })} />
          <Input label={language === 'th' ? 'เริ่มแสดง' : 'Starts at'} type="datetime-local" value={form.starts_at?.slice(0, 16) ?? ''} onChange={(event) => patch({ starts_at: event.target.value || null })} />
          <Input label={language === 'th' ? 'สิ้นสุด' : 'Ends at'} type="datetime-local" value={form.ends_at?.slice(0, 16) ?? ''} onChange={(event) => patch({ ends_at: event.target.value || null })} />
          <label className="check-field"><input type="checkbox" checked={Boolean(form.visible)} onChange={(event) => patch({ visible: event.target.checked })} /><span>{language === 'th' ? 'เปิดแสดง' : 'Visible'}</span></label>
          <label className="check-field"><input type="checkbox" checked={Boolean(form.is_pinned)} onChange={(event) => patch({ is_pinned: event.target.checked })} /><span>{language === 'th' ? 'ปักหมุด' : 'Pinned'}</span></label>
          <label className="check-field"><input type="checkbox" checked={Boolean(form.is_popup)} onChange={(event) => patch({ is_popup: event.target.checked })} /><span>Popup</span></label>
          <div className="form-actions full-span">
            <Button type="submit" disabled={saving} icon={<Save size={18} />}>{language === 'th' ? 'บันทึกประกาศ' : 'Save'}</Button>
          </div>
        </form>
      </Card>
      <StickyActionBar label={language === 'th' ? 'บันทึกประกาศ' : 'Save announcement'}>
        <Button disabled={saving} icon={<Save size={18} />} onClick={() => void save()}>{language === 'th' ? 'บันทึก' : 'Save'}</Button>
      </StickyActionBar>
    </section>
  );
}
