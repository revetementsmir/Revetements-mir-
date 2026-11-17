'use strict';
/* Real local exports for maximum-length profile identifiers and metadata.
 * Only GETs to the local fixture server and generated blob URLs are allowed.
 * --baseline serves the pinned 3573d90 dossier renderer without changing application files. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const repo = path.resolve(__dirname, '../../../..');
const baseline = process.argv.includes('--baseline');
const out = path.join(__dirname, baseline ? 'headers-before' : 'headers-after');
fs.mkdirSync(out, { recursive: true });
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sourceNames = ['mir-dossier-pdf.js', 'production-model.js', 'annotated-pdf.js', 'mir-client-i18n.js'];
const beforeSource = baseline ? execFileSync('git', ['show', '3573d90f064e95459c18a8b6ba8a4462bfaa1dc0:dist/mir-dossier-pdf.js'], { cwd: repo, encoding: 'utf8' }) : null;
const report = {
  phase: baseline ? 'baseline' : 'after',
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  hashes: Object.fromEntries(sourceNames.map(name => [name, sha(name === 'mir-dossier-pdf.js' && baseline ? beforeSource : fs.readFileSync(path.join(repo, 'dist', name)))])),
  cases: [], blocked: [], errors: [], checks: []
};
function check(name, fn) {
  try { fn(); report.checks.push({ name, ok: true }); }
  catch (e) { report.checks.push({ name, ok: false, message: e.message }); }
}
const compact = value => String(value).normalize('NFC').replace(/\s+/g, '');
(async () => {
  const server = await require(path.join(repo, 'tests/helpers/mir-static-http.cjs')).serve(path.join(repo, 'dist'));
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const locale of ['fr-CA', 'en-CA']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      await page.route('**/*', route => {
        const request = route.request(), url = request.url();
        if (request.method() !== 'GET' || !(url.startsWith(server.base + '/') || url.startsWith('blob:'))) {
          report.blocked.push({ method: request.method(), url: url.split('?')[0] });
          return route.abort();
        }
        if (baseline && new URL(url).pathname === '/mir-dossier-pdf.js') {
          return route.fulfill({ status: 200, contentType: 'application/javascript', body: beforeSource });
        }
        return route.continue();
      });
      page.on('pageerror', error => report.errors.push({ locale, message: error.message }));
      await page.goto(server.base + '/selection.html');
      await page.waitForFunction(() => !!window.MIRPDF && !!window.MIRProduction && !!window.MIRClientLocale);
      await page.evaluate(value => MIRClientLocale.setLocale(value), locale);
      const result = await page.evaluate(async locale => {
        const common = {
          kind: 'profile', template: 'custom', unit: 'in', startAngle: 0,
          material: { type: 'aluminium', name: 'Aluminium QA', thickness: 0.024, thicknessUnit: 'in' },
          finish: { system: 'manufacturer', manufacturer: 'Kaycan', name: 'Noir officiel QA', code: 'QC-QA-123', selectionType: 'manufacturer' },
          coloredFace: { side: 'left', segmentId: 'A' }
        };
        const items = [
          { ...common, id: ['I'.repeat(39), 'J'.repeat(39)].join(' ') + 'I', name: ['N'.repeat(44), 'O'.repeat(44), 'P'.repeat(44)].join(' ') + ' FIN-A', quantity: 13, length: 120,
            segments: [{ label: 'A', length: 2 }, { label: 'B', length: 1.5 }, { label: 'C', length: 1.5 }, { label: 'D', length: 1.25 }],
            bends: [{ mode: 'signed', angle: -90 }, { mode: 'hem', direction: 'right' }, { mode: 'signed', angle: 90 }],
            note: ('Notes françaises synthétiques du premier profil. ').repeat(17).slice(0, 489) + 'FIN-NOTE-UN' },
          { ...common, id: ['K'.repeat(39), 'L'.repeat(39)].join(' ') + 'K', name: ['Q'.repeat(44), 'R'.repeat(44), 'S'.repeat(44)].join(' ') + ' FIN-B', quantity: 17, length: 132,
            segments: [{ label: 'A', length: 4.5 }, { label: 'B', length: 1.75 }, { label: 'C', length: 2.125 }, { label: 'D', length: 1.5 }],
            bends: [{ mode: 'interior', angle: 86, direction: 'left' }, { mode: 'interior', angle: 92, direction: 'right' }, { mode: 'interior', angle: 90, direction: 'left' }],
            note: ('Notes françaises synthétiques du second profil. ').repeat(17).slice(0, 487) + 'FIN-NOTE-DEUX' }
        ];
        const order = {
          poNumber: ['X'.repeat(49), 'Y'.repeat(49)].join(' ') + 'X',
          project: ['A'.repeat(52), 'B'.repeat(52), 'C'.repeat(52)].join(' ') + 'AB',
          foreman: ['D'.repeat(59), 'E'.repeat(59)].join(' ') + 'D', date: 'F'.repeat(40), revision: 'G'.repeat(60), items
        };
        const input = JSON.stringify(order);
        localStorage.setItem('mir-pdf-header-qa', input);
        const faces = MIRProduction.productionPages(order, { document: 'client-request' });
        const svgSnapshot = JSON.stringify(faces);
        const modelBefore = JSON.stringify(items.map(item => MIRProduction.buildProfile(item)));
        await MIRPDF.exportPlan({ title: 'QA — Identification complète', subtitle: order.project, filename: 'QA-headers-' + locale + '.pdf', faces });
        const bytes = new Uint8Array(await (await fetch(document.querySelector('#mir-pdf-ready a[download]').href)).arrayBuffer());
        const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
        const pdf = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true, isEvalSupported: false, standardFontDataUrl: '/vendor/pdfjs/standard_fonts/' }).promise;
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const pdfPage = await pdf.getPage(i), content = await pdfPage.getTextContent(), viewport = pdfPage.getViewport({ scale: 1 });
          const entry = {
            page: i, text: content.items.map(item => item.str).join('\n'),
            bounds: content.items.filter(item => item.str.trim()).map(item => ({ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height })),
            paper: [viewport.width, viewport.height]
          };
          if (locale === 'en-CA' && (i === 3 || i === 4)) {
            const view = pdfPage.getViewport({ scale: 1.2 }), canvas = document.createElement('canvas');
            canvas.width = Math.ceil(view.width); canvas.height = Math.ceil(view.height);
            await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport: view }).promise;
            entry.png = canvas.toDataURL('image/png').split(',')[1];
          }
          pages.push(entry);
        }
        let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
        return {
          locale, order, normalizedFieldsPreserved: items.every(item => { const model = MIRProduction.buildProfile(item); return model.id === item.id && model.name === item.name && model.note === item.note && model.quantity === item.quantity; }), inputUnchanged: JSON.stringify(order) === input,
          storageUnchanged: localStorage.getItem('mir-pdf-header-qa') === input,
          facesUnchanged: JSON.stringify(faces) === svgSnapshot,
          modelUnchanged: JSON.stringify(items.map(item => MIRProduction.buildProfile(item))) === modelBefore,
          sourceFaces: faces.map(face => ({ name: face.name, continuation: /Continuation/.test(face.name) })),
          pages, pdf: btoa(binary)
        };
      }, locale);
      fs.writeFileSync(path.join(out, 'headers-' + locale + '.pdf'), Buffer.from(result.pdf, 'base64'));
      delete result.pdf;
      for (const pdfPage of result.pages) {
        if (pdfPage.png) fs.writeFileSync(path.join(out, 'headers-' + locale + '-page' + pdfPage.page + '.png'), Buffer.from(pdfPage.png, 'base64'));
        delete pdfPage.png;
      }
      for (const flag of ['normalizedFieldsPreserved', 'inputUnchanged', 'storageUnchanged', 'facesUnchanged', 'modelUnchanged']) check(locale + ' ' + flag, () => assert.equal(result[flag], true));
      const groups = [];
      for (const pdfPage of result.pages) {
        if (/IDENTIFICATION DU DOSSIER|FILE IDENTIFICATION/.test(pdfPage.text)) groups.at(-1)?.push(pdfPage);
        else groups.push([pdfPage]);
      }
      check(locale + ' one document group per source face', () => assert.equal(groups.length, result.sourceFaces.length));
      const textAll = result.pages.map(p => p.text).join('\n');
      if (locale === 'en-CA') {
        check('English continuation heading', () => { assert.doesNotMatch(textAll, /Continuation — quantité déjà comptée/); assert.match(textAll, /Continued — quantity already counted/); });
        check('English continuation notice', () => assert.doesNotMatch(textAll, /Bloc complémentaire seulement/));
      }
      for (let index = 0; index < result.sourceFaces.length; index++) {
        const face = result.sourceFaces[index], group = groups[index] || [];
        const item = result.order.items.find(candidate => face.name.startsWith(candidate.id));
        check(locale + ' face ' + (index + 1) + ' complete ordered identifier and name', () => {
          assert.ok(item, 'Source face must identify its synthetic profile');
          assert.ok(compact(group.map(p => p.text).join('\n')).includes(compact(item.id + ' · ' + item.name)), 'Long identifier/name lost or reordered');
        });
        check(locale + ' face ' + (index + 1) + ' complete project and reference', () => {
          const combined = compact(group.map(p => p.text).join('\n'));
          assert.ok(combined.includes(compact(result.order.poNumber)), 'Order reference missing');
          assert.ok(combined.includes(compact(result.order.project)), 'Project missing');
        });
        if (face.continuation) check(locale + ' continuation ' + (index + 1) + ' no old header over detail area', () => {
          // A 20px source heading at y255 would become 14.4pt with baseline608.4.
          assert.ok(!group[0].bounds.some(t => t.height > 13.9 && t.y > 600 && t.y < 617), 'Unrelocated continuation heading overlaps detail columns');
        });
      }
      for (const item of result.order.items) check(locale + ' quantity ' + item.quantity + ' appears once', () => assert.equal((textAll.match(new RegExp('\\b' + item.quantity + '\\s+(?:pièce\\(s\\)|pieces)', 'g')) || []).length, 1));
      for (const marker of ['FIN-NOTE-UN', 'FIN-NOTE-DEUX', 'QC-QA-123', 'Noir officiel QA']) check(locale + ' retains ' + marker, () => assert.ok(textAll.includes(marker)));
      const clipped = result.pages.flatMap(p => p.bounds.filter(t => t.x < 18 || t.x + t.width > p.paper[0] - 18 || t.y < 18 || t.y > p.paper[1] - 18).map(t => ({ page: p.page, ...t })));
      check(locale + ' text bounds stay on paper', () => assert.deepEqual(clipped, []));
      report.cases.push(result);
      await page.close();
    }
    check('no JavaScript errors', () => assert.deepEqual(report.errors, []));
  } finally {
    await browser.close(); await server.close();
    report.hashesAtCompletion = Object.fromEntries(sourceNames.map(name => [name, sha(name === 'mir-dossier-pdf.js' && baseline ? beforeSource : fs.readFileSync(path.join(repo, 'dist', name)))]));
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  }
  const failed = report.checks.filter(check => !check.ok);
  console.log(JSON.stringify({ phase: report.phase, checks: report.checks.length, passed: report.checks.length - failed.length, failed: failed.map(check => check.name), pages: report.cases.map(c => [c.locale, c.pages.length]), revision: report.revision }, null, 2));
  if (failed.length) process.exitCode = 1;
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
