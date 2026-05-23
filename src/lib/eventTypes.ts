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

export type EventRecord = {
  id: string;
  name_th: string;
  name_en: string | null;
  slug: string;
  description: string | null;
  event_type: string | null;
  academic_year: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  cover_image_path: string | null;
  metadata: Record<string, unknown>;
  created_by?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ActivityEvent = Omit<EventRecord, 'id' | 'created_at' | 'updated_at' | 'description' | 'event_type' | 'academic_year' | 'start_date' | 'end_date' | 'location' | 'cover_image_path' | 'metadata'> & {
  id?: string;
  description?: string | null;
  event_type?: string | null;
  academic_year?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  cover_image_path?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EventParticipantStatus = 'draft' | 'pending' | 'approved' | 'waitlisted' | 'rejected' | 'cancelled';

export type EventStaffStatus = 'pending' | 'approved' | 'active' | 'inactive' | 'rejected' | 'withdrawn';

export type EventRouteParams = {
  eventSlug?: string;
  eventId?: string;
};

export type EventForm = {
  id: string;
  event_id: string;
  form_type: EventFormType;
  title: string;
  description: string | null;
  opens_at: string | null;
  closes_at: string | null;
  is_open: boolean;
  config_json: Record<string, unknown>;
  created_at: string | null;
};

export type EventSubmissionResult = {
  success: boolean;
  code: 'submitted' | 'submitted_pending_identity_review' | 'identity_verification_failed' | 'event_not_open' | 'staff_recruiting_closed' | string;
  message?: string;
  message_th?: string;
  event?: {
    id: string;
    slug: string;
    name_th: string;
    name_en: string | null;
  };
  registration?: {
    id: string;
    status: string;
  };
  application?: {
    id: string;
    status: string;
    identity_status?: string;
  };
  person?: {
    person_id: string;
    display_name: string;
  } | null;
};
