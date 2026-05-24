import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { featureLabChecklistItems, featureLabStations } from '../../data/featureLabEntaneerGear56';
import { LabBackLink, LabWarningCard, LabWhySection } from './LabShared';

type ChecklistState = Record<number, Record<string, boolean>>;

function initialChecklist(): ChecklistState {
  return Object.fromEntries(featureLabStations.map((station, stationIndex) => [
    station.station_number,
    Object.fromEntries(featureLabChecklistItems.map((item, itemIndex) => [item, (stationIndex + itemIndex) % 5 !== 0])),
  ]));
}

export function ReadinessChecklistLabPage() {
  const [checklist, setChecklist] = useState<ChecklistState>(() => initialChecklist());
  const summary = useMemo(() => {
    const total = featureLabStations.length * featureLabChecklistItems.length;
    const done = Object.values(checklist).flatMap((station) => Object.values(station)).filter(Boolean).length;
    return { total, done, percent: Math.round((done / total) * 100) };
  }, [checklist]);

  function toggle(stationNumber: number, item: string) {
    setChecklist((current) => ({
      ...current,
      [stationNumber]: {
        ...current[stationNumber],
        [item]: !current[stationNumber][item],
      },
    }));
  }

  return (
    <section className="feature-lab-page page-stack">
      <PageHeader eyebrow="Feature Lab" title="Readiness Checklist" description="Preview checklist for station/faction readiness. ไม่มีการบันทึกข้อมูลจริง ทุก checkbox เป็น local state" meta={<LabBackLink />} />
      <LabWarningCard />

      <Card className="feature-lab-event-card">
        <p className="eyebrow">Station readiness summary</p>
        <h2>{summary.percent}% พร้อมก่อนเริ่มกิจกรรม</h2>
        <div className="feature-lab-progress"><span style={{ width: `${summary.percent}%` }} /></div>
        <p>{summary.done}/{summary.total} รายการถูกเช็กใน prototype นี้</p>
      </Card>

      <div className="feature-lab-grid">
        {featureLabStations.map((station) => {
          const stationDone = Object.values(checklist[station.station_number]).filter(Boolean).length;
          const percent = Math.round((stationDone / featureLabChecklistItems.length) * 100);
          return (
            <Card className="feature-lab-card" key={station.station_number}>
              <div className="feature-lab-card-head">
                <h2>ฐาน {station.station_number}</h2>
                <span className="lab-status lab-status-info">{percent}%</span>
              </div>
              <p>{station.location_th}</p>
              <div className="feature-lab-checklist">
                {featureLabChecklistItems.map((item) => (
                  <label key={item}>
                    <input type="checkbox" checked={checklist[station.station_number][item]} onChange={() => toggle(station.station_number, item)} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <LabWhySection items={['ใช้ก่อนเริ่มกิจกรรม', 'ลดการลืมเช็กของสำคัญ', 'ทำให้หัวหน้าฐานรายงานความพร้อมได้เป็นระบบ', 'เชื่อมต่อกับ Station Readiness ได้ในอนาคต']} />
    </section>
  );
}
