import { supabase } from '../lib/supabase';
import type { GroupAssignment, GroupProfile, GroupSetting, GroupStaff, MainGroup, Subgroup, StaffAssignment } from '../lib/types';

export async function fetchGroupProfiles(): Promise<GroupProfile[]> {
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('*').order('name_th');
  if (profileError) throw profileError;

  const { data: assignments, error: assignmentError } = await supabase.from('group_assignments').select('*');
  if (assignmentError) throw assignmentError;

  const byProfile = new Map(((assignments ?? []) as GroupAssignment[]).map((assignment) => [assignment.profile_id, assignment]));
  return ((profiles ?? []) as GroupProfile[]).map((profile) => ({
    ...profile,
    group_assignment: byProfile.get(profile.id) ?? null,
  }));
}

export async function fetchProfileGroup(profileId: string): Promise<GroupAssignment | null> {
  const { data, error } = await supabase.from('group_assignments').select('*').eq('profile_id', profileId).maybeSingle();
  if (error) throw error;
  return data as GroupAssignment | null;
}

export async function saveGroupAssignments(assignments: Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup' | 'notes'>[]) {
  const { error } = await supabase.rpc('save_group_assignments', { input_assignments: assignments });
  if (error) throw error;
}

export async function lockGroups() {
  const { error } = await supabase.rpc('lock_group_assignments');
  if (error) throw error;
}

export async function fetchGroupSettings(): Promise<GroupSetting[]> {
  const { data, error } = await supabase.from('group_settings').select('*').order('main_group').order('subgroup');
  if (error) throw error;
  return (data ?? []) as GroupSetting[];
}

export async function saveGroupSetting(setting: Pick<GroupSetting, 'main_group' | 'subgroup' | 'motto' | 'meeting_point' | 'schedule' | 'mentors'>) {
  const { error } = await supabase.rpc('save_group_setting', {
    input_main_group: setting.main_group,
    input_subgroup: setting.subgroup,
    input_motto: setting.motto ?? '',
    input_meeting_point: setting.meeting_point ?? '',
    input_schedule: setting.schedule ?? '',
    input_mentors: setting.mentors ?? '',
  });
  if (error) throw error;
}

export async function fetchStaffContext(): Promise<{ assignment: StaffAssignment | null; settings: GroupSetting[]; staff_roster: GroupStaff[]; participants: GroupProfile[] } | null> {
  const { data, error } = await supabase.rpc('get_staff_group_context');
  if (error) throw error;
  return data as { assignment: StaffAssignment | null; settings: GroupSetting[]; staff_roster: GroupStaff[]; participants: GroupProfile[] } | null;
}

export async function isStaffOrAdmin() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const [{ data: admin }, { data: staff }] = await Promise.all([
    supabase.rpc('is_admin', { uid: userData.user.id }),
    supabase.rpc('is_staff', { uid: userData.user.id }),
  ]);
  return Boolean(admin || staff);
}

export function settingKey(mainGroup?: MainGroup | null, subgroup?: Subgroup | null) {
  return mainGroup && subgroup ? `${mainGroup}-${subgroup}` : '';
}

export async function fetchFriendRecommendations(profileId: string): Promise<GroupProfile[]> {
  const assignment = await fetchProfileGroup(profileId);
  if (!assignment) return [];

  const { data, error } = await supabase
    .from('group_assignments')
    .select('*, profiles(*)')
    .eq('main_group', assignment.main_group)
    .eq('subgroup', assignment.subgroup)
    .neq('profile_id', profileId)
    .limit(30);

  if (error) throw error;

  return ((data ?? []) as GroupAssignment[])
    .map((row) => {
      const profile = row.profiles as GroupProfile | undefined;
      return profile ? { ...profile, group_assignment: row } : null;
    })
    .filter(Boolean) as GroupProfile[];
}

export async function fetchVerifiedGroupContext(email: string, phone: string): Promise<{ profile: GroupProfile; assignment: GroupAssignment | null; setting?: GroupSetting | null; staff_roster?: GroupStaff[] } | null> {
  const { data, error } = await supabase.rpc('get_verified_group_context', { input_email: email.trim().toLowerCase(), input_phone: phone.trim() });
  if (error) throw error;
  return data as { profile: GroupProfile; assignment: GroupAssignment | null; setting?: GroupSetting | null; staff_roster?: GroupStaff[] } | null;
}

export async function fetchVerifiedFriendRecommendations(email: string, phone: string): Promise<GroupProfile[]> {
  const { data, error } = await supabase.rpc('get_friend_recommendations', { input_email: email.trim().toLowerCase(), input_phone: phone.trim() });
  if (error) throw error;
  return (data ?? []) as GroupProfile[];
}
