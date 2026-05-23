export type PersonRecord = {
  id: string;
  student_id: string | null;
  name_th: string | null;
  name_en: string | null;
  nickname: string | null;
  nickname_th?: string | null;
  nickname_en?: string | null;
  email: string | null;
  phone: string | null;
  faculty: string | null;
  department: string | null;
  major: string | null;
  year_level: number | null;
  line_id: string | null;
  instagram: string | null;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminPersonRecord = PersonRecord & {
  staff_profile_count: number;
  participant_profile_count: number;
  staff_application_count: number;
};

export type AdminPeopleFilters = {
  search?: string;
  source?: string;
  year_level?: number | '';
  major?: string;
  missing_field?: 'student_id' | 'email' | 'phone' | '';
  has_staff_profile?: boolean | '';
  has_participant_profile?: boolean | '';
  has_staff_application?: boolean | '';
  limit?: number;
  offset?: number;
};

export type AdminPeopleSearchResult = {
  total_count: number;
  limit: number;
  offset: number;
  rows: AdminPersonRecord[];
  filter_options?: {
    sources?: string[];
    year_levels?: number[];
    majors?: string[];
  };
};

export type PeopleSummary = {
  total_people: number;
  year2_people: number;
  legacy_profiles_people: number;
  legacy_staff_people: number;
  linked_staff_profiles: number;
  linked_participant_profiles: number;
  staff_applicant_people: number;
  missing_student_id: number;
  missing_email: number;
  missing_phone: number;
  duplicate_student_id_count: number;
  duplicate_email_count: number;
  duplicate_phone_count: number;
  staff_profiles_without_person_id: number;
  profiles_without_person_id: number;
  staff_applications_without_person_id: number;
  year2_import_skipped_count: number;
};

export type PeopleDataHealthIssue = {
  key: string;
  count: number;
  severity: 'info' | 'warning' | 'critical';
  message_th: string;
  message_en: string;
  next_action_th: string;
  next_action_en: string;
};

export type PeopleDataHealth = {
  issues: PeopleDataHealthIssue[];
};

export type VerifiedPersonPrefill = {
  person_id: string;
  student_id: string | null;
  display_name: string;
  nickname: string | null;
  name_th: string | null;
  name_en: string | null;
  faculty: string | null;
  department: string | null;
  major: string | null;
  year_level: number | null;
};

export type PersonPrefillResult = {
  success: boolean;
  code: 'ok' | 'identity_verification_failed' | string;
  message?: string;
  person?: VerifiedPersonPrefill;
};
