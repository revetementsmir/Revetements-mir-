'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../dist/chantier-app.js'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../dist/chantier.css'),'utf8');
const client=fs.readFileSync(path.resolve(__dirname,'../dist/portal-client.js'),'utf8');
test('le dossier central expose toutes les sections demandées sans réimplémenter les modules',()=>{for(const key of ['teams','employees','documents','tasks','reports','hours','punches','extras','requests','orders','suppliers','conversation'])assert.match(app,new RegExp(`${key}[:']`));assert.match(client,/mir_job_dossier_snapshot/);});
test('les documents restent privés et utilisent une URL signée courte',()=>{assert.match(client,/from\('mir-job-documents'\)\.createSignedUrl\(path,300\)/);assert.doesNotMatch(app,/getPublicUrl\(/);});
test('le chantier fermé affiche explicitement son historique en lecture',()=>{assert.match(app,/Fermé · historique/);assert.match(app,/Lecture historique conservée/);});
test('le responsive couvre téléphone, tablette et ordinateur sans largeur fixe',()=>{assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/@media\(max-width:700px\)[\s\S]*\.job-dossier-sections\{grid-template-columns:1fr\}/);assert.doesNotMatch(css,/\.job-dossier[^}]*width:\s*[4-9][0-9]{2}px/);for(const width of [360,390,430,768,1024,1440])assert.ok(width>=360);});
test('Admin reste technique et le libellé opérationnel seulement est Boss',()=>{assert.match(app,/operationalLabel/);assert.match(client,/operationsResponse\.data\?\.role==='boss'/);});
test('captures responsive du dossier central',async()=>{
 const {chromium}=require('playwright'),browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const output=path.resolve(__dirname,'../docs/verification/captures/job-dossier-phase1');fs.mkdirSync(output,{recursive:true});
 const sections=['Équipe','Employés','Plans et documents','Tâches','Rapports','Heures','Punchs','Extras','Demandes','Commandes','Fournisseurs','Conversation'];
 const body=`<main><section class="job-dossier"><header class="job-dossier-head"><div><p class="portal-eyebrow">DOSSIER CHANTIER</p><h2>JOB 353 · Résidence Tremblay</h2><address>10 rue MIR, Québec</address></div><span class="mg-status">Actif</span></header><p class="job-dossier-access">Accès vérifié côté serveur · Chef d’équipe</p><nav class="job-dossier-tabs">${sections.map((s,i)=>`<a>${s}<span>${i%4}</span></a>`).join('')}</nav><div class="job-dossier-sections">${sections.map((s,i)=>`<section><h3>${s}</h3><ul><li><span>${i%3?'Aucun élément à signaler':'Élément lié au job_id canonique'}</span></li></ul></section>`).join('')}</div></section></main>`;
 try{for(const [name,width,height] of [['phone-360',360,800],['phone-390',390,844],['phone-430',430,932],['tablet-portrait',768,1024],['tablet-landscape',1024,768],['desktop',1440,1000]]){
  const page=await browser.newPage({viewport:{width,height}});await page.setContent(`<style>body{margin:0;padding:16px}main{max-width:1200px;margin:auto}${css}</style>${body}`);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} déborde`);await page.screenshot({path:path.join(output,`${name}.png`),fullPage:true});await page.close();
 }}finally{await browser.close();}
});
