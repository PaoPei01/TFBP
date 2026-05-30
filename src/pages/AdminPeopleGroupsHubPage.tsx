import { Database, FileSpreadsheet, GitMerge, Pencil, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useLanguage } from '../context/LanguageContext';

const hubItems = [
  {
    to: '/admin/people',
    icon: <Database size={24} />,
    titleTh: 'ค้นหาข้อมูลบุคคล',
    titleEn: 'Search central records',
    bodyTh: 'ค้นหาและตรวจข้อมูลกลางของนักศึกษา ทีมงาน และผู้เข้าร่วม',
    bodyEn: 'Search and inspect central records for students, staff, and participants.',
    badgeTh: 'ข้อมูลกลาง',
    badgeEn: 'Directory',
  },
  {
    to: '/admin/people/dedupe',
    icon: <GitMerge size={24} />,
    titleTh: 'ตรวจข้อมูลซ้ำ',
    titleEn: 'Duplicate check',
    bodyTh: 'ตรวจรายการที่อาจเป็นคนเดียวกันก่อนรวมข้อมูล',
    bodyEn: 'Review records that may belong to the same person before merging.',
    badgeTh: 'ข้อมูลที่ควรตรวจ',
    badgeEn: 'Data quality',
  },
  {
    to: '/admin/people/update-requests',
    icon: <Pencil size={24} />,
    titleTh: 'คำร้องแก้ข้อมูล',
    titleEn: 'People update requests',
    bodyTh: 'ตรวจคำร้องที่เกี่ยวกับ CMU Mail เบอร์โทร และข้อมูลยืนยันตัวตน',
    bodyEn: 'Review requests for CMU Mail, phone, and identity data.',
    badgeTh: 'รอตรวจ',
    badgeEn: 'Review',
  },
  {
    to: '/admin/requests',
    icon: <Pencil size={24} />,
    titleTh: 'คำขอแก้ไขผู้เข้าร่วม',
    titleEn: 'Participant edit requests',
    bodyTh: 'ตรวจคำขอจากหน้า “ข้อมูลผู้เข้าร่วม” ของผู้เข้าร่วมกิจกรรม',
    bodyEn: 'Review requests from the participant information flow.',
    badgeTh: 'ผู้เข้าร่วม',
    badgeEn: 'Participants',
  },
  {
    to: '/admin/people/import-year2',
    icon: <FileSpreadsheet size={24} />,
    titleTh: 'นำเข้าฐานปี 2',
    titleEn: 'Import Year 2',
    bodyTh: 'ตรวจ staging และ preview ก่อนนำเข้าข้อมูลกลาง',
    bodyEn: 'Review staging and preview before importing into central records.',
    badgeTh: 'นำเข้า',
    badgeEn: 'Import',
  },
  {
    to: '/admin/groups',
    icon: <UsersRound size={24} />,
    titleTh: 'จัดกลุ่ม',
    titleEn: 'Groups',
    bodyTh: 'จัดการกลุ่มสี กลุ่มย่อย จุดนัดพบ และพี่กลุ่ม',
    bodyEn: 'Manage color groups, subgroups, meeting points, and mentors.',
    badgeTh: 'กลุ่ม',
    badgeEn: 'Groups',
  },
];

export function AdminPeopleGroupsHubPage() {
  const { language } = useLanguage();

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow={language === 'th' ? 'รายชื่อและกลุ่ม' : 'People & Groups'}
        title={language === 'th' ? 'รายชื่อและกลุ่ม' : 'People & Groups'}
        description={language === 'th' ? 'จัดการข้อมูลบุคคล รายชื่อผู้เข้าร่วม การจัดกลุ่ม และคำขอแก้ไขข้อมูล' : 'Manage people records, participants, group assignments, and edit requests.'}
      />
      <Card className="workflow-explainer-card" variant="soft">
        <div>
          <strong>{language === 'th' ? 'แยกงานข้อมูลกลางออกจากงานจัดกลุ่ม' : 'Central data and grouping are separated'}</strong>
          <span>{language === 'th' ? 'เริ่มจากการค้นหาข้อมูลกลาง ตรวจคุณภาพข้อมูล นำเข้า หรือจัดกลุ่มตามงานที่ต้องทำ ข้อมูลส่วนตัวอยู่หลังสิทธิ์แอดมินตามเดิม' : 'Start with directory search, data quality, imports, or group operations. Private data stays behind existing admin access.'}</span>
        </div>
      </Card>
      <div className="people-hub-grid">
        {hubItems.map((item) => (
          <Link className="people-hub-card" to={item.to} key={item.to}>
            <div className="people-hub-icon">{item.icon}</div>
            <div>
              <strong>{language === 'th' ? item.titleTh : item.titleEn}</strong>
              <span>{language === 'th' ? item.bodyTh : item.bodyEn}</span>
            </div>
            <Badge status="pending">{language === 'th' ? item.badgeTh : item.badgeEn}</Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
