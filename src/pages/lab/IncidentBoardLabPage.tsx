import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { featureLabIncidents, type LabIncidentPriority, type LabIncidentStatus } from '../../data/featureLabEntaneerGear56';
import { LabBackLink, LabWarningCard, LabWhySection, statusLabel, statusTone } from './LabShared';

type Incident = {
  id: string;
  title_th: string;
  location_th: string;
  forward_to: string;
  priority: LabIncidentPriority;
  status: LabIncidentStatus;
  created_at: string;
  updated_at: string;
};

const quickCases = [
  { title_th: 'น้องหากลุ่มไม่เจอ', location_th: 'จุดรวมพลหน้าอาคาร', forward_to: 'พี่กลุ่ม' },
  { title_th: 'ผู้เข้าร่วมไม่สบาย', location_th: 'พื้นที่กิจกรรม', forward_to: 'ฝ่ายพยาบาล' },
  { title_th: 'จุดแออัด', location_th: 'ทางเข้าโรงอาหาร', forward_to: 'ฝ่ายลงทะเบียน / จราจร' },
  { title_th: 'ฝนตกบริเวณฐาน', location_th: 'ฐานกลางแจ้ง', forward_to: 'ทีมระบบ / หัวหน้าฐาน' },
];

export function IncidentBoardLabPage() {
  const [incidents, setIncidents] = useState<Incident[]>(featureLabIncidents.map((item) => ({ ...item })));

  function updateCase(id: string, status: LabIncidentStatus, forwardTo?: string) {
    setIncidents((rows) => rows.map((row) => row.id === id ? { ...row, status, forward_to: forwardTo ?? row.forward_to, updated_at: 'ตอนนี้' } : row));
  }

  function addCase(template: typeof quickCases[number]) {
    setIncidents((rows) => [
      { id: `mock-${Date.now()}`, ...template, priority: template.forward_to.includes('พยาบาล') ? 'high' : 'medium', status: 'open', created_at: 'ตอนนี้', updated_at: 'ตอนนี้' },
      ...rows,
    ]);
  }

  return (
    <section className="feature-lab-page page-stack">
      <PageHeader eyebrow="Feature Lab" title="Incident Board" description="Preview future field incident coordination board. ทุกเคสเป็นข้อมูลจำลองและไม่บันทึกลงระบบจริง" meta={<LabBackLink />} />
      <LabWarningCard />

      <Card className="feature-lab-explainer">
        ฟีเจอร์นี้ไม่ได้แทนที่วิทยุสื่อสารหรือกลุ่มไลน์ แต่ช่วยบันทึกสถานะกลางของเคสหน้างาน เพื่อกันเคสหลุด ลดการถามซ้ำ และช่วยสรุปหลังจบงาน
      </Card>

      <div className="feature-lab-quick-row">
        {quickCases.map((item) => <Button key={item.title_th} variant="secondary" onClick={() => addCase(item)}>+ {item.title_th}</Button>)}
      </div>

      <div className="feature-lab-grid">
        {incidents.map((incident) => (
          <Card className="feature-lab-card" key={incident.id}>
            <div className="feature-lab-card-head">
              <h2>{incident.title_th}</h2>
              <span className={`lab-status lab-status-${statusTone(incident.priority)}`}>{statusLabel(incident.priority)}</span>
            </div>
            <p>{incident.location_th}</p>
            <dl className="feature-lab-facts">
              <div><dt>สถานะ</dt><dd>{statusLabel(incident.status)}</dd></div>
              <div><dt>ส่งต่อ</dt><dd>{incident.forward_to}</dd></div>
              <div><dt>สร้าง</dt><dd>{incident.created_at}</dd></div>
              <div><dt>อัปเดต</dt><dd>{incident.updated_at}</dd></div>
            </dl>
            <div className="feature-lab-actions">
              <Button size="sm" onClick={() => updateCase(incident.id, 'in_progress')}>รับเคส</Button>
              <Button size="sm" variant="secondary" onClick={() => updateCase(incident.id, 'in_progress', 'ฝ่ายพยาบาล')}>ส่งต่อฝ่ายพยาบาล</Button>
              <Button size="sm" variant="secondary" onClick={() => updateCase(incident.id, 'in_progress', 'พี่กลุ่ม')}>ส่งต่อพี่กลุ่ม</Button>
              <Button size="sm" variant="ghost" onClick={() => updateCase(incident.id, 'resolved')}>ปิดเคส</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="feature-lab-why" variant="soft">
        <h2>Compared with Line/Radio</h2>
        <ul>
          <li>วิทยุ: เร็ว เหมาะกับเหตุเร่งด่วน</li>
          <li>Line: คุยง่าย ส่งรูปได้ แต่ข้อความจมหาย</li>
          <li>เว็บ: เห็นสถานะกลาง ใครรับเคสแล้ว ปิดหรือยัง และสรุปย้อนหลังได้</li>
        </ul>
      </Card>
      <LabWhySection items={['กันเคสหลุดระหว่างงาน', 'ลดการถามซ้ำว่าใครรับเรื่องแล้ว', 'ช่วยสรุปหลังจบงานเพื่อปรับปรุงครั้งต่อไป']} />
    </section>
  );
}
