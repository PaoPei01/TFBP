import type { StaffAttendanceIdentityResult, VerifiedStaffAttendanceIdentity } from './attendanceTypes';

const STORAGE_KEY = 'tfbp_verified_staff_identity';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function getVerifiedStaffIdentity(): VerifiedStaffAttendanceIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VerifiedStaffAttendanceIdentity;
    if (!isVerifiedStaffIdentityFresh(parsed)) {
      clearVerifiedStaffIdentity();
      return null;
    }
    return parsed;
  } catch {
    clearVerifiedStaffIdentity();
    return null;
  }
}

export function saveVerifiedStaffIdentity(identity: VerifiedStaffAttendanceIdentity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

export function clearVerifiedStaffIdentity() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isVerifiedStaffIdentityFresh(identity: VerifiedStaffAttendanceIdentity | null | undefined) {
  if (!identity?.staff_profile_id || !identity.verified_staff_token || !identity.personal_qr_payload || !identity.saved_at) {
    return false;
  }
  const savedAt = new Date(identity.saved_at).getTime();
  return Number.isFinite(savedAt) && Date.now() - savedAt <= MAX_AGE_MS;
}

export function identityFromAttendanceResult(result: StaffAttendanceIdentityResult): VerifiedStaffAttendanceIdentity | null {
  if (!result.success || !result.staff || !result.verified_staff_token || !result.personal_qr_payload) {
    return null;
  }
  return {
    staff_profile_id: result.staff.staff_profile_id,
    display_name: result.staff.display_name,
    nickname: result.staff.nickname,
    main_group: result.staff.main_group,
    subgroup: result.staff.subgroup,
    primary_role: result.staff.primary_role,
    verified_staff_token: result.verified_staff_token,
    personal_qr_payload: result.personal_qr_payload,
    saved_at: new Date().toISOString(),
  };
}
