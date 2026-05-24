import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';

export function LabWarningCard() {
  return (
    <Card className="feature-lab-warning" variant="warning">
      <div>
        <strong>Feature Lab · ข้อมูลจำลอง ไม่ใช่ระบบใช้งานจริง</strong>
        <span>หน้านี้เป็น prototype แนวคิดสำหรับพัฒนาต่อเท่านั้น ทุกปุ่มทำงานใน local state และไม่มีการบันทึกลงฐานข้อมูล</span>
      </div>
    </Card>
  );
}

export function LabBackLink() {
  return <Link className="btn btn-secondary" to="/lab">กลับ Feature Lab</Link>;
}

export function LabWhySection({ items }: { items: string[] }) {
  return (
    <Card className="feature-lab-why" variant="soft">
      <h2>Why this matters</h2>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </Card>
  );
}

export function statusLabel(value: string) {
  const labels: Record<string, string> = {
    ready: 'พร้อม',
    checking: 'ต้องตรวจสอบ',
    missing: 'ขาด/ยังไม่ครบ',
    crowded: 'พื้นที่แออัด',
    rain_risk: 'เสี่ยงฝน',
    warning: 'ต้องตรวจสอบ',
    needs_attention: 'ต้องประสานงานเพิ่ม',
    open: 'เปิดเคส',
    in_progress: 'กำลังดูแล',
    resolved: 'ปิดเคสแล้ว',
    low: 'ต่ำ',
    medium: 'กลาง',
    high: 'สูง',
    doing_activity: 'กำลังทำกิจกรรม',
    preparing_to_move: 'เตรียมย้ายฐาน',
    arrived: 'ถึงฐานแล้ว',
    delayed: 'ล่าช้า',
  };
  return labels[value] ?? value;
}

export function statusTone(value: string) {
  if (['ready', 'resolved', 'arrived'].includes(value)) return 'success';
  if (['high', 'needs_attention', 'missing', 'delayed'].includes(value)) return 'danger';
  if (['warning', 'checking', 'crowded', 'rain_risk', 'medium', 'open', 'in_progress', 'preparing_to_move'].includes(value)) return 'warning';
  return 'muted';
}
