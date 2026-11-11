'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const ROOT = path.resolve(__dirname, '../..');
const TEST_PROJECT_HOST = 'hxtztkmbfpmzrieccwsg.supabase.co';
const OUTPUT = process.env.MIR_ROLE_CERT_REPORT
  ? path.resolve(process.env.MIR_ROLE_CERT_REPORT)
  : path.join(ROOT, 'artifacts', 'real-role-certification.json');

const ROLE_DEFINITIONS = [
  { key: 'ADMIN', accountRole: 'admin', operationsRole: 'boss', allowed: ['mir_management_snapshot', 'mir_logistics_snapshot'] },
  { key: 'BOSS', accountRole: 'employee', operationsRole: 'boss', allowed: ['mir_boss_operations_snapshot', 'mir_management_snapshot', 'mir_logistics_snapshot'] },
  { key: 'CHEF', accountRole: 'employee', operationsRole: 'chef_equipe', allowed: ['mir_lead_today_snapshot', 'mir_logistics_snapshot'], denied: ['mir_boss_operations_snapshot', 'mir_management_snapshot'] },
  { key: 'EMPLOYEE', accountRole: 'employee', operationsRole: 'employe', denied: ['mir_boss_operations_snapshot', 'mir_management_snapshot', 'mir_logistics_snapshot'] },
  { key: 'ADJOINTE', accountRole: 'employee', operationsRole: 'assistant', allowed: ['mir_management_snapshot'], denied: ['mir_boss_operations_snapshot', 'mir_logistics_snapshot'] },
  { key: 'ENTREPOT', accountRole: 'employee', operationsRole: 'warehouse', allowed: ['mir_logistics_snapshot'], denied: ['mir_boss_operations_snapshot', 'mir_management_snapshot'] }
];

function credentialNames(key, suffix) {
  const aliases = key === 'CHEF' ? ['CHEF', 'CHEF_EQUIPE'] : key === 'ADJOINTE' ? ['ASSISTANT','ADJOINTE'] : key === 'ENTREPOT' ? ['WAREHOUSE','ENTREPOT'] : [key];
  return [
    ...aliases.map(alias => `MIR_TEST_${alias}_${suffix}`),
    ...aliases.slice().reverse().map(alias => `MIR_SANDBOX_${alias}_${suffix}`)
  ];
}

function envValue(env, key, suffix) {
  return credentialNames(key, suffix).map(name => env[name]).find(Boolean) || '';
}

function configuration(env = process.env) {
  const sandboxMode = Boolean(env.MIR_SANDBOX_PUBLISHABLE_KEY || env.MIR_SANDBOX_ORG_ID);
  const base = (env.MIR_TEST_SUPABASE_URL || env.MIR_SUPABASE_URL || (sandboxMode ? `https://${TEST_PROJECT_HOST}` : '')).replace(/\/$/, '');
  const key = env.MIR_TEST_PUBLISHABLE_KEY || env.MIR_SANDBOX_PUBLISHABLE_KEY || '';
  const org = env.MIR_TEST_ORG_ID || env.MIR_SANDBOX_ORG_ID || '';
  const accounts = ROLE_DEFINITIONS.map(role => ({
    ...role,
    email: envValue(env, role.key, 'EMAIL'),
    password: envValue(env, role.key, 'PASSWORD')
  }));
  const missing = [];
  const prefix = sandboxMode ? 'MIR_SANDBOX' : 'MIR_TEST';
  if (!base) missing.push('MIR_TEST_SUPABASE_URL');
  if (!key) missing.push(`${prefix}_PUBLISHABLE_KEY`);
  if (!org) missing.push(`${prefix}_ORG_ID`);
  for (const account of accounts) {
    const credentialKey = sandboxMode && account.key === 'CHEF' ? 'CHEF_EQUIPE' : account.key;
    if (!account.email) missing.push(`${prefix}_${credentialKey}_EMAIL`);
    if (!account.password) missing.push(`${prefix}_${credentialKey}_PASSWORD`);
  }
  if (missing.length) throw Error(`Configuration de certification incomplète: ${missing.join(', ')}`);
  let hostname = '';
  try { hostname = new URL(base).hostname; } catch { throw Error('URL MIR TEST invalide'); }
  if (hostname !== TEST_PROJECT_HOST) throw Error('La certification doit viser uniquement le projet MIR TEST');
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw Error('Clé publishable MIR TEST invalide');
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(org)) throw Error('Organisation MIR TEST invalide');
  const normalized = accounts.map(account => account.email.trim().toLowerCase());
  if (new Set(normalized).size !== accounts.length) throw Error('Les six comptes QA doivent être distincts');
  return { base, key, org, accounts };
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: response.ok, status: response.status, data };
}

async function authenticate(config, account) {
  const response = await request(`${config.base}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: config.key, 'content-type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password })
  });
  if (!response.ok || !response.data?.access_token || !response.data?.refresh_token) {
    throw Error(`${account.key}: authentification refusée (${response.status})`);
  }
  return response.data;
}

async function refreshSession(config, account, refreshToken) {
  const response = await request(`${config.base}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: config.key, 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!response.ok || !response.data?.access_token) throw Error(`${account.key}: rafraîchissement de session refusé (${response.status})`);
  return response.data.access_token;
}

async function rpc(config, token, name, args = {}) {
  return request(`${config.base}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: config.key, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(args)
  });
}

function assertOk(response, label) {
  if (!response.ok) throw Error(`${label}: RPC refusée (${response.status})`);
  return response.data;
}

function assertDenied(response, label) {
  if (response.ok) throw Error(`${label}: accès interdit accepté`);
  if (![400, 401, 403].includes(response.status)) throw Error(`${label}: refus inattendu (${response.status})`);
}

async function certifyAccount(config, account) {
  const session = await authenticate(config, account);
  const token = await refreshSession(config, account, session.refresh_token);
  const memberships = assertOk(await rpc(config, token, 'mir_my_memberships'), `${account.key}: memberships`);
  if (!Array.isArray(memberships) || !memberships.some(item => item.id === config.org)) {
    throw Error(`${account.key}: organisation MIR TEST absente`);
  }
  const accountSnapshot = assertOk(await rpc(config, token, 'mir_account_snapshot'), `${account.key}: compte`);
  if (!session.user?.id || accountSnapshot?.userId !== session.user.id) {
    throw Error(`${account.key}: identité du compte incohérente`);
  }
  if (accountSnapshot?.role !== account.accountRole) {
    throw Error(`${account.key}: rôle de compte ${accountSnapshot?.role || 'absent'}, attendu ${account.accountRole}`);
  }
  const operations = assertOk(
    await rpc(config, token, 'mir_employee_operations_snapshot', { org: config.org, job: null }),
    `${account.key}: opérations`
  );
  if (operations?.role !== account.operationsRole) {
    throw Error(`${account.key}: rôle opérationnel ${operations?.role || 'absent'}, attendu ${account.operationsRole}`);
  }
  const portal = assertOk(await rpc(config, token, 'mir_portal_snapshot'), `${account.key}: portail`);
  if (portal?.actorId !== session.user.id) throw Error(`${account.key}: identité du portail incohérente`);
  assertOk(await rpc(config, token, 'mir_punch_snapshot', { org: config.org, employee: null }), `${account.key}: punch`);
  for (const name of account.allowed || []) assertOk(await rpc(config, token, name, { org: config.org }), `${account.key}: ${name}`);
  for (const name of account.denied || []) assertDenied(await rpc(config, token, name, { org: config.org }), `${account.key}: ${name}`);
  const foreignOrg = randomUUID();
  assertDenied(
    await rpc(config, token, 'mir_employee_operations_snapshot', { org: foreignOrg, job: null }),
    `${account.key}: isolation organisation`
  );
  return {
    role: account.key,
    authenticated: true,
    refreshed: true,
    organizationConfirmed: true,
    accountRole: account.accountRole,
    operationsRole: account.operationsRole,
    allowedRpcChecks: (account.allowed || []).length + 3,
    deniedRpcChecks: (account.denied || []).length + 1
  };
}

async function run(env = process.env) {
  const config = configuration(env);
  const report = {
    project: 'MIR TEST',
    physicalDevice: false,
    kind: 'real-auth-api-certification',
    startedAt: new Date().toISOString(),
    checks: []
  };
  try {
    for (const account of config.accounts) report.checks.push(await certifyAccount(config, account));
    Object.assign(report, { status: 'PASS', finishedAt: new Date().toISOString() });
    return report;
  } catch (error) {
    Object.assign(report, { status: 'FAIL', error: error.message, finishedAt: new Date().toISOString() });
    throw Object.assign(error, { report });
  }
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
}

if (require.main === module) {
  run().then(report => {
    writeReport(report);
    console.log('PASS certification API réelle: six comptes, rôles, permissions, isolation et sessions');
  }).catch(error => {
    writeReport(error.report || { status: 'FAIL', error: error.message, finishedAt: new Date().toISOString() });
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  ROLE_DEFINITIONS,
  credentialNames,
  configuration,
  request,
  authenticate,
  refreshSession,
  rpc,
  assertOk,
  assertDenied,
  run
};
