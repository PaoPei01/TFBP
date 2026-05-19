import { ClipboardCheck, Home, MapPin, Search, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ContactLinks } from '../components/ContactLinks';
import { HealthFlags } from '../components/HealthFlags';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { groupMeta } from '../lib/groups';
import { majorLabel } from '../lib/major';
import { settingKey } from '../services/groups';
import { fetchStaffGroupContext } from '../services/staff';

export function StaffMobilePage() {
  const [search, setSearch] = useState('');
  const state = useAsync(fetchStaffGroupContext, []);
  const context = state.data;
  const settingsByKey = useMemo(() => new Map((context?.settings ?? []).map((setting) => [settingKey(setting.main_group, setting.subgroup), setting])), [context?.settings]);
  const participants = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (context?.participants ?? []).filter((profile) => {
      if (!term) return true;
      return [profile.name_th, profile.name_en, profile.nickname, profile.major, profile.phone].some((value) => value?.toLowerCase().includes(term));
    });
  }, [context?.participants, search]);
  const primarySetting = context?.settings?.[0];

  if (state.loading) return <LoadingSkeleton />;
  if (state.error) return <div className="error-state">{state.error}</div>;
  if (!context) return <div className="empty-state">บัญชีนี้ยังไม่ได้ถูก assign เป็น staff กลุ่มใด</div>;

  return (
    <section className="page-stack staff-page">
      <div className="section-heading">
        <p className="eyebrow">Staff Mobile View</p>
        <h1>{context.assignment?.main_group ? groupLabel(context.assignment.main_group, context.assignment.subgroup) : 'All groups'}</h1>
        <p>ดูข้อมูลเฉพาะกลุ่มที่รับผิดชอบสำหรับหน้างาน</p>
      </div>

      <div className="staff-sticky-actions">
        <Link className="btn btn-secondary" to="/staff"><Home size={18} />หน้าหลัก</Link>
        {context.access.can_mark_attendance ? <Link className="btn btn-primary" to="/staff/attendance"><ClipboardCheck size={18} />เช็กชื่อ</Link> : null}
      </div>

      <div className="staff-top-grid">
        <Card className="staff-summary-card">
          <UsersRound size={22} />
          <div>
            <strong>{participants.length} คน</strong>
            <span>ผู้เข้าร่วมในความรับผิดชอบ</span>
          </div>
        </Card>
        <Card className="staff-summary-card">
          <MapPin size={22} />
          <div>
            <strong>{primarySetting?.meeting_point || 'ยังไม่ระบุ'}</strong>
            <span>{primarySetting?.schedule || 'ยังไม่ระบุตาราง'}</span>
          </div>
        </Card>
      </div>

      {context.staff_roster?.length ? (
        <Card className="staff-roster-panel">
          <div className="staff-section-head">
            <h2>พี่กลุ่ม</h2>
            <span>{context.staff_roster.length} คน</span>
          </div>
          <div className="staff-roster-grid">
            {context.staff_roster.map((staff) => (
              <div key={`${staff.main_group}-${staff.subgroup}-${staff.student_id || staff.name}`} className="staff-roster-person">
                <strong>{staff.nickname || staff.name}</strong>
                <span>{staff.name}</span>
                <small>{staff.phone || '-'}</small>
                <HealthFlags profile={staff} detail />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="search-shell">
        <Search size={18} aria-hidden="true" />
        <Input label="ค้นหาในกลุ่ม" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ชื่อ ชื่อเล่น เบอร์ หรือสาขา" />
      </div>

      <div className="staff-list">
        <div className="staff-section-head">
          <h2>น้องในกลุ่ม</h2>
          <span>{participants.length} คน</span>
        </div>
        {participants.map((profile) => {
          const assignment = profile.group_assignment;
          const setting = settingsByKey.get(settingKey(assignment?.main_group, assignment?.subgroup));
          return (
            <Card
              className="staff-participant-card"
              key={profile.id}
              style={
                assignment?.main_group
                  ? ({
                      '--group-color': groupMeta[assignment.main_group].color,
                      '--group-soft': groupMeta[assignment.main_group].soft,
                    } as CSSProperties)
                  : undefined
              }
            >
              <div className="staff-card-head">
                <span className="group-dot" />
                <div>
                  <h2>{profile.nickname || profile.name_th}</h2>
                  <p>{profile.name_th}</p>
                </div>
              </div>
              <div className="profile-facts">
                <div><span>สาขา</span><strong>{majorLabel(profile.major)}</strong></div>
                <div><span>กลุ่ม</span><strong>{groupLabel(assignment?.main_group, assignment?.subgroup)}</strong></div>
                <div><span>เบอร์</span><strong>{profile.phone || '-'}</strong></div>
                <div><span>ฉุกเฉิน</span><strong>{profile.emergency_phone || '-'}</strong></div>
              </div>
              <div className="staff-operation-note">
                <strong>{setting?.meeting_point || '-'}</strong>
                <span>{setting?.schedule || '-'}</span>
              </div>
              <HealthFlags profile={profile} detail />
              <ContactLinks instagram={profile.instagram} facebook={profile.facebook} lineId={profile.line_id} other={profile.other_contact} />
            </Card>
          );
        })}
      </div>
    </section>
  );
}
