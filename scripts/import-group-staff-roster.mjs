import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const filePath = args.find((arg) => !arg.startsWith('--'));
const shouldCommit = args.includes('--commit');

if (!filePath) {
  console.error('Usage: npm run import:group-staff -- "private/group-staff-roster.txt" [--commit]');
  process.exit(1);
}

loadDotEnv(path.resolve(process.cwd(), '.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const colorMap = [
  ['แดง', 'Red'],
  ['น้ำเงิน', 'Blue'],
  ['เหลือง', 'Yellow'],
  ['เขียว', 'Green'],
  ['ชมพู', 'Pink'],
  ['ม่วง', 'Purple'],
  ['ส้ม', 'Orange'],
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
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text && text !== '-' ? text : null;
}

function parseHeading(line) {
  const color = colorMap.find(([thai]) => line.includes(thai))?.[1];
  const subgroup = line.match(/กลุ่ม\s*([AB])/i)?.[1]?.toUpperCase();
  const duty = line.includes('จราจร') ? 'จราจร' : null;
  return color && subgroup ? { main_group: color, subgroup, duty } : null;
}

function parseRoster(text) {
  const rows = [];
  let current = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = parseHeading(line);
    if (heading) {
      current = heading;
      continue;
    }

    if (!current || line.includes('รหัสนักศึกษา')) continue;

    const cols = rawLine.split(/\t+/).map(clean);
    if (!cols[0] || !/^\d{9}$/.test(cols[0])) continue;

    rows.push({
      student_id: cols[0],
      name: cols[1] ?? '',
      nickname: cols[2],
      phone: cols[3],
      disease: cols[4],
      drug_allergy: cols[5],
      food_allergy: cols[6],
      main_group: current.main_group,
      subgroup: current.subgroup,
      duty: current.duty,
    });
  }

  return rows;
}

const roster = parseRoster(fs.readFileSync(path.resolve(filePath), 'utf8'));
const byGroup = roster.reduce((acc, row) => {
  const key = `${row.main_group}-${row.subgroup}`;
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ mode: shouldCommit ? 'commit' : 'dry-run', count: roster.length, byGroup, sample: roster.slice(0, 5) }, null, 2));

if (!shouldCommit) {
  console.log('Dry run only. Add --commit to upsert into Supabase group_staff.');
  process.exit(0);
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env before running with --commit.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await supabase.from('group_staff').upsert(roster, { onConflict: 'student_id,main_group,subgroup' });
if (error) throw error;

const settings = Object.entries(
  roster.reduce((acc, row) => {
    const key = `${row.main_group}-${row.subgroup}`;
    (acc[key] ||= []).push(row);
    return acc;
  }, {}),
).map(([key, staff]) => {
  const [main_group, subgroup] = key.split('-');
  return {
    main_group,
    subgroup,
    mentors: staff.map((row) => `${row.nickname || row.name}`).join(', '),
  };
});

for (const setting of settings) {
  const { error: settingError } = await supabase
    .from('group_settings')
    .upsert(setting, { onConflict: 'main_group,subgroup' });
  if (settingError) throw settingError;
}

console.log('Group staff import complete.');
