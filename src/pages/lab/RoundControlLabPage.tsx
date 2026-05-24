import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { featureLabGroups, featureLabRounds, type LabRoundStatus } from '../../data/featureLabEntaneerGear56';
import { LabBackLink, LabWarningCard, LabWhySection, statusLabel, statusTone } from './LabShared';

type GroupState = {
  group_name: string;
  current_station: number;
  next_station: number;
  status: LabRoundStatus;
  delay_minutes: number;
};

function nextStation(station: number) {
  return station >= 7 ? 1 : station + 1;
}

export function RoundControlLabPage() {
  const [roundIndex, setRoundIndex] = useState(1);
  const [groups, setGroups] = useState<GroupState[]>(featureLabGroups.map((group, index) => ({
    group_name: group,
    current_station: (index % 7) + 1,
    next_station: nextStation((index % 7) + 1),
    status: index % 5 === 0 ? 'delayed' : index % 3 === 0 ? 'preparing_to_move' : 'doing_activity',
    delay_minutes: index % 5 === 0 ? 5 : 0,
  })));
  const currentRound = featureLabRounds[roundIndex];
  const delayedCount = useMemo(() => groups.filter((group) => group.status === 'delayed').length, [groups]);

  function startNextRound() {
    setRoundIndex((index) => Math.min(index + 1, featureLabRounds.length - 1));
    setGroups((rows) => rows.map((row) => ({ ...row, current_station: row.next_station, next_station: nextStation(row.next_station), status: 'doing_activity', delay_minutes: 0 })));
  }

  function updateGroup(groupName: string, status: LabRoundStatus) {
    setGroups((rows) => rows.map((row) => row.group_name === groupName ? { ...row, status, delay_minutes: status === 'delayed' ? 5 : 0 } : row));
  }

  return (
    <section className="feature-lab-page page-stack">
      <PageHeader eyebrow="Feature Lab" title="Round Control" description="Preview future station rotation / round control dashboard. ข้อมูลเป็น mock data และทุก action เป็น local state" meta={<LabBackLink />} />
      <LabWarningCard />

      <Card className="feature-lab-event-card">
        <p className="eyebrow">Current round</p>
        <h2>{currentRound}</h2>
        <div className="feature-lab-metrics">
          <span><strong>{groups.length}</strong> กลุ่มสี</span>
          <span><strong>{delayedCount}</strong> กลุ่มล่าช้า</span>
          <span><strong>7</strong> ฐานกิจกรรม</span>
        </div>
        <Button onClick={startNextRound}>เริ่มรอบถัดไป</Button>
      </Card>

      <div className="feature-lab-timeline">
        {featureLabRounds.map((round, index) => <span className={index === roundIndex ? 'is-active' : ''} key={round}>{round}</span>)}
      </div>

      <div className="feature-lab-grid">
        {groups.map((group) => (
          <Card className="feature-lab-card" key={group.group_name}>
            <div className="feature-lab-card-head">
              <h2>{group.group_name}</h2>
              <span className={`lab-status lab-status-${statusTone(group.status)}`}>{statusLabel(group.status)}</span>
            </div>
            <dl className="feature-lab-facts">
              <div><dt>ฐานปัจจุบัน</dt><dd>ฐาน {group.current_station}</dd></div>
              <div><dt>ฐานถัดไป</dt><dd>ฐาน {group.next_station}</dd></div>
              <div><dt>Delay</dt><dd>{group.delay_minutes ? `${group.delay_minutes} นาที` : '-'}</dd></div>
            </dl>
            <div className="feature-lab-actions">
              <Button size="sm" onClick={() => updateGroup(group.group_name, 'arrived')}>ตั้งกลุ่มเป็นถึงฐานแล้ว</Button>
              <Button size="sm" variant="secondary" onClick={() => updateGroup(group.group_name, 'delayed')}>ตั้งกลุ่มเป็นล่าช้า 5 นาที</Button>
            </div>
          </Card>
        ))}
      </div>

      <LabWhySection items={['ช่วยตอบว่ากลุ่มนี้อยู่ไหน', 'ช่วยพี่ฐานรู้ว่ากลุ่มถัดไปกำลังมาไหม', 'ช่วยทีมเวลาเห็น delay', 'เหมาะกับกิจกรรมเดินฐาน 7 ฐาน']} />
    </section>
  );
}
