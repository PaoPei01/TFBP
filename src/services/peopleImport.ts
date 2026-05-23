import { supabase } from '../lib/supabase';

export type Year2ImportWarningItem = {
  source_order?: number | null;
  student_id?: string | null;
  count?: number | null;
  email?: string | null;
  phone?: string | null;
};

export type Year2ImportPreview = {
  total_rows: number;
  valid_student_id_count: number;
  valid_email_count: number;
  valid_phone_count: number;
  duplicate_student_id_count: number;
  rows_with_health_data: number;
  rows_ready_to_import: number;
  rows_missing_student_id: number;
  rows_missing_email: number;
  rows_missing_phone: number;
  warnings?: {
    duplicate_student_ids?: Year2ImportWarningItem[];
    invalid_phone_examples?: Year2ImportWarningItem[];
    invalid_email_examples?: Year2ImportWarningItem[];
  };
};

export type Year2ImportResult = {
  inserted_count: number;
  updated_count: number;
  skipped_count: number;
  health_data_not_imported_count: number;
  errors_count: number;
};

export async function previewYear2PeopleImport(): Promise<Year2ImportPreview> {
  const { data, error } = await supabase.rpc('preview_year2_people_import');
  if (error) throw error;
  return data as Year2ImportPreview;
}

export async function importYear2PeopleFromStaging(): Promise<Year2ImportResult> {
  const { data, error } = await supabase.rpc('import_year2_people_from_staging');
  if (error) throw error;
  return data as Year2ImportResult;
}
