'use strict';
/* Real MIR frontend, local catalogue and browser storage. All non-local requests
 * are blocked before transfer. Account screenshots explicitly use the existing
 * SDK fixture; no account, email, estimate, payment or Google action is sent. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { serve } = require('./helpers/mir-static-http.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/verification/prestige-20261117');
const screenshots = path.join(out, 'screens');
const sizes = [{ width: 1440, height: 1200 }, { width: 390, height: 844 }, { width: 834, height: 1112 }];
const scenes = [
  ['accueil', 'index.html'], ['boutique', 'boutique.html'],
  ['produit', 'produit.html?id=hardieplank-select-625&color=hardie-pierre-des-champs'],
  ['panier', 'selection.html'], ['estimation', 'estimation.html'],
  ['pliages', 'pliage.html'], ['configurateur-pliage', 'production.html?mode=client&kind=profile'],
  ['studio-test', 'plan.html'], ['maison', 'maison.html'], ['chantiers', 'chantiers.html'],
  ['connexion', 'chantier.html?view=account&clientLocale=1'],
  ['demandes-deconnecte', 'chantier.html?view=orders&clientLocale=1'],
  ['aide', 'aide.html'], ['contact', 'contact.html'],
  ['realisations', 'realisations.html'], ['materiaux', 'materiaux.html']
];
const results = [], blocked = [], captures = [];
const filter = process.env.MIR_PRESTIGE_FILTER || '';
const accountSource = fs.readFileSync(path.join(__dirname, 'mir-client-account-en-browser.cjs'), 'utf8');
const accountMock = accountSource.match(/const mock=`([\s\S]*?)`;\nasync function setup/)[1];
const check = async (name, fn) => {
  if (filter && !name.includes(filter)) return;
  try { const detail = await fn(); results.push({ name, passed: true, ...(detail || {}) }); }
  catch (error) { results.push({ name, passed: false, error: String(error.message || error).slice(0, 2500) }); console.error('FAIL', name, error.message); }
};
async function context(browser, base, size, fixture = false) {
  const ctx = await browser.newContext({ viewport: size, hasTouch: size.width <= 834, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== base) { blocked.push({ host: url.host, method: req.method(), path: url.pathname }); return route.abort(); }
    if (!['GET', 'HEAD'].includes(req.method())) { blocked.push({ host: url.host, method: req.method(), path: url.pathname }); return route.abort(); }
    if (fixture) {
      if (url.pathname.endsWith('/vendor/supabase-client.js')) return route.fulfill({ contentType: 'application/javascript', body: accountMock });
      const file = path.resolve(root, 'dist', '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(path.join(root, 'dist') + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ path: file });
    }
    return route.continue();
  });
  return ctx;
}
async function ready(page) {
  await page.evaluate(() => document.fonts.ready);
  // Hidden overflow thumbnails and off-screen lazy cards must not prevent a
  // capture. Decode only images actually intersecting the visible viewport.
  const pending = await page.evaluate(async () => {
    const visible = [...document.images].filter(i => {
      const r = i.getBoundingClientRect(), s = getComputedStyle(i);
      return i.checkVisibility() && r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0 && s.visibility !== 'hidden';
    });
    await Promise.race([Promise.all(visible.map(i => i.decode().catch(() => {}))), new Promise(resolve => setTimeout(resolve, 2500))]);
    return visible.filter(i => !i.complete).map(i => ({ src: i.getAttribute('src'), loading: i.loading }));
  });
  return pending;
}
async function capture(page, name, metadata = {}) {
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo({ top: 0, behavior: 'instant' }); });
  const pendingImages = await ready(page);
  const file = name + '.png';
  await page.screenshot({ path: path.join(screenshots, file), animations: 'disabled' });
  const liveURL = new URL(page.url());
  const title = metadata.page || name;
  captures.push({ file: 'screens/' + file, ...metadata, title, page: liveURL.pathname.split('/').pop() + liveURL.search + liveURL.hash, pendingImages });
}
async function invariant(page, width, home = false) {
  assert.equal(await page.locator('body.mir-prestige').count(), 1, 'public presentation mounted');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'no horizontal overflow');
  const rail = page.locator('.mir-mobile-tabs');
  assert.equal(await rail.isVisible(), !home && width <= 1100, 'bottom navigation only on non-home phone/tablet');
  const header = page.locator('#mir-prestige-header');
  assert.equal(await header.isVisible(), true, 'common header visible');
  assert.equal(await header.locator('.mir-prestige-nav').isVisible(), !home && width > 1100, 'desktop labelled navigation');
  const avatar = await header.locator('.mir-public-account-avatar').boundingBox();
  const languages = await header.locator('.mir-client-locale-switch').boundingBox();
  assert.ok(avatar && languages && avatar.x >= languages.x + languages.width - 2, 'avatar after languages');
}
async function seedPiece(page) {
  const M = require('../dist/production-model.js');
  const spec = { kind: 'profile', template: 'l', unit: 'in', dimensions: { A: 3.5, B: 2.25 }, length: 120, quantity: 2, material: { type: 'aluminium' }, finish: { system: 'special', code: 'QA', name: 'Recette locale' }, coloredFace: { side: 'left', segmentId: 'A' } };
  const t = M.createTemplate(spec, { id: 'qa-prestige-model', name: 'Pièce de recette locale' });
  assert.equal(t.ok, true);
  const made = M.instantiateTemplate(t.template, { id: 'M001', unit: 'in', measurements: { A: 3.5, B: 2.25 }, length: 120, quantity: 2, material: spec.material, finish: spec.finish, coloredFace: spec.coloredFace });
  assert.equal(made.ok, true);
  const data = { version: 1, order: { id: 'qa-prestige', project: '', items: [{ id: 'M001', kind: 'profile', spec: made.spec, snapshot: made.snapshot, history: [] }] } };
  await page.evaluate(data => localStorage.setItem('mir_production_client_dossier_v1', JSON.stringify(data)), data);
  return data;
}
async function commerce(browser, base, size) {
  const ctx = await context(browser, base, size), page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  try {
    await page.goto(base + '/boutique.html');
    await page.locator('#shop-search').waitFor();
    await page.locator('#shop-search').fill('HardiePlank');
    const product = page.locator('[data-shop-card="hardieplank-select-625"]');
    await product.waitFor();
    await capture(page, 'recherche-' + size.width, { page: 'Recherche', width: size.width, language: 'fr-CA' });
    await product.locator('h3 a').click();
    await page.locator('#product-add').waitFor();
    await page.locator('#product-return').click();
    await product.waitFor();
    assert.equal(await page.locator('#shop-search').inputValue(), 'HardiePlank', 'search context retained');
    await page.locator('#shop-search').fill('');
    await page.locator('.category-card').filter({ hasText: 'Fibrociment' }).click();
    await product.waitFor();
    assert.equal(await page.locator('#shop-family').inputValue(), 'fibre', 'category is a real filter');
    await capture(page, 'categorie-' + size.width, { page: 'Catégorie Fibrociment', width: size.width, language: 'fr-CA' });
    await page.locator('#shop-filter-toggle').click();
    assert.equal(await page.locator('#shop-brand').isVisible(), true, 'filters available');
    await page.locator('#shop-filter-toggle').click();
    await product.locator('h3 a').click();
    await page.locator('#product-add').waitFor();
    await page.locator('[data-color="hardie-pierre-des-champs"]').click();
    await page.locator('#product-unit').selectOption('pièces');
    await page.locator('#product-quantity').fill('2');
    await page.locator('#product-add').click();
    await page.locator('#product-added').waitFor();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mir-shopping-list-v1')));
    assert.equal(stored.items[0].quantity, 2);
    assert.equal(stored.items[0].colorId, 'hardie-pierre-des-champs');
    await seedPiece(page);
    await page.goto(base + '/selection.html');
    await page.locator('[data-qty]').waitFor();
    assert.equal(await page.locator('[data-qty]').inputValue(), '2');
    assert.equal(await page.locator('[data-cart-color]').inputValue(), 'hardie-pierre-des-champs');
    assert.equal(await page.locator('[data-prestige-cart-count]').innerText(), '2', 'one material and one custom piece in common counter');
    await page.locator('[data-qty]').fill('3');
    await page.locator('[data-qty]').press('Tab');
    await page.reload();
    await page.locator('[data-qty]').waitFor();
    assert.equal(await page.locator('[data-qty]').inputValue(), '3', 'edited quantity retained after reload');
    await capture(page, 'panier-rempli-' + size.width, { page: 'Panier matériaux et pliage', width: size.width, language: 'fr-CA', data: 'local synthetic drawing + real catalogue' });
    await page.locator('#cart-estimate').click();
    await page.locator('#mir-estimate-dialog').waitFor();
    await page.waitForFunction(() => document.querySelector('#estimate-summary')?.textContent.includes('Pierre des champs'));
    assert.equal(await page.locator('#estimate-form [name="name"]').isVisible(), true);
    assert.equal(await page.locator('#estimate-form [name="email"]').isVisible(), true);
    assert.match(await page.locator('#estimate-send').innerText(), /Envoyer (la|ma) demande/);
    await page.locator('#estimate-form [name="name"]').fill('Recette locale MIR');
    await page.locator('#estimate-form [name="email"]').fill('recette@example.invalid');
    assert.equal(await page.locator('#estimate-form').evaluate(form => form.checkValidity()), false, 'incomplete form stays invalid');
    await capture(page, 'estimation-panier-' + size.width, { page: 'Demande depuis le panier — non envoyée', width: size.width, language: 'fr-CA' });
    await page.locator('#estimate-close').click();
    await page.goto(base + '/boutique.html');
    await page.locator('[data-prestige-cart-count]').waitFor();
    assert.equal(await page.locator('[data-prestige-cart-count]').innerText(), '2', 'cart count persists between pages');
    await page.locator('button[data-mir-locale="en-CA"]').click();
    await page.waitForFunction(() => document.documentElement.lang === 'en-CA');
    await page.goto(base + '/selection.html');
    await page.locator('[data-qty]').waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en-CA', 'English persists across pages');
    assert.equal(await page.locator('[data-qty]').inputValue(), '3');
    await capture(page, 'panier-rempli-en-' + size.width, { page: 'Cart', width: size.width, language: 'en-CA' });
    await invariant(page, size.width);
    return { quantity: 3, materialId: stored.items[0].materialId, colour: stored.items[0].colorName, estimateSubmitted: false, customPieceFixture: true };
  } finally { await ctx.close(); }
}
async function accounts(browser, base, size) {
  // Auth origin guard remains unchanged. Intercept the official origin before
  // any transfer, exactly as the existing account suite does.
  base = 'https://revetementsmir.github.io';
  const ctx = await context(browser, base, size, true), page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  try {
    await page.goto(base + '/chantier.html?view=account&clientLocale=1');
    await page.locator('#auth-email').waitFor();
    await page.locator('[data-auth-screen="signup"]').click();
    await page.locator('#auth-signup-form').waitFor();
    await capture(page, 'inscription-' + size.width, { page: 'Inscription — sans soumission', width: size.width, language: 'fr-CA', data: 'existing local SDK fixture' });
    await page.locator('[data-auth-screen="signin"]').click();
    await page.locator('#auth-email').fill('a@example.invalid');
    await page.locator('#auth-password').fill('valid-password-123');
    await page.locator('#auth-signin-form button[type="submit"]').click();
    await page.locator('.customer-account').waitFor();
    await capture(page, 'compte-simulation-' + size.width, { page: 'Compte client — simulation locale', width: size.width, language: 'fr-CA', data: 'existing local SDK fixture' });
    await invariant(page, size.width);
    await page.locator('.account-tabs [data-account-view="orders"]').click();
    await page.locator('.account-order').first().waitFor();
    await capture(page, 'suivi-simulation-' + size.width, { page: 'Suivi — simulation locale', width: size.width, language: 'fr-CA', data: 'existing local SDK fixture' });
    await page.locator('button[data-mir-locale="en-CA"]').click();
    await page.waitForFunction(() => document.documentElement.lang === 'en-CA');
    assert.match(await page.locator('.account-order').first().innerText(), /Draft/);
    await capture(page, 'suivi-en-simulation-' + size.width, { page: 'Requests — local simulation', width: size.width, language: 'en-CA', data: 'existing local SDK fixture' });
    return { simulatedSDK: true, realAccountCreated: false, emailSent: false };
  } finally { await ctx.close(); }
}
(async () => {
  fs.mkdirSync(screenshots, { recursive: true });
  const server = await serve(path.join(root, 'dist'));
  const browser = await chromium.launch({ executablePath: process.env.MIR_CHROMIUM_BIN || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const size of sizes) {
      const ctx = await context(browser, server.base, size), page = await ctx.newPage();
      page.setDefaultTimeout(12000);
      for (const [name, route] of scenes) await check(name + ' FR ' + size.width, async () => {
        const errors = [], onError = error => errors.push(error.message);
        page.on('pageerror', onError);
        try {
          const response = await page.goto(server.base + '/' + route, { waitUntil: 'domcontentloaded' });
          assert.equal(response.status(), 200, 'page exists');
          await page.locator('#mir-prestige-header').waitFor();
          if (name === 'boutique') await page.locator('#category-cards a').first().waitFor();
          if (name === 'produit') await page.locator('#product-add').waitFor();
          if (name === 'configurateur-pliage') await page.waitForFunction(() => !!window.MIRProductionWorkspace);
          await capture(page, name + '-' + size.width, { page: name, width: size.width, language: 'fr-CA' });
          await invariant(page, size.width, name === 'accueil');
          assert.equal(await page.locator('html').getAttribute('lang'), 'fr-CA', 'French default');
          assert.deepEqual(errors, [], 'no JavaScript error');
          if (name === 'aide') {
            assert.equal(await page.locator('#auth-email').count(), 0, 'help available without login');
            assert.match(await page.locator('main').innerText(), /estimation|panier|pliage/i, 'help contains useful public content');
          }
          return { route, width: size.width, overflow: false };
        } finally { page.off('pageerror', onError); }
      });
      await ctx.close();
      await check('Commerce réel local ' + size.width, () => commerce(browser, server.base, size));
      await check('Compte et suivi simulés ' + size.width, () => accounts(browser, server.base, size));
    }
    const english = await context(browser, server.base, sizes[0]), page = await english.newPage();
    page.setDefaultTimeout(10000);
    await page.goto(server.base + '/index.html');
    await page.evaluate(() => localStorage.setItem('mir-client-locale-v1', 'en-CA'));
    for (const [name, route] of scenes) await check(name + ' EN 1440', async () => {
      await page.goto(server.base + '/' + route, { waitUntil: 'domcontentloaded' });
      await page.locator('button[data-mir-locale="en-CA"]').click();
      await page.waitForFunction(() => document.documentElement.lang === 'en-CA');
      await capture(page, name + '-en-1440', { page: name, width: 1440, language: 'en-CA' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true);
      return { heading: await page.locator('h1').first().innerText().catch(() => ''), fullTranslationCertified: false };
    });
    await english.close();
    const internal = await context(browser, server.base, sizes[0]), internalPage = await internal.newPage();
    for (const route of ['chantier.html', 'entrepot.html', 'coordination.html', 'production.html', 'production.html?mode=client&source=store']) await check('Isolation ' + route, async () => {
      await internalPage.goto(server.base + '/' + route);
      assert.equal(await internalPage.locator('body.mir-prestige').count(), 0, 'no public visual class on internal interface');
    });
    await internal.close();
  } finally {
    const report = { browser: 'Chromium ' + browser.version(), date: new Date().toISOString(), localOnly: true, physicalDevices: false, externalRequestsBlocked: blocked.length, blockedRequests: blocked, results, captures };
    fs.writeFileSync(path.join(out, filter ? 'browser-results-followup.json' : 'browser-results.json'), JSON.stringify(report, null, 2));
    const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    if (!filter) fs.writeFileSync(path.join(out, 'captures.html'), '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MIR — captures réelles</title><style>body{margin:40px;background:#f4f1ea;color:#242522;font:16px Arial}h1{font-weight:400}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}figure{margin:0}img{width:100%;border:1px solid #d9d5cc}figcaption{padding:12px 0}a{color:inherit}</style><h1>MIR · Captures de la refonte TEST</h1><p>Rendus Chromium réels. Comptes et suivi marqués « simulation » utilisent uniquement une fixture locale. Aucune demande envoyée.</p><div class="grid">' + captures.map(c => '<figure><a href="' + esc(c.file) + '"><img loading="lazy" src="' + esc(c.file) + '" alt="' + esc(c.title) + '"></a><figcaption>' + esc(c.title) + ' · ' + c.width + ' px · ' + esc(c.language) + '</figcaption></figure>').join('') + '</div></html>');
    await browser.close(); await server.close();
  }
  const failures = results.filter(r => !r.passed);
  console.log(JSON.stringify({ passed: results.length - failures.length, total: results.length, captures: captures.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
