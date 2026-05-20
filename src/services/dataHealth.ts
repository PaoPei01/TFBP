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

export async function validateDataIntegrity() {
  const { data, error } = await supabase.rpc('validate_data_integrity');
  if (error) throw error;
  return data as DataHealthResult;
}

export async function runDataHealthRepair(action: 'normalize_majors' | 'clean_placeholders' | 'repair_staff_roles' | 'repair_orphans' | 'sync_staff_roster') {
  const rpc = {
    normalize_majors: 'normalize_all_major_values',
    clean_placeholders: 'clean_placeholder_values_admin',
    repair_staff_roles: 'repair_staff_assignment_roles',
    repair_orphans: 'repair_orphan_staff_assignments',
    sync_staff_roster: 'sync_staff_roster_safe',
  }[action];
  const { data, error } = await supabase.rpc(rpc);
  if (error) throw error;
  return data as Record<string, unknown>;
}
