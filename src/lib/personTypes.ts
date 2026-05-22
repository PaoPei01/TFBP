export type PersonRecord = {
  id: string;
  student_id: string | null;
  name_th: string | null;
  name_en: string | null;
  nickname: string | null;
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
