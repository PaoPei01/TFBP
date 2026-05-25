import { Edit3, Eye, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { PublicStaffCard } from '../components/PublicStaffCard';
import { StaffAvatar } from '../components/StaffAvatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { groupLabel } from '../lib/grouping';
import { fetchMyStaffProfile, staffDisplayName } from '../services/staffProfiles';

export function StaffProfilePage() {
  const { language } = useLanguage();
  const state = useAsync(fetchMyStaffProfile, []);
  const data = state.data;
  const publicCard = data ? {
    staff_profile_id: data.profile.id,
    avatar_path: data.public_profile?.avatar_path ?? null,
    avatar_url: data.public_profile?.avatar_url ?? null,
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
    bio: data.public_profile?.bio ?? null,
    interests: data.public_profile?.interests ?? [],
    instagram: data.public_profile?.show_instagram ? data.profile.instagram : null,
    line_id: data.public_profile?.show_line_id ? data.profile.line_id : null,
    facebook: data.public_profile?.show_facebook ? data.profile.facebook : null,
    phone: null,
  } : null;
  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Staff Profile"
        title={language === 'th' ? 'โปรไฟล์ทีมงานของฉัน' : 'My staff profile'}
        description={language === 'th' ? 'ดูข้อมูลทีมงานที่แสดงต่อผู้เข้าร่วม ข้อมูลติดต่อภายใน และสถานะคำขอแก้ไข' : 'Review your participant-facing profile, internal contact visibility, and edit request status.'}
        meta={<Link className="btn btn-primary" to="/staff/profile/edit"><Edit3 size={18} />{language === 'th' ? 'แก้ไขโปรไฟล์' : 'Edit profile'}</Link>}
      />
      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? <div className="error-state">{state.error}</div> : null}
      {data ? (
        <>
          <Card className="staff-profile-hero">
            <StaffAvatar avatarPath={data.public_profile?.avatar_path} avatarUrl={data.public_profile?.avatar_url} name={staffDisplayName(data.profile)} size="lg" />
            <div>
              <h2>{staffDisplayName(data.profile)}</h2>
              <p>{data.profile.name_th || data.profile.name_en}</p>
              <div className="badge-row">
                <Badge status={data.public_profile?.public_profile_enabled ? 'approved' : 'pending'}>{data.public_profile?.public_profile_enabled ? (language === 'th' ? 'เปิดโปรไฟล์สาธารณะ' : 'Public on') : (language === 'th' ? 'ยังไม่เปิดสาธารณะ' : 'Public off')}</Badge>
                <Badge>{data.assignment?.role ?? 'staff'}</Badge>
              </div>
            </div>
          </Card>

          <div className="dashboard-grid">
            <Card>
              <h2>{language === 'th' ? 'ข้อมูลที่น้องเห็น' : 'Participant preview'}</h2>
              {data.public_profile?.public_profile_enabled && publicCard ? <PublicStaffCard staff={publicCard} /> : <p className="muted">{language === 'th' ? 'โปรไฟล์นี้ยังไม่แสดงให้น้องเห็น' : 'This profile is not visible to participants yet.'}</p>}
              <Button variant="secondary" icon={<Eye size={18} />} disabled={!data.public_profile?.public_profile_enabled}>{language === 'th' ? 'ดูตัวอย่าง' : 'Preview'}</Button>
            </Card>

            <Card>
              <h2>{language === 'th' ? 'ข้อมูลติดต่อภายใน' : 'Internal contact'}</h2>
              <p><strong>Phone:</strong> {data.public_profile?.show_phone_to_staff ? data.profile.phone || '-' : language === 'th' ? 'ซ่อนไว้' : 'Hidden'}</p>
              <p><strong>LINE:</strong> {data.public_profile?.show_line_id ? data.profile.line_id || '-' : language === 'th' ? 'ซ่อนไว้' : 'Hidden'}</p>
              <p><strong>IG:</strong> {data.profile.instagram || '-'}</p>
            </Card>

            <Card>
              <h2>{language === 'th' ? 'หน้าที่และกลุ่ม' : 'Assignment'}</h2>
              <p>{data.assignment?.primary_role || data.profile.position || '-'}</p>
              <p>{groupLabel(data.assignment?.main_group, data.assignment?.subgroup, language)}</p>
            </Card>

            <Card className="sensitive-panel">
              <h2>{language === 'th' ? 'ข้อมูลสุขภาพส่วนตัว' : 'Private medical info'}</h2>
              <p><ShieldAlert size={16} /> {language === 'th' ? 'ข้อมูลนี้ไม่แสดงสาธารณะ ใช้เฉพาะแอดมินและทีมฉุกเฉินที่ได้รับสิทธิ์' : 'This is never public and is restricted to admin/emergency roles.'}</p>
              <p>{[data.medical_info?.disease, data.medical_info?.drug_allergy, data.medical_info?.food_allergy].filter(Boolean).join(' · ') || '-'}</p>
            </Card>
          </div>

          <Card>
            <h2>{language === 'th' ? 'สถานะคำขอแก้ไข' : 'Edit requests'}</h2>
            {data.edit_requests.length ? data.edit_requests.map((request) => (
              <div className="request-row" key={request.id}>
                <Badge status={request.status === 'approved' ? 'approved' : request.status === 'rejected' ? 'rejected' : 'pending'}>{request.status}</Badge>
                <span>{new Date(request.created_at ?? '').toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</span>
              </div>
            )) : <p className="muted">{language === 'th' ? 'ยังไม่มีคำขอแก้ไขที่รออนุมัติ' : 'No pending edit requests.'}</p>}
          </Card>
        </>
      ) : null}
    </section>
  );
}
