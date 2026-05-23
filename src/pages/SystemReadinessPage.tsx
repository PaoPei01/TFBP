import { Clipboard, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useAsync } from '../hooks/useAsync';
import { buildLabel, appVersion } from '../lib/buildInfo';
import { formatBangkokDateTime } from '../lib/dateTime';
import { fetchSystemReadinessReport, type SystemReadinessReport } from '../services/systemReadiness';
import { explainSupabaseSchemaError } from '../utils/supabaseDiagnostics';
import { useLanguage } from '../context/LanguageContext';
import { useState } from 'react';

function statusBadge(ok: boolean, label?: string) {
  return <Badge status={ok ? 'approved' : 'rejected'}>{label ?? (ok ? 'ผ่าน' : 'ไม่ครบ')}</Badge>;
}

function compactList(items: string[], emptyText: string) {
  if (!items.length) return <p className="muted">{emptyText}</p>;
  return (
    <div className="filter-chip-row">
      {items.map((item) => <span className="filter-chip" key={item}>{item}</span>)}
    </div>
  );
}

function buildSummary(report: SystemReadinessReport) {
  return [
    `System readiness: ${report.ok ? 'OK' : 'NEEDS_CHECK'}`,
    `Checked at: ${report.checked_at}`,
    `Missing tables: ${report.database.missing_tables.join(', ') || '-'}`,
    `Missing columns: ${report.database.missing_columns.join(', ') || '-'}`,
    `Missing functions: ${report.database.missing_functions.join(', ') || '-'}`,
    `RLS missing: ${report.security.rls_missing_tables.join(', ') || '-'}`,
    `Parent Orientation quota: ${report.parent_orientation.duty_quota_total}/${report.parent_orientation.expected_quota_total}`,
    buildLabel,
  ].join('\n');
}

export function SystemReadinessPage() {
  const { language } = useLanguage();
  const [toast, setToast] = useState<ToastState>(null);
  const reportState = useAsync(fetchSystemReadinessReport, []);
  const report = reportState.data;
  const friendlyError = reportState.error
    ? explainSupabaseSchemaError(reportState.error, language)
    : '';

  async function copySummary() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(buildSummary(report));
      setToast({ type: 'success', message: language === 'th' ? 'คัดลอกสรุปแล้ว' : 'Summary copied' });
    } catch {
      setToast({ type: 'error', message: language === 'th' ? 'คัดลอกไม่สำเร็จ' : 'Could not copy summary' });
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Production Readiness"
        title={language === 'th' ? 'ตรวจความพร้อมระบบ' : 'System Readiness'}
        description={language === 'th' ? 'ตรวจว่า Supabase, ตาราง, RPC, RLS และโควต้ากิจกรรมพร้อมใช้งานจริงหรือไม่' : 'Check Supabase schema, RPCs, RLS, and event quotas before real use.'}
        actions={(
          <>
            <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={() => void reportState.reload()}>
              {language === 'th' ? 'รีเฟรช' : 'Refresh'}
            </Button>
            <Button variant="secondary" icon={<Clipboard size={18} />} disabled={!report} onClick={() => void copySummary()}>
              {language === 'th' ? 'คัดลอกสรุปสำหรับส่งให้ทีมเทคนิค' : 'Copy technical summary'}
            </Button>
          </>
        )}
      />

      {reportState.loading ? <LoadingSkeleton count={2} /> : null}
      {reportState.error ? (
        <EmptyState
          title={language === 'th' ? 'ยังตรวจความพร้อมไม่ได้' : 'Readiness check unavailable'}
          description={friendlyError.includes('get_system_readiness_report') || friendlyError.includes('ฟังก์ชัน')
            ? (language === 'th' ? 'ยังไม่พบ RPC ตรวจความพร้อมระบบ กรุณารัน migration ล่าสุดก่อน' : 'Readiness RPC is missing. Please run the latest migration first.')
            : friendlyError}
          action={<Button variant="secondary" onClick={() => void reportState.reload()}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>}
        />
      ) : null}

      {report ? (
        <>
          <Card className="event-detail-card" variant={report.ok ? 'success' : 'warning'}>
            <div className="section-heading">
              <ShieldCheck size={22} />
              <div>
                <p className="eyebrow">{language === 'th' ? 'สถานะรวม' : 'Overall status'}</p>
                <h2>{report.ok ? (language === 'th' ? 'พร้อมใช้งาน' : 'Ready') : (language === 'th' ? 'มีปัญหาที่ต้องแก้ก่อนเปิดรับสมัคร' : 'Needs fixes before launch')}</h2>
                <p className="muted">{language === 'th' ? `ตรวจล่าสุด ${formatBangkokDateTime(report.checked_at, language)}` : `Checked ${formatBangkokDateTime(report.checked_at, language)}`}</p>
                <p className="muted">{buildLabel} · v{appVersion}</p>
              </div>
            </div>
          </Card>

          <div className="event-stat-grid">
            <Card className="event-detail-card" variant={report.database.missing_tables.length || report.database.missing_columns.length ? 'warning' : 'soft'}>
              <strong>{report.database.missing_tables.length + report.database.missing_columns.length}</strong>
              <span>{language === 'th' ? 'schema ที่ยังไม่ครบ' : 'Schema gaps'}</span>
            </Card>
            <Card className="event-detail-card" variant={report.database.missing_functions.length ? 'warning' : 'soft'}>
              <strong>{report.database.missing_functions.length}</strong>
              <span>{language === 'th' ? 'RPC ที่ยังไม่ครบ' : 'Missing RPCs'}</span>
            </Card>
            <Card className="event-detail-card" variant={report.parent_orientation.quota_total_ok ? 'soft' : 'warning'}>
              <strong>{report.parent_orientation.duty_quota_total}</strong>
              <span>{language === 'th' ? 'โควต้ารวม Parent Orientation' : 'Parent Orientation quota'}</span>
            </Card>
            <Card className="event-detail-card" variant={report.security.rls_missing_tables.length ? 'danger' : 'soft'}>
              <strong>{report.security.rls_missing_tables.length}</strong>
              <span>{language === 'th' ? 'ตารางที่ RLS ยังไม่เปิด' : 'RLS gaps'}</span>
            </Card>
          </div>

          <Card className="event-detail-card">
            <div className="mobile-row-head">
              <div>
                <p className="eyebrow">Supabase Schema</p>
                <h2>{language === 'th' ? 'ตารางและคอลัมน์ที่จำเป็น' : 'Required tables and columns'}</h2>
              </div>
              {statusBadge(!report.database.missing_tables.length && !report.database.missing_columns.length)}
            </div>
            <h3>{language === 'th' ? 'ตารางที่ยังไม่พบ' : 'Missing tables'}</h3>
            {compactList(report.database.missing_tables, language === 'th' ? 'ตารางครบแล้ว' : 'All tables are present.')}
            <h3>{language === 'th' ? 'คอลัมน์ที่ยังไม่พบ' : 'Missing columns'}</h3>
            {compactList(report.database.missing_columns, language === 'th' ? 'คอลัมน์ครบแล้ว' : 'All columns are present.')}
          </Card>

          <Card className="event-detail-card">
            <div className="mobile-row-head">
              <div>
                <p className="eyebrow">RPC</p>
                <h2>{language === 'th' ? 'ฟังก์ชันที่ต้องใช้' : 'Required RPC functions'}</h2>
              </div>
              {statusBadge(!report.database.missing_functions.length)}
            </div>
            {compactList(report.database.missing_functions, language === 'th' ? 'RPC ครบแล้ว' : 'All RPCs are present.')}
          </Card>

          <Card className="event-detail-card">
            <div className="mobile-row-head">
              <div>
                <p className="eyebrow">Parent Orientation 2569</p>
                <h2>{language === 'th' ? 'โควต้ากิจกรรม' : 'Quota status'}</h2>
              </div>
              {statusBadge(Boolean(report.parent_orientation.event_exists && report.parent_orientation.quota_total_ok))}
            </div>
            <div className="event-mini-grid">
              <div className="event-mini-card">
                <strong>{report.parent_orientation.event_status ?? '-'}</strong>
                <span>{language === 'th' ? 'สถานะกิจกรรม' : 'Event status'}</span>
              </div>
              <div className="event-mini-card">
                <strong>{report.parent_orientation.event_visibility ?? '-'}</strong>
                <span>{language === 'th' ? 'การมองเห็น' : 'Visibility'}</span>
              </div>
              <div className={`event-mini-card ${report.parent_orientation.quota_total_ok ? '' : 'is-warning'}`}>
                <strong>{report.parent_orientation.duty_quota_total}/{report.parent_orientation.expected_quota_total}</strong>
                <span>{language === 'th' ? 'โควต้ารวม' : 'Total quota'}</span>
              </div>
            </div>
          </Card>

          <Card className="event-detail-card">
            <div className="mobile-row-head">
              <div>
                <p className="eyebrow">RLS / Security</p>
                <h2>{language === 'th' ? 'ความปลอดภัยระดับตาราง' : 'Table-level security'}</h2>
              </div>
              {statusBadge(!report.security.rls_missing_tables.length)}
            </div>
            <h3>{language === 'th' ? 'เปิด RLS แล้ว' : 'RLS enabled'}</h3>
            {compactList(report.security.rls_enabled_tables, language === 'th' ? 'ยังไม่พบตารางที่เปิด RLS' : 'No RLS-enabled tables found.')}
            <h3>{language === 'th' ? 'ต้องตรวจสอบ' : 'Needs review'}</h3>
            {compactList(report.security.rls_missing_tables, language === 'th' ? 'ไม่พบช่องว่าง RLS' : 'No RLS gaps found.')}
          </Card>

          <Card className="event-detail-card" variant={report.ok ? 'soft' : 'warning'}>
            <p className="eyebrow">{language === 'th' ? 'คำแนะนำ' : 'Recommendations'}</p>
            <ul className="checklist-list">
              {report.recommendations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Card>
        </>
      ) : null}
    </section>
  );
}
