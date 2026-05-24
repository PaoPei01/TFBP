import { AlertTriangle, Database, GitMerge, Link2, RefreshCw, Search, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import type { AdminPeopleFilters, AdminPeopleSearchResult, PeopleDataHealth, PeopleDataHealthIssue, PeopleSummary } from '../lib/personTypes';
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

export function AdminPeoplePage() {
  const { language } = useLanguage();
  const [filters, setFilters] = useState<AdminPeopleFilters>({ limit: pageLimit, offset: 0 });
  const [result, setResult] = useState<AdminPeopleSearchResult | null>(null);
  const [summary, setSummary] = useState<PeopleSummary | null>(null);
  const [health, setHealth] = useState<PeopleDataHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  const rows = result?.rows ?? [];
  const sourceOptions = useMemo(() => result?.filter_options?.sources ?? [], [result]);
  const yearOptions = useMemo(() => (result?.filter_options?.year_levels ?? []).map((year) => ({ value: String(year), label: String(year) })), [result]);
  const majorOptions = useMemo(() => result?.filter_options?.majors ?? [], [result]);
  const incompleteContact = (summary?.missing_student_id ?? 0) + (summary?.missing_email ?? 0) + (summary?.missing_phone ?? 0);

  async function loadData(nextFilters = filters) {
    setLoading(true);
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
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'โหลดฐานข้อมูลกลางไม่สำเร็จ' : 'Could not load people directory') });
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

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow={language === 'th' ? 'ฐานข้อมูลบุคคล' : 'People database'}
        title={language === 'th' ? 'ฐานข้อมูลบุคคล' : 'People database'}
        description={language === 'th' ? 'ข้อมูลบุคคลกลางที่ใช้เชื่อมหลายกิจกรรม เช่น นักศึกษาปี 2 ทีมงาน ผู้เข้าร่วม และผู้สมัครสตาฟ' : 'Central people records used across events, year 2 imports, staff, participants, and staff applications.'}
        meta={<div className="form-actions"><Link className="btn btn-secondary" to="/admin/people/dedupe"><GitMerge size={18} />{language === 'th' ? 'ตรวจข้อมูลซ้ำ' : 'Dedupe'}</Link><Button variant="secondary" icon={<RefreshCw size={18} />} loading={loading} onClick={() => void loadData()}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button></div>}
        actions={<HelpButton topicId="admin.people-directory" variant="link" />}
      />

      <Card className="workflow-explainer-card" variant="soft">
        <strong>{language === 'th' ? 'ฐานข้อมูลบุคคล' : 'People database'}</strong>
        <span>{language === 'th' ? 'จัดการข้อมูลกลางของนักศึกษาและผู้เข้าร่วม' : 'Manage central student and participant records.'}</span>
      </Card>

      <div className="stats-grid">
        <DashboardStatCard label={language === 'th' ? 'people ทั้งหมด' : 'Total people'} value={fmt(summary?.total_people)} icon={<UsersRound size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'ปี 2 จาก Excel' : 'Year 2 Excel'} value={fmt(summary?.year2_people)} icon={<Database size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'legacy participant' : 'Legacy participant'} value={fmt(summary?.legacy_profiles_people)} icon={<UserCheck size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'เชื่อมกับ staff_profiles' : 'Linked staff'} value={fmt(summary?.linked_staff_profiles)} icon={<Link2 size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'เชื่อมกับ profiles' : 'Linked profiles'} value={fmt(summary?.linked_participant_profiles)} icon={<Link2 size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'มีใบสมัครสตาฟ' : 'Staff applicants'} value={fmt(summary?.staff_applicant_people)} icon={<ShieldCheck size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'ข้อมูลติดต่อไม่ครบ' : 'Incomplete contact'} value={fmt(incompleteContact)} icon={<AlertTriangle size={20} />} />
      </div>

      <Card variant="soft">
        <div className="section-heading">
          <Search size={22} />
          <div>
            <h2>{language === 'th' ? 'ค้นหาและกรองข้อมูล' : 'Search and filters'}</h2>
            <p>{language === 'th' ? 'ใช้สำหรับตรวจฐาน people เท่านั้น ข้อมูลนี้ไม่ถูกเปิดเผยในหน้าสาธารณะ' : 'For admin-only people inspection. These records are not exposed publicly.'}</p>
          </div>
        </div>
        <div className="form-grid two-col">
          <Input
            label={language === 'th' ? 'ค้นหา' : 'Search'}
            placeholder={language === 'th' ? 'ชื่อ รหัสนักศึกษา อีเมล หรือเบอร์โทร' : 'Name, student ID, email, or phone'}
            value={filters.search ?? ''}
            onChange={(event) => updateFilter('search', event.target.value)}
          />
          <Select label={language === 'th' ? 'source' : 'Source'} placeholder={language === 'th' ? 'ทั้งหมด' : 'All'} value={filters.source ?? ''} onChange={(event) => updateFilter('source', event.target.value)} options={sourceOptions} />
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
            label={language === 'th' ? 'เชื่อม staff_profiles' : 'Has staff profile'}
            value={filters.has_staff_profile === '' || filters.has_staff_profile === undefined ? '' : String(filters.has_staff_profile)}
            onChange={(event) => updateFilter('has_staff_profile', booleanParam(event.target.value))}
            options={[
              { value: 'true', label: language === 'th' ? 'มี' : 'Yes' },
              { value: 'false', label: language === 'th' ? 'ไม่มี' : 'No' },
            ]}
          />
          <Select
            label={language === 'th' ? 'เชื่อม profiles' : 'Has participant profile'}
            value={filters.has_participant_profile === '' || filters.has_participant_profile === undefined ? '' : String(filters.has_participant_profile)}
            onChange={(event) => updateFilter('has_participant_profile', booleanParam(event.target.value))}
            options={[
              { value: 'true', label: language === 'th' ? 'มี' : 'Yes' },
              { value: 'false', label: language === 'th' ? 'ไม่มี' : 'No' },
            ]}
          />
          <Select
            label={language === 'th' ? 'มีใบสมัครสตาฟ' : 'Has staff application'}
            value={filters.has_staff_application === '' || filters.has_staff_application === undefined ? '' : String(filters.has_staff_application)}
            onChange={(event) => updateFilter('has_staff_application', booleanParam(event.target.value))}
            options={[
              { value: 'true', label: language === 'th' ? 'มี' : 'Yes' },
              { value: 'false', label: language === 'th' ? 'ไม่มี' : 'No' },
            ]}
          />
        </div>
        <div className="form-actions">
          <Button icon={<Search size={18} />} loading={loading} onClick={applyFilters}>{language === 'th' ? 'ค้นหา' : 'Search'}</Button>
          <Button variant="secondary" onClick={clearFilters}>{language === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}</Button>
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <AlertTriangle size={22} />
          <div>
            <h2>{language === 'th' ? 'Data Health' : 'Data Health'}</h2>
            <p>{language === 'th' ? 'รายงาน read-only สำหรับตรวจความพร้อมก่อนใช้ people กับ multi-event' : 'Read-only readiness checks before using people heavily for multi-event workflows.'}</p>
          </div>
          <Link className="btn btn-secondary" to="/admin/people/dedupe"><GitMerge size={18} />{language === 'th' ? 'เปิดเครื่องมือตรวจซ้ำ' : 'Open dedupe tool'}</Link>
        </div>
        <div className="health-issue-grid">
          {(health?.issues ?? []).map((issue) => (
            <Card key={issue.key} variant={issueTone(issue)} className="health-issue-card">
              <div className="mobile-row-head">
                <div>
                  <strong>{language === 'th' ? issue.message_th : issue.message_en}</strong>
                  <span>{language === 'th' ? issue.next_action_th : issue.next_action_en}</span>
                </div>
                <Badge status={issue.severity === 'critical' ? 'rejected' : issue.severity === 'warning' ? 'pending' : 'approved'}>{fmt(issue.count)}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <UsersRound size={22} />
          <div>
            <h2>{language === 'th' ? 'รายการบุคคล' : 'People records'}</h2>
            <p>{language === 'th' ? `แสดง ${rows.length.toLocaleString()} จาก ${fmt(result?.total_count)} รายการ` : `Showing ${rows.length.toLocaleString()} of ${fmt(result?.total_count)} records`}</p>
          </div>
        </div>
        <ResponsiveDataTable
          rows={rows}
          getKey={(row) => row.id}
          emptyText={loading ? (language === 'th' ? 'กำลังโหลด...' : 'Loading...') : (language === 'th' ? 'ไม่พบข้อมูล people' : 'No people found')}
          density="compact"
          mobileDetailsLabel={language === 'th' ? 'ดูรายละเอียด' : 'Details'}
          mobileTitle={(row) => displayName(row)}
          mobileSubtitle={(row) => `${row.student_id ?? '-'} · ${row.major ?? '-'}${row.year_level ? ` · ปี ${row.year_level}` : ''}`}
          mobileMeta={(row) => <Badge status="pending">{row.source ?? '-'}</Badge>}
          columns={[
            { key: 'name', header: language === 'th' ? 'ชื่อ' : 'Name', render: (row) => <strong>{displayName(row)}</strong>, priority: 'primary' },
            { key: 'student_id', header: 'Student ID', render: (row) => row.student_id ?? '-', priority: 'primary' },
            { key: 'nickname', header: language === 'th' ? 'ชื่อเล่น' : 'Nickname', render: (row) => row.nickname_th || row.nickname || row.nickname_en || '-' },
            { key: 'major', header: language === 'th' ? 'สาขา/ปี' : 'Major/year', render: (row) => `${row.major ?? '-'}${row.year_level ? ` / ${row.year_level}` : ''}` },
            { key: 'source', header: 'Source', render: (row) => <Badge status="pending">{row.source ?? '-'}</Badge> },
            { key: 'email', header: 'Email', render: (row) => maskEmail(row.email), mobileLabel: language === 'th' ? 'อีเมล' : 'Email' },
            { key: 'phone', header: language === 'th' ? 'เบอร์' : 'Phone', render: (row) => maskPhone(row.phone), mobileLabel: language === 'th' ? 'เบอร์โทร' : 'Phone' },
            { key: 'staff', header: language === 'th' ? 'staff_profiles' : 'Staff profiles', render: (row) => row.staff_profile_count ? <Badge status="approved">{String(row.staff_profile_count)}</Badge> : <Badge status="pending">0</Badge>, align: 'center' },
            { key: 'profiles', header: language === 'th' ? 'profiles' : 'Profiles', render: (row) => row.participant_profile_count ? <Badge status="approved">{String(row.participant_profile_count)}</Badge> : <Badge status="pending">0</Badge>, align: 'center' },
            { key: 'applications', header: language === 'th' ? 'ใบสมัคร' : 'Applications', render: (row) => row.staff_application_count ? <Badge status="approved">{String(row.staff_application_count)}</Badge> : <Badge status="pending">0</Badge>, align: 'center' },
          ]}
        />
        <div className="form-actions">
          <Button variant="secondary" disabled={(result?.offset ?? 0) === 0 || loading} onClick={() => goPage('prev')}>{language === 'th' ? 'ก่อนหน้า' : 'Previous'}</Button>
          <Button variant="secondary" disabled={loading || (result ? result.offset + result.limit >= result.total_count : true)} onClick={() => goPage('next')}>{language === 'th' ? 'ถัดไป' : 'Next'}</Button>
        </div>
      </Card>
    </section>
  );
}
