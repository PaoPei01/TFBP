import { ArrowLeft, Download, RefreshCw, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { formatBangkokDateTime } from '../lib/dateTime';
import { getEventContent } from '../lib/eventContent';
import { eventPath } from '../lib/eventRoutes';
import { fetchAdminEventById, fetchAdminEventStaffApplications, type AdminStaffApplicationRow, updateAdminStaffApplicationReview } from '../services/events';
import { errorMessage } from '../utils/error';

type ExportPreset = 'all' | 'approved' | 'by_final_duty' | 'rehearsal' | 'contact' | 'full_admin';

const statuses = ['submitted', 'under_review', 'approved', 'waitlisted', 'rejected', 'withdrawn'];

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

function applicantName(row: AdminStaffApplicationRow) {
  return row.people?.nickname || row.people?.name_th || row.people?.name_en || row.people?.student_id || 'ผู้สมัคร';
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
    finalDuty: '',
    preferredDuty: '',
    yearLevel: '',
    major: '',
    rehearsal: '',
    eventDay: '',
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftFinalDuties, setDraftFinalDuties] = useState<Record<string, string>>({});
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
      const nextAnswers = { ...row.answers, final_duty: value };
      await updateAdminStaffApplicationReview({ id: row.id, answers: nextAnswers });
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
        status: row.status,
        preferred_duties: duties(row).join(', '),
        final_duty: finalDuty(row),
        rehearsal: row.answers?.can_attend_rehearsal,
        event_day: row.answers?.can_work_event_day,
        availability: row.availability?.text ?? row.answers?.availability,
        submitted_at: row.submitted_at,
      };
      if (preset === 'contact' || preset === 'full_admin') {
        base.email = row.people?.email;
        base.phone = row.people?.phone;
      }
      if (preset === 'rehearsal') {
        base.email = row.people?.email;
        base.phone = row.people?.phone;
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
        actions={(
          <>
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
              <Select label={language === 'th' ? 'สถานะ' : 'Status'} value={filters.status} onChange={(eventInput) => setFilters({ ...filters, status: eventInput.target.value })} options={statuses} />
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
            mobileSubtitle={(row) => `${row.status} · ${row.people?.major ?? '-'}`}
            mobileMeta={(row) => formatBangkokDateTime(row.submitted_at, language)}
            columns={[
              { key: 'name', header: language === 'th' ? 'ผู้สมัคร' : 'Applicant', render: (row) => <strong>{applicantName(row)}</strong>, priority: 'primary' },
              { key: 'year', header: language === 'th' ? 'ชั้นปี' : 'Year', render: (row) => row.people?.year_level ?? '-' },
              { key: 'major', header: language === 'th' ? 'สาขา' : 'Major', render: (row) => row.people?.major ?? '-' },
              { key: 'preferred', header: language === 'th' ? 'ฝ่ายที่สนใจ' : 'Preferred duties', render: (row) => duties(row).join(', ') || '-' },
              { key: 'availability', header: language === 'th' ? 'เวลาว่าง' : 'Availability', render: (row) => text(row.availability?.text) || '-' },
              { key: 'rehearsal', header: language === 'th' ? 'ซ้อม' : 'Rehearsal', render: (row) => text(row.answers?.can_attend_rehearsal) || '-' },
              { key: 'event_day', header: language === 'th' ? 'วันจริง' : 'Event day', render: (row) => text(row.answers?.can_work_event_day) || '-' },
              { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => <span className={`status-pill status-${row.status}`}>{row.status}</span> },
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
            ]}
          />
        </>
      ) : null}
    </section>
  );
}
