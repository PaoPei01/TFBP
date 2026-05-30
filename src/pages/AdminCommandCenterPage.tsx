import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Database,
  FileText,
  GitMerge,
  HeartPulse,
  Pencil,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useLanguage } from '../context/LanguageContext';

export function AdminCommandCenterPage() {
  const { language } = useLanguage();

  return (
    <section className="page-stack admin-command-page">
      <PageHeader
        eyebrow="Admin"
        title={language === 'th' ? 'ศูนย์ควบคุมระบบ' : 'Admin Command Center'}
        description={language === 'th' ? 'เริ่มจากงานที่ควรตรวจสอบ แล้วเปิด hub เฉพาะด้านสำหรับจัดการหน้างานและข้อมูลหลัก' : 'Start with work that needs review, then open focused hubs for live operations and core data.'}
        meta={<EventSwitcher compact />}
        actions={<Link className="btn btn-secondary" to="/admin/dashboard">{language === 'th' ? 'เปิดแดชบอร์ดเดิม' : 'Open legacy dashboard'}</Link>}
      />

      <Card className="event-detail-card admin-command-intro" variant="soft">
        <div className="mobile-row-head">
          <div>
            <strong>{language === 'th' ? 'Command center สำหรับผู้ดูแล' : 'Admin command center'}</strong>
            <span>{language === 'th' ? 'หน้าแอดมินถูกจัดเป็น hub เพื่อลดการไล่หาเมนูยาว และยังเข้าถึง route เดิมได้ครบจากแต่ละ hub' : 'Admin tools are grouped into hubs so the old routes stay reachable without one long tool list.'}</span>
          </div>
          <Badge status="approved">{language === 'th' ? 'ผู้ดูแลระบบ' : 'Admin'}</Badge>
        </div>
      </Card>

      <section className="admin-command-section" aria-labelledby="admin-review-work">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">{language === 'th' ? 'งานที่ควรตรวจสอบ' : 'Needs review'}</p>
            <h2 id="admin-review-work">{language === 'th' ? 'งานที่ควรตรวจสอบ' : 'Needs review'}</h2>
            <span>{language === 'th' ? 'รายการที่มักต้องตัดสินใจหรือแก้ข้อมูลก่อนวันใช้งานจริง' : 'Common review points before live operations.'}</span>
          </div>
        </div>
        <div className="needs-review-list admin-command-review-list">
          <Link className="needs-review-item" to="/admin/requests"><strong><Pencil size={22} /></strong><span>{language === 'th' ? 'คำขอแก้ไขข้อมูลผู้เข้าร่วม' : 'Participant edit requests'}</span><em>{language === 'th' ? 'ตรวจคำขอและอนุมัติข้อมูล' : 'Review and approve updates'}</em></Link>
          <Link className="needs-review-item" to="/admin/people/update-requests"><strong><Pencil size={22} /></strong><span>{language === 'th' ? 'คำร้องแก้ข้อมูลบุคคล' : 'People update requests'}</span><em>{language === 'th' ? 'ตรวจข้อมูลจากฐานกลาง' : 'Check central people data'}</em></Link>
          <Link className="needs-review-item" to="/admin/people/dedupe"><strong><GitMerge size={22} /></strong><span>{language === 'th' ? 'ข้อมูลซ้ำที่ควรตรวจ' : 'Possible duplicates'}</span><em>{language === 'th' ? 'รวม/แยกข้อมูลอย่างระมัดระวัง' : 'Review duplicate records carefully'}</em></Link>
          <Link className="needs-review-item" to="/admin/staff/operations"><strong><UsersRound size={22} /></strong><span>{language === 'th' ? 'โควตาและการจัดทีมงาน' : 'Staff quota and assignments'}</span><em>{language === 'th' ? 'ดูทีมที่ยังต้องเติมคน' : 'Find teams that need attention'}</em></Link>
          <Link className="needs-review-item" to="/admin/data-health"><strong><ShieldCheck size={22} /></strong><span>{language === 'th' ? 'ตรวจสุขภาพข้อมูล' : 'Data health'}</span><em>{language === 'th' ? 'ข้อมูลขาด ซ้ำ หรือเสี่ยงผิดพลาด' : 'Missing, duplicate, or risky data'}</em></Link>
          <Link className="needs-review-item" to="/admin/system-readiness"><strong><AlertTriangle size={22} /></strong><span>{language === 'th' ? 'ตรวจความพร้อมระบบ' : 'System readiness'}</span><em>{language === 'th' ? 'ตรวจความพร้อมก่อนใช้งานจริง' : 'Pre-launch readiness checks'}</em></Link>
        </div>
      </section>

      <section className="admin-command-section" aria-labelledby="admin-live-work">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">{language === 'th' ? 'งานหน้างาน' : 'Live operations'}</p>
            <h2 id="admin-live-work">{language === 'th' ? 'งานหน้างาน' : 'Live operations'}</h2>
            <span>{language === 'th' ? 'เครื่องมือที่ต้องเปิดเร็วระหว่างวันงานหรือช่วงประกาศสำคัญ' : 'Fast access for event-day work and important updates.'}</span>
          </div>
        </div>
        <div className="admin-command-hub-grid admin-command-live-grid">
          <Link className="admin-quick-action-card" to="/admin/staff/attendance"><ClipboardCheck size={22} /><strong>{language === 'th' ? 'เช็กชื่อ' : 'Check-in'}</strong><span>{language === 'th' ? 'สร้างรอบ เปิด QR และดูประวัติการเช็กชื่อ' : 'Create sessions, open QR, and view attendance history.'}</span></Link>
          <Link className="admin-quick-action-card" to="/admin/emergency"><HeartPulse size={22} /><strong>{language === 'th' ? 'เหตุฉุกเฉิน' : 'Emergency'}</strong><span>{language === 'th' ? 'เปิดข้อมูลช่วยเหลือและข้อมูลสุขภาพตามสิทธิ์' : 'Open safety and support information with admin access.'}</span></Link>
          <Link className="admin-quick-action-card" to="/admin/announcements"><Bell size={22} /><strong>{language === 'th' ? 'ประกาศ' : 'Announcements'}</strong><span>{language === 'th' ? 'เผยแพร่ประกาศและข้อมูลตามกิจกรรม' : 'Publish event-aware announcements and updates.'}</span></Link>
        </div>
      </section>

      <section className="admin-command-section" aria-labelledby="admin-main-hubs">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">{language === 'th' ? 'ศูนย์จัดการหลัก' : 'Main hubs'}</p>
            <h2 id="admin-main-hubs">{language === 'th' ? 'ศูนย์จัดการหลัก' : 'Main hubs'}</h2>
            <span>{language === 'th' ? 'เริ่มจาก hub เหล่านี้แทนการไล่เมนูย่อยทีละรายการ' : 'Start from these hubs instead of scanning deep tools one by one.'}</span>
          </div>
        </div>
        <div className="admin-command-hub-grid">
          <Link className="admin-quick-action-card" to="/admin/events"><CalendarDays size={22} /><strong>{language === 'th' ? 'กิจกรรม' : 'Events'}</strong><span>{language === 'th' ? 'ตั้งค่า event หน้า public ใบสมัคร และประกาศ' : 'Manage events, public pages, applications, and announcements.'}</span></Link>
          <Link className="admin-quick-action-card" to="/admin/staff-ops"><UsersRound size={22} /><strong>{language === 'th' ? 'ใบสมัคร/ทีมงาน' : 'Applications / Staff'}</strong><span>{language === 'th' ? 'ใบสมัคร รายชื่อทีมงาน โควตา และคำขอแก้ไข' : 'Applications, roster, quota, and staff requests.'}</span></Link>
          <Link className="admin-quick-action-card" to="/admin/people-groups"><Database size={22} /><strong>{language === 'th' ? 'รายชื่อและกลุ่ม' : 'People & Groups'}</strong><span>{language === 'th' ? 'ข้อมูลบุคคล กลุ่ม คำขอแก้ไข และนำเข้าข้อมูล' : 'People, groups, edit requests, and imports.'}</span></Link>
          <Link className="admin-quick-action-card" to="/admin/documents"><FileText size={22} /><strong>{language === 'th' ? 'ศูนย์เอกสาร' : 'Document Center'}</strong><span>{language === 'th' ? 'ตั้งค่าเทมเพลต สร้างไฟล์ และดูประวัติ' : 'Manage templates, generate files, and view history.'}</span></Link>
          <Link className="admin-quick-action-card" to="/admin/system-readiness"><SlidersHorizontal size={22} /><strong>{language === 'th' ? 'ระบบ' : 'System'}</strong><span>{language === 'th' ? 'ตรวจความพร้อมระบบ ประวัติ และสุขภาพข้อมูล' : 'Review readiness, logs, and data health.'}</span></Link>
        </div>
      </section>
    </section>
  );
}
