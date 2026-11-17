'use strict';
/* Targeted visual regression only: two CSS files, local GET/HEAD, no submissions. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright'),{serve}=require('./helpers/mir-static-http.cjs');
const root=path.resolve(__dirname,'..'),baseline='632563d5cceb1359c01c23545d2d93362dbbe33b';
const output=path.join(root,'docs/verification/pliage-harmonie-20261117/mobile-footer-qa');
fs.mkdirSync(output,{recursive:true});
const cssFiles=['mir-prestige.css','mir-client-pliage.css'];
const oldCSS=Object.fromEntries(cssFiles.map(name=>[name,execFileSync('git',['show',baseline+':dist/'+name],{cwd:root})]));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={baseline,sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),createdAt:new Date().toISOString(),scope:'Chromium emulated viewports; local GET/HEAD only; physical devices and Safari not certified',hashes:{before:{},after:{}},cases:[],checks:[],errors:[],blocked:[]};
for(const name of cssFiles){report.hashes.before[name]=hash(oldCSS[name]);report.hashes.after[name]=hash(fs.readFileSync(path.join(root,'dist',name)));}
function check(name,fn){try{fn();report.checks.push({name,pass:true});console.log('PASS '+name);}catch(e){report.checks.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message);}}
function save(){report.passed=report.checks.every(x=>x.pass)&&!report.executionError;fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');}
function overlaps(a,b){return a&&b&&Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;}
function near(a,b,label){assert(Math.abs(a-b)<=1,label+': '+a+' vs '+b);}
async function capture(browser,base,item,phase){
 const context=await browser.newContext({viewport:{width:item.width,height:item.height},reducedMotion:'reduce',hasTouch:item.width<1000,serviceWorkers:'block'});
 await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==base||!['GET','HEAD'].includes(request.method())){report.blocked.push({phase,path:url.origin+url.pathname,method:request.method()});return route.abort();}const name=url.pathname.split('/').at(-1);if(phase==='before'&&Object.hasOwn(oldCSS,name))return route.fulfill({contentType:'text/css',body:oldCSS[name]});return route.continue();});
 try{
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push({phase,page:item.name,width:item.width,error:e.message}));
  await page.goto(base+'/test/'+item.url,{waitUntil:'domcontentloaded'});await page.locator('body.mir-prestige').waitFor({state:'attached'});await page.locator('.mir-signature-footer').waitFor();await page.locator('[data-mir-test-banner]').waitFor();
  if(item.name==='product')await page.locator('#product-add').waitFor();
  await page.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('img').forEach(i=>i.loading='eager');await Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,2000))]);scrollTo(0,document.documentElement.scrollHeight);});
  await page.waitForTimeout(250);await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(100);
  const state=await page.evaluate(()=>{
   const rect=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   const visible=n=>!!n&&n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden'&&getComputedStyle(n).display!=='none';
   const textRect=n=>{if(!n)return null;const r=document.createRange();r.selectNodeContents(n);const b=r.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
   const footer=document.querySelector('.mir-signature-footer'),logo=footer.querySelector('.mir-signature-footer-logo'),phrase=footer.querySelector('p'),nav=footer.querySelector('nav'),badge=document.querySelector('[data-mir-test-banner]'),tabs=document.querySelector('.mir-mobile-tabs');
   const links=[...footer.querySelectorAll('nav a')].map(n=>({text:n.textContent.trim(),href:n.getAttribute('href'),visible:visible(n),rect:rect(n),textRect:textRect(n)}));
   return {viewport:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth},footer:{rect:rect(footer),logo:rect(logo),image:rect(logo.querySelector('img')),logoVisible:visible(logo),phraseVisible:visible(phrase),phrase:phrase.textContent.trim(),phraseRect:textRect(phrase),navVisible:visible(nav),links},badge:{rect:rect(badge),visible:visible(badge),text:badge.textContent,pseudo:getComputedStyle(badge,'::before').content},tabs:{visible:visible(tabs),rect:rect(tabs),links:[...(tabs?.querySelectorAll('a')||[])].map(n=>({text:n.textContent.trim(),visible:visible(n),rect:rect(n),icon:rect(n.querySelector('span')),label:rect(n.querySelector('small'))}))}};
  });
  state.screenshot=phase+'-'+item.name+'-'+item.width+'.png';await page.screenshot({path:path.join(output,state.screenshot),animations:'disabled'});return state;
 }finally{await context.close();}
}
(async()=>{
 let browser;const server=await serve(path.join(root,'.prestige-preview'));
 try{
  const guard='mir-test-guard.js',oldGuard=execFileSync('git',['show',baseline+':dist/'+guard],{cwd:root});report.guardHash=hash(fs.readFileSync(path.join(root,'dist',guard)));check('TEST guard logic unchanged',()=>assert.equal(report.guardHash,hash(oldGuard)));
  browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  const items=[...[{width:360,height:780},{width:390,height:844},{width:834,height:1112},{width:1440,height:1050}].map(size=>({name:'pliage',url:'pliage.html',...size})),{name:'product',url:'produit.html?id=st-laurent-lap-625',width:390,height:844}];
  for(const item of items){
   const row={name:item.name,width:item.width,before:await capture(browser,server.base,item,'before'),after:await capture(browser,server.base,item,'after')};report.cases.push(row);const a=row.after,b=row.before,label=item.name+' '+item.width;
   check(label+' footer content retained',()=>{assert.deepEqual(a.footer.links.map(x=>[x.text,x.href]),b.footer.links.map(x=>[x.text,x.href]));assert.equal(a.footer.links.length,5);assert.equal(a.footer.phrase,b.footer.phrase);assert(a.footer.logoVisible&&a.footer.phraseVisible);});
   check(label+' no horizontal overflow',()=>assert(a.viewport.scrollWidth<=item.width+1));
   check(label+' TEST badge retained',()=>{assert(a.badge.visible);assert.equal(a.badge.text,b.badge.text);assert.match(a.badge.text,/TEST.*envois externes désactivés/);});
   if(item.width<=600){
    check(label+' compact footer with logo and phrase only',()=>{assert.equal(a.footer.navVisible,false);assert.equal(a.footer.links.filter(x=>x.visible).length,0);assert(a.footer.rect.height<=110,'footer height '+a.footer.rect.height);assert(a.footer.rect.height<=b.footer.rect.height*.65,'footer reduction insufficient');assert(a.footer.image.width<=b.footer.image.width*.75,'logo reduction insufficient');assert(a.footer.logo.height>=44,'logo tap target');assert(a.footer.phraseRect.left>=0&&a.footer.phraseRect.right<=item.width+1,'signature clipped');});
    check(label+' fixed mobile navigation remains usable',()=>{assert(a.tabs.visible);assert.equal(a.tabs.links.length,5);for(const link of a.tabs.links){assert(link.visible);assert(link.rect.height>=44&&link.rect.width>=44,link.text+' tap target');for(const target of [link.icon,link.label]){assert(target&&target.width>0&&target.height>0,link.text+' icon/label visible');assert(!overlaps(a.badge.rect,target),'TEST badge overlaps '+link.text);assert(target.left>=-1&&target.right<=item.width+1&&target.bottom<=item.height+1,link.text+' clipped');}}});
    check(label+' badge clear of footer signature',()=>{assert(!overlaps(a.badge.rect,a.footer.image));assert(!overlaps(a.badge.rect,a.footer.phraseRect));assert.match(a.badge.pseudo,/TEST/);});
   }else{
    check(label+' tablet/desktop footer geometry unchanged',()=>{near(a.footer.rect.height,b.footer.rect.height,'footer height');near(a.footer.rect.width,b.footer.rect.width,'footer width');near(a.footer.image.width,b.footer.image.width,'logo width');near(a.footer.image.height,b.footer.image.height,'logo height');assert(a.footer.navVisible);assert.equal(a.footer.links.filter(x=>x.visible).length,5);for(let i=0;i<5;i++){near(a.footer.links[i].rect.width,b.footer.links[i].rect.width,'link width');near(a.footer.links[i].rect.height,b.footer.links[i].rect.height,'link height');near(a.footer.links[i].rect.left-a.footer.rect.left,b.footer.links[i].rect.left-b.footer.rect.left,'link x');near(a.footer.links[i].rect.top-a.footer.rect.top,b.footer.links[i].rect.top-b.footer.rect.top,'link y');}});
   }
   save();
  }
  check('no browser JavaScript errors',()=>assert.deepEqual(report.errors,[]));
 }catch(e){report.executionError=e.message;console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();await server.close();save();}
 console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,checks:report.checks.length,failed:report.checks.filter(x=>!x.pass).length,externalTransmitted:0}));if(!report.passed)process.exitCode=1;
})();
