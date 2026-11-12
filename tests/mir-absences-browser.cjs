"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const { once } = require("node:events"),
  { chromium } = require("playwright");
const root = path.resolve(__dirname, "../dist"),
  source = fs.readFileSync(path.join(root, "portal-client.js"), "utf8"),
  shots = path.resolve(__dirname, "../docs/verification/phase5-absences");
const server = http.createServer((req, res) => {
  const file = path.resolve(
    root,
    "." + decodeURIComponent(new URL(req.url, "http://x").pathname),
  );
  if (!file.startsWith(root + path.sep)) return res.writeHead(404).end();
  fs.readFile(file, (e, b) =>
    e
      ? res.writeHead(404).end()
      : res
          .writeHead(200, {
            "content-type":
              path.extname(file) === ".js"
                ? "application/javascript"
                : path.extname(file) === ".css"
                  ? "text/css"
                  : "text/html",
          })
          .end(b),
  );
});
const stub = `window.MIRPortalClient={...window.MIRPortalClient,create({config}){const model=window.MIREmployeeStore,actorId='demo-employee-1';let state={...model.createDemoState([]),actorId,absences:{role:'employe_chantier',requests:[]}},publish=()=>{};const ready=()=>({phase:'ready',snapshot:state});return{config,getStatus:()=>({phase:'loading'}),subscribe(fn){publish=fn},async start(){publish(ready())},async refresh(){publish(ready())},async absenceSaveDraft(_,data){const row={id:crypto.randomUUID(),employeeId:actorId,...data,status:'draft',attachments:[],events:[{action:'draft_saved',createdAt:new Date().toISOString()}]};state={...state,absences:{...state.absences,requests:[row]}};publish(ready());return row},async absenceSubmit(id){const row=state.absences.requests.find(x=>x.id===id);row.status='submitted';row.events.push({action:'submitted',createdAt:new Date().toISOString()});publish(ready());return row},async absenceCancel(){},async absenceUploadAttachment(){},async absenceAttachmentURL(){return'about:blank'}}}};`;
(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.MIR_CHROMIUM_BIN || "/usr/bin/chromium",
  });
  try {
    for (const [width, height] of [
      [390, 844],
      [768, 1024],
      [1366, 768],
      [1440, 900],
    ]) {
      const page = await browser.newPage({
          viewport: { width, height },
          isMobile: width === 390,
          hasTouch: width === 390,
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/catalogue-fd6866b49d21.json", (r) =>
        r.fulfill({ json: [] }),
      );
      await page.route("**/portal-client.js*", (r) =>
        r.fulfill({
          body: source + "\n" + stub,
          contentType: "application/javascript",
        }),
      );
      await page.goto(
        `http://127.0.0.1:${server.address().port}/chantier.html`,
      );
      await page.locator(".employee-current-job h1").waitFor();
      await page.locator(".mir-harmony-toggle").click();
      await page.locator('#portal-navigation [data-view="account"]').click();
      await page.getByRole("button", { name: /Mes absences/ }).click();
      await page.getByRole("heading", { name: "Mes demandes", level: 1 }).waitFor();
      await page.locator('[name="type"]').selectOption("appointment");
      await page.locator('[name="startDate"]').fill("2026-12-10");
      await page.locator('[name="endDate"]').fill("2026-12-10");
      await page.locator('[name="dayPart"]').selectOption("partial");
      await page.locator('[name="startTime"]').fill("09:00");
      await page.locator('[name="endTime"]').fill("11:30");
      await page.locator('[name="note"]').fill("RECETTE-PHASE5");
      await page
        .getByRole("button", { name: "Enregistrer le brouillon" })
        .click();
      await page.locator(".absence-row strong", { hasText: "Rendez-vous" }).waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.equal(await page.locator("#portal-navigation").isVisible(), false);
      await page.screenshot({
        path: path.join(shots, `employe-${width}x${height}.png`),
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      console.log(`PASS Absences ${width}x${height} sans débordement`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
