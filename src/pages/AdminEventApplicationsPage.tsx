import { ArrowLeft, CheckCircle, Clock, Download, Eye, MessageSquare, RefreshCw, Save, ShieldAlert, UserPlus, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
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
import { fetchAdminEventById, fetchAdminEventStaffApplications, promoteStaffApplicationToEventStaff, type AdminStaffApplicationRow, updateAdminStaffApplicationReview } from '../services/events';
import { errorMessage } from '../utils/error';

type ExportPreset = 'all' | 'approved' | 'by_final_duty' | 'rehearsal' | 'contact' | 'full_admin';

function text(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object' && 'text' in value) return String((value as { text?: unknown }).text ?? '');
  return value == null ? '' : String(value);
}

function duties(row: AdminStaffApplicationRow) {
  const value = row.answers?.preferred_duties ?? row.preferred_team;
  return Array.isArray(value) ? value.map(String) : text(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function finalDuty(row: AdminStaffApplicationRow) {
  return text(row.answers?.final_duty);
}

function promotedEventStaffId(row: AdminStaffApplicationRow) {
  return text(row.answers?.event_staff_id);
}

function isPromoted(row: AdminStaffApplicationRow) {
  return row.answers?.promoted_to_event_staff === true || Boolean(promotedEventStaffId(row));
}

function applicantName(row: AdminStaffApplicationRow) {
  return row.people?.nickname || row.people?.name_th || row.people?.name_en || row.requested_name_th || row.people?.student_id || row.requested_student_id || 'ผู้สมัคร';
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

function csvValue(value: unknown) {
  const clean = text(value).replace(/\r?\n/g, ' ').trim();
  return `"${clean.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = Object.keys(rows[0] ?? { empty: '' });
  const csv = [
    headers.map(csvValue).join(','),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(',')),
  ].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
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
  const [toast, setToast] = useState<ToastState>(null);
  const [filters, setFilters] = useState({
    status: '',
    identityStatus: '',
    finalDuty: '',
    preferredDuty: '',
    yearLevel: '',
    major: '',
    rehearsal: '',
    eventDay: '',
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftFinalDuties, setDraftFinalDuties] = useState<Record<string, string>>({});
  const [reviewDraft, setReviewDraft] = useState<{ row: AdminStaffApplicationRow; status: StaffApplicationStatus; finalDuty: string; reviewNote: string } | null>(null);
  const [detailRow, setDetailRow] = useState<AdminStaffApplicationRow | null>(null);
  const event = eventState.data;
  const rows = useMemo(() => applicationsState.data ?? [], [applicationsState.data]);
  const content = getEventContent(event?.slug);
  const finalDutyOptions = useMemo(() => {
    const fromContent = content?.staffRecruitment?.dutiesTh ?? [];
    const fromRows = rows.map(finalDuty).filter(Boolean);
    return [...new Set([...fromContent, ...fromRows])].sort((a, b) => a.localeCompare(b, 'th'));
  }, [content?.staffRecruitment?.dutiesTh, rows]);

  const filterOptions = useMemo(() => {
    const majors = [...new Set(rows.map((row) => row.people?.major).filter(Boolean).map(String))].sort();
    const years = [...new Set(rows.map((row) => row.people?.year_level).filter(Boolean).map(String))].sort();
    const preferred = [...new Set(rows.flatMap(duties))].sort();
    return { majors, years, preferred };
  }, [rows]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    if (filters.identityStatus && row.identity_status !== filters.identityStatus) return false;
    if (filters.finalDuty && finalDuty(row) !== filters.finalDuty) return false;
    if (filters.preferredDuty && !duties(row).includes(filters.preferredDuty)) return false;
    if (filters.yearLevel && String(row.people?.year_level ?? '') !== filters.yearLevel) return false;
    if (filters.major && row.people?.major !== filters.major) return false;
    if (filters.rehearsal && text(row.answers?.can_attend_rehearsal) !== filters.rehearsal) return false;
    if (filters.eventDay && text(row.answers?.can_work_event_day) !== filters.eventDay) return false;
    return true;
  }), [filters, rows]);

  const summary = useMemo(() => {
    const approved = rows.filter((row) => row.status === 'approved');
    const approvedByDuty = finalDutyOptions.map((duty) => ({
      duty,
      count: approved.filter((row) => finalDuty(row) === duty).length,
    }));
    return {
      approvedByDuty,
      waitlisted: rows.filter((row) => row.status === 'waitlisted').length,
      rejected: rows.filter((row) => row.status === 'rejected').length,
      missingFinalDuty: approved.filter((row) => !finalDuty(row)).length,
    };
  }, [finalDutyOptions, rows]);

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

  function rowsForExport(preset: ExportPreset) {
    const source = preset === 'approved'
      ? filteredRows.filter((row) => row.status === 'approved')
      : filteredRows;
    const byFinalDuty = preset === 'by_final_duty' ? [...source].sort((a, b) => finalDuty(a).localeCompare(finalDuty(b), 'th')) : source;
    return byFinalDuty.map((row) => {
      const base: Record<string, unknown> = {
        name: applicantName(row),
        student_id: row.people?.student_id,
        year_level: row.people?.year_level,
        major: row.people?.major,
        identity_status: row.identity_status,
        requested_student_id: row.requested_student_id,
        status: row.status,
        preferred_duties: duties(row).join(', '),
        final_duty: finalDuty(row),
        rehearsal: row.answers?.can_attend_rehearsal,
        event_day: row.answers?.can_work_event_day,
        availability: row.availability?.text ?? row.answers?.availability,
        submitted_at: row.submitted_at,
        promoted_to_event_staff: isPromoted(row) ? 'yes' : 'no',
      };
      if (preset === 'contact' || preset === 'full_admin') {
        base.email = row.requested_email ?? row.people?.email;
        base.phone = row.requested_phone ?? row.people?.phone;
      }
      if (preset === 'rehearsal') {
        base.email = row.requested_email ?? row.people?.email;
        base.phone = row.requested_phone ?? row.people?.phone;
      }
      if (preset === 'full_admin') {
        base.health_or_limitations = row.answers?.health_or_limitations;
        base.staff_experience = row.answers?.staff_experience ?? row.experience;
        base.note = row.answers?.note;
        base.review_note = row.review_note;
      }
      return base;
    });
  }

  function exportPreset(preset: ExportPreset) {
    const exportRows = rowsForExport(preset);
    if (!exportRows.length) {
      setToast({ type: 'error', message: language === 'th' ? 'ไม่มีข้อมูลสำหรับ export' : 'No rows to export' });
      return;
    }
    const sensitive = preset === 'full_admin' ? '-full-admin-sensitive' : '';
    downloadCsv(`staff-applications-${preset}${sensitive}.csv`, exportRows);
    setToast({ type: 'success', message: preset === 'full_admin' ? (language === 'th' ? 'Export แบบเต็มรวมข้อมูลละเอียดแล้ว' : 'Full admin export downloaded') : (language === 'th' ? 'Export แล้ว' : 'Export downloaded') });
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
            <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={() => { void eventState.reload(); void applicationsState.reload(); }}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>
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

      {event ? (
        <>
          <div className="event-stat-grid">
            <Card className="event-detail-card" variant="soft">
              <strong>{rows.length}</strong>
              <span>{language === 'th' ? 'ใบสมัครทั้งหมด' : 'Total applications'}</span>
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
              <strong>{summary.missingFinalDuty}</strong>
              <span>{language === 'th' ? 'อนุมัติแล้วยังไม่ระบุหน้าที่' : 'Approved missing final duty'}</span>
            </Card>
          </div>

          <Card className="event-detail-card">
            <div>
              <p className="eyebrow">{language === 'th' ? 'สรุปตามหน้าที่สุดท้าย' : 'Final duty summary'}</p>
              <h2>{language === 'th' ? 'จำนวนผู้ผ่านตามหน้าที่' : 'Approved by final duty'}</h2>
            </div>
            <div className="event-mini-grid">
              {summary.approvedByDuty.map((item) => (
                <div className="event-mini-card" key={item.duty}>
                  <strong>{item.count}</strong>
                  <span>{item.duty}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="event-form-card">
            <div>
              <p className="eyebrow">{language === 'th' ? 'ตัวกรอง' : 'Filters'}</p>
              <h2>{language === 'th' ? 'คัดกรองใบสมัคร' : 'Filter applications'}</h2>
            </div>
            <div className="filter-panel-grid">
              <Select
                label={language === 'th' ? 'สถานะ' : 'Status'}
                value={filters.status}
                onChange={(eventInput) => setFilters({ ...filters, status: eventInput.target.value })}
                options={STAFF_APPLICATION_STATUSES.map((status) => ({ value: status, label: getApplicationStatusLabel(status, language) }))}
              />
              <Select
                label={language === 'th' ? 'สถานะตัวตน' : 'Identity'}
                value={filters.identityStatus}
                onChange={(eventInput) => setFilters({ ...filters, identityStatus: eventInput.target.value })}
                options={['verified', 'email_mismatch', 'pending_identity_review', 'not_found', 'rejected_identity'].map((status) => ({ value: status, label: identityStatusLabel(status, language) }))}
              />
              <Select label={language === 'th' ? 'หน้าที่สุดท้าย' : 'Final duty'} value={filters.finalDuty} onChange={(eventInput) => setFilters({ ...filters, finalDuty: eventInput.target.value })} options={finalDutyOptions} />
              <Select label={language === 'th' ? 'ฝ่ายที่สนใจ' : 'Preferred duty'} value={filters.preferredDuty} onChange={(eventInput) => setFilters({ ...filters, preferredDuty: eventInput.target.value })} options={filterOptions.preferred} />
              <Select label={language === 'th' ? 'ชั้นปี' : 'Year'} value={filters.yearLevel} onChange={(eventInput) => setFilters({ ...filters, yearLevel: eventInput.target.value })} options={filterOptions.years} />
              <Select label={language === 'th' ? 'สาขา' : 'Major'} value={filters.major} onChange={(eventInput) => setFilters({ ...filters, major: eventInput.target.value })} options={filterOptions.majors} />
              <Select label={language === 'th' ? 'วันซ้อม' : 'Rehearsal'} value={filters.rehearsal} onChange={(eventInput) => setFilters({ ...filters, rehearsal: eventInput.target.value })} options={['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ']} />
              <Select label={language === 'th' ? 'วันจริง' : 'Event day'} value={filters.eventDay} onChange={(eventInput) => setFilters({ ...filters, eventDay: eventInput.target.value })} options={['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ']} />
            </div>
            <div className="event-card-actions">
              <Button variant="secondary" icon={<Download size={17} />} onClick={() => exportPreset('all')}>{language === 'th' ? 'Export ทั้งหมด' : 'All'}</Button>
              <Button variant="secondary" icon={<Download size={17} />} onClick={() => exportPreset('approved')}>{language === 'th' ? 'ผ่านเท่านั้น' : 'Approved'}</Button>
              <Button variant="secondary" icon={<Download size={17} />} onClick={() => exportPreset('by_final_duty')}>{language === 'th' ? 'ตามหน้าที่' : 'By duty'}</Button>
              <Button variant="secondary" icon={<Download size={17} />} onClick={() => exportPreset('rehearsal')}>{language === 'th' ? 'รายชื่อวันซ้อม' : 'Rehearsal list'}</Button>
              <Button variant="secondary" icon={<Download size={17} />} onClick={() => exportPreset('contact')}>{language === 'th' ? 'Contact list' : 'Contact list'}</Button>
              <Button variant="danger" icon={<Download size={17} />} onClick={() => exportPreset('full_admin')}>{language === 'th' ? 'Full admin export (มีข้อมูลละเอียด)' : 'Full admin export (sensitive)'}</Button>
            </div>
          </Card>

          <ResponsiveDataTable
            rows={filteredRows}
            getKey={(row) => row.id}
            emptyText={language === 'th' ? 'ไม่พบใบสมัครตามตัวกรอง' : 'No applications match the filters'}
            mobileTitle={(row) => applicantName(row)}
            mobileSubtitle={(row) => `${getApplicationStatusLabel(row.status, language)} · ${identityStatusLabel(row.identity_status ?? 'unverified', language)} · ${row.people?.major ?? row.requested_major ?? '-'}`}
            mobileMeta={(row) => formatBangkokDateTime(row.submitted_at, language)}
            mobileActions={(row) => actionButtons(row, true)}
            columns={[
              { key: 'name', header: language === 'th' ? 'ผู้สมัคร' : 'Applicant', render: (row) => <strong>{applicantName(row)}</strong>, priority: 'primary' },
              { key: 'year', header: language === 'th' ? 'ชั้นปี' : 'Year', render: (row) => row.people?.year_level ?? '-' },
              { key: 'major', header: language === 'th' ? 'สาขา' : 'Major', render: (row) => row.people?.major ?? '-' },
              { key: 'identity', header: language === 'th' ? 'ตัวตน' : 'Identity', render: (row) => <Badge status={identityTone(row.identity_status ?? 'unverified')}>{identityStatusLabel(row.identity_status ?? 'unverified', language)}</Badge> },
              { key: 'preferred', header: language === 'th' ? 'ฝ่ายที่สนใจ' : 'Preferred duties', render: (row) => duties(row).join(', ') || '-' },
              { key: 'availability', header: language === 'th' ? 'เวลาว่าง' : 'Availability', render: (row) => text(row.availability?.text) || '-' },
              { key: 'rehearsal', header: language === 'th' ? 'ซ้อม' : 'Rehearsal', render: (row) => text(row.answers?.can_attend_rehearsal) || '-' },
              { key: 'event_day', header: language === 'th' ? 'วันจริง' : 'Event day', render: (row) => text(row.answers?.can_work_event_day) || '-' },
              { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => <span className={`status-pill status-${row.status}`}>{getApplicationStatusLabel(row.status, language)}</span> },
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

          <Modal open={Boolean(detailRow)} title={language === 'th' ? 'รายละเอียดใบสมัคร' : 'Application details'} onClose={() => setDetailRow(null)}>
            {detailRow ? (
              <div className="modal-body page-stack">
                <Card variant="soft">
                  <div className="mobile-row-head">
                    <div>
                      <strong>{applicantName(detailRow)}</strong>
                      <span>{detailRow.people?.student_id ?? detailRow.requested_student_id ?? '-'} · {detailRow.people?.major ?? detailRow.requested_major ?? '-'} · {detailRow.people?.year_level ?? '-'}</span>
                    </div>
                    <Badge status={getApplicationStatusTone(detailRow.status)}>{getApplicationStatusLabel(detailRow.status, language)}</Badge>
                  </div>
                </Card>
                <div className="application-detail-grid">
                  <span>{language === 'th' ? 'สถานะตัวตน' : 'Identity status'}</span><strong>{identityStatusLabel(detailRow.identity_status ?? 'unverified', language)}</strong>
                  <span>{language === 'th' ? 'CMU Mail ที่ผู้สมัครกรอก' : 'Requested CMU Mail'}</span><strong>{detailRow.requested_email ?? '-'}</strong>
                  <span>{language === 'th' ? 'เบอร์โทรที่ผู้สมัครกรอก' : 'Requested phone'}</span><strong>{detailRow.requested_phone ?? '-'}</strong>
                  <span>{language === 'th' ? 'รหัสนักศึกษาที่กรอก' : 'Requested student ID'}</span><strong>{detailRow.requested_student_id ?? '-'}</strong>
                  <span>{language === 'th' ? 'ข้อมูลคนที่ match' : 'Matched person'}</span><strong>{detailRow.people ? `${detailRow.people.student_id ?? '-'} · ${detailRow.people.email ?? '-'} · ${detailRow.people.phone ?? '-'}` : '-'}</strong>
                  <span>{language === 'th' ? 'ฝ่ายที่สนใจ' : 'Preferred duties'}</span><strong>{duties(detailRow).join(', ') || '-'}</strong>
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
