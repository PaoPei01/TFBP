import { Eye, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { groupMeta, mainGroups, subgroups } from '../lib/groups';
import { majorLabel } from '../lib/major';
import type { PublicProfile } from '../lib/types';
import { fetchPublicMajors, fetchPublicProfiles } from '../services/profiles';

export function PublicListPage() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [major, setMajor] = useState('');
  const [mainGroup, setMainGroup] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [selected, setSelected] = useState<PublicProfile | null>(null);
  const { data: majors } = useAsync(fetchPublicMajors, []);
  const { data, loading, error } = useAsync(() => fetchPublicProfiles({ search, major, mainGroup, subgroup }), [search, major, mainGroup, subgroup]);
  const participants = data ?? [];
  const resultText = useMemo(() => `${participants.length.toLocaleString(language === 'th' ? 'th-TH' : 'en-US')} ${language === 'th' ? 'คน' : 'people'}`, [language, participants.length]);

  return (
    <section className="page-stack">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">{t.participants}</p>
          <h1>{t.searchTitle}</h1>
          <p>{language === 'th' ? 'หน้านี้แสดงเฉพาะชื่อภาษาไทย ชื่อเล่น และสาขาเท่านั้น ข้อมูลติดต่อและข้อมูลสุขภาพถูกซ่อนไว้เพื่อความเป็นส่วนตัว' : 'This page only shows Thai name, nickname, and major. Contact and health details remain private.'}</p>
        </div>
        <strong>{resultText}</strong>
      </div>

      <Card className="privacy-notice">
        <strong>{language === 'th' ? 'ประกาศความเป็นส่วนตัว' : 'Privacy notice'}</strong>
        <span>{t.privacy}</span>
      </Card>

      <div className="toolbar">
        <div className="search-shell">
          <Search size={18} aria-hidden="true" />
          <Input label={t.search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'th' ? 'ชื่อ ชื่อเล่น หรือสาขา' : 'Name, nickname, or major'} />
        </div>
        <Select label={t.filterMajor} value={major} onChange={(event) => setMajor(event.target.value)} options={(majors ?? []).map((code) => ({ value: code, label: majorLabel(`(${code})`, language) }))} placeholder={t.all} />
        <Select label={t.filterGroup} value={mainGroup} onChange={(event) => setMainGroup(event.target.value)} options={mainGroups.map((group) => ({ value: group, label: language === 'th' ? groupMeta[group].th : groupMeta[group].en }))} placeholder={t.all} />
        <Select label={t.filterSubgroup} value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroups.map((item) => ({ value: item, label: `Group ${item}` }))} placeholder={t.all} />
      </div>

      {loading ? <LoadingSkeleton /> : null}
      {error ? <div className="error-state">{error}</div> : null}
      {!loading && !error && participants.length === 0 ? <div className="empty-state">{language === 'th' ? 'ไม่พบรายชื่อที่ตรงกับการค้นหา' : 'No participants match your search'}</div> : null}

      <div className="participant-grid">
        {participants.map((profile) => (
          <Card className="participant-card participant-card-clickable" key={profile.id} onClick={() => setSelected(profile)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setSelected(profile)}>
            <h2>{(language === 'th' ? profile.name_th : profile.name_en) || profile.name_th || (language === 'th' ? 'ไม่ระบุชื่อ' : 'Name not specified')}</h2>
            <p>{(language === 'th' ? profile.nickname : profile.nickname_en || profile.nickname) ? `${t.nickname} ${language === 'th' ? profile.nickname : profile.nickname_en || profile.nickname}` : language === 'th' ? 'ยังไม่มีชื่อเล่น' : 'No nickname yet'}</p>
            <span>{majorLabel(profile.major, language)}</span>
            <small>{groupLabel(profile.main_group, profile.subgroup, language)}</small>
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
              <div className="blurred-fact"><span>{t.email}</span><strong>••••••••@•••••.com</strong></div>
              <div className="blurred-fact"><span>{t.phone}</span><strong>•••-•••-••••</strong></div>
              <div className="blurred-fact"><span>{language === 'th' ? 'ข้อมูลสุขภาพ' : 'Health details'}</span><strong>{language === 'th' ? 'ถูกซ่อนไว้' : 'Hidden'}</strong></div>
            </div>
            <Card className="privacy-notice">
              <strong>{language === 'th' ? 'ต้องยืนยันตัวตนก่อนดูข้อมูลเต็ม' : 'Verify identity to view full details'}</strong>
              <span>{language === 'th' ? 'ข้อมูลติดต่อ ข้อมูลสุขภาพ และระบบแนะนำเพื่อนจะแสดงหลังยืนยันอีเมลและเบอร์โทรของตัวเองเท่านั้น' : 'Contact details, health details, and friend recommendations are available only after verifying your own email and phone.'}</span>
            </Card>
            <div className="form-actions">
              <Button icon={<Eye size={18} />} onClick={() => navigate('/edit')}>
                {language === 'th' ? 'ดูข้อมูลเต็ม / แก้ไขข้อมูล' : 'View full details / edit'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
