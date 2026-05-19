import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const filePath = args.find((arg) => !arg.startsWith('--'));
const shouldCommit = args.includes('--commit');

if (!filePath) {
  console.error('Usage: npm run import:registrations -- "/path/to/file.xlsx" [--commit]');
  process.exit(1);
}

loadDotEnv(path.resolve(process.cwd(), '.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const emptyValues = new Set(['', '-', 'ไม่มี', 'none', 'no', 'n/a', 'null', 'ไม่่มี']);
const majorAliases = [
  ['IEL', ['Industrial Engineering and Logistics Management', 'โลจิสติกส์ (IEL)', 'Logistics Management (IEL)']],
  ['IGE International', ['Integrated and Multi-disciplinary Engineering', 'พหุวิทยาการ', 'IGE international']],
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

function text(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text ?? '').trim();
    if ('result' in value) return String(value.result ?? '').trim();
    if ('richText' in value) return value.richText.map((part) => part.text).join('').trim();
    if ('hyperlink' in value) return String(value.hyperlink ?? '').trim();
  }
  return String(value).trim();
}

function headerText(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text ?? '');
    if ('result' in value) return String(value.result ?? '');
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
  }
  return String(value);
}

function clean(value) {
  const normalized = text(value).replace(/\s+/g, ' ').trim();
  return emptyValues.has(normalized.toLowerCase()) ? null : normalized;
}

function first(row, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) {
      const value = clean(row[name]);
      if (value) return value;
    }
  }
  return null;
}

function parseContact(contact) {
  const source = contact ?? '';
  const phone = source.match(/(?:\+66|0)[689]\d{8}\b/)?.[0] ?? '';
  const line = source.match(/(?:line|ไลน์)\s*[:=@]?\s*([A-Za-z0-9._-]{2,40})/i)?.[1] ?? '';
  const instagramMatch = source.match(/(?:ig|instagram)\s*[:=@]?\s*([A-Za-z0-9._]{2,30})|@([A-Za-z0-9._]{2,30})/i);
  const instagram = instagramMatch?.[1] ?? instagramMatch?.[2] ?? '';
  const facebook = source.match(/(?:facebook|fb)\s*[:=@]?\s*([A-Za-z0-9._/-]{2,80})/i)?.[1] ?? '';
  let other = source;
  for (const value of [phone, line, instagram, facebook]) {
    if (value) other = other.replace(value, '');
  }
  other = other
    .replace(/(?:line|ไลน์|LINE|ig|instagram|facebook|fb)\s*[:=@]?/gi, '')
    .replace(/[;,|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    phone: clean(phone),
    line_id: clean(line),
    instagram: clean(instagram),
    facebook: clean(facebook),
    other_contact: clean(other),
  };
}

function normalizeMajor(value) {
  const major = clean(value);
  if (!major) return null;
  for (const [code, aliases] of majorAliases) {
    if (aliases.some((alias) => major.toLowerCase().includes(alias.toLowerCase()))) {
      if (code === 'IEL') return 'ภาควิชาวิศวกรรมอุตสาหการและการจัดการ โลจิสติกส์ (IEL)';
      if (code === 'IGE International') return 'ภาควิชาวิศวกรรมบูรณาการ และพหุวิทยาการ (IGE International)';
    }
  }
  return major;
}

function parseTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const raw = clean(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeAdmissionRound(value) {
  const raw = clean(value);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes('portfolio')) return 'Portfolio';
  if (lower.includes('quota') || lower.includes('โควตา')) return 'Quota';
  if (lower.includes('admission')) return 'Admission';
  return null;
}

function rowToProfile(row, registrationOrder) {
  const contact = first(row, ['ช่องทางการติดต่อ', 'Contact Channels']);
  const parsed = parseContact(contact);

  return {
    email: first(row, ['ที่อยู่อีเมล', 'Email Address']),
    student_id: first(row, ['รหัสนักศึกษา', 'Student ID']),
    name_th: first(row, ['ชื่อ-สกุล ']),
    name_en: first(row, ['ชื่อ-สกุล  ', 'Forename - Surname', 'Forename - Surname 2']),
    nickname: first(row, ['ชื่อเล่น ', 'Nickname']),
    major: normalizeMajor(first(row, ['สาขา ', 'Major'])),
    phone: first(row, ['เบอร์ติดต่อ ', 'Phone Number']) ?? parsed.phone,
    emergency_phone: first(row, ['เบอร์ติดต่อฉุกเฉิน (ผู้ปกครอง)', 'Emergency Contact Number (Parents)']),
    line_id: parsed.line_id,
    instagram: parsed.instagram,
    facebook: parsed.facebook,
    other_contact: parsed.other_contact,
    food_allergy: first(row, ['อาหารที่แพ้', 'Food Allergies']),
    disease: first(row, ['โรคประจำตัว ', 'Congenital disease']),
    drug_allergy: first(row, ['ยาที่แพ้', 'Drug Allergies']),
    admission_round: normalizeAdmissionRound(first(row, ['รอบการรับเข้า', 'Admission Round', 'รอบที่ติด', 'Round'])),
    form_submitted_at: parseTimestamp(row['ประทับเวลา'] ?? row.Timestamp),
    registration_order: registrationOrder,
    gender: first(row, ['เพศ', 'Gender']),
    hometown: first(row, ['จังหวัด', 'ภูมิลำเนา', 'Hometown', 'Province']),
    interests: first(row, ['ความสนใจ', 'Interests']),
    public_profile: false,
    show_instagram: false,
    show_line_id: false,
  };
}

async function readWorkbook(inputPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('Workbook has no worksheets.');

  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = headerText(cell.value);
  });

  const profiles = [];
  worksheet.eachRow((excelRow, rowNumber) => {
    if (rowNumber === 1) return;
    const row = {};
    headers.forEach((header, colNumber) => {
      if (header) row[header] = excelRow.getCell(colNumber).value;
    });
    const profile = rowToProfile(row, rowNumber - 1);
    if (profile.email || profile.name_th || profile.name_en) profiles.push(profile);
  });

  return profiles;
}

const profiles = await readWorkbook(path.resolve(filePath));
const validProfiles = profiles.filter((profile) => profile.email);
const skipped = profiles.length - validProfiles.length;
const majorCounts = validProfiles.reduce((acc, profile) => {
  const major = profile.major ?? 'ไม่ระบุ';
  acc[major] = (acc[major] ?? 0) + 1;
  return acc;
}, {});

console.log(
  JSON.stringify(
    {
      mode: shouldCommit ? 'commit' : 'dry-run',
      totalRows: profiles.length,
      importableRows: validProfiles.length,
      skippedRowsWithoutEmail: skipped,
      majorCounts,
      sample: validProfiles.slice(0, 3).map((profile) => ({
        email: profile.email,
        name_th: profile.name_th,
        nickname: profile.nickname,
        major: profile.major,
        line_id: profile.line_id,
        instagram: profile.instagram,
        facebook: profile.facebook,
      })),
    },
    null,
    2,
  ),
);

if (!shouldCommit) {
  console.log('Dry run only. Add --commit to upsert into Supabase profiles.');
  process.exit(0);
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env before running with --commit.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const batchSize = 100;
for (let index = 0; index < validProfiles.length; index += batchSize) {
  const batch = validProfiles.slice(index, index + batchSize);
  const { error } = await supabase.from('profiles').upsert(batch, { onConflict: 'email' });
  if (error) throw error;
  console.log(`Imported ${Math.min(index + batch.length, validProfiles.length)} / ${validProfiles.length}`);
}

console.log('Import complete.');
