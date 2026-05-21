export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Profile = {
  id: string;
  email: string | null;
  student_id: string | null;
  name_th: string | null;
  name_en: string | null;
  nickname: string | null;
  nickname_en: string | null;
  major: string | null;
  phone: string | null;
  emergency_phone: string | null;
  line_id: string | null;
  instagram: string | null;
  facebook: string | null;
  other_contact: string | null;
  food_allergy: string | null;
  disease: string | null;
  drug_allergy: string | null;
  admission_round: 'Portfolio' | 'Quota' | 'Admission' | null;
  form_submitted_at: string | null;
  registration_order: number | null;
  gender: string | null;
  hometown: string | null;
  interests: string | null;
  public_profile: boolean | null;
  show_instagram: boolean | null;
  show_line_id: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PublicProfile = Pick<Profile, 'id' | 'name_th' | 'name_en' | 'nickname' | 'nickname_en' | 'major'> & {
  main_group: MainGroup | null;
  subgroup: Subgroup | null;
};

export type EditableProfileFields = Pick<
  Profile,
  | 'nickname'
  | 'nickname_en'
  | 'phone'
  | 'emergency_phone'
  | 'line_id'
  | 'instagram'
  | 'facebook'
  | 'other_contact'
  | 'food_allergy'
  | 'disease'
  | 'drug_allergy'
  | 'public_profile'
  | 'show_instagram'
  | 'show_line_id'
>;

export type EditRequest = {
  id: string;
  profile_id: string | null;
  requested_by_email: string | null;
  old_data: Partial<Profile> | null;
  new_data: Partial<Profile> | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  profiles?: Profile | null;
};

export type ChangeLog = {
  id: string;
  profile_id: string | null;
  changed_by: string | null;
  action: string | null;
  old_data: Partial<Profile> | null;
  new_data: Partial<Profile> | null;
  created_at: string | null;
  profiles?: Pick<Profile, 'name_th' | 'nickname' | 'email'> | null;
};

export type AdminSummary = {
  total: number;
  pending: number;
  byMajor: Record<string, number>;
  health: {
    food_allergy: number;
    disease: number;
    drug_allergy: number;
  };
};

export type MainGroup = 'Red' | 'Blue' | 'Yellow' | 'Green' | 'Pink' | 'Purple' | 'Orange';
export type Subgroup = 'A' | 'B';

export type GroupAssignment = {
  id: string;
  profile_id: string;
  main_group: MainGroup;
  subgroup: Subgroup;
  assigned_by: string | null;
  assigned_at: string | null;
  locked: boolean | null;
  locked_at: string | null;
  locked_by: string | null;
  notes: string | null;
  profiles?: Profile | null;
};

export type GroupSetting = {
  id: string;
  main_group: MainGroup;
  subgroup: Subgroup;
  motto: string | null;
  meeting_point: string | null;
  schedule: string | null;
  mentors: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

export type StaffAssignment = {
  id: string;
  user_id: string | null;
  staff_profile_id: string | null;
  main_group: MainGroup | null;
  subgroup: Subgroup | null;
  role: StaffRole | null;
  primary_role: string | null;
  secondary_roles: string[] | null;
  base_number?: number | null;
  created_at: string | null;
};

export type StaffRole = 'staff' | 'mentor' | 'emergency_staff' | 'viewer';

export type StaffProfile = {
  id: string;
  user_id: string | null;
  student_id: string | null;
  email: string | null;
  name_th: string | null;
  name_en: string | null;
  nickname: string | null;
  nickname_th: string | null;
  nickname_en: string | null;
  phone: string | null;
  major: string | null;
  instagram: string | null;
  line_id: string | null;
  facebook: string | null;
  other_contact: string | null;
  position: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type StaffMedicalInfo = {
  id: string;
  staff_profile_id: string;
  disease: string | null;
  drug_allergy: string | null;
  food_allergy: string | null;
  medical_note: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type StaffPublicProfile = {
  staff_profile_id: string;
  avatar_path: string | null;
  avatar_url: string | null;
  bio: string | null;
  hometown: string | null;
  interests: string[] | null;
  public_profile_enabled: boolean | null;
  show_instagram: boolean | null;
  show_line_id: boolean | null;
  show_facebook: boolean | null;
  show_phone_to_staff: boolean | null;
  show_phone_to_public: boolean | null;
  staff_badges: string[] | null;
  qr_token: string | null;
  profile_completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type StaffEditRequest = {
  id: string;
  staff_profile_id: string;
  requested_by: string | null;
  old_data: Json | null;
  new_data: Json | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type StaffManagementRow = StaffProfile & {
  medical_info?: StaffMedicalInfo | null;
  assignment?: StaffAssignment | null;
  public_profile?: StaffPublicProfile | null;
  pending_staff_edit_requests?: number | null;
};

export type StaffQuotaAnalyticsRow = {
  role_name: string;
  target_count: number;
  current_primary_count: number;
  current_secondary_count: number;
  unique_staff_count: number;
  shortage_count: number;
  overflow_count: number;
  health_status: 'green' | 'yellow' | 'red' | 'neutral';
  overlap_count: number;
  missing_assignment_count: number;
  has_quota?: boolean;
};

export type StaffQuotaAnalytics = {
  rows: StaffQuotaAnalyticsRow[];
  total_staff: number;
  unique_staff: number;
  active_assignments: number;
  duplicate_record_count: number;
};

export type StaffRoleConflict = {
  staff_id: string;
  name: string;
  detected_conflicts: string[];
  severity: 'yellow' | 'red';
};

export type StaffStructureValidation = {
  warnings: string[];
  errors: string[];
  readiness_score: number;
};

export type StaffAssignmentRecommendation = {
  recommendation_type: string;
  source_role: string | null;
  target_role: string;
  suggested_staff: Array<{
    id: string;
    name: string;
    phone: string | null;
    primary_role: string | null;
    secondary_roles: string[] | null;
  }>;
  reason: string;
};

export type StaffAccessContext = {
  is_admin: boolean;
  assignments: StaffAssignment[];
  roles: StaffRole[];
  can_view_staff: boolean;
  can_mark_attendance: boolean;
  can_view_emergency: boolean;
  read_only: boolean;
};

export type StaffAttendance = {
  id: string;
  profile_id: string;
  event_date: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  note: string | null;
  main_group: MainGroup;
  subgroup: Subgroup;
  marked_by: string | null;
  marked_at: string | null;
};

export type GroupStaff = {
  id: string;
  staff_profile_id?: string | null;
  user_id?: string | null;
  student_id: string | null;
  name: string;
  name_th?: string | null;
  name_en?: string | null;
  nickname: string | null;
  nickname_th?: string | null;
  nickname_en?: string | null;
  phone: string | null;
  instagram?: string | null;
  line_id?: string | null;
  facebook?: string | null;
  other_contact?: string | null;
  disease: string | null;
  drug_allergy: string | null;
  food_allergy: string | null;
  main_group: MainGroup;
  subgroup: Subgroup;
  duty: string | null;
  position?: string | null;
  source?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type GroupProfile = Profile & {
  group_assignment?: GroupAssignment | null;
  attendance?: StaffAttendance | null;
};

export type StaffGroupContext = {
  access: StaffAccessContext;
  assignment: StaffAssignment | null;
  settings: GroupSetting[];
  staff_roster: GroupStaff[];
  participants: GroupProfile[];
};

export type StaffAttendanceContext = {
  access: StaffAccessContext;
  event_date: string;
  participants: GroupProfile[];
};

export type EmergencyProfile = Profile & {
  main_group: MainGroup | null;
  subgroup: Subgroup | null;
  emergency_note: string | null;
  needs_special_care: boolean | null;
  emergency_note_updated_at: string | null;
};

export type EmergencySummary = {
  total: number;
  disease: number;
  drug_allergy: number;
  food_allergy: number;
  needs_special_care: number;
  staff_medical?: number;
};

export type EmergencyStaffMedicalProfile = {
  id: string;
  student_id: string | null;
  email: string | null;
  name_th: string | null;
  name_en: string | null;
  nickname: string | null;
  nickname_th: string | null;
  nickname_en: string | null;
  phone: string | null;
  major: string | null;
  position: string | null;
  main_group: MainGroup | null;
  subgroup: Subgroup | null;
  primary_role: string | null;
  disease: string | null;
  drug_allergy: string | null;
  food_allergy: string | null;
  medical_note: string | null;
};

export type EmergencyDashboardData = {
  summary: EmergencySummary;
  participants: EmergencyProfile[];
  staff_medical?: EmergencyStaffMedicalProfile[];
};

export type GroupStats = {
  key: string;
  main_group: MainGroup;
  subgroup: Subgroup;
  count: number;
  capacity: number;
  majorCounts: Record<string, number>;
  admissionCounts: Record<string, number>;
  registrationCounts: Record<string, number>;
  medicalCounts: Record<string, number>;
  genderCounts: Record<string, number>;
  warnings: string[];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id?: string };
        Update: Partial<Profile>;
      };
      edit_requests: {
        Row: Omit<EditRequest, 'profiles'>;
        Insert: Partial<Omit<EditRequest, 'id' | 'profiles'>> & { profile_id: string; requested_by_email?: string | null };
        Update: Partial<Omit<EditRequest, 'profiles'>>;
      };
      change_logs: {
        Row: Omit<ChangeLog, 'profiles'>;
        Insert: Partial<Omit<ChangeLog, 'id' | 'profiles'>>;
        Update: Partial<Omit<ChangeLog, 'profiles'>>;
      };
      admins: {
        Row: { user_id: string; role: string | null };
        Insert: { user_id: string; role?: string | null };
        Update: { role?: string | null };
      };
      group_assignments: {
        Row: Omit<GroupAssignment, 'profiles'>;
        Insert: Partial<Omit<GroupAssignment, 'id' | 'profiles'>> & { profile_id: string; main_group: MainGroup; subgroup: Subgroup };
        Update: Partial<Omit<GroupAssignment, 'profiles'>>;
      };
      group_settings: {
        Row: GroupSetting;
        Insert: Partial<GroupSetting> & { main_group: MainGroup; subgroup: Subgroup };
        Update: Partial<GroupSetting>;
      };
      staff_assignments: {
        Row: StaffAssignment;
        Insert: Partial<StaffAssignment> & { role?: StaffRole };
        Update: Partial<StaffAssignment>;
      };
      staff_profiles: {
        Row: StaffProfile;
        Insert: Partial<StaffProfile> & { id?: string };
        Update: Partial<StaffProfile>;
      };
      staff_medical_info: {
        Row: StaffMedicalInfo;
        Insert: Partial<StaffMedicalInfo> & { staff_profile_id: string };
        Update: Partial<StaffMedicalInfo>;
      };
      staff_public_profiles: {
        Row: StaffPublicProfile;
        Insert: Partial<StaffPublicProfile> & { staff_profile_id: string };
        Update: Partial<StaffPublicProfile>;
      };
      staff_edit_requests: {
        Row: StaffEditRequest;
        Insert: Partial<StaffEditRequest> & { staff_profile_id: string };
        Update: Partial<StaffEditRequest>;
      };
      staff_audit_logs: {
        Row: {
          id: string;
          staff_profile_id: string | null;
          actor_id: string | null;
          action: string;
          old_data: Json | null;
          new_data: Json | null;
          created_at: string | null;
        };
        Insert: {
          staff_profile_id?: string | null;
          actor_id?: string | null;
          action: string;
          old_data?: Json | null;
          new_data?: Json | null;
        };
        Update: Record<string, never>;
      };
      staff_attendance: {
        Row: StaffAttendance;
        Insert: Partial<StaffAttendance> & { profile_id: string; status: StaffAttendance['status']; main_group: MainGroup; subgroup: Subgroup };
        Update: Partial<StaffAttendance>;
      };
      group_staff: {
        Row: GroupStaff;
        Insert: Partial<GroupStaff> & { name: string; main_group: MainGroup; subgroup: Subgroup };
        Update: Partial<GroupStaff>;
      };
      emergency_notes: {
        Row: {
          profile_id: string;
          note: string | null;
          needs_special_care: boolean | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          profile_id: string;
          note?: string | null;
          needs_special_care?: boolean | null;
          updated_by?: string | null;
        };
        Update: {
          note?: string | null;
          needs_special_care?: boolean | null;
          updated_by?: string | null;
        };
      };
    };
    Views: {
      public_profiles: {
        Row: PublicProfile;
      };
    };
    Functions: {
      search_public_profiles: {
        Args: { search_text: string; major_filter: string; main_group_filter: string; subgroup_filter: string };
        Returns: PublicProfile[];
      };
      verify_profile_identity: {
        Args: { input_email: string; input_phone: string };
        Returns: Profile[];
      };
      approve_edit_request: {
        Args: { request_id: string };
        Returns: undefined;
      };
      reject_edit_request: {
        Args: { request_id: string; note: string };
        Returns: undefined;
      };
      submit_edit_request: {
        Args: { input_email: string; input_phone: string; input_profile_id: string; input_new_data: Json };
        Returns: undefined;
      };
      update_profile_admin: {
        Args: { input_profile_id: string; input_new_data: Json };
        Returns: undefined;
      };
      delete_profile_admin: {
        Args: { input_profile_id: string };
        Returns: undefined;
      };
      save_group_assignments: {
        Args: { input_assignments: Json };
        Returns: undefined;
      };
      lock_group_assignments: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      clear_group_assignments: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      is_staff: {
        Args: { uid: string };
        Returns: boolean;
      };
      get_staff_group_context: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_staff_access_context: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_staff_attendance_context: {
        Args: { input_event_date?: string };
        Returns: Json;
      };
      mark_staff_attendance: {
        Args: { input_profile_id: string; input_status: StaffAttendance['status']; input_note?: string; input_event_date?: string };
        Returns: undefined;
      };
      get_admin_staff_profiles: {
        Args: Record<string, never>;
        Returns: Json;
      };
      rebuild_staff_roster_sync: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_staff_public_directory: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_my_staff_profile: {
        Args: Record<string, never>;
        Returns: Json;
      };
      update_my_staff_public_profile: {
        Args: { input_data: Json };
        Returns: Json;
      };
      submit_staff_edit_request: {
        Args: { input_new_data: Json };
        Returns: Json;
      };
      get_public_staff_cards: {
        Args: { input_main_group?: string | null; input_subgroup?: string | null };
        Returns: Json;
      };
      get_staff_directory: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_admin_staff_profile_detail: {
        Args: { input_staff_profile_id: string };
        Returns: Json;
      };
      update_staff_public_profile_admin: {
        Args: { input_staff_profile_id: string; input_data: Json };
        Returns: Json;
      };
      approve_staff_edit_request: {
        Args: { request_id: string };
        Returns: undefined;
      };
      reject_staff_edit_request: {
        Args: { request_id: string; note: string };
        Returns: undefined;
      };
      get_staff_quota_analytics: {
        Args: Record<string, never>;
        Returns: Json;
      };
      detect_staff_role_conflicts: {
        Args: Record<string, never>;
        Returns: Json;
      };
      validate_staff_structure: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_staff_assignment_recommendations: {
        Args: Record<string, never>;
        Returns: Json;
      };
      update_staff_profile_admin: {
        Args: { input_staff_profile_id: string; input_profile: Json; input_medical?: Json; input_assignment?: Json };
        Returns: undefined;
      };
      delete_staff_profile_admin: {
        Args: { input_staff_profile_id: string };
        Returns: undefined;
      };
      get_emergency_dashboard: {
        Args: Record<string, never>;
        Returns: Json;
      };
      save_emergency_note: {
        Args: { input_profile_id: string; input_note: string; input_needs_special_care: boolean };
        Returns: undefined;
      };
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
    };
  };
};
