import { CheckCircle, Eye, RefreshCw, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { useAsync } from '../hooks/useAsync';
import { formatBangkokDateTime } from '../lib/dateTime';
import { fetchAdminEvents, fetchPersonUpdateRequests, reviewPersonUpdateRequest, type PersonUpdateRequestRow } from '../services/events';
import { errorMessage } from '../utils/error';

function statusLabel(status: string, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    pending: { th: 'รอตรวจสอบ', en: 'Waiting for review' },
    approved: { th: 'อนุมัติแล้ว', en: 'Approved' },
    rejected: { th: 'ปฏิเสธแล้ว', en: 'Rejected' },
    cancelled: { th: 'ยกเลิก', en: 'Cancelled' },
  };
  return labels[status]?.[language] ?? status;
}

function requestTypeLabel(type: string, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    email_correction: { th: 'แก้ไข CMU Mail', en: 'Email correction' },
    phone_update: { th: 'อัปเดตเบอร์โทร', en: 'Phone update' },
    profile_update: { th: 'แก้ไขข้อมูลทั่วไป', en: 'Profile update' },
    identity_not_found: { th: 'ไม่พบตัวตนในฐาน', en: 'Identity not found' },
  };
  return labels[type]?.[language] ?? type;
}

function applicantName(row: PersonUpdateRequestRow) {
  return row.requested_name_th || row.people?.name_th || row.people?.name_en || row.requested_student_id || 'คำร้อง';
}

export function AdminPeopleUpdateRequestsPage() {
  const { language } = useLanguage();
  const eventsState = useAsync(fetchAdminEvents, []);
  const [filters, setFilters] = useState({ status: '', requestType: '', eventId: '', search: '' });
  const requestsState = useAsync(() => fetchPersonUpdateRequests(filters), [filters.status, filters.requestType, filters.eventId]);
  const [toast, setToast] = useState<ToastState>(null);
  const [detail, setDetail] = useState<PersonUpdateRequestRow | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const data = requestsState.data ?? [];
    if (!search) return data;
    return data.filter((row) => [
      row.requested_student_id,
      row.requested_name_th,
      row.requested_name_en,
      row.requested_email,
      row.people?.student_id,
      row.people?.name_th,
      row.people?.name_en,
      row.people?.email,
    ].some((value) => String(value ?? '').toLowerCase().includes(search)));
  }, [filters.search, requestsState.data]);

  async function review(row: PersonUpdateRequestRow, status: 'approved' | 'rejected') {
    try {
      setSavingId(row.id);
      await reviewPersonUpdateRequest({ id: row.id, status, reviewNote });
      setToast({ type: 'success', message: status === 'approved' ? (language === 'th' ? 'อนุมัติคำร้องแล้ว' : 'Request approved') : (language === 'th' ? 'ปฏิเสธคำร้องแล้ว' : 'Request rejected') });
      setDetail(null);
      setReviewNote('');
      await requestsState.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'อัปเดตคำร้องไม่สำเร็จ' : 'Could not update request') });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="events-page page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow={language === 'th' ? 'ข้อมูลกลาง' : 'Central records'}
        title={language === 'th' ? 'คำร้องแก้ข้อมูล' : 'Update requests'}
        description={language === 'th' ? 'ตรวจคำร้องแก้ไข CMU Mail เบอร์โทร และข้อมูลพื้นฐาน โดยไม่แสดงข้อมูลสุขภาพ' : 'Review CMU Mail, phone, and basic profile correction requests without exposing health data.'}
        meta={<EventSwitcher compact />}
        actions={(
          <>
            <Link className="btn btn-secondary" to="/admin/people">{language === 'th' ? 'ข้อมูลกลาง' : 'Central records'}</Link>
            <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={() => { void eventsState.reload(); void requestsState.reload(); }}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>
          </>
        )}
      />

      <Card className="workflow-explainer-card" variant="soft">
        <div>
          <strong>{language === 'th' ? 'คำร้องแก้ข้อมูล' : 'Update requests'}</strong>
          <span>{language === 'th' ? 'ตรวจคำร้องที่เกี่ยวกับอีเมล เบอร์โทร หรือข้อมูลยืนยันตัวตน' : 'Review requests related to identity fields such as email or phone.'}</span>
        </div>
        <Badge status="pending">{language === 'th' ? `รอตรวจสอบ ${(rows.filter((row) => row.status === 'pending').length).toLocaleString()} รายการ` : `${(rows.filter((row) => row.status === 'pending').length).toLocaleString()} waiting for review`}</Badge>
      </Card>

      {requestsState.loading ? <LoadingSkeleton /> : null}
      {requestsState.error ? (
        <EmptyState title={language === 'th' ? 'โหลดคำร้องไม่สำเร็จ' : 'Could not load requests'} action={<Button variant="secondary" onClick={requestsState.reload}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>} />
      ) : null}

      <Card className="event-form-card">
        <div>
          <p className="eyebrow">{language === 'th' ? 'ตัวกรอง' : 'Filters'}</p>
          <h2>{language === 'th' ? 'ค้นหาและคัดกรองคำร้อง' : 'Search and filter requests'}</h2>
        </div>
        <div className="filter-panel-grid">
          <Input label={language === 'th' ? 'ค้นหา' : 'Search'} value={filters.search} onChange={(input) => setFilters({ ...filters, search: input.target.value })} />
          <Select label={language === 'th' ? 'สถานะ' : 'Status'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.status} onChange={(input) => setFilters({ ...filters, status: input.target.value })} options={['pending', 'approved', 'rejected', 'cancelled'].map((status) => ({ value: status, label: statusLabel(status, language) }))} />
          <Select label={language === 'th' ? 'ประเภทคำร้อง' : 'Request type'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.requestType} onChange={(input) => setFilters({ ...filters, requestType: input.target.value })} options={['email_correction', 'phone_update', 'profile_update', 'identity_not_found'].map((type) => ({ value: type, label: requestTypeLabel(type, language) }))} />
          <Select label={language === 'th' ? 'กิจกรรม' : 'Event'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.eventId} onChange={(input) => setFilters({ ...filters, eventId: input.target.value })} options={(eventsState.data ?? []).map((event) => ({ value: event.id, label: language === 'th' ? event.name_th : event.name_en || event.name_th }))} />
        </div>
      </Card>

      <ResponsiveDataTable
        rows={rows}
        getKey={(row) => row.id}
        emptyText={language === 'th' ? 'ยังไม่มีคำร้องตามตัวกรอง' : 'No update requests match the filters'}
        mobileTitle={applicantName}
        mobileSubtitle={(row) => `${requestTypeLabel(row.request_type, language)} · ${statusLabel(row.status, language)}`}
        mobileMeta={(row) => formatBangkokDateTime(row.created_at, language)}
        mobileActions={(row) => <Button size="sm" variant="secondary" icon={<Eye size={16} />} onClick={() => setDetail(row)}>{language === 'th' ? 'รายละเอียด' : 'Details'}</Button>}
        columns={[
          { key: 'name', header: language === 'th' ? 'ผู้ส่งคำร้อง' : 'Requester', render: (row) => <strong>{applicantName(row)}</strong>, priority: 'primary' },
          { key: 'student', header: language === 'th' ? 'รหัส' : 'Student ID', render: (row) => row.requested_student_id ?? row.people?.student_id ?? '-' },
          { key: 'type', header: language === 'th' ? 'ประเภท' : 'Type', render: (row) => requestTypeLabel(row.request_type, language) },
          { key: 'event', header: language === 'th' ? 'กิจกรรม' : 'Event', render: (row) => row.events?.name_th ?? '-' },
          { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => <Badge status={row.status === 'approved' ? 'approved' : row.status === 'rejected' ? 'rejected' : 'pending'}>{statusLabel(row.status, language)}</Badge> },
          { key: 'created', header: language === 'th' ? 'ส่งเมื่อ' : 'Submitted', render: (row) => formatBangkokDateTime(row.created_at, language) },
          { key: 'actions', header: language === 'th' ? 'จัดการ' : 'Actions', render: (row) => <Button size="sm" variant="secondary" icon={<Eye size={16} />} onClick={() => setDetail(row)}>{language === 'th' ? 'รายละเอียด' : 'Details'}</Button>, align: 'right', mobileHidden: true },
        ]}
      />

      <Modal open={Boolean(detail)} title={language === 'th' ? 'รายละเอียดคำร้อง' : 'Request details'} onClose={() => setDetail(null)}>
        {detail ? (
          <div className="modal-body page-stack">
            <Card variant="soft">
              <div className="mobile-row-head">
                <div>
                  <strong>{applicantName(detail)}</strong>
                  <span>{detail.requested_student_id ?? detail.people?.student_id ?? '-'} · {requestTypeLabel(detail.request_type, language)}</span>
                </div>
                <Badge status={detail.status === 'approved' ? 'approved' : detail.status === 'rejected' ? 'rejected' : 'pending'}>{statusLabel(detail.status, language)}</Badge>
              </div>
            </Card>
            <div className="application-detail-grid">
              <span>{language === 'th' ? 'CMU Mail ที่ขอแก้' : 'Requested CMU Mail'}</span><strong>{detail.requested_email ?? '-'}</strong>
              <span>{language === 'th' ? 'เบอร์โทรที่ขอแก้' : 'Requested phone'}</span><strong>{detail.requested_phone ?? '-'}</strong>
              <span>{language === 'th' ? 'ชื่อที่ส่งมา' : 'Requested name'}</span><strong>{detail.requested_name_th ?? '-'}</strong>
              <span>{language === 'th' ? 'สาขาที่ส่งมา' : 'Requested major'}</span><strong>{detail.requested_major ?? '-'}</strong>
              <span>{language === 'th' ? 'ข้อมูลเดิม' : 'Matched person'}</span><strong>{detail.people ? `${detail.people.name_th ?? detail.people.name_en ?? '-'} · ${detail.people.email ?? '-'} · ${detail.people.phone ?? '-'}` : '-'}</strong>
              <span>{language === 'th' ? 'หมายเหตุผู้ส่ง' : 'Evidence note'}</span><strong>{detail.evidence_note ?? '-'}</strong>
              <span>{language === 'th' ? 'หมายเหตุรีวิว' : 'Review note'}</span><strong>{detail.review_note ?? '-'}</strong>
            </div>
            <Card variant="warning">
              <strong>{language === 'th' ? 'ตรวจสอบก่อนอนุมัติ' : 'Review before approving'}</strong>
              <p>{language === 'th' ? 'การอนุมัติจะอัปเดต people เฉพาะ CMU Mail เบอร์โทร ชื่อ และสาขาที่ส่งมา โดยไม่แตะข้อมูลสุขภาพ' : 'Approval updates only CMU Mail, phone, name, and major. Health data is never updated here.'}</p>
            </Card>
            <label className="field">
              <span>{language === 'th' ? 'หมายเหตุผู้ดูแล' : 'Admin note'}</span>
              <textarea rows={3} value={reviewNote} onChange={(input) => setReviewNote(input.target.value)} />
            </label>
            <div className="form-actions">
              <Button icon={<CheckCircle size={18} />} loading={savingId === detail.id} onClick={() => void review(detail, 'approved')}>{language === 'th' ? 'อนุมัติ' : 'Approve'}</Button>
              <Button variant="danger" icon={<XCircle size={18} />} loading={savingId === detail.id} onClick={() => void review(detail, 'rejected')}>{language === 'th' ? 'ปฏิเสธ' : 'Reject'}</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
