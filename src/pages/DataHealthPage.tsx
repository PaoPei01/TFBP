import { Download, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { useState } from 'react';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { fetchPeopleNameNicknameConflicts, runUnifiedDataHealthRepair, validateDataIntegrity, type DataHealthIssue, type DataHealthRepairAction } from '../services/dataHealth';
import { errorMessage } from '../utils/error';

type DetailRow = Record<string, unknown> & {
  id: string;
  type: string;
};

const summaryLabels: Record<string, { th: string; en: string }> = {
  participant_total: { th: 'ผู้เข้าร่วมทั้งหมด', en: 'Participants total' },
  staff_total: { th: 'ทีมงานทั้งหมด', en: 'Staff total' },
  missing_participant_major: { th: 'ผู้เข้าร่วมไม่มีสาขา', en: 'Missing participant major' },
  missing_staff_major: { th: 'ทีมงานไม่มีสาขา', en: 'Missing staff major' },
  invalid_major_format: { th: 'รูปแบบสาขาผิด', en: 'Invalid major format' },
  placeholder_values: { th: 'ค่า placeholder', en: 'Placeholder values' },
  duplicate_student_id: { th: 'รหัสซ้ำ', en: 'Duplicate student ID' },
  duplicate_email: { th: 'อีเมลซ้ำ', en: 'Duplicate email' },
  duplicate_phone: { th: 'เบอร์ซ้ำ', en: 'Duplicate phone' },
  staff_without_assignment: { th: 'ทีมงานยังไม่มี assignment', en: 'Staff without assignment' },
  orphan_staff_assignments: { th: 'staff assignment หลุด', en: 'Orphan staff assignments' },
  orphan_group_assignments: { th: 'group assignment หลุด', en: 'Orphan group assignments' },
  assignment_without_staff_profile: { th: 'assignment ไม่มี staff profile', en: 'Assignment without staff profile' },
  staff_missing_email_or_phone: { th: 'ทีมงานไม่มีอีเมล/เบอร์', en: 'Staff missing email/phone' },
  invalid_staff_role: { th: 'system role ผิด', en: 'Invalid staff role' },
  thai_duty_in_role: { th: 'หน้าที่ไทยอยู่ใน role', en: 'Thai duty stored in role' },
  invalid_group_scope: { th: 'สี/กลุ่มย่อยผิด', en: 'Invalid group/subgroup' },
};

const repairActions = [
  { key: 'clean_placeholders', th: 'ล้าง placeholder', en: 'Clean placeholders' },
  { key: 'normalize_majors', th: 'Normalize สาขา', en: 'Normalize majors' },
  { key: 'repair_staff_roles', th: 'ซ่อม role ทีมงาน', en: 'Repair staff roles' },
  { key: 'repair_orphans', th: 'ซ่อม orphan assignment', en: 'Repair orphan assignments' },
  { key: 'sync_staff_roster', th: 'ซิงค์ทีมงาน', en: 'Sync staff roster' },
  { key: 'rebuild_group_settings_mentors', th: 'สร้างรายชื่อพี่กลุ่มใหม่', en: 'Rebuild mentors' },
  { key: 'major_only_repair', th: 'ซ่อมเฉพาะสาขา', en: 'Major-only repair' },
] as const;

export function DataHealthPage() {
  const { language } = useLanguage();
  const state = useAsync(validateDataIntegrity, []);
  const nameNicknameState = useAsync(fetchPeopleNameNicknameConflicts, []);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmAction, setConfirmAction] = useState<(typeof repairActions)[number] | null>(null);
  const data = state.data;
  const issueRows: DataHealthIssue[] = [...(data?.errors ?? []), ...(data?.warnings ?? [])];
  const issueGroups = [
    {
      key: 'must-fix',
      title: language === 'th' ? 'ต้องแก้ก่อนวันกิจกรรม' : 'Must fix before event day',
      description: language === 'th' ? 'ปัญหาที่อาจกระทบการเช็กชื่อ การจัดกลุ่ม หรือข้อมูลหลักในวันงาน' : 'Issues that may affect attendance, groups, or core records on event day.',
      rows: data?.errors ?? [],
      variant: 'warning' as const,
    },
    {
      key: 'should-review',
      title: language === 'th' ? 'ควรตรวจสอบ' : 'Should review',
      description: language === 'th' ? 'รายการที่ยังไม่จำเป็นต้องหยุดงาน แต่ควรตรวจเพื่อให้ข้อมูลสะอาด' : 'Items that do not block operations yet, but should be reviewed for data quality.',
      rows: data?.warnings ?? [],
      variant: 'soft' as const,
    },
    {
      key: 'general-info',
      title: language === 'th' ? 'ข้อมูลทั่วไป' : 'General info',
      description: language === 'th' ? 'สรุปเพิ่มเติมจากการตรวจสุขภาพข้อมูล' : 'Additional summaries from the data health check.',
      rows: [] as DataHealthIssue[],
      variant: 'soft' as const,
    },
  ];
  const errorCount = data?.errors.reduce((sum, issue) => sum + issue.count, 0) ?? 0;
  const warningCount = data?.warnings.reduce((sum, issue) => sum + issue.count, 0) ?? 0;
  const status = errorCount ? 'critical' : warningCount ? 'review' : 'healthy';
  const detailRows: DetailRow[] = Object.entries(data?.details ?? {}).flatMap(([type, rows]) =>
    rows.map((row, index) => ({ id: `${type}-${index}`, type, ...row })),
  );
  const nameNicknameRows = nameNicknameState.data ?? [];

  async function runAction() {
    if (!confirmAction) return;
    try {
      const result = await runUnifiedDataHealthRepair(confirmAction.key as DataHealthRepairAction);
      setToast({ type: 'success', message: `${language === 'th' ? confirmAction.th : confirmAction.en}: ${JSON.stringify(result)}` });
      setConfirmAction(null);
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ซ่อมข้อมูลไม่สำเร็จ' : 'Repair failed') });
    }
  }

  function downloadIssueCsv() {
    const headers = ['type', 'severity', 'count', 'message'];
    const body = issueRows.map((row) => headers.map((key) => `"${String(row[key as keyof DataHealthIssue] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${headers.join(',')}\n${body}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tfbp-data-health-issues.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Data Health"
        title={language === 'th' ? 'ตรวจสุขภาพข้อมูล' : 'Data Health'}
        description={language === 'th' ? 'ตรวจข้อมูลนำเข้า สาขา placeholder ข้อมูลซ้ำ และ assignment ที่อาจผิดปกติ' : 'Check imports, majors, placeholders, duplicates, and assignment integrity.'}
        meta={<div className="form-actions"><Button variant="secondary" icon={<Download size={18} />} onClick={downloadIssueCsv}>{language === 'th' ? 'ส่งออก CSV' : 'Export CSV'}</Button><Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button></div>}
      />

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}

      {data ? (
        <>
          <Card className={`data-health-status status-${status}`} variant={errorCount ? 'danger' : warningCount ? 'warning' : 'success'}>
            <div>
              <p className="eyebrow">{language === 'th' ? 'สถานะโดยรวม' : 'Overall status'}</p>
              <h2>{status === 'critical' ? (language === 'th' ? 'มีปัญหาสำคัญ' : 'Critical issues') : status === 'review' ? (language === 'th' ? 'ควรตรวจสอบ' : 'Needs review') : (language === 'th' ? 'ข้อมูลพร้อมใช้งาน' : 'Healthy')}</h2>
              <span>{language === 'th' ? `Errors ${errorCount} · Warnings ${warningCount}` : `${errorCount} errors · ${warningCount} warnings`}</span>
            </div>
            <ShieldCheck size={30} />
          </Card>
          <div className="stats-grid">
            {Object.entries(summaryLabels).map(([key, label]) => (
              <DashboardStatCard key={key} label={language === 'th' ? label.th : label.en} value={data.summary[key] ?? 0} icon={<ShieldCheck size={20} />} />
            ))}
          </div>

          <Card className="event-detail-card" variant={nameNicknameRows.length ? 'warning' : 'soft'}>
            <div className="mobile-row-head">
              <div>
                <p className="eyebrow">{language === 'th' ? 'คุณภาพชื่อบุคคล' : 'Person name quality'}</p>
                <h2>{language === 'th' ? 'ชื่อ-นามสกุลซ้ำกับชื่อเล่น' : 'Full name matches nickname'}</h2>
                <p className="muted">{language === 'th' ? 'รายการนี้เป็นสัญญาณเตือนจากฐานข้อมูลกลางเท่านั้น ระบบจะไม่แก้ข้อมูลให้อัตโนมัติ' : 'This is a warning from the central people database. The system will not auto-fix these records.'}</p>
              </div>
              <Badge status={nameNicknameRows.length ? 'pending' : 'approved'}>{String(nameNicknameRows.length)}</Badge>
            </div>
            {nameNicknameState.error ? <p className="field-error">{nameNicknameState.error}</p> : null}
            <ResponsiveDataTable
              rows={nameNicknameRows.slice(0, 50)}
              getKey={(row) => row.id}
              emptyText={language === 'th' ? 'ไม่พบชื่อ-นามสกุลที่ซ้ำกับชื่อเล่น' : 'No full-name/nickname conflicts found'}
              mobileTitle={(row) => row.name_th || row.name_en || '-'}
              mobileSubtitle={(row) => `${language === 'th' ? 'ชื่อเล่น' : 'Nickname'}: ${row.nickname || row.nickname_th || row.nickname_en || '-'} · ${row.student_id ?? '-'}`}
              columns={[
                { key: 'student_id', header: language === 'th' ? 'รหัสนักศึกษา' : 'Student ID', render: (row) => row.student_id ?? '-' },
                { key: 'full_name', header: language === 'th' ? 'ชื่อ-นามสกุล' : 'Full name', render: (row) => row.name_th || row.name_en || '-' },
                { key: 'nickname', header: language === 'th' ? 'ชื่อเล่น' : 'Nickname', render: (row) => row.nickname || row.nickname_th || row.nickname_en || '-' },
                { key: 'major', header: language === 'th' ? 'สาขา' : 'Major', render: (row) => row.major ?? '-' },
              ]}
            />
          </Card>

          <Card className="repair-action-panel" variant="soft">
            <div className="repair-action-head">
              <strong>{language === 'th' ? 'เครื่องมือซ่อมข้อมูล' : 'Repair tools'}</strong>
              <span>{language === 'th' ? 'ทุก action จะเขียน audit log ก่อน/หลังซ่อมข้อมูล' : 'Every action writes audit logs before/after repair.'}</span>
            </div>
            {repairActions.map((action) => (
              <Button key={action.key} variant={action.key === 'repair_orphans' ? 'danger' : 'secondary'} icon={<Wrench size={18} />} onClick={() => setConfirmAction(action)}>
                {language === 'th' ? action.th : action.en}
              </Button>
            ))}
          </Card>

          <div className="data-health-issue-sections">
            {issueGroups.map((group) => (
              <Card key={group.key} variant={group.variant}>
                <div className="mobile-row-head">
                  <div>
                    <p className="eyebrow">{language === 'th' ? 'Data Health' : 'Data Health'}</p>
                    <h2>{group.title}</h2>
                    <p className="muted">{group.description}</p>
                  </div>
                  <Badge status={group.rows.length ? (group.key === 'must-fix' ? 'rejected' : 'pending') : 'approved'}>{String(group.rows.length)}</Badge>
                </div>
                <ResponsiveDataTable
                  rows={group.rows}
                  getKey={(row) => row.type}
                  emptyText={language === 'th' ? 'ไม่พบรายการในหมวดนี้' : 'No items in this group'}
                  mobileTitle={(row) => row.message}
                  mobileSubtitle={(row) => `${row.type} · ${row.count}`}
                  columns={[
                    { key: 'severity', header: language === 'th' ? 'ระดับ' : 'Severity', render: (row) => <Badge status={row.severity === 'error' ? 'rejected' : 'pending'}>{row.severity}</Badge> },
                    { key: 'type', header: 'Type', render: (row) => row.type },
                    { key: 'count', header: language === 'th' ? 'จำนวน' : 'Count', render: (row) => row.count },
                    { key: 'message', header: language === 'th' ? 'รายละเอียด' : 'Message', render: (row) => row.message },
                  ]}
                />
              </Card>
            ))}
          </div>

          <ResponsiveDataTable
            rows={detailRows.slice(0, 200)}
            getKey={(row) => String(row.id)}
            emptyText={language === 'th' ? 'ไม่มีรายละเอียดเพิ่มเติม' : 'No detail rows'}
            mobileTitle={(row) => String(row.type)}
            mobileSubtitle={(row) => String(row.name_th ?? row.email ?? row.student_id ?? row.id)}
            columns={[
              { key: 'type', header: 'Type', render: (row) => String(row.type) },
              { key: 'student_id', header: 'Student ID', render: (row) => String(row.student_id ?? '-') },
              { key: 'name', header: language === 'th' ? 'ชื่อ' : 'Name', render: (row) => String(row.name_th ?? row.name ?? '-') },
              { key: 'value', header: language === 'th' ? 'ค่า' : 'Value', render: (row) => String(row.value ?? row.major ?? row.email ?? row.phone ?? '-') },
            ]}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={language === 'th' ? 'ยืนยันการซ่อมข้อมูล' : 'Confirm repair action'}
        message={language === 'th' ? 'ระบบจะเขียน audit log และปรับข้อมูลตาม action ที่เลือก กรุณาตรวจสอบก่อนยืนยัน' : 'This writes an audit log and updates data according to the selected action.'}
        confirmLabel={language === 'th' ? 'ยืนยัน' : 'Confirm'}
        onConfirm={runAction}
        onClose={() => setConfirmAction(null)}
        variant={confirmAction?.key === 'repair_orphans' ? 'danger' : 'primary'}
      />
    </section>
  );
}
