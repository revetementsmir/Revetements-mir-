'use strict';
/* MIR : recette navigateur de la navigation client publique.
 * Tests de vrais liens et contrôles clavier, PC + tablette + téléphones.
 * Aucune action serveur ni publication. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist'),artifacts=path.resolve(__dirname,'../artifacts');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(dist,'.'+decodeURIComponent((req.url||'/').split('?')[0]));
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Absent');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
const routes=['index','realisations','contact','materiaux','boutique','produit','selection','pliage','plan','production'];
const sizes=[
  {name:'mobile-compact',width:360,height:780},
  {name:'mobile',width:390,height:844},
  {name:'seuil-mobile',width:760,height:900},
  {name:'seuil-bureau',width:761,height:900},
  {name:'tablette',width:820,height:1100},
  {name:'petit-pc',width:1024,height:768},
  {name:'bureau',width:1440,height:900},
  {name:'ultrawide',width:2560,height:1080}
];
(async()=>{
  fs.mkdirSync(artifacts,{recursive:true});
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const base='http://127.0.0.1:'+server.address().port+'/';
  let browser;
  try{
    try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
    catch(error){
      const exe=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>p&&fs.existsSync(p));
      if(!exe)throw error;
      browser=await chromium.launch({executablePath:exe,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    }
    let count=0;
    for(const size of sizes){
      const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.width<1100,reducedMotion:'reduce'});
      const page=await context.newPage();
      let reference;
      for(const route of routes){
        const errors=[];
        const listener=error=>errors.push(error.message);
        page.on('pageerror',listener);
        await page.goto(base+route+'.html'+(route==='production'?'?mode=client&kind=profile':''),{waitUntil:'domcontentloaded',timeout:25000});
        const header=page.locator('header.mir-home-header');
        const menu=header.locator('.mir-client-menu-toggle');
        const nav=header.locator('nav.mir-client-links');
        const account=header.getByRole('link',{name:'Compte'});
        const label=route+' '+size.name;
        const small=size.width<=1100;
        await menu.waitFor({state:'attached'});
        assert.equal(await menu.isVisible(),small,label);
        assert.equal(await nav.isVisible(),!small,label);
        assert.equal(await account.isVisible(),!small,label+' compte dans l’en-tête bureau seulement');
        if(small)assert.ok(await page.locator('.mir-mobile-tabs a[href^="chantier.html?view=account"]:visible').count(),label+' compte dans la navigation mobile');
        assert.equal(await menu.getAttribute('aria-controls'),await nav.getAttribute('id'),label);
        const closed=await header.boundingBox();
        if(small){
          const logo=await header.locator('img').boundingBox();
          const button=await menu.boundingBox(),link=await header.locator('.mir-public-cart').boundingBox();
          assert.ok(button.height>=44&&logo.x+logo.width<=link.x&&link.x+link.width<=button.x,label+' logo, panier, menu sur une ligne');
          await menu.click();
          assert.equal(await menu.getAttribute('aria-expanded'),'true',label);
          assert.deepEqual(await header.boundingBox(),closed,label+' le menu ne pousse pas la page');
          assert.equal(await nav.evaluate(el=>getComputedStyle(el).position),'absolute',label);
        }
        const links=await nav.locator('a:visible').evaluateAll(anchors=>anchors.map(a=>[a.getAttribute('href')==='selection.html'?'Mon panier':a.textContent.trim(),a.getAttribute('href')]));
        const mobileEstimate = nav.locator('a.mir-mobile-estimate');
        if (route === 'index') {
          assert.equal(await mobileEstimate.isVisible(), small, label + ' accès mobile à Estimation');
          assert.equal(await mobileEstimate.getAttribute('href'), 'estimation.html');
        }
        const commonLinks = links.filter(([, href]) => !['estimation.html','selection.html'].includes(href));
        if(route!=='index')assert.ok(await nav.locator('a[href="selection.html"]:visible').count(),label+' Mon panier accessible');
        if(small)assert.ok(await nav.locator('a[href="estimation.html"]:visible').count(),label+' estimation mobile accessible');
        if(!reference)reference=commonLinks;
        else assert.deepEqual(commonLinks,reference,label+' mêmes liens communs que l’accueil');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),label+' débordement');
        if(small){
          await page.keyboard.press('Escape');
          assert.equal(await nav.isVisible(),false,label+' ferme avec Échap');
          assert.equal(await menu.evaluate(el=>document.activeElement===el),true,label+' retour du focus');
          if(route==='boutique'&&size.name==='mobile'){
            await menu.click();
            await nav.getByRole('link',{name:'Réalisations'}).click();
            await page.waitForURL('**/realisations.html');
          }
        }
        assert.deepEqual(errors,[],label+' erreurs JS');
        page.off('pageerror',listener);
        count++;
      }
      await context.close();
    }
    // Revenir au PC puis au mobile ne doit pas laisser un menu caché.
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    await page.goto(base+'realisations.html',{waitUntil:'domcontentloaded'});
    const nav=page.locator('header.mir-client-header nav.mir-client-links');
    assert.equal(await nav.isVisible(),false);
    await page.setViewportSize({width:1440,height:900});
    await page.waitForFunction(()=>!document.querySelector('header.mir-client-header nav.mir-client-links').hidden);
    assert.equal(await nav.isVisible(),true);
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelector('header.mir-client-header nav.mir-client-links').hidden);
    assert.equal(await nav.isVisible(),false);
    console.log('PASS menu responsive après changement de largeur');
    await context.close();
    console.log('MIR navigation publique : '+count+'/'+(sizes.length*routes.length)+' parcours Chrome réussis');
  }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error.stack||error);server.close();process.exitCode=1;});
