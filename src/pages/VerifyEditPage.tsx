import { Save, SearchCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { CSSProperties } from 'react';
import { ContactLinks } from '../components/ContactLinks';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Toast, ToastState } from '../components/ui/Toast';
import { editableFields, fieldLabels } from '../lib/constants';
import { groupLabel } from '../lib/grouping';
import { groupMeta } from '../lib/groups';
import { majorLabel } from '../lib/major';
import type { EditableProfileFields, Profile } from '../lib/types';
import { fetchVerifiedFriendRecommendations, fetchVerifiedGroupContext } from '../services/groups';
import { createEditRequest, pickEditableFields, verifyProfileIdentity } from '../services/profiles';
import { errorMessage } from '../utils/error';

export function VerifyEditPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<EditableProfileFields | null>(null);
  const [groupContext, setGroupContext] = useState<Awaited<ReturnType<typeof fetchVerifiedGroupContext>>>(null);
  const [friends, setFriends] = useState<Awaited<ReturnType<typeof fetchVerifiedFriendRecommendations>>>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      const verified = await verifyProfileIdentity(email, phone);
      if (!verified) {
        setToast({ type: 'error', message: 'ไม่พบข้อมูลที่ตรงกับอีเมลและเบอร์โทรนี้' });
        return;
      }
      setProfile(verified);
      setForm(pickEditableFields(verified));
      const [context, recommendations] = await Promise.all([fetchVerifiedGroupContext(email, phone), fetchVerifiedFriendRecommendations(email, phone)]);
      setGroupContext(context);
      setFriends(recommendations);
      setToast({ type: 'success', message: 'ยืนยันตัวตนสำเร็จ' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'ยืนยันตัวตนไม่สำเร็จ') });
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
      setToast({ type: 'success', message: 'ส่งคำขอแก้ไขแล้ว รอแอดมินอนุมัติ' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, 'ส่งคำขอไม่สำเร็จ') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="narrow-page page-stack">
      <Toast toast={toast} />
      <div className="section-heading">
        <p className="eyebrow">ขอแก้ไขข้อมูล</p>
        <h1>ยืนยันตัวตนด้วยอีเมลและเบอร์โทร</h1>
        <p>ข้อมูลที่ส่งจะรอผู้ดูแลอนุมัติก่อนอัปเดตจริงในระบบ</p>
      </div>

      <Card>
        <form className="form-grid" onSubmit={handleVerify}>
          <Input label="อีเมล" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label="เบอร์โทร" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          <Button type="submit" disabled={loading} icon={<SearchCheck size={18} />}>
            ตรวจสอบข้อมูล
          </Button>
        </form>
      </Card>

      {loading ? <LoadingSkeleton count={2} /> : null}

      {profile && form ? (
        <>
          {groupContext?.assignment ? (
            <Card className="group-reveal" style={{ '--group-color': groupMeta[groupContext.assignment.main_group].color, '--group-soft': groupMeta[groupContext.assignment.main_group].soft } as CSSProperties}>
              <span className="group-badge-icon" />
              <div>
                <p className="eyebrow">Your Group</p>
                <h2>{groupLabel(groupContext.assignment.main_group, groupContext.assignment.subgroup)}</h2>
                <p>{groupContext.setting?.motto || groupMeta[groupContext.assignment.main_group].motto}</p>
              </div>
              <div className="group-details-grid">
                <div><strong>พี่สตาฟ</strong><span>{groupContext.staff_roster?.length ? groupContext.staff_roster.map((staff) => `${staff.nickname || staff.name}`).join(', ') : groupContext.setting?.mentors || groupMeta[groupContext.assignment.main_group].mentors.join(', ')}</span></div>
                <div><strong>เวลา</strong><span>{groupContext.setting?.schedule || groupMeta[groupContext.assignment.main_group].schedule}</span></div>
                <div><strong>จุดนัดพบ</strong><span>{groupContext.setting?.meeting_point || groupMeta[groupContext.assignment.main_group].meetingPoint}</span></div>
              </div>
            </Card>
          ) : (
            <Card className="empty-state">ยังไม่ได้จัดกลุ่ม กรุณารอผู้ดูแลระบบประกาศกลุ่ม</Card>
          )}

          {friends.length ? (
            <Card className="friend-panel">
              <h2>People You May Know in Your Group</h2>
              <div className="friend-carousel">
                {friends.map((friend) => (
                  <div className="friend-card" key={friend.id}>
                    <strong>{friend.nickname || friend.name_th}</strong>
                    <span>{friend.name_th}</span>
                    <small>{majorLabel(friend.major)}</small>
                    <ContactLinks instagram={friend.instagram} lineId={friend.line_id} compact />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="sensitive-panel">
            <h2>{profile.name_th}</h2>
            <p>แก้ไขได้เฉพาะข้อมูลติดต่อและข้อมูลสุขภาพด้านล่าง</p>
            <Card className="privacy-notice">
              <strong>Consent การแสดงข้อมูลกับเพื่อนในกลุ่ม</strong>
              <span>เปิดโปรไฟล์สาธารณะ = ยอมให้ระบบแนะนำชื่อเล่น ชื่อจริง และสาขาของคุณกับเพื่อนในกลุ่มเดียวกัน ส่วน Instagram/Line จะแสดงเฉพาะเมื่อเลือกยินยอมแยกด้านล่างเท่านั้น เบอร์โทรและข้อมูลสุขภาพจะไม่แสดงให้เพื่อนเห็น</span>
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
                    <span>{fieldLabels[field]}</span>
                  </label>
                ) : (
                  <Input
                    key={field}
                    label={fieldLabels[field]}
                    value={String(form[field] ?? '')}
                    onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                  />
                ),
              )}
              <div className="form-actions full-span">
                <Button type="submit" disabled={loading} icon={<Save size={18} />}>
                  ส่งคำขอแก้ไข
                </Button>
              </div>
            </form>
          </Card>
        </>
      ) : null}
    </section>
  );
}
