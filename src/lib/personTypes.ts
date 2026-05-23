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
  merged_into?: string | null;
  merged_at?: string | null;
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
  include_merged?: boolean;
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
  merged_records?: number;
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

export type PeopleLinkedCounts = {
  staff_profiles: number;
  profiles: number;
  staff_applications: number;
  event_participants: number;
  event_staff: number;
  event_roles: number;
};

export type PeopleDuplicateRecord = {
  id: string;
  student_id: string | null;
  name_th: string | null;
  name_en: string | null;
  nickname: string | null;
  nickname_th?: string | null;
  nickname_en?: string | null;
  email: string | null;
  phone: string | null;
  major: string | null;
  year_level: number | null;
  source: string | null;
  created_at: string | null;
  linked_counts: PeopleLinkedCounts;
};

export type PeopleDuplicateGroup = {
  group_type: 'student_id' | 'email' | 'phone' | 'name' | string;
  match_value: string;
  people: PeopleDuplicateRecord[];
};

export type PeopleDuplicateSummary = {
  duplicate_student_id_groups: number;
  duplicate_email_groups: number;
  duplicate_phone_groups: number;
  similar_name_groups: number;
  merged_records: number;
};

export type PeopleDuplicateResult = {
  duplicate_student_ids: PeopleDuplicateGroup[];
  duplicate_emails: PeopleDuplicateGroup[];
  duplicate_phones: PeopleDuplicateGroup[];
  duplicate_names?: PeopleDuplicateGroup[];
  summary: PeopleDuplicateSummary;
};

export type PeopleMergeResult = {
  success: boolean;
  keep_person_id: string;
  merged_person_id: string;
  repointed: PeopleLinkedCounts & {
    event_form_responses: number;
  };
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
