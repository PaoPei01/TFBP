import type { MainGroup, StaffProfile, Subgroup } from './types';

export type StaffAttendanceSessionType =
  | 'check_in'
  | 'check_out'
  | 'shift_start'
  | 'shift_end'
  | 'roll_call'
  | 'emergency'
  | 'meeting';

export type StaffAttendanceSessionStatus = 'draft' | 'active' | 'closed' | 'archived';
export type StaffAttendanceTargetScope = 'all' | 'main_group' | 'subgroup' | 'role' | 'emergency_staff';
export type StaffAttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'checked_out' | 'cancelled';
export type StaffAttendanceMethod = 'session_qr' | 'manual' | 'admin_scan_staff_qr' | 'import' | 'system';

export type StaffAttendanceSummary = {
  total_targeted: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  checked_out: number;
  cancelled?: number;
  missing: number;
};

export type StaffAttendanceRecord = {
  id: string;
  session_id: string;
  staff_profile_id: string;
  status: StaffAttendanceStatus;
  method: StaffAttendanceMethod;
  scanned_at: string | null;
  checked_by: string | null;
  note: string | null;
  device_info: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type StaffAttendanceSession = {
  id: string;
  title: string;
  description: string | null;
  session_type: StaffAttendanceSessionType;
  target_scope: StaffAttendanceTargetScope;
  main_group: MainGroup | null;
  subgroup: Subgroup | null;
  role_filter: string | null;
  starts_at: string;
  ends_at: string | null;
  late_after: string | null;
  status: StaffAttendanceSessionStatus;
  qr_token: string | null;
  qr_expires_at: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  summary?: StaffAttendanceSummary;
};

export type StaffAttendanceSessionInput = Partial<
  Pick<
    StaffAttendanceSession,
    | 'title'
    | 'description'
    | 'session_type'
    | 'target_scope'
    | 'main_group'
    | 'subgroup'
    | 'role_filter'
    | 'starts_at'
    | 'ends_at'
    | 'late_after'
    | 'status'
    | 'qr_expires_at'
  >
>;

export type StaffAttendanceAdminRow = {
  staff_profile_id: string;
  student_id: string | null;
  email: string | null;
  name_th: string | null;
  name_en: string | null;
  nickname: string | null;
  nickname_th: string | null;
  nickname_en: string | null;
  phone: string | null;
  position: string | null;
  main_group: MainGroup | null;
  subgroup: Subgroup | null;
  system_role: string | null;
  primary_role: string | null;
  secondary_roles: string[] | null;
  base_number: number | null;
  record: StaffAttendanceRecord | null;
};

export type StaffAttendanceAdminData = {
  sessions: StaffAttendanceSession[];
  selected_session: StaffAttendanceSession | null;
  roster: StaffAttendanceAdminRow[];
  records: StaffAttendanceRecord[];
  summary: StaffAttendanceSummary;
};

export type MyStaffAttendanceSession = StaffAttendanceSession & {
  record: StaffAttendanceRecord | null;
};

export type MyStaffAttendanceData = {
  staff_profile: (StaffProfile & {
    assignment?: unknown;
    public_profile?: unknown;
  }) | null;
  active_sessions: MyStaffAttendanceSession[];
  records: Array<StaffAttendanceRecord & { session?: StaffAttendanceSession | null }>;
  latest_record: (StaffAttendanceRecord & { session?: StaffAttendanceSession | null }) | null;
};

export type StaffAttendanceScanCode =
  | 'checked_in'
  | 'late'
  | 'checked_out'
  | 'already_checked'
  | 'session_not_found'
  | 'session_not_active'
  | 'session_not_started'
  | 'session_closed'
  | 'qr_expired'
  | 'staff_not_found'
  | 'not_in_target_scope';

export type StaffAttendanceScanResult = {
  success: boolean;
  code: StaffAttendanceScanCode;
  message: string;
  session?: StaffAttendanceSession;
  record?: StaffAttendanceRecord;
};
