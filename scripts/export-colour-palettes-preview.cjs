'use strict';
// Export actual, successful CI captures only. No browser run or fabricated evidence.
// Run after downloading the real artifact:
// node scripts/export-colour-palettes-preview.cjs --revision <tested 40-character SHA>
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'docs/verification/pliage-harmonie-20261117/colour-cutout-qa');
const dist = path.join(root, 'dist');
const folder = 'palettes-retouche-20261117';
const baseline = 'bb39e142e646022a20eb804dacd8001321c7ee19';
const products = [
  { id: 'hardie-colorplus-touch-up-kit', slug: 'hardie-kit', name: 'Kit ColorPlus James Hardie', count: 19, before: 2, storeBefore: 1, detail: '19 teintes régionales. La photo du kit accompagne un échantillon de couleur distinct.' },
  { id: 'canexel-touch-up-284ml', slug: 'canexel-paint', name: 'Retouche CanExel · 284 ml', count: 20, before: 20, storeBefore: 16, detail: '16 couleurs actuelles et 4 références anciennes. Ces quatre anciennes teintes restent sans aperçu de couleur.' },
  { id: 'st-laurent-lap-625', slug: 'st-laurent', name: 'Fibrociment St-Laurent', count: 24, before: 24, storeBefore: 24, detail: '24 couleurs St-Laurent sur le gabarit d’échantillon partagé avec James Hardie.' }
];
const sizes = [{ width: 1440, height: 1050, label: 'Ordinateur' }, { width: 834, height: 1112, label: 'Tablette' }, { width: 390, height: 844, label: 'Téléphone' }];
const scenes = [{ key: 'palette', label: 'Palette du produit' }, { key: 'magasin', label: 'Revue du magasin' }];
const hashFiles = ['commerce.js', 'catalogue-fd6866b49d21.json', 'mir-client-colour-palettes.json', 'material-preview.js', 'mir-client-siding-previews.js', 'magasin-revue.js', 'chantier-app.js', 'mir-store-siding-previews.js', 'mir-field-samsung.css'];
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
function requireTrue(condition, message) { if (!condition) throw new Error(message); }
function gitFile(revision, name) {
  return execFileSync('git', ['show', revision + ':dist/' + name], { cwd: root, maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}
function readEvidence(phase, revision) {
  const reportPath = path.join(source, phase, 'results.json');
  requireTrue(fs.existsSync(reportPath), phase + ': rapport réel absent (' + path.relative(root, reportPath) + ')');
  const raw = fs.readFileSync(reportPath);
  const report = JSON.parse(raw);
  requireTrue(report.phase === phase, phase + ': phase du rapport incohérente');
  // Both reports record the CI checkout SHA. The before source is separately identified by baseline.
  requireTrue(report.sourceRevision === revision, phase + ': sourceRevision ne correspond pas à --revision');
  requireTrue(report.baseline === baseline, phase + ': révision de départ inattendue');
  requireTrue(!report.executionError && report.passed !== false && !String(report.executionStatus || '').startsWith('blocked'), phase + ': exécution échouée ou bloquée');
  requireTrue(Number.isFinite(Date.parse(report.createdAt)), phase + ': date de capture absente');
  requireTrue(Array.isArray(report.checks) && report.checks.length > 0, phase + ': contrôles absents');
  const failures = report.checks.filter(check => check.pass !== true);
  requireTrue(failures.length === 0, phase + ': contrôles en échec : ' + failures.map(check => check.name).join(', '));
  requireTrue(Array.isArray(report.results) && report.results.length === products.length * sizes.length, phase + ': matrice produits/formats incomplète');
  const checkNames = new Set(report.checks.map(check => check.name));
  for (const name of hashFiles) {
    const recorded = report.hashes && report.hashes[name];
    requireTrue(/^[a-f0-9]{64}$/.test(recorded || ''), phase + ': empreinte absente pour ' + name);
    requireTrue(recorded === sha256(gitFile(phase === 'before' ? baseline : revision, name)), phase + ': empreinte différente de la source Git pour ' + name);
    if (phase === 'after') requireTrue(recorded === sha256(fs.readFileSync(path.join(dist, name))), 'Après : le fichier à livrer a changé depuis le test : ' + name);
  }
  const entries = [];
  for (const product of products) for (const size of sizes) {
    const rows = report.results.filter(row => row.id === product.id && row.width === size.width);
    requireTrue(rows.length === 1, phase + ': résultat absent ou dupliqué pour ' + product.id + ' / ' + size.width);
    const row = rows[0], prefix = product.slug + ' ' + size.width + ' ';
    requireTrue(Array.isArray(row.errors) && row.errors.length === 0, phase + ': erreurs navigateur pour ' + prefix);
    requireTrue(!Object.entries(row).some(([key, value]) => /Error$/.test(key) && value), phase + ': scénario incomplet pour ' + prefix);
    for (const suffix of ['product palette count', 'shop palette count', 'store palette count', 'employee palette count', 'employee no business calls', 'no JS errors']) {
      requireTrue(checkNames.has(prefix + suffix), phase + ': contrôle requis absent : ' + prefix + suffix);
    }
    for (const field of ['product', 'boutique', 'magasin', 'employee']) {
      const expected = phase === 'after' ? product.count : ['product', 'boutique'].includes(field) ? product.before : product.storeBefore;
      const colors = row[field] && row[field].colors;
      requireTrue(Array.isArray(colors) && colors.length === expected && new Set(colors.map(color => color.id)).size === expected, phase + ': palette incohérente dans ' + field + ' / ' + prefix);
    }
    requireTrue(Array.isArray(row.files), phase + ': liste des captures absente pour ' + prefix);
    for (const scene of scenes) {
      const filename = phase + '-' + scene.key + '-' + product.slug + '-' + size.width + '.png';
      requireTrue(row.files.filter(file => file === filename).length === 1, phase + ': capture non attestée dans le rapport : ' + filename);
      const file = path.join(source, phase, filename);
      requireTrue(fs.existsSync(file), phase + ': capture manquante : ' + filename);
      const buffer = fs.readFileSync(file);
      requireTrue(buffer.length > 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.toString('ascii', 12, 16) === 'IHDR', 'PNG invalide : ' + filename);
      requireTrue(buffer.readUInt32BE(16) === size.width && buffer.readUInt32BE(20) === size.height, 'Dimensions inattendues : ' + filename);
      entries.push({ phase, productId: product.id, productName: product.name, scene: scene.key, sceneLabel: scene.label, width: size.width, height: size.height, file: filename, sha256: sha256(buffer) });
    }
  }
  return { raw, report, entries, summary: { file: phase + '-results.json', sourceRevision: report.sourceRevision, servedSourceRevision: phase === 'before' ? baseline : revision, createdAt: report.createdAt, checksPassed: report.checks.length, sha256: sha256(raw), hashes: report.hashes } };
}
function render(manifest) {
  const productCards = products.map(product => `<article class="product"><p class="number">${product.count}<span> références</span></p><h2>${esc(product.name)}</h2><p>${esc(product.detail)}</p><a href="produit.html?id=${product.id}&amp;recette=1">Ouvrir le produit <span aria-hidden="true">↗</span></a></article>`).join('\n');
  const captures = manifest.entries.map(entry => `<figure data-product="${entry.productId}" data-scene="${entry.scene}" data-width="${entry.width}" data-phase="${entry.phase}"><a href="${folder}/${entry.file}" target="_blank" rel="noopener"><img src="${folder}/${entry.file}" width="${entry.width}" height="${entry.height}" alt="${esc(entry.productName)} — ${esc(entry.sceneLabel)} — ${entry.phase === 'after' ? 'après' : 'avant'}, ${entry.width} pixels" loading="lazy"></a><figcaption><strong>${esc(entry.productName)}</strong><span>${esc(entry.sceneLabel)} · ${entry.width} px · ${entry.phase === 'after' ? 'Après correction' : 'Avant correction'}</span><a href="${folder}/${entry.file}" target="_blank" rel="noopener">Agrandir la capture</a></figcaption></figure>`).join('\n');
  return `<!doctype html>
<html lang="fr-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>MIR — Palettes de retouche et fibrociment · TEST</title>
<style>
*{box-sizing:border-box}html{color-scheme:light}body{margin:0;background:#f4f1ea;color:#242522;font:16px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:inherit;text-underline-offset:4px}a:focus-visible,select:focus-visible{outline:3px solid #8b6735;outline-offset:4px}header{background:#242522;color:#f4f1ea;padding:32px max(24px,calc((100vw - 1320px)/2)) 52px}.eyebrow{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;color:#d6c4a7;font-size:12px;letter-spacing:.13em;text-transform:uppercase}h1{font-size:clamp(34px,5vw,64px);line-height:1.1;letter-spacing:-.025em;margin:36px 0 22px}h1 em{font-family:Georgia,serif;font-weight:400;color:#d6c4a7}header p{max-width:790px;color:#dedbd3;font-size:18px}main{max-width:1370px;margin:auto;padding:28px 24px 64px}nav{display:flex;flex-wrap:wrap;gap:12px 28px;padding-bottom:30px;font-size:14px}.products{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}.product{border-top:2px solid #bca88a;padding-top:18px}.number{font-size:38px;line-height:1.2;margin:0 0 16px}.number span{font-size:13px;color:#66645d}h2{font-size:22px;line-height:1.3;font-weight:550;margin:0 0 14px}.product p:not(.number){font-size:15px;color:#595952}.product a{font-size:14px}.context{border-left:3px solid #bda889;padding:1px 22px;margin:34px 0 42px;max-width:960px}.context p{margin:8px 0}.gallery-head{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:8px 24px}.gallery-head p{color:#66645d;font-size:14px;margin:0}.filters{display:flex;flex-wrap:wrap;gap:18px;border-block:1px solid #d9d2c5;padding:18px 0;margin:18px 0}.filters label{display:grid;gap:6px;font-size:13px;min-width:145px}.filters select{font:inherit;font-size:15px;min-height:44px;max-width:100%;padding:8px 30px 8px 12px;border:1px solid #c9c0b0;border-radius:0;background:#fff;color:inherit}.count{font-size:14px;color:#66645d;margin:18px 0 24px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}figure{margin:0;min-width:0}figure[hidden]{display:none}figure>a{display:block;height:440px;background:#e8e2d7;border:1px solid #d8cebf}img{display:block;width:100%;height:100%;object-fit:contain}figcaption{padding:12px 0}figcaption strong,figcaption span{display:block}figcaption span,figcaption a{font-size:13px;color:#66645d}footer{margin-top:46px;padding-top:24px;border-top:1px solid #d9d2c5;font-size:13px;color:#66645d}footer p{max-width:1000px}.evidence-links{display:flex;flex-wrap:wrap;gap:10px 24px}.revision{overflow-wrap:anywhere}@media(max-width:760px){.products{grid-template-columns:1fr;gap:24px}.product{display:grid;grid-template-columns:78px minmax(0,1fr);column-gap:20px}.number{grid-row:1/4}.number span{display:block}.product h2,.product p:not(.number),.product a{grid-column:2}.product h2{font-size:20px}.product p:not(.number){margin:0 0 12px}.grid{grid-template-columns:1fr}figure>a{height:480px}.filters label{flex:1;min-width:140px}.filters select{width:100%}header{padding-bottom:34px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style></head><body>
<header><div class="eyebrow"><span>Les Revêtements MIR</span><span>Aperçu TEST · 17 novembre 2026</span></div><h1>Les palettes complètes.<br><em>Chaque teinte à sa place.</em></h1><p>Retouches James Hardie et CanExel, fibrociment St-Laurent : ouvrez les produits ou comparez leurs véritables écrans avant et après correction.</p></header>
<main><nav aria-label="Parcourir l’aperçu"><a href="index.html">Accueil</a><a href="boutique.html?recette=1">Boutique</a><a href="magasin-revue.html">Revue du magasin</a><a href="pliage-harmonie-20261117.html">Galerie de passation · pliages et PDF</a></nav>
<section class="products" aria-label="Les trois palettes">${productCards}</section>
<div class="context"><p>Les photographies originales des kits sont conservées. Les clins St-Laurent partagent le gabarit d’échantillon Hardie et présentent leurs propres couleurs; ce gabarit ne représente pas le profil exact du fabricant.</p><p>Les teintes à l’écran sont indicatives. Les deux retouches restent des références non commandables. Pour CanExel, les quatre anciennes références sont nommées et leur teinte n’est pas représentée.</p></div>
<section aria-labelledby="captures-title"><div class="gallery-head"><h2 id="captures-title">Voir les écrans vérifiés</h2><p>3 produits · 3 formats · palettes et magasin</p></div>
<div class="filters"><label>Produit<select id="product"><option value="all">Tous les produits</option>${products.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><label>Écran<select id="scene"><option value="all">Tous les écrans</option>${scenes.map(s => `<option value="${s.key}">${s.label}</option>`).join('')}</select></label><label>Format<select id="width">${sizes.map(s => `<option value="${s.width}">${s.label} · ${s.width} px</option>`).join('')}<option value="all">Tous les formats</option></select></label><label>Version<select id="phase"><option value="after">Après correction</option><option value="before">Avant correction</option><option value="all">Avant et après</option></select></label></div>
<p class="count" id="count" role="status">${manifest.entries.length} captures réelles. Cliquez pour agrandir.</p><div class="grid">${captures}</div></section>
<footer><p>Captures issues de Chromium aux dimensions indiquées. Les contrôles couvrent également la sélection des couleurs, la boutique et le parcours employé avec des données de recette. Ils ne constituent pas un essai sur appareil physique. Aucun envoi métier réel n’est présenté par cette galerie.</p><p class="revision">Source testée après correction : <code>${manifest.sourceRevision}</code>. Comparaison avant : <code>${manifest.baseline}</code>.<br>Rapports : ${manifest.reports.after.checksPassed} contrôles réussis après correction et ${manifest.reports.before.checksPassed} contrôles réussis sur l’état initial.</p><div class="evidence-links"><a href="${folder}/manifest.json">Manifeste des captures</a><a href="${folder}/after-results.json">Rapport après correction</a><a href="${folder}/before-results.json">Rapport avant correction</a></div></footer></main>
<script>(()=>{const filters=['product','scene','width','phase'].map(id=>document.getElementById(id)),cards=[...document.querySelectorAll('figure')];function refresh(){let count=0;for(const card of cards){card.hidden=filters.some(filter=>filter.value!=='all'&&card.dataset[filter.id]!==filter.value);if(!card.hidden)count++}document.getElementById('count').textContent=count+' capture'+(count>1?'s':'')+' affichée'+(count>1?'s':'')+' · cliquez pour agrandir.'}filters.forEach(filter=>filter.addEventListener('change',refresh));refresh()})();</script></body></html>\n`;
}
function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('Usage: node scripts/export-colour-palettes-preview.cjs --revision <SHA complet testé>\nAttend les vrais rapports before/results.json et after/results.json de colour-cutout-qa. Aucun export en cas de source divergente, de capture manquante ou de contrôle en échec.');
    return;
  }
  requireTrue(args.length === 2 && args[0] === '--revision' && /^[a-f0-9]{40}$/.test(args[1]), 'Indiquer --revision avec le SHA complet du run QA réussi. --help affiche les détails.');
  const revision = args[1];
  const after = readEvidence('after', revision), before = readEvidence('before', revision);
  const entries = after.entries.flatMap(entry => [entry, before.entries.find(previous => previous.productId === entry.productId && previous.width === entry.width && previous.scene === entry.scene)]);
  const manifest = { schemaVersion: 1, generatedAt: new Date().toISOString(), sourceRevision: revision, baseline, source: path.relative(root, source), reports: { after: after.summary, before: before.summary }, entries };
  const html = render(manifest);
  // Nothing is written until both complete reports, Git sources and all PNGs are validated.
  const temp = fs.mkdtempSync(path.join(dist, '.palettes-retouche-export-'));
  try {
    const assets = path.join(temp, folder); fs.mkdirSync(assets);
    for (const entry of manifest.entries) fs.copyFileSync(path.join(source, entry.phase, entry.file), path.join(assets, entry.file));
    fs.writeFileSync(path.join(assets, 'after-results.json'), after.raw);
    fs.writeFileSync(path.join(assets, 'before-results.json'), before.raw);
    fs.writeFileSync(path.join(assets, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    fs.writeFileSync(path.join(temp, folder + '.html'), html);
    fs.rmSync(path.join(dist, folder), { recursive: true, force: true });
    fs.renameSync(assets, path.join(dist, folder));
    fs.renameSync(path.join(temp, folder + '.html'), path.join(dist, folder + '.html'));
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  console.log(JSON.stringify({ page: 'dist/' + folder + '.html', manifest: 'dist/' + folder + '/manifest.json', sourceRevision: revision, captures: manifest.entries.length }));
}
try { main(); } catch (error) { console.error('Export palettes refusé : ' + error.message); process.exitCode = 1; }
