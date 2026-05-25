import { Save, Send } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { PublicStaffCard } from '../components/PublicStaffCard';
import { StickyActionBar } from '../components/mobile/StickyActionBar';
import { AvatarUploadCard } from '../components/ui/AvatarUploadCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { fetchMyStaffProfile, staffDisplayName, submitStaffEditRequest, updateMyStaffPublicProfile, type StaffPublicProfileInput } from '../services/staffProfiles';
import { removeStaffAvatar, resolveStaffAvatarUrl, uploadStaffAvatar } from '../services/staffAvatar';
import { errorMessage } from '../utils/error';

const requestFieldLabels: Record<string, { th: string; en: string; type?: 'tel' }> = {
  phone: { th: 'เบอร์โทร', en: 'Phone', type: 'tel' },
  line_id: { th: 'LINE ID', en: 'LINE ID' },
  instagram: { th: 'Instagram', en: 'Instagram' },
  facebook: { th: 'Facebook', en: 'Facebook' },
  disease: { th: 'โรคประจำตัว', en: 'Medical condition' },
  drug_allergy: { th: 'แพ้ยา', en: 'Drug allergy' },
  food_allergy: { th: 'แพ้อาหาร', en: 'Food allergy' },
  medical_note: { th: 'หมายเหตุสุขภาพ', en: 'Medical note' },
};

export function StaffProfileEditPage() {
  const { language } = useLanguage();
  const state = useAsync(fetchMyStaffProfile, []);
  const [toast, setToast] = useState<ToastState>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ phone: '', line_id: '', instagram: '', facebook: '', disease: '', drug_allergy: '', food_allergy: '', medical_note: '' });
  const [form, setForm] = useState<StaffPublicProfileInput>({
    interests: [],
  });

  const mergedForm = useMemo(() => ({ ...(state.data?.public_profile ?? {}), ...form }), [form, state.data?.public_profile]);
  const preview = state.data ? {
    staff_profile_id: state.data.profile.id,
    avatar_path: mergedForm.avatar_path ?? null,
    avatar_url: mergedForm.avatar_url ?? null,
    nickname: state.data.profile.nickname,
    nickname_th: state.data.profile.nickname_th,
    nickname_en: state.data.profile.nickname_en,
    name_th: state.data.profile.name_th,
    name_en: state.data.profile.name_en,
    position: state.data.profile.position,
    primary_role: state.data.assignment?.primary_role ?? null,
    main_group: state.data.assignment?.main_group ?? null,
    subgroup: state.data.assignment?.subgroup ?? null,
    base_number: state.data.assignment?.base_number ?? null,
    bio: mergedForm.bio ?? null,
    interests: mergedForm.interests ?? [],
    instagram: mergedForm.show_instagram ? state.data.profile.instagram : null,
    line_id: mergedForm.show_line_id ? state.data.profile.line_id : null,
    facebook: mergedForm.show_facebook ? state.data.profile.facebook : null,
    phone: null,
  } : null;

  useEffect(() => {
    let active = true;
    void resolveStaffAvatarUrl(mergedForm).then((url) => {
      if (active) setAvatarDisplayUrl(url);
    });
    return () => {
      active = false;
    };
  }, [mergedForm]);

  function patch(values: StaffPublicProfileInput) {
    setForm((current) => ({ ...current, ...values }));
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setSaving(true);
    try {
      await updateMyStaffPublicProfile(mergedForm);
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกโปรไฟล์ทีมงานแล้ว' : 'Staff profile saved' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed') });
    } finally {
      setSaving(false);
    }
  }

  async function submitSensitiveRequest() {
    try {
      await submitStaffEditRequest({
        profile: {
          phone: requestForm.phone,
          line_id: requestForm.line_id,
          instagram: requestForm.instagram,
          facebook: requestForm.facebook,
        },
        medical: {
          disease: requestForm.disease,
          drug_allergy: requestForm.drug_allergy,
          food_allergy: requestForm.food_allergy,
          medical_note: requestForm.medical_note,
        },
      });
      setToast({ type: 'success', message: language === 'th' ? 'ส่งคำขอแก้ไขแล้ว รอแอดมินอนุมัติ' : 'Request submitted for admin approval' });
      setRequestOpen(false);
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ส่งคำขอไม่สำเร็จ' : 'Request failed') });
    }
  }

  async function uploadAvatar(file: File | null) {
    if (!file || !state.data) return;
    setUploadingAvatar(true);
    try {
      const result = await uploadStaffAvatar(state.data.profile.id, file);
      patch({ avatar_path: result.avatar_path });
      setAvatarDisplayUrl(result.signedUrl);
      setToast({ type: 'success', message: language === 'th' ? 'อัปโหลดรูปสำเร็จ ระบบบีบอัดรูปให้แล้ว' : 'Photo uploaded successfully and compressed.' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'อัปโหลดรูปไม่สำเร็จ' : 'Avatar upload failed') });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    if (!state.data) return;
    setUploadingAvatar(true);
    try {
      await removeStaffAvatar(state.data.profile.id, mergedForm.avatar_path);
      patch({ avatar_path: null });
      setAvatarDisplayUrl(null);
      setToast({ type: 'success', message: language === 'th' ? 'ลบรูปโปรไฟล์แล้ว' : 'Profile photo removed' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ลบรูปไม่สำเร็จ' : 'Remove photo failed') });
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader eyebrow="Staff Profile" title={language === 'th' ? 'แก้ไขโปรไฟล์ทีมงาน' : 'Edit staff profile'} description={language === 'th' ? 'แก้ข้อมูลที่แสดงได้เอง ส่วนข้อมูลติดต่อและสุขภาพให้ส่งคำขอแก้ไข' : 'Edit safe public fields directly. Contact and medical changes require approval.'} />
      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}
      {state.data ? (
        <div className="dashboard-grid">
          <Card>
            <h2>{language === 'th' ? 'ตัวอย่างที่น้องเห็น' : 'Public preview'}</h2>
            {preview ? <PublicStaffCard staff={preview} /> : null}
            <p className="muted">{staffDisplayName(state.data.profile)}</p>
          </Card>
          <Card>
            <form className="form-grid" onSubmit={save}>
              <AvatarUploadCard
                imageUrl={avatarDisplayUrl}
                displayName={staffDisplayName(state.data.profile)}
                uploading={uploadingAvatar}
                helperText={language === 'th' ? 'รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 5 MB ระบบจะย่อและบีบอัดรูปให้อัตโนมัติ' : 'JPG, PNG, WEBP up to 5 MB. Images are resized and compressed automatically.'}
                uploadLabel={mergedForm.avatar_path ? (language === 'th' ? 'เปลี่ยนรูป' : 'Change photo') : (language === 'th' ? 'อัปโหลดรูป' : 'Upload photo')}
                removeLabel={language === 'th' ? 'ลบรูป' : 'Remove'}
                onFile={(file) => void uploadAvatar(file)}
                onRemove={() => void removeAvatar()}
              />
              <h3 className="full-span form-section-title">{language === 'th' ? 'โปรไฟล์สาธารณะ' : 'Public profile'}</h3>
              <label className="field">
                <span>{language === 'th' ? 'Bio' : 'Bio'}</span>
                <textarea value={mergedForm.bio ?? ''} onChange={(event) => patch({ bio: event.target.value })} rows={4} />
              </label>
              <Input label={language === 'th' ? 'ภูมิลำเนา' : 'Hometown'} value={mergedForm.hometown ?? ''} onChange={(event) => patch({ hometown: event.target.value })} />
              <Input label={language === 'th' ? 'ความสนใจ (คั่นด้วย comma)' : 'Interests (comma separated)'} value={(mergedForm.interests ?? []).join(', ')} onChange={(event) => patch({ interests: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
              <h3 className="full-span form-section-title">{language === 'th' ? 'การมองเห็นข้อมูล' : 'Visibility'}</h3>
              <Card className="privacy-notice full-span" variant="soft">
                <strong>{language === 'th' ? 'โปรไฟล์พื้นฐานแบบปลอดภัย' : 'Safe Public Lite profile'}</strong>
                <span>{language === 'th' ? 'โปรไฟล์พื้นฐานของพี่อาจแสดงให้น้องเห็น เช่น ชื่อเล่นและหน้าที่ แต่ช่องทางติดต่อจะซ่อนไว้จนกว่าพี่จะเลือกเปิดเอง' : 'Your basic staff profile may be visible to participants, but contact channels stay hidden until you choose to show them.'}</span>
              </Card>
              {[
                ['public_profile_enabled', language === 'th' ? 'เปิด/ปิดโปรไฟล์พื้นฐาน' : 'Basic profile on/off'],
                ['show_instagram', language === 'th' ? 'แสดง Instagram' : 'Show Instagram'],
                ['show_line_id', language === 'th' ? 'แสดง LINE' : 'Show LINE'],
                ['show_facebook', language === 'th' ? 'แสดง Facebook' : 'Show Facebook'],
                ['show_phone_to_staff', language === 'th' ? 'ให้ทีมงานที่มีสิทธิ์เห็นเบอร์โทร' : 'Show phone to authorized staff'],
              ].map(([key, label]) => (
                <label className="check-field" key={key}>
                  <input type="checkbox" checked={Boolean(mergedForm[key as keyof StaffPublicProfileInput])} onChange={(event) => patch({ [key]: event.target.checked } as StaffPublicProfileInput)} />
                  <span>{label}</span>
                </label>
              ))}
              <div className="form-actions">
                <Button type="submit" disabled={saving} icon={<Save size={18} />}>{language === 'th' ? 'บันทึก' : 'Save'}</Button>
                <Button type="button" variant="secondary" icon={<Send size={18} />} onClick={() => setRequestOpen(true)}>{language === 'th' ? 'ขอแก้ไขข้อมูลติดต่อ/สุขภาพ' : 'Request contact/medical update'}</Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
      <StickyActionBar label={language === 'th' ? 'บันทึกโปรไฟล์' : 'Save profile'}>
        <Button disabled={saving || !state.data} icon={<Save size={18} />} onClick={() => void save()}>{language === 'th' ? 'บันทึก' : 'Save'}</Button>
      </StickyActionBar>
      <Modal open={requestOpen} title={language === 'th' ? 'ขอแก้ไขข้อมูลสำคัญ' : 'Request sensitive changes'} onClose={() => setRequestOpen(false)}>
        <div className="form-grid two-col modal-body">
          {Object.keys(requestForm).map((key) => {
            const field = requestFieldLabels[key];
            return (
              <Input
                key={key}
                label={language === 'th' ? field.th : field.en}
                type={field.type}
                inputMode={field.type === 'tel' ? 'tel' : undefined}
                autoComplete={field.type === 'tel' ? 'tel' : undefined}
                value={requestForm[key as keyof typeof requestForm]}
                onChange={(event) => setRequestForm({ ...requestForm, [key]: event.target.value })}
              />
            );
          })}
          <div className="form-actions full-span">
            <Button icon={<Send size={18} />} onClick={submitSensitiveRequest}>{language === 'th' ? 'ส่งคำขอ' : 'Submit request'}</Button>
            <Button variant="secondary" onClick={() => setRequestOpen(false)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
