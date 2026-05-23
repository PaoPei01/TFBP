import { cleanEmail, cleanPhone } from '../lib/cleaners';
import { supabase } from '../lib/supabase';
import type {
  AdminPeopleFilters,
  AdminPeopleSearchResult,
  PeopleDuplicateResult,
  PeopleMergeResult,
  PeopleDataHealth,
  PeopleSummary,
  PersonPrefillResult,
  PersonRecord,
} from '../lib/personTypes';

const personFields = 'id,student_id,name_th,name_en,nickname,email,phone,faculty,department,major,year_level,line_id,instagram,source,created_at,updated_at';

export async function fetchAdminPeople(params?: AdminPeopleFilters): Promise<PersonRecord[] | AdminPeopleSearchResult> {
  if (params) {
    const payload = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
    );
    const { data, error } = await supabase.rpc('search_admin_people', { input: payload });
    if (error) throw error;
    return data as AdminPeopleSearchResult;
  }

  const { data, error } = await supabase
    .from('people')
    .select(personFields)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PersonRecord[];
}

export async function fetchPeopleSummary(): Promise<PeopleSummary> {
  const { data, error } = await supabase.rpc('get_people_admin_summary');
  if (error) throw error;
  return data as PeopleSummary;
}

export async function fetchPeopleDataHealth(): Promise<PeopleDataHealth> {
  const { data, error } = await supabase.rpc('get_people_data_health');
  if (error) throw error;
  return data as PeopleDataHealth;
}

export async function findPeopleDuplicates(): Promise<PeopleDuplicateResult> {
  const { data, error } = await supabase.rpc('find_people_duplicates');
  if (error) throw error;
  return data as PeopleDuplicateResult;
}

export async function mergePeopleRecords(keepPersonId: string, mergePersonId: string, mergeNote?: string): Promise<PeopleMergeResult> {
  const { data, error } = await supabase.rpc('merge_people_records', {
    input_keep_person_id: keepPersonId,
    input_merge_person_id: mergePersonId,
    input_merge_note: mergeNote?.trim() || null,
  });
  if (error) throw error;
  return data as PeopleMergeResult;
}

export async function verifyPersonIdentityForPrefill(email: string, phone: string): Promise<PersonPrefillResult> {
  const { data, error } = await supabase.rpc('verify_person_identity_for_prefill', {
    input_email: cleanEmail(email),
    input_phone: cleanPhone(phone),
  });
  if (error) throw error;
  return data as PersonPrefillResult;
}

export async function previewPeopleLegacyLink(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('preview_people_legacy_link');
  if (error) throw error;
  return data as Record<string, number>;
}

export async function linkLegacyProfilesToPeople(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('link_legacy_profiles_to_people');
  if (error) throw error;
  return data as Record<string, number>;
}
