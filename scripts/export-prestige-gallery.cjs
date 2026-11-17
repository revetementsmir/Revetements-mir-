#!/usr/bin/env node
'use strict';
/** Build a review gallery from real browser captures. No service calls or application mutation. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { gzipSync, inflateSync, deflateSync } = require('node:zlib');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
function arg(key, fallback) { const i=args.indexOf(key); return i<0?fallback:args[i+1]; }
const source = path.resolve(arg('--source', path.join(ROOT,'docs/verification/prestige-20261117')));
const destination = path.resolve(arg('--dist', path.join(ROOT,'dist')));
const manifestFile = arg('--manifest', null);
const includeDrafts = args.includes('--include-drafts');
const escape = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const routes = [
 ['boutique','Boutique','boutique.html'],['categorie','Catégories','boutique.html'],['recherche','Recherche','boutique.html'],
 ['produit','Fiche produit','produit.html'],['panier','Panier','selection.html'],['selection','Panier','selection.html'],
 ['estimation','Demande d’estimation','estimation.html'],['confirmation','Confirmation','estimation.html'],
 ['pliage','Pliages sur mesure','pliage.html'],['studio','Studio 3D','studio.html'],['plan','Studio public','plan.html'],
 ['maison','Pour ma maison','maison.html'],['chantiers','Pour mes chantiers','chantiers.html'],
 ['connexion','Connexion','chantier.html?view=account'],['inscription','Inscription','chantier.html?view=account'],
 ['compte','Compte client','chantier.html?view=account'],['account','Compte client','chantier.html?view=account'],
 ['commandes','Commandes','chantier.html?view=orders'],['orders','Commandes','chantier.html?view=orders'],
 ['demandes','Suivi des demandes','chantier.html?view=orders'],['aide','Centre d’aide','chantier.html#aide'],
 ['contact','Contact','contact.html'],['realisations','Réalisations','realisations.html'],['materiaux','Matériaux','materiaux.html'],
 ['accueil','Accueil','index.html'],['index','Accueil','index.html']
];
function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]); }
function infer(file) {
 const relative=path.relative(source,file).split(path.sep).join('/');
 const name=relative.toLowerCase();
 const route=routes.find(r=>name.includes(r[0]));
 const viewport=/mobile|phone|telephone|360|375|390|430/.test(name)?'Téléphone':/tablet|tablette|768|810|834|1024/.test(name)?'Tablette':'PC';
 const language=/(?:^|[-_/])en(?:[-_. /]|$)/.test(name)?'EN-CA':'FR-CA';
 const state=/empty|vide/.test(name)?'État vide':/success|confirmation/.test(name)?'Confirmation':/error|erreur/.test(name)?'Erreur':'';
 return {file,relative,title:route?.[1]||path.basename(file,path.extname(file)).replace(/[-_]/g,' '),page:route?.[2]||null,viewport,language,state,simulated:/mock|simul|fixture/.test(name)};
}
let items;
if (manifestFile) {
 const data=JSON.parse(fs.readFileSync(path.resolve(manifestFile),'utf8'));
 items=(Array.isArray(data)?data:data.captures).map(x=>{const file=path.resolve(source,x.file);if(file!==source&&!file.startsWith(source+path.sep))throw Error('Capture outside source');return {...infer(file),...x,file};});
} else {
 items=walk(source).filter(f=>/\.(png|jpe?g|webp)$/i.test(f)).filter(f=>includeDrafts||!/(?:^|[\/_-])(before|avant|progress|palettes)(?:[\/_-]|\.)/i.test(path.relative(source,f))).map(infer);
}
if(!items.length) throw Error('No final captures found. Pass --manifest for explicit final captures; --include-drafts is for development only.');
items.sort((a,b)=>{const rank=x=>{const pathname=x.page?.split('?')[0]||'';const n=routes.findIndex(r=>r[1]===x.title||r[2].split('?')[0]===pathname);return n<0?999:n};return rank(a)-rank(b)||a.viewport.localeCompare(b.viewport)||(a.language.toUpperCase()==='FR-CA'?0:1)-(b.language.toUpperCase()==='FR-CA'?0:1)||a.relative.localeCompare(b.relative);});
// PNG lossless re-encoding: preserve decompressed IDAT bytes and all non-IDAT chunks.
function optimizePNG(bytes) {
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return bytes;
 const chunks=[];let offset=8;const data=[];
 while(offset<bytes.length){const length=bytes.readUInt32BE(offset),end=offset+length+12;if(end>bytes.length)throw Error('Truncated PNG');const type=bytes.toString('ascii',offset+4,offset+8);chunks.push({type,bytes:bytes.subarray(offset,end)});if(type==='IDAT')data.push(bytes.subarray(offset+8,offset+8+length));offset=end;}
 if(!data.length)return bytes;
 const raw=inflateSync(Buffer.concat(data)),compressed=deflateSync(raw,{level:9});
 if(!inflateSync(compressed).equals(raw))throw Error('PNG re-encoding changed pixels');
 const idat=Buffer.alloc(compressed.length+12);idat.writeUInt32BE(compressed.length);idat.write('IDAT',4);compressed.copy(idat,8);
 let crc=0xffffffff;for(const b of idat.subarray(4,-4)){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}idat.writeUInt32BE((crc^0xffffffff)>>>0,idat.length-4);
 let emitted=false;const output=[bytes.subarray(0,8)];for(const chunk of chunks){if(chunk.type==='IDAT'){if(!emitted){output.push(idat);emitted=true;}}else output.push(chunk.bytes);}const result=Buffer.concat(output);return result.length<bytes.length?result:bytes;
}
const outputImages=path.join(destination,'prestige-captures');fs.mkdirSync(outputImages,{recursive:true});
// This directory contains generated copies only; remove prior numbered captures to avoid stale files after sorting.
for(const name of fs.readdirSync(outputImages))if(/^\d+-[a-zA-Z0-9._-]+\.(png|jpe?g|webp)$/.test(name))fs.unlinkSync(path.join(outputImages,name));
items=items.map((item,index)=>{
 const sourceBytes=fs.readFileSync(item.file),ext=path.extname(item.file).toLowerCase();
 const bytes=ext==='.png'?optimizePNG(sourceBytes):sourceBytes;
 const name=String(index+1).padStart(2,'0')+'-'+path.basename(item.file).replace(/[^a-zA-Z0-9._-]/g,'-');
 const mime=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';
 if(mime==='image/png'&&bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG: '+item.file);
 fs.writeFileSync(path.join(outputImages,name),bytes);
 return {...item,name,mime,bytes,size:bytes.length,originalSize:sourceBytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
});
function testHref(page) {const u=new URL(page,'http://mir.local/');u.searchParams.set('recette','1');return u.pathname.slice(1)+u.search+u.hash;}
const stylesheet=`*{box-sizing:border-box}body{margin:0;background:#f4f1ea;color:#242522;font-family:Arial,Helvetica,sans-serif}a{color:inherit}header{background:#242522;color:#f4f1ea;padding:42px max(26px,calc((100vw - 1360px)/2))}header p{font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#c5b08e;margin:0 0 16px}h1{font-weight:400;letter-spacing:-1.5px;font-size:42px;margin:0 0 17px}header .lead{max-width:760px;font-size:15px;line-height:1.7;color:#d4d0c7;letter-spacing:0;text-transform:none}main{max-width:1412px;margin:auto;padding:30px 26px 60px}.filters{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:18px}button,.open{font:inherit;font-size:12px;padding:11px 16px;border:1px solid #ccc5b8;border-radius:2px;cursor:pointer;background:transparent;color:#242522;text-decoration:none}button[aria-pressed=true]{background:#242522;color:#f4f1ea;border-color:#242522}a:focus-visible,button:focus-visible{outline:3px solid #a68553;outline-offset:4px}.count{font-size:12px;color:#70685d;margin:0 0 28px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:35px 28px}.card{min-width:0}.card[hidden]{display:none}.capture{display:block;height:390px;background:#ded9cf;border:1px solid #d5cec2;overflow:hidden}.capture img{display:block;width:100%;height:auto;object-position:center top}.caption{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:17px 0 20px;border-bottom:1px solid #d5cec2}h2{font-weight:400;font-size:21px;margin:0 0 7px}.caption p{font-size:12px;line-height:1.5;color:#72695c;margin:0}.open{white-space:nowrap}.legend{margin-top:35px;padding:24px 0;border-top:1px solid #d5cec2;font-size:12px;line-height:1.7;color:#746b60}.legend strong{color:#3d3932}dialog{border:0;background:#f4f1ea;padding:20px;max-width:96vw;max-height:94vh}dialog::backdrop{background:#111b}dialog button{position:sticky;top:0;display:block;margin:0 0 15px auto;background:#f4f1ea}dialog img{display:block;max-width:calc(96vw - 40px);height:auto}.preview-nav{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:20px}.preview-nav a{font-size:13px;color:#d9c6a7;text-underline-offset:5px}@media(max-width:760px){h1{font-size:32px}.grid{grid-template-columns:1fr}.capture{height:350px}.caption{align-items:flex-start;flex-direction:column;gap:12px}header{padding:32px 24px}main{padding:25px 18px 45px}}`;
function html(standalone=false) {
 const cards=items.map((x,i)=>{
 const src=standalone?'data:'+x.mime+';base64,'+x.bytes.toString('base64'):'prestige-captures/'+x.name;
 const description=[x.viewport,x.language,x.state,x.simulated?'Données de démonstration / simulation':''].filter(Boolean).join(' · ');
 return `<article class="card" data-format="${escape(x.viewport)}" data-language="${escape(x.language)}"><a class="capture" href="${standalone?'#capture-'+i:src}" data-image="${i}" aria-label="Agrandir ${escape(x.title)}, ${escape(description)}"><img src="${src}" loading="lazy" alt="Capture réelle : ${escape(x.title)}, ${escape(description)}"></a><div class="caption"><div><h2>${escape(x.title)}</h2><p>${escape(description)}</p></div>${!standalone&&x.page?`<a class="open" href="${escape(testHref(x.page))}">${x.simulated?'Ouvrir l’accès':'Ouvrir la page'} →</a>`:''}</div></article>`;
 }).join('');
 return `<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>MIR — Captures de la refonte prestige</title><style>${stylesheet}</style></head><body><header><p>MIR · Refonte du parcours client · TEST</p><h1>Les écrans, en situation.</h1><p class="lead">Galerie de captures réelles du navigateur. ${standalone?'Cette galerie autonome fonctionne sans réseau; elle montre les écrans et ne simule aucune opération métier.':'Agrandissez chaque capture ou ouvrez la page correspondante dans l’aperçu de travail.'}</p>${standalone?'':'<div class="preview-nav"><a href="boutique.html?recette=1">Commencer par la boutique</a><a href="index.html?recette=1">Voir l’accueil</a><a href="prestige-palettes.html">Palettes comparées</a><a href="prestige-captures.tar.gz" download>Télécharger la galerie autonome</a></div>'}</header><main><nav class="filters" aria-label="Format des captures"><button data-filter="all" aria-pressed="false">Tous les formats</button><button data-filter="PC" aria-pressed="true">PC</button><button data-filter="Tablette" aria-pressed="false">Tablette</button><button data-filter="Téléphone" aria-pressed="false">Téléphone</button></nav><p class="count" aria-live="polite">${items.length} captures · choisissez un format pour les parcourir</p><section class="grid" aria-label="Captures des pages">${cards}</section><div class="legend"><strong>Portée des preuves.</strong> Une capture montre le rendu et l’état de l’interface au moment de la recette. Les comptes, confirmations ou suivis qui utilisent des données simulées doivent être indiqués dans leur légende et dans le rapport de recette. Les captures ne prouvent pas un envoi réel, un paiement, une commande serveur ni une publication en production. ${includeDrafts?'Cette exportation inclut des vues de travail intermédiaires.':''}</div></main><dialog aria-label="Capture agrandie"><button type="button">Fermer ×</button><img alt=""></dialog><script>(()=>{const cards=[...document.querySelectorAll('.card')];document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));cards.forEach(c=>c.hidden=b.dataset.filter!=='all'&&c.dataset.format!==b.dataset.filter);document.querySelector('.count').textContent=cards.filter(c=>!c.hidden).length+' captures';}));document.querySelector('[data-filter=PC]').click();const dialog=document.querySelector('dialog'),detail=dialog.querySelector('img');document.querySelectorAll('[data-image]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();detail.src=a.querySelector('img').src;detail.alt=a.querySelector('img').alt;dialog.showModal();}));dialog.querySelector('button').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});})();</script></body></html>`;
}
fs.writeFileSync(path.join(destination,'prestige-captures.html'),html(false));
fs.writeFileSync(path.join(source,'prestige-captures-autonome.html'),html(true));
const report={createdAt:new Date().toISOString(),type:'browser-capture-gallery',standalone:'prestige-captures-autonome.html',draftsIncluded:includeDrafts,captures:items.map(({bytes,file,...x})=>({...x,file:path.relative(source,file).split(path.sep).join('/')}))};
fs.writeFileSync(path.join(source,'gallery-manifest.json'),JSON.stringify(report,null,2)+'\n');
if(args.includes('--archive')){
 const archive=path.join(source,'mir-prestige-captures.tar.gz');
 const entries=['prestige-captures-autonome.html','gallery-manifest.json'];
 const blocks=[];
 for(const name of entries){
  const data=fs.readFileSync(path.join(source,name));const header=Buffer.alloc(512);
  const oct=(value,length)=>value.toString(8).padStart(length-1,'0')+'\0';
  header.write(name,0,100);header.write(oct(0o644,8),100);header.write(oct(0,8),108);header.write(oct(0,8),116);header.write(oct(data.length,12),124);header.write(oct(Math.floor(Date.now()/1000),12),136);header.fill(32,148,156);header.write('0',156);header.write('ustar\0',257);header.write('00',263);
  const checksum=header.reduce((sum,value)=>sum+value,0);header.write(checksum.toString(8).padStart(6,'0')+'\0 ',148);
  blocks.push(header,data,Buffer.alloc((512-data.length%512)%512));
 }
 blocks.push(Buffer.alloc(1024));fs.writeFileSync(archive,gzipSync(Buffer.concat(blocks)));fs.copyFileSync(archive,path.join(destination,'prestige-captures.tar.gz'));
}
console.log(JSON.stringify({captures:items.length,gallery:path.join(destination,'prestige-captures.html'),standalone:path.join(source,'prestige-captures-autonome.html'),archive:args.includes('--archive')?path.join(source,'mir-prestige-captures.tar.gz'):null}));
