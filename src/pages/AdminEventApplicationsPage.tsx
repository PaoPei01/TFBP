import { ArrowLeft, CheckCircle, Clock, Download, Eye, FileSpreadsheet, MessageSquare, RefreshCw, Save, UserPlus, XCircle } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ExportActions } from '../components/ui/ExportActions';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { getApplicationStatusLabel, getApplicationStatusTone, STAFF_APPLICATION_STATUSES, type StaffApplicationStatus } from '../lib/applicationStatus';
import { copy } from '../lib/copy';
import { useAsync } from '../hooks/useAsync';
import { formatBangkokDateTime } from '../lib/dateTime';
import { eventPath } from '../lib/eventRoutes';
import { majorLabel } from '../lib/major';
import { buildDutyFilterOptions, getApplicationAssignedDutyKey, getApplicationFinalDutyKey, getApplicationPreferredDutyKeys, getDutyLabelTh, getDutyOptions, getDutySelectOptions, normalizeDutySelection } from '../lib/parentOrientationDuties';
import { fetchAdminEventById, fetchAdminEventStaffApplications, fetchEventDutyQuotaStatus, findDuplicateStaffApplications, logStaffApplicationExport, promoteStaffApplicationToEventStaff, type AdminStaffApplicationRow, type EventDutyQuotaRow, updateAdminStaffApplicationAssignment, updateAdminStaffApplicationReview } from '../services/events';
import { exportStaffApplicantsXlsx, type StaffApplicantExportRow } from '../utils/csv';
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

function answerObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function duties(row: AdminStaffApplicationRow) {
  const value = row.answers?.preferred_duties ?? row.preferred_team;
  return Array.isArray(value) ? value.map(String) : text(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function preferredDutyLabels(row: AdminStaffApplicationRow) {
  const keys = getApplicationPreferredDutyKeys(row);
  if (keys.length) return keys.map(getDutyLabelTh);
  const explicitLabels = row.answers?.preferred_duty_labels;
  if (Array.isArray(explicitLabels) && explicitLabels.length) return normalizeDutySelection(explicitLabels.map(String)).map(getDutyLabelTh);
  return duties(row).map(getDutyLabelTh);
}

function finalDuty(row: AdminStaffApplicationRow) {
  return getApplicationFinalDutyKey(row) ?? text(row.answers?.final_duty);
}

function assignedDutyLabel(row: AdminStaffApplicationRow, dutiesByKey: Map<string, EventDutyQuotaRow>) {
  const canonicalKey = getApplicationAssignedDutyKey(row);
  if (canonicalKey) return getDutyLabelTh(canonicalKey);
  if (!row.assigned_duty) return '';
  return dutiesByKey.get(row.assigned_duty)?.duty_label_th ?? getDutyLabelTh(text(row.answers?.assigned_duty_label_th) || row.assigned_duty);
}

function CompactDutyChips({ labels, language }: { labels: string[]; language: 'th' | 'en' }) {
  const visible = labels.slice(0, 2);
  const extraCount = Math.max(labels.length - visible.length, 0);
  if (!labels.length) return <span>-</span>;
  return (
    <div className="application-chip-row">
      {visible.map((label) => <span className="duty-chip" key={label}>{label}</span>)}
      {extraCount ? <span className="duty-chip is-muted">{language === 'th' ? `+${extraCount}` : `+${extraCount}`}</span> : null}
    </div>
  );
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

function exportCell(value: unknown) {
  const valueText = text(value).trim();
  return valueText || '-';
}

function notSpecified(language: 'th' | 'en') {
  return language === 'th' ? 'ไม่ระบุ' : 'Not specified';
}

function healthDetails(row: AdminStaffApplicationRow) {
  return answerObject(row.answers?.health_details);
}

function healthValue(row: AdminStaffApplicationRow, key: 'chronic_condition' | 'food_allergy' | 'drug_allergy' | 'health_note') {
  return text(healthDetails(row)[key]).trim();
}

function healthSummary(row: AdminStaffApplicationRow, language: 'th' | 'en') {
  return text(row.answers?.health_or_limitations).trim() || notSpecified(language);
}

function isMeaningfulValue(value: unknown) {
  const valueText = text(value).trim();
  if (!valueText) return false;
  const normalized = valueText.toLowerCase();
  return ![
    '-',
    'null',
    'undefined',
    'parent orientation staff application',
    'freshmen orientation staff application',
    'parent_orientation_staff_2569',
  ].includes(normalized);
}

function DetailRow({ label, value, force = false }: { label: string; value: ReactNode; force?: boolean }) {
  if (!force && !isMeaningfulValue(value)) return null;
  return (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );
}

function CompactMatchedPerson({ row, language }: { row: AdminStaffApplicationRow; language: 'th' | 'en' }) {
  if (!row.people) return <span>{language === 'th' ? 'ยังไม่พบข้อมูลที่ตรงกัน' : 'No matched person found'}</span>;
  return (
    <span>
      {[row.people.student_id, row.people.email, row.people.phone].filter(isMeaningfulValue).join(' · ') || (language === 'th' ? 'ยังไม่พบข้อมูลที่ตรงกัน' : 'No matched person found')}
    </span>
  );
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
  const commonCopy = copy[language];
  const { eventId = '' } = useParams();
  const eventState = useAsync(() => fetchAdminEventById(eventId), [eventId]);
  const applicationsState = useAsync(() => fetchAdminEventStaffApplications(eventId), [eventId]);
  const quotaState = useAsync(() => eventId ? fetchEventDutyQuotaStatus(eventId) : Promise.resolve(null), [eventId]);
  const duplicateState = useAsync(() => eventId ? findDuplicateStaffApplications(eventId) : Promise.resolve(null), [eventId]);
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
  const [handoffExporting, setHandoffExporting] = useState(false);
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false);
  const event = eventState.data;
  const rows = useMemo(() => [...(applicationsState.data ?? [])].sort((a, b) => {
    const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
    const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
    return bTime - aTime;
  }), [applicationsState.data]);
  const quotaDuties = useMemo(() => quotaState.data?.duties ?? [], [quotaState.data?.duties]);
  const dutiesByKey = useMemo(() => new Map(quotaDuties.map((duty) => [duty.duty_key, duty])), [quotaDuties]);
  const canonicalQuotaDuties = useMemo(() => getDutyOptions().map((duty) => {
    const quota = quotaDuties.find((row) => getApplicationAssignedDutyKey({ assigned_duty: row.duty_key, answers: { assigned_duty_label_th: row.duty_label_th } }) === duty.key);
    return {
      duty_key: duty.key,
      duty_label_th: duty.labelTh,
      quota: quota?.quota ?? duty.quota,
      assigned_count: quota?.assigned_count ?? rows.filter((row) => getApplicationAssignedDutyKey(row) === duty.key).length,
      remaining: quota?.remaining ?? Math.max(duty.quota - rows.filter((row) => getApplicationAssignedDutyKey(row) === duty.key).length, 0),
      is_full: quota?.is_full ?? false,
    };
  }), [quotaDuties, rows]);
  const quotaTotal = quotaState.data?.total_quota ?? quotaDuties.reduce((sum, duty) => sum + duty.quota, 0);
  const quotaAssigned = quotaState.data?.total_assigned ?? quotaDuties.reduce((sum, duty) => sum + duty.assigned_count, 0);
  const quotaRemaining = quotaState.data?.total_remaining ?? quotaDuties.reduce((sum, duty) => sum + duty.remaining, 0);
  const overQuotaDuties = canonicalQuotaDuties.filter((duty) => duty.assigned_count > duty.quota);
  const duplicateReport = duplicateState.data;
  const duplicateGroups = [
    ...(duplicateReport?.duplicate_person_groups ?? []),
    ...(duplicateReport?.duplicate_student_id_groups ?? []),
    ...(duplicateReport?.duplicate_email_groups ?? []),
  ];
  const assignedDutyOptions = useMemo(() => buildDutyFilterOptions(rows, quotaState.data), [quotaState.data, rows]);
  const assignedDutyFilterOptions = useMemo(() => [
    ...assignedDutyOptions,
    { value: '__missing', label: language === 'th' ? 'ยังไม่ได้จัดฝ่าย' : 'Not assigned' },
  ], [assignedDutyOptions, language]);
  const manualDutyOptions = useMemo(() => getDutySelectOptions(), []);
  const finalDutyOptions = manualDutyOptions;

  const filterOptions = useMemo(() => {
    const majors = [...new Set(rows.map((row) => row.people?.major).filter(Boolean).map(String))].sort();
    const years = [...new Set(rows.map((row) => row.people?.year_level).filter(Boolean).map(String))].sort();
    const preferred = getDutySelectOptions();
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
    const assignedDutyKey = getApplicationAssignedDutyKey(row);
    if (filters.assignedDuty === '__missing' && assignedDutyKey) return false;
    if (filters.assignedDuty && filters.assignedDuty !== '__missing' && assignedDutyKey !== filters.assignedDuty) return false;
    if (filters.assignmentMethod && row.assignment_method !== filters.assignmentMethod) return false;
    if (filters.finalDuty && finalDuty(row) !== filters.finalDuty) return false;
    if (filters.preferredDuty && !getApplicationPreferredDutyKeys(row).includes(filters.preferredDuty)) return false;
    if (filters.yearLevel && String(row.people?.year_level ?? '') !== filters.yearLevel) return false;
    if (filters.major && row.people?.major !== filters.major) return false;
    if (filters.rehearsal && text(row.answers?.can_attend_rehearsal) !== filters.rehearsal) return false;
    if (filters.eventDay && text(row.answers?.can_work_event_day) !== filters.eventDay) return false;
    return true;
  }), [dutiesByKey, filters, rows]);

  const summary = useMemo(() => {
    const approved = rows.filter((row) => row.status === 'approved');
    const approvedByDuty = finalDutyOptions.map((duty) => ({
      duty: duty.value,
      count: approved.filter((row) => finalDuty(row) === duty.value).length,
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
    const value = getApplicationFinalDutyKey({ answers: { final_duty: draftFinalDuties[row.id] ?? finalDuty(row) } }) ?? draftFinalDuties[row.id] ?? finalDuty(row);
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
    const rawValue = draftAssignedDuties[row.id] ?? getApplicationAssignedDutyKey(row) ?? row.assigned_duty ?? '';
    const value = getApplicationAssignedDutyKey({ assigned_duty: rawValue }) ?? rawValue;
    const quota = dutiesByKey.get(value);
    const selectingDifferentDuty = value !== getApplicationAssignedDutyKey(row);
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
        <Button size="sm" variant="secondary" icon={<Eye size={16} />} onClick={() => setDetailRow(row)}>{language === 'th' ? 'ดูรายละเอียด' : 'Details'}</Button>
        {promoted ? <Badge status="approved">{language === 'th' ? 'เพิ่มเป็นสตาฟแล้ว' : 'Event staff'}</Badge> : null}
        <Button size="sm" icon={<CheckCircle size={16} />} onClick={() => openReview(row, 'approved')}>{language === 'th' ? 'ผ่าน' : 'Approve'}</Button>
        <details className="application-more-actions">
          <summary>{language === 'th' ? 'เพิ่มเติม' : 'More'}</summary>
          <div>
            {row.status === 'approved' && !promoted ? (
              <Button size="sm" variant="secondary" icon={<UserPlus size={16} />} loading={savingId === row.id} onClick={() => void promoteToEventStaff(row)}>
                {language === 'th' ? 'เพิ่มเป็นสตาฟกิจกรรม' : 'Add to event staff'}
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" icon={<Clock size={16} />} onClick={() => openReview(row, 'under_review')}>{language === 'th' ? 'ตรวจสอบแล้ว' : 'Review'}</Button>
            <Button size="sm" variant="secondary" icon={<Clock size={16} />} onClick={() => openReview(row, 'waitlisted')}>{language === 'th' ? 'สำรอง' : 'Waitlist'}</Button>
            <Button size="sm" variant="secondary" icon={<MessageSquare size={16} />} onClick={() => openReview(row, row.status as StaffApplicationStatus)}>{language === 'th' ? 'หมายเหตุ' : 'Note'}</Button>
            <Button size="sm" variant="danger" icon={<XCircle size={16} />} onClick={() => openReview(row, 'rejected')}>{language === 'th' ? 'ไม่ผ่าน' : 'Reject'}</Button>
          </div>
        </details>
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
      'ฝ่ายที่เลือก': preferredDutyLabels(row).join(', '),
      'เข้าซ้อมวันที่ 10 มิ.ย. ได้หรือไม่': text(row.answers?.can_attend_rehearsal),
      'ปฏิบัติงานวันที่ 12 มิ.ย. ได้หรือไม่': text(row.answers?.can_work_event_day),
      'ช่วงเวลาที่สะดวก (ข้อมูลเดิม)': exportCell(row.availability?.text ?? row.answers?.availability),
      'ประสบการณ์สตาฟ': text(row.answers?.staff_experience ?? row.experience),
      'ข้อจำกัดด้านสุขภาพ/การแพ้อาหารที่จำเป็นต้องแจ้ง': healthSummary(row, language),
      'หมายเหตุเพิ่มเติม': text(row.answers?.note ?? row.motivation),
      'หมายเหตุจากผู้ดูแล': row.review_note ?? '',
      'final_duty/manual override if exists': getDutyLabelTh(finalDuty(row)) || assignedDutyLabel(row, dutiesByKey) || '',
    }));
  }

  function applicantNote(row: AdminStaffApplicationRow) {
    const note = text(row.answers?.note);
    if (isMeaningfulValue(note)) return note;
    return isMeaningfulValue(row.motivation) ? row.motivation : '';
  }

  function healthEntries(row: AdminStaffApplicationRow) {
    const details = answerObject(row.answers?.health_details);
    return [
      {
        label: language === 'th' ? 'โรคประจำตัว / ข้อจำกัด' : 'Chronic condition / limitation',
        value: details.chronic_condition,
      },
      {
        label: language === 'th' ? 'แพ้อาหาร' : 'Food allergy',
        value: details.food_allergy,
      },
      {
        label: language === 'th' ? 'แพ้ยา' : 'Drug allergy',
        value: details.drug_allergy,
      },
      {
        label: language === 'th' ? 'หมายเหตุสุขภาพ' : 'Health note',
        value: details.health_note,
      },
    ].filter((entry) => isMeaningfulValue(entry.value));
  }

  function adminHealthSummary(row: AdminStaffApplicationRow) {
    const summary = text(row.answers?.health_or_limitations);
    if (isMeaningfulValue(summary)) return summary;
    const entries = healthEntries(row);
    if (entries.length) return entries.map((entry) => `${entry.label}: ${text(entry.value)}`).join(' · ');
    return language === 'th' ? 'ไม่ระบุ' : 'Not specified';
  }

  function hasAdditionalSystemData(row: AdminStaffApplicationRow) {
    return [
      consentText(row.answers?.consent, language),
      formatBangkokDateTime(row.reviewed_at, language),
      row.reviewed_by,
      promotedEventStaffId(row),
      row.answers?.promoted_to_event_staff === true ? 'true' : '',
      finalDuty(row),
      text(row.availability?.text) || text(row.answers?.availability),
    ].some(isMeaningfulValue);
  }

  function handoffPosition(row: AdminStaffApplicationRow) {
    const finalLabel = getDutyLabelTh(finalDuty(row));
    if (finalLabel) return finalLabel;
    const assignedLabel = assignedDutyLabel(row, dutiesByKey);
    if (assignedLabel) return assignedLabel;
    const preferredLabels = preferredDutyLabels(row);
    if (preferredLabels.length) return preferredLabels.join(' / ');
    return text(row.preferred_team || row.preferred_role);
  }

  function handoffRows(rowsToExport: AdminStaffApplicationRow[]): StaffApplicantExportRow[] {
    return rowsToExport.map((row) => ({
      'ชื่อ สกุล': exportCell(row.people?.name_th || row.people?.name_en || row.requested_name_th || row.requested_name_en),
      'สาขา': exportCell(majorLabel(row.people?.major || row.requested_major || '')),
      'รหัสนักศึกษา': exportCell(row.people?.student_id || row.requested_student_id),
      'เบอร์': exportCell(row.people?.phone || row.requested_phone),
      'ตำแหน่ง': exportCell(handoffPosition(row)),
      'โรคประจำตัว': exportCell(healthValue(row, 'chronic_condition') || text(row.answers?.health_or_limitations)),
      'แพ้ยา': exportCell(healthValue(row, 'drug_allergy')),
      'แพ้อาหาร': exportCell(healthValue(row, 'food_allergy')),
    }));
  }

  async function downloadHandoffExcel() {
    if (!rows.length) {
      setToast({ type: 'error', message: language === 'th' ? 'ยังไม่มีข้อมูลผู้สมัครสตาฟสำหรับส่งออก' : 'No staff application data to export yet.' });
      return;
    }
    try {
      setHandoffExporting(true);
      await logStaffApplicationExport({
        eventId,
        exportScope: 'all',
        rowCount: rows.length,
        includesSensitiveFields: true,
        filters: { handoff_format: true },
      });
      await exportStaffApplicantsXlsx(handoffRows(rows), event?.slug || event?.name_en || event?.name_th);
      setToast({ type: 'success', message: language === 'th' ? 'ดาวน์โหลด Excel สำหรับส่งต่อแล้ว' : 'Handoff Excel downloaded' });
    } catch (err) {
      setToast({ type: 'error', message: explainSupabaseSchemaError(err, language) || errorMessage(err, language === 'th' ? 'ดาวน์โหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่' : 'Could not download the file. Please try again.') });
    } finally {
      setHandoffExporting(false);
    }
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
    const base = 'freshmen-orientation-staff';
    setExportConfirmed(false);
    if (preset === 'all') {
      setExcelExport({ rows, filename: `${base}-all-${date}.xlsx`, scope: 'all', filters: {} });
      return;
    }
    if (preset === 'by_assigned_duty' && dutyKey) {
      setExcelExport({
        rows: rows.filter((row) => getApplicationAssignedDutyKey(row) === dutyKey),
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
            <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={() => { void eventState.reload(); void applicationsState.reload(); void quotaState.reload(); void duplicateState.reload(); }}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>
          </>
        )}
      />

      {eventState.loading || applicationsState.loading ? <LoadingSkeleton /> : null}
      {eventState.error || applicationsState.error ? (
        <EmptyState
          title={language === 'th' ? 'โหลดใบสมัครไม่สำเร็จ' : 'Could not load applications'}
          description={language === 'th' ? 'กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาให้ตรวจสอบโครงสร้างข้อมูลใบสมัคร' : 'Please try again. If the problem continues, check the application data structure.'}
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

      {duplicateReport && duplicateReport.total_duplicate_groups > 0 ? (
        <Card variant="warning" className="event-detail-card">
          <div className="mobile-row-head">
            <div>
              <strong>{language === 'th' ? 'พบใบสมัครซ้ำในกิจกรรมนี้ กรุณาตรวจสอบก่อนสรุปรายชื่อ' : 'Duplicate applications found. Review before finalizing.'}</strong>
              <span>{language === 'th' ? `${duplicateReport.total_duplicate_groups} กลุ่มซ้ำ · ${duplicateReport.total_duplicate_rows} รายการที่เกี่ยวข้อง` : `${duplicateReport.total_duplicate_groups} duplicate groups · ${duplicateReport.total_duplicate_rows} related rows`}</span>
            </div>
            <Badge status="pending">{language === 'th' ? 'Data Health' : 'Data Health'}</Badge>
          </div>
          <div className="event-card-actions">
            <Button type="button" variant="secondary" onClick={() => setShowDuplicateDetails((open) => !open)}>
              {showDuplicateDetails ? (language === 'th' ? 'ซ่อนรายการซ้ำ' : 'Hide duplicates') : (language === 'th' ? 'ดูรายการซ้ำ' : 'View duplicates')}
            </Button>
          </div>
          {showDuplicateDetails ? (
            <div className="mobile-card-list">
              {duplicateGroups.map((group, index) => (
                <Card key={`${group.event_id}-${group.person_id ?? group.requested_student_id ?? group.requested_email ?? index}`} variant="soft">
                  <div className="mobile-row-head">
                    <div>
                      <strong>{group.person_id ? `person_id: ${group.person_id}` : group.requested_student_id ? `student_id: ${group.requested_student_id}` : `email: ${group.requested_email}`}</strong>
                      <span>{language === 'th' ? `${group.duplicate_count} ใบสมัคร` : `${group.duplicate_count} applications`}</span>
                    </div>
                  </div>
                  <div className="application-detail-grid">
                    {group.applications.map((application) => (
                      <Fragment key={application.id}>
                        <span>{application.id}</span>
                        <strong>{getApplicationStatusLabel(application.status, language)} · {formatBangkokDateTime(application.submitted_at, language)}</strong>
                      </Fragment>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
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
              {canonicalQuotaDuties.map((duty) => (
                <div
                  className={`event-mini-card quota-click-card ${duty.is_full || duty.assigned_count > duty.quota ? 'is-warning' : ''}`}
                  key={duty.duty_key}
                >
                  <strong>{duty.assigned_count}/{duty.quota}</strong>
                  <span>{getDutyLabelTh(duty.duty_key)}</span>
                  <small>{language === 'th' ? `เหลือ ${duty.remaining} คน` : `${duty.remaining} remaining`}</small>
                  <div className="progress-track" aria-label={`${getDutyLabelTh(duty.duty_key)} ${duty.assigned_count}/${duty.quota}`}>
                    <span style={{ width: `${Math.min(Math.max((duty.assigned_count / Math.max(duty.quota, 1)) * 100, 0), 100)}%` }} />
                  </div>
                  {duty.assigned_count > duty.quota ? <Badge status="rejected">{language === 'th' ? 'เกินโควต้า' : 'Over quota'}</Badge> : duty.is_full || duty.remaining <= 0 ? <Badge status="pending">{language === 'th' ? 'รับเต็มจำนวนแล้ว' : 'Full'}</Badge> : <Badge status="approved">{language === 'th' ? 'ยังรับได้' : 'Available'}</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => setFilters({ ...filters, assignedDuty: duty.duty_key })}>
                    {language === 'th' ? 'ดูผู้สมัครฝ่ายนี้' : 'View this duty'}
                  </Button>
                  <Button size="sm" variant="secondary" icon={<FileSpreadsheet size={16} />} onClick={() => requestExcelExport('by_assigned_duty', duty.duty_key)}>
                    {language === 'th' ? 'ดาวน์โหลด Excel ฝ่ายนี้' : 'Export this duty'}
                  </Button>
                </div>
              ))}
              {!quotaDuties.length ? <p className="muted">{language === 'th' ? 'ยังไม่มีข้อมูลโควต้าฝ่าย' : 'No duty quota data yet.'}</p> : null}
            </div>
          </Card>

          <Card className="event-form-card">
            <div className="filter-panel-head">
              <div>
                <p className="eyebrow">{language === 'th' ? 'ตัวกรอง' : 'Filters'}</p>
                <h2>{language === 'th' ? 'คัดกรองใบสมัคร' : 'Filter applications'}</h2>
              </div>
              <Button variant="ghost" onClick={() => setFilters({ search: '', status: '', identityStatus: '', assignedDuty: '', assignmentMethod: '', finalDuty: '', preferredDuty: '', yearLevel: '', major: '', rehearsal: '', eventDay: '' })}>
                {language === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}
              </Button>
            </div>
            <div className="filter-panel-grid">
              <Input
                label={language === 'th' ? 'ค้นหาผู้สมัคร' : 'Search applicants'}
                placeholder={language === 'th' ? 'ค้นหาชื่อ รหัสนักศึกษา อีเมล เบอร์ หรือสาขา' : 'Search name, student ID, email, phone, or major'}
                value={filters.search}
                onChange={(eventInput) => setFilters({ ...filters, search: eventInput.target.value })}
              />
              <Select
                label={language === 'th' ? 'สถานะใบสมัคร' : 'Application status'}
                placeholder={language === 'th' ? 'ทั้งหมด' : 'All'}
                value={filters.status}
                onChange={(eventInput) => setFilters({ ...filters, status: eventInput.target.value })}
                options={STAFF_APPLICATION_STATUSES.map((status) => ({ value: status, label: getApplicationStatusLabel(status, language) }))}
              />
              <Select
                label={language === 'th' ? 'สถานะยืนยันตัวตน' : 'Identity status'}
                placeholder={language === 'th' ? 'ทั้งหมด' : 'All'}
                value={filters.identityStatus}
                onChange={(eventInput) => setFilters({ ...filters, identityStatus: eventInput.target.value })}
                options={['verified', 'email_mismatch', 'pending_identity_review', 'not_found', 'rejected_identity'].map((status) => ({ value: status, label: identityStatusLabel(status, language) }))}
              />
              <Select label={language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.assignedDuty} onChange={(eventInput) => setFilters({ ...filters, assignedDuty: eventInput.target.value })} options={assignedDutyFilterOptions} />
            </div>
            <details className="filter-disclosure">
              <summary>{language === 'th' ? 'ตัวกรองเพิ่มเติม' : 'More filters'}</summary>
              <div className="filter-panel-grid">
              <Select label={language === 'th' ? 'วิธีการจัดฝ่าย' : 'Assignment method'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.assignmentMethod} onChange={(eventInput) => setFilters({ ...filters, assignmentMethod: eventInput.target.value })} options={['auto_quota', 'manual_admin', 'fallback_general', 'pending'].map((method) => ({ value: method, label: assignmentMethodLabel(method, language) }))} />
              <Select label={language === 'th' ? 'ฝ่ายที่จัดไว้ล่าสุด' : 'Latest duty'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.finalDuty} onChange={(eventInput) => setFilters({ ...filters, finalDuty: eventInput.target.value })} options={finalDutyOptions} />
              <Select label={language === 'th' ? 'ฝ่ายที่สนใจ' : 'Preferred duty'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.preferredDuty} onChange={(eventInput) => setFilters({ ...filters, preferredDuty: eventInput.target.value })} options={filterOptions.preferred} />
              <Select label={language === 'th' ? 'ชั้นปี' : 'Year'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.yearLevel} onChange={(eventInput) => setFilters({ ...filters, yearLevel: eventInput.target.value })} options={filterOptions.years} />
              <Select label={language === 'th' ? 'สาขา' : 'Major'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.major} onChange={(eventInput) => setFilters({ ...filters, major: eventInput.target.value })} options={filterOptions.majors} />
              <Select label={language === 'th' ? 'วันซ้อม' : 'Rehearsal'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.rehearsal} onChange={(eventInput) => setFilters({ ...filters, rehearsal: eventInput.target.value })} options={['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ']} />
              <Select label={language === 'th' ? 'วันจริง' : 'Event day'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.eventDay} onChange={(eventInput) => setFilters({ ...filters, eventDay: eventInput.target.value })} options={['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ']} />
              </div>
            </details>
            <div>
              <p className="eyebrow">{language === 'th' ? 'ส่งออกข้อมูล' : 'Export data'}</p>
              <p className="muted">{language === 'th' ? 'ไฟล์นี้มีข้อมูลติดต่อและข้อมูลสุขภาพ ใช้สำหรับส่งต่อให้หน่วยงานที่เกี่ยวข้องเท่านั้น' : 'This file contains contact and health information. Use it only for authorized handoff.'}</p>
            </div>
            <div className="event-card-actions">
              <Button
                variant="secondary"
                icon={<FileSpreadsheet size={18} />}
                loading={handoffExporting}
                disabled={!rows.length}
                onClick={() => void downloadHandoffExcel()}
              >
                {language === 'th' ? 'ดาวน์โหลด Excel สำหรับส่งต่อ' : 'Download handoff Excel'}
              </Button>
              <ExportActions
                label={commonCopy.export}
                actions={[
                  { label: language === 'th' ? 'Excel ทั้งหมด' : 'All Excel', icon: <Download size={16} aria-hidden="true" />, onClick: () => requestExcelExport('all') },
                  { label: language === 'th' ? 'Excel ตามตัวกรองปัจจุบัน' : 'Current filtered Excel', icon: <Download size={16} aria-hidden="true" />, onClick: () => requestExcelExport('filtered') },
                  ...(filters.assignedDuty && filters.assignedDuty !== '__missing' ? [{ label: language === 'th' ? 'Excel ฝ่ายนี้' : 'This duty Excel', icon: <Download size={16} aria-hidden="true" />, onClick: () => requestExcelExport('by_assigned_duty', filters.assignedDuty) }] : []),
                ]}
              />
            </div>
          </Card>

          <ResponsiveDataTable
            rows={filteredRows}
            getKey={(row) => row.id}
            emptyText={language === 'th' ? 'ไม่พบใบสมัครตามตัวกรอง' : 'No applications match the filters'}
            mobileTitle={(row) => applicantName(row)}
            mobileSubtitle={(row) => `${row.people?.student_id ?? row.requested_student_id ?? '-'} · ${row.people?.major ?? row.requested_major ?? '-'}${row.people?.year_level ? ` · ปี ${row.people.year_level}` : ''}`}
            mobileMeta={(row) => (
              <>
                <Badge status={getApplicationStatusTone(row.status)}>{getApplicationStatusLabel(row.status, language)}</Badge>
                <span>{language === 'th' ? 'ส่งเมื่อ' : 'Submitted'} {formatBangkokDateTime(row.submitted_at, language)}</span>
              </>
            )}
            mobileActions={(row) => actionButtons(row, true)}
            mobileDetailsLabel={language === 'th' ? 'ดูข้อมูลย่อ' : 'View summary'}
            density="compact"
            columns={[
              { key: 'name', header: language === 'th' ? 'ผู้สมัคร' : 'Applicant', render: (row) => (
                <div className="application-duty-stack">
                  <strong>{applicantName(row)}</strong>
                  {applicantNickname(row) ? <small>{language === 'th' ? `ชื่อเล่น: ${applicantNickname(row)}` : `Nickname: ${applicantNickname(row)}`}</small> : null}
                  <small>{row.people?.student_id ?? row.requested_student_id ?? '-'}</small>
                  <small>{language === 'th' ? 'ส่งใบสมัครเมื่อ' : 'Submitted at'}: {formatBangkokDateTime(row.submitted_at, language)}</small>
                  {hasNicknameWithoutFullName(row) ? <small className="field-error">{language === 'th' ? 'ข้อมูลนี้มีชื่อเล่น แต่ไม่มีชื่อ-นามสกุลในฐานข้อมูลกลาง' : 'Nickname exists, but full name is missing in the central database.'}</small> : null}
                  {hasNameNicknameConflict(row) ? <small className="field-error">{language === 'th' ? 'ชื่อ-นามสกุลในฐานข้อมูลตรงกับชื่อเล่น ควรตรวจข้อมูลก่อนใช้งานจริง' : 'Full name matches nickname. Review this person data before real use.'}</small> : null}
                </div>
              ), priority: 'primary' },
              { key: 'submitted_at', header: language === 'th' ? 'เวลาส่งใบสมัคร' : 'Submitted at', render: (row) => (
                <div className="application-duty-stack">
                  <strong>{formatBangkokDateTime(row.submitted_at, language)}</strong>
                </div>
              ) },
              { key: 'year_major', header: language === 'th' ? 'ชั้นปี/สาขา' : 'Year/Major', render: (row) => (
                <div className="application-duty-stack">
                  <strong>{row.people?.year_level ? `${language === 'th' ? 'ปี ' : 'Year '}${row.people.year_level}` : '-'}</strong>
                  <small>{row.people?.major ?? row.requested_major ?? '-'}</small>
                </div>
              ) },
              { key: 'preferred', header: language === 'th' ? 'ฝ่ายที่เลือก' : 'Preferred duties', render: (row) => <CompactDutyChips labels={preferredDutyLabels(row)} language={language} /> },
              { key: 'assigned', header: language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty', render: (row) => (
                <div className="application-duty-stack">
                  <Badge status={row.assigned_duty ? 'approved' : 'pending'}>{assignedDutyLabel(row, dutiesByKey) || (language === 'th' ? 'รอจัดสรร' : 'Pending')}</Badge>
                  <small>{assignmentMethodLabel(row.assignment_method, language)}</small>
                </div>
              ) },
              { key: 'availability', header: language === 'th' ? 'วันซ้อม / วันจริง' : 'Rehearsal / Event day', render: (row) => (
                <div className="application-duty-stack">
                  <small>{language === 'th' ? 'ซ้อม' : 'Rehearsal'}: {text(row.answers?.can_attend_rehearsal) || '-'}</small>
                  <small>{language === 'th' ? 'วันจริง' : 'Event day'}: {text(row.answers?.can_work_event_day) || '-'}</small>
                </div>
              ) },
              { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => (
                <div className="application-duty-stack">
                  <Badge status={getApplicationStatusTone(row.status)}>{getApplicationStatusLabel(row.status, language)}</Badge>
                  <Badge status={identityTone(row.identity_status ?? 'unverified')}>{identityStatusLabel(row.identity_status ?? 'unverified', language)}</Badge>
                </div>
              ) },
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
                    label={language === 'th' ? 'ฝ่ายที่จัดไว้ล่าสุด' : 'Latest duty'}
                    value={reviewDraft.finalDuty}
                    onChange={(eventInput) => setReviewDraft({ ...reviewDraft, finalDuty: eventInput.target.value })}
                    options={finalDutyOptions}
                  />
                </div>
                {reviewDraft.status === 'approved' && !reviewDraft.finalDuty ? (
                  <Card variant="warning">
                    <strong>{language === 'th' ? 'ยังไม่ได้ระบุฝ่ายที่จัดไว้ล่าสุด' : 'Latest duty not assigned'}</strong>
                    <p>{language === 'th' ? 'สามารถอนุมัติก่อนได้ แต่ควรจัดสรรฝ่ายให้ชัดเจนก่อนวันงาน' : 'You can approve first, but assign a duty before the event day.'}</p>
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
                  <p>{getDutyLabelTh(dutiesByKey.get(assignmentOverride.dutyKey)?.duty_label_th ?? assignmentOverride.dutyKey)}</p>
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
                <Card>
                  <h2>{language === 'th' ? 'ข้อมูลใบสมัคร' : 'Application'}</h2>
                  <div className="application-detail-grid">
                    <DetailRow force label={language === 'th' ? 'เวลาส่งใบสมัคร' : 'Submitted at'} value={detailRow.submitted_at ? formatBangkokDateTime(detailRow.submitted_at, language) : (language === 'th' ? 'ไม่พบเวลา' : 'Not available')} />
                    <DetailRow force label={language === 'th' ? 'สถานะใบสมัคร' : 'Application status'} value={getApplicationStatusLabel(detailRow.status, language)} />
                    <DetailRow force label={language === 'th' ? 'สถานะตัวตน' : 'Identity status'} value={identityStatusLabel(detailRow.identity_status ?? 'unverified', language)} />
                  </div>
                </Card>
                <Card>
                  <h2>{language === 'th' ? 'ข้อมูลผู้สมัคร' : 'Applicant'}</h2>
                  <div className="application-detail-grid">
                    <DetailRow label={language === 'th' ? 'ชื่อ-นามสกุล' : 'Full name'} value={applicantName(detailRow)} />
                    <DetailRow label={language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'} value={detailRow.people?.student_id ?? detailRow.requested_student_id} />
                    <DetailRow label={language === 'th' ? 'สาขา / ชั้นปี' : 'Major / year'} value={`${detailRow.people?.major ?? detailRow.requested_major ?? '-'}${detailRow.people?.year_level ? ` / ${language === 'th' ? 'ปี ' : 'Year '}${detailRow.people.year_level}` : ''}`} />
                    <DetailRow label={language === 'th' ? 'CMU Mail ที่ผู้สมัครกรอก' : 'Requested CMU Mail'} value={detailRow.requested_email} />
                    <DetailRow label={language === 'th' ? 'เบอร์โทรที่ผู้สมัครกรอก' : 'Requested phone'} value={detailRow.requested_phone} />
                    <DetailRow force label={language === 'th' ? 'ข้อมูลที่ตรวจพบจากฐานกลาง' : 'Matched central record'} value={<CompactMatchedPerson row={detailRow} language={language} />} />
                  </div>
                </Card>
                <Card>
                  <h2>{language === 'th' ? 'ตำแหน่งฝ่าย' : 'Duty position'}</h2>
                  <div className="application-detail-grid">
                    <DetailRow label={language === 'th' ? 'ตำแหน่งฝ่ายที่เลือก' : 'Selected duty position'} value={preferredDutyLabels(detailRow).join(', ')} />
                    <DetailRow label={language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'} value={assignedDutyLabel(detailRow, dutiesByKey)} />
                  </div>
                  <details className="filter-disclosure">
                    <summary>{language === 'th' ? 'รายละเอียดการจัดฝ่าย' : 'Assignment details'}</summary>
                    <div className="application-detail-grid">
                      <DetailRow label={language === 'th' ? 'วิธีการจัดฝ่าย' : 'Assignment method'} value={assignmentMethodLabel(detailRow.assignment_method, language)} />
                      <DetailRow label={language === 'th' ? 'หมายเหตุการจัดฝ่าย' : 'Assignment note'} value={detailRow.assignment_note} />
                      <DetailRow label={language === 'th' ? 'ฝ่ายที่จัดไว้ล่าสุด' : 'Latest duty'} value={getDutyLabelTh(finalDuty(detailRow))} />
                      <DetailRow label={language === 'th' ? 'สถานะสตาฟกิจกรรม' : 'Event staff'} value={isPromoted(detailRow) ? (language === 'th' ? `เพิ่มแล้ว (${promotedEventStaffId(detailRow)})` : `Promoted (${promotedEventStaffId(detailRow)})`) : ''} />
                    </div>
                  </details>
                </Card>
                <Card>
                  <h2>{language === 'th' ? 'ความพร้อมในการปฏิบัติงาน' : 'Work readiness'}</h2>
                  <div className="application-detail-grid">
                    <DetailRow label={language === 'th' ? 'วันซ้อม' : 'Rehearsal'} value={text(detailRow.answers?.can_attend_rehearsal)} />
                    <DetailRow label={language === 'th' ? 'วันจริง' : 'Event day'} value={text(detailRow.answers?.can_work_event_day)} />
                    <DetailRow label={language === 'th' ? 'ประสบการณ์' : 'Experience'} value={text(detailRow.answers?.staff_experience) || detailRow.experience} />
                  </div>
                </Card>
                <Card variant="warning">
                  <h2>{language === 'th' ? 'ข้อมูลสุขภาพและข้อจำกัด' : 'Health and limitations'}</h2>
                  <div className="application-detail-grid">
                    <DetailRow force label={language === 'th' ? 'ข้อจำกัดด้านสุขภาพ / การแพ้อาหาร / การแพ้ยา' : 'Health / allergy / limitation'} value={adminHealthSummary(detailRow)} />
                    {healthEntries(detailRow).map((entry) => (
                      <DetailRow key={entry.label} label={entry.label} value={text(entry.value)} />
                    ))}
                  </div>
                </Card>
                {(isMeaningfulValue(applicantNote(detailRow)) || isMeaningfulValue(detailRow.review_note)) ? (
                  <Card>
                    <h2>{language === 'th' ? 'หมายเหตุ' : 'Notes'}</h2>
                    <div className="application-detail-grid">
                      <DetailRow label={language === 'th' ? 'หมายเหตุผู้สมัคร' : 'Applicant note'} value={applicantNote(detailRow)} />
                      <DetailRow label={language === 'th' ? 'หมายเหตุรีวิว' : 'Review note'} value={detailRow.review_note} />
                    </div>
                  </Card>
                ) : null}
                {hasAdditionalSystemData(detailRow) ? (
                  <details className="filter-disclosure">
                    <summary>{language === 'th' ? 'ข้อมูลระบบเพิ่มเติม' : 'Additional system data'}</summary>
                    <div className="application-detail-grid">
                      <DetailRow label={language === 'th' ? 'Consent' : 'Consent'} value={consentText(detailRow.answers?.consent, language)} />
                      <DetailRow label={language === 'th' ? 'รีวิวเมื่อ' : 'Reviewed at'} value={formatBangkokDateTime(detailRow.reviewed_at, language)} />
                      <DetailRow label={language === 'th' ? 'รีวิวโดย' : 'Reviewed by'} value={detailRow.reviewed_by} />
                      <DetailRow label="event_staff_id" value={promotedEventStaffId(detailRow)} />
                      <DetailRow label="promoted_to_event_staff" value={detailRow.answers?.promoted_to_event_staff === true ? 'true' : ''} />
                      <DetailRow label="raw final duty" value={finalDuty(detailRow)} />
                      <DetailRow label={language === 'th' ? 'ช่วงเวลาที่สะดวก (ข้อมูลเดิม)' : 'Legacy availability'} value={text(detailRow.availability?.text) || text(detailRow.answers?.availability)} />
                    </div>
                  </details>
                ) : null}
                <Card variant="soft">
                  <div className="section-heading">
                    <Save size={20} />
                    <div>
                      <h2>{language === 'th' ? 'การจัดการ' : 'Actions'}</h2>
                      <p>{language === 'th' ? 'ปรับฝ่ายเบื้องต้นและฝ่ายที่จัดไว้ล่าสุดจากรายการมาตรฐานเท่านั้น' : 'Use canonical duty options for preliminary and latest duty updates.'}</p>
                    </div>
                  </div>
                  <div className="form-grid two-col">
                    <Select
                      label={language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'}
                      placeholder={language === 'th' ? 'โปรดเลือกฝ่าย' : 'Please select a duty'}
                      value={draftAssignedDuties[detailRow.id] ?? getApplicationAssignedDutyKey(detailRow) ?? ''}
                      onChange={(eventInput) => setDraftAssignedDuties({ ...draftAssignedDuties, [detailRow.id]: eventInput.target.value })}
                      options={manualDutyOptions}
                    />
                    <Select
                      label={language === 'th' ? 'ฝ่ายที่จัดไว้ล่าสุด' : 'Latest duty'}
                      placeholder={language === 'th' ? 'โปรดเลือกฝ่าย' : 'Please select a duty'}
                      value={draftFinalDuties[detailRow.id] ?? finalDuty(detailRow)}
                      onChange={(eventInput) => setDraftFinalDuties({ ...draftFinalDuties, [detailRow.id]: eventInput.target.value })}
                      options={finalDutyOptions}
                    />
                  </div>
                  <div className="form-actions">
                    <Button variant="secondary" icon={<Save size={16} />} loading={savingId === detailRow.id} onClick={() => void saveAssignedDuty(detailRow)}>
                      {language === 'th' ? 'บันทึกฝ่ายเบื้องต้น' : 'Save preliminary duty'}
                    </Button>
                    <Button variant="secondary" icon={<Save size={16} />} loading={savingId === detailRow.id} onClick={() => void saveFinalDuty(detailRow)}>
                      {language === 'th' ? 'บันทึกฝ่ายที่จัดไว้ล่าสุด' : 'Save latest duty'}
                    </Button>
                  </div>
                </Card>
              </div>
            ) : null}
          </Modal>
        </>
      ) : null}
    </section>
  );
}
