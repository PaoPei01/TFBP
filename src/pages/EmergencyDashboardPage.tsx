import { AlertTriangle, Clipboard, Phone, Save, Search, ShieldAlert, Siren } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { HealthFlags, hasHealthFlag } from '../components/HealthFlags';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmergencyQuickDock } from '../components/mobile/EmergencyQuickDock';
import { MobileSearchHeader } from '../components/mobile/MobileSearchHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { emergencyContacts, emergencySections, priorityLabel, priorityRank, type EmergencyContact } from '../lib/emergencyContacts';
import { groupLabel } from '../lib/grouping';
import { groupMeta, mainGroups, subgroups } from '../lib/groups';
import { majorLabel } from '../lib/major';
import type { EmergencyProfile } from '../lib/types';
import { fetchEmergencyDashboard, saveEmergencyNote } from '../services/emergency';
import { fetchStaffAccessContext } from '../services/staff';
import { errorMessage } from '../utils/error';

type MedicalFilter = '' | 'any' | 'disease' | 'drug_allergy' | 'food_allergy' | 'special';
type Incident = { id: string; contact: string; phone: string; createdAt: string };
const incidentKey = 'tfbp_emergency_incidents';
const emergencyCacheKey = 'tfbp_emergency_contacts_cache';
const emergencyCacheTimeKey = 'tfbp_emergency_contacts_cache_synced_at';

function loadIncidents(): Incident[] {
  try {
    return JSON.parse(localStorage.getItem(incidentKey) || '[]') as Incident[];
  } catch {
    return [];
  }
}

export function EmergencyDashboardPage() {
  const { language } = useLanguage();
  const state = useAsync(fetchEmergencyDashboard, []);
  const accessState = useAsync(fetchStaffAccessContext, []);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [medical, setMedical] = useState<MedicalFilter>('any');
  const [allergyType, setAllergyType] = useState('');
  const [notes, setNotes] = useState<Record<string, { note: string; needs: boolean }>>({});
  const [toast, setToast] = useState<ToastState>(null);
  const [incidents, setIncidents] = useState<Incident[]>(loadIncidents);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStorage.getItem(emergencyCacheTimeKey));
  const canEditHealthTools = Boolean(accessState.data?.is_admin || accessState.data?.roles.includes('emergency_staff'));
  const sortedContacts = useMemo(() => [...emergencyContacts].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]), []);

  const rows = useMemo(() => state.data?.participants ?? [], [state.data?.participants]);
  const staffMedicalRows = state.data?.staff_medical ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((profile) => {
      if (term) {
        const haystack = [profile.name_th, profile.name_en, profile.nickname, profile.phone, profile.emergency_phone, profile.major, profile.main_group, profile.subgroup]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (group && profile.main_group !== group) return false;
      if (subgroup && profile.subgroup !== subgroup) return false;
      if (medical === 'special' && !profile.needs_special_care) return false;
      if ((medical === 'disease' || medical === 'drug_allergy' || medical === 'food_allergy') && !hasHealthFlag(profile, medical)) return false;
      if (medical === 'any' && !hasHealthFlag(profile) && !profile.needs_special_care && !profile.emergency_note) return false;
      if (allergyType) {
        const text = `${profile.food_allergy ?? ''} ${profile.drug_allergy ?? ''}`.toLowerCase();
        if (!text.includes(allergyType.toLowerCase())) return false;
      }
      return true;
    });
  }, [allergyType, group, medical, rows, search, subgroup]);

  async function save(profile: EmergencyProfile) {
    if (!canEditHealthTools) {
      setToast({ type: 'error', message: language === 'th' ? 'บัญชีนี้ดูข้อมูลฉุกเฉินได้ แต่แก้ note ได้เฉพาะ admin หรือ emergency_staff' : 'This account can view emergency data, but only admin or emergency_staff can edit notes.' });
      return;
    }
    const current = notes[profile.id] ?? { note: profile.emergency_note ?? '', needs: Boolean(profile.needs_special_care) };
    try {
      await saveEmergencyNote(profile.id, current.note, current.needs);
      setToast({ type: 'success', message: language === 'th' ? 'บันทึก emergency note แล้ว' : 'Emergency note saved' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed') });
    }
  }

  async function copyPhone(contact: EmergencyContact) {
    if (!contact.phone) {
      setToast({ type: 'error', message: language === 'th' ? 'ยังไม่ได้ตั้งค่าเบอร์นี้' : 'This phone number is not set yet' });
      return;
    }
    try {
      await navigator.clipboard.writeText(contact.phone);
      setToast({ type: 'success', message: language === 'th' ? `คัดลอกเบอร์ ${contact.nameTh} แล้ว` : `Copied ${contact.name} phone number` });
    } catch {
      setToast({ type: 'error', message: language === 'th' ? 'คัดลอกไม่สำเร็จ' : 'Copy failed' });
    }
  }

  function logIncident(contact: EmergencyContact) {
    const next = [
      { id: crypto.randomUUID(), contact: contact.name, phone: contact.phone, createdAt: new Date().toISOString() },
      ...incidents,
    ].slice(0, 8);
    setIncidents(next);
    localStorage.setItem(incidentKey, JSON.stringify(next));
    setToast({ type: 'success', message: language === 'th' ? `บันทึก escalation: ${contact.nameTh}` : `Logged escalation: ${contact.name}` });
  }

  useEffect(() => {
    const now = new Date().toISOString();
    localStorage.setItem(emergencyCacheKey, JSON.stringify(emergencyContacts));
    localStorage.setItem(emergencyCacheTimeKey, now);
    setLastSyncedAt(now);
  }, []);

  const summary = state.data?.summary;

  return (
    <section className="page-stack emergency-page">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">{language === 'th' ? 'ปฏิบัติการฉุกเฉิน' : 'Emergency Operations'}</p>
        <div className="section-title-row">
          <h1>{language === 'th' ? 'แดชบอร์ดฉุกเฉิน' : 'Emergency Dashboard'}</h1>
          <HelpButton topicId="emergency.overview" variant="compact" />
        </div>
        <p>{language === 'th' ? 'ข้อมูลสุขภาพเป็นความลับ ใช้เฉพาะงานดูแลความปลอดภัยในกิจกรรม ทุกครั้งที่เปิดหรือแก้ไขจะถูกบันทึก audit log' : 'Health information is confidential and only for event safety operations. Every view or edit is recorded in the audit log.'}</p>
      </div>

      {state.loading || accessState.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}

      {summary ? (
        <div className="stats-grid">
          <DashboardStatCard label={language === 'th' ? 'ต้องดูแลพิเศษ' : 'Special care'} value={summary.needs_special_care} icon={<ShieldAlert size={20} />} />
          <DashboardStatCard label={language === 'th' ? 'โรคประจำตัว' : 'Medical conditions'} value={summary.disease} />
          <DashboardStatCard label={language === 'th' ? 'แพ้ยา' : 'Drug allergies'} value={summary.drug_allergy} />
          <DashboardStatCard label={language === 'th' ? 'แพ้อาหาร' : 'Food allergies'} value={summary.food_allergy} />
          <DashboardStatCard label={language === 'th' ? 'ทีมงานมีข้อมูลสุขภาพ' : 'Staff medical flags'} value={summary.staff_medical ?? 0} />
        </div>
      ) : null}

      <Card className="emergency-notice">
        <AlertTriangle size={20} />
        <div>
          <strong>{language === 'th' ? 'ข้อมูลสุขภาพเป็นความลับ' : 'Confidential medical information'}</strong>
          <span>{language === 'th' ? 'ห้ามแชร์ภาพหน้าจอหรือเผยแพร่ข้อมูลสุขภาพต่อสาธารณะ ใช้เพื่อประสานงานฉุกเฉินเท่านั้น' : 'Do not share screenshots or disclose health data publicly. Use this only for emergency coordination.'}</span>
        </div>
      </Card>

      <MobileSearchHeader
        label={language === 'th' ? 'ค้นหาเคสด่วน' : 'Quick case search'}
        value={search}
        onChange={setSearch}
        placeholder={language === 'th' ? 'ชื่อ ชื่อเล่น เบอร์ กลุ่ม' : 'Name, nickname, phone, group'}
        resultText={`${filtered.length} ${language === 'th' ? 'รายการ' : 'cases'}`}
      >
        <a href="tel:1669">{language === 'th' ? 'โทร 1669' : 'Call 1669'}</a>
      </MobileSearchHeader>

      <Card className="emergency-escalation-panel">
        <div className="emergency-panel-head">
          <div>
            <p className="eyebrow">{language === 'th' ? 'ลำดับการประสานงาน' : 'Escalation Flow'}</p>
            <h2>{language === 'th' ? 'โทรตามลำดับความเร่งด่วน' : 'Call in priority order'}</h2>
          </div>
          <span>{language === 'th' ? 'พร้อมใช้ออฟไลน์' : 'Offline cache ready'}</span>
          {lastSyncedAt ? <small>{language === 'th' ? 'อัปเดตล่าสุด' : 'Last synced'} {new Date(lastSyncedAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</small> : null}
        </div>
        {!navigator.onLine ? <div className="offline-banner">{language === 'th' ? 'กำลังออฟไลน์: ใช้เบอร์ฉุกเฉินจาก cache บนเครื่องนี้' : 'Offline: showing emergency hotlines cached on this device'}</div> : null}
        <div className="escalation-flow">
          {sortedContacts.map((contact, index) => (
            <div className={`flow-step priority-${contact.priority}`} key={contact.name}>
              <strong>{index + 1}</strong>
              <span>{language === 'th' ? contact.nameTh : contact.name}</span>
            </div>
          ))}
        </div>
        <div className="guideline-panel">
          <strong>{language === 'th' ? 'แนวทางตอบสนองเหตุฉุกเฉิน' : 'Emergency response guideline'}</strong>
          <span>{language === 'th' ? '1. ประเมินความปลอดภัยของพื้นที่ 2. โทรหัวหน้าทีมพยาบาล/1669 เมื่อมีอาการรุนแรง 3. ให้คนหนึ่งอยู่กับผู้ป่วย อีกคนประสานงาน 4. บันทึก note และเวลาที่ escalate ทุกครั้ง' : '1. Check scene safety. 2. Call Head Medic/1669 for severe symptoms. 3. Keep one person with the patient and one person coordinating. 4. Record notes and escalation time.'}</span>
        </div>
      </Card>

      <div className="emergency-section-grid">
        {emergencySections.map((section) => {
          const contacts = sortedContacts.filter((contact) => section.categories.includes(contact.category) && section.priorities.includes(contact.priority));
          return (
            <Card className="emergency-contact-section" key={section.title}>
              <div className="emergency-panel-head">
                <div>
                  <h2>{language === 'th' ? section.titleTh : section.title}</h2>
                  <p>{language === 'th' ? section.descriptionTh : section.description}</p>
                </div>
              </div>
              <div className="emergency-quick-grid">
                {contacts.map((contact) => (
                  <div className={`emergency-quick-card priority-${contact.priority}`} key={`${section.title}-${contact.name}`}>
                    <div>
                      <span className={`priority-badge priority-${contact.priority}`}>{priorityLabel[contact.priority]}</span>
                      <h3>{language === 'th' ? contact.nameTh : contact.name}</h3>
                      <p>{(language === 'th' ? contact.descriptionTh : contact.description) || (contact.available_24h ? (language === 'th' ? 'พร้อมตลอด 24 ชั่วโมง' : 'Available 24h') : (language === 'th' ? 'ตรวจสอบเวลาพร้อมให้บริการ' : 'Check availability'))}</p>
                    </div>
                    <strong>{contact.phone || 'TBD'}</strong>
                    {contact.alternatePhones?.length ? (
                      <div className="alternate-phone-list">
                        <span>{language === 'th' ? 'เบอร์สำรอง' : 'Alternate'}</span>
                        {contact.alternatePhones.map((phone) => (
                          <a key={phone} href={`tel:${phone}`}>{phone}</a>
                        ))}
                      </div>
                    ) : null}
                    <div className="emergency-quick-actions">
                      <a className="btn btn-primary" href={contact.phone ? `tel:${contact.phone}` : undefined}>
                        <Phone size={18} /> {language === 'th' ? 'โทร' : 'Call'}
                      </a>
                      <Button variant="secondary" icon={<Clipboard size={18} />} onClick={() => copyPhone(contact)}>{language === 'th' ? 'คัดลอก' : 'Copy'}</Button>
                      <Button variant="ghost" icon={<Siren size={18} />} onClick={() => logIncident(contact)}>Log</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="incident-panel">
        <div className="emergency-panel-head">
          <div>
            <h2>{language === 'th' ? 'บันทึกการ escalation' : 'Incident escalation tracking'}</h2>
            <p>{language === 'th' ? 'เก็บในเครื่องนี้เพื่อช่วยจำช่วงหน้างาน ไม่ใช่บันทึกถาวรในฐานข้อมูล' : 'Stored locally on this device for event operations. This is not a permanent database record.'}</p>
          </div>
        </div>
        {incidents.length ? incidents.map((incident) => (
          <div className="incident-row" key={incident.id}>
            <span>{new Date(incident.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
            <strong>{incident.contact}</strong>
            <small>{incident.phone}</small>
          </div>
        )) : <span className="empty-inline">{language === 'th' ? 'ยังไม่มี escalation log' : 'No escalation log yet'}</span>}
      </Card>

      <div className="emergency-toolbar">
        <div className="search-shell">
          <Search size={18} aria-hidden="true" />
          <Input label={language === 'th' ? 'ค้นหา' : 'Search'} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'th' ? 'ชื่อ ชื่อเล่น เบอร์ กลุ่ม สาขา' : 'Name, nickname, phone, group, major'} />
        </div>
        <Select label={language === 'th' ? 'สี' : 'Color'} value={group} onChange={(event) => setGroup(event.target.value)} options={mainGroups.map((item) => ({ value: item, label: language === 'th' ? groupMeta[item].th : item }))} />
        <Select label={language === 'th' ? 'กลุ่มย่อย' : 'Subgroup'} value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroups.map((item) => ({ value: item, label: `Group ${item}` }))} />
        <Select
          label={language === 'th' ? 'สถานะสุขภาพ' : 'Medical status'}
          value={medical}
          onChange={(event) => setMedical(event.target.value as MedicalFilter)}
          options={[
            { value: 'any', label: language === 'th' ? 'มีข้อมูลฉุกเฉินใด ๆ' : 'Any emergency data' },
            { value: 'special', label: language === 'th' ? 'ต้องดูแลพิเศษ' : 'Needs special care' },
            { value: 'disease', label: language === 'th' ? 'โรคประจำตัว' : 'Medical condition' },
            { value: 'drug_allergy', label: language === 'th' ? 'แพ้ยา' : 'Drug allergy' },
            { value: 'food_allergy', label: language === 'th' ? 'แพ้อาหาร' : 'Food allergy' },
          ]}
        />
        <Input label={language === 'th' ? 'ค้นหาชนิดที่แพ้' : 'Search allergy type'} value={allergyType} onChange={(event) => setAllergyType(event.target.value)} placeholder={language === 'th' ? 'เช่น penicillin, กุ้ง' : 'e.g. penicillin, shrimp'} />
      </div>

      <div className="emergency-list">
        {filtered.map((profile) => {
          const draft = notes[profile.id] ?? { note: profile.emergency_note ?? '', needs: Boolean(profile.needs_special_care) };
          return (
            <Card className="emergency-card" key={profile.id}>
              <div className="emergency-card-head">
                <div>
                  <h2>{profile.nickname || profile.name_th}</h2>
                  <p>{profile.name_th} · {majorLabel(profile.major)}</p>
                  <span>{groupLabel(profile.main_group, profile.subgroup, language)}</span>
                </div>
                {draft.needs ? <Badge status="rejected">Needs special care</Badge> : <Badge status="pending">Medical watch</Badge>}
              </div>
              <HealthFlags profile={profile} detail />
              <div className="emergency-contact-grid">
                <a className="call-card primary-call" href={profile.emergency_phone ? `tel:${profile.emergency_phone}` : undefined}>
                  <Phone size={18} />
                  <span>{language === 'th' ? 'โทรฉุกเฉิน' : 'Emergency contact'}</span>
                  <strong>{profile.emergency_phone || '-'}</strong>
                </a>
                <a className="call-card" href={profile.phone ? `tel:${profile.phone}` : undefined}>
                  <Phone size={18} />
                  <span>{language === 'th' ? 'โทรผู้เข้าร่วม' : 'Call participant'}</span>
                  <strong>{profile.phone || '-'}</strong>
                </a>
              </div>
              <div className="form-grid">
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={draft.needs}
                    onChange={(event) => setNotes({ ...notes, [profile.id]: { ...draft, needs: event.target.checked } })}
                  />
                  <span>{language === 'th' ? 'ต้องดูแลเป็นพิเศษ' : 'Needs special care'}</span>
                </label>
                <Input
                  label={language === 'th' ? 'หมายเหตุฉุกเฉิน' : 'Emergency note'}
                  value={draft.note}
                  onChange={(event) => setNotes({ ...notes, [profile.id]: { ...draft, note: event.target.value } })}
                  placeholder={language === 'th' ? 'เช่น ให้พี่กลุ่มช่วยติดตาม / แจ้งพยาบาลแล้ว' : 'e.g. ask group staff to monitor / medic notified'}
                />
                <div className="form-actions">
                  <Button icon={<Save size={18} />} onClick={() => save(profile)} disabled={!canEditHealthTools}>{language === 'th' ? 'บันทึก note' : 'Save note'}</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {staffMedicalRows.length ? (
        <Card className="sensitive-panel">
          <div className="emergency-panel-head">
            <div>
              <h2>{language === 'th' ? 'ทีมงานที่มีข้อมูลสุขภาพ' : 'Staff with medical information'}</h2>
              <p>{language === 'th' ? 'แสดงเฉพาะผู้มีสิทธิ์ดูข้อมูลฉุกเฉิน ใช้เพื่อดูแลทีมงานระหว่างกิจกรรม' : 'Visible only to emergency-authorized users for staff safety during operations.'}</p>
            </div>
            <Badge status="rejected">{String(staffMedicalRows.length)}</Badge>
          </div>
          <div className="emergency-list compact">
            {staffMedicalRows.map((staff) => (
              <div className="emergency-card staff-medical-card" key={staff.id}>
                <div className="emergency-card-head">
                  <div>
                    <h3>{staff.nickname_th || staff.nickname || staff.nickname_en || staff.name_th || staff.name_en}</h3>
                    <p>{staff.name_th || staff.name_en} · {staff.primary_role || staff.position || '-'}</p>
                    <span>{groupLabel(staff.main_group, staff.subgroup, language)} · {majorLabel(staff.major, language)}</span>
                  </div>
                  <a className="btn btn-primary" href={staff.phone ? `tel:${staff.phone}` : undefined}><Phone size={18} />{staff.phone || '-'}</a>
                </div>
                <div className="health-flags detail">
                  {staff.disease ? <span className="health-flag disease">{language === 'th' ? 'โรคประจำตัว' : 'Medical'}: {staff.disease}</span> : null}
                  {staff.drug_allergy ? <span className="health-flag drug_allergy">{language === 'th' ? 'แพ้ยา' : 'Drug'}: {staff.drug_allergy}</span> : null}
                  {staff.food_allergy ? <span className="health-flag food_allergy">{language === 'th' ? 'แพ้อาหาร' : 'Food'}: {staff.food_allergy}</span> : null}
                  {staff.medical_note ? <span className="health-flag">{language === 'th' ? 'หมายเหตุ' : 'Note'}: {staff.medical_note}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <EmergencyQuickDock language={language} />
    </section>
  );
}
