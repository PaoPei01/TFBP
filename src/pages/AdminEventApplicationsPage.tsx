import { ArrowLeft, CheckCircle, Clock, Download, Eye, FileSpreadsheet, MessageSquare, RefreshCw, Save, ShieldAlert, UserPlus, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { getApplicationStatusLabel, getApplicationStatusTone, STAFF_APPLICATION_STATUSES, type StaffApplicationStatus } from '../lib/applicationStatus';
import { useAsync } from '../hooks/useAsync';
import { formatBangkokDateTime } from '../lib/dateTime';
import { getEventContent } from '../lib/eventContent';
import { eventPath } from '../lib/eventRoutes';
import { fetchAdminEventById, fetchAdminEventStaffApplications, fetchEventDutyQuotaStatus, logStaffApplicationExport, promoteStaffApplicationToEventStaff, type AdminStaffApplicationRow, type EventDutyQuotaRow, updateAdminStaffApplicationAssignment, updateAdminStaffApplicationReview } from '../services/events';
import { errorMessage } from '../utils/error';
import { explainSupabaseSchemaError } from '../utils/supabaseDiagnostics';

type ExportPreset = 'all' | 'filtered' | 'by_assigned_duty';

type ExcelExportRequest = {
  rows: AdminStaffApplicationRow[];
  filename: string;
  scope: ExportPreset;
  filters: Record<string, unknown>;
};

function text(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object' && 'text' in value) return String((value as { text?: unknown }).text ?? '');
  return value == null ? '' : String(value);
}

function duties(row: AdminStaffApplicationRow) {
  const value = row.answers?.preferred_duties ?? row.preferred_team;
  return Array.isArray(value) ? value.map(String) : text(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function preferredDutyLabels(row: AdminStaffApplicationRow, dutiesByKey: Map<string, EventDutyQuotaRow>) {
  const explicitLabels = row.answers?.preferred_duty_labels;
  if (Array.isArray(explicitLabels) && explicitLabels.length) return explicitLabels.map(String);
  return duties(row).map((duty) => dutiesByKey.get(duty)?.duty_label_th ?? duty);
}

function finalDuty(row: AdminStaffApplicationRow) {
  return text(row.answers?.final_duty);
}

function assignedDutyLabel(row: AdminStaffApplicationRow, dutiesByKey: Map<string, EventDutyQuotaRow>) {
  if (!row.assigned_duty) return '';
  return dutiesByKey.get(row.assigned_duty)?.duty_label_th ?? text(row.answers?.assigned_duty_label_th) ?? row.assigned_duty;
}

function assignmentMethodLabel(method: string | null | undefined, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    auto_quota: { th: 'ระบบจัดให้ตามโควต้า', en: 'Auto quota' },
    manual_admin: { th: 'ผู้ดูแลปรับเอง', en: 'Manual admin' },
    fallback_general: { th: 'จัดเข้าฝ่ายทั่วไป', en: 'General fallback' },
    pending: { th: 'รอผู้ดูแลจัดสรร', en: 'Pending admin assignment' },
  };
  return method ? labels[method]?.[language] ?? method : (language === 'th' ? 'ยังไม่จัดฝ่าย' : 'Not assigned');
}

function promotedEventStaffId(row: AdminStaffApplicationRow) {
  return text(row.answers?.event_staff_id);
}

function isPromoted(row: AdminStaffApplicationRow) {
  return row.answers?.promoted_to_event_staff === true || Boolean(promotedEventStaffId(row));
}

function applicantName(row: AdminStaffApplicationRow) {
  return row.people?.name_th || row.people?.name_en || row.requested_name_th || (row.people ? 'ไม่พบชื่อ-นามสกุล' : row.requested_student_id) || 'ผู้สมัคร';
}

function applicantNickname(row: AdminStaffApplicationRow) {
  return row.people?.nickname || row.people?.nickname_th || row.people?.nickname_en || '';
}

function hasNicknameWithoutFullName(row: AdminStaffApplicationRow) {
  return Boolean(row.people && !row.people.name_th && !row.people.name_en && applicantNickname(row));
}

function hasNameNicknameConflict(row: AdminStaffApplicationRow) {
  const nicknames = [row.people?.nickname, row.people?.nickname_th, row.people?.nickname_en].filter(Boolean).map((value) => String(value).trim());
  return Boolean(row.people && nicknames.length && [row.people.name_th, row.people.name_en].filter(Boolean).some((name) => nicknames.includes(String(name).trim())));
}

function identityStatusLabel(status: string, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    verified: { th: 'ยืนยันแล้ว', en: 'Verified' },
    email_mismatch: { th: 'CMU Mail ไม่ตรง', en: 'CMU Mail mismatch' },
    pending_identity_review: { th: 'รอตรวจสอบตัวตน', en: 'Pending identity review' },
    not_found: { th: 'ไม่พบข้อมูลในฐาน', en: 'Not found' },
    rejected_identity: { th: 'ไม่ผ่านการยืนยัน', en: 'Rejected identity' },
    unverified: { th: 'ยังไม่ยืนยัน', en: 'Unverified' },
  };
  return labels[status]?.[language] ?? status;
}

function identityTone(status: string) {
  if (status === 'verified') return 'approved';
  if (status === 'rejected_identity' || status === 'not_found') return 'rejected';
  return 'pending';
}

function consentText(value: unknown, language: 'th' | 'en') {
  if (value === true) return language === 'th' ? 'ยินยอม' : 'Accepted';
  if (value === false) return language === 'th' ? 'ไม่ยินยอม' : 'Not accepted';
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, accepted]) => `${key}: ${accepted ? (language === 'th' ? 'ยินยอม' : 'yes') : (language === 'th' ? 'ไม่ยินยอม' : 'no')}`)
      .join(' · ');
  }
  return text(value) || '-';
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminEventApplicationsPage() {
  const { language } = useLanguage();
  const { eventId = '' } = useParams();
  const eventState = useAsync(() => fetchAdminEventById(eventId), [eventId]);
  const applicationsState = useAsync(() => fetchAdminEventStaffApplications(eventId), [eventId]);
  const quotaState = useAsync(() => eventId ? fetchEventDutyQuotaStatus(eventId) : Promise.resolve(null), [eventId]);
  const [toast, setToast] = useState<ToastState>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    identityStatus: '',
    assignedDuty: '',
    assignmentMethod: '',
    finalDuty: '',
    preferredDuty: '',
    yearLevel: '',
    major: '',
    rehearsal: '',
    eventDay: '',
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftFinalDuties, setDraftFinalDuties] = useState<Record<string, string>>({});
  const [draftAssignedDuties, setDraftAssignedDuties] = useState<Record<string, string>>({});
  const [reviewDraft, setReviewDraft] = useState<{ row: AdminStaffApplicationRow; status: StaffApplicationStatus; finalDuty: string; reviewNote: string } | null>(null);
  const [detailRow, setDetailRow] = useState<AdminStaffApplicationRow | null>(null);
  const [assignmentOverride, setAssignmentOverride] = useState<{ row: AdminStaffApplicationRow; dutyKey: string; isFull: boolean } | null>(null);
  const [excelExport, setExcelExport] = useState<ExcelExportRequest | null>(null);
  const [exportConfirmed, setExportConfirmed] = useState(false);
  const event = eventState.data;
  const rows = useMemo(() => applicationsState.data ?? [], [applicationsState.data]);
  const content = getEventContent(event?.slug);
  const quotaDuties = useMemo(() => quotaState.data?.duties ?? [], [quotaState.data?.duties]);
  const dutiesByKey = useMemo(() => new Map(quotaDuties.map((duty) => [duty.duty_key, duty])), [quotaDuties]);
  const assignedDutyOptions = useMemo(() => quotaDuties.map((duty) => ({ value: duty.duty_key, label: duty.duty_label_th })), [quotaDuties]);
  const quotaTotal = quotaState.data?.total_quota ?? quotaDuties.reduce((sum, duty) => sum + duty.quota, 0);
  const quotaAssigned = quotaState.data?.total_assigned ?? quotaDuties.reduce((sum, duty) => sum + duty.assigned_count, 0);
  const quotaRemaining = quotaState.data?.total_remaining ?? quotaDuties.reduce((sum, duty) => sum + duty.remaining, 0);
  const overQuotaDuties = quotaDuties.filter((duty) => duty.assigned_count > duty.quota);
  const finalDutyOptions = useMemo(() => {
    const fromContent = content?.staffRecruitment?.dutiesTh ?? [];
    const fromRows = rows.map(finalDuty).filter(Boolean);
    const fromQuota = quotaDuties.map((duty) => duty.duty_label_th);
    return [...new Set([...fromQuota, ...fromContent, ...fromRows])].sort((a, b) => a.localeCompare(b, 'th'));
  }, [content?.staffRecruitment?.dutiesTh, quotaDuties, rows]);

  const filterOptions = useMemo(() => {
    const majors = [...new Set(rows.map((row) => row.people?.major).filter(Boolean).map(String))].sort();
    const years = [...new Set(rows.map((row) => row.people?.year_level).filter(Boolean).map(String))].sort();
    const preferred = [...new Set(rows.flatMap(duties))].sort();
    return { majors, years, preferred };
  }, [rows]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const search = filters.search.trim().toLowerCase();
    if (search && ![
      applicantName(row),
      row.people?.student_id,
      row.requested_student_id,
      row.people?.name_th,
      row.people?.name_en,
      row.requested_name_th,
      row.requested_email,
      row.requested_phone,
      row.people?.major,
      row.requested_major,
      assignedDutyLabel(row, dutiesByKey),
    ].some((value) => String(value ?? '').toLowerCase().includes(search))) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.identityStatus && row.identity_status !== filters.identityStatus) return false;
    if (filters.assignedDuty && row.assigned_duty !== filters.assignedDuty) return false;
    if (filters.assignmentMethod && row.assignment_method !== filters.assignmentMethod) return false;
    if (filters.finalDuty && finalDuty(row) !== filters.finalDuty) return false;
    if (filters.preferredDuty && !duties(row).includes(filters.preferredDuty)) return false;
    if (filters.yearLevel && String(row.people?.year_level ?? '') !== filters.yearLevel) return false;
    if (filters.major && row.people?.major !== filters.major) return false;
    if (filters.rehearsal && text(row.answers?.can_attend_rehearsal) !== filters.rehearsal) return false;
    if (filters.eventDay && text(row.answers?.can_work_event_day) !== filters.eventDay) return false;
    return true;
  }), [dutiesByKey, filters, rows]);

  const summary = useMemo(() => {
    const approved = rows.filter((row) => row.status === 'approved');
    const approvedByDuty = finalDutyOptions.map((duty) => ({
      duty,
      count: approved.filter((row) => finalDuty(row) === duty).length,
    }));
    return {
      approvedByDuty,
      verified: rows.filter((row) => row.identity_status === 'verified').length,
      pendingIdentity: rows.filter((row) => row.identity_status !== 'verified').length,
      approved: approved.length,
      waitlisted: rows.filter((row) => row.status === 'waitlisted').length,
      rejected: rows.filter((row) => row.status === 'rejected').length,
      missingAssignedDuty: rows.filter((row) => !row.assigned_duty).length,
      missingFinalDuty: approved.filter((row) => !finalDuty(row)).length,
      totalRemainingQuota: quotaState.data?.total_remaining ?? 0,
    };
  }, [finalDutyOptions, quotaState.data?.total_remaining, rows]);

  async function saveFinalDuty(row: AdminStaffApplicationRow) {
    const value = draftFinalDuties[row.id] ?? finalDuty(row);
    try {
      setSavingId(row.id);
      await updateAdminStaffApplicationReview({ id: row.id, status: row.status, finalDuty: value, reviewNote: row.review_note });
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกหน้าที่สุดท้ายแล้ว' : 'Final duty saved' });
      setDraftFinalDuties((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      await applicationsState.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกหน้าที่ไม่สำเร็จ' : 'Could not save final duty') });
    } finally {
      setSavingId(null);
    }
  }

  async function saveAssignedDuty(row: AdminStaffApplicationRow, allowFullOverride = false) {
    const value = draftAssignedDuties[row.id] ?? row.assigned_duty ?? '';
    const quota = dutiesByKey.get(value);
    const selectingDifferentDuty = value !== row.assigned_duty;
    if (quota?.is_full && selectingDifferentDuty && !allowFullOverride) {
      setAssignmentOverride({ row, dutyKey: value, isFull: true });
      return;
    }
    try {
      setSavingId(row.id);
      await updateAdminStaffApplicationAssignment({
        id: row.id,
        assignedDuty: value || null,
        assignmentNote: value
          ? (language === 'th' ? 'ผู้ดูแลปรับฝ่ายเบื้องต้นด้วยตนเอง' : 'Manual preliminary duty override')
          : (language === 'th' ? 'รอผู้ดูแลจัดสรรเพิ่มเติม' : 'Pending admin assignment'),
      });
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกฝ่ายเบื้องต้นแล้ว' : 'Preliminary duty saved' });
      setDraftAssignedDuties((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      setAssignmentOverride(null);
      await applicationsState.reload();
      await quotaState.reload();
    } catch (err) {
      setToast({ type: 'error', message: explainSupabaseSchemaError(err, language) || errorMessage(err, language === 'th' ? 'บันทึกฝ่ายเบื้องต้นไม่สำเร็จ' : 'Could not save preliminary duty') });
    } finally {
      setSavingId(null);
    }
  }

  function openReview(row: AdminStaffApplicationRow, status: StaffApplicationStatus = row.status as StaffApplicationStatus) {
    setReviewDraft({
      row,
      status,
      finalDuty: finalDuty(row),
      reviewNote: row.review_note ?? '',
    });
  }

  async function submitReview() {
    if (!reviewDraft) return;
    try {
      setSavingId(reviewDraft.row.id);
      await updateAdminStaffApplicationReview({
        id: reviewDraft.row.id,
        status: reviewDraft.status,
        finalDuty: reviewDraft.finalDuty,
        reviewNote: reviewDraft.reviewNote,
      });
      setToast({ type: 'success', message: language === 'th' ? 'อัปเดตสถานะใบสมัครแล้ว' : 'Application review updated' });
      setReviewDraft(null);
      await applicationsState.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'อัปเดตสถานะไม่สำเร็จ' : 'Could not update review status') });
    } finally {
      setSavingId(null);
    }
  }

  async function promoteToEventStaff(row: AdminStaffApplicationRow) {
    const team = draftFinalDuties[row.id] ?? finalDuty(row);
    try {
      setSavingId(row.id);
      await promoteStaffApplicationToEventStaff({
        applicationId: row.id,
        staffRole: row.preferred_role,
        team,
      });
      setToast({ type: 'success', message: language === 'th' ? 'เพิ่มเป็นสตาฟกิจกรรมแล้ว' : 'Added to event staff' });
      setDraftFinalDuties((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      await applicationsState.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'เพิ่มเป็นสตาฟกิจกรรมไม่สำเร็จ ตรวจว่าสถานะผ่านการคัดเลือกแล้ว' : 'Could not add to event staff') });
    } finally {
      setSavingId(null);
    }
  }

  function actionButtons(row: AdminStaffApplicationRow, mobile = false) {
    const promoted = isPromoted(row);
    return (
      <div className={mobile ? 'application-mobile-actions' : 'table-action-row'}>
        <Button size="sm" variant="secondary" icon={<Eye size={16} />} onClick={() => setDetailRow(row)}>{language === 'th' ? 'รายละเอียด' : 'Details'}</Button>
        {promoted ? <Badge status="approved">{language === 'th' ? 'เพิ่มเป็นสตาฟแล้ว' : 'Event staff'}</Badge> : null}
        {row.status === 'approved' && !promoted ? (
          <Button size="sm" variant="secondary" icon={<UserPlus size={16} />} loading={savingId === row.id} onClick={() => void promoteToEventStaff(row)}>
            {language === 'th' ? 'เพิ่มเป็นสตาฟกิจกรรม' : 'Add to event staff'}
          </Button>
        ) : null}
        <Button size="sm" icon={<CheckCircle size={16} />} onClick={() => openReview(row, 'approved')}>{language === 'th' ? 'ผ่าน' : 'Approve'}</Button>
        {mobile ? (
          <details className="application-more-actions">
            <summary>{language === 'th' ? 'เพิ่มเติม' : 'More'}</summary>
            <div>
              <Button size="sm" variant="secondary" icon={<Clock size={16} />} onClick={() => openReview(row, 'under_review')}>{language === 'th' ? 'ตรวจสอบแล้ว' : 'Under review'}</Button>
              <Button size="sm" variant="secondary" icon={<Clock size={16} />} onClick={() => openReview(row, 'waitlisted')}>{language === 'th' ? 'สำรอง' : 'Waitlist'}</Button>
              <Button size="sm" variant="secondary" icon={<MessageSquare size={16} />} onClick={() => openReview(row, row.status as StaffApplicationStatus)}>{language === 'th' ? 'เพิ่มหมายเหตุ' : 'Note'}</Button>
              <Button size="sm" variant="danger" icon={<XCircle size={16} />} onClick={() => openReview(row, 'rejected')}>{language === 'th' ? 'ไม่ผ่าน' : 'Reject'}</Button>
            </div>
          </details>
        ) : (
          <>
            <Button size="sm" variant="secondary" icon={<Clock size={16} />} onClick={() => openReview(row, 'under_review')}>{language === 'th' ? 'ตรวจสอบแล้ว' : 'Review'}</Button>
            <Button size="sm" variant="secondary" icon={<Clock size={16} />} onClick={() => openReview(row, 'waitlisted')}>{language === 'th' ? 'สำรอง' : 'Waitlist'}</Button>
            <Button size="sm" variant="secondary" icon={<MessageSquare size={16} />} onClick={() => openReview(row, row.status as StaffApplicationStatus)}>{language === 'th' ? 'หมายเหตุ' : 'Note'}</Button>
            <Button size="sm" variant="danger" icon={<XCircle size={16} />} onClick={() => openReview(row, 'rejected')}>{language === 'th' ? 'ไม่ผ่าน' : 'Reject'}</Button>
          </>
        )}
      </div>
    );
  }

  function exportRows(rowsToExport: AdminStaffApplicationRow[]) {
    return rowsToExport.map((row, index) => ({
      'ลำดับ': index + 1,
      'วันที่สมัคร': formatBangkokDateTime(row.submitted_at, language),
      'สถานะใบสมัคร': getApplicationStatusLabel(row.status, language),
      'สถานะยืนยันตัวตน': identityStatusLabel(row.identity_status ?? 'unverified', language),
      'ฝ่ายที่ระบบจัดให้เบื้องต้น': assignedDutyLabel(row, dutiesByKey) || '-',
      'วิธีการจัดฝ่าย': assignmentMethodLabel(row.assignment_method, language),
      'รหัสนักศึกษา': row.people?.student_id ?? row.requested_student_id ?? '',
      'ชื่อ-นามสกุลไทยจากฐานข้อมูล': row.people?.name_th ?? '',
      'ชื่อ-นามสกุลอังกฤษจากฐานข้อมูล': row.people?.name_en ?? '',
      'ชื่อเล่นจากฐานข้อมูล': row.people?.nickname ?? '',
      'สาขาจากฐานข้อมูล': row.people?.major ?? '',
      'ชั้นปีจากฐานข้อมูล': row.people?.year_level ?? '',
      'CMU Mail จากฐานข้อมูล': row.people?.email ?? '',
      'เบอร์จากฐานข้อมูล': row.people?.phone ?? '',
      'CMU Mail ที่ผู้สมัครกรอก': row.requested_email ?? '',
      'เบอร์ที่ผู้สมัครกรอก': row.requested_phone ?? '',
      'ชื่อ-นามสกุลที่ผู้สมัครกรอก หากมี': row.requested_name_th ?? row.requested_name_en ?? '',
      'สาขาที่ผู้สมัครกรอก หากมี': row.requested_major ?? '',
      'ฝ่ายที่เลือก': preferredDutyLabels(row, dutiesByKey).join(', '),
      'เข้าซ้อมวันที่ 10 มิ.ย. ได้หรือไม่': text(row.answers?.can_attend_rehearsal),
      'ปฏิบัติงานวันที่ 12 มิ.ย. ได้หรือไม่': text(row.answers?.can_work_event_day),
      'ช่วงเวลาที่สะดวก': text(row.availability?.text ?? row.answers?.availability),
      'ประสบการณ์สตาฟ': text(row.answers?.staff_experience ?? row.experience),
      'ข้อจำกัดด้านสุขภาพ/การแพ้อาหารที่จำเป็นต้องแจ้ง': text(row.answers?.health_or_limitations),
      'หมายเหตุเพิ่มเติม': text(row.answers?.note ?? row.motivation),
      'หมายเหตุจากผู้ดูแล': row.review_note ?? '',
      'final_duty/manual override if exists': finalDuty(row) || assignedDutyLabel(row, dutiesByKey) || '',
    }));
  }

  async function downloadExcel(rowsToExport: AdminStaffApplicationRow[], filename: string) {
    const exportData = exportRows(rowsToExport);
    if (!exportData.length) {
      setToast({ type: 'error', message: language === 'th' ? 'ไม่มีข้อมูลสำหรับ export' : 'No rows to export' });
      return;
    }
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('รายชื่อผู้สมัคร');
    const headers = Object.keys(exportData[0]);
    worksheet.columns = headers.map((header) => ({ header, key: header, width: Math.min(Math.max(header.length + 4, 16), 42) }));
    exportData.forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + Math.min(headers.length, 26))}1` };
    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(filename, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    setToast({ type: 'success', message: language === 'th' ? 'ดาวน์โหลดไฟล์สำเร็จ' : 'File downloaded' });
  }

  function requestExcelExport(preset: ExportPreset, dutyKey?: string) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const base = 'parent-orientation-staff';
    setExportConfirmed(false);
    if (preset === 'all') {
      setExcelExport({ rows, filename: `${base}-all-${date}.xlsx`, scope: 'all', filters: {} });
      return;
    }
    if (preset === 'by_assigned_duty' && dutyKey) {
      setExcelExport({
        rows: rows.filter((row) => row.assigned_duty === dutyKey),
        filename: `${base}-${dutyKey}-${date}.xlsx`,
        scope: 'by_assigned_duty',
        filters: { assigned_duty: dutyKey },
      });
      return;
    }
    setExcelExport({ rows: filteredRows, filename: `${base}-filtered-${date}.xlsx`, scope: 'filtered', filters });
  }

  async function confirmExcelExport() {
    if (!excelExport) return;
    if (!exportConfirmed) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณายืนยันว่าจะใช้ข้อมูลเฉพาะเพื่อการดำเนินงานกิจกรรม' : 'Please confirm safe use before downloading.' });
      return;
    }
    try {
      await logStaffApplicationExport({
        eventId,
        exportScope: excelExport.scope,
        rowCount: excelExport.rows.length,
        includesSensitiveFields: true,
        filters: excelExport.filters,
      });
      await downloadExcel(excelExport.rows, excelExport.filename);
      setExcelExport(null);
      setExportConfirmed(false);
    } catch (err) {
      setToast({ type: 'error', message: explainSupabaseSchemaError(err, language) || errorMessage(err, language === 'th' ? 'ดาวน์โหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่' : 'Could not download the file. Please try again.') });
    }
  }

  return (
    <section className="events-page page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Applications"
        title={language === 'th' ? 'รีวิวใบสมัครสตาฟ' : 'Staff Application Review'}
        description={event ? (language === 'th' ? event.name_th : event.name_en || event.name_th) : ''}
        meta={<EventSwitcher compact />}
        actions={(
          <>
            <HelpButton topicId="admin.event-applications" variant="link" />
            <Link className="btn btn-secondary" to="/admin/events"><ArrowLeft size={17} />{language === 'th' ? 'กลับกิจกรรม' : 'Back'}</Link>
            {event ? <Link className="btn btn-secondary" to={eventPath(event.slug)}>{language === 'th' ? 'หน้าสาธารณะ' : 'Public page'}</Link> : null}
            <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={() => { void eventState.reload(); void applicationsState.reload(); void quotaState.reload(); }}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>
          </>
        )}
      />

      {eventState.loading || applicationsState.loading ? <LoadingSkeleton /> : null}
      {eventState.error || applicationsState.error ? (
        <EmptyState
          title={language === 'th' ? 'โหลดใบสมัครไม่สำเร็จ' : 'Could not load applications'}
          action={<Button variant="secondary" onClick={() => { void eventState.reload(); void applicationsState.reload(); }}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>}
        />
      ) : null}

      {quotaState.error ? (
        <Card variant="warning" className="event-detail-card">
          <strong>{language === 'th' ? 'โหลดข้อมูลโควต้าไม่สำเร็จ' : 'Could not load quota status'}</strong>
          <p>{explainSupabaseSchemaError(quotaState.error, language)}</p>
          <Button variant="secondary" onClick={() => void quotaState.reload()}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>
        </Card>
      ) : null}

      {event ? (
        <>
          <div className="event-stat-grid">
            <Card className="event-detail-card" variant="soft">
              <strong>{rows.length}</strong>
              <span>{language === 'th' ? 'ใบสมัครทั้งหมด' : 'Total applications'}</span>
            </Card>
            <Card className="event-detail-card" variant="soft">
              <strong>{summary.verified}</strong>
              <span>{language === 'th' ? 'ยืนยันตัวตนแล้ว' : 'Verified identity'}</span>
            </Card>
            <Card className="event-detail-card" variant="soft">
              <strong>{summary.pendingIdentity}</strong>
              <span>{language === 'th' ? 'รอตรวจสอบตัวตน' : 'Pending identity'}</span>
            </Card>
            <Card className="event-detail-card" variant="soft">
              <strong>{summary.approved}</strong>
              <span>{language === 'th' ? 'ผ่านการคัดเลือก' : 'Approved'}</span>
            </Card>
            <Card className="event-detail-card" variant="soft">
              <strong>{summary.waitlisted}</strong>
              <span>{language === 'th' ? 'สำรอง' : 'Waitlisted'}</span>
            </Card>
            <Card className="event-detail-card" variant="soft">
              <strong>{summary.rejected}</strong>
              <span>{language === 'th' ? 'ไม่ผ่าน' : 'Rejected'}</span>
            </Card>
            <Card className="event-detail-card" variant="soft">
              <strong>{summary.missingAssignedDuty}</strong>
              <span>{language === 'th' ? 'ยังไม่ได้จัดฝ่าย' : 'Missing assigned duty'}</span>
            </Card>
            <Card className="event-detail-card" variant="soft">
              <strong>{summary.totalRemainingQuota}</strong>
              <span>{language === 'th' ? 'โควต้าคงเหลือรวม' : 'Total remaining quota'}</span>
            </Card>
          </div>

          <Card className="event-detail-card">
            <div>
              <p className="eyebrow">{language === 'th' ? 'โควต้าฝ่าย' : 'Duty quotas'}</p>
              <h2>{language === 'th' ? 'สรุปฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty summary'}</h2>
              <p className="muted">{language === 'th' ? 'ตัวเลขนี้เป็นการจัดฝ่ายเบื้องต้น ระบบยังอนุญาตให้ผู้ดูแลปรับภายหลังได้' : 'These are preliminary assignments. Admins can still adjust them later.'}</p>
            </div>
            <div className="event-stat-grid compact-stat-grid">
              <Card className="event-detail-card" variant={quotaTotal === 130 ? 'soft' : 'warning'}>
                <strong>{quotaTotal}</strong>
                <span>{language === 'th' ? 'โควต้ารวม' : 'Total quota'}</span>
                {quotaTotal !== 130 ? <small className="field-error">{language === 'th' ? 'ควรเป็น 130' : 'Expected 130'}</small> : null}
              </Card>
              <Card className="event-detail-card" variant="soft">
                <strong>{quotaAssigned}</strong>
                <span>{language === 'th' ? 'จัดฝ่ายแล้ว' : 'Assigned'}</span>
              </Card>
              <Card className="event-detail-card" variant="soft">
                <strong>{quotaRemaining}</strong>
                <span>{language === 'th' ? 'คงเหลือ' : 'Remaining'}</span>
              </Card>
              <Card className="event-detail-card" variant={overQuotaDuties.length ? 'warning' : 'soft'}>
                <strong>{overQuotaDuties.length}</strong>
                <span>{language === 'th' ? 'ฝ่ายเกินโควต้า' : 'Over quota duties'}</span>
              </Card>
            </div>
            {overQuotaDuties.length ? (
              <Card variant="warning">
                <strong>{language === 'th' ? 'มีฝ่ายที่เกินโควต้า กรุณาตรวจสอบการปรับด้วยตนเอง' : 'Some duties exceed quota. Please review manual overrides.'}</strong>
              </Card>
            ) : null}
            <div className="event-mini-grid">
              {quotaDuties.map((duty) => (
                <div
                  className={`event-mini-card quota-click-card ${duty.is_full || duty.assigned_count > duty.quota ? 'is-warning' : ''}`}
                  key={duty.duty_key}
                >
                  <strong>{duty.assigned_count}/{duty.quota}</strong>
                  <span>{duty.duty_label_th}</span>
                  <small>{language === 'th' ? `เหลือ ${duty.remaining} คน` : `${duty.remaining} remaining`}</small>
                  <div className="progress-track" aria-label={`${duty.duty_label_th} ${duty.assigned_count}/${duty.quota}`}>
                    <span style={{ width: `${Math.min(Math.max((duty.assigned_count / Math.max(duty.quota, 1)) * 100, 0), 100)}%` }} />
                  </div>
                  {duty.is_full ? <Badge status="pending">{language === 'th' ? 'รับเต็มจำนวนแล้ว' : 'Full'}</Badge> : null}
                  {duty.assigned_count > duty.quota ? <small className="field-error">{language === 'th' ? 'เกินโควต้า' : 'Over quota'}</small> : null}
                  <Button size="sm" variant="ghost" onClick={() => setFilters({ ...filters, assignedDuty: duty.duty_key })}>
                    {language === 'th' ? 'ดูผู้สมัครฝ่ายนี้' : 'View this duty'}
                  </Button>
                  <Button size="sm" variant="secondary" icon={<FileSpreadsheet size={16} />} onClick={() => requestExcelExport('by_assigned_duty', duty.duty_key)}>
                    {language === 'th' ? 'Excel รายฝ่าย' : 'Duty Excel'}
                  </Button>
                </div>
              ))}
              {!quotaDuties.length ? <p className="muted">{language === 'th' ? 'ยังไม่มีข้อมูลโควต้าฝ่าย' : 'No duty quota data yet.'}</p> : null}
            </div>
          </Card>

          <Card className="event-form-card">
            <div>
              <p className="eyebrow">{language === 'th' ? 'ตัวกรอง' : 'Filters'}</p>
              <h2>{language === 'th' ? 'คัดกรองใบสมัคร' : 'Filter applications'}</h2>
            </div>
            <div className="filter-panel-grid">
              <Input
                label={language === 'th' ? 'ค้นหา' : 'Search'}
                placeholder={language === 'th' ? 'ค้นหาชื่อ รหัสนักศึกษา อีเมล เบอร์ หรือสาขา' : 'Search name, student ID, email, phone, or major'}
                value={filters.search}
                onChange={(eventInput) => setFilters({ ...filters, search: eventInput.target.value })}
              />
              <Select
                label={language === 'th' ? 'สถานะ' : 'Status'}
                placeholder={language === 'th' ? 'ทั้งหมด' : 'All'}
                value={filters.status}
                onChange={(eventInput) => setFilters({ ...filters, status: eventInput.target.value })}
                options={STAFF_APPLICATION_STATUSES.map((status) => ({ value: status, label: getApplicationStatusLabel(status, language) }))}
              />
              <Select
                label={language === 'th' ? 'สถานะตัวตน' : 'Identity'}
                placeholder={language === 'th' ? 'ทั้งหมด' : 'All'}
                value={filters.identityStatus}
                onChange={(eventInput) => setFilters({ ...filters, identityStatus: eventInput.target.value })}
                options={['verified', 'email_mismatch', 'pending_identity_review', 'not_found', 'rejected_identity'].map((status) => ({ value: status, label: identityStatusLabel(status, language) }))}
              />
              <Select label={language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.assignedDuty} onChange={(eventInput) => setFilters({ ...filters, assignedDuty: eventInput.target.value })} options={assignedDutyOptions} />
              <Select label={language === 'th' ? 'วิธีการจัดฝ่าย' : 'Assignment method'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.assignmentMethod} onChange={(eventInput) => setFilters({ ...filters, assignmentMethod: eventInput.target.value })} options={['auto_quota', 'manual_admin', 'fallback_general', 'pending'].map((method) => ({ value: method, label: assignmentMethodLabel(method, language) }))} />
              <Select label={language === 'th' ? 'หน้าที่สุดท้าย' : 'Final duty'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.finalDuty} onChange={(eventInput) => setFilters({ ...filters, finalDuty: eventInput.target.value })} options={finalDutyOptions} />
              <Select label={language === 'th' ? 'ฝ่ายที่สนใจ' : 'Preferred duty'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.preferredDuty} onChange={(eventInput) => setFilters({ ...filters, preferredDuty: eventInput.target.value })} options={filterOptions.preferred} />
              <Select label={language === 'th' ? 'ชั้นปี' : 'Year'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.yearLevel} onChange={(eventInput) => setFilters({ ...filters, yearLevel: eventInput.target.value })} options={filterOptions.years} />
              <Select label={language === 'th' ? 'สาขา' : 'Major'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.major} onChange={(eventInput) => setFilters({ ...filters, major: eventInput.target.value })} options={filterOptions.majors} />
              <Select label={language === 'th' ? 'วันซ้อม' : 'Rehearsal'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.rehearsal} onChange={(eventInput) => setFilters({ ...filters, rehearsal: eventInput.target.value })} options={['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ']} />
              <Select label={language === 'th' ? 'วันจริง' : 'Event day'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.eventDay} onChange={(eventInput) => setFilters({ ...filters, eventDay: eventInput.target.value })} options={['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ']} />
            </div>
            <div>
              <p className="eyebrow">{language === 'th' ? 'ดาวน์โหลดข้อมูลผู้สมัคร' : 'Download applications'}</p>
            </div>
            <div className="event-card-actions">
              <Button variant="secondary" icon={<Download size={17} />} onClick={() => requestExcelExport('all')}>{language === 'th' ? 'ดาวน์โหลด Excel ทั้งหมด' : 'Download all Excel'}</Button>
              <Button variant="secondary" icon={<Download size={17} />} onClick={() => requestExcelExport('filtered')}>{language === 'th' ? 'ดาวน์โหลด Excel ตามตัวกรองปัจจุบัน' : 'Download current filtered Excel'}</Button>
            </div>
          </Card>

          <ResponsiveDataTable
            rows={filteredRows}
            getKey={(row) => row.id}
            emptyText={language === 'th' ? 'ไม่พบใบสมัครตามตัวกรอง' : 'No applications match the filters'}
            mobileTitle={(row) => applicantName(row)}
            mobileSubtitle={(row) => `${applicantNickname(row) ? `${language === 'th' ? 'ชื่อเล่น' : 'Nickname'}: ${applicantNickname(row)} · ` : ''}${getApplicationStatusLabel(row.status, language)} · ${identityStatusLabel(row.identity_status ?? 'unverified', language)} · ${row.people?.major ?? row.requested_major ?? '-'}`}
            mobileMeta={(row) => formatBangkokDateTime(row.submitted_at, language)}
            mobileActions={(row) => actionButtons(row, true)}
            columns={[
              { key: 'name', header: language === 'th' ? 'ผู้สมัคร' : 'Applicant', render: (row) => (
                <div className="application-duty-stack">
                  <strong>{applicantName(row)}</strong>
                  {applicantNickname(row) ? <small>{language === 'th' ? `ชื่อเล่น: ${applicantNickname(row)}` : `Nickname: ${applicantNickname(row)}`}</small> : null}
                  {hasNicknameWithoutFullName(row) ? <small className="field-error">{language === 'th' ? 'ข้อมูลนี้มีชื่อเล่น แต่ไม่มีชื่อ-นามสกุลในฐานข้อมูลกลาง' : 'Nickname exists, but full name is missing in the central database.'}</small> : null}
                  {hasNameNicknameConflict(row) ? <small className="field-error">{language === 'th' ? 'ชื่อ-นามสกุลในฐานข้อมูลตรงกับชื่อเล่น ควรตรวจข้อมูลก่อนใช้งานจริง' : 'Full name matches nickname. Review this person data before real use.'}</small> : null}
                </div>
              ), priority: 'primary' },
              { key: 'year', header: language === 'th' ? 'ชั้นปี' : 'Year', render: (row) => row.people?.year_level ?? '-' },
              { key: 'major', header: language === 'th' ? 'สาขา' : 'Major', render: (row) => row.people?.major ?? '-' },
              { key: 'identity', header: language === 'th' ? 'ตัวตน' : 'Identity', render: (row) => <Badge status={identityTone(row.identity_status ?? 'unverified')}>{identityStatusLabel(row.identity_status ?? 'unverified', language)}</Badge> },
              { key: 'preferred', header: language === 'th' ? 'ฝ่ายที่สนใจ' : 'Preferred duties', render: (row) => preferredDutyLabels(row, dutiesByKey).join(', ') || '-' },
              { key: 'assigned', header: language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty', render: (row) => (
                <div className="application-duty-stack">
                  <Badge status={row.assigned_duty ? 'approved' : 'pending'}>{assignedDutyLabel(row, dutiesByKey) || (language === 'th' ? 'รอจัดสรร' : 'Pending')}</Badge>
                  <small>{assignmentMethodLabel(row.assignment_method, language)}</small>
                  {row.assignment_note ? <small>{row.assignment_note}</small> : null}
                </div>
              ) },
              { key: 'availability', header: language === 'th' ? 'เวลาว่าง' : 'Availability', render: (row) => text(row.availability?.text) || '-' },
              { key: 'rehearsal', header: language === 'th' ? 'ซ้อม' : 'Rehearsal', render: (row) => text(row.answers?.can_attend_rehearsal) || '-' },
              { key: 'event_day', header: language === 'th' ? 'วันจริง' : 'Event day', render: (row) => text(row.answers?.can_work_event_day) || '-' },
              { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => <span className={`status-pill status-${row.status}`}>{getApplicationStatusLabel(row.status, language)}</span> },
              { key: 'assigned_edit', header: language === 'th' ? 'ปรับฝ่ายเบื้องต้น' : 'Override duty', render: (row) => (
                <div className="table-action-row">
                  <Select
                    className="inline-select"
                    label={language === 'th' ? 'ฝ่าย' : 'Duty'}
                    value={draftAssignedDuties[row.id] ?? row.assigned_duty ?? ''}
                    onChange={(eventInput) => setDraftAssignedDuties({ ...draftAssignedDuties, [row.id]: eventInput.target.value })}
                    options={assignedDutyOptions}
                  />
                  <Button
                    variant="ghost"
                    icon={<Save size={16} />}
                    loading={savingId === row.id}
                    onClick={() => void saveAssignedDuty(row)}
                  >
                    {language === 'th' ? 'บันทึก' : 'Save'}
                  </Button>
                </div>
              ), align: 'right' },
              { key: 'final', header: language === 'th' ? 'หน้าที่สุดท้าย' : 'Final duty', render: (row) => (
                <div className="table-action-row">
                  <Select
                    className="inline-select"
                    label={language === 'th' ? 'หน้าที่' : 'Duty'}
                    value={draftFinalDuties[row.id] ?? finalDuty(row)}
                    onChange={(eventInput) => setDraftFinalDuties({ ...draftFinalDuties, [row.id]: eventInput.target.value })}
                    options={finalDutyOptions}
                  />
                  <Button
                    variant="ghost"
                    icon={<Save size={16} />}
                    loading={savingId === row.id}
                    onClick={() => void saveFinalDuty(row)}
                  >
                    {language === 'th' ? 'บันทึก' : 'Save'}
                  </Button>
                </div>
              ), align: 'right' },
              { key: 'actions', header: language === 'th' ? 'จัดการ' : 'Actions', render: (row) => actionButtons(row), align: 'right', mobileHidden: true },
            ]}
          />

          <Modal open={Boolean(reviewDraft)} title={language === 'th' ? 'อัปเดตผลการรีวิว' : 'Update review'} onClose={() => setReviewDraft(null)}>
            {reviewDraft ? (
              <div className="modal-body page-stack">
                <Card variant="soft">
                  <div className="mobile-row-head">
                    <div>
                      <strong>{applicantName(reviewDraft.row)}</strong>
                      <span>{reviewDraft.row.people?.student_id ?? '-'} · {reviewDraft.row.people?.major ?? '-'}</span>
                    </div>
                    <Badge status={getApplicationStatusTone(reviewDraft.row.status)}>{getApplicationStatusLabel(reviewDraft.row.status, language)}</Badge>
                  </div>
                </Card>
                <div className="form-grid two-col">
                  <Select
                    label={language === 'th' ? 'สถานะใหม่' : 'New status'}
                    value={reviewDraft.status}
                    onChange={(eventInput) => setReviewDraft({ ...reviewDraft, status: eventInput.target.value as StaffApplicationStatus })}
                    options={STAFF_APPLICATION_STATUSES.map((status) => ({ value: status, label: getApplicationStatusLabel(status, language) }))}
                  />
                  <Select
                    label={language === 'th' ? 'หน้าที่จริง' : 'Final duty'}
                    value={reviewDraft.finalDuty}
                    onChange={(eventInput) => setReviewDraft({ ...reviewDraft, finalDuty: eventInput.target.value })}
                    options={finalDutyOptions}
                  />
                </div>
                {reviewDraft.status === 'approved' && !reviewDraft.finalDuty ? (
                  <Card variant="warning">
                    <strong>{language === 'th' ? 'ยังไม่ได้ระบุหน้าที่จริง' : 'Final duty not assigned'}</strong>
                    <p>{language === 'th' ? 'สามารถอนุมัติก่อนได้ แต่ควรจัดสรรหน้าที่ก่อนวันงาน' : 'You can approve first, but assign a final duty before the event day.'}</p>
                  </Card>
                ) : null}
                {reviewDraft.status === 'approved' && reviewDraft.row.identity_status !== 'verified' ? (
                  <Card variant="warning">
                    <strong>{language === 'th' ? 'ใบสมัครนี้ยังรอตรวจสอบตัวตน' : 'Identity still needs review'}</strong>
                    <p>{language === 'th' ? 'สามารถอนุมัติได้ แต่ควรตรวจคำร้องหรือข้อมูล CMU Mail ก่อนใช้งานจริง' : 'You can approve, but review the identity/update request before operations.'}</p>
                  </Card>
                ) : null}
                {reviewDraft.status === 'rejected' ? (
                  <Card variant="warning">
                    <strong>{language === 'th' ? 'แนะนำให้ใส่หมายเหตุ' : 'Review note recommended'}</strong>
                    <p>{language === 'th' ? 'ระบุหมายเหตุเพื่อใช้ตรวจสอบย้อนหลัง' : 'Add a note for future audit/review.'}</p>
                  </Card>
                ) : null}
                <label className="field">
                  <span>{language === 'th' ? 'หมายเหตุการรีวิว' : 'Review note'}</span>
                  <textarea rows={4} value={reviewDraft.reviewNote} onChange={(eventInput) => setReviewDraft({ ...reviewDraft, reviewNote: eventInput.target.value })} placeholder={language === 'th' ? 'เช่น เหมาะกับฝ่ายลงทะเบียน / รอจัดสรรเพิ่มเติม / ไม่ตรงเงื่อนไขรอบนี้' : 'Example: good fit for registration, waitlisted for duty allocation, not eligible this round'} />
                </label>
                <div className="form-actions">
                  <Button icon={<Save size={18} />} loading={savingId === reviewDraft.row.id} onClick={() => void submitReview()}>{language === 'th' ? 'บันทึกผลรีวิว' : 'Save review'}</Button>
                  <Button variant="secondary" onClick={() => setReviewDraft(null)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
                </div>
              </div>
            ) : null}
          </Modal>

          <Modal open={Boolean(assignmentOverride)} title={language === 'th' ? 'ยืนยันการบันทึกเกินโควต้า' : 'Confirm over-quota assignment'} onClose={() => setAssignmentOverride(null)}>
            {assignmentOverride ? (
              <div className="modal-body page-stack">
                <Card variant="warning">
                  <strong>{language === 'th' ? 'ฝ่ายนี้เต็มแล้ว หากบันทึกต่อจะเกินโควต้า' : 'This duty is full. Saving will exceed quota.'}</strong>
                  <p>{dutiesByKey.get(assignmentOverride.dutyKey)?.duty_label_th ?? assignmentOverride.dutyKey}</p>
                </Card>
                <div className="form-actions">
                  <Button icon={<Save size={18} />} loading={savingId === assignmentOverride.row.id} onClick={() => void saveAssignedDuty(assignmentOverride.row, true)}>
                    {language === 'th' ? 'ยืนยันบันทึกเกินโควต้า' : 'Save anyway'}
                  </Button>
                  <Button variant="secondary" onClick={() => setAssignmentOverride(null)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
                </div>
              </div>
            ) : null}
          </Modal>

          <Modal open={Boolean(excelExport)} title={language === 'th' ? 'ยืนยันการดาวน์โหลดข้อมูล' : 'Confirm data download'} onClose={() => { setExcelExport(null); setExportConfirmed(false); }}>
            {excelExport ? (
              <div className="modal-body page-stack">
                <Card variant="warning">
                  <strong>{language === 'th' ? 'ไฟล์นี้มีข้อมูลส่วนบุคคล' : 'This file contains personal data.'}</strong>
                  <p>{language === 'th' ? 'ไฟล์นี้มีข้อมูลส่วนบุคคล และอาจมีข้อมูลด้านสุขภาพที่ผู้สมัครกรอกเพื่อใช้ในการจัดงานเท่านั้น กรุณาใช้ข้อมูลอย่างระมัดระวัง และห้ามเผยแพร่ต่อสาธารณะ' : 'This file contains personal data and may include health information submitted only for event operations. Use it carefully and do not publish it publicly.'}</p>
                </Card>
                <p className="muted">{language === 'th' ? `จำนวน ${excelExport.rows.length} รายการ` : `${excelExport.rows.length} rows`}</p>
                <label className="checkbox-row">
                  <input type="checkbox" checked={exportConfirmed} onChange={(eventInput) => setExportConfirmed(eventInput.target.checked)} />
                  <span>{language === 'th' ? 'ฉันเข้าใจและจะใช้ข้อมูลนี้เฉพาะเพื่อการดำเนินงานกิจกรรม' : 'I understand and will use this data only for event operations.'}</span>
                </label>
                <div className="form-actions">
                  <Button icon={<FileSpreadsheet size={18} />} disabled={!exportConfirmed} onClick={() => void confirmExcelExport()}>
                    {language === 'th' ? 'ยืนยันดาวน์โหลด' : 'Confirm download'}
                  </Button>
                  <Button variant="secondary" onClick={() => { setExcelExport(null); setExportConfirmed(false); }}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
                </div>
              </div>
            ) : null}
          </Modal>

          <Modal open={Boolean(detailRow)} title={language === 'th' ? 'รายละเอียดใบสมัคร' : 'Application details'} onClose={() => setDetailRow(null)}>
            {detailRow ? (
              <div className="modal-body page-stack">
                <Card variant="soft">
                  <div className="mobile-row-head">
                    <div>
                      <strong>{applicantName(detailRow)}</strong>
                      <span>{applicantNickname(detailRow) ? `${language === 'th' ? 'ชื่อเล่น' : 'Nickname'}: ${applicantNickname(detailRow)} · ` : ''}{detailRow.people?.student_id ?? detailRow.requested_student_id ?? '-'} · {detailRow.people?.major ?? detailRow.requested_major ?? '-'} · {detailRow.people?.year_level ?? '-'}</span>
                    </div>
                    <Badge status={getApplicationStatusTone(detailRow.status)}>{getApplicationStatusLabel(detailRow.status, language)}</Badge>
                  </div>
                </Card>
                {hasNicknameWithoutFullName(detailRow) ? (
                  <Card variant="warning">
                    <strong>{language === 'th' ? 'ข้อมูลนี้มีชื่อเล่น แต่ไม่มีชื่อ-นามสกุลในฐานข้อมูลกลาง' : 'This record has a nickname but no full name.'}</strong>
                    <p>{language === 'th' ? 'ควรตรวจข้อมูลนำเข้าหรือคำร้องแก้ไขข้อมูลก่อนใช้งานจริง' : 'Review imported data or update requests before real operations.'}</p>
                  </Card>
                ) : null}
                {hasNameNicknameConflict(detailRow) ? (
                  <Card variant="warning">
                    <strong>{language === 'th' ? 'ชื่อ-นามสกุลตรงกับชื่อเล่น' : 'Full name matches nickname'}</strong>
                    <p>{language === 'th' ? 'ควรตรวจข้อมูลในฐานข้อมูลกลางหรือคำร้องแก้ไขข้อมูลก่อนใช้งานจริง' : 'Review the central people record or update requests before real operations.'}</p>
                  </Card>
                ) : null}
                <div className="application-detail-grid">
                  <span>{language === 'th' ? 'สถานะตัวตน' : 'Identity status'}</span><strong>{identityStatusLabel(detailRow.identity_status ?? 'unverified', language)}</strong>
                  <span>{language === 'th' ? 'CMU Mail ที่ผู้สมัครกรอก' : 'Requested CMU Mail'}</span><strong>{detailRow.requested_email ?? '-'}</strong>
                  <span>{language === 'th' ? 'เบอร์โทรที่ผู้สมัครกรอก' : 'Requested phone'}</span><strong>{detailRow.requested_phone ?? '-'}</strong>
                  <span>{language === 'th' ? 'รหัสนักศึกษาที่กรอก' : 'Requested student ID'}</span><strong>{detailRow.requested_student_id ?? '-'}</strong>
                  <span>{language === 'th' ? 'ข้อมูลคนที่ match' : 'Matched person'}</span><strong>{detailRow.people ? `${detailRow.people.student_id ?? '-'} · ${detailRow.people.email ?? '-'} · ${detailRow.people.phone ?? '-'}` : '-'}</strong>
                  <span>{language === 'th' ? 'ฝ่ายที่สนใจ' : 'Preferred duties'}</span><strong>{preferredDutyLabels(detailRow, dutiesByKey).join(', ') || '-'}</strong>
                  <span>{language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'}</span><strong>{assignedDutyLabel(detailRow, dutiesByKey) || '-'}</strong>
                  <span>{language === 'th' ? 'วิธีการจัดฝ่าย' : 'Assignment method'}</span><strong>{assignmentMethodLabel(detailRow.assignment_method, language)}</strong>
                  <span>{language === 'th' ? 'หมายเหตุการจัดฝ่าย' : 'Assignment note'}</span><strong>{detailRow.assignment_note ?? '-'}</strong>
                  <span>{language === 'th' ? 'เวลาว่าง' : 'Availability'}</span><strong>{text(detailRow.availability?.text) || text(detailRow.answers?.availability) || '-'}</strong>
                  <span>{language === 'th' ? 'วันซ้อม' : 'Rehearsal'}</span><strong>{text(detailRow.answers?.can_attend_rehearsal) || '-'}</strong>
                  <span>{language === 'th' ? 'วันจริง' : 'Event day'}</span><strong>{text(detailRow.answers?.can_work_event_day) || '-'}</strong>
                  <span>{language === 'th' ? 'ประสบการณ์' : 'Experience'}</span><strong>{text(detailRow.answers?.staff_experience) || detailRow.experience || '-'}</strong>
                  <span>{language === 'th' ? 'หมายเหตุผู้สมัคร' : 'Applicant note'}</span><strong>{text(detailRow.answers?.note) || detailRow.motivation || '-'}</strong>
                  <span>{language === 'th' ? 'Consent' : 'Consent'}</span><strong>{consentText(detailRow.answers?.consent, language)}</strong>
                  <span>{language === 'th' ? 'หน้าที่จริง' : 'Final duty'}</span><strong>{finalDuty(detailRow) || '-'}</strong>
                  <span>{language === 'th' ? 'หมายเหตุรีวิว' : 'Review note'}</span><strong>{detailRow.review_note ?? '-'}</strong>
                  <span>{language === 'th' ? 'สถานะสตาฟกิจกรรม' : 'Event staff'}</span><strong>{isPromoted(detailRow) ? (language === 'th' ? `เพิ่มแล้ว (${promotedEventStaffId(detailRow)})` : `Promoted (${promotedEventStaffId(detailRow)})`) : '-'}</strong>
                  <span>{language === 'th' ? 'รีวิวเมื่อ' : 'Reviewed at'}</span><strong>{formatBangkokDateTime(detailRow.reviewed_at, language)}</strong>
                  <span>{language === 'th' ? 'รีวิวโดย' : 'Reviewed by'}</span><strong>{detailRow.reviewed_by ?? '-'}</strong>
                </div>
                <Card variant="warning">
                  <div className="section-heading">
                    <ShieldAlert size={20} />
                    <div>
                      <h2>{language === 'th' ? 'ข้อมูลสุขภาพ/ข้อจำกัด' : 'Health or limitations'}</h2>
                      <p>{language === 'th' ? 'ข้อมูลนี้ใช้เพื่อจัดสรรหน้าที่และดูแลความปลอดภัยเท่านั้น' : 'Use this only for duty allocation and safety care.'}</p>
                    </div>
                  </div>
                  <p>{text(detailRow.answers?.health_or_limitations) || '-'}</p>
                </Card>
              </div>
            ) : null}
          </Modal>
        </>
      ) : null}
    </section>
  );
}
