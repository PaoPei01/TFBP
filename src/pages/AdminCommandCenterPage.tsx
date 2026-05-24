import { AlertTriangle, Bell, CalendarDays, ClipboardCheck, Database, FileText, GitMerge, HeartPulse, Pencil, ShieldCheck, SlidersHorizontal, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { PortalActionCard } from '../components/PortalActionCard';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useLanguage } from '../context/LanguageContext';

export function AdminCommandCenterPage() {
  const { language } = useLanguage();

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Admin"
        title={language === 'th' ? 'ศูนย์ควบคุมระบบ' : 'Admin Command Center'}
        description={language === 'th' ? 'ดูภาพรวม งานที่ควรตรวจสอบ และทางลัดสำหรับจัดการกิจกรรมทั้งหมด' : 'Review system status, urgent tasks, and shortcuts for managing the event.'}
        meta={<EventSwitcher compact />}
        actions={<Link className="btn btn-secondary" to="/admin/dashboard">{language === 'th' ? 'เปิดแดชบอร์ดเดิม' : 'Open legacy dashboard'}</Link>}
      />

      <Card className="event-detail-card admin-command-intro" variant="soft">
        <div className="mobile-row-head">
          <div>
            <strong>{language === 'th' ? 'จัดการระบบจาก hub หลัก' : 'Manage operations from focused hubs'}</strong>
            <span>{language === 'th' ? 'เริ่มจากงานที่ควรตรวจ แล้วค่อยเปิด hub เฉพาะด้านเพื่อลดการไล่หาเมนูยาว ๆ' : 'Start with review work, then open focused hubs instead of scanning one long menu.'}</span>
          </div>
          <Badge status="approved">{language === 'th' ? 'ผู้ดูแลระบบ' : 'Admin'}</Badge>
        </div>
      </Card>

      <section className="command-center-grid" aria-label={language === 'th' ? 'ศูนย์ควบคุมระบบ' : 'Admin command center'}>
        <Card className="command-panel">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">{language === 'th' ? 'งานที่ควรตรวจสอบ' : 'Needs review'}</p>
              <h2>{language === 'th' ? 'งานที่ควรตรวจสอบ' : 'Needs review'}</h2>
              <span>{language === 'th' ? 'ถ้ายังไม่มีตัวเลขสด ให้เปิดหน้าตรวจสอบจากการ์ดเหล่านี้ได้ทันที' : 'Open these checks directly when live counts are not available.'}</span>
            </div>
          </div>
          <div className="needs-review-list">
            <Link className="needs-review-item" to="/admin/requests"><strong><Pencil size={22} /></strong><span>{language === 'th' ? 'คำขอแก้ไขข้อมูลรอตรวจสอบ' : 'Participant edit requests'}</span><em>{language === 'th' ? 'ตรวจสอบ' : 'Review'}</em></Link>
            <Link className="needs-review-item" to="/admin/people/update-requests"><strong><Pencil size={22} /></strong><span>{language === 'th' ? 'คำร้องแก้ข้อมูลบุคคล' : 'People update requests'}</span><em>{language === 'th' ? 'ตรวจสอบ' : 'Review'}</em></Link>
            <Link className="needs-review-item" to="/admin/people/dedupe"><strong><GitMerge size={22} /></strong><span>{language === 'th' ? 'ข้อมูลซ้ำที่ควรตรวจ' : 'Possible duplicates'}</span><em>{language === 'th' ? 'ตรวจสอบ' : 'Review'}</em></Link>
            <Link className="needs-review-item" to="/admin/staff/operations"><strong><UsersRound size={22} /></strong><span>{language === 'th' ? 'ทีมงานยังไม่ครบโควตา' : 'Staff quota issues'}</span><em>{language === 'th' ? 'ตรวจสอบ' : 'Review'}</em></Link>
            <Link className="needs-review-item" to="/admin/emergency"><strong><HeartPulse size={22} /></strong><span>{language === 'th' ? 'ข้อมูลสุขภาพที่ควรตรวจ' : 'Health data to review'}</span><em>{language === 'th' ? 'ตรวจสอบ' : 'Review'}</em></Link>
            <Link className="needs-review-item" to="/admin/documents"><strong><FileText size={22} /></strong><span>{language === 'th' ? 'ข้อมูลเอกสารยังไม่ครบ' : 'Incomplete document setup'}</span><em>{language === 'th' ? 'ตรวจสอบ' : 'Review'}</em></Link>
            <Link className="needs-review-item" to="/admin/system-readiness"><strong><AlertTriangle size={22} /></strong><span>{language === 'th' ? 'ปัญหาความพร้อมระบบ' : 'System readiness issues'}</span><em>{language === 'th' ? 'ตรวจสอบ' : 'Review'}</em></Link>
          </div>
        </Card>

        <Card className="command-panel">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">{language === 'th' ? 'ทางลัดหลัก' : 'Main shortcuts'}</p>
              <h2>{language === 'th' ? 'ทางลัดหลัก' : 'Main shortcuts'}</h2>
              <span>{language === 'th' ? 'เปิด hub หรือเครื่องมือหลักสำหรับจัดการกิจกรรม' : 'Open the main operational hubs and tools.'}</span>
            </div>
          </div>
          <div className="admin-quick-action-grid">
            <Link className="admin-quick-action-card" to="/admin/events"><CalendarDays size={22} /><strong>{language === 'th' ? 'จัดการกิจกรรม' : 'Events'}</strong><span>{language === 'th' ? 'ตั้งค่าและเปิดหน้า event admin' : 'Set up and manage event pages.'}</span></Link>
            <Link className="admin-quick-action-card" to="/admin/people-groups"><Database size={22} /><strong>{language === 'th' ? 'รายชื่อและกลุ่ม' : 'People & Groups'}</strong><span>{language === 'th' ? 'ข้อมูลบุคคล กลุ่ม และคำขอแก้ไข' : 'People, groups, and edit requests.'}</span></Link>
            <Link className="admin-quick-action-card" to="/admin/staff-ops"><UsersRound size={22} /><strong>{language === 'th' ? 'ทีมงาน' : 'Staff Operations'}</strong><span>{language === 'th' ? 'ทีมงาน ใบสมัคร โควตา และคำขอ' : 'Staff, applications, quota, and requests.'}</span></Link>
            <Link className="admin-quick-action-card" to="/admin/staff/attendance"><ClipboardCheck size={22} /><strong>{language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff check-in'}</strong><span>{language === 'th' ? 'รอบเช็กชื่อและ QR' : 'Sessions and QR tools.'}</span></Link>
            <Link className="admin-quick-action-card" to="/admin/emergency"><HeartPulse size={22} /><strong>{language === 'th' ? 'เหตุฉุกเฉิน' : 'Emergency'}</strong><span>{language === 'th' ? 'ข้อมูลช่วยเหลือและความปลอดภัย' : 'Safety and emergency data.'}</span></Link>
            <Link className="admin-quick-action-card" to="/admin/documents"><FileText size={22} /><strong>{language === 'th' ? 'ศูนย์เอกสาร' : 'Document Center'}</strong><span>{language === 'th' ? 'เทมเพลต สร้างไฟล์ และประวัติ' : 'Templates, generation, and history.'}</span></Link>
            <Link className="admin-quick-action-card" to="/admin/data-health"><ShieldCheck size={22} /><strong>{language === 'th' ? 'ตรวจสุขภาพข้อมูล' : 'Data Health'}</strong><span>{language === 'th' ? 'ข้อมูลขาด ซ้ำ หรือเสี่ยง' : 'Missing, duplicate, or risky data.'}</span></Link>
            <Link className="admin-quick-action-card" to="/admin/system-readiness"><SlidersHorizontal size={22} /><strong>{language === 'th' ? 'ตรวจความพร้อมระบบ' : 'System Readiness'}</strong><span>{language === 'th' ? 'ตรวจ production readiness' : 'Production readiness checks.'}</span></Link>
          </div>
        </Card>
      </section>

      <div className="section-heading-row">
        <div>
          <p className="eyebrow">{language === 'th' ? 'เครื่องมือเดิม' : 'Existing tools'}</p>
          <h2>{language === 'th' ? 'เครื่องมือแอดมินทั้งหมด' : 'All admin tools'}</h2>
          <span>{language === 'th' ? 'ยังเข้าถึงเครื่องมือเดิมได้ครบจากตรงนี้' : 'All existing admin routes remain available here.'}</span>
        </div>
      </div>

      <div className="staff-action-grid">
        <PortalActionCard to="/admin/events" icon={<CalendarDays size={28} />} title={language === 'th' ? 'กิจกรรม' : 'Events'} description={language === 'th' ? 'จัดการกิจกรรม หน้า public และใบสมัครตามกิจกรรม' : 'Manage events, public pages, and event applications.'} primary />
        <PortalActionCard to="/admin/people-groups" icon={<Database size={28} />} title={language === 'th' ? 'รายชื่อและกลุ่ม' : 'People & Groups'} description={language === 'th' ? 'ข้อมูลบุคคล กลุ่ม และคำขอแก้ไข' : 'People, groups, and edit requests.'} />
        <PortalActionCard to="/admin/staff-ops" icon={<UsersRound size={28} />} title={language === 'th' ? 'งานทีมงาน' : 'Staff Operations'} description={language === 'th' ? 'ทีมงาน ใบสมัคร โควตา และคำขอ' : 'Staff, applications, quota, and requests.'} />
        <PortalActionCard to="/admin/staff/attendance" icon={<ClipboardCheck size={28} />} title={language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff check-in'} description={language === 'th' ? 'สร้างรอบเช็กชื่อ เปิด QR และดูประวัติการเช็กชื่อ' : 'Create sessions, open QR codes, and review attendance.'} />
        <PortalActionCard to="/admin/documents" icon={<FileText size={28} />} title={language === 'th' ? 'ศูนย์เอกสาร' : 'Document Center'} description={language === 'th' ? 'ตั้งค่า template สร้างเอกสาร และดูประวัติ' : 'Manage templates, generate documents, and view history.'} />
        <PortalActionCard to="/admin/announcements" icon={<Bell size={28} />} title={language === 'th' ? 'ประกาศ' : 'Announcements'} description={language === 'th' ? 'เผยแพร่ประกาศและข้อมูลตามกิจกรรม' : 'Publish event-aware announcements and information.'} />
        <PortalActionCard to="/admin/data-health" icon={<ShieldCheck size={28} />} title={language === 'th' ? 'ตรวจสุขภาพข้อมูล' : 'Data Health'} description={language === 'th' ? 'ตรวจข้อมูลที่หาย ซ้ำ หรือเสี่ยงผิดพลาด' : 'Find missing, duplicate, or risky data.'} />
        <PortalActionCard to="/admin/system-readiness" icon={<SlidersHorizontal size={28} />} title={language === 'th' ? 'ตรวจความพร้อมระบบ' : 'System Readiness'} description={language === 'th' ? 'ตรวจความพร้อมก่อนใช้งานจริง' : 'Check readiness before real operations.'} />
        <PortalActionCard to="/admin/emergency" icon={<HeartPulse size={28} />} title={language === 'th' ? 'เหตุฉุกเฉิน' : 'Emergency'} description={language === 'th' ? 'เปิดข้อมูลช่วยเหลือและสุขภาพตามสิทธิ์ผู้ดูแล' : 'Open emergency support information with admin access.'} />
      </div>
    </section>
  );
}
