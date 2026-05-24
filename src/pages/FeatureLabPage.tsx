import { AlertTriangle, Bell, ClipboardCheck, RadioTower, RotateCw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { featureLabEvent } from '../data/featureLabEntaneerGear56';

const labCards = [
  {
    icon: <ShieldCheck size={24} />,
    title: 'ตรวจความพร้อมของฐานกิจกรรม',
    description: 'ดูแนวคิด dashboard สำหรับตรวจความพร้อมของแต่ละฐาน เช่น จำนวนทีมงานที่เช็กชื่อแล้ว สถานะอุปกรณ์ สถานะพื้นที่ และฐานที่ต้องการการประสานงานเพิ่มเติม',
    cta: 'ดูแนวคิด Station Readiness',
    to: '/lab/station-readiness',
  },
  {
    icon: <AlertTriangle size={24} />,
    title: 'ประสานเหตุหน้างาน',
    description: 'ดูแนวคิดระบบบันทึกและติดตามเคสหน้างาน เช่น น้องหากลุ่มไม่เจอ ผู้เข้าร่วมรู้สึกไม่สบาย จุดลงทะเบียนแออัด หรือเหตุที่ต้องส่งต่อฝ่ายที่เกี่ยวข้อง',
    cta: 'ดูแนวคิด Incident Board',
    to: '/lab/incident-board',
  },
  {
    icon: <RotateCw size={24} />,
    title: 'ควบคุมรอบเดินฐาน',
    description: 'ดูแนวคิดระบบติดตามว่ากลุ่มสีแต่ละกลุ่มอยู่ฐานไหน กำลังทำกิจกรรม เตรียมย้ายฐาน หรือล่าช้า เพื่อช่วยทีมเวลา พี่กลุ่ม และพี่ฐานทำงานตรงกัน',
    cta: 'ดูแนวคิด Round Control',
    to: '/lab/round-control',
  },
  {
    icon: <ClipboardCheck size={24} />,
    title: 'Checklist ความพร้อมก่อนเริ่มกิจกรรม',
    description: 'ดูแนวคิด checklist สำหรับหัวหน้าฐานหรือทีมงาน เช่น ทีมงานครบ อุปกรณ์พร้อม พื้นที่ปลอดภัย ป้ายพร้อม และแผนสำรองพร้อม',
    cta: 'ดูแนวคิด Checklist',
    to: '/lab/readiness-checklist',
  },
  {
    icon: <Bell size={24} />,
    title: 'ประกาศสำคัญแบบไม่จมหายในแชท',
    description: 'ดูแนวคิดระบบประกาศสั้นสำหรับทีมงาน เช่น เตรียมย้ายฐาน ฝนเริ่มตก ฐานต้องชะลอการปล่อยกลุ่ม หรือแจ้งเตือนทีมงานที่ยังไม่เช็กชื่อ',
    cta: 'ดูแนวคิด Broadcast',
    to: '/lab/broadcast',
  },
];

export function FeatureLabPage() {
  return (
    <section className="feature-lab-page page-stack">
      <PageHeader
        eyebrow="Feature Lab"
        title="แนวคิดฟีเจอร์สำหรับพัฒนาต่อ"
        description="พื้นที่ทดลองแนวคิดฟีเจอร์สำหรับพัฒนาระบบ Entaneer Gear 56 ในอนาคต ข้อมูลทั้งหมดเป็นข้อมูลจำลอง และยังไม่ใช่ระบบใช้งานจริง"
        meta={<span className="feature-lab-badge">Feature Lab · Mock data only</span>}
      />

      <Card className="feature-lab-warning" variant="warning">
        <RadioTower size={24} />
        <div>
          <strong>หน้านี้เป็นพื้นที่ทดลองแนวคิดฟีเจอร์สำหรับพัฒนาต่อเท่านั้น ข้อมูลทั้งหมดเป็นข้อมูลจำลอง ไม่ใช่ข้อมูลจริง และฟีเจอร์เหล่านี้ยังไม่ใช่ระบบที่ใช้ปฏิบัติงานจริง</strong>
          <span>This page is a Feature Lab for future development ideas only. All data is mock data. These features are not part of the live operating workflow yet.</span>
        </div>
      </Card>

      <Card className="feature-lab-event-card">
        <p className="eyebrow">Entaneer Gear 56 / {featureLabEvent.secondary_name_th}</p>
        <h2>{featureLabEvent.date_th}</h2>
        <div className="feature-lab-metrics">
          <span><strong>{featureLabEvent.total_expected.toLocaleString('th-TH')}</strong> คนที่คาดการณ์</span>
          <span><strong>{featureLabEvent.staff_total}</strong> ทีมงาน</span>
          <span><strong>{featureLabEvent.group_count}</strong> กลุ่มสี</span>
          <span><strong>{featureLabEvent.station_count}</strong> ฐานกิจกรรม</span>
        </div>
      </Card>

      <div className="feature-lab-grid">
        {labCards.map((card) => (
          <Card className="feature-lab-card" key={card.to}>
            <div className="feature-lab-icon">{card.icon}</div>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <Link className="btn btn-primary btn-lg" to={card.to}>{card.cta}</Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
