export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Profile = {
  id: string;
  email: string | null;
  student_id: string | null;
  name_th: string | null;
  name_en: string | null;
  nickname: string | null;
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

export type PublicProfile = Pick<Profile, 'id' | 'name_th' | 'name_en' | 'nickname' | 'major'> & {
  main_group: MainGroup | null;
  subgroup: Subgroup | null;
};

export type EditableProfileFields = Pick<
  Profile,
  | 'nickname'
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
  user_id: string;
  main_group: MainGroup | null;
  subgroup: Subgroup | null;
  role: StaffRole | null;
  created_at: string | null;
};

export type StaffRole = 'staff' | 'mentor' | 'emergency_staff' | 'viewer';

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
  student_id: string | null;
  name: string;
  nickname: string | null;
  phone: string | null;
  disease: string | null;
  drug_allergy: string | null;
  food_allergy: string | null;
  main_group: MainGroup;
  subgroup: Subgroup;
  duty: string | null;
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
};

export type EmergencyDashboardData = {
  summary: EmergencySummary;
  participants: EmergencyProfile[];
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
        Insert: Partial<StaffAssignment> & { user_id: string; role?: StaffRole };
        Update: Partial<StaffAssignment>;
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
        Args: { search_text: string; major_filter: string };
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
