'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const phase=process.argv[2]||'after',report=JSON.parse(fs.readFileSync(path.join(__dirname,phase,'report.json'),'utf8')),failures=[],checks=[];
function check(name,fn){try{fn();checks.push({name,ok:true})}catch(e){failures.push(name+': '+e.message);checks.push({name,ok:false,error:e.message})}}
for(const c of report.cases){const name=c.scenario.name+' '+c.scenario.lang,joined=c.pages.map(p=>p.text).join('').replace(/\s+/g,'');check(name+' leaves source input untouched',()=>assert.equal(c.inputUnchanged,true));check(name+' text stays on page',()=>assert.deepEqual(c.clipped,[]));if(c.canvasText)check(name+' raster header text stays on page',()=>assert.ok(c.canvasText.every(x=>x.x>=80&&x.x+x.width<=2900&&x.y>=0&&x.y<=2105)));if(c.scenario.name==='panel-long'){const canvasText=(c.canvasText||[]).map(x=>x.text).join('').replace(/\s+/g,'');check(name+' keeps official colour ending',()=>assert.ok(canvasText.includes('FIN-COULEUR-QA')));check(name+' keeps project ending',()=>assert.ok(canvasText.includes('FIN-PROJET-QA')));check(name+' exact panel dimensions and quantity',()=>{assert.equal(c.panelModel.widthMM,48*25.4);assert.equal(c.panelModel.heightMM,36*25.4);assert.equal(c.panelModel.quantity,4);assert.equal(c.panelModel.finish.code,'QC-QA-123')})}if(c.scenario.name==='selection-long'){check(name+' keeps final product name',()=>assert.ok(joined.includes('FIN-NOM-QA')));check(name+' keeps final manufacturer reference',()=>assert.ok(joined.includes('FIN-REFERENCE-QA')));check(name+' keeps full project',()=>assert.ok(joined.includes('FIN-PROJET-QA')))}
if(c.scenario.name==='estimate-mixed'){
check(name+' hem and two distinct angles in real PDF',()=>{assert.ok(joined.includes('180°'));assert.ok(joined.includes('86°'));assert.ok(joined.includes('92°'));if(c.scenario.lang==='en-CA')assert.ok(joined.includes('180°—hem'))});
check(name+' each manufacturing quantity printed once',()=>{const unit=c.scenario.lang==='en-CA'?'pieces':'pièce(s)';for(const quantity of [2,3])assert.equal(joined.split(quantity+unit).length-1,1)});
}
for(const p of c.pages){const heading=p.bounds.find(t=>/^(DOSSIER DE PLIAGE|CUSTOM BENDING FILE)$/.test(t.text)),continuation=p.bounds.find(t=>/^(Continuation|Continued)/.test(t.text));if(heading&&continuation)check(name+' continuation header clear on page '+p.page,()=>assert.ok(Math.abs(heading.y-continuation.y)>20,'Continuation overlaps dossier title'))}
}
function panelContours(folder,key){return fs.readdirSync(path.join(__dirname,folder)).filter(n=>n.startsWith(key+'-source')&&n.endsWith('.svg')).sort().map(n=>[...fs.readFileSync(path.join(__dirname,folder,n),'utf8').matchAll(/<path\b[^>]*\bdata-mir-(?:panel-main|panel-wall|lip-inner)="[^"]+"[^>]*\bd="([^"]+)"/g)].map(m=>m[1]));}
if(phase==='after'){
 const baselines=['before','panel-before'].map(folder=>({folder,cases:JSON.parse(fs.readFileSync(path.join(__dirname,folder,'report.json'),'utf8')).cases}));
 for(const c of report.cases){
  const baseline=baselines.find(b=>b.cases.some(x=>JSON.stringify(x.scenario)===JSON.stringify(c.scenario)));if(!baseline)continue;
  const old=baseline.cases.find(x=>JSON.stringify(x.scenario)===JSON.stringify(c.scenario)),name=c.scenario.name+' '+c.scenario.lang;
  check(name+' manufacturing model unchanged',()=>assert.deepEqual(c.model,old.model));
  if(old.panelModel)check(name+' full panel model unchanged',()=>assert.deepEqual(c.panelModel,old.panelModel));
  if(c.scenario.name.startsWith('panel-'))check(name+' exact panel and lip contours unchanged',()=>{
   const key=c.scenario.name+'-'+c.scenario.lang,actual=panelContours('after',key),prior=panelContours(baseline.folder,key);
   assert.ok(actual.flat().length>0);assert.deepEqual(actual,prior);
  });
  else if(c.scenario.name!=='selection-long')check(name+' source fabrication geometry unchanged',()=>{
   // The first mixed face is the materials TABLE, whose horizontal rules move
   // when its project wraps. All manufacturing faces are compared verbatim.
   assert.deepEqual(c.scenario.name==='estimate-mixed'?c.geometry.slice(1):c.geometry,c.scenario.name==='estimate-mixed'?old.geometry.slice(1):old.geometry);
  });
 }
}
fs.writeFileSync(path.join(__dirname,phase,'assertions.json'),JSON.stringify({revision:report.revision,hashes:report.hashes,checks,failures},null,2));for(const c of checks)console.log((c.ok?'PASS ':'FAIL ')+c.name);if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
