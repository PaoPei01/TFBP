const placeholderValues = new Set([
  '',
  'ไม่ระบุ',
  'อื่น ๆ',
  '-',
  '—',
  'ไม่มี',
  'n/a',
  'na',
  'none',
  'null',
  'undefined',
]);

export function isPlaceholderValue(value: unknown) {
  const text = String(value ?? '').trim();
  return placeholderValues.has(text) || placeholderValues.has(text.toLowerCase());
}

export function cleanNullableText(value: unknown) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return isPlaceholderValue(text) ? null : text;
}

export function normalizeNullableText(value: unknown) {
  return cleanNullableText(value);
}

export function cleanImportRow<T extends Record<string, unknown>>(row: T): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === 'string' || value == null ? cleanNullableText(value) : value,
    ]),
  ) as T;
}
