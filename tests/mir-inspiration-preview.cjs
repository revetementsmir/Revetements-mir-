'use strict';
// Verify the generated TEST artifact at its real /test/ path. No external writes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { serve } = require('./helpers/mir-static-http.cjs');

const repo = path.resolve(__dirname, '..');
const build = path.join(repo, '.prestige-preview');
const output = path.resolve(process.env.MIR_INSPIRATION_PREVIEW_OUT || '/tmp/mir-inspiration-preview-proof');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const report = { generatedAt: new Date().toISOString(), externalRequests: [], pageErrors: [], consoleErrors: [], styles: [] };

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(build, 'test/mir-test-environment.json')));
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  assert.equal(manifest.environment, 'test');
  assert.equal(manifest.revision, revision);
  report.revision = revision;
  report.environment = manifest.environment;
  const server = await serve(build);
  const browser = await chromium.launch({ executablePath: process.env.MIR_CHROMIUM_BIN || '/usr/bin/chromium', args: ['--no-sandbox'] });
  report.browser = browser.version();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === server.base && url.pathname.startsWith('/test/') && request.method() === 'GET') return route.continue();
      report.externalRequests.push({ origin: url.origin, path: url.pathname, method: request.method() });
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    await page.goto(server.base + '/test/maison.html');
    await page.locator('.mir-pc-actions a[href*="inspiration.html"]').click();
    await page.waitForURL(url => url.pathname === '/test/inspiration.html');
    await page.waitForFunction(() => !!window.MIRInspirationData);
    report.fromMaison = true;
    assert.match(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'), /connect-src 'self'/);
    assert.ok(await page.locator('script[src="mir-prestige-preview-guard.js"]').count());
    assert.match(await page.locator('meta[name="robots"]').first().getAttribute('content'), /noindex/);
    const styles = await page.evaluate(() => MIRInspirationData.styles.map(style => style.id));
    for (const id of styles) {
      await page.locator('[data-inspiration-tab="' + id + '"]').click();
      await page.waitForFunction(() => [...document.querySelectorAll('#mir-inspiration-grid img')].every(image => image.complete && image.naturalWidth > 0 && image.dataset.inspirationState === 'ready'));
      report.styles.push(id);
    }
    await page.locator('[data-inspiration-tab="contemporain"]').click();
    await page.waitForFunction(() => [...document.querySelectorAll('#mir-inspiration-grid img')].every(image => image.complete && image.naturalWidth > 0 && image.dataset.inspirationState === 'ready'));
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: path.join(output, 'preview-inspiration-1440x900.png'), animations: 'disabled' });
    await page.locator('[data-inspiration-index="0"]').click();
    await page.waitForFunction(() => { const image = document.querySelector('#mir-inspiration-large'); return image.complete && image.naturalWidth > 0 && image.dataset.inspirationState === 'ready'; });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-inspiration-index="0"]').evaluate(el => el === document.activeElement), true);
    await page.locator('.mir-client-locale-switch button[lang="en-CA"]').click();
    await page.waitForFunction(() => document.documentElement.lang === 'en-CA');
    assert.match(await page.locator('h1').innerText(), /Your next inspiration/);
    report.guards = await page.evaluate(async () => {
      const cases = [() => fetch('https://example.invalid/mir-proof'), () => fetch('/outside-test'), () => fetch('./inspiration.html', { method: 'POST', body: 'blocked-test' })];
      return Promise.all(cases.map(async run => { try { await run(); return 'UNEXPECTED_TRANSPORT'; } catch (error) { return error.message; } }));
    });
    assert.deepEqual(report.guards, ['TEST_ENDPOINT_DENIED', 'PREVIEW_EXTERNAL_REQUEST_DISABLED', 'PREVIEW_EXTERNAL_REQUEST_DISABLED']);
    const sourceFiles = ['mir-inspiration.js', 'mir-inspiration-data.js', 'mir-inspiration.css'];
    report.sourceHashes = Object.fromEntries(sourceFiles.map(file => {
      const source = sha(fs.readFileSync(path.join(repo, 'dist', file)));
      assert.equal(sha(fs.readFileSync(path.join(build, 'test', file))), source);
      return [file, source];
    }));
    assert.deepEqual(report.externalRequests, []);
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.consoleErrors, []);
    report.passed = true;
    await context.close();
  } finally {
    fs.writeFileSync(path.join(output, 'preview-results.json'), JSON.stringify(report, null, 2) + '\n');
    await browser.close();
    await server.close();
  }
  console.log(JSON.stringify({ passed: report.passed, revision, styles: report.styles.length, output }));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
