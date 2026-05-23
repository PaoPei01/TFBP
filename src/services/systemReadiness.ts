import { supabase } from '../lib/supabase';
import type { EventDutyQuotaStatus } from './events';

export type SystemReadinessReport = {
  ok: boolean;
  checked_at: string;
  database: {
    required_tables: string[];
    missing_tables: string[];
    required_columns: string[];
    missing_columns: string[];
    required_functions: string[];
    missing_functions: string[];
  };
  parent_orientation: {
    event_exists: boolean;
    event_id: string | null;
    event_status: string | null;
    event_visibility: string | null;
    duty_quota_count: number;
    duty_quota_total: number;
    expected_quota_total: number;
    quota_total_ok: boolean;
    quota_status: EventDutyQuotaStatus | null;
  };
  security: {
    rls_enabled_tables: string[];
    rls_missing_tables: string[];
  };
  recommendations: string[];
};

export async function fetchSystemReadinessReport(): Promise<SystemReadinessReport> {
  const { data, error } = await supabase.rpc('get_system_readiness_report');
  if (error) throw error;
  return data as SystemReadinessReport;
}
