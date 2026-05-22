import { cleanEmail, cleanPhone } from '../lib/cleaners';
import { supabase } from '../lib/supabase';
import type { PersonPrefillResult, PersonRecord } from '../lib/personTypes';

const personFields = 'id,student_id,name_th,name_en,nickname,email,phone,faculty,department,major,year_level,line_id,instagram,source,created_at,updated_at';

export async function fetchAdminPeople(): Promise<PersonRecord[]> {
  const { data, error } = await supabase
    .from('people')
    .select(personFields)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PersonRecord[];
}

export async function verifyPersonIdentityForPrefill(email: string, phone: string): Promise<PersonPrefillResult> {
  const { data, error } = await supabase.rpc('verify_person_identity_for_prefill', {
    input_email: cleanEmail(email),
    input_phone: cleanPhone(phone),
  });
  if (error) throw error;
  return data as PersonPrefillResult;
}
