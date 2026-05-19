import { Download, HeartPulse, Pencil, Trash2, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { ContactLinks } from '../components/ContactLinks';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useAsync } from '../hooks/useAsync';
import { fieldLabels } from '../lib/constants';
import { majorLabel } from '../lib/major';
import type { Profile } from '../lib/types';
import { deleteProfile, fetchAdminMajors, fetchAdminProfiles, fetchAdminSummary, updateProfile } from '../services/profiles';
import { exportProfilesCsv } from '../utils/csv';
import { errorMessage } from '../utils/error';

export function AdminDashboardPage() {
  const [search, setSearch] = useState('');
  const [major, setMajor] = useState('');
  const [editing, setEditing] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const profilesState = useAsync(() => fetchAdminProfiles({ search, major }), [search, major]);
  const summaryState = useAsync(fetchAdminSummary, []);
  const majorsState = useAsync(fetchAdminMajors, []);
  const profiles = profilesState.data ?? [];

  async function saveProfile() {
    if (!editing) return;
    try {
      await updateProfile(editing.id, editing);
      setToast({ type: 'success', message: 'บันทึกข้อมูลแล้ว' });
      setEditing(null);
      await profilesState.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'บันทึกไม่สำเร็จ') });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteProfile(deleting.id);
      setToast({ type: 'success', message: 'ลบข้อมูลแล้ว' });
      setDeleting(null);
      await profilesState.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'ลบไม่สำเร็จ') });
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">Dashboard</p>
        <h1>แดชบอร์ดผู้ดูแล</h1>
        <p>ข้อมูลละเอียดในหน้านี้เป็นข้อมูลสำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>

      {summaryState.loading ? <LoadingSkeleton count={2} /> : null}
      {summaryState.data ? (
        <div className="stats-grid">
          <DashboardStatCard label="ผู้เข้าร่วมทั้งหมด" value={summaryState.data.total} icon={<UsersRound size={20} />} />
          <DashboardStatCard label="คำขอรออนุมัติ" value={summaryState.data.pending} helper="ตรวจสอบในหน้าคำขอแก้ไข" />
          <DashboardStatCard
            label="ข้อมูลสุขภาพ"
            value={summaryState.data.health.food_allergy + summaryState.data.health.disease + summaryState.data.health.drug_allergy}
            helper="แพ้อาหาร โรคประจำตัว แพ้ยา"
            icon={<HeartPulse size={20} />}
          />
        </div>
      ) : null}

      {summaryState.data ? (
        <Card className="major-summary">
          <h2>สรุปตามสาขา</h2>
          <div>
            {Object.entries(summaryState.data.byMajor).map(([name, count]) => (
              <span key={name}>
                {name} <strong>{count}</strong>
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="toolbar">
        <Input label="ค้นหาข้อมูลผู้เข้าร่วม" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ชื่อ อีเมล เบอร์ Line IG Facebook" />
        <Select label="กรองสาขา" value={major} onChange={(event) => setMajor(event.target.value)} options={majorsState.data ?? []} />
        <Button variant="secondary" icon={<Download size={18} />} onClick={() => exportProfilesCsv(profiles)}>
          Export CSV
        </Button>
      </div>

      {profilesState.loading ? <LoadingSkeleton /> : null}
      {profilesState.error ? <div className="error-state">{profilesState.error}</div> : null}

      <ResponsiveDataTable
        rows={profiles}
        getKey={(row) => row.id}
        emptyText="ไม่พบข้อมูลผู้เข้าร่วม"
        columns={[
          { key: 'name', header: 'ชื่อ', render: (row) => <strong>{row.name_th}</strong> },
          { key: 'major', header: 'สาขา', render: (row) => majorLabel(row.major) },
          { key: 'email', header: 'อีเมล', render: (row) => row.email },
          { key: 'phone', header: 'เบอร์', render: (row) => row.phone },
          { key: 'social', header: 'ช่องทาง', render: (row) => <ContactLinks lineId={row.line_id} instagram={row.instagram} facebook={row.facebook} other={row.other_contact} /> },
          {
            key: 'actions',
            header: 'จัดการ',
            render: (row) => (
              <div className="row-actions">
                <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEditing(row)}>
                  แก้ไข
                </Button>
                <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setDeleting(row)}>
                  ลบ
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={Boolean(editing)} title="แก้ไขข้อมูลผู้เข้าร่วม" onClose={() => setEditing(null)}>
        {editing ? (
          <div className="form-grid two-col modal-body">
            {Object.entries(fieldLabels).map(([field, label]) =>
              field === 'public_profile' || field === 'show_instagram' || field === 'show_line_id' ? (
                <label className="check-field" key={field}>
                  <input
                    type="checkbox"
                    checked={Boolean(editing[field as keyof Profile])}
                    onChange={(event) => setEditing({ ...editing, [field]: event.target.checked })}
                  />
                  <span>{label}</span>
                </label>
              ) : (
                <Input
                  key={field}
                  label={label}
                  value={String(editing[field as keyof Profile] ?? '')}
                  onChange={(event) => setEditing({ ...editing, [field]: event.target.value })}
                />
              ),
            )}
            <div className="form-actions full-span">
              <Button onClick={saveProfile}>บันทึก</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                ยกเลิก
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(deleting)} title="ยืนยันการลบข้อมูล" onClose={() => setDeleting(null)}>
        <div className="modal-body">
          <p>ต้องการลบข้อมูลของ {deleting?.name_th} หรือไม่ การกระทำนี้ควรทำเมื่อแน่ใจแล้วเท่านั้น</p>
          <div className="form-actions">
            <Button variant="danger" onClick={confirmDelete}>
              ลบข้อมูล
            </Button>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
