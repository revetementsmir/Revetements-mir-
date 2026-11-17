'use strict';
/* Targeted acceptance of the actual desktop home page and its real a223
 * reference. No other route, form submission, backend write or deployment. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const { serve } = require('./helpers/mir-static-http.cjs');

const root = path.resolve(__dirname, '..');
const build = path.join(root, '.prestige-preview');
const referenceBuild = path.resolve(process.env.MIR_HOME_DESKTOP_BASELINE || 'missing-home-reference');
const referenceSHA = 'a2235c50466b0a21fecb7b1be8216dfd5006829c';
const source = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const out = path.join(root, 'docs/verification/home-desktop-locked-20261117');
const sizes = [{ width: 1440, height: 1200 }, { width: 1440, height: 900 }, { width: 1536, height: 1280 }, { width: 1920, height: 1080 }];
const locales = ['fr-CA', 'en-CA'];
const results = [], captures = [], observations = [], blocked = [], pixelComparisons = [];
const references = new Map();
const selectors = {
  header: '#mir-prestige-header', brand: '#mir-prestige-header>.mir-client-brand',
  actions: '#mir-prestige-header .mir-prestige-actions',
  hero: '.mir-prestige-home-hero', photo: '.mir-prestige-home-photo',
  heroImage: '.mir-prestige-home-photo img', copy: '.mir-prestige-home-copy',
  overline: '.mir-prestige-home-copy .mir-editorial-overline', title: '#hero-title',
  emphasis: '#hero-title em', lead: '.mir-prestige-home-lead', paths: '.mir-home-paths',
  homePath: '.mir-home-paths a:nth-child(1)', workPath: '.mir-home-paths a:nth-child(2)',
  discover: '.mir-home-discover', services: '#decouvrir',
  card1: '#decouvrir .mir-home-service:nth-child(1)', card2: '#decouvrir .mir-home-service:nth-child(2)', card3: '#decouvrir .mir-home-service:nth-child(3)',
  cardImage1: '#decouvrir .mir-home-service:nth-child(1) img', cardImage2: '#decouvrir .mir-home-service:nth-child(2) img', cardImage3: '#decouvrir .mir-home-service:nth-child(3) img',
  cardTitle1: '#decouvrir .mir-home-service:nth-child(1) strong', cardTitle2: '#decouvrir .mir-home-service:nth-child(2) strong', cardTitle3: '#decouvrir .mir-home-service:nth-child(3) strong'
};
fs.mkdirSync(path.join(out, 'screens'), { recursive: true });

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image => image.checkVisibility()).map(image => image.decode().catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function capture(page, name, detail = {}) {
  await settle(page);
  const evidence = [];
  for (const fullPage of [false, true]) {
    const file = 'screens/' + name + (fullPage ? '-full.png' : '-viewport.png');
    const ignoredBadgeRects = await page.locator('[data-mir-test-banner]').evaluateAll((nodes, fullPage) => nodes.filter(node => node.checkVisibility()).map(node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x + (fullPage ? scrollX : 0), y: rect.y + (fullPage ? scrollY : 0), width: rect.width, height: rect.height };
    }), fullPage);
    await page.screenshot({ path: path.join(out, file), fullPage, animations: 'disabled' });
    const item = { file, fullPage, ignoredBadgeRects, ...detail };
    captures.push(item); evidence.push(item);
  }
  return evidence;
}
async function check(name, fn) {
  const start = Date.now();
  try { const detail = await fn(); results.push({ name, passed: true, durationMs: Date.now() - start, ...detail }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, passed: false, durationMs: Date.now() - start, error: String(error.stack || error), details: error.details || null }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function pageFor(browser, server, size, locale, name, fn) {
  const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== server.base || !url.pathname.startsWith('/test/') || !['GET', 'HEAD'].includes(request.method())) {
      blocked.push({ name, host: url.host, path: url.pathname, method: request.method() }); return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(12000); page.on('pageerror', error => errors.push(String(error.stack || error)));
  try {
    const response = await page.goto(server.base + '/test/index.html', { waitUntil: 'load' });
    assert.equal(response?.ok(), true, 'the real guarded home page responds');
    await page.locator('#mir-prestige-header').waitFor();
    await page.waitForFunction(() => typeof window.MIRClientLocale?.getLocale === 'function');
    if (locale !== 'fr-CA') {
      const language = page.locator('button[data-mir-locale="' + locale + '"]');
      await language.waitFor({ state: 'attached' });
      if (!await language.isVisible()) await page.locator('#mir-client-menu-button').click();
      await language.click();
      await page.waitForFunction(locale => document.documentElement.lang === locale, locale);
      const menu = page.locator('#mir-client-menu-button');
      if (await menu.count() && await menu.getAttribute('aria-expanded') === 'true') await page.keyboard.press('Escape');
    }
    await settle(page);
    const detail = await fn(page);
    assert.deepEqual(errors, [], 'home page has no uncaught browser error');
    return detail;
  } catch (error) {
    try { await capture(page, name + '-failure', { viewport: page.viewportSize(), locale, failed: true }); } catch {}
    throw error;
  } finally { await context.close(); }
}
function comparePixels(referenceCaptures, currentCaptures, key) {
  return currentCaptures.map(currentCapture => {
    const referenceCapture = referenceCaptures.find(item => item.fullPage === currentCapture.fullPage);
    const before = PNG.sync.read(fs.readFileSync(path.join(out, referenceCapture.file)));
    const after = PNG.sync.read(fs.readFileSync(path.join(out, currentCapture.file)));
    const width = Math.max(before.width, after.width), height = Math.max(before.height, after.height);
    const diff = new PNG({ width, height });
    const masks = [...referenceCapture.ignoredBadgeRects, ...currentCapture.ignoredBadgeRects];
    let compared = 0, changed = 0, ignored = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const target = (y * width + x) * 4;
      const masked = masks.some(rect => x >= Math.floor(rect.x) && x < Math.ceil(rect.x + rect.width) && y >= Math.floor(rect.y) && y < Math.ceil(rect.y + rect.height));
      const inBefore = x < before.width && y < before.height, inAfter = x < after.width && y < after.height;
      const bi = (y * before.width + x) * 4, ai = (y * after.width + x) * 4;
      let different = !inBefore || !inAfter;
      if (!different) for (let channel = 0; channel < 4; channel++) if (Math.abs(before.data[bi + channel] - after.data[ai + channel]) > 2) different = true;
      if (masked) ignored++; else { compared++; if (different) changed++; }
      // Diagnostic derived only from the two actual screenshots. The original
      // viewport and full-page screenshots remain untouched.
      const grey = inAfter ? Math.round((after.data[ai] + after.data[ai + 1] + after.data[ai + 2]) / 3) : 230;
      diff.data[target] = !masked && different ? 255 : grey;
      diff.data[target + 1] = !masked && different ? 0 : grey;
      diff.data[target + 2] = !masked && different ? 60 : grey;
      diff.data[target + 3] = 255;
    }
    const file = 'screens/diff-' + key + (currentCapture.fullPage ? '-full.png' : '-viewport.png');
    fs.writeFileSync(path.join(out, file), PNG.sync.write(diff));
    const result = { key, fullPage: currentCapture.fullPage, reference: referenceCapture.file, candidate: currentCapture.file, diff: file, before: { width: before.width, height: before.height }, after: { width: after.width, height: after.height }, comparedPixels: compared, changedPixels: changed, changedRatio: compared ? changed / compared : 0, ignoredBadgePixels: ignored, channelTolerance: 2, viewportGateRatio: currentCapture.fullPage ? null : .001 };
    pixelComparisons.push(result); return result;
  });
}
async function snapshot(page, directory) {
  const value = await page.evaluate(selectors => {
    const normalize = text => text.replace(/\s+/g, ' ').trim();
    const visible = node => !!node && node.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }) && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
    const box = node => { const r = node.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; };
    const properties = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'display', 'gridTemplateColumns', 'padding', 'margin', 'gap', 'objectFit', 'objectPosition', 'opacity', 'filter', 'transform'];
    const elements = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => {
      const node = document.querySelector(selector); if (!node) return [key, null];
      const style = getComputedStyle(node);
      return [key, { visible: visible(node), rect: box(node), text: normalize(node.innerText || ''), style: Object.fromEntries(properties.map(key => [key, style[key]])) }];
    }));
    const rgba = value => { const numbers = value.match(/[\d.]+/g)?.map(Number) || []; return numbers.length >= 3 ? [...numbers.slice(0, 3), numbers[3] ?? 1] : [0, 0, 0, 0]; };
    const blend = (front, back) => [...front.slice(0, 3).map((v, i) => v * front[3] + back[i] * (1 - front[3])), 1];
    const background = node => {
      if (!node) return [255, 255, 255, 1];
      const color = rgba(getComputedStyle(node).backgroundColor);
      return color[3] >= 1 ? color : blend(color, background(node.parentElement));
    };
    const luminance = color => color.slice(0, 3).map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
    const title = document.querySelector('#hero-title'), walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT), runs = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!normalize(node.textContent)) continue;
      const parent = node.parentElement, style = getComputedStyle(parent), range = document.createRange(); range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
      let opacity = 1; for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) opacity *= Number(getComputedStyle(ancestor).opacity);
      const bg = background(parent), color = rgba(style.webkitTextFillColor || style.color); color[3] *= opacity;
      const fg = blend(color, bg), l1 = luminance(fg), l2 = luminance(bg), clippedBy = [];
      for (let ancestor = parent; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        const css = getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
        for (const r of rects) if ((/hidden|clip|auto|scroll/.test(css.overflowX) && (r.left < bounds.left - 1 || r.right > bounds.right + 1)) || (/hidden|clip|auto|scroll/.test(css.overflowY) && (r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1))) clippedBy.push(ancestor.id || ancestor.className);
      }
      runs.push({ text: normalize(node.textContent), visible: visible(parent), opacity, color: style.color, fill: style.webkitTextFillColor, background: bg, contrast: (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05), rects: rects.map(r => ({ x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height })), clippedBy });
    }
    return {
      viewport: { width: innerWidth, height: innerHeight }, locale: document.documentElement.lang,
      document: { width: document.scrollingElement.scrollWidth, height: document.scrollingElement.scrollHeight },
      pagedAttribute: document.body.hasAttribute('data-mir-client-pages'),
      visiblePagers: [...document.querySelectorAll('main .mir-client-pages-nav,main [data-mir-section-select],main [data-mir-list-pager]')].filter(visible).length,
      secondaryLinks: [...document.querySelectorAll('#mir-prestige-desktop-nav a')].filter(visible).map(node => normalize(node.textContent)),
      lowerNavigation: [...document.querySelectorAll('.mir-mobile-tabs')].filter(visible).length,
      compactMenuVisible: visible(document.querySelector('#mir-client-menu-button')),
      title: normalize(title.innerText), titleRuns: runs, elements,
      images: [...document.querySelectorAll('#mir-prestige-header .mir-client-brand img,.mir-prestige-home-photo img,#decouvrir .mir-home-service img')].map(node => ({ src: new URL(node.currentSrc || node.src).pathname, alt: node.alt, complete: node.complete, naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight })),
      cards: [...document.querySelectorAll('#decouvrir .mir-home-service')].map(node => ({ visible: visible(node), rect: box(node), href: new URL(node.href).pathname, text: normalize(node.innerText) }))
    };
  }, selectors);
  for (const image of value.images) {
    const file = path.resolve(directory, '.' + image.src);
    assert.ok(file.startsWith(directory + path.sep), 'image belongs to the real local build');
    image.sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  return value;
}
function compare(reference, current) {
  const issues = [], add = (condition, message) => { if (!condition) issues.push(message); };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const expected = current.locale === 'en-CA' ? 'Your project starts here.' : 'Votre projet commence ici.';
  add(reference.title === expected, 'real reference must contain the complete expected localized heading: ' + reference.title);
  add(current.title === expected, 'complete localized heading must be visible: ' + current.title);
  add(current.visiblePagers === 0, 'desktop home has no visible section/list pager');
  add(current.pagedAttribute === false, 'desktop home is outside the compact section-page layout');
  add(current.secondaryLinks.length === 0 && reference.secondaryLinks.length === 0, 'original header has no secondary links row');
  add(!current.compactMenuVisible, 'desktop reference has no compact Menu button');
  add(current.lowerNavigation === 0, 'home has no lower navigation bar');
  add(current.document.width <= current.viewport.width + 1, 'desktop home has no horizontal page overflow');
  add(current.cards.length === 3 && current.cards.every(card => card.visible), 'all three genuine service cards are displayed together');
  add(new Set(current.cards.map(card => Math.round(card.rect.y))).size === 1, 'the three cards occupy one desktop row');
  add(same(reference.images, current.images), 'original logo and four home image assets, alt text and intrinsic dimensions remain identical');
  for (const [key, before] of Object.entries(reference.elements)) {
    const after = current.elements[key];
    if (!before || !after) { issues.push('missing real page element: ' + key); continue; }
    add(before.visible && after.visible, key + ' is actually displayed');
    add(before.text === after.text, key + ' retains the reference text');
    for (const axis of ['x', 'y', 'width', 'height']) add(Math.abs(before.rect[axis] - after.rect[axis]) <= 1, key + '.' + axis + ': reference=' + before.rect[axis] + ', candidate=' + after.rect[axis]);
    for (const property of Object.keys(before.style)) add(before.style[property] === after.style[property], key + '.' + property + ': reference=' + before.style[property] + ', candidate=' + after.style[property]);
  }
  add(current.titleRuns.length >= 3, 'all heading text runs are present, including the non-italic words');
  for (const run of current.titleRuns) {
    add(run.visible && run.opacity >= .99 && run.rects.length > 0, 'heading text is painted: ' + run.text);
    add(run.contrast >= 3, 'large heading contrast is at least 3:1 for "' + run.text + '": ' + run.contrast.toFixed(2));
    add(run.clippedBy.length === 0, 'heading text is not clipped: ' + run.text);
  }
  return issues;
}
function requireIssues(issues, detail) {
  if (!issues.length) return;
  const error = new Error(issues.length + ' home-reference differences: ' + issues.join('; ')); error.details = detail; throw error;
}
async function reachCards(page) {
  await page.locator('.mir-home-discover').click(); await settle(page);
  assert.equal(new URL(page.url()).hash, '#decouvrir', 'original discover link retains native anchor navigation');
  const cards = page.locator('#decouvrir .mir-home-service');
  assert.equal(await cards.count(), 3);
  const reached = [];
  for (let i = 0; i < 3; i++) {
    await cards.nth(i).scrollIntoViewIfNeeded(); await settle(page);
    const state = await cards.nth(i).evaluate(node => {
      const rect = node.getBoundingClientRect(), hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return { visible: node.checkVisibility(), top: rect.top, bottom: rect.bottom, viewportHeight: innerHeight, hit: !!hit && (node.contains(hit) || hit.contains(node)), text: node.querySelector('strong').textContent };
    });
    assert.ok(state.visible && state.top >= -1 && state.bottom <= state.viewportHeight + 1 && state.hit, 'genuine service card is reachable through the authorized desktop scroll: ' + JSON.stringify(state));
    reached.push(state);
  }
  return reached;
}
async function main() {
  assert.ok(process.env.MIR_HOME_DESKTOP_BASELINE, 'an exact real reference build is required');
  const manifest = JSON.parse(fs.readFileSync(path.join(build, 'test/mir-test-environment.json'), 'utf8'));
  const referenceManifest = JSON.parse(fs.readFileSync(path.join(referenceBuild, 'test/mir-test-environment.json'), 'utf8'));
  assert.equal(manifest.revision, source); assert.equal(referenceManifest.revision, referenceSHA);
  const currentServer = await serve(build), referenceServer = await serve(referenceBuild);
  let browser;
  try {
    browser = await chromium.launch(process.env.MIR_CHROMIUM_BIN ? { executablePath: process.env.MIR_CHROMIUM_BIN } : {});
    for (const locale of locales) for (const size of sizes) {
      const key = locale + '-' + size.width + 'x' + size.height;
      await check('reference-' + key, () => pageFor(browser, referenceServer, size, locale, 'reference-' + key, async page => {
        const reference = await snapshot(page, referenceBuild);
        observations.push({ kind: 'reference', key, source: referenceSHA, snapshot: reference });
        const evidence = await capture(page, 'reference-' + key, { source: referenceSHA, locale, viewport: size });
        references.set(key, { snapshot: reference, captures: evidence });
        return { key, realReference: true };
      }));
      await check('desktop-' + key, () => pageFor(browser, currentServer, size, locale, 'desktop-' + key, async page => {
        const reference = references.get(key); assert.ok(reference, 'reference rendered successfully for this exact size/language');
        const current = await snapshot(page, build), issues = compare(reference.snapshot, current);
        observations.push({ kind: 'candidate', key, source, snapshot: current, issues });
        const evidence = await capture(page, 'candidate-' + key, { source, locale, viewport: size });
        const pixels = comparePixels(reference.captures, evidence, key);
        for (const metric of pixels) if (!metric.fullPage && metric.changedRatio > metric.viewportGateRatio) issues.push('viewport pixel difference exceeds 0.1% with only the real TEST badge ignored: ' + metric.changedRatio);
        const reached = await reachCards(page);
        requireIssues(issues, { key, issues });
        return { key, referenceSHA, reached, pixels, headingContrast: current.titleRuns.map(run => ({ text: run.text, contrast: run.contrast })) };
      }));
    }
    for (const locale of locales) await check('resize-mobile-desktop-mobile-' + locale, () => pageFor(browser, currentServer, { width: 390, height: 844 }, locale, 'resize-' + locale, async page => {
      const pager = page.locator('main select[data-mir-section-select]:visible');
      assert.equal(await pager.count(), 1, 'existing mobile section control remains singular');
      const options = await pager.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
      assert.ok(options.length >= 2); await pager.selectOption(options[1]); await settle(page);
      const selected = await pager.inputValue();
      await capture(page, 'resize-' + locale + '-mobile-before', { viewport: page.viewportSize(), locale, mobileComparisonOnly: true });
      await page.setViewportSize(sizes[0]); await settle(page); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await settle(page);
      const key = locale + '-1440x1200', current = await snapshot(page, build), issues = compare(references.get(key).snapshot, current);
      observations.push({ kind: 'resized-desktop', key, source, snapshot: current, issues });
      await capture(page, 'resize-' + locale + '-desktop', { viewport: page.viewportSize(), locale });
      await page.setViewportSize({ width: 390, height: 844 }); await settle(page);
      assert.equal(await pager.count(), 1, 'return to mobile restores one functioning section control');
      assert.equal(await pager.inputValue(), selected, 'mobile page choice survives the desktop round trip');
      assert.equal(await page.locator('body[data-mir-client-pages]').count(), 1, 'mobile compact module is restored');
      await pager.selectOption(options[0]); await settle(page);
      assert.equal(await page.locator('.mir-prestige-home-hero').isVisible(), true, 'mobile home can still be reached by its existing control');
      await capture(page, 'resize-' + locale + '-mobile-after', { viewport: page.viewportSize(), locale, mobileComparisonOnly: true });
      requireIssues(issues, { key, issues });
      return { locale, originalMobileChoice: selected, desktopReference: key, mobileRestored: true };
    }));
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ source, referenceSHA, manifest, referenceManifest, browser: browser?.version(), generatedAt: new Date().toISOString(), scope: 'desktop home only; mobile resize preservation', previewOnly: true, backendWrites: false, deployment: false, sizes, locales, passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length, results, observations, captures, pixelComparisons, blocked }, null, 2) + '\n');
    if (browser) await browser.close();
    await currentServer.close(); await referenceServer.close();
  }
  assert.equal(results.filter(result => !result.passed).length, 0, 'desktop home acceptance failed; inspect real before/after captures and complete comparison diagnostics');
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
