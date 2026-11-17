const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
const base='http://127.0.0.1:8765/',root='/workspace/mir-prestige',out=root+'/docs/verification/boutique-colours-20261117/language';
const cases=[
 {key:'canexel',id:'canexel-ridgewood-d5'},
 {key:'st-laurent',id:'st-laurent-lap-825'},
 {key:'st-laurent-vgroove',id:'st-laurent-v-groove-825'},
 {key:'st-laurent-board',id:'st-laurent-board-batten-12'},
 {key:'hardie',id:'hardiepanel'},
 {key:'hardie-smooth',id:'hardieplank-smooth-625'},
 {key:'paint-current',id:'canexel-touch-up-284ml',color:'canexel-blanc'},
 {key:'paint-legacy',id:'canexel-touch-up-284ml',color:'canexel-bois-de-grange'}
];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
 let allowed=0,blocked=0;await context.route('**/*',r=>{if(r.request().url().startsWith(base)&&r.request().method()==='GET'){allowed++;return r.continue()}blocked++;return r.abort()});
 const page=await context.newPage(),errors=[],result=[];page.on('pageerror',e=>errors.push(e.stack));
 const read=()=>page.evaluate(()=>({note:document.querySelector('#product-photo-note').textContent.trim(),colourNote:document.querySelector('#color-note').textContent.trim(),sample:document.querySelector('.mir-sample-note').textContent.trim(),groups:[...document.querySelectorAll('.mir-colour-group')].map(x=>x.textContent),name:document.querySelector('#selected-color-name').textContent,labels:[...document.querySelectorAll('.product-color-picker [data-mir-source-color]')].map(x=>x.textContent),values:[...document.querySelectorAll('#product-unit option')].map(x=>x.value),storage:localStorage.getItem('mir-shopping-list-v1'),lang:document.documentElement.lang}));
 for(const c of cases){
  const url=base+'produit.html?id='+c.id+(c.color?'&color='+c.color:'');
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#selected-color-name').waitFor({timeout:120000});
  await page.evaluate(()=>{MIRClientLocale.setLocale('fr-CA');document.querySelectorAll('details').forEach(d=>d.open=true)});await page.waitForTimeout(250);
  const fr=await read();await page.locator('#product-technical').screenshot({path:out+'/'+c.key+'-notes-fr.png'});
  await page.evaluate(()=>MIRClientLocale.setLocale('en-CA'));await page.waitForTimeout(350);
  const en=await read();
  const unitLabels=await page.locator('#product-unit option').allTextContents();
  if(fr.values.includes('paquets')){assert.ok(unitLabels.includes('packs'),'English packs label');await page.locator('#product-unit').selectOption('paquets');assert.equal(await page.locator('#product-unit').inputValue(),'paquets','canonical pack value preserved');}
  assert.match(await page.locator('.product-color-heading strong').innerText(),/^Colour:/,'English colour label');
  await page.locator('#product-technical').screenshot({path:out+'/'+c.key+'-notes-en.png'});
  if(['canexel','st-laurent','hardie','paint-current','paint-legacy'].includes(c.key))await page.screenshot({path:out+'/'+c.key+'-en-pc.png',fullPage:true});
  for(const k of ['note','colourNote','sample']){assert.notEqual(en[k],fr[k],c.key+' '+k+' unchanged');assert.doesNotMatch(en[k],/Rendu écran|Le même échantillon|Détail du|teinte du|à confirmer|Photo de retouche|Ancienne teinte|Aperçu de la|couvre-joints|recadré/,c.key+' '+k+' French residue')}
  assert.equal(en.name,fr.name,c.key+' official name preserved');assert.deepEqual(en.labels,fr.labels,c.key+' official colour labels preserved');assert.deepEqual(en.values,fr.values,c.key+' option values preserved');assert.equal(en.storage,fr.storage,c.key+' cart unchanged');
  await page.evaluate(()=>MIRClientLocale.setLocale('fr-CA'));await page.waitForTimeout(250);
  const back=await read();assert.deepEqual(back,fr,c.key+' round trip');
  result.push({key:c.key,url,fr,en,roundTrip:true});console.log('PASS '+c.key);
 }
 const report={mode:'Local GET requests only; all external requests and non-GET methods blocked',allowedLocalGet:allowed,blockedRequests:blocked,pageErrors:errors,cases:result};fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2)+'\n');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS '+result.length+' actual product pages FR/EN/FR');
})().catch(e=>{console.error(e);process.exit(1)});
