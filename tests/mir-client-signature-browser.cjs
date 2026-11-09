'use strict';
/* Recette de première couche MIR Signature en navigateur réel (GH Actions). */
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const fp=path.resolve(dist,'.'+decodeURIComponent((req.url||'/').split('?')[0]));
 if(!fp.startsWith(dist+path.sep)||!fs.existsSync(fp)||!fs.statSync(fp).isFile()){res.writeHead(404);res.end('Introuvable');return;}
 res.writeHead(200,{'Content-Type':types[path.extname(fp)]||'application/octet-stream'});
 fs.createReadStream(fp).pipe(res);
});
const pages=['boutique','produit','selection','materiaux','pliage','plan','chantier','realisations'];
const sizes=[{id:'mobile360',width:360,height:780},{id:'mobile',width:390,height:844},{id:'tablette',width:820,height:900},{id:'desktop',width:1440,height:900},{id:'ultrawide',width:2560,height:1080}];
const brandSizes=[
  [320,568],[360,780],[390,844],[430,932],[844,390],
  [768,1024],[820,1180],[1024,768],[1180,820],
  [1280,720],[1440,900],[1920,1080],[2560,1080],[3440,1440]
];
async function checkBrandCards(browser,base){
  for(const [width,height] of brandSizes){
    const mobile=width<=430||height<500;
    const page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:width<=1180,reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await page.goto(base+'/boutique.html#collections',{waitUntil:'domcontentloaded'});
      const grid=page.locator('#shop-brand-directory');
      const cards=grid.locator('.brand-collection-card');
      await cards.first().waitFor({state:'visible'});
      await grid.locator('img').evaluateAll(images=>Promise.all(images.map(img=>{img.loading='eager';return img.decode()})));
      const layout=await grid.evaluate(el=>{
        const box=node=>node.getBoundingClientRect();
        const cards=[...el.querySelectorAll('.brand-collection-card')];
        const tiles=cards.map(c=>box(c.querySelector('.brand-collection-image')));
        const copy=cards.map(c=>box(c.querySelector('.brand-collection-copy')));
        return {
          count:cards.length, columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,
          fits:cards.every((c,i)=>box(c).right<=innerWidth+1&&tiles[i].right<=copy[i].left&&copy[i].right<=box(c).right),
          sameTile:tiles.every(t=>Math.abs(t.width-tiles[0].width)<1&&Math.abs(t.height-t.width)<1),
          height:Math.max(...cards.map(c=>box(c).height)), pageWidth:document.documentElement.scrollWidth,
          columnsAligned:cards.every(c=>getComputedStyle(c).display==='grid')
        };
      });
      assert.ok(layout.count>=20);
      assert.equal(layout.columns,width<=700?1:width<=1100?2:3);
      assert.ok(layout.fits&&layout.sameTile&&layout.columnsAligned);
      assert.ok(layout.pageWidth<=width+2,'Pas de débordement horizontal à '+width);
      if(width<=430)assert.ok(layout.height<=145,'Cartes compactes à '+width+' : '+layout.height);
      const kaycan=cards.filter({has:page.getByRole('heading',{name:'Kaycan',exact:true})});
      assert.match(await kaycan.locator('img').getAttribute('src'),/kaycan-soffit-installed/);
      const jdp=cards.filter({has:page.getByRole('heading',{name:'JDP / Juste du Pin',exact:true})});
      assert.equal(await jdp.locator('.brand-collection-image').getAttribute('data-framing'),'sample-crop');
      if([390,1024,1440,2560].includes(width)){
        await cards.first().scrollIntoViewIfNeeded();
        await page.screenshot({path:path.resolve(__dirname,'../artifacts/mir-boutique-fabricants-'+width+'x'+height+'.png')});
      }
      if([390,1440].includes(width)){
        await kaycan.click();
        await page.waitForURL('**/boutique.html?brand=Kaycan#collections');
        await page.locator('#shop-grid .manufacturer-group').first().waitFor({state:'visible'});
        assert.equal(await grid.isVisible(),false);
        assert.equal(await page.locator('#shop-brand').inputValue(),'Kaycan');
      }
      assert.deepEqual(errors,[]);
      console.log('PASS fabricants '+width+'×'+height+' · '+layout.columns+' colonne(s) · '+layout.count+' fabricants');
    }finally{await page.close();}
  }
}
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}
  catch(err){const bin=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>p&&fs.existsSync(p));if(!bin)throw err;browser=await chromium.launch({executablePath:bin,headless:true,args:['--no-sandbox']});}
  fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
  await checkBrandCards(browser,'http://127.0.0.1:'+server.address().port);
  let count=0;
  for(const size of sizes){
    const page=await browser.newPage({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
    for(const name of pages){
      await page.goto('http://127.0.0.1:'+server.address().port+'/'+name+'.html',{waitUntil:'domcontentloaded'});
      const sharedMenu=page.locator('#mir-harmony-menu'),sharedToggle=page.locator('.mir-harmony-toggle');
      const harmony=await sharedToggle.count()>0;
      if(harmony){assert.equal(await sharedMenu.isVisible(),false);await sharedToggle.click();}
      const result=await page.evaluate(()=>{
        const css=Array.from(document.styleSheets).some(sheet=>String(sheet.href||'').includes('mir-client-signature.css'));
        const logo=document.querySelector('header img[src="assets/MIR-logo-officiel-original.svg"]');
        const footer=document.querySelector('.mir-signature-footer');
        const box=footer?.getBoundingClientRect();
        const hero=document.querySelector('.shop-hero'),copy=hero?.querySelector('.shop-hero-copy');
        const frame=hero?.getBoundingClientRect(),content=copy?.getBoundingClientRect();
        return {compact:innerWidth<=760&&!!document.querySelector('header[data-mir-public-shell]'),theme:document.body.classList.contains('mir-signature'),css,
          accent:getComputedStyle(document.body).getPropertyValue('--mir-accent').trim(),
          paper:getComputedStyle(document.body).getPropertyValue('--mir-surface').trim(),
          footer:box?.width>0&&box.left>=0&&box.right<=innerWidth&&footer.querySelectorAll('nav a').length===5,
          heroFits:!hero||(content.top>=frame.top&&content.bottom<=frame.bottom&&content.left>=frame.left&&content.right<=frame.right),
          logo:!!logo,estimate:(()=>{
            const b=document.querySelector('header.mir-client-header .mir-home-estimate');
            const rect=b?.getBoundingClientRect();
            return !!(b&&rect&&rect.width>0&&getComputedStyle(b).display!=='none'&&rect.left>=-2&&rect.right<=innerWidth+2);
          })()};
      });
      assert.ok(result.theme&&result.css&&result.logo,name+' '+size.id+': thème ou logo absent');
      assert.equal(result.accent,'#348511',name+' '+size.id+': accent');
      assert.equal(result.paper,'#fafaf7',name+' '+size.id+': fond');
      assert.ok(result.compact||result.estimate,name+' '+size.id+': bouton Estimation masqué ou hors écran');
      assert.ok(result.footer,name+' '+size.id+': pied de page commun absent ou hors écran');
      assert.ok(result.heroFits,name+' '+size.id+': texte ou bouton du hero rogné');
      if(harmony){assert.match(await sharedMenu.locator('.mir-home-estimate').getAttribute('href'),/contact\.html$/);await page.keyboard.press('Escape');assert.equal(await sharedMenu.isVisible(),false);}
      if(['boutique','produit','selection','pliage','plan'].includes(name)){
        await page.screenshot({path:path.resolve(__dirname,'../artifacts/mir-signature-'+name+'-'+size.id+'.png')});
      }
      count++;
      console.log('PASS '+name+' / '+size.id);
    }
    await page.close();
  }
  console.log('MIR Signature navigateur : '+count+'/'+(pages.length*sizes.length)+' contrôles réussis');
 } finally {
  if(browser)await browser.close();
  server.close();
 }
}
main().catch(err=>{console.error(err);server.close();process.exitCode=1});
