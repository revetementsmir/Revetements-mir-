"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const base = "https://hxtztkmbfpmzrieccwsg.supabase.co",
  production = "gccltmaulvrnthrbnrpd.supabase.co";
const key = process.env.MIR_SANDBOX_PUBLISHABLE_KEY,
  org = process.env.MIR_SANDBOX_ORG_ID;
const roles = {
  admin: "ADMIN",
  boss: "BOSS",
  chef: "CHEF",
  employee: "EMPLOYEE",
  adjointe: "ASSISTANT",
  entrepot: "WAREHOUSE",
};
const report = {
  target: "hxtztkmbfpmzrieccwsg",
  roles: {},
  checks: [],
  writes: [],
  emailSent: false,
  pushSent: false,
  productionRequests: 0,
  at: new Date().toISOString(),
};
async function call(url, options = {}) {
  const host = new URL(url).hostname;
  if (host === production) {
    report.productionRequests++;
    throw Error("Production interdite");
  }
  assert.equal(host, "hxtztkmbfpmzrieccwsg.supabase.co", "Cible hors MIR TEST");
  return fetch(url, options);
}
async function login(name) {
  const p = "MIR_SANDBOX_" + name,
    email = process.env[p + "_EMAIL"],
    password = process.env[p + "_PASSWORD"];
  if (!email || !password)
    throw Error("Secret manquant: " + p + "_EMAIL ou " + p + "_PASSWORD");
  const r = await call(base + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(r.status, 200, "Auth " + name);
  return (await r.json()).access_token;
}
async function rpc(token, name, body = {}, expected = 200) {
  const r = await call(base + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: "Bearer " + token,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  assert.equal(r.status, expected, name + " HTTP " + r.status);
  return expected === 204 ? null : r.json();
}
const subject = (token) =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub;
async function upload(token, objectPath, bytes) {
  const r = await call(
    base + "/storage/v1/object/mir-expense-receipts/" + objectPath,
    {
      method: "POST",
      headers: {
        apikey: key,
        authorization: "Bearer " + token,
        "content-type": "image/png",
        "x-upsert": "false",
      },
      body: bytes,
    },
  );
  assert([200, 201].includes(r.status), "Téléversement reçu HTTP " + r.status);
}
const check = (name) => report.checks.push(name);
(async () => {
  assert(key && org, "Secrets publics MIR TEST absents");
  assert.equal(new URL(base).hostname, "hxtztkmbfpmzrieccwsg.supabase.co");
  check("project_ref_test_verifie");
  const tokens = {};
  for (const [label, name] of Object.entries(roles)) {
    tokens[label] = await login(name);
    const center = await rpc(tokens[label], "mir_notification_center", {
      org,
      filter_name: "all",
      page_size: 10,
      page_before: null,
    });
    assert(Array.isArray(center.items));
    assert.equal(typeof center.unreadCount, "number");
    report.roles[label] = {
      authenticated: true,
      visible: center.items.length,
      unread: center.unreadCount,
    };
  }
  check("six_roles_authentifies");
  check("centres_individuels_bornes");
  const foreign = crypto.randomUUID();
  for (const label of Object.keys(tokens)) {
    await rpc(
      tokens[label],
      "mir_notification_center",
      { org: foreign, filter_name: "all", page_size: 10, page_before: null },
      403,
    );
  }
  check("isolation_organisationnelle_six_roles");
  const before = {};
  for (const label of ["admin", "boss", "adjointe"])
    before[label] = await rpc(tokens[label], "mir_notification_center", {
      org,
      filter_name: "all",
      page_size: 50,
      page_before: null,
    });
  const snapshot = await rpc(tokens.employee, "mir_portal_snapshot");
  const item = (snapshot.catalogue || []).find((x) => x.id),
    job = (snapshot.jobs || [])[0];
  assert(item && job, "Fixture Employé MIR TEST insuffisante");
  const tag = "RECETTE-PHASE7-" + Date.now(),
    requestId = crypto.randomUUID();
  const submitted = await rpc(tokens.employee, "mir_order_create_submit", {
    org,
    request_id: requestId,
    data: {
      jobId: job.id,
      note: tag,
      deliveryMode: "delivery",
      lines: [{ itemId: item.id, quantity: 2 }],
    },
  });
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.supplierSent, false);
  assert.equal(submitted.emailSent, false);
  report.writes.push({ kind: "test_order", id: submitted.orderId, tag });
  check("mutation_metier_reelle_sans_transport");
  const replay = await rpc(tokens.employee, "mir_order_create_submit", {
    org,
    request_id: requestId,
    data: {
      jobId: job.id,
      note: tag,
      deliveryMode: "delivery",
      lines: [{ itemId: item.id, quantity: 2 }],
    },
  });
  assert.equal(replay.orderId, submitted.orderId);
  assert.equal(replay.idempotent, true);
  check("rejeu_metier_sans_doublon");
  const received = {};
  for (const label of ["admin", "boss", "adjointe"]) {
    const center = (received[label] = await rpc(
      tokens[label],
      "mir_notification_center",
      { org, filter_name: "actions", page_size: 50, page_before: null },
    ));
    const row = center.items.find(
      (x) => x.entityId === submitted.orderId && x.type === "request-submitted",
    );
    assert(row, label + " ne reçoit pas la commande à traiter");
    report.roles[label].receivedAction = true;
  }
  check("destinataires_management_calcules_serveur");
  for (const label of ["employee", "chef", "entrepot"]) {
    const center = await rpc(tokens[label], "mir_notification_center", {
      org,
      filter_name: "all",
      page_size: 50,
      page_before: null,
    });
    assert(
      !center.items.some((x) => x.entityId === submitted.orderId),
      label + " ne doit pas recevoir cet événement",
    );
  }
  check("destinataires_non_autorises_exclus");
  const expenseSnapshot = await rpc(tokens.employee, "mir_expense_snapshot", {
    org,
  });
  const expenseRequest = crypto.randomUUID(),
    expenseTag = "RECETTE-PHASE7-CORRECTIF-" + Date.now();
  const expenseDraft = await rpc(tokens.employee, "mir_expense_save_draft", {
    org,
    request_id: expenseRequest,
    expense_id: null,
    data: {
      expenseDate: new Date().toISOString().slice(0, 10),
      supplier: expenseTag,
      categoryCode: expenseSnapshot.categories[0].code,
      jobId: job.id,
      amountMode: "before_tax",
      amount: "1.00",
      note: expenseTag,
    },
  });
  const expenseId = expenseDraft.id,
    employeeId = subject(tokens.employee),
    receiptPath = `${org}/expense/${expenseId}/${employeeId}/${crypto.randomUUID()}.png`,
    bytes = Buffer.from("89504e470d0a1a0a", "hex");
  await upload(tokens.employee, receiptPath, bytes);
  await rpc(tokens.employee, "mir_expense_attach_receipt", {
    org,
    request_id: crypto.randomUUID(),
    expense_id: expenseId,
    object_path: receiptPath,
    file_name: "RECETTE-PHASE7-CORRECTIF.png",
    mime_type: "image/png",
    size_bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  });
  await rpc(tokens.employee, "mir_expense_submit", {
    org,
    request_id: crypto.randomUUID(),
    expense_id: expenseId,
  });
  for (const label of ["admin", "boss", "adjointe"]) {
    const center = await rpc(tokens[label], "mir_notification_center", {
      org,
      filter_name: "actions",
      page_size: 50,
      page_before: null,
    });
    assert(center.items.some((x) => x.entityId === expenseId && x.type === "expense_submitted"));
    report.roles[label].expenseAction = true;
  }
  for (const label of ["chef", "entrepot"]) {
    const center = await rpc(tokens[label], "mir_notification_center", {
      org,
      filter_name: "all",
      page_size: 50,
      page_before: null,
    });
    assert(!center.items.some((x) => x.entityId === expenseId));
  }
  await rpc(tokens.adjointe, "mir_expense_decide", {
    org,
    request_id: crypto.randomUUID(),
    expense_id: expenseId,
    decision: "approved",
    reason: "",
  });
  const employeeExpenseCenter = await rpc(tokens.employee, "mir_notification_center", {
    org,
    filter_name: "all",
    page_size: 50,
    page_before: null,
  });
  assert(employeeExpenseCenter.items.some((x) => x.entityId === expenseId && x.type === "expense_approved"));
  const treatedExpense = await rpc(tokens.adjointe, "mir_notification_center", {
    org,
    filter_name: "all",
    page_size: 50,
    page_before: null,
  });
  assert(treatedExpense.items.some((x) => x.entityId === expenseId && x.treatedAt));
  report.roles.employee.ownExpenseDecision = true;
  report.roles.adjointe.treatedExpense = true;
  report.writes.push({ kind: "test_expense", id: expenseId, tag: expenseTag, receiptPath });
  check("depense_soumise_decidee_traitee_et_isolee");

  const today = new Date().toISOString().slice(0, 10),
    absenceId = await rpc(tokens.employee, "mir_hr_submit", {
      org,
      kind: "sickness_today",
      start_on: today,
      end_on: today,
      note: expenseTag,
      request_id: crypto.randomUUID(),
    });
  const chefCenter = await rpc(tokens.chef, "mir_notification_center", {
    org,
    filter_name: "all",
    page_size: 50,
    page_before: null,
  });
  assert(chefCenter.items.some((x) => x.entityId === absenceId && x.module === "absences"));
  assert(!chefCenter.items.some((x) => x.entityId === expenseId));
  report.roles.chef.teamAbsence = true;
  check("chef_evenement_equipe_sans_depense");

  const warehouseSku = await rpc(tokens.admin, "mir_warehouse_register", {
    org,
    kind: "hardware",
    source_ref: expenseTag,
    sku_code: `P7-${crypto.randomUUID().slice(0, 8)}`,
    display_name: expenseTag,
    unit_name: "unité",
    step: 1,
  });
  assert(warehouseSku?.qrToken, "Création du SKU de recette Entrepôt refusée");
  report.writes.push({ kind: "warehouse_sku", id: warehouseSku.id, tag: expenseTag });
  const movement = await rpc(tokens.entrepot, "mir_warehouse_move", {
    org,
    qr: warehouseSku.qrToken,
    line_id: null,
    delta: 1,
    request_id: crypto.randomUUID(),
    reason: expenseTag,
  });
  const warehouseCenter = await rpc(tokens.entrepot, "mir_notification_center", {
    org,
    filter_name: "all",
    page_size: 50,
    page_before: null,
  });
  assert(warehouseCenter.items.some((x) => x.entityId === movement.movementId && x.module === "inventory"));
  assert(!warehouseCenter.items.some((x) => x.entityId === expenseId || x.entityId === absenceId));
  report.roles.entrepot.inventoryMovement = true;
  report.writes.push({ kind: "warehouse_receipt", id: movement.movementId, tag: expenseTag });
  check("entrepot_evenement_inventaire_seulement");
  const target = received.adjointe.items.find(
      (x) => x.entityId === submitted.orderId,
    ),
    receipt = crypto.randomUUID();
  let state = await rpc(tokens.adjointe, "mir_notification_state", {
    org,
    request_id: receipt,
    notification_ids: [target.id],
    action: "read",
  });
  assert.equal(state.changed, 1);
  check("marquage_lu_confirme");
  state = await rpc(tokens.adjointe, "mir_notification_state", {
    org,
    request_id: crypto.randomUUID(),
    notification_ids: [target.id],
    action: "unread",
  });
  assert.equal(state.changed, 1);
  check("remise_non_lue_confirmee");
  await rpc(
    tokens.employee,
    "mir_notification_state",
    {
      org,
      request_id: crypto.randomUUID(),
      notification_ids: [target.id],
      action: "read",
    },
    403,
  );
  check("etat_autre_destinataire_refuse");
  const prefs = await rpc(tokens.employee, "mir_notification_preferences", {
    org,
    changes: { chat: false },
  });
  assert.equal(prefs.categories.chat, false);
  assert.deepEqual(prefs.mandatory, ["urgent", "action_required"]);
  assert.equal(prefs.email, false);
  assert.equal(prefs.push, false);
  await rpc(tokens.employee, "mir_notification_preferences", {
    org,
    changes: { chat: true },
  });
  check("preference_non_essentielle_et_transports_inactifs");
  const bad = await call(base + "/rest/v1/rpc/mir_notification_center", {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ org, filter_name: "all", page_size: 10 }),
  });
  assert([401, 403].includes(bad.status));
  check("anon_refuse");
  assert.equal(report.productionRequests, 0);
  assert.equal(report.emailSent, false);
  assert.equal(report.pushSent, false);
  fs.mkdirSync(path.resolve("artifacts"), { recursive: true });
  fs.writeFileSync(
    path.resolve("artifacts/phase7-notifications-real.json"),
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
  console.log(
    "PASS MIR TEST Phase 7: " +
      report.checks.length +
      " contrôles, six rôles, production 0 requête, courriel/push 0.",
  );
})().catch((error) => {
  report.error = error.message;
  fs.mkdirSync(path.resolve("artifacts"), { recursive: true });
  fs.writeFileSync(
    path.resolve("artifacts/phase7-notifications-real.json"),
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
  console.error(error.message);
  process.exitCode = 1;
});
