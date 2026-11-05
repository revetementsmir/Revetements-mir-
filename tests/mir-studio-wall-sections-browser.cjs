'use strict';
/* MIR — vérification Chrome des 3 surfaces 2D à leur Z réel. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const port=8803,base='http://127.0.0.1:'+port;
const pause=n=>new Promise(r=>setTimeout(r,n));
async function online(){
 for(let i=0;i<60;i++){
  const ok=await new Promise(resolve=>http.get(base+'/plan.html',r=>{r.resume();resolve(r.statusCode===200)}).on('error',()=>resolve(false)));
  if(ok)return;await pause(150);
 }
 throw Error('MIR plan server unavailable');
}
(async()=>{
 const artifact=path.join(__dirname,'../artifacts');fs.mkdirSync(artifact,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--directory',path.join(__dirname,'../dist'),'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try {
  await online();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const screen of [{name:'bureau',width:1440,height:900},{name:'mobile',width:390,height:844}]){
   const page=await browser.newPage({viewport:{width:screen.width,height:screen.height},hasTouch:screen.width<600});
   const errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
   await page.goto(base+'/plan.html',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>!!window.MIRStudioWallParts&&!!window.MIR3D&&!!document.querySelector('#zone-list .zone-button')&&typeof document.querySelector('#view-2d')?.onclick==='function',{timeout:30000});
   await page.locator('#view-2d').click();
   await page.locator('[data-face="right"]').click();
   const diagnostic=await page.evaluate(()=>({
     warning:window.MIR_SIDE_WALL_WARNING||null,
     loaded:!!window.MIRStudioWallParts,
     face:document.querySelector('[data-face="right"]')?.getAttribute('aria-pressed'),
     view2dWired:typeof document.querySelector('#view-2d')?.onclick==='function',
     projectName:document.querySelector('#project-name')?.textContent,
     svg:document.querySelector('#elevation svg')?.outerHTML.slice(0,300),
     excerpt:document.querySelector('#stage-subtitle')?.textContent
   }));
   console.log('STUDIO DIAGNOSTIC '+screen.name+' '+JSON.stringify(diagnostic));
   await page.locator('#elevation svg[data-mir-three-wall-explode="true"]').waitFor({timeout:6000});
   const svg=page.locator('#elevation svg');
   assert.equal(await svg.locator('[data-mir-wall-part]').count(),3);
   assert.equal(await svg.locator('[data-mir-masonry-band]').count(),3);
   assert.equal(await svg.locator('[data-mir-wall-opening]').count(),4,'Les ouvertures du mur du fond doivent rester visibles');
   for(const name of ['return-left','front','return-right']){
    assert.equal(await svg.locator('[data-mir-wall-part="'+name+'"]').count(),1);
   }
   const view=await svg.evaluate(node=>{
    const vb=node.viewBox.baseVal;
    const parts=[...node.querySelectorAll('[data-mir-wall-part]')].map(el=>({
      name:el.dataset.mirWallPart,top:Number(el.dataset.worldTop),
      bottom:Number(el.dataset.worldBottom),
      rect:el.getBoundingClientRect().width
    }));
    return {viewBox:[vb.x,vb.y,vb.width,vb.height],parts};
   });
   if(screen.width>650)assert.ok(view.viewBox[2]>1500,'Desktop should show three detached walls beside the house');
   else assert.ok(await svg.getAttribute('data-mir-walls-view-box'),'Mobile should offer the focused three-wall view');
   assert.equal(view.parts.length,3);
   assert.ok(view.parts.every(part=>Math.abs(part.top-6.2611)<.005),JSON.stringify(view.parts));
   const baseZ=view.parts.map(part=>part.bottom);
   assert.ok(Math.max(...baseZ)-Math.min(...baseZ)<.001);
   await page.locator('#stage').screenshot({path:path.join(artifact,'mir-studio-wall-parts-'+screen.name+'.png')});
   if(screen.width<=650){
     const nav=page.locator('#mir-side-wall-scroll'),svgElement=page.locator('#elevation svg');
     assert.equal(await nav.isVisible(),true,'Le bouton 3 murs doit être accessible sur téléphone');
     const metrics=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));
     assert.ok(metrics.doc<=metrics.view+2,'Aucun débordement horizontal de page '+JSON.stringify(metrics));
     const home=await svgElement.getAttribute('viewBox');
     assert.equal(home,await svgElement.getAttribute('data-mir-home-view-box'));
     await nav.click();
     const detail=await svgElement.getAttribute('viewBox');
     assert.notEqual(detail,home,'Le bouton doit recadrer la vue sur les trois murs');
     assert.ok(Number(detail.split(' ')[2])<Number(home.split(' ')[2]),'La vue des trois murs doit être agrandie');
     assert.equal(await nav.textContent(),'← Voir la maison');
     await page.locator('#stage').screenshot({path:path.join(artifact,'mir-studio-wall-parts-mobile-details.png')});
     await nav.click();
     assert.equal(await svgElement.getAttribute('viewBox'),home,'Retour à la vue complète de la maison');
   }
   await page.locator('[data-face="left"]').click();
   await page.locator('#elevation svg[data-mir-three-wall-explode="true"]').waitFor();
   assert.equal(await page.locator('#elevation [data-mir-wall-part]').count(),3);
   await page.locator('[data-face="front"]').click();
   assert.equal(await page.locator('#elevation [data-mir-wall-part]').count(),0);
   // Never change geometry or supplier choices when toggling detached views.
   const stable=async()=>page.evaluate(()=>{
     const state=JSON.parse(localStorage.getItem('mir-plan-study-v2')||'null')||{};
     return {selections:state.selections,customZones:state.customZones,
       zoneOverrides:state.zoneOverrides,openingOverrides:state.openingOverrides,
       recessOverride:state.recessOverride,volumeOverride:state.volumeOverride};
   });
   const saved=await stable();
   await page.locator('[data-face="right"]').click();
   assert.deepEqual(await stable(),saved,'Les surfaces détachées ne doivent pas modifier les matières, le volume ou les zones.');
   assert.deepEqual(errors,[]);
   console.log('PASS '+screen.name+': trois murs réels et maçonnerie à la même altitude, façade originale intacte');
   await page.close();
  }
 } finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
