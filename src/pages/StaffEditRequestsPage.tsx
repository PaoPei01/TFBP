import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { approveStaffEditRequest, fetchAdminStaffEditRequests, rejectStaffEditRequest, staffDisplayName } from '../services/staffProfiles';
import { errorMessage } from '../utils/error';

export function StaffEditRequestsPage() {
  const { language } = useLanguage();
  const state = useAsync(fetchAdminStaffEditRequests, []);
  const [toast, setToast] = useState<ToastState>(null);
  const rows = state.data ?? [];

  async function review(id: string, approved: boolean) {
    try {
      if (approved) await approveStaffEditRequest(id);
      else await rejectStaffEditRequest(id, language === 'th' ? 'ปฏิเสธโดยผู้ดูแล' : 'Rejected by admin');
      setToast({ type: 'success', message: approved ? (language === 'th' ? 'อนุมัติคำขอแล้ว' : 'Request approved') : (language === 'th' ? 'ปฏิเสธคำขอแล้ว' : 'Request rejected') });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ดำเนินการไม่สำเร็จ' : 'Action failed') });
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader eyebrow="Staff Requests" title={language === 'th' ? 'คำขอแก้ไขโปรไฟล์ทีมงาน' : 'Staff Profile Requests'} description={language === 'th' ? 'อนุมัติหรือปฏิเสธคำขอแก้ไขข้อมูลสำคัญของทีมงาน' : 'Review sensitive staff profile update requests.'} />
      <div className="stats-grid">
        <Card className="stat-card"><div><p>{language === 'th' ? 'รออนุมัติ' : 'Pending'}</p><strong>{rows.filter((row) => row.status === 'pending').length}</strong></div></Card>
        <Card className="stat-card"><div><p>{language === 'th' ? 'ทั้งหมด' : 'Total'}</p><strong>{rows.length}</strong></div></Card>
      </div>
      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}
      <ResponsiveDataTable
        rows={rows}
        getKey={(row) => row.id}
        emptyText={language === 'th' ? 'ไม่มีคำขอแก้ไขทีมงาน' : 'No staff edit requests'}
        mobileTitle={(row) => staffDisplayName(row.staff_profile ?? { nickname_th: null, nickname: null, nickname_en: null, name_th: null, name_en: null, student_id: null })}
        mobileSubtitle={(row) => `${row.status} · ${new Date(row.created_at ?? '').toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}`}
        columns={[
          { key: 'staff', header: language === 'th' ? 'ทีมงาน' : 'Staff', render: (row) => staffDisplayName(row.staff_profile ?? { nickname_th: null, nickname: null, nickname_en: null, name_th: null, name_en: null, student_id: null }) },
          { key: 'status', header: language === 'th' ? 'สถานะ' : 'Status', render: (row) => <Badge status={row.status === 'approved' ? 'approved' : row.status === 'rejected' ? 'rejected' : 'pending'}>{row.status}</Badge> },
          { key: 'new_data', header: language === 'th' ? 'ข้อมูลใหม่' : 'New data', render: (row) => <code>{JSON.stringify(row.new_data)}</code> },
          { key: 'created', header: language === 'th' ? 'วันที่ส่ง' : 'Created', render: (row) => new Date(row.created_at ?? '').toLocaleString(language === 'th' ? 'th-TH' : 'en-US') },
          {
            key: 'actions',
            header: language === 'th' ? 'จัดการ' : 'Actions',
            render: (row) => row.status === 'pending' ? (
              <div className="row-actions">
                <Button icon={<Check size={16} />} onClick={() => review(row.id, true)}>{language === 'th' ? 'อนุมัติ' : 'Approve'}</Button>
                <Button variant="danger" icon={<X size={16} />} onClick={() => review(row.id, false)}>{language === 'th' ? 'ปฏิเสธ' : 'Reject'}</Button>
              </div>
            ) : '-',
          },
        ]}
      />
    </section>
  );
}
