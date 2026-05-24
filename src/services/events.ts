import { DEFAULT_EVENT_SLUG } from '../lib/defaultEvent';
import { cleanEmail, cleanPhone } from '../lib/cleaners';
import { supabase } from '../lib/supabase';
import type { EventForm, EventFormType, EventRecord, EventSubmissionResult } from '../lib/eventTypes';

const eventFields = 'id,name_th,name_en,slug,description,event_type,academic_year,start_date,end_date,location,status,visibility,cover_image_path,metadata,created_at,updated_at';

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

export async function fetchAdminEventById(id: string): Promise<EventRecord | null> {
  const { data, error } = await supabase
    .from('events')
    .select(eventFields)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as EventRecord | null;
}

export async function updateAdminEvent(id: string, input: Partial<EventRecord>): Promise<EventRecord> {
  const payload = {
    name_th: input.name_th,
    name_en: input.name_en,
    slug: input.slug,
    description: input.description,
    event_type: input.event_type,
    academic_year: input.academic_year,
    start_date: input.start_date,
    end_date: input.end_date,
    location: input.location,
    status: input.status,
    visibility: input.visibility,
    cover_image_path: input.cover_image_path,
    metadata: input.metadata,
  };
  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id)
    .select(eventFields)
    .single();
  if (error) throw error;
  return data as EventRecord;
}

export async function fetchPublicEventForm(eventSlug: string, formType: EventFormType): Promise<EventForm | null> {
  const { data, error } = await supabase.rpc('get_public_event_form', {
    input_event_slug: eventSlug,
    input_form_type: formType,
  });
  if (error) throw error;
  return data as EventForm | null;
}

export async function submitEventParticipantRegistration(input: {
  eventSlug: string;
  email: string;
  phone: string;
  answers?: Record<string, unknown>;
}): Promise<EventSubmissionResult> {
  const { data, error } = await supabase.rpc('submit_event_participant_registration', {
    input_event_slug: input.eventSlug,
    input_email: cleanEmail(input.email),
    input_phone: cleanPhone(input.phone),
    input_answers: input.answers ?? {},
  });
  if (error) throw error;
  return data as EventSubmissionResult;
}

export async function submitEventStaffApplication(input: {
  eventSlug: string;
  email: string;
  phone: string;
  data?: Record<string, unknown>;
}): Promise<EventSubmissionResult> {
  const { data, error } = await supabase.rpc('submit_event_staff_application', {
    input_event_slug: input.eventSlug,
    input_email: cleanEmail(input.email),
    input_phone: cleanPhone(input.phone),
    input_data: input.data ?? {},
  });
  if (error) throw error;
  return data as EventSubmissionResult;
}

export type ApplicationIdentityStatus = 'verified' | 'email_mismatch' | 'pending_identity_review' | 'not_found' | 'rejected_identity' | 'unverified';

export type PersonApplicationLookupResult = {
  success?: boolean;
  code?: string;
  found: boolean;
  person_id?: string;
  identity_status: ApplicationIdentityStatus;
  can_continue_application: boolean;
  requires_update_request: boolean;
  message_th?: string;
  safe_person?: {
    person_id?: string;
    student_id: string | null;
    name_th?: string | null;
    name_en?: string | null;
    full_name_th?: string | null;
    full_name_en?: string | null;
    display_full_name?: string | null;
    display_name?: string | null;
    nickname: string | null;
    nickname_th?: string | null;
    nickname_en?: string | null;
    display_nickname?: string | null;
    major: string | null;
    year_level: number | null;
    masked_email: string | null;
    masked_phone: string | null;
  };
};

export async function lookupPersonForApplication(input: {
  eventSlug: string;
  studentId: string;
  email: string;
  phone?: string;
  nameTh?: string;
  nameEn?: string;
}): Promise<PersonApplicationLookupResult> {
  const { data, error } = await supabase.rpc('lookup_person_for_application', {
    input_event_slug: input.eventSlug,
    input_student_id: input.studentId.trim(),
    input_email: cleanEmail(input.email),
    input_phone: cleanPhone(input.phone ?? ''),
    input_name_th: input.nameTh ?? '',
    input_name_en: input.nameEn ?? '',
  });
  if (error) throw error;
  return data as PersonApplicationLookupResult;
}

export type PersonUpdateRequestResult = {
  success: boolean;
  code: string;
  message_th?: string;
  request?: {
    id: string;
    status: string;
  };
};

export async function submitPersonUpdateRequest(input: {
  eventSlug: string;
  studentId: string;
  email: string;
  phone: string;
  nameTh: string;
  nameEn?: string;
  major?: string;
  requestType?: string;
  evidenceNote?: string;
}): Promise<PersonUpdateRequestResult> {
  const { data, error } = await supabase.rpc('submit_person_update_request', {
    input_event_slug: input.eventSlug,
    input_student_id: input.studentId.trim(),
    input_email: cleanEmail(input.email),
    input_phone: cleanPhone(input.phone),
    input_name_th: input.nameTh,
    input_name_en: input.nameEn ?? '',
    input_major: input.major ?? '',
    input_request_type: input.requestType ?? 'email_correction',
    input_evidence_note: input.evidenceNote ?? '',
  });
  if (error) throw error;
  return data as PersonUpdateRequestResult;
}

export type StaffApplicationStatusResult = {
  success: boolean;
  code: 'found' | 'identity_required' | 'not_found' | string;
  message?: string;
  event?: {
    id: string;
    slug: string;
    name_th: string;
    name_en: string | null;
  };
  application?: {
    status: string;
    identity_status?: ApplicationIdentityStatus | string | null;
    assigned_duty?: string | null;
    assigned_duty_label_th?: string | null;
    assignment_method?: string | null;
    assignment_note?: string | null;
    final_duty: string | null;
    review_note: string | null;
    submitted_at: string | null;
  };
};

export type ApplicantExistingApplicationResult = {
  exists: boolean;
  already_applied: boolean;
  code?: string;
  message_th?: string;
  event?: {
    id: string;
    slug: string;
    name_th: string;
    name_en: string | null;
  };
  application?: {
    application_id: string;
    status: string;
    identity_status?: ApplicationIdentityStatus | string | null;
    assigned_duty?: string | null;
    assigned_duty_label_th?: string | null;
    assignment_method?: string | null;
    submitted_at?: string | null;
  };
};

export async function checkStaffApplicationForApplicant(input: {
  eventSlug: string;
  studentId: string;
  email?: string;
}): Promise<ApplicantExistingApplicationResult> {
  const { data, error } = await supabase.rpc('check_staff_application_for_applicant', {
    input_event_slug: input.eventSlug,
    input_student_id: input.studentId.trim(),
    input_email: cleanEmail(input.email ?? ''),
  });
  if (error) throw error;
  return data as ApplicantExistingApplicationResult;
}

export async function checkStaffApplicationStatus(input: {
  eventSlug: string;
  email: string;
  phone: string;
}): Promise<StaffApplicationStatusResult> {
  const { data, error } = await supabase.rpc('check_staff_application_status', {
    input_event_slug: input.eventSlug,
    input_email: cleanEmail(input.email),
    input_phone: cleanPhone(input.phone),
  });
  if (error) throw error;
  return data as StaffApplicationStatusResult;
}

export type AdminStaffApplicationRow = {
  id: string;
  event_id: string;
  person_id: string | null;
  preferred_role: string | null;
  preferred_team: string | null;
  availability: Record<string, unknown>;
  experience: string | null;
  motivation: string | null;
  status: string;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  answers: Record<string, unknown>;
  identity_status: ApplicationIdentityStatus;
  identity_review_note: string | null;
  requested_email: string | null;
  requested_phone: string | null;
  requested_student_id: string | null;
  requested_name_th: string | null;
  requested_name_en: string | null;
  requested_major: string | null;
  update_request_id: string | null;
  assigned_duty: string | null;
  assignment_method: 'auto_quota' | 'manual_admin' | 'fallback_general' | 'pending' | string | null;
  assignment_note: string | null;
  people?: {
    student_id: string | null;
    name_th: string | null;
    name_en: string | null;
    nickname: string | null;
    nickname_th: string | null;
    nickname_en: string | null;
    email: string | null;
    phone: string | null;
    major: string | null;
    year_level: number | null;
  } | null;
};

export type EventDutyQuotaRow = {
  duty_key: string;
  duty_label_th: string;
  description_th: string | null;
  quota: number;
  assigned_count: number;
  remaining: number;
  is_full: boolean;
  priority: number;
  is_general: boolean;
};

export type EventDutyQuotaStatus = {
  duties: EventDutyQuotaRow[];
  total_quota: number;
  total_assigned: number;
  total_remaining: number;
};

export type DuplicateStaffApplicationGroup = {
  event_id: string;
  event_name_th?: string | null;
  person_id?: string | null;
  requested_student_id?: string | null;
  requested_email?: string | null;
  duplicate_count: number;
  applications: Array<{
    id: string;
    status: string;
    submitted_at: string | null;
    assigned_duty: string | null;
    identity_status: string | null;
    requested_student_id: string | null;
  }>;
};

export type DuplicateStaffApplicationsReport = {
  duplicate_person_groups: DuplicateStaffApplicationGroup[];
  duplicate_student_id_groups: DuplicateStaffApplicationGroup[];
  duplicate_email_groups?: DuplicateStaffApplicationGroup[];
  total_duplicate_groups: number;
  total_duplicate_rows: number;
};

export async function findDuplicateStaffApplications(eventId?: string | null): Promise<DuplicateStaffApplicationsReport> {
  const { data, error } = await supabase.rpc('find_duplicate_staff_applications', {
    input_event_id: eventId ?? null,
  });
  if (error) throw error;
  return (data ?? {
    duplicate_person_groups: [],
    duplicate_student_id_groups: [],
    duplicate_email_groups: [],
    total_duplicate_groups: 0,
    total_duplicate_rows: 0,
  }) as DuplicateStaffApplicationsReport;
}

export type PersonUpdateRequestRow = {
  id: string;
  person_id: string | null;
  event_id: string | null;
  request_type: string;
  requested_student_id: string | null;
  requested_email: string | null;
  requested_phone: string | null;
  requested_name_th: string | null;
  requested_name_en: string | null;
  requested_nickname: string | null;
  requested_major: string | null;
  verification_data: Record<string, unknown>;
  evidence_note: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string | null;
  people?: {
    student_id: string | null;
    name_th: string | null;
    name_en: string | null;
    nickname: string | null;
    email: string | null;
    phone: string | null;
    major: string | null;
    year_level: number | null;
  } | null;
  events?: {
    slug: string;
    name_th: string;
    name_en: string | null;
  } | null;
};

export type PromoteStaffApplicationResult = {
  success: boolean;
  event_staff_id: string;
  event_id: string;
  person_id: string;
  application_id: string;
  staff_role: string | null;
  team: string | null;
  status: string;
};

export type AdminEventStaffRow = {
  id: string;
  event_id: string;
  person_id: string;
  staff_role: string | null;
  team: string | null;
  status: string;
  application_id: string | null;
  approved_at: string | null;
  people?: {
    student_id: string | null;
    name_th: string | null;
    name_en: string | null;
    nickname: string | null;
    major: string | null;
    year_level: number | null;
  } | null;
};

export type AdminEventOverview = {
  event: EventRecord | null;
  participant_count: number;
  staff_application_count: number;
  approved_staff_application_count: number;
  waitlisted_count: number;
  rejected_count: number;
  missing_final_duty_count: number;
  event_staff_count: number;
  attendance_session_count: number;
  announcement_count: number;
  document_count: number;
};

async function safeEventCount(table: string, eventId: string) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchAdminEventOverview(eventId: string): Promise<AdminEventOverview> {
  const event = await fetchAdminEventById(eventId);
  let applications: Array<{ status: string | null; answers: Record<string, unknown> | null }> = [];
  try {
    const { data, error } = await supabase
      .from('staff_applications')
      .select('status,answers')
      .eq('event_id', eventId);
    if (!error) applications = (data ?? []) as Array<{ status: string | null; answers: Record<string, unknown> | null }>;
  } catch {
    applications = [];
  }

  const [
    participantCount,
    eventStaffCount,
    attendanceSessionCount,
    announcementCount,
    documentCount,
  ] = await Promise.all([
    safeEventCount('event_participants', eventId),
    safeEventCount('event_staff', eventId),
    safeEventCount('staff_attendance_sessions', eventId),
    safeEventCount('announcements', eventId),
    safeEventCount('generated_documents', eventId),
  ]);

  const approved = applications.filter((row) => row.status === 'approved');
  return {
    event,
    participant_count: participantCount,
    staff_application_count: applications.length,
    approved_staff_application_count: approved.length,
    waitlisted_count: applications.filter((row) => row.status === 'waitlisted').length,
    rejected_count: applications.filter((row) => row.status === 'rejected').length,
    missing_final_duty_count: approved.filter((row) => !String(row.answers?.final_duty ?? '').trim()).length,
    event_staff_count: eventStaffCount,
    attendance_session_count: attendanceSessionCount,
    announcement_count: announcementCount,
    document_count: documentCount,
  };
}

export async function fetchAdminEventStaffApplications(eventId: string): Promise<AdminStaffApplicationRow[]> {
  const { data, error } = await supabase
    .from('staff_applications')
    .select('id,event_id,person_id,preferred_role,preferred_team,availability,experience,motivation,status,submitted_at,reviewed_by,reviewed_at,review_note,answers,identity_status,identity_review_note,requested_email,requested_phone,requested_student_id,requested_name_th,requested_name_en,requested_major,update_request_id,assigned_duty,assignment_method,assignment_note,people(student_id,name_th,name_en,nickname,nickname_th,nickname_en,email,phone,major,year_level)')
    .eq('event_id', eventId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminStaffApplicationRow[];
}

export async function fetchEventDutyQuotaStatus(eventId: string): Promise<EventDutyQuotaStatus> {
  const { data, error } = await supabase.rpc('get_event_staff_duty_quota_status', {
    input_event_id: eventId,
  });
  if (error) throw error;
  return (data ?? { duties: [], total_quota: 0, total_assigned: 0, total_remaining: 0 }) as EventDutyQuotaStatus;
}

export async function logStaffApplicationExport(input: {
  eventId: string;
  exportScope: 'all' | 'filtered' | 'by_assigned_duty';
  rowCount: number;
  includesSensitiveFields: boolean;
  filters: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.rpc('log_staff_application_export', {
    input_data: {
      event_id: input.eventId,
      export_scope: input.exportScope,
      row_count: input.rowCount,
      includes_sensitive_fields: input.includesSensitiveFields,
      filters: input.filters,
      exported_at: new Date().toISOString(),
    },
  });
  if (error) throw error;
}

export async function updateAdminStaffApplicationReview(input: {
  id: string;
  status?: string;
  finalDuty?: string | null;
  answers?: Record<string, unknown>;
  reviewNote?: string | null;
}): Promise<AdminStaffApplicationRow> {
  if (input.status || input.finalDuty !== undefined || input.reviewNote !== undefined) {
    const { data: reviewed, error: reviewError } = await supabase.rpc('review_staff_application', {
      input_application_id: input.id,
      input_status: input.status ?? 'under_review',
      input_final_duty: input.finalDuty ?? (input.answers?.final_duty == null ? null : String(input.answers.final_duty)),
      input_review_note: input.reviewNote ?? null,
    });
    if (reviewError) throw reviewError;
    const row = reviewed as AdminStaffApplicationRow;
    const { data, error } = await supabase
      .from('staff_applications')
      .select('id,event_id,person_id,preferred_role,preferred_team,availability,experience,motivation,status,submitted_at,reviewed_by,reviewed_at,review_note,answers,identity_status,identity_review_note,requested_email,requested_phone,requested_student_id,requested_name_th,requested_name_en,requested_major,update_request_id,assigned_duty,assignment_method,assignment_note,people(student_id,name_th,name_en,nickname,nickname_th,nickname_en,email,phone,major,year_level)')
      .eq('id', row.id)
      .single();
    if (error) throw error;
    return data as unknown as AdminStaffApplicationRow;
  }

  const payload: Record<string, unknown> = {};
  if (input.answers) payload.answers = input.answers;

  const { data, error } = await supabase
    .from('staff_applications')
    .update(payload)
    .eq('id', input.id)
    .select('id,event_id,person_id,preferred_role,preferred_team,availability,experience,motivation,status,submitted_at,reviewed_by,reviewed_at,review_note,answers,identity_status,identity_review_note,requested_email,requested_phone,requested_student_id,requested_name_th,requested_name_en,requested_major,update_request_id,assigned_duty,assignment_method,assignment_note,people(student_id,name_th,name_en,nickname,nickname_th,nickname_en,email,phone,major,year_level)')
    .single();
  if (error) throw error;
  return data as unknown as AdminStaffApplicationRow;
}

export async function updateAdminStaffApplicationAssignment(input: {
  id: string;
  assignedDuty: string | null;
  assignmentNote?: string;
}): Promise<AdminStaffApplicationRow> {
  const { data: assigned, error: assignError } = await supabase.rpc('update_staff_application_assignment', {
    input_application_id: input.id,
    input_assigned_duty: input.assignedDuty ?? '',
    input_assignment_note: input.assignmentNote ?? '',
  });
  if (assignError) throw assignError;
  const row = assigned as AdminStaffApplicationRow;
  const { data, error } = await supabase
    .from('staff_applications')
    .select('id,event_id,person_id,preferred_role,preferred_team,availability,experience,motivation,status,submitted_at,reviewed_by,reviewed_at,review_note,answers,identity_status,identity_review_note,requested_email,requested_phone,requested_student_id,requested_name_th,requested_name_en,requested_major,update_request_id,assigned_duty,assignment_method,assignment_note,people(student_id,name_th,name_en,nickname,nickname_th,nickname_en,email,phone,major,year_level)')
    .eq('id', row.id)
    .single();
  if (error) throw error;
  return data as unknown as AdminStaffApplicationRow;
}

export async function promoteStaffApplicationToEventStaff(input: {
  applicationId: string;
  staffRole?: string | null;
  team?: string | null;
}): Promise<PromoteStaffApplicationResult> {
  const { data, error } = await supabase.rpc('promote_staff_application_to_event_staff', {
    input_application_id: input.applicationId,
    input_staff_role: input.staffRole ?? null,
    input_team: input.team ?? null,
  });
  if (error) throw error;
  return data as PromoteStaffApplicationResult;
}

export async function fetchAdminEventStaff(eventId: string): Promise<AdminEventStaffRow[]> {
  const { data, error } = await supabase
    .from('event_staff')
    .select('id,event_id,person_id,staff_role,team,status,application_id,approved_at,people(student_id,name_th,name_en,nickname,major,year_level)')
    .eq('event_id', eventId)
    .order('approved_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminEventStaffRow[];
}

export async function fetchPersonUpdateRequests(filters?: {
  status?: string;
  requestType?: string;
  eventId?: string;
  search?: string;
}): Promise<PersonUpdateRequestRow[]> {
  let query = supabase
    .from('person_update_requests')
    .select('id,person_id,event_id,request_type,requested_student_id,requested_email,requested_phone,requested_name_th,requested_name_en,requested_nickname,requested_major,verification_data,evidence_note,status,reviewed_by,reviewed_at,review_note,created_at,people(student_id,name_th,name_en,nickname,email,phone,major,year_level),events(slug,name_th,name_en)')
    .order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.requestType) query = query.eq('request_type', filters.requestType);
  if (filters?.eventId) query = query.eq('event_id', filters.eventId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as PersonUpdateRequestRow[];
  const search = filters?.search?.trim().toLowerCase();
  if (!search) return rows;
  return rows.filter((row) => [
    row.requested_student_id,
    row.requested_name_th,
    row.requested_name_en,
    row.requested_email,
    row.people?.student_id,
    row.people?.name_th,
    row.people?.name_en,
    row.people?.email,
  ].some((value) => String(value ?? '').toLowerCase().includes(search)));
}

export async function reviewPersonUpdateRequest(input: {
  id: string;
  status: 'approved' | 'rejected' | 'cancelled';
  reviewNote?: string;
}): Promise<PersonUpdateRequestResult> {
  const { data, error } = await supabase.rpc('review_person_update_request', {
    input_request_id: input.id,
    input_status: input.status,
    input_review_note: input.reviewNote ?? '',
  });
  if (error) throw error;
  return data as PersonUpdateRequestResult;
}
