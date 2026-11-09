'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {once}=require('node:events');
const {chromium}=require('playwright');
const M=require('../dist/production-model.js');
const root=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
const tariff={area_rate:0.014,bend_cents:100,aluminum_basis_points:0,revision:0};
const aluminumTariff={...tariff,aluminum_basis_points:1000,revision:1};
const spec={id:'M001',kind:'profile',template:'custom',unit:'in',quantity:12,length:96,
 segments:[{label:'A',length:3},{label:'B',length:'1 1/2'},{label:'C',length:'1/2'}],
 bends:[{mode:'signed',angle:0},{mode:'hem',direction:'right'}],coloredFace:{side:'left',segmentId:'A'},
 material:{type:'aluminium'},finish:{selectionType:'manufacturer',manufacturer:'Kaycan',code:'NOIR'}};
function price(value=spec,bendTariff=tariff){return M.pricePiece(value,{bendTariff});}
assert.equal(price().unitCents,940,'10 pi facturés, même à 8 pi; un repli, rotation nulle exclue');
assert.equal(price().lineCents,11280);
assert.equal(price(spec,aluminumTariff).unitCents,1034);
assert.equal(price({...spec,material:{type:'acier'}},aluminumTariff).unitCents,940);
assert.equal(price({...spec,length:144}).unitCents,null);
assert.equal(price({...spec,finish:{selectionType:'ral',code:'RAL 7016'}}).requiresQuote,true);
assert.equal(M.pricePiece(spec).unitCents,null,'atelier sans tarif public injecté');
const sheet=M.productionPages({items:[spec]},{document:'client-request',bendTariff:tariff})[0];
assert.equal(sheet.documentTitle,'Récapitulatif de pliage');
assert.match(sheet.svg,/112,80 CAD/);
assert.match(sheet.svg,/1 pli\(s\)/);
assert.doesNotMatch(sheet.svg,/Zoho|MISE EN PRODUCTION/i);

(async()=>{
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,834,1440]){
   const touch=width<1100;
   const context=await browser.newContext({viewport:{width,height:width===390?844:950},isMobile:width===390,hasTouch:touch,acceptDownloads:true});
   let currentTariff=tariff;
   await context.route('**/rest/v1/rpc/mir_public_bend_tariff',route=>{
    assert.equal(route.request().method(),'GET');
    return route.fulfill({json:currentTariff,headers:{'Access-Control-Allow-Origin':'*'}});
   });
   const page=await context.newPage();
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/production.html?mode=client&kind=profile');
   await page.locator('#client-choose-model').click();
   await page.locator('[data-client-profile="l"]').click();
   await page.locator('[data-measure="A"]').fill('3');
   await page.locator('[data-measure="B"]').fill('2');
   const next=page.locator('#client-step-next');
   await next.click();
   await page.locator('[data-client-face="right"]').click();
   await next.click();
   await page.locator('#material-type').selectOption('aluminium');
   await page.locator('#production-color-grid [data-production-color]:visible').first().click();
   await page.waitForFunction(()=>document.querySelector('#panel-price').textContent.includes('9,40'));
   assert.equal(await page.locator('#production-quantity').isVisible(),false);
   await next.click();
   const dossier=page.locator('#client-viewport-dossier');
   if(await dossier.isVisible())await dossier.click();
   else await page.goto(base+'/production.html?mode=client&kind=profile#production-order');
   const qty=page.locator('[data-item-quantity]');
   await qty.fill('12');await qty.press('Tab');
   await page.waitForFunction(()=>document.querySelector('#production-pricing-summary').textContent.includes('112,80'));
   await page.locator('#production-pdf').click();
   const link=page.locator('#mir-pdf-ready a[download]');
   await link.waitFor({timeout:35000});
   const download=page.waitForEvent('download');await link.click();
   const pdf=await download;
   assert.match(pdf.suggestedFilename(),/^MIR-recapitulatif-pliage/);
   assert.equal(fs.readFileSync(await pdf.path()).subarray(0,5).toString(),'%PDF-');
   currentTariff=aluminumTariff;
   await page.goto(base+'/selection.html');
   await page.waitForFunction(()=>document.querySelector('#mir-unified-pieces').textContent.includes('124,08'));
   assert.deepEqual(errors,[]);
   await context.close();
   console.log('PASS Prix, quantité, PDF et tarif admin actualisé au panier · '+width+' px');
  }
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
