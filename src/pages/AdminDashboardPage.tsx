import { Download, HeartPulse, Pencil, SlidersHorizontal, Trash2, UsersRound } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { ContactLinks } from '../components/ContactLinks';
import { HealthFlags, hasHealthFlag } from '../components/HealthFlags';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MobileFilterSheet } from '../components/mobile/MobileFilterSheet';
import { MobileSearchHeader } from '../components/mobile/MobileSearchHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { FilterPanel } from '../components/ui/FilterPanel';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useAsync } from '../hooks/useAsync';
import { useLanguage } from '../context/LanguageContext';
import { fieldLabel, fieldLabels } from '../lib/constants';
import { groupLabel } from '../lib/grouping';
import { groupMeta, mainGroups, subgroups } from '../lib/groups';
import { getMajorCode, majorCatalog, majorLabel, normalizeMajor } from '../lib/major';
import type { GroupProfile, MainGroup, Profile } from '../lib/types';
import { deleteProfile, fetchAdminMajors, fetchAdminProfiles, fetchAdminSummary, updateProfile } from '../services/profiles';
import { exportProfilesCsv, exportProfilesXlsx } from '../utils/csv';
import { errorMessage } from '../utils/error';

export function AdminDashboardPage() {
  const { language, t } = useLanguage();
  const [search, setSearch] = useState('');
  const [major, setMajor] = useState('');
  const [group, setGroup] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<GroupProfile | null>(null);
  const [deleting, setDeleting] = useState<GroupProfile | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const profilesState = useAsync(() => fetchAdminProfiles({ search, major }), [search, major]);
  const summaryState = useAsync(fetchAdminSummary, []);
  const majorsState = useAsync(fetchAdminMajors, []);
  const profiles = useMemo(() => {
    const rows = profilesState.data ?? [];
    return rows.filter((profile) => {
      if (major && getMajorCode(profile.major) !== major) return false;
      if (group && profile.group_assignment?.main_group !== group) return false;
      if (subgroup && profile.group_assignment?.subgroup !== subgroup) return false;
      if (healthFilter === 'any' && !hasHealthFlag(profile)) return false;
      if ((healthFilter === 'disease' || healthFilter === 'drug_allergy' || healthFilter === 'food_allergy') && !hasHealthFlag(profile, healthFilter)) return false;
      return true;
    });
  }, [group, healthFilter, major, profilesState.data, subgroup]);

  const majorOptions = (majorsState.data ?? []).map((code) => ({ value: code, label: majorLabel(`(${code})`, language) }));
  const groupOptions = mainGroups.map((item) => ({ value: item, label: `${groupMeta[item].th} / ${groupMeta[item].en}` }));
  const subgroupOptions = subgroups.map((item) => ({ value: item, label: `Group ${item}` }));
  const healthOptions = [
    { value: 'any', label: language === 'th' ? 'มีข้อมูลสุขภาพใด ๆ' : 'Any health flag' },
    { value: 'disease', label: language === 'th' ? 'โรคประจำตัว' : 'Disease' },
    { value: 'drug_allergy', label: language === 'th' ? 'แพ้ยา' : 'Drug allergy' },
    { value: 'food_allergy', label: language === 'th' ? 'แพ้อาหาร' : 'Food allergy' },
  ];
  const activeFilterChips = [
    search ? `${language === 'th' ? 'ค้นหา' : 'Search'}: ${search}` : '',
    major ? majorLabel(`(${major})`, language) : '',
    group ? groupLabel(group as MainGroup, null, language) : '',
    subgroup ? `Group ${subgroup}` : '',
    healthFilter ? healthOptions.find((item) => item.value === healthFilter)?.label : '',
  ].filter(Boolean);

  function clearFilters() {
    setSearch('');
    setMajor('');
    setGroup('');
    setSubgroup('');
    setHealthFilter('');
  }

  async function saveProfile() {
    if (!editing) return;
    try {
      await updateProfile(editing.id, editing);
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกข้อมูลแล้ว' : 'Profile saved' });
      setEditing(null);
      await profilesState.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed') });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteProfile(deleting.id);
      setToast({ type: 'success', message: language === 'th' ? 'ลบข้อมูลแล้ว' : 'Profile deleted' });
      setDeleting(null);
      await profilesState.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ลบไม่สำเร็จ' : 'Delete failed') });
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Dashboard"
        title={t.dashboard}
        description={t.adminOnly}
        actions={(
          <>
            <Button variant="secondary" icon={<Download size={18} />} onClick={() => exportProfilesCsv(profiles)}>CSV</Button>
            <Button variant="secondary" icon={<Download size={18} />} onClick={() => void exportProfilesXlsx(profiles)}>Excel</Button>
          </>
        )}
      />

      {summaryState.loading ? <LoadingSkeleton count={2} /> : null}
      {summaryState.data ? (
        <div className="stats-grid">
          <DashboardStatCard label={t.totalParticipants} value={summaryState.data.total} icon={<UsersRound size={20} />} />
          <DashboardStatCard label={t.pendingRequests} value={summaryState.data.pending} helper={language === 'th' ? 'ตรวจสอบในหน้าคำขอแก้ไข' : 'Review in requests page'} />
          <DashboardStatCard
            label={t.healthData}
            value={summaryState.data.health.food_allergy + summaryState.data.health.disease + summaryState.data.health.drug_allergy}
            helper={language === 'th' ? 'แพ้อาหาร โรคประจำตัว แพ้ยา' : 'Food allergies, medical conditions, drug allergies'}
            icon={<HeartPulse size={20} />}
          />
        </div>
      ) : null}

      {summaryState.data ? (
        <details className="filter-disclosure major-summary-disclosure">
          <summary>{language === 'th' ? 'สรุปตามสาขา' : 'Major summary'}</summary>
          <Card className="major-summary" variant="soft">
            <div>
              {Object.entries(summaryState.data.byMajor).map(([name, count]) => (
                <span key={name}>
                  {majorLabel(`(${name})`, language)} <strong>{count}</strong>
                </span>
              ))}
            </div>
          </Card>
        </details>
      ) : null}

      <MobileSearchHeader
        label={t.searchParticipants}
        value={search}
        onChange={setSearch}
        placeholder={language === 'th' ? 'ชื่อ อีเมล เบอร์ Line IG Facebook' : 'Name, email, phone, Line, IG, Facebook'}
        resultText={language === 'th' ? `${profiles.length.toLocaleString('th-TH')} รายการ` : `${profiles.length.toLocaleString('en-US')} results`}
        trailing={<Button variant="secondary" icon={<SlidersHorizontal size={17} />} onClick={() => setFilterOpen(true)}>{language === 'th' ? 'ตัวกรอง' : 'Filters'}</Button>}
      >
        {activeFilterChips.length ? activeFilterChips.slice(0, 2).map((chip) => <span className="filter-chip" key={chip}>{chip}</span>) : null}
      </MobileSearchHeader>

      <FilterPanel
        className="desktop-filter-panel"
        title={language === 'th' ? 'ค้นหาและตัวกรอง' : 'Search and filters'}
        description={language === 'th' ? `แสดงผล ${profiles.length.toLocaleString('th-TH')} รายการ` : `${profiles.length.toLocaleString('en-US')} results`}
        actions={<Button variant="ghost" onClick={clearFilters}>{language === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}</Button>}
        chips={activeFilterChips.length ? (
          <div className="filter-chip-row">
            {activeFilterChips.map((chip) => <span className="filter-chip" key={chip}>{chip}</span>)}
          </div>
        ) : null}
      >
        <Input label={t.searchParticipants} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'th' ? 'ชื่อ อีเมล เบอร์ Line IG Facebook' : 'Name, email, phone, Line, IG, Facebook'} />
        <Select label={t.filterMajor} value={major} onChange={(event) => setMajor(event.target.value)} options={majorOptions} />
        <Select label={t.filterGroup} value={group} onChange={(event) => setGroup(event.target.value)} options={groupOptions} />
        <Select label={t.filterSubgroup} value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroupOptions} />
        <Select label={t.filterHealth} value={healthFilter} onChange={(event) => setHealthFilter(event.target.value)} options={healthOptions} />
      </FilterPanel>

      <MobileFilterSheet
        open={filterOpen}
        title={language === 'th' ? 'ตัวกรองผู้เข้าร่วม' : 'Participant filters'}
        description={language === 'th' ? 'เลือกสาขา กลุ่ม และข้อมูลสุขภาพที่ต้องการดู' : 'Filter by major, group, subgroup, and health flags.'}
        primaryLabel={language === 'th' ? 'ใช้ตัวกรอง' : 'Apply'}
        clearLabel={language === 'th' ? 'ล้าง' : 'Clear'}
        onClose={() => setFilterOpen(false)}
        onClear={clearFilters}
      >
        <Select label={t.filterMajor} value={major} onChange={(event) => setMajor(event.target.value)} options={majorOptions} />
        <Select label={t.filterGroup} value={group} onChange={(event) => setGroup(event.target.value)} options={groupOptions} />
        <Select label={t.filterSubgroup} value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroupOptions} />
        <Select label={t.filterHealth} value={healthFilter} onChange={(event) => setHealthFilter(event.target.value)} options={healthOptions} />
      </MobileFilterSheet>

      {profilesState.loading ? <LoadingSkeleton /> : null}
      {profilesState.error ? <div className="error-state">{profilesState.error}</div> : null}

      <ResponsiveDataTable
        rows={profiles}
        getKey={(row) => row.id}
        emptyText={t.participantNotFound}
        mobileDetailsLabel={language === 'th' ? 'ข้อมูลเพิ่มเติม' : 'More details'}
        mobileTitle={(row) => row.nickname || row.name_th}
        mobileSubtitle={(row) => `${row.name_th} · ${majorLabel(row.major, language)}`}
        mobileMeta={(row) => groupLabel(row.group_assignment?.main_group, row.group_assignment?.subgroup, language)}
        mobileActions={(row) => (
          <div className="row-actions">
            <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEditing(row)}>
              {t.editAction}
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setDeleting(row)}>
              {t.deleteAction}
            </Button>
          </div>
        )}
        density="compact"
        ariaLabel={language === 'th' ? 'ตารางรายชื่อผู้เข้าร่วมสำหรับแอดมิน' : 'Admin participant table'}
        columns={[
          {
            key: 'name',
            header: t.name,
            render: (row) => (
              <div className="participant-admin-cell">
                <strong>{row.name_th}</strong>
                <span>{row.nickname}</span>
                <HealthFlags profile={row} detail />
              </div>
            ),
          },
          { key: 'major', header: t.major, render: (row) => majorLabel(row.major, language) },
          { key: 'group', header: t.groups, render: (row) => groupLabel(row.group_assignment?.main_group, row.group_assignment?.subgroup, language) },
          { key: 'email', header: t.email, render: (row) => row.email },
          { key: 'phone', header: t.phone, render: (row) => row.phone },
          { key: 'social', header: t.contact, render: (row) => <ContactLinks lineId={row.line_id} instagram={row.instagram} facebook={row.facebook} other={row.other_contact} /> },
          {
            key: 'actions',
            header: t.actions,
            render: (row) => (
              <div className="row-actions">
                <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEditing(row)}>
                  {t.editAction}
                </Button>
                <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setDeleting(row)}>
                  {t.deleteAction}
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={Boolean(editing)} title={language === 'th' ? 'แก้ไขข้อมูลผู้เข้าร่วม' : 'Edit participant'} onClose={() => setEditing(null)}>
        {editing ? (
          <div className="form-grid two-col modal-body">
            <h3 className="full-span form-section-title">{language === 'th' ? 'ข้อมูลระบุตัวตน' : 'Identity'}</h3>
            {Object.keys(fieldLabels).map((field) =>
              field === 'phone' ? (
                <Fragment key={field}>
                  <h3 className="full-span form-section-title">{language === 'th' ? 'ช่องทางติดต่อ' : 'Contact'}</h3>
                  <Input
                    label={fieldLabel(field, language)}
                    value={String(editing[field as keyof Profile] ?? '')}
                    onChange={(event) => setEditing({ ...editing, [field]: event.target.value })}
                  />
                </Fragment>
              ) : field === 'food_allergy' ? (
                <Fragment key={field}>
                  <h3 className="full-span form-section-title">{language === 'th' ? 'ข้อมูลสุขภาพ' : 'Health'}</h3>
                  <Input
                    label={fieldLabel(field, language)}
                    value={String(editing[field as keyof Profile] ?? '')}
                    onChange={(event) => setEditing({ ...editing, [field]: event.target.value })}
                  />
                </Fragment>
              ) : field === 'public_profile' ? (
                <Fragment key={field}>
                  <h3 className="full-span form-section-title">{language === 'th' ? 'การแสดงผลสาธารณะ' : 'Public profile / consent'}</h3>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={Boolean(editing[field as keyof Profile])}
                      onChange={(event) => setEditing({ ...editing, [field]: event.target.checked })}
                    />
                    <span>{fieldLabel(field, language)}</span>
                  </label>
                </Fragment>
              ) : field === 'major' ? (
                <Select
                  key={field}
                  label={fieldLabel(field, language)}
                  value={editing.major ? normalizeMajor(editing.major) : ''}
                  options={majorCatalog.map((major) => ({ value: normalizeMajor(`(${major.code})`), label: majorLabel(`(${major.code})`, language) }))}
                  onChange={(event) => setEditing({ ...editing, major: event.target.value })}
                />
              ) : field === 'admission_round' ? (
                <Select
                  key={field}
                  label={fieldLabel(field, language)}
                  value={editing.admission_round ?? ''}
                  options={['Portfolio', 'Quota', 'Admission']}
                  onChange={(event) => setEditing({ ...editing, admission_round: (event.target.value || null) as Profile['admission_round'] })}
                />
              ) : field === 'gender' ? (
                <Select
                  key={field}
                  label={fieldLabel(field, language)}
                  value={editing.gender ?? ''}
                  options={[
                    { value: 'male', label: language === 'th' ? 'ชาย' : 'Male' },
                    { value: 'female', label: language === 'th' ? 'หญิง' : 'Female' },
                    { value: 'other', label: language === 'th' ? 'อื่น ๆ' : 'Other' },
                  ]}
                  onChange={(event) => setEditing({ ...editing, gender: event.target.value || null })}
                />
              ) : field === 'public_profile' || field === 'show_instagram' || field === 'show_line_id' ? (
                <label className="check-field" key={field}>
                  <input
                    type="checkbox"
                    checked={Boolean(editing[field as keyof Profile])}
                    onChange={(event) => setEditing({ ...editing, [field]: event.target.checked })}
                  />
                  <span>{fieldLabel(field, language)}</span>
                </label>
              ) : (
                <Input
                  key={field}
                  label={fieldLabel(field, language)}
                  value={String(editing[field as keyof Profile] ?? '')}
                  onChange={(event) => setEditing({ ...editing, [field]: event.target.value })}
                />
              ),
            )}
            <div className="form-actions full-span sticky-form-actions">
              <Button onClick={saveProfile}>{language === 'th' ? 'บันทึก' : 'Save'}</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(deleting)} title={language === 'th' ? 'ยืนยันการลบข้อมูล' : 'Confirm deletion'} onClose={() => setDeleting(null)}>
        <div className="modal-body">
          <p>{language === 'th' ? `ต้องการลบข้อมูลของ ${deleting?.name_th} หรือไม่ การกระทำนี้ควรทำเมื่อแน่ใจแล้วเท่านั้น` : `Delete ${deleting?.name_th}? Only do this when you are sure.`}</p>
          <div className="form-actions">
            <Button variant="danger" onClick={confirmDelete}>
              {language === 'th' ? 'ลบข้อมูล' : 'Delete'}
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
