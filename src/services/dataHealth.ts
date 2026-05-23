import { supabase } from '../lib/supabase';

export type DataHealthIssue = {
  type: string;
  severity: 'info' | 'warning' | 'error';
  count: number;
  message: string;
};

export type DataHealthResult = {
  summary: Record<string, number>;
  warnings: DataHealthIssue[];
  errors: DataHealthIssue[];
  details: Record<string, Array<Record<string, unknown>>>;
};

export type PeopleNameNicknameConflict = {
  id: string;
  student_id: string | null;
  name_th: string | null;
  name_en: string | null;
  nickname: string | null;
  nickname_th: string | null;
  nickname_en: string | null;
  major: string | null;
};

export async function validateDataIntegrity() {
  const { data, error } = await supabase.rpc('validate_data_integrity');
  if (error) throw error;
  return data as DataHealthResult;
}

export async function fetchPeopleNameNicknameConflicts(): Promise<PeopleNameNicknameConflict[]> {
  const { data, error } = await supabase
    .from('people')
    .select('id,student_id,name_th,name_en,nickname,nickname_th,nickname_en,major')
    .limit(2000);
  if (error) throw error;
  return ((data ?? []) as PeopleNameNicknameConflict[]).filter((row) => {
    const nicknames = [row.nickname, row.nickname_th, row.nickname_en]
      .map((value) => String(value ?? '').trim().toLowerCase())
      .filter(Boolean);
    const names = [row.name_th, row.name_en]
      .map((value) => String(value ?? '').trim().toLowerCase())
      .filter(Boolean);
    return names.some((name) => nicknames.includes(name));
  });
}

export async function runDataHealthRepair(action: 'normalize_majors' | 'clean_placeholders' | 'repair_staff_roles' | 'repair_orphans' | 'sync_staff_roster') {
  const rpc = {
    normalize_majors: 'normalize_all_major_values',
    clean_placeholders: 'clean_placeholder_values_admin',
    repair_staff_roles: 'repair_staff_assignment_roles',
    repair_orphans: 'repair_orphan_staff_assignments',
    sync_staff_roster: 'sync_staff_roster_safe',
  }[action];
  const { data, error } = rpc ? await supabase.rpc(rpc) : await supabase.rpc('run_data_health_repair', { input_action: action });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export type DataHealthRepairAction =
  | 'clean_placeholders'
  | 'normalize_majors'
  | 'repair_staff_roles'
  | 'repair_orphans'
  | 'sync_staff_roster'
  | 'rebuild_group_settings_mentors'
  | 'major_only_repair';

export async function runUnifiedDataHealthRepair(action: DataHealthRepairAction) {
  const { data, error } = await supabase.rpc('run_data_health_repair', { input_action: action });
  if (error) throw error;
  return data as Record<string, unknown>;
}
