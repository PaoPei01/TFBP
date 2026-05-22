import { Eye, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <PageHeader
        compact
        eyebrow={t.participants}
        title={language === 'th' ? 'ค้นหารายชื่อ' : 'Search participants'}
        description={language === 'th' ? 'ค้นหารายชื่อและกลุ่มได้อย่างปลอดภัย' : 'Search names and group assignments safely.'}
        meta={<strong className="count-badge">{resultText}</strong>}
      />

      <Card className="privacy-notice public-privacy-notice">
        <strong>{language === 'th' ? 'ประกาศความเป็นส่วนตัว' : 'Privacy notice'}</strong>
        <span>{language === 'th' ? 'แสดงเฉพาะชื่อ สาขา และกลุ่ม ข้อมูลติดต่อและสุขภาพถูกซ่อนไว้' : 'Only name, major, and group are visible. Contact and medical data stay private.'}</span>
        <Button variant="secondary" onClick={() => navigate('/edit')}>{language === 'th' ? 'ตรวจสอบ/แก้ไขข้อมูลของฉัน' : 'Check/edit my information'}</Button>
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
            <HelpButton topicId="participant.search" variant="compact" />
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
            <HelpButton topicId="participant.search" variant="compact" />
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
        description={language === 'th' ? 'เลือกสาขา สี หรือกลุ่มย่อย' : 'Choose major, color, or subgroup'}
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
        {participants.map((profile) => (
          <Card
            className="participant-card participant-card-clickable"
            key={profile.id}
            onClick={() => setSelected(profile)}
            role="button"
            tabIndex={0}
            aria-label={language === 'th' ? `เปิดโปรไฟล์ของ ${profile.name_th || profile.nickname || 'ผู้เข้าร่วม'}` : `Open profile for ${profile.name_en || profile.name_th || profile.nickname || 'participant'}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelected(profile);
              }
            }}
          >
            <h2>{(language === 'th' ? profile.name_th : profile.name_en) || profile.name_th || (language === 'th' ? 'ไม่ระบุชื่อ' : 'Name not specified')}</h2>
            <p>{(language === 'th' ? profile.nickname : profile.nickname_en || profile.nickname) ? `${t.nickname} ${language === 'th' ? profile.nickname : profile.nickname_en || profile.nickname}` : language === 'th' ? 'ยังไม่มีชื่อเล่น' : 'No nickname yet'}</p>
            <span>{majorLabel(profile.major, language)}</span>
            <small className="group-badge">{groupLabel(profile.main_group, profile.subgroup, language)}</small>
          </Card>
        ))}
      </div>

      <Modal open={Boolean(selected)} title={language === 'th' ? 'โปรไฟล์ผู้เข้าร่วม' : 'Participant profile'} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="modal-body public-profile-modal">
            <div className="profile-hero">
              {selected.main_group ? (
                <span className="group-dot" style={{ '--group-color': groupMeta[selected.main_group].color } as CSSProperties} />
              ) : null}
              <div>
                <h2>{(language === 'th' ? selected.name_th : selected.name_en) || selected.name_th}</h2>
                <p>{language === 'th' ? selected.name_en || 'ซ่อนชื่อภาษาอังกฤษ' : selected.name_th || 'Thai name hidden'}</p>
                <strong>{(language === 'th' ? selected.nickname : selected.nickname_en || selected.nickname) || '-'}</strong>
              </div>
            </div>
            <div className="profile-facts">
              <div><span>{t.major}</span><strong>{majorLabel(selected.major, language)}</strong></div>
              <div><span>{t.groups}</span><strong>{groupLabel(selected.main_group, selected.subgroup, language)}</strong></div>
              <div className="blurred-fact"><span>{t.email}</span><strong>{language === 'th' ? copy.th.hiddenForPrivacy : copy.en.hiddenForPrivacy}</strong></div>
              <div className="blurred-fact"><span>{t.phone}</span><strong>{language === 'th' ? copy.th.hiddenForPrivacy : copy.en.hiddenForPrivacy}</strong></div>
              <div className="blurred-fact"><span>{language === 'th' ? 'ข้อมูลสุขภาพ' : 'Health details'}</span><strong>{language === 'th' ? copy.th.hiddenForPrivacy : copy.en.hiddenForPrivacy}</strong></div>
            </div>
            <Card className="privacy-notice">
              <strong>{language === 'th' ? 'ต้องยืนยันตัวตนก่อนดูข้อมูลเต็ม' : 'Verify identity to view full details'}</strong>
              <span>{language === 'th' ? 'ข้อมูลติดต่อ ข้อมูลสุขภาพ และระบบแนะนำเพื่อนจะแสดงหลังยืนยันอีเมลและเบอร์โทรของตัวเองเท่านั้น' : 'Contact details, health details, and friend recommendations are available only after verifying your own email and phone.'}</span>
              <HelpButton topicId="participant.edit-info" variant="compact" />
            </Card>
            <div className="form-actions">
              <Button icon={<Eye size={18} />} onClick={() => { setSelected(null); navigate('/edit'); }}>
                {language === 'th' ? 'ดูข้อมูลเต็ม / แก้ไขข้อมูล' : 'View full details / edit'}
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
