import { AlertTriangle, Phone, Save, Search, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { HealthFlags, hasHealthFlag } from '../components/HealthFlags';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { groupMeta, mainGroups, subgroups } from '../lib/groups';
import { majorLabel } from '../lib/major';
import type { EmergencyProfile } from '../lib/types';
import { fetchEmergencyDashboard, saveEmergencyNote } from '../services/emergency';
import { fetchStaffAccessContext } from '../services/staff';
import { errorMessage } from '../utils/error';

type MedicalFilter = '' | 'any' | 'disease' | 'drug_allergy' | 'food_allergy' | 'special';

export function EmergencyDashboardPage() {
  const state = useAsync(fetchEmergencyDashboard, []);
  const accessState = useAsync(fetchStaffAccessContext, []);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [medical, setMedical] = useState<MedicalFilter>('any');
  const [allergyType, setAllergyType] = useState('');
  const [notes, setNotes] = useState<Record<string, { note: string; needs: boolean }>>({});
  const [toast, setToast] = useState<ToastState>(null);
  const canEditHealthTools = Boolean(accessState.data?.is_admin || accessState.data?.roles.includes('emergency_staff'));

  const rows = useMemo(() => state.data?.participants ?? [], [state.data?.participants]);
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
      setToast({ type: 'error', message: 'บัญชีนี้ดูข้อมูลฉุกเฉินได้ แต่แก้ note ได้เฉพาะ admin หรือ emergency_staff' });
      return;
    }
    const current = notes[profile.id] ?? { note: profile.emergency_note ?? '', needs: Boolean(profile.needs_special_care) };
    try {
      await saveEmergencyNote(profile.id, current.note, current.needs);
      setToast({ type: 'success', message: 'บันทึก emergency note แล้ว' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'บันทึกไม่สำเร็จ') });
    }
  }

  const summary = state.data?.summary;

  return (
    <section className="page-stack emergency-page">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">Emergency Operations</p>
        <h1>Emergency Dashboard</h1>
        <p>ข้อมูลสุขภาพเป็นความลับ ใช้เฉพาะงานดูแลความปลอดภัยในกิจกรรม ทุกครั้งที่เปิดหรือแก้ไขจะถูกบันทึก audit log</p>
      </div>

      {state.loading || accessState.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}

      {summary ? (
        <div className="stats-grid">
          <DashboardStatCard label="Special care" value={summary.needs_special_care} icon={<ShieldAlert size={20} />} />
          <DashboardStatCard label="โรคประจำตัว" value={summary.disease} />
          <DashboardStatCard label="แพ้ยา" value={summary.drug_allergy} />
          <DashboardStatCard label="แพ้อาหาร" value={summary.food_allergy} />
        </div>
      ) : null}

      <Card className="emergency-notice">
        <AlertTriangle size={20} />
        <div>
          <strong>Confidential medical information</strong>
          <span>ห้ามแชร์ภาพหน้าจอหรือเผยแพร่ข้อมูลสุขภาพต่อสาธารณะ ใช้เพื่อประสานงานฉุกเฉินเท่านั้น</span>
        </div>
      </Card>

      <div className="emergency-toolbar">
        <div className="search-shell">
          <Search size={18} aria-hidden="true" />
          <Input label="ค้นหา" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ชื่อ ชื่อเล่น เบอร์ กลุ่ม สาขา" />
        </div>
        <Select label="สี" value={group} onChange={(event) => setGroup(event.target.value)} options={mainGroups.map((item) => ({ value: item, label: `${groupMeta[item].th} / ${item}` }))} />
        <Select label="กลุ่มย่อย" value={subgroup} onChange={(event) => setSubgroup(event.target.value)} options={subgroups.map((item) => ({ value: item, label: `Group ${item}` }))} />
        <Select
          label="สถานะสุขภาพ"
          value={medical}
          onChange={(event) => setMedical(event.target.value as MedicalFilter)}
          options={[
            { value: 'any', label: 'มีข้อมูลฉุกเฉินใด ๆ' },
            { value: 'special', label: 'Needs special care' },
            { value: 'disease', label: 'โรคประจำตัว' },
            { value: 'drug_allergy', label: 'แพ้ยา' },
            { value: 'food_allergy', label: 'แพ้อาหาร' },
          ]}
        />
        <Input label="ค้นหาชนิดที่แพ้" value={allergyType} onChange={(event) => setAllergyType(event.target.value)} placeholder="เช่น penicillin, กุ้ง" />
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
                  <span>{groupLabel(profile.main_group, profile.subgroup)}</span>
                </div>
                {draft.needs ? <Badge status="rejected">Needs special care</Badge> : <Badge status="pending">Medical watch</Badge>}
              </div>
              <HealthFlags profile={profile} detail />
              <div className="emergency-contact-grid">
                <a className="call-card primary-call" href={profile.phone ? `tel:${profile.phone}` : undefined}>
                  <Phone size={18} />
                  <span>โทรผู้เข้าร่วม</span>
                  <strong>{profile.phone || '-'}</strong>
                </a>
                <a className="call-card" href={profile.emergency_phone ? `tel:${profile.emergency_phone}` : undefined}>
                  <Phone size={18} />
                  <span>โทรฉุกเฉิน</span>
                  <strong>{profile.emergency_phone || '-'}</strong>
                </a>
              </div>
              <div className="form-grid">
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={draft.needs}
                    onChange={(event) => setNotes({ ...notes, [profile.id]: { ...draft, needs: event.target.checked } })}
                  />
                  <span>ต้องดูแลเป็นพิเศษ</span>
                </label>
                <Input
                  label="Emergency note"
                  value={draft.note}
                  onChange={(event) => setNotes({ ...notes, [profile.id]: { ...draft, note: event.target.value } })}
                  placeholder="เช่น ให้พี่กลุ่มช่วยติดตาม / แจ้งพยาบาลแล้ว"
                />
                <div className="form-actions">
                  <Button icon={<Save size={18} />} onClick={() => save(profile)} disabled={!canEditHealthTools}>บันทึก note</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
