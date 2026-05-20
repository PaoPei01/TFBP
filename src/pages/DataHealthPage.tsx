import { RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
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
import { runDataHealthRepair, validateDataIntegrity, type DataHealthIssue } from '../services/dataHealth';
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
};

const repairActions = [
  { key: 'normalize_majors', th: 'Normalize majors', en: 'Normalize majors' },
  { key: 'clean_placeholders', th: 'Clean placeholders', en: 'Clean placeholders' },
  { key: 'repair_staff_roles', th: 'Repair staff roles', en: 'Repair staff roles' },
  { key: 'repair_orphans', th: 'Repair orphan assignments', en: 'Repair orphan assignments' },
  { key: 'sync_staff_roster', th: 'Sync staff roster', en: 'Sync staff roster' },
] as const;

export function DataHealthPage() {
  const { language } = useLanguage();
  const state = useAsync(validateDataIntegrity, []);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmAction, setConfirmAction] = useState<(typeof repairActions)[number] | null>(null);
  const data = state.data;
  const issueRows: DataHealthIssue[] = [...(data?.errors ?? []), ...(data?.warnings ?? [])];
  const detailRows: DetailRow[] = Object.entries(data?.details ?? {}).flatMap(([type, rows]) =>
    rows.map((row, index) => ({ id: `${type}-${index}`, type, ...row })),
  );

  async function runAction() {
    if (!confirmAction) return;
    try {
      const result = await runDataHealthRepair(confirmAction.key);
      setToast({ type: 'success', message: `${language === 'th' ? confirmAction.th : confirmAction.en}: ${JSON.stringify(result)}` });
      setConfirmAction(null);
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ซ่อมข้อมูลไม่สำเร็จ' : 'Repair failed') });
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Data Health"
        title={language === 'th' ? 'ตรวจสุขภาพข้อมูล' : 'Data Health'}
        description={language === 'th' ? 'ตรวจข้อมูลนำเข้า สาขา placeholder ข้อมูลซ้ำ และ assignment ที่อาจผิดปกติ' : 'Check imports, majors, placeholders, duplicates, and assignment integrity.'}
        meta={<Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>}
      />

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}

      {data ? (
        <>
          <div className="stats-grid">
            {Object.entries(summaryLabels).map(([key, label]) => (
              <DashboardStatCard key={key} label={language === 'th' ? label.th : label.en} value={data.summary[key] ?? 0} icon={<ShieldCheck size={20} />} />
            ))}
          </div>

          <Card className="form-actions">
            {repairActions.map((action) => (
              <Button key={action.key} variant={action.key === 'repair_orphans' ? 'danger' : 'secondary'} icon={<Wrench size={18} />} onClick={() => setConfirmAction(action)}>
                {language === 'th' ? action.th : action.en}
              </Button>
            ))}
          </Card>

          <ResponsiveDataTable
            rows={issueRows}
            getKey={(row) => row.type}
            emptyText={language === 'th' ? 'ไม่พบปัญหาสำคัญ' : 'No major issues found'}
            mobileTitle={(row) => row.message}
            mobileSubtitle={(row) => `${row.type} · ${row.count}`}
            columns={[
              { key: 'severity', header: language === 'th' ? 'ระดับ' : 'Severity', render: (row) => <Badge status={row.severity === 'error' ? 'rejected' : 'pending'}>{row.severity}</Badge> },
              { key: 'type', header: 'Type', render: (row) => row.type },
              { key: 'count', header: language === 'th' ? 'จำนวน' : 'Count', render: (row) => row.count },
              { key: 'message', header: language === 'th' ? 'รายละเอียด' : 'Message', render: (row) => row.message },
            ]}
          />

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
