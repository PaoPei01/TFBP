import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardCheck,
  Database,
  FileText,
  HeartPulse,
  Shield,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';

type AdminNavItem = {
  to: string;
  titleTh: string;
  titleEn: string;
  descriptionTh?: string;
  descriptionEn?: string;
  icon: ReactNode;
  groupTh: string;
  groupEn: string;
};

const adminHubItems: AdminNavItem[] = [
  {
    to: '/admin',
    titleTh: 'ศูนย์ควบคุมระบบ',
    titleEn: 'Command Center',
    descriptionTh: 'งานที่ควรตรวจสอบและ hub หลัก',
    descriptionEn: 'Review work and main hubs',
    icon: <Shield size={18} />,
    groupTh: 'ภาพรวม',
    groupEn: 'Overview',
  },
  {
    to: '/admin/events',
    titleTh: 'กิจกรรม',
    titleEn: 'Events',
    descriptionTh: 'กิจกรรม ประกาศ และหน้า public',
    descriptionEn: 'Events, announcements, and public pages',
    icon: <CalendarDays size={18} />,
    groupTh: 'ศูนย์จัดการหลัก',
    groupEn: 'Main hubs',
  },
  {
    to: '/admin/staff-ops',
    titleTh: 'ใบสมัคร/ทีมงาน',
    titleEn: 'Applications / Staff',
    descriptionTh: 'ใบสมัคร โควตา รายชื่อทีมงาน',
    descriptionEn: 'Applications, quota, and staff roster',
    icon: <UsersRound size={18} />,
    groupTh: 'ศูนย์จัดการหลัก',
    groupEn: 'Main hubs',
  },
  {
    to: '/admin/people-groups',
    titleTh: 'รายชื่อและกลุ่ม',
    titleEn: 'People & Groups',
    descriptionTh: 'ข้อมูลบุคคล กลุ่ม และคำขอแก้ไข',
    descriptionEn: 'People, groups, and requests',
    icon: <Database size={18} />,
    groupTh: 'ศูนย์จัดการหลัก',
    groupEn: 'Main hubs',
  },
  {
    to: '/admin/staff/attendance',
    titleTh: 'เช็กชื่อ',
    titleEn: 'Check-in',
    descriptionTh: 'รอบเช็กชื่อและ QR',
    descriptionEn: 'Sessions and QR tools',
    icon: <ClipboardCheck size={18} />,
    groupTh: 'งานหน้างาน',
    groupEn: 'Live operations',
  },
  {
    to: '/admin/documents',
    titleTh: 'ศูนย์เอกสาร',
    titleEn: 'Document Center',
    descriptionTh: 'เทมเพลต สร้างไฟล์ และประวัติ',
    descriptionEn: 'Templates, generation, and history',
    icon: <FileText size={18} />,
    groupTh: 'ศูนย์จัดการหลัก',
    groupEn: 'Main hubs',
  },
  {
    to: '/admin/emergency',
    titleTh: 'เหตุฉุกเฉิน',
    titleEn: 'Emergency',
    descriptionTh: 'ข้อมูลช่วยเหลือและความปลอดภัย',
    descriptionEn: 'Safety and emergency data',
    icon: <HeartPulse size={18} />,
    groupTh: 'งานหน้างาน',
    groupEn: 'Live operations',
  },
  {
    to: '/admin/system-readiness',
    titleTh: 'ระบบ',
    titleEn: 'System',
    descriptionTh: 'ตรวจสุขภาพข้อมูลและความพร้อมระบบ',
    descriptionEn: 'Data health and readiness',
    icon: <SlidersHorizontal size={18} />,
    groupTh: 'ระบบ',
    groupEn: 'System',
  },
];

const deepRouteLabels: Array<{ prefix: string; hub: string; titleTh: string; titleEn: string }> = [
  { prefix: '/admin/dashboard', hub: '/admin', titleTh: 'แดชบอร์ดเดิม', titleEn: 'Legacy dashboard' },
  { prefix: '/admin/announcements', hub: '/admin/events', titleTh: 'ประกาศ', titleEn: 'Announcements' },
  { prefix: '/admin/events', hub: '/admin/events', titleTh: 'กิจกรรม', titleEn: 'Events' },
  { prefix: '/admin/staff-ops', hub: '/admin/staff-ops', titleTh: 'ใบสมัคร/ทีมงาน', titleEn: 'Applications / Staff' },
  { prefix: '/admin/staff/import', hub: '/admin/staff-ops', titleTh: 'นำเข้าสตาฟ', titleEn: 'Import staff' },
  { prefix: '/admin/staff/requests', hub: '/admin/staff-ops', titleTh: 'คำขอทีมงาน', titleEn: 'Staff requests' },
  { prefix: '/admin/staff/operations', hub: '/admin/staff-ops', titleTh: 'โควตา/งานทีมงาน', titleEn: 'Staff operations' },
  { prefix: '/admin/staff/attendance', hub: '/admin/staff/attendance', titleTh: 'เช็กชื่อ', titleEn: 'Check-in' },
  { prefix: '/admin/staff', hub: '/admin/staff-ops', titleTh: 'รายชื่อทีมงาน', titleEn: 'Staff roster' },
  { prefix: '/admin/people/update-requests', hub: '/admin/people-groups', titleTh: 'คำร้องแก้ข้อมูลบุคคล', titleEn: 'People update requests' },
  { prefix: '/admin/people/dedupe', hub: '/admin/people-groups', titleTh: 'ตรวจข้อมูลซ้ำ', titleEn: 'Duplicate check' },
  { prefix: '/admin/people/import-year2', hub: '/admin/people-groups', titleTh: 'นำเข้าฐานปี 2', titleEn: 'Import Year 2' },
  { prefix: '/admin/requests', hub: '/admin/people-groups', titleTh: 'คำขอแก้ไขข้อมูล', titleEn: 'Edit requests' },
  { prefix: '/admin/people-groups', hub: '/admin/people-groups', titleTh: 'รายชื่อและกลุ่ม', titleEn: 'People & Groups' },
  { prefix: '/admin/people', hub: '/admin/people-groups', titleTh: 'ฐานข้อมูลบุคคล', titleEn: 'People database' },
  { prefix: '/admin/groups', hub: '/admin/people-groups', titleTh: 'จัดกลุ่ม', titleEn: 'Groups' },
  { prefix: '/admin/documents/settings', hub: '/admin/documents', titleTh: 'ข้อมูลตั้งต้นเอกสาร', titleEn: 'Document settings' },
  { prefix: '/admin/documents/templates', hub: '/admin/documents', titleTh: 'เทมเพลตเอกสาร', titleEn: 'Document templates' },
  { prefix: '/admin/documents/generate', hub: '/admin/documents', titleTh: 'สร้างเอกสาร', titleEn: 'Generate documents' },
  { prefix: '/admin/documents/history', hub: '/admin/documents', titleTh: 'ประวัติเอกสาร', titleEn: 'Document history' },
  { prefix: '/admin/documents', hub: '/admin/documents', titleTh: 'ศูนย์เอกสาร', titleEn: 'Document Center' },
  { prefix: '/admin/data-health', hub: '/admin/system-readiness', titleTh: 'ตรวจสุขภาพข้อมูล', titleEn: 'Data health' },
  { prefix: '/admin/system-readiness', hub: '/admin/system-readiness', titleTh: 'ตรวจความพร้อมระบบ', titleEn: 'System readiness' },
  { prefix: '/admin/logs', hub: '/admin/system-readiness', titleTh: 'ประวัติระบบ', titleEn: 'System logs' },
  { prefix: '/admin/emergency', hub: '/admin/emergency', titleTh: 'เหตุฉุกเฉิน', titleEn: 'Emergency' },
];

function label(item: Pick<AdminNavItem, 'titleTh' | 'titleEn'>, language: 'th' | 'en') {
  return language === 'th' ? item.titleTh : item.titleEn;
}

function routeMatch(pathname: string) {
  return [...deepRouteLabels].sort((a, b) => b.prefix.length - a.prefix.length).find((item) => pathname.startsWith(item.prefix));
}

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const { language } = useLanguage();
  const location = useLocation();
  const matchedRoute = routeMatch(location.pathname);
  const hub = adminHubItems.find((item) => item.to === (matchedRoute?.hub ?? '/admin')) ?? adminHubItems[0];
  const currentTitle = matchedRoute ? (language === 'th' ? matchedRoute.titleTh : matchedRoute.titleEn) : label(hub, language);

  return (
    <div className="admin-shell">
      <aside className="admin-shell-sidebar" aria-label={language === 'th' ? 'เมนูแอดมินหลัก' : 'Primary admin navigation'}>
        <div className="admin-shell-sidebar-head">
          <strong>{language === 'th' ? 'แอดมิน' : 'Admin'}</strong>
          <span>{language === 'th' ? 'ศูนย์ปฏิบัติการ' : 'Operations'}</span>
        </div>
        <nav className="admin-shell-nav">
          {adminHubItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) => `admin-shell-nav-link ${isActive || hub.to === item.to ? 'active' : ''}`}
            >
              {item.icon}
              <span>
                <strong>{label(item, language)}</strong>
                <small>{language === 'th' ? item.descriptionTh : item.descriptionEn}</small>
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-shell-main">
        <nav className="admin-breadcrumbs" aria-label={language === 'th' ? 'ตำแหน่งในแอดมิน' : 'Admin breadcrumbs'}>
          <Link to="/admin">{language === 'th' ? 'แอดมิน' : 'Admin'}</Link>
          {hub.to !== '/admin' ? <Link to={hub.to}>{label(hub, language)}</Link> : null}
          <span aria-current="page">{currentTitle}</span>
        </nav>
        {children}
      </div>
    </div>
  );
}

export { adminHubItems };
