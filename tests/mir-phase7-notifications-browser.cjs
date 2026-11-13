"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  { once } = require("node:events"),
  { chromium } = require("playwright");
const root = path.resolve(__dirname, "../dist"),
  proof = path.resolve(__dirname, "../docs/verification/phase7-notifications");
const types = {
  ".js": "application/javascript",
  ".html": "text/html",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
let serverState;
const resetServer = () =>
  (serverState = {
    expenseStatus: "submitted",
    action: {
      id: "00000000-0000-4000-8000-000000000901",
      module: "expenses",
      type: "expense_submitted",
      title: "Nouvelle dépense à traiter",
      summary: "Ouvrez Dépenses pour consulter l’état autorisé.",
      priority: "action_required",
      route: {
        view: "expenses",
        expenseId: "00000000-0000-4000-8000-000000000801",
      },
      entityId: "00000000-0000-4000-8000-000000000801",
      createdAt: new Date().toISOString(),
      readAt: null,
      treatedAt: null,
      actionRequired: true,
    },
    inaccessible: {
      id: "00000000-0000-4000-8000-000000000902",
      module: "jobs",
      type: "job_assignment",
      title: "Ancienne cible",
      summary: "La cible a été archivée.",
      priority: "information",
      route: { view: "archived-target" },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      readAt: null,
      treatedAt: null,
      actionRequired: false,
    },
    otherUserTreatedAt: null,
  });
const response = (res, data, status = 200) =>
  res
    .writeHead(status, { "content-type": "application/json" })
    .end(JSON.stringify(data));
const body = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (x) => (raw += x));
    req.on("end", () => resolve(JSON.parse(raw || "{}")));
  });
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://local");
  if (url.pathname === "/phase7/state") {
    const items = [serverState.action, serverState.inaccessible];
    return response(res, {
      items,
      unreadCount: items.filter((x) => !x.readAt).length,
      actionCount: items.filter((x) => x.actionRequired && !x.treatedAt).length,
      expenseStatus: serverState.expenseStatus,
    });
  }
  if (url.pathname === "/phase7/read" && req.method === "POST") {
    const data = await body(req);
    for (const item of [serverState.action, serverState.inaccessible])
      if (data.ids?.includes(item.id))
        item.readAt = data.action === "read" ? new Date().toISOString() : null;
    return response(res, { ok: true });
  }
  if (url.pathname === "/phase7/decide" && req.method === "POST") {
    serverState.expenseStatus = "approved";
    serverState.action.treatedAt = new Date().toISOString();
    return response(res, { ok: true });
  }
  if (url.pathname === "/phase7/other")
    return response(res, {
      treatedAt: serverState.otherUserTreatedAt,
      visible: false,
    });
  const file = path.resolve(root, "." + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(404).end();
  fs.readFile(file, (e, b) =>
    e
      ? res.writeHead(404).end()
      : res
          .writeHead(200, {
            "content-type":
              types[path.extname(file)] || "application/octet-stream",
          })
          .end(b),
  );
});
const source = fs.readFileSync(path.join(root, "portal-client.js"), "utf8"),
  stub = `
window.MIRPortalClient={...window.MIRPortalClient,create(){let publish=()=>{},snapshot=null;async function load(){const remote=await fetch('/phase7/state').then(r=>r.json()),model=MIREmployeeStore;snapshot={...model.createDemoState([]),actorId:'demo-employee-1',operations:{role:'assistant'},notifications:{items:remote.items,unreadCount:remote.unreadCount,actionCount:remote.actionCount},expenses:{role:'adjointe',categories:[],expenses:[{id:'00000000-0000-4000-8000-000000000801',supplier:'Fournisseur protégé',total:10,date:new Date().toISOString(),status:remote.expenseStatus,receiptCount:1}]}};return snapshot}const ready=()=>({phase:'ready',snapshot});async function refresh(){await load();publish(ready());return snapshot}return{config:{},getStatus:()=>ready(),subscribe(fn){publish=fn},async start(){await refresh()},refresh,async notificationCenter(filter){const data=await fetch('/phase7/state').then(r=>r.json()),items=filter==='unread'?data.items.filter(n=>!n.readAt):filter==='actions'?data.items.filter(n=>n.actionRequired&&!n.treatedAt):data.items;return{items,unreadCount:data.unreadCount,actionCount:data.actionCount}},async notificationState(ids,action){await fetch('/phase7/read',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ids,action})});return refresh()},async expenseDecide(){await fetch('/phase7/decide',{method:'POST'});return refresh()},async notificationPreferences(){return{categories:{expenses:true},mandatory:['urgent','action_required'],email:false,push:false}}}}};`;
(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port,
    browser = await chromium.launch({
      executablePath: process.env.MIR_CHROMIUM_BIN || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
  try {
    fs.mkdirSync(proof, { recursive: true });
    for (const [width, height] of [
      [390, 844],
      [834, 1112],
      [1366, 768],
      [1440, 900],
    ]) {
      resetServer();
      const page = await browser.newPage({
          viewport: { width, height },
          isMobile: width === 390,
          hasTouch: width <= 834,
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("dialog", (d) => d.accept());
      await page.route("**/catalogue-fd6866b49d21.json", (r) =>
        r.fulfill({ json: [] }),
      );
      await page.route("**/portal-client.js*", (r) =>
        r.fulfill({
          body: source + "\n" + stub,
          contentType: "application/javascript",
        }),
      );
      await page.goto(base + "/chantier.html");
      await page.locator(".notification-bell").waitFor();
      assert.match(
        await page.locator(".notification-bell").getAttribute("aria-label"),
        /2 non lues/,
      );
      await page.locator(".notification-bell").click();
      await page
        .getByRole("heading", { name: "Centre de notifications" })
        .waitFor();
      await page
        .locator(
          '[data-notification-open="00000000-0000-4000-8000-000000000901"]',
        )
        .click();
      await page.getByRole("heading", { name: "Dépenses et reçus" }).waitFor();
      await page.getByRole("button", { name: "Approuver" }).click();
      await page.locator(".expense-row span").filter({ hasText: "Approuvée" }).waitFor();
      await page.locator(".notification-bell").click();
      await page.getByText("Traitée").waitFor();
      await page.getByRole("button", { name: "Actions requises" }).click();
      await page.waitForFunction(() => document.querySelectorAll(".notification-card").length === 0);
      assert.equal(await page.locator(".notification-card").count(), 0);
      await page.reload();
      await page.locator(".notification-bell").click();
      await page.getByText("Traitée").waitFor();
      assert.deepEqual(
        await page.evaluate(() => fetch("/phase7/other").then((r) => r.json())),
        { treatedAt: null, visible: false },
      );
      await page
        .locator(
          '[data-notification-open="00000000-0000-4000-8000-000000000902"]',
        )
        .click();
      await page
        .locator("#portal-toast")
        .filter({ hasText: "plus accessible" })
        .waitFor();
      assert.match(
        await page.locator(".notification-bell").getAttribute("aria-label"),
        /aucune/,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      if ([390, 834, 1440].includes(width))
        await page.screenshot({
          path: path.join(proof, `centre-${width}x${height}.png`),
          fullPage: true,
        });
      await page.close();
      console.log(
        "PASS notifications Dépenses traitée persistée " + width + "x" + height,
      );
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
