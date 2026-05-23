import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

loadDotEnv(path.resolve(process.cwd(), '.env'));

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminAccessToken = process.env.SUPABASE_ADMIN_ACCESS_TOKEN;

const checks = [];

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Multi-event staging foundation check');
  console.log('====================================');
  console.log('SKIP environment');
  console.log('     Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to run public read/RLS checks.');
  console.log('\nNo staging credentials were provided. This script did not contact Supabase.');
  process.exit(0);
}

const anonSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: fetchWithTimeout },
});

const serviceSupabase = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithTimeout },
    })
  : null;

const adminSupabase = adminAccessToken
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: fetchWithTimeout,
        headers: { Authorization: `Bearer ${adminAccessToken}` },
      },
    })
  : null;

const schemaSupabase = serviceSupabase;

await check('events table exists and public events are readable', async () => {
  const { data, error } = await anonSupabase
    .from('events')
    .select('id,name_th,name_en,slug,status,visibility')
    .eq('visibility', 'public')
    .limit(20);

  if (error) throw error;
  return `${data?.length ?? 0} public event row(s) readable by anon`;
});

await check('default and parent orientation events exist', async () => {
  const { data, error } = await anonSupabase
    .from('events')
    .select('slug,name_th,status,visibility,event_type')
    .in('slug', ['entaneer-bonding-69', 'parent-orientation-staff-2569']);

  if (error) throw error;
  const rows = data ?? [];
  const slugs = new Set(rows.map((row) => row.slug));
  const missing = ['entaneer-bonding-69', 'parent-orientation-staff-2569'].filter((slug) => !slugs.has(slug));
  if (missing.length) throw new Error(`Missing event(s): ${missing.join(', ')}`);
  return rows.map((row) => `${row.slug} (${row.status}, ${row.visibility}, ${row.event_type ?? '-'})`).join('; ');
});

await checkServiceTable('people table exists', 'people', 'id');
await checkServiceTable('year 2 people import staging table exists', 'people_import_year2_2569', 'id');
await checkServiceTable('staff_applications table exists', 'staff_applications', 'id');
await checkServiceTable('event_participants table exists', 'event_participants', 'id');
await checkServiceTable('event_forms table exists', 'event_forms', 'id');
await checkServiceTable('event_form_responses table exists', 'event_form_responses', 'id');
await checkServiceTable('event_staff table exists if promotion is deployed', 'event_staff', 'id');

await checkServiceColumn('staff_attendance_sessions.event_id exists', 'staff_attendance_sessions', 'id,event_id');
await checkServiceColumn('announcements.event_id exists', 'announcements', 'id,event_id');
await checkServiceColumn('document_project_profiles.event_id exists', 'document_project_profiles', 'id,event_id');
await checkServiceColumn('document_templates.event_id exists', 'document_templates', 'id,event_id');
await checkServiceColumn('generated_documents.event_id exists', 'generated_documents', 'id,event_id');

await check('default_event_id RPC exists', async () => {
  const { data, error } = await anonSupabase.rpc('default_event_id');
  if (error) throw error;
  return data ? `default event id ${data}` : 'RPC returned null; check default event seed';
});

await check('identity prefill RPC exists', async () => {
  const { data, error } = await anonSupabase.rpc('verify_person_identity_for_prefill', {
    input_email: 'not-found@example.invalid',
    input_phone: '0000000000',
  });
  if (error) throw error;
  return `verify_person_identity_for_prefill returned ${data?.code ?? 'unknown'}`;
});

await check('event public form/submission RPCs exist', async () => {
  const formCheck = await anonSupabase.rpc('get_public_event_form', {
    input_event_slug: 'missing-event',
    input_form_type: 'staff_application',
  });
  if (formCheck.error) throw formCheck.error;

  const participantCheck = await anonSupabase.rpc('submit_event_participant_registration', {
    input_event_slug: 'missing-event',
    input_email: 'not-found@example.invalid',
    input_phone: '0000000000',
    input_answers: {},
  });
  if (participantCheck.error) throw participantCheck.error;

  const staffCheck = await anonSupabase.rpc('submit_event_staff_application', {
    input_event_slug: 'missing-event',
    input_email: 'not-found@example.invalid',
    input_phone: '0000000000',
    input_data: {},
  });
  if (staffCheck.error) throw staffCheck.error;

  const statusCheck = await anonSupabase.rpc('check_staff_application_status', {
    input_event_slug: 'missing-event',
    input_email: 'not-found@example.invalid',
    input_phone: '0000000000',
  });
  if (statusCheck.error) throw statusCheck.error;

  return [
    'get_public_event_form',
    `submit_event_participant_registration:${participantCheck.data?.code ?? 'unknown'}`,
    `submit_event_staff_application:${staffCheck.data?.code ?? 'unknown'}`,
    `check_staff_application_status:${statusCheck.data?.code ?? 'unknown'}`,
  ].join(', ');
});

await checkAdminRpc('preview_people_legacy_link RPC runs', async (client) => {
  const { data, error } = await client.rpc('preview_people_legacy_link');
  if (error) throw error;
  return summarizeJson(data);
});

await checkAdminRpc('preview_year2_people_import RPC runs', async (client) => {
  const { data, error } = await client.rpc('preview_year2_people_import');
  if (error) throw error;
  return summarizeJson(data);
});

await checkAdminRpc('review_staff_application RPC is deployed', async (client) => {
  const { error } = await client.rpc('review_staff_application', {
    input_application_id: '00000000-0000-0000-0000-000000000000',
    input_status: 'under_review',
    input_final_duty: null,
    input_review_note: 'staging existence check',
  });
  if (error && /not found|admin access required/i.test(error.message ?? '')) {
    return `RPC exists (${error.message})`;
  }
  if (error) throw error;
  return 'RPC unexpectedly updated a row; verify staging data';
});

await checkAdminRpc('promote_staff_application_to_event_staff RPC is deployed', async (client) => {
  const { error } = await client.rpc('promote_staff_application_to_event_staff', {
    input_application_id: '00000000-0000-0000-0000-000000000000',
    input_staff_role: 'staff',
    input_team: 'staging check',
  });
  if (error && /not found|admin access required|approved/i.test(error.message ?? '')) {
    return `RPC exists (${error.message})`;
  }
  if (error) throw error;
  return 'RPC unexpectedly promoted a row; verify staging data';
});

await checkServiceCount('staff_profiles.person_id missing count', async () => {
  const { count, error } = await serviceSupabase
    .from('staff_profiles')
    .select('id', { count: 'exact', head: true })
    .is('person_id', null);
  if (error) throw error;
  return `${count ?? 0} staff_profiles rows missing person_id`;
});

await checkServiceCount('profiles.person_id missing count', async () => {
  const { count, error } = await serviceSupabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .is('person_id', null);
  if (error) throw error;
  return `${count ?? 0} profiles rows missing person_id`;
});

await checkAdminRpc('duplicate people count by student_id/email/phone', async (client) => {
  const { data, error } = await client.rpc('get_people_data_health');
  if (error) throw error;
  const text = JSON.stringify(data ?? {});
  const duplicateKeys = [
    'duplicate_student_id_count',
    'duplicate_email_count',
    'duplicate_phone_count',
    'same_student_id',
    'same_email',
    'same_phone',
  ];
  const summary = duplicateKeys
    .filter((key) => text.includes(key))
    .map((key) => `${key}: present`)
    .join(', ');
  return summary || 'data health RPC returned; review duplicate groups in admin UI';
});

await check('public RLS sanity: anon cannot read people', async () => {
  const { data, error } = await anonSupabase.from('people').select('id').limit(1);
  return expectNoAnonRows(data, error, 'people');
});

await check('public RLS sanity: anon cannot read staff applications', async () => {
  const { data, error } = await anonSupabase.from('staff_applications').select('id').limit(1);
  return expectNoAnonRows(data, error, 'staff_applications');
});

await printResults();

async function checkServiceTable(name, table, columns) {
  await check(name, async () => {
    if (!schemaSupabase) return skip('Set SUPABASE_SERVICE_ROLE_KEY to verify protected table existence.');
    const { count, error } = await schemaSupabase.from(table).select(columns, { count: 'exact', head: true });
    if (error) throw error;
    return `${table} exists (${count ?? 0} row(s))`;
  });
}

async function checkServiceColumn(name, table, columns) {
  await check(name, async () => {
    if (!schemaSupabase) return skip('Set SUPABASE_SERVICE_ROLE_KEY to verify protected column existence.');
    const { error } = await schemaSupabase.from(table).select(columns).limit(1);
    if (error) throw error;
    return `${table}.${columns.split(',').at(-1)} selectable`;
  });
}

async function checkServiceCount(name, fn) {
  await check(name, async () => {
    if (!serviceSupabase) return skip('Set SUPABASE_SERVICE_ROLE_KEY to calculate protected counts.');
    return fn();
  });
}

async function checkAdminRpc(name, fn) {
  await check(name, async () => {
    if (!adminSupabase) return skip('Set SUPABASE_ADMIN_ACCESS_TOKEN to run admin-only RPC verification.');
    return fn(adminSupabase);
  });
}

async function check(name, fn) {
  try {
    const detail = await fn();
    if (detail?.status === 'skipped') {
      checks.push({ name, status: 'skipped', detail: detail.detail });
    } else {
      checks.push({ name, status: 'passed', detail });
    }
  } catch (error) {
    checks.push({ name, status: 'failed', detail: friendlyError(error) });
  }
}

async function printResults() {
  const failed = checks.filter((item) => item.status === 'failed');
  const skipped = checks.filter((item) => item.status === 'skipped');

  console.log('\nMulti-event staging foundation check');
  console.log('====================================');
  for (const item of checks) {
    const marker = item.status === 'passed' ? 'PASS' : item.status === 'skipped' ? 'SKIP' : 'FAIL';
    console.log(`${marker} ${item.name}`);
    console.log(`     ${item.detail}`);
  }

  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed. Apply migrations on staging before moving to the next release gate.`);
    process.exit(1);
  }

  if (skipped.length) {
    console.log(`\n${skipped.length} check(s) skipped. Provide the requested optional environment value to complete them.`);
  }

  console.log('\nRead-only staging checks completed. Review skipped checks and preview counts before production rollout.');
}

function expectNoAnonRows(data, error, table) {
  if (error) {
    return `anon read blocked for ${table}: ${error.message}`;
  }
  if ((data ?? []).length > 0) {
    throw new Error(`anon can read ${table}; review RLS before release`);
  }
  return `anon query returned no ${table} rows`;
}

function skip(detail) {
  return { status: 'skipped', detail };
}

function friendlyError(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  return error.message ?? JSON.stringify(error);
}

function summarizeJson(data) {
  const text = JSON.stringify(data);
  if (!text) return 'RPC returned no JSON payload';
  return text.length > 500 ? `${text.slice(0, 500)}...` : text;
}

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.STAGING_CHECK_TIMEOUT_MS ?? 15000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
