import { Save, SearchCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ContactLinks } from '../components/ContactLinks';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { PublicStaffCard } from '../components/PublicStaffCard';
import { StickyActionBar } from '../components/mobile/StickyActionBar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { editableFields, fieldLabel } from '../lib/constants';
import { groupLabel } from '../lib/grouping';
import { groupMeta } from '../lib/groups';
import { majorLabel } from '../lib/major';
import type { EditableProfileFields, Profile } from '../lib/types';
import { fetchVerifiedFriendRecommendations, fetchVerifiedGroupContext } from '../services/groups';
import { createEditRequest, pickEditableFields, verifyProfileIdentity } from '../services/profiles';
import { fetchPublicStaffCards, type PublicStaffCardData } from '../services/staffProfiles';
import { errorMessage } from '../utils/error';

const basicFields = ['nickname', 'nickname_en'] as const;
const contactFields = ['phone', 'emergency_phone', 'instagram', 'line_id', 'facebook', 'other_contact'] as const;
const healthFields = ['disease', 'drug_allergy', 'food_allergy'] as const;
const privacyFields = ['public_profile', 'show_instagram', 'show_line_id'] as const;

function maskEmail(value?: string | null) {
  if (!value) return '-';
  const [name, domain] = value.split('@');
  if (!domain) return value;
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(value?: string | null) {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 6) return '***';
  return `${digits.slice(0, 3)}***${digits.slice(-4)}`;
}

function fieldValue(profile: Profile, key: keyof Profile) {
  return typeof profile[key] === 'string' ? String(profile[key] ?? '') : '';
}

function normalizeEditValue(value: unknown) {
  if (value === '' || value == null) return null;
  if (typeof value === 'boolean') return value;
  return String(value).trim();
}

function hasEditChanges(profile: Profile | null, form: EditableProfileFields | null) {
  if (!profile || !form) return false;
  return editableFields.some((field) => normalizeEditValue(profile[field]) !== normalizeEditValue(form[field]));
}

type VerifyEditPageProps = {
  titleMode?: 'edit' | 'me';
};

export function VerifyEditPage(_props: VerifyEditPageProps = {}) {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<EditableProfileFields | null>(null);
  const [groupContext, setGroupContext] = useState<Awaited<ReturnType<typeof fetchVerifiedGroupContext>>>(null);
  const [publicStaffCards, setPublicStaffCards] = useState<PublicStaffCardData[]>([]);
  const [friends, setFriends] = useState<Awaited<ReturnType<typeof fetchVerifiedFriendRecommendations>>>([]);
  const [groupSoftMessage, setGroupSoftMessage] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const hasChanges = hasEditChanges(profile, form);
  const currentStep = submitted ? 4 : profile && hasChanges ? 3 : profile ? 2 : 1;
  const showMobileSubmit = Boolean(profile && form && hasChanges && !submitted);

  function updateForm(values: Partial<EditableProfileFields>) {
    if (!form) return;
    setSubmitted(false);
    setForm({ ...form, ...values });
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setVerifying(true);
    setToast(null);
    setVerifyError('');
    setGroupContext(null);
    setPublicStaffCards([]);
    setFriends([]);
    setGroupSoftMessage('');
    try {
      const verified = await verifyProfileIdentity(email, phone);
      if (!verified) {
        const message = language === 'th'
          ? 'ไม่พบข้อมูลที่ตรงกับอีเมลและเบอร์โทรนี้ กรุณาตรวจสอบตัวสะกดหรือเบอร์โทรอีกครั้ง'
          : 'No profile matches this email and phone number. Please check the spelling or phone number.';
        setVerifyError(message);
        setToast({ type: 'error', message });
        return;
      }
      setProfile(verified);
      setForm(pickEditableFields(verified));
      setSubmitted(false);
      setToast({ type: 'success', message: language === 'th' ? 'ยืนยันตัวตนสำเร็จ' : 'Identity verified' });
      setContextLoading(true);
      fetchVerifiedGroupContext(email, phone)
        .then((context) => {
          setGroupContext(context);
          if (!context?.assignment) setGroupSoftMessage(language === 'th' ? 'ยังไม่ได้จัดกลุ่ม หรือไม่สามารถโหลดข้อมูลกลุ่มได้ในขณะนี้' : 'Group information is not available yet.');
          if (context?.assignment) {
            fetchPublicStaffCards(context.assignment.main_group, context.assignment.subgroup)
              .then(setPublicStaffCards)
              .catch(() => setPublicStaffCards([]));
          }
        })
        .catch(() => {
          setGroupContext(null);
          setGroupSoftMessage(language === 'th' ? 'ยังไม่ได้จัดกลุ่ม หรือไม่สามารถโหลดข้อมูลกลุ่มได้ในขณะนี้' : 'Group information is not available yet.');
        })
        .finally(() => setContextLoading(false));
      fetchVerifiedFriendRecommendations(email, phone)
        .then((recommendations) => setFriends(recommendations ?? []))
        .catch(() => setFriends([]));
    } catch (err) {
      const message = errorMessage(err, language === 'th' ? 'ยืนยันตัวตนไม่สำเร็จ' : 'Verification failed');
      setVerifyError(message);
      setToast({ type: 'error', message });
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!profile || !form || submitted || submitting || !hasChanges) return;
    setSubmitting(true);
    try {
      await createEditRequest(profile, form);
      setSubmitted(true);
      setToast({ type: 'success', message: language === 'th' ? 'ส่งคำขอแก้ไขแล้ว รอแอดมินอนุมัติ' : 'Edit request submitted. Waiting for admin approval.' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ส่งคำขอไม่สำเร็จ' : 'Request submission failed') });
    } finally {
      setSubmitting(false);
    }
  }

  function resetChanges() {
    if (!profile) return;
    setForm(pickEditableFields(profile));
    setSubmitted(false);
  }

  function renderInput(field: (typeof editableFields)[number]) {
    return (
      <Input
        key={field}
        label={fieldLabel(field, language)}
        value={String(form?.[field] ?? '')}
        onChange={(event) => updateForm({ [field]: event.target.value } as Partial<EditableProfileFields>)}
      />
    );
  }

  function renderPrivacyToggle(field: (typeof privacyFields)[number]) {
    return (
      <label className="check-field edit-consent-field" key={field}>
        <input
          type="checkbox"
          checked={Boolean(form?.[field])}
          onChange={(event) => updateForm({ [field]: event.target.checked } as Partial<EditableProfileFields>)}
        />
        <span>
          {fieldLabel(field, language)}
          <small>
            {field === 'public_profile'
              ? (language === 'th' ? 'แสดงเฉพาะชื่อเล่น ชื่อจริงบางส่วน และสาขากับเพื่อนในกลุ่มเดียวกัน' : 'Shows only nickname, partial name, and major to people in your subgroup.')
              : field === 'show_instagram'
                ? (language === 'th' ? 'แสดง Instagram เฉพาะเมื่อเปิดโปรไฟล์สาธารณะ' : 'Shows Instagram only when public profile is enabled.')
                : (language === 'th' ? 'แสดง LINE เฉพาะเมื่อเปิดโปรไฟล์สาธารณะ' : 'Shows LINE only when public profile is enabled.')}
          </small>
        </span>
      </label>
    );
  }

  const visibleStaff = publicStaffCards.slice(0, 2);
  const extraStaff = publicStaffCards.slice(2);

  return (
    <section className={`narrow-page page-stack ${showMobileSubmit ? 'has-sticky-actions' : ''}`}>
      <Toast toast={toast} />
      <PageHeader
        eyebrow={language === 'th' ? 'ข้อมูลของฉัน' : 'My information'}
        title={language === 'th' ? 'ข้อมูลของฉัน' : 'My information'}
        description={language === 'th'
          ? 'ยืนยันตัวตนด้วยอีเมลและเบอร์โทรที่ใช้ลงทะเบียน เพื่อตรวจสอบข้อมูล กลุ่ม และส่งคำขอแก้ไขให้แอดมินอนุมัติ'
          : 'Verify with the email and phone used during registration to review your information, group details, and request admin-approved changes.'}
        actions={<HelpButton topicId="participant.edit-info" variant="link" />}
      />

      <div className="edit-stepper" aria-label={language === 'th' ? 'ขั้นตอนการขอแก้ไขข้อมูล' : 'Edit request steps'}>
        {[
          language === 'th' ? 'ยืนยันตัวตน' : 'Verify',
          language === 'th' ? 'ตรวจสอบข้อมูลของฉัน' : 'Review my information',
          language === 'th' ? 'ขอแก้ไขข้อมูล' : 'Request changes',
          language === 'th' ? 'ส่งคำขอแล้ว' : 'Submitted',
        ].map((label, index) => {
          const step = index + 1;
          return (
            <span className={`edit-step ${currentStep === step ? 'edit-step-active' : ''} ${currentStep > step || (submitted && step === 3) ? 'edit-step-done' : ''}`} key={label}>
              <b>{step}</b>
              {label}
            </span>
          );
        })}
      </div>

      <Card className="edit-verify-card">
        <form className="form-grid" onSubmit={handleVerify}>
          <div className="full-span">
            <div className="section-title-row">
              <h2 className="edit-section-title">{language === 'th' ? 'ยืนยันตัวตน' : 'Identity Verification'}</h2>
            </div>
            <p className="muted">{language === 'th' ? 'ใช้ข้อมูลเดียวกับตอนลงทะเบียน หากจำเบอร์ไม่ได้ให้ติดต่อแอดมิน' : 'Use the same information you registered with. Contact an admin if you cannot remember your phone number.'}</p>
          </div>
          <Input label={language === 'th' ? 'อีเมล' : 'Email'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          <Button type="submit" size="lg" fullWidth loading={verifying} icon={<SearchCheck size={18} />}>
            {verifying ? (language === 'th' ? 'กำลังตรวจสอบ...' : 'Checking...') : (language === 'th' ? 'ตรวจสอบข้อมูล' : 'Verify')}
          </Button>
          {verifyError ? <div className="edit-inline-error full-span" aria-live="polite">{verifyError}</div> : null}
        </form>
      </Card>

      {profile && form ? (
        <>
          <Card className="edit-profile-summary">
            <div>
              <p className="eyebrow">{language === 'th' ? 'พบข้อมูลของคุณแล้ว' : 'Profile Found'}</p>
              <h2>{profile.name_th || profile.name_en || profile.nickname || '-'}</h2>
              <p>{language === 'th' ? 'ตรวจสอบข้อมูลพื้นฐานของฉัน หากต้องการแก้ไขให้กรอกเฉพาะช่องที่ต้องการเปลี่ยน' : 'Review my basic information below. Fill only the fields you want to change.'}</p>
            </div>
            <div className="edit-privacy-grid">
              <span><strong>{language === 'th' ? 'ชื่อเล่น' : 'Nickname'}</strong>{profile.nickname || '-'}</span>
              <span><strong>{language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'}</strong>{profile.student_id || '-'}</span>
              <span><strong>{language === 'th' ? 'สาขา' : 'Major'}</strong>{majorLabel(profile.major, language)}</span>
              <span><strong>{language === 'th' ? 'อีเมล' : 'Email'}</strong>{maskEmail(fieldValue(profile, 'email'))}</span>
              <span><strong>{language === 'th' ? 'เบอร์โทร' : 'Phone'}</strong>{maskPhone(fieldValue(profile, 'phone'))}</span>
            </div>
          </Card>

          <div className="edit-section-card">
            <h2 className="edit-section-title">{language === 'th' ? 'ข้อมูลกลุ่มของคุณ' : 'Your Group Information'}</h2>
            {contextLoading ? <LoadingSkeleton count={1} /> : null}
            {!contextLoading && groupContext?.assignment ? (
              <Card className="group-reveal" style={{ '--group-color': groupMeta[groupContext.assignment.main_group].color, '--group-soft': groupMeta[groupContext.assignment.main_group].soft } as CSSProperties}>
                <span className="group-badge-icon" />
                <div>
                  <p className="eyebrow">{language === 'th' ? 'กลุ่มของคุณ' : 'Your Group'}</p>
                  <h2>{groupLabel(groupContext.assignment.main_group, groupContext.assignment.subgroup, language)}</h2>
                  <p>{groupContext.setting?.motto || groupMeta[groupContext.assignment.main_group].motto}</p>
                </div>
                <div className="group-details-grid">
                  <div><strong>{language === 'th' ? 'พี่สตาฟ' : 'Staff'}</strong><span>{publicStaffCards.length ? publicStaffCards.map((staff) => staff.nickname_th || staff.nickname || staff.nickname_en || staff.name_th).join(', ') : groupContext.staff_roster?.length ? groupContext.staff_roster.map((staff) => `${staff.nickname || staff.name}`).join(', ') : groupContext.setting?.mentors || groupMeta[groupContext.assignment.main_group].mentors.join(', ')}</span></div>
                  <div><strong>{language === 'th' ? 'เวลา' : 'Time'}</strong><span>{groupContext.setting?.schedule || groupMeta[groupContext.assignment.main_group].schedule}</span></div>
                  <div><strong>{language === 'th' ? 'จุดนัดพบ' : 'Meeting point'}</strong><span>{groupContext.setting?.meeting_point || groupMeta[groupContext.assignment.main_group].meetingPoint}</span></div>
                </div>
                {publicStaffCards.length ? (
                  <div className="staff-card-grid full-span">
                    {visibleStaff.map((staff) => <PublicStaffCard key={staff.staff_profile_id} staff={staff} />)}
                    {extraStaff.length ? (
                      <details className="edit-collapsible full-span">
                        <summary>{language === 'th' ? `ดูพี่สตาฟเพิ่ม ${extraStaff.length} คน` : `Show ${extraStaff.length} more staff`}</summary>
                        <div className="staff-card-grid">
                          {extraStaff.map((staff) => <PublicStaffCard key={staff.staff_profile_id} staff={staff} />)}
                        </div>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            ) : null}
            {!contextLoading && !groupContext?.assignment ? (
              <Card className="empty-state">
                {groupSoftMessage || (language === 'th' ? 'ยังไม่ได้จัดกลุ่ม หรือระบบยังไม่เปิดเผยข้อมูลกลุ่มในขณะนี้ แต่คุณยังสามารถส่งคำขอแก้ไขข้อมูลได้ตามปกติ' : 'Group information is not available yet. You can still submit an edit request normally.')}
              </Card>
            ) : null}
          </div>

          {submitted ? (
            <Card className="edit-success-card" aria-live="polite">
              <h2>{language === 'th' ? 'ส่งคำขอแก้ไขแล้ว' : 'Edit request submitted'}</h2>
              <p>{language === 'th' ? 'แอดมินจะตรวจสอบและอนุมัติก่อนอัปเดตข้อมูลจริง หากต้องการแก้ไขเพิ่มเติมสามารถส่งคำขอใหม่ได้' : 'Admins will review and approve before applying updates. You can change a field and submit another request if needed.'}</p>
              <div className="form-actions">
                <Link className="btn btn-secondary" to="/">{language === 'th' ? 'กลับหน้าแรก' : 'Back home'}</Link>
                <Button variant="secondary" onClick={() => setSubmitted(false)}>{language === 'th' ? 'ตรวจสอบข้อมูลอีกครั้ง' : 'Review again'}</Button>
              </div>
            </Card>
          ) : null}

          <Card className="edit-section-card sensitive-panel">
            <div className="section-title-row">
              <h2>{language === 'th' ? 'ข้อมูลที่ขอแก้ไขได้' : 'Editable Information'}</h2>
              <HelpButton topicId="faq.edit-approval-delay" variant="compact" />
            </div>
            <p>{language === 'th' ? 'กรอกเฉพาะช่องที่ต้องการเปลี่ยน คำขอจะรอแอดมินอนุมัติก่อนอัปเดตจริง' : 'Fill only the fields you want to change. Requests wait for admin approval.'}</p>
            {!hasChanges ? (
              <div className="form-hint">
                {language === 'th' ? 'แก้ไขช่องที่ต้องการเปลี่ยน แล้วปุ่มส่งคำขอจะแสดงขึ้น' : 'Change any editable field and the submit button will appear.'}
              </div>
            ) : null}
            <Card className="privacy-notice">
              <strong>{language === 'th' ? 'ข้อมูลที่แก้ไขไม่ได้จากหน้านี้' : 'Protected fields'}</strong>
              <span>{language === 'th' ? 'ข้อมูลยืนยันตัวตน เช่น อีเมล รหัสนักศึกษา ชื่อจริง และสาขา หากผิดกรุณาติดต่อแอดมิน' : 'Identity fields such as email, student ID, legal name, and major are protected. Contact an admin if they are incorrect.'}</span>
            </Card>
            <form className="form-grid two-col edit-request-form" onSubmit={handleSubmit}>
              <section className="edit-form-section full-span">
                <h3>{language === 'th' ? 'ชื่อเล่น' : 'Nickname'}</h3>
                <div className="form-grid two-col">{basicFields.map(renderInput)}</div>
              </section>
              <section className="edit-form-section full-span">
                <h3>{language === 'th' ? 'ช่องทางติดต่อ' : 'Contact'}</h3>
                <div className="form-grid two-col">{contactFields.map(renderInput)}</div>
              </section>
              <section className="edit-form-section full-span">
                <h3>{language === 'th' ? 'ข้อมูลสุขภาพ' : 'Health Information'}</h3>
                <p className="muted">{language === 'th' ? 'ข้อมูลสุขภาพจะเห็นเฉพาะแอดมินหรือทีมที่เกี่ยวข้องกับความปลอดภัยเท่านั้น' : 'Health information is visible only to admins or authorized safety staff.'}</p>
                <div className="form-grid two-col">{healthFields.map(renderInput)}</div>
              </section>
              <section className="edit-form-section full-span">
                <h3>{language === 'th' ? 'ความเป็นส่วนตัว' : 'Privacy'}</h3>
                <p className="muted">{language === 'th' ? 'เปิดโปรไฟล์สาธารณะจะแสดงเฉพาะชื่อเล่น ชื่อจริงบางส่วน และสาขากับเพื่อนในกลุ่มเดียวกัน เบอร์โทรและข้อมูลสุขภาพจะไม่แสดงสาธารณะ' : 'Public profile shows only nickname, partial name, and major to people in your subgroup. Phone and health data are never public.'}</p>
                <div className="edit-privacy-grid">{privacyFields.map(renderPrivacyToggle)}</div>
              </section>
              <div className="form-actions full-span">
                {hasChanges ? <Button type="button" variant="secondary" onClick={resetChanges}>{language === 'th' ? 'ล้างการแก้ไข' : 'Reset changes'}</Button> : null}
                {hasChanges ? (
                  <Button type="submit" loading={submitting} disabled={submitted} icon={<Save size={18} />}>
                    {submitted ? (language === 'th' ? 'ส่งคำขอแล้ว' : 'Submitted') : (language === 'th' ? 'ส่งคำขอแก้ไข' : 'Submit edit request')}
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>

          {friends.length ? (
            <details className="edit-section-card edit-collapsible edit-friend-panel">
              <summary>
                <span>
                  <strong>{language === 'th' ? 'เพื่อนในกลุ่มที่เปิดโปรไฟล์สาธารณะ' : 'Group members with public profiles'}</strong>
                  <small>{language === 'th' ? `พบ ${friends.length} คน · แสดงเฉพาะคนที่เปิดโปรไฟล์สาธารณะเท่านั้น` : `${friends.length} found · Only people who enabled public profiles are shown.`}</small>
                </span>
                <em>{language === 'th' ? 'ตัวเลือกเสริม' : 'Optional'}</em>
              </summary>
              <div className="edit-friend-grid">
                {friends.map((friend) => {
                  const displayName = friend.nickname || friend.name_th || '-';
                  const showThaiName = friend.name_th && friend.name_th !== displayName;
                  return (
                    <div className="edit-friend-card" key={friend.id}>
                      <strong>{displayName}</strong>
                      {showThaiName ? <span>{friend.name_th}</span> : null}
                      <small>{majorLabel(friend.major, language)}</small>
                      <ContactLinks instagram={friend.instagram} lineId={friend.line_id} compact />
                    </div>
                  );
                })}
              </div>
            </details>
          ) : null}
        </>
      ) : null}

      {showMobileSubmit ? (
        <StickyActionBar label={language === 'th' ? 'ส่งคำขอแก้ไข' : 'Submit edit request'}>
          <div className="mobile-submit-hint">{language === 'th' ? 'รอแอดมินอนุมัติก่อนอัปเดตจริง' : 'Admin approval is required before updates apply.'}</div>
          <Button loading={submitting} disabled={submitted} icon={<Save size={18} />} onClick={() => void handleSubmit()}>
            {submitted ? (language === 'th' ? 'ส่งคำขอแล้ว' : 'Submitted') : (language === 'th' ? 'ส่งคำขอแก้ไข' : 'Submit request')}
          </Button>
        </StickyActionBar>
      ) : null}
    </section>
  );
}
