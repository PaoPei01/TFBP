import { FileText, History, Settings, Upload, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { DocumentEventContextCard } from '../components/documents/DocumentEventContextCard';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { useEventContext } from '../context/EventContext';
import { useAsync } from '../hooks/useAsync';
import { fetchDocumentCenterData } from '../services/documents';

export function DocumentCenterPage() {
  const { currentEventId } = useEventContext();
  const state = useAsync(() => fetchDocumentCenterData(currentEventId), [currentEventId]);
  const data = state.data;
  return (
    <section className="page-stack document-center-page">
      <PageHeader
        eyebrow="ศูนย์เอกสาร"
        title="ศูนย์เอกสาร"
        description="จัดการข้อมูลตั้งต้น เทมเพลตเอกสาร และสร้างไฟล์เอกสารพร้อมใช้งาน"
        meta={<EventSwitcher compact />}
        actions={<HelpButton topicId="documents.overview" variant="link" />}
      />
      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}
      {data ? (
        <>
          <DocumentEventContextCard />
          <div className="stats-grid">
            <DashboardStatCard label="ข้อมูลตั้งต้นเอกสาร" value={data.profile?.project_name ? 'พร้อม' : 'ยังไม่ครบ'} icon={<Settings size={20} />} />
            <DashboardStatCard label="เทมเพลตเอกสาร" value={data.templates.length} icon={<FileText size={20} />} />
            <DashboardStatCard label="ประวัติเอกสาร" value={data.history.length} icon={<History size={20} />} />
          </div>
          <div className="document-action-grid">
            <Link className="document-action-card" to="/admin/documents/settings"><Settings size={22} /><strong>ข้อมูลตั้งต้นเอกสาร</strong><span>ข้อมูลหลัก งบประมาณ กำหนดการ สถานที่ และอุปกรณ์</span></Link>
            <Link className="document-action-card" to="/admin/documents/templates"><Upload size={22} /><strong>เทมเพลตเอกสาร</strong><span>อัปโหลดไฟล์ .docx พร้อมช่องข้อมูล เช่น {'{project_name}'}</span></Link>
            <Link className="document-action-card" to="/admin/documents/generate"><Wand2 size={22} /><strong>สร้างไฟล์เอกสาร</strong><span>ตรวจข้อมูลที่ยังขาด ดูตัวอย่าง และดาวน์โหลดเอกสาร</span></Link>
            <Link className="document-action-card" to="/admin/documents/history"><History size={22} /><strong>ประวัติเอกสาร</strong><span>ดูรายการเอกสารที่เคยสร้าง</span></Link>
          </div>
          <Card className="privacy-notice">
            <strong>สำหรับผู้ดูแลเท่านั้น</strong>
            <span>ศูนย์เอกสารไม่แสดงข้อมูลส่วนตัวของผู้เข้าร่วมต่อสาธารณะ และยังอยู่ภายใต้สิทธิ์ผู้ดูแลกับ Supabase RLS</span>
          </Card>
        </>
      ) : null}
    </section>
  );
}
