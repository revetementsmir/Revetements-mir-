'use strict';
/* Browser acceptance of the actual /test build. No service mutation, account
 * sign-in, form delivery, production route or deployment is permitted here.
 * Geometry uses MIR's real model; only the oblique template and long cart are
 * local test fixtures. Run in the authorized GitHub Actions browser runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { serve } = require('./helpers/mir-static-http.cjs');
const M = require('../dist/production-model.js');

const root = path.resolve(__dirname, '..');
const build = path.join(root, '.prestige-preview');
const out = path.join(root, 'docs/verification/client-parcours-test-20261117');
const screens = path.join(out, 'screens');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sizes = [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 834, height: 1112 }, { width: 1440, height: 900 }];
const scenes = [
  ['accueil', 'index.html'], ['boutique', 'boutique.html', true],
  ['produit', 'produit.html?id=hardieplank-select-625&color=hardie-pierre-des-champs'],
  ['panier', 'selection.html'], ['estimation', 'estimation.html'],
  ['pliages', 'pliage.html'], ['configurateur', 'production.html?mode=client&kind=profile'],
  ['studio-test', 'plan.html'], ['maison', 'maison.html'], ['chantiers', 'chantiers.html'],
  ['connexion', 'chantier.html?view=account&clientLocale=1'],
  ['demandes', 'chantier.html?view=orders&clientLocale=1'],
  ['aide', 'aide.html'], ['contact', 'contact.html'],
  ['realisations', 'realisations.html', true], ['materiaux', 'materiaux.html']
];
const results = [], captures = [], blocked = [], layoutDiagnostics = [];
const filter = process.env.MIR_CLIENT_PARCOURS_FILTER || '';
const modelSelector = '#client-saved-options [data-saved-template], #client-standard-options [data-client-profile]';
const slug = value => value.replace(/[^a-z0-9-]/gi, '-');
fs.mkdirSync(screens, { recursive: true });

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function capture(page, name, detail = {}) {
  await settle(page);
  const pendingImages = await page.evaluate(async () => {
    const images = [...document.images].filter(image => {
      const rect = image.getBoundingClientRect();
      return image.checkVisibility() && rect.top < innerHeight && rect.bottom > 0 && rect.left < innerWidth && rect.right > 0;
    });
    await Promise.race([Promise.all(images.map(image => image.decode().catch(() => {}))), new Promise(resolve => setTimeout(resolve, 1500))]);
    return images.filter(image => !image.complete).map(image => image.getAttribute('src'));
  });
  const file = 'screens/' + slug(name) + '.png';
  await page.screenshot({ path: path.join(out, file), animations: 'disabled' });
  const url = new URL(page.url());
  captures.push({ file, page: url.pathname + url.search + url.hash, pendingImages, ...detail });
}
async function check(name, fn) {
  if (filter && !name.includes(filter)) return;
  const start = Date.now();
  try {
    const detail = await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start, ...detail });
    console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, passed: false, durationMs: Date.now() - start, error: String(error.stack || error).slice(0, 6000) });
    console.error('FAIL ' + name + ': ' + error.message);
  }
}
async function withPage(browser, base, size, name, fn) {
  const context = await browser.newContext({ viewport: size, hasTouch: size.width <= 834, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base || !url.pathname.startsWith('/test/') || !['GET', 'HEAD'].includes(request.method())) {
      blocked.push({ case: name, host: url.host, path: url.pathname, method: request.method() });
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(String(error.stack || error)));
  try {
    const value = await fn(page, context);
    assert.deepEqual(errors, [], 'no uncaught browser error');
    return value;
  } catch (error) {
    try { await capture(page, name + '-failure', { failed: true, viewport: size, errors }); } catch {}
    throw error;
  } finally { await context.close(); }
}
async function goto(page, base, route) {
  const response = await page.goto(base + '/test/' + route, { waitUntil: 'load' });
  assert.equal(response?.ok(), true, 'real generated TEST page responds');
  await page.locator('#mir-prestige-header').waitFor();
  if (route.startsWith('production.html')) await page.waitForFunction(() => !!window.MIRProductionWorkspace);
  await settle(page);
}

async function horizontalListingAccess(page, scope) {
  const result = await page.evaluate(async scope => {
    // Only the two expressly scrollable listings may use horizontal rails.
    if (!['boutique.html', 'realisations.html'].includes(location.pathname.split('/').pop())) return { rails: [], problems: [] };
    const host = document.querySelector(scope), originalWindow = { left: scrollX, top: scrollY };
    const rails = [...host.querySelectorAll('*')].filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 3 && rect.height > 3 && element.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }) && /auto|scroll/.test(getComputedStyle(element).overflowX) && element.scrollWidth > element.clientWidth + 2;
    });
    const positions = rails.map(rail => ({ rail, left: rail.scrollLeft, top: rail.scrollTop }));
    const observed = [], problems = [];
    try {
      for (const rail of rails) {
        const controls = [...rail.querySelectorAll('a[href],button,summary,[role=button]')].filter(element => element.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }));
        const reached = [];
        for (const element of controls) {
          const initialScroll = rail.scrollLeft;
          element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const rect = element.getBoundingClientRect(), bounds = rail.getBoundingClientRect();
          const label = (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 90);
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          const visible = rect.left >= Math.max(0, bounds.left) - 2 && rect.right <= Math.min(innerWidth, bounds.right) + 2 && rect.top >= -2 && rect.bottom <= innerHeight + 2;
          const accessible = !!hit && (element.contains(hit) || hit.contains(element));
          if (!visible || !accessible) problems.push({ element: label, reason: visible ? 'rail control remains covered after scrolling' : 'rail control cannot fit after scrolling', rect: rect.toJSON(), rail: bounds.toJSON() });
          reached.push({ label, scrollBefore: initialScroll, scrollAfter: rail.scrollLeft, visible, accessible });
        }
        observed.push({ rail: rail.id || rail.className, width: rail.clientWidth, scrollWidth: rail.scrollWidth, reached });
      }
    } finally {
      for (const position of positions) position.rail.scrollTo({ left: position.left, top: position.top, behavior: 'instant' });
      window.scrollTo({ ...originalWindow, behavior: 'instant' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    return { rails: observed, problems };
  }, scope);
  assert.deepEqual(result.problems, [], 'every horizontal listing control is reachable by actual scrolling: ' + JSON.stringify(result));
  return result.rails;
}

// Read actual rectangles, clipping ancestors and hit targets. An overflow:hidden
// declaration alone can never make a cut-off page pass this assertion.
async function layout(page, { scrolling = false, scope = 'body', menuOpen = false } = {}) {
  await settle(page);
  const horizontalRails = scrolling ? await horizontalListingAccess(page, scope) : [];
  const value = await page.evaluate(({ scrolling, scope, menuOpen }) => {
    const shown = element => {
      const rect = element.getBoundingClientRect();
      // These are deliberate nonvisual controls, confirmed in the first CI
      // capture. A focused skip link remains subject to every layout check.
      if (element.matches('a.skip[href^="#"],a.skip-link[href^="#"],a.portal-skip[href^="#"]') && element !== document.activeElement && rect.bottom <= 0 && document.getElementById(element.hash.slice(1))) return false;
      if (element.closest('.estimate-honeypot[aria-hidden="true"]') && element.matches('input[name="website"][tabindex="-1"]')) return false;
      if (rect.width < 3 || rect.height < 3 || !element.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) return false;
      const style = getComputedStyle(element);
      return !['hidden', 'collapse'].includes(style.visibility) && style.clip !== 'rect(0px, 0px, 0px, 0px)' && style.clipPath !== 'inset(50%)';
    };
    const name = element => (element.id ? '#' + element.id : element.tagName.toLowerCase() + (element.className && typeof element.className === 'string' ? '.' + element.className.trim().replace(/\s+/g, '.') : '')) + ' ' + (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 75);
    const interactive = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button]';
    const host = document.querySelector(scope);
    const elements = [...host.querySelectorAll(interactive + ',h1,h2,h3,p,legend,output,[role=alert],[role=status]')].filter(shown);
    const problems = [], root = document.scrollingElement;
    const badge = document.querySelector('[data-mir-test-banner]')?.getBoundingClientRect();
    const isScrollableListing = scrolling && ['boutique.html', 'realisations.html'].includes(location.pathname.split('/').pop());
    const inVerifiedHorizontalRail = element => {
      if (!isScrollableListing) return false;
      for (let parent = element.parentElement; parent && parent !== host; parent = parent.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth + 2) return true;
      }
      return false;
    };
    for (const element of elements) {
      if (element.closest('svg') || element.matches('[data-mir-test-banner]')) continue;
      const rect = element.getBoundingClientRect();
      const control = element.matches(interactive);
      if ((rect.left < -2 || rect.right > innerWidth + 2) && !inVerifiedHorizontalRail(element)) problems.push({ element: name(element), reason: 'horizontal', rect: rect.toJSON() });
      if (!scrolling && (rect.top < -2 || rect.bottom > innerHeight + 2)) problems.push({ element: name(element), reason: 'outside viewport', rect: rect.toJSON() });
      if (!scrolling) for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const css = getComputedStyle(parent), box = parent.getBoundingClientRect();
        const clipY = /hidden|clip|auto|scroll/.test(css.overflowY), clipX = /hidden|clip|auto|scroll/.test(css.overflowX);
        if ((clipY && (rect.top < box.top - 2 || rect.bottom > box.bottom + 2)) || (clipX && (rect.left < box.left - 2 || rect.right > box.right + 2))) {
          problems.push({ element: name(element), reason: 'clipped by ' + name(parent), rect: rect.toJSON(), parent: box.toJSON() }); break;
        }
      }
      if (!scrolling && control && !element.disabled && rect.top >= 0 && rect.bottom <= innerHeight) {
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        if (hit && !element.contains(hit) && !hit.contains(element)) problems.push({ element: name(element), reason: 'covered by ' + name(hit) });
        if (badge && rect.left < badge.right && rect.right > badge.left && rect.top < badge.bottom && rect.bottom > badge.top) problems.push({ element: name(element), reason: 'TEST badge overlaps action' });
      }
    }
    const innerScroll = !scrolling ? [...host.querySelectorAll('*')].filter(shown).filter(element => {
      if (element.matches('input,textarea,select,option')) return false;
      const style = getComputedStyle(element);
      return /auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 2;
    }).map(name) : [];
    const bottomNavigation = [...document.querySelectorAll('nav,[role=navigation],.mir-mobile-tabs')].filter(shown).filter(element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      const intersects = rect.top < innerHeight && rect.bottom > 0 && rect.left < innerWidth && rect.right > 0;
      const bottomAnchored = style.bottom !== 'auto';
      const lowerFixed = style.position === 'fixed' && (bottomAnchored || rect.bottom >= innerHeight - 45);
      const lowerSticky = style.position === 'sticky' && bottomAnchored && style.top === 'auto';
      return intersects && rect.top > innerHeight * .55 && (lowerFixed || lowerSticky);
    }).map(name);
    const containers = [...document.querySelectorAll('#mir-prestige-header,#mir-prestige-header>.mir-client-brand,#mir-prestige-header .mir-prestige-actions,#mir-prestige-desktop-nav,.mir-client-locale-switch,main,footer.mir-signature-footer,.config-card,#client-step-scroll,#client-step-actions')].map(element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      return {
        element: name(element), rect: rect.toJSON(), display: style.display,
        width: style.width, height: style.height, minHeight: style.minHeight, maxHeight: style.maxHeight,
        padding: { top: style.paddingTop, right: style.paddingRight, bottom: style.paddingBottom, left: style.paddingLeft },
        margin: { top: style.marginTop, right: style.marginRight, bottom: style.marginBottom, left: style.marginLeft },
        gap: style.gap, gridTemplateColumns: style.gridTemplateColumns,
        position: style.position, top: style.top, bottom: style.bottom,
        overflowX: style.overflowX, overflowY: style.overflowY,
        clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
        scrollTop: element.scrollTop, scrollLeft: element.scrollLeft
      };
    });
    const selectedSections = [...document.querySelectorAll('select[data-mir-section-select]')].filter(shown).map(select => ({
      id: select.id, value: select.value, label: select.selectedOptions[0]?.textContent,
      options: [...select.options].map(option => ({ value: option.value, label: option.textContent })),
      dialog: select.closest('dialog')?.id || null
    }));
    let module = null;
    try { module = window.MIRClientPages?.inspect?.() || null; } catch (error) { module = { diagnosticError: String(error.message || error) }; }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: root.scrollWidth, height: root.scrollHeight, clientHeight: root.clientHeight, scrollX, scrollY },
      problems: problems.slice(0, 25), innerScroll, bottomNavigation, menuOpen,
      diagnostic: { route: location.pathname + location.search + location.hash, scope, entry: document.body.dataset.clientEntry, stage: document.body.dataset.clientStage, selectedSections, module, containers }
    };
  }, { scrolling, scope, menuOpen });
  // Preserve the complete container diagnosis even when the readable assertion
  // message is shortened. This reads layout only and changes no acceptance rule.
  layoutDiagnostics.push({ ...value, horizontalRails });
  assert.ok(value.document.width <= value.viewport.width + 2, 'no horizontal document overflow: ' + JSON.stringify(value));
  assert.deepEqual(value.bottomNavigation, [], 'no lower navigation bar');
  if (!scrolling) assert.ok(value.document.height <= value.document.clientHeight + 2, 'non-list page fits one screen: ' + JSON.stringify(value));
  assert.deepEqual(value.innerScroll, [], 'non-list sections do not conceal an inner scrollbar');
  assert.deepEqual(value.problems, [], 'content and actions remain visible: ' + JSON.stringify(value));
  return { ...value, horizontalRails };
}

async function header(page, size, name) {
  assert.equal(await page.locator('.mir-mobile-tabs:visible').count(), 0, 'bottom bar absent');
  assert.equal(await page.locator('footer.mir-signature-footer nav:visible').count(), 0, 'footer is logo and phrase only');
  const footerPositions = await page.locator('footer.mir-signature-footer:visible').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).position));
  assert.ok(footerPositions.every(position => !['fixed', 'sticky'].includes(position)), 'signature is not a fixed lower bar');
  const menu = page.locator('#mir-client-menu-button'), nav = page.locator('#mir-prestige-desktop-nav');
  assert.equal(await menu.isVisible(), size.width <= 1100, 'explicit compact menu at the actual breakpoint');
  if (size.width <= 1100) {
    assert.equal(await menu.getAttribute('aria-controls'), 'mir-prestige-desktop-nav');
    assert.equal(await nav.isVisible(), false);
    await menu.click();
    assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    assert.equal(await nav.isVisible(), true);
    await layout(page, { scope: '#mir-prestige-header', scrolling: true, menuOpen: true });
    const bottom = await nav.evaluate(node => node.getBoundingClientRect().bottom);
    assert.ok(bottom <= size.height + 2, 'all menu links fit the open menu');
    if (name === 'accueil') await capture(page, 'menu-' + size.width, { viewport: size });
    await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    assert.equal(await menu.evaluate(node => node === document.activeElement), true, 'Escape restores menu focus');
  } else assert.equal(await nav.isVisible(), true, 'desktop has visible labelled links');
  const links = await nav.locator('a').evaluateAll(nodes => nodes.map(node => ({ href: node.href, text: node.textContent })));
  assert.ok(links.length >= 6, 'main destinations remain available');
  for (const link of links) assert.ok(new URL(link.href).pathname.startsWith('/test/'), 'navigation stays in TEST: ' + link.text);
}

async function inspectSections(page, name, size) {
  const select = page.locator('select[data-mir-section-select]:visible').first();
  if (!await select.count()) return [];
  const sections = await select.locator('option').evaluateAll(nodes => nodes.filter(node => !node.disabled).map(node => ({ value: node.value, text: node.textContent })));
  const visited = [];
  for (const section of sections) {
    await select.selectOption(section.value);
    await settle(page);
    assert.equal(await select.inputValue(), section.value, 'section stays selected');
    await layout(page);
    visited.push(section.text);
    if (size.width === 320) await capture(page, name + '-section-' + section.value + '-' + size.width, { viewport: size, section: section.text });
    // Dynamic lists retain every row via explicit pagination, not scrolling.
    const pagers = page.locator('[data-mir-list-pager]:visible');
    for (let i = 0; i < await pagers.count(); i++) {
      const pager = pagers.nth(i), next = pager.locator('[data-mir-list-next]');
      let turns = 0;
      while (await next.isEnabled()) {
        assert.ok(++turns <= 100, 'list pagination terminates');
        const before = await pager.textContent();
        await next.click(); await settle(page); await layout(page);
        assert.notEqual(await pager.textContent(), before, 'pagination advances');
      }
    }
  }
  if (sections.length) await select.selectOption(sections[0].value);
  return visited;
}

async function showTarget(page, selector) {
  const target = page.locator(selector).first();
  const select = page.locator('select[data-mir-section-select]:visible').first();
  const values = await select.count() ? await select.locator('option').evaluateAll(nodes => nodes.map(node => node.value)) : [];
  for (const value of [null, ...values]) {
    if (value !== null) await select.selectOption(value);
    await settle(page);
    if (await target.isVisible()) return target;
    const pagers = page.locator('[data-mir-list-pager]:visible');
    for (let i = 0; i < await pagers.count(); i++) {
      const pager = pagers.nth(i), previous = pager.locator('[data-mir-list-prev]'), next = pager.locator('[data-mir-list-next]');
      for (let turn = 0; turn < 100 && await previous.isEnabled(); turn++) { await previous.click(); await settle(page); }
      for (let turn = 0; turn < 100; turn++) {
        if (await target.isVisible()) return target;
        if (!await next.isEnabled()) break;
        await next.click(); await settle(page);
      }
    }
  }
  assert.fail('The real page controls cannot reveal ' + selector);
}

async function openModels(page) {
  if (await page.locator('body').getAttribute('data-client-stage') !== '1') await page.locator('#client-step-back').click();
  if (await page.locator('body').getAttribute('data-client-entry') === 'draw') await page.locator('#client-entry-back').click();
  if (await page.locator('body').getAttribute('data-client-entry') === 'choice') await page.locator('#client-choose-model').click();
  await page.waitForFunction(() => document.body.dataset.clientEntry === 'models');
  await settle(page);
}
async function selectProfile(page, selector) {
  const pager = page.locator('.client-viewport-pages[aria-label="Pages de modèles"]');
  const previous = pager.locator('button').first(), next = pager.locator('button').last();
  for (let i = 0; i < 30 && await previous.isEnabled(); i++) { await previous.click(); await settle(page); }
  for (let i = 0; i < 30 && !await page.locator(selector).isVisible(); i++) {
    assert.equal(await next.isEnabled(), true, 'requested model is reachable by pages');
    await next.click(); await settle(page);
  }
  await page.locator(selector).click();
  await page.waitForFunction(() => document.body.dataset.clientStage === '2');
  await settle(page);
}
async function modelPages(page, size) {
  await openModels(page);
  const all = await page.locator(modelSelector).evaluateAll(nodes => nodes.map(node => node.dataset.savedTemplate || node.dataset.clientProfile));
  assert.ok(all.length >= 6, 'real catalogue supplies at least six choices');
  const seen = new Set(), pager = page.locator('.client-viewport-pages[aria-label="Pages de modèles"]');
  const next = pager.locator('button').last();
  let pages = 0;
  do {
    const visible = await page.locator(modelSelector).evaluateAll(nodes => nodes.filter(node => node.checkVisibility()).map(node => ({ id: node.dataset.savedTemplate || node.dataset.clientProfile, rect: node.getBoundingClientRect().toJSON() })));
    assert.equal(visible.length, 6, 'six real profiles on every page');
    const columns = new Set(visible.map(item => Math.round(item.rect.x)));
    const rows = new Set(visible.map(item => Math.round(item.rect.y)));
    assert.equal(columns.size, size.width <= 600 ? 2 : 3, 'responsive profile columns');
    assert.equal(rows.size, size.width <= 600 ? 3 : 2, 'responsive profile rows');
    visible.forEach(item => seen.add(item.id));
    await layout(page);
    await capture(page, 'profils-' + size.width + '-page-' + (++pages), { viewport: size, profiles: visible.map(item => item.id) });
    assert.ok(pages <= 30, 'profile pages terminate');
    if (!await next.isEnabled()) break;
    await next.click(); await settle(page);
  } while (true);
  assert.deepEqual([...seen].sort(), [...new Set(all)].sort(), 'every catalogue profile remains reachable');
  const lastPage = await pager.locator('span').textContent();
  const choice = page.locator('#client-model-options [data-client-profile]:visible').last();
  const selectedId = await choice.getAttribute('data-client-profile');
  await choice.click();
  await page.waitForFunction(() => document.body.dataset.clientStage === '2');
  await openModels(page);
  assert.equal(await pager.locator('span').textContent(), lastPage, 'return keeps the selected profile page');
  assert.equal(await page.locator('[data-client-profile="' + selectedId + '"]').isVisible(), true, 'chosen profile remains visible after return');
  return { profiles: all.length, pages };
}

async function fillFinish(page) {
  await page.locator('#material-type').selectOption('aluminium');
  const brand = page.locator('#production-material');
  await brand.waitFor();
  const value = await brand.locator('option').evaluateAll(nodes => nodes.find(node => node.value && !node.disabled)?.value);
  assert.ok(value, 'real aluminium product available');
  await brand.selectOption(value);
  const color = page.locator('#production-client-color');
  await color.waitFor();
  const selected = await color.locator('option').evaluateAll(nodes => nodes.find(node => node.value && !node.disabled)?.value);
  assert.ok(selected, 'real manufacturer colour available');
  await color.selectOption(selected);
  await page.locator('[data-client-face="left"]').click();
  return { product: value, color: selected };
}
async function folding(page, base, size) {
  await goto(page, base, 'production.html?mode=client&kind=profile');
  const pages = await modelPages(page, size);
  await selectProfile(page, '[data-client-profile="l"]');
  const sides = () => page.locator('#production-dimensions .client-measure-field input');
  assert.equal(await sides().count(), 2);
  assert.equal(await sides().nth(0).inputValue(), '', 'new piece has no invented dimension');
  assert.equal(await page.locator('#client-step-next').isDisabled(), true, 'missing measurements block continuation');
  await sides().nth(0).fill('3½');
  await sides().nth(1).fill('2¼');
  const model = await page.evaluate(() => window.MIRProductionWorkspace.getLivePreviewState().model);
  assert.ok(Math.abs(model.segments[0].lengthMM - 88.9) < 1e-8, '3½ inches use the real model');
  assert.ok(Math.abs(model.segments[1].lengthMM - 57.15) < 1e-8, '2¼ inches use the real model');
  const angle = page.locator('[data-client-bend-angle="0"]');
  assert.equal(await angle.inputValue(), '90', 'standard L original angle');
  await angle.fill('135'); await angle.press('Tab');
  await page.locator('#client-step-back').click();
  await openModels(page); await selectProfile(page, '[data-client-profile="l"]');
  assert.equal(await sides().nth(0).inputValue(), '3½', 'measurements survive profile return');
  assert.equal(await angle.inputValue(), '135', 'angle survives profile return');
  await page.locator('#client-reset-model-angles').click();
  assert.equal(await angle.inputValue(), '90', 'reset restores the source model angle');
  await angle.fill('135'); await angle.press('Tab');
  await layout(page); await capture(page, 'mesures-L-' + size.width, { viewport: size });
  await page.locator('#client-step-next').click();
  await page.waitForFunction(() => document.body.dataset.clientStage === '3');
  assert.equal(await page.locator('#client-step-next').isDisabled(), true, 'finish must be selected');
  const finish = await fillFinish(page);
  await layout(page); await capture(page, 'finition-' + size.width, { viewport: size });
  await page.locator('#client-step-next').click();
  await page.waitForFunction(() => document.body.dataset.clientStage === '4');
  assert.equal(await page.locator('#production-quantity').inputValue(), '', 'quantity is explicitly requested');
  assert.equal(await page.locator('#client-step-next').isDisabled(), true);
  await page.locator('#production-quantity').fill('2');
  await page.locator('#production-quantity').press('Tab');
  assert.match(await page.locator('#client-piece-recap').textContent(), /135/);
  await layout(page); await capture(page, 'recapitulatif-' + size.width, { viewport: size });
  await page.locator('#client-step-back').click();
  assert.equal(await page.locator('#production-client-color').inputValue(), finish.color, 'finish survives back navigation');
  await page.locator('#client-step-next').click();
  assert.equal(await page.locator('#production-quantity').inputValue(), '2', 'quantity survives back navigation');
  await page.locator('#client-step-next').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('mir_production_client_dossier_v1') || '{}').order?.items?.length === 1);
  const stored = await page.evaluate(() => ({ dossier: JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')), cart: window.MIRUnifiedOrderCart.list() }));
  const item = stored.dossier.order.items[0];
  assert.equal(item.spec.quantity, 2);
  assert.equal(item.snapshot.schema, 'mir-production-instance-1');
  const built = M.buildProfile(item.spec);
  assert.ok(Math.abs(180 - Math.abs(built.bends[0].turnDeg) - 135) < 1e-8, 'saved real geometry keeps modified angle');
  assert.deepEqual(item.snapshot.spec.bends, item.spec.bends, 'instance snapshot carries the same bend');
  assert.equal(stored.cart.filter(line => line.kind === 'fold').length, 1, 'real unified cart receives the piece');
  assert.deepEqual(stored.cart.find(line => line.kind === 'fold').snapshot, item.snapshot);
  await goto(page, base, 'selection.html');
  const sections = await inspectSections(page, 'panier-pliage', size);
  await layout(page); await capture(page, 'panier-pliage-' + size.width, { viewport: size });
  assert.equal(await page.locator('[data-prestige-cart-count]').first().textContent(), '1');
  return { ...pages, finish, quantity: 2, savedAngle: 135, sections, backendMutation: false };
}

function obliqueFixture() {
  const spec = { kind: 'profile', template: 'custom', unit: 'in', segments: [{ label: 'A', length: 3.5 }, { label: 'B', length: 2.25 }], bends: [{ mode: 'signed', angle: -30, direction: 'right' }], startAngle: 0, length: 120, quantity: 2, material: { type: 'aluminium' }, finish: { system: 'special', code: 'QA', name: 'Recette locale' }, coloredFace: { side: 'left', segmentId: 'A' } };
  const made = M.createTemplate(spec, { id: 'qa-client-parcours-oblique', name: 'Recette locale — angle 150°' });
  assert.equal(made.ok, true);
  return { id: made.template.id, name: made.template.name, currentVersion: 1, versions: [made.template], channels: { client: true, store: false, po: true }, archived: false, allowed: { materials: ['aluminium', 'acier'], colorSystems: ['manufacturer', 'special'] } };
}
async function oblique(page, base, size) {
  const record = obliqueFixture();
  await goto(page, base, 'production.html?mode=client&kind=profile');
  await page.evaluate(record => localStorage.setItem('mir_production_templates_v1', JSON.stringify({ version: 1, records: [record] })), record);
  await page.reload(); await page.waitForFunction(() => !!window.MIRProductionWorkspace);
  await openModels(page); await selectProfile(page, '[data-saved-template="' + record.id + '"]');
  const before = await page.evaluate(id => JSON.parse(localStorage.getItem('mir_production_templates_v1')).records.find(record => record.id === id), record.id);
  const angle = page.locator('[data-client-bend-angle="0"]');
  assert.equal(await angle.inputValue(), '150', 'source oblique angle is not normalized to 90');
  const sides = page.locator('#production-dimensions .client-measure-field input');
  await sides.nth(0).fill('3½'); await sides.nth(1).fill('2¼');
  await angle.fill('120'); await angle.press('Tab');
  await page.locator('#client-reset-model-angles').click();
  assert.equal(await angle.inputValue(), '150', 'reset restores original oblique angle');
  await angle.fill('120'); await angle.press('Tab');
  await layout(page); await capture(page, 'angle-oblique-' + size.width, { viewport: size, fixture: 'local template, source interior angle 150' });
  const after = await page.evaluate(id => JSON.parse(localStorage.getItem('mir_production_templates_v1')).records.find(record => record.id === id), record.id);
  assert.deepEqual(after, before, 'changing this piece never changes its shared template record');
  return { sourceAngle: 150, resetAngle: 150, modifiedAngle: 120, modelRecordUnchanged: true, localFixture: true };
}

async function allProfileMeasures(page, base, size) {
  await goto(page, base, 'production.html?mode=client&kind=profile'); await openModels(page);
  const profiles = await page.locator('[data-client-profile]').evaluateAll(nodes => nodes.map(node => node.dataset.clientProfile));
  const visited = [];
  let checkedHem = false;
  for (const id of profiles) {
    await selectProfile(page, '[data-client-profile="' + id + '"]');
    const fields = page.locator('#production-dimensions .client-measure-field input');
    const all = await fields.count();
    assert.ok(all >= 2, 'real profile dimensions exist: ' + id);
    assert.equal(await page.locator('#production-dimensions .client-measure-field input:visible').count(), all, 'all side fields are visible: ' + id);
    assert.equal(await page.locator('[data-client-bend-angle]:visible').count(), all - 1, 'all original bends are visible: ' + id);
    const hems = page.locator('[data-client-bend-angle][readonly]');
    if (await hems.count()) {
      assert.ok((await hems.evaluateAll(nodes => nodes.map(node => node.value))).every(value => value === '180'), 'original hems remain 180 degrees: ' + id);
      assert.equal(await page.locator('#client-hem-options').isVisible(), true, 'opening a hem is a separate explicit action');
      if (!checkedHem) {
        const index = await hems.first().getAttribute('data-client-bend-angle');
        await page.locator('#client-hem-options').click();
        await page.locator('#client-hem-index').selectOption(index);
        await page.locator('#client-hem-interior').fill('135');
        await layout(page, { scope: '#production-dialog' });
        await page.locator('#client-open-model-hem').click();
        assert.equal(await page.locator('[data-client-bend-angle="' + index + '"]').inputValue(), '135', 'explicit hem action changes only the requested bend');
        await page.locator('#client-reset-model-angles').click();
        assert.equal(await page.locator('[data-client-bend-angle="' + index + '"]').inputValue(), '180', 'reset restores original hem');
        checkedHem = true;
      }
    }
    await layout(page);
    await capture(page, 'modele-' + id + '-cotes-' + size.width, { viewport: size, profile: id, sideCount: all });
    visited.push({ id, sides: all });
    await openModels(page);
  }
  assert.equal(checkedHem, true, 'at least one real MIR hem profile was exercised');
  return { visited, originalHemAndReset: checkedHem };
}

async function commerce(page, base, size) {
  await goto(page, base, 'produit.html?id=hardieplank-select-625&color=hardie-pierre-des-champs');
  await page.locator('#product-add').waitFor({ state: 'attached' });
  await (await showTarget(page, '[data-color="hardie-pierre-des-champs"]')).click();
  await showTarget(page, '#product-add');
  await page.locator('#product-unit').selectOption('pièces');
  await page.locator('#product-quantity').fill('2');
  await layout(page);
  await page.locator('#product-add').click(); await page.locator('#product-added').waitFor();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mir-shopping-list-v1')));
  assert.equal(stored.items[0].quantity, 2);
  assert.equal(stored.items[0].colorId, 'hardie-pierre-des-champs');
  await goto(page, base, 'selection.html');
  await inspectSections(page, 'panier-materiau', size);
  await showTarget(page, '[data-qty]');
  await page.locator('[data-qty]').first().fill('3'); await page.locator('[data-qty]').first().press('Tab');
  await page.reload(); await settle(page);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mir-shopping-list-v1')).items[0].quantity), 3, 'cart edit persists');
  await (await showTarget(page, '#cart-estimate')).click();
  await page.locator('#mir-estimate-dialog').waitFor();
  await page.locator('#estimate-form [name="name"]').fill('Recette locale MIR');
  await page.locator('#estimate-form [name="email"]').fill('recette@example.invalid');
  const estimateSelect = page.locator('#mir-estimate-dialog select[data-mir-section-select]');
  const estimateSteps = await estimateSelect.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
  for (const value of estimateSteps) {
    await estimateSelect.selectOption(value);
    await layout(page, { scope: '#mir-estimate-dialog' });
    if (size.width === 320) await capture(page, 'estimation-etape-' + value + '-320', { viewport: size, submitted: false });
  }
  await estimateSelect.selectOption(estimateSteps[0]);
  assert.equal(await page.locator('#estimate-form [name="name"]').inputValue(), 'Recette locale MIR');
  assert.equal(await page.locator('#estimate-form [name="email"]').inputValue(), 'recette@example.invalid');
  await page.locator('#estimate-close').click();
  // A long existing local cart must stay reachable through its page controls.
  await page.evaluate(() => {
    const cart = JSON.parse(localStorage.getItem('mir-shopping-list-v1'));
    cart.items = Array.from({ length: 8 }, (_, i) => ({ ...cart.items[0], id: 'qa-page-' + i, quantity: i + 1 }));
    localStorage.setItem('mir-shopping-list-v1', JSON.stringify(cart));
  });
  await page.reload(); await settle(page);
  await inspectSections(page, 'panier-long', size); await layout(page);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mir-shopping-list-v1')).items.length), 8, 'pagination never deletes rows');
  await capture(page, 'panier-long-' + size.width, { viewport: size, fixture: 'eight local material rows' });
  return { material: stored.items[0].materialId, quantityAfterEdit: 3, longCartRows: 8, estimateSubmitted: false };
}

async function beforeCaptures(browser, directory) {
  const expected = 'a2235c50466b0a21fecb7b1be8216dfd5006829c';
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'test/mir-test-environment.json'), 'utf8'));
  assert.equal(manifest.revision, expected, 'comparison baseline is the requested exact revision');
  const server = await serve(directory);
  try {
    for (const size of [sizes[1], sizes[2]]) await withPage(browser, server.base, size, 'before-' + size.width, async page => {
      await goto(page, server.base, 'index.html');
      await capture(page, 'before-accueil-' + size.width, { viewport: size, source: expected, comparisonOnly: true });
      await goto(page, server.base, 'production.html?mode=client&kind=profile');
      await page.locator('#client-choose-model').click();
      await capture(page, 'before-profils-' + size.width, { viewport: size, source: expected, comparisonOnly: true });
      await page.locator('[data-client-profile="l"]').click();
      await page.waitForFunction(() => document.body.dataset.clientStage === '2');
      await page.locator('[data-measure="A"]').fill('3½');
      await page.locator('[data-measure="B"]').fill('2¼');
      await capture(page, 'before-mesures-L-' + size.width, { viewport: size, source: expected, comparisonOnly: true });
      // Deliberately no new layout or navigation assertion on the previous UI.
    });
  } finally { await server.close(); }
  return { source: expected, comparisonOnly: true, viewports: [sizes[1], sizes[2]] };
}

async function security(page, context, base) {
  await goto(page, base, 'index.html');
  const start = blocked.length;
  const result = await page.evaluate(async () => {
    const denied = async (url, init) => { try { await fetch(url, init); return false; } catch { return true; } };
    const result = {
      environment: window.MIRTestEnvironment,
      external: await denied('https://example.invalid/qa'),
      mutation: await denied('./qa-no-write', { method: 'POST', body: 'qa' }),
      outsideTest: await denied('/index.html')
    };
    localStorage.setItem('qa-client-parcours', 'namespaced');
    return result;
  });
  assert.equal(result.environment.environment, 'test');
  assert.equal(result.environment.projectRef, 'hxtztkmbfpmzrieccwsg');
  assert.equal(result.external, true); assert.equal(result.mutation, true); assert.equal(result.outsideTest, true);
  assert.equal(blocked.length, start, 'the generated guards reject probes before transport');
  const storage = await context.storageState();
  const entry = storage.origins.flatMap(origin => origin.localStorage).find(item => item.name.endsWith('qa-client-parcours'));
  assert.equal(entry.name, 'mir-test:hxtztkmbfpmzrieccwsg:qa-client-parcours');
  return { guardRejectsBeforeTransfer: true, namespacedStorage: true };
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(build, 'test/mir-test-environment.json'), 'utf8'));
  assert.deepEqual(manifest, { environment: 'test', projectRef: 'hxtztkmbfpmzrieccwsg', revision: sha }, 'built TEST and checked-out source use the exact same SHA');
  const headers = fs.readFileSync(path.join(build, '_headers'), 'utf8');
  assert.match(headers, /connect-src 'self'/, 'guarded preview has a same-origin connection policy');
  assert.match(headers, /X-Robots-Tag: noindex, nofollow/i, 'preview cannot be indexed');
  for (const [, route] of scenes) {
    const html = fs.readFileSync(path.join(build, 'test', route.split('?')[0]), 'utf8');
    const previewGuard = html.indexOf('mir-prestige-preview-guard.js');
    assert.ok(previewGuard >= 0 && previewGuard < html.indexOf('mir-test-guard.js'), 'read-only guard precedes TEST runtime on ' + route);
    assert.match(html, /connect-src 'self'/, 'CSP present in ' + route);
  }
  const sourceFiles = ['dist/mir-prestige.js', 'dist/mir-prestige.css', 'dist/mir-client-pages.js', 'dist/mir-client-pages.css', 'dist/mir-client-pliage-viewport.js', 'dist/mir-pliage-journey.css', 'dist/production-app.js', 'dist/production.html', 'dist/production-model.js', 'scripts/build-prestige-preview.cjs'];
  const files = Object.fromEntries(sourceFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
  const server = await serve(build);
  let browser, version;
  try {
    browser = await chromium.launch(process.env.MIR_CHROMIUM_BIN ? { executablePath: process.env.MIR_CHROMIUM_BIN } : {});
    version = browser.version();
    if (process.env.MIR_CLIENT_PARCOURS_BASELINE) await check('before-reference-captures', () => beforeCaptures(browser, path.resolve(process.env.MIR_CLIENT_PARCOURS_BASELINE)));
    for (const size of sizes) {
      for (const [name, route, scrolling = false] of scenes) await check('page-' + name + '-' + size.width, () => withPage(browser, server.base, size, name + '-' + size.width, async page => {
        await goto(page, server.base, route); await header(page, size, name);
        const sections = await inspectSections(page, name, size);
        const geometry = await layout(page, { scrolling });
        await capture(page, name + '-' + size.width, { viewport: size, scrollingAllowed: scrolling });
        return { viewport: size, sections, geometry };
      }));
      await check('parcours-pliage-' + size.width, () => withPage(browser, server.base, size, 'parcours-pliage-' + size.width, page => folding(page, server.base, size)));
      await check('commerce-' + size.width, () => withPage(browser, server.base, size, 'commerce-' + size.width, page => commerce(page, server.base, size)));
    }
    for (const size of [sizes[0], sizes[2]]) {
      await check('angle-source-oblique-' + size.width, () => withPage(browser, server.base, size, 'angle-oblique-' + size.width, page => oblique(page, server.base, size)));
      await check('tous-profils-cotes-' + size.width, () => withPage(browser, server.base, size, 'tous-profils-' + size.width, page => allProfileMeasures(page, server.base, size)));
    }
    await check('preview-isolation', () => withPage(browser, server.base, sizes[1], 'isolation', (page, context) => security(page, context, server.base)));
    await check('english-navigation', () => withPage(browser, server.base, sizes[0], 'english', async page => {
      await goto(page, server.base, 'index.html');
      await page.locator('#mir-client-menu-button').click();
      await page.locator('button[data-mir-locale="en-CA"]').click();
      await page.waitForFunction(() => document.documentElement.lang === 'en-CA');
      await goto(page, server.base, 'production.html?mode=client&kind=profile');
      assert.equal(await page.locator('html').getAttribute('lang'), 'en-CA');
      await header(page, sizes[0], 'english'); await layout(page); await capture(page, 'english-320', { viewport: sizes[0], language: 'en-CA' });
      return { persisted: true };
    }));
    await check('staff-routes-unchanged', () => withPage(browser, server.base, sizes[3], 'staff', async page => {
      const routes = ['chantier.html', 'entrepot.html', 'coordination.html', 'production.html', 'production.html?mode=client&source=store'];
      for (const route of routes) {
        await page.goto(server.base + '/test/' + route); await settle(page);
        assert.equal(await page.locator('body.mir-prestige').count(), 0, 'no public shell mounted on ' + route);
        assert.equal(await page.locator('body[data-mir-client-pages]').count(), 0, 'no public pagination mounted on ' + route);
      }
      return { routes };
    }));
  } finally {
    const failed = results.filter(result => !result.passed);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ source: sha, manifest, browser: version, generatedAt: new Date().toISOString(), completeMatrix: !filter, filter: filter || null, previewOnly: true, backendWrites: false, productionDeployment: false, sizes, files, passed: results.length - failed.length, failed: failed.length, results, captures, blocked, layoutDiagnostics }, null, 2) + '\n');
    if (browser) await browser.close();
    await server.close();
  }
  assert.ok(results.length > 0, 'at least one selected acceptance case ran');
  assert.equal(results.filter(result => !result.passed).length, 0, 'all selected client parcours acceptance cases pass; inspect results.json and failure captures');
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
