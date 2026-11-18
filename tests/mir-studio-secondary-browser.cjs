'use strict';
// Two secondary Studio entrances. Local files and downloads only; no backend.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),{once}=require('node:events'),{chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),phase=process.env.MIR_STUDIO_SECONDARY_PHASE||'after';
const baseline='e0cd92d9e6dd01b3f6697dd7de972df95839c8e1';
const out=path.resolve(process.env.MIR_STUDIO_SECONDARY_OUT||path.join(repo,'docs/verification/studio-harmonie-20261118/secondary'));
const folder=path.join(out,phase);fs.mkdirSync(folder,{recursive:true});
const report={phase,baseline,checks:[],captures:[],blocked:[],errors:[]};
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
function read(file){return phase==='before'?execFileSync('git',['show',baseline+':'+file],{cwd:repo,stdio:['ignore','pipe','ignore']}):fs.readFileSync(path.join(repo,file));}
function engine(html){return html.toString().match(/<script>\s*\(\(\)=>\{[\s\S]*?<\/script>/)?.[0];}
const server=http.createServer((req,res)=>{try{assert.equal(req.method,'GET');const p=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\//,'');if(p.includes('..'))throw Error('invalid path');const file=p==='studio-public.html'?'ops/studio-public/under-construction.html':'dist/'+p;const data=read(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
async function language(p,lang){const b=p.locator('[data-mir-locale="'+lang+'"]');if(!await b.isVisible()){const menu=p.locator('#mir-client-menu-button');if(await menu.isVisible())await menu.click();}await b.click();await p.waitForFunction(l=>document.documentElement.lang===l,lang);const menu=p.locator('#mir-client-menu-button');if(await menu.count()&&await menu.getAttribute('aria-expanded')==='true')await menu.click();}
async function main(){
 server.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  if(phase==='after'){const actual=engine(read('dist/studio.html'));assert.ok(actual);assert.equal(actual,engine(execFileSync('git',['show',baseline+':dist/studio.html'],{cwd:repo})),'embedded demonstration engine unchanged');report.engineSha256=crypto.createHash('sha256').update(actual).digest('hex');}
  for(const width of [1440,834,390])for(const route of ['studio.html','studio-public.html']){
   const viewport={width,height:width===1440?1000:width===834?1194:844};const context=await browser.newContext({viewport,acceptDownloads:true,reducedMotion:'reduce'});
   await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin&&['GET','HEAD'].includes(r.request().method()))return r.continue();report.blocked.push({url:u.href,from:r.request().frame().url(),method:r.request().method(),action:'aborted-before-network'});return r.abort();});
   const p=await context.newPage();p.on('pageerror',e=>report.errors.push({route,width,message:e.message}));
   try{
    await p.goto(origin+'/'+route);await p.waitForSelector('#mir-prestige-header');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);
    for(const lang of ['fr-CA','en-CA']){
     await language(p,lang);await p.evaluate(()=>scrollTo(0,0));
     assert.equal(await p.evaluate(()=>localStorage.getItem('mir-client-locale-v1')||'fr-CA'),lang);
     assert.ok(await p.evaluate(()=>document.scrollingElement.scrollWidth<=innerWidth+1),'no horizontal overflow '+route+' '+width);
     const images=await p.locator('header img').evaluateAll(nodes=>nodes.map(n=>({loaded:n.complete&&n.naturalWidth>0,src:n.getAttribute('src')})));assert.ok(images.length&&images.every(n=>n.loaded),'official logo loaded');
     if(phase==='after'){assert.equal(await p.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(36, 37, 34)','anthracite page');assert.match(await p.locator('.mir-studio-door-footer').innerText(),lang==='en-CA'?/Your home\. The right materials\. The right details\./:/Votre maison\. Les bons matériaux\. Les bons détails\./);if(route==='studio.html')for(const selector of ['.control-heading','.rotation-head label'])assert.equal(await p.locator(selector).evaluate(e=>getComputedStyle(e).color),'rgb(244, 241, 234)','cream control label remains legible');}
     const file=route.replace('.html','')+'-'+width+'-'+lang+'.png';await p.screenshot({path:path.join(folder,file),fullPage:true});report.captures.push({file:path.relative(repo,path.join(folder,file)),title:route==='studio.html'?'Démonstration matières':'Studio public — En construction',page:route,viewport,language:lang,simulated:false});
     if(route==='studio-public.html'){
      assert.match(await p.locator('h1').innerText(),lang==='en-CA'?/Under construction/:/En construction/);
      assert.equal(await p.locator('canvas,#import-pdf,#mir-estimate-dialog').count(),0,'public tools remain absent');
      for(const href of ['index.html','boutique.html']){const a=p.locator('.construction .actions a[href="'+href+'"],.construction .actions a[href$="/'+href+'"]');assert.equal(await a.count(),1);await a.click();await p.waitForURL('**/'+href);assert.equal(await p.locator('html').getAttribute('lang'),lang,'language preserved at destination');await p.goto(origin+'/'+route);await p.waitForSelector('#mir-prestige-header');}
     }else{
      const canvas=p.locator('#house-canvas');assert.ok(await canvas.evaluate(c=>c.width>0&&c.height>0));
      await p.locator('label[for="zone-pignons"]').click();await p.locator('label[for="material-brique"]').click();await p.locator('label[for="color-terre"]').click();
      const angleBefore=await p.locator('#rotation').inputValue();await p.locator('#rotate-right').click();assert.notEqual(await p.locator('#rotation').inputValue(),angleBefore);
      await p.locator('#dimension-toggle').click();assert.equal(await p.locator('#dimension-toggle').getAttribute('aria-pressed'),'false');
      const download=p.waitForEvent('download');await p.locator('#export').click();const d=await download;const config=JSON.parse(fs.readFileSync(await d.path(),'utf8'));
      assert.equal(config.type,'MIR_STUDIO_DEMONSTRATION');assert.deepEqual(config.geometry,{units:'metres',width:12,depth:8,wallHeight:4.2,ridgeHeight:6,roofOverhang:.3});assert.equal(config.zones.length,3);const zone=config.zones.find(z=>z.id==='pignons');assert.equal(zone.material,'brique');assert.equal(zone.color,'terre');assert.equal(config.view.dimensionsVisible,false);
      await p.locator('#reset').click();assert.equal(await p.locator('#rotation').inputValue(),'32');assert.equal(await p.locator('#dimension-toggle').getAttribute('aria-pressed'),'true');assert.ok(await p.locator('#zone-facade').isChecked());
      await p.reload();await p.waitForSelector('#mir-prestige-header');assert.equal(await p.locator('html').getAttribute('lang'),lang,'language survives reload');
      const links=await p.locator('body > aside a').evaluateAll(nodes=>nodes.map(a=>new URL(a.href).pathname));assert.ok(links.includes('/plan.html')&&links.includes('/selection.html'),'real Studio and project links retained');
     }
     report.checks.push({route,width,lang,status:'PASS'});
    }
   }catch(e){report.checks.push({route,width,status:'FAIL',message:e.stack});}finally{await context.close();}
  }
 }finally{await browser.close();server.close();fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2));}
 assert.equal(report.checks.filter(c=>c.status==='FAIL').length,0,JSON.stringify(report.checks.filter(c=>c.status==='FAIL')));assert.equal(report.errors.length,0,JSON.stringify(report.errors));
 // A real click into the existing shop may request its price reader. It is
 // aborted above before any traffic; the two Studio routes must request none.
 assert.ok(report.blocked.every(r=>new URL(r.from).pathname==='/boutique.html'&&new URL(r.url).pathname==='/rest/v1/rpc/mir_public_boutique_prices'),'no external request from either Studio page');
 console.log(JSON.stringify({phase,checks:report.checks.length,captures:report.captures.length,report:path.join(folder,'report.json')}));
}
main().catch(error=>{server.close();console.error(error.stack);process.exitCode=1;});
