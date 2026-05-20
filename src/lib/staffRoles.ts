import type { StaffRole } from './types';

export const staffSystemRoles: StaffRole[] = ['staff', 'mentor', 'viewer', 'emergency_staff'];

export const staffOperationalRoles = ['วางแผน (ทีมบอ)', 'พี่กลุ่ม', 'พี่ฐาน', 'ไทม์เมอร์', 'พยาบาล', 'จราจร', 'สวัสดิการ', 'โสตทัศนูปกรณ์', 'โฟโต้'];

export function normalizeStaffSystemRole(value?: string | null, primaryRole?: string | null): StaffRole | null {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  const duty = normalizeStaffOperationalRole(primaryRole ?? value);
  if (raw === 'mentor' || raw.includes('mentor')) return 'mentor';
  if (raw === 'viewer' || raw.includes('viewer') || raw.includes('read')) return 'viewer';
  if (raw === 'emergency_staff' || raw.includes('emergency') || duty === 'พยาบาล') return 'emergency_staff';
  if (raw === 'staff' || raw.includes('staff') || raw.includes('สตาฟ')) return 'staff';
  return value || duty ? 'staff' : null;
}

export function normalizeStaffOperationalRole(value?: string | null) {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim();
  const lower = raw.toLowerCase();
  if (!raw) return null;
  if (['staff', 'mentor', 'viewer', 'emergency_staff'].includes(lower)) return null;
  if (lower.includes('ทีมบอ') || lower.includes('วางแผน') || lower.includes('planner') || lower.includes('plan')) return 'วางแผน (ทีมบอ)';
  if (lower.includes('พี่กลุ่ม') || lower.includes('mentor') || lower.includes('group staff')) return 'พี่กลุ่ม';
  if (lower.includes('พี่ฐาน') || lower.includes('ฐาน') || lower.includes('base')) return 'พี่ฐาน';
  if (lower.includes('ไทม์') || lower.includes('timer')) return 'ไทม์เมอร์';
  if (lower.includes('พยาบาล') || lower.includes('medic') || lower.includes('medical') || lower.includes('nurse')) return 'พยาบาล';
  if (lower.includes('จราจร') || lower.includes('traffic')) return 'จราจร';
  if (lower.includes('สวัสดิการ') || lower.includes('welfare')) return 'สวัสดิการ';
  if (lower.includes('โสต') || lower.includes('av') || lower.includes('audio') || lower.includes('visual')) return 'โสตทัศนูปกรณ์';
  if (lower.includes('บันเทิง') || lower.includes('สันทนาการ') || lower.includes('entertain')) return 'สตาฟให้ความบันเทิง';
  if (lower.includes('โฟโต้') || lower.includes('photo') || lower.includes('photographer')) return 'โฟโต้';
  if (lower.includes('พิธีกร') || lower.includes('mc')) return 'พิธีกร';
  return raw;
}

export function normalizeStaffSecondaryRoles(value?: string | string[] | null) {
  const values = Array.isArray(value) ? value : String(value ?? '').split(/[,/|]+/);
  return [...new Set(values.map(normalizeStaffOperationalRole).filter(Boolean) as string[])];
}
