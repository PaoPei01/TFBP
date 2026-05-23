import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const checks = [];

function file(path) {
  return join(root, path);
}

function addCheck(name, ok, detail = '') {
  checks.push({ name, ok, detail });
}

function read(path) {
  return readFileSync(file(path), 'utf8');
}

const requiredFiles = [
  'supabase/migrations/202605230015_parent_orientation_duty_quotas.sql',
  'supabase/migrations/202605230018_parent_orientation_production_hardening.sql',
  'src/pages/SystemReadinessPage.tsx',
  'src/services/systemReadiness.ts',
  'src/lib/buildInfo.ts',
  'src/utils/supabaseDiagnostics.ts',
  'docs/PRODUCTION_READINESS_CHECKLIST.md',
];

for (const requiredFile of requiredFiles) {
  addCheck(`file exists: ${requiredFile}`, existsSync(file(requiredFile)));
}

const packageJson = JSON.parse(read('package.json'));
addCheck('package script: build', Boolean(packageJson.scripts?.build));
addCheck('package script: lint', Boolean(packageJson.scripts?.lint));
addCheck('package script: check:production-readiness', packageJson.scripts?.['check:production-readiness'] === 'node scripts/check-production-readiness.mjs');

const appSource = read('src/App.tsx');
addCheck('admin system readiness route', appSource.includes('admin/system-readiness'));

const deploySource = read('.github/workflows/deploy.yml');
addCheck('deploy includes VITE_GIT_COMMIT_SHA', deploySource.includes('VITE_GIT_COMMIT_SHA'));
addCheck('deploy includes VITE_BUILD_TIME', deploySource.includes('VITE_BUILD_TIME'));
addCheck('deploy includes VITE_APP_VERSION', deploySource.includes('VITE_APP_VERSION'));

const hardeningSql = read('supabase/migrations/202605230018_parent_orientation_production_hardening.sql');
addCheck('quota assignment uses transaction lock', hardeningSql.includes('pg_advisory_xact_lock') || /for\s+update/i.test(hardeningSql));
addCheck('readiness RPC exists', hardeningSql.includes('get_system_readiness_report'));
addCheck('export log RPC exists', hardeningSql.includes('log_staff_application_export'));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
}

if (failed.length) {
  console.error(`\nProduction readiness static check failed: ${failed.length} issue(s).`);
  process.exit(1);
}

console.log('\nProduction readiness static check passed.');
