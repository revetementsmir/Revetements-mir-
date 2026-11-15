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
  {name:'mobile-large',width:430,height:932},
  {name:'tablette-portrait',width:768,height:1024},
  {name:'tablette-grand',width:834,height:1112},
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
        const account=header.getByRole('link',{name:'Connexion'});
        const label=route+' '+size.name;
        const small=size.width<=1100;
        await menu.waitFor({state:'attached'});
        assert.equal(await menu.isVisible(),small,label);
        assert.equal(await nav.isVisible(),!small,label);
        assert.equal(await account.isVisible(),true,label+' avatar Connexion sur chaque écran');
        assert.equal(await account.getAttribute('href'),
          route==='plan'?'chantier.html?view=account&return=studio':
          route==='selection'?'chantier.html?view=account&return=panier':'chantier.html?view=account',
          label+' destination Connexion existante / retour');
        const rail=page.locator('.mir-mobile-tabs');
        if(route==='index')assert.equal(await rail.count(),0,label+' aucune barre inférieure sur accueil');
        else{
          assert.equal(await rail.isVisible(),small,label+' barre inférieure réservée téléphone/tablette');
          assert.equal(await rail.getByRole('link',{name:'Compte'}).count(),0,label+' aucun doublon Connexion');
        }
        assert.equal(await page.locator('a[aria-label="Connexion"]').count(),1,label+' un seul avatar Connexion');
        assert.equal(await menu.getAttribute('aria-controls'),await nav.getAttribute('id'),label);
        const closed=await header.boundingBox();
        if(small){
          if(size.width<=760){
            const logo=await header.locator('img').boundingBox();
            const button=await menu.boundingBox(),cart=await header.locator('.mir-public-cart').boundingBox(),avatar=await account.boundingBox();
            assert.ok(button.height>=44&&avatar.height>=44&&logo.x+logo.width<=button.x+2&&button.x+button.width<=cart.x+2&&cart.x+cart.width<=avatar.x+2&&avatar.x+avatar.width<=size.width+2,
              label+' logo, Plus, panier, avatar de gauche à droite');
          }
          await menu.click();
          assert.equal(await menu.getAttribute('aria-expanded'),'true',label);
          assert.deepEqual(await header.boundingBox(),closed,label+' le menu ne pousse pas la page');
          assert.equal(await nav.evaluate(el=>getComputedStyle(el).position),'absolute',label);
        }
        const links=await nav.locator('a:visible').evaluateAll(anchors=>anchors.map(a=>[a.getAttribute('href')==='selection.html'?'Mon panier':a.textContent.trim(),a.getAttribute('href')]));
        const commonLinks = links.filter(([, href]) => !['estimation.html','selection.html'].includes(href));
        assert.ok(await header.locator('a.mir-public-cart[href="selection.html"]:visible').count(),label+' panier permanent accessible');
        if(!reference)reference=commonLinks;
        else assert.deepEqual(commonLinks,reference,label+' mêmes liens communs que l’accueil');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),label+' débordement');
        if(route==='index'){
          assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2),label+' accueil sans défilement ni coupure');
          const img=page.locator('.mir-home-showcase-photo');await img.evaluate(el=>el.decode());
          assert.match(await img.getAttribute('src'),/mir-home-hero-20261105\.webp/,'Photo approuvée conservée');
          assert.equal(await img.evaluate(el=>['cover','contain'].includes(getComputedStyle(el).objectFit)),true,'Photo sans étirement');
        }
        if((route==='index'||route==='boutique')&&['mobile-compact','mobile','mobile-large','tablette-portrait','tablette-grand','petit-pc','bureau'].includes(size.name)){
          await page.screenshot({path:path.join(artifacts,'mir-client-nav-'+size.name+'-'+route+'.jpg'),type:'jpeg',quality:76,fullPage:route!=='index',animations:'disabled'});
        }
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
