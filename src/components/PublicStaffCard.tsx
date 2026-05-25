import { Facebook, Instagram, Phone } from 'lucide-react';
import { StaffAvatar } from './StaffAvatar';
import { groupLabel } from '../lib/grouping';
import { joinDisplayParts } from '../lib/display';
import { useLanguage } from '../context/LanguageContext';
import type { PublicStaffCardData } from '../services/staffProfiles';
import { staffDisplayName } from '../services/staffProfiles';

type PublicStaffCardProps = {
  staff: PublicStaffCardData;
  internal?: boolean;
};

export function PublicStaffCard({ staff, internal = false }: PublicStaffCardProps) {
  const { language } = useLanguage();
  const displayName = staffDisplayName(staff);
  const role = staff.primary_role || staff.position || (language === 'th' ? 'ทีมงาน' : 'Staff');
  const scope = staff.base_number
    ? `${language === 'th' ? 'ฐาน' : 'Base'} ${staff.base_number}`
    : groupLabel(staff.main_group, staff.subgroup, language);
  const roleLine = joinDisplayParts([role, scope], ' · ');

  return (
    <article className="public-staff-card">
      <StaffAvatar avatarPath={staff.avatar_path} avatarUrl={staff.avatar_url} name={displayName} />
      <div className="public-staff-body">
        <div>
          <strong>{displayName}</strong>
          <span>{roleLine}</span>
        </div>
        {staff.bio ? <p>{staff.bio}</p> : null}
        {staff.interests?.length ? <small>{staff.interests.join(' · ')}</small> : null}
        <div className="staff-contact-row">
          {staff.instagram ? <a href={`https://www.instagram.com/${staff.instagram.replace(/^@/, '')}/`} target="_blank" rel="noreferrer"><Instagram size={15} /> IG</a> : null}
          {staff.facebook ? <span><Facebook size={15} /> FB</span> : null}
          {staff.line_id ? <span>LINE</span> : null}
          {internal && staff.phone ? <a href={`tel:${staff.phone}`}><Phone size={15} /> {staff.phone}</a> : null}
        </div>
      </div>
    </article>
  );
}
