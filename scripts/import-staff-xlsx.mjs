import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const filePath = args.find((arg) => !arg.startsWith('--'));
const shouldCommit = args.includes('--commit');

if (!filePath) {
  console.error('Usage: npm run import:staff -- "/path/to/staff.xlsx" [--commit]');
  process.exit(1);
}

loadDotEnv(path.resolve(process.cwd(), '.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const emptyValues = new Set(['', '-', 'ไม่มี', 'none', 'no', 'n/a', 'null']);
const targetSheets = new Set(['ข้อมูลทีมงาน', 'ข้อมูลสตาฟ', 'staff_profiles_import', 'staff_medical_info_import', 'staff_group_assignments']);
const canonicalMajors = [
  ['CE', 'วิศวกรรมโยธา', 'Civil Engineering'],
  ['CIE', 'วิศวกรรมโยธา (นานาชาติ)', 'Civil Engineering (International)'],
  ['CPE', 'วิศวกรรมคอมพิวเตอร์', 'Computer Engineering'],
  ['EE', 'วิศวกรรมไฟฟ้า', 'Electrical Engineering'],
  ['EESG', 'วิศวกรรมไฟฟ้าและเทคโนโลยีโครงข่ายไฟฟ้าอัจฉริยะ', 'Electrical Engineering and Smart Grid Technology'],
  ['ENVI', 'วิศวกรรมสิ่งแวดล้อม', 'Environmental Engineering'],
  ['IE', 'วิศวกรรมอุตสาหการ', 'Industrial Engineering'],
  ['IEL', 'วิศวกรรมอุตสาหการและการจัดการ โลจิสติกส์', 'Industrial Engineering and Logistics Management'],
  ['IGE', 'วิศวกรรมบูรณาการ', 'Integrated Engineering'],
  ['IGME', 'วิศวกรรมบูรณาการ และพหุวิทยาการ', 'Integrated and Multi-disciplinary Engineering'],
  ['ISCE', 'วิศวกรรมระบบสารสนเทศและความมั่นคงปลอดภัยไซเบอร์', 'Information Systems and Cybersecurity Engineering'],
  ['ISNE', 'วิศวกรรมระบบสารสนเทศและเครือข่าย', 'Information Systems and Network Engineering'],
  ['ME', 'วิศวกรรมเครื่องกล', 'Mechanical Engineering'],
  ['MEPM', 'วิศวกรรมเครื่องกลและการบริหารโครงการวิศวกรรม', 'Mechanical Engineering and Engineering Project Management'],
  ['MNP', 'วิศวกรรมเหมืองแร่และปิโตรเลียม', 'Mining and Petroleum Engineering'],
  ['REAI', 'วิศวกรรมหุ่นยนต์และปัญญาประดิษฐ์', 'Robotics Engineering and Artificial Intelligence'],
  ['SCE', 'วิศวกรรมเซมิคอนดักเตอร์', 'Semiconductor Engineering'],
];

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function clean(value) {
  const text = String(value ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  return text && !emptyValues.has(text.toLowerCase()) ? text : null;
}

function normalizeHeader(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '').replace(/[()/_-]/g, '');
}

function get(row, names) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
  for (const name of names) {
    const value = normalized.get(normalizeHeader(name));
    if (value) return value;
  }
  return null;
}

function normalizeMajor(value) {
  const raw = clean(value);
  if (!raw) return null;
  const text = raw.toLowerCase().replace(/ภาควิชา/g, '').replace(/\s+/g, ' ').trim();
  const codeMatch = raw.match(/\(([^)]+)\)\s*$/);
  const code = codeMatch?.[1]?.replace(/\s+/g, ' ').trim().toUpperCase();
  const found = canonicalMajors
    .slice()
    .sort((a, b) => b[1].length - a[1].length)
    .find(([itemCode, th, en]) => {
      const normalizedCode = itemCode === 'IGME' ? ['IGME', 'IGE INTERNATIONAL'] : [itemCode];
      return normalizedCode.includes(code ?? '')
        || normalizedCode.includes(text.toUpperCase())
        || text.includes(th.toLowerCase())
        || text.includes(en.toLowerCase());
    });
  return found ? `${found[1]} (${found[0] === 'IGME' ? 'IGE international' : found[0]})` : raw;
}

function tagAttr(tag, name) {
  return tag.match(new RegExp(`(?:^|\\s)(?:\\w+:)?${name}="([^"]*)"`))?.[1] ?? '';
}

function extractTags(xml, tag) {
  return [...xml.matchAll(new RegExp(`<[^>]*:?${tag}\\b[^>]*>[\\s\\S]*?<\\/[^>]*:?${tag}>`, 'g'))].map((match) => match[0]);
}

function extractSelfClosing(xml, tag) {
  return [...xml.matchAll(new RegExp(`<[^>]*:?${tag}\\b[^>]*/>`, 'g'))].map((match) => match[0]);
}

function tagText(xml, tag) {
  return clean(xml.match(new RegExp(`<[^>]*:?${tag}\\b[^>]*>([\\s\\S]*?)<\\/[^>]*:?${tag}>`))?.[1] ?? '');
}

function columnIndex(ref) {
  const letters = String(ref ?? '').replace(/[0-9]/g, '').toUpperCase();
  return [...letters].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function decodeCell(cellXml, sharedStrings) {
  const type = tagAttr(cellXml, 't');
  if (type === 'inlineStr') return tagText(cellXml, 't');
  const value = tagText(cellXml, 'v');
  if (type === 's' && value) return clean(sharedStrings[Number(value)]);
  return value;
}

async function readSheets(inputPath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(inputPath));
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  if (!workbookXml || !relsXml) throw new Error('Invalid Excel workbook.');

  const sharedStrings = sharedXml ? extractTags(sharedXml, 'si').map((node) => [...node.matchAll(/<[^>]*:?t\b[^>]*>([\s\S]*?)<\/[^>]*:?t>/g)].map((match) => clean(match[1]) ?? '').join('')) : [];
  const rels = new Map(extractSelfClosing(relsXml, 'Relationship').map((node) => [tagAttr(node, 'Id'), tagAttr(node, 'Target')]));
  const sheetNodes = extractSelfClosing(workbookXml, 'sheet');
  const sheets = [];

  for (const sheetNode of sheetNodes) {
    const name = clean(tagAttr(sheetNode, 'name')) ?? '';
    const relationshipId = tagAttr(sheetNode, 'id');
    const target = rels.get(relationshipId);
    if (!target) continue;
    const targetPath = target.replace(/^\//, '');
    const xml = await zip.file(targetPath.startsWith('xl/') ? targetPath : `xl/${targetPath}`)?.async('string');
    if (!xml) continue;
    const matrix = [];
    for (const rowNode of extractTags(xml, 'row')) {
      const rowIndex = Number(tagAttr(rowNode, 'r') || matrix.length + 1) - 1;
      matrix[rowIndex] = matrix[rowIndex] ?? [];
      for (const cell of extractTags(rowNode, 'c')) {
        matrix[rowIndex][columnIndex(tagAttr(cell, 'r'))] = decodeCell(cell, sharedStrings) ?? '';
      }
    }
    const headerIndex = matrix.findIndex((row) => row.some(Boolean));
    if (headerIndex < 0) {
      sheets.push({ name, rows: [] });
      continue;
    }
    const headers = matrix[headerIndex].map((header) => clean(header) ?? '');
    const rows = matrix.slice(headerIndex + 1)
      .map((row) => Object.fromEntries(headers.map((header, index) => [header, clean(row[index])])))
      .filter((row) => Object.values(row).some(Boolean));
    sheets.push({ name, rows });
  }
  return sheets;
}

function parseContact(raw) {
  const text = raw ?? '';
  const line = text.match(/(?:line|ไลน์)\s*[:=@]?\s*([A-Za-z0-9._-]{2,40})/i)?.[1] ?? null;
  const facebook = text.match(/(?:facebook|fb)\s*[:=@]?\s*([A-Za-z0-9._/-]{2,80})/i)?.[1] ?? null;
  const explicitIg = text.match(/(?:ig|instagram)\s*[:=@]?\s*([A-Za-z0-9._]{2,30})|@([A-Za-z0-9._]{2,30})/i);
  const stripped = clean(text.replace(/(?:line|ไลน์|LINE|ig|instagram|facebook|fb)\s*[:=@]?/gi, '').replace(/[;,|]+/g, ' '));
  const plainUsername = stripped && /^[A-Za-z0-9._]{2,30}$/.test(stripped) ? stripped : null;
  return {
    raw: clean(raw),
    instagram: clean(explicitIg?.[1] ?? explicitIg?.[2] ?? (!line && !facebook ? plainUsername : null)),
    line_id: clean(line),
    facebook: clean(facebook),
    other_contact: clean(explicitIg || line || facebook ? null : stripped),
  };
}

const groupMap = new Map([
  ['แดง', 'Red'], ['red', 'Red'],
  ['น้ำเงิน', 'Blue'], ['blue', 'Blue'],
  ['เหลือง', 'Yellow'], ['yellow', 'Yellow'],
  ['เขียว', 'Green'], ['green', 'Green'],
  ['ชมพู', 'Pink'], ['pink', 'Pink'],
  ['ม่วง', 'Purple'], ['purple', 'Purple'],
  ['ส้ม', 'Orange'], ['orange', 'Orange'],
]);

function normalizeGroup(value) {
  return groupMap.get(String(value ?? '').trim().toLowerCase()) ?? null;
}

function normalizeSubgroup(value) {
  const match = String(value ?? '').match(/[AB]/i)?.[0]?.toUpperCase();
  return match === 'A' || match === 'B' ? match : null;
}

function normalizeRole(value) {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('mentor')) return 'mentor';
  if (raw.includes('emergency')) return 'emergency_staff';
  if (raw.includes('viewer')) return 'viewer';
  if (raw.includes('staff') || raw.includes('สตาฟ') || raw.includes('พี่กลุ่ม')) return 'staff';
  return value ? 'staff' : null;
}

function rowToStaff(row, sourceSheet, index) {
  const parsedContact = parseContact(get(row, ['ช่องทางการติดต่อ', 'contact', 'contact_channel', 'ช่องทางติดต่อ']));
  const legacyNickname = get(row, ['nickname', 'ชื่อเล่น']);
  const nicknameTh = get(row, ['nickname_th', 'nickname TH', 'nicknameTH', 'ชื่อเล่น TH', 'ชื่อเล่นไทย', 'nickname thai']) ?? legacyNickname;
  const nicknameEn = get(row, ['nickname_en', 'nickname EN', 'nicknameEN', 'ชื่อเล่น EN', 'ชื่อเล่นอังกฤษ', 'nickname english']);
  const profile = {
    student_id: get(row, ['student_id', 'รหัสนักศึกษา']),
    email: get(row, ['email', 'อีเมล', 'ที่อยู่อีเมล'])?.toLowerCase() ?? null,
    name_th: get(row, ['name_th', 'ชื่อ - นามสกุล', 'ชื่อ-สกุล', 'ชื่อสกุล']),
    name_en: get(row, ['name_en', 'ชื่ออังกฤษ']),
    nickname: nicknameTh ?? legacyNickname ?? nicknameEn,
    nickname_th: nicknameTh,
    nickname_en: nicknameEn,
    phone: get(row, ['phone', 'เบอร์โทรศัพท์', 'เบอร์ติดต่อ']),
    major: normalizeMajor(get(row, ['major', 'สาขา'])),
    instagram: get(row, ['instagram', 'ig']) ?? parsedContact.instagram,
    line_id: get(row, ['line_id', 'line']) ?? parsedContact.line_id,
    facebook: get(row, ['facebook', 'fb']) ?? parsedContact.facebook,
    other_contact: get(row, ['other_contact']) ?? parsedContact.other_contact,
    position: get(row, ['position', 'ตำแหน่ง']),
  };
  if (profile.line_id && /พี่กลุ่ม|ทีมงาน|สตาฟ|staff/i.test(profile.line_id) && !profile.position) {
    profile.position = profile.line_id;
    profile.line_id = null;
  }
  const medical = {
    disease: get(row, ['disease', 'โรคประจำตัว']),
    drug_allergy: get(row, ['drug_allergy', 'ยาที่แพ้']),
    food_allergy: get(row, ['food_allergy', 'อาหารที่แพ้']),
    medical_note: get(row, ['medical_note', 'หมายเหตุสุขภาพ']),
  };
  const assignment = {
    role: normalizeRole(get(row, ['role', 'ยศ', 'สิทธิ์'])),
    main_group: normalizeGroup(get(row, ['main_group', 'สี', 'กลุ่มสี'])),
    subgroup: normalizeSubgroup(get(row, ['subgroup', 'กลุ่มย่อย'])),
    primary_role: get(row, ['primary_role', 'บทบาทหลัก', 'หน้าที่หลัก']) ?? profile.position ?? null,
    secondary_roles: (get(row, ['secondary_roles', 'บทบาทเสริม', 'หน้าที่เสริม']) ?? '')
      .split(/[,/|]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  };
  const auxiliarySheet = /medical|group_assignments/i.test(sourceSheet);
  const warnings = auxiliarySheet ? [] : [!profile.student_id ? 'missing_student_id' : '', !profile.name_th ? 'missing_name' : '', !profile.phone ? 'missing_phone' : ''].filter(Boolean);
  return { row_key: profile.student_id || profile.email || profile.phone || `${sourceSheet}-${index}`, source_sheet: sourceSheet, source_row: index, profile, medical, assignment, contact_preview: parsedContact, warnings };
}

function countDuplicates(rows, key) {
  const counts = new Map();
  rows.forEach((row) => {
    const value = row.profile[key]?.toLowerCase();
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ type: key, value, count }));
}

const sheets = await readSheets(path.resolve(filePath));
const selectedSheets = sheets.filter((sheet) => targetSheets.has(sheet.name));
const sourceSheets = selectedSheets.length ? selectedSheets : sheets.filter((sheet) => sheet.rows.some((row) => get(row, ['student_id', 'รหัสนักศึกษา'])));
const byKey = new Map();

sourceSheets.forEach((sheet) => {
  sheet.rows.forEach((row, index) => {
    const parsed = rowToStaff(row, sheet.name, index + 2);
    if (!parsed.profile.student_id && !parsed.profile.name_th && !parsed.profile.nickname) return;
    const old = byKey.get(parsed.row_key);
    byKey.set(parsed.row_key, old ? {
      ...old,
      profile: { ...old.profile, ...Object.fromEntries(Object.entries(parsed.profile).filter(([, value]) => value != null)) },
      medical: { ...old.medical, ...Object.fromEntries(Object.entries(parsed.medical).filter(([, value]) => value != null)) },
      assignment: { ...old.assignment, ...Object.fromEntries(Object.entries(parsed.assignment).filter(([, value]) => value != null)) },
      warnings: [...new Set([...old.warnings, ...parsed.warnings])],
    } : parsed);
  });
});

const rows = [...byKey.values()];
const duplicates = [...countDuplicates(rows, 'student_id'), ...countDuplicates(rows, 'email'), ...countDuplicates(rows, 'phone')];
console.log(JSON.stringify({
  mode: shouldCommit ? 'commit' : 'dry-run',
  sheets: sheets.map((sheet) => sheet.name),
  selectedSheets: sourceSheets.map((sheet) => sheet.name),
  importableRows: rows.length,
  duplicates,
  missingDataRows: rows.filter((row) => row.warnings.length).length,
  contactSample: rows.slice(0, 8).map((row) => ({ name: row.profile.name_th, contact: row.contact_preview })),
  sample: rows.slice(0, 5),
}, null, 2));

if (!shouldCommit) {
  console.log('Dry run only. Add --commit to upsert into Supabase staff_profiles/staff_medical_info/staff_assignments.');
  process.exit(0);
}

if (!supabaseUrl || !serviceRoleKey) throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env before running with --commit.');

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

for (const row of rows) {
  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .upsert(row.profile, { onConflict: row.profile.student_id ? 'student_id' : 'email' })
    .select('*')
    .single();
  if (profileError) throw profileError;

  if (Object.values(row.medical).some(Boolean)) {
    const { error } = await supabase.from('staff_medical_info').upsert({ ...row.medical, staff_profile_id: profile.id }, { onConflict: 'staff_profile_id' });
    if (error) throw error;
  }

  if (row.assignment.role === 'emergency_staff' || row.assignment.main_group) {
    const role = row.assignment.role ?? 'staff';
    const { error } = await supabase.from('staff_assignments').upsert({
      staff_profile_id: profile.id,
      user_id: profile.user_id,
      role,
      main_group: role === 'emergency_staff' ? null : row.assignment.main_group,
      subgroup: role === 'emergency_staff' ? null : row.assignment.subgroup,
      primary_role: row.assignment.primary_role ?? row.profile.position ?? 'ทีมงาน',
      secondary_roles: row.assignment.secondary_roles ?? [],
    }, { onConflict: 'staff_profile_id' });
    if (error) throw error;
  }
}

console.log(`Staff import complete: ${rows.length} rows.`);
