import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { featureLabBroadcasts } from '../../data/featureLabEntaneerGear56';
import { LabBackLink, LabWarningCard, LabWhySection } from './LabShared';

type Broadcast = {
  id: string;
  message: string;
  target: string;
  pinned: boolean;
  important: boolean;
  time: string;
};

const targets = ['ทุกทีมงาน', 'พี่กลุ่ม', 'พี่ฐาน', 'ฝ่ายพยาบาล', 'ฝ่ายจราจร', 'ทีมระบบ'];

export function BroadcastLabPage() {
  const [message, setMessage] = useState<string>(featureLabBroadcasts[0]);
  const [target, setTarget] = useState(targets[0]);
  const [feed, setFeed] = useState<Broadcast[]>(featureLabBroadcasts.map((item, index) => ({
    id: `broadcast-${index}`,
    message: item,
    target: index === 1 ? 'พี่ฐาน' : index === 3 ? 'ทุกทีมงาน' : 'ทีมระบบ',
    pinned: index === 2,
    important: index === 2,
    time: `0${8 + index}:4${index}`,
  })));

  function sendMock() {
    if (!message.trim()) return;
    setFeed((items) => [{ id: `mock-${Date.now()}`, message: message.trim(), target, pinned: false, important: false, time: 'ตอนนี้' }, ...items]);
  }

  function toggleFlag(id: string, key: 'pinned' | 'important') {
    setFeed((items) => items.map((item) => item.id === id ? { ...item, [key]: !item[key] } : item));
  }

  return (
    <section className="feature-lab-page page-stack">
      <PageHeader eyebrow="Feature Lab" title="Broadcast Announcement" description="Preview important announcement system for staff. ประกาศทั้งหมดเป็น mock data และไม่ส่งข้อความจริง" meta={<LabBackLink />} />
      <LabWarningCard />

      <Card className="feature-lab-card">
        <h2>ประกาศจำลอง</h2>
        <label className="field">
          <span>ข้อความประกาศ</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} />
        </label>
        <label className="field">
          <span>กลุ่มเป้าหมาย</span>
          <select value={target} onChange={(event) => setTarget(event.target.value)}>
            {targets.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div className="feature-lab-quick-row">
          {featureLabBroadcasts.map((item) => <Button key={item} size="sm" variant="secondary" onClick={() => setMessage(item)}>{item}</Button>)}
        </div>
        <Button onClick={sendMock}>ส่งประกาศจำลอง</Button>
      </Card>

      <div className="feature-lab-list">
        {feed.map((item) => (
          <Card className="feature-lab-card" key={item.id}>
            <div className="feature-lab-card-head">
              <h2>{item.message}</h2>
              <span className="lab-status lab-status-info">{item.target}</span>
            </div>
            <p>{item.time} {item.pinned ? '· ปักหมุด' : ''} {item.important ? '· สำคัญ' : ''}</p>
            <div className="feature-lab-actions">
              <Button size="sm" variant="secondary" onClick={() => toggleFlag(item.id, 'pinned')}>ปักหมุด</Button>
              <Button size="sm" variant="secondary" onClick={() => toggleFlag(item.id, 'important')}>ทำเครื่องหมายว่าสำคัญ</Button>
            </div>
          </Card>
        ))}
      </div>

      <LabWhySection items={['ประกาศสำคัญไม่จมหายในไลน์', 'เปิดเว็บแล้วเห็นข้อความสำคัญทันที', 'ใช้คู่กับ Line ได้ ไม่ใช่แทน Line', 'ในอนาคตอาจแยกประกาศตามบทบาทได้']} />
    </section>
  );
}
