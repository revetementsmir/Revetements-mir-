'use strict';
/* Captures réelles Chrome : 2 côtés repliés, labels auto A B C D, mobile. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const port=8790,base='http://127.0.0.1:'+port,root=path.join(__dirname,'../dist'),output=path.join(__dirname,'../artifacts');
const pause=n=>new Promise(r=>setTimeout(r,n));
async function ready(){
 for(let i=0;i<50;i++){
  const code=await new Promise(resolve=>http.get(base+'/production.html',response=>{response.resume();resolve(response.statusCode)}).on('error',()=>resolve(0)));
  if(code===200)return;
  await pause(120);
 }
 throw new Error('Serveur non disponible');
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const server=spawn('python3',['-m','http.server',String(port),'--directory',root,'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const viewport of [
   {name:'mobile',width:390,height:844},
   {name:'mobile-compact',width:360,height:780},
   {name:'tablette',width:1024,height:900},
   {name:'bureau',width:1440,height:900}
  ]){
   const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},hasTouch:viewport.width<1100});
   const errors=[];page.on('pageerror',err=>errors.push(err.message));
   await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
   const facts=await page.evaluate(()=>{
    const P=window.MIRProduction,draw=document.querySelector('#production-drawing');
    const points=[[110,110],[520,110],[520,410],[520,110],[110,110]];
    const bends=[{mode:'signed',turnDeg:90},{mode:'hem',direction:'right',turnDeg:-180},{mode:'signed',turnDeg:90}];
    const model={kind:'profile',name:'A B C D · retours',unit:'in',
      segments:[{label:'A',lengthMM:50.8},{label:'B',lengthMM:38.1},
        {label:'C',lengthMM:38.1},{label:'D',lengthMM:50.8}],
      coloredFace:{side:'',segmentId:'A'},bends};
    const content=P.profileDiagramContent(model,points,{bends,markers:true});
    draw.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" role="img" aria-label="Profil double retour A B C D">'+content+'</svg>';
    const svg=draw.querySelector('svg'),markers=[...svg.querySelectorAll('.profile-side-marker')];
    const all=markers.map(marker=>{
      const box=marker.getBBox(),text=marker.querySelector('text');
      return {label:marker.dataset.markerLabel,x:Number(text.getAttribute('x')),y:Number(text.getAttribute('y')),
        box:{x:box.x,y:box.y,w:box.width,h:box.height}};
    });
    const stroke=svg.querySelector('path[d^="M"]')?.getAttribute('d')||'';
    return {markers:all,arcs:(stroke.match(/ A5 5/g)||[]).length,
      overflow:document.documentElement.scrollWidth-innerWidth,stroke};
   });
   const dict=Object.fromEntries(facts.markers.map(x=>[x.label,x]));
   assert.equal(facts.markers.length,4,'4 labels '+JSON.stringify(facts));
   for(const k of ['A','B','C','D'])assert.ok(dict[k],'Missing '+k+' '+JSON.stringify(facts));
   assert.ok(dict.A.y<110,'A above top '+JSON.stringify(dict));
   assert.ok(dict.D.y>110,'D below top '+JSON.stringify(dict));
   assert.ok(dict.B.x>520,'B right of vertical '+JSON.stringify(dict));
   assert.ok(dict.C.x<520,'C left of vertical '+JSON.stringify(dict));
   assert.equal(facts.arcs,2,'rounded return at B-C and D-A');
   assert.ok(facts.overflow<=2,'overflow: '+facts.overflow);
   for(let i=0;i<facts.markers.length;i++)for(let j=i+1;j<facts.markers.length;j++){
    const a=facts.markers[i].box,b=facts.markers[j].box;
    const overlap=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>0&&
      Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>0;
    assert.ok(!overlap,'Overlapping '+facts.markers[i].label+' / '+facts.markers[j].label);
   }
   await page.locator('#production-drawing').screenshot({path:path.join(output,'mir-retours-'+viewport.name+'.png')});
   if(viewport.name==='mobile'||viewport.name==='bureau'){
    const stage=page.locator('#production-drawing');
    const trace=async(x,y)=>{
     await stage.scrollIntoViewIfNeeded();
     const point=await stage.locator('svg').evaluate((svg,p)=>{
      const point=new DOMPoint(...p).matrixTransform(svg.getScreenCTM());
      return {x:point.x,y:point.y};
     },[x,y]);
     if(viewport.name==='mobile')await page.touchscreen.tap(point.x,point.y);
     else await page.mouse.click(point.x,point.y);
    };
    const choose=async(label)=>{
     const prompt=page.getByRole('dialog',{name:'De quel côté va le double pli ?'});
     await prompt.waitFor();
     const face=prompt.locator('[name=face]');
     if(await face.count())await face.selectOption('left');
     await prompt.getByRole('button',{name:label,exact:true}).click();
     await prompt.waitFor({state:'hidden'});
    };
    const arc=()=>stage.locator('svg > path[d*=" A5 5 "]').first().getAttribute('d');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
    await page.locator('#production-drawing[data-tool="draw"] svg').waitFor();
    if(viewport.name==='mobile')await page.locator('[data-open-mobile-trace]').tap();
    await trace(210,275);await trace(520,275);await trace(365,275);
    await choose('Annuler');
    assert.equal(await stage.locator('[data-draw-point]').count(),2);
    await trace(365,275);await choose('Intérieur');
    assert.match(await arc(),/ A5 5 0 0 1 /,'le retour intérieur est du côté opposé à la peinture');
    await page.locator('[data-drawing-undo]').click();
    await trace(365,275);await choose('Extérieur');
    assert.match(await arc(),/ A5 5 0 0 0 /,'le retour extérieur suit la face colorée');
    await page.locator('[data-draw-tool="draw"]').click();
    assert.match(await arc(),/ A5 5 0 0 0 /,'le sens reste appliqué après Terminer');
    console.log('PASS '+viewport.name+' double pli tracé : annulation, intérieur et extérieur');
   }
   assert.deepEqual(errors,[],'JavaScript errors: '+viewport.name);
   console.log('PASS '+viewport.name+' A/D et B/C arrondis, labels opposés, aucun chevauchement');
   await page.close();
  }
 } finally {if(browser)await browser.close();server.kill();}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1});
