import { AlertTriangle, GitMerge, Link2, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { HelpButton } from '../components/help/HelpButton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import type { PeopleDuplicateGroup, PeopleDuplicateRecord, PeopleDuplicateResult, PeopleLinkedCounts } from '../lib/personTypes';
import { findPeopleDuplicates, mergePeopleRecords } from '../services/people';
import { errorMessage } from '../utils/error';

type MergeDraft = {
  group: PeopleDuplicateGroup;
  keepId: string;
  mergeId: string;
  note: string;
  confirmed: boolean;
};

function fmt(value: number | undefined) {
  return (value ?? 0).toLocaleString();
}

function displayName(row: PeopleDuplicateRecord) {
  return row.name_th || row.name_en || row.nickname || row.student_id || 'ไม่ระบุชื่อ';
}

function normalizeName(row: PeopleDuplicateRecord) {
  return (row.name_th || row.name_en || '').replace(/\s+/g, '').toLowerCase();
}

function linkedTotal(counts: PeopleLinkedCounts) {
  return counts.staff_profiles + counts.profiles + counts.staff_applications + counts.event_participants + counts.event_staff + counts.event_roles;
}

function groupLabel(type: string, language: 'th' | 'en') {
  if (type === 'student_id') return language === 'th' ? 'รหัสนักศึกษา' : 'Student ID';
  if (type === 'email') return language === 'th' ? 'อีเมล' : 'Email';
  if (type === 'phone') return language === 'th' ? 'เบอร์โทร' : 'Phone';
  if (type === 'name') return language === 'th' ? 'ชื่อคล้ายกัน' : 'Similar name';
  return type;
}

function PersonCard({ person, selectedTone }: { person: PeopleDuplicateRecord; selectedTone?: 'keep' | 'merge' }) {
  const linkCount = linkedTotal(person.linked_counts);
  return (
    <Card className="dedupe-person-card" variant={selectedTone === 'merge' ? 'warning' : selectedTone === 'keep' ? 'success' : 'soft'}>
      <div className="mobile-row-head">
        <div>
          <strong>{displayName(person)}</strong>
          <span>{person.student_id ?? '-'} · {person.major ?? '-'}{person.year_level ? ` · ปี ${person.year_level}` : ''}</span>
        </div>
        <Badge status={selectedTone === 'merge' ? 'pending' : 'approved'}>{selectedTone ?? person.source ?? '-'}</Badge>
      </div>
      <div className="dedupe-detail-grid">
        <span>Email</span><strong>{person.email ?? '-'}</strong>
        <span>Phone</span><strong>{person.phone ?? '-'}</strong>
        <span>Source</span><strong>{person.source ?? '-'}</strong>
        <span>Links</span><strong>{linkCount}</strong>
      </div>
    </Card>
  );
}

export function AdminPeopleDedupePage() {
  const { language } = useLanguage();
  const [data, setData] = useState<PeopleDuplicateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [draft, setDraft] = useState<MergeDraft | null>(null);

  const groups = useMemo(() => {
    if (!data) return [];
    return [
      ...(data.duplicate_student_ids ?? []),
      ...(data.duplicate_emails ?? []),
      ...(data.duplicate_phones ?? []),
      ...(data.duplicate_names ?? []),
    ];
  }, [data]);

  const keepPerson = draft?.group.people.find((person) => person.id === draft.keepId) ?? null;
  const mergePerson = draft?.group.people.find((person) => person.id === draft.mergeId) ?? null;
  const studentIdMismatch = Boolean(keepPerson?.student_id && mergePerson?.student_id && keepPerson.student_id !== mergePerson.student_id);
  const nameMismatch = Boolean(keepPerson && mergePerson && normalizeName(keepPerson) && normalizeName(mergePerson) && normalizeName(keepPerson) !== normalizeName(mergePerson));
  const canMerge = Boolean(draft?.confirmed && draft.keepId && draft.mergeId && draft.keepId !== draft.mergeId);

  async function loadData() {
    setLoading(true);
    try {
      setData(await findPeopleDuplicates());
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'โหลดข้อมูลซ้ำไม่สำเร็จ' : 'Could not load duplicates') });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openMerge(group: PeopleDuplicateGroup) {
    setDraft({
      group,
      keepId: group.people[0]?.id ?? '',
      mergeId: group.people[1]?.id ?? group.people[0]?.id ?? '',
      note: '',
      confirmed: false,
    });
  }

  async function submitMerge() {
    if (!draft || !canMerge) return;
    setMergeLoading(true);
    try {
      const result = await mergePeopleRecords(draft.keepId, draft.mergeId, draft.note);
      setToast({
        type: 'success',
        message: language === 'th'
          ? `รวมข้อมูลสำเร็จ: ย้ายลิงก์ ${Object.values(result.repointed).reduce((sum, value) => sum + Number(value ?? 0), 0)} รายการ`
          : 'People records merged successfully',
      });
      setDraft(null);
      await loadData();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'รวมข้อมูลไม่สำเร็จ กรุณาตรวจคำเตือนและลองใหม่' : 'Merge failed') });
    } finally {
      setMergeLoading(false);
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow={language === 'th' ? 'ข้อมูลกลาง' : 'Central records'}
        title={language === 'th' ? 'ตรวจข้อมูลซ้ำ' : 'Duplicate check'}
        description={language === 'th' ? 'ตรวจสอบและรวมข้อมูลบุคคลที่อาจซ้ำกันจากหลายแหล่ง เช่น Excel ปี 2 ข้อมูลทีมงานเดิม และใบสมัครกิจกรรม' : 'Review and safely merge possible duplicate people from year 2 Excel, legacy staff, participants, and event applications.'}
        meta={<Button variant="secondary" icon={<RefreshCw size={18} />} loading={loading} onClick={() => void loadData()}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>}
        actions={<HelpButton topicId="admin.people-dedupe" variant="link" />}
      />

      <Card className="workflow-explainer-card" variant="soft">
        <strong>{language === 'th' ? 'ตรวจข้อมูลซ้ำ' : 'Duplicate check'}</strong>
        <span>{language === 'th' ? 'รวม/ตรวจรายการที่อาจเป็นคนเดียวกัน' : 'Review records that may belong to the same person.'}</span>
      </Card>

      <div className="stats-grid">
        <DashboardStatCard label={language === 'th' ? 'รหัสซ้ำ' : 'Student ID groups'} value={fmt(data?.summary.duplicate_student_id_groups)} icon={<AlertTriangle size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'อีเมลซ้ำ' : 'Email groups'} value={fmt(data?.summary.duplicate_email_groups)} icon={<AlertTriangle size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'เบอร์ซ้ำ' : 'Phone groups'} value={fmt(data?.summary.duplicate_phone_groups)} icon={<AlertTriangle size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'ชื่อคล้ายกัน' : 'Similar names'} value={fmt(data?.summary.similar_name_groups)} icon={<UsersRound size={20} />} />
        <DashboardStatCard label={language === 'th' ? 'archived merged' : 'Merged records'} value={fmt(data?.summary.merged_records)} icon={<GitMerge size={20} />} />
      </div>

      <Card variant="warning">
        <div className="section-heading">
          <ShieldCheck size={22} />
          <div>
            <h2>{language === 'th' ? 'กติกาความปลอดภัย' : 'Safety rules'}</h2>
            <p>{language === 'th' ? 'ระบบจะไม่รวมให้อัตโนมัติ ต้องเลือก keep/merge และยืนยันเองทุกครั้ง ข้อมูลสุขภาพไม่ถูก merge ในเฟสนี้' : 'Nothing is merged automatically. Admins must select keep/merge and confirm each action. Health data is not merged in this phase.'}</p>
          </div>
        </div>
      </Card>

      <div className="dedupe-group-list">
        {groups.map((group) => (
          <Card key={`${group.group_type}-${group.match_value}`} className="dedupe-group-card">
            <div className="split-panel">
              <div>
                <p className="eyebrow">{groupLabel(group.group_type, language)}</p>
                <h2>{group.match_value}</h2>
                <p className="muted">{group.people.length} {language === 'th' ? 'รายการที่อาจเป็นคนเดียวกัน' : 'possible matching records'}</p>
              </div>
              <Button icon={<GitMerge size={18} />} disabled={group.people.length < 2} onClick={() => openMerge(group)}>
                {language === 'th' ? 'ตรวจและรวม' : 'Review merge'}
              </Button>
            </div>
            <div className="dedupe-person-grid">
              {group.people.map((person) => <PersonCard key={person.id} person={person} />)}
            </div>
          </Card>
        ))}
        {!loading && !groups.length ? (
          <Card variant="success">
            <div className="section-heading">
              <ShieldCheck size={22} />
              <div>
                <h2>{language === 'th' ? 'ไม่พบกลุ่มข้อมูลซ้ำ' : 'No duplicate groups found'}</h2>
                <p>{language === 'th' ? 'ยังควรตรวจข้อมูลจริงอีกครั้งก่อนเปิด workflow สำคัญ' : 'Still review real data before enabling critical workflows.'}</p>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      <Modal open={Boolean(draft)} title={language === 'th' ? 'ตรวจสอบก่อนรวมข้อมูล' : 'Review before merge'} onClose={() => setDraft(null)}>
        {draft ? (
          <div className="modal-body page-stack">
            <div className="form-grid two-col">
              <label className="field">
                <span>{language === 'th' ? 'เก็บ record นี้ไว้' : 'Keep record'}</span>
                <select value={draft.keepId} onChange={(event) => setDraft({ ...draft, keepId: event.target.value })}>
                  {draft.group.people.map((person) => <option key={person.id} value={person.id}>{displayName(person)} · {person.student_id ?? person.email ?? person.phone ?? person.id}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{language === 'th' ? 'รวม record นี้เข้า keep' : 'Merge this record'}</span>
                <select value={draft.mergeId} onChange={(event) => setDraft({ ...draft, mergeId: event.target.value })}>
                  {draft.group.people.map((person) => <option key={person.id} value={person.id}>{displayName(person)} · {person.student_id ?? person.email ?? person.phone ?? person.id}</option>)}
                </select>
              </label>
            </div>

            <div className="dedupe-person-grid">
              {keepPerson ? <PersonCard person={keepPerson} selectedTone="keep" /> : null}
              {mergePerson ? <PersonCard person={mergePerson} selectedTone="merge" /> : null}
            </div>

            {(studentIdMismatch || nameMismatch || draft.keepId === draft.mergeId) ? (
              <Card variant="warning">
                <strong>{language === 'th' ? 'คำเตือนก่อนรวม' : 'Merge warnings'}</strong>
                <ul className="compact-list">
                  {draft.keepId === draft.mergeId ? <li>{language === 'th' ? 'keep และ merge เป็น record เดียวกัน กรุณาเลือกคนละรายการ' : 'Keep and merge records must be different.'}</li> : null}
                  {studentIdMismatch ? <li>{language === 'th' ? 'รหัสนักศึกษาต่างกันทั้งสองรายการ กรุณาตรวจสอบจากต้นทาง' : 'Both records have different student IDs. Verify source data.'}</li> : null}
                  {nameMismatch ? <li>{language === 'th' ? 'ชื่อหลักต่างกัน ควรตรวจสอบว่าเป็นบุคคลเดียวกันจริง' : 'Names differ. Confirm this is the same person.'}</li> : null}
                </ul>
              </Card>
            ) : null}

            <Card variant="soft">
              <div className="section-heading">
                <Link2 size={20} />
                <div>
                  <h2>{language === 'th' ? 'สิ่งที่จะเกิดขึ้น' : 'What will happen'}</h2>
                  <p>{language === 'th' ? 'ลิงก์จาก staff_profiles, profiles, applications และ event records จะชี้ไปยัง record ที่เก็บไว้ ส่วน record ที่รวมจะถูก archive ไม่ hard delete' : 'Linked staff_profiles, profiles, applications, and event records point to the kept person. The merged record is archived, not hard deleted.'}</p>
                </div>
              </div>
            </Card>

            <Input label={language === 'th' ? 'บันทึกเหตุผล' : 'Merge note'} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder={language === 'th' ? 'เช่น ตรวจสอบจากรหัสนักศึกษาและอีเมลแล้ว' : 'Example: verified by student ID and email'} />
            <label className="check-field">
              <input type="checkbox" checked={draft.confirmed} onChange={(event) => setDraft({ ...draft, confirmed: event.target.checked })} />
              <span>{language === 'th' ? 'ฉันตรวจสอบแล้วว่าข้อมูลนี้เป็นบุคคลเดียวกัน' : 'I have verified these records belong to the same person'}</span>
            </label>
            <div className="form-actions">
              <Button variant="danger" icon={<GitMerge size={18} />} loading={mergeLoading} disabled={!canMerge} onClick={submitMerge}>{language === 'th' ? 'ยืนยันการรวม' : 'Confirm merge'}</Button>
              <Button variant="secondary" onClick={() => setDraft(null)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
