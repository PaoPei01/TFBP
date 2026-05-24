import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { featureLabStations, type LabAreaStatus, type LabEquipmentStatus, type LabStationStatus } from '../../data/featureLabEntaneerGear56';
import { LabBackLink, LabWarningCard, LabWhySection, statusLabel, statusTone } from './LabShared';

type StationRow = {
  station_number: number;
  location_th: string;
  departments: string[];
  required_staff: number;
  checked_in_staff: number;
  equipment_status: LabEquipmentStatus;
  area_status: LabAreaStatus;
  overall_status: LabStationStatus;
  note_th: string;
};

export function StationReadinessLabPage() {
  const [stations, setStations] = useState<StationRow[]>(featureLabStations.map((station) => ({ ...station })));

  function updateStation(stationNumber: number, status: LabStationStatus, note?: string) {
    setStations((rows) => rows.map((row) => row.station_number === stationNumber ? { ...row, overall_status: status, note_th: note ?? row.note_th } : row));
  }

  return (
    <section className="feature-lab-page page-stack">
      <PageHeader
        eyebrow="Feature Lab"
        title="Station Readiness"
        description="Preview future Station Readiness dashboard for Entaneer Gear 56. ข้อมูลทั้งหมดเป็น mock data และเปลี่ยนเฉพาะในหน้านี้"
        meta={<LabBackLink />}
      />
      <LabWarningCard />

      <Card className="feature-lab-explainer">
        ฟีเจอร์นี้เป็นแนวคิดสำหรับช่วยผู้ดูแลเห็นความพร้อมของแต่ละฐานในหน้าเดียว ไม่ได้แทนที่ Line หรือวิทยุสื่อสาร แต่ช่วยเป็นสถานะกลางที่ดูย้อนหลังและสรุปภาพรวมได้
      </Card>

      <div className="feature-lab-grid">
        {stations.map((station) => (
          <Card className="feature-lab-card" key={station.station_number}>
            <div className="feature-lab-card-head">
              <h2>ฐาน {station.station_number}</h2>
              <span className={`lab-status lab-status-${statusTone(station.overall_status)}`}>{statusLabel(station.overall_status)}</span>
            </div>
            <p>{station.location_th}</p>
            <div className="feature-lab-chip-row">
              {station.departments.map((department) => <span key={department}>{department}</span>)}
            </div>
            <dl className="feature-lab-facts">
              <div><dt>ทีมงาน</dt><dd>{station.checked_in_staff}/{station.required_staff}</dd></div>
              <div><dt>อุปกรณ์</dt><dd>{statusLabel(station.equipment_status)}</dd></div>
              <div><dt>พื้นที่</dt><dd>{statusLabel(station.area_status)}</dd></div>
            </dl>
            <p className="feature-lab-note">{station.note_th}</p>
            <div className="feature-lab-actions">
              <Button size="sm" onClick={() => updateStation(station.station_number, 'ready', 'ทำเครื่องหมายว่าพร้อมแล้วจาก action จำลอง')}>ทำเครื่องหมายว่าพร้อม</Button>
              <Button size="sm" variant="secondary" onClick={() => updateStation(station.station_number, 'warning')}>ตั้งเป็นต้องตรวจสอบ</Button>
              <Button size="sm" variant="ghost" onClick={() => updateStation(station.station_number, 'needs_attention', 'หมายเหตุจำลอง: ต้องประสานงานเพิ่มก่อนเริ่มรอบถัดไป')}>เพิ่มหมายเหตุจำลอง</Button>
            </div>
          </Card>
        ))}
      </div>

      <LabWhySection items={['เห็นทุกฐานในหน้าเดียว', 'ลดการถามซ้ำว่าแต่ละฐานพร้อมหรือยัง', 'ช่วยทีมระบบรู้ว่าฐานไหนต้องติดตาม', 'ใช้สรุปหลังงานได้']} />
    </section>
  );
}
