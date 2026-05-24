import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { eventPath, eventStaffApplyPath } from '../lib/eventRoutes';
import { fetchEventBySlug, lookupPersonForApplication, submitPersonUpdateRequest, type PersonApplicationLookupResult } from '../services/events';
import { errorMessage } from '../utils/error';

const cmuEmailPattern = /^[a-zA-Z0-9._%+-]+@cmu\.ac\.th$/;

function isValidCmuEmail(value: string) {
  const clean = value.trim().toLowerCase();
  return !/\s/.test(value.trim()) && cmuEmailPattern.test(clean);
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

export function EventProfileCheckPage() {
  const { language } = useLanguage();
  const { eventSlug = '' } = useParams();
  const eventState = useAsync(() => fetchEventBySlug(eventSlug), [eventSlug]);
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nameTh, setNameTh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [major, setMajor] = useState('');
  const [note, setNote] = useState('');
  const [lookup, setLookup] = useState<PersonApplicationLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const event = eventState.data;

  async function checkProfile() {
    if (!studentId.trim() || !isValidCmuEmail(email)) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณากรอกรหัสนักศึกษาและ CMU Mail ที่ลงท้ายด้วย @cmu.ac.th' : 'Please enter student ID and a valid CMU Mail.' });
      return;
    }
    try {
      setLoading(true);
      const result = await lookupPersonForApplication({ eventSlug, studentId, email, phone, nameTh, nameEn });
      if (result.success === false) {
        setToast({ type: 'error', message: result.message_th ?? (language === 'th' ? 'ตรวจสอบข้อมูลไม่สำเร็จ' : 'Could not check profile') });
        return;
      }
      setLookup(result);
      setToast({ type: result.identity_status === 'verified' ? 'success' : 'info', message: result.message_th ?? (language === 'th' ? 'ตรวจสอบข้อมูลแล้ว' : 'Profile checked') });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ตรวจสอบข้อมูลไม่สำเร็จ' : 'Could not check profile') });
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest() {
    if (!studentId.trim() || !isValidCmuEmail(email)) {
      setToast({ type: 'error', message: language === 'th' ? 'กรุณากรอกรหัสนักศึกษาและ CMU Mail ให้ถูกต้อง' : 'Please enter valid identity details.' });
      return;
    }
    try {
      setSaving(true);
      const result = await submitPersonUpdateRequest({
        eventSlug,
        studentId,
        email,
        phone,
        nameTh,
        nameEn,
        major,
        requestType: lookup?.identity_status === 'not_found' ? 'identity_not_found' : 'email_correction',
        evidenceNote: note,
      });
      if (!result.success) {
        setToast({ type: 'error', message: result.message_th ?? (language === 'th' ? 'ส่งคำร้องไม่สำเร็จ' : 'Could not submit request') });
        return;
      }
      setToast({ type: 'success', message: language === 'th' ? 'ส่งคำร้องแก้ไขข้อมูลแล้ว' : 'Update request submitted' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ส่งคำร้องไม่สำเร็จ' : 'Could not submit request') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="events-page narrow-page page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Profile Check"
        title={language === 'th' ? 'ตรวจสอบข้อมูลของฉัน' : 'Check My Profile'}
        description={language === 'th' ? 'ตรวจข้อมูลที่พบในฐานข้อมูลบุคคล และส่งคำร้องแก้ไขได้หากข้อมูลไม่ถูกต้อง' : 'Check the safe data found in the People Database and request corrections if needed.'}
        actions={<Button variant="secondary" icon={<RefreshCw size={18} />} onClick={eventState.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>}
      />

      {eventState.loading ? <LoadingSkeleton /> : null}
      {eventState.error ? <EmptyState title={language === 'th' ? 'โหลดกิจกรรมไม่สำเร็จ' : 'Could not load event'} action={<Button variant="secondary" onClick={eventState.reload}>{language === 'th' ? 'ลองใหม่' : 'Retry'}</Button>} /> : null}

      {event ? (
        <Card className="event-form-card">
          <div>
            <p className="eyebrow">{language === 'th' ? event.name_th : event.name_en || event.name_th}</p>
            <h2>{language === 'th' ? 'ยืนยันข้อมูลด้วยรหัสนักศึกษาและ CMU Mail' : 'Verify with student ID and CMU Mail'}</h2>
            <p className="muted">{language === 'th' ? 'หน้านี้ไม่แสดงอีเมลหรือเบอร์โทรเดิมแบบเต็ม และไม่แสดงข้อมูลสุขภาพ' : 'This page never shows full old email/phone or health data.'}</p>
          </div>
          <div className="form-grid">
            <Input label={language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'} value={studentId} onChange={(input) => setStudentId(input.target.value)} required />
            <Input label={language === 'th' ? 'CMU Mail ปัจจุบัน' : 'Current CMU Mail'} type="email" value={email} onChange={(input) => setEmail(input.target.value)} required />
            <Input label={language === 'th' ? 'เบอร์โทรที่ติดต่อได้' : 'Current phone'} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(input) => setPhone(input.target.value)} />
            <Input label={language === 'th' ? 'ชื่อ-นามสกุล' : 'Full name'} value={nameTh} onChange={(input) => setNameTh(input.target.value)} />
            <Input label={language === 'th' ? 'ชื่อภาษาอังกฤษ (ถ้ามี)' : 'English name (optional)'} value={nameEn} onChange={(input) => setNameEn(input.target.value)} />
            <Input label={language === 'th' ? 'สาขา' : 'Major'} value={major} onChange={(input) => setMajor(input.target.value)} />
          </div>
          <div className="event-card-actions">
            <Button loading={loading} onClick={() => void checkProfile()}>{language === 'th' ? 'ตรวจสอบข้อมูล' : 'Check profile'}</Button>
            <Link className="btn btn-secondary" to={eventStaffApplyPath(event.slug)}>{language === 'th' ? 'ไปสมัครสตาฟ' : 'Apply as staff'}</Link>
          </div>
        </Card>
      ) : null}

      {lookup ? (
        <Card className="event-detail-card" variant={lookup.identity_status === 'verified' ? 'success' : 'warning'}>
          <div>
            <p className="eyebrow">{language === 'th' ? 'ผลการตรวจสอบ' : 'Lookup result'}</p>
            <h2>{language === 'th' ? 'ข้อมูลที่พบในระบบ' : 'Data found in the system'}</h2>
            <p className="muted">{lookup.message_th ?? (language === 'th' ? 'ข้อมูลบางรายการอาจไม่เป็นปัจจุบัน หากพบข้อมูลผิด สามารถส่งคำร้องแก้ไขได้' : 'Some details may be outdated. You can request corrections if needed.')}</p>
          </div>
          {lookup.safe_person ? (
            <div className="event-fact-grid">
              <span><strong>{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full name'}</strong>{safeFullName(lookup.safe_person, nameTh)}</span>
              <span><strong>{language === 'th' ? 'ชื่อเล่น' : 'Nickname'}</strong>{safeNickname(lookup.safe_person)}</span>
              <span><strong>{language === 'th' ? 'รหัสนักศึกษา' : 'Student ID'}</strong>{lookup.safe_person.student_id ?? '-'}</span>
              <span><strong>{language === 'th' ? 'สาขา' : 'Major'}</strong>{lookup.safe_person.major ?? '-'}</span>
              <span><strong>{language === 'th' ? 'CMU Mail ในระบบ' : 'System CMU Mail'}</strong>{lookup.safe_person.masked_email ?? '-'}</span>
              <span><strong>{language === 'th' ? 'เบอร์โทรในระบบ' : 'System phone'}</strong>{lookup.safe_person.masked_phone ?? '-'}</span>
            </div>
          ) : (
            <p>{language === 'th' ? 'ไม่พบข้อมูลจากรหัสนักศึกษานี้ แต่คุณยังสามารถส่งคำร้องให้ผู้ดูแลตรวจสอบได้' : 'No record was found for this student ID. You can submit a request for admin review.'}</p>
          )}
          {lookup.identity_status !== 'verified' ? (
            <div className="page-stack">
              <p className="muted">{language === 'th' ? 'หาก CMU Mail ในฐานข้อมูลเดิมไม่ถูกต้อง สามารถส่งใบสมัครได้ตามปกติ ระบบจะให้ผู้ดูแลตรวจสอบตัวตนเพิ่มเติมภายหลัง' : 'If old CMU Mail is incorrect, you can still apply and admins will review identity later.'}</p>
              <label className="field">
                <span>{language === 'th' ? 'หมายเหตุสำหรับผู้ดูแล' : 'Note for admin'}</span>
                <textarea rows={3} value={note} onChange={(input) => setNote(input.target.value)} />
              </label>
              <Button loading={saving} onClick={() => void submitRequest()}>{language === 'th' ? 'ส่งคำร้องแก้ไขข้อมูล' : 'Submit update request'}</Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="event-actions-card" variant="soft">
        <div className="event-card-actions">
          <Link className="btn btn-secondary" to={eventPath(eventSlug)}>{language === 'th' ? 'กลับหน้ากิจกรรม' : 'Back to event'}</Link>
          <Link className="btn btn-primary" to={eventStaffApplyPath(eventSlug)}>{language === 'th' ? 'สมัครเป็นสตาฟ' : 'Apply as staff'}</Link>
        </div>
      </Card>
    </section>
  );
}
