import { supabase } from '../lib/supabase';
import type { DocumentBudgetItem, DocumentCenterData, DocumentEquipmentItem, DocumentProjectProfile, DocumentScheduleItem, DocumentTemplate, DocumentType, DocumentVenue, GeneratedDocument } from '../lib/documentTypes';

const templateBucket = 'document-templates';
const outputBucket = 'document-outputs';

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function filterByEvent<T extends { event_id: string | null }>(rows: T[], eventId?: string | null) {
  if (!eventId) return rows;
  return rows.filter((row) => row.event_id === eventId || row.event_id === null);
}

export async function fetchDocumentCenterData(eventId?: string | null): Promise<DocumentCenterData> {
  const [profileRes, templatesRes, historyRes] = await Promise.all([
    supabase.from('document_project_profiles').select('*').order('updated_at', { ascending: false }),
    supabase.from('document_templates').select('*').order('created_at', { ascending: false }),
    supabase.from('generated_documents').select('*').order('generated_at', { ascending: false }).order('created_at', { ascending: false }).limit(80),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (templatesRes.error) throw templatesRes.error;
  if (historyRes.error) throw historyRes.error;
  const profiles = filterByEvent((profileRes.data ?? []) as DocumentProjectProfile[], eventId);
  const profile = profiles[0] ?? null;
  const profileId = profile?.id;
  const [budgetRes, scheduleRes, venuesRes, equipmentRes] = profileId ? await Promise.all([
    supabase.from('document_budget_items').select('*').eq('project_profile_id', profileId).order('created_at'),
    supabase.from('document_schedule_items').select('*').eq('project_profile_id', profileId).order('sort_order').order('start_time'),
    supabase.from('document_venues').select('*').eq('project_profile_id', profileId).order('created_at'),
    supabase.from('document_equipment_items').select('*').eq('project_profile_id', profileId).order('created_at'),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (budgetRes.error) throw budgetRes.error;
  if (scheduleRes.error) throw scheduleRes.error;
  if (venuesRes.error) throw venuesRes.error;
  if (equipmentRes.error) throw equipmentRes.error;
  return {
    profile,
    templates: filterByEvent((templatesRes.data ?? []) as DocumentTemplate[], eventId),
    budgetItems: (budgetRes.data ?? []) as DocumentBudgetItem[],
    scheduleItems: (scheduleRes.data ?? []) as DocumentScheduleItem[],
    venues: (venuesRes.data ?? []) as DocumentVenue[],
    equipmentItems: (equipmentRes.data ?? []) as DocumentEquipmentItem[],
    history: filterByEvent((historyRes.data ?? []) as GeneratedDocument[], eventId),
  };
}

export async function saveProjectProfile(input: {
  profile: Partial<DocumentProjectProfile>;
  budgetItems: Array<Partial<DocumentBudgetItem>>;
  scheduleItems: Array<Partial<DocumentScheduleItem>>;
  venues: Array<Partial<DocumentVenue>>;
  equipmentItems: Array<Partial<DocumentEquipmentItem>>;
}) {
  const { data: profile, error } = await supabase.rpc('save_document_project_profile', { input_data: input });
  if (error) throw error;
  const saved = profile as DocumentProjectProfile;
  if ('event_id' in input.profile && saved.id) {
    const { data: updated, error: updateError } = await supabase
      .from('document_project_profiles')
      .update({ event_id: input.profile.event_id ?? null })
      .eq('id', saved.id)
      .select('*')
      .single();
    if (updateError) throw updateError;
    return updated as DocumentProjectProfile;
  }
  return saved;
}

export async function uploadDocumentTemplate(input: {
  name: string;
  description: string | null;
  document_type: DocumentType;
  file: File;
  placeholders: string[];
  is_active: boolean;
  event_id?: string | null;
}) {
  const userId = await currentUserId();
  const safeName = input.file.name.replace(/[^\wก-๙.-]+/g, '-');
  const storagePath = `${userId ?? 'admin'}/${Date.now()}-${safeName}`;
  const upload = await supabase.storage.from(templateBucket).upload(storagePath, input.file, {
    contentType: input.file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    upsert: false,
  });
  if (upload.error) throw upload.error;
  const { data, error } = await supabase.from('document_templates').insert({
    name: input.name,
    document_type: input.document_type,
    description: input.description,
    file_name: input.file.name,
    mime_type: input.file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    storage_path: storagePath,
    placeholders: input.placeholders,
    is_active: input.is_active,
    event_id: input.event_id ?? null,
    created_by: userId,
  }).select('*').single();
  if (error) {
    const cleanup = await supabase.storage.from(templateBucket).remove([storagePath]);
    if (cleanup.error) console.warn('Template metadata insert failed and Storage cleanup also failed:', cleanup.error.message);
    throw error;
  }
  return data as DocumentTemplate;
}

export async function deleteDocumentTemplate(template: DocumentTemplate) {
  if (template.storage_path) await supabase.storage.from(templateBucket).remove([template.storage_path]);
  const { error } = await supabase.from('document_templates').delete().eq('id', template.id);
  if (error) throw error;
}

export async function downloadTemplateBuffer(template: DocumentTemplate) {
  if (template.storage_path) {
    const { data, error } = await supabase.storage.from(templateBucket).download(template.storage_path);
    if (error) throw error;
    return data.arrayBuffer();
  }
  if (template.template_content) {
    const binary = window.atob(template.template_content);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
  }
  throw new Error('ไม่พบไฟล์ template ใน Storage');
}

export async function uploadGeneratedDocx(fileName: string, blob: Blob) {
  const userId = await currentUserId();
  const storagePath = `${userId ?? 'admin'}/${new Date().toISOString().slice(0, 10)}/${fileName}`;
  const { error } = await supabase.storage.from(outputBucket).upload(storagePath, blob, {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    upsert: true,
  });
  if (error) throw error;
  return storagePath;
}

export async function recordGeneratedDocument(input: {
  id?: string;
  project_profile_id: string | null;
  template_id: string | null;
  file_name: string;
  title: string;
  document_type: DocumentType;
  version: number;
  status: string;
  output_docx_path: string;
  placeholders: Record<string, unknown>;
  snapshot_data: Record<string, unknown>;
  missing_fields: string[];
  preview_html: string;
  event_id?: string | null;
}) {
  const { data, error } = await supabase.rpc('create_generated_document_record', { input_data: input });
  if (error) throw error;
  const row = data as GeneratedDocument;
  if (input.event_id !== undefined && row.id) {
    const { data: updated, error: updateError } = await supabase
      .from('generated_documents')
      .update({ event_id: input.event_id })
      .eq('id', row.id)
      .select('*')
      .single();
    if (updateError) throw updateError;
    return updated as GeneratedDocument;
  }
  return row;
}

export async function downloadGeneratedDocument(row: GeneratedDocument) {
  if (!row.output_docx_path) throw new Error('เอกสารนี้ยังไม่มีไฟล์ DOCX ใน Storage');
  const { data, error } = await supabase.storage.from(outputBucket).download(row.output_docx_path);
  if (error) throw error;
  return data;
}
