import { Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MobileFilterSheet } from '../components/mobile/MobileFilterSheet';
import { MobileSearchHeader } from '../components/mobile/MobileSearchHeader';
import { PublicStaffCard } from '../components/PublicStaffCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { groupMeta, mainGroups, subgroups } from '../lib/groups';
import { fetchStaffDirectory, staffDisplayName } from '../services/staffProfiles';

export function StaffDirectoryPage() {
  const { language } = useLanguage();
  const state = useAsync(fetchStaffDirectory, []);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [mainGroup, setMainGroup] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const rows = useMemo(() => (state.data ?? []).filter((row) => {
    const haystack = [row.nickname_th, row.nickname, row.nickname_en, row.name_th, row.name_en, row.primary_role, row.position, row.main_group, row.subgroup].filter(Boolean).join(' ').toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (role && row.primary_role !== role && row.position !== role) return false;
    if (mainGroup && row.main_group !== mainGroup) return false;
    if (subgroup && row.subgroup !== subgroup) return false;
    return true;
  }), [mainGroup, role, search, state.data, subgroup]);
  const roles = useMemo(() => [...new Set((state.data ?? []).map((row) => row.primary_role || row.position).filter(Boolean))] as string[], [state.data]);

  function clearFilters() {
    setRole('');
    setMainGroup('');
    setSubgroup('');
  }

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Staff Directory" title={language === 'th' ? 'ไดเรกทอรีทีมงาน' : 'Staff Directory'} description={language === 'th' ? 'ค้นหาทีมงานและช่องทางติดต่อที่เจ้าตัวยินยอมให้ทีมงานเห็น' : 'Search staff contacts based on their internal visibility settings.'} />
      <MobileSearchHeader
        label={language === 'th' ? 'ค้นหาทีมงาน' : 'Search staff'}
        value={search}
        onChange={setSearch}
        placeholder={language === 'th' ? 'ชื่อ ชื่อเล่น หน้าที่ กลุ่ม' : 'Name, nickname, role, group'}
        resultText={`${rows.length} ${language === 'th' ? 'คน' : 'people'}`}
        trailing={<Button variant="secondary" icon={<SlidersHorizontal size={17} />} onClick={() => setFilterOpen(true)}>{language === 'th' ? 'ตัวกรอง' : 'Filters'}</Button>}
      />
      <Card className="toolbar desktop-filter-panel">
        <div className="search-shell">
          <Search size={18} />
          <Input label={language === 'th' ? 'ค้นหา' : 'Search'} value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select label={language === 'th' ? 'หน้าที่' : 'Role'} value={role} onChange={(event) => setRole(event.target.value)} options={roles} />
        <Select label={language === 'th' ? 'สี' : 'Color'} value={mainGroup} onChange={(event) => setMainGroup(event.target.value)} options={mainGroups.map((group) => ({ value: group, label: language === 'th' ? groupMeta[group].th : groupMeta[group].en }))} />
        <Select label={language === 'th' ? 'กลุ่มย่อย' : 'Subgroup'} value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroups} />
      </Card>
      <MobileFilterSheet
        open={filterOpen}
        title={language === 'th' ? 'ตัวกรองทีมงาน' : 'Staff filters'}
        description={language === 'th' ? 'กรองตามหน้าที่ สี และกลุ่มย่อย' : 'Filter by role, color, and subgroup.'}
        primaryLabel={language === 'th' ? 'ใช้ตัวกรอง' : 'Apply'}
        clearLabel={language === 'th' ? 'ล้าง' : 'Clear'}
        onClose={() => setFilterOpen(false)}
        onClear={clearFilters}
      >
        <Select label={language === 'th' ? 'หน้าที่' : 'Role'} value={role} onChange={(event) => setRole(event.target.value)} options={roles} />
        <Select label={language === 'th' ? 'สี' : 'Color'} value={mainGroup} onChange={(event) => setMainGroup(event.target.value)} options={mainGroups.map((group) => ({ value: group, label: language === 'th' ? groupMeta[group].th : groupMeta[group].en }))} />
        <Select label={language === 'th' ? 'กลุ่มย่อย' : 'Subgroup'} value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroups} />
      </MobileFilterSheet>
      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}
      <div className="staff-card-grid">
        {rows.map((row) => <PublicStaffCard key={row.staff_profile_id} staff={row} internal />)}
      </div>
      <ResponsiveDataTable
        rows={rows}
        getKey={(row) => row.staff_profile_id}
        emptyText={language === 'th' ? 'ไม่พบทีมงาน' : 'No staff found'}
        mobileTitle={(row) => staffDisplayName(row)}
        mobileSubtitle={(row) => `${row.primary_role || row.position || '-'} · ${groupLabel(row.main_group, row.subgroup, language)}`}
        columns={[
          { key: 'name', header: language === 'th' ? 'ชื่อ' : 'Name', render: (row) => staffDisplayName(row) },
          { key: 'role', header: language === 'th' ? 'หน้าที่' : 'Role', render: (row) => row.primary_role || row.position || '-' },
          { key: 'group', header: language === 'th' ? 'กลุ่ม' : 'Group', render: (row) => groupLabel(row.main_group, row.subgroup, language) },
          { key: 'phone', header: language === 'th' ? 'เบอร์' : 'Phone', render: (row) => row.phone || '-' },
          { key: 'contact', header: language === 'th' ? 'ช่องทาง' : 'Contact', render: (row) => [row.instagram && 'IG', row.line_id && 'LINE', row.facebook && 'FB'].filter(Boolean).join(' · ') || '-' },
        ]}
      />
    </section>
  );
}
