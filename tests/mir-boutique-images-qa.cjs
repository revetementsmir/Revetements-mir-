'use strict';
/* Offline regression check for the real 78-product catalogue and 20 covers.
 * Browser interactions stay local; no quote, account or network write occurs. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { serve } = require('./helpers/mir-static-http.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/verification/boutique-images-20261117');
const materialIds = new Set([
  'hardieplank-select-825', 'hardiepanel', 'allura-lap-825', 'maibec-moderne-emplus-6',
  'hardieplank-select-725', 'hardieplank-smooth-625', 'hardieplank-smooth-725', 'hardieplank-smooth-825',
  'hardiepanel-cedarmill', 'hardieshingle-straight', 'hardieshingle-staggered',
  'st-laurent-lap-825', 'st-laurent-v-groove-825', 'st-laurent-trim-35',
  'canexel-vstyle', 'canexel-cedrvue-9', 'canexel-board-batten',
  'maibec-clin-rainure-emplus-6', 'maibec-contemporain-emplus-6', 'maibec-board-batten-10',
  'allura-panel-smooth-4x10', 'allura-panel-traditional-4x10',
  'rialux-tiago', 'rialux-bolton', 'st-laurent-board-batten-12', 'qualityedge-truvent-hvs'
]);
const objectBrands = new Set(['JDP / Juste du Pin', 'Gentek Canada', 'Westlake Royal', 'Light Trim',
  'ADSEAL / Adfast', 'BECK Fastener Group', 'PRIME / Premier Outils Pro', 'Les Revêtements MIR', 'UNICO']);
const dynamicIds = ['mac-norwood', 'vicwest-bellara-plank135', 'rialux-bosco', 'jdp-akta-306-antique',
  'canexel-vstyle', 'canexel-cedrvue-9', 'canexel-ridgewood-d5', 'hardieplank-select-625',
  'st-laurent-lap-625', 'lighttrim-vfcs', 'canexel-touch-up-284ml', 'gentek-woodgrain2000-horizontal8'];
const results = [], issues = [], blocked = [], errors = [];
function problem(kind, detail) { issues.push({ kind, ...detail }); }
function measureCards() {
  const rect = element => { const r = element.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
  return [...document.querySelectorAll('[data-shop-card],.brand-collection-card')].filter(el => el.checkVisibility()).map(el => {
    const frame = el.querySelector('.shop-card-photo,.brand-collection-image');
    const viewport = frame.querySelector('.mir-photo-trim-viewport');
    const image = frame.querySelector('.card-preview>img,.card-preview>svg,.card-preview>canvas,.mir-screw-preview>img,.mir-photo-trim-viewport>img') || frame.querySelector('img,svg,canvas');
    const style = image && getComputedStyle(image);
    return { id:el.dataset.shopCard || el.querySelector('h3')?.textContent.trim(), frame:rect(frame),
      layout:frame.dataset.imageLayout || frame.dataset.framing, viewport:viewport && rect(viewport),
      image:image && { ...rect(image), tag:image.tagName.toLowerCase(), fit:style.objectFit,
        transform:style.transform, filter:style.filter, blend:style.mixBlendMode,
        src:image.getAttribute('src') || '', naturalWidth:image.naturalWidth || null,
        naturalHeight:image.naturalHeight || null, complete:image.complete,
        stableKey:image.getAttribute('data-mir-stable-siding'), viewBox:image.getAttribute('viewBox') },
      previewKind:frame.querySelector('.card-preview')?.dataset.previewKind || null };
  });
}
function checkGeometry(cards, width, stage) {
  const inside = (a,b) => a.x >= b.x-1.5 && a.y >= b.y-1.5 && a.x+a.width <= b.x+b.width+1.5 && a.y+a.height <= b.y+b.height+1.5;
  for (const card of cards) {
    const context = { width, stage, id:card.id };
    if (Math.abs(card.frame.width/card.frame.height-1.5) > .012) problem('frame-ratio', { ...context, frame:card.frame });
    if (!card.image) { problem('missing-image',context); continue; }
    if (card.viewport) {
      if (!inside(card.viewport,card.frame)) problem('trim-viewport-overflow',{...context,card});
      if (card.image.naturalWidth && Math.abs(card.image.width/card.image.height-card.image.naturalWidth/card.image.naturalHeight) > .025) problem('trim-source-stretched',{...context,card});
    } else if (!inside(card.image,card.frame)) problem('image-overflow',{...context,card});
    if (card.image.complete === false || (card.image.tag==='img' && !card.image.naturalWidth)) problem('image-not-decoded',{...context,card});
    if (card.layout==='object' && card.image.fit!=='contain') problem('object-cropped',{...context,card});
    if (card.image.transform!=='none' || card.image.filter!=='none' || card.image.blend!=='normal') problem('source-transformed',{...context,card});
  }
}
async function decode(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('.shop-card-photo img,.brand-collection-image img').forEach(i=>i.loading='eager');
    await Promise.all([...document.querySelectorAll('.shop-card-photo img,.brand-collection-image img')].map(i=>i.decode().catch(()=>{})));
    await new Promise(requestAnimationFrame);
  });
}
async function main() {
  fs.mkdirSync(out,{recursive:true});
  const server = await serve(path.join(root,'dist'));
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try {
    for (const width of [1440,834,390]) {
      const context = await browser.newContext({viewport:{width,height:1100},serviceWorkers:'block'});
      await context.route('**/*',route=>{
        const request=route.request(),url=new URL(request.url());
        if (url.origin!==server.base || !['GET','HEAD'].includes(request.method())) {
          blocked.push({url:url.origin+url.pathname,method:request.method()}); return route.abort();
        }
        return route.continue();
      });
      await context.addInitScript(()=>{
        window.__previewCalls=[];
        Object.defineProperty(window,'MIRMaterialPreview',{configurable:true,set(value){
          Object.defineProperty(window,'MIRMaterialPreview',{value,writable:true,configurable:true});
          const original=value.render;
          value.render=function(element,material,color){
            if(element.closest('[data-shop-card]')){
              const r=value.recipe(material,color);
              window.__previewCalls.push({id:material.id,kind:r.kind,src:r.src||'',image:r.image||null,
                brand:material.brand,photoType:r.image?value.photoType(r.image):null});
            }
            return original.call(this,element,material,color);
          };
        }});
      });
      const page=await context.newPage();page.on('pageerror',e=>errors.push({width,error:String(e)}));
      for (const view of ['brands','all']) {
        await page.goto(server.base+'/boutique.html?view='+view);
        await page.waitForFunction(()=>document.querySelectorAll('[data-shop-card],.brand-collection-card').length>=20);
        if(view==='all')await page.waitForFunction(()=>document.querySelectorAll('[data-shop-card]').length===78);
        await decode(page);
        const cards=await page.evaluate(measureCards);
        const expectedCount=view==='brands'?20:78;
        if(cards.length!==expectedCount)problem('card-count',{width,view,actual:cards.length,expected:expectedCount});
        for(const card of cards){
          const expected=view==='all'?(materialIds.has(card.id)?'material':'object'):(objectBrands.has(card.id)?'object':'material');
          if(card.layout!==expected)problem('classification',{width,view,id:card.id,actual:card.layout,expected});
        }
        checkGeometry(cards,width,view);
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
        if(overflow)problem('page-overflow',{width,view});
        results.push({width,view,cards});
      }
      if(width===1440){
        for(const id of dynamicIds){
          const card=page.locator('[data-shop-card="'+id+'"]');
          const initial=(await page.evaluate(measureCards)).find(x=>x.id===id);
          const buttons=card.locator('[data-card-color]'),count=await buttons.count();
          if(!count)continue;
          await card.locator('details').evaluate(el=>el.open=true);
          for(const index of [...new Set([0,Math.min(count-1,1)])]){
            await buttons.nth(index).click();
            await page.waitForFunction(id=>!document.querySelector('[data-shop-card="'+id+'"] .sample-loading'),id);
            await decode(page);
            const current=(await page.evaluate(measureCards)).find(x=>x.id===id);
            const recipe=await page.evaluate(id=>window.__previewCalls.filter(x=>x.id===id).at(-1),id);
            let expected='object';
            if(recipe?.kind==='manufacturer_sample' && recipe.brand!=='CanExel' && !/jdp|sphere|rialux-bosco/i.test(recipe.src))expected='material';
            if(recipe?.kind==='exact_variant' && ['sample','installed'].includes(recipe.photoType) && !/sphere|jdp|deckmart-/i.test(recipe.src))expected='material';
            // SVG colour previews retain their own geometry with contain even
            // when the surrounding card started as a material photograph.
            const expectedFit=current.image?.tag==='img' && expected==='material'?'cover':'contain';
            if(recipe && current.image?.fit!==expectedFit)problem('dynamic-framing',{width,id,index,layout:current.layout,actual:current.image?.fit,expected:expectedFit,recipe});
            if(initial.image?.stableKey && current.image?.stableKey!==initial.image.stableKey)problem('stable-geometry-changed',{id,index});
            checkGeometry([current],width,'colour-'+index);
            results.push({width,dynamic:id,index,recipe,current});
          }
        }
        for(const id of ['hardietrim-smooth-54-35','lighttrim-v299xl','beck-panelfast-ags100','jdp-akta-306-antique','mac-norwood','canexel-vstyle']){
          const card=page.locator('[data-shop-card="'+id+'"]');
          await card.screenshot({path:path.join(out,'qa-'+id+'.png')});
        }
      }
      await page.goto(server.base+'/produit.html?id=beck-panelfast-ags100');
      await page.waitForSelector('#product-photo img');
      await decode(page);
      const related=await page.evaluate(measureCards);
      if(related.length!==3)problem('related-count',{width,actual:related.length});
      checkGeometry(related,width,'related-product');
      const readMain=async target=>target.evaluate(async()=>{
        const frame=document.querySelector('#product-photo'),image=frame.querySelector('img');
        await image.decode().catch(()=>{});
        const f=frame.getBoundingClientRect(),r=image.getBoundingClientRect(),s=getComputedStyle(image);
        return {frameWidth:f.width,frameHeight:f.height,imageWidth:r.width,imageHeight:r.height,
          fit:s.objectFit,padding:s.padding,src:new URL(image.src).pathname};
      });
      const main=await readMain(page);
      results.push({width,product:'beck-panelfast-ags100',main,related});
      const baseline=process.env.MIR_IMAGES_BASELINE || '/tmp/mir-boutique-images-before-20261117/dist';
      if(fs.existsSync(path.join(baseline,'produit.html'))){
        const before=await serve(baseline),beforeContext=await browser.newContext({viewport:{width,height:1100},serviceWorkers:'block'});
        try{
          await beforeContext.route('**/*',route=>new URL(route.request().url()).origin===before.base && ['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
          const beforePage=await beforeContext.newPage();
          await beforePage.goto(before.base+'/produit.html?id=beck-panelfast-ags100');
          await beforePage.waitForSelector('#product-photo img');
          const oldMain=await readMain(beforePage);
          if(JSON.stringify(main)!==JSON.stringify(oldMain))problem('main-product-photo-changed',{width,before:oldMain,after:main});
          results.push({width,baselineMain:oldMain});
        }finally{await beforeContext.close();await before.close();}
      }
      await context.close();
    }
  } finally { await browser.close(); await server.close(); }
  if(errors.length)problem('javascript-errors',{errors});
  fs.writeFileSync(path.join(out,'image-qa-results.json'),JSON.stringify({createdAt:new Date().toISOString(),passed:issues.length===0,issues,blocked,results},null,2));
  console.log(JSON.stringify({passed:issues.length===0,issues,blockedRequests:blocked.length},null,2));
  process.exitCode=issues.length?1:0;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
