import JSZip from 'jszip';
import { getMajorCode, normalizeMajor } from '../lib/major';
import { normalizeStaffOperationalRole, normalizeStaffSecondaryRoles, normalizeStaffSystemRole } from '../lib/staffRoles';
import type { MainGroup, StaffRole, Subgroup } from '../lib/types';

export type StaffImportRow = {
  row_key: string;
  source_sheet: string;
  source_row: number;
  profile: {
    student_id: string | null;
    email: string | null;
    name_th: string | null;
    name_en: string | null;
    nickname: string | null;
    nickname_th: string | null;
    nickname_en: string | null;
    phone: string | null;
    major: string | null;
    instagram: string | null;
    line_id: string | null;
    facebook: string | null;
    other_contact: string | null;
    position: string | null;
  };
  medical: {
    disease: string | null;
    drug_allergy: string | null;
    food_allergy: string | null;
    medical_note: string | null;
  };
  assignment: {
    role: StaffRole | null;
    main_group: MainGroup | null;
    subgroup: Subgroup | null;
    primary_role: string | null;
    secondary_roles: string[];
  };
  contact_preview: {
    raw: string | null;
    instagram: string | null;
    line_id: string | null;
    facebook: string | null;
    other_contact: string | null;
  };
  warnings: string[];
};

export type StaffImportPreview = {
  rows: StaffImportRow[];
  sheets: string[];
  warnings: string[];
  duplicates: Array<{ type: 'student_id' | 'email' | 'phone'; value: string; count: number }>;
};

const wantedSheets = new Set(['ข้อมูลทีมงาน', 'ข้อมูลสตาฟ', 'staff_profiles_import', 'staff_medical_info_import', 'staff_group_assignments']);
const emptyValues = new Set(['', '-', 'ไม่มี', 'none', 'no', 'n/a', 'null']);

function clean(value: unknown) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text && !emptyValues.has(text.toLowerCase()) ? text : null;
}

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/\s+/g, '').replace(/[()/_-]/g, '');
}

function get(row: Record<string, string | null>, names: string[]) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
  for (const name of names) {
    const value = normalized.get(normalizeHeader(name));
    if (value) return value;
  }
  return null;
}

const nicknameThColumns = ['nickname_th', 'nickname TH', 'nicknameTH', 'ชื่อเล่น TH', 'ชื่อเล่นไทย', 'nickname thai'];
const nicknameEnColumns = ['nickname_en', 'nickname EN', 'nicknameEN', 'ชื่อเล่น EN', 'ชื่อเล่นอังกฤษ', 'nickname english'];

function parseXml(text: string) {
  return new DOMParser().parseFromString(text, 'application/xml');
}

function attr(node: Element, name: string) {
  return node.getAttribute(name) ?? node.getAttribute(`r:${name}`) ?? '';
}

function textContent(node: Element | null) {
  return clean(node?.textContent ?? '');
}

function decodeCell(cell: Element, sharedStrings: string[]) {
  const type = cell.getAttribute('t');
  if (type === 'inlineStr') return textContent(cell.querySelector('is t, x\\:is x\\:t'));
  const value = textContent(cell.querySelector('v, x\\:v'));
  if (type === 's' && value) return sharedStrings[Number(value)] ?? null;
  return value;
}

function columnIndex(ref: string) {
  const letters = ref.replace(/[0-9]/g, '').toUpperCase();
  return [...letters].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function readSheets(file: ArrayBuffer): Promise<Array<{ name: string; rows: Record<string, string | null>[] }>> {
  const zip = await JSZip.loadAsync(file);
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  if (!workbookXml || !relsXml) throw new Error('Invalid Excel workbook.');

  const sharedStrings = sharedXml
    ? [...parseXml(sharedXml).querySelectorAll('si, x\\:si')].map((node) => [...node.querySelectorAll('t, x\\:t')].map((item) => item.textContent ?? '').join(''))
    : [];
  const rels = new Map(
    [...parseXml(relsXml).querySelectorAll('Relationship')].map((node) => [node.getAttribute('Id') ?? '', node.getAttribute('Target') ?? '']),
  );

  const workbook = parseXml(workbookXml);
  const sheets = await Promise.all(
    [...workbook.querySelectorAll('sheet, x\\:sheet')].map(async (sheet) => {
      const name = sheet.getAttribute('name') ?? '';
      const relationshipId = attr(sheet, 'id');
      const target = rels.get(relationshipId);
      if (!target) return null;
      const targetPath = target.replace(/^\//, '');
      const xml = await zip.file(targetPath.startsWith('xl/') ? targetPath : `xl/${targetPath}`)?.async('string');
      if (!xml) return null;
      const doc = parseXml(xml);
      const rows: string[][] = [];
      [...doc.querySelectorAll('sheetData row, x\\:sheetData x\\:row')].forEach((rowNode) => {
        const rowIndex = Number(rowNode.getAttribute('r') ?? rows.length + 1) - 1;
        rows[rowIndex] = rows[rowIndex] ?? [];
        [...rowNode.querySelectorAll('c, x\\:c')].forEach((cell) => {
          rows[rowIndex][columnIndex(cell.getAttribute('r') ?? '')] = decodeCell(cell, sharedStrings) ?? '';
        });
      });
      const headerRowIndex = rows.findIndex((row) => row.some(Boolean));
      if (headerRowIndex < 0) return { name, rows: [] };
      const headers = rows[headerRowIndex].map((header) => clean(header) ?? '');
      return {
        name,
        rows: rows.slice(headerRowIndex + 1).map((row) => Object.fromEntries(headers.map((header, index) => [header, clean(row[index])]))).filter((row) => Object.values(row).some(Boolean)),
      };
    }),
  );
  return sheets.filter(Boolean) as Array<{ name: string; rows: Record<string, string | null>[] }>;
}

function parseStaffContact(raw: string | null) {
  const text = raw ?? '';
  const line = text.match(/(?:line|ไลน์)\s*[:=@]?\s*([A-Za-z0-9._-]{2,40})/i)?.[1] ?? null;
  const facebook = text.match(/(?:facebook|fb)\s*[:=@]?\s*([A-Za-z0-9._/-]{2,80})/i)?.[1] ?? null;
  const explicitIg = text.match(/(?:ig|instagram)\s*[:=@]?\s*([A-Za-z0-9._]{2,30})|@([A-Za-z0-9._]{2,30})/i);
  const stripped = clean(text.replace(/(?:line|ไลน์|LINE|ig|instagram|facebook|fb)\s*[:=@]?/gi, '').replace(/[;,|]+/g, ' '));
  const plainUsername = stripped && /^[A-Za-z0-9._]{2,30}$/.test(stripped) ? stripped : null;
  const instagram = explicitIg?.[1] ?? explicitIg?.[2] ?? (!line && !facebook ? plainUsername : null);
  const other = instagram || line || facebook ? null : stripped;
  return { raw, instagram: clean(instagram), line_id: clean(line), facebook: clean(facebook), other_contact: clean(other) };
}

const groupMap: Record<string, MainGroup> = {
  แดง: 'Red',
  red: 'Red',
  น้ำเงิน: 'Blue',
  blue: 'Blue',
  เหลือง: 'Yellow',
  yellow: 'Yellow',
  เขียว: 'Green',
  green: 'Green',
  ชมพู: 'Pink',
  pink: 'Pink',
  ม่วง: 'Purple',
  purple: 'Purple',
  ส้ม: 'Orange',
  orange: 'Orange',
};

function normalizeGroup(value: string | null): MainGroup | null {
  const raw = value?.trim() ?? '';
  return groupMap[raw.toLowerCase()] ?? groupMap[raw] ?? null;
}

function normalizeSubgroup(value: string | null): Subgroup | null {
  const match = value?.match(/[AB]/i)?.[0]?.toUpperCase();
  return match === 'A' || match === 'B' ? match : null;
}

function looksLikeMajor(value: string | null) {
  return Boolean(value && getMajorCode(value) !== value);
}

function rowToStaff(row: Record<string, string | null>, sourceSheet: string, sourceRow: number): StaffImportRow {
  const contact = get(row, ['ช่องทางการติดต่อ', 'contact', 'contact_channel', 'ช่องทางติดต่อ']);
  const parsed = parseStaffContact(contact);
  const legacyNickname = get(row, ['nickname', 'ชื่อเล่น']);
  const nicknameTh = get(row, nicknameThColumns) ?? legacyNickname;
  const nicknameEn = get(row, nicknameEnColumns);
  const profile = {
    student_id: get(row, ['student_id', 'รหัสนักศึกษา']),
    email: get(row, ['email', 'อีเมล', 'ที่อยู่อีเมล']),
    name_th: get(row, ['name_th', 'ชื่อ - นามสกุล', 'ชื่อ-สกุล', 'ชื่อสกุล']),
    name_en: get(row, ['name_en', 'ชื่ออังกฤษ', 'name english']),
    nickname: nicknameTh ?? legacyNickname ?? nicknameEn,
    nickname_th: nicknameTh,
    nickname_en: nicknameEn,
    phone: get(row, ['phone', 'เบอร์โทรศัพท์', 'เบอร์ติดต่อ']),
    major: normalizeMajor(get(row, ['major', 'สาขา'])),
    instagram: get(row, ['instagram', 'ig']) ?? parsed.instagram,
    line_id: get(row, ['line_id', 'line']) ?? parsed.line_id,
    facebook: get(row, ['facebook', 'fb']) ?? parsed.facebook,
    other_contact: get(row, ['other_contact']) ?? parsed.other_contact,
    position: get(row, ['position', 'ตำแหน่ง']),
  };
  if (!profile.major && looksLikeMajor(profile.facebook)) {
    profile.major = normalizeMajor(profile.facebook);
    profile.facebook = null;
  }
  if (profile.line_id && /พี่กลุ่ม|ทีมงาน|สตาฟ|staff/i.test(profile.line_id) && !profile.position) {
    profile.position = profile.line_id;
    profile.line_id = null;
  }
  const rawRole = get(row, ['role', 'ยศ', 'สิทธิ์']);
  const primaryRole = normalizeStaffOperationalRole(get(row, ['primary_role', 'บทบาทหลัก', 'หน้าที่หลัก', 'duty', 'หน้าที่']) ?? profile.position ?? rawRole);
  const assignment = {
    role: normalizeStaffSystemRole(rawRole, primaryRole),
    main_group: normalizeGroup(get(row, ['main_group', 'สี', 'กลุ่มสี'])),
    subgroup: normalizeSubgroup(get(row, ['subgroup', 'กลุ่มย่อย'])),
    primary_role: primaryRole,
    secondary_roles: normalizeStaffSecondaryRoles(get(row, ['secondary_roles', 'บทบาทเสริม', 'หน้าที่เสริม'])),
  };
  const medical = {
    disease: get(row, ['disease', 'โรคประจำตัว']),
    drug_allergy: get(row, ['drug_allergy', 'ยาที่แพ้']),
    food_allergy: get(row, ['food_allergy', 'อาหารที่แพ้']),
    medical_note: get(row, ['medical_note', 'หมายเหตุสุขภาพ']),
  };
  const auxiliarySheet = /medical|group_assignments/i.test(sourceSheet);
  const warnings = auxiliarySheet ? [] : [
    !profile.student_id ? 'missing_student_id' : '',
    !profile.name_th ? 'missing_name' : '',
    !profile.phone ? 'missing_phone' : '',
  ].filter(Boolean);
  return {
    row_key: profile.student_id || profile.email || profile.phone || `${sourceSheet}-${sourceRow}`,
    source_sheet: sourceSheet,
    source_row: sourceRow,
    profile,
    medical,
    assignment,
    contact_preview: parsed,
    warnings,
  };
}

function duplicateWarnings(rows: StaffImportRow[], key: 'student_id' | 'email' | 'phone') {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const value = row.profile[key]?.toLowerCase();
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ type: key, value, count }));
}

export async function parseStaffImportWorkbook(file: File | ArrayBuffer): Promise<StaffImportPreview> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const sheets = await readSheets(buffer);
  const sourceSheets = sheets.filter((sheet) => wantedSheets.has(sheet.name));
  const primarySheets = sourceSheets.length ? sourceSheets : sheets.filter((sheet) => sheet.rows.some((row) => get(row, ['รหัสนักศึกษา', 'student_id'])));
  const byKey = new Map<string, StaffImportRow>();

  primarySheets.forEach((sheet) => {
    sheet.rows.forEach((row, index) => {
      const parsed = rowToStaff(row, sheet.name, index + 2);
      if (!parsed.profile.student_id && !parsed.profile.name_th && !parsed.profile.nickname) return;
      const existing = byKey.get(parsed.row_key);
      byKey.set(parsed.row_key, existing ? {
        ...existing,
        profile: { ...existing.profile, ...Object.fromEntries(Object.entries(parsed.profile).filter(([, value]) => value != null)) },
        medical: { ...existing.medical, ...Object.fromEntries(Object.entries(parsed.medical).filter(([, value]) => value != null)) },
        assignment: { ...existing.assignment, ...Object.fromEntries(Object.entries(parsed.assignment).filter(([, value]) => value != null)) },
        warnings: [...new Set([...existing.warnings, ...parsed.warnings])],
      } : parsed);
    });
  });

  const rows = [...byKey.values()];
  return {
    rows,
    sheets: sheets.map((sheet) => sheet.name),
    warnings: primarySheets.length ? [] : ['ไม่พบ sheet ข้อมูลทีมงานหรือข้อมูลสตาฟ ระบบพยายามอ่าน sheet ที่มี student_id แทน'],
    duplicates: [...duplicateWarnings(rows, 'student_id'), ...duplicateWarnings(rows, 'email'), ...duplicateWarnings(rows, 'phone')],
  };
}
