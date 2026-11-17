'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..');
const {serve}=require(path.join(root,'tests/helpers/mir-static-http.cjs'));
const args=process.argv.slice(2);const arg=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const phase=arg('--phase','before'),source=path.resolve(arg('--source',path.join(root,'dist')));
if(!['before','after'].includes(phase))throw Error('phase must be before or after');
const sizes=[{width:1440,height:1100},{width:390,height:844},{width:834,height:1112}];
(async()=>{const server=await serve(source),browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const results=[];
 try {for(const size of sizes)for(const view of ['brands','all']){
 const ctx=await browser.newContext({viewport:size,reducedMotion:'reduce',hasTouch:size.width<1100,serviceWorkers:'block'});const remote=[],errors=[];
 await ctx.route('**/*',route=>{const req=route.request();if(new URL(req.url()).origin!==server.base||!['GET','HEAD'].includes(req.method())){remote.push({method:req.method(),url:req.url().split('?')[0]});return route.abort();}return route.continue();});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(server.base+'/boutique.html?view='+view+'&recette=1');
 const selector=view==='brands'?'.brand-collection-card':'.shop-card';await page.locator(selector).first().waitFor();
 await page.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('img').forEach(i=>i.loading='eager');await Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,6000))]);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
 const cards=await page.locator(selector).evaluateAll(els=>els.map(el=>{const media=el.querySelector('.brand-collection-image,.shop-card-photo'),img=media?.querySelector('img'),r=media?.getBoundingClientRect(),s=media?getComputedStyle(media):{},is=img?getComputedStyle(img):{},ir=img?.getBoundingClientRect();return {id:el.dataset.shopCard||null,title:el.querySelector('h3')?.textContent.trim(),href:el.querySelector('a')?.getAttribute('href')||el.getAttribute('href'),frame:media?.dataset.framing||media?.dataset.photoType,media:{width:r?.width,height:r?.height,aspect:s.aspectRatio,overflow:s.overflow,background:s.backgroundColor},image:img?{src:img.getAttribute('src'),naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,width:ir.width,height:ir.height,objectFit:is.objectFit,objectPosition:is.objectPosition,transform:is.transform}:null,wrapper:media?.querySelector('.trim-wrapper')?.getAttribute('style')||null};}));
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(__dirname,`${phase}-${view}-${size.width}.png`)});
 await page.locator(selector).first().evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-38,behavior:'instant'}));await page.screenshot({path:path.join(__dirname,`${phase}-${view}-${size.width}-grille.png`)});
 const width=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));results.push({phase,view,...size,...width,cards,errors,remoteRequestsBlocked:remote});assert.equal(width.scroll,width.viewport,'No global horizontal overflow');assert.equal(errors.length,0,'No JS errors');await ctx.close();console.log(`${phase} ${view} ${size.width}: ${cards.length} cartes`);
 }}finally{await browser.close();await server.close();fs.writeFileSync(path.join(__dirname,phase+'-audit.json'),JSON.stringify({phase,source,createdAt:new Date().toISOString(),results},null,2)+'\n');}
})();
