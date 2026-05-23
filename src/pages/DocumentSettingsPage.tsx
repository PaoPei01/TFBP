import { Plus, Save, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { EventSwitcher } from '../components/events/EventSwitcher';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useEventContext } from '../context/EventContext';
import { durationMinutes, timeRange } from '../lib/documentGeneration';
import type { DocumentBudgetItem, DocumentEquipmentItem, DocumentProjectProfile, DocumentScheduleItem, DocumentVenue, EquipmentStatus } from '../lib/documentTypes';
import { useAsync } from '../hooks/useAsync';
import { fetchDocumentCenterData, saveProjectProfile } from '../services/documents';
import { errorMessage } from '../utils/error';

const blankProfile: Partial<DocumentProjectProfile> = {
  project_name: 'สานสัมพันธ์ 69 Entaneer Bonding 69',
  academic_year: '2569',
  organizer: 'คณะวิศวกรรมศาสตร์',
  department: 'มหาวิทยาลัยเชียงใหม่',
};
const equipmentStatuses: EquipmentStatus[] = ['draft', 'requested', 'borrowed', 'returned', 'incomplete'];

export function DocumentSettingsPage() {
  const { currentEventId } = useEventContext();
  const state = useAsync(() => fetchDocumentCenterData(currentEventId), [currentEventId]);
  const [profile, setProfile] = useState<Partial<DocumentProjectProfile>>(blankProfile);
  const [budgetItems, setBudgetItems] = useState<Array<Partial<DocumentBudgetItem>>>([]);
  const [scheduleItems, setScheduleItems] = useState<Array<Partial<DocumentScheduleItem>>>([]);
  const [venues, setVenues] = useState<Array<Partial<DocumentVenue>>>([]);
  const [equipmentItems, setEquipmentItems] = useState<Array<Partial<DocumentEquipmentItem>>>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const budgetTotal = useMemo(() => budgetItems.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0), 0), [budgetItems]);
  const participantTotal = Number(profile.freshmen_count ?? 0) + Number(profile.staff_count ?? 0);
  const scheduleErrors = scheduleItems
    .map((item, index) => item.start_time && item.end_time && durationMinutes(item.start_time, item.end_time) == null ? `แถวกำหนดการ ${index + 1}: เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม` : '')
    .filter(Boolean);

  useEffect(() => {
    if (!state.data) return;
    setProfile(state.data.profile ?? blankProfile);
    setBudgetItems(state.data.budgetItems.length ? state.data.budgetItems : [{ item_name: '', quantity: 1, unit: '', unit_price: 0, notes: '' }]);
    setScheduleItems(state.data.scheduleItems.length ? state.data.scheduleItems : [{ title: '', item_date: '', start_time: '', end_time: '', location: '', responsible_team: '', sort_order: 1 }]);
    setVenues(state.data.venues.length ? state.data.venues : [{ name: '', use_date: '', start_time: '', end_time: '', purpose: '', participant_count: null, needs_electricity: false, needs_sound_system: false, needs_air_conditioning: false, needs_cleaning_staff: false }]);
    setEquipmentItems(state.data.equipmentItems.length ? state.data.equipmentItems : [{ name: '', quantity: 1, unit: '', borrow_date: '', return_date: '', use_location: '', responsible_person: '', status: 'draft' }]);
  }, [state.data]);

  async function save() {
    if (scheduleErrors.length) return setToast({ type: 'error', message: scheduleErrors[0] });
    try {
      setSaving(true);
      await saveProjectProfile({ profile: { ...profile, event_id: currentEventId }, budgetItems, scheduleItems: scheduleItems.map((item) => ({ ...item, time_range: timeRange(item.start_time, item.end_time), duration_minutes: durationMinutes(item.start_time, item.end_time) })), venues, equipmentItems });
      setToast({ type: 'success', message: 'บันทึกข้อมูลศูนย์เอกสารแล้ว' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'บันทึกไม่สำเร็จ') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader eyebrow="Document Center" title="ตั้งค่าโครงการ" description="ข้อมูลนี้จะถูกนำไปเติมใน DOCX template ด้วย placeholder มาตรฐานตัวพิมพ์เล็ก" meta={<EventSwitcher compact />} />
      {state.loading ? <LoadingSkeleton /> : null}
      <Card className="form-grid two-col">
        <Input label="ชื่อโครงการ {project_name}" value={profile.project_name ?? ''} onChange={(event) => setProfile({ ...profile, project_name: event.target.value })} />
        <Input label="รหัสโครงการ" value={profile.project_code ?? ''} onChange={(event) => setProfile({ ...profile, project_code: event.target.value })} />
        <Input label="ปีการศึกษา" value={profile.academic_year ?? ''} onChange={(event) => setProfile({ ...profile, academic_year: event.target.value })} />
        <Input label="ผู้จัด/หน่วยงาน" value={profile.organizer ?? ''} onChange={(event) => setProfile({ ...profile, organizer: event.target.value })} />
        <Input label="ฝ่าย/หน่วยงาน" value={profile.department ?? ''} onChange={(event) => setProfile({ ...profile, department: event.target.value })} />
        <Input label="สถานที่ {location}" value={profile.location ?? ''} onChange={(event) => setProfile({ ...profile, location: event.target.value })} />
        <Input label="วันที่จัดกิจกรรม {event_date_th}" type="date" value={profile.event_date ?? profile.start_date ?? ''} onChange={(event) => setProfile({ ...profile, event_date: event.target.value, start_date: event.target.value })} />
        <Input label="วันที่เอกสาร" type="date" value={profile.document_date ?? ''} onChange={(event) => setProfile({ ...profile, document_date: event.target.value })} />
        <Input label="เวลาเริ่ม" type="time" value={profile.event_start_time ?? ''} onChange={(event) => setProfile({ ...profile, event_start_time: event.target.value })} />
        <Input label="เวลาสิ้นสุด" type="time" value={profile.event_end_time ?? ''} onChange={(event) => setProfile({ ...profile, event_end_time: event.target.value })} />
        <Input label="จำนวนน้องปีหนึ่ง {freshmen_count}" type="number" value={profile.freshmen_count ?? ''} onChange={(event) => setProfile({ ...profile, freshmen_count: Number(event.target.value) })} />
        <Input label="จำนวนทีมงาน {staff_count}" type="number" value={profile.staff_count ?? ''} onChange={(event) => setProfile({ ...profile, staff_count: Number(event.target.value) })} />
        <Input label="จำนวนรวม {total_participants}" type="number" value={profile.total_participants ?? (participantTotal || '')} onChange={(event) => setProfile({ ...profile, total_participants: Number(event.target.value) })} />
        <Input label="งบรวม {budget_total}" value={budgetTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} readOnly />
        <Input label="ผู้ประสานงาน {coordinator_name}" value={profile.coordinator_name ?? profile.contact_name ?? ''} onChange={(event) => setProfile({ ...profile, coordinator_name: event.target.value, contact_name: event.target.value })} />
        <Input label="เบอร์ผู้ประสานงาน {coordinator_phone}" value={profile.coordinator_phone ?? profile.contact_phone ?? ''} onChange={(event) => setProfile({ ...profile, coordinator_phone: event.target.value, contact_phone: event.target.value })} />
        <Input label="อีเมลผู้ประสานงาน" type="email" value={profile.coordinator_email ?? ''} onChange={(event) => setProfile({ ...profile, coordinator_email: event.target.value })} />
        <Input label="แหล่งงบประมาณ" value={profile.budget_source ?? ''} onChange={(event) => setProfile({ ...profile, budget_source: event.target.value })} />
        <Input label="อาจารย์ที่ปรึกษา {advisor_name}" value={profile.advisor_name ?? ''} onChange={(event) => setProfile({ ...profile, advisor_name: event.target.value })} />
        <Input label="ตำแหน่งอาจารย์ที่ปรึกษา" value={profile.advisor_position ?? ''} onChange={(event) => setProfile({ ...profile, advisor_position: event.target.value })} />
        <Input label="ประธานโครงการ {project_chair_name}" value={profile.project_chair_name ?? ''} onChange={(event) => setProfile({ ...profile, project_chair_name: event.target.value })} />
        <Input label="ตำแหน่งประธานโครงการ" value={profile.project_chair_position ?? ''} onChange={(event) => setProfile({ ...profile, project_chair_position: event.target.value })} />
        <Input label="ผู้ลงนาม" value={profile.signing_person_name ?? ''} onChange={(event) => setProfile({ ...profile, signing_person_name: event.target.value })} />
        <Input label="ตำแหน่งผู้ลงนาม" value={profile.signing_person_position ?? ''} onChange={(event) => setProfile({ ...profile, signing_person_position: event.target.value })} />
        <Textarea label="หลักการและเหตุผล {rationale}" value={profile.rationale ?? ''} onChange={(value) => setProfile({ ...profile, rationale: value })} />
        <Textarea label="วัตถุประสงค์ {objectives}" value={profile.objectives ?? profile.objective ?? ''} onChange={(value) => setProfile({ ...profile, objectives: value, objective: value })} />
        <Textarea label="ผลที่คาดว่าจะได้รับ {expected_outcomes}" value={profile.expected_outcomes ?? ''} onChange={(value) => setProfile({ ...profile, expected_outcomes: value })} />
        <Textarea label="ตัวชี้วัด/ผลประเมิน {kpi_summary}" value={profile.kpi_summary ?? ''} onChange={(value) => setProfile({ ...profile, kpi_summary: value })} />
        <Textarea label="แผนความเสี่ยง {risk_plan}" value={profile.risk_plan ?? ''} onChange={(value) => setProfile({ ...profile, risk_plan: value })} />
      </Card>

      <EditableSection title={`งบประมาณ รวม ${budgetTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`} onAdd={() => setBudgetItems([...budgetItems, { item_name: '', quantity: 1, unit_price: 0, notes: '' }])}>
        {budgetItems.map((item, index) => {
          const amount = Number(item.quantity ?? 0) * Number(item.unit_price ?? 0);
          return (
            <div className="document-row-grid budget-grid" key={index}>
              <Input label="รายการ" value={item.item_name ?? ''} onChange={(event) => setBudgetItems(budgetItems.map((row, i) => i === index ? { ...row, item_name: event.target.value } : row))} />
              <Input label="จำนวน" type="number" value={item.quantity ?? ''} onChange={(event) => setBudgetItems(budgetItems.map((row, i) => i === index ? { ...row, quantity: Number(event.target.value) } : row))} />
              <Input label="หน่วย" value={item.unit ?? ''} onChange={(event) => setBudgetItems(budgetItems.map((row, i) => i === index ? { ...row, unit: event.target.value } : row))} />
              <Input label="ราคาต่อหน่วย" type="number" value={item.unit_price ?? ''} onChange={(event) => setBudgetItems(budgetItems.map((row, i) => i === index ? { ...row, unit_price: Number(event.target.value) } : row))} />
              <Input label="รวม" value={amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} readOnly />
              <Input label="หมายเหตุ" value={item.notes ?? ''} onChange={(event) => setBudgetItems(budgetItems.map((row, i) => i === index ? { ...row, notes: event.target.value } : row))} />
              <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => setBudgetItems(budgetItems.filter((_, i) => i !== index))}>ลบ</Button>
            </div>
          );
        })}
      </EditableSection>

      <EditableSection title="กำหนดการ" onAdd={() => setScheduleItems([...scheduleItems, { title: '', item_date: profile.event_date ?? '', start_time: '', end_time: '', sort_order: scheduleItems.length + 1 }])}>
        {scheduleItems.map((item, index) => (
          <div className="document-row-grid schedule-grid" key={index}>
            <Input label="ลำดับ" type="number" value={item.sort_order ?? index + 1} onChange={(event) => setScheduleItems(scheduleItems.map((row, i) => i === index ? { ...row, sort_order: Number(event.target.value) } : row))} />
            <Input label="วันที่" type="date" value={item.item_date ?? ''} onChange={(event) => setScheduleItems(scheduleItems.map((row, i) => i === index ? { ...row, item_date: event.target.value } : row))} />
            <Input label="เริ่ม" type="time" value={item.start_time ?? ''} onChange={(event) => setScheduleItems(scheduleItems.map((row, i) => i === index ? { ...row, start_time: event.target.value } : row))} />
            <Input label="สิ้นสุด" type="time" value={item.end_time ?? ''} onChange={(event) => setScheduleItems(scheduleItems.map((row, i) => i === index ? { ...row, end_time: event.target.value } : row))} />
            <Input label="กิจกรรม" value={item.title ?? ''} onChange={(event) => setScheduleItems(scheduleItems.map((row, i) => i === index ? { ...row, title: event.target.value } : row))} />
            <Input label="สถานที่" value={item.location ?? ''} onChange={(event) => setScheduleItems(scheduleItems.map((row, i) => i === index ? { ...row, location: event.target.value } : row))} />
            <Input label="ทีมรับผิดชอบ" value={item.responsible_team ?? item.responsible ?? ''} onChange={(event) => setScheduleItems(scheduleItems.map((row, i) => i === index ? { ...row, responsible_team: event.target.value, responsible: event.target.value } : row))} />
            <Input label="ช่วงเวลา" value={timeRange(item.start_time, item.end_time)} readOnly />
            <Input label="นาที" value={durationMinutes(item.start_time, item.end_time) ?? ''} readOnly />
            <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => setScheduleItems(scheduleItems.filter((_, i) => i !== index))}>ลบ</Button>
          </div>
        ))}
      </EditableSection>

      <EditableSection title="สถานที่" onAdd={() => setVenues([...venues, { name: '', use_date: profile.event_date ?? '', needs_electricity: false, needs_sound_system: false, needs_air_conditioning: false, needs_cleaning_staff: false }])}>
        {venues.map((item, index) => (
          <div className="document-row-grid venue-grid" key={index}>
            <Input label="ชื่อสถานที่" value={item.name ?? ''} onChange={(event) => setVenues(venues.map((row, i) => i === index ? { ...row, name: event.target.value } : row))} />
            <Input label="วันที่ใช้" type="date" value={item.use_date ?? ''} onChange={(event) => setVenues(venues.map((row, i) => i === index ? { ...row, use_date: event.target.value } : row))} />
            <Input label="เริ่ม" type="time" value={item.start_time ?? ''} onChange={(event) => setVenues(venues.map((row, i) => i === index ? { ...row, start_time: event.target.value } : row))} />
            <Input label="สิ้นสุด" type="time" value={item.end_time ?? ''} onChange={(event) => setVenues(venues.map((row, i) => i === index ? { ...row, end_time: event.target.value } : row))} />
            <Input label="วัตถุประสงค์" value={item.purpose ?? ''} onChange={(event) => setVenues(venues.map((row, i) => i === index ? { ...row, purpose: event.target.value } : row))} />
            <Input label="จำนวนคน" type="number" value={item.participant_count ?? ''} onChange={(event) => setVenues(venues.map((row, i) => i === index ? { ...row, participant_count: Number(event.target.value) } : row))} />
            <Checkbox label="ไฟฟ้า" checked={Boolean(item.needs_electricity)} onChange={(checked) => setVenues(venues.map((row, i) => i === index ? { ...row, needs_electricity: checked } : row))} />
            <Checkbox label="เครื่องเสียง" checked={Boolean(item.needs_sound_system)} onChange={(checked) => setVenues(venues.map((row, i) => i === index ? { ...row, needs_sound_system: checked } : row))} />
            <Checkbox label="แอร์" checked={Boolean(item.needs_air_conditioning)} onChange={(checked) => setVenues(venues.map((row, i) => i === index ? { ...row, needs_air_conditioning: checked } : row))} />
            <Checkbox label="แม่บ้าน" checked={Boolean(item.needs_cleaning_staff)} onChange={(checked) => setVenues(venues.map((row, i) => i === index ? { ...row, needs_cleaning_staff: checked } : row))} />
            <Input label="หมายเหตุ" value={item.note ?? item.notes ?? ''} onChange={(event) => setVenues(venues.map((row, i) => i === index ? { ...row, note: event.target.value, notes: event.target.value } : row))} />
            <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => setVenues(venues.filter((_, i) => i !== index))}>ลบ</Button>
          </div>
        ))}
      </EditableSection>

      <EditableSection title="อุปกรณ์" onAdd={() => setEquipmentItems([...equipmentItems, { name: '', quantity: 1, unit: '', status: 'draft' }])}>
        {equipmentItems.map((item, index) => (
          <div className="document-row-grid equipment-grid" key={index}>
            <Input label="อุปกรณ์" value={item.name ?? ''} onChange={(event) => setEquipmentItems(equipmentItems.map((row, i) => i === index ? { ...row, name: event.target.value } : row))} />
            <Input label="จำนวน" type="number" value={item.quantity ?? ''} onChange={(event) => setEquipmentItems(equipmentItems.map((row, i) => i === index ? { ...row, quantity: Number(event.target.value) } : row))} />
            <Input label="หน่วย" value={item.unit ?? ''} onChange={(event) => setEquipmentItems(equipmentItems.map((row, i) => i === index ? { ...row, unit: event.target.value } : row))} />
            <Input label="วันที่ยืม" type="date" value={item.borrow_date ?? ''} onChange={(event) => setEquipmentItems(equipmentItems.map((row, i) => i === index ? { ...row, borrow_date: event.target.value } : row))} />
            <Input label="วันที่คืน" type="date" value={item.return_date ?? ''} onChange={(event) => setEquipmentItems(equipmentItems.map((row, i) => i === index ? { ...row, return_date: event.target.value } : row))} />
            <Input label="สถานที่ใช้" value={item.use_location ?? ''} onChange={(event) => setEquipmentItems(equipmentItems.map((row, i) => i === index ? { ...row, use_location: event.target.value } : row))} />
            <Input label="ผู้รับผิดชอบ" value={item.responsible_person ?? item.responsible ?? ''} onChange={(event) => setEquipmentItems(equipmentItems.map((row, i) => i === index ? { ...row, responsible_person: event.target.value, responsible: event.target.value } : row))} />
            <Select label="สถานะ" value={item.status ?? 'draft'} options={equipmentStatuses} onChange={(event) => setEquipmentItems(equipmentItems.map((row, i) => i === index ? { ...row, status: event.target.value as EquipmentStatus } : row))} />
            <Input label="หมายเหตุ" value={item.note ?? item.notes ?? ''} onChange={(event) => setEquipmentItems(equipmentItems.map((row, i) => i === index ? { ...row, note: event.target.value, notes: event.target.value } : row))} />
            <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => setEquipmentItems(equipmentItems.filter((_, i) => i !== index))}>ลบ</Button>
          </div>
        ))}
      </EditableSection>

      <div className="sticky-form-actions">
        <Button icon={<Save size={18} />} onClick={save} disabled={saving}>บันทึกข้อมูลโครงการ</Button>
      </div>
    </section>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field full-span"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="field checkbox-field"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function EditableSection({ title, onAdd, children }: { title: string; onAdd: () => void; children: ReactNode }) {
  return (
    <Card className="document-edit-section">
      <div className="staff-section-head">
        <h2>{title}</h2>
        <Button variant="secondary" icon={<Plus size={16} />} onClick={onAdd}>เพิ่ม</Button>
      </div>
      {children}
    </Card>
  );
}
