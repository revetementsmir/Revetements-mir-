'use strict';
/* Data + actual pure employee-store model checks. No browser claim, no network. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../../..'),dist=path.join(root,'dist');
const baseSha='bb39e142e646022a20eb804dacd8001321c7ee19';
const read=file=>JSON.parse(fs.readFileSync(path.join(dist,file),'utf8'));
const current=read('catalogue-fd6866b49d21.json'),overlay=read('mir-client-colour-palettes.json');
const original=JSON.parse(execFileSync('git',['show',baseSha+':dist/catalogue-fd6866b49d21.json'],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024}));
const materials=new Map(current.materials.map(m=>[m.id,m])),before=new Map(original.materials.map(m=>[m.id,m]));
const hardieId='hardie-colorplus-touch-up-kit',canexelId='canexel-touch-up-284ml';
const changed=new Set([hardieId,canexelId]);
const hardieIds=['blanc-arctique','pierre-des-champs','beige-navajo','brun-kaki','taupe-monterey','ecorce','espresso','sauge','gris-ardoise','bleu-acier','brume-legere','gris-perle','etain-vieilli','gris-nocturne','bleu-de-soiree','bleu-ocean','gris-fer','rouge-campagnard','noir-minuit'].map(x=>'hardie-'+x);
const canexelIds=['acadia','barista','blanc','bleu-minuit','bois-de-grange','bois-de-santal','charbon','falaise','granit','gris-brume','loup-gris','moka-fonce','noir','renard-roux','rouge-campagne','sable','scandinave','sierra','toundra','yellowstone'].map(x=>'canexel-'+x);
const stIds=['lin','blanc','argent','aspen','bouleau','eucalyptus','gris-cendre','saule-argente','frene','bois-de-greve','bois-d-erable','miel-naturel','ipe','bois-de-chene','peuplier','noisetier','pruche-vieillie','ecorce','torrefie','espresso','kingwood','charbon-de-bois','ebene','noir'].map(x=>'st-laurent-'+x);
const results={baseSha,generatedAt:new Date().toISOString(),scope:'Static catalogue and actual pure employee store model. No browser or physical device certification.',checks:[]};
function check(name,fn){try{const detail=fn();results.checks.push({name,pass:true,...(detail?{detail}:{})});}catch(e){results.checks.push({name,pass:false,error:e.message});}}
const ids=colors=>colors.map(c=>c.id).sort();
check('131 product identities; 129 unrelated products exactly preserved',()=>{
  assert.equal(materials.size,131);assert.deepEqual([...materials.keys()],[...before.keys()]);
  for(const [id,m] of materials)if(!changed.has(id))assert.deepEqual(m,before.get(id),id);
});
check('Only authorized palette and provenance fields changed on touch-up products',()=>{
  const allowed=new Set(['colors','colorStatus','paletteComplete','keepProductPhoto','colorAvailability','paletteEvidence','documents']);
  for(const id of changed){const a=materials.get(id),b=before.get(id);for(const key of new Set([...Object.keys(a),...Object.keys(b)]))if(!allowed.has(key))assert.deepEqual(a[key],b[key],id+'.'+key);}
});
check('Hardie exactly 19 regional colours; same IDs in canonical, client and siding reference',()=>{
  assert.deepEqual(ids(materials.get(hardieId).colors),hardieIds.slice().sort());
  assert.deepEqual(materials.get(hardieId).colors,overlay.products[hardieId].colors);
  assert.deepEqual(ids(materials.get(hardieId).colors),ids(overlay.products['hardieplank-select-825'].colors));
});
check('Historical black packaging and Aged Pewter identity preserved without duplication',()=>{
  const kit=materials.get(hardieId),old=before.get(hardieId).colors[0],black=kit.colors.find(c=>c.id===old.id);
  for(const key of ['id','name','code','commercialName','packagingAliases','evidence','swatchUrl'])assert.deepEqual(black[key],old[key],key);
  const aged=kit.colors.filter(c=>c.id==='hardie-etain-vieilli');assert.equal(aged.length,1);assert.equal(aged[0].name,'Étain vieilli (Aged Pewter)');
});
check('CanExel exactly 20 references, including four documented legacy colours',()=>{
  const colors=materials.get(canexelId).colors;assert.deepEqual(ids(colors),canexelIds.slice().sort());
  assert.deepEqual(colors,overlay.products[canexelId].colors);
  assert.equal(colors.filter(c=>c.paletteStatus==='legacy_touch_up_only').length,4);
  assert.equal(colors.filter(c=>c.paletteStatus!=='legacy_touch_up_only').length,16);
  for(const c of colors.filter(c=>c.paletteStatus==='legacy_touch_up_only')){assert.equal(c.swatchUrl,null);assert.equal(c.hex,null);assert.equal(c.compatibilityScope,'touch_up_only_not_current_siding');}
});
check('All 5 St-Laurent fibre-cement palettes remain complete and unchanged',()=>{
  const products=current.materials.filter(m=>m.brand==='St-Laurent');assert.equal(products.length,5);
  for(const m of products){assert.deepEqual(ids(m.colors),stIds.slice().sort());assert.deepEqual(m,before.get(m.id));assert.deepEqual(ids(m.colors),ids(overlay.products[m.id].colors));}
});
check('All 19 Hardie, 16 current CanExel and 24 St-Laurent source swatches exist locally',()=>{
  const colours=[...materials.get(hardieId).colors,...materials.get(canexelId).colors.filter(c=>c.paletteStatus!=='legacy_touch_up_only'),...materials.get('st-laurent-lap-625').colors];
  for(const c of colours){assert.match(c.swatchUrl,/^\.\/assets\//);const file=path.resolve(dist,c.swatchUrl);assert.ok(file.startsWith(dist+path.sep));assert.ok(fs.statSync(file).size>100,c.id);}
  return {verifiedAssets:colours.length};
});
check('Overlay points to the actual updated canonical SHA256',()=>{
  assert.equal(overlay.catalogueSourceSha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(dist,'catalogue-fd6866b49d21.json'))).digest('hex'));
});
const Store=require(path.join(dist,'employee-store-model.js'));
const storeCatalogue=Store.buildCatalogue(current.materials);
check('Actual employee-store model exposes the same 19/20/24 palettes',()=>{
  for(const [id,expected] of [[hardieId,hardieIds],[canexelId,canexelIds],...current.materials.filter(m=>m.brand==='St-Laurent').map(m=>[m.id,stIds])])assert.deepEqual(ids(storeCatalogue.find(m=>m.id===id).colors),expected.slice().sort(),id);
});
check('Both touch-up products remain non-orderable; actual configureLine rejects them',()=>{
  for(const id of changed){const m=materials.get(id),item=storeCatalogue.find(m=>m.id===id);assert.equal(m.orderable,false);assert.equal(item.orderable,false);const result=Store.configureLine({catalogue:storeCatalogue},{itemId:id,colorId:m.colors[0].id,quantity:1});assert.equal(result.ok,false);assert.equal(result.error.code,'ITEM_NOT_ORDERABLE');}
});
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(dist,'mir-client-siding-previews.js'),'utf8'),context);
const geometry=base=>JSON.stringify([base.baseImage,base.width,base.height,base.viewBox||[0,0,base.width,base.height],base.maskPath]);
check('St-Laurent lap 6.25 and 8.25 use matching Hardie colour-template geometry',()=>{
  const out=[];for(const suffix of ['625','825']){const st=context.MIRClientSidingPreviews.baseFor(materials.get('st-laurent-lap-'+suffix)),hardie=context.MIRClientSidingPreviews.baseFor(materials.get('hardieplank-select-'+suffix));assert.equal(geometry(st),geometry(hardie));assert.equal(st.previewForSwatches,true);assert.match(st.note,/gabarit de fibrociment James Hardie/);out.push({suffix,baseImage:st.baseImage});}return out;
});
check('V-Groove and Board & Batten keep their own profile geometry',()=>{
  for(const [id,source] of [['st-laurent-v-groove-825','st-vgroove-9.jpg'],['st-laurent-board-batten-12','st-board-9.jpg']])assert.ok(context.MIRClientSidingPreviews.baseFor(materials.get(id)).baseImage.endsWith(source));
});
check('New sample and availability notes translate through the real client locale module',()=>{
  const locale=require(path.join(dist,'mir-client-i18n.js'));
  assert.equal(locale.translate('Échantillon de teinte','en-CA'),'Colour sample');
  assert.equal(locale.translate('Photo du contenant','en-CA'),'Container photo');
  assert.equal(locale.translate('Teinte non représentée','en-CA'),'Selected colour not shown');
  for(const id of ['st-laurent-lap-625','st-laurent-lap-825']){
    const note='Illustration de la couleur choisie. Rendu écran indicatif. '+context.MIRClientSidingPreviews.baseFor(materials.get(id)).note;
    assert.match(locale.translate(note,'en-CA'),/^Illustration of the selected colour\./);
  }
  for(const c of materials.get(hardieId).colors)assert.notEqual(locale.translate(c.availabilityNote+' '+c.swatchTextureNote,'en-CA'),c.availabilityNote+' '+c.swatchTextureNote);
});
check('Edited JavaScript files parse',()=>{
  for(const file of ['commerce.js','mir-client-siding-previews.js','magasin-revue.js','chantier-app.js','mir-client-en-ca.js'])execFileSync(process.execPath,['--check',path.join(dist,file)]);
  execFileSync(process.execPath,['--check',path.join(root,'tests/mir-client-colours-browser.cjs')]);
});
results.passed=results.checks.filter(c=>c.pass).length;results.failed=results.checks.filter(c=>!c.pass).length;
fs.writeFileSync(path.join(__dirname,'data-results.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));if(results.failed)process.exitCode=1;
