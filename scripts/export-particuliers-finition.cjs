'use strict';
// Publish only the real local review captures, alongside the protected TEST build.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'docs/verification/particuliers-pc-finition-20261118');
const folder='particuliers-pc-finition-captures';
const output=path.join(root,'dist',folder);
fs.mkdirSync(output,{recursive:true});
const sections=[];
for(const page of ['maison','accueil'])for(const size of ['1280x800','1440x900','1920x1080'])for(const locale of ['fr-CA','en-CA']){
 const pair=['before','after'].map(phase=>{
  const name=[phase,page,locale,size].join('-')+'.png';
  fs.copyFileSync(path.join(source,name),path.join(output,name));
  return `<figure><figcaption>${phase==='before'?'Avant':'Après'}</figcaption><a href="${folder}/${name}"><img loading="lazy" src="${folder}/${name}" alt="${page==='maison'?'Particuliers':'Accueil conservé'} — ${phase==='before'?'avant':'après'} — ${size} — ${locale}"></a></figure>`;
 }).join('');
 sections.push(`<section><h2>${page==='maison'?'Particuliers':'Accueil inchangé'} · ${size.replace('x',' × ')} · ${locale}</h2><div class="pair">${pair}</div></section>`);
}
fs.writeFileSync(path.join(root,'dist/particuliers-pc-finition.html'),`<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>MIR — Finition Particuliers PC</title><style>body{margin:0;background:#242522;color:#f4f1ea;font:16px/1.5 Arial,sans-serif}main{max-width:1500px;margin:auto;padding:40px 24px}a{color:#bda889}h1{font-weight:400}h2{font-size:18px;font-weight:400}p{max-width:820px;color:#c8c5bd}section{border-top:1px solid #55554d;margin-top:40px;padding-top:16px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}figcaption{margin-bottom:8px;color:#bda889}img{width:100%;height:auto;display:block}a:focus-visible{outline:2px solid #bda889;outline-offset:4px}@media(max-width:800px){.pair{grid-template-columns:1fr}}</style></head><body><main><a href="maison.html">Ouvrir la page Particuliers →</a><h1>Finition Particuliers PC.</h1><p>Captures réelles Chromium en français et en anglais. La photographie approuvée est conservée. Les paires de l’accueil permettent de vérifier l’absence de changement visuel. Cliquez sur une capture pour l’examiner à sa taille originale.</p><p>Avant Particuliers : 7c4e1fe. Référence accueil : 16cf0f8. L’aperçu TEST bloque les envois. Inspiration reste à venir; le formulaire d’estimation existant accepte actuellement les PDF.</p>${sections.join('')}</main></body></html>`);
console.log('24 captures réelles exportées dans la galerie Particuliers.');
