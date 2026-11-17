'use strict';
// Read-only browser acceptance for the three approved home layouts.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require('playwright'), {PNG} = require('pngjs');
const root = path.resolve(process.argv[2] || '.prestige-preview');
const baseline = process.argv[3] && path.resolve(process.argv[3]);
const out = path.resolve(process.argv[4] || 'home-approved-evidence');
fs.mkdirSync(out,{recursive:true});
function serve(base,port) {
  const server = http.createServer((req,res) => {
    const file = path.resolve(base,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
    if(!file.startsWith(base+path.sep)){res.writeHead(403);return res.end();}
    const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.avif':'image/avif','.webp':'image/webp','.json':'application/json','.ttf':'font/ttf'};
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);
  });
  return new Promise(resolve=>server.listen(port,'127.0.0.1',()=>resolve(server)));
}
(async()=>{
  const servers=[await serve(root,8122)];if(baseline)servers.push(await serve(baseline,8123));
  const browser=await chromium.launch({args:['--no-sandbox']});
  const results=[];
  const dimensions=[['phone',384,760,true],['phone-small',360,640,true],['phone-320',320,568,true],['phone-large',430,860,true],['ipad-portrait',768,1024,true],['ipad-landscape',1024,768,true],['ipad-air-portrait',820,1180,true],['ipad-air-landscape',1180,820,true],['ipad-pro-portrait',1024,1366,true],['ipad-pro-landscape',1366,1024,true],['pc',1440,1200,false],['pc-short',1280,800,false]];
  async function open(ctx,port,english) {
    const p=await ctx.newPage();
    await p.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    await p.addInitScript(en=>localStorage.setItem('mir-client-locale-v1',en?'en-CA':'fr-CA'),english);
    await p.goto(`http://127.0.0.1:${port}/test/index.html`,{waitUntil:'networkidle'});
    if(english){await p.locator('.mir-client-locale-switch button[data-mir-locale="en-CA"]').first().evaluate(button=>button.click());await p.waitForTimeout(200);}
    await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(250);return p;
  }
  try {
    for(const english of [false,true])for(const [name,width,height,hasTouch] of dimensions){
      const label=name+(english?'-en':'-fr');const ctx=await browser.newContext({viewport:{width,height},hasTouch,deviceScaleFactor:1});
      try {
        const p=await open(ctx,8122,english);
        const data=await p.evaluate(()=>{
          const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
          const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right};};
          const selectors=['#hero-title','.mir-prestige-home-lead','.mir-home-paths a','.mir-home-paths strong','.mir-home-paths small'];
          return {layout:document.body.dataset.mirHomeLayout||'desktop',lang:document.documentElement.lang,
            viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
            text:document.querySelector('main').innerText,
            boxes:selectors.flatMap(s=>[...document.querySelectorAll(s)].map(e=>({selector:s,text:e.innerText,visible:visible(e),...rect(e)}))),
            gallery:visible(document.querySelector('#decouvrir')),badge:visible(document.querySelector('figcaption')),
            pagers:[...document.querySelectorAll('.mir-client-pages-nav,.mir-client-list-controls,.mir-mobile-tabs')].filter(visible).length,
            missing:[...document.images].filter(e=>visible(e)&&(!e.complete||!e.naturalWidth)).map(e=>e.src)};
        });
        assert.equal(data.lang,english?'en-CA':'fr-CA');assert.equal(data.pagers,0);assert.equal(data.missing.length,0);
        for(const b of data.boxes){assert(b.visible&&b.w>0&&b.h>0&&b.text.length>0,`${label}: empty ${b.selector}`);}
        if(data.layout!=='desktop'){
          assert(data.scroll[0]<=width+1&&data.scroll[1]<=height+1,`${label}: overflow`);
          assert.equal(data.badge,false);assert.equal(data.gallery,!name.startsWith('phone'));
          for(const b of data.boxes)assert(b.x>=-1&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1,`${label}: clipped ${b.selector}`);
          assert(data.text.includes(english?'Homeowners':'Particuliers'));assert(data.text.includes(english?'Professionals':'Professionnels'));
        }
        await p.screenshot({path:path.join(out,label+'.png'),fullPage:true});
        // Real endpoints and clickable hit-targets; no form submits or backend requests.
        const targets=await p.locator('.mir-home-paths a,.mir-prestige-search,.mir-public-cart,.mir-public-account-avatar').evaluateAll(nodes=>nodes.map(e=>({href:e.href,hit:(()=>{let r=e.getBoundingClientRect();let n=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!n&&(n===e||e.contains(n));})()})));
        for(const target of targets){assert(target.hit,`${label}: obstructed link`);assert.equal((await p.request.get(target.href)).status(),200);}
        if(data.layout.startsWith('tablet')){
          await p.locator('.mir-home-discover').click();assert.equal(await p.locator('#mir-client-menu-button').getAttribute('aria-expanded'),'true');
          await p.keyboard.press('Escape');assert.equal(await p.locator('#mir-client-menu-button').getAttribute('aria-expanded'),'false');
          const other=english?'FR':'EN';await p.locator('.mir-approved-language button').filter({hasText:other}).click();await p.waitForTimeout(150);
          assert.equal(await p.locator('html').getAttribute('lang'),english?'fr-CA':'en-CA');
        }
        if(name==='ipad-portrait'){
          await p.setViewportSize({width:1024,height:768});await p.waitForTimeout(100);assert.equal(await p.locator('body').getAttribute('data-mir-home-layout'),'tablet-landscape');
          await p.setViewportSize({width:768,height:1024});await p.waitForTimeout(100);assert.equal(await p.locator('body').getAttribute('data-mir-home-layout'),'tablet-portrait');
        }
        if(name.startsWith('pc')&&baseline){
          const bctx=await browser.newContext({viewport:{width,height},hasTouch:false,deviceScaleFactor:1});
          const before=await open(bctx,8123,english);const beforeBytes=await before.screenshot({path:path.join(out,label+'-baseline.png'),fullPage:true});
          const a=PNG.sync.read(beforeBytes),b=PNG.sync.read(fs.readFileSync(path.join(out,label+'.png')));
          assert.equal(b.width,a.width);assert.equal(b.height,a.height);assert(a.data.equals(b.data),`${label}: desktop pixels changed`);
          data.desktopDifferentPixels=0;await bctx.close();
        }
        results.push({name:label,status:'pass',...data});
      }catch(error){results.push({name:label,status:'fail',error:error.message});}finally{await ctx.close();}
    }
  }finally{
    await browser.close();servers.forEach(s=>s.close());
    const report={generatedAt:new Date().toISOString(),cases:results.length,passed:results.filter(r=>r.status==='pass').length,results};
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({cases:report.cases,passed:report.passed,failures:results.filter(r=>r.status==='fail')}));
    if(report.passed!==report.cases)process.exitCode=1;
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
