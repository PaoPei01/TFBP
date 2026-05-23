import { CheckCircle2, RefreshCw } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { getEventContent } from '../lib/eventContent';
import { eventPath, eventProfileCheckPath } from '../lib/eventRoutes';
import type { EventSubmissionResult } from '../lib/eventTypes';
import { fetchEventBySlug, fetchEventDutyQuotaStatus, lookupPersonForApplication, submitEventStaffApplication, submitPersonUpdateRequest, type EventDutyQuotaRow, type PersonApplicationLookupResult } from '../services/events';
import { errorMessage } from '../utils/error';

const cmuEmailPattern = /^[a-zA-Z0-9._%+-]+@cmu\.ac\.th$/;

function isValidCmuEmail(value: string) {
  const clean = value.trim().toLowerCase();
  return !/\s/.test(value.trim()) && cmuEmailPattern.test(clean);
}

function identityStatusLabel(status: string, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    verified: { th: 'ยืนยันแล้ว', en: 'Verified' },
    email_mismatch: { th: 'CMU Mail ไม่ตรง', en: 'CMU Mail mismatch' },
    pending_identity_review: { th: 'รอตรวจสอบตัวตน', en: 'Pending identity review' },
    not_found: { th: 'ไม่พบข้อมูลในฐาน', en: 'Not found' },
    rejected_identity: { th: 'ไม่ผ่านการยืนยัน', en: 'Identity rejected' },
    unverified: { th: 'ยังไม่ยืนยัน', en: 'Unverified' },
  };
  return labels[status]?.[language] ?? status;
}

function previewAssignedDuty(duties: EventDutyQuotaRow[], selectedDutyKeys: string[]) {
  const selected = duties
    .filter((duty) => selectedDutyKeys.includes(duty.duty_key) && !duty.is_full && duty.remaining > 0)
    .sort((a, b) => a.priority - b.priority || a.remaining - b.remaining || a.duty_label_th.localeCompare(b.duty_label_th, 'th'));
  const preferred = selected[0];
  if (preferred) return { duty: preferred, method: 'auto_quota', note: 'ระบบจะจัดฝ่ายเบื้องต้นตามโควต้าและฝ่ายที่เลือก' };
  const general = duties.find((duty) => duty.is_general && !duty.is_full && duty.remaining > 0);
  if (general) return { duty: general, method: 'fallback_general', note: 'ถ้าฝ่ายที่เลือกเต็ม ระบบจะจัดให้อยู่ฝ่ายทั่วไปเบื้องต้น' };
  return { duty: null, method: 'pending', note: 'โควต้าฝ่ายเต็มแล้ว รอผู้ดูแลจัดสรรเพิ่มเติม' };
}

export function EventStaffApplyPage() {
  const { language } = useLanguage();
  const { eventSlug = '' } = useParams();
  const state = useAsync(() => fetchEventBySlug(eventSlug), [eventSlug]);
  const quotaState = useAsync(() => state.data?.id ? fetchEventDutyQuotaStatus(state.data.id) : Promise.resolve(null), [state.data?.id]);
  const content = getEventContent(eventSlug);
  const recruitment = content?.staffRecruitment;
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [requestedNameTh, setRequestedNameTh] = useState('');
  const [requestedNameEn, setRequestedNameEn] = useState('');
  const [requestedMajor, setRequestedMajor] = useState('');
  const [identityLookup, setIdentityLookup] = useState<PersonApplicationLookupResult | null>(null);
  const [checkingIdentity, setCheckingIdentity] = useState(false);
  const [updateRequestId, setUpdateRequestId] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateEvidenceNote, setUpdateEvidenceNote] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [selectedDuties, setSelectedDuties] = useState<string[]>([]);
  const [availability, setAvailability] = useState('');
  const [canAttendRehearsal, setCanAttendRehearsal] = useState('');
  const [canWorkEventDay, setCanWorkEventDay] = useState('');
  const [staffExperience, setStaffExperience] = useState('');
  const [healthOrLimitations, setHealthOrLimitations] = useState('');
  const [note, setNote] = useState('');
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [result, setResult] = useState<EventSubmissionResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const event = state.data;
  const eventName = event ? (language === 'th' ? event.name_th : event.name_en || event.name_th) : '';
  const quotaDuties = quotaState.data?.duties ?? [];
  const selectedDutyLabels = selectedDuties.map((key) => quotaDuties.find((duty) => duty.duty_key === key)?.duty_label_th ?? key);
  const assignmentPreview = previewAssignedDuty(quotaDuties, selectedDuties);

  function toggleDuty(duty: string) {
    setSelectedDuties((current) => current.includes(duty) ? current.filter((item) => item !== duty) : [...current, duty]);
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!studentId.trim()) nextErrors.student_id = language === 'th' ? 'กรุณากรอกรหัสนักศึกษา' : 'Student ID is required';
    if (!email.trim() || !isValidCmuEmail(email)) nextErrors.email = language === 'th' ? 'กรุณากรอก CMU Mail ที่ลงท้ายด้วย @cmu.ac.th เท่านั้น' : 'Please enter a valid CMU Mail ending with @cmu.ac.th';
    if (!phone.trim()) nextErrors.phone = language === 'th' ? 'กรุณากรอกเบอร์โทร' : 'Phone is required';
    if (!identityLookup?.can_continue_application) nextErrors.identity = language === 'th' ? 'กรุณากดตรวจสอบข้อมูลก่อนส่งใบสมัคร' : 'Please check your identity before submitting';
    if (identityLookup?.identity_status === 'not_found') {
      if (!requestedNameTh.trim()) nextErrors.requested_name_th = language === 'th' ? 'กรุณากรอกชื่อ-นามสกุล' : 'Full name is required';
      if (!requestedMajor.trim()) nextErrors.requested_major = language === 'th' ? 'กรุณากรอกสาขา' : 'Major is required';
    }
    if (!selectedDuties.length) nextErrors.preferred_duties = language === 'th' ? 'กรุณาเลือกอย่างน้อย 1 ฝ่าย' : 'Choose at least one duty';
    if (!availability.trim()) nextErrors.availability = language === 'th' ? 'กรุณาระบุช่วงเวลาที่สะดวก' : 'Availability is required';
    if (!canAttendRehearsal) nextErrors.can_attend_rehearsal = language === 'th' ? 'กรุณาตอบคำถามวันซ้อม' : 'Please answer the rehearsal question';
    if (!canWorkEventDay) nextErrors.can_work_event_day = language === 'th' ? 'กรุณาตอบคำถามวันปฏิบัติงาน' : 'Please answer the event day question';
    const missingConsent = recruitment?.consentItemsTh.some((item) => !consents[item]);
    if (missingConsent) nextErrors.consent = language === 'th' ? 'กรุณายืนยันทุกข้อก่อนส่งใบสมัคร' : 'Please confirm every consent item';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function checkIdentity() {
    const nextErrors: Record<string, string> = {};
    if (!studentId.trim()) nextErrors.student_id = language === 'th' ? 'กรุณากรอกรหัสนักศึกษา' : 'Student ID is required';
    if (!email.trim() || !isValidCmuEmail(email)) nextErrors.email = language === 'th' ? 'กรุณากรอก CMU Mail ที่ลงท้ายด้วย @cmu.ac.th เท่านั้น' : 'Please enter a valid CMU Mail ending with @cmu.ac.th';
    if (Object.keys(nextErrors).length) {
      setErrors((current) => ({ ...current, ...nextErrors }));
      setToast({ type: 'error', message: language === 'th' ? 'กรุณาตรวจข้อมูลยืนยันตัวตน' : 'Please check identity fields' });
      return;
    }
    try {
      setCheckingIdentity(true);
      const lookup = await lookupPersonForApplication({ eventSlug, studentId, email, phone, nameTh: requestedNameTh, nameEn: requestedNameEn });
      if (lookup.success === false) {
        setToast({ type: 'error', message: lookup.message_th ?? (language === 'th' ? 'ตรวจสอบข้อมูลไม่สำเร็จ' : 'Could not check identity') });
        return;
      }
      setIdentityLookup(lookup);
      setErrors((current) => {
        const next = { ...current };
        delete next.identity;
        return next;
      });
      setToast({ type: lookup.identity_status === 'verified' ? 'success' : 'info', message: lookup.message_th ?? (language === 'th' ? 'ตรวจสอบข้อมูลแล้ว' : 'Identity checked') });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ตรวจสอบข้อมูลไม่สำเร็จ' : 'Could not check identity') });
    } finally {
      setCheckingIdentity(false);
    }
  }

  async function submitUpdateRequest() {
    if (!studentId.trim() || !isValidCmuEmail(email)) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณากรอก CMU Mail และรหัสนักศึกษาให้ถูกต้อง' : 'Please enter a valid student ID and CMU Mail' });
      return;
    }
    try {
      setSubmittingUpdate(true);
      const submitted = await submitPersonUpdateRequest({
        eventSlug,
        studentId,
        email,
        phone,
        nameTh: requestedNameTh,
        nameEn: requestedNameEn,
        major: requestedMajor,
        requestType: identityLookup?.identity_status === 'not_found' ? 'identity_not_found' : 'email_correction',
        evidenceNote: updateEvidenceNote,
      });
      if (!submitted.success) {
        setToast({ type: 'error', message: submitted.message_th ?? (language === 'th' ? 'ส่งคำร้องไม่สำเร็จ' : 'Could not submit update request') });
        return;
      }
      setUpdateRequestId(submitted.request?.id ?? null);
      setShowUpdateModal(false);
      setToast({ type: 'success', message: language === 'th' ? 'ส่งคำร้องแก้ไขข้อมูลแล้ว' : 'Update request submitted' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ส่งคำร้องไม่สำเร็จ' : 'Could not submit update request') });
    } finally {
      setSubmittingUpdate(false);
    }
  }

  async function submit(eventObject: FormEvent) {
    eventObject.preventDefault();
    if (!validate()) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ' : 'Please complete the required fields' });
      return;
    }
    try {
      setSaving(true);
      const submitted = await submitEventStaffApplication({
        eventSlug,
          email,
          phone,
          data: {
          student_id: studentId,
          identity_status: identityLookup?.identity_status ?? 'pending_identity_review',
          requested_email: email.trim().toLowerCase(),
          requested_phone: phone,
          requested_student_id: studentId,
          requested_name_th: requestedNameTh,
          requested_name_en: requestedNameEn,
          requested_major: requestedMajor,
          update_request_id: updateRequestId,
          preferred_role: selectedDuties[0] ?? null,
          preferred_team: selectedDutyLabels.join(', '),
          preferred_duties: selectedDuties,
          preferred_duty_labels: selectedDutyLabels,
          availability: { text: availability, can_attend_rehearsal: canAttendRehearsal, can_work_event_day: canWorkEventDay },
          can_attend_rehearsal: canAttendRehearsal,
          can_work_event_day: canWorkEventDay,
          staff_experience: staffExperience,
          experience: staffExperience,
          health_or_limitations: healthOrLimitations,
          note,
          consent_confirmed: true,
          consent_items: consents,
          event_specific_form: 'parent_orientation_staff_2569',
          motivation: staffExperience || note || 'Parent orientation staff application',
        },
      });
      setResult(submitted);
      if (!submitted.success) {
        setToast({ type: 'error', message: submitted.code === 'invalid_cmu_email'
          ? (language === 'th' ? 'กรุณากรอก CMU Mail ที่ลงท้ายด้วย @cmu.ac.th เท่านั้น' : 'Please enter a valid CMU Mail ending with @cmu.ac.th')
          : (language === 'th' ? 'กิจกรรมนี้ยังไม่เปิดรับสมัครทีมงาน' : 'Staff recruitment is not open for this event.') });
        return;
      }
      setToast({ type: 'success', message: submitted.message_th ?? (language === 'th' ? 'ส่งใบสมัครทีมงานแล้ว' : 'Staff application submitted') });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ส่งใบสมัครไม่สำเร็จ' : 'Could not submit staff application') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="events-page narrow-page page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Staff Application"
        title={language === 'th' ? 'สมัครเป็นสตาฟ' : 'Apply as Staff'}
        description={language === 'th'
          ? 'ยืนยันด้วยรหัสนักศึกษาและ CMU Mail จากนั้นเลือกหน้าที่และตอบคำถามเฉพาะกิจกรรมนี้'
          : 'Verify with student ID and CMU Mail, then answer event-specific staff questions.'}
        actions={(
          <>
            <HelpButton topicId="events.staff-application" variant="link" />
            <Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>
          </>
        )}
      />

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <EmptyState title={language === 'th' ? 'โหลดกิจกรรมไม่สำเร็จ' : 'Could not load event'} action={<Button variant="secondary" onClick={state.reload}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>} /> : null}
      {!state.loading && !state.error && !event ? (
        <EmptyState title={language === 'th' ? 'ไม่พบกิจกรรมนี้' : 'Event not found'} action={<Link className="btn btn-primary" to="/events">{language === 'th' ? 'ดูกิจกรรมทั้งหมด' : 'View events'}</Link>} />
      ) : null}

      {event && eventSlug !== 'parent-orientation-staff-2569' ? (
        <EmptyState
          title={language === 'th' ? 'กิจกรรมนี้ยังไม่เปิดรับสมัครสตาฟ' : 'Staff applications are not open for this event'}
          description={language === 'th' ? 'ตอนนี้เปิด pilot สำหรับงานปฐมนิเทศผู้ปกครองเท่านั้น' : 'The pilot application flow is currently enabled only for Parent Orientation.'}
          action={<Link className="btn btn-secondary" to={eventPath(event.slug)}>{language === 'th' ? 'กลับไปหน้ากิจกรรม' : 'Back to event'}</Link>}
        />
      ) : null}

      {event && eventSlug === 'parent-orientation-staff-2569' ? (
        <Card className="event-form-card">
          <div>
            <p className="eyebrow">{eventName}</p>
            <h2>{language === 'th' ? 'ใบสมัครสตาฟงานปฐมนิเทศผู้ปกครอง' : 'Parent Orientation staff application'}</h2>
            <p className="muted">{language === 'th' ? 'การสมัครนี้ยังไม่ให้สิทธิ์ทีมงานทันที ต้องรอผู้ดูแลตรวจสอบและจัดสรรหน้าที่' : 'This does not grant staff access immediately. Admin review and duty assignment are required.'}</p>
          </div>
          <div className="edit-stepper" aria-label={language === 'th' ? 'ขั้นตอนสมัครสตาฟ' : 'Staff application steps'}>
            <span className="edit-step edit-step-active">1. {language === 'th' ? 'ยืนยันตัวตน' : 'Verify'}</span>
            <span className="edit-step edit-step-active">2. {language === 'th' ? 'เลือกหน้าที่' : 'Duties'}</span>
            <span className="edit-step edit-step-active">3. {language === 'th' ? 'ยืนยันและส่ง' : 'Submit'}</span>
          </div>
          {result?.success ? (
            <div className="edit-success-card" role="status">
              <CheckCircle2 size={28} />
              <strong>{language === 'th' ? 'ส่งใบสมัครแล้ว' : 'Application submitted'}</strong>
              <span>{language === 'th' ? 'สถานะ: submitted ผู้ดูแลจะตรวจสอบและจัดสรรหน้าที่ภายหลัง' : 'Status: submitted. Admins will review and assign duties later.'}</span>
              <span><strong>{language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'}</strong>: {result.assignment?.assigned_label_th ?? result.application?.assigned_duty_label_th ?? (language === 'th' ? 'รอผู้ดูแลจัดสรรเพิ่มเติม' : 'Pending admin assignment')}</span>
              <span>{language === 'th' ? 'กรุณาแคปหน้าจอนี้ไว้เป็นหลักฐาน' : 'Please screenshot this page as your submission proof.'}</span>
              <span>{language === 'th' ? 'ตำแหน่งที่แสดงเป็นการจัดสรรเบื้องต้น อาจมีการปรับเปลี่ยนตามความเหมาะสมโดยผู้ดูแล' : 'This is a preliminary assignment and may be adjusted later by admins.'}</span>
              {result.application?.identity_status && result.application.identity_status !== 'verified' ? (
                <span>{language === 'th' ? 'ส่งใบสมัครแล้ว แต่ยังรอตรวจสอบตัวตน' : 'Submitted, pending identity review.'}</span>
              ) : null}
              <Link className="btn btn-secondary" to={eventPath(event.slug)}>{language === 'th' ? 'กลับไปหน้ากิจกรรม' : 'Back to event'}</Link>
            </div>
          ) : (
            <form className="form-grid" onSubmit={submit} noValidate>
              <div className="event-form-section full-span">
                <h3>{language === 'th' ? '1. ยืนยันตัวตน' : '1. Verify identity'}</h3>
                <p className="muted">{language === 'th' ? 'กรอก CMU Mail ปัจจุบันของคุณ หาก CMU Mail ในฐานข้อมูลเดิมไม่ถูกต้อง สามารถส่งใบสมัครได้ตามปกติ ระบบจะให้ผู้ดูแลตรวจสอบตัวตนเพิ่มเติมภายหลัง' : 'Enter your current CMU Mail. If old data is outdated, you can still submit and admins will review identity later.'}</p>
              </div>
              <Input label={language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'} value={studentId} onChange={(eventInput) => { setStudentId(eventInput.target.value); setIdentityLookup(null); }} error={errors.student_id} required />
              <Input label={language === 'th' ? 'CMU Mail ปัจจุบัน' : 'Current CMU Mail'} type="email" value={email} onChange={(eventInput) => { setEmail(eventInput.target.value); setIdentityLookup(null); }} error={errors.email} required />
              <Input label={language === 'th' ? 'เบอร์โทรที่ติดต่อได้' : 'Current phone'} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(eventInput) => setPhone(eventInput.target.value)} error={errors.phone} required />
              <div className="full-span event-card-actions">
                <Button type="button" variant="secondary" loading={checkingIdentity} onClick={() => void checkIdentity()}>{language === 'th' ? 'ตรวจสอบข้อมูล' : 'Check identity'}</Button>
                <Link className="btn btn-secondary" to={eventProfileCheckPath(eventSlug)}>{language === 'th' ? 'ตรวจ/ขอแก้ไขข้อมูล' : 'Check/update profile'}</Link>
              </div>
              {errors.identity ? <small className="field-error full-span" role="alert">{errors.identity}</small> : null}
              {identityLookup ? (
                <Card className="full-span" variant={identityLookup.identity_status === 'verified' ? 'success' : 'warning'}>
                  <div className="mobile-row-head">
                    <div>
                      <strong>{identityLookup.message_th ?? identityStatusLabel(identityLookup.identity_status, language)}</strong>
                      <span>{identityStatusLabel(identityLookup.identity_status, language)}</span>
                    </div>
                    <span className={`status-pill status-${identityLookup.identity_status}`}>{identityStatusLabel(identityLookup.identity_status, language)}</span>
                  </div>
                  {identityLookup.safe_person ? (
                    <div className="event-fact-grid">
                      <span><strong>{language === 'th' ? 'ชื่อ' : 'Name'}</strong>{identityLookup.safe_person.display_name ?? '-'}</span>
                      <span><strong>{language === 'th' ? 'รหัส' : 'ID'}</strong>{identityLookup.safe_person.student_id ?? '-'}</span>
                      <span><strong>{language === 'th' ? 'สาขา' : 'Major'}</strong>{identityLookup.safe_person.major ?? '-'}</span>
                      <span><strong>{language === 'th' ? 'CMU Mail เดิม' : 'Old CMU Mail'}</strong>{identityLookup.safe_person.masked_email ?? '-'}</span>
                    </div>
                  ) : (
                    <p>{language === 'th' ? 'ไม่พบข้อมูลจากรหัสนักศึกษานี้ แต่คุณยังสามารถส่งใบสมัครเพื่อให้ผู้ดูแลตรวจสอบได้' : 'No record found for this student ID, but you can still submit for admin review.'}</p>
                  )}
                  {identityLookup.identity_status !== 'verified' ? (
                    <>
                      <p className="muted">{language === 'th' ? 'หาก CMU Mail ในฐานข้อมูลเดิมไม่ถูกต้อง สามารถส่งใบสมัครได้ตามปกติ ระบบจะให้ผู้ดูแลตรวจสอบตัวตนเพิ่มเติมภายหลัง' : 'If the old CMU Mail is incorrect, you can still submit. Admins will review identity later.'}</p>
                      <Button type="button" variant="secondary" onClick={() => setShowUpdateModal(true)}>{language === 'th' ? 'รายงานข้อมูลไม่ถูกต้อง / ขอแก้ไขข้อมูล' : 'Report incorrect data'}</Button>
                    </>
                  ) : null}
                </Card>
              ) : null}
              {identityLookup?.identity_status === 'not_found' ? (
                <>
                  <Input label={language === 'th' ? 'ชื่อ-นามสกุล' : 'Full name'} value={requestedNameTh} onChange={(eventInput) => setRequestedNameTh(eventInput.target.value)} error={errors.requested_name_th} required />
                  <Input label={language === 'th' ? 'ชื่อภาษาอังกฤษ (ถ้ามี)' : 'English name (optional)'} value={requestedNameEn} onChange={(eventInput) => setRequestedNameEn(eventInput.target.value)} />
                  <Input label={language === 'th' ? 'สาขา' : 'Major'} value={requestedMajor} onChange={(eventInput) => setRequestedMajor(eventInput.target.value)} error={errors.requested_major} required />
                </>
              ) : null}

              <div className="event-form-section full-span">
                <h3>{language === 'th' ? '2. เลือกหน้าที่และเวลาที่สะดวก' : '2. Duties and availability'}</h3>
                <p className="muted">{language === 'th' ? 'เลือกได้มากกว่าหนึ่งฝ่าย มีการแบ่งหน้าที่จริงอีกครั้งหลังปิดรับสมัคร' : 'You can choose more than one duty. Final assignment happens after applications close.'}</p>
              </div>
              <fieldset className="event-checkbox-grid full-span">
                <legend>{language === 'th' ? 'ฝ่ายที่สนใจ' : 'Preferred duties'}</legend>
                {quotaState.loading ? <span className="muted">{language === 'th' ? 'กำลังโหลดโควต้าฝ่าย...' : 'Loading duty quotas...'}</span> : null}
                {quotaDuties.length ? quotaDuties.map((duty) => (
                  <label key={duty.duty_key} className={`duty-option-card ${duty.is_full ? 'is-disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedDuties.includes(duty.duty_key)}
                      disabled={duty.is_full}
                      onChange={() => toggleDuty(duty.duty_key)}
                    />
                    <span>
                      <strong>{duty.duty_label_th}</strong>
                      <small>{duty.description_th}</small>
                      <small>{language === 'th' ? `เหลือ ${duty.remaining}/${duty.quota} คน` : `${duty.remaining}/${duty.quota} remaining`}</small>
                      {duty.is_full ? (
                        <>
                          <em>{language === 'th' ? 'รับเต็มจำนวนแล้ว' : 'Full'}</em>
                          <small>{language === 'th' ? 'ฝ่ายนี้รับครบตามจำนวนแล้ว กรุณาเลือกฝ่ายอื่น' : 'This duty is full. Please choose another duty.'}</small>
                        </>
                      ) : null}
                    </span>
                  </label>
                )) : recruitment?.dutiesTh.map((duty) => (
                  <label key={duty}>
                    <input type="checkbox" checked={selectedDuties.includes(duty)} onChange={() => toggleDuty(duty)} />
                    <span>{duty}</span>
                  </label>
                ))}
                {errors.preferred_duties ? <small className="field-error" role="alert">{errors.preferred_duties}</small> : null}
              </fieldset>
              <label className="field full-span">
                <span>{language === 'th' ? 'เวลาที่สะดวก' : 'Availability'}</span>
                <textarea value={availability} onChange={(eventInput) => setAvailability(eventInput.target.value)} rows={3} aria-invalid={Boolean(errors.availability) || undefined} />
                <small>{language === 'th' ? 'หากสามารถอยู่ได้ทั้งวันให้ระบุว่า “ทั้งวัน”' : 'If you are available all day, write “all day”.'}</small>
                {errors.availability ? <small className="field-error" role="alert">{errors.availability}</small> : null}
              </label>
              <Select label={language === 'th' ? 'สามารถเข้าซ้อมวันที่ 10 มิ.ย. 2569 เวลา 16:00 น. ได้หรือไม่' : 'Can attend rehearsal?'} placeholder={language === 'th' ? 'โปรดเลือก' : 'Please select'} value={canAttendRehearsal} onChange={(eventInput) => setCanAttendRehearsal(eventInput.target.value)} options={['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ']} required />
              {errors.can_attend_rehearsal ? <small className="field-error full-span" role="alert">{errors.can_attend_rehearsal}</small> : null}
              <Select label={language === 'th' ? 'ปฏิบัติงานวันที่ 12 มิ.ย. 2569 ได้หรือไม่' : 'Can work on event day?'} placeholder={language === 'th' ? 'โปรดเลือก' : 'Please select'} value={canWorkEventDay} onChange={(eventInput) => setCanWorkEventDay(eventInput.target.value)} options={['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ']} required />
              {errors.can_work_event_day ? <small className="field-error full-span" role="alert">{errors.can_work_event_day}</small> : null}

              <div className="event-form-section full-span">
                <h3>{language === 'th' ? '3. ข้อมูลเพิ่มเติม' : '3. Additional information'}</h3>
              </div>
              <label className="field full-span">
                <span>{language === 'th' ? 'เคยมีประสบการณ์เป็นสตาฟหรือไม่' : 'Staff experience'}</span>
                <textarea value={staffExperience} onChange={(eventInput) => setStaffExperience(eventInput.target.value)} rows={3} />
              </label>
              <label className="field full-span">
                <span>{language === 'th' ? 'ข้อจำกัดด้านสุขภาพ/การแพ้อาหารที่จำเป็นต้องแจ้ง' : 'Health or food limitations needed for assignment'}</span>
                <textarea value={healthOrLimitations} onChange={(eventInput) => setHealthOrLimitations(eventInput.target.value)} rows={3} />
                <small>{language === 'th' ? 'กรอกเฉพาะข้อมูลที่จำเป็นต่อการจัดสรรหน้าที่และดูแลความปลอดภัย' : 'Only enter what is necessary for duty assignment and safety.'}</small>
              </label>
              <label className="field full-span">
                <span>{language === 'th' ? 'หมายเหตุเพิ่มเติม' : 'Additional note'}</span>
                <textarea value={note} onChange={(eventInput) => setNote(eventInput.target.value)} rows={3} />
              </label>

              <fieldset className="event-checkbox-grid full-span">
                <legend>{language === 'th' ? 'การยืนยัน' : 'Consent'}</legend>
                {recruitment?.consentItemsTh.map((item) => (
                  <label key={item}>
                    <input type="checkbox" checked={Boolean(consents[item])} onChange={(eventInput) => setConsents({ ...consents, [item]: eventInput.target.checked })} />
                    <span>{item}</span>
                  </label>
                ))}
                {errors.consent ? <small className="field-error" role="alert">{errors.consent}</small> : null}
              </fieldset>
              <Card className="full-span" variant="soft">
                <div className="mobile-row-head">
                  <div>
                    <strong>{language === 'th' ? 'สรุปก่อนส่งใบสมัคร' : 'Submission summary'}</strong>
                    <span>{language === 'th' ? 'ตรวจสอบฝ่ายที่เลือกและฝ่ายที่ระบบคาดว่าจะจัดให้เบื้องต้น' : 'Check selected duties and expected preliminary assignment.'}</span>
                  </div>
                </div>
                <div className="event-fact-grid">
                  <span><strong>{language === 'th' ? 'ฝ่ายที่เลือก' : 'Selected duties'}</strong>{selectedDutyLabels.length ? selectedDutyLabels.join(', ') : '-'}</span>
                  <span><strong>{language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'}</strong>{assignmentPreview.duty?.duty_label_th ?? (language === 'th' ? 'รอผู้ดูแลจัดสรรเพิ่มเติม' : 'Pending admin assignment')}</span>
                  <span><strong>{language === 'th' ? 'หมายเหตุ' : 'Note'}</strong>{assignmentPreview.note}</span>
                </div>
                <p className="muted">{language === 'th' ? 'ตำแหน่งที่แสดงเป็นการจัดสรรเบื้องต้น อาจมีการปรับเปลี่ยนตามความเหมาะสมโดยผู้ดูแล' : 'This is a preliminary assignment and may be adjusted later by admins.'}</p>
              </Card>
              <div className="form-actions full-span">
                <Link className="btn btn-secondary" to={eventPath(event.slug)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Link>
                <Button type="submit" loading={saving} disabled={saving}>{language === 'th' ? 'ส่งใบสมัคร' : 'Submit application'}</Button>
              </div>
            </form>
          )}
        </Card>
      ) : null}
      <Modal open={showUpdateModal} title={language === 'th' ? 'ขอแก้ไขข้อมูลบุคคล' : 'Request profile correction'} onClose={() => setShowUpdateModal(false)}>
        <div className="modal-body page-stack">
          <p className="muted">{language === 'th' ? 'คำร้องนี้จะส่งให้ผู้ดูแลตรวจสอบ ไม่ได้แก้ไขฐานข้อมูลทันที' : 'This request goes to admins for review and does not update the database immediately.'}</p>
          <div className="form-grid">
            <Input label={language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'} value={studentId} onChange={(eventInput) => setStudentId(eventInput.target.value)} required />
            <Input label={language === 'th' ? 'CMU Mail ที่ถูกต้อง' : 'Correct CMU Mail'} value={email} onChange={(eventInput) => setEmail(eventInput.target.value)} error={errors.email} required />
            <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} value={phone} onChange={(eventInput) => setPhone(eventInput.target.value)} required />
            <Input label={language === 'th' ? 'ชื่อ-นามสกุล' : 'Full name'} value={requestedNameTh} onChange={(eventInput) => setRequestedNameTh(eventInput.target.value)} />
            <Input label={language === 'th' ? 'สาขา' : 'Major'} value={requestedMajor} onChange={(eventInput) => setRequestedMajor(eventInput.target.value)} />
            <label className="field full-span">
              <span>{language === 'th' ? 'หมายเหตุ' : 'Note'}</span>
              <textarea rows={3} value={updateEvidenceNote} onChange={(eventInput) => setUpdateEvidenceNote(eventInput.target.value)} />
            </label>
          </div>
          <div className="form-actions">
            <Button loading={submittingUpdate} onClick={() => void submitUpdateRequest()}>{language === 'th' ? 'ส่งคำร้องแก้ไขข้อมูล' : 'Submit request'}</Button>
            <Button variant="secondary" onClick={() => setShowUpdateModal(false)}>{language === 'th' ? 'ปิด' : 'Close'}</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
