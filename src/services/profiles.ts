import { editableFields } from '../lib/constants';
import { getMajorCode, majorCodeOptions } from '../lib/major';
import { supabase } from '../lib/supabase';
import type { AdminSummary, ChangeLog, EditableProfileFields, EditRequest, GroupAssignment, GroupProfile, Profile, PublicProfile } from '../lib/types';

type SearchOptions = {
  search?: string;
  major?: string;
  mainGroup?: string;
  subgroup?: string;
};

export async function fetchPublicProfiles(options: SearchOptions): Promise<PublicProfile[]> {
  const { data, error } = await supabase.rpc('search_public_profiles', {
    search_text: options.search?.trim() ?? '',
    major_filter: '',
  });
  if (error) throw error;
  const rows = (data ?? []) as PublicProfile[];
  return rows.filter((row) => {
    if (options.major && getMajorCode(row.major) !== options.major) return false;
    if (options.mainGroup && row.main_group !== options.mainGroup) return false;
    if (options.subgroup && row.subgroup !== options.subgroup) return false;
    return true;
  });
}

export async function fetchPublicMajors(): Promise<string[]> {
  const { data, error } = await supabase.from('public_profiles').select('major').not('major', 'is', null).order('major');
  if (error) throw error;
  return majorCodeOptions(((data ?? []) as Pick<Profile, 'major'>[]).map((row) => row.major));
}

export async function verifyProfileIdentity(email: string, phone: string): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('verify_profile_identity', {
    input_email: email.trim().toLowerCase(),
    input_phone: phone.trim(),
  });

  if (error) throw error;
  return ((data ?? []) as Profile[])[0] ?? null;
}

export function pickEditableFields(profile: Partial<Profile>): EditableProfileFields {
  const result: Record<string, string | boolean | null> = {};
  editableFields.forEach((field) => {
    result[field] = profile[field] ?? null;
  });
  return result as EditableProfileFields;
}

export async function createEditRequest(profile: Profile, newData: EditableProfileFields) {
  const { error } = await supabase.rpc('submit_edit_request', {
    input_email: profile.email ?? '',
    input_phone: profile.phone ?? '',
    input_profile_id: profile.id,
    input_new_data: newData,
  });

  if (error) throw error;
}

export async function fetchAdminProfiles(options: SearchOptions): Promise<GroupProfile[]> {
  let query = supabase.from('profiles').select('*').order('name_th');
  if (options.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    query = query.or(
      `name_th.ilike.${term},name_en.ilike.${term},nickname.ilike.${term},email.ilike.${term},phone.ilike.${term},major.ilike.${term},line_id.ilike.${term},instagram.ilike.${term},facebook.ilike.${term}`,
    );
  }

  if (options.major) {
    query = query.ilike('major', `%(${options.major})%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  const profiles = (data ?? []) as GroupProfile[];
  const { data: assignments, error: assignmentError } = await supabase.from('group_assignments').select('*');
  if (assignmentError) throw assignmentError;
  const byProfile = new Map(((assignments ?? []) as GroupAssignment[]).map((assignment) => [assignment.profile_id, assignment]));
  return profiles.map((profile) => ({ ...profile, group_assignment: byProfile.get(profile.id) ?? null }));
}

export async function fetchAdminMajors(): Promise<string[]> {
  const { data, error } = await supabase.from('profiles').select('major').not('major', 'is', null).order('major');
  if (error) throw error;
  return majorCodeOptions(((data ?? []) as Pick<Profile, 'major'>[]).map((row) => row.major));
}

export async function fetchAdminSummary(): Promise<AdminSummary> {
  const [{ data: profiles, error: profilesError }, { count: pending, error: pendingError }] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('edit_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  if (profilesError) throw profilesError;
  if (pendingError) throw pendingError;

  const rows = (profiles ?? []) as Profile[];
  return {
    total: rows.length,
    pending: pending ?? 0,
    byMajor: rows.reduce<Record<string, number>>((acc, row) => {
      const major = getMajorCode(row.major) || 'ไม่ระบุ';
      acc[major] = (acc[major] ?? 0) + 1;
      return acc;
    }, {}),
    health: {
      food_allergy: rows.filter((row) => row.food_allergy?.trim()).length,
      disease: rows.filter((row) => row.disease?.trim()).length,
      drug_allergy: rows.filter((row) => row.drug_allergy?.trim()).length,
    },
  };
}

export async function fetchPendingRequests(): Promise<EditRequest[]> {
  const { data, error } = await supabase
    .from('edit_requests')
    .select('*, profiles(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as EditRequest[];
}

export async function approveEditRequest(id: string) {
  const { error } = await supabase.rpc('approve_edit_request', { request_id: id });
  if (error) throw error;
}

export async function rejectEditRequest(id: string, note: string) {
  const { error } = await supabase.rpc('reject_edit_request', { request_id: id, note });
  if (error) throw error;
}

export async function updateProfile(id: string, values: Partial<Profile>) {
  const cleaned = Object.fromEntries(
    Object.entries(values)
      .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
      .map(([key, value]) => [key, value === '' ? null : value]),
  );
  const { error } = await supabase.rpc('update_profile_admin', { input_profile_id: id, input_new_data: cleaned });
  if (error) throw error;
}

export async function clearGroupAssignments() {
  const { error } = await supabase.rpc('clear_group_assignments');
  if (error) throw error;
}

export async function deleteProfile(id: string) {
  const { error } = await supabase.rpc('delete_profile_admin', { input_profile_id: id });
  if (error) throw error;
}

export async function fetchChangeLogs(): Promise<ChangeLog[]> {
  const { data, error } = await supabase
    .from('change_logs')
    .select('*, profiles(name_th, nickname, email)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as ChangeLog[];
}
