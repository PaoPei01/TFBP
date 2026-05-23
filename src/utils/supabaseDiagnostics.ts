type Language = 'th' | 'en';

function messageFromError(error: unknown) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    return [value.message, value.details, value.hint, value.code].filter(Boolean).map(String).join(' ');
  }
  return String(error);
}

export function explainSupabaseSchemaError(error: unknown, language: Language = 'th') {
  const message = messageFromError(error);
  const lower = message.toLowerCase();
  const th = language === 'th';

  if (lower.includes('function') && (lower.includes('does not exist') || lower.includes('could not find the function'))) {
    const match = message.match(/(?:function|routine)\s+([a-zA-Z0-9_.]+)/i) ?? message.match(/Could not find the function\s+([a-zA-Z0-9_.]+)/i);
    const name = match?.[1] ?? 'RPC ที่ต้องใช้';
    return th
      ? `ฐานข้อมูลยังไม่ได้รัน migration ล่าสุด: ไม่พบฟังก์ชัน ${name}`
      : `The database is missing the latest migration: function ${name} was not found.`;
  }

  if ((lower.includes('column') && lower.includes('does not exist')) || lower.includes('could not find') && lower.includes('column')) {
    const match = message.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i);
    const name = match?.[1] ?? 'คอลัมน์ที่ต้องใช้';
    return th
      ? `ไม่พบคอลัมน์ ${name} กรุณารัน migration ล่าสุด`
      : `Column ${name} was not found. Please run the latest migration.`;
  }

  if ((lower.includes('relation') && lower.includes('does not exist')) || lower.includes('could not find the table')) {
    const match = message.match(/relation\s+"?([a-zA-Z0-9_.]+)"?\s+does not exist/i);
    const name = match?.[1] ?? 'ตารางที่ต้องใช้';
    return th
      ? `ไม่พบตาราง ${name} กรุณารัน migration ล่าสุด`
      : `Table ${name} was not found. Please run the latest migration.`;
  }

  if (lower.includes('permission denied')) {
    return th
      ? 'บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้ กรุณาตรวจสิทธิ์ผู้ดูแลระบบ'
      : 'This account does not have permission to use this area.';
  }

  if (lower.includes('row-level security') || lower.includes('rls')) {
    return th
      ? 'ระบบป้องกันข้อมูลไม่อนุญาตให้ทำรายการนี้ กรุณาตรวจ RLS/policy ใน Supabase'
      : 'Row-level security blocked this action. Please check Supabase policies.';
  }

  return message || (th ? 'เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' : 'Could not connect. Please try again.');
}
