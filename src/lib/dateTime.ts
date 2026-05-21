/**
 * DateTime utilities for handling timezone conversions.
 * All timestamps are stored in Supabase as timestamptz (UTC).
 * Display and input conversion happens in Asia/Bangkok timezone.
 */

/**
 * Convert datetime-local input (browser local time) to ISO string.
 * datetime-local values are already in local time, so we create a Date from them.
 * The resulting ISO string represents that local moment in UTC.
 */
export function datetimeLocalToIso(value: string): string | null {
  if (!value) return null;
  // datetime-local format is "YYYY-MM-DDTHH:mm"
  // When we create a Date from it, it treats it as local time
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Convert ISO timestamp to datetime-local format for input elements.
 * Displays the timestamp in Asia/Bangkok timezone as YYYY-MM-DDTHH:mm.
 */
export function isoToDatetimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  // Format in Bangkok time
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  });

  const parts = formatter.formatToParts(date);
  const dateObj: Record<string, string> = {};
  parts.forEach((part) => {
    dateObj[part.type] = part.value;
  });

  return `${dateObj.year}-${dateObj.month}-${dateObj.day}T${dateObj.hour}:${dateObj.minute}`;
}

/**
 * Format timestamp for display as medium date + short time in Bangkok timezone.
 * Example: "21 พ.ค. 2569 22:25" (th) or "May 21, 2569, 10:25 PM" (en)
 */
export function formatBangkokDateTime(
  value?: string | null,
  language: 'th' | 'en' = 'th'
): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(date);
}

/**
 * Format timestamp for display as time only in Bangkok timezone.
 * Example: "22:25" (24-hour format regardless of locale)
 */
export function formatBangkokTime(
  value?: string | null,
  language: 'th' | 'en' = 'th'
): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  }).format(date);
}

/**
 * Format timestamp for display as date only in Bangkok timezone.
 * Example: "21 พ.ค. 2569" (th) or "May 21, 2569" (en)
 */
export function formatBangkokDate(
  value?: string | null,
  language: 'th' | 'en' = 'th'
): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'Asia/Bangkok',
  }).format(date);
}
