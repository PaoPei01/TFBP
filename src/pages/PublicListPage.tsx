import { Bell, CalendarDays, Eye, Search, SearchCheck, SlidersHorizontal, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MobileSearchHeader } from '../components/mobile/MobileSearchHeader';
import { MobileFilterSheet } from '../components/mobile/MobileFilterSheet';
import { MobileSafeAreaSpacer } from '../components/mobile/MobileSafeAreaSpacer';
import { HelpButton } from '../components/help/HelpButton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { FilterDrawer } from '../components/ui/FilterDrawer';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { copy } from '../lib/copy';
import { groupLabel } from '../lib/grouping';
import { groupMeta, mainGroups, subgroups } from '../lib/groups';
import { majorLabel } from '../lib/major';
import type { MainGroup, PublicProfile } from '../lib/types';
import { fetchPublicMajors, fetchPublicProfiles } from '../services/profiles';

export function PublicListPage() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [major, setMajor] = useState('');
  const [mainGroup, setMainGroup] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [selected, setSelected] = useState<PublicProfile | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { data: majors } = useAsync(fetchPublicMajors, []);
  const { data, loading, error } = useAsync(() => fetchPublicProfiles({ search, major, mainGroup, subgroup }), [search, major, mainGroup, subgroup]);
  const participants = data ?? [];
  const resultText = useMemo(() => `${participants.length.toLocaleString(language === 'th' ? 'th-TH' : 'en-US')} ${language === 'th' ? 'คน' : 'people'}`, [language, participants.length]);
  const hasFilters = Boolean(search || major || mainGroup || subgroup);
  const activeFilters = [
    major ? majorLabel(`(${major})`, language) : '',
    mainGroup ? (language === 'th' ? groupMeta[mainGroup as MainGroup].th : groupMeta[mainGroup as MainGroup].en) : '',
    subgroup ? `Group ${subgroup}` : '',
  ].filter(Boolean);

  function clearFilters() {
    setSearch('');
    setMajor('');
    setMainGroup('');
    setSubgroup('');
  }

  function scrollToSearch() {
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => searchInputRef.current?.focus(), 180);
  }

  useEffect(() => {
    function focusSearch() {
      searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => searchInputRef.current?.focus(), 180);
    }
    window.addEventListener('tfbp:focus-public-search', focusSearch);
    return () => window.removeEventListener('tfbp:focus-public-search', focusSearch);
  }, []);

  return (
    <section className="page-stack public-list-page">
      <Card className="participant-portal-hero">
        <div className="participant-portal-copy">
          <p className="eyebrow">{language === 'th' ? 'Participant Portal' : 'Participant Portal'}</p>
          <h1>{language === 'th' ? 'สานสัมพันธ์ 69' : 'Entaneer Bonding 69'}</h1>
          <p>{language === 'th' ? 'ค้นหารายชื่อ ตรวจสอบข้อมูล สมัครกิจกรรม และอ่านประกาศได้จากที่นี่' : 'Search participants, check your information, register for activities, and read announcements from one place.'}</p>
        </div>
        <div className="participant-portal-actions">
          <button type="button" className="event-action-card" onClick={scrollToSearch}>
            <UsersRound size={22} />
            <strong>{language === 'th' ? 'ค้นหารายชื่อและกลุ่ม' : 'Search participants and groups'}</strong>
            <span>{language === 'th' ? 'ค้นหาจากชื่อ สาขา สี หรือกลุ่มย่อย' : 'Search by name, major, color, or subgroup.'}</span>
          </button>
          <Link className="event-action-card" to="/me">
            <SearchCheck size={22} />
            <strong>{language === 'th' ? 'ตรวจสอบข้อมูลของฉัน' : 'Check my information'}</strong>
            <span>{language === 'th' ? 'ยืนยันตัวตนเพื่อดูข้อมูลเต็มและขอแก้ไข' : 'Verify to review your full information and request changes.'}</span>
          </Link>
          <Link className="event-action-card" to="/events">
            <CalendarDays size={22} />
            <strong>{language === 'th' ? 'สมัครหรือดูกิจกรรม' : 'View or register for events'}</strong>
            <span>{language === 'th' ? 'ดูรายละเอียดกิจกรรมและเส้นทางการสมัคร' : 'View event details and registration paths.'}</span>
          </Link>
          <Link className="event-action-card" to="/announcements">
            <Bell size={22} />
            <strong>{language === 'th' ? 'อ่านประกาศ' : 'Announcements'}</strong>
            <span>{language === 'th' ? 'ติดตามข้อมูลล่าสุดจากผู้ดูแล' : 'Read the latest updates from admins.'}</span>
          </Link>
        </div>
      </Card>

      <div id="participant-search-section" className="page-stack">
        <PageHeader
          compact
          eyebrow={t.participants}
          title={language === 'th' ? 'ค้นหารายชื่อผู้เข้าร่วม' : 'Search participants'}
          description={language === 'th' ? 'ค้นหารายชื่อ สาขา และกลุ่มของผู้เข้าร่วม โดยไม่แสดงข้อมูลส่วนตัว' : 'Search participants by name, major, and group without showing private details.'}
          meta={<strong className="count-badge">{resultText}</strong>}
          actions={<HelpButton topicId="participant.search" variant="link" />}
        />
      </div>

      <Card className="privacy-notice public-privacy-notice">
        <strong>{language === 'th' ? 'ประกาศความเป็นส่วนตัว' : 'Privacy notice'}</strong>
        <span>{language === 'th' ? 'หน้านี้แสดงเฉพาะข้อมูลที่ปลอดภัย เช่น ชื่อ สาขา และกลุ่ม ข้อมูลติดต่อ สุขภาพ และข้อมูลส่วนตัวอื่น ๆ จะไม่แสดงต่อสาธารณะ' : 'This page only shows safe public information such as name, major, and group. Contact, health, and other private details are hidden.'}</span>
        <Button variant="secondary" onClick={() => navigate('/me')}>{language === 'th' ? 'ตรวจสอบหรือขอแก้ไขข้อมูลของฉัน' : 'Check or request changes to my information'}</Button>
      </Card>

      <MobileSearchHeader
        label={t.search}
        value={search}
        onChange={setSearch}
        placeholder={language === 'th' ? 'ค้นหาชื่อ ชื่อเล่น สาขา' : 'Search name, nickname, major'}
        resultText={resultText}
        inputRef={searchInputRef}
        trailing={(
          <>
            <Button type="button" variant="secondary" icon={<SlidersHorizontal size={17} />} onClick={() => setFiltersOpen(true)}>
              {language === 'th' ? 'ตัวกรอง' : 'Filters'}
            </Button>
          </>
        )}
      >
        <button type="button" onClick={clearFilters}>
          {language === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}
        </button>
      </MobileSearchHeader>

      <FilterDrawer
        className="desktop-filter-panel"
        title={language === 'th' ? 'ตัวกรองรายชื่อ' : 'Participant filters'}
        open
        actions={(
          <>
            {hasFilters ? <Button variant="ghost" onClick={clearFilters}>{language === 'th' ? copy.th.clearFilters : copy.en.clearFilters}</Button> : null}
          </>
        )}
      >
        <div className="toolbar">
          <div className="search-shell">
            <Search size={18} aria-hidden="true" />
            <Input label={t.search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'th' ? 'ชื่อ ชื่อเล่น หรือสาขา' : 'Name, nickname, or major'} />
          </div>
          <Select label={t.filterMajor} value={major} onChange={(event) => setMajor(event.target.value)} options={(majors ?? []).map((code) => ({ value: code, label: majorLabel(`(${code})`, language) }))} placeholder={t.all} />
          <Select label={t.filterGroup} value={mainGroup} onChange={(event) => setMainGroup(event.target.value)} options={mainGroups.map((group) => ({ value: group, label: language === 'th' ? groupMeta[group].th : groupMeta[group].en }))} placeholder={t.all} />
          <Select label={t.filterSubgroup} value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroups.map((item) => ({ value: item, label: `Group ${item}` }))} placeholder={t.all} />
        </div>
      </FilterDrawer>

      <MobileFilterSheet
        open={filtersOpen}
        title={language === 'th' ? 'ตัวกรองรายชื่อ' : 'Participant filters'}
        description={language === 'th' ? 'เลือกสาขา กลุ่มสี หรือกลุ่มย่อย' : 'Choose major, color group, or subgroup'}
        primaryLabel={language === 'th' ? 'แสดงผล' : 'Apply'}
        clearLabel={language === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}
        onClose={() => setFiltersOpen(false)}
        onClear={clearFilters}
      >
        <Select label={t.filterMajor} value={major} onChange={(event) => setMajor(event.target.value)} options={(majors ?? []).map((code) => ({ value: code, label: majorLabel(`(${code})`, language) }))} placeholder={t.all} />
        <Select label={t.filterGroup} value={mainGroup} onChange={(event) => setMainGroup(event.target.value)} options={mainGroups.map((group) => ({ value: group, label: language === 'th' ? groupMeta[group].th : groupMeta[group].en }))} placeholder={t.all} />
        <Select label={t.filterSubgroup} value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroups.map((item) => ({ value: item, label: `Group ${item}` }))} placeholder={t.all} />
      </MobileFilterSheet>

      {activeFilters.length ? (
        <div className="filter-chip-row">
          {activeFilters.map((filter) => <span className="filter-chip" key={filter}>{filter}</span>)}
          <button type="button" onClick={clearFilters}>{language === 'th' ? 'ล้างทั้งหมด' : 'Clear all'}</button>
        </div>
      ) : null}

      {loading ? <LoadingSkeleton /> : null}
      {error ? <div className="error-state">{error}</div> : null}
      {!loading && !error && participants.length === 0 ? <EmptyState title={language === 'th' ? 'ไม่พบรายชื่อ' : 'No participants found'} description={language === 'th' ? copy.th.tryPublicSearch : copy.en.tryPublicSearch} /> : null}

      <div className="participant-grid">
        {participants.map((profile) => {
          const nickname = language === 'th' ? profile.nickname : profile.nickname_en || profile.nickname;
          const fullName = (language === 'th' ? profile.name_th : profile.name_en) || profile.name_th || profile.name_en || '';
          return (
            <Card
              className="participant-card participant-card-clickable"
              key={profile.id}
              style={
                profile.main_group
                  ? ({
                      '--group-color': groupMeta[profile.main_group].color,
                      '--group-soft': groupMeta[profile.main_group].soft,
                    } as CSSProperties)
                  : undefined
              }
              onClick={() => setSelected(profile)}
              role="button"
              tabIndex={0}
              aria-label={language === 'th' ? `เปิดโปรไฟล์ของ ${fullName || nickname || 'ผู้เข้าร่วม'}` : `Open profile for ${fullName || nickname || 'participant'}`}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelected(profile);
                }
              }}
            >
              <div className="participant-card-head">
                {profile.main_group ? <span className="group-dot participant-group-dot" aria-hidden="true" /> : null}
                <div>
                  <h2>{nickname || fullName || (language === 'th' ? 'ไม่ระบุชื่อ' : 'Name not specified')}</h2>
                  <p>{fullName && fullName !== nickname ? fullName : (language === 'th' ? 'ชื่อเต็มถูกซ่อนไว้บางส่วนตามความเป็นส่วนตัว' : 'Full name may be partially hidden for privacy')}</p>
                </div>
              </div>
              <div className="participant-card-badges">
                <span className="major-badge">{majorLabel(profile.major, language)}</span>
                <small className="group-badge">{groupLabel(profile.main_group, profile.subgroup, language)}</small>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={Boolean(selected)} title={language === 'th' ? 'โปรไฟล์ผู้เข้าร่วม' : 'Participant profile'} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="modal-body public-profile-modal">
            <div className="profile-hero">
              {selected.main_group ? (
                <span className="group-dot" style={{ '--group-color': groupMeta[selected.main_group].color } as CSSProperties} />
              ) : null}
              <div>
                <h2>{(language === 'th' ? selected.name_th : selected.name_en) || selected.name_th || selected.name_en || (language === 'th' ? 'ไม่ระบุชื่อ' : 'Name not specified')}</h2>
                <p>{language === 'th' ? selected.name_en || 'ซ่อนชื่อภาษาอังกฤษ' : selected.name_th || 'Thai name hidden'}</p>
                <strong>{(language === 'th' ? selected.nickname : selected.nickname_en || selected.nickname) || (language === 'th' ? 'ยังไม่มีชื่อเล่น' : 'No nickname yet')}</strong>
              </div>
            </div>
            <div className="profile-facts">
              <div><span>{t.major}</span><strong>{majorLabel(selected.major, language)}</strong></div>
              <div><span>{t.groups}</span><strong>{groupLabel(selected.main_group, selected.subgroup, language)}</strong></div>
            </div>
            <Card className="privacy-notice">
              <strong>{language === 'th' ? 'ต้องยืนยันตัวตนก่อนดูข้อมูลของตัวเอง' : 'Verify identity to view your own details'}</strong>
              <span>{language === 'th' ? 'หากต้องการตรวจสอบข้อมูลของตัวเอง กรุณายืนยันตัวตนด้วยอีเมลและเบอร์โทรที่ใช้ลงทะเบียน' : 'To check your own full information, verify with the email and phone number used during registration.'}</span>
              <HelpButton topicId="participant.edit-info" variant="compact" />
            </Card>
            <div className="form-actions">
              <Button icon={<Eye size={18} />} onClick={() => { setSelected(null); navigate('/me'); }}>
                {language === 'th' ? 'ยืนยันตัวตนเพื่อดูข้อมูลของฉัน' : 'Verify to view my information'}
              </Button>
            </div>
            <MobileSafeAreaSpacer />
          </div>
        ) : null}
      </Modal>
      <MobileSafeAreaSpacer />
    </section>
  );
}
