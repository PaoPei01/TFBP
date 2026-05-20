export const staffOperationalRoles = ['วางแผน (ทีมบอ)', 'พี่กลุ่ม', 'พี่ฐาน', 'ไทม์เมอร์', 'พยาบาล', 'จราจร', 'สวัสดิการ', 'สตาฟให้ความบันเทิง', 'โฟโต้'];

export function normalizeStaffOperationalRole(value?: string | null) {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim();
  const lower = raw.toLowerCase();
  if (!raw) return null;
  if (lower.includes('ทีมบอ') || lower.includes('วางแผน') || lower.includes('planner') || lower.includes('plan')) return 'วางแผน (ทีมบอ)';
  if (lower.includes('พี่กลุ่ม') || lower.includes('mentor') || lower.includes('group staff')) return 'พี่กลุ่ม';
  if (lower.includes('พี่ฐาน') || lower.includes('ฐาน') || lower.includes('base')) return 'พี่ฐาน';
  if (lower.includes('ไทม์') || lower.includes('timer')) return 'ไทม์เมอร์';
  if (lower.includes('พยาบาล') || lower.includes('medic') || lower.includes('medical') || lower.includes('nurse')) return 'พยาบาล';
  if (lower.includes('จราจร') || lower.includes('traffic')) return 'จราจร';
  if (lower.includes('สวัสดิการ') || lower.includes('welfare')) return 'สวัสดิการ';
  if (lower.includes('บันเทิง') || lower.includes('สันทนาการ') || lower.includes('entertain')) return 'สตาฟให้ความบันเทิง';
  if (lower.includes('โฟโต้') || lower.includes('photo') || lower.includes('photographer')) return 'โฟโต้';
  if (lower.includes('พิธีกร') || lower.includes('mc')) return 'พิธีกร';
  return raw;
}

export function normalizeStaffSecondaryRoles(value?: string | string[] | null) {
  const values = Array.isArray(value) ? value : String(value ?? '').split(/[,/|]+/);
  return [...new Set(values.map(normalizeStaffOperationalRole).filter(Boolean) as string[])];
}
