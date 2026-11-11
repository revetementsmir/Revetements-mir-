'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const {
  configuration,
  authenticate,
  refreshSession,
  rpc,
  assertOk,
  assertDenied
} = require('./certify-six-roles.cjs');

const OUTPUT = path.resolve(process.env.MIR_PUNCH_COMPLETION_REPORT || 'artifacts/punch-completion-certification.json');
const JOURNAL_ROLES = new Set(['ADMIN', 'BOSS', 'ADJOINTE']);

async function session(config, account) {
  const initial = await authenticate(config, account);
  return {
    account,
    userId: initial.user.id,
    token: await refreshSession(config, account, initial.refresh_token)
  };
}

async function run(env = process.env) {
  const config = configuration(env);
  const sessions = new Map();
  const report = {
    project: 'MIR TEST',
    projectId: 'hxtztkmbfpmzrieccwsg',
    kind: 'real-punch-phase2-completion-certification',
    startedAt: new Date().toISOString(),
    journalMatrix: []
  };

  try {
    for (const account of config.accounts) {
      const current = await session(config, account);
      sessions.set(account.key, current);
      const response = await rpc(config, current.token, 'mir_punch_journal', {
        org: config.org,
        filters: {},
        page_size: 1,
        page_after: null
      });
      if (JOURNAL_ROLES.has(account.key)) {
        const journal = assertOk(response, `${account.key}: journal Punch`);
        if (!Array.isArray(journal?.items)) throw Error(`${account.key}: format du journal invalide`);
      } else {
        assertDenied(response, `${account.key}: journal Punch interdit`);
      }
      report.journalMatrix.push({ role: account.key, allowed: JOURNAL_ROLES.has(account.key), verified: true });
    }

    const employee = sessions.get('EMPLOYEE');
    const assistant = sessions.get('ADJOINTE');
    const admin = sessions.get('ADMIN');
    const requestedFor = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    const marker = randomUUID();
    const requestId = assertOk(await rpc(config, employee.token, 'mir_time_bank_request', {
      org: config.org,
      request: null,
      payload: { quantity: 0.25, requestedFor, explanation: `Certification automatisée ${marker}` }
    }), 'EMPLOYEE: création demande banque');

    const pending = assertOk(await rpc(config, employee.token, 'mir_punch_snapshot', {
      org: config.org,
      employee: null
    }), 'EMPLOYEE: demande banque en attente');
    if (!pending?.bankRequests?.some(item => item.id === requestId && item.status === 'pending')) {
      throw Error('EMPLOYEE: demande banque absente du snapshot');
    }

    assertOk(await rpc(config, assistant.token, 'mir_time_bank_request', {
      org: config.org,
      request: requestId,
      payload: { decision: 'refused', reason: 'Certification automatisée sans débit réel' }
    }), 'ADJOINTE: décision demande banque');

    const decided = assertOk(await rpc(config, employee.token, 'mir_punch_snapshot', {
      org: config.org,
      employee: null
    }), 'EMPLOYEE: décision banque visible');
    if (!decided?.bankRequests?.some(item => item.id === requestId && item.status === 'refused')) {
      throw Error('EMPLOYEE: décision banque absente du snapshot');
    }

    const journal = assertOk(await rpc(config, admin.token, 'mir_punch_journal', {
      org: config.org,
      filters: { employeeId: employee.userId, action: 'bank_request_refused' },
      page_size: 25,
      page_after: null
    }), 'ADMIN: trace de décision banque');
    if (!journal?.items?.some(item => item.entity_id === requestId)) {
      throw Error('ADMIN: décision banque absente du journal');
    }

    Object.assign(report, {
      status: 'PASS',
      bankRequest: {
        createdBy: 'EMPLOYEE',
        decidedBy: 'ADJOINTE',
        finalStatus: 'refused',
        employeeSnapshotVerified: true,
        journalVerifiedBy: 'ADMIN',
        balanceChanged: false
      },
      finishedAt: new Date().toISOString()
    });
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
    console.log('PASS complétion Punch réelle: six rôles, journal et banque d’heures');
  }).catch(error => {
    writeReport(error.report || { status: 'FAIL', error: error.message, finishedAt: new Date().toISOString() });
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { JOURNAL_ROLES, run };
