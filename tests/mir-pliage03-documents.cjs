'use strict';
/* Pure local contract checks. No browser, transport, mail or external service. */
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const M=require('../dist/production-model.js'),S=require('../dist/mir-pliage-surfaces.js');
const D=require('../dist/mir-pliage-documents.js'),U=require('../dist/mir-unified-client-dossier.js');
const fixture=require('./fixtures/mir-pliage03-legacy-render-hashes.json');
const copy=x=>JSON.parse(JSON.stringify(x)),digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const renderer=D.createRenderer({production:M,surfaces:S});
const textNodes=svg=>(svg.match(/<text\b[^>]*>[\s\S]*?<\/text>/g)||[]).map(text=>text.replace(/<[^>]+>/g,''));
const metadata=page=>{const {svg,...rest}=page;return rest;};
const newLegend=text=>text.replace(/Face colorée : Face ([12]) — côté indiqué par l’étoile/g,'Face colorée : Face $1 — côté indiqué par le liseré bleu');
function clientText(text,source){
 let result=newLegend(text);
 for(const [index,bend] of (source?.bends||[]).entries())if(bend.mode==='signed'){
  const prefix='Pli '+source.segments[index].label+'–'+source.segments[index+1].label+' = ';
  const number=n=>String(Math.round(n*10000)/10000);
  result=result.replace(prefix+number(Math.abs(bend.angle))+'°',prefix+number(180-Math.abs(bend.angle))+'°');
 }
 return result;
}
const expectedMetadata=(page,source)=>{const value=metadata(page);return {...value,summary:value.summary?.map(text=>clientText(text,source))};};
const allText=page=>textNodes(page.svg).join(' ').replace(/\s+/g,' ');
const spec=name=>copy(fixture.cases.find(row=>row.name===name).spec);
const order=items=>({...copy(fixture.order),items});
function fakeWindow(pathname='/selection.html',search=''){
 const win={location:{pathname,search},MIRProduction:M,MIRPliageSurfaces:S,MIRPliageDocuments:D};win.parent=win;return win;
}
function instance(source=spec('decimal-z')){
 const template=M.createTemplate(source,{id:'pliage03-fixture',name:source.name,version:1});assert.equal(template.ok,true);
 const measurements={...source.dimensions,length:source.length};for(const segment of source.segments||[])measurements[segment.label]=segment.length;
 const result=M.instantiateTemplate(template.template,{instanceId:source.id,unit:source.unit,measurements,length:source.length,
  quantity:source.quantity,material:source.material,finish:source.finish,coloredFace:source.coloredFace,location:source.location,note:source.note});
 assert.equal(result.ok,true);return result;
}
const tests=[];function test(name,run){tests.push({name,run});}

test('sans opt-in, géométrie et sorties client/atelier identiques au commit e58964c',()=>{
 for(const row of fixture.cases){
  const model=row.spec.kind==='profile'?M.buildProfile(row.spec):M.buildPanel(row.spec),input=order([row.spec]);
  assert.equal(digest(model),row.baseline.model,row.name+' model');
  assert.equal(digest(M.productionPages(input,{document:'client-request'})),row.baseline.client,row.name+' client');
  assert.equal(digest(M.productionPages(input)),row.baseline.staff,row.name+' staff');
  assert.equal(digest(M.productionPages(input,{layout:'bending-sheet'})),row.baseline.bendingSheet,row.name+' bending-sheet');
  if(row.spec.kind==='profile')assert.equal(digest(M.profileSVG(model)),row.baseline.profileSVG,row.name+' historical snapshot SVG');
 }
});

test('callback ignoré par les documents atelier, y compris la fiche de pliage',()=>{
 const forbidden=()=>{throw Error('callback client exécuté dans un document atelier');};
 for(const row of fixture.cases){
  const input=order([row.spec]);
  assert.equal(digest(M.productionPages(input,{profileSurfaceRenderer:forbidden})),row.baseline.staff);
  assert.equal(digest(M.productionPages(input,{layout:'bending-sheet',profileSurfaceRenderer:forbidden})),row.baseline.bendingSheet);
 }
});

test('garde publique : panier et configurateur client seulement, aucun embed/employé/atelier',()=>{
 for(const [path,query] of [['/selection.html',''],['/production.html','?mode=client&kind=profile'],['/production.html','?mode=client&template=fixture'],['/pliage.html','']])assert.equal(typeof D.clientRenderer(fakeWindow(path,query)),'function');
 for(const [path,query] of [['/production.html',''],['/production.html','?mode=client&source=store'],['/production.html','?mode=client&embed=1'],['/selection.html','?admin=1'],['/chantier.html',''],['/estimation-dossier.html',''],['/atelier-essai/production-test.html','?mode=client']])assert.equal(D.clientRenderer(fakeWindow(path,query)),undefined,path+query);
 const embedded=fakeWindow();embedded.parent={};assert.equal(D.clientRenderer(embedded),undefined);
 const missing=fakeWindow();delete missing.MIRPliageSurfaces;assert.equal(D.clientRenderer(missing),undefined);
});

test('faces PDF opposées et continues, même section réelle, toutes cotes et métadonnées conservées',()=>{
 for(const row of fixture.cases.filter(row=>row.spec.kind==='profile')){
  const paths=[];
  for(const side of ['left','right']){
   const source=copy(row.spec);source.coloredFace.side=side;const input=order([source]),before=JSON.stringify(input);
   const legacy=M.productionPages(input,{document:'client-request'});let projected;
   const pages=M.productionPages(input,{document:'client-request',profileSurfaceRenderer:(model,mapped,section)=>{
    projected={model,mapped,section};assert.deepEqual(section,M.profileSectionPath(mapped,model.bends));return renderer(model,mapped,section);
   }});
   assert.equal(pages.length,legacy.length);assert.equal(JSON.stringify(input),before);
   for(let i=0;i<pages.length;i++){assert.deepEqual(metadata(pages[i]),expectedMetadata(legacy[i],source));assert.equal(allText(pages[i]),clientText(allText(legacy[i]),source));}
   const tags=pages[0].svg.match(/<path class="mir-pliage-painted-surface"[^>]+>/g)||[];assert.equal(tags.length,1,row.name);
   assert.doesNotMatch(pages[0].svg,/profile-painted-star/);assert.match(tags[0],new RegExp('data-painted-side="'+side+'"'));
   const d=tags[0].match(/\sd="([^"]+)"/)[1];assert.equal((d.match(/M/g)||[]).length,1,'one continuous path');assert.doesNotMatch(d,/NaN|Infinity/);
   const expected=S.surfacePaths(projected.mapped,{offset:6,handedness:-1,section:projected.section,bends:projected.model.bends,miterLimit:4});
   assert.equal(d,expected[side]);paths.push(d);
   if(row.name==='hem'){assert.match(d,/ A/);assert.equal(expected.diagnostics.resolvedReturns,1);}
  }
  assert.notEqual(paths[0],paths[1],row.name+' opposite physical faces');
 }
});

test('instantanés, angles décimaux et réédition restent inchangés par le rendu PDF',()=>{
 const saved=instance(),before=JSON.stringify(saved),input=order([saved.snapshot]);
 const pages=M.productionPages(input,{document:'client-request',profileSurfaceRenderer:renderer});assert.match(pages[0].svg,/mir-pliage-painted-surface/);
 assert.equal(JSON.stringify(saved),before);assert.equal(saved.snapshot.spec.bends[0].angle,112.5);assert.equal(saved.snapshot.spec.bends[1].angle,67.25);
 const revised=M.reviseInstance({snapshot:saved.snapshot,history:[]},{quantity:4,coloredFace:{side:'right'}});
 assert.equal(revised.ok,true);assert.equal(revised.snapshot.id,saved.snapshot.id);assert.equal(revised.snapshot.revision,saved.snapshot.revision+1);
 assert.deepEqual(revised.history,[saved.snapshot]);assert.deepEqual(revised.snapshot.geometry.bends,saved.snapshot.geometry.bends);
 assert.equal(revised.snapshot.spec.quantity,4);assert.equal(revised.snapshot.spec.coloredFace.side,'right');assert.equal(JSON.stringify(saved),before);
 assert.equal(revised.snapshot.spec.finish.name,saved.snapshot.spec.finish.name);assert.equal(revised.snapshot.spec.note,saved.snapshot.spec.note);
});

test('rotation signée −30° affichée comme intérieur150°, ±90° inchangés, sans convertir les données ni les notes',()=>{
 for(const rightAngle of [-90,90]){
  const source=spec('decimal-z');source.bends=[{mode:'signed',angle:-30},{mode:'signed',angle:rightAngle}];
  source.name='Pli A–B = 30° — nom client à conserver';source.note='Pli A–B = 30°';
  const saved=instance(source),before=JSON.stringify(saved),input=order([saved.snapshot]);
  const baseline=M.productionPages(input,{document:'client-request'}),next=M.productionPages(input,{document:'client-request',profileSurfaceRenderer:renderer});
  const oldSummary=baseline.flatMap(page=>page.summary),newSummary=next.flatMap(page=>page.summary);
  assert.ok(oldSummary.includes('Pli A–B = 30°'));assert.ok(!oldSummary.includes('Pli A–B = 150°'));
  assert.ok(newSummary.includes('Pli A–B = 150°'));assert.ok(newSummary.includes('Pli B–C = 90°'));
  assert.ok(newSummary.includes(source.note),'note utilisateur exacte, même si elle ressemble à un libellé technique');
  assert.ok(next[0].name.includes(source.name));assert.match(allText(next[0]),/Pli A–B = 150°/);
  assert.equal(JSON.stringify(saved),before);assert.deepEqual(saved.snapshot.spec.bends,source.bends);
  const equivalent=copy(source);equivalent.bends[0]={mode:'interior',angle:150,direction:'right'};
  assert.deepEqual(M.buildProfile(source).pointsMM,M.buildProfile(equivalent).pointsMM);
 }
 const precise=spec('decimal-z');precise.bends[0]={mode:'signed',angle:-30.125};
 const pages=M.productionPages(order([precise]),{document:'client-request',profileSurfaceRenderer:renderer});
 assert.ok(pages.flatMap(page=>page.summary).includes('Pli A–B = 149.875°'));
});

test('continuations, panneaux et absence de face conservent leurs informations',()=>{
 const profile=spec('decimal-z');profile.note='Note client conservée '.repeat(30);
 const input={...order([profile,spec('panel')]),notes:'Information complémentaire importante. '.repeat(30)};
 const old=M.productionPages(input,{document:'client-request'}),next=M.productionPages(input,{document:'client-request',profileSurfaceRenderer:renderer});
 assert.equal(next.length,old.length);assert.ok(next.some(page=>page.name.includes('Continuation')));
 for(let i=0;i<next.length;i++){
  const changed=next[i].svg.includes('mir-pliage-painted-surface');
  assert.deepEqual(metadata(next[i]),changed?expectedMetadata(old[i]):metadata(old[i]));assert.equal(allText(next[i]),changed?newLegend(allText(old[i])):allText(old[i]));
  if(next[i].name.includes('Continuation'))assert.equal(next[i].svg,old[i].svg);
 }
 const panelInput=order([spec('panel')]);assert.deepEqual(M.productionPages(panelInput,{document:'client-request',profileSurfaceRenderer:renderer}),M.productionPages(panelInput,{document:'client-request'}));
 const unchosen=spec('l');unchosen.coloredFace.side='';assert.deepEqual(M.productionPages(order([unchosen]),{document:'client-request',profileSurfaceRenderer:renderer}),M.productionPages(order([unchosen]),{document:'client-request'}));
});

test('panier combiné transmet le renderer sans réécrire les sauvegardes ni les matériaux',()=>{
 const saved=instance(),piece={id:saved.spec.id,kind:'profile',spec:saved.spec,snapshot:saved.snapshot,history:saved.history};
 const data=new Map([[U.KEYS.materials,JSON.stringify({version:1,project:'Projet Québec',items:[{materialId:'fixture-material',quantity:2,unit:'pièce'}]})],[U.KEYS.pieces,JSON.stringify({version:1,order:{...fixture.order,items:[piece]}})]]);
 const before=[...data.entries()],state=U.read({getItem:key=>data.get(key)||null});assert.equal(state.ready,true);
 const materials={name:'Matériaux conservés',svg:'<svg><text>Matériau fixture × 2</text></svg>'};
 const output=U.pdfOptions(state,{production:M,selectionPDF:{buildOptions:()=>({faces:[materials]})},profileSurfaceRenderer:renderer});
 assert.deepEqual(output.faces[0],materials);assert.match(output.faces[1].svg,/mir-pliage-painted-surface/);assert.deepEqual([...data.entries()],before);
 const old=U.pdfOptions(state,{production:M,selectionPDF:{buildOptions:()=>({faces:[materials]})}});assert.match(old.faces[1].svg,/profile-painted-star/);
});

test('contexte estimation pliage appelle le vrai renderer sur le dossier figé, sans transport',async()=>{
 const source=fs.readFileSync(require.resolve('../dist/mir-estimate.js'),'utf8'),contextSource=source.match(/^async function context\(source\).*$/m)?.[0];assert.ok(contextSource);
 const saved=instance(),input=order([{id:saved.spec.id,kind:'profile',spec:saved.spec,snapshot:saved.snapshot,history:saved.history}]),before=JSON.stringify(input);
 const win=fakeWindow('/production.html','?mode=client&kind=profile');win.MIRProductionWorkspace={getEstimationDossier:()=>copy(input)};
 let pdf;const context=new Function('window','dossierFile','pieceRows',contextSource+';return context;')(win,async options=>{pdf=options;return {localFixture:true};},items=>items.map(item=>item.id));
 const result=await context('bending');assert.equal(result.selection.schema,'mir-bending-estimate-1');assert.deepEqual(result.selection.order,input);
 assert.match(pdf.faces[0].svg,/mir-pliage-painted-surface/);assert.equal(JSON.stringify(input),before);assert.deepEqual(result.dossier,{localFixture:true});
});

test('produit et référence source sont paginés sans troncature, préfixes FR/EN seulement, legacy inchangé',()=>{
 const source=spec('decimal-z');
 source.material.name='Gentek — Feuille peinte aluminium 3037, 24 po × 98,5 pi. '+Array.from({length:80},(_,i)=>'Référence longue '+i).join(' ');
 source.material.productRef='gentek-coil-3037';source.note='Produit : Suivant. Référence produit : conserver ma note en français.';
 const saved=instance(source),input=order([saved.snapshot]),before=JSON.stringify(saved);
 const legacy=M.productionPages(input,{document:'client-request'});
 assert.ok(!legacy.flatMap(page=>page.summary).join(' ').includes('Produit : '+source.material.name));
 for(const english of [false,true]){
  if(english)global.window={location:{pathname:'/production.html',search:'?mode=client&kind=profile'},MIRClientLocale:{getLocale:()=> 'en-CA',isClient:()=>true}};
  try{
   const pages=M.productionPages(input,{document:'client-request',profileSurfaceRenderer:renderer}),text=pages.flatMap(page=>page.summary).join(' ');
   assert.ok(pages.length>1,'long product data must continue onto additional sheets');
   assert.ok(text.includes((english?'Product: ':'Produit : ')+source.material.name),'complete original product name');
   assert.ok(text.includes((english?'Product reference: ':'Référence produit : ')+source.material.productRef),'reference remains a product reference, not a manufacturer code');
   assert.ok(text.includes(source.note),'user note is not treated as a technical label');
   assert.equal(JSON.stringify(saved),before,'source name, references and geometry remain untouched');
  }finally{if(english)delete global.window;}
 }
});

(async()=>{let passed=0;for(const {name,run} of tests){await run();passed++;console.log('PASS '+name);}console.log('MIR Pliage 03 documents : '+passed+'/'+tests.length+' groupes réussis. Aucun réseau.');})().catch(error=>{console.error(error);process.exitCode=1;});
