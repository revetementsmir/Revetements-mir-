'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist');
const server=http.createServer((req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;
 if(p==='/test-balcony.html'){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.end('<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><canvas id="scene" width="960" height="660"></canvas><script src="/plan-3d.js"></script></body></html>');
 }
 const file=path.resolve(dist,'.'+p);
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end();}
 res.setHeader('Content-Type','application/javascript');fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({channel:'chrome',args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
  for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   await page.goto('http://127.0.0.1:'+server.address().port+'/test-balcony.html',{waitUntil:'load'});
   await page.waitForFunction(()=>typeof window.MIR3D?.render==='function');
   const result=await page.evaluate(async()=>{
    const E=window.MIR3D,study=E.studyDefaults();
    const base={...study,dimensions:E.defaults,views:{},angle:22,elevation:28,exportSize:{width:960,height:660}};
    async function draw(porch,structures){
     const c=document.createElement('canvas');
     const q=await E.render(c,{...base,porch:{...study.porch,...porch},structures});
     if(!q.rendered)throw Error('Rendu géométrique non créé : '+JSON.stringify(q));
     return c;
    }
    const original=await draw({balconyEnabled:false},study.structures.filter(s=>s.type==='column'));
    const withDeck=await draw({balconyEnabled:true},study.structures.filter(s=>s.type==='column'));
    const withBeam=await draw({balconyEnabled:true},study.structures);
    const stage=document.querySelector('#scene');
    stage.getContext('2d').drawImage(withBeam,0,0);
    const data=(c)=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    function changed(a,b){
     const A=data(a),B=data(b);let pixels=0;
     for(let i=0;i<A.length;i+=4)if(Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2])+Math.abs(A[i+3]-B[i+3])>12)pixels++;
     return pixels;
    }
    return {deckPixels:changed(original,withDeck),beamPixels:changed(withDeck,withBeam),
      supports:study.structures.map(s=>s.type),balcony:study.porch.balconyEnabled,
      width:stage.width,height:stage.height};
   });
   assert.equal(result.balcony,true);
   assert.deepEqual(result.supports,['column','column','beam']);
   assert.ok(result.deckPixels>100,'Balcon non visible : '+JSON.stringify(result));
   assert.ok(result.beamPixels>100,'Poutre non visible : '+JSON.stringify(result));
   const dir=path.resolve(__dirname,'../artifacts');fs.mkdirSync(dir,{recursive:true});
   await page.locator('#scene').screenshot({path:path.join(dir,'mir-balcon-3d-'+name+'.png')});
   console.log('PASS balcon/poutre '+name+' : '+JSON.stringify(result));
   await page.close();
  }
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
