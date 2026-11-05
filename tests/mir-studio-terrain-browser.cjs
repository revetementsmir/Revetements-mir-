'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const dist=path.resolve(__dirname,'../dist'),port=8807,base='http://127.0.0.1:'+port;
async function ready(){for(let i=0;i<70;i++){
 const ok=await new Promise(r=>http.get(base+'/plan.html',res=>{res.resume();r(res.statusCode===200)}).on('error',()=>r(false)));
 if(ok)return;await new Promise(r=>setTimeout(r,130));}
 throw Error('Studio test server unavailable');
}
(async()=>{
 const server=spawn('python3',['-m','http.server',String(port),'--directory',dist,'--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try{
  await ready();browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/plan.html',{waitUntil:'domcontentloaded'});
   try {
    await page.waitForFunction(()=>typeof window.MIR_STUDY?.snapshot==='function',null,{timeout:45000});
    assert.match(await page.locator('#project-name').textContent(),/^Étude MIR\b/,'Le studio doit ouvrir le projet de démonstration');
    const initialView=await page.evaluate(()=>window.MIR_STUDY.snapshot().view);
    assert.ok(['2d','3d'].includes(initialView),'Vue initiale inconnue : '+initialView);
    if(initialView!=='3d')await page.locator('#view-3d').click();
    await page.waitForFunction(()=>window.MIR3D?.diagnostics(document.querySelector("#three-canvas"))?.rendered===true,null,{timeout:45000});
   } catch(error) {
    const startup=await page.evaluate(()=>{
     const canvas=document.querySelector('#three-canvas'),rect=canvas?.getBoundingClientRect();
     return {
      project:document.querySelector('#project-name')?.textContent,
      view:document.querySelector('#view-3d')?.getAttribute('aria-pressed'),
      note:document.querySelector('#stage-note')?.textContent,
      subtitle:document.querySelector('#stage-subtitle')?.textContent,
      canvas:rect&&{width:rect.width,height:rect.height,hidden:canvas.hidden},
      diagnostics:window.MIR3D?.diagnostics(document.querySelector("#three-canvas"))
     };
    }).catch(()=>null);
    console.error('Studio terrain au démarrage '+width+'px : '+JSON.stringify({startup,errors}));
    throw error;
   }
   const first=await page.evaluate(()=>window.MIR3D?.diagnostics(document.querySelector("#three-canvas")));
   assert.equal(first.siteStyle,'commercial','Terrain commercial absent : '+width);
   assert.ok(first.sitePlan?.parkingBayCount>=3);
   assert.ok(first.returnMasonry?.heightMeters>0.5,'Brick return drawing not enabled');
   assert.ok(first.elevation>=5);
   await page.locator('#mir-zoom-in').click();
   await page.waitForFunction(()=>window.MIR3D?.diagnostics(document.querySelector("#three-canvas"))?.zoom>=1.24);
   const beforeWheel=await page.evaluate(()=>window.MIR3D?.diagnostics(document.querySelector("#three-canvas")).zoom);
   const center=await page.locator('#three-canvas').boundingBox();
   await page.mouse.move(center.x+center.width*.5,center.y+center.height*.5);
   await page.mouse.wheel(0,-240);
   await page.waitForFunction(n=>window.MIR3D?.diagnostics(document.querySelector("#three-canvas"))?.zoom>n,beforeWheel);
   const beforePinch=await page.evaluate(()=>window.MIR3D?.diagnostics(document.querySelector("#three-canvas")).zoom);
   await page.evaluate(()=>{
    const c=document.querySelector('#three-canvas'),r=c.getBoundingClientRect(),x=r.left+r.width*.55,y=r.top+r.height*.55;
    function send(type,id,dx){c.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',button:0,clientX:x+dx,clientY:y}));}
    send('pointerdown',101,-38);send('pointerdown',102,38);
    send('pointermove',101,-68);send('pointermove',102,68);
    send('pointerup',101,-68);send('pointerup',102,68);
   });
   await page.waitForFunction(n=>window.MIR3D?.diagnostics(document.querySelector("#three-canvas"))?.zoom>n,beforePinch);
   await page.locator('#mir-site-toggle').click();
   await page.waitForFunction(()=>window.MIR3D?.diagnostics(document.querySelector("#three-canvas"))?.siteStyle==='none');
   await page.locator('#mir-site-toggle').click();
   await page.waitForFunction(()=>window.MIR3D?.diagnostics(document.querySelector("#three-canvas"))?.siteStyle==='commercial');
   await page.locator('#orbit-under').click();
   await page.waitForFunction(()=>window.MIR3D?.diagnostics(document.querySelector("#three-canvas"))?.elevation===5);
   await page.locator('#mir-fullscreen').click();
   await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('#stage')||document.querySelector('#stage').classList.contains('mir-stage-fullscreen'));
   fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
   await page.locator('#stage').screenshot({path:path.resolve(__dirname,'../artifacts/mir-terrain-fullscreen-'+width+'.png')});
   await page.locator('#mir-fullscreen').click();
   await page.waitForFunction(()=>!document.fullscreenElement&&!document.querySelector('#stage').classList.contains('mir-stage-fullscreen'));
   assert.equal(errors.length,0,errors.join(' / '));
   console.log('PASS Studio terrain, retour brique, zoom roue/pincement, plein écran et angle sol '+width+'px');
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:1100,height:760}});
  await page.goto(base+'/plan.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.MIR3D?.render&&window.MIR3D?.studyDefaults);
  const pixels=await page.evaluate(async()=>{
    const E=window.MIR3D,s=E.studyDefaults(),base={...s,dimensions:E.defaults,views:{},angle:23,elevation:24,exportSize:{width:960,height:660},siteStyle:'none'};
    async function render(v){let c=document.createElement('canvas'),result=await E.render(c,{...base,returnMasonry:v});return {c,result};}
    const a=await render(null),b=await render({heightMeters:1.0,color:'#9a806c'});
    const x=a.c.getContext('2d').getImageData(0,0,960,660).data,y=b.c.getContext('2d').getImageData(0,0,960,660).data;
    let delta=0;for(let i=0;i<x.length;i+=4)if(Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2])>15)delta++;
    return delta;
  });
  assert.ok(pixels>60,'Brick on return walls must change visible pixels: '+pixels);
  console.log('PASS Brique réelle sur les petits murs de retrait, pixels modifiés : '+pixels);
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
