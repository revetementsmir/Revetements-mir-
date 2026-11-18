'use strict';
// Real Chromium renders with fictitious local fixtures. No account or backend writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),cp=require('node:child_process'),{once}=require('node:events');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),root=path.join(repo,'dist'),out=path.join(repo,'artifacts/app-selection');
const reference=process.env.MIR_APP_REFERENCE_SHA||'dd5bf49701aea2c3ac5fa46712b9fc94a1acd89e';
const fixture=require('./helpers/mir-field-fixture.cjs');
fs.mkdirSync(out,{recursive:true});
cp.execFileSync('git',['cat-file','-e',reference+'^{commit}'],{cwd:repo});
const baselineCache=new Map(),types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf'};
const supplemental=String.raw`;(function(){const make=window.MIRPortalClient.create;window.MIRPortalClient.create=function(){const client=make.apply(this,arguments);client.chatSearch=async function(query){const x=window.__fieldFixture;x.calls.push(['chatSearch',query]);return{items:(x.searchMessages||[]).filter(m=>m.body.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')))}};client.chatMessages=async function(id){const x=window.__fieldFixture;return{items:(x.searchMessages||[]).filter(m=>m.conversationId===id),hasMore:false}};client.ackChatMessage=async function(){return{readAt:new Date().toISOString()}};return client;};})();`;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),baseline=url.pathname.startsWith('/_baseline/'),pathname=baseline?url.pathname.slice('/_baseline'.length):url.pathname,file=path.resolve(root,'.'+decodeURIComponent(pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}
 try{
  let bytes;
  const rel=path.relative(repo,file).split(path.sep).join('/');
  if(baseline&&/\.(?:html|js|css|json)$/.test(file)){
   if(!baselineCache.has(rel))baselineCache.set(rel,cp.execFileSync('git',['show',reference+':'+rel],{cwd:repo,maxBuffer:25*1024*1024,stdio:['ignore','pipe','pipe']}));
   bytes=baselineCache.get(rel);
  }else bytes=fs.readFileSync(file);
  if(path.basename(file)==='portal-client.js')bytes=Buffer.concat([bytes,Buffer.from('\n;('+fixture.toString()+')();'+supplemental)]);
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(bytes);
 }catch(_){res.writeHead(404).end();}
});
let browser,base,checks=0;
const results={sourceSha:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),referenceSha:reference,physicalDevice:false,backend:'local fixture only',checks:[],screens:[],homePunchComparisons:[]};
function pass(name,detail){checks++;results.checks.push({name,result:'passed',...detail});}
async function screenshot(page,name){await page.screenshot({path:path.join(out,name),fullPage:true});results.screens.push(name);}
async function desktopReference(){
 const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'fr-CA',colorScheme:'dark'});
 try{
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto(base+'/_baseline/index.html');await page.locator('body.mir-prestige-home').waitFor();await page.evaluate(()=>document.fonts.ready);
  const styles=await page.evaluate(()=>Object.fromEntries(['body','.mir-prestige-home-hero','#hero-title','#hero-title em','.mir-prestige-home-lead','.mir-home-paths strong','#mir-prestige-header'].map(sel=>{const s=getComputedStyle(document.querySelector(sel));return[sel,{background:s.backgroundColor,color:s.color,font:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing}]})));
  assert.equal(styles['.mir-prestige-home-hero'].background,'rgb(36, 37, 34)');assert.match(styles.body.font,/DM Sans/);assert.match(styles['#hero-title'].font,/Arial/);assert.match(styles['#hero-title em'].font,/Georgia/);assert.equal(styles['#hero-title em'].color,'rgb(189, 168, 137)');
  results.desktopReference=styles;await screenshot(page,'reference-home-pc-1440.png');pass('approved PC homepage palette and fonts',{referenceSha:reference});
 }finally{await page.close();}
}
async function open(chef,width=390,height=844,baseline=false){
 const page=await browser.newPage({viewport:{width,height},colorScheme:'dark',locale:'fr-CA',timezoneId:'America/Toronto'});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'?r.continue():r.abort();});
 await page.goto(base+(baseline?'/_baseline':'')+'/chantier.html?recette=1'+(chef?'&chef=1':''));await page.locator('#field-header').waitFor();await page.waitForFunction(()=>document.querySelector('.field-job-hero')?.textContent.includes('141, rue du Chantier'));await page.evaluate(()=>document.fonts.ready);return{page,errors};
}
async function nav(page,view){await page.locator(`#portal-navigation [data-view="${view}"]`).click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function geometry(page,view){
 return page.evaluate(view=>{const sels=['body','#field-header','#portal-navigation',...(view==='day'?['.field-home-list','.field-home-top','.field-job-hero','.field-home-punch']:['.field-punch-clock','.field-punch-context','.field-clock-dial','.field-round-action'])];return sels.map(sel=>{const e=document.querySelector(sel);if(!e)return{sel,missing:true};const s=getComputedStyle(e),r=e.getBoundingClientRect();return{sel,background:s.backgroundColor,color:s.color,font:s.fontFamily,fontSize:s.fontSize,radius:s.borderRadius,padding:s.padding,rect:Object.fromEntries(['x','y','width','height'].map(k=>[k,Math.round(r[k]*100)/100]))};});},view);
}
async function layout(page,name){
 const m=await page.evaluate(()=>{const nav=document.querySelector('#portal-navigation').getBoundingClientRect();return{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,nav:{top:nav.top,bottom:nav.bottom},bodyHeight:document.documentElement.scrollHeight};});
 assert.ok(m.scrollWidth<=m.width+1,name+': horizontal overflow '+JSON.stringify(m));assert.ok(m.nav.top>=0&&m.nav.bottom<=m.height+1,name+': navigation outside viewport '+JSON.stringify(m));
 pass(name+' layout',{metrics:m});
}
async function seedMessages(page){await page.evaluate(()=>{const x=__fieldFixture,s=x.state,id=s.actorId,now=new Date().toISOString();s.messaging={...s.messaging,contacts:[{id:'assistant',name:'Esther Exemple',role:'assistant'},{id:'colleague',name:'Camille Exemple',role:'employee'}],teams:[{id:'team-one',name:'Mon équipe'}],conversations:[{id:'job-one',kind:'job',jobId:s.jobs[0].id,jobName:s.jobs[0].name,unread:2,lastMessage:{body:'Le plan de façade est prêt.',sentAt:now}},{id:'job-two',kind:'job',jobId:s.jobs[1].id,jobName:s.jobs[1].name,unread:0,lastMessage:{body:'Les documents du chantier.',sentAt:now}},{id:'team-one-chat',kind:'team',teamId:'team-one',unread:1,lastMessage:{body:'Matériel arrivé au chantier.',sentAt:now}},{id:'private-one',kind:'private',participants:[id,'colleague'],unread:0,lastMessage:{body:'Peux-tu joindre la photo?',sentAt:now}}],messages:[],unreadCount:3};x.searchMessages=[{id:'search-message',conversationId:'job-one',senderId:'colleague',body:'Le plan de façade est prêt.',sentAt:now,myReadAt:now}];x.replaceSnapshot();});}
(async()=>{
 server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
 try{
  browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
  await desktopReference();
  // Exact approved home/Punch baseline. Common navigation wording may change;
  // layout, colors and functional controls of these screens must stay intact.
  for(const chef of [false,true]){
   const a=await open(chef,390,844,true),b=await open(chef,390,844,false);
   for(const view of ['day','punch']){
    await nav(a.page,view);await nav(b.page,view);const before=await geometry(a.page,view),after=await geometry(b.page,view);
    assert.deepEqual(after,before,`${chef?'Chef':'Employé'} ${view}: old screen changed`);
    assert.notEqual(await b.page.locator('body').getAttribute('data-field-design'),'home-test');
    await screenshot(a.page,`before-${chef?'chef':'employee'}-${view}-390.png`);await screenshot(b.page,`after-${chef?'chef':'employee'}-${view}-390.png`);
    results.homePunchComparisons.push({role:chef?'chef':'employee',view,result:'identical measured layout and styles',before,after});pass((chef?'Chef':'Employé')+' '+view+' preserved');
   }
   await a.page.close();await b.page.close();
  }
  for(const chef of [false,true])for(const width of [360,390,430,834,1440]){
   const role=chef?'chef':'employee',{page,errors}=await open(chef,width,width>1000?1000:844);
   try{
    await nav(page,'command');await page.locator('.mir-app-c02').waitFor();assert.equal(await page.locator('.mir-app-c02 h1').innerText(),'Commande');await page.locator('.mir-app-product-list [data-field-product]').first().waitFor();assert.ok(await page.locator('.mir-app-product-list .field-store-item').count()<=24);assert.ok(await page.locator('.mir-app-product-list .mir-app-product-thumb').first().isVisible());
    assert.equal(await page.locator('body').getAttribute('data-field-design'),'home-test');assert.ok(await page.locator('[data-field-catalogue="fold"]').isVisible());assert.ok(await page.locator('[data-field-draw]').isVisible());
    const colors=await page.evaluate(()=>{const s=getComputedStyle(document.body);return{bg:s.backgroundColor,font:s.fontFamily,accent:s.getPropertyValue('--field-accent').trim()};});assert.equal(colors.bg,'rgb(36, 37, 34)');assert.match(colors.font,/DM Sans/);assert.equal(colors.accent,'#bda889');pass(role+' '+width+' direct magasin',{colors});
    await layout(page,role+' '+width+' C02');await screenshot(page,`${role}-c02-${width}.png`);
    await page.locator('#catalogue-search').fill('zzqa-inexistant-article');await page.waitForFunction(()=>document.querySelectorAll('[data-field-product]').length===0);assert.ok(await page.locator('#catalogue-count').isVisible());await page.locator('#catalogue-search').fill('');await page.locator('[data-field-product]').first().waitFor();pass(role+' '+width+' catalogue search');
    if(width===390){
     await page.locator('.mir-app-product-list [data-field-product]').first().click();const qty=page.locator('#portal-dialog [data-product-qty]');await qty.waitFor();assert.equal(await qty.inputValue(),'');const countBefore=await page.locator('[data-field-store-cart]').innerText();await page.locator('#portal-dialog [data-add-item]').click();assert.equal(await page.locator('[data-field-store-cart]').innerText(),countBefore);assert.equal(await qty.inputValue(),'');
     // Complete ordinary product choices, then add a real local cart line.
     for(const select of await page.locator('#portal-dialog select').all()){const options=await select.locator('option:not([disabled])').evaluateAll(es=>es.map(e=>e.value).filter(Boolean));if(options.length&&!await select.inputValue())await select.selectOption(options[0]);}
     await qty.fill('2');await page.locator('#portal-dialog [data-add-item]').click();if(await page.locator('#portal-dialog').isVisible())await page.locator('#portal-dialog > [data-close-dialog]').click();
     await page.locator('[data-field-catalogue="fold"]').click();await page.locator('iframe[src*="production.html"]').waitFor();await nav(page,'command');await page.locator('.mir-app-c02').waitFor();await page.locator('[data-field-cart]').last().click();await page.locator('#order-cart').waitFor({state:'visible'});assert.ok(await page.locator('#order-cart .cart-item').count()>0,'Added product must survive the folding journey');assert.equal(await page.locator('#order-cart [data-cart-qty]').first().inputValue(),'2');await nav(page,'command');assert.ok(await page.locator('#employee-browse').isVisible(),'Commande returns from cart to the store');assert.ok((await page.locator('[data-field-store-cart]').innerText()).startsWith('1'));pass(role+' quantity required and common cart retained');
    }
    await seedMessages(page);await nav(page,'messages');await page.locator('.mir-app-m08').waitFor();assert.equal(await page.locator('.mir-app-m08 h1').first().innerText(),'Messages');
    for(const [kind,expected]of [['job',2],['team',1],['private',1]]){await page.locator(`[data-field-message-filter="${kind}"]`).click();assert.equal(await page.locator('.chat-conversations [data-conversation]').count(),expected,kind+' filter');}
    await page.locator('[data-field-message-filter="job"]').click();await layout(page,role+' '+width+' M08');await screenshot(page,`${role}-m08-${width}.png`);pass(role+' '+width+' message filters');
    if(width===390){
     const search=page.locator('#chat-search-form input[name="query"]');if(!await search.isVisible())await page.locator('[data-field-message-search]').click();await search.fill('façade');await page.locator('#chat-search-form [type="submit"]').click();await page.locator('.chat-search-results [data-conversation="job-one"]').waitFor();assert.equal(await page.evaluate(()=>__fieldFixture.calls.filter(c=>c[0]==='chatSearch'&&c[1]==='façade').length),1);await page.locator('[data-chat-search-close]').click();
     await page.locator('[data-field-message-new]').click();await page.locator('[data-start-private="assistant"]').waitFor();assert.ok(await page.locator('[data-start-team="team-one"]').isVisible());await page.locator('[data-start-private="assistant"]').click();await page.locator('#message-form').waitFor();const draft=page.locator('#message-form textarea');await draft.fill('Brouillon QA conservé');await page.locator('[data-messages-back]').click();await page.locator('[data-field-message-filter="private"]').click();const cid=await page.evaluate(()=>__fieldFixture.state.messaging.conversations.find(c=>c.kind==='private'&&c.participants.includes('assistant')).id);await page.locator(`[data-conversation="${cid}"]`).click();assert.equal(await page.locator('#message-form textarea').inputValue(),'Brouillon QA conservé');pass(role+' search, new conversation and retained draft');
    }
    await nav(page,'more');await page.locator('.mir-app-p10').waitFor();for(const text of ['Mes heures','Banque d’heures','Congés et absences','Dépenses et reçus','Bris d’outil','Chantiers et documents','Avis','Préférences','Aide et contact du bureau'])assert.ok(await page.locator('.mir-app-p10').getByRole('button',{name:new RegExp(text)}).isVisible(),text);
    assert.equal(await page.locator('.mir-app-p10 [data-view="lead-team"]').count(),chef?1:0);await layout(page,role+' '+width+' P10');await screenshot(page,`${role}-p10-${width}.png`);pass(role+' '+width+' P10 permitted menu');
    assert.deepEqual(errors,[],role+' '+width+' JavaScript errors');
   }catch(error){
    const failure={role,width,error:String(error.stack||error),pageErrors:errors.slice(),screenshot:null};
    try{failure.metrics=await page.evaluate(()=>{const body=document.body,s=getComputedStyle(body),nav=document.querySelector('#portal-navigation'),rect=nav?.getBoundingClientRect();return{url:location.href,viewport:{width:innerWidth,height:innerHeight,devicePixelRatio,visual:visualViewport?{width:visualViewport.width,height:visualViewport.height,offsetTop:visualViewport.offsetTop,offsetLeft:visualViewport.offsetLeft}:null},document:{scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight},body:{className:body.className,dataset:{...body.dataset},background:s.backgroundColor,color:s.color,font:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,overflow:s.overflow,variables:Object.fromEntries(['--field-bg','--field-surface','--field-text','--field-muted','--field-border','--field-accent'].map(key=>[key,s.getPropertyValue(key).trim()]))},navigation:rect?{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right}:null,headings:Array.from(document.querySelectorAll('h1')).map(e=>e.textContent.trim())};});}catch(diagnosticError){failure.metricsError=String(diagnosticError);}
    try{const name=`${role}-failure-${width}.png`;await screenshot(page,name);failure.screenshot=name;}catch(screenshotError){failure.screenshotError=String(screenshotError);}
    (results.failures||(results.failures=[])).push(failure);
    throw error;
   }finally{await page.close();}
  }
  results.status='passed';results.count=checks;console.log(`MIR app selection: ${checks} checks passed, ${results.screens.length} genuine Chromium screenshots.`);
 }catch(error){results.status='failed';results.error=String(error.stack||error);throw error;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2));if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
