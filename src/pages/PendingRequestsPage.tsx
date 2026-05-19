import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Toast, ToastState } from '../components/ui/Toast';
import { useAsync } from '../hooks/useAsync';
import { fieldLabels } from '../lib/constants';
import type { EditRequest } from '../lib/types';
import { approveEditRequest, fetchPendingRequests, rejectEditRequest } from '../services/profiles';
import { errorMessage } from '../utils/error';

export function PendingRequestsPage() {
  const state = useAsync(fetchPendingRequests, []);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState>(null);

  async function approve(request: EditRequest) {
    try {
      await approveEditRequest(request.id);
      setToast({ type: 'success', message: 'อนุมัติคำขอแล้ว' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'อนุมัติไม่สำเร็จ') });
    }
  }

  async function reject(request: EditRequest) {
    try {
      await rejectEditRequest(request.id, noteById[request.id] ?? '');
      setToast({ type: 'success', message: 'ปฏิเสธคำขอแล้ว' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'ปฏิเสธไม่สำเร็จ') });
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">Requests</p>
        <h1>คำขอแก้ไขที่รออนุมัติ</h1>
      </div>
      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}
      {!state.loading && !state.data?.length ? <div className="empty-state">ยังไม่มีคำขอที่รออนุมัติ</div> : null}
      <div className="request-list">
        {(state.data ?? []).map((request) => (
          <Card key={request.id} className="request-card">
            <div className="request-header">
              <div>
                <h2>{request.profiles?.name_th ?? request.requested_by_email}</h2>
                <p>{request.requested_by_email}</p>
              </div>
              <Badge status="pending">รออนุมัติ</Badge>
            </div>
            <div className="diff-grid">
              {Object.keys(request.new_data ?? {}).map((key) => (
                <div key={key}>
                  <span>{fieldLabels[key] ?? key}</span>
                  <del>{String((request.old_data as Record<string, unknown> | null)?.[key] ?? '-')}</del>
                  <strong>{String((request.new_data as Record<string, unknown> | null)?.[key] ?? '-')}</strong>
                </div>
              ))}
            </div>
            <Input
              label="หมายเหตุกรณีปฏิเสธ"
              value={noteById[request.id] ?? ''}
              onChange={(event) => setNoteById({ ...noteById, [request.id]: event.target.value })}
            />
            <div className="admin-action-bar">
              <Button icon={<Check size={18} />} onClick={() => approve(request)}>
                อนุมัติ
              </Button>
              <Button variant="danger" icon={<X size={18} />} onClick={() => reject(request)}>
                ปฏิเสธ
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
