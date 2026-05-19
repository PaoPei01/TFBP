import { Download, Lock, RefreshCw, Shuffle } from 'lucide-react';
import { DragEvent, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ContactLinks } from '../components/ContactLinks';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { Toast, ToastState } from '../components/ui/Toast';
import { useAsync } from '../hooks/useAsync';
import { autoAssignGroups, calculateGroupStats, groupLabel, rebalanceGroups } from '../lib/grouping';
import { groupKey, groupMeta, mainGroups, subgroups } from '../lib/groups';
import { getMajorCode, majorLabel } from '../lib/major';
import type { GroupAssignment, GroupProfile, MainGroup, Subgroup } from '../lib/types';
import { fetchGroupProfiles, lockGroups, saveGroupAssignments } from '../services/groups';
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
  const state = useAsync(fetchGroupProfiles, []);
  const [drafts, setDrafts] = useState<Record<string, Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup' | 'notes'>>>({});
  const [toast, setToast] = useState<ToastState>(null);
  const profiles = useMemo(() => state.data ?? [], [state.data]);

  const effectiveAssignments = useMemo(
    () =>
      profiles
        .map((profile) => drafts[profile.id] ?? assignmentFromProfile(profile))
        .filter(Boolean) as Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup'>[],
    [drafts, profiles],
  );

  const stats = useMemo(() => calculateGroupStats(profiles, effectiveAssignments), [profiles, effectiveAssignments]);
  const assignedCount = effectiveAssignments.length;
  const warnings = stats.flatMap((item) => item.warnings.map((warning) => `${groupLabel(item.main_group, item.subgroup)}: ${warning}`));
  const locked = profiles.some((profile) => profile.group_assignment?.locked);

  function generate() {
    if (locked) {
      setToast({ type: 'error', message: 'กลุ่มถูกล็อกแล้ว ไม่สามารถ regenerate ได้' });
      return;
    }
    const existing = profiles.map(assignmentFromProfile).filter(Boolean) as Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup' | 'locked'>[];
    const next = autoAssignGroups(profiles, existing);
    setDrafts(Object.fromEntries(next.map((assignment) => [assignment.profile_id, assignment])));
    setToast({ type: 'success', message: 'สร้างกลุ่มแบบสมดุลแล้ว กดบันทึกเพื่ออัปเดต Supabase' });
  }

  function rebalance() {
    const current = effectiveAssignments.map((assignment) => ({ ...assignment, locked: false }));
    const next = rebalanceGroups(profiles, current);
    setDrafts(Object.fromEntries(next.map((assignment) => [assignment.profile_id, assignment])));
    setToast({ type: 'success', message: 'ปรับสมดุลใหม่แล้ว' });
  }

  async function save() {
    try {
      await saveGroupAssignments(Object.values(drafts));
      setToast({ type: 'success', message: 'บันทึกการจัดกลุ่มแล้ว' });
      setDrafts({});
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ' });
    }
  }

  async function lock() {
    try {
      await lockGroups();
      setToast({ type: 'success', message: 'ล็อกกลุ่มแล้ว' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'ล็อกไม่สำเร็จ' });
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

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">Smart Groups</p>
        <h1>ระบบจัดกลุ่มอัตโนมัติ</h1>
        <p>บาลานซ์ขนาดกลุ่ม สาขา และรอบการรับเข้า พร้อมปรับมือแบบลากวางก่อนล็อกกลุ่ม</p>
      </div>

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}

      <div className="stats-grid">
        <DashboardStatCard label="ผู้เข้าร่วมทั้งหมด" value={profiles.length} />
        <DashboardStatCard label="จัดกลุ่มแล้ว" value={assignedCount} />
        <DashboardStatCard label="คำเตือนสมดุล" value={warnings.length} />
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
            บันทึกการจัดกลุ่ม
          </Button>
          <Button variant="danger" icon={<Lock size={18} />} onClick={lock} disabled={locked || assignedCount === 0}>
            Lock Groups
          </Button>
          <Button variant="secondary" icon={<Download size={18} />} onClick={() => exportGroupsCsv(profiles)}>
            CSV
          </Button>
          <Button variant="secondary" icon={<Download size={18} />} onClick={() => exportGroupsXlsx(profiles, stats)}>
            Excel
          </Button>
        </div>
        {locked ? <Badge status="approved">ล็อกแล้ว</Badge> : <Badge status="pending">ยังแก้ไขได้</Badge>}
      </Card>

      {warnings.length ? (
        <Card className="warning-panel">
          <h2>Group imbalance warnings</h2>
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
                <h2>{groupMeta[mainGroup].th} / {groupMeta[mainGroup].en}</h2>
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
                return (
                  <div className="subgroup-drop" key={key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, mainGroup, subgroup)}>
                    <div className="subgroup-head">
                      <strong>Group {subgroup}</strong>
                      <span>{subgroupProfiles.length}/75</span>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: `${Math.min(100, (subgroupProfiles.length / 75) * 100)}%` }} />
                    </div>
                    <div className="mini-distribution">
                      {Object.entries(subgroupStats?.majorCounts ?? {}).slice(0, 5).map(([major, count]) => (
                        <small key={major}>{major} {count}</small>
                      ))}
                      <small>Medical {(subgroupStats?.medicalCounts['medical-one'] ?? 0) + (subgroupStats?.medicalCounts['medical-multiple'] ?? 0)}</small>
                    </div>
                    <div className="draggable-list">
                      {subgroupProfiles.slice(0, 16).map((profile) => (
                        <div className="drag-person" draggable={!locked} key={profile.id} onDragStart={(event) => event.dataTransfer.setData('text/plain', profile.id)}>
                          <strong>{profile.nickname || profile.name_th}</strong>
                          <span>{getMajorCode(profile.major)} · {profile.admission_round || 'Round ?'}</span>
                          <ContactLinks instagram={profile.instagram} facebook={profile.facebook} lineId={profile.line_id} compact />
                        </div>
                      ))}
                      {subgroupProfiles.length > 16 ? <small>+{subgroupProfiles.length - 16} more</small> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Card className="distribution-panel">
        <h2>Major distribution overview</h2>
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
        <h2>Registration / medical distribution</h2>
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
                medical {(item.medicalCounts['medical-one'] ?? 0) + (item.medicalCounts['medical-multiple'] ?? 0)}
              </small>
            </div>
          ))}
        </div>
      </Card>

      <Card className="distribution-panel">
        <h2>Unassigned participants</h2>
        <div className="unassigned-grid">
          {profiles
            .filter((profile) => !(drafts[profile.id] ?? profile.group_assignment))
            .slice(0, 80)
            .map((profile) => (
              <div className="drag-person" draggable={!locked} key={profile.id} onDragStart={(event) => event.dataTransfer.setData('text/plain', profile.id)}>
                <strong>{profile.nickname || profile.name_th}</strong>
                <span>{majorLabel(profile.major)} · {profile.admission_round || 'Round ?'}</span>
              </div>
            ))}
        </div>
      </Card>
    </section>
  );
}
