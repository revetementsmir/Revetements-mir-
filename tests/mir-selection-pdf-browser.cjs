'use strict';
/* MIR : parcours réel Ma sélection -> sauvegarde JSON -> PDF téléchargeable. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif'};
const server=http.createServer((req,res)=>{
  let target;
  try{target=path.resolve(dist,'.'+decodeURIComponent((req.url||'/').split('?')[0]));}catch{res.writeHead(400);res.end();return;}
  if(!target.startsWith(dist+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
    res.writeHead(404);res.end('Absent');return;
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});
  fs.createReadStream(target).pipe(res);
});
async function run(){
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const base='http://127.0.0.1:'+server.address().port+'/';
  let browser;
  try{
    try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
    catch(e){const exe=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/chromium','/usr/bin/google-chrome'].find(x=>x&&fs.existsSync(x));if(!exe)throw e;browser=await chromium.launch({executablePath:exe,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
    for(const size of [{label:'mobile',width:390,height:844},{label:'desktop',width:1440,height:900}]){
      const context=await browser.newContext({viewport:size,acceptDownloads:true,reducedMotion:'reduce'});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'selection.html',{waitUntil:'domcontentloaded'});
      const material=await page.evaluate(async()=>{
        const r=await fetch('./catalogue-fd6866b49d21.json');const data=await r.json();
        const m=data.materials.find(x=>x.id==='hardieplank-select-625')||data.materials.find(x=>x.brand&&x.name&&x.status!=='pending_identity');
        if(!m)throw Error('Aucune référence de test dans le catalogue');
        return {materialId:m.id,brand:m.brand,name:m.name,colorId:m.colors?.[0]?.id||null,colorName:m.colors?.[0]?.name||'À confirmer',formatId:null,format:null,formatName:null,quantity:55,unit:'pi²'};
      });
      await page.evaluate(item=>localStorage.setItem('mir-shopping-list-v1',JSON.stringify({version:1,project:'Maison de test MIR',items:[item]})),material);
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelectorAll('.selection-item').length===1&&document.querySelector('#selection-export-pdf')&&!document.querySelector('#selection-export-pdf').disabled);
      assert.equal(await page.locator('#selection-project-name').inputValue(),'Maison de test MIR');
      assert.ok((await page.locator('.selection-item').textContent()).includes(material.brand),'le fabricant doit être présent dans la fiche sélection');
      assert.equal(await page.locator('#selection-export').isEnabled(),true);
      const jsonDownload=page.waitForEvent('download');
      await page.locator('#selection-export').click();
      const jsonFile=await jsonDownload;
      assert.equal(jsonFile.suggestedFilename(),'MIR-selection-materiaux.json');
      const backup=JSON.parse(fs.readFileSync(await jsonFile.path(),'utf8'));
      assert.equal(backup.items.length,1);
      assert.equal(backup.items[0].quantity,55);
      assert.equal(backup.status,'selection_non_commandee');
      await page.locator('#selection-export-pdf').click();
      await page.locator('#mir-pdf-ready a[download]').waitFor({timeout:30000});
      const pdfDownload=page.waitForEvent('download');
      await page.locator('#mir-pdf-ready a[download]').click();
      const pdfFile=await pdfDownload;
      assert.equal(pdfFile.suggestedFilename(),'MIR-selection-materiaux.pdf');
      const pdf=fs.readFileSync(await pdfFile.path());
      assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
      assert.ok(pdf.length>15000,'PDF réel requis');
      assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>=1);
      assert.match(await page.locator('#selection-pdf-status').innerText(),/PDF prêt/);
      const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir-shopping-list-v1')));
      assert.equal(state.items.length,1,'aucune suppression après export');
      assert.equal(state.items[0].quantity,55);
      assert.deepEqual(errors,[],size.label+' : erreur JavaScript');
      const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
      assert.ok(overflow.scroll<=overflow.width+2,size.label+' : débordement horizontal '+JSON.stringify(overflow));
      console.log('PASS '+size.label+' : sélection réelle, JSON sauvegardé, PDF téléchargé et stockage préservé');
      await context.close();
    }
  }finally{if(browser)await browser.close();server.close();}
}
run().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1;});
