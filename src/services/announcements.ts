import { cleanText } from '../lib/cleaners';
import { supabase } from '../lib/supabase';

export type Announcement = {
  id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  type: 'banner' | 'schedule' | 'map' | 'traffic' | 'emergency' | 'faq' | 'update' | 'document';
  priority: 'critical' | 'important' | 'normal';
  audience: 'public' | 'staff' | 'admin';
  image_url: string | null;
  file_url: string | null;
  external_url: string | null;
  is_pinned: boolean | null;
  is_popup: boolean | null;
  visible: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AnnouncementInput = Partial<Announcement>;

function cleanAnnouncement(input: AnnouncementInput) {
  const payload = {
    title: cleanText(input.title) ?? '',
    description: cleanText(input.description),
    type: input.type ?? 'update',
    priority: input.priority ?? 'normal',
    audience: input.audience ?? 'public',
    image_url: cleanText(input.image_url),
    file_url: cleanText(input.file_url),
    external_url: cleanText(input.external_url),
    is_pinned: Boolean(input.is_pinned),
    is_popup: Boolean(input.is_popup),
    visible: input.visible ?? true,
    starts_at: cleanText(input.starts_at),
    ends_at: cleanText(input.ends_at),
  };
  return 'event_id' in input ? { ...payload, event_id: input.event_id ?? null } : payload;
}

function filterByEvent<T extends { event_id: string | null }>(rows: T[], eventId?: string | null) {
  if (!eventId) return rows;
  return rows.filter((row) => row.event_id === eventId || row.event_id === null);
}

export async function fetchPublicAnnouncements(eventId?: string | null) {
  const { data, error } = await supabase.rpc('get_visible_announcements', { input_audience: 'public' });
  if (error) throw error;
  return filterByEvent((data ?? []) as Announcement[], eventId);
}

export async function fetchStaffAnnouncements(eventId?: string | null) {
  const { data, error } = await supabase.rpc('get_visible_announcements', { input_audience: 'staff' });
  if (error) throw error;
  return filterByEvent((data ?? []) as Announcement[], eventId);
}

export async function fetchAnnouncement(id: string) {
  const { data, error } = await supabase.from('announcements').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Announcement | null;
}

export async function fetchAdminAnnouncements(eventId?: string | null) {
  const { data, error } = await supabase.from('announcements').select('*').order('is_pinned', { ascending: false }).order('updated_at', { ascending: false });
  if (error) throw error;
  return filterByEvent((data ?? []) as Announcement[], eventId);
}

export async function saveAnnouncement(input: AnnouncementInput) {
  const payload = cleanAnnouncement(input);
  if (!payload.title) throw new Error('กรุณากรอกหัวข้อประกาศ');
  if (input.id) {
    const { data, error } = await supabase.from('announcements').update(payload).eq('id', input.id).select('*').single();
    if (error) throw error;
    return data as Announcement;
  }
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('announcements').insert({ ...payload, created_by: user.user?.id ?? null }).select('*').single();
  if (error) throw error;
  return data as Announcement;
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadAnnouncementFile(file: File) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(file.type)) throw new Error('รองรับเฉพาะ JPG, PNG, WebP หรือ PDF');
  const extension = file.name.split('.').pop() || 'file';
  const path = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('announcements').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('announcements').getPublicUrl(path);
  return { url: data.publicUrl, path, type: file.type };
}
