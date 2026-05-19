import { Search, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ContactLinks } from '../components/ContactLinks';
import { HealthFlags } from '../components/HealthFlags';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { groupMeta } from '../lib/groups';
import { majorLabel } from '../lib/major';
import { fetchStaffContext, settingKey } from '../services/groups';

export function StaffMobilePage() {
  const [search, setSearch] = useState('');
  const state = useAsync(fetchStaffContext, []);
  const context = state.data;
  const settingsByKey = useMemo(() => new Map((context?.settings ?? []).map((setting) => [settingKey(setting.main_group, setting.subgroup), setting])), [context?.settings]);
  const participants = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (context?.participants ?? []).filter((profile) => {
      if (!term) return true;
      return [profile.name_th, profile.name_en, profile.nickname, profile.major, profile.phone].some((value) => value?.toLowerCase().includes(term));
    });
  }, [context?.participants, search]);

  if (state.loading) return <LoadingSkeleton />;
  if (state.error) return <div className="error-state">{state.error}</div>;
  if (!context) return <div className="empty-state">บัญชีนี้ยังไม่ได้ถูก assign เป็น staff กลุ่มใด</div>;

  return (
    <section className="page-stack staff-page">
      <div className="section-heading">
        <p className="eyebrow">Staff Mobile View</p>
        <h1>{context.assignment ? groupLabel(context.assignment.main_group, context.assignment.subgroup) : 'All groups'}</h1>
        <p>ดูข้อมูลเฉพาะกลุ่มที่รับผิดชอบสำหรับหน้างาน</p>
      </div>

      <Card className="staff-summary-card">
        <UsersRound size={22} />
        <div>
          <strong>{participants.length} คน</strong>
          <span>ค้นหาเร็วด้วยชื่อ ชื่อเล่น สาขา หรือเบอร์โทร</span>
        </div>
      </Card>

      {context.staff_roster?.length ? (
        <Card className="staff-roster-panel">
          <h2>พี่กลุ่ม</h2>
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
                <div><span>จุดนัดพบ</span><strong>{setting?.meeting_point || '-'}</strong></div>
                <div><span>เวลา</span><strong>{setting?.schedule || '-'}</strong></div>
                <div><span>เบอร์</span><strong>{profile.phone || '-'}</strong></div>
                <div><span>ฉุกเฉิน</span><strong>{profile.emergency_phone || '-'}</strong></div>
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
