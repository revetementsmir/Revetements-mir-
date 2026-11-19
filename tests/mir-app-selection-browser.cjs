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
const supplemental=String.raw`;(function(){const make=window.MIRPortalClient.create;window.MIRPortalClient.create=function(){const client=make.apply(this,arguments);client.chatSearch=async function(query){const x=window.__fieldFixture;x.calls.push(['chatSearch',query]);return{items:(x.searchMessages||[]).filter(m=>m.body.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')))}};client.chatMessages=async function(id){const x=window.__fieldFixture;return{items:(x.searchMessages||[]).filter(m=>m.conversationId===id),hasMore:false}};client.ackChatMessage=async function(){return{readAt:new Date().toISOString()}};client.helpFAQ=async()=>[{kind:'faq',category:'order',question:'Où suivre ma demande de matériel?',answer:'Ouvrez Commande puis Mes commandes.'}];client.supportSnapshot=async()=>({conversations:[]});client.notificationCenter=async()=>({items:[],unreadCount:0,nextBefore:null});const dossier=client.jobDossier.bind(client);client.jobDossier=async function(id){const result=await dossier(id);return{...result,documents:[{name:'Plan de façade — recette locale',version:'QA1',object_path:'fixture/plan-facade.pdf',published_at:'2026-11-18T12:00:00Z'}]}};return client;};})();`;
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
const navigationReferences=new WeakMap();
const results={sourceSha:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),referenceSha:reference,scope:'all employee and team-lead pages share the approved desktop-home theme',physicalDevice:false,backend:'local fixture only',checks:[],screens:[],homePunchComparisons:[]};
function pass(name,detail){checks++;results.checks.push({name,result:'passed',...detail});}
async function screenshot(page,name){await page.locator('#portal-toast.visible').waitFor({state:'hidden',timeout:6000});await page.screenshot({path:path.join(out,name),fullPage:true});results.screens.push(name);}
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
async function homePunchStructure(page,view){
 return page.evaluate(view=>{
  const root=document.querySelector(view==='day'?'.field-home-list':'.field-punch-dial-page');
  const attrs=['data-view','data-route-job','data-field-request','data-lead-report','data-field-office','data-punch','data-job','data-field-dial-expand','data-field-movement'];
  return{root:root?.tagName,actions:[...(root?.querySelectorAll('button')||[])].map(button=>({label:button.textContent.replace(/\s+/g,' ').trim(),attrs:Object.fromEntries(attrs.filter(a=>button.hasAttribute(a)).map(a=>[a,button.getAttribute(a)]))})),choices:[...(root?.querySelectorAll('select')||[])].map(select=>({name:select.getAttribute('aria-label')||'',options:[...select.options].map(o=>({value:o.value,text:o.textContent,disabled:o.disabled}))})),timer:root?.querySelector('[role=timer]')?.textContent||null};
 },view);
}
async function commonTheme(page,name){
 const colors=await page.evaluate(()=>{
  const body=getComputedStyle(document.body),panels=[...document.querySelectorAll('#portal-content :is(.mg-card,.settings-card,.field-section,.field-job-card,.lead-card,.punch-totals>article),dialog[open]')].filter(e=>e.getBoundingClientRect().height>0).map(e=>({className:e.className,background:getComputedStyle(e).backgroundColor,font:getComputedStyle(e).fontFamily}));
  return{design:document.body.dataset.fieldDesign,bg:body.backgroundColor,color:body.color,font:body.fontFamily,accent:body.getPropertyValue('--field-accent').trim(),header:getComputedStyle(document.querySelector('#field-header')).backgroundColor,panels};
 });
 assert.equal(colors.design,'home-test',name+': common design');assert.equal(colors.bg,'rgb(36, 37, 34)',name+': anthracite body');assert.match(colors.font,/DM Sans/,name+': common font');assert.equal(colors.accent,'#bda889',name+': champagne accent');assert.equal(colors.header,'rgb(36, 37, 34)',name+': header');
 const dark=new Set(['rgba(0, 0, 0, 0)','rgb(36, 37, 34)','rgb(45, 46, 42)','rgb(53, 54, 48)','rgb(69, 66, 54)']);
 for(const panel of colors.panels)assert.ok(dark.has(panel.background),name+': panel must use the shared dark palette '+JSON.stringify(panel));
 return colors;
}
async function commonNavigation(page,name){
 const current=await page.evaluate(()=>{
  const nav=document.querySelector('#portal-navigation'),rect=e=>{const r=e.getBoundingClientRect();return Object.fromEntries(['x','y','width','height'].map(k=>[k,Math.round(r[k]*100)/100]));},style=e=>{const s=getComputedStyle(e);return{font:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,whiteSpace:s.whiteSpace,weight:s.fontWeight};};
  return{count:document.querySelectorAll('#portal-navigation').length,view:document.body.dataset.fieldView,background:getComputedStyle(nav).backgroundColor,rect:rect(nav),buttons:[...nav.querySelectorAll(':scope>button')].map(button=>{const label=button.querySelector('span'),range=document.createRange();range.selectNodeContents(label);return{view:button.dataset.view,label:label.textContent.trim(),active:button.getAttribute('aria-current')==='page',rect:rect(button),style:style(label),lineRects:[...range.getClientRects()].map(r=>({top:r.top,left:r.left,right:r.right,height:r.height}))};})};
 });
 assert.equal(current.count,1,name+': one common bottom menu');assert.equal(current.background,'rgb(36, 37, 34)');
 assert.deepEqual(current.buttons.map(b=>[b.view,b.label]),[['day','Accueil'],['command','Commande'],['punch','Punch'],['messages','Messages'],['more','Plus']],name+': same five destinations');
 const groups={command:'command',draw:'command',catalogue:'command',orders:'command',material:'command',punch:'punch','punch-hours':'punch',messages:'messages',more:'more',account:'more',expenses:'more',absences:'more','lead-team':'more',settings:'more',notifications:'more'};
 assert.deepEqual(current.buttons.filter(b=>b.active).map(b=>b.view),[groups[current.view]||'day'],name+': current navigation group');
 for(const button of current.buttons){assert.equal(new Set(button.lineRects.map(r=>Math.round(r.top))).size,1,name+': '+button.label+' must stay on one line');for(const r of button.lineRects)assert.ok(r.left>=button.rect.x-1&&r.right<=button.rect.x+button.rect.width+1,name+': label fits its own button');}
 const signature={background:current.background,rect:current.rect,buttons:current.buttons.map(({view,label,rect,style})=>({view,label,rect,style}))};
 const reference=navigationReferences.get(page);if(reference)assert.deepEqual(signature,reference,name+': navigation geometry and type stay identical between pages');else navigationReferences.set(page,signature);
 return current;
}
async function layout(page,name){
 const m=await page.evaluate(()=>{const nav=document.querySelector('#portal-navigation').getBoundingClientRect();return{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,nav:{top:nav.top,bottom:nav.bottom},bodyHeight:document.documentElement.scrollHeight};});
 assert.ok(m.scrollWidth<=m.width+1,name+': horizontal overflow '+JSON.stringify(m));assert.ok(m.nav.top>=0&&m.nav.bottom<=m.height+1,name+': navigation outside viewport '+JSON.stringify(m));
 const theme=await commonTheme(page,name),navigation=await commonNavigation(page,name);pass(name+' layout, theme and common navigation',{metrics:m,theme,navigation});
}
async function reachable(page,locator,name,{dialog=false}={}){
 await locator.waitFor({state:'visible'});await locator.evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const r=await locator.boundingBox(),bounds=await page.evaluate(()=>({header:document.querySelector('#field-header').getBoundingClientRect().bottom,nav:document.querySelector('#portal-navigation').getBoundingClientRect().top,height:innerHeight,width:innerWidth}));
 assert.ok(r&&r.x>=-1&&r.x+r.width<=bounds.width+1,name+': control fits horizontally');assert.ok(r.y>=(dialog?0:bounds.header)-1&&r.y+r.height<=(dialog?bounds.height:bounds.nav)+1,name+': control can be reached without being covered by fixed chrome '+JSON.stringify({r,bounds}));await locator.click({trial:true});
}
async function secondaryScreens(page,chef,width){
 const role=chef?'chef':'employee',prefix=role+' '+width+' secondary';
 const more=async()=>{await nav(page,'more');await page.locator('.mir-app-p10').waitFor();};
 const capture=async(name)=>{await layout(page,prefix+' '+name);if(width===390)await screenshot(page,`${role}-secondary-${name}-${width}.png`);};
 const entry=async(selector,ready)=>{await more();await page.locator('.mir-app-p10 '+selector).click();await page.locator(ready).waitFor();};
 const lastControl=async(name)=>{const controls=page.locator('#portal-content button:visible:not(:disabled),#portal-content input:visible:not(.mir-choice-source),#portal-content textarea:visible');if(await controls.count())await reachable(page,controls.last(),prefix+' '+name);};
 const closePortal=async()=>{await page.locator('#portal-dialog > [data-close-dialog]').click();await page.locator('#portal-dialog').waitFor({state:'hidden'});};
 const modal=async(name,ready)=>{await page.locator(ready).waitFor();await commonTheme(page,prefix+' '+name);await commonNavigation(page,prefix+' '+name);await reachable(page,page.locator('#portal-dialog > [data-close-dialog]'),prefix+' '+name+' close',{dialog:true});if(width===390)await screenshot(page,`${role}-dialog-${name}-${width}.png`);await closePortal();pass(prefix+' '+name+' real dialog, themed and closable');};

 await entry('[data-view="punch-hours"]:not([data-field-bank])','.punch-hours-page');await page.locator('#field-hours-filter').waitFor();await capture('hours');await reachable(page,page.locator('[data-field-hours-more]'),prefix+' history reload');
 await entry('[data-field-bank]','.punch-hours-page');assert.match(await page.locator('#portal-content').innerText(),/Banque d’heures/);assert.equal(await page.locator('[data-bank-request]').count(),0,'Disabled bank feature stays disabled');await capture('bank');
 await entry('[data-view="absences"]','.absence-compose');await page.locator('.absence-compose > summary').click();await page.locator('#absence-draft-form').waitFor();assert.equal(await page.locator('[name=startTime]').isVisible(),false);await capture('absences');await reachable(page,page.locator('#absence-draft-form button').last(),prefix+' absence draft action');
 await entry('[data-view="expenses"]','.expense-compose');await page.locator('.expense-compose > summary').click();await page.locator('#expense-draft-form').waitFor();await capture('expenses');await reachable(page,page.locator('#expense-draft-form button').last(),prefix+' expense draft action');
 await entry('[data-view="jobs"]','.field-job-list');await capture('jobs');await lastControl('job cards');await page.locator('[data-field-open-job]').first().click();await page.locator('.field-dossier [data-job-document]').waitFor();await capture('dossier');await lastControl('dossier footer');
 await nav(page,'day');await page.locator('.field-home [data-view="plans"]').click();await page.locator('[data-job-document]').waitFor();await capture('plans');await reachable(page,page.locator('[data-job-document]').first(),prefix+' published document');
 await nav(page,'day');await page.locator('.field-home [data-field-request="photo"]').click();await modal('photo','#field-request-form[data-kind="photo"]');
 await entry('[data-view="notifications"]','.notifications-page');await capture('notifications');await lastControl('notification filters');
 await entry('[data-view="settings"]','#harmony-settings-form');assert.ok(await page.getByText('Anthracite MIR',{exact:true}).isVisible());assert.ok(await page.locator('[name=textSize][value=large]').isVisible());assert.ok(await page.locator('[name=highContrast]').isVisible());await capture('settings');await reachable(page,page.locator('[data-settings-reset]'),prefix+' settings footer');
 await more();await page.locator('[data-field-request="tool"]').click();await modal('tool','#field-request-form[data-kind="tool"]');
 await page.locator('[data-field-profile]').click();await modal('profile','#portal-dialog #portal-signout');
 await more();await page.locator('[data-field-help]').click();const help=page.getByRole('dialog',{name:'Centre d’aide MIR',exact:true});await help.waitFor();await help.getByText('Où suivre ma demande de matériel?',{exact:true}).waitFor();await commonTheme(page,prefix+' help');await commonNavigation(page,prefix+' help');await reachable(page,help.getByRole('button',{name:'Fermer',exact:true}),prefix+' help close',{dialog:true});if(width===390)await screenshot(page,`${role}-dialog-help-${width}.png`);await help.getByRole('button',{name:'Fermer',exact:true}).click();await help.waitFor({state:'hidden'});pass(prefix+' help actual modal closes and returns to common menu');
 await nav(page,'command');await page.locator('.mir-app-orders-link').click();await page.locator('.mir-app-order-actions').waitFor();await capture('orders');await page.getByRole('button',{name:'Matériel et livraisons',exact:true}).click();await page.locator('.employee-material').waitFor();await capture('deliveries');await page.locator('[data-material-tab=issues]').click();await reachable(page,page.locator('[data-delivery-issue]'),prefix+' delivery issue action');
 if(chef){await entry('[data-view="lead-team"]','.lead-team-list');await capture('team');await reachable(page,page.locator('[data-field-tasks]'),prefix+' team tasks');await more();await page.locator('[data-lead-report]').click();await modal('daily-report','#lead-report-form');}
}
async function seedMessages(page){await page.evaluate(()=>{const x=__fieldFixture,s=x.state,id=s.actorId,now=new Date().toISOString();s.messaging={...s.messaging,contacts:[{id:'assistant',name:'Esther Exemple',role:'assistant'},{id:'colleague',name:'Camille Exemple',role:'employee'}],teams:[{id:'team-one',name:'Mon équipe'}],conversations:[{id:'job-one',kind:'job',jobId:s.jobs[0].id,jobName:s.jobs[0].name,unread:2,lastMessage:{body:'Le plan de façade est prêt.',sentAt:now}},{id:'job-two',kind:'job',jobId:s.jobs[1].id,jobName:s.jobs[1].name,unread:0,lastMessage:{body:'Les documents du chantier.',sentAt:now}},{id:'team-one-chat',kind:'team',teamId:'team-one',unread:1,lastMessage:{body:'Matériel arrivé au chantier.',sentAt:now}},{id:'private-one',kind:'private',participants:[id,'colleague'],unread:0,lastMessage:{body:'Peux-tu joindre la photo?',sentAt:now}}],messages:[],unreadCount:3};x.searchMessages=[{id:'search-message',conversationId:'job-one',senderId:'colleague',body:'Le plan de façade est prêt.',sentAt:now,myReadAt:now}];x.replaceSnapshot();});}
(async()=>{
 server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
 try{
  browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
  await desktopReference();
  // The user extended the approved homepage theme to ALL app screens.
  // Keep the original home/Punch composition and actions, not the old colors.
  for(const chef of [false,true]){
   const a=await open(chef,390,844,true),b=await open(chef,390,844,false);
   for(const view of ['day','punch']){
    await nav(a.page,view);await nav(b.page,view);const before=await geometry(a.page,view),after=await geometry(b.page,view);
    const original=await homePunchStructure(a.page,view),current=await homePunchStructure(b.page,view);
    await screenshot(a.page,`before-${chef?'chef':'employee'}-${view}-390.png`);await screenshot(b.page,`after-${chef?'chef':'employee'}-${view}-390.png`);
    results.homePunchComparisons.push({role:chef?'chef':'employee',view,result:'original composition and actions retained; approved anthracite theme applied',before,after,original,current});
    assert.deepEqual(current,original,`${chef?'Chef':'Employé'} ${view}: original actions, choices and clock stay intact`);
    for(const element of after)assert.ok(!element.missing&&element.rect.width>0&&element.rect.height>0,view+': original principal element remains rendered '+element.sel);
    const box=sel=>after.find(x=>x.sel===sel).rect,navBox=box('#portal-navigation'),headerBox=box('#field-header');
    if(view==='day'){const job=box('.field-job-hero'),action=box('.field-home-punch');assert.ok(job.y>=headerBox.y+headerBox.height-1);assert.ok(action.y>=job.y+job.height-1&&action.y+action.height<=navBox.y+1,'Home keeps chantier then primary Punch action above navigation');}
    else{const dial=box('.field-clock-dial'),action=box('.field-round-action');assert.ok(Math.abs(dial.width-dial.height)<2,'The Punch clock stays circular');assert.ok(action.y+action.height<=navBox.y+1,'Punch action stays above navigation');assert.equal(current.timer,'00:00:00');}
    await layout(b.page,(chef?'Chef':'Employé')+' '+view+' themed original composition');pass((chef?'Chef':'Employé')+' '+view+' actions and composition preserved');
   }
   await a.page.close();await b.page.close();
  }
  for(const chef of [false,true])for(const width of [360,390,430,834,1440]){
   const role=chef?'chef':'employee',{page,errors}=await open(chef,width,width>1000?1000:844);
   try{
    for(const view of ['day','punch']){await nav(page,view);await layout(page,role+' '+width+' '+view);if(width!==390)await screenshot(page,`${role}-${view}-${width}.png`);}
    await nav(page,'command');await page.locator('.mir-app-c02').waitFor();assert.equal(await page.locator('.mir-app-c02 h1').innerText(),'Commande');await page.locator('.mir-app-product-list [data-field-product]').first().waitFor();assert.ok(await page.locator('.mir-app-product-list .field-store-item').count()<=24);assert.ok(await page.locator('.mir-app-product-list .mir-app-product-thumb').first().isVisible());
    assert.equal(await page.locator('body').getAttribute('data-field-design'),'home-test');assert.ok(await page.locator('[data-field-catalogue="fold"]').isVisible());assert.equal(await page.locator('[data-field-draw]').count(),0,'Only Magasin and Pliages remain in the outer navigation');assert.ok(await page.locator('[data-field-catalogue=material]').isVisible());
    const colors=await page.evaluate(()=>{const s=getComputedStyle(document.body);return{bg:s.backgroundColor,font:s.fontFamily,accent:s.getPropertyValue('--field-accent').trim()};});assert.equal(colors.bg,'rgb(36, 37, 34)');assert.match(colors.font,/DM Sans/);assert.equal(colors.accent,'#bda889');pass(role+' '+width+' direct magasin',{colors});
    assert.equal(await page.locator('#employee-browse #order-job, #employee-browse #order-job-reference').count(),0,'Chantier chosen only at the cart');
    assert.equal(await page.locator('#employee-browse .field-store-footer, #employee-browse #catalogue-category').count(),0,'No duplicate cart button or permanent category selector');
    assert.equal(await page.locator('#field-header [data-field-cart]').count(),1,'The common header retains the cart');
    await page.locator('[data-field-store-filters]').click();await page.locator('#portal-dialog #field-filter-host #catalogue-category').waitFor({state:'attached'});
    const categoryOptions=await page.locator('#field-filter-host #catalogue-category option').count();assert.ok(categoryOptions>1,'The three-bar menu contains the actual categories');
    await page.getByRole('button',{name:'Voir les articles',exact:true}).click();await page.locator('#portal-dialog').waitFor({state:'hidden'});
    if(width===390){
     const visibleRows=await page.locator('.mir-app-product-list .field-store-item').evaluateAll(nodes=>{const list=document.querySelector('.field-store-results').getBoundingClientRect(),nav=document.querySelector('#portal-navigation').getBoundingClientRect();return{available:nodes.length,visible:nodes.filter(node=>{const r=node.getBoundingClientRect();return r.top>=list.top-1&&r.bottom<=Math.min(list.bottom,nav.top)+1;}).length,viewportHeight:innerHeight,listHeight:list.height,rowHeights:nodes.slice(0,5).map(n=>n.getBoundingClientRect().height)};});
     assert.ok(visibleRows.available>=5,'Existing catalogue fixture supplies at least five real entries');assert.ok(visibleRows.visible>=5,'Five complete product rows fit simultaneously '+JSON.stringify(visibleRows));pass(role+' five catalogue rows without chantier or duplicate cart',{visibleRows});
    }
    await layout(page,role+' '+width+' C02');await screenshot(page,`${role}-c02-${width}.png`);
    await page.locator('#catalogue-search').fill('zzqa-inexistant-article');await page.waitForFunction(()=>document.querySelectorAll('[data-field-product]').length===0);assert.ok(await page.locator('#catalogue-count').isVisible());await page.locator('#catalogue-search').fill('');await page.locator('.mir-app-product-list [data-field-product]').first().waitFor();pass(role+' '+width+' catalogue search');
    if(width===390){
     await page.locator('.mir-app-product-list [data-field-product]').first().click();const qty=page.locator('#portal-dialog [data-product-qty]');await qty.waitFor();assert.equal(await qty.inputValue(),'');const countBefore=await page.locator('#field-header [data-field-cart]').getAttribute('aria-label');await page.locator('#portal-dialog [data-add-item]').click();assert.equal(await page.locator('#field-header [data-field-cart]').getAttribute('aria-label'),countBefore);assert.equal(await qty.inputValue(),'');
     // Complete ordinary product choices, then add a real local cart line.
     for(const select of await page.locator('#portal-dialog select').all()){const options=await select.locator('option:not([disabled])').evaluateAll(es=>es.map(e=>e.value).filter(Boolean));if(options.length&&!await select.inputValue())await select.selectOption(options[0]);}
     await qty.fill('2');await page.locator('#portal-dialog [data-add-item]').click();if(await page.locator('#portal-dialog').isVisible())await page.locator('#portal-dialog > [data-close-dialog]').click();
     await page.locator('[data-field-catalogue="fold"]').click();await page.locator('iframe[src*="production.html"]').waitFor();const child=page.frameLocator('#field-drawing-frame');await child.locator('html[data-field-pliage03="true"]').waitFor();assert.ok(await child.locator('#client-choose-model').isVisible());assert.ok(await child.locator('#client-draw-profile').isVisible(),'Drawing remains available inside Pliages');await child.locator('#client-choose-model').click();await child.locator('[data-client-profile=l]').waitFor();const childTheme=await child.locator('body').evaluate(e=>({background:getComputedStyle(e).backgroundColor,font:getComputedStyle(e).fontFamily}));assert.equal(childTheme.background,'rgb(36, 37, 34)');assert.match(childTheme.font,/DM Sans/);pass(role+' terrain Pliage iframe shares the anthracite theme',{childTheme});await layout(page,role+' '+width+' pliage parent');await nav(page,'command');await page.locator('.mir-app-c02').waitFor();await page.locator('[data-field-cart]').last().click();await page.locator('#order-cart').waitFor({state:'visible'});assert.ok(await page.locator('#order-cart .cart-item').count()>0,'Added product must survive the folding journey');assert.equal(await page.locator('#order-cart [data-cart-qty]').first().inputValue(),'2');assert.equal(await page.locator('#order-cart #order-job').count(),1,'Chantier selection belongs to the cart');assert.equal(await page.locator('#order-cart [name=jobReference]').count(),1,'Unassigned chantier reference remains available at the cart');await layout(page,role+' '+width+' shared cart');await nav(page,'command');assert.ok(await page.locator('#employee-browse').isVisible(),'Commande returns from cart to the store');assert.match(await page.locator('#field-header [data-field-cart]').getAttribute('aria-label'),/Panier, 1 ligne/);pass(role+' quantity required and common cart retained');
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
    if(width===360||width===390)await secondaryScreens(page,chef,width);
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
