type Language = 'th' | 'en';

type ErrorContext =
  | 'attendance'
  | 'auth'
  | 'camera'
  | 'documents'
  | 'export'
  | 'profile'
  | 'qr'
  | 'storage'
  | string;

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  if (typeof error === 'string') return error;
  return '';
}

function fallbackForContext(language: Language, context?: ErrorContext) {
  const th = language === 'th';
  switch (context) {
    case 'attendance':
      return th ? 'ดำเนินการเช็กชื่อไม่สำเร็จ กรุณาลองใหม่หรือใช้การเช็กชื่อแบบ Manual' : 'Attendance action failed. Please try again or use manual check-in.';
    case 'auth':
      return th ? 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบบัญชีและลองใหม่' : 'Sign-in failed. Please check your account and try again.';
    case 'camera':
      return th ? 'ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง หรือกรอก token ด้วยตนเอง' : 'Could not open the camera. Please allow camera access or enter the token manually.';
    case 'documents':
      return th ? 'ดำเนินการเอกสารไม่สำเร็จ กรุณาลองใหม่' : 'Document action failed. Please try again.';
    case 'export':
      return th ? 'Export ไม่สำเร็จ กรุณาลองใหม่' : 'Export failed. Please try again.';
    case 'profile':
      return th ? 'ดำเนินการข้อมูลโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่' : 'Profile action failed. Please try again.';
    case 'qr':
      return th ? 'QR ไม่ถูกต้องหรือหมดอายุ กรุณาขอ QR ใหม่' : 'The QR is invalid or expired. Please request a new QR.';
    case 'storage':
      return th ? 'จัดการไฟล์ไม่สำเร็จ กรุณาลองใหม่' : 'File action failed. Please try again.';
    default:
      return th ? 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' : 'Action failed. Please try again.';
  }
}

function technicalMessageToFriendly(message: string, language: Language, context?: ErrorContext) {
  const th = language === 'th';
  const lower = message.toLowerCase();

  if (lower.includes('gen_random_bytes')) {
    return th
      ? 'สร้างรหัส QR ไม่สำเร็จ กรุณาตรวจสอบ migration หรือแจ้งผู้ดูแลระบบ'
      : 'Could not create the QR code. Please check the migration or contact an admin.';
  }
  if (lower.includes('permission denied') || lower.includes('row-level security') || lower.includes('not authorized') || lower.includes('admin_required')) {
    return th ? 'บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้' : 'This account does not have permission to use this section.';
  }
  if (lower.includes('invalid token') || lower.includes('invalid_token') || lower.includes('qr_expired') || lower.includes('session_not_found')) {
    return th ? 'QR ไม่ถูกต้องหรือหมดอายุ กรุณาขอ QR ใหม่' : 'The QR is invalid or expired. Please request a new QR.';
  }
  if (lower.includes('identity_verification_failed') || lower.includes('staff_not_found')) {
    return th ? 'ไม่พบข้อมูลทีมงานจากอีเมลและเบอร์โทรนี้' : 'No staff profile was found for this email and phone.';
  }
  if (lower.includes('camera') || lower.includes('notallowederror') || lower.includes('permission dismissed')) {
    return fallbackForContext(language, 'camera');
  }
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('timeout')) {
    return th ? 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่' : 'Connection failed. Please check your internet and try again.';
  }
  if (lower.includes('rpc') || lower.includes('function') || lower.includes('relation') || lower.includes('column') || lower.includes('constraint') || lower.includes('invalid input syntax') || lower.includes('schema cache') || lower.includes('pgrst') || lower.includes('postgres') || lower.includes('sql')) {
    return fallbackForContext(language, context);
  }

  return null;
}

export function getFriendlyErrorMessage(error: unknown, language: Language = 'th', context?: ErrorContext, fallback?: string) {
  const message = extractErrorMessage(error).trim();
  if (!message) return fallback ?? fallbackForContext(language, context);

  const friendlyTechnical = technicalMessageToFriendly(message, language, context);
  if (friendlyTechnical) return friendlyTechnical;

  return message || fallback || fallbackForContext(language, context);
}
