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
import { eventPath, eventProfileCheckPath, eventStaffApplicationStatusPath } from '../lib/eventRoutes';
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

function safeFullName(person: PersonApplicationLookupResult['safe_person'] | undefined, fallback?: string) {
  return person?.display_full_name
    || person?.name_th
    || person?.name_en
    || fallback?.trim()
    || 'ไม่พบชื่อ-นามสกุลในระบบ';
}

function safeNickname(person: PersonApplicationLookupResult['safe_person'] | undefined) {
  return person?.display_nickname
    || person?.nickname
    || person?.nickname_th
    || person?.nickname_en
    || 'ไม่พบชื่อเล่นในระบบ';
}

const applicationSteps = [
  { id: 1, th: 'ยืนยันตัวตน', en: 'Identity' },
  { id: 2, th: 'ตรวจสอบข้อมูล', en: 'Review' },
  { id: 3, th: 'เลือกฝ่ายและตอบคำถาม', en: 'Duties' },
  { id: 4, th: 'ตรวจสอบก่อนส่ง', en: 'Confirm' },
] as const;

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
  const [currentStep, setCurrentStep] = useState(1);
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
  const applicantDisplayName = identityLookup?.safe_person
    ? safeFullName(identityLookup.safe_person, requestedNameTh)
    : (requestedNameTh || 'ไม่พบชื่อ-นามสกุลในระบบ');
  const applicantMajor = identityLookup?.safe_person?.major || requestedMajor || '-';
  const applicantYear = identityLookup?.safe_person?.year_level ? String(identityLookup.safe_person.year_level) : '-';

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

  function validateStep(step: number) {
    const nextErrors: Record<string, string> = {};
    if (step === 1) {
      if (!studentId.trim()) nextErrors.student_id = language === 'th' ? 'กรุณากรอกรหัสนักศึกษา' : 'Student ID is required';
      if (!email.trim() || !isValidCmuEmail(email)) nextErrors.email = language === 'th' ? 'กรุณากรอก CMU Mail ที่ลงท้ายด้วย @cmu.ac.th เท่านั้น' : 'Please enter a valid CMU Mail ending with @cmu.ac.th';
      if (!phone.trim()) nextErrors.phone = language === 'th' ? 'กรุณากรอกเบอร์โทรปัจจุบัน' : 'Current phone is required';
      if (!identityLookup?.can_continue_application) nextErrors.identity = language === 'th' ? 'กรุณากดตรวจสอบข้อมูลก่อนดำเนินการต่อ' : 'Please check your identity before continuing';
    }
    if (step === 2 && identityLookup?.identity_status === 'not_found') {
      if (!requestedNameTh.trim()) nextErrors.requested_name_th = language === 'th' ? 'กรุณากรอกชื่อ-นามสกุล' : 'Full name is required';
      if (!requestedMajor.trim()) nextErrors.requested_major = language === 'th' ? 'กรุณากรอกสาขา' : 'Major is required';
    }
    if (step === 3) {
      if (!selectedDuties.length) nextErrors.preferred_duties = language === 'th' ? 'กรุณาเลือกอย่างน้อย 1 ฝ่าย' : 'Choose at least one duty';
      if (!availability.trim()) nextErrors.availability = language === 'th' ? 'กรุณาระบุช่วงเวลาที่สะดวก' : 'Availability is required';
      if (!canAttendRehearsal) nextErrors.can_attend_rehearsal = language === 'th' ? 'กรุณาตอบคำถามวันซ้อม' : 'Please answer the rehearsal question';
      if (!canWorkEventDay) nextErrors.can_work_event_day = language === 'th' ? 'กรุณาตอบคำถามวันปฏิบัติงาน' : 'Please answer the event day question';
      const missingConsent = recruitment?.consentItemsTh.some((item) => !consents[item]);
      if (missingConsent) nextErrors.consent = language === 'th' ? 'กรุณายืนยันทุกข้อก่อนส่งใบสมัคร' : 'Please confirm every consent item';
    }
    setErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateStep(currentStep)) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณาตรวจข้อมูลในขั้นตอนนี้' : 'Please check this step.' });
      return;
    }
    setErrors({});
    setCurrentStep((step) => Math.min(step + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setErrors({});
    setCurrentStep((step) => Math.max(step - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            {applicationSteps.map((step) => (
              <span key={step.id} className={`edit-step ${currentStep >= step.id ? 'edit-step-active' : ''}`} aria-current={currentStep === step.id ? 'step' : undefined}>
                {step.id}. {language === 'th' ? step.th : step.en}
              </span>
            ))}
          </div>
          {result?.success ? (
            <div className="edit-success-card" role="status">
              <CheckCircle2 size={28} />
              <strong>{language === 'th' ? 'ส่งใบสมัครสำเร็จ' : 'Application submitted'}</strong>
              <span>{language === 'th' ? 'ระบบได้รับใบสมัครของคุณแล้ว' : 'Your application has been received.'}</span>
              <div className="event-fact-grid">
                <span><strong>{language === 'th' ? 'ชื่อ-นามสกุล' : 'Name'}</strong>{applicantDisplayName}</span>
                <span><strong>{language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'}</strong>{studentId || '-'}</span>
                <span><strong>{language === 'th' ? 'สาขา' : 'Major'}</strong>{applicantMajor}</span>
                <span><strong>{language === 'th' ? 'สถานะการยืนยันตัวตน' : 'Identity status'}</strong>{identityStatusLabel(result.application?.identity_status ?? identityLookup?.identity_status ?? 'pending_identity_review', language)}</span>
                <span><strong>{language === 'th' ? 'รหัสใบสมัคร' : 'Application ID'}</strong>{result.application?.id ?? '-'}</span>
              </div>
              <span><strong>{language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'}</strong>: {result.assignment?.assigned_label_th ?? result.application?.assigned_duty_label_th ?? (language === 'th' ? 'รอผู้ดูแลจัดสรรเพิ่มเติม' : 'Pending admin assignment')}</span>
              <span>{language === 'th' ? 'กรุณาแคปหน้าจอนี้ไว้เป็นหลักฐาน' : 'Please screenshot this page as your submission proof.'}</span>
              <span>{language === 'th' ? 'ตำแหน่งที่แสดงเป็นการจัดสรรเบื้องต้น อาจมีการปรับเปลี่ยนตามความเหมาะสมโดยผู้ดูแล' : 'This is a preliminary assignment and may be adjusted later by admins.'}</span>
              {result.application?.identity_status && result.application.identity_status !== 'verified' ? (
                <span>{language === 'th' ? 'ส่งใบสมัครแล้ว แต่ยังรอตรวจสอบตัวตน' : 'Submitted, pending identity review.'}</span>
              ) : null}
              <div className="event-card-actions">
                <Link className="btn btn-secondary" to={eventPath(event.slug)}>{language === 'th' ? 'กลับไปหน้ากิจกรรม' : 'Back to event'}</Link>
                <Link className="btn btn-secondary" to={eventStaffApplicationStatusPath(event.slug)}>{language === 'th' ? 'ตรวจสอบสถานะใบสมัคร' : 'Check application status'}</Link>
              </div>
            </div>
          ) : (
            <form className="form-grid" onSubmit={submit} noValidate>
              {currentStep === 1 ? (
                <>
              <div className="event-form-section full-span">
                <h3>{language === 'th' ? 'ยืนยันตัวตน' : 'Identity verification'}</h3>
                <p className="muted">{language === 'th' ? 'กรอกรหัสนักศึกษาและ CMU Mail เพื่อค้นหาข้อมูลในฐานข้อมูลกลาง' : 'Enter your student ID and CMU Mail to search the Central People Database.'}</p>
              </div>
              <Input label={language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'} placeholder="เช่น 680610xxx" hint={language === 'th' ? 'ใช้สำหรับค้นหาข้อมูลจากฐานข้อมูลกลาง' : 'Used to find your record in the Central People Database.'} value={studentId} onChange={(eventInput) => { setStudentId(eventInput.target.value); setIdentityLookup(null); }} error={errors.student_id} required />
              <Input label={language === 'th' ? 'CMU Mail ปัจจุบัน' : 'Current CMU Mail'} placeholder="yourname@cmu.ac.th" hint={language === 'th' ? 'ต้องเป็นอีเมลที่ลงท้ายด้วย @cmu.ac.th เท่านั้น' : 'Must end with @cmu.ac.th.'} type="email" value={email} onChange={(eventInput) => { setEmail(eventInput.target.value); setIdentityLookup(null); }} error={errors.email} required />
              <Input label={language === 'th' ? 'เบอร์โทรปัจจุบัน' : 'Current phone'} placeholder="08x-xxx-xxxx" hint={language === 'th' ? 'ใช้สำหรับติดต่อประสานงานเท่านั้น ไม่ใช้เป็นเงื่อนไขหลักในการยืนยันตัวตน' : 'Used only for event coordination, not as the main identity condition.'} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(eventInput) => setPhone(eventInput.target.value)} error={errors.phone} required />
              <div className="full-span event-card-actions">
                <Button type="button" variant="secondary" loading={checkingIdentity} onClick={() => void checkIdentity()}>{checkingIdentity ? (language === 'th' ? 'กำลังตรวจสอบข้อมูล...' : 'Checking...') : (language === 'th' ? 'ตรวจสอบข้อมูล' : 'Check identity')}</Button>
                <Link className="btn btn-secondary" to={eventProfileCheckPath(eventSlug)}>{language === 'th' ? 'ตรวจ/ขอแก้ไขข้อมูล' : 'Check/update profile'}</Link>
              </div>
              <Card className="full-span" variant="soft">
                <p className="muted">{language === 'th' ? 'หาก CMU Mail ในฐานข้อมูลเดิมไม่ถูกต้อง สามารถส่งใบสมัครได้ตามปกติ ระบบจะให้ผู้ดูแลตรวจสอบตัวตนเพิ่มเติมภายหลัง' : 'If the old CMU Mail is incorrect, you can still submit. Admins will review identity later.'}</p>
              </Card>
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
                      <span><strong>{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full name'}</strong>{safeFullName(identityLookup.safe_person)}</span>
                      <span><strong>{language === 'th' ? 'ชื่อเล่น' : 'Nickname'}</strong>{safeNickname(identityLookup.safe_person)}</span>
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
                  <div className="event-card-actions">
                    <Button type="button" onClick={goNext}>{language === 'th' ? 'ดำเนินการสมัครต่อ' : 'Continue application'}</Button>
                  </div>
                </Card>
              ) : null}
              <div className="form-actions full-span">
                <Link className="btn btn-secondary" to={eventPath(event.slug)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Link>
                <Button type="button" onClick={goNext}>{language === 'th' ? 'ถัดไป' : 'Next'}</Button>
              </div>
                </>
              ) : null}
              {currentStep === 2 ? (
                <>
              <div className="event-form-section full-span">
                <h3>{language === 'th' ? 'ตรวจสอบข้อมูล' : 'Review information'}</h3>
                <p className="muted">{language === 'th' ? 'ตรวจข้อมูลที่พบในระบบ หรือกรอกข้อมูลเพิ่มเติมหากไม่พบรหัสนักศึกษา' : 'Review the safe record found, or add details if your student ID was not found.'}</p>
              </div>
              {identityLookup?.safe_person ? (
                <Card className="full-span" variant="soft">
                  <div className="mobile-row-head">
                    <div>
                      <strong>{language === 'th' ? 'ข้อมูลที่พบในระบบ' : 'Record found'}</strong>
                      <span>{language === 'th' ? 'ข้อมูลบางรายการอาจไม่เป็นปัจจุบัน หากพบข้อมูลผิด สามารถส่งคำร้องแก้ไขได้' : 'Some details may be outdated. You can request an update if needed.'}</span>
                    </div>
                    <span className={`status-pill status-${identityLookup.identity_status}`}>{identityStatusLabel(identityLookup.identity_status, language)}</span>
                  </div>
                  <div className="event-fact-grid">
                    <span><strong>{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full name'}</strong>{safeFullName(identityLookup.safe_person)}</span>
                    <span><strong>{language === 'th' ? 'ชื่อเล่น' : 'Nickname'}</strong>{safeNickname(identityLookup.safe_person)}</span>
                    <span><strong>{language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'}</strong>{identityLookup.safe_person.student_id ?? '-'}</span>
                    <span><strong>{language === 'th' ? 'สาขา' : 'Major'}</strong>{identityLookup.safe_person.major ?? '-'}</span>
                    <span><strong>{language === 'th' ? 'ชั้นปี' : 'Year'}</strong>{identityLookup.safe_person.year_level ?? '-'}</span>
                    <span><strong>{language === 'th' ? 'CMU Mail เดิม' : 'Old CMU Mail'}</strong>{identityLookup.safe_person.masked_email ?? '-'}</span>
                    <span><strong>{language === 'th' ? 'เบอร์เดิม' : 'Old phone'}</strong>{identityLookup.safe_person.masked_phone ?? '-'}</span>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => setShowUpdateModal(true)}>{language === 'th' ? 'ขอแก้ไขข้อมูล' : 'Request update'}</Button>
                </Card>
              ) : null}
              {identityLookup?.identity_status === 'not_found' ? (
                <>
                  <Input label={language === 'th' ? 'ชื่อ-นามสกุล' : 'Full name'} value={requestedNameTh} onChange={(eventInput) => setRequestedNameTh(eventInput.target.value)} error={errors.requested_name_th} required />
                  <Input label={language === 'th' ? 'ชื่อภาษาอังกฤษ (ถ้ามี)' : 'English name (optional)'} value={requestedNameEn} onChange={(eventInput) => setRequestedNameEn(eventInput.target.value)} />
                  <Input label={language === 'th' ? 'สาขา' : 'Major'} value={requestedMajor} onChange={(eventInput) => setRequestedMajor(eventInput.target.value)} error={errors.requested_major} required />
                </>
              ) : null}
              <div className="form-actions full-span">
                <Button type="button" variant="secondary" onClick={goBack}>{language === 'th' ? 'ย้อนกลับ' : 'Back'}</Button>
                <Button type="button" onClick={goNext}>{language === 'th' ? 'ดำเนินการสมัครต่อ' : 'Continue application'}</Button>
              </div>
                </>
              ) : null}

              {currentStep === 3 ? (
                <>
              <div className="event-form-section full-span">
                <h3>{language === 'th' ? '2. เลือกหน้าที่และเวลาที่สะดวก' : '2. Duties and availability'}</h3>
                <p className="muted">{language === 'th' ? 'สามารถเลือกได้มากกว่า 1 ฝ่าย ระบบจะจัดสรรฝ่ายเบื้องต้นตามโควต้าและความเหมาะสม' : 'You can choose more than one duty. The system will make a preliminary assignment by quota and fit.'}</p>
              </div>
              <fieldset className="event-checkbox-grid full-span">
                <legend>{language === 'th' ? 'ฝ่ายที่สนใจ' : 'Preferred duties'}</legend>
                {quotaState.loading ? <span className="muted">{language === 'th' ? 'กำลังโหลดโควต้าฝ่าย...' : 'Loading duty quotas...'}</span> : null}
                {quotaDuties.length ? quotaDuties.map((duty) => {
                  const selected = selectedDuties.includes(duty.duty_key);
                  return (
                  <label key={duty.duty_key} className={`duty-option-card ${duty.is_full ? 'is-disabled' : ''} ${selected ? 'is-selected' : ''}`} aria-disabled={duty.is_full}>
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={duty.is_full}
                      onChange={() => toggleDuty(duty.duty_key)}
                    />
                    <span>
                      <strong>{duty.duty_label_th}</strong>
                      <small>{duty.description_th}</small>
                      <small>{language === 'th' ? `คงเหลือ ${duty.remaining} จาก ${duty.quota} คน` : `${duty.remaining} of ${duty.quota} remaining`}</small>
                      {selected ? <em className="selected-badge">{language === 'th' ? 'เลือกแล้ว' : 'Selected'}</em> : null}
                      {duty.is_full ? (
                        <>
                          <em>{language === 'th' ? 'รับเต็มจำนวนแล้ว' : 'Full'}</em>
                          <small>{language === 'th' ? 'ฝ่ายนี้รับครบตามจำนวนแล้ว กรุณาเลือกฝ่ายอื่น' : 'This duty is full. Please choose another duty.'}</small>
                        </>
                      ) : null}
                    </span>
                  </label>
                  );
                }) : recruitment?.dutiesTh.map((duty) => (
                  <label key={duty}>
                    <input type="checkbox" checked={selectedDuties.includes(duty)} onChange={() => toggleDuty(duty)} />
                    <span>{duty}</span>
                  </label>
                ))}
                {errors.preferred_duties ? <small className="field-error" role="alert">{errors.preferred_duties}</small> : null}
              </fieldset>
              <label className="field full-span">
                <span>{language === 'th' ? 'เวลาที่สะดวก' : 'Availability'}</span>
                <textarea value={availability} onChange={(eventInput) => setAvailability(eventInput.target.value)} rows={3} aria-invalid={Boolean(errors.availability) || undefined} placeholder={language === 'th' ? 'เช่น ทั้งวัน / ช่วงเช้า / ช่วงบ่าย / ระบุเวลาที่สะดวก' : 'Example: all day / morning / afternoon / specific available time'} />
                <small>{language === 'th' ? 'หากสามารถอยู่ได้ทั้งวันให้ระบุว่า “ทั้งวัน”' : 'If you are available all day, write “all day”.'}</small>
                {errors.availability ? <small className="field-error" role="alert">{errors.availability}</small> : null}
              </label>
              <Select label={language === 'th' ? 'สามารถเข้าซ้อมวันที่ 10 มิ.ย. 2569 เวลา 16:00 น. ได้หรือไม่' : 'Can attend rehearsal?'} placeholder={language === 'th' ? 'โปรดเลือก' : 'Please select'} value={canAttendRehearsal} onChange={(eventInput) => setCanAttendRehearsal(eventInput.target.value)} options={['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ']} required />
              {errors.can_attend_rehearsal ? <small className="field-error full-span" role="alert">{errors.can_attend_rehearsal}</small> : null}
              <Select label={language === 'th' ? 'สามารถปฏิบัติงานวันที่ 12 มิ.ย. 2569 ได้หรือไม่' : 'Can work on event day?'} placeholder={language === 'th' ? 'โปรดเลือก' : 'Please select'} value={canWorkEventDay} onChange={(eventInput) => setCanWorkEventDay(eventInput.target.value)} options={['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ']} required />
              {errors.can_work_event_day ? <small className="field-error full-span" role="alert">{errors.can_work_event_day}</small> : null}

              <div className="event-form-section full-span">
                <h3>{language === 'th' ? '3. ข้อมูลเพิ่มเติม' : '3. Additional information'}</h3>
              </div>
              <label className="field full-span">
                <span>{language === 'th' ? 'เคยมีประสบการณ์เป็นสตาฟหรือไม่' : 'Staff experience'}</span>
                <textarea value={staffExperience} onChange={(eventInput) => setStaffExperience(eventInput.target.value)} rows={3} placeholder={language === 'th' ? 'ระบุประสบการณ์ที่ผ่านมา หากไม่มีสามารถเว้นว่างได้' : 'Add past staff experience, or leave blank if none.'} />
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
              <div className="form-actions full-span">
                <Button type="button" variant="secondary" onClick={goBack}>{language === 'th' ? 'ย้อนกลับไปแก้ไข' : 'Back'}</Button>
                <Button type="button" onClick={goNext}>{language === 'th' ? 'ตรวจสอบก่อนส่ง' : 'Review before submit'}</Button>
              </div>
                </>
              ) : null}

              {currentStep === 4 ? (
                <>
              <Card className="full-span" variant="soft">
                <div className="mobile-row-head">
                  <div>
                    <strong>{language === 'th' ? 'ตรวจสอบข้อมูลก่อนส่งใบสมัคร' : 'Review before submitting'}</strong>
                    <span>{language === 'th' ? 'กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยันการส่งใบสมัคร' : 'Please check your information before confirming submission.'}</span>
                  </div>
                </div>
                <div className="event-fact-grid">
                  <span><strong>{language === 'th' ? 'ชื่อ-นามสกุล' : 'Name'}</strong>{applicantDisplayName}</span>
                  <span><strong>{language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'}</strong>{studentId || '-'}</span>
                  <span><strong>{language === 'th' ? 'สาขา' : 'Major'}</strong>{applicantMajor}</span>
                  <span><strong>{language === 'th' ? 'ชั้นปี' : 'Year'}</strong>{applicantYear}</span>
                  <span><strong>{language === 'th' ? 'CMU Mail' : 'CMU Mail'}</strong>{email || '-'}</span>
                  <span><strong>{language === 'th' ? 'เบอร์โทร' : 'Phone'}</strong>{phone || '-'}</span>
                  <span><strong>{language === 'th' ? 'ฝ่ายที่เลือก' : 'Selected duties'}</strong>{selectedDutyLabels.length ? selectedDutyLabels.join(', ') : '-'}</span>
                  <span><strong>{language === 'th' ? 'วันซ้อม' : 'Rehearsal'}</strong>{canAttendRehearsal || '-'}</span>
                  <span><strong>{language === 'th' ? 'วันปฏิบัติงาน' : 'Event day'}</strong>{canWorkEventDay || '-'}</span>
                  <span><strong>{language === 'th' ? 'ช่วงเวลาที่สะดวก' : 'Availability'}</strong>{availability || '-'}</span>
                  <span><strong>{language === 'th' ? 'หมายเหตุ' : 'Note'}</strong>{note || '-'}</span>
                  <span><strong>{language === 'th' ? 'สถานะการยืนยันตัวตน' : 'Identity status'}</strong>{identityStatusLabel(identityLookup?.identity_status ?? 'pending_identity_review', language)}</span>
                  <span><strong>{language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'}</strong>{assignmentPreview.duty?.duty_label_th ?? (language === 'th' ? 'รอผู้ดูแลจัดสรรเพิ่มเติม' : 'Pending admin assignment')}</span>
                  <span><strong>{language === 'th' ? 'หมายเหตุการจัดฝ่าย' : 'Assignment note'}</strong>{assignmentPreview.note}</span>
                </div>
                {identityLookup?.identity_status !== 'verified' ? (
                  <Card variant="warning">
                    <strong>{language === 'th' ? 'ใบสมัครนี้จะถูกส่งพร้อมสถานะรอตรวจสอบตัวตน' : 'This application will be submitted pending identity review.'}</strong>
                    <p>{language === 'th' ? 'ผู้ดูแลจะตรวจสอบข้อมูลเพิ่มเติมภายหลัง' : 'Admins will review the identity details later.'}</p>
                  </Card>
                ) : null}
                <p className="muted">{language === 'th' ? 'ตำแหน่งที่แสดงเป็นการจัดสรรเบื้องต้น อาจมีการปรับเปลี่ยนตามความเหมาะสมโดยผู้ดูแล' : 'This is a preliminary assignment and may be adjusted later by admins.'}</p>
              </Card>
              <div className="form-actions full-span">
                <Button type="button" variant="secondary" onClick={goBack}>{language === 'th' ? 'ย้อนกลับไปแก้ไข' : 'Back to edit'}</Button>
                <Button type="submit" loading={saving} disabled={saving}>{language === 'th' ? 'ยืนยันส่งใบสมัคร' : 'Confirm submission'}</Button>
              </div>
                </>
              ) : null}
            </form>
          )}
        </Card>
      ) : null}
      <Modal open={showUpdateModal} title={language === 'th' ? 'ขอแก้ไขข้อมูล' : 'Update request'} onClose={() => setShowUpdateModal(false)}>
        <div className="modal-body page-stack">
          <p className="muted">{language === 'th' ? 'กรอกข้อมูลที่ถูกต้องเพื่อให้ผู้ดูแลตรวจสอบและอัปเดตข้อมูลในฐานกลาง คุณสามารถดำเนินการสมัครต่อได้ ไม่ต้องรออนุมัติคำร้อง' : 'Enter correct details for admin review. You can continue applying without waiting for approval.'}</p>
          <div className="form-grid">
            <Input label={language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'} value={studentId} onChange={(eventInput) => setStudentId(eventInput.target.value)} required />
            <Input label={language === 'th' ? 'CMU Mail ที่ถูกต้อง' : 'Correct CMU Mail'} value={email} onChange={(eventInput) => setEmail(eventInput.target.value)} error={errors.email} required />
            <Input label={language === 'th' ? 'เบอร์โทรปัจจุบัน' : 'Current phone'} value={phone} onChange={(eventInput) => setPhone(eventInput.target.value)} required />
            <Input label={language === 'th' ? 'ชื่อ-นามสกุล' : 'Full name'} value={requestedNameTh} onChange={(eventInput) => setRequestedNameTh(eventInput.target.value)} />
            <Input label={language === 'th' ? 'สาขา' : 'Major'} value={requestedMajor} onChange={(eventInput) => setRequestedMajor(eventInput.target.value)} />
            <label className="field full-span">
              <span>{language === 'th' ? 'หมายเหตุ' : 'Note'}</span>
              <textarea rows={3} value={updateEvidenceNote} onChange={(eventInput) => setUpdateEvidenceNote(eventInput.target.value)} />
            </label>
          </div>
          <div className="form-actions">
            <Button loading={submittingUpdate} onClick={() => void submitUpdateRequest()}>{language === 'th' ? 'ส่งคำร้องแก้ไขข้อมูล' : 'Submit request'}</Button>
            <Button variant="secondary" onClick={() => setShowUpdateModal(false)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
