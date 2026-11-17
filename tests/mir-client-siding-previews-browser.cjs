'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.MIR_SIDING_TEST_ORIGIN||'http://127.0.0.1:8765';
const out=path.resolve(__dirname,'../docs/verification/client-siding-colours-20261117');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1200},serviceWorkers:'block'}),blocked=[],requests=[];
 await context.route('**/*',route=>{const request=route.request();requests.push(request.url());if(new URL(request.url()).origin!==base||request.method()!=='GET'){blocked.push(request.url());return route.abort();}if(new URL(request.url()).pathname==='/__siding-test.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><style>body{margin:24px;background:#f4f1ea;color:#242522;font:14px Arial}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}article{min-width:0}article div{height:245px;background:white}h2{font-size:14px;font-weight:400;min-height:34px}</style></head><body><div class="grid"></div></body></html>'});return route.continue();});
 const page=await context.newPage();await page.goto(base+'/__siding-test.html');await page.addScriptTag({url:base+'/material-preview.js'});await page.addScriptTag({url:base+'/mir-client-siding-previews.js'});
 const result=await page.evaluate(async()=>{
  const original=(await(await fetch('./catalogue-fd6866b49d21.json')).json()).materials;
  const before=JSON.stringify(original),start=performance.now(),prepared=await MIRClientSidingPreviews.prepare(original),elapsed=performance.now()-start;
  const eligible=prepared.filter(m=>m.stableSidingPreview?.clientPrepared),changed=[],groups={};
  const holder=document.createElement('div');document.body.append(holder);
  for(const material of eligible){
   await MIRMaterialPreview.render(holder,material,material.colors[0]);
   const svg=holder.firstElementChild,images=[...svg.querySelectorAll('image')],mask=svg.querySelector('clipPath'),filter=svg.querySelector('filter'),initialGeometry=svg.getAttribute('data-mir-stable-siding'),viewBox=svg.getAttribute('viewBox'),source=images.map(i=>i.getAttribute('href'));
   const tables=new Set();
   for(const color of material.colors){
    await MIRMaterialPreview.render(holder,material,color);
    const current=holder.firstElementChild;if(current!==svg||current.querySelector('clipPath')!==mask||current.querySelector('filter')!==filter||[...current.querySelectorAll('image')].some((node,i)=>node!==images[i])||current.getAttribute('viewBox')!==viewBox||current.getAttribute('data-mir-stable-siding')!==initialGeometry||JSON.stringify([...current.querySelectorAll('image')].map(i=>i.getAttribute('href')))!==JSON.stringify(source))throw Error(material.id+': specimen identity changed');
    const values=[...svg.querySelectorAll('[data-mir-siding-channel]')].map(node=>node.getAttribute('tableValues'));tables.add(values.join('|'));
    if(values.some(table=>new Set(table.split(' ')).size<2))throw Error(material.id+': grain flattened');
    const group=color.finishGroup||(/Deux tons|two.tone/i.test(color.collection||'')?'two-tone':'opaque');groups[group]=(groups[group]||0)+1;
   }
   if(tables.size<2)throw Error(material.id+': colours do not change');
   changed.push({id:material.id,colors:material.colors.length,distinctTables:tables.size,base:material.stableSidingPreview.baseImage,viewBox:material.stableSidingPreview.viewBox});
  }
  holder.remove();
  const selections=[['canexel-ridgewood-d5',['Blanc','Charbon','Acadia']],['hardieplank-select-825',['Blanc arctique','Pierre des champs','Bleu de soirée']],['st-laurent-lap-625',['Ipé','Bois d’érable','Écorce']],['st-laurent-lap-825',['Blanc','Noir','Bois d’érable']],['st-laurent-v-groove-825',['Blanc','Noir','Écorce']],['st-laurent-board-batten-12',['Blanc','Noir','Écorce']],['hardieshingle-staggered',['Blanc arctique','Pierre des champs','Bleu de soirée']]];
  const norm=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').toLowerCase();
  for(const [id,names] of selections){const material=eligible.find(m=>m.id===id);for(const [index,name] of names.entries()){const color=material.colors.find(c=>norm(c.name)===norm(name))||material.colors[index];const article=document.createElement('article'),label=document.createElement('h2'),visual=document.createElement('div');label.textContent=material.name+' · '+color.name;article.append(label,visual);document.querySelector('.grid').append(article);await MIRMaterialPreview.render(visual,material,color);}}
  window.testPrepared=prepared;window.testOriginal=original;
  return {materials:eligible.length,colors:changed.reduce((sum,m)=>sum+m.colors,0),groups,changed,inputUnchanged:JSON.stringify(original)===before,elapsedMs:Math.round(elapsed),unprepared:original.filter(m=>['James Hardie','CanExel','St-Laurent'].includes(m.brand)&&(m.applications||[]).includes('siding')&&!eligible.some(p=>p.id===m.id)).map(m=>m.id)};
 });
 assert.equal(result.inputUnchanged,true);assert.equal(result.materials,19);assert.deepEqual(result.unprepared,[]);assert.ok(result.groups['two-tone']>0);assert.ok(result.groups.opaque>0);
 await page.evaluate(()=>Promise.all([...document.querySelectorAll('svg image')].map(async node=>{const img=new Image();img.src=node.getAttribute('href');await img.decode().catch(()=>{});})));await page.screenshot({path:path.join(out,'fixed-siding-specimens.png'),fullPage:true});
 const count=requests.length;await page.evaluate(()=>MIRClientSidingPreviews.prepare(window.testOriginal));assert.equal(requests.length,count,'second preparation uses local pixel/LUT caches');assert.deepEqual(blocked,[]);
 const failure=await page.evaluate(async()=>{const original=window.testOriginal.find(m=>m.id==='hardieplank-select-825');const missing={...original,id:'hardie-test-missing',colors:[{id:'unavailable',name:'Unavailable',swatchUrl:'https://example.invalid/no-remote.png'}]};const [result]=await MIRClientSidingPreviews.prepare([missing]);return {noPreview:!result.stableSidingPreview,untouched:result===missing};});assert.equal(failure.noPreview,true);assert.equal(failure.untouched,true);assert.deepEqual(blocked,[]);
 fs.writeFileSync(path.join(out,'renderer-results.json'),JSON.stringify({...result,cacheSecondRunRequests:0,externalRequests:blocked,missingSource:failure},null,2)+'\n');console.log(JSON.stringify({materials:result.materials,colors:result.colors,groups:result.groups,elapsedMs:result.elapsedMs,unchangedInput:true,cacheSecondRunRequests:0,externalRequests:0}));await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
