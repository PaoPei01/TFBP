import { AlertTriangle, CheckCircle2, ClipboardCheck, ShieldAlert, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DemoBadge } from '../components/demo/DemoBadge';
import { DemoDashboardMock } from '../components/demo/DemoDashboardMock';
import { DemoMetricCard } from '../components/demo/DemoMetricCard';
import { DemoPhoneMock } from '../components/demo/DemoPhoneMock';
import { DemoStepControls } from '../components/demo/DemoStepControls';
import { Card } from '../components/ui/Card';
import { demoEmergencyCases, demoEvent, demoStations } from '../data/demoEntaneerGear56';

type StorySection = {
  id: string;
  title: string;
  narration: string;
  visual: ReactNode;
};

function statusLabel(status: string) {
  if (status === 'ready') return 'พร้อม';
  if (status === 'warning') return 'ต้องตรวจสอบ';
  return 'ต้องประสานเพิ่ม';
}

function qrMock() {
  return (
    <div className="demo-qr-placeholder demo-story-qr" aria-label="Fake QR placeholder">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function DemoStoryPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const sections: StorySection[] = useMemo(() => [
    {
      id: 'intro',
      title: 'TFBP สำหรับ Entaneer Gear 56',
      narration: 'วันนี้เราจะดูภาพรวมระบบที่ทีมงานใช้ในงาน Entaneer Gear 56 ตั้งแต่การดูหน้าที่ของตัวเอง การเช็กชื่อ การติดตามกลุ่ม ไปจนถึงการดูภาพรวมสำหรับทีมงานระบบ',
      visual: (
        <Card className="demo-story-title-card">
          <DemoBadge />
          <h2>{demoEvent.name_th}</h2>
          <p>ระบบช่วยทีมงานดูข้อมูลกลุ่ม ฐาน เช็กชื่อ เหตุฉุกเฉิน และภาพรวมสำหรับผู้ดูแลในที่เดียว</p>
          <div className="demo-story-chip-row">
            <span>{demoEvent.secondary_name_th}</span>
            <span>{demoEvent.date_th}</span>
            <span>{demoEvent.location_th}</span>
          </div>
        </Card>
      ),
    },
    {
      id: 'overview',
      title: 'ภาพรวมกิจกรรม',
      narration: 'งานนี้มีผู้เข้าร่วมจำนวนมาก จึงต้องมีระบบกลางช่วยให้ทีมงานเห็นข้อมูลที่ตรงกันและลดการสื่อสารซ้ำ',
      visual: (
        <div className="demo-story-metric-grid">
          <DemoMetricCard label="นักศึกษาใหม่ประมาณ" value={demoEvent.expected_freshmen.toLocaleString('th-TH')} />
          <DemoMetricCard label="ผู้เข้าร่วมรวมประมาณ" value={demoEvent.total_expected.toLocaleString('th-TH')} />
          <DemoMetricCard label="ทีมงาน" value={String(demoEvent.staff_total)} />
          <DemoMetricCard label="กลุ่มสี" value="7" />
          <DemoMetricCard label="กลุ่มย่อย" value="14" />
          <DemoMetricCard label="ฐานกิจกรรม" value="7" />
        </div>
      ),
    },
    {
      id: 'staff-view',
      title: 'มุมมองทีมงานทั่วไป',
      narration: 'ทีมงานทั่วไปสามารถดูหน้าที่ของตัวเอง กลุ่มที่รับผิดชอบ รายชื่อผู้เข้าร่วม และข้อมูลที่จำเป็นต่อการทำงานหน้างาน',
      visual: (
        <DemoPhoneMock title="Staff Mode">
          <div className="demo-phone-profile">
            <strong>นายตัวอย่าง ทีมงาน</strong>
            <span>บทบาท: พี่กลุ่ม</span>
            <span>กลุ่ม: แดง A</span>
            <span className="badge badge-approved">เช็กชื่อแล้ว</span>
            <button type="button">ดูรายชื่อกลุ่ม</button>
          </div>
        </DemoPhoneMock>
      ),
    },
    {
      id: 'group',
      title: 'ดูรายชื่อและกลุ่มที่รับผิดชอบ',
      narration: 'พี่กลุ่มสามารถติดตามรายชื่อในกลุ่มตัวเองได้ง่ายขึ้น เห็นสถานะการเช็กชื่อและค้นหาผู้เข้าร่วมได้เร็วขึ้น',
      visual: (
        <Card className="demo-story-group-card">
          <p className="eyebrow">แดง A</p>
          <h2>กลุ่มที่รับผิดชอบ</h2>
          <div className="demo-story-metric-grid demo-story-metric-grid-tight">
            <DemoMetricCard label="คนในกลุ่ม" value="75" />
            <DemoMetricCard label="เช็กชื่อแล้ว" value="68" />
            <DemoMetricCard label="ยังไม่เช็กชื่อ" value="7" />
          </div>
          <div className="demo-story-list-lines">
            <span><strong>ข้าว</strong> CPE · เช็กชื่อแล้ว</span>
            <span><strong>มิว</strong> EE · เช็กชื่อแล้ว</span>
            <span><strong>ปิง</strong> ME · ยังไม่เช็กชื่อ</span>
          </div>
        </Card>
      ),
    },
    {
      id: 'stations',
      title: 'ตรวจความพร้อมของฐานกิจกรรม',
      narration: 'ทีมงานระบบสามารถดูความพร้อมของแต่ละฐาน เช่น จำนวนทีมงานที่เช็กชื่อแล้ว หรือฐานที่ต้องการการประสานงานเพิ่มเติม',
      visual: (
        <div className="demo-story-station-grid">
          {demoStations.map((station) => (
            <Card className="demo-story-station-card" key={station.station_number}>
              <strong>ฐาน {station.station_number}</strong>
              <span>{station.location_th}</span>
              <small>{station.departments.join(', ')}</small>
              <em className={station.status === 'ready' ? 'badge badge-approved' : 'badge badge-pending'}>{statusLabel(station.status)}</em>
            </Card>
          ))}
        </div>
      ),
    },
    {
      id: 'attendance',
      title: 'เช็กชื่อทีมงานด้วย QR',
      narration: 'ระบบเช็กชื่อช่วยให้รู้ว่าทีมงานมาครบหรือยัง และหากสแกน QR ไม่ได้ ยังสามารถเช็กชื่อแบบแมนนวลได้',
      visual: (
        <DemoDashboardMock title="Attendance">
          <div className="demo-story-attendance">
            {qrMock()}
            <div>
              <span className="badge badge-approved">วันซ้อม</span>
              <span className="badge badge-pending">เช้าวันงาน</span>
              <span><CheckCircle2 size={18} /> เช็กชื่อสำเร็จ</span>
              <span><ClipboardCheck size={18} /> manual fallback</span>
            </div>
          </div>
        </DemoDashboardMock>
      ),
    },
    {
      id: 'emergency',
      title: 'ประสานเหตุหน้างาน',
      narration: 'เมื่อเกิดเหตุหน้างาน ทีมงานสามารถบันทึกและส่งต่อเคสให้ฝ่ายที่เกี่ยวข้อง เช่น พี่กลุ่ม พยาบาล จราจร หรือทีมระบบ',
      visual: (
        <div className="demo-story-case-grid">
          {demoEmergencyCases.map((item) => (
            <Card className="demo-story-case-card" key={item.id}>
              <ShieldAlert size={20} />
              <strong>{item.title_th}</strong>
              <span>{item.location_th}</span>
              <small>ส่งต่อ: {item.responsible_role}</small>
            </Card>
          ))}
        </div>
      ),
    },
    {
      id: 'system',
      title: 'ภาพรวมสำหรับทีมงานระบบ',
      narration: 'ทีมงานระบบจะเห็นปัญหาข้อมูลก่อนวันงาน เช่น รายชื่อซ้ำ คนที่ยังไม่มีกลุ่ม หรือทีมงานที่ยังไม่ยืนยันโปรไฟล์',
      visual: (
        <DemoDashboardMock title="System Staff Dashboard">
          <div className="demo-story-health">
            <DemoMetricCard label="Data Health" value="96%" />
            <DemoMetricCard label="รายชื่อซ้ำ" value="3" />
            <DemoMetricCard label="ยังไม่มีกลุ่ม" value="8" />
            <DemoMetricCard label="โปรไฟล์ทีมงานยังไม่ยืนยัน" value="6" />
          </div>
          <div className="demo-story-check-line">
            <span><UsersRound size={18} /> สถานะเช็กชื่อรวม</span>
            <strong>198 / 226</strong>
          </div>
        </DemoDashboardMock>
      ),
    },
    {
      id: 'closing',
      title: 'ระบบเดียวสำหรับทีมงานทั้งงาน',
      narration: 'เมื่อทุกฝ่ายใช้ข้อมูลชุดเดียวกัน ทีมงานจะเห็นภาพรวมตรงกัน ลดการถามซ้ำ เช็กชื่อเร็วขึ้น และประสานเหตุหน้างานได้ดีขึ้น',
      visual: (
        <Card className="demo-story-title-card">
          <h2>สรุปประโยชน์</h2>
          <div className="demo-story-list-lines">
            <span><CheckCircle2 size={18} /> ทีมงานเห็นข้อมูลตรงกัน</span>
            <span><CheckCircle2 size={18} /> ลดการถามซ้ำ</span>
            <span><CheckCircle2 size={18} /> เช็กชื่อเร็วขึ้น</span>
            <span><CheckCircle2 size={18} /> ประสานเหตุหน้างานได้ดีขึ้น</span>
            <span><CheckCircle2 size={18} /> ผู้ดูแลเห็นภาพรวมทันที</span>
          </div>
          <div className="demo-inline-actions">
            <Link className="btn btn-primary" to="/demo/staff">ทดลองมุมมองทีมงาน</Link>
            <Link className="btn btn-secondary" to="/demo/system">ทีมงานระบบ</Link>
            <Link className="btn btn-secondary" to="/demo/attendance">ระบบเช็กชื่อ</Link>
            <Link className="btn btn-secondary" to="/demo/emergency">เหตุหน้างาน</Link>
          </div>
        </Card>
      ),
    },
  ], []);

  const active = sections[current];
  const goNext = () => setCurrent((value) => Math.min(value + 1, sections.length - 1));
  const goPrevious = () => setCurrent((value) => Math.max(value - 1, 0));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        setCurrent((value) => Math.min(value + 1, sections.length - 1));
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCurrent((value) => Math.max(value - 1, 0));
      }
      if (event.key === 'Escape') {
        navigate('/demo');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, sections.length]);

  return (
    <section className="demo-story-page">
      <div className="demo-story-shell">
        <div className="demo-story-copy">
          <DemoBadge />
          <p className="eyebrow">Demo Story · {current + 1}/{sections.length}</p>
          <h1>{active.title}</h1>
          <p>{active.narration}</p>
          <div className="demo-story-safety">
            <AlertTriangle size={18} />
            <span>Demo Mode · All data shown here is mock data. ใช้สำหรับ Entaneer Gear 56 / สานสัมพันธ์ 69 เท่านั้น</span>
          </div>
        </div>
        <div className="demo-story-visual" key={active.id}>
          {active.visual}
        </div>
      </div>

      <Card className="demo-recording-tips" variant="soft">
        <strong>Recommended recording</strong>
        <span>Browser width 1440x900 หรือ 1920x1080 · Zoom 100% · ภาษาไทย · เลือกธีมตามห้องหรือโปรเจคเตอร์ · เริ่มจาก /demo/story แล้วเปิด /demo/staff และ /demo/system หากมีเวลา</span>
      </Card>

      <DemoStepControls current={current} total={sections.length} onNext={goNext} onPrevious={goPrevious} />
    </section>
  );
}
