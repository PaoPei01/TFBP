import { cleanNullableText } from '../lib/dataClean';
import { supabase } from '../lib/supabase';
import type { Json, MainGroup, StaffAssignment, StaffEditRequest, StaffManagementRow, StaffMedicalInfo, StaffProfile, StaffPublicProfile, Subgroup } from '../lib/types';

export type StaffProfileContext = {
  profile: StaffProfile;
  public_profile: StaffPublicProfile | null;
  assignment: StaffAssignment | null;
  medical_info: StaffMedicalInfo | null;
  edit_requests: StaffEditRequest[];
};

export type PublicStaffCardData = {
  staff_profile_id: string;
  avatar_url: string | null;
  nickname: string | null;
  nickname_th: string | null;
  nickname_en: string | null;
  name_th: string | null;
  name_en: string | null;
  position: string | null;
  primary_role: string | null;
  main_group: MainGroup | null;
  subgroup: Subgroup | null;
  bio: string | null;
  interests: string[] | null;
  instagram: string | null;
  line_id: string | null;
  facebook: string | null;
  phone: string | null;
};

export type StaffDirectoryRow = PublicStaffCardData & {
  email: string | null;
  show_phone_to_staff: boolean | null;
};

export type VerifiedStaffProfileContext = {
  profile: Pick<StaffProfile, 'id' | 'student_id' | 'email' | 'name_th' | 'name_en' | 'nickname' | 'nickname_th' | 'nickname_en' | 'major' | 'instagram' | 'facebook' | 'position'>;
  public_profile: StaffPublicProfile | null;
  assignment: Pick<StaffAssignment, 'main_group' | 'subgroup' | 'primary_role' | 'secondary_roles'> | null;
  edit_requests: Array<Pick<StaffEditRequest, 'id' | 'status' | 'created_at' | 'admin_note'>>;
};

export type StaffPublicProfileInput = Partial<Pick<
  StaffPublicProfile,
  | 'avatar_url'
  | 'bio'
  | 'hometown'
  | 'interests'
  | 'public_profile_enabled'
  | 'show_instagram'
  | 'show_line_id'
  | 'show_facebook'
  | 'show_phone_to_staff'
  | 'show_phone_to_public'
>>;

function cleanInput(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [
    key,
    typeof value === 'string' || value == null ? cleanNullableText(value) : value,
  ])) as Json;
}

export async function fetchMyStaffProfile() {
  const { data, error } = await supabase.rpc('get_my_staff_profile');
  if (error) throw error;
  return data as StaffProfileContext;
}

export async function verifyStaffIdentity(email: string, phone: string) {
  const { data, error } = await supabase.rpc('verify_staff_identity', { input_email: email, input_phone: phone });
  if (error) throw error;
  return data as VerifiedStaffProfileContext | null;
}

export async function updateMyStaffPublicProfile(input: StaffPublicProfileInput) {
  const { data, error } = await supabase.rpc('update_my_staff_public_profile', { input_data: cleanInput(input as Record<string, unknown>) });
  if (error) throw error;
  return data as StaffPublicProfile;
}

export async function submitStaffEditRequest(input: { profile?: Record<string, unknown>; medical?: Record<string, unknown> }) {
  const payload = {
    profile: cleanInput(input.profile ?? {}),
    medical: cleanInput(input.medical ?? {}),
  };
  const { data, error } = await supabase.rpc('submit_staff_edit_request', { input_new_data: payload });
  if (error) throw error;
  return data as StaffEditRequest;
}

export async function updateStaffPublicProfileVerified(email: string, phone: string, input: StaffPublicProfileInput & { instagram?: string | null; facebook?: string | null }) {
  const { data, error } = await supabase.rpc('update_staff_public_profile_verified', {
    input_email: email,
    input_phone: phone,
    input_public_data: cleanInput(input as Record<string, unknown>),
  });
  if (error) throw error;
  return data as VerifiedStaffProfileContext;
}

export async function submitStaffEditRequestVerified(email: string, phone: string, input: { profile?: Record<string, unknown>; medical?: Record<string, unknown>; assignment?: Record<string, unknown> }) {
  const payload = {
    profile: cleanInput(input.profile ?? {}),
    medical: cleanInput(input.medical ?? {}),
    assignment: input.assignment ?? {},
  };
  const { data, error } = await supabase.rpc('submit_staff_edit_request_verified', { input_email: email, input_phone: phone, input_new_data: payload });
  if (error) throw error;
  return data as Pick<StaffEditRequest, 'id' | 'status' | 'created_at'>;
}

export async function fetchAdminStaffEditRequests() {
  const { data, error } = await supabase.rpc('get_staff_edit_requests_admin');
  if (error) throw error;
  return (data ?? []) as Array<StaffEditRequest & { staff_profile: StaffProfile | null }>;
}

export async function fetchPublicStaffCards(mainGroup?: string | null, subgroup?: string | null) {
  const { data, error } = await supabase.rpc('get_public_staff_cards', { input_main_group: mainGroup ?? null, input_subgroup: subgroup ?? null });
  if (error) throw error;
  return (data ?? []) as PublicStaffCardData[];
}

export async function fetchStaffDirectory() {
  const { data, error } = await supabase.rpc('get_staff_directory');
  if (error) throw error;
  return (data ?? []) as StaffDirectoryRow[];
}

export async function fetchAdminStaffProfileDetail(id: string) {
  const { data, error } = await supabase.rpc('get_admin_staff_profile_detail', { input_staff_profile_id: id });
  if (error) throw error;
  return data as StaffProfileContext & { audit_logs: Json[] };
}

export async function updateStaffPublicProfileAdmin(id: string, input: StaffPublicProfileInput) {
  const { data, error } = await supabase.rpc('update_staff_public_profile_admin', { input_staff_profile_id: id, input_data: cleanInput(input as Record<string, unknown>) });
  if (error) throw error;
  return data as StaffPublicProfile;
}

export async function approveStaffEditRequest(id: string) {
  const { error } = await supabase.rpc('approve_staff_edit_request', { request_id: id });
  if (error) throw error;
}

export async function rejectStaffEditRequest(id: string, note: string) {
  const { error } = await supabase.rpc('reject_staff_edit_request', { request_id: id, note });
  if (error) throw error;
}

export function staffDisplayName(row: Pick<StaffManagementRow, 'nickname_th' | 'nickname' | 'nickname_en' | 'name_th' | 'name_en' | 'student_id'> | PublicStaffCardData) {
  return row.nickname_th || row.nickname || row.nickname_en || row.name_th || row.name_en || ('student_id' in row ? row.student_id : null) || 'Unknown Staff';
}
