import { AlertTriangle, Database, Eye, Filter, GitMerge, Link2, RefreshCw, Search, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import type { AdminPeopleFilters, AdminPeopleSearchResult, AdminPersonRecord, PeopleDataHealth, PeopleDataHealthIssue, PeopleSummary } from '../lib/personTypes';
import { fetchAdminPeople, fetchPeopleDataHealth, fetchPeopleSummary } from '../services/people';
import { errorMessage } from '../utils/error';

const pageLimit = 100;

function fmt(value: number | undefined) {
  return (value ?? 0).toLocaleString();
}

function displayName(row: { name_th: string | null; name_en: string | null; nickname: string | null; student_id: string | null }) {
  return row.name_th || row.name_en || row.nickname || row.student_id || 'ไม่ระบุชื่อ';
}

function maskEmail(value: string | null) {
  if (!value) return '-';
  const [name, domain] = value.split('@');
  if (!domain) return value;
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(value: string | null) {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 6) return value;
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

function booleanParam(value: string): boolean | '' {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return '';
}

function issueTone(issue: PeopleDataHealthIssue) {
  if (issue.severity === 'critical') return 'danger' as const;
  if (issue.severity === 'warning') return 'warning' as const;
  return 'success' as const;
}

function sourceLabel(value: string | null, language: 'th' | 'en') {
  if (!value) return '-';
  const labels: Record<string, { th: string; en: string }> = {
    people_import_year2_2569: { th: 'นำเข้าฐานปี 2', en: 'Year 2 import' },
    legacy_profiles: { th: 'ข้อมูลผู้เข้าร่วมเดิม', en: 'Legacy participant' },
    staff_profiles: { th: 'โปรไฟล์ทีมงาน', en: 'Staff profile' },
    manual: { th: 'เพิ่มด้วยผู้ดูแล', en: 'Admin entered' },
  };
  return labels[value]?.[language] ?? value;
}

function linkedStatus(row: AdminPersonRecord, language: 'th' | 'en') {
  const items = [
    row.staff_profile_count ? (language === 'th' ? 'ทีมงาน' : 'Staff') : '',
    row.participant_profile_count ? (language === 'th' ? 'ผู้เข้าร่วม' : 'Participant') : '',
    row.staff_application_count ? (language === 'th' ? 'ใบสมัครสตาฟ' : 'Staff application') : '',
  ].filter(Boolean);
  return items.length ? items.join(' · ') : (language === 'th' ? 'ยังไม่เชื่อมข้อมูล' : 'Not linked');
}

function linkedTone(row: AdminPersonRecord) {
  return row.staff_profile_count || row.participant_profile_count || row.staff_application_count ? 'approved' : 'pending';
}

export function AdminPeoplePage() {
  const { language } = useLanguage();
  const [filters, setFilters] = useState<AdminPeopleFilters>({ limit: pageLimit, offset: 0 });
  const [result, setResult] = useState<AdminPeopleSearchResult | null>(null);
  const [summary, setSummary] = useState<PeopleSummary | null>(null);
  const [health, setHealth] = useState<PeopleDataHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [detailRow, setDetailRow] = useState<AdminPersonRecord | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rows = result?.rows ?? [];
  const sourceOptions = useMemo(() => result?.filter_options?.sources ?? [], [result]);
  const yearOptions = useMemo(() => (result?.filter_options?.year_levels ?? []).map((year) => ({ value: String(year), label: String(year) })), [result]);
  const majorOptions = useMemo(() => result?.filter_options?.majors ?? [], [result]);
  const incompleteContact = (summary?.missing_student_id ?? 0) + (summary?.missing_email ?? 0) + (summary?.missing_phone ?? 0);

  async function loadData(nextFilters = filters) {
    setLoading(true);
    setLoadError(null);
    try {
      const [peopleResult, summaryResult, healthResult] = await Promise.all([
        fetchAdminPeople({ ...nextFilters, limit: pageLimit, offset: nextFilters.offset ?? 0 }),
        fetchPeopleSummary(),
        fetchPeopleDataHealth(),
      ]);
      setResult(peopleResult as AdminPeopleSearchResult);
      setSummary(summaryResult);
      setHealth(healthResult);
    } catch (err) {
      const message = errorMessage(err, language === 'th' ? 'โหลดข้อมูลกลางไม่สำเร็จ' : 'Could not load central records');
      setLoadError(message);
      setToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilter<K extends keyof AdminPeopleFilters>(key: K, value: AdminPeopleFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value, offset: 0 }));
  }

  function applyFilters() {
    void loadData({ ...filters, offset: 0 });
  }

  function clearFilters() {
    const nextFilters = { limit: pageLimit, offset: 0 };
    setFilters(nextFilters);
    void loadData(nextFilters);
  }

  function goPage(direction: 'prev' | 'next') {
    const currentOffset = result?.offset ?? 0;
    const nextOffset = direction === 'next' ? currentOffset + pageLimit : Math.max(currentOffset - pageLimit, 0);
    const nextFilters = { ...filters, offset: nextOffset, limit: pageLimit };
    setFilters(nextFilters);
    void loadData(nextFilters);
  }

  function renderFilterControls(compact = false) {
    return (
      <>
        <div className="form-grid two-col">
          <Input
            label={language === 'th' ? 'ค้นหา' : 'Search'}
            placeholder={language === 'th' ? 'ชื่อ รหัสนักศึกษา อีเมล หรือเบอร์โทร' : 'Name, student ID, email, or phone'}
            value={filters.search ?? ''}
            onChange={(event) => updateFilter('search', event.target.value)}
          />
          <Select label={language === 'th' ? 'แหล่งข้อมูล' : 'Source'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.source ?? ''} onChange={(event) => updateFilter('source', event.target.value)} options={sourceOptions.map((source) => ({ value: source, label: sourceLabel(source, language) }))} />
        </div>
        <details className="filter-disclosure" open={!compact}>
          <summary>{language === 'th' ? 'ตัวกรองเพิ่มเติม' : 'More filters'}</summary>
          <div className="form-grid two-col">
            <Select label={language === 'th' ? 'ชั้นปี' : 'Year'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.year_level ? String(filters.year_level) : ''} onChange={(event) => updateFilter('year_level', event.target.value ? Number(event.target.value) : '')} options={yearOptions} />
            <Select label={language === 'th' ? 'สาขา' : 'Major'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.major ?? ''} onChange={(event) => updateFilter('major', event.target.value)} options={majorOptions} />
            <Select
              label={language === 'th' ? 'ข้อมูลที่ขาด' : 'Missing field'}
              value={filters.missing_field ?? ''}
              onChange={(event) => updateFilter('missing_field', event.target.value as AdminPeopleFilters['missing_field'])}
              options={[
                { value: 'student_id', label: language === 'th' ? 'ไม่มีรหัสนักศึกษา' : 'Missing student ID' },
                { value: 'email', label: language === 'th' ? 'ไม่มีอีเมล' : 'Missing email' },
                { value: 'phone', label: language === 'th' ? 'ไม่มีเบอร์โทร' : 'Missing phone' },
              ]}
            />
            <Select
              label={language === 'th' ? 'โปรไฟล์ทีมงาน' : 'Staff profile'}
              value={filters.has_staff_profile === '' || filters.has_staff_profile === undefined ? '' : String(filters.has_staff_profile)}
              onChange={(event) => updateFilter('has_staff_profile', booleanParam(event.target.value))}
              options={[{ value: 'true', label: language === 'th' ? 'มี' : 'Yes' }, { value: 'false', label: language === 'th' ? 'ไม่มี' : 'No' }]}
            />
            <Select
              label={language === 'th' ? 'ข้อมูลผู้เข้าร่วม' : 'Participant profile'}
              value={filters.has_participant_profile === '' || filters.has_participant_profile === undefined ? '' : String(filters.has_participant_profile)}
              onChange={(event) => updateFilter('has_participant_profile', booleanParam(event.target.value))}
              options={[{ value: 'true', label: language === 'th' ? 'มี' : 'Yes' }, { value: 'false', label: language === 'th' ? 'ไม่มี' : 'No' }]}
            />
            <Select
              label={language === 'th' ? 'ใบสมัครสตาฟ' : 'Staff application'}
              value={filters.has_staff_application === '' || filters.has_staff_application === undefined ? '' : String(filters.has_staff_application)}
              onChange={(event) => updateFilter('has_staff_application', booleanParam(event.target.value))}
              options={[{ value: 'true', label: language === 'th' ? 'มี' : 'Yes' }, { value: 'false', label: language === 'th' ? 'ไม่มี' : 'No' }]}
            />
          </div>
        </details>
      </>
    );
  }

  function renderDataHealthPanel() {
    return (
      <Card className="people-data-health-panel">
        <details>
          <summary>{language === 'th' ? 'ข้อมูลที่ควรตรวจ' : 'Data to review'}</summary>
          <p className="muted">{language === 'th' ? 'ส่วนนี้เป็นรายงานอ่านอย่างเดียว ไม่แก้ข้อมูลจากหน้านี้' : 'This is a read-only report. This page does not mutate records.'}</p>
          <div className="health-issue-grid">
            {(health?.issues ?? []).map((issue) => (
              <Card key={issue.key} variant={issueTone(issue)} className="health-issue-card">
                <div className="mobile-row-head">
                  <div>
                    <strong>{language === 'th' ? issue.message_th.replace('people', 'ข้อมูลกลาง') : issue.message_en}</strong>
                    <span>{language === 'th' ? issue.next_action_th.replace('people', 'ข้อมูลกลาง') : issue.next_action_en}</span>
                  </div>
                  <Badge status={issue.severity === 'critical' ? 'rejected' : issue.severity === 'warning' ? 'pending' : 'approved'}>{fmt(issue.count)}</Badge>
                </div>
              </Card>
            ))}
            {!health?.issues?.length ? <p className="muted">{language === 'th' ? 'ยังไม่มีรายงานข้อมูลที่ควรตรวจ' : 'No data health issues reported.'}</p> : null}
          </div>
          <div className="form-actions">
            <Link className="btn btn-secondary" to="/admin/people/dedupe"><GitMerge size={18} />{language === 'th' ? 'เปิดตรวจข้อมูลซ้ำ' : 'Open duplicate check'}</Link>
            <Link className="btn btn-secondary" to="/admin/people/import-year2"><Database size={18} />{language === 'th' ? 'ตรวจแหล่งนำเข้า' : 'Check import source'}</Link>
          </div>
        </details>
      </Card>
    );
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow={language === 'th' ? 'ข้อมูลกลาง' : 'Central records'}
        title={language === 'th' ? 'ค้นหาข้อมูลบุคคล' : 'People directory'}
        description={language === 'th' ? 'ค้นหาและตรวจข้อมูลกลางของนักศึกษา ทีมงาน ผู้เข้าร่วม และผู้สมัครสตาฟ โดยไม่แก้ข้อมูลจากหน้านี้' : 'Search and inspect central records for students, staff, participants, and staff applicants without mutating records.'}
        meta={<div className="form-actions"><Link className="btn btn-secondary" to="/admin/people/dedupe"><GitMerge size={18} />{language === 'th' ? 'ตรวจข้อมูลซ้ำ' : 'Dedupe'}</Link><Button variant="secondary" icon={<RefreshCw size={18} />} loading={loading} onClick={() => void loadData()}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button></div>}
        actions={<HelpButton topicId="admin.people-directory" variant="link" />}
      />

      <Card className="workflow-explainer-card people-privacy-note" variant="soft">
        <strong>{language === 'th' ? 'ฐานข้อมูลบุคคล' : 'People database'}</strong>
        <span>{language === 'th' ? 'ข้อมูลติดต่อถูก masked ในรายการหลัก และแสดงรายละเอียดเฉพาะในหน้าแอดมินนี้เท่านั้น' : 'Contact details are masked in the main list and available only inside this admin view.'}</span>
      </Card>

      <div className="stats-grid people-summary-grid">
        <DashboardStatCard label={language === 'th' ? 'ข้อมูลกลางทั้งหมด' : 'Total central records'} value={fmt(summary?.total_people)} icon={<UsersRound size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'นำเข้าฐานปี 2' : 'Year 2 import'} value={fmt(summary?.year2_people)} icon={<Database size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'ข้อมูลผู้เข้าร่วมเดิม' : 'Legacy participant'} value={fmt(summary?.legacy_profiles_people)} icon={<UserCheck size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'โปรไฟล์ทีมงาน' : 'Linked staff profiles'} value={fmt(summary?.linked_staff_profiles)} icon={<Link2 size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'ข้อมูลผู้เข้าร่วม' : 'Linked participant profiles'} value={fmt(summary?.linked_participant_profiles)} icon={<Link2 size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'ใบสมัครสตาฟ' : 'Staff applicants'} value={fmt(summary?.staff_applicant_people)} icon={<ShieldCheck size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'ข้อมูลติดต่อไม่ครบ' : 'Incomplete contact'} value={fmt(incompleteContact)} icon={<AlertTriangle size={20} />} />
      </div>

      <Card variant="soft" className="people-directory-search">
        <div className="section-heading">
          <Search size={22} />
          <div>
            <h2>{language === 'th' ? 'ค้นหาและกรองข้อมูลกลาง' : 'Search and filter central records'}</h2>
            <p>{language === 'th' ? 'ค้นหาก่อน แล้วเปิดรายละเอียดเพื่อดูข้อมูลติดต่อและการเชื่อมข้อมูล' : 'Search first, then open details for contact and linkage information.'}</p>
          </div>
        </div>
        <div className="desktop-filter-panel">{renderFilterControls(true)}</div>
        <div className="form-actions">
          <Button icon={<Search size={18} />} loading={loading} onClick={applyFilters}>{language === 'th' ? 'ค้นหา' : 'Search'}</Button>
          <Button className="mobile-filter-trigger" variant="secondary" icon={<Filter size={18} />} onClick={() => setMobileFiltersOpen(true)}>{language === 'th' ? 'ตัวกรอง' : 'Filters'}</Button>
          <Button variant="secondary" onClick={clearFilters}>{language === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}</Button>
        </div>
      </Card>

      {renderDataHealthPanel()}

      {loadError ? (
        <EmptyState
          title={language === 'th' ? 'โหลดข้อมูลกลางไม่สำเร็จ' : 'Could not load central records'}
          description={loadError}
          action={<div className="form-actions"><Button variant="secondary" onClick={() => void loadData()}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button><Link className="btn btn-secondary" to="/guide">{language === 'th' ? 'ดูคู่มือนำเข้า' : 'Open import guide'}</Link></div>}
        />
      ) : null}

      <Card>
        <div className="section-heading">
          <UsersRound size={22} />
          <div>
            <h2>{language === 'th' ? 'รายการข้อมูลกลาง' : 'Central records'}</h2>
            <p>{language === 'th' ? `แสดง ${rows.length.toLocaleString()} จาก ${fmt(result?.total_count)} รายการ` : `Showing ${rows.length.toLocaleString()} of ${fmt(result?.total_count)} records`}</p>
          </div>
        </div>
        {!loading && !rows.length ? (
          <EmptyState
            title={language === 'th' ? 'ไม่พบข้อมูลที่ตรงกับตัวกรอง' : 'No records match the filters'}
            description={language === 'th' ? 'ลองล้างตัวกรอง หรือตรวจแหล่งนำเข้าและข้อมูลซ้ำ' : 'Clear filters or check import sources and duplicate data.'}
            action={<div className="form-actions"><Button variant="secondary" onClick={clearFilters}>{language === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}</Button><Link className="btn btn-secondary" to="/admin/people/import-year2">{language === 'th' ? 'ตรวจแหล่งนำเข้า' : 'Check import source'}</Link><Link className="btn btn-secondary" to="/admin/people/dedupe">{language === 'th' ? 'เปิดตรวจข้อมูลซ้ำ' : 'Open duplicate check'}</Link></div>}
          />
        ) : null}
        <ResponsiveDataTable
          rows={rows}
          getKey={(row) => row.id}
          emptyText={loading ? (language === 'th' ? 'กำลังโหลด...' : 'Loading...') : (language === 'th' ? 'ไม่พบข้อมูลที่ตรงกับตัวกรอง' : 'No records match the filters')}
          density="compact"
          mobileDetailsLabel={language === 'th' ? 'ดูรายละเอียด' : 'Details'}
          mobileTitle={(row) => displayName(row)}
          mobileSubtitle={(row) => `${row.student_id ?? '-'} · ${row.major ?? '-'}${row.year_level ? ` · ปี ${row.year_level}` : ''}`}
          mobileMeta={(row) => <Badge status="pending">{sourceLabel(row.source, language)}</Badge>}
          mobileActions={(row) => <Button size="sm" variant="secondary" icon={<Eye size={16} />} onClick={() => setDetailRow(row)}>{language === 'th' ? 'ดูรายละเอียด' : 'Details'}</Button>}
          columns={[
            { key: 'name', header: language === 'th' ? 'ชื่อ' : 'Name', render: (row) => <strong>{displayName(row)}</strong>, priority: 'primary' },
            { key: 'student_id', header: language === 'th' ? 'รหัสนักศึกษา' : 'Student ID', render: (row) => row.student_id ?? '-', priority: 'primary' },
            { key: 'major', header: language === 'th' ? 'สาขา/ปี' : 'Major/year', render: (row) => `${row.major ?? '-'}${row.year_level ? ` / ${row.year_level}` : ''}` },
            { key: 'source', header: language === 'th' ? 'แหล่งข้อมูล' : 'Source', render: (row) => <Badge status="pending">{sourceLabel(row.source, language)}</Badge> },
            { key: 'links', header: language === 'th' ? 'สถานะเชื่อมข้อมูล' : 'Linked status', render: (row) => <Badge status={linkedTone(row)}>{linkedStatus(row, language)}</Badge> },
            { key: 'actions', header: language === 'th' ? 'จัดการ' : 'Actions', render: (row) => <Button size="sm" variant="secondary" icon={<Eye size={16} />} aria-label={language === 'th' ? `ดูรายละเอียด ${displayName(row)}` : `View details for ${displayName(row)}`} onClick={() => setDetailRow(row)}>{language === 'th' ? 'ดูรายละเอียด' : 'Details'}</Button>, align: 'right', mobileHidden: true },
          ]}
        />
        <div className="form-actions">
          <Button variant="secondary" disabled={(result?.offset ?? 0) === 0 || loading} onClick={() => goPage('prev')}>{language === 'th' ? 'ก่อนหน้า' : 'Previous'}</Button>
          <Button variant="secondary" disabled={loading || (result ? result.offset + result.limit >= result.total_count : true)} onClick={() => goPage('next')}>{language === 'th' ? 'ถัดไป' : 'Next'}</Button>
        </div>
      </Card>
      <Modal open={mobileFiltersOpen} title={language === 'th' ? 'ตัวกรองข้อมูลกลาง' : 'Central record filters'} onClose={() => setMobileFiltersOpen(false)}>
        <div className="modal-body page-stack admin-mobile-filter-sheet">
          {renderFilterControls(false)}
          <div className="admin-mobile-filter-actions">
            <Button variant="secondary" onClick={clearFilters}>{language === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}</Button>
            <Button onClick={() => { setMobileFiltersOpen(false); applyFilters(); }}>{language === 'th' ? 'ใช้ตัวกรอง' : 'Apply filters'}</Button>
          </div>
        </div>
      </Modal>
      <Modal open={Boolean(detailRow)} title={language === 'th' ? 'รายละเอียดข้อมูลกลาง' : 'Central record details'} onClose={() => setDetailRow(null)}>
        {detailRow ? (
          <div className="modal-body page-stack">
            <Card variant="soft">
              <div className="mobile-row-head">
                <div>
                  <strong>{displayName(detailRow)}</strong>
                  <span>{detailRow.student_id ?? '-'} · {detailRow.major ?? '-'}{detailRow.year_level ? ` / ${language === 'th' ? 'ปี ' : 'Year '}${detailRow.year_level}` : ''}</span>
                </div>
                <Badge status={linkedTone(detailRow)}>{linkedStatus(detailRow, language)}</Badge>
              </div>
            </Card>
            <Card>
              <h2>{language === 'th' ? 'ข้อมูลพื้นฐาน' : 'Basic information'}</h2>
              <div className="application-detail-grid">
                <span>{language === 'th' ? 'ชื่อไทย' : 'Thai name'}</span><strong>{detailRow.name_th || '-'}</strong>
                <span>{language === 'th' ? 'ชื่ออังกฤษ' : 'English name'}</span><strong>{detailRow.name_en || '-'}</strong>
                <span>{language === 'th' ? 'ชื่อเล่น' : 'Nickname'}</span><strong>{detailRow.nickname_th || detailRow.nickname || detailRow.nickname_en || '-'}</strong>
                <span>{language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'}</span><strong>{detailRow.student_id || '-'}</strong>
                <span>{language === 'th' ? 'คณะ / ภาควิชา' : 'Faculty / department'}</span><strong>{[detailRow.faculty, detailRow.department].filter(Boolean).join(' / ') || '-'}</strong>
                <span>{language === 'th' ? 'สาขา / ชั้นปี' : 'Major / year'}</span><strong>{`${detailRow.major ?? '-'}${detailRow.year_level ? ` / ${detailRow.year_level}` : ''}`}</strong>
              </div>
            </Card>
            <Card>
              <h2>{language === 'th' ? 'ข้อมูลติดต่อ' : 'Contact information'}</h2>
              <p className="muted">{language === 'th' ? 'รายการหลักแสดงแบบ masked เพื่อลดการเห็นข้อมูลส่วนตัวโดยไม่จำเป็น' : 'The main list masks contact data to reduce unnecessary exposure.'}</p>
              <div className="application-detail-grid">
                <span>CMU Mail</span><strong>{maskEmail(detailRow.email)}</strong>
                <span>{language === 'th' ? 'เบอร์โทร' : 'Phone'}</span><strong>{maskPhone(detailRow.phone)}</strong>
                <span>LINE ID</span><strong>{detailRow.line_id || '-'}</strong>
                <span>Instagram</span><strong>{detailRow.instagram || '-'}</strong>
                <span>Facebook</span><strong>{detailRow.facebook || '-'}</strong>
              </div>
            </Card>
            <Card>
              <h2>{language === 'th' ? 'การเชื่อมข้อมูล' : 'Linked records'}</h2>
              <div className="application-detail-grid">
                <span>{language === 'th' ? 'โปรไฟล์ทีมงาน' : 'Staff profiles'}</span><strong>{detailRow.staff_profile_count}</strong>
                <span>{language === 'th' ? 'ข้อมูลผู้เข้าร่วม' : 'Participant profiles'}</span><strong>{detailRow.participant_profile_count}</strong>
                <span>{language === 'th' ? 'ใบสมัครสตาฟ' : 'Staff applications'}</span><strong>{detailRow.staff_application_count}</strong>
              </div>
              <div className="form-actions">
                <Link className="btn btn-secondary" to="/admin/staff">{language === 'th' ? 'ไปโปรไฟล์ทีมงาน' : 'Open staff profiles'}</Link>
                <Link className="btn btn-secondary" to="/admin/requests">{language === 'th' ? 'ไปคำขอผู้เข้าร่วม' : 'Open participant requests'}</Link>
              </div>
            </Card>
            <Card>
              <h2>{language === 'th' ? 'แหล่งข้อมูล' : 'Source'}</h2>
              <div className="application-detail-grid">
                <span>{language === 'th' ? 'แหล่งข้อมูล' : 'Source'}</span><strong>{sourceLabel(detailRow.source, language)}</strong>
                <span>{language === 'th' ? 'วันที่สร้าง' : 'Created at'}</span><strong>{detailRow.created_at || '-'}</strong>
                <span>{language === 'th' ? 'วันที่อัปเดต' : 'Updated at'}</span><strong>{detailRow.updated_at || '-'}</strong>
              </div>
            </Card>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
