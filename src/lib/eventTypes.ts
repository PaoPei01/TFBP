export type EventStatus =
  | 'draft'
  | 'published'
  | 'registration_open'
  | 'staff_recruiting'
  | 'active'
  | 'completed'
  | 'archived';

export type EventVisibility = 'private' | 'unlisted' | 'public';

export type EventRole =
  | 'event_admin'
  | 'staff_manager'
  | 'group_leader'
  | 'staff'
  | 'emergency_staff'
  | 'document_manager'
  | 'viewer';

export type EventFormType =
  | 'participant_registration'
  | 'staff_application'
  | 'staff_profile_update'
  | 'health_info'
  | 'attendance_precheck';

export type ActivityEvent = {
  id?: string;
  name_th: string;
  name_en: string;
  slug: string;
  description?: string | null;
  event_type?: string | null;
  academic_year?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  cover_image_path?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EventParticipantStatus = 'draft' | 'pending' | 'approved' | 'waitlisted' | 'rejected' | 'cancelled';

export type EventStaffStatus = 'pending' | 'approved' | 'active' | 'inactive' | 'rejected' | 'withdrawn';

export type EventRouteParams = {
  eventSlug?: string;
  eventId?: string;
};
