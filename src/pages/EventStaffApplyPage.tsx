import { CheckCircle2, RefreshCw } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HelpButton } from '../components/help/HelpButton';
import { LineGroupCard } from '../components/events/LineGroupCard';
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
import { getApplicationStatusLabel } from '../lib/applicationStatus';
import { formatBangkokDateTime } from '../lib/dateTime';
import { getEventContent } from '../lib/eventContent';
import { eventPath, eventProfileCheckPath, eventStaffApplicationStatusPath } from '../lib/eventRoutes';
import type { EventSubmissionResult } from '../lib/eventTypes';
import { checkStaffApplicationForApplicant, fetchEventBySlug, fetchEventDutyQuotaStatus, lookupPersonForApplication, submitEventStaffApplication, submitPersonUpdateRequest, type ApplicantExistingApplicationResult, type EventDutyQuotaRow, type PersonApplicationLookupResult } from '../services/events';
import { errorMessage } from '../utils/error';

const cmuEmailPattern = /^[a-zA-Z0-9._%+-]+@cmu\.ac\.th$/;
const parentOrientationStaffCloseAt = new Date('2026-05-30T23:59:59+07:00');
const parentOrientationStaffSlug = 'parent-orientation-staff-2569';
type HealthNoticeAnswer = 'no' | 'yes' | '';

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

const dutyContent: Record<string, { labelTh: string; descriptionTh: string }> = {
  traffic: {
    labelTh: 'ฝ่ายจราจรและอำนวยทาง',
    descriptionTh: 'ดูแลการเดินทาง การบอกทาง และช่วยจัดระเบียบเส้นทางภายในพื้นที่กิจกรรม',
  },
  medical: {
    labelTh: 'ฝ่ายพยาบาลและดูแลความปลอดภัย',
    descriptionTh: 'ดูแลการปฐมพยาบาลเบื้องต้น ประสานงานกรณีฉุกเฉิน และช่วยดูแลความปลอดภัยของผู้เข้าร่วม',
  },
  registration: {
    labelTh: 'ฝ่ายลงทะเบียน',
    descriptionTh: 'ตรวจสอบรายชื่อ ต้อนรับผู้เข้าร่วม และช่วยจัดการจุดลงทะเบียนให้เป็นระเบียบ',
  },
  welfare: {
    labelTh: 'ฝ่ายสวัสดิการ',
    descriptionTh: 'ดูแลอาหาร น้ำดื่ม อุปกรณ์ และความเรียบร้อยด้านสวัสดิการของทีมงานและผู้เข้าร่วม',
  },
  benefits_sales: {
    labelTh: 'ฝ่ายสิทธิประโยชน์และจำหน่ายสินค้า',
    descriptionTh: 'ดูแลบูธสิทธิประโยชน์ การจำหน่ายสินค้า หรือกิจกรรมสนับสนุนรายได้และประชาสัมพันธ์ของงาน',
  },
  registration_it: {
    labelTh: 'ฝ่ายสนับสนุนระบบลงทะเบียน (IT)',
    descriptionTh: 'ช่วยดูแลอุปกรณ์ ระบบลงทะเบียน การแก้ปัญหาหน้างาน และการประสานงานด้านเทคนิค',
  },
  backstage: {
    labelTh: 'ฝ่าย Backstage และประสานงานเวที',
    descriptionTh: 'ดูแลหลังเวที คิวกิจกรรม การประสานงานผู้เกี่ยวข้อง และความพร้อมของช่วงพิธีการหรือการแสดง',
  },
  general: {
    labelTh: 'ฝ่ายทั่วไป',
    descriptionTh: 'สนับสนุนงานทั่วไปตามที่ได้รับมอบหมาย เช่น ช่วยประจำจุดต่าง ๆ อำนวยความสะดวก และช่วยเสริมกำลังฝ่ายที่ต้องการคนเพิ่ม',
  },
};

function dutyLabel(duty: EventDutyQuotaRow) {
  return dutyContent[duty.duty_key]?.labelTh ?? duty.duty_label_th;
}

function dutyDescription(duty: EventDutyQuotaRow) {
  return dutyContent[duty.duty_key]?.descriptionTh ?? duty.description_th;
}

function consentItemLabel(item: string, language: 'th' | 'en') {
  if (language === 'th') return item;
  const labels: Record<string, string> = {
    'ยืนยันว่าข้อมูลที่กรอกถูกต้อง': 'I confirm that the information I provided is correct.',
    'ยินยอมให้ใช้ข้อมูลสำหรับการจัดสรรหน้าที่และติดต่อประสานงานกิจกรรมนี้': 'I consent to using this information for duty assignment and event coordination.',
    'รับทราบว่าหน้าที่อาจมีการเปลี่ยนแปลงหลังปิดรับสมัคร': 'I acknowledge that duties may change after applications close.',
    'รับทราบว่าต้องแต่งกายด้วยชุดช็อปถูกระเบียบในวันปฏิบัติงาน': 'I acknowledge that I must wear the proper workshop uniform on the event day.',
  };
  return labels[item] ?? item;
}

function safeFullName(person: PersonApplicationLookupResult['safe_person'] | undefined, fallback?: string) {
  return person?.name_th
    || person?.name_en
    || person?.full_name_th
    || person?.full_name_en
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
  { id: 3, th: 'ข้อมูลจัดสรร', en: 'Assignment details' },
  { id: 4, th: 'ตรวจสอบก่อนส่ง', en: 'Confirm' },
] as const;

export function EventStaffApplyPage() {
  const { language } = useLanguage();
  const { eventSlug = '' } = useParams();
  const state = useAsync(() => fetchEventBySlug(eventSlug), [eventSlug]);
  const quotaState = useAsync(() => state.data?.id ? fetchEventDutyQuotaStatus(state.data.id) : Promise.resolve(null), [state.data?.id]);
  const content = getEventContent(eventSlug);
  const recruitment = content?.staffRecruitment;
  const isParentOrientationStaff = eventSlug === parentOrientationStaffSlug;
  const isSingleDutySelection = isParentOrientationStaff;
  const isApplicationClosed = isParentOrientationStaff && Date.now() > parentOrientationStaffCloseAt.getTime();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [requestedNameTh, setRequestedNameTh] = useState('');
  const [requestedNameEn, setRequestedNameEn] = useState('');
  const [requestedMajor, setRequestedMajor] = useState('');
  const [identityLookup, setIdentityLookup] = useState<PersonApplicationLookupResult | null>(null);
  const [checkingIdentity, setCheckingIdentity] = useState(false);
  const [updateRequestId, setUpdateRequestId] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] = useState<ApplicantExistingApplicationResult | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateEvidenceNote, setUpdateEvidenceNote] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDuties, setSelectedDuties] = useState<string[]>([]);
  const [canAttendRehearsal, setCanAttendRehearsal] = useState('');
  const [canWorkEventDay, setCanWorkEventDay] = useState('');
  const [staffExperience, setStaffExperience] = useState('');
  const [hasHealthNotice, setHasHealthNotice] = useState<HealthNoticeAnswer>('');
  const [chronicCondition, setChronicCondition] = useState('');
  const [foodAllergy, setFoodAllergy] = useState('');
  const [drugAllergy, setDrugAllergy] = useState('');
  const [healthNote, setHealthNote] = useState('');
  const [note, setNote] = useState('');
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [result, setResult] = useState<EventSubmissionResult | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const event = state.data;
  const eventName = event ? (language === 'th' ? event.name_th : event.name_en || event.name_th) : '';
  const lineGroup = recruitment?.lineGroup;
  const quotaDuties = quotaState.data?.duties ?? [];
  const selectedDutyLabels = selectedDuties.map((key) => {
    const duty = quotaDuties.find((item) => item.duty_key === key);
    return duty ? dutyLabel(duty) : key;
  });
  const assignmentPreview = previewAssignedDuty(quotaDuties, selectedDuties);
  const applicantDisplayName = identityLookup?.safe_person
    ? safeFullName(identityLookup.safe_person, requestedNameTh)
    : (requestedNameTh || 'ไม่พบชื่อ-นามสกุลในระบบ');
  const applicantMajor = identityLookup?.safe_person?.major || requestedMajor || '-';
  const applicantYear = identityLookup?.safe_person?.year_level ? String(identityLookup.safe_person.year_level) : '-';
  const healthDetails = {
    has_health_notice: hasHealthNotice === 'yes',
    chronic_condition: hasHealthNotice === 'yes' ? chronicCondition.trim() : '',
    food_allergy: hasHealthNotice === 'yes' ? foodAllergy.trim() : '',
    drug_allergy: hasHealthNotice === 'yes' ? drugAllergy.trim() : '',
    health_note: hasHealthNotice === 'yes' ? healthNote.trim() : '',
  };
  const healthSummary = buildHealthSummary();
  const autoPassEligible = Boolean(
    isParentOrientationStaff
    && identityLookup?.identity_status === 'verified'
    && identityLookup.can_continue_application
    && !updateRequestId,
  );

  function buildHealthSummary() {
    if (hasHealthNotice === 'no') return language === 'th' ? 'ไม่มี' : 'No';
    if (hasHealthNotice !== 'yes') return '';
    const rows = [
      [language === 'th' ? 'โรคประจำตัว/ข้อจำกัดด้านสุขภาพ' : 'Chronic condition / health limitation', chronicCondition.trim()],
      [language === 'th' ? 'แพ้อาหาร' : 'Food allergy', foodAllergy.trim()],
      [language === 'th' ? 'แพ้ยา' : 'Drug allergy', drugAllergy.trim()],
      [language === 'th' ? 'หมายเหตุเพิ่มเติม' : 'Additional note', healthNote.trim()],
    ];
    return rows
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n');
  }

  function existingApplicationFromResult(submitted: EventSubmissionResult): ApplicantExistingApplicationResult {
    return {
      exists: true,
      already_applied: Boolean(submitted.already_applied),
      message_th: submitted.message_th,
      event: submitted.event,
      application: submitted.application ? {
        application_id: submitted.application.id,
        status: submitted.application.status,
        identity_status: submitted.application.identity_status,
        assigned_duty: submitted.application.assigned_duty,
        assigned_duty_label_th: submitted.application.assigned_duty_label_th,
        assignment_method: submitted.application.assignment_method,
        submitted_at: submitted.application.submitted_at,
      } : undefined,
    };
  }

  function toggleDuty(duty: string) {
    setSelectedDuties((current) => {
      if (isSingleDutySelection) return current.includes(duty) ? [] : [duty];
      return current.includes(duty) ? current.filter((item) => item !== duty) : [...current, duty];
    });
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
    if (isSingleDutySelection ? selectedDuties.length !== 1 : !selectedDuties.length) {
      nextErrors.preferred_duties = isSingleDutySelection
        ? (language === 'th' ? 'กรุณาเลือกตำแหน่งฝ่ายที่ต้องการสมัคร 1 ตำแหน่ง' : 'Please choose exactly one preferred duty position.')
        : (language === 'th' ? 'กรุณาเลือกอย่างน้อย 1 ฝ่าย' : 'Choose at least one duty');
    }
    if (!canAttendRehearsal) nextErrors.can_attend_rehearsal = language === 'th' ? 'กรุณาตอบคำถามวันซ้อม' : 'Please answer the rehearsal question';
    if (!canWorkEventDay) nextErrors.can_work_event_day = language === 'th' ? 'กรุณาตอบคำถามวันปฏิบัติงาน' : 'Please answer the event day question';
    if (!hasHealthNotice) nextErrors.health_notice = language === 'th' ? 'กรุณาเลือกว่ามีข้อจำกัดด้านสุขภาพหรือการแพ้ที่จำเป็นต้องแจ้งหรือไม่' : 'Please choose whether you have any health or allergy information to report.';
    if (hasHealthNotice === 'yes' && !healthDetails.chronic_condition && !healthDetails.food_allergy && !healthDetails.drug_allergy && !healthDetails.health_note) {
      nextErrors.health_details = language === 'th' ? 'กรุณาระบุรายละเอียดอย่างน้อย 1 รายการ เพื่อให้ทีมงานดูแลได้อย่างเหมาะสม' : 'Please provide at least one detail so the team can support you appropriately.';
    }
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
      if (isSingleDutySelection ? selectedDuties.length !== 1 : !selectedDuties.length) {
        nextErrors.preferred_duties = isSingleDutySelection
          ? (language === 'th' ? 'กรุณาเลือกตำแหน่งฝ่ายที่ต้องการสมัคร 1 ตำแหน่ง' : 'Please choose exactly one preferred duty position.')
          : (language === 'th' ? 'กรุณาเลือกอย่างน้อย 1 ฝ่าย' : 'Choose at least one duty');
      }
      if (!canAttendRehearsal) nextErrors.can_attend_rehearsal = language === 'th' ? 'กรุณาตอบคำถามวันซ้อม' : 'Please answer the rehearsal question';
      if (!canWorkEventDay) nextErrors.can_work_event_day = language === 'th' ? 'กรุณาตอบคำถามวันปฏิบัติงาน' : 'Please answer the event day question';
      if (!hasHealthNotice) nextErrors.health_notice = language === 'th' ? 'กรุณาเลือกว่ามีข้อจำกัดด้านสุขภาพหรือการแพ้ที่จำเป็นต้องแจ้งหรือไม่' : 'Please choose whether you have any health or allergy information to report.';
      if (hasHealthNotice === 'yes' && !healthDetails.chronic_condition && !healthDetails.food_allergy && !healthDetails.drug_allergy && !healthDetails.health_note) {
        nextErrors.health_details = language === 'th' ? 'กรุณาระบุรายละเอียดอย่างน้อย 1 รายการ เพื่อให้ทีมงานดูแลได้อย่างเหมาะสม' : 'Please provide at least one detail so the team can support you appropriately.';
      }
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
      const existing = await checkStaffApplicationForApplicant({ eventSlug, studentId, email });
      setExistingApplication(existing.already_applied ? existing : null);
      setErrors((current) => {
        const next = { ...current };
        delete next.identity;
        return next;
      });
      setToast({
        type: lookup.identity_status === 'verified' ? 'success' : 'info',
        message: existing.already_applied
          ? (existing.message_th ?? (language === 'th' ? 'พบใบสมัครเดิมของคุณในระบบ' : 'Existing application found.'))
          : (lookup.message_th ?? (language === 'th' ? 'ตรวจสอบข้อมูลแล้ว' : 'Identity checked')),
      });
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
    if (saving) return;
    if (isApplicationClosed) {
      setToast({ type: 'error', message: language === 'th' ? 'ปิดรับสมัครสตาฟแล้ว ไม่สามารถส่งใบสมัครใหม่ได้' : 'Staff applications are closed. New submissions are no longer accepted.' });
      return;
    }
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
          preferred_team: selectedDutyLabels[0] ?? '',
          preferred_duties: selectedDuties,
          preferred_duty_labels: selectedDutyLabels,
          availability: { text: '', can_attend_rehearsal: canAttendRehearsal, can_work_event_day: canWorkEventDay },
          can_attend_rehearsal: canAttendRehearsal,
          can_work_event_day: canWorkEventDay,
          staff_experience: staffExperience,
          experience: staffExperience,
          health_or_limitations: healthSummary || (language === 'th' ? 'ไม่มี' : 'No'),
          health_details: healthDetails,
          note,
          consent_confirmed: true,
          consent_items: consents,
          event_specific_form: 'parent_orientation_staff_2569',
          auto_pass_eligible: autoPassEligible,
          auto_pass_reason: autoPassEligible ? 'verified_identity_no_update_request' : null,
          motivation: staffExperience || note || 'Parent orientation staff application',
        },
      });
      setResult(submitted);
      setSubmittedAt(new Date().toISOString());
      if (!submitted.success) {
        setToast({ type: 'error', message: submitted.code === 'invalid_cmu_email'
          ? (language === 'th' ? 'กรุณากรอก CMU Mail ที่ลงท้ายด้วย @cmu.ac.th เท่านั้น' : 'Please enter a valid CMU Mail ending with @cmu.ac.th')
          : (language === 'th' ? 'กิจกรรมนี้ยังไม่เปิดรับสมัครทีมงาน' : 'Staff recruitment is not open for this event.') });
        return;
      }
      if (submitted.already_applied) {
        setExistingApplication(existingApplicationFromResult(submitted));
        setToast({ type: 'info', message: submitted.message_th ?? (language === 'th' ? 'ระบบพบว่าเคยมีการส่งใบสมัครไว้แล้ว จึงแสดงข้อมูลใบสมัครเดิมแทน' : 'Existing application found.' ) });
        return;
      }
      setToast({ type: 'success', message: submitted.message_th ?? (language === 'th' ? 'ส่งใบสมัครทีมงานแล้ว' : 'Staff application submitted') });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ส่งใบสมัครไม่สำเร็จ' : 'Could not submit staff application') });
    } finally {
      setSaving(false);
    }
  }

  function renderLineGroupCard() {
    if (!lineGroup) return null;
    return (
      <LineGroupCard
        label={language === 'th' ? lineGroup.labelTh : lineGroup.labelEn}
        note={language === 'th' ? lineGroup.noteTh : lineGroup.noteEn}
        url={lineGroup.url}
        qrImagePath={lineGroup.qrImagePath}
        language={language}
      />
    );
  }

  function applicationStatusLabel(status: string) {
    if (isParentOrientationStaff && status === 'approved') {
      return language === 'th' ? 'ผ่านการคัดเลือกเบื้องต้น' : 'Preliminarily accepted';
    }
    return getApplicationStatusLabel(status, language);
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

      {event && !isParentOrientationStaff ? (
        <EmptyState
          title={language === 'th' ? 'กิจกรรมนี้ยังไม่เปิดรับสมัครสตาฟ' : 'Staff applications are not open for this event'}
          description={language === 'th' ? 'ตอนนี้เปิด pilot สำหรับงานปฐมนิเทศผู้ปกครองเท่านั้น' : 'The pilot application flow is currently enabled only for Parent Orientation.'}
          action={<Link className="btn btn-secondary" to={eventPath(event.slug)}>{language === 'th' ? 'กลับไปหน้ากิจกรรม' : 'Back to event'}</Link>}
        />
      ) : null}

      {event && isParentOrientationStaff ? (
        <Card className="event-form-card">
          <div>
            <p className="eyebrow">{eventName}</p>
            <h2>{language === 'th' ? 'ใบสมัครสตาฟงานปฐมนิเทศผู้ปกครอง' : 'Parent Orientation staff application'}</h2>
            <p className="muted">{language === 'th' ? 'การแต่งกาย: ชุดช็อปถูกระเบียบ' : 'Dress code: proper workshop uniform'}</p>
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
              <strong>
                {result.already_applied
                  ? (language === 'th' ? 'คุณได้ส่งใบสมัครแล้ว' : 'Application already submitted')
                  : autoPassEligible
                    ? (language === 'th' ? 'สมัครสำเร็จและผ่านการคัดเลือกเบื้องต้นแล้ว' : 'Application submitted and preliminarily accepted')
                    : (language === 'th' ? 'ส่งใบสมัครสำเร็จ รอผู้ดูแลตรวจสอบข้อมูลเพิ่มเติม' : 'Application submitted. Additional admin review is required.')}
              </strong>
              <span>
                {result.already_applied
                  ? (result.message_th ?? (language === 'th' ? 'คุณได้ส่งใบสมัครสำหรับกิจกรรมนี้แล้ว ไม่จำเป็นต้องส่งซ้ำ' : 'You have already applied for this event.'))
                  : autoPassEligible
                    ? (language === 'th' ? 'ระบบตรวจสอบแล้วว่าข้อมูลของคุณยืนยันตัวตนสำเร็จและไม่มีคำร้องแก้ไขข้อมูล จึงถือว่าผ่านการคัดเลือกเบื้องต้นสำหรับกิจกรรมนี้' : 'Your identity was verified and no data correction issue was found, so your application is preliminarily accepted for this event.')
                    : (language === 'th' ? 'ระบบได้รับใบสมัครของคุณแล้ว และจะให้ผู้ดูแลตรวจสอบข้อมูลเพิ่มเติม' : 'Your application has been received and will need additional admin review.')}
              </span>
              <div className="event-fact-grid">
                <span><strong>{language === 'th' ? 'ชื่อ-นามสกุล' : 'Name'}</strong>{applicantDisplayName}</span>
                <span><strong>{language === 'th' ? 'ชื่อเล่น' : 'Nickname'}</strong>{safeNickname(identityLookup?.safe_person)}</span>
                <span><strong>{language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'}</strong>{studentId || '-'}</span>
                <span><strong>{language === 'th' ? 'สาขา' : 'Major'}</strong>{applicantMajor}</span>
                <span><strong>{language === 'th' ? 'สถานะการยืนยันตัวตน' : 'Identity status'}</strong>{identityStatusLabel(result.application?.identity_status ?? identityLookup?.identity_status ?? 'pending_identity_review', language)}</span>
                <span><strong>{language === 'th' ? 'เวลาที่ส่งใบสมัคร' : 'Submitted at'}</strong>{formatBangkokDateTime(result.application?.submitted_at ?? submittedAt, language)}</span>
                <span><strong>{language === 'th' ? 'รหัสใบสมัคร' : 'Application ID'}</strong>{result.application?.id ?? '-'}</span>
              </div>
              <span><strong>{language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'}</strong>: {result.assignment?.assigned_label_th ?? result.application?.assigned_duty_label_th ?? (language === 'th' ? 'รอผู้ดูแลจัดสรรเพิ่มเติม' : 'Pending admin assignment')}</span>
              {autoPassEligible && result.application?.status !== 'approved' ? (
                <Card variant="warning">
                  <p className="muted">{language === 'th' ? 'ระบบระบุว่าคุณเข้าเงื่อนไขผ่านอัตโนมัติ แต่สถานะในฐานข้อมูลอาจรอการซิงก์/ตรวจสอบจากผู้ดูแล' : 'You meet the auto-pass condition, but the stored status may still need admin sync/review.'}</p>
                </Card>
              ) : null}
              {renderLineGroupCard()}
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
          ) : existingApplication?.already_applied ? (
            <div className="edit-success-card" role="status">
              <CheckCircle2 size={28} />
              <strong>{language === 'th' ? 'คุณได้ส่งใบสมัครแล้ว' : 'Application already submitted'}</strong>
              <span>{existingApplication.message_th ?? (language === 'th' ? 'คุณได้ส่งใบสมัครสำหรับกิจกรรมนี้แล้ว ไม่จำเป็นต้องส่งซ้ำ' : 'You have already applied for this event.')}</span>
              <div className="event-fact-grid">
                <span><strong>{language === 'th' ? 'สถานะใบสมัคร' : 'Application status'}</strong>{applicationStatusLabel(existingApplication.application?.status ?? 'submitted')}</span>
                <span><strong>{language === 'th' ? 'สถานะการยืนยันตัวตน' : 'Identity status'}</strong>{identityStatusLabel(existingApplication.application?.identity_status ?? 'pending_identity_review', language)}</span>
                <span><strong>{language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'}</strong>{existingApplication.application?.assigned_duty_label_th ?? (language === 'th' ? 'รอผู้ดูแลจัดสรร' : 'Pending admin assignment')}</span>
                <span><strong>{language === 'th' ? 'วันที่ส่งใบสมัคร' : 'Submitted at'}</strong>{formatBangkokDateTime(existingApplication.application?.submitted_at, language)}</span>
                <span><strong>{language === 'th' ? 'รหัสใบสมัคร' : 'Application ID'}</strong>{existingApplication.application?.application_id ?? '-'}</span>
              </div>
              <Card variant="soft">
                <p className="muted">{language === 'th' ? 'พบใบสมัครเดิมของคุณในระบบ ระบบจะแสดงข้อมูลใบสมัครเดิมแทนการส่งซ้ำ' : 'An existing application was found. The app shows the existing application instead of submitting again.'}</p>
              </Card>
              {renderLineGroupCard()}
              <div className="event-card-actions">
                <Link className="btn btn-secondary" to={eventPath(event.slug)}>{language === 'th' ? 'กลับไปหน้ากิจกรรม' : 'Back to event'}</Link>
                <Link className="btn btn-secondary" to={eventStaffApplicationStatusPath(event.slug)}>{language === 'th' ? 'ตรวจสอบสถานะใบสมัคร' : 'Check application status'}</Link>
                <Link className="btn btn-secondary" to={eventProfileCheckPath(event.slug)}>{language === 'th' ? 'ติดต่อผู้ดูแล / ขอแก้ไขข้อมูล' : 'Contact admin / request update'}</Link>
              </div>
            </div>
          ) : isApplicationClosed ? (
            <EmptyState
              title={language === 'th' ? 'ปิดรับสมัครสตาฟแล้ว' : 'Staff applications are closed.'}
              description={language === 'th'
                ? 'ขอบคุณทุกความสนใจ ระบบปิดรับสมัครเมื่อวันที่ 30 พฤษภาคม 2569 เวลา 23:59 น.'
                : 'Thank you for your interest. Applications closed on 30 May 2026 at 23:59.'}
              action={(
                <div className="event-card-actions">
                  <Link className="btn btn-secondary" to={eventPath(event.slug)}>{language === 'th' ? 'กลับไปหน้ากิจกรรม' : 'Back to event'}</Link>
                  <Link className="btn btn-primary" to={eventStaffApplicationStatusPath(event.slug)}>{language === 'th' ? 'ตรวจสอบสถานะใบสมัคร' : 'Check application status'}</Link>
                </div>
              )}
            />
          ) : (
            <form className="form-grid" onSubmit={submit} noValidate>
              {currentStep === 1 ? (
                <>
              <div className="event-form-section full-span">
                <h3>{language === 'th' ? 'ยืนยันตัวตน' : 'Identity verification'}</h3>
                <p className="muted">{language === 'th' ? 'กรอกรหัสนักศึกษาและ CMU Mail เพื่อค้นหาข้อมูลในฐานข้อมูลกลาง' : 'Enter your student ID and CMU Mail to search the Central People Database.'}</p>
              </div>
              <Input label={language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'} placeholder="เช่น 680610xxx" hint={language === 'th' ? 'ใช้สำหรับค้นหาข้อมูลจากฐานข้อมูลกลาง' : 'Used to find your record in the Central People Database.'} value={studentId} onChange={(eventInput) => { setStudentId(eventInput.target.value); setIdentityLookup(null); setExistingApplication(null); }} error={errors.student_id} required />
              <Input label={language === 'th' ? 'CMU Mail ปัจจุบัน' : 'Current CMU Mail'} placeholder="yourname@cmu.ac.th" hint={language === 'th' ? 'ต้องเป็นอีเมลที่ลงท้ายด้วย @cmu.ac.th เท่านั้น' : 'Must end with @cmu.ac.th.'} type="email" value={email} onChange={(eventInput) => { setEmail(eventInput.target.value); setIdentityLookup(null); setExistingApplication(null); }} error={errors.email} required />
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
                      <span><strong>{language === 'th' ? 'CMU Mail ในระบบ' : 'System CMU Mail'}</strong>{identityLookup.safe_person.masked_email ?? '-'}</span>
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
                    <span><strong>{language === 'th' ? 'CMU Mail ในระบบ' : 'System CMU Mail'}</strong>{identityLookup.safe_person.masked_email ?? '-'}</span>
                    <span><strong>{language === 'th' ? 'เบอร์โทรในระบบ' : 'System phone'}</strong>{identityLookup.safe_person.masked_phone ?? '-'}</span>
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
                <h3>{language === 'th' ? 'เลือกตำแหน่งฝ่ายและข้อมูลประกอบการจัดสรร' : 'Preferred duty and assignment details'}</h3>
                <p className="muted">{language === 'th' ? 'เลือกตำแหน่งฝ่ายที่ต้องการสมัคร 1 ตำแหน่ง และกรอกข้อมูลที่จำเป็นต่อการจัดสรรหน้าที่ การดูแลความปลอดภัย และการประสานงานวันปฏิบัติงาน' : 'Choose one preferred duty position and provide information needed for duty assignment, safety support, and event-day coordination.'}</p>
              </div>
              <fieldset className="event-checkbox-grid full-span">
                <legend>{language === 'th' ? 'ตำแหน่งฝ่ายที่ต้องการสมัคร' : 'Preferred duty position'}</legend>
                <p className="muted">{language === 'th' ? 'เลือกได้เพียง 1 ตำแหน่ง ระบบจะแสดงตำแหน่งที่เลือกเป็นความประสงค์เบื้องต้น และผู้ดูแลสามารถปรับเปลี่ยนได้ตามความเหมาะสม' : 'Choose only 1 position. This is your preliminary preferred duty, and admins may adjust it later if needed.'}</p>
                {quotaState.loading ? <span className="muted">{language === 'th' ? 'กำลังโหลดโควต้าฝ่าย...' : 'Loading duty quotas...'}</span> : null}
                {quotaDuties.length ? quotaDuties.map((duty) => {
                  const selected = selectedDuties.includes(duty.duty_key);
                  return (
                  <label key={duty.duty_key} className={`duty-option-card ${duty.is_full ? 'is-disabled' : ''} ${selected ? 'is-selected' : ''}`} aria-disabled={duty.is_full}>
                    <input
                      type={isSingleDutySelection ? 'radio' : 'checkbox'}
                      name={isSingleDutySelection ? 'preferred-duty-position' : undefined}
                      checked={selected}
                      disabled={duty.is_full}
                      onChange={() => toggleDuty(duty.duty_key)}
                    />
                    <span>
                      <strong>{dutyLabel(duty)}</strong>
                      <small>{dutyDescription(duty)}</small>
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
                    <input type={isSingleDutySelection ? 'radio' : 'checkbox'} name={isSingleDutySelection ? 'preferred-duty-position' : undefined} checked={selectedDuties.includes(duty)} onChange={() => toggleDuty(duty)} />
                    <span>{duty}</span>
                  </label>
                ))}
                {errors.preferred_duties ? <small className="field-error" role="alert">{errors.preferred_duties}</small> : null}
              </fieldset>
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
              <fieldset className="event-checkbox-grid full-span">
                <legend>{language === 'th' ? 'ท่านมีข้อจำกัดด้านสุขภาพ การแพ้อาหาร หรือการแพ้ยาที่จำเป็นต้องแจ้งหรือไม่' : 'Do you have any health limitations, food allergies, or drug allergies that the team should know about?'}</legend>
                <label>
                  <input type="radio" name="has-health-notice" value="no" checked={hasHealthNotice === 'no'} onChange={() => setHasHealthNotice('no')} />
                  <span>{language === 'th' ? 'ไม่มี' : 'No'}</span>
                </label>
                <label>
                  <input type="radio" name="has-health-notice" value="yes" checked={hasHealthNotice === 'yes'} onChange={() => setHasHealthNotice('yes')} />
                  <span>{language === 'th' ? 'มี' : 'Yes'}</span>
                </label>
                {errors.health_notice ? <small className="field-error" role="alert">{errors.health_notice}</small> : null}
              </fieldset>
              {hasHealthNotice === 'yes' ? (
                <>
                  <label className="field full-span">
                    <span>{language === 'th' ? 'โรคประจำตัว / ข้อจำกัดด้านสุขภาพ' : 'Chronic condition / health limitation'}</span>
                    <textarea value={chronicCondition} onChange={(eventInput) => setChronicCondition(eventInput.target.value)} rows={2} />
                  </label>
                  <Input label={language === 'th' ? 'แพ้อาหาร' : 'Food allergy'} value={foodAllergy} onChange={(eventInput) => setFoodAllergy(eventInput.target.value)} className="full-span" />
                  <Input label={language === 'th' ? 'แพ้ยา' : 'Drug allergy'} value={drugAllergy} onChange={(eventInput) => setDrugAllergy(eventInput.target.value)} className="full-span" />
                  <label className="field full-span">
                    <span>{language === 'th' ? 'หมายเหตุเพิ่มเติมเกี่ยวกับสุขภาพ' : 'Additional health note'}</span>
                    <textarea value={healthNote} onChange={(eventInput) => setHealthNote(eventInput.target.value)} rows={2} />
                  </label>
                  {errors.health_details ? <small className="field-error full-span" role="alert">{errors.health_details}</small> : null}
                </>
              ) : null}
              <label className="field full-span">
                <span>{language === 'th' ? 'หมายเหตุเพิ่มเติม' : 'Additional note'}</span>
                <textarea value={note} onChange={(eventInput) => setNote(eventInput.target.value)} rows={3} />
                <small>{language === 'th' ? 'สามารถแจ้งข้อมูลเพิ่มเติม เช่น ข้อจำกัดด้านเวลา ประสบการณ์ที่เกี่ยวข้อง หรือข้อมูลที่ผู้ดูแลควรทราบ' : 'You may add extra information such as time limitations, relevant experience, or anything the admin team should know.'}</small>
              </label>

              <fieldset className="event-checkbox-grid full-span">
                <legend>{language === 'th' ? 'การยืนยัน' : 'Consent'}</legend>
                {recruitment?.consentItemsTh.map((item) => (
                  <label key={item}>
                    <input type="checkbox" checked={Boolean(consents[item])} onChange={(eventInput) => setConsents({ ...consents, [item]: eventInput.target.checked })} />
                    <span>{consentItemLabel(item, language)}</span>
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
                  <span><strong>{language === 'th' ? 'ชื่อเล่น' : 'Nickname'}</strong>{safeNickname(identityLookup?.safe_person)}</span>
                  <span><strong>{language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'}</strong>{studentId || '-'}</span>
                  <span><strong>{language === 'th' ? 'สาขา' : 'Major'}</strong>{applicantMajor}</span>
                  <span><strong>{language === 'th' ? 'ชั้นปี' : 'Year'}</strong>{applicantYear}</span>
                  <span><strong>{language === 'th' ? 'CMU Mail' : 'CMU Mail'}</strong>{email || '-'}</span>
                  <span><strong>{language === 'th' ? 'เบอร์โทร' : 'Phone'}</strong>{phone || '-'}</span>
                  <span><strong>{language === 'th' ? 'ตำแหน่งฝ่ายที่เลือก' : 'Selected duty position'}</strong>{selectedDutyLabels[0] ?? '-'}</span>
                  <span><strong>{language === 'th' ? 'วันซ้อม' : 'Rehearsal'}</strong>{canAttendRehearsal || '-'}</span>
                  <span><strong>{language === 'th' ? 'วันปฏิบัติงาน' : 'Event day'}</strong>{canWorkEventDay || '-'}</span>
                  <span><strong>{language === 'th' ? 'ข้อมูลสุขภาพ/การแพ้' : 'Health/allergy information'}</strong>{healthSummary || '-'}</span>
                  <span><strong>{language === 'th' ? 'หมายเหตุ' : 'Note'}</strong>{note || '-'}</span>
                  <span><strong>{language === 'th' ? 'สถานะการยืนยันตัวตน' : 'Identity status'}</strong>{identityStatusLabel(identityLookup?.identity_status ?? 'pending_identity_review', language)}</span>
                  <span><strong>{language === 'th' ? 'ฝ่ายที่ระบบจัดให้เบื้องต้น' : 'Preliminary duty'}</strong>{assignmentPreview.duty ? dutyLabel(assignmentPreview.duty) : (language === 'th' ? 'รอผู้ดูแลจัดสรรเพิ่มเติม' : 'Pending admin assignment')}</span>
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
                <Button type="submit" loading={saving} disabled={saving}>{saving ? (language === 'th' ? 'กำลังส่งใบสมัคร...' : 'Submitting...') : (language === 'th' ? 'ยืนยันส่งใบสมัคร' : 'Confirm submission')}</Button>
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
            <Input label={language === 'th' ? 'CMU Mail ที่ถูกต้อง' : 'Correct CMU Mail'} type="email" value={email} onChange={(eventInput) => setEmail(eventInput.target.value)} error={errors.email} required />
            <Input label={language === 'th' ? 'เบอร์โทรปัจจุบัน' : 'Current phone'} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(eventInput) => setPhone(eventInput.target.value)} required />
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
