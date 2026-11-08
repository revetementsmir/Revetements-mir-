'use strict';
/* Recette réelle en Chrome des en-têtes clients; aucune nouvelle maquette. */
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(dist,'.'+decodeURIComponent((req.url||'/').split('?')[0]));
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Absent');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
 fs.createReadStream(file).pipe(res);
});
const views=[{name:'pc',width:1440,height:900},{name:'tablette',width:820,height:1100},{name:'mobile',width:390,height:844}];
const routes=['index.html','realisations.html','boutique.html','pliage.html','materiaux.html','produit.html','selection.html','plan.html','chantier.html','production.html?mode=client'];
async function main(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port+'/';
 let browser;
 try{
  try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}
  catch(e){const bin=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>x&&fs.existsSync(x));if(!bin)throw e;browser=await chromium.launch({executablePath:bin,headless:true,args:['--no-sandbox']});}
  fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
  let count=0;
  for(const view of views){
   const page=await browser.newPage({viewport:{width:view.width,height:view.height}});
   for(const route of routes){
    await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:25000});
    if(await page.locator('html[data-mir-harmony]').count()){
      const header=page.locator('#mir-harmony-header'),toggle=header.locator('.mir-harmony-toggle'),nav=header.locator('#mir-harmony-menu');
      assert.ok(await header.locator('img[src="assets/MIR-logo-officiel-original.svg"]').isVisible());
      assert.ok(await header.locator('.mir-harmony-dossier').isVisible());
      const box=await header.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=view.width+2);
      await toggle.click();assert.ok(await nav.locator('a[href="chantier.html"]').isVisible());
      await page.keyboard.press('Escape');assert.equal(await nav.isVisible(),false);count++;continue;
    }
    const result=await page.evaluate(()=>{
      const header=document.querySelector('header.mir-client-header') || document.querySelector('header.mir-home-header') || document.querySelector('html.mir-production-client header.production-header');
      const nav=header?.querySelector('nav.mir-client-links') || header?.querySelector('nav[aria-label="Navigation principale"]');
      const logo=header?.querySelector('img[src="assets/MIR-logo-officiel-original.svg"]');
      const account=header?.querySelector('a[href="chantier.html"]');
      const box=header?.getBoundingClientRect();
      const bar=nav?.getBoundingClientRect();
      const menu=header?.querySelector('.mir-client-menu-toggle');
      return {header:!!header,nav:!!nav,logo:!!logo,account:!!account,
        navVisible:nav?getComputedStyle(nav).display!=='none':false,
        menuVisible:!!menu&&getComputedStyle(menu).display!=='none',
        collapsed:!!nav?.hidden&&!!menu&&getComputedStyle(menu).display!=='none',
        left:box?.left,right:box?.right,navLeft:bar?.left,navRight:bar?.right,
        accountVisible:account?getComputedStyle(account).display!=='none':false};
    });
    assert.ok(result.header,route+' '+view.name+' : entête client absent');
    assert.ok(result.nav&&result.logo&&result.account,route+' '+view.name+' : éléments manquants');
    assert.ok((result.navVisible||result.collapsed)&&result.accountVisible,route+' '+view.name+' : navigation ou compte inaccessible');
    assert.ok(result.left>=-2&&result.right<=view.width+2,route+' '+view.name+' : en-tête rogné');
    if(result.collapsed){
      const menu=page.locator('header .mir-client-menu-toggle');
      const nav=page.locator('header nav.mir-client-links');
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'),'true');
      assert.equal(await nav.isVisible(),true,route+' '+view.name+' : menu ne s’ouvre pas');
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'),'false');
      assert.equal(await nav.isVisible(),false,route+' '+view.name+' : menu ne se ferme pas');
    }
    count++;
    if(['index.html','boutique.html','plan.html'].includes(route)){
      await page.locator(route==='index.html'?'header.mir-home-header':'header.mir-client-header').screenshot({path:path.resolve(__dirname,'../artifacts/mir-entete-'+route.split('.')[0]+'-'+view.name+'.png')});
    }
   }
   await page.close();
  }
  const p=await browser.newPage({viewport:{width:1440,height:900}});
  await p.goto(base+'index.html',{waitUntil:'domcontentloaded'});
  await p.locator('.mir-home-second-cta').click();
  await p.waitForURL('**/boutique.html');
  console.log('PASS second bouton Voir notre boutique → /boutique.html');
  console.log('PASS '+count+' contrôles d’en-têtes client, PC/tablette/mobile');
  await p.close();
 }finally{if(browser)await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1});
