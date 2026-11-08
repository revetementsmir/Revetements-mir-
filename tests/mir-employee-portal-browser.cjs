const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const path=require('node:path');
const http=require('node:http');
const {once}=require('node:events');
const root=path.resolve(__dirname,'../dist');
const source=fs.readFileSync(path.join(root,'portal-client.js'),'utf8');
const types={'.js':'application/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){response.writeHead(404).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){response.writeHead(404).end();return;}
    response.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'}).end(data);
  });
});
const stub=`
window.MIRPortalClient={...window.MIRPortalClient,create({config}){
  const model=window.MIREmployeeStore;
  const actorId='demo-employee-1';
  let state={...model.createDemoState([]),actorId};
  state.jobs[0].address='141, rue du Chantier, Québec';
  let publish=()=>{};
  const ready=()=>({phase:'ready',snapshot:state});
  return {config,getStatus:()=>({phase:'loading'}),subscribe(fn){publish=fn;},async start(){publish(ready());},
    async refresh(){publish(ready());},async command(command,payload){
      const out=model.reduce(state,{...payload,type:command,actorId,at:new Date().toISOString(),requestId:crypto.randomUUID()});
      if(!out.ok)throw new Error(out.error?.message);
      state={...out.state,actorId};publish({...ready(),reason:'command'});return {...out,snapshot:state};
    }};
}};`;
(async()=>{
server.listen(0,'127.0.0.1');
await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
let browser;
try {
browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN});
for(const width of [320,360,390,820,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:width<=390?760:900},isMobile:width<=390,hasTouch:width<=390});
  page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/catalogue-fd6866b49d21.json',r=>r.fulfill({json:[]}));
  await page.goto(base+'/chantier.html?demo=1');
  await page.getByRole('heading',{name:'Mon compte MIR'}).waitFor();
  assert.equal(new URL(page.url()).search,'');
  const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await noOverflow();
  await page.route('**/portal-client.js*',r=>r.fulfill({body:source+'\n'+stub,contentType:'application/javascript'}));
  await page.reload();
  await page.getByRole('heading',{name:'Mes chantiers'}).waitFor();
  assert.equal(await page.locator('.employee-job').count(),1);
  await noOverflow();
  await page.getByRole('button',{name:'Voir le dossier'}).click();
  await page.locator('#portal-dialog[open]').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Commander',exact:true}).and(page.locator('.employee-job button')).click();
  await page.getByRole('heading',{name:'Commander du matériel'}).waitFor();
  await page.locator('#catalogue-category').selectOption('soffites-moulures');
  await page.getByRole('searchbox',{name:'Rechercher un article'}).fill('dépArt');
  const starter=page.locator('[data-product="mir-starter-10ft"]');
  await starter.getByRole('button',{name:'Ajouter',exact:true}).click();
  await page.getByRole('button',{name:'Vérifier',exact:true}).click();
  await page.getByRole('heading',{name:'Vérifier la demande'}).waitFor();
  assert.equal(await page.locator('#employee-browse').isVisible(),false);
  await noOverflow();
  const qty=page.locator('[data-cart-qty]');
  await qty.fill('3');
  await page.getByLabel('Réception').selectOption('pickup');
  await page.getByLabel('Note pour l’équipe').fill('Fixture seulement');
  await page.getByRole('button',{name:'Retour au matériel'}).click();
  await page.getByRole('button',{name:'Vérifier',exact:true}).click();
  assert.equal(await qty.inputValue(),'3');
  assert.equal(await page.getByLabel('Réception').inputValue(),'pickup');
  assert.equal(await page.getByLabel('Note pour l’équipe').inputValue(),'Fixture seulement');
  if(width===390){fs.mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/MIR-portail-employe-390.png'});}
  await page.getByRole('button',{name:'Envoyer ma demande'}).click();
  await page.getByRole('heading',{name:'Mes commandes'}).waitFor();
  assert.equal(await page.locator('.order-info').filter({hasText:'Fixture seulement'}).count(),1);
  await noOverflow();
  assert.deepEqual(errors,[]);
  console.log(width+' px: portail fermé, chantier, dossier, recherche, panier, retour, envoi simulé et suivi OK');
  await page.close();
}
} finally {await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
