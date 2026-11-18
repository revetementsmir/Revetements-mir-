'use strict';
/* Real local SVG/canvas pointer input. Hit discovery is read-only; no model setter
 * or synthetic DOM event invokes the editor's selection handlers. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const {chromium} = require('playwright');
const repo = path.resolve(__dirname, '..');
const out = path.join(path.resolve(process.env.MIR_STUDIO03_OUT || path.join(repo, 'docs/verification/studio-03-20261118')), 'picking');
const digest = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const report = {generatedAt:new Date().toISOString(),testSha256:digest(fs.readFileSync(__filename)),checks:[],blocked:[],errors:[],httpErrors:[]};

async function serve() {
  const root = path.join(repo, 'dist');
  const server = http.createServer((req,res) => {
    if (req.method !== 'GET') return res.writeHead(405).end();
    try {
      const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
      if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
      const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.avif':'image/avif','.woff2':'font/woff2','.wasm':'application/wasm'};
      res.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream','cache-control':'no-store'});
      fs.createReadStream(file).pipe(res);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {origin:'http://127.0.0.1:' + server.address().port, close:() => new Promise(resolve => server.close(resolve))};
}

async function model(page) {
  return page.evaluate(() => {
    const captured = MIR_STUDY.captureEstimation();
    const state = structuredClone(captured.state);
    const selected = state.selected; delete state.selected;
    return {
      selected, state,
      geometry:{dimensions:captured.planData.dimensions,faces:captured.planData.faces},
      camera:{angle:captured.state.rotation,elevation:captured.state.cameraElevation ?? 22,zoom:captured.state.cameraZoom ?? 1},
      canvasSame:window.__mirStudio03Picking.canvas === document.querySelector('#three-canvas')
    };
  });
}

async function realPointer(page, context, point, touch) {
  if (!touch) return page.mouse.click(point.x, point.y);
  const cdp = await context.newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:point.x,y:point.y,radiusX:1,radiusY:1,force:1}]});
    await new Promise(resolve => setTimeout(resolve,70));
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
  } finally { await cdp.detach(); }
}

async function afterSelection(page, id) {
  await page.waitForFunction(id => MIR_STUDY.snapshot().selected.kind === 'zone' && MIR_STUDY.snapshot().selected.id === id && document.querySelector('#mir-studio-03-zone').value === id, id);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

function unchanged(before, after, label) {
  assert.notEqual(after.selected.id,before.selected.id,label + ': another zone really selected');
  assert.equal(after.selected.kind,'zone',label + ': actual zone selection');
  assert.deepEqual(after.camera,before.camera,label + ': camera unchanged');
  assert.deepEqual(after.geometry,before.geometry,label + ': complete source geometry unchanged');
  assert.deepEqual(after.state,before.state,label + ': all project state except selected zone unchanged');
  assert.equal(after.canvasSame,true,label + ': canvas node preserved');
}

async function run(browser, server, width) {
  const size = {width,height:width === 1440 ? 900 : 844},touch = width === 390;
  const context = await browser.newContext({viewport:size,hasTouch:touch,isMobile:false,deviceScaleFactor:1,reducedMotion:'reduce',locale:'fr-CA',serviceWorkers:'block'});
  await context.route('**/*', route => {
    const request = route.request();
    if (new URL(request.url()).origin === server.origin && request.method() === 'GET') return route.continue();
    report.blocked.push({width,method:request.method(),url:request.url()}); return route.abort();
  });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  page.on('pageerror', error => report.errors.push({width,message:error.message}));
  page.on('response', response => { if (response.status() >= 400) report.httpErrors.push({width,url:response.url(),status:response.status()}); });
  try {
    await page.goto(server.origin + '/plan.html?mode=test', {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => window.MIR_STUDY && document.body.dataset.mirStudio03Ready === 'true' && MIR3D.diagnostics(document.querySelector('#three-canvas'))?.rendered, null, {timeout:60000});
    await page.evaluate(() => {
      const data = window.__mirStudio03Picking = {canvas:document.querySelector('#three-canvas'),events:[]};
      for (const type of ['pointerdown','pointerup','click','touchstart','touchend']) document.querySelector('#stage').addEventListener(type, event => {
        const point = event.changedTouches?.[0] || event;
        data.events.push({type:event.type,trusted:event.isTrusted,pointerType:event.pointerType || null,x:point.clientX,y:point.clientY,target:event.target.id || event.target.closest?.('[data-zone]')?.dataset.zone || event.target.tagName});
      }, {capture:true,passive:true});
    });
    await page.locator('#view-2d').click();
    await page.waitForFunction(() => MIR_STUDY.snapshot().view === '2d' && !document.querySelector('#elevation').hidden);
    await page.locator('#elevation').scrollIntoViewIfNeeded();
    const before2d = await model(page);
    // Hit-test the real visible SVG, including occlusion and masks. A small
    // interior neighbourhood must belong to the same rendered polygon.
    const candidates = await page.evaluate(() => {
      const svg = document.querySelector('#elevation svg'),box = svg.getBoundingClientRect(),rows = [];
      const minX = Math.max(12,box.left + 4),maxX = Math.min(innerWidth - 12,box.right - 4);
      const minY = Math.max(12,box.top + 4),maxY = Math.min(innerHeight - 12,box.bottom - 4);
      const step = innerWidth < 500 ? 4 : 9;
      for (let y=minY;y<maxY;y+=step) for (let x=minX;x<maxX;x+=step) {
        const target = document.elementFromPoint(x,y)?.closest('[data-zone]');
        if (!target || !svg.contains(target)) continue;
        if ([[x-2,y],[x+2,y],[x,y-2],[x,y+2]].some(([px,py]) => document.elementFromPoint(px,py)?.closest('[data-zone]') !== target)) continue;
        const matrix = target.getScreenCTM(); if (!matrix) continue;
        const point = new DOMPoint(x,y).matrixTransform(matrix.inverse());
        rows.push({id:target.dataset.zone,x,y,source:[point.x,point.y]});
      }
      return rows;
    });
    const point2d = candidates.find(point => point.id !== before2d.selected.id);
    assert.ok(point2d,'a visible alternative SVG zone can be hit');
    const svgCandidateCount = candidates.length;
    await realPointer(page,context,point2d,touch);
    await afterSelection(page,point2d.id);
    const after2d = await model(page); unchanged(before2d,after2d,'SVG ' + width);
    const screenshot2d = 'svg-zone-' + width + '.png';
    await page.screenshot({path:path.join(out,screenshot2d),fullPage:false,animations:'disabled'});

    await page.locator('#view-3d').click();
    await page.waitForFunction(() => MIR_STUDY.snapshot().view === '3d' && MIR3D.diagnostics(document.querySelector('#three-canvas'))?.rendered);
    await page.locator('#three-canvas').scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const before3d = await model(page);
    // The native projection and pick APIs are read-only. Their returned point
    // must correspond to the already observed SVG zone and an unobscured wall.
    const point3d = await page.evaluate(({candidates,selected}) => {
      const canvas = document.querySelector('#three-canvas'),face = MIR_STUDY.snapshot().face;
      for (const source of candidates) {
        if (source.id === selected) continue;
        const projected = MIR3D.projectPoint(canvas,face,source.source); if (!projected) continue;
        const x = projected.clientX,y = projected.clientY;
        if (x<12 || y<12 || x>innerWidth-12 || y>innerHeight-12 || document.elementFromPoint(x,y) !== canvas) continue;
        const hit = MIR3D.pick(canvas,x,y);
        if (hit?.type !== 'wall' || hit.view !== face || hit.returnId || hit.sharedFinish || !hit.sourcePoint) continue;
        if (Math.hypot(hit.sourcePoint[0]-source.source[0],hit.sourcePoint[1]-source.source[1]) > 0.01) continue;
        return {id:source.id,x,y,source:source.source,hit};
      }
      return null;
    }, {candidates,selected:before3d.selected.id});
    assert.ok(point3d,'native read-only picking finds another visible 3D wall zone');
    await realPointer(page,context,point3d,touch);
    await afterSelection(page,point3d.id);
    const after3d = await model(page); unchanged(before3d,after3d,'canvas ' + width);
    const screenshot3d = 'canvas-zone-' + width + '.png';
    await page.screenshot({path:path.join(out,screenshot3d),fullPage:false,animations:'disabled'});
    const events = await page.evaluate(() => window.__mirStudio03Picking.events);
    assert.ok(events.filter(event => event.type === 'pointerup' && event.trusted).length >= 2,'two genuine browser pointer gestures recorded');
    assert.ok(events.some(event => event.type === 'click' && event.trusted && event.target === point2d.id),'SVG received a genuine click');
    assert.ok(events.some(event => event.type === 'pointerup' && event.trusted && event.target === 'three-canvas' && event.pointerType === (touch ? 'touch' : 'mouse')),'canvas received the expected real input type');
    return {
      width,passed:true,input:touch ? 'Native CDP touch, 70 ms contact' : 'Native mouse click',svgCandidateCount,
      svg:{before:before2d.selected,after:after2d.selected,point:point2d,camera:after2d.camera,geometrySha256:digest(after2d.geometry),capture:screenshot2d},
      canvas:{before:before3d.selected,after:after3d.selected,point:point3d,camera:after3d.camera,geometrySha256:digest(after3d.geometry),capture:screenshot3d},
      allOtherStateUnchanged:true,zoneSelectSynchronized:true,canvasIdentityPreserved:true,events
    };
  } finally { await context.close(); }
}

async function main() {
  fs.mkdirSync(out,{recursive:true});
  const server = await serve(),browser = await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  report.browser = browser.version();
  report.sourceSha256 = Object.fromEntries(['mir-studio-03.js','mir-studio-03.css','plan-app.js','plan-3d.js','studio-features.js'].map(file => [file,digest(fs.readFileSync(path.join(repo,'dist',file)))]));
  try {
    for (const width of [1440,390]) {
      try { report.checks.push(await run(browser,server,width)); console.log('PASS picking ' + width); }
      catch (error) { report.checks.push({width,passed:false,error:error.stack}); console.error('FAIL picking ' + width + ': ' + error.message); }
    }
  } finally {
    report.passed = report.checks.length === 2 && report.checks.every(check => check.passed) && !report.errors.length && !report.httpErrors.length && !report.blocked.length;
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2) + '\n');
    await browser.close(); await server.close();
  }
  assert.ok(report.passed,'See ' + path.join(out,'results.json'));
  console.log('PASS direct picking: 4 real selections, camera/geometry/state preserved; local GET only.');
}
main().catch(error => { console.error(error);process.exitCode=1; });
