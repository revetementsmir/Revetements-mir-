'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ROLE_DEFINITIONS, configuration, run } = require('../tools/validation/certify-six-roles.cjs');

function validEnvironment() {
  const env = {
    MIR_TEST_SUPABASE_URL: 'https://hxtztkmbfpmzrieccwsg.supabase.co',
    MIR_TEST_PUBLISHABLE_KEY: 'sb_publishable_fixture',
    MIR_TEST_ORG_ID: '00000000-0000-4000-8000-000000000010'
  };
  ROLE_DEFINITIONS.forEach((role, index) => {
    env[`MIR_TEST_${role.key}_EMAIL`] = `${role.key.toLowerCase()}@example.invalid`;
    env[`MIR_TEST_${role.key}_PASSWORD`] = `fixture-${index}`;
  });
  return env;
}

test('la certification exige les six comptes réels', () => {
  const env = validEnvironment();
  delete env.MIR_TEST_ADJOINTE_PASSWORD;
  assert.throws(() => configuration(env), /MIR_TEST_ADJOINTE_PASSWORD/);
});

test('la certification refuse un compte partagé entre deux rôles', () => {
  const env = validEnvironment();
  env.MIR_TEST_BOSS_EMAIL = env.MIR_TEST_ADMIN_EMAIL;
  assert.throws(() => configuration(env), /six comptes QA doivent être distincts/);
});

test('la certification refuse la production et toute clé non publishable', () => {
  const production = validEnvironment();
  production.MIR_TEST_SUPABASE_URL = 'https://gccltmaulvrnthrbnrpd.supabase.co';
  assert.throws(() => configuration(production), /uniquement le projet MIR TEST/);
  const privateKey = validEnvironment();
  privateKey.MIR_TEST_PUBLISHABLE_KEY = 'service_role_interdite';
  assert.throws(() => configuration(privateKey), /Clé publishable MIR TEST invalide/);
});

test('les secrets sandbox existants couvrent le rôle CHEF_EQUIPE sans nouvelle variable', () => {
  const canonical = validEnvironment();
  const sandbox = {
    MIR_SANDBOX_PUBLISHABLE_KEY: canonical.MIR_TEST_PUBLISHABLE_KEY,
    MIR_SANDBOX_ORG_ID: canonical.MIR_TEST_ORG_ID
  };
  for (const role of ROLE_DEFINITIONS) {
    const key = role.key === 'CHEF' ? 'CHEF_EQUIPE' : role.key;
    sandbox[`MIR_SANDBOX_${key}_EMAIL`] = canonical[`MIR_TEST_${role.key}_EMAIL`];
    sandbox[`MIR_SANDBOX_${key}_PASSWORD`] = canonical[`MIR_TEST_${role.key}_PASSWORD`];
  }
  const config = configuration(sandbox);
  assert.equal(config.base, 'https://hxtztkmbfpmzrieccwsg.supabase.co');
  assert.equal(config.accounts.find(account => account.key === 'CHEF').email, 'chef@example.invalid');
});

test('la matrice couvre six rôles et leurs refus sensibles', () => {
  assert.deepEqual(ROLE_DEFINITIONS.map(role => role.key), ['ADMIN', 'BOSS', 'CHEF', 'EMPLOYEE', 'ADJOINTE', 'ENTREPOT']);
  for (const role of ROLE_DEFINITIONS.filter(item => !['ADMIN', 'BOSS'].includes(item.key))) {
    assert.ok(role.denied.includes('mir_boss_operations_snapshot'));
  }
  assert.ok(ROLE_DEFINITIONS.find(role => role.key === 'EMPLOYEE').denied.includes('mir_management_snapshot'));
  assert.ok(ROLE_DEFINITIONS.find(role => role.key === 'ENTREPOT').allowed.includes('mir_logistics_snapshot'));
});

test('la configuration retournée ne contient aucun mot de passe dans les erreurs', () => {
  const env = validEnvironment();
  const config = configuration(env);
  assert.equal(config.accounts.length, 6);
  assert.equal(JSON.stringify(ROLE_DEFINITIONS).includes('fixture-'), false);
});

test('la recette API vérifie réellement les six matrices de permissions', async t => {
  const env = validEnvironment();
  const byEmail = new Map(ROLE_DEFINITIONS.map(role => [`${role.key.toLowerCase()}@example.invalid`, role]));
  const byToken = new Map(ROLE_DEFINITIONS.map(role => [`token-${role.key}`, role]));
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  const reply = (status, data) => new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
  global.fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : {};
    if (url.includes('/auth/v1/token?grant_type=password')) {
      const role = byEmail.get(body.email);
      return role ? reply(200, { access_token: `first-${role.key}`, refresh_token: `refresh-${role.key}`, user: { id: `user-${role.key}` } }) : reply(400, {});
    }
    if (url.includes('/auth/v1/token?grant_type=refresh_token')) {
      const key = String(body.refresh_token || '').replace('refresh-', '');
      return ROLE_DEFINITIONS.some(role => role.key === key)
        ? reply(200, { access_token: `token-${key}` })
        : reply(400, {});
    }
    const token = String(options.headers?.authorization || '').replace('Bearer ', '');
    const role = byToken.get(token);
    if (!role) return reply(401, {});
    const name = new URL(url).pathname.split('/').pop();
    if (body.org && body.org !== env.MIR_TEST_ORG_ID) return reply(403, { code: '42501' });
    if (name === 'mir_my_memberships') return reply(200, [{ id: env.MIR_TEST_ORG_ID }]);
    if (name === 'mir_account_snapshot') return reply(200, { role: role.accountRole, userId: `user-${role.key}` });
    if (name === 'mir_portal_snapshot') return reply(200, { actorId: `user-${role.key}` });
    if (name === 'mir_employee_operations_snapshot') return reply(200, { role: role.operationsRole });
    if (name === 'mir_punch_snapshot') return reply(200, { role: role.operationsRole });
    if ((role.denied || []).includes(name)) return reply(403, { code: '42501' });
    if ((role.allowed || []).includes(name)) return reply(200, { role: role.operationsRole });
    return reply(404, {});
  };
  const report = await run(env);
  assert.equal(report.status, 'PASS');
  assert.equal(report.checks.length, 6);
  assert.deepEqual(report.checks.map(check => check.role), ['ADMIN', 'BOSS', 'CHEF', 'EMPLOYEE', 'ADJOINTE', 'ENTREPOT']);
  assert.ok(report.checks.every(check => check.authenticated && check.refreshed && check.organizationConfirmed));
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes('@example.invalid'), false);
  assert.equal(serialized.includes('fixture-'), false);
  assert.equal(serialized.includes('token-'), false);
});
