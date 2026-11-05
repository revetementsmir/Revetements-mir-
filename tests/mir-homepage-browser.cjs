'use strict';
/* Recette Chromium du VRAI accueil MIR, servie depuis dist/, pas d'une maquette. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const target=path.resolve(dist,'.'+decodeURIComponent((req.url||'/').split('?')[0]));
  if(!target.startsWith(dist+path.sep)){res.writeHead(403);res.end('Interdit');return}
  const file=fs.existsSync(target)&&fs.statSync(target).isFile()?target:path.join(dist,'index.html');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
const sizes=[{name:'desktop',w:1440,h:900},{name:'large',w:1920,h:1080},{name:'tablette',w:820,h:1180},{name:'mobile',w:390,h:844},{name:'mobile-petit',w:360,h:780}];
async function main(){
  fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  } catch(error) {
    const found=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']
      .find(file=>file&&fs.existsSync(file));
    if(!found) throw error;
    browser=await chromium.launch({executablePath:found,headless:true,args:['--no-sandbox']});
  }
  try{
    let checks=0;
    for(const size of sizes){
      const page=await browser.newPage({viewport:{width:size.w,height:size.h},deviceScaleFactor:1});
      const failures=[];
      page.on('pageerror',e=>failures.push(e.message));
      await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'networkidle'});
      await page.locator('.mir-home-showcase-photo').evaluate(img=>img.decode());
      await page.locator('.mir-home-services').scrollIntoViewIfNeeded();
      await page.locator('.mir-home-service-media img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
      const metrics=await page.evaluate(()=>{
        const bb=selector=>{const r=document.querySelector(selector)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}:null};
        const logo=document.querySelector('.mir-home-brand img');
        const photo=document.querySelector('.mir-home-showcase-photo');
        return {screen:innerWidth,page:document.documentElement.scrollWidth,logo:{loaded:logo.complete&&logo.naturalWidth>0,src:logo.getAttribute('src')},photo:{loaded:photo.complete&&photo.naturalWidth>0,src:photo.getAttribute('src')},headline:bb('#hero-title'),nav:bb('.site-header'),cta:bb('.mir-home-main-cta'),account:bb('.mir-home-account'),services:document.querySelectorAll('.mir-home-service').length,cardPhotos:[...document.querySelectorAll('.mir-home-service-media img')].filter(img=>img.complete&&img.naturalWidth>0).length,pictos:document.querySelectorAll('.mir-home-services svg,.mir-home-services i').length};
      });
      assert.equal(metrics.logo.loaded,true,size.name+': logo original non chargé');
      assert.equal(metrics.photo.loaded,true,size.name+': photo MIR non chargée');
      assert.equal(metrics.services,3,size.name+': services');
      assert.equal(metrics.cardPhotos,3,size.name+': trois images de cartes doivent charger');
      assert.equal(metrics.pictos,0,size.name+': pictos');
      assert.ok(metrics.page<=size.w+2,size.name+': débordement horizontal '+metrics.page+' > '+size.w);
      assert.ok(metrics.headline.x>=-1&&metrics.headline.right<=size.w+2,size.name+': titre rogné');
      assert.ok(metrics.cta.x>=-1&&metrics.cta.right<=size.w+2,size.name+': appel à l’action rogné');
      assert.ok(metrics.account.right<=size.w+2,size.name+': compte hors viewport');
      assert.equal(failures.length,0,size.name+': erreurs JS '+failures.join('; '));
      await page.screenshot({path:path.resolve(__dirname,'../artifacts/mir-accueil-'+size.name+'.png')});
      checks++;
      console.log('PASS '+size.name+' '+size.w+'×'+size.h+' · sans débordement · photo et logo chargés');
      await page.close();
    }
    console.log('MIR accueil Chromium: '+checks+'/'+sizes.length+' résolutions réussies.');
  } finally {
    await browser.close();
    server.close();
  }
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1});
