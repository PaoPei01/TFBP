import { supabase } from '../lib/supabase';
import { cleanEmail, cleanPhone } from '../lib/cleaners';
import { datetimeLocalToIso, formatBangkokDateTime } from '../lib/dateTime';
import type {
  StaffAttendanceAdminData,
  StaffAttendanceRecord,
  StaffAttendanceScanResult,
  StaffAttendanceSession,
  StaffAttendanceSessionInput,
  StaffAttendanceStatus,
  MyStaffAttendanceData,
  StaffAttendanceAdminRow,
  StaffPersonalQrResult,
  StaffAttendanceIdentityResult,
} from '../lib/attendanceTypes';

const sessionTimeKeys = ['starts_at', 'ends_at', 'late_after', 'qr_expires_at'] as const;

function normalizeSessionInput(input: StaffAttendanceSessionInput): StaffAttendanceSessionInput {
  const normalized: Record<string, unknown> = { ...input };
  for (const key of sessionTimeKeys) {
    if (typeof normalized[key] === 'string') {
      normalized[key] = datetimeLocalToIso(normalized[key] ?? '') ?? null;
    }
  }
  return normalized as StaffAttendanceSessionInput;
}

export async function fetchAdminStaffAttendance(sessionId?: string | null): Promise<StaffAttendanceAdminData> {
  const { data, error } = await supabase.rpc('get_staff_attendance_admin', { input_session_id: sessionId ?? null });
  if (error) throw error;
  return data as StaffAttendanceAdminData;
}

export async function createStaffAttendanceSession(input: StaffAttendanceSessionInput): Promise<StaffAttendanceSession> {
  const { data, error } = await supabase.rpc('create_staff_attendance_session', { input_data: normalizeSessionInput(input) });
  if (error) throw error;
  return data as StaffAttendanceSession;
}

export async function updateStaffAttendanceSession(id: string, input: StaffAttendanceSessionInput): Promise<StaffAttendanceSession> {
  const { data, error } = await supabase.rpc('update_staff_attendance_session', { input_session_id: id, input_data: normalizeSessionInput(input) });
  if (error) throw error;
  return data as StaffAttendanceSession;
}

export async function regenerateStaffAttendanceQr(id: string): Promise<StaffAttendanceSession> {
  const { data, error } = await supabase.rpc('regenerate_staff_attendance_qr', { input_session_id: id });
  if (error) throw error;
  return data as StaffAttendanceSession;
}

export async function closeStaffAttendanceSession(id: string): Promise<StaffAttendanceSession> {
  const { data, error } = await supabase.rpc('close_staff_attendance_session', { input_session_id: id });
  if (error) throw error;
  return data as StaffAttendanceSession;
}

export async function fetchMyStaffAttendance(): Promise<MyStaffAttendanceData> {
  const { data, error } = await supabase.rpc('get_my_staff_attendance');
  if (error) throw error;
  return data as MyStaffAttendanceData;
}

export async function scanStaffAttendanceSessionQr(token: string, deviceInfo: Record<string, unknown> = {}): Promise<StaffAttendanceScanResult> {
  const { data, error } = await supabase.rpc('scan_staff_attendance_session_qr', {
    input_token: token,
    input_device_info: deviceInfo,
  });
  if (error) throw error;
  return data as StaffAttendanceScanResult;
}

export async function scanStaffAttendanceSessionQrVerified(token: string, email: string, phone: string, deviceInfo: Record<string, unknown> = {}): Promise<StaffAttendanceScanResult> {
  const { data, error } = await supabase.rpc('scan_staff_attendance_session_qr_verified', {
    input_token: token,
    input_email: cleanEmail(email),
    input_phone: cleanPhone(phone),
    input_device_info: deviceInfo,
  });
  if (error) throw error;
  return data as StaffAttendanceScanResult;
}

export async function verifyStaffAttendanceIdentity(email: string, phone: string): Promise<StaffAttendanceIdentityResult> {
  const { data, error } = await supabase.rpc('verify_staff_attendance_identity', {
    input_email: cleanEmail(email),
    input_phone: cleanPhone(phone),
  });
  if (error) throw error;
  return data as StaffAttendanceIdentityResult;
}

export async function scanStaffAttendanceSessionQrByVerifiedToken(sessionToken: string, verifiedStaffToken: string, deviceInfo: Record<string, unknown> = {}): Promise<StaffAttendanceScanResult> {
  const { data, error } = await supabase.rpc('scan_staff_attendance_session_qr_by_verified_token', {
    input_session_token: parseStaffAttendanceSessionToken(sessionToken),
    input_verified_staff_token: verifiedStaffToken,
    input_device_info: deviceInfo,
  });
  if (error) throw error;
  return data as StaffAttendanceScanResult;
}

export async function manualStaffAttendanceUpdate(sessionId: string, staffProfileId: string, status: StaffAttendanceStatus, note?: string | null): Promise<StaffAttendanceRecord> {
  const { data, error } = await supabase.rpc('manual_staff_attendance_update', {
    input_session_id: sessionId,
    input_staff_profile_id: staffProfileId,
    input_status: status,
    input_note: note ?? null,
  });
  if (error) throw error;
  return data as StaffAttendanceRecord;
}

export async function adminScanStaffPersonalQr(sessionId: string, token: string, status?: StaffAttendanceStatus | null, note?: string | null): Promise<StaffAttendanceScanResult> {
  const { data, error } = await supabase.rpc('admin_scan_staff_personal_qr', {
    input_session_id: sessionId,
    input_staff_token: parseStaffPersonalQrToken(token),
    input_status: status ?? null,
    input_note: note ?? null,
  });
  if (error) throw error;
  return data as StaffAttendanceScanResult;
}

export async function getStaffPersonalQrVerified(email: string, phone: string): Promise<StaffPersonalQrResult> {
  const { data, error } = await supabase.rpc('get_staff_personal_qr_verified', {
    input_email: cleanEmail(email),
    input_phone: cleanPhone(phone),
  });
  if (error) throw error;
  return data as StaffPersonalQrResult;
}

export async function getMyStaffPersonalQr(): Promise<StaffPersonalQrResult> {
  const { data, error } = await supabase.rpc('get_my_staff_personal_qr');
  if (error) throw error;
  const token = typeof data === 'object' && data && 'token' in data ? String((data as { token?: unknown }).token ?? '') : '';
  return {
    success: Boolean(token),
    code: token ? 'ok' : 'invalid_token',
    message: token ? 'ok' : 'token not found',
    token,
    qr_payload: token ? `staff_identity:${token}` : undefined,
  };
}

export async function regenerateStaffPersonalQrVerified(email: string, phone: string): Promise<StaffPersonalQrResult> {
  const { data, error } = await supabase.rpc('regenerate_staff_personal_qr_verified', {
    input_email: cleanEmail(email),
    input_phone: cleanPhone(phone),
  });
  if (error) throw error;
  return data as StaffPersonalQrResult;
}

export function staffAttendanceDisplayName(row: StaffAttendanceAdminRow) {
  return row.nickname_th || row.nickname || row.nickname_en || row.name_th || row.name_en || row.email || row.staff_profile_id;
}

export function buildStaffAttendanceScanUrl(token: string) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}`.replace(/\/$/, '');
  return `${base}/#/staff/attendance/scan?token=${encodeURIComponent(token)}`;
}

export function parseStaffPersonalQrToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('staff_identity:')) {
    return trimmed.slice('staff_identity:'.length).trim();
  }
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token') ?? trimmed;
  } catch {
    const tokenMatch = trimmed.match(/[?&]token=([^&\s]+)/);
    return tokenMatch ? decodeURIComponent(tokenMatch[1]) : trimmed;
  }
}

export function parseStaffAttendanceSessionToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('attendance_session:')) {
    return trimmed.slice('attendance_session:'.length).trim();
  }
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token') ?? trimmed;
  } catch {
    const tokenMatch = trimmed.match(/[?&]token=([^&\s]+)/);
    return tokenMatch ? decodeURIComponent(tokenMatch[1]) : trimmed.replace(/^.*token=/, '').trim();
  }
}

export function exportStaffAttendanceCsv(rows: StaffAttendanceAdminRow[], filename = 'staff-attendance.csv') {
  const headers = [
    'staff_profile_id',
    'student_id',
    'name',
    'email',
    'phone',
    'main_group',
    'subgroup',
    'primary_role',
    'status',
    'method',
    'scanned_at',
    'checked_by',
    'note',
  ];
  const body = rows.map((row) => {
    const record = row.record;
    const values = [
      row.staff_profile_id,
      row.student_id,
      staffAttendanceDisplayName(row),
      row.email,
      row.phone,
      row.main_group,
      row.subgroup,
      row.primary_role,
      record?.status,
      record?.method,
      formatBangkokDateTime(record?.scanned_at, 'th'),
      record?.checked_by,
      record?.note,
    ];
    return values.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',');
  });
  const blob = new Blob([`\uFEFF${headers.join(',')}\n${body.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
