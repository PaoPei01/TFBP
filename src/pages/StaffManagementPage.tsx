import { BarChart3, Download, FileSpreadsheet, Pencil, RefreshCw, Search, SlidersHorizontal, Trash2, UserPlus, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContactLinks } from '../components/ContactLinks';
import { HealthFlags } from '../components/HealthFlags';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MobileFilterSheet } from '../components/mobile/MobileFilterSheet';
import { MobileSearchHeader } from '../components/mobile/MobileSearchHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ExportActions } from '../components/ui/ExportActions';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { copy } from '../lib/copy';
import { groupLabel } from '../lib/grouping';
import { groupMeta, mainGroups, subgroups } from '../lib/groups';
import { majorCatalog, majorCodeOptions, majorLabel, normalizeMajor } from '../lib/major';
import { normalizeStaffOperationalRole, normalizeStaffSecondaryRoles, staffOperationalRoles } from '../lib/staffRoles';
import type { MainGroup, StaffAssignment, StaffManagementRow, StaffMedicalInfo, StaffRole, Subgroup } from '../lib/types';
import {
  createStaffProfileFromPerson,
  deleteStaffProfile,
  fetchAdminStaffProfiles,
  lookupPersonForStaffAdd,
  syncStaffRoster,
  updateStaffProfile,
  type StaffPersonLookupResult,
} from '../services/staffManagement';
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
  const commonCopy = copy[language];
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [mainGroup, setMainGroup] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [major, setMajor] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<StaffManagementRow | null>(null);
  const [deleting, setDeleting] = useState<StaffManagementRow | null>(null);
  const [addingOpen, setAddingOpen] = useState(false);
  const [addStudentId, setAddStudentId] = useState('');
  const [addPosition, setAddPosition] = useState('');
  const [addPrimaryRole, setAddPrimaryRole] = useState('');
  const [addSystemRole, setAddSystemRole] = useState<StaffRole>('staff');
  const [addMainGroup, setAddMainGroup] = useState('');
  const [addSubgroup, setAddSubgroup] = useState('');
  const [addLookupResult, setAddLookupResult] = useState<StaffPersonLookupResult | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const state = useAsync(() => fetchAdminStaffProfiles({ search, position, mainGroup, subgroup, major }), [search, position, mainGroup, subgroup, major]);
  const rows = useMemo(() => state.data ?? [], [state.data]);
  const positions = useMemo(() => [...new Set(rows.map((row) => row.position).filter(Boolean))].sort() as string[], [rows]);
  const majors = useMemo(() => majorCodeOptions(rows.map((row) => row.major)), [rows]);

  function clearFilters() {
    setPosition('');
    setMainGroup('');
    setSubgroup('');
    setMajor('');
  }

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

  function toggleSecondaryDuty(roleName: string) {
    if (!editing) return;
    const assignment = editing.assignment ?? blankAssignment(editing.id);
    const current = new Set(assignment.secondary_roles ?? []);
    if (current.has(roleName)) current.delete(roleName);
    else current.add(roleName);
    patchEditing({ assignment: { ...assignment, secondary_roles: normalizeStaffSecondaryRoles([...current]) } });
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

  function resetAddForm() {
    setAddStudentId('');
    setAddPosition('');
    setAddPrimaryRole('');
    setAddSystemRole('staff');
    setAddMainGroup('');
    setAddSubgroup('');
    setAddLookupResult(null);
  }

  function openAddModal() {
    resetAddForm();
    setAddingOpen(true);
  }

  function closeAddModal() {
    setAddingOpen(false);
    resetAddForm();
  }

  async function lookupAddPerson() {
    const studentId = addStudentId.trim();
    if (!studentId) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณากรอกรหัสนักศึกษา' : 'Please enter a student ID' });
      return;
    }
    try {
      setAddLoading(true);
      const result = await lookupPersonForStaffAdd(studentId);
      setAddLookupResult(result);
      if (!result.success) {
        setToast({ type: 'error', message: language === 'th' ? result.message_th ?? 'ไม่พบข้อมูลจากรหัสนักศึกษานี้' : 'No person found for this student ID' });
      }
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ค้นหาข้อมูลไม่สำเร็จ' : 'Lookup failed') });
    } finally {
      setAddLoading(false);
    }
  }

  function patchAddPosition(value: string) {
    setAddPosition(value);
    if (!addPrimaryRole) setAddPrimaryRole(normalizeStaffOperationalRole(value) ?? '');
  }

  async function submitAddStaff() {
    if (!addStudentId.trim()) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณากรอกรหัสนักศึกษา' : 'Please enter a student ID' });
      return;
    }
    if (!addLookupResult?.success || !addLookupResult.person) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณาค้นหาข้อมูลจากฐานก่อนเพิ่มสตาฟ' : 'Please find the person before adding staff' });
      return;
    }
    if (addLookupResult.existing_staff_profile_id) {
      setToast({ type: 'error', message: language === 'th' ? 'รายชื่อนี้มีอยู่ในทีมงานแล้ว' : 'This person is already staff' });
      return;
    }
    if (!addPosition.trim()) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณากรอกตำแหน่ง' : 'Please enter a position' });
      return;
    }
    try {
      setAddSaving(true);
      const result = await createStaffProfileFromPerson({
        studentId: addStudentId,
        position: addPosition,
        primaryRole: addPrimaryRole || normalizeStaffOperationalRole(addPosition) || addPosition,
        systemRole: addSystemRole,
        mainGroup: addMainGroup || null,
        subgroup: addSubgroup || null,
      });
      if (!result.success) {
        setToast({ type: 'error', message: language === 'th' ? result.message_th ?? 'เพิ่มรายชื่อทีมงานไม่สำเร็จ' : result.code === 'already_staff' ? 'This person is already staff' : 'Could not add staff' });
        return;
      }
      setToast({ type: 'success', message: language === 'th' ? result.message_th ?? 'เพิ่มรายชื่อทีมงานแล้ว' : 'Staff member added' });
      setSearch(addStudentId.trim());
      closeAddModal();
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'เพิ่มรายชื่อทีมงานไม่สำเร็จ' : 'Could not add staff') });
    } finally {
      setAddSaving(false);
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
        trailing={<Button variant="secondary" icon={<SlidersHorizontal size={17} />} onClick={() => setFilterOpen(true)}>{language === 'th' ? 'ตัวกรอง' : 'Filters'}</Button>}
      />

      <Card className="group-action-panel">
        <div className="form-actions">
          <Link className="btn btn-primary" to="/admin/staff/import"><FileSpreadsheet size={18} />{language === 'th' ? 'นำเข้า Excel' : 'Import Excel'}</Link>
          <Button variant="secondary" icon={<UserPlus size={18} />} onClick={openAddModal}>{language === 'th' ? 'เพิ่มสตาฟรายบุคคล' : 'Add individual staff'}</Button>
          <Link className="btn btn-secondary" to="/admin/staff/operations"><BarChart3 size={18} />{language === 'th' ? 'โควตาทีมงาน' : 'Staff Ops'}</Link>
          <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={syncRoster} disabled={syncing}>{language === 'th' ? 'ซิงค์ข้อมูลพี่กลุ่ม' : 'Sync Staff Roster'}</Button>
          <ExportActions
            label={commonCopy.export}
            actions={[
              { label: 'CSV', icon: <Download size={16} aria-hidden="true" />, onClick: () => exportStaffCsv(rows) },
              { label: 'Excel', icon: <Download size={16} aria-hidden="true" />, onClick: () => exportStaffXlsx(rows) },
            ]}
          />
        </div>
      </Card>

      <div className="toolbar desktop-filter-panel">
        <div className="search-shell">
          <Search size={18} aria-hidden="true" />
          <Input label={language === 'th' ? 'ค้นหา' : 'Search'} value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select label={language === 'th' ? 'ตำแหน่ง' : 'Position'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={position} onChange={(event) => setPosition(event.target.value)} options={positions} />
        <Select label={language === 'th' ? 'สี' : 'Color'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={mainGroup} onChange={(event) => setMainGroup(event.target.value)} options={mainGroups.map((item) => ({ value: item, label: language === 'th' ? groupMeta[item].th : groupMeta[item].en }))} />
        <Select label={language === 'th' ? 'กลุ่มย่อย' : 'Subgroup'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroups.map((item) => ({ value: item, label: `Group ${item}` }))} />
        <Select label={language === 'th' ? 'สาขา' : 'Major'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={major} onChange={(event) => setMajor(event.target.value)} options={majors.map((code) => ({ value: code, label: majorLabel(`(${code})`, language) }))} />
      </div>

      <MobileFilterSheet
        open={filterOpen}
        title={language === 'th' ? 'ตัวกรองทีมงาน' : 'Staff filters'}
        description={language === 'th' ? 'กรองรายชื่อทีมงานตามตำแหน่ง สี กลุ่มย่อย และสาขา' : 'Filter staff by position, color, subgroup, and major.'}
        primaryLabel={language === 'th' ? 'ใช้ตัวกรอง' : 'Apply'}
        clearLabel={language === 'th' ? 'ล้าง' : 'Clear'}
        onClose={() => setFilterOpen(false)}
        onClear={clearFilters}
      >
        <Select label={language === 'th' ? 'ตำแหน่ง' : 'Position'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={position} onChange={(event) => setPosition(event.target.value)} options={positions} />
        <Select label={language === 'th' ? 'สี' : 'Color'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={mainGroup} onChange={(event) => setMainGroup(event.target.value)} options={mainGroups.map((item) => ({ value: item, label: language === 'th' ? groupMeta[item].th : groupMeta[item].en }))} />
        <Select label={language === 'th' ? 'กลุ่มย่อย' : 'Subgroup'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroups.map((item) => ({ value: item, label: `Group ${item}` }))} />
        <Select label={language === 'th' ? 'สาขา' : 'Major'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={major} onChange={(event) => setMajor(event.target.value)} options={majors.map((code) => ({ value: code, label: majorLabel(`(${code})`, language) }))} />
      </MobileFilterSheet>

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
            <Link className="btn btn-secondary" to={`/admin/staff/${row.id}/profile`}><UserRound size={16} />{language === 'th' ? 'โปรไฟล์' : 'Profile'}</Link>
            <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEditing(row)}>{language === 'th' ? 'แก้ไข' : 'Edit'}</Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setDeleting(row)}>{language === 'th' ? 'ลบ' : 'Delete'}</Button>
          </div>
        )}
        columns={[
          { key: 'name', header: language === 'th' ? 'ชื่อ' : 'Name', render: (row) => <div className="participant-admin-cell"><strong>{row.name_th || row.name_en}</strong><span>{row.nickname_th || row.nickname || row.nickname_en} · {row.student_id}</span></div> },
          { key: 'major', header: language === 'th' ? 'สาขา' : 'Major', render: (row) => majorLabel(row.major, language) },
          { key: 'position', header: language === 'th' ? 'ตำแหน่ง' : 'Position', render: (row) => row.position || '-' },
          { key: 'role', header: language === 'th' ? 'สิทธิ์ระบบ' : 'System role', render: (row) => row.assignment?.role || '-' },
          { key: 'ops_role', header: language === 'th' ? 'หน้าที่' : 'Ops role', render: (row) => <div className="participant-admin-cell"><strong>{row.assignment?.primary_role || row.position || '-'}</strong><span>{row.assignment?.secondary_roles?.join(', ') || '-'}</span></div> },
          { key: 'group', header: language === 'th' ? 'กลุ่ม' : 'Group', render: (row) => groupLabel(row.assignment?.main_group, row.assignment?.subgroup, language) },
          { key: 'phone', header: language === 'th' ? 'เบอร์' : 'Phone', render: (row) => row.phone || '-' },
          { key: 'contact', header: language === 'th' ? 'ช่องทางติดต่อ' : 'Contact', render: (row) => <ContactLinks instagram={row.instagram} lineId={row.line_id} facebook={row.facebook} other={row.other_contact} /> },
          { key: 'medical', header: language === 'th' ? 'สุขภาพ' : 'Medical', render: (row) => <HealthFlags profile={{ disease: row.medical_info?.disease ?? null, drug_allergy: row.medical_info?.drug_allergy ?? null, food_allergy: row.medical_info?.food_allergy ?? null }} detail /> },
          { key: 'profile_status', header: language === 'th' ? 'โปรไฟล์' : 'Profile', render: (row) => row.public_profile?.public_profile_enabled ? (row.public_profile.avatar_path || row.public_profile.avatar_url ? 'complete' : 'missing avatar') : 'public disabled' },
          {
            key: 'actions',
            header: language === 'th' ? 'จัดการ' : 'Actions',
            render: (row) => (
              <div className="row-actions">
                <Link className="btn btn-secondary" to={`/admin/staff/${row.id}/profile`}><UserRound size={16} />{language === 'th' ? 'โปรไฟล์' : 'Profile'}</Link>
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
            <Select label={language === 'th' ? 'สิทธิ์ระบบ' : 'System Role'} value={editing.assignment?.role ?? ''} options={roles} onChange={(event) => patchEditing({ assignment: { ...(editing.assignment ?? blankAssignment(editing.id)), role: (event.target.value || null) as StaffRole | null } })} />
            <Select label={language === 'th' ? 'หน้าที่หลัก' : 'Primary Duty'} value={normalizeStaffOperationalRole(editing.assignment?.primary_role ?? editing.position) ?? ''} options={operationalRoles} onChange={(event) => patchEditing({ assignment: { ...(editing.assignment ?? blankAssignment(editing.id)), primary_role: event.target.value || null } })} />
            <div className="field full-span">
              <span>{language === 'th' ? 'หน้าที่เสริม' : 'Secondary Duties'}</span>
              <div className="duty-checkbox-grid">
                {operationalRoles.map((roleName) => (
                  <label key={roleName}>
                    <input type="checkbox" checked={Boolean(editing.assignment?.secondary_roles?.includes(roleName))} onChange={() => toggleSecondaryDuty(roleName)} />
                    <span>{roleName}</span>
                  </label>
                ))}
              </div>
            </div>
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

      <Modal open={addingOpen} title={language === 'th' ? 'เพิ่มสตาฟรายบุคคล' : 'Add individual staff'} onClose={closeAddModal}>
        <div className="modal-body page-stack">
          <Card variant="soft" className="privacy-notice">
            <strong>{language === 'th' ? 'เพิ่มจากฐานข้อมูลกลาง' : 'Add from central people database'}</strong>
            <span>{language === 'th' ? 'กรอกรหัสนักศึกษาและตำแหน่ง ระบบจะดึงข้อมูลชื่อ อีเมล เบอร์โทร สาขา และข้อมูลที่เกี่ยวข้องจากฐานข้อมูลกลางให้อัตโนมัติ' : 'Enter a student ID and position. The system will pull name, email, phone, major, and related data from the central people database.'}</span>
          </Card>
          <div className="form-grid two-col">
            <Input
              label={language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'}
              value={addStudentId}
              onChange={(event) => {
                setAddStudentId(event.target.value);
                setAddLookupResult(null);
              }}
              required
            />
            <div className="field field-align-end">
              <span>{language === 'th' ? 'ค้นหาข้อมูล' : 'Lookup'}</span>
              <Button type="button" variant="secondary" icon={<Search size={18} />} loading={addLoading} onClick={lookupAddPerson}>
                {language === 'th' ? 'ค้นหาข้อมูลจากฐาน' : 'Find person'}
              </Button>
            </div>
          </div>

          {addLookupResult && !addLookupResult.success ? (
            <Card variant="warning" className="privacy-notice">
              <strong>{language === 'th' ? 'ไม่พบข้อมูลจากรหัสนักศึกษานี้' : 'Person not found'}</strong>
              <span>{language === 'th' ? addLookupResult.message_th ?? 'กรุณาตรวจสอบรหัสนักศึกษาอีกครั้ง' : 'Please check the student ID and try again.'}</span>
            </Card>
          ) : null}

          {addLookupResult?.person ? (
            <Card variant={addLookupResult.existing_staff_profile_id ? 'warning' : 'default'}>
              <div className="participant-admin-cell">
                <strong>{addLookupResult.person.name_th || addLookupResult.person.name_en || addLookupResult.person.nickname || '-'}</strong>
                <span>{[
                  addLookupResult.person.student_id,
                  addLookupResult.person.email,
                  addLookupResult.person.phone,
                  majorLabel(addLookupResult.person.major, language),
                  addLookupResult.person.year_level ? `${language === 'th' ? 'ชั้นปี' : 'Year'} ${addLookupResult.person.year_level}` : '',
                ].filter(Boolean).join(' · ')}</span>
              </div>
              {addLookupResult.existing_staff_profile_id ? (
                <div className="page-stack">
                  <Card variant="warning" className="privacy-notice">
                    <strong>{language === 'th' ? 'รายชื่อนี้มีอยู่ในทีมงานแล้ว' : 'This person is already staff'}</strong>
                    <span>{addLookupResult.existing_position || '-'}</span>
                  </Card>
                  <div className="form-actions">
                    <Link className="btn btn-secondary" to={`/admin/staff/${addLookupResult.existing_staff_profile_id}/profile`} onClick={closeAddModal}>
                      {language === 'th' ? 'เปิดโปรไฟล์เดิม' : 'Open existing profile'}
                    </Link>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch(addLookupResult.person?.student_id ?? addStudentId);
                        closeAddModal();
                      }}
                    >
                      {language === 'th' ? 'ค้นหาในรายชื่อทีมงาน' : 'Search staff list'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}

          <div className="form-grid two-col">
            <Input label={language === 'th' ? 'ตำแหน่ง' : 'Position'} value={addPosition} onChange={(event) => patchAddPosition(event.target.value)} required />
            <Select label={language === 'th' ? 'หน้าที่หลัก' : 'Primary Duty'} value={addPrimaryRole} options={operationalRoles} onChange={(event) => setAddPrimaryRole(event.target.value)} />
            <Select label={language === 'th' ? 'สิทธิ์ระบบ' : 'System role'} value={addSystemRole} options={roles} onChange={(event) => setAddSystemRole((event.target.value || 'staff') as StaffRole)} />
            <Select label={language === 'th' ? 'สี' : 'Color'} value={addMainGroup} options={mainGroups.map((item) => ({ value: item, label: language === 'th' ? groupMeta[item].th : groupMeta[item].en }))} onChange={(event) => setAddMainGroup(event.target.value)} />
            <Select label={language === 'th' ? 'กลุ่มย่อย' : 'Subgroup'} value={addSubgroup} options={subgroups.map((item) => ({ value: item, label: `Group ${item}` }))} onChange={(event) => setAddSubgroup(event.target.value)} />
          </div>

          <Card variant="soft" className="privacy-notice">
            <strong>{language === 'th' ? 'ความเป็นส่วนตัว' : 'Privacy'}</strong>
            <span>{language === 'th' ? 'ข้อมูลสุขภาพจะแสดงเฉพาะผู้ดูแลหรือทีมที่เกี่ยวข้องเท่านั้น' : 'Health information is visible only to admins or authorized safety staff.'}</span>
          </Card>

          <div className="form-actions">
            <Button
              icon={<UserPlus size={18} />}
              loading={addSaving}
              disabled={Boolean(addLookupResult?.existing_staff_profile_id)}
              onClick={submitAddStaff}
            >
              {language === 'th' ? 'เพิ่มเป็นสตาฟ' : 'Add staff'}
            </Button>
            <Button variant="secondary" onClick={closeAddModal}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(deleting)} title={language === 'th' ? 'ยืนยันการลบรายชื่อทีมงาน' : 'Confirm staff deletion'} onClose={() => setDeleting(null)}>
        <div className="modal-body">
          <p>{language === 'th' ? `ต้องการลบรายชื่อทีมงานนี้หรือไม่ การลบจะนำข้อมูลทีมงานของ ${deleting?.name_th ?? deleting?.nickname_th ?? deleting?.nickname ?? deleting?.student_id ?? '-'} ออกจากหน้านี้ และอาจลบข้อมูลหน้าที่หรือข้อมูลสุขภาพที่ผูกกับรายชื่อนี้ด้วย` : `Delete this staff record for ${deleting?.name_en ?? deleting?.name_th ?? deleting?.nickname_en ?? deleting?.nickname ?? deleting?.student_id ?? '-'}? This removes the staff member from this page and may delete linked assignment or health data.`}</p>
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
