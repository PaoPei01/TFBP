import { Bell, Eye, FileText, QrCode, RefreshCw, Save, Settings, UserCheck, UserPlus, UsersRound } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { getEventContent } from '../lib/eventContent';
import type { EventRecord, EventStatus, EventVisibility } from '../lib/eventTypes';
import { adminEventApplicationPreviewPath, adminEventApplicationsPath, eventPath } from '../lib/eventRoutes';
import { fetchAdminEventOverview, updateAdminEvent } from '../services/events';
import { errorMessage } from '../utils/error';

const statuses: EventStatus[] = ['draft', 'published', 'registration_open', 'staff_recruiting', 'active', 'completed', 'archived'];
const visibilities: EventVisibility[] = ['private', 'unlisted', 'public'];

function emptyForm(): Partial<EventRecord> {
  return {
    name_th: '',
    name_en: '',
    slug: '',
    description: '',
    event_type: 'activity',
    academic_year: '',
    start_date: '',
    end_date: '',
    location: '',
    status: 'draft',
    visibility: 'private',
    cover_image_path: '',
  };
}

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

function visibilityLabel(visibility: string, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    public: { th: 'สาธารณะ', en: 'Public' },
    unlisted: { th: 'มีลิงก์เท่านั้น', en: 'Unlisted' },
    private: { th: 'ส่วนตัว', en: 'Private' },
  };
  return labels[visibility]?.[language] ?? visibility;
}

function QuickAction({ to, icon, title, description, primary = false }: { to: string; icon: ReactNode; title: string; description: string; primary?: boolean }) {
  return (
    <Link className={`event-operation-action ${primary ? 'event-operation-action-primary' : ''}`} to={to}>
      {icon}
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </Link>
  );
}

export function AdminEventDetailPage() {
  const { language } = useLanguage();
  const { eventId = '' } = useParams();
  const state = useAsync(() => fetchAdminEventOverview(eventId), [eventId]);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const [form, setForm] = useState<Partial<EventRecord>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const overview = state.data;
  const event = overview?.event ?? null;
  const content = getEventContent(event?.slug ?? '');
  const recruitmentCapacity = content?.staffRecruitment?.capacity ?? null;
  const remainingCapacity = recruitmentCapacity == null ? null : Math.max(recruitmentCapacity - (overview?.approved_staff_application_count ?? 0), 0);
  const isRecruitmentEvent = event?.slug === 'parent-orientation-staff-2569' || event?.event_type === 'staff_recruitment';
  const overviewCards = useMemo(() => {
    if (!overview || !event) return [];
    return [
      { label: language === 'th' ? 'สถานะกิจกรรม' : 'Event status', value: statusLabel(event.status, language), icon: <Settings size={20} /> },
      { label: language === 'th' ? 'การมองเห็น' : 'Visibility', value: visibilityLabel(event.visibility, language) },
      { label: language === 'th' ? 'ลงทะเบียนผู้เข้าร่วม' : 'Participant registrations', value: overview.participant_count, icon: <UsersRound size={20} /> },
      { label: language === 'th' ? 'ใบสมัครสตาฟ' : 'Staff applications', value: overview.staff_application_count, icon: <UserPlus size={20} /> },
      { label: language === 'th' ? 'สตาฟที่อนุมัติ' : 'Approved staff', value: overview.approved_staff_application_count, icon: <UserCheck size={20} /> },
      { label: language === 'th' ? 'สำรอง' : 'Waitlisted', value: overview.waitlisted_count },
      { label: language === 'th' ? 'ไม่ผ่าน' : 'Rejected', value: overview.rejected_count },
      { label: language === 'th' ? 'ยังไม่ระบุหน้าที่' : 'Missing final duty', value: overview.missing_final_duty_count },
      { label: language === 'th' ? 'รอบเช็กชื่อ' : 'Attendance sessions', value: overview.attendance_session_count, icon: <QrCode size={20} /> },
      { label: language === 'th' ? 'ประกาศ' : 'Announcements', value: overview.announcement_count, icon: <Bell size={20} /> },
      { label: language === 'th' ? 'เอกสารที่สร้าง' : 'Generated documents', value: overview.document_count, icon: <FileText size={20} /> },
    ];
  }, [event, language, overview]);

  useEffect(() => {
    if (!event) return;
    setForm({
      name_th: event.name_th,
      name_en: event.name_en ?? '',
      slug: event.slug,
      description: event.description ?? '',
      event_type: event.event_type ?? 'activity',
      academic_year: event.academic_year ?? '',
      start_date: event.start_date ?? '',
      end_date: event.end_date ?? '',
      location: event.location ?? '',
      status: event.status,
      visibility: event.visibility,
      cover_image_path: event.cover_image_path ?? '',
    });
  }, [event]);

  async function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    if (!event) return;
    try {
      setSaving(true);
      await updateAdminEvent(event.id, {
        ...form,
        name_en: form.name_en || null,
        description: form.description || null,
        event_type: form.event_type || null,
        academic_year: form.academic_year || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        location: form.location || null,
        cover_image_path: form.cover_image_path || null,
      });
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกกิจกรรมแล้ว' : 'Event saved' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกกิจกรรมไม่สำเร็จ' : 'Could not save event') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="events-page page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Event Admin"
        title={event ? eventName(event, language) : (language === 'th' ? 'จัดการกิจกรรม' : 'Manage Event')}
        description={language === 'th' ? 'ภาพรวมการปฏิบัติงานของกิจกรรม พร้อมตั้งค่าข้อมูลหลักในแท็บ Settings' : 'Operational overview for this event, with metadata settings kept in the Settings tab.'}
        meta={<EventSwitcher compact />}
        actions={(
          <>
            <HelpButton topicId="events.overview" variant="link" />
            {event ? <Link className="btn btn-secondary" to={eventPath(event.slug)}><Eye size={17} />{language === 'th' ? 'ดูหน้าสาธารณะ' : 'Public page'}</Link> : null}
            {event?.event_type === 'staff_recruitment' ? <Link className="btn btn-secondary" to={adminEventApplicationPreviewPath(event.id)}><Eye size={17} />{language === 'th' ? 'พรีวิวใบสมัคร' : 'Preview application'}</Link> : null}
            {event?.event_type === 'staff_recruitment' ? <Link className="btn btn-secondary" to={adminEventApplicationsPath(event.id)}>{language === 'th' ? 'ใบสมัคร' : 'Applications'}</Link> : null}
            <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>
          </>
        )}
      />

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <EmptyState title={language === 'th' ? 'โหลดกิจกรรมไม่สำเร็จ' : 'Could not load event'} action={<Button variant="secondary" onClick={state.reload}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>} /> : null}
      {!state.loading && !state.error && !event ? (
        <EmptyState title={language === 'th' ? 'ไม่พบกิจกรรมนี้' : 'Event not found'} action={<Link className="btn btn-primary" to="/admin/events">{language === 'th' ? 'กลับไปรายการกิจกรรม' : 'Back to events'}</Link>} />
      ) : null}

      {event ? (
        <div className="page-stack">
          <div className="event-detail-tabs" role="tablist" aria-label={language === 'th' ? 'ส่วนจัดการกิจกรรม' : 'Event admin sections'}>
            <button type="button" className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')} role="tab" aria-selected={activeTab === 'overview'}>
              {language === 'th' ? 'ภาพรวม' : 'Overview'}
            </button>
            <button type="button" className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')} role="tab" aria-selected={activeTab === 'settings'}>
              {language === 'th' ? 'ตั้งค่า' : 'Settings'}
            </button>
          </div>

          {activeTab === 'overview' ? (
            <div className="page-stack">
              <Card className="event-operations-hero" variant="soft">
                <div>
                  <span className={`status-pill status-${event.status}`}>{statusLabel(event.status, language)}</span>
                  <span className={`status-pill status-${event.visibility}`}>{visibilityLabel(event.visibility, language)}</span>
                </div>
                <h2>{language === 'th' ? 'งานที่ต้องทำต่อ' : 'Next actions'}</h2>
                <p>{language === 'th' ? 'เริ่มจากดูใบสมัคร สร้างรอบเช็กชื่อ ประกาศข้อมูล และเตรียมเอกสารสำหรับกิจกรรมนี้' : 'Start with applications, attendance sessions, announcements, and documents for this event.'}</p>
                <div className="event-operation-actions">
                  <QuickAction to="#event-info" icon={<Settings size={20} />} title={language === 'th' ? 'ข้อมูลกิจกรรม' : 'Event info'} description={language === 'th' ? 'สถานะ การมองเห็น และตัวเลขสรุป' : 'Status, visibility, and summary metrics'} primary />
                  {isRecruitmentEvent ? <QuickAction to={adminEventApplicationPreviewPath(event.id)} icon={<Eye size={20} />} title={language === 'th' ? 'พรีวิวใบสมัคร' : 'Application preview'} description={language === 'th' ? 'ดูหน้าฟอร์มโดยไม่ต้องสมัครจริง' : 'Review the form without submitting'} /> : null}
                  <QuickAction to={adminEventApplicationsPath(event.id)} icon={<UserPlus size={20} />} title={language === 'th' ? 'สมัครทีมงาน' : 'Staff application'} description={language === 'th' ? 'เปิดหน้ารีวิวใบสมัครทีมงาน' : 'Open staff application review'} />
                  <QuickAction to={adminEventApplicationsPath(event.id)} icon={<UsersRound size={20} />} title={language === 'th' ? 'ใบสมัคร' : 'Applications'} description={language === 'th' ? 'รีวิวและจัดหน้าที่' : 'Review and assign duties'} />
                  <QuickAction to="/admin/staff/attendance" icon={<QrCode size={20} />} title={language === 'th' ? 'สร้างรอบเช็กชื่อ' : 'Create attendance session'} description={language === 'th' ? 'ใช้ event ที่เลือกใน EventSwitcher' : 'Uses selected EventSwitcher event'} />
                  <QuickAction to="/admin/announcements" icon={<Bell size={20} />} title={language === 'th' ? 'ประกาศ' : 'Announcements'} description={language === 'th' ? 'ประกาศตามกิจกรรม' : 'Event-aware announcements'} />
                  <QuickAction to={eventPath(event.slug)} icon={<Eye size={20} />} title={language === 'th' ? 'หน้าสาธารณะ' : 'Public page'} description={language === 'th' ? 'ตรวจสิ่งที่ผู้ใช้เห็น' : 'Check public-facing details'} />
                  <QuickAction to="#event-info" icon={<UserCheck size={20} />} title={language === 'th' ? 'สถานะ' : 'Status'} description={language === 'th' ? 'ดูสถานะกิจกรรมและความพร้อม' : 'Review status and readiness'} />
                  <QuickAction to="/admin/documents" icon={<FileText size={20} />} title={language === 'th' ? 'เปิดศูนย์เอกสาร' : 'Open Document Center'} description={language === 'th' ? 'ข้อมูลตั้งต้นและเอกสารของกิจกรรม' : 'Event document settings and files'} />
                </div>
              </Card>

              <div className="stats-grid" id="event-info">
                {overviewCards.map((card) => (
                  <DashboardStatCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
                ))}
              </div>

              {isRecruitmentEvent ? (
                <Card className="event-detail-card">
                  <div className="split-panel">
                    <div>
                      <p className="eyebrow">{language === 'th' ? 'เปิดรับสตาฟ' : 'Staff recruitment'}</p>
                      <h2>{language === 'th' ? 'สรุปใบสมัครงานปฐมนิเทศนักศึกษาใหม่' : 'Recruitment summary'}</h2>
                      <p>{language === 'th' ? 'ใช้ดูภาพรวมกำลังคนก่อนจัดหน้าที่จริง' : 'Use this before assigning final duties.'}</p>
                    </div>
                    <Link className="btn btn-primary" to={adminEventApplicationsPath(event.id)}><UserPlus size={17} />{language === 'th' ? 'จัดการใบสมัคร' : 'Manage applications'}</Link>
                  </div>
                  <div className="event-stat-grid">
                    <span><strong>{recruitmentCapacity ?? '-'}</strong>{language === 'th' ? 'ความจุที่ตั้งไว้' : 'Capacity'}</span>
                    <span><strong>{overview?.staff_application_count ?? 0}</strong>{language === 'th' ? 'ใบสมัครทั้งหมด' : 'Total applications'}</span>
                    <span><strong>{overview?.approved_staff_application_count ?? 0}</strong>{language === 'th' ? 'ผ่านการคัดเลือก' : 'Approved'}</span>
                    <span><strong>{remainingCapacity ?? '-'}</strong>{language === 'th' ? 'จำนวนที่ยังรับได้โดยประมาณ' : 'Estimated remaining'}</span>
                    <span><strong>{overview?.missing_final_duty_count ?? 0}</strong>{language === 'th' ? 'ยังไม่ระบุหน้าที่สุดท้าย' : 'Missing final duty'}</span>
                  </div>
                </Card>
              ) : null}
            </div>
          ) : (
            <form className="page-stack" onSubmit={submit}>
              <Card className="event-form-card">
                <div>
                  <p className="eyebrow">{language === 'th' ? 'ข้อมูลหลัก' : 'Core details'}</p>
                  <h2>{language === 'th' ? 'รายละเอียดกิจกรรม' : 'Event details'}</h2>
                </div>
                <div className="form-grid">
                  <Input label={language === 'th' ? 'ชื่อกิจกรรม (ไทย)' : 'Thai name'} value={form.name_th ?? ''} onChange={(inputEvent) => setForm({ ...form, name_th: inputEvent.target.value })} required />
                  <Input label={language === 'th' ? 'ชื่อกิจกรรม (อังกฤษ)' : 'English name'} value={form.name_en ?? ''} onChange={(inputEvent) => setForm({ ...form, name_en: inputEvent.target.value })} />
                  <Input label="Slug" value={form.slug ?? ''} onChange={(inputEvent) => setForm({ ...form, slug: inputEvent.target.value })} required />
                  <Input label={language === 'th' ? 'ประเภทกิจกรรม' : 'Event type'} value={form.event_type ?? ''} onChange={(inputEvent) => setForm({ ...form, event_type: inputEvent.target.value })} />
                  <Input label={language === 'th' ? 'ปีการศึกษา' : 'Academic year'} value={form.academic_year ?? ''} onChange={(inputEvent) => setForm({ ...form, academic_year: inputEvent.target.value })} />
                  <Input label={language === 'th' ? 'สถานที่' : 'Location'} value={form.location ?? ''} onChange={(inputEvent) => setForm({ ...form, location: inputEvent.target.value })} />
                  <Input label={language === 'th' ? 'วันเริ่ม' : 'Start date'} type="date" value={form.start_date ?? ''} onChange={(inputEvent) => setForm({ ...form, start_date: inputEvent.target.value })} />
                  <Input label={language === 'th' ? 'วันสิ้นสุด' : 'End date'} type="date" value={form.end_date ?? ''} onChange={(inputEvent) => setForm({ ...form, end_date: inputEvent.target.value })} />
                  <Select label={language === 'th' ? 'สถานะ' : 'Status'} value={form.status ?? 'draft'} onChange={(inputEvent) => setForm({ ...form, status: inputEvent.target.value as EventStatus })} options={statuses} />
                  <Select label={language === 'th' ? 'การมองเห็น' : 'Visibility'} value={form.visibility ?? 'private'} onChange={(inputEvent) => setForm({ ...form, visibility: inputEvent.target.value as EventVisibility })} options={visibilities} />
                  <label className="field full-span">
                    <span>{language === 'th' ? 'คำอธิบาย' : 'Description'}</span>
                    <textarea value={form.description ?? ''} onChange={(inputEvent) => setForm({ ...form, description: inputEvent.target.value })} rows={4} />
                  </label>
                </div>
              </Card>
              <div className="form-actions">
                <Link className="btn btn-secondary" to="/admin/events">{language === 'th' ? 'กลับ' : 'Back'}</Link>
                <Button type="submit" icon={<Save size={18} />} loading={saving}>{language === 'th' ? 'บันทึก' : 'Save'}</Button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}
