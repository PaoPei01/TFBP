import { Save, SearchCheck, Send } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { PublicStaffCard } from '../components/PublicStaffCard';
import { StickyActionBar } from '../components/mobile/StickyActionBar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { groupLabel } from '../lib/grouping';
import { submitStaffEditRequestVerified, updateStaffPublicProfileVerified, verifyStaffIdentity, staffDisplayName, type StaffPublicProfileInput, type VerifiedStaffProfileContext } from '../services/staffProfiles';
import { errorMessage } from '../utils/error';

export function StaffProfileVerifyPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [data, setData] = useState<VerifiedStaffProfileContext | null>(null);
  const [form, setForm] = useState<StaffPublicProfileInput & { instagram?: string | null; facebook?: string | null }>({ interests: [] });
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ phone: '', line_id: '', disease: '', drug_allergy: '', food_allergy: '', medical_note: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const mergedForm = useMemo(() => ({ ...(data?.public_profile ?? {}), instagram: data?.profile.instagram ?? '', facebook: data?.profile.facebook ?? '', ...form }), [data, form]);
  const preview = data ? {
    staff_profile_id: data.profile.id,
    avatar_path: mergedForm.avatar_path ?? null,
    avatar_url: mergedForm.avatar_url ?? null,
    nickname: data.profile.nickname,
    nickname_th: data.profile.nickname_th,
    nickname_en: data.profile.nickname_en,
    name_th: data.profile.name_th,
    name_en: data.profile.name_en,
    position: data.profile.position,
    primary_role: data.assignment?.primary_role ?? null,
    main_group: data.assignment?.main_group ?? null,
    subgroup: data.assignment?.subgroup ?? null,
    base_number: data.assignment?.base_number ?? null,
    bio: mergedForm.bio ?? null,
    interests: mergedForm.interests ?? [],
    instagram: mergedForm.show_instagram ? mergedForm.instagram ?? null : null,
    line_id: null,
    facebook: mergedForm.show_facebook ? mergedForm.facebook ?? null : null,
    phone: null,
  } : null;

  function patch(values: StaffPublicProfileInput & { instagram?: string | null; facebook?: string | null }) {
    setForm((current) => ({ ...current, ...values }));
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      const result = await verifyStaffIdentity(email, phone);
      if (!result) {
        setToast({ type: 'error', message: 'ไม่พบข้อมูลทีมงานที่ตรงกับอีเมลและเบอร์โทรนี้' });
        return;
      }
      setData(result);
      setForm({
        avatar_path: result.public_profile?.avatar_path ?? null,
        avatar_url: result.public_profile?.avatar_url ?? '',
        bio: result.public_profile?.bio ?? '',
        hometown: result.public_profile?.hometown ?? '',
        interests: result.public_profile?.interests ?? [],
        public_profile_enabled: result.public_profile?.public_profile_enabled ?? true,
        show_instagram: result.public_profile?.show_instagram ?? false,
        show_facebook: result.public_profile?.show_facebook ?? false,
        show_line_id: result.public_profile?.show_line_id ?? false,
        show_phone_to_staff: result.public_profile?.show_phone_to_staff ?? true,
        show_phone_to_public: result.public_profile?.show_phone_to_public ?? false,
        instagram: result.profile.instagram ?? '',
        facebook: result.profile.facebook ?? '',
      });
      setToast({ type: 'success', message: language === 'th' ? 'ยืนยันข้อมูลทีมงานสำเร็จ' : 'Staff profile verified' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ยืนยันข้อมูลไม่สำเร็จ' : 'Verification failed') });
    } finally {
      setLoading(false);
    }
  }

  async function savePublic(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    try {
      const result = await updateStaffPublicProfileVerified(email, phone, mergedForm);
      setData(result);
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกโปรไฟล์ทีมงานแล้ว' : 'Staff profile saved' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed') });
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest() {
    setLoading(true);
    try {
      await submitStaffEditRequestVerified(email, phone, {
        profile: { phone: requestForm.phone, line_id: requestForm.line_id },
        medical: { disease: requestForm.disease, drug_allergy: requestForm.drug_allergy, food_allergy: requestForm.food_allergy, medical_note: requestForm.medical_note },
      });
      setRequestOpen(false);
      setToast({ type: 'success', message: language === 'th' ? 'ส่งคำขอแก้ไขแล้ว รอแอดมินอนุมัติ' : 'Request submitted for admin approval' });
      const refreshed = await verifyStaffIdentity(email, phone);
      setData(refreshed);
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ส่งคำขอไม่สำเร็จ' : 'Request failed') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="narrow-page page-stack has-sticky-actions">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Staff Profile Verify"
        title={language === 'th' ? 'แก้ไขโปรไฟล์ทีมงาน' : 'Edit Staff Profile'}
        description={language === 'th' ? 'หน้านี้สำหรับทีมงานรายบุคคลที่ต้องการแก้ไขโปรไฟล์ของตัวเอง ไม่ใช่บัญชีเข้าสู่ระบบทีมงานสำหรับปฏิบัติงาน' : 'This page is for individual staff profile updates, not operational staff login.'}
        meta={(
          <>
            <HelpButton topicId="staff.profile-verify" variant="link" />
            <Link className="btn btn-secondary" to="/login">{language === 'th' ? 'เข้าสู่ระบบทีมงาน' : 'Staff Login'}</Link>
          </>
        )}
      />
      <Card>
        <form className="form-grid" onSubmit={verify}>
          <Input label={language === 'th' ? 'อีเมล' : 'Email'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} value={phone} onChange={(event) => setPhone(event.target.value)} required />
          <Button type="submit" disabled={loading} icon={<SearchCheck size={18} />}>{language === 'th' ? 'ตรวจสอบโปรไฟล์' : 'Verify profile'}</Button>
        </form>
      </Card>

      {data ? (
        <>
          <Card>
            <h2>{staffDisplayName(data.profile)}</h2>
            <p>{data.profile.name_th || data.profile.name_en} · {data.profile.major || '-'}</p>
            <p>{data.assignment ? groupLabel(data.assignment.main_group, data.assignment.subgroup, language) : '-'}</p>
          </Card>
          <div className="dashboard-grid">
            <Card>
              <h2>{language === 'th' ? 'ตัวอย่างที่น้องเห็น' : 'Public preview'}</h2>
              {preview ? <PublicStaffCard staff={preview} /> : null}
            </Card>
            <Card>
              <form className="form-grid" onSubmit={savePublic}>
                <Card className="privacy-notice full-span" variant="soft">
                  <strong>{language === 'th' ? 'โปรไฟล์พื้นฐานแบบปลอดภัย' : 'Safe Public Lite profile'}</strong>
                  <span>{language === 'th' ? 'โปรไฟล์พื้นฐานของพี่อาจแสดงให้น้องเห็น เช่น ชื่อเล่นและหน้าที่ แต่ช่องทางติดต่อจะซ่อนไว้จนกว่าพี่จะเลือกเปิดเอง' : 'Your basic staff profile may be visible to participants, but contact channels stay hidden until you choose to show them.'}</span>
                  <HelpButton topicId="staff.profile-verify" variant="compact" />
                </Card>
                <Card className="privacy-notice full-span" variant="soft">
                  <strong>{language === 'th' ? 'การอัปโหลดรูป' : 'Profile photo upload'}</strong>
                  <span>{language === 'th' ? 'เพื่อความปลอดภัย การอัปโหลดไฟล์รูปทำได้หลังเข้าสู่ระบบทีมงาน หรือให้แอดมินอัปโหลดให้เท่านั้น หน้านี้ยังแก้ Bio/ความสนใจ/การมองเห็นได้ตามปกติ' : 'For security, image file upload is available after staff login or by admin. This verified page can still edit bio, interests, and visibility settings.'}</span>
                </Card>
                <h3 className="full-span form-section-title">{language === 'th' ? 'โปรไฟล์สาธารณะ' : 'Public profile'}</h3>
                <label className="field">
                  <span>Bio</span>
                  <textarea rows={4} value={mergedForm.bio ?? ''} onChange={(event) => patch({ bio: event.target.value })} />
                </label>
                <Input label={language === 'th' ? 'ภูมิลำเนา' : 'Hometown'} value={mergedForm.hometown ?? ''} onChange={(event) => patch({ hometown: event.target.value })} />
                <Input label={language === 'th' ? 'ความสนใจ (คั่นด้วย comma)' : 'Interests'} value={(mergedForm.interests ?? []).join(', ')} onChange={(event) => patch({ interests: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
                <Input label="Instagram" value={mergedForm.instagram ?? ''} onChange={(event) => patch({ instagram: event.target.value })} />
                <Input label="Facebook" value={mergedForm.facebook ?? ''} onChange={(event) => patch({ facebook: event.target.value })} />
                <h3 className="full-span form-section-title">{language === 'th' ? 'การมองเห็นข้อมูล' : 'Visibility'}</h3>
                {[
                  ['public_profile_enabled', language === 'th' ? 'เปิด/ปิดโปรไฟล์พื้นฐาน' : 'Basic profile on/off'],
                  ['show_instagram', language === 'th' ? 'แสดง Instagram' : 'Show Instagram'],
                  ['show_line_id', language === 'th' ? 'แสดง LINE' : 'Show LINE'],
                  ['show_facebook', language === 'th' ? 'แสดง Facebook' : 'Show Facebook'],
                ].map(([key, label]) => (
                  <label className="check-field" key={key}>
                    <input type="checkbox" checked={Boolean(mergedForm[key as keyof typeof mergedForm])} onChange={(event) => patch({ [key]: event.target.checked } as StaffPublicProfileInput)} />
                    <span>{label}</span>
                  </label>
                ))}
                <div className="form-actions">
                  <Button type="submit" disabled={loading} icon={<Save size={18} />}>{language === 'th' ? 'บันทึกโปรไฟล์' : 'Save profile'}</Button>
                  <Button type="button" variant="secondary" icon={<Send size={18} />} onClick={() => setRequestOpen(true)}>{language === 'th' ? 'ขอแก้ไขข้อมูลสำคัญ' : 'Request sensitive update'}</Button>
                </div>
              </form>
            </Card>
          </div>
        </>
      ) : null}

      {data ? (
        <StickyActionBar label={language === 'th' ? 'บันทึกโปรไฟล์ทีมงาน' : 'Save staff profile'}>
          <Button disabled={loading} icon={<Save size={18} />} onClick={() => void savePublic()}>{language === 'th' ? 'บันทึก' : 'Save'}</Button>
        </StickyActionBar>
      ) : null}

      <Modal open={requestOpen} title={language === 'th' ? 'ขอแก้ไขข้อมูลสำคัญ' : 'Request sensitive changes'} onClose={() => setRequestOpen(false)}>
        <div className="form-grid two-col modal-body">
          <h3 className="full-span">{language === 'th' ? 'ข้อมูลติดต่อ' : 'Contact'}</h3>
          <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} value={requestForm.phone} onChange={(event) => setRequestForm({ ...requestForm, phone: event.target.value })} />
          <Input label="LINE ID" value={requestForm.line_id} onChange={(event) => setRequestForm({ ...requestForm, line_id: event.target.value })} />
          <h3 className="full-span">{language === 'th' ? 'ข้อมูลสุขภาพ' : 'Medical'}</h3>
          <Input label={language === 'th' ? 'โรคประจำตัว' : 'Medical condition'} value={requestForm.disease} onChange={(event) => setRequestForm({ ...requestForm, disease: event.target.value })} />
          <Input label={language === 'th' ? 'แพ้ยา' : 'Drug allergy'} value={requestForm.drug_allergy} onChange={(event) => setRequestForm({ ...requestForm, drug_allergy: event.target.value })} />
          <Input label={language === 'th' ? 'แพ้อาหาร' : 'Food allergy'} value={requestForm.food_allergy} onChange={(event) => setRequestForm({ ...requestForm, food_allergy: event.target.value })} />
          <Input label={language === 'th' ? 'หมายเหตุสุขภาพ/ฉุกเฉิน' : 'Medical/emergency note'} value={requestForm.medical_note} onChange={(event) => setRequestForm({ ...requestForm, medical_note: event.target.value })} />
          <Card className="privacy-notice full-span">
            <strong>{language === 'th' ? 'ข้อมูลสุขภาพเป็นข้อมูลส่วนตัว' : 'Health details are private'}</strong>
            <span>{language === 'th' ? 'การส่งคำขอนี้จะยังไม่อัปเดตทันที ต้องรอแอดมินอนุมัติก่อน' : 'This request will not update immediately. Admin approval is required.'}</span>
          </Card>
          <div className="form-actions full-span">
            <Button disabled={loading} icon={<Send size={18} />} onClick={submitRequest}>{language === 'th' ? 'ส่งคำขอ' : 'Submit request'}</Button>
            <Button variant="secondary" onClick={() => setRequestOpen(false)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
