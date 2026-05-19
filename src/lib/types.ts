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

export type PublicProfile = Pick<Profile, 'id' | 'name_th' | 'nickname' | 'major'>;

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

export type GroupProfile = Profile & {
  group_assignment?: GroupAssignment | null;
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
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
    };
  };
};
