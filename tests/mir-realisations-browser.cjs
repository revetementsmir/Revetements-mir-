'use strict';
/* Capture et test des VRAIES pages générées depuis dist/ sur GitHub Actions. */
const assert=require('node:assert/strict');const http=require('node:http');
const fs=require('node:fs'),path=require('node:path');const {chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent((req.url||'/').split('?')[0]);const f=path.resolve(dist,'.'+rel);
 if(!f.startsWith(dist+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end('Absent');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
});
const viewports=[{name:'360',width:360,height:780},{name:'390',width:390,height:844},{name:'820',width:820,height:1100},{name:'1440',width:1440,height:900},{name:'1920',width:1920,height:1080},{name:'3440',width:3440,height:1440},{name:'5120',width:5120,height:1440}];
async function main(){await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}
  catch(e){let bin=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>x&&fs.existsSync(x));if(!bin)throw e;browser=await chromium.launch({executablePath:bin,args:['--no-sandbox'],headless:true});}
  fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
  for(const vp of viewports){
   const page=await browser.newPage({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/realisations.html',{waitUntil:'domcontentloaded'});
   await page.locator('.mir-gallery-photo-button img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode()})));
   const data=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,images:[...document.querySelectorAll('.mir-gallery-photo-button img')].map(x=>x.naturalWidth>0),links:document.querySelectorAll('header.mir-client-header nav a').length}));
   assert.ok(data.scroll<=vp.width+2,vp.name+': débordement '+data.scroll+' > '+vp.width);
   assert.equal(data.images.length,4);
   assert.ok(data.images.every(Boolean),vp.name+': image manquante');
   assert.ok(data.links>=5,vp.name+': menu incomplet');
   assert.equal(errors.length,0,vp.name+': '+errors.join('; '));
   if(['390','1440','3440'].includes(vp.name)){await page.screenshot({path:path.resolve(__dirname,'../artifacts/mir-realisations-'+vp.name+'.png'),fullPage:true});}
   if(vp.name==='390'){
    await page.locator('[data-photo="1"]').click();
    assert.equal(await page.locator('#mir-gallery-dialog').evaluate(el=>el.open),true);
    await page.locator('#mir-gallery-next').click();
    assert.equal(await page.locator('#mir-gallery-dialog-title').innerText(),'Un classique réinventé');
    await page.locator('#mir-gallery-close').click();
    assert.equal(await page.locator('#mir-gallery-dialog').evaluate(el=>el.open),false);
    await page.locator('[data-photo="3"]').click();
    assert.equal(await page.locator('#mir-gallery-dialog-title').innerText(),'Au cœur du centre-ville de Québec');
    await page.locator('#mir-gallery-next').click();
    assert.equal(await page.locator('#mir-gallery-dialog-title').innerText(),'Jeux de matières');
    await page.locator('#mir-gallery-close').click();
   }
   await page.close();console.log('PASS Réalisations '+vp.name+' px');
  }
 }finally{if(browser)await browser.close();server.close()}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1});