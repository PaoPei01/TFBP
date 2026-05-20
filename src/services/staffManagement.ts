import { getMajorCode, normalizeMajor } from '../lib/major';
import { normalizeStaffOperationalRole, normalizeStaffSecondaryRoles, normalizeStaffSystemRole } from '../lib/staffRoles';
import { supabase } from '../lib/supabase';
import type { MainGroup, StaffAssignmentRecommendation, StaffManagementRow, StaffProfile, StaffQuotaAnalytics, StaffRole, StaffRoleConflict, StaffStructureValidation, Subgroup } from '../lib/types';
import type { StaffImportRow } from '../utils/staffImport';

export type StaffFilters = {
  search?: string;
  position?: string;
  mainGroup?: string;
  subgroup?: string;
  major?: string;
};

export type StaffUpdatePayload = {
  profile: Partial<StaffProfile>;
  medical: {
    disease?: string | null;
    drug_allergy?: string | null;
    food_allergy?: string | null;
    medical_note?: string | null;
  };
  assignment: {
    role?: StaffRole | null;
    main_group?: MainGroup | null;
    subgroup?: Subgroup | null;
    primary_role?: string | null;
    secondary_roles?: string[] | null;
  };
};

export async function fetchAdminStaffProfiles(filters: StaffFilters = {}): Promise<StaffManagementRow[]> {
  const { data, error } = await supabase.rpc('get_admin_staff_profiles');
  if (error) throw error;
  const rows = (data ?? []) as StaffManagementRow[];
  const term = filters.search?.trim().toLowerCase();
  return rows.filter((row) => {
    if (term) {
      const haystack = [
        row.name_th,
        row.name_en,
        row.nickname,
        row.nickname_th,
        row.nickname_en,
        row.student_id,
        row.phone,
        row.email,
        row.major,
        row.position,
        row.assignment?.main_group,
        row.assignment?.subgroup,
        row.assignment?.primary_role,
        ...(row.assignment?.secondary_roles ?? []),
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    if (filters.position && row.position !== filters.position) return false;
    if (filters.mainGroup && row.assignment?.main_group !== filters.mainGroup) return false;
    if (filters.subgroup && row.assignment?.subgroup !== filters.subgroup) return false;
    if (filters.major && getMajorCode(row.major) !== filters.major) return false;
    return true;
  });
}

export async function updateStaffProfile(id: string, payload: StaffUpdatePayload) {
  const clean = (object: Record<string, unknown>) => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, value === '' ? null : value]));
  const profile = clean(payload.profile as Record<string, unknown>);
  if (profile.major) profile.major = normalizeMajor(String(profile.major));
  const assignment = clean(payload.assignment);
  if (assignment.primary_role) assignment.primary_role = normalizeStaffOperationalRole(String(assignment.primary_role));
  if (assignment.secondary_roles) assignment.secondary_roles = normalizeStaffSecondaryRoles(assignment.secondary_roles as string[]);
  assignment.role = normalizeStaffSystemRole(String(assignment.role ?? ''), String(assignment.primary_role ?? ''));
  const { error } = await supabase.rpc('update_staff_profile_admin', {
    input_staff_profile_id: id,
    input_profile: profile,
    input_medical: clean(payload.medical),
    input_assignment: assignment,
  });
  if (error) throw error;
}

export async function deleteStaffProfile(id: string) {
  const { error } = await supabase.rpc('delete_staff_profile_admin', { input_staff_profile_id: id });
  if (error) throw error;
}

export async function importStaffRecords(rows: StaffImportRow[]) {
  const payload = rows.map((row) => ({
    profile: row.profile,
    medical: row.medical,
    assignment: {
      ...row.assignment,
      role: normalizeStaffSystemRole(row.assignment.role, row.assignment.primary_role),
      primary_role: normalizeStaffOperationalRole(row.assignment.primary_role ?? row.profile.position),
      secondary_roles: normalizeStaffSecondaryRoles(row.assignment.secondary_roles),
    },
  }));
  const { data, error } = await supabase.rpc('import_staff_records_admin', { input_rows: payload });
  if (error) throw error;
  return data as { imported: number };
}

export async function syncStaffRoster() {
  const { data, error } = await supabase.rpc('rebuild_staff_roster_sync');
  if (error) throw error;
  return data as { synced?: number; groups?: number };
}

export async function fetchStaffOperationsAnalytics() {
  const [quota, conflicts, validation, recommendations] = await Promise.all([
    supabase.rpc('get_staff_quota_analytics'),
    supabase.rpc('detect_staff_role_conflicts'),
    supabase.rpc('validate_staff_structure'),
    supabase.rpc('get_staff_assignment_recommendations'),
  ]);
  if (quota.error) throw quota.error;
  if (conflicts.error) throw conflicts.error;
  if (validation.error) throw validation.error;
  if (recommendations.error) throw recommendations.error;
  return {
    quota: quota.data as StaffQuotaAnalytics,
    conflicts: (conflicts.data ?? []) as StaffRoleConflict[],
    validation: validation.data as StaffStructureValidation,
    recommendations: (recommendations.data ?? []) as StaffAssignmentRecommendation[],
    staff: await fetchAdminStaffProfiles(),
  };
}
