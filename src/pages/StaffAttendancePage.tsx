import { CheckCircle2, Clock, Home, RotateCw, Search, UploadCloud, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MobileSearchHeader } from '../components/mobile/MobileSearchHeader';
import { StickyBottomBar } from '../components/mobile/StickyBottomBar';
import { SwipeAttendanceCard } from '../components/mobile/SwipeAttendanceCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { majorLabel } from '../lib/major';
import type { StaffAttendance } from '../lib/types';
import { fetchStaffAttendanceContext, markStaffAttendance } from '../services/staff';

type QueueItem = {
  profileId: string;
  status: StaffAttendance['status'];
  note: string;
  eventDate: string;
};

const queueKey = 'tfbp_staff_attendance_queue';
const statuses: Array<{ value: StaffAttendance['status']; labelTh: string; labelEn: string; icon: ReactNode }> = [
  { value: 'present', labelTh: 'มาแล้ว', labelEn: 'Present', icon: <CheckCircle2 size={17} /> },
  { value: 'late', labelTh: 'สาย', labelEn: 'Late', icon: <Clock size={17} /> },
  { value: 'absent', labelTh: 'ไม่มา', labelEn: 'Absent', icon: <XCircle size={17} /> },
  { value: 'excused', labelTh: 'ลา/ยกเว้น', labelEn: 'Excused', icon: <RotateCw size={17} /> },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(queueKey) || '[]') as QueueItem[];
  } catch {
    return [];
  }
}

function saveQueue(items: QueueItem[]) {
  localStorage.setItem(queueKey, JSON.stringify(items));
}

export function StaffAttendancePage() {
  const { language } = useLanguage();
  const [eventDate, setEventDate] = useState(today());
  const [search, setSearch] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>(loadQueue);
  const [toast, setToast] = useState<ToastState>(null);
  const state = useAsync(() => fetchStaffAttendanceContext(eventDate), [eventDate]);

  const participants = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (state.data?.participants ?? []).filter((profile) => {
      if (!term) return true;
      return [profile.name_th, profile.name_en, profile.nickname, profile.major, profile.phone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [search, state.data?.participants]);

  const queueForDate = queue.filter((item) => item.eventDate === eventDate);
  const queueByProfile = new Map(queueForDate.map((item) => [item.profileId, item]));

  async function mark(profileId: string, status: StaffAttendance['status']) {
    const item = { profileId, status, note: '', eventDate };
    try {
      if (!navigator.onLine) throw new Error('offline');
      await markStaffAttendance(profileId, status, '', eventDate);
      setToast({ type: 'success', message: language === 'th' ? 'บันทึก attendance แล้ว' : 'Attendance saved' });
      await state.reload();
    } catch {
      const next = [...queue.filter((queued) => !(queued.profileId === profileId && queued.eventDate === eventDate)), item];
      setQueue(next);
      saveQueue(next);
      setToast({ type: 'success', message: language === 'th' ? 'เก็บไว้ในคิว offline แล้ว กด Sync เมื่อออนไลน์' : 'Saved to offline queue. Sync when online.' });
    }
  }

  async function syncQueue() {
    const remaining: QueueItem[] = [];
    for (const item of queue) {
      try {
        await markStaffAttendance(item.profileId, item.status, item.note, item.eventDate);
      } catch {
        remaining.push(item);
      }
    }
    setQueue(remaining);
    saveQueue(remaining);
    setToast(remaining.length ? { type: 'error', message: language === 'th' ? `ยัง sync ไม่ครบ ${remaining.length} รายการ` : `${remaining.length} items still not synced` } : { type: 'success', message: language === 'th' ? 'Sync attendance queue สำเร็จ' : 'Attendance queue synced' });
    await state.reload();
  }

  useEffect(() => {
    function onOnline() {
      if (loadQueue().length) void syncQueue();
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // syncQueue intentionally uses current component state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  if (state.loading) return <LoadingSkeleton />;
  if (state.error) return <div className="error-state">{state.error}</div>;
  if (!state.data?.access.can_mark_attendance) return <div className="empty-state">{language === 'th' ? 'บัญชีนี้ไม่มีสิทธิ์เช็กชื่อ' : 'This account cannot mark attendance.'}</div>;

  return (
    <section className="page-stack staff-page">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">{language === 'th' ? 'เช็กชื่อสตาฟ' : 'Staff Attendance'}</p>
        <h1>{language === 'th' ? 'เช็กชื่อ' : 'Attendance'}</h1>
        <p>{language === 'th' ? 'เช็กชื่อเฉพาะกลุ่มที่ได้รับมอบหมาย ถ้าเน็ตหลุด ระบบจะเก็บไว้ในคิวบนเครื่องนี้ก่อน' : 'Mark attendance only for your assigned group. If the connection drops, the app stores marks in this device queue first.'}</p>
      </div>

      <div className="staff-sticky-actions">
        <Link className="btn btn-secondary" to="/staff"><Home size={18} />{language === 'th' ? 'หน้าหลัก' : 'Home'}</Link>
        <Button variant="secondary" icon={<UploadCloud size={18} />} onClick={syncQueue} disabled={!queue.length}>Sync {queue.length}</Button>
      </div>

      <MobileSearchHeader
        label={language === 'th' ? 'ค้นหารายชื่อ' : 'Search participants'}
        value={search}
        onChange={setSearch}
        placeholder={language === 'th' ? 'ชื่อ ชื่อเล่น เบอร์ สาขา' : 'Name, nickname, phone, major'}
        resultText={`${participants.length} ${language === 'th' ? 'คน' : 'people'}`}
      />

      <div className="attendance-toolbar">
        <Input label={language === 'th' ? 'วันที่กิจกรรม' : 'Event date'} type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
        <div className="search-shell">
          <Search size={18} aria-hidden="true" />
          <Input label={language === 'th' ? 'ค้นหา' : 'Search'} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'th' ? 'ชื่อ ชื่อเล่น เบอร์ หรือสาขา' : 'Name, nickname, phone, or major'} />
        </div>
      </div>

      <div className="staff-section-head">
        <h2>{language === 'th' ? 'รายชื่อ' : 'Participant list'}</h2>
        <span>{participants.length} {language === 'th' ? 'คน' : 'people'} · {language === 'th' ? 'คิว' : 'queue'} {queueForDate.length}</span>
      </div>

      <div className="staff-list">
        {participants.map((profile) => {
          const queued = queueByProfile.get(profile.id);
          const status = queued?.status ?? profile.attendance?.status;
          return (
            <Card className="attendance-card" key={profile.id}>
              <SwipeAttendanceCard
                title={profile.nickname || profile.name_th || '-'}
                subtitle={`${profile.name_th || '-'} · ${majorLabel(profile.major, language)}`}
                meta={groupLabel(profile.group_assignment?.main_group, profile.group_assignment?.subgroup, language)}
                status={status ?? undefined}
                statusLabel={status ? (language === 'th' ? statuses.find((item) => item.value === status)?.labelTh ?? status : statuses.find((item) => item.value === status)?.labelEn ?? status) : language === 'th' ? 'ยังไม่เช็ก' : 'Not marked'}
                presentLabel={language === 'th' ? 'มาแล้ว' : 'Present'}
                absentLabel={language === 'th' ? 'ไม่มา' : 'Absent'}
                onPresent={() => mark(profile.id, 'present')}
                onAbsent={() => mark(profile.id, 'absent')}
              >
                {queued ? <span>{language === 'th' ? 'รอ sync' : 'Waiting to sync'}</span> : profile.attendance?.marked_at ? <span>{new Date(profile.attendance.marked_at).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span> : null}
              </SwipeAttendanceCard>
              <div className="attendance-actions">
                {statuses.map((item) => (
                  <Button key={item.value} variant={status === item.value ? 'primary' : 'secondary'} icon={item.icon} onClick={() => mark(profile.id, item.value)}>
                    {language === 'th' ? item.labelTh : item.labelEn}
                  </Button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <StickyBottomBar label={language === 'th' ? 'ปุ่มเช็กชื่อด่วน' : 'Quick attendance actions'}>
        <Button variant="secondary" icon={<UploadCloud size={18} />} onClick={syncQueue} disabled={!queue.length}>Sync {queue.length}</Button>
        <Button variant="secondary" icon={<Search size={18} />} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{language === 'th' ? 'ค้นหา' : 'Search'}</Button>
      </StickyBottomBar>
    </section>
  );
}
