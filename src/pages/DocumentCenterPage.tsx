import { FileText, History, Settings, Upload, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { useAsync } from '../hooks/useAsync';
import { fetchDocumentCenterData } from '../services/documents';

export function DocumentCenterPage() {
  const state = useAsync(fetchDocumentCenterData, []);
  const data = state.data;
  return (
    <section className="page-stack document-center-page">
      <PageHeader
        eyebrow="Document Center"
        title="ศูนย์เอกสารกิจกรรม"
        description="จัดการข้อมูลโครงการ เทมเพลต และสร้างเอกสาร DOCX สำหรับงานสานสัมพันธ์"
        actions={<HelpButton topicId="documents.overview" variant="link" />}
      />
      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}
      {data ? (
        <>
          <div className="stats-grid">
            <DashboardStatCard label="ข้อมูลโครงการ" value={data.profile?.project_name ? 'พร้อม' : 'ยังไม่ครบ'} icon={<Settings size={20} />} />
            <DashboardStatCard label="เทมเพลต DOCX" value={data.templates.length} icon={<FileText size={20} />} />
            <DashboardStatCard label="ประวัติเอกสาร" value={data.history.length} icon={<History size={20} />} />
          </div>
          <div className="document-action-grid">
            <Link className="document-action-card" to="/admin/documents/settings"><Settings size={22} /><strong>ตั้งค่าโครงการ</strong><span>ข้อมูลหลัก งบประมาณ กำหนดการ สถานที่ และอุปกรณ์</span></Link>
            <Link className="document-action-card" to="/admin/documents/templates"><Upload size={22} /><strong>เทมเพลต DOCX</strong><span>อัปโหลดไฟล์ .docx พร้อม placeholder เช่น {'{project_name}'}</span></Link>
            <Link className="document-action-card" to="/admin/documents/generate"><Wand2 size={22} /><strong>สร้างเอกสาร</strong><span>เช็กข้อมูลที่ขาด ดู preview และดาวน์โหลด DOCX</span></Link>
            <Link className="document-action-card" to="/admin/documents/history"><History size={22} /><strong>ประวัติเอกสาร</strong><span>ดูรายการเอกสารที่เคย generate</span></Link>
          </div>
          <Card className="privacy-notice">
            <strong>Admin only</strong>
            <span>ศูนย์เอกสารไม่ดึงข้อมูลส่วนตัวผู้เข้าร่วม และถูกป้องกันด้วย AdminGuard + Supabase RLS</span>
          </Card>
        </>
      ) : null}
    </section>
  );
}
