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
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});}
  catch(err){const bin=[process.env.MIR_CHROMIUM_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>p&&fs.existsSync(p));if(!bin)throw err;browser=await chromium.launch({executablePath:bin,headless:true,args:['--no-sandbox']});}
  fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
  let count=0;
  for(const size of sizes){
    const page=await browser.newPage({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
    for(const name of pages){
      await page.goto('http://127.0.0.1:'+server.address().port+'/'+name+'.html',{waitUntil:'domcontentloaded'});
      const result=await page.evaluate(()=>{
        const css=Array.from(document.styleSheets).some(sheet=>String(sheet.href||'').includes('mir-client-signature.css'));
        const logo=document.querySelector('header img[src="assets/MIR-logo-officiel-original.svg"]');
        const footer=document.querySelector('.mir-signature-footer');
        const box=footer?.getBoundingClientRect();
        const hero=document.querySelector('.shop-hero'),copy=hero?.querySelector('.shop-hero-copy');
        const frame=hero?.getBoundingClientRect(),content=copy?.getBoundingClientRect();
        return {theme:document.body.classList.contains('mir-signature'),css,
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
      assert.ok(result.estimate,name+' '+size.id+': bouton Estimation masqué ou hors écran');
      assert.ok(result.footer,name+' '+size.id+': pied de page commun absent ou hors écran');
      assert.ok(result.heroFits,name+' '+size.id+': texte ou bouton du hero rogné');
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
