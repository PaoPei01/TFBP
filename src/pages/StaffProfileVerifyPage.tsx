import { ClipboardCheck, LogIn, QrCode, Save, SearchCheck, Send, UserRound } from 'lucide-react';
import { FormEvent, lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { PublicStaffCard } from '../components/PublicStaffCard';
import { StickyActionBar } from '../components/mobile/StickyActionBar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import type { VerifiedStaffAttendanceIdentity } from '../lib/attendanceTypes';
import { groupLabel } from '../lib/grouping';
import { identityFromAttendanceResult, saveVerifiedStaffIdentity } from '../lib/verifiedStaffIdentity';
import { verifyStaffAttendanceIdentity } from '../services/staffAttendance';
import { submitStaffEditRequestVerified, updateStaffPublicProfileVerified, verifyStaffIdentity, staffDisplayName, type StaffPublicProfileInput, type VerifiedStaffProfileContext } from '../services/staffProfiles';
import { errorMessage } from '../utils/error';

const StaffPersonalQrModal = lazy(() => import('../components/attendance/StaffPersonalQrModal').then((module) => ({ default: module.StaffPersonalQrModal })));

type VerifiedStaffPublicProfileForm = StaffPublicProfileInput & {
  instagram?: string | null;
  facebook?: string | null;
};

function requestFormFromContext(data: VerifiedStaffProfileContext, fallbackPhone: string) {
  return {
    phone: data.profile.phone ?? fallbackPhone,
    line_id: data.profile.line_id ?? '',
    disease: data.medical_info?.disease ?? '',
    drug_allergy: data.medical_info?.drug_allergy ?? '',
    food_allergy: data.medical_info?.food_allergy ?? '',
    medical_note: data.medical_info?.medical_note ?? '',
  };
}

function publicFormFromContext(data: VerifiedStaffProfileContext): VerifiedStaffPublicProfileForm {
  return {
    avatar_path: data.public_profile?.avatar_path ?? null,
    avatar_url: data.public_profile?.avatar_url ?? '',
    bio: data.public_profile?.bio ?? '',
    hometown: data.public_profile?.hometown ?? '',
    interests: data.public_profile?.interests ?? [],
    public_profile_enabled: data.public_profile?.public_profile_enabled ?? true,
    show_instagram: data.public_profile?.show_instagram ?? false,
    show_facebook: data.public_profile?.show_facebook ?? false,
    show_line_id: data.public_profile?.show_line_id ?? false,
    show_phone_to_staff: data.public_profile?.show_phone_to_staff ?? true,
    show_phone_to_public: data.public_profile?.show_phone_to_public ?? false,
    instagram: data.profile.instagram ?? '',
    facebook: data.profile.facebook ?? '',
  };
}

export function StaffProfileVerifyPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [data, setData] = useState<VerifiedStaffProfileContext | null>(null);
  const [form, setForm] = useState<VerifiedStaffPublicProfileForm>({ interests: [] });
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ phone: '', line_id: '', disease: '', drug_allergy: '', food_allergy: '', medical_note: '' });
  const [verifiedAttendanceIdentity, setVerifiedAttendanceIdentity] = useState<VerifiedStaffAttendanceIdentity | null>(null);
  const [personalQrOpen, setPersonalQrOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const profileEditRef = useRef<HTMLDivElement | null>(null);
  const firstProfileEditInputRef = useRef<HTMLTextAreaElement | null>(null);

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
    line_id: mergedForm.show_line_id ? data.profile.line_id ?? null : null,
    facebook: mergedForm.show_facebook ? mergedForm.facebook ?? null : null,
    phone: null,
  } : null;

  function applyVerifiedContext(result: VerifiedStaffProfileContext, fallbackPhone = phone) {
    setData(result);
    setForm(publicFormFromContext(result));
    setRequestForm(requestFormFromContext(result, fallbackPhone));
  }

  function patch(values: VerifiedStaffPublicProfileForm) {
    setForm((current) => ({ ...current, ...values }));
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setToast(null);
    setVerifiedAttendanceIdentity(null);
    try {
      const result = await verifyStaffIdentity(email, phone);
      if (!result) {
        setToast({ type: 'error', message: 'ไม่พบข้อมูลทีมงานที่ตรงกับอีเมลและเบอร์โทรนี้' });
        return;
      }
      applyVerifiedContext(result, phone);
      try {
        const attendanceResult = await verifyStaffAttendanceIdentity(email, phone);
        const attendanceIdentity = identityFromAttendanceResult(attendanceResult);
        if (attendanceIdentity) {
          saveVerifiedStaffIdentity(attendanceIdentity);
          setVerifiedAttendanceIdentity(attendanceIdentity);
          setToast({
            type: 'success',
            message: language === 'th'
              ? 'ยืนยันตัวตนสำเร็จ สามารถใช้ QR และเช็กชื่อได้ทันที'
              : 'Identity verified. You can now use QR and attendance tools.',
          });
          return;
        }
      } catch {
        // Keep the profile hub usable even if attendance tools are temporarily unavailable.
      }
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
      const refreshed = await verifyStaffIdentity(email, phone);
      applyVerifiedContext(refreshed ?? result, phone);
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
      if (refreshed) applyVerifiedContext(refreshed, phone);
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ส่งคำขอไม่สำเร็จ' : 'Request failed') });
    } finally {
      setLoading(false);
    }
  }

  function scrollToProfileEdit() {
    profileEditRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => firstProfileEditInputRef.current?.focus(), 350);
  }

  function openSensitiveRequest() {
    if (data) setRequestForm(requestFormFromContext(data, phone));
    setRequestOpen(true);
  }

  async function openPersonalQr() {
    if (verifiedAttendanceIdentity) {
      setPersonalQrOpen(true);
      return;
    }
    try {
      setLoading(true);
      const attendanceResult = await verifyStaffAttendanceIdentity(email, phone);
      const attendanceIdentity = identityFromAttendanceResult(attendanceResult);
      if (!attendanceIdentity) {
        setToast({
          type: 'error',
          message: language === 'th'
            ? 'ยังไม่สามารถเปิด QR ส่วนตัวได้ กรุณาลองยืนยันตัวตนอีกครั้ง'
            : 'Could not open personal QR. Please verify again.',
        });
        return;
      }
      saveVerifiedStaffIdentity(attendanceIdentity);
      setVerifiedAttendanceIdentity(attendanceIdentity);
      setPersonalQrOpen(true);
    } catch (err) {
      setToast({
        type: 'error',
        message: errorMessage(err, language === 'th' ? 'ยังไม่สามารถเปิด QR ส่วนตัวได้ กรุณาลองยืนยันตัวตนอีกครั้ง' : 'Could not open personal QR. Please verify again.'),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="narrow-page page-stack has-sticky-actions">
      <Toast toast={toast} />
      <PageHeader
        eyebrow={language === 'th' ? 'ทีมงานทั่วไป' : 'General staff'}
        title={language === 'th' ? 'เข้าสู่โหมดทีมงานทั่วไป' : 'General staff access'}
        description={language === 'th' ? 'ยืนยันตัวตนด้วยอีเมลและเบอร์โทร เพื่อแสดง QR ส่วนตัว เช็กชื่อ แก้ไขโปรไฟล์ หรือส่งคำขอแก้ไขข้อมูลสำคัญ โดยไม่ต้องเข้าสู่ระบบ' : 'Verify with email and phone to show your personal QR, check in, edit your profile, or request important data updates without signing in.'}
        meta={(
          <>
            <HelpButton topicId="staff.profile-verify" variant="link" />
            <Link className="btn btn-secondary" to="/login">{language === 'th' ? 'เข้าสู่ระบบทีมงาน' : 'Staff sign in'}</Link>
          </>
        )}
      />
      <Card>
        <form className="form-grid" onSubmit={verify}>
          <Input label={language === 'th' ? 'อีเมล' : 'Email'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} value={phone} onChange={(event) => setPhone(event.target.value)} required />
          <Button type="submit" disabled={loading} icon={<SearchCheck size={18} />}>{language === 'th' ? 'ยืนยันตัวตน' : 'Verify identity'}</Button>
        </form>
      </Card>

      {data ? (
        <>
          <Card className="staff-lite-summary-card">
            <h2>{staffDisplayName(data.profile)}</h2>
            <p>{data.profile.name_th || data.profile.name_en} · {data.profile.major || '-'}</p>
            <p>{data.assignment ? groupLabel(data.assignment.main_group, data.assignment.subgroup, language) : '-'}</p>
            <span className="status-pill status-approved">{language === 'th' ? 'ยืนยันตัวตนสำเร็จ' : 'Identity verified'}</span>
          </Card>
          <Card className="staff-lite-actions-card" variant="soft">
            <div>
              <p className="eyebrow">{language === 'th' ? 'ทีมงานทั่วไป' : 'General staff'}</p>
              <h2>{language === 'th' ? 'ทำอะไรต่อดี?' : 'What do you need next?'}</h2>
              <p className="muted">{language === 'th' ? 'บางเครื่องมือใช้อีเมลและเบอร์โทรยืนยันตัวตนได้ โดยไม่ต้องเข้าสู่ระบบ' : 'Some tools support email and phone verification without signing in.'}</p>
            </div>
            <div className="staff-action-grid staff-lite-action-grid">
              <button className="staff-action-card" type="button" onClick={() => void openPersonalQr()}>
                <QrCode size={26} />
                <strong>{language === 'th' ? 'QR ส่วนตัวสำหรับเช็กชื่อ' : 'Personal check-in QR'}</strong>
                <span>{language === 'th' ? 'เปิด QR ของคุณทันทีหลังยืนยันตัวตน เพื่อให้แอดมินหรือหัวหน้าทีมสแกน' : 'Open your QR immediately after verification so an admin or team lead can scan it.'}</span>
                <em>{language === 'th' ? 'เปิด QR ของฉัน' : 'Open my QR'}</em>
              </button>
              <Link className="staff-action-card" to="/staff/attendance">
                <ClipboardCheck size={26} />
                <strong>{language === 'th' ? 'เช็กชื่อทีมงาน' : 'Staff check-in'}</strong>
                <span>{language === 'th' ? 'เลือกวิธีเช็กชื่อ ดูสถานะล่าสุด และประวัติการเช็กชื่อของคุณ' : 'Choose a check-in method, view your latest status, and see your attendance history.'}</span>
                <em>{language === 'th' ? 'ไปหน้าเช็กชื่อ' : 'Go to check-in'}</em>
              </Link>
              <button className="staff-action-card" type="button" onClick={scrollToProfileEdit}>
                <UserRound size={26} />
                <strong>{language === 'th' ? 'แก้ไขโปรไฟล์ทีมงาน' : 'Edit staff profile'}</strong>
                <span>{language === 'th' ? 'แก้ไขข้อมูลที่แสดงต่อผู้เข้าร่วมในหน้านี้ หรือส่งคำขอแก้ไขข้อมูลสำคัญ' : 'Edit information shown to participants here, or request changes to important data.'}</span>
                <em>{language === 'th' ? 'เลื่อนไปแก้โปรไฟล์' : 'Scroll to profile edit'}</em>
              </button>
              <Link className="staff-action-card" to="/login" state={{ returnTo: '/staff' }}>
                <LogIn size={26} />
                <strong>{language === 'th' ? 'เข้าสู่ระบบทีมงาน' : 'Staff sign in'}</strong>
                <span>{language === 'th' ? 'สำหรับทีมงานที่ได้รับสิทธิ์ใช้งานระบบเต็มรูปแบบ' : 'For staff members with full system access.'}</span>
              </Link>
            </div>
          </Card>
          <div className="dashboard-grid">
            <Card>
              <h2>{language === 'th' ? 'ตัวอย่างที่น้องเห็น' : 'Public preview'}</h2>
              {preview ? <PublicStaffCard staff={preview} /> : null}
            </Card>
            <div ref={profileEditRef}>
            <Card id="staff-profile-edit-card">
              <form className="form-grid" onSubmit={savePublic}>
                <Card className="privacy-notice full-span" variant="soft">
                  <strong>{language === 'th' ? 'โปรไฟล์ทีมงานทั่วไป' : 'General staff profile'}</strong>
                  <span>{language === 'th' ? 'โปรไฟล์พื้นฐานของพี่อาจแสดงให้น้องเห็น เช่น ชื่อเล่นและหน้าที่ แต่ช่องทางติดต่อจะซ่อนไว้จนกว่าพี่จะเลือกเปิดเอง' : 'Your basic staff profile may be visible to participants, but contact channels stay hidden until you choose to show them.'}</span>
                </Card>
                <Card className="privacy-notice full-span" variant="soft">
                  <strong>{language === 'th' ? 'การอัปโหลดรูป' : 'Profile photo upload'}</strong>
                  <span>{language === 'th' ? 'เพื่อความปลอดภัย การอัปโหลดไฟล์รูปทำได้หลังเข้าสู่ระบบทีมงาน หรือให้แอดมินอัปโหลดให้เท่านั้น หน้านี้ยังแก้ Bio/ความสนใจ/การมองเห็นได้ตามปกติ' : 'For security, image file upload is available after staff login or by admin. This verified page can still edit bio, interests, and visibility settings.'}</span>
                </Card>
                <h3 className="full-span form-section-title">{language === 'th' ? 'โปรไฟล์สาธารณะ' : 'Public profile'}</h3>
                <label className="field">
                  <span>Bio</span>
                  <textarea ref={firstProfileEditInputRef} rows={4} value={mergedForm.bio ?? ''} onChange={(event) => patch({ bio: event.target.value })} />
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
                  ['show_phone_to_staff', language === 'th' ? 'ให้ทีมงานที่มีสิทธิ์เห็นเบอร์โทร' : 'Show phone to authorized staff'],
                ].map(([key, label]) => (
                  <label className="check-field" key={key}>
                    <input type="checkbox" checked={Boolean(mergedForm[key as keyof typeof mergedForm])} onChange={(event) => patch({ [key]: event.target.checked } as StaffPublicProfileInput)} />
                    <span>{label}</span>
                  </label>
                ))}
                <div className="form-actions">
                  <Button type="submit" disabled={loading} icon={<Save size={18} />}>{language === 'th' ? 'บันทึกโปรไฟล์' : 'Save profile'}</Button>
                  <Button type="button" variant="secondary" icon={<Send size={18} />} onClick={openSensitiveRequest}>{language === 'th' ? 'ขอแก้ไขข้อมูลสำคัญ' : 'Request sensitive update'}</Button>
                </div>
              </form>
            </Card>
            </div>
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

      {personalQrOpen ? (
        <Suspense fallback={<LoadingSkeleton />}>
          <StaffPersonalQrModal
            open={personalQrOpen}
            onClose={() => setPersonalQrOpen(false)}
            staffIdentity={verifiedAttendanceIdentity}
            qrPayload={verifiedAttendanceIdentity?.personal_qr_payload}
          />
        </Suspense>
      ) : null}
    </section>
  );
}
