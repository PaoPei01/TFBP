import { Facebook, Instagram, Phone, UserRound } from 'lucide-react';
import { groupLabel } from '../lib/grouping';
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
  return (
    <article className="public-staff-card">
      <div className="staff-avatar" aria-hidden="true">
        {staff.avatar_url ? <img src={staff.avatar_url} alt="" loading="lazy" /> : <UserRound size={24} />}
      </div>
      <div className="public-staff-body">
        <div>
          <strong>{displayName}</strong>
          <span>{role} · {groupLabel(staff.main_group, staff.subgroup, language)}</span>
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
