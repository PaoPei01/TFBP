import { BarChart3, Download, FileSpreadsheet, Pencil, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContactLinks } from '../components/ContactLinks';
import { HealthFlags } from '../components/HealthFlags';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MobileSearchHeader } from '../components/mobile/MobileSearchHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { groupMeta, mainGroups, subgroups } from '../lib/groups';
import { majorCatalog, majorCodeOptions, majorLabel, normalizeMajor } from '../lib/major';
import { normalizeStaffOperationalRole, normalizeStaffSecondaryRoles, staffOperationalRoles } from '../lib/staffRoles';
import type { MainGroup, StaffAssignment, StaffManagementRow, StaffMedicalInfo, StaffRole, Subgroup } from '../lib/types';
import { deleteStaffProfile, fetchAdminStaffProfiles, syncStaffRoster, updateStaffProfile } from '../services/staffManagement';
import { errorMessage } from '../utils/error';
import { exportStaffCsv, exportStaffXlsx } from '../utils/staffExport';

const roles: StaffRole[] = ['staff', 'mentor', 'emergency_staff', 'viewer'];
const operationalRoles = staffOperationalRoles;

function blankAssignment(staffProfileId: string): StaffAssignment {
  return { id: '', user_id: null, staff_profile_id: staffProfileId, role: null, main_group: null, subgroup: null, primary_role: null, secondary_roles: [], created_at: null };
}

function blankMedical(staffProfileId: string): StaffMedicalInfo {
  return { id: '', staff_profile_id: staffProfileId, disease: null, drug_allergy: null, food_allergy: null, medical_note: null, created_at: null, updated_at: null };
}

export function StaffManagementPage() {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [mainGroup, setMainGroup] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [major, setMajor] = useState('');
  const [editing, setEditing] = useState<StaffManagementRow | null>(null);
  const [deleting, setDeleting] = useState<StaffManagementRow | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const state = useAsync(() => fetchAdminStaffProfiles({ search, position, mainGroup, subgroup, major }), [search, position, mainGroup, subgroup, major]);
  const rows = useMemo(() => state.data ?? [], [state.data]);
  const positions = useMemo(() => [...new Set(rows.map((row) => row.position).filter(Boolean))].sort() as string[], [rows]);
  const majors = useMemo(() => majorCodeOptions(rows.map((row) => row.major)), [rows]);

  async function save() {
    if (!editing) return;
    try {
      await updateStaffProfile(editing.id, {
        profile: {
          user_id: editing.user_id,
          student_id: editing.student_id,
          email: editing.email,
          name_th: editing.name_th,
          name_en: editing.name_en,
          nickname: editing.nickname,
          nickname_th: editing.nickname_th,
          nickname_en: editing.nickname_en,
          phone: editing.phone,
          major: editing.major,
          instagram: editing.instagram,
          line_id: editing.line_id,
          facebook: editing.facebook,
          other_contact: editing.other_contact,
          position: editing.position,
        },
        medical: {
          disease: editing.medical_info?.disease ?? null,
          drug_allergy: editing.medical_info?.drug_allergy ?? null,
          food_allergy: editing.medical_info?.food_allergy ?? null,
          medical_note: editing.medical_info?.medical_note ?? null,
        },
        assignment: {
          role: editing.assignment?.role ?? null,
          main_group: editing.assignment?.main_group ?? null,
          subgroup: editing.assignment?.subgroup ?? null,
          primary_role: normalizeStaffOperationalRole(editing.assignment?.primary_role ?? editing.position),
          secondary_roles: normalizeStaffSecondaryRoles(editing.assignment?.secondary_roles),
        },
      });
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกข้อมูลสตาฟแล้ว' : 'Staff profile saved' });
      setEditing(null);
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed') });
    }
  }

  function patchEditing(values: Partial<StaffManagementRow>) {
    if (!editing) return;
    setEditing({ ...editing, ...values });
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteStaffProfile(deleting.id);
      setToast({ type: 'success', message: language === 'th' ? 'ลบรายชื่อทีมงานแล้ว' : 'Staff profile deleted' });
      setDeleting(null);
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ลบไม่สำเร็จ' : 'Delete failed') });
    }
  }

  async function syncRoster() {
    try {
      setSyncing(true);
      const result = await syncStaffRoster();
      setToast({ type: 'success', message: language === 'th' ? `ซิงค์ข้อมูลพี่กลุ่มแล้ว ${result.synced ?? 0} รายการ` : `Staff roster synced: ${result.synced ?? 0} records` });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ซิงค์ไม่สำเร็จ' : 'Sync failed') });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">Staff Management</p>
        <h1>{language === 'th' ? 'จัดการข้อมูลทีมงาน' : 'Staff management'}</h1>
        <p>{language === 'th' ? 'ข้อมูลสตาฟแยกจากรายชื่อผู้เข้าร่วม ข้อมูลสุขภาพใช้เฉพาะแอดมินและทีมฉุกเฉินเท่านั้น' : 'Staff records are separated from participant profiles. Medical data is restricted to admins and emergency staff.'}</p>
      </div>

      <MobileSearchHeader
        label={language === 'th' ? 'ค้นหาสตาฟ' : 'Search staff'}
        value={search}
        onChange={setSearch}
        placeholder={language === 'th' ? 'ชื่อ ชื่อเล่น รหัส เบอร์ สาขา' : 'Name, nickname, ID, phone, major'}
        resultText={`${rows.length} ${language === 'th' ? 'คน' : 'people'}`}
      />

      <Card className="group-action-panel">
        <div className="form-actions">
          <Link className="btn btn-primary" to="/admin/staff/import"><FileSpreadsheet size={18} />{language === 'th' ? 'นำเข้า Excel' : 'Import Excel'}</Link>
          <Link className="btn btn-secondary" to="/admin/staff/operations"><BarChart3 size={18} />{language === 'th' ? 'โควตาทีมงาน' : 'Staff Ops'}</Link>
          <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={syncRoster} disabled={syncing}>{language === 'th' ? 'ซิงค์ข้อมูลพี่กลุ่ม' : 'Sync Staff Roster'}</Button>
          <Button variant="secondary" icon={<Download size={18} />} onClick={() => exportStaffCsv(rows)}>CSV</Button>
          <Button variant="secondary" icon={<Download size={18} />} onClick={() => exportStaffXlsx(rows)}>Excel</Button>
        </div>
      </Card>

      <div className="toolbar">
        <div className="search-shell">
          <Search size={18} aria-hidden="true" />
          <Input label={language === 'th' ? 'ค้นหา' : 'Search'} value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select label={language === 'th' ? 'ตำแหน่ง' : 'Position'} value={position} onChange={(event) => setPosition(event.target.value)} options={positions} />
        <Select label={language === 'th' ? 'สี' : 'Color'} value={mainGroup} onChange={(event) => setMainGroup(event.target.value)} options={mainGroups.map((item) => ({ value: item, label: language === 'th' ? groupMeta[item].th : groupMeta[item].en }))} />
        <Select label={language === 'th' ? 'กลุ่มย่อย' : 'Subgroup'} value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroups.map((item) => ({ value: item, label: `Group ${item}` }))} />
        <Select label={language === 'th' ? 'สาขา' : 'Major'} value={major} onChange={(event) => setMajor(event.target.value)} options={majors.map((code) => ({ value: code, label: majorLabel(`(${code})`, language) }))} />
      </div>

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}

      <ResponsiveDataTable
        rows={rows}
        getKey={(row) => row.id}
        emptyText={language === 'th' ? 'ยังไม่มีข้อมูลสตาฟ' : 'No staff records yet'}
        mobileDetailsLabel={language === 'th' ? 'ข้อมูลเพิ่มเติม' : 'More details'}
        mobileTitle={(row) => row.nickname_th || row.nickname || row.nickname_en || row.name_th || row.name_en || '-'}
        mobileSubtitle={(row) => `${row.name_th || '-'} · ${majorLabel(row.major, language)}`}
        mobileMeta={(row) => groupLabel(row.assignment?.main_group, row.assignment?.subgroup, language)}
        mobileActions={(row) => (
          <div className="row-actions">
            <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEditing(row)}>{language === 'th' ? 'แก้ไข' : 'Edit'}</Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setDeleting(row)}>{language === 'th' ? 'ลบ' : 'Delete'}</Button>
          </div>
        )}
        columns={[
          { key: 'name', header: language === 'th' ? 'ชื่อ' : 'Name', render: (row) => <div className="participant-admin-cell"><strong>{row.name_th || row.name_en}</strong><span>{row.nickname_th || row.nickname || row.nickname_en} · {row.student_id}</span></div> },
          { key: 'major', header: language === 'th' ? 'สาขา' : 'Major', render: (row) => majorLabel(row.major, language) },
          { key: 'position', header: language === 'th' ? 'ตำแหน่ง' : 'Position', render: (row) => row.position || '-' },
          { key: 'role', header: language === 'th' ? 'สิทธิ์' : 'Role', render: (row) => row.assignment?.role || '-' },
          { key: 'ops_role', header: language === 'th' ? 'หน้าที่' : 'Ops role', render: (row) => <div className="participant-admin-cell"><strong>{row.assignment?.primary_role || row.position || '-'}</strong><span>{row.assignment?.secondary_roles?.join(', ') || '-'}</span></div> },
          { key: 'group', header: language === 'th' ? 'กลุ่ม' : 'Group', render: (row) => groupLabel(row.assignment?.main_group, row.assignment?.subgroup, language) },
          { key: 'phone', header: language === 'th' ? 'เบอร์' : 'Phone', render: (row) => row.phone || '-' },
          { key: 'contact', header: language === 'th' ? 'ช่องทางติดต่อ' : 'Contact', render: (row) => <ContactLinks instagram={row.instagram} lineId={row.line_id} facebook={row.facebook} other={row.other_contact} /> },
          { key: 'medical', header: language === 'th' ? 'สุขภาพ' : 'Medical', render: (row) => <HealthFlags profile={{ disease: row.medical_info?.disease ?? null, drug_allergy: row.medical_info?.drug_allergy ?? null, food_allergy: row.medical_info?.food_allergy ?? null }} detail /> },
          {
            key: 'actions',
            header: language === 'th' ? 'จัดการ' : 'Actions',
            render: (row) => (
              <div className="row-actions">
                <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEditing(row)}>{language === 'th' ? 'แก้ไข' : 'Edit'}</Button>
                <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setDeleting(row)}>{language === 'th' ? 'ลบ' : 'Delete'}</Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={Boolean(editing)} title={language === 'th' ? 'แก้ไขข้อมูลสตาฟ' : 'Edit staff profile'} onClose={() => setEditing(null)}>
        {editing ? (
          <div className="form-grid two-col modal-body">
            <Input label="User UID" value={editing.user_id ?? ''} onChange={(event) => patchEditing({ user_id: event.target.value })} />
            <Input label={language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'} value={editing.student_id ?? ''} onChange={(event) => patchEditing({ student_id: event.target.value })} />
            <Input label={language === 'th' ? 'อีเมล' : 'Email'} value={editing.email ?? ''} onChange={(event) => patchEditing({ email: event.target.value })} />
            <Input label={language === 'th' ? 'ชื่อไทย' : 'Thai name'} value={editing.name_th ?? ''} onChange={(event) => patchEditing({ name_th: event.target.value })} />
            <Input label={language === 'th' ? 'ชื่ออังกฤษ' : 'English name'} value={editing.name_en ?? ''} onChange={(event) => patchEditing({ name_en: event.target.value })} />
            <Input label={language === 'th' ? 'ชื่อเล่นไทย' : 'Nickname TH'} value={editing.nickname_th ?? ''} onChange={(event) => patchEditing({ nickname_th: event.target.value })} />
            <Input label={language === 'th' ? 'ชื่อเล่นอังกฤษ' : 'Nickname EN'} value={editing.nickname_en ?? ''} onChange={(event) => patchEditing({ nickname_en: event.target.value })} />
            <Input label={language === 'th' ? 'ชื่อเล่นเดิม' : 'Legacy nickname'} value={editing.nickname ?? ''} onChange={(event) => patchEditing({ nickname: event.target.value })} />
            <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} value={editing.phone ?? ''} onChange={(event) => patchEditing({ phone: event.target.value })} />
            <Select label={language === 'th' ? 'สาขา' : 'Major'} value={editing.major ? normalizeMajor(editing.major) : ''} options={majorCatalog.map((item) => ({ value: normalizeMajor(`(${item.code})`), label: majorLabel(`(${item.code})`, language) }))} onChange={(event) => patchEditing({ major: event.target.value })} />
            <Input label="Instagram" value={editing.instagram ?? ''} onChange={(event) => patchEditing({ instagram: event.target.value })} />
            <Input label="Line ID" value={editing.line_id ?? ''} onChange={(event) => patchEditing({ line_id: event.target.value })} />
            <Input label="Facebook" value={editing.facebook ?? ''} onChange={(event) => patchEditing({ facebook: event.target.value })} />
            <Input label={language === 'th' ? 'ช่องทางอื่น' : 'Other contact'} value={editing.other_contact ?? ''} onChange={(event) => patchEditing({ other_contact: event.target.value })} />
            <Input label={language === 'th' ? 'ตำแหน่ง' : 'Position'} value={editing.position ?? ''} onChange={(event) => patchEditing({ position: event.target.value })} />
            <Select label={language === 'th' ? 'สิทธิ์' : 'Role'} value={editing.assignment?.role ?? ''} options={roles} onChange={(event) => patchEditing({ assignment: { ...(editing.assignment ?? blankAssignment(editing.id)), role: (event.target.value || null) as StaffRole | null } })} />
            <Select label={language === 'th' ? 'หน้าที่หลัก' : 'Primary role'} value={normalizeStaffOperationalRole(editing.assignment?.primary_role ?? editing.position) ?? ''} options={operationalRoles} onChange={(event) => patchEditing({ assignment: { ...(editing.assignment ?? blankAssignment(editing.id)), primary_role: event.target.value || null } })} />
            <Input label={language === 'th' ? 'หน้าที่เสริม' : 'Secondary roles'} value={editing.assignment?.secondary_roles?.join(', ') ?? ''} onChange={(event) => patchEditing({ assignment: { ...(editing.assignment ?? blankAssignment(editing.id)), secondary_roles: normalizeStaffSecondaryRoles(event.target.value) } })} />
            <Select label={language === 'th' ? 'สี' : 'Color'} value={editing.assignment?.main_group ?? ''} options={mainGroups.map((item) => ({ value: item, label: language === 'th' ? groupMeta[item].th : groupMeta[item].en }))} onChange={(event) => patchEditing({ assignment: { ...(editing.assignment ?? blankAssignment(editing.id)), main_group: (event.target.value || null) as MainGroup | null } })} />
            <Select label={language === 'th' ? 'กลุ่มย่อย' : 'Subgroup'} value={editing.assignment?.subgroup ?? ''} options={subgroups.map((item) => ({ value: item, label: `Group ${item}` }))} onChange={(event) => patchEditing({ assignment: { ...(editing.assignment ?? blankAssignment(editing.id)), subgroup: (event.target.value || null) as Subgroup | null } })} />
            <Input label={language === 'th' ? 'โรคประจำตัว' : 'Disease'} value={editing.medical_info?.disease ?? ''} onChange={(event) => patchEditing({ medical_info: { ...(editing.medical_info ?? blankMedical(editing.id)), disease: event.target.value } })} />
            <Input label={language === 'th' ? 'แพ้ยา' : 'Drug allergy'} value={editing.medical_info?.drug_allergy ?? ''} onChange={(event) => patchEditing({ medical_info: { ...(editing.medical_info ?? blankMedical(editing.id)), drug_allergy: event.target.value } })} />
            <Input label={language === 'th' ? 'แพ้อาหาร' : 'Food allergy'} value={editing.medical_info?.food_allergy ?? ''} onChange={(event) => patchEditing({ medical_info: { ...(editing.medical_info ?? blankMedical(editing.id)), food_allergy: event.target.value } })} />
            <Input label={language === 'th' ? 'หมายเหตุสุขภาพ' : 'Medical note'} value={editing.medical_info?.medical_note ?? ''} onChange={(event) => patchEditing({ medical_info: { ...(editing.medical_info ?? blankMedical(editing.id)), medical_note: event.target.value } })} />
            <div className="form-actions full-span sticky-form-actions">
              <Button onClick={save}>{language === 'th' ? 'บันทึก' : 'Save'}</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(deleting)} title={language === 'th' ? 'ยืนยันการลบรายชื่อทีมงาน' : 'Confirm staff deletion'} onClose={() => setDeleting(null)}>
        <div className="modal-body">
          <p>{language === 'th' ? `ต้องการลบข้อมูลทีมงานของ ${deleting?.name_th ?? deleting?.nickname_th ?? deleting?.nickname ?? deleting?.student_id} หรือไม่ ข้อมูลสุขภาพและ assignment ที่ผูกกับรายชื่อนี้จะถูกลบด้วย` : `Delete staff record for ${deleting?.name_en ?? deleting?.name_th ?? deleting?.nickname_en ?? deleting?.nickname ?? deleting?.student_id}? Linked medical info and assignment will also be deleted.`}</p>
          <div className="form-actions">
            <Button variant="danger" icon={<Trash2 size={18} />} onClick={confirmDelete}>
              {language === 'th' ? 'ลบรายชื่อทีมงาน' : 'Delete staff'}
            </Button>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
