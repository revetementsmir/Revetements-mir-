'use strict';
const {drawTwoSides}=require('./mir-draw-freeform-helper.cjs');
/* Vérification réelle Chromium de l'atelier admin (captures PC/tablette/mobile). */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const port = 8777;
const base = 'http://127.0.0.1:' + port;
function available() {
  return new Promise((resolve,reject)=>{
    let attempts=0;
    const tryIt=()=>http.get(base+'/production.html',response=>{
      response.resume();
      if(response.statusCode===200)resolve();
      else if(++attempts>40)reject(new Error('HTTP '+response.statusCode));
      else setTimeout(tryIt,200);
    }).on('error',()=>{if(++attempts>40)reject(new Error('Local server unavailable'));else setTimeout(tryIt,200);});
    tryIt();
  });
}
(async()=>{
  fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(__dirname,'../dist')],{stdio:'ignore'});
  let browser;
  try {
    await available();
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const viewport of [{width:1440,height:900,name:'bureau'},{width:1024,height:768,name:'tablette-paysage'},{width:820,height:1180,name:'tablette-portrait'},{width:390,height:844,name:'mobile'},{width:360,height:780,name:'mobile-compact'},{width:844,height:390,name:'mobile-landscape'}]){
      const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1,hasTouch:viewport.width<1100});
      const errors=[];
      page.on('pageerror',error=>errors.push(String(error)));
      await page.goto(base+'/production.html',{waitUntil:'domcontentloaded',timeout:25000});
      await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version,{timeout:25000});
      assert.equal(await page.locator('#production-title').textContent(),'Créer une moulure');
      assert.equal(await page.locator('#mir-v4-sheet-value').textContent(),'À préciser');
      assert.equal(await page.locator('#production-templates [data-template]').count(),0,'aucun profil imposé');
      await drawTwoSides(page);
      const phone=viewport.width<=650||viewport.width<=950&&viewport.height<=520;
      // Sur téléphone, Suivant termine le tracé via le vrai moteur : pas de second bouton caché.
      if(!phone)await page.locator('[data-freeform-finish]').click();
      if(phone){
        assert.equal(await page.locator('body.mir-mobile-stepper').count(),1,viewport.name+': atelier téléphone à 4 étapes actif');
        assert.equal(await page.locator('body').getAttribute('data-mir-mobile-step'),'1');
        const trace=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight,window:innerHeight,stage:document.querySelector('#production-drawing').getBoundingClientRect().height}));
        assert.ok(trace.scroll<=trace.window+4,viewport.name+': tracé sans défilement global '+JSON.stringify(trace));
        assert.ok(trace.stage>120,viewport.name+': surface de tracé accessible '+JSON.stringify(trace));
        await page.locator('#mir-freeform-toolbar [data-freeform-next]').click();
        assert.equal(await page.locator('body').getAttribute('data-mir-mobile-step'),'2');
      }
      await page.locator('[data-segment-length="0"]').fill('3');
      await page.locator('[data-segment-length="1"]').fill('2');
      assert.equal(await page.locator('#mir-v4-sheet-value').textContent(),'5 po');
      // Vrai angle intérieur aux sommets A–B : une rotation 30° signifie 150° entre côtés.
      const angleInput=page.locator('[data-bend-angle="0"]');
      const originalAngle=await angleInput.inputValue();
      await angleInput.fill('30');
      assert.match(await page.locator('#mir-angle-summary').textContent(),/150°/,
        viewport.name+' : angle intérieur, pas rotation 30°');
      assert.match(await page.locator('#production-drawing .mir-angle-annotation').first().textContent(),/150°/,
        viewport.name+' : angle directement localisé au sommet du dessin');
      await angleInput.fill(originalAngle);
      // Les deux boutons doivent afficher des profils graphiquement différents, pas une même icône.
      const variants=await page.locator('.mir-face-choice-image svg').evaluateAll(nodes=>nodes.map(node=>node.outerHTML));
      assert.equal(variants.length,2,'deux aperçus réels de la face peinte');
      assert.notEqual(variants[0],variants[1],'les deux faces affichent des résultats opposés');
      assert.equal(await page.locator('.mir-v4-sheet-total').count(),1);
      assert.equal(await page.locator('body.mir-admin-v4').count(),1);
      assert.equal(await page.locator('.kind-bar button').count(),2);
      assert.equal(await page.locator('.mir-destinations').isVisible(),false);
      assert.equal(await page.locator('#production-order').isVisible(),false);
      const layout=await page.evaluate(()=>{
        const box=selector=>{const b=document.querySelector(selector).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width};};
        return {scrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth,scrollHeight:document.documentElement.scrollHeight,screenHeight:window.innerHeight,drawing:box('.drawing-card'),config:box('.config-card')};
      });
      assert.ok(layout.scrollWidth<=layout.viewport+2,viewport.name+' horizontal overflow: '+JSON.stringify(layout));
      if(!phone&&viewport.width>=768){
        assert.ok(layout.config.left>=layout.drawing.right-5,'Tablet/PC two panes: '+JSON.stringify(layout));
        assert.ok(layout.scrollHeight<=layout.screenHeight+4,'Tablet/PC no global vertical scroll: '+JSON.stringify(layout));
      }else assert.ok(layout.config.top>=layout.drawing.bottom-10,'Phone stack: '+JSON.stringify(layout));
      assert.ok(await page.locator('.config-card').isVisible());
      // Contrats PC / iPad et parcours tactile en quatre étapes avec le même dessin.
      if(phone){
        assert.ok(await page.locator('#mir-angle-summary p').count()>=1,viewport.name+': angles entre les côtés');
        assert.ok(await page.locator('.mir-angle-annotation').count()>=1,viewport.name+': angles aussi sur le dessin');
        await page.locator('#mir-freeform-toolbar [data-freeform-next]').click();
        assert.equal(await page.locator('body').getAttribute('data-mir-mobile-step'),'3');
        assert.equal(await page.locator('.mir-face-choice').count(),2,viewport.name+': deux images de face peinte');
        await page.locator('[data-face-select="right"]').click();
        assert.equal(await page.locator('[data-face-select="right"]').getAttribute('aria-pressed'),'true');
        assert.equal(await page.locator('#profile-painted-side').inputValue(),'right');
        await page.locator('#mir-freeform-toolbar [data-freeform-next]').click();
        assert.equal(await page.locator('body').getAttribute('data-mir-mobile-step'),'4');
        assert.ok(await page.locator('#mir-freeform-3d-canvas').isVisible(),viewport.name+': vue 3D confirmée');
        await page.locator('#mir-freeform-toolbar [data-freeform-undo]').click();
        assert.equal(await page.locator('body').getAttribute('data-mir-mobile-step'),'3','Précédent ne détruit pas le dessin');
        assert.equal(await page.locator('[data-face-select="right"]').getAttribute('aria-pressed'),'true','Face peinte conservée');
      }else{
        await page.locator('#mir-v4-dimensions').evaluate(node=>{node.open=false;});
        const focusCotes=page.locator('#drawing-tools [data-focus-dimensions]');
        assert.equal(await focusCotes.isVisible(),true,viewport.name+' : action Cotes et angles visible sans ouvrir Autres actions');
        await focusCotes.click();
        assert.equal(await page.locator('#mir-v4-dimensions').evaluate(node=>node.open),true,viewport.name+' : dimensions ouvertes');
        assert.equal(await page.evaluate(()=>document.activeElement?.closest('#mir-v4-dimensions')?.id||''),'mir-v4-dimensions',viewport.name+' : focus sur une vraie cote');
        assert.equal(await page.locator('#production-dimensions input').first().isVisible(),true,viewport.name+' : champ de mesure visible');
        assert.equal(await page.locator('.mir-face-choice').count(),2,viewport.name+': deux aperçus de la face colorée');
        await page.locator('#panel-zoom-in').click();
        assert.ok((await page.locator('#panel-zoom-value').textContent()).includes('120'));
        await page.locator('.kind-bar [data-kind="panel"]').click();
        assert.equal(await page.locator('#production-title').textContent(),'Panneaux architecturaux');
        assert.equal(await page.locator('#mir-v4-sheet-total').isVisible(),false);
        await page.locator('.kind-bar [data-kind="profile"]').click();
        assert.equal(await page.locator('#production-title').textContent(),'Créer une moulure');
      }
      await page.screenshot({path:path.join(__dirname,'../artifacts/atelier-v4-'+viewport.name+'.png'),fullPage:true});
      assert.equal(await page.locator('[data-measure="length"]').inputValue(),'120');
      assert.equal(await page.locator('[data-measure="length"]').evaluate(input=>input.readOnly),true);
      if(errors.length)throw new Error(viewport.name+' JS errors: '+errors.join('; '));
      console.log('PASS '+viewport.name+' '+viewport.width+'x'+viewport.height+', no overflow, profile and panel, zoom 2D');
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
    await drawTwoSides(page);
    await page.locator('[data-freeform-finish]').click();
    await page.locator('[data-segment-length="0"]').fill('3');
    await page.locator('[data-segment-length="1"]').fill('2');
    await page.locator('#production-unit').selectOption('mm');
    assert.equal(await page.locator('#mir-v4-sheet-value').textContent(),'127 mm','Somme en mm');
    await page.locator('#production-unit').selectOption('in');
    assert.equal(await page.locator('#mir-v4-sheet-value').textContent(),'5 po','Retour en pouces');
    await page.locator('#add-production-piece').click();
    assert.equal((await page.locator('#order-head-count').textContent()).trim(),'01','Saving must not require PO');
    await page.locator('.mir-harmony-dossier').click();
    assert.equal(await page.locator('#production-order').isVisible(),true);
    console.log('PASS save draft without PO and open local dossier');
    await page.close();
    // Un dossier antérieur de 8 pi reste lisible et révisable sans altération.
    const legacy=await browser.newPage({viewport:{width:1440,height:900}});
    await legacy.goto(base+'/production.html',{waitUntil:'domcontentloaded'});
    await legacy.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
    const built=await legacy.evaluate(()=>{
      const M=window.MIRProduction;
      const source={kind:'profile',template:'l',unit:'in',dimensions:{A:3,B:2},
        length:96,quantity:2,coloredFace:{side:'left',segmentId:'A'},
        material:{type:'aluminium'},finish:{}};
      const template=M.createTemplate(source,{id:'modele-ancien-test',name:'Ancienne L 8 pi'});
      if(!template.ok)return {ok:false,errors:template.errors};
      const instance=M.instantiateTemplate(template.template,{
        id:'M001',instanceId:'M001',name:'Ancienne L 8 pi',unit:'in',
        measurements:{A:3,B:2,length:96},length:96,quantity:2,
        coloredFace:{side:'left',segmentId:'A'},material:{type:'aluminium'},finish:{}
      });
      if(!instance.ok)return {ok:false,errors:instance.errors};
      const order={id:'DOS-ANCIEN',project:'Dossier historique MIR',poNumber:'',
        foreman:'',date:'',revision:'A',notes:'',nextNumber:2,items:[{
          id:'M001',kind:'profile',spec:instance.spec,snapshot:instance.snapshot,
          history:[],selection:{colorSystem:'manufacturer',materialId:'',colorId:''}
        }]};
      localStorage.setItem('mir_production_admin_dossier_v1',JSON.stringify({version:1,order}));
      return {ok:true};
    });
    assert.equal(built.ok,true,'Ancien bon préparable : '+JSON.stringify(built.errors));
    await legacy.reload({waitUntil:'domcontentloaded'});
    await legacy.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
    await legacy.locator('.mir-harmony-dossier').click();
    assert.equal(await legacy.locator('[data-production-item="M001"]').count(),1,'Le bon de 8 pi doit rester visible');
    await legacy.locator('[data-edit-piece="M001"]').click();
    assert.equal(await legacy.locator('[data-measure="length"]').inputValue(),'96','Longueur historique intacte');
    assert.equal(await legacy.locator('[data-measure="length"]').evaluate(node=>node.readOnly),true);
    assert.match(await legacy.locator('.mir-profile-stock-note').first().textContent(),/historique/i);
    await legacy.locator('#add-production-piece').click();
    const saved=await legacy.evaluate(()=>JSON.parse(localStorage.getItem('mir_production_admin_dossier_v1')).order.items);
    assert.equal(saved.length,1,'La révision ne duplique pas la pièce');
    assert.equal(Number(saved[0].spec.length),96,'Aucune modification silencieuse de longueur');
    assert.equal(saved[0].history.length,1,'Snapshot précédent conservé');
    assert.equal(Number(saved[0].history[0].spec.length),96);
    console.log('PASS ancien dossier 8 pi : lecture, révision et historique préservés');
    await legacy.close();
    // Le parcours client conserve sa présentation et ses fonctions.
    const client=await browser.newPage({viewport:{width:390,height:844}});
    await client.goto(base+'/production.html?mode=client',{waitUntil:'domcontentloaded'});
    await client.waitForFunction(()=>!!window.MIRProductionWorkspace?.version);
    assert.equal(await client.locator('body.mir-admin-v4').count(),0);
    console.log('PASS client unaffected');
    await client.close();
  } finally {
    if(browser)await browser.close();
    server.kill();
  }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
