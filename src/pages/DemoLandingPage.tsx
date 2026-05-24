import { Activity, AlertTriangle, ClipboardCheck, Presentation, Settings, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { demoEvent } from '../data/demoEntaneerGear56';

const demoCards = [
  {
    icon: <Presentation size={24} />,
    title: 'Demo Story',
    description: 'หน้าเล่าเรื่องสำหรับ briefing และอัดวิดีโออธิบายระบบ Entaneer Gear 56 แบบเป็นลำดับ',
    cta: 'เปิด Demo Story',
    to: '/demo/story',
  },
  {
    icon: <UsersRound size={24} />,
    title: 'ทีมงานทั่วไป',
    description: 'ดูตัวอย่างการเข้าหน้า Staff Mode ตรวจกลุ่ม ดูรายชื่อที่รับผิดชอบ เช็กข้อมูลกิจกรรม และใช้งานในวันงาน',
    cta: 'ดูมุมมองทีมงานทั่วไป',
    to: '/demo/staff',
  },
  {
    icon: <Settings size={24} />,
    title: 'ทีมงานระบบ',
    description: 'ดูตัวอย่าง dashboard สำหรับตรวจความพร้อมของข้อมูล รายชื่อทีมงาน กลุ่ม สี ฐาน และสถานะการเช็กชื่อ',
    cta: 'ดูมุมมองทีมงานระบบ',
    to: '/demo/system',
  },
  {
    icon: <ClipboardCheck size={24} />,
    title: 'ระบบเช็กชื่อ',
    description: 'สาธิตการสร้างรอบเช็กชื่อ สแกน QR ตรวจสถานะ และเช็กชื่อแบบแมนนวลเมื่อเกิดปัญหาหน้างาน',
    cta: 'ดูระบบเช็กชื่อ',
    to: '/demo/attendance',
  },
  {
    icon: <AlertTriangle size={24} />,
    title: 'เหตุฉุกเฉินและหน้างาน',
    description: 'สาธิตการดูเคสหน้างาน การประสานฝ่ายพยาบาล จราจร พี่กลุ่ม และทีมระบบ',
    cta: 'ดูระบบหน้างาน',
    to: '/demo/emergency',
  },
];

export function DemoLandingPage() {
  return (
    <section className="demo-page page-stack">
      <PageHeader
        eyebrow="Demo Mode · โหมดสาธิต"
        title="สาธิตระบบ Entaneer Gear 56"
        description="ภาพรวมการใช้งานระบบสำหรับทีมงานทั่วไป ทีมงานระบบ และผู้ดูแลกิจกรรม โดยใช้ข้อมูลจำลองของงาน Entaneer Gear 56 / สานสัมพันธ์ 69 เท่านั้น"
        meta={<span className="demo-mode-badge">โหมดสาธิต · ข้อมูลจำลอง · Entaneer Gear 56</span>}
      />

      <Card className="demo-warning-card" variant="warning">
        <Activity size={24} />
        <div>
          <strong>ข้อมูลทั้งหมดในหน้านี้เป็นข้อมูลจำลองสำหรับการนำเสนอ ไม่ใช่ข้อมูลจริงของนักศึกษา ทีมงาน หรือผู้เข้าร่วมกิจกรรม</strong>
          <span>Demo Mode · All data shown here is mock data. ใช้สำหรับ Entaneer Gear 56 / สานสัมพันธ์ 69 เท่านั้น</span>
        </div>
      </Card>

      <div className="demo-hero-grid">
        <Card className="demo-event-card">
          <p className="eyebrow">Entaneer Gear 56</p>
          <h2>{demoEvent.secondary_name_th} / {demoEvent.secondary_name_en}</h2>
          <div className="demo-metric-row">
            <span><strong>{demoEvent.total_expected.toLocaleString('th-TH')}</strong> คนทั้งหมด</span>
            <span><strong>{demoEvent.staff_total}</strong> ทีมงาน</span>
            <span><strong>{demoEvent.group_count}</strong> สี</span>
            <span><strong>7</strong> ฐาน</span>
          </div>
        </Card>
      </div>

      <div className="demo-card-grid">
        {demoCards.map((card) => (
          <Card className="demo-action-card" key={card.to}>
            <div className="demo-card-icon">{card.icon}</div>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <Link className="btn btn-primary btn-lg" to={card.to}>{card.cta}</Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
