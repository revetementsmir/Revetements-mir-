'use strict';
/* Real Chromium, ephemeral cart, strictly local GET/HEAD only. No requests are submitted. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {PNG}=require('pngjs'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const stage=process.env.MIR_COLOUR_STAGE||'final';
const out=path.join(root,'docs/verification/boutique-colours-20261117',stage);
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2'};
const requests=[],blocked=[];
const server=http.createServer((req,res)=>{
  requests.push({method:req.method,path:req.url});
  if(!['GET','HEAD'].includes(req.method))return res.writeHead(405).end();
  const file=path.resolve(dist,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
  if(req.method==='HEAD')return res.end();
  fs.createReadStream(file).pipe(res);
});
const catalogue=JSON.parse(fs.readFileSync(path.join(dist,'catalogue-fd6866b49d21.json'),'utf8')).materials;
const paletteFile=path.join(dist,'mir-client-colour-palettes.json');
const expectedPalettes=fs.existsSync(paletteFile)?JSON.parse(fs.readFileSync(paletteFile,'utf8')).products||{}:{};
const expected=id=>(expectedPalettes[id]?.colors||catalogue.find(m=>m.id===id)?.colors||[]).filter(c=>c.verified!==false&&c.archived!==true&&c.available!==false&&c.compatible!==false&&c.availabilityAtProfile!=='unavailable');
const excluded=['hardieplank-select-725','hardieplank-smooth-725'];
const brandNames=['CanExel','James Hardie','St-Laurent'];
const representative=['canexel-ridgewood-d5','hardieplank-select-625','st-laurent-lap-625'];
const hidden=new Set([...excluded,...JSON.parse(fs.readFileSync(path.join(dist,'boutique-visibilite.json'),'utf8')).hidden]);
const allSiding=catalogue.filter(m=>brandNames.includes(m.brand)&&(m.applications||[]).includes('siding')&&!hidden.has(m.id)&&m.status!=='visualization_only'&&m.commercialStatus!=='not_for_sale').map(m=>m.id);
const report={stage,generatedAt:new Date().toISOString(),scope:'Local Chromium; no physical device or Safari certification',checks:[],requests:0,blocked:[],sourceHashes:{}};
for(const filename of ['commerce.js','material-preview.js','mir-client-colour-palettes.json','mir-client-siding-previews.js','mir-prestige.css','mir-prestige-colours.css','mir-prestige-category-thumbnails.css','mir-client-i18n.js','mir-client-en-ca.js','mir-estimate.js']){
  const full=path.join(dist,filename);if(fs.existsSync(full))report.sourceHashes[filename]=require('node:crypto').createHash('sha256').update(fs.readFileSync(full)).digest('hex');
}
async function check(name,fn){if(process.env.MIR_COLOUR_ONLY&&!new RegExp(process.env.MIR_COLOUR_ONLY).test(name))return;try{const detail=await fn();report.checks.push({name,pass:true,...(detail?{detail}:{})});console.log('PASS '+name);}catch(e){report.checks.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message.slice(0,220));}}
function pixels(a,b){const aa=PNG.sync.read(a),bb=PNG.sync.read(b);assert.equal(aa.width,bb.width);assert.equal(aa.height,bb.height);let changed=0,total=aa.width*aa.height,delta=0;for(let i=0;i<aa.data.length;i+=4){const d=Math.max(Math.abs(aa.data[i]-bb.data[i]),Math.abs(aa.data[i+1]-bb.data[i+1]),Math.abs(aa.data[i+2]-bb.data[i+2]));if(d>4)changed++;delta+=d;}return {width:aa.width,height:aa.height,changedPixels:changed,changedRatio:changed/total,meanDelta:delta/total};}
function spread(buffer){const png=PNG.sync.read(buffer),levels=new Set(),hist=[];for(let y=Math.floor(png.height*.25);y<png.height*.75;y++)for(let x=Math.floor(png.width*.2);x<png.width*.8;x++){const n=(y*png.width+x)*4,[r,g,b]=png.data.subarray(n,n+3);if(r>245&&g>245&&b>245)continue;const l=Math.round(.2126*r+.7152*g+.0722*b);levels.add(l);hist.push(l);}hist.sort((a,b)=>a-b);return {luminanceLevels:levels.size,p10:hist[Math.floor(hist.length*.1)],p90:hist[Math.floor(hist.length*.9)]};}
async function noOverflow(page){const m=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(m.scroll<=m.width+1,JSON.stringify(m));return m;}
async function ready(page,base,url){const started=Date.now();await page.goto(base+'/'+url,{waitUntil:'domcontentloaded'});await page.locator(url.startsWith('produit')?'#product-detail':url.startsWith('selection')?'#selection-items':'#shop-grid').waitFor({state:'attached'});if(url.startsWith('produit'))await page.waitForFunction(()=>document.querySelector('#product-detail')?.textContent.trim()&&!document.querySelector('#product-detail')?.textContent.includes('Chargement de la référence'));else if(url.startsWith('boutique'))await page.waitForFunction(()=>document.querySelector('#shop-grid')?.children.length>0||document.querySelector('#shop-empty')?.hidden===false);else if(url.startsWith('selection'))await page.waitForFunction(()=>document.querySelector('#selection-items')?.children.length>0);await page.evaluate(()=>document.fonts.ready);report.loads||=[];report.loads.push({url,width:page.viewportSize().width,elapsedMs:Date.now()-started});}
async function screenshot(page,name){const fullPage=await page.evaluate(()=>document.documentElement.scrollHeight<18000);await page.screenshot({path:path.join(out,name+'.png'),fullPage,animations:'disabled'});}
async function colourButtonInfo(locator){return locator.evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.color||n.dataset.cardColor,label:n.getAttribute('aria-label'),visible:!!(n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'),pressed:n.getAttribute('aria-pressed')})));}
async function storeGeometry(locator){return locator.evaluate(el=>{const node=el.querySelector('svg,canvas,img');window.__colourTestNode=node;return {tag:node?.tagName,box:{w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height},viewBox:node?.getAttribute('viewBox'),key:node?.getAttribute('data-mir-stable-siding'),images:[...el.querySelectorAll('image')].map(n=>n.getAttribute('href')),paths:[...el.querySelectorAll('path')].map(n=>n.getAttribute('d'))};});}
async function sameGeometry(locator,before){const after=await locator.evaluate(el=>{const node=el.querySelector('svg,canvas,img');return {sameNode:node===window.__colourTestNode,tag:node?.tagName,box:{w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height},viewBox:node?.getAttribute('viewBox'),key:node?.getAttribute('data-mir-stable-siding'),images:[...el.querySelectorAll('image')].map(n=>n.getAttribute('href')),paths:[...el.querySelectorAll('path')].map(n=>n.getAttribute('d'))};});assert.equal(after.sameNode,true,'main material DOM node replaced');delete after.sameNode;assert.deepEqual(after,before,'sample geometry changed');return after;}
async function chooseColour(page,id){const button=page.locator(`[data-color="${id}"]`);await button.click();await page.waitForFunction(c=>document.querySelector(`[data-color="${c}"]`)?.getAttribute('aria-pressed')==='true',id);await page.waitForTimeout(160);}
async function paletteCheck(page,id){const options=await colourButtonInfo(page.locator('[data-color]'));assert.ok(options.length>=(id==='hardie-colorplus-touch-up-kit'?19:2),id+' no palette');assert.ok(options.every(o=>o.visible),id+' hidden colours: '+options.filter(o=>!o.visible).map(o=>o.id));assert.ok(options.every(o=>o.label?.trim()),id+' accessible names');assert.equal(options.filter(o=>o.pressed==='true').length,1,id+' selected state');assert.deepEqual(options.map(o=>o.id).sort(),expected(id).map(c=>c.id).sort(),id+' exact compatible palette');const groups=[...new Set(expected(id).map(c=>c.finishGroup).filter(Boolean))];if(groups.length>1){const labels=await page.locator('.product-color-picker .mir-colour-group').allTextContents();assert.ok(labels.some(s=>/opaques/i.test(s))&&labels.some(s=>/deux tons/i.test(s)),id+' opaque/two-tone groups missing');}return options;}
async function switchLanguage(page,lang){await page.locator('button[data-mir-locale="'+(lang==='EN'?'en-CA':'fr-CA')+'"]').click();await page.waitForFunction(l=>document.documentElement.lang===l,lang==='EN'?'en-CA':'fr-CA');}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const [width,height] of [[1440,1000],[834,1112],[390,844]].filter(([w])=>!process.env.MIR_COLOUR_WIDTHS||process.env.MIR_COLOUR_WIDTHS.split(',').includes(String(w)))){
      const context=await browser.newContext({viewport:{width,height},hasTouch:width<1000,isMobile:width<600,reducedMotion:'reduce',deviceScaleFactor:1});
      await context.route('**/*',route=>{const r=route.request();if(new URL(r.url()).origin===base&&['GET','HEAD'].includes(r.method()))return route.continue();blocked.push({method:r.method(),url:r.url().split('?')[0]});return route.abort();});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      page.setDefaultTimeout(30000);
      await check(width+' categories',async()=>{
        await ready(page,base,'boutique.html');
        await page.locator('.category-photo').last().scrollIntoViewIfNeeded();await page.waitForTimeout(150);
        const boxes=await page.locator('.category-photo').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),im=n.querySelector('img');return {category:n.closest('[data-category]')?.dataset.category,src:im?.getAttribute('src'),w:r.width,h:r.height,fit:im?getComputedStyle(im).objectFit:null,loaded:!im||im.complete&&im.naturalWidth>0};}));
        assert.equal(boxes.length,6);assert.ok(boxes.every(b=>b.loaded),'category image incomplete');assert.match(boxes.find(b=>b.category==='vinyl').src,/gentek-vinyl-9\.jpg(?:$|\?)/,'vinyl category uses the actual Sequoia vinyl image');
        assert.ok(Math.max(...boxes.map(b=>b.w))-Math.min(...boxes.map(b=>b.w))<2,'category widths differ');
        assert.ok(Math.max(...boxes.map(b=>b.h))-Math.min(...boxes.map(b=>b.h))<2,'category heights differ');
        await noOverflow(page);await page.locator('#category-cards').screenshot({path:path.join(out,'categories-'+width+'.png'),animations:'disabled'});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'boutique-'+width+'.png'),animations:'disabled'});return boxes;
      });
      for(const brand of brandNames)await check(width+' cards '+brand,async()=>{
        await ready(page,base,'boutique.html?brand='+encodeURIComponent(brand));
        const cards=page.locator('[data-shop-card]');assert.ok(await cards.count()>0);
        const palettes=await cards.evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.shopCard,options:[...n.querySelectorAll('[data-card-color]')].map(c=>({id:c.dataset.cardColor,visible:!!c.getClientRects().length,label:c.getAttribute('aria-label')}))})).filter(x=>x.options.length));
        assert.ok(palettes.length);assert.ok(palettes.every(p=>p.options.every(c=>c.visible&&c.label)),'card palette hidden');
        for(const palette of palettes)if(expectedPalettes[palette.id])assert.deepEqual(palette.options.map(c=>c.id).sort(),expected(palette.id).map(c=>c.id).sort(),palette.id+' card exact compatible palette');
        assert.equal(await page.locator('.more-colors').count(),0,'truncated +N palette');
        for(const id of excluded)assert.equal(await page.locator(`[data-shop-card="${id}"]`).count(),0,id+' still sold');
        await noOverflow(page);await cards.first().screenshot({path:path.join(out,'cards-'+brand.replace(/\W/g,'-')+'-'+width+'.png'),animations:'disabled'});return palettes.map(p=>({id:p.id,count:p.options.length}));
      });
      await check(width+' card to product colour link',async()=>{
        const id='canexel-ridgewood-d5';await ready(page,base,'boutique.html?brand=CanExel');const card=page.locator(`[data-shop-card="${id}"]`),button=card.locator('[data-card-color]').last(),colour=await button.getAttribute('data-card-color');await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');
        const links=await card.locator('[data-card-link]').evaluateAll(nodes=>nodes.map(n=>new URL(n.href).searchParams.get('color')));assert.ok(links.length&&links.every(c=>c===colour));await card.locator('h3 a').click();await page.locator('#product-add').waitFor();assert.equal(new URL(page.url()).searchParams.get('color'),colour);assert.equal(await page.locator(`[data-color="${colour}"]`).getAttribute('aria-pressed'),'true');
      });
      const products=width===1440?allSiding:representative;
      for(const id of products)await check(width+' product '+id,async()=>{
        await ready(page,base,'produit.html?id='+id);const options=await paletteCheck(page,id);
        const first=options[0].id,last=options.at(-1).id;
        await chooseColour(page,first);const photo=page.locator('#product-photo');await photo.scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);const before=await storeGeometry(photo),pngA=await photo.screenshot({animations:'disabled'});
        await chooseColour(page,last);const samplePosition=await photo.evaluate(n=>({top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom,viewport:innerHeight}));assert.ok(samplePosition.top>=-1&&samplePosition.bottom<=samplePosition.viewport+1,'sample not visible when colour chosen: '+JSON.stringify(samplePosition));await photo.scrollIntoViewIfNeeded();const geometry=await sameGeometry(photo,before),pngB=await photo.screenshot({animations:'disabled'}),difference=pixels(pngA,pngB);
        assert.ok(difference.changedRatio>.002,'selected colour did not change real pixels');
        assert.equal(new URL(page.url()).searchParams.get('color'),last);
        if(representative.includes(id)){
          fs.writeFileSync(path.join(out,id+'-'+width+'-colour-a.png'),pngA);fs.writeFileSync(path.join(out,id+'-'+width+'-colour-b.png'),pngB);
          await page.reload();await page.locator('#product-add').waitFor();assert.equal(await page.locator(`[data-color="${last}"]`).getAttribute('aria-pressed'),'true');
          await switchLanguage(page,'EN');assert.doesNotMatch(await page.locator('.product-color-heading').innerText(),/^Couleur\s*:/,'English colour field label');assert.doesNotMatch(await page.locator('#product-unit option:checked').innerText(),/^(paquets|pièces|boîtes|rouleaux|cartouches)$/i,'English unit label');assert.equal(new URL(page.url()).searchParams.get('color'),last);assert.equal(await page.locator(`[data-color="${last}"]`).getAttribute('aria-pressed'),'true');
          await noOverflow(page);await screenshot(page,id+'-'+width+'-en');await switchLanguage(page,'FR');
          const format=page.locator('#product-format');if(await format.count()){const value=await format.locator('option').evaluateAll(opts=>opts.find(o=>o.value)?.value);if(value)await format.selectOption(value);}
          const input=page.locator('#product-quantity'),step=await input.getAttribute('step');await input.fill(String(Number(step)||1));await page.locator('#product-add').click();await page.locator('#product-added').waitFor({state:'visible'});
          const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir-shopping-list-v1')));assert.equal(stored.items.find(x=>x.materialId===id)?.colorId,last);
          await screenshot(page,id+'-'+width+'-fr');
          await ready(page,base,'selection.html');const cartRow=page.locator('.selection-item').filter({has:page.locator(`a[href*="id=${id}"]`)});await cartRow.first().waitFor();
          assert.equal(await cartRow.first().locator('[data-cart-color]').inputValue(),last);await page.reload();await page.locator('[data-cart-color]').first().waitFor();
          const reloaded=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir-shopping-list-v1')));assert.deepEqual(reloaded,stored);await switchLanguage(page,'EN');assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('mir-shopping-list-v1'))),stored);await switchLanguage(page,'FR');await noOverflow(page);
        }
        return {colours:options.length,geometry,difference,spread:spread(pngB)};
      });
      await check(width+' two-tone grain visible',async()=>{
        const id='canexel-ridgewood-d5';await ready(page,base,'produit.html?id='+id);const twoTone=expected(id).find(c=>c.finishGroup==='two-tone'&&/Sierra/i.test(c.name))||expected(id).find(c=>c.finishGroup==='two-tone');assert.ok(twoTone,'two-tone reference required');await chooseColour(page,twoTone.id);const png=await page.locator('#product-photo').screenshot({animations:'disabled'}),s=spread(png);assert.ok(s.luminanceLevels>20&&s.p90-s.p10>15,'two-tone material has no visible tonal range: '+JSON.stringify(s));fs.writeFileSync(path.join(out,'two-tone-'+width+'.png'),png);return {id:twoTone.id,...s};
      });
      for(const id of ['canexel-touch-up-284ml','hardie-colorplus-touch-up-kit'])await check(width+' touch-up '+id,async()=>{
        await ready(page,base,'produit.html?id='+id);const options=await paletteCheck(page,id),photo=page.locator('#product-photo');
        if(id.startsWith('canexel')){
          const a=options.find(c=>c.id==='canexel-blanc'),b=options.find(c=>c.id==='canexel-noir');assert.ok(a&&b);await chooseColour(page,a.id);await page.locator('canvas[data-mir-canexel-pot]').waitFor();await page.waitForTimeout(150);const pngA=await photo.screenshot({animations:'disabled'});await chooseColour(page,b.id);await page.waitForTimeout(150);const pngB=await photo.screenshot({animations:'disabled'}),d=pixels(pngA,pngB);assert.ok(d.changedRatio>.002,'pot does not reflect selection');const dimensions=await photo.locator('canvas').evaluate(n=>({w:n.width,h:n.height}));assert.deepEqual(dimensions,{w:600,h:600});fs.writeFileSync(path.join(out,'touch-up-white-'+width+'.png'),pngA);fs.writeFileSync(path.join(out,'touch-up-black-'+width+'.png'),pngB);
          for(const name of ['Bois de grange','Renard roux','Rouge campagne','Yellowstone']){const c=expected(id).find(c=>c.name===name);assert.ok(c,name+' existing legacy touch-up removed');await chooseColour(page,c.id);assert.ok(await photo.locator('img').count()>0,'legacy colour retains real container photo');assert.match(await page.locator('.product-gallery').innerText(),/teinte non représentée/i);}
        }
        await chooseColour(page,options.at(-1).id);await page.reload();await page.locator('#product-add').waitFor();assert.equal(await page.locator(`[data-color="${options.at(-1).id}"]`).getAttribute('aria-pressed'),'true');await noOverflow(page);await screenshot(page,'touch-up-'+id+'-'+width);return {colours:options.length};
      });
      await check(width+' viewport evidence',async()=>{
        for(const id of representative){
          await ready(page,base,'produit.html?id='+id);await page.locator('#product-photo svg').waitFor();
          for(const lang of ['FR','EN']){
            if((await page.locator('html').getAttribute('lang'))!==(lang==='EN'?'en-CA':'fr-CA'))await switchLanguage(page,lang);
            await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await page.waitForTimeout(200);
            await page.screenshot({path:path.join(out,id+'-'+width+'-'+lang.toLowerCase()+'-viewport-top.png'),animations:'disabled'});
            const last=await page.locator('[data-color]').last().getAttribute('data-color');await chooseColour(page,last);await page.evaluate(()=>document.activeElement?.blur());
            const rect=await page.locator('#product-photo').boundingBox();assert.ok(rect.y>=-1&&rect.y+rect.height<=height+1,'sample remains on screen');
            await page.screenshot({path:path.join(out,id+'-'+width+'-'+lang.toLowerCase()+'-viewport-colour.png'),animations:'disabled'});
          }
          await switchLanguage(page,'FR');
        }
      });
      for(const id of ['hardieplank-select-725','hardieplank-smooth-725','hardieplank-select-525','hardieplank-smooth-525'])await check(width+' unavailable '+id,async()=>{
        await ready(page,base,'produit.html?id='+id);assert.equal(await page.locator('#product-add').count(),0);assert.match(await page.locator('#product-detail').innerText(),/indisponible|introuvable|available|not found/i);
      });
      await check(width+' legacy incompatible cart',async()=>{
        await ready(page,base,'boutique.html?brand=James%20Hardie');await page.evaluate(ids=>localStorage.setItem('mir-shopping-list-v1',JSON.stringify({version:1,project:'QA local non envoyé',items:ids.map(id=>({materialId:id,brand:'James Hardie',name:id,quantity:1,unit:'pièces',colorId:'hardie-blanc-arctique',colorName:'Blanc arctique'}))})),excluded);
        await ready(page,base,'selection.html');await page.locator('.selection-item').first().waitFor();assert.match(await page.locator('#selection-items').innerText(),/indisponible|retiré/i);assert.equal(await page.locator('#cart-estimate').getAttribute('aria-disabled'),'true');assert.equal(await page.evaluate(()=>window.MIRCommerceValidateCart().ok),false);assert.equal(await page.locator('#cart-estimate').isDisabled(),true);await page.evaluate(()=>window.MIREstimate.open('cart'));await page.locator('#estimate-errors').waitFor();assert.match(await page.locator('#estimate-errors').innerText(),/retiré|retirez/i);assert.equal(await page.locator('#estimate-send').isDisabled(),true);await page.locator('#estimate-close').click();
        await page.locator('#mir-project-dossier>summary').click();const downloadPromise=page.waitForEvent('download');await page.locator('#selection-export').click();const download=await downloadPromise;const payload=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.deepEqual(payload.items,[]);await noOverflow(page);await screenshot(page,'legacy-cart-'+width);
      });
      await check(width+' javascript errors',()=>assert.deepEqual(errors,[]));await context.close();
    }
    const compact=await browser.newContext({viewport:{width:350,height:780},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await compact.route('**/*',route=>new URL(route.request().url()).origin===base&&['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());const compactPage=await compact.newPage();
    for(const id of representative)await check('350 labels '+id,async()=>{await ready(compactPage,base,'produit.html?id='+id);await paletteCheck(compactPage,id);await noOverflow(compactPage);const clipped=await compactPage.locator('.mir-colour-label').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1).map(n=>n.textContent));assert.deepEqual(clipped,[],'colour labels clipped');await screenshot(compactPage,id+'-350');});await compact.close();
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));report.sourceHashesAfter=Object.fromEntries(Object.keys(report.sourceHashes).map(filename=>[filename,require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(dist,filename))).digest('hex')]));report.sourcesStable=JSON.stringify(report.sourceHashes)===JSON.stringify(report.sourceHashesAfter);report.requests=requests.length;report.blocked=blocked;report.nonReadLocalRequests=requests.filter(r=>!['GET','HEAD'].includes(r.method));report.passed=report.checks.filter(x=>x.pass).length;report.failed=report.checks.filter(x=>!x.pass).length;fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify({passed:report.passed,failed:report.failed,requests:report.requests,blocked:blocked.length}));if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
