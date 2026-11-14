'use strict';
// Avant/après réels du magasin de revue. Fonctionne localement dans la CI, hors prod.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {once}=require('node:events'),{chromium}=require('playwright');
const roots={
  before:path.resolve(process.env.MIR_MAGASIN_BASE_DIR||'./_missing_baseline_'),
  after:path.resolve(__dirname,'../dist')
};
if(!process.env.MIR_MAGASIN_BASE_DIR||!fs.existsSync(roots.before))
  throw Error('Il faut le checkout GitHub de la base pour les captures avant/après.');
const folder=path.resolve(__dirname,'../artifacts/mir-magasin-visual');
fs.mkdirSync(folder,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://local'),before=url.pathname.startsWith('/before/'),
    relative=decodeURIComponent(url.pathname.replace(/^\/(before|after)/,'')),
    root=before?roots.before:roots.after,file=path.resolve(root,'.'+relative);
  if(!file.startsWith(root+path.sep)){response.writeHead(404).end();return;}
  fs.readFile(file,(err,data)=>err?response.writeHead(404).end():
    response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
const sizes=[[360,780],[390,844],[430,932],[768,1024],[1440,900]];
let count=0;
async function visit(browser,baseUrl,version,width,height){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<=430,hasTouch:width<=768}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(baseUrl+'/'+version+'/magasin-revue.html',{waitUntil:'domcontentloaded'});
  await page.locator('#products article[data-product]').first().waitFor({timeout:18000});
  return {page,errors};
}
async function capture(card,name,print=false){
  const file=path.join(folder,name+'.jpg');
  await card.screenshot({path:file,type:'jpeg',quality:72,animations:'disabled',timeout:18000});
  assert.ok(fs.statSync(file).size>1000,'Capture vide '+name);
  count++;
  if(print)console.log('MIR_VISUAL:'+name+':'+fs.readFileSync(file).toString('base64'));
}
(async()=>{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port,
    browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
  try{
    for(const [width,height] of sizes){
      for(const version of (width===390||width===1440?['before','after']:['after'])){
        const {page,errors}=await visit(browser,base,version,width,height);
        await page.locator('#search').fill('PRIME 40713');
        const card=page.locator('article.card.prime');await card.waitFor();
        if(version==='after'){
          const photo=card.locator('img[data-catalogue-image]');await photo.waitFor();await photo.evaluate(image=>image.decode());
          const state=await photo.evaluate(image=>({src:image.getAttribute('src'),loaded:image.complete&&image.naturalWidth>0,fit:getComputedStyle(image).objectFit}));
          assert.match(state.src,/prime-40713-box\.webp$/);
          assert.equal(state.loaded,true,'La vraie photo PRIME doit charger');
          assert.equal(state.fit,'contain','Aucun étirement de la photo');
          if(width>=768){
            const bounds=await card.boundingBox();
            assert.ok(bounds.width<=425,'La photo basse résolution ne doit pas remplir une carte PC/tablette énorme');
          }
        }
        await capture(card,version+'-'+width+'-prime',width===390);
        assert.deepEqual(errors,[],'Erreurs JS '+version+' '+width);
        await page.close();
      }
    }
    const {page,errors}=await visit(browser,base,'after',390,844);
    await page.locator('#search').fill('Vis à fascia');
    const fascia=page.locator('article[data-product="mir-request-fascia-screws-black-2in"]');await fascia.waitFor();
    const labels=await fascia.locator('[data-product-variant] option').allTextContents();
    assert.deepEqual(labels,['Noir','Blanc'],'Aucune palette de teintes non confirmée');
    assert.equal(await page.locator('article[data-product="pending-kaycan-fascia-hex-quarter-inch"]').count(),1,'Demande Kaycan historique préservée');
    await capture(fascia,'after-390-fascia',true);
    const pending=page.locator('article[data-product="pending-kaycan-fascia-hex-quarter-inch"]');
    await capture(pending,'after-390-kaycan-a-confirmer');
    await page.locator('#search').fill('ADSEAL');
    const adseal=page.locator('article[data-product="mir-request-adfast"]');await adseal.waitFor();
    assert.match(await adseal.locator('h2').textContent(),/90\/contenant/);
    await capture(adseal,'after-390-adseal');
    await page.locator('#search').fill('CanExel');
    for(const [id,filename] of [
      ['canexel-joint-cedrvue-9','deckmart-ced9-acadia.png'],
      ['canexel-joint-ridgewood-d5-12','deckmart-d5-acadia.png'],
      ['canexel-joint-vstyle-12','deckmart-vstyle-acadia.png']
    ]){
      const card=page.locator('article[data-product="'+id+'"]');await card.waitFor();
      await card.locator('[data-product-color]').selectOption('canexel-acadia');
      const photo=card.locator('img[data-catalogue-image]');await photo.waitFor();await photo.evaluate(image=>image.decode());
      assert.ok((await photo.getAttribute('src')).endsWith(filename),id+' : mauvaise photo du profil');
      assert.equal(await photo.evaluate(e=>e.complete&&e.naturalWidth>0),true,id+' : photo cassée');
      await capture(card,'after-390-'+id,id==='canexel-joint-cedrvue-9');
    }
    assert.deepEqual(errors,[],'Erreurs JS parcours couleur');
    await page.close();
    console.log('MIR visuels vrais : '+count+' captures, base et après, 5 largeurs, 3 profils distincts. Aucun test Samsung.');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
