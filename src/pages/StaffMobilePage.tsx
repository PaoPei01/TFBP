import { ClipboardCheck, Home, MapPin, Phone, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ContactLinks } from '../components/ContactLinks';
import { hasHealthFlag, HealthFlags } from '../components/HealthFlags';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MobileSearchHeader } from '../components/mobile/MobileSearchHeader';
import { Card } from '../components/ui/Card';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { groupMeta } from '../lib/groups';
import { majorLabel } from '../lib/major';
import { settingKey } from '../services/groups';
import { fetchStaffGroupContext } from '../services/staff';

export function StaffMobilePage() {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'special' | 'sameMajor'>('all');
  const state = useAsync(fetchStaffGroupContext, []);
  const context = state.data;
  const canViewMedical = Boolean(context?.access.is_admin || context?.access.roles.includes('emergency_staff'));
  const canCallStaff = Boolean(context?.access.is_admin || context?.access.can_mark_attendance || context?.access.can_view_staff);
  const referenceMajor = context?.participants?.[0]?.major ?? null;
  const settingsByKey = useMemo(() => new Map((context?.settings ?? []).map((setting) => [settingKey(setting.main_group, setting.subgroup), setting])), [context?.settings]);
  const participants = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (context?.participants ?? []).filter((profile) => {
      if (quickFilter === 'special' && (!canViewMedical || !hasHealthFlag(profile))) return false;
      if (quickFilter === 'sameMajor' && referenceMajor && profile.major !== referenceMajor) return false;
      if (!term) return true;
      return [profile.name_th, profile.name_en, profile.nickname, profile.nickname_en, profile.major, profile.phone].some((value) => value?.toLowerCase().includes(term));
    });
  }, [canViewMedical, context?.participants, quickFilter, referenceMajor, search]);
  const primarySetting = context?.settings?.[0];
  const lastUpdated = new Date().toLocaleString(language === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });

  if (state.loading) return <LoadingSkeleton />;
  if (state.error) return <div className="error-state">{state.error}</div>;
  if (!context) return <div className="empty-state">{language === 'th' ? 'บัญชีนี้ยังไม่ได้ถูก assign เป็น staff กลุ่มใด' : 'This account has not been assigned to a staff group.'}</div>;

  return (
    <section className="page-stack staff-page">
      <div className="section-heading">
        <p className="eyebrow">{context.assignment?.main_group ? groupLabel(context.assignment.main_group, context.assignment.subgroup, language) : language === 'th' ? 'ทุกกลุ่ม' : 'All groups'}</p>
        <h1>{language === 'th' ? 'รายชื่อกลุ่มของฉัน' : 'My group list'}</h1>
        <p>{language === 'th' ? 'ดูรายชื่อ น้องในกลุ่ม จุดนัดหมาย และข้อมูลสำคัญที่ต้องใช้ระหว่างกิจกรรม' : 'View your group list, meeting point, and important event-day information.'}</p>
      </div>

      <div className="staff-sticky-actions">
        <Link className="btn btn-secondary" to="/staff"><Home size={18} />{language === 'th' ? 'หน้าหลัก' : 'Home'}</Link>
        {context.access.can_mark_attendance ? <Link className="btn btn-primary" to="/staff/attendance"><ClipboardCheck size={18} />{language === 'th' ? 'เช็กชื่อ' : 'Attendance'}</Link> : null}
        <span className="last-updated">{language === 'th' ? 'อัปเดต' : 'Updated'} {lastUpdated}</span>
      </div>

      {canViewMedical ? (
        <Card className="emergency-notice compact-notice">
          <strong>{language === 'th' ? 'ข้อมูลสุขภาพเป็นข้อมูลส่วนตัว' : 'Health details are private'}</strong>
          <span>{language === 'th' ? 'ใช้เฉพาะเพื่อดูแลความปลอดภัยระหว่างกิจกรรมเท่านั้น ห้ามส่งต่อหรือเผยแพร่' : 'Use them only for safety during the event. Do not share or publish them.'}</span>
        </Card>
      ) : null}

      <div className="staff-top-grid">
        <Card className="staff-summary-card">
          <UsersRound size={22} />
          <div>
            <strong>{participants.length} {language === 'th' ? 'คน' : 'people'}</strong>
            <span>{language === 'th' ? 'ผู้เข้าร่วมในความรับผิดชอบ' : 'Assigned participants'}</span>
          </div>
        </Card>
        <Card className="staff-summary-card">
          <MapPin size={22} />
          <div>
            <strong>{primarySetting?.meeting_point || (language === 'th' ? 'ยังไม่ระบุ' : 'Not set')}</strong>
            <span>{primarySetting?.schedule || (language === 'th' ? 'ยังไม่ระบุตาราง' : 'Schedule not set')}</span>
          </div>
        </Card>
      </div>

      {context.staff_roster?.length ? (
        <Card className="staff-roster-panel">
          <div className="staff-section-head">
            <h2>{language === 'th' ? 'พี่กลุ่ม' : 'Group staff'}</h2>
            <span>{context.staff_roster.length} {language === 'th' ? 'คน' : 'people'}</span>
          </div>
          <div className="staff-roster-grid">
            {context.staff_roster.map((staff) => (
              <div key={`${staff.main_group}-${staff.subgroup}-${staff.student_id || staff.name}`} className="staff-roster-person">
                <strong>{staff.nickname || staff.name}</strong>
                <span>{staff.name}</span>
                <ContactLinks instagram={staff.instagram} facebook={staff.facebook} lineId={staff.line_id} other={staff.other_contact} />
                {canCallStaff && staff.phone ? <a className="btn btn-secondary btn-compact" href={`tel:${staff.phone}`}><Phone size={16} />{language === 'th' ? 'โทร' : 'Call'}</a> : null}
                {canViewMedical && hasHealthFlag(staff) ? (
                  <details className="staff-health-details">
                    <summary>
                      <span className="special-care-badge">{language === 'th' ? 'ต้องดูแลเป็นพิเศษ' : 'Needs special care'}</span>
                      <em>{language === 'th' ? 'ดูรายละเอียดสุขภาพ' : 'View health details'}</em>
                    </summary>
                    <HealthFlags profile={staff} detail />
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <MobileSearchHeader
        label={language === 'th' ? 'ค้นหาในกลุ่ม' : 'Search group'}
        value={search}
        onChange={setSearch}
        placeholder={language === 'th' ? 'ชื่อ ชื่อเล่น เบอร์ หรือสาขา' : 'Name, nickname, phone, or major'}
        resultText={`${participants.length} ${language === 'th' ? 'คน' : 'people'}`}
      />
      <div className="segmented-control compact-segments" aria-label={language === 'th' ? 'ตัวกรองด่วน' : 'Quick filters'}>
        {[
          { value: 'all', label: language === 'th' ? 'ทั้งหมด' : 'All' },
          ...(canViewMedical ? [{ value: 'special', label: language === 'th' ? 'ต้องดูแลเป็นพิเศษ' : 'Needs special care' }] : []),
          { value: 'sameMajor', label: language === 'th' ? 'สาขาเดียวกัน' : 'Same major' },
        ].map((item) => (
          <button key={item.value} type="button" className={quickFilter === item.value ? 'active' : ''} onClick={() => setQuickFilter(item.value as typeof quickFilter)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="staff-list">
        <div className="staff-section-head">
          <h2>{language === 'th' ? 'น้องในกลุ่ม' : 'Group participants'}</h2>
          <span>{participants.length} {language === 'th' ? 'คน' : 'people'}</span>
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
                  <h2>{language === 'en' ? profile.nickname_en || profile.nickname || profile.name_en || profile.name_th : profile.nickname || profile.name_th}</h2>
                  <p>{language === 'en' ? profile.name_en || profile.name_th : profile.name_th}</p>
                  {canViewMedical && hasHealthFlag(profile) ? <span className="special-care-badge">{language === 'th' ? 'ต้องดูแลเป็นพิเศษ' : 'Needs special care'}</span> : null}
                </div>
              </div>
              <div className="profile-facts">
                <div><span>{language === 'th' ? 'สาขา' : 'Major'}</span><strong>{majorLabel(profile.major, language)}</strong></div>
                <div><span>{language === 'th' ? 'กลุ่ม' : 'Group'}</span><strong>{groupLabel(assignment?.main_group, assignment?.subgroup, language)}</strong></div>
                <div><span>{language === 'th' ? 'เบอร์' : 'Phone'}</span><strong>{profile.phone || '-'}</strong></div>
                <div><span>{language === 'th' ? 'ฉุกเฉิน' : 'Emergency'}</span><strong>{profile.emergency_phone || '-'}</strong></div>
              </div>
              <div className="staff-operation-note">
                <strong>{setting?.meeting_point || '-'}</strong>
                <span>{setting?.schedule || '-'}</span>
              </div>
              {canViewMedical && hasHealthFlag(profile) ? (
                <details className="staff-health-details">
                  <summary>
                    <span className="special-care-badge">{language === 'th' ? 'ต้องดูแลเป็นพิเศษ' : 'Needs special care'}</span>
                    <em>{language === 'th' ? 'ดูรายละเอียดสุขภาพ' : 'View health details'}</em>
                  </summary>
                  <HealthFlags profile={profile} detail />
                </details>
              ) : null}
              <ContactLinks instagram={profile.instagram} facebook={profile.facebook} lineId={profile.line_id} other={profile.other_contact} />
            </Card>
          );
        })}
      </div>
    </section>
  );
}
