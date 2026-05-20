import { AlertTriangle, BarChart3, Phone, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Toast, ToastState } from '../components/ui/Toast';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MobileSearchHeader } from '../components/mobile/MobileSearchHeader';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { fetchStaffOperationsAnalytics } from '../services/staffManagement';
import { errorMessage } from '../utils/error';

const statusMap = {
  green: 'approved',
  yellow: 'pending',
  red: 'rejected',
} as const;

export function StaffOperationsPage() {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const state = useAsync(fetchStaffOperationsAnalytics, []);
  const quotaRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (state.data?.quota.rows ?? []).filter((row) => !term || row.role_name.toLowerCase().includes(term));
  }, [search, state.data?.quota.rows]);
  const quotaCompletion = state.data?.quota.rows?.length
    ? Math.round((state.data.quota.rows.reduce((sum, row) => sum + Math.min(row.unique_staff_count, row.target_count), 0) / state.data.quota.rows.reduce((sum, row) => sum + row.target_count, 0)) * 100)
    : 0;
  const distribution = useMemo(() => {
    const roleCounts = new Map<string, number>();
    const groupCounts = new Map<string, number>();
    const subgroupCounts = new Map<string, number>();
    (state.data?.staff ?? []).forEach((staff) => {
      const assignment = staff.assignment;
      const roles = [assignment?.primary_role, ...(assignment?.secondary_roles ?? [])].filter(Boolean) as string[];
      roles.forEach((role) => roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1));
      if (assignment?.main_group) groupCounts.set(assignment.main_group, (groupCounts.get(assignment.main_group) ?? 0) + 1);
      if (assignment?.main_group || assignment?.subgroup) {
        const label = groupLabel(assignment?.main_group, assignment?.subgroup, language);
        subgroupCounts.set(label, (subgroupCounts.get(label) ?? 0) + 1);
      }
    });
    return {
      roles: [...roleCounts.entries()].sort((a, b) => b[1] - a[1]),
      groups: [...groupCounts.entries()].sort((a, b) => b[1] - a[1]),
      subgroups: [...subgroupCounts.entries()].sort((a, b) => b[1] - a[1]),
      bases: roleCounts.get('พี่ฐาน') ?? 0,
    };
  }, [language, state.data?.staff]);

  async function reload() {
    try {
      await state.reload();
      setToast({ type: 'success', message: language === 'th' ? 'อัปเดตข้อมูล operations แล้ว' : 'Operations data refreshed' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'โหลดข้อมูลไม่สำเร็จ' : 'Refresh failed') });
    }
  }

  if (state.loading) return <LoadingSkeleton />;
  if (state.error) return <div className="error-state">{state.error}</div>;

  const data = state.data;
  if (!data) return <div className="empty-state">{language === 'th' ? 'ยังไม่มีข้อมูล operations' : 'No operations data yet'}</div>;

  return (
    <section className="page-stack staff-operations-page">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">Staff Operations</p>
        <h1>{language === 'th' ? 'โควตาและความพร้อมทีมงาน' : 'Staff quota and readiness'}</h1>
        <p>{language === 'th' ? 'ตรวจจำนวนคนตามหน้าที่ บทบาทซ้อน จุดขาด และความพร้อมก่อนวันกิจกรรม' : 'Track role capacity, overlaps, shortages, and operational readiness before the event.'}</p>
      </div>

      <div className="staff-sticky-actions">
        <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>
      </div>

      <div className="stats-grid">
        <DashboardStatCard label={language === 'th' ? 'ทีมงานทั้งหมด' : 'Total staff'} value={data.quota.total_staff} icon={<UsersRound size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'ไม่ซ้ำ' : 'Unique staff'} value={data.quota.unique_staff} />
        <DashboardStatCard label={language === 'th' ? 'Assignment' : 'Assignments'} value={data.quota.active_assignments} />
        <DashboardStatCard label={language === 'th' ? 'Quota completion' : 'Quota completion'} value={`${quotaCompletion}%`} icon={<BarChart3 size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'Readiness score' : 'Readiness score'} value={data.validation.readiness_score} icon={<ShieldCheck size={20} />} />
      </div>

      <MobileSearchHeader
        label={language === 'th' ? 'ค้นหาหน้าที่' : 'Search roles'}
        value={search}
        onChange={setSearch}
        placeholder={language === 'th' ? 'พี่ฐาน พยาบาล โฟโต้' : 'Base, medic, photo'}
        resultText={`${quotaRows.length} ${language === 'th' ? 'บทบาท' : 'roles'}`}
      />

      <Card className="quota-progress-panel">
        <div className="staff-section-head">
          <h2>{language === 'th' ? 'ภาพรวมโควตา' : 'Quota progress'}</h2>
          <span>{quotaCompletion}%</span>
        </div>
        <div className="quota-progress-list">
          {quotaRows.map((row) => {
            const percent = row.target_count ? Math.min(100, Math.round((row.unique_staff_count / row.target_count) * 100)) : 100;
            return (
              <div className="quota-progress-row" key={row.role_name}>
                <div>
                  <strong>{row.role_name}</strong>
                  <span>{row.unique_staff_count} / {row.target_count}</span>
                </div>
                <div className="quota-bar" aria-label={`${row.role_name} ${percent}%`}>
                  <span className={`quota-fill status-${row.health_status}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <ResponsiveDataTable
        rows={quotaRows}
        getKey={(row) => row.role_name}
        emptyText={language === 'th' ? 'ไม่พบข้อมูลโควตา' : 'No quota rows'}
        mobileTitle={(row) => row.role_name}
        mobileSubtitle={(row) => `${row.unique_staff_count} / ${row.target_count}`}
        mobileMeta={(row) => <Badge status={statusMap[row.health_status]}>{row.health_status}</Badge>}
        mobileDetailsLabel={language === 'th' ? 'รายละเอียดโควตา' : 'Quota details'}
        columns={[
          { key: 'role', header: language === 'th' ? 'หน้าที่' : 'Role', render: (row) => row.role_name },
          { key: 'target', header: language === 'th' ? 'เป้า' : 'Target', render: (row) => row.target_count },
          { key: 'current', header: language === 'th' ? 'ปัจจุบัน' : 'Current', render: (row) => `${row.unique_staff_count} (${language === 'th' ? 'หลัก' : 'primary'} ${row.current_primary_count}, ${language === 'th' ? 'เสริม' : 'secondary'} ${row.current_secondary_count})` },
          { key: 'diff', header: language === 'th' ? 'ต่าง' : 'Difference', render: (row) => row.shortage_count ? `-${row.shortage_count}` : row.overflow_count ? `+${row.overflow_count}` : '0' },
          { key: 'overlap', header: language === 'th' ? 'ซ้อน' : 'Overlap', render: (row) => row.overlap_count },
          { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => <Badge status={statusMap[row.health_status]}>{row.health_status}</Badge> },
        ]}
      />

      <div className="operations-grid">
        <Card className="operations-alert-card">
          <div className="staff-section-head">
            <h2>{language === 'th' ? 'กระจายตามหน้าที่' : 'Distribution by role'}</h2>
            <span>{distribution.roles.length}</span>
          </div>
          <div className="distribution-list">
            {distribution.roles.slice(0, 10).map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}
          </div>
        </Card>
        <Card className="operations-alert-card">
          <div className="staff-section-head">
            <h2>{language === 'th' ? 'กระจายตามกลุ่ม' : 'Distribution by group'}</h2>
            <span>{language === 'th' ? `พี่ฐาน ${distribution.bases}` : `Base staff ${distribution.bases}`}</span>
          </div>
          <div className="distribution-list">
            {distribution.groups.map(([label, count]) => <div key={label}><span>{groupLabel(label as never, null, language)}</span><strong>{count}</strong></div>)}
          </div>
        </Card>
        <Card className="operations-alert-card">
          <div className="staff-section-head">
            <h2>{language === 'th' ? 'กระจายตามกลุ่มย่อย' : 'Distribution by subgroup'}</h2>
            <span>{distribution.subgroups.length}</span>
          </div>
          <div className="distribution-list">
            {distribution.subgroups.slice(0, 14).map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}
          </div>
        </Card>
      </div>

      <div className="operations-grid">
        <Card className="operations-alert-card">
          <div className="staff-section-head">
            <h2>{language === 'th' ? 'Conflict alerts' : 'Conflict alerts'}</h2>
            <span>{data.conflicts.length}</span>
          </div>
          {data.conflicts.length ? data.conflicts.slice(0, 12).map((conflict) => (
            <div className={`ops-alert-row severity-${conflict.severity}`} key={conflict.staff_id}>
              <AlertTriangle size={18} />
              <div>
                <strong>{conflict.name}</strong>
                <span>{conflict.detected_conflicts.join(', ')}</span>
              </div>
            </div>
          )) : <div className="empty-inline">{language === 'th' ? 'ยังไม่พบ conflict' : 'No conflicts detected'}</div>}
        </Card>

        <Card className="operations-alert-card">
          <div className="staff-section-head">
            <h2>{language === 'th' ? 'Readiness check' : 'Readiness check'}</h2>
            <span>{data.validation.readiness_score}/100</span>
          </div>
          {[...data.validation.errors, ...data.validation.warnings].length ? [...data.validation.errors, ...data.validation.warnings].map((item) => (
            <div className="ops-alert-row severity-yellow" key={item}>
              <AlertTriangle size={18} />
              <span>{item}</span>
            </div>
          )) : <div className="empty-inline">{language === 'th' ? 'โครงสร้างพร้อมใช้งาน' : 'Structure looks ready'}</div>}
        </Card>
      </div>

      <Card className="operations-alert-card">
        <div className="staff-section-head">
          <h2>{language === 'th' ? 'คำแนะนำการจัดทีม' : 'Assignment recommendations'}</h2>
          <span>{data.recommendations.length}</span>
        </div>
        {data.recommendations.length ? data.recommendations.slice(0, 8).map((item, index) => (
          <div className="recommendation-row" key={`${item.target_role}-${index}`}>
            <div>
              <strong>{item.reason}</strong>
              <span>{item.source_role ? `${item.source_role} -> ${item.target_role}` : item.target_role}</span>
            </div>
            <div className="recommendation-staff-list">
              {item.suggested_staff.map((staff) => (
                <a key={staff.id} href={staff.phone ? `tel:${staff.phone}` : undefined}>
                  <Phone size={15} />
                  {staff.name}
                </a>
              ))}
            </div>
          </div>
        )) : <div className="empty-inline">{language === 'th' ? 'ยังไม่มีคำแนะนำเพิ่มเติม' : 'No recommendations yet'}</div>}
      </Card>
    </section>
  );
}
