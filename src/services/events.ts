import { DEFAULT_EVENT_SLUG } from '../lib/defaultEvent';
import { supabase } from '../lib/supabase';
import type { EventRecord } from '../lib/eventTypes';

const eventFields = 'id,name_th,name_en,slug,description,event_type,academic_year,start_date,end_date,location,status,visibility,cover_image_path,created_at,updated_at';

function orderEvents<T extends { start_date: string | null; created_at: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a.start_date ?? a.created_at ?? 0).getTime();
    const bTime = new Date(b.start_date ?? b.created_at ?? 0).getTime();
    return bTime - aTime;
  });
}

export async function fetchPublicEvents(): Promise<EventRecord[]> {
  const { data, error } = await supabase
    .from('events')
    .select(eventFields)
    .eq('visibility', 'public')
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return orderEvents((data ?? []) as EventRecord[]);
}

export async function fetchEvents(): Promise<EventRecord[]> {
  return fetchPublicEvents();
}

export async function fetchEventBySlug(slug: string): Promise<EventRecord | null> {
  const { data, error } = await supabase
    .from('events')
    .select(eventFields)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as EventRecord | null;
}

export async function fetchDefaultEvent(): Promise<EventRecord | null> {
  return fetchEventBySlug(DEFAULT_EVENT_SLUG);
}

export async function fetchAdminEvents(): Promise<EventRecord[]> {
  const { data, error } = await supabase
    .from('events')
    .select(eventFields)
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return orderEvents((data ?? []) as EventRecord[]);
}
