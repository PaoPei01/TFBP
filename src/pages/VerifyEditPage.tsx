import { Save, SearchCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { CSSProperties } from 'react';
import { ContactLinks } from '../components/ContactLinks';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { PublicStaffCard } from '../components/PublicStaffCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
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

export function VerifyEditPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<EditableProfileFields | null>(null);
  const [groupContext, setGroupContext] = useState<Awaited<ReturnType<typeof fetchVerifiedGroupContext>>>(null);
  const [publicStaffCards, setPublicStaffCards] = useState<PublicStaffCardData[]>([]);
  const [friends, setFriends] = useState<Awaited<ReturnType<typeof fetchVerifiedFriendRecommendations>>>([]);
  const [groupSoftMessage, setGroupSoftMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setToast(null);
    setGroupContext(null);
    setPublicStaffCards([]);
    setFriends([]);
    setGroupSoftMessage('');
    try {
      const verified = await verifyProfileIdentity(email, phone);
      if (!verified) {
        setToast({ type: 'error', message: language === 'th' ? 'ไม่พบข้อมูลที่ตรงกับอีเมลและเบอร์โทรนี้' : 'No profile matches this email and phone number.' });
        return;
      }
      setProfile(verified);
      setForm(pickEditableFields(verified));
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
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ยืนยันตัวตนไม่สำเร็จ' : 'Verification failed') });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile || !form) return;
    setLoading(true);
    try {
      await createEditRequest(profile, form);
      setToast({ type: 'success', message: language === 'th' ? 'ส่งคำขอแก้ไขแล้ว รอแอดมินอนุมัติ' : 'Edit request submitted. Waiting for admin approval.' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ส่งคำขอไม่สำเร็จ' : 'Request submission failed') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="narrow-page page-stack">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">{language === 'th' ? 'ขอแก้ไขข้อมูล' : 'Edit request'}</p>
        <h1>{language === 'th' ? 'ยืนยันตัวตนด้วยอีเมลและเบอร์โทร' : 'Verify with email and phone'}</h1>
        <p>{language === 'th' ? 'ข้อมูลที่ส่งจะรอผู้ดูแลอนุมัติก่อนอัปเดตจริงในระบบ' : 'Submitted changes will wait for admin approval before updating the system.'}</p>
      </div>

      <Card>
        <form className="form-grid" onSubmit={handleVerify}>
          <Input label={language === 'th' ? 'อีเมล' : 'Email'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label={language === 'th' ? 'เบอร์โทร' : 'Phone'} value={phone} onChange={(event) => setPhone(event.target.value)} required />
          <Button type="submit" disabled={loading} icon={<SearchCheck size={18} />}>
            {language === 'th' ? 'ตรวจสอบข้อมูล' : 'Verify'}
          </Button>
        </form>
      </Card>

      {loading || contextLoading ? <LoadingSkeleton count={contextLoading ? 1 : 2} /> : null}

      {profile && form ? (
        <>
          {groupContext?.assignment ? (
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
                  {publicStaffCards.map((staff) => <PublicStaffCard key={staff.staff_profile_id} staff={staff} />)}
                </div>
              ) : null}
            </Card>
          ) : groupSoftMessage ? <Card className="empty-state">{groupSoftMessage}</Card> : null}

          {friends.length ? (
            <Card className="friend-panel">
              <h2>{language === 'th' ? 'เพื่อนที่คุณอาจรู้จักในกลุ่ม' : 'People You May Know in Your Group'}</h2>
              <div className="friend-carousel">
                {friends.map((friend) => (
                  <div className="friend-card" key={friend.id}>
                    <strong>{friend.nickname || friend.name_th}</strong>
                    <span>{friend.name_th}</span>
                    <small>{majorLabel(friend.major, language)}</small>
                    <ContactLinks instagram={friend.instagram} lineId={friend.line_id} compact />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="sensitive-panel">
            <h2>{profile.name_th}</h2>
            <p>{language === 'th' ? 'แก้ไขได้เฉพาะข้อมูลติดต่อและข้อมูลสุขภาพด้านล่าง' : 'Only the contact and health fields below can be edited.'}</p>
            <Card className="privacy-notice">
              <strong>{language === 'th' ? 'Consent การแสดงข้อมูลกับเพื่อนในกลุ่ม' : 'Consent for group friend visibility'}</strong>
              <span>{language === 'th' ? 'เปิดโปรไฟล์สาธารณะ = ยอมให้ระบบแนะนำชื่อเล่น ชื่อจริง และสาขาของคุณกับเพื่อนในกลุ่มเดียวกัน ส่วน Instagram/Line จะแสดงเฉพาะเมื่อเลือกยินยอมแยกด้านล่างเท่านั้น เบอร์โทรและข้อมูลสุขภาพจะไม่แสดงให้เพื่อนเห็น' : 'Public profile ON allows the system to recommend your nickname, first name, and major to people in your subgroup. Instagram/Line are shown only when separately allowed. Phone numbers and health data are never shown to friends.'}</span>
            </Card>
            <form className="form-grid two-col" onSubmit={handleSubmit}>
              {editableFields.map((field) =>
                field === 'public_profile' || field === 'show_instagram' || field === 'show_line_id' ? (
                  <label className="check-field" key={field}>
                    <input
                      type="checkbox"
                      checked={Boolean(form[field])}
                      onChange={(event) => setForm({ ...form, [field]: event.target.checked })}
                    />
                    <span>{fieldLabel(field, language)}</span>
                  </label>
                ) : (
                  <Input
                    key={field}
                    label={fieldLabel(field, language)}
                    value={String(form[field] ?? '')}
                    onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                  />
                ),
              )}
              <div className="form-actions full-span">
                <Button type="submit" disabled={loading} icon={<Save size={18} />}>
                  {language === 'th' ? 'ส่งคำขอแก้ไข' : 'Submit edit request'}
                </Button>
              </div>
            </form>
          </Card>
        </>
      ) : null}
    </section>
  );
}
