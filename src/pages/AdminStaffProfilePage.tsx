import { Check, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { PublicStaffCard } from '../components/PublicStaffCard';
import { AvatarUploadCard } from '../components/ui/AvatarUploadCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { approveStaffEditRequest, fetchAdminStaffProfileDetail, rejectStaffEditRequest, staffDisplayName, updateStaffPublicProfileAdmin, type StaffPublicProfileInput } from '../services/staffProfiles';
import { removeStaffAvatar, resolveStaffAvatarUrl, uploadStaffAvatar } from '../services/staffAvatar';
import { updateStaffProfile } from '../services/staffManagement';
import { errorMessage } from '../utils/error';

export function AdminStaffProfilePage() {
  const { id = '' } = useParams();
  const { language } = useLanguage();
  const state = useAsync(() => fetchAdminStaffProfileDetail(id), [id]);
  const [toast, setToast] = useState<ToastState>(null);
  const [publicPatch, setPublicPatch] = useState<StaffPublicProfileInput>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState<string | null>(null);
  const data = state.data;
  const mergedPublic = useMemo(() => ({ ...(data?.public_profile ?? {}), ...publicPatch }), [data?.public_profile, publicPatch]);
  const publicCard = data ? {
    staff_profile_id: data.profile.id,
    avatar_path: mergedPublic.avatar_path ?? null,
    avatar_url: mergedPublic.avatar_url ?? null,
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
    bio: mergedPublic.bio ?? null,
    interests: mergedPublic.interests ?? [],
    instagram: mergedPublic.show_instagram ? data.profile.instagram : null,
    line_id: mergedPublic.show_line_id ? data.profile.line_id : null,
    facebook: mergedPublic.show_facebook ? data.profile.facebook : null,
    phone: mergedPublic.show_phone_to_public ? data.profile.phone : null,
  } : null;

  useEffect(() => {
    let active = true;
    void resolveStaffAvatarUrl(mergedPublic).then((url) => {
      if (active) setAvatarDisplayUrl(url);
    });
    return () => {
      active = false;
    };
  }, [mergedPublic]);

  async function savePublic() {
    try {
      await updateStaffPublicProfileAdmin(id, mergedPublic);
      setToast({ type: 'success', message: language === 'th' ? 'บันทึก public profile แล้ว' : 'Public profile saved' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed') });
    }
  }

  async function uploadAvatar(file: File | null) {
    if (!file || !data) return;
    setUploadingAvatar(true);
    try {
      const result = await uploadStaffAvatar(data.profile.id, file);
      setPublicPatch({ ...publicPatch, avatar_path: result.avatar_path });
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
    if (!data) return;
    setUploadingAvatar(true);
    try {
      await removeStaffAvatar(data.profile.id, mergedPublic.avatar_path);
      setPublicPatch({ ...publicPatch, avatar_path: null });
      setAvatarDisplayUrl(null);
      setToast({ type: 'success', message: language === 'th' ? 'ลบรูปโปรไฟล์แล้ว' : 'Profile photo removed' });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ลบรูปไม่สำเร็จ' : 'Remove photo failed') });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function reviewRequest(requestId: string, approved: boolean) {
    try {
      if (approved) await approveStaffEditRequest(requestId);
      else await rejectStaffEditRequest(requestId, language === 'th' ? 'ปฏิเสธโดยผู้ดูแล' : 'Rejected by admin');
      setToast({ type: 'success', message: approved ? (language === 'th' ? 'อนุมัติแล้ว' : 'Approved') : (language === 'th' ? 'ปฏิเสธแล้ว' : 'Rejected') });
      await state.reload();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ดำเนินการไม่สำเร็จ' : 'Action failed') });
    }
  }

  async function saveCore() {
    if (!data) return;
    try {
      await updateStaffProfile(data.profile.id, {
        profile: data.profile,
        medical: data.medical_info ?? {},
        assignment: data.assignment ?? {},
      });
      setToast({ type: 'success', message: language === 'th' ? 'บันทึกข้อมูลหลักแล้ว' : 'Core profile saved' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed') });
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader eyebrow="Admin Staff Profile" title={language === 'th' ? 'โปรไฟล์ทีมงาน' : 'Staff Profile'} description={data ? staffDisplayName(data.profile) : ''} meta={<Link className="btn btn-secondary" to="/admin/staff">{language === 'th' ? 'กลับหน้าทีมงาน' : 'Back to staff'}</Link>} />
      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}
      {data ? (
        <>
          <div className="profile-tabs-grid">
            <Card>
              <h2>Overview</h2>
              <p>{data.profile.name_th || data.profile.name_en}</p>
              <p>{data.profile.email || '-'}</p>
              <p>{data.profile.phone || '-'}</p>
              <Button icon={<Save size={18} />} onClick={saveCore}>{language === 'th' ? 'บันทึกข้อมูลหลัก' : 'Save core data'}</Button>
            </Card>
            <Card>
              <h2>{language === 'th' ? 'Public Profile' : 'Public Profile'}</h2>
              {publicCard ? <PublicStaffCard staff={publicCard} /> : null}
              <AvatarUploadCard
                imageUrl={avatarDisplayUrl}
                displayName={staffDisplayName(data.profile)}
                uploading={uploadingAvatar}
                helperText={language === 'th' ? 'รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 5 MB ระบบจะย่อและบีบอัดรูปให้อัตโนมัติ' : 'JPG, PNG, WEBP up to 5 MB. Images are resized and compressed automatically.'}
                uploadLabel={mergedPublic.avatar_path ? (language === 'th' ? 'เปลี่ยนรูป' : 'Change photo') : (language === 'th' ? 'อัปโหลดรูป' : 'Upload photo')}
                removeLabel={language === 'th' ? 'ลบรูป' : 'Remove'}
                onFile={(file) => void uploadAvatar(file)}
                onRemove={() => void removeAvatar()}
              />
              <Input label="Bio" value={mergedPublic.bio ?? ''} onChange={(event) => setPublicPatch({ ...publicPatch, bio: event.target.value })} />
              <Input label={language === 'th' ? 'ภูมิลำเนา' : 'Hometown'} value={mergedPublic.hometown ?? ''} onChange={(event) => setPublicPatch({ ...publicPatch, hometown: event.target.value })} />
              <Input label={language === 'th' ? 'ความสนใจ' : 'Interests'} value={(mergedPublic.interests ?? []).join(', ')} onChange={(event) => setPublicPatch({ ...publicPatch, interests: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
              {['public_profile_enabled', 'show_instagram', 'show_line_id', 'show_facebook', 'show_phone_to_staff', 'show_phone_to_public'].map((key) => (
                <label className="check-field" key={key}>
                  <input type="checkbox" checked={Boolean(mergedPublic[key as keyof StaffPublicProfileInput])} onChange={(event) => setPublicPatch({ ...publicPatch, [key]: event.target.checked })} />
                  <span>{key}</span>
                </label>
              ))}
              <Button icon={<Save size={18} />} onClick={savePublic}>{language === 'th' ? 'บันทึก Public Profile' : 'Save public profile'}</Button>
            </Card>
            <Card className="sensitive-panel">
              <h2>{language === 'th' ? 'Medical' : 'Medical'}</h2>
              <p>{data.medical_info?.disease || '-'}</p>
              <p>{data.medical_info?.drug_allergy || '-'}</p>
              <p>{data.medical_info?.food_allergy || '-'}</p>
            </Card>
            <Card>
              <h2>{language === 'th' ? 'คำขอแก้ไข' : 'Edit requests'}</h2>
              {data.edit_requests.length ? data.edit_requests.map((request) => (
                <div className="request-row" key={request.id}>
                  <Badge status={request.status === 'approved' ? 'approved' : request.status === 'rejected' ? 'rejected' : 'pending'}>{request.status}</Badge>
                  <code>{JSON.stringify(request.new_data)}</code>
                  {request.status === 'pending' ? (
                    <span className="row-actions">
                      <Button icon={<Check size={16} />} onClick={() => reviewRequest(request.id, true)}>{language === 'th' ? 'อนุมัติ' : 'Approve'}</Button>
                      <Button variant="danger" icon={<X size={16} />} onClick={() => reviewRequest(request.id, false)}>{language === 'th' ? 'ปฏิเสธ' : 'Reject'}</Button>
                    </span>
                  ) : null}
                </div>
              )) : <p className="muted">{language === 'th' ? 'ไม่มีคำขอแก้ไข' : 'No edit requests'}</p>}
            </Card>
          </div>
        </>
      ) : null}
    </section>
  );
}
