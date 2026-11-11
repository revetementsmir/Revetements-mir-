'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {once}=require('node:events'),{chromium}=require('playwright');
const fixture=require('./fixtures/mir-today.cjs');
const root=path.resolve(__dirname,'../dist'),out=process.env.MIR_TODAY_PROOF_DIR||path.resolve(__dirname,'../docs/verification/captures/today-phase2');
const before=process.env.MIR_TODAY_BEFORE==='1';
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}fs.readFile(file,(e,data)=>e?res.writeHead(404).end():res.writeHead(200,{'content-type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html','.json':'application/json'})[path.extname(file)]||'application/octet-stream'}).end(data));});
(async()=>{server.listen(0,'127.0.0.1');await once(server,'listening');let browser;try{
 browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});fs.mkdirSync(out,{recursive:true});
 const base='http://127.0.0.1:'+server.address().port;
 async function open(width,height,query=''){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<500,hasTouch:width<500});page.setDefaultTimeout(8000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base))return route.continue();if(url.startsWith('https://geocoding-api.open-meteo.com/'))return route.fulfill({json:{results:[{name:'Québec',country_code:'CA',latitude:46.8,longitude:-71.2}]}});if(url.startsWith('https://api.open-meteo.com/'))return route.fulfill({json:{current:{temperature_2m:8,weather_code:2,time:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T10:00'}}});return route.abort();});
  await page.route('**/catalogue-fd6866b49d21.json',r=>r.fulfill({json:[]}));
  await page.route('**/portal-client.js*',r=>r.fulfill({body:fs.readFileSync(root+'/portal-client.js','utf8')+'\n('+fixture.toString()+')();',contentType:'application/javascript'}));
  await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=()=>{throw Error('GPS ne doit pas être demandé par Aujourd’hui');};});
  await page.goto(base+'/chantier.html'+query);await page.getByRole('heading',{name:/JOB 353|Aucun chantier/}).first().waitFor();return {page,errors};
 }
 for(const [width,height]of[[360,800],[390,844],[430,932],[768,1024],[1024,768],[1440,900]]){
  for(const role of ['employee','chef']){const {page,errors}=await open(width,height,role==='chef'?'?chef=1':'');
   if(!before){await page.locator('[data-today-weather]').filter({hasText:/8.*°C/}).waitFor();assert.equal(await page.locator('[data-today-block]').count(),3);assert.equal(await page.locator('[data-punch]').count(),0);await page.getByText('Punch désactivé',{exact:true}).waitFor();await page.getByText('Poser les moulures de la façade',{exact:true}).waitFor();await page.screenshot({path:path.join(out,`after-${role}-${width}.png`),fullPage:true});assert.equal(await page.getByText('Avis déjà lu',{exact:true}).count(),0);assert.equal(await page.locator('[href^="javascript:"]').count(),0);
    await page.getByRole('button',{name:'Itinéraire',exact:true}).first().click();for(const name of ['Google Maps','Apple Plans','Waze'])assert.equal(await page.getByRole('link',{name,exact:true}).count(),1);await page.keyboard.press('Escape');
    if(role==='chef'){await page.locator('[data-task-complete]').click();await page.getByText('Terminées (1)',{exact:true}).waitFor();await page.getByRole('button',{name:'Terminer ma journée',exact:true}).click();await page.locator('#lead-report-form').waitFor();await page.keyboard.press('Escape');}else{assert.equal(await page.locator('[data-lead-report]').count(),0);await page.locator('#portal-navigation [data-view="plans"]').click();await page.locator('#portal-navigation [data-view="day"]').click();await page.getByText('Nouveau plan disponible',{exact:true}).waitFor();}
    assert.deepEqual(await page.evaluate(()=>window.__todayCalls.filter(c=>c[0]==='punch')),[]);
    const small=await page.locator('.mir-today button:visible,.mir-today a:visible,.mir-today summary:visible,.mir-today select:visible').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height<44).map(n=>n.textContent.trim()));assert.deepEqual(small,[],'cibles tactiles');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,role+' '+width);assert.deepEqual(errors,[]);if(before)await page.screenshot({path:path.join(out,`before-${role}-${width}.png`),fullPage:true});await page.close();
  }
 }
 if(!before){
  for(const query of ['?minimal=1','?chef=1&minimal=1']){const {page,errors}=await open(390,844,query);await page.getByText('141, rue du Chantier, Québec',{exact:true}).waitFor();await page.locator('[data-today-weather]').filter({hasText:/8.*°C/}).waitFor();await page.getByRole('button',{name:'Itinéraire',exact:true}).click();await page.getByRole('link',{name:'Google Maps',exact:true}).waitFor();assert.deepEqual(errors,[]);await page.close();}
  {const {page}=await open(390,844,'?punch=1');await page.getByRole('button',{name:'PUNCH IN',exact:true}).waitFor();assert.equal(await page.locator('[data-punch="out"]').count(),0);await page.close();}
  for(const query of ['?empty=1','?chef=1&empty=1','?denied=1']){const {page,errors}=await open(390,844,query);if(query.includes('empty')){assert.equal(await page.locator('[data-lead-report],[data-route-job],[data-punch]').count(),0);}else await page.getByText('Tâches indisponibles pour le moment.',{exact:true}).waitFor();assert.deepEqual(errors,[]);await page.close();}
  const {page}=await open(390,844);await page.route('https://api.open-meteo.com/**',r=>r.abort());await page.reload();await page.getByText('Météo indisponible',{exact:true}).waitFor();await page.getByRole('heading',{name:/JOB 353/}).waitFor();await page.close();
 }
 console.log('PASS Aujourd’hui '+(before?'captures avant':'6 formats × 2 rôles, navigation, tâches, notifications, fin de journée, météo en erreur, accès refusé et Punch désactivé'));
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
