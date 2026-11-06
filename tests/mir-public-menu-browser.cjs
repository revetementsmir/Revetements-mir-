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
const routes=['realisations','materiaux','boutique','produit','selection','pliage','plan'];
const sizes=[
  {name:'mobile-compact',width:360,height:780},
  {name:'mobile',width:390,height:844},
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
      for(const route of routes){
        const errors=[];
        const listener=error=>errors.push(error.message);
        page.on('pageerror',listener);
        await page.goto(base+route+'.html',{waitUntil:'domcontentloaded',timeout:25000});
        await page.waitForFunction(()=>!!window.MIRPublicMenu?.version&&!!document.querySelector('.mir-client-menu-toggle'),{timeout:10000});
        const header=page.locator('header.mir-client-header'),menu=header.locator('.mir-client-menu-toggle'),nav=header.locator('nav.mir-client-links');
        const state=await page.evaluate(()=>{
          const h=document.querySelector('header.mir-client-header'),n=h.querySelector('nav.mir-client-links'),b=h.querySelector('.mir-client-menu-toggle'),estimate=h.querySelector('.mir-home-estimate');
          const est=estimate?.getBoundingClientRect();
          return {
            view:innerWidth,scroll:document.documentElement.scrollWidth,
            collapsed:n.hidden,
            expanded:b.getAttribute('aria-expanded'),
            menuVisible:getComputedStyle(b).display!=='none',
            navVisible:getComputedStyle(n).display!=='none',
            selection:n.querySelectorAll('a[href="selection.html"]').length,
            estimateVisible:!!est&&est.width>0&&getComputedStyle(estimate).display!=='none'&&est.left>=-2&&est.right<=innerWidth+2,
            linkCount:n.querySelectorAll('a').length,
            ariaControls:b.getAttribute('aria-controls')===n.id
          };
        });
        assert.ok(state.scroll<=state.view+2,size.name+' '+route+' : débordement horizontal '+JSON.stringify(state));
        assert.ok(state.estimateVisible,size.name+' '+route+' : estimation invisible');
        assert.equal(state.selection,1,size.name+' '+route+' : lien de sélection absent ou doublé');
        assert.ok(state.ariaControls,size.name+' '+route+' : aria-controls incorrect');
        assert.ok(state.linkCount>=6,size.name+' '+route+' : menu incomplet');
        if(size.width<=1100){
          assert.equal(state.collapsed,true,size.name+' '+route+' : menu non réduit au chargement');
          assert.equal(state.menuVisible,true);
          assert.equal(state.navVisible,false);
          assert.equal(state.expanded,'false');
          await menu.click();
          assert.equal(await menu.getAttribute('aria-expanded'),'true');
          assert.equal(await nav.isVisible(),true);
          const expanded=await page.evaluate(()=>{
            const n=document.querySelector('header.mir-client-header nav.mir-client-links');
            return {scroll:document.documentElement.scrollWidth,view:innerWidth,links:[...n.querySelectorAll('a')].map(x=>x.getBoundingClientRect()).every(r=>r.width>0&&r.left>=-2&&r.right<=innerWidth+2)};
          });
          assert.ok(expanded.links&&expanded.scroll<=expanded.view+2,size.name+' '+route+' : menu ouvert déborde');
          await page.keyboard.press('Escape');
          assert.equal(await menu.getAttribute('aria-expanded'),'false');
          assert.equal(await nav.isVisible(),false);
          assert.equal(await menu.evaluate(el=>document.activeElement===el),true,'Échap doit rendre le focus au bouton');
          if(route==='boutique'&&['mobile','tablette'].includes(size.name)){
            await menu.click();
            await header.locator('a[href="realisations.html"]').click();
            await page.waitForURL('**/realisations.html',{timeout:10000});
            assert.match(await page.title(),/réalisations/i);
            await page.goto(base+route+'.html',{waitUntil:'domcontentloaded'});
          }
        }else{
          assert.equal(state.collapsed,false,size.name+' '+route+' : navigation PC cachée');
          assert.equal(state.menuVisible,false);
          assert.equal(state.navVisible,true);
        }
        if(['boutique','realisations'].includes(route)&&['mobile','bureau'].includes(size.name)){
          await header.screenshot({path:path.join(artifacts,'mir-menu-'+route+'-'+size.name+'.png')});
        }
        assert.deepEqual(errors,[],size.name+' '+route+' : erreurs JS');
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
