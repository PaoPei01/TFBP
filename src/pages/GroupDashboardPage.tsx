import { Download, Lock, RefreshCw, Shuffle, Trash2 } from 'lucide-react';
import { DragEvent, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ContactLinks } from '../components/ContactLinks';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MobileGroupTabs } from '../components/mobile/MobileGroupTabs';
import { StickyBottomBar } from '../components/mobile/StickyBottomBar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { autoAssignGroups, calculateGroupStats, groupLabel, rebalanceGroups } from '../lib/grouping';
import { groupKey, groupMeta, mainGroups, subgroups } from '../lib/groups';
import { getMajorCode, majorLabel } from '../lib/major';
import type { GroupAssignment, GroupProfile, GroupSetting, MainGroup, Subgroup } from '../lib/types';
import { fetchGroupProfiles, fetchGroupSettings, lockGroups, saveGroupAssignments, saveGroupSetting, settingKey } from '../services/groups';
import { clearGroupAssignments } from '../services/profiles';
import { errorMessage } from '../utils/error';
import { exportGroupsCsv, exportGroupsXlsx } from '../utils/groupExport';

function assignmentFromProfile(profile: GroupProfile): Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup' | 'locked'> | null {
  if (!profile.group_assignment) return null;
  return {
    profile_id: profile.id,
    main_group: profile.group_assignment.main_group,
    subgroup: profile.group_assignment.subgroup,
    locked: profile.group_assignment.locked,
  };
}

export function GroupDashboardPage() {
  const { language } = useLanguage();
  const state = useAsync(fetchGroupProfiles, []);
  const settingsState = useAsync(fetchGroupSettings, []);
  const [drafts, setDrafts] = useState<Record<string, Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup' | 'notes'>>>({});
  const [activeGroup, setActiveGroup] = useState<{ mainGroup: MainGroup; subgroup: Subgroup }>({ mainGroup: 'Red', subgroup: 'A' });
  const [auditReady, setAuditReady] = useState(false);
  const [editingSetting, setEditingSetting] = useState<Pick<GroupSetting, 'main_group' | 'subgroup' | 'motto' | 'meeting_point' | 'schedule' | 'mentors'>>({
    main_group: 'Red',
    subgroup: 'A',
    motto: '',
    meeting_point: '',
    schedule: '',
    mentors: '',
  });
  const [toast, setToast] = useState<ToastState>(null);
  const profiles = useMemo(() => state.data ?? [], [state.data]);
  const settingsByKey = useMemo(() => new Map((settingsState.data ?? []).map((setting) => [settingKey(setting.main_group, setting.subgroup), setting])), [settingsState.data]);

  const effectiveAssignments = useMemo(
    () =>
      profiles
        .map((profile) => drafts[profile.id] ?? assignmentFromProfile(profile))
        .filter(Boolean) as Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup'>[],
    [drafts, profiles],
  );

  const stats = useMemo(() => calculateGroupStats(profiles, effectiveAssignments), [profiles, effectiveAssignments]);
  const assignedCount = effectiveAssignments.length;
  const groupCounts = useMemo(() => Object.fromEntries(stats.map((item) => [item.key, item.count])), [stats]);
  const warnings = stats.flatMap((item) => item.warnings.map((warning) => `${groupLabel(item.main_group, item.subgroup, language)}: ${warning}`));
  const locked = profiles.some((profile) => profile.group_assignment?.locked);

  function generate() {
    if (locked) {
      setToast({ type: 'error', message: language === 'th' ? 'กลุ่มถูกล็อกแล้ว ไม่สามารถ regenerate ได้' : 'Groups are locked and cannot be regenerated.' });
      return;
    }
    const existing = profiles.map(assignmentFromProfile).filter(Boolean) as Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup' | 'locked'>[];
    const next = autoAssignGroups(profiles, existing);
      setDrafts(Object.fromEntries(next.map((assignment) => [assignment.profile_id, assignment])));
      setAuditReady(false);
    setToast({ type: 'success', message: language === 'th' ? 'สร้างกลุ่มแบบสมดุลแล้ว กดบันทึกเพื่ออัปเดต Supabase' : 'Balanced groups generated. Save to update Supabase.' });
  }

  function rebalance() {
    const current = effectiveAssignments.map((assignment) => ({ ...assignment, locked: false }));
    const next = rebalanceGroups(profiles, current);
    setDrafts(Object.fromEntries(next.map((assignment) => [assignment.profile_id, assignment])));
    setAuditReady(false);
    setToast({ type: 'success', message: language === 'th' ? 'ปรับสมดุลใหม่แล้ว' : 'Groups rebalanced' });
  }

  async function save() {
    try {
      await saveGroupAssignments(Object.values(drafts));
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกการจัดกลุ่มแล้ว' : 'Group assignments saved' });
      setDrafts({});
      setAuditReady(false);
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed') });
    }
  }

  async function lock() {
    if (!auditReady) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณา Export/Audit ก่อนล็อกกลุ่ม' : 'Please export/audit before locking groups.' });
      return;
    }
    try {
      await lockGroups();
      setToast({ type: 'success', message: language === 'th' ? 'ล็อกกลุ่มแล้ว' : 'Groups locked' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ล็อกไม่สำเร็จ' : 'Lock failed') });
    }
  }

  async function exportAudit() {
    await exportGroupsXlsx(profiles, stats);
    setAuditReady(true);
    setToast({ type: 'success', message: language === 'th' ? 'Export/Audit แล้ว สามารถ Lock Groups ได้' : 'Export/audit completed. Groups can now be locked.' });
  }

  async function saveSetting() {
    try {
      await saveGroupSetting(editingSetting);
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกประกาศกลุ่มแล้ว' : 'Group announcement saved' });
      await settingsState.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกประกาศไม่สำเร็จ' : 'Announcement save failed') });
    }
  }

  async function clearAssignments() {
    const confirmed = window.confirm(language === 'th' ? 'ต้องการลบข้อมูลการจัดกลุ่มทั้งหมดใช่ไหม? หลังจากนี้สามารถ Auto Generate ใหม่ได้' : 'Clear all group assignments? You can auto-generate again afterward.');
    if (!confirmed) return;
    try {
      await clearGroupAssignments();
      setDrafts({});
      setAuditReady(false);
      setToast({ type: 'success', message: language === 'th' ? 'ลบข้อมูลการจัดกลุ่มทั้งหมดแล้ว' : 'All group assignments cleared' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ลบข้อมูลการจัดกลุ่มไม่สำเร็จ' : 'Failed to clear group assignments') });
    }
  }

  function onDrop(event: DragEvent, mainGroup: MainGroup, subgroup: Subgroup) {
    const profileId = event.dataTransfer.getData('text/plain');
    if (!profileId || locked) return;
    setDrafts((current) => ({
      ...current,
      [profileId]: { profile_id: profileId, main_group: mainGroup, subgroup, notes: 'manual-adjust' },
    }));
  }

  function assignTo(profileId: string, mainGroup = activeGroup.mainGroup, subgroup = activeGroup.subgroup) {
    if (!profileId || locked) return;
    setDrafts((current) => ({
      ...current,
      [profileId]: { profile_id: profileId, main_group: mainGroup, subgroup, notes: 'mobile-quick-move' },
    }));
    setAuditReady(false);
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">Smart Groups</p>
        <h1>{language === 'th' ? 'ระบบจัดกลุ่มอัตโนมัติ' : 'Smart group assignment'}</h1>
        <p>{language === 'th' ? 'บาลานซ์ขนาดกลุ่ม สาขา และรอบการรับเข้า พร้อมปรับมือแบบลากวางก่อนล็อกกลุ่ม' : 'Balance group size, majors, and registration order with drag-and-drop manual adjustment before locking.'}</p>
      </div>

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}

      <div className="stats-grid">
        <DashboardStatCard label={language === 'th' ? 'ผู้เข้าร่วมทั้งหมด' : 'Total participants'} value={profiles.length} />
        <DashboardStatCard label={language === 'th' ? 'จัดกลุ่มแล้ว' : 'Assigned'} value={assignedCount} />
        <DashboardStatCard label={language === 'th' ? 'คำเตือนสมดุล' : 'Balance warnings'} value={warnings.length} />
      </div>

      <Card className="group-action-panel">
        <div className="form-actions">
          <Button icon={<Shuffle size={18} />} onClick={generate} disabled={locked}>
            Auto Generate Groups
          </Button>
          <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={rebalance} disabled={locked || assignedCount === 0}>
            Rebalance
          </Button>
          <Button variant="secondary" onClick={save} disabled={!Object.keys(drafts).length || locked}>
            {language === 'th' ? 'บันทึกการจัดกลุ่ม' : 'Save assignments'}
          </Button>
          <Button variant="danger" icon={<Lock size={18} />} onClick={lock} disabled={locked || assignedCount === 0}>
            Lock Groups
          </Button>
          <Button variant="danger" icon={<Trash2 size={18} />} onClick={clearAssignments} disabled={assignedCount === 0}>
            {language === 'th' ? 'ลบการจัดกลุ่มทั้งหมด' : 'Clear all groups'}
          </Button>
          <Button variant="secondary" icon={<Download size={18} />} onClick={() => exportGroupsCsv(profiles)}>
            CSV
          </Button>
          <Button variant="secondary" icon={<Download size={18} />} onClick={exportAudit}>
            Audit + Excel
          </Button>
        </div>
        {locked ? <Badge status="approved">{language === 'th' ? 'ล็อกแล้ว' : 'Locked'}</Badge> : auditReady ? <Badge status="approved">{language === 'th' ? 'Audit พร้อมล็อก' : 'Audit ready'}</Badge> : <Badge status="pending">{language === 'th' ? 'ต้อง Audit ก่อนล็อก' : 'Audit required before lock'}</Badge>}
      </Card>

      <MobileGroupTabs
        activeMainGroup={activeGroup.mainGroup}
        activeSubgroup={activeGroup.subgroup}
        counts={groupCounts}
        language={language}
        onChange={(mainGroup, subgroup) => setActiveGroup({ mainGroup, subgroup })}
      />

      <Card className="group-settings-panel">
        <div>
          <h2>{language === 'th' ? 'ประกาศกลุ่ม' : 'Group announcement'}</h2>
          <p>{language === 'th' ? 'แก้ motto, ตารางเวลา, จุดนัดพบ และพี่สตาฟ โดยข้อมูลนี้จะแสดงในหน้า participant และ staff' : 'Edit motto, schedule, meeting point, and staff shown on participant and staff pages.'}</p>
        </div>
        <div className="form-grid two-col">
          <Select
            label={language === 'th' ? 'สี' : 'Color'}
            value={editingSetting.main_group}
            options={mainGroups.map((group) => ({ value: group, label: language === 'th' ? groupMeta[group].th : group }))}
            onChange={(event) => {
              const main_group = event.target.value as MainGroup;
              const existing = settingsByKey.get(settingKey(main_group, editingSetting.subgroup));
              setEditingSetting({ main_group, subgroup: editingSetting.subgroup, motto: existing?.motto ?? '', meeting_point: existing?.meeting_point ?? '', schedule: existing?.schedule ?? '', mentors: existing?.mentors ?? '' });
            }}
          />
          <Select
            label={language === 'th' ? 'กลุ่มย่อย' : 'Subgroup'}
            value={editingSetting.subgroup}
            options={subgroups.map((subgroup) => ({ value: subgroup, label: `Group ${subgroup}` }))}
            onChange={(event) => {
              const subgroup = event.target.value as Subgroup;
              const existing = settingsByKey.get(settingKey(editingSetting.main_group, subgroup));
              setEditingSetting({ main_group: editingSetting.main_group, subgroup, motto: existing?.motto ?? '', meeting_point: existing?.meeting_point ?? '', schedule: existing?.schedule ?? '', mentors: existing?.mentors ?? '' });
            }}
          />
          <Input label={language === 'th' ? 'คำขวัญกลุ่ม' : 'Motto'} value={editingSetting.motto ?? ''} onChange={(event) => setEditingSetting({ ...editingSetting, motto: event.target.value })} />
          <Input label={language === 'th' ? 'จุดนัดพบ' : 'Meeting point'} value={editingSetting.meeting_point ?? ''} onChange={(event) => setEditingSetting({ ...editingSetting, meeting_point: event.target.value })} />
          <Input label={language === 'th' ? 'ตารางเวลา' : 'Schedule'} value={editingSetting.schedule ?? ''} onChange={(event) => setEditingSetting({ ...editingSetting, schedule: event.target.value })} />
          <Input label={language === 'th' ? 'พี่สตาฟ/เมนเทอร์' : 'Staff / mentors'} value={editingSetting.mentors ?? ''} onChange={(event) => setEditingSetting({ ...editingSetting, mentors: event.target.value })} />
          <div className="form-actions full-span">
            <Button onClick={saveSetting}>{language === 'th' ? 'บันทึกประกาศกลุ่ม' : 'Save announcement'}</Button>
          </div>
        </div>
      </Card>

      {warnings.length ? (
        <Card className="warning-panel">
          <h2>{language === 'th' ? 'คำเตือนความสมดุลของกลุ่ม' : 'Group imbalance warnings'}</h2>
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </Card>
      ) : null}

      <div className="group-board">
        {mainGroups.map((mainGroup) => (
          <Card key={mainGroup} className="main-group-card" style={{ '--group-color': groupMeta[mainGroup].color, '--group-soft': groupMeta[mainGroup].soft } as CSSProperties}>
            <header>
              <span className="group-dot" />
              <div>
                <h2>{language === 'th' ? groupMeta[mainGroup].th : groupMeta[mainGroup].en}</h2>
                <p>{groupMeta[mainGroup].motto}</p>
              </div>
            </header>
            <div className="subgroup-grid">
              {subgroups.map((subgroup) => {
                const key = groupKey(mainGroup, subgroup);
                const subgroupProfiles = profiles.filter((profile) => {
                  const draft = drafts[profile.id];
                  const assignment = draft ?? profile.group_assignment;
                  return assignment?.main_group === mainGroup && assignment?.subgroup === subgroup;
                });
                const subgroupStats = stats.find((item) => item.key === key);
                const setting = settingsByKey.get(key);
                return (
                  <div className="subgroup-drop" key={key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, mainGroup, subgroup)}>
                    <div className="subgroup-head">
                      <strong>Group {subgroup}</strong>
                      <span>{subgroupProfiles.length}/75</span>
                    </div>
                    <p className="subgroup-note">{setting?.meeting_point || groupMeta[mainGroup].meetingPoint}</p>
                    <div className="progress-track">
                      <span style={{ width: `${Math.min(100, (subgroupProfiles.length / 75) * 100)}%` }} />
                    </div>
                    <div className="mini-distribution">
                      {Object.entries(subgroupStats?.majorCounts ?? {}).slice(0, 5).map(([major, count]) => (
                        <small key={major}>{major} {count}</small>
                      ))}
                      <small>{language === 'th' ? 'สุขภาพ' : 'Medical'} {(subgroupStats?.medicalCounts['medical-one'] ?? 0) + (subgroupStats?.medicalCounts['medical-multiple'] ?? 0)}</small>
                    </div>
                    <div className="draggable-list">
                      {subgroupProfiles.slice(0, 16).map((profile) => (
                        <div className="drag-person" draggable={!locked} key={profile.id} onDragStart={(event) => event.dataTransfer.setData('text/plain', profile.id)}>
                          <strong>{profile.nickname || profile.name_th}</strong>
                          <span>{getMajorCode(profile.major)} · {profile.admission_round || (language === 'th' ? 'รอบ ?' : 'Round ?')}</span>
                          <ContactLinks instagram={profile.instagram} facebook={profile.facebook} lineId={profile.line_id} compact />
                          <div className="quick-move-row">
                            <button type="button" onClick={() => assignTo(profile.id)} disabled={locked}>
                              {language === 'th' ? 'ย้ายไปแท็บที่เลือก' : 'Move to selected'}
                            </button>
                          </div>
                        </div>
                      ))}
                      {subgroupProfiles.length > 16 ? <small>+{subgroupProfiles.length - 16} {language === 'th' ? 'คน' : 'more'}</small> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Card className="distribution-panel">
        <h2>{language === 'th' ? 'ภาพรวมการกระจายสาขา' : 'Major distribution overview'}</h2>
        <div className="stacked-bars">
          {stats.map((item) => (
            <div key={item.key}>
              <span>{item.main_group} {item.subgroup}</span>
              <div>
                {Object.entries(item.majorCounts).map(([major, count]) => (
                  <i key={major} title={`${major}: ${count}`} style={{ width: `${Math.max(4, (count / Math.max(1, item.count)) * 100)}%` }}>
                    {major}
                  </i>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="distribution-panel">
        <h2>{language === 'th' ? 'การกระจายตามลำดับลงทะเบียน / สุขภาพ' : 'Registration / medical distribution'}</h2>
        <div className="stacked-bars">
          {stats.map((item) => (
            <div key={`${item.key}-medical`}>
              <span>{item.main_group} {item.subgroup}</span>
              <div>
                {Object.entries(item.registrationCounts).slice(0, 8).map(([bucket, count]) => (
                  <i key={bucket} title={`${bucket}: ${count}`} style={{ width: `${Math.max(4, (count / Math.max(1, item.count)) * 100)}%` }}>
                    {count}
                  </i>
                ))}
              </div>
              <small>
                {language === 'th' ? 'สุขภาพ' : 'medical'} {(item.medicalCounts['medical-one'] ?? 0) + (item.medicalCounts['medical-multiple'] ?? 0)}
              </small>
            </div>
          ))}
        </div>
      </Card>

      <Card className="distribution-panel">
        <h2>{language === 'th' ? 'ผู้เข้าร่วมที่ยังไม่ถูกจัดกลุ่ม' : 'Unassigned participants'}</h2>
        <div className="unassigned-grid">
          {profiles
            .filter((profile) => !(drafts[profile.id] ?? profile.group_assignment))
            .slice(0, 80)
            .map((profile) => (
              <div className="drag-person" draggable={!locked} key={profile.id} onDragStart={(event) => event.dataTransfer.setData('text/plain', profile.id)}>
                <strong>{profile.nickname || profile.name_th}</strong>
                <span>{majorLabel(profile.major, language)} · {profile.admission_round || (language === 'th' ? 'รอบ ?' : 'Round ?')}</span>
                <div className="quick-move-row">
                  <button type="button" onClick={() => assignTo(profile.id)} disabled={locked}>
                    {language === 'th' ? `ส่งเข้า ${groupLabel(activeGroup.mainGroup, activeGroup.subgroup, language)}` : `Move to ${groupLabel(activeGroup.mainGroup, activeGroup.subgroup, language)}`}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </Card>

      <StickyBottomBar label={language === 'th' ? 'ปุ่มจัดกลุ่มด่วน' : 'Quick group actions'}>
        <Button icon={<Shuffle size={18} />} onClick={generate} disabled={locked}>Auto</Button>
        <Button variant="secondary" onClick={save} disabled={!Object.keys(drafts).length || locked}>{language === 'th' ? 'บันทึก' : 'Save'}</Button>
        <Button variant="secondary" icon={<Download size={18} />} onClick={exportAudit}>Audit</Button>
      </StickyBottomBar>
    </section>
  );
}
