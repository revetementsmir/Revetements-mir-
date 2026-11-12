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
  state.jobs[0].number='353';state.jobs[1].number='454';
  state.jobs[0].address='141, rue du Chantier, Québec';
  state.jobs[1].assignedMemberIds=[...(state.jobs[1].assignedMemberIds||[]),actorId];
  const employee=state.members.find(member=>member.id===actorId);employee.jobIds=[...new Set([...(employee.jobIds||[]),state.jobs[1].id])];
  const colleague=state.members.find(member=>member.id!==actorId&&member.role==='employee')||{id:'demo-employee-2',name:'Alex'};
  state.messaging={contacts:[{id:colleague.id,name:'Alex',role:'employee'}],teams:[],conversations:[{id:'00000000-0000-4000-8000-000000000501',kind:'private',participants:[actorId,colleague.id],unread:0}],messages:[{id:'00000000-0000-4000-8000-000000000502',conversationId:'00000000-0000-4000-8000-000000000501',senderId:actorId,body:'Plan mis à jour',sentAt:new Date().toISOString(),deliveredCount:1,readCount:1,recipientCount:1}]};
  state.expenses={role:'employe_chantier',categories:[{code:'materials',label:'Matériaux'}],expenses:[]};
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
for(const [width,height] of [[320,760],[360,800],[390,844],[768,1024],[820,900],[1024,900],[1366,768],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<=390,hasTouch:width<=390});
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
  await page.locator('.employee-current-job h1').waitFor();
  assert.equal(await page.locator('.employee-quick-grid > button').count(),4);
  assert.equal(await page.locator('#portal-navigation > button').count(),4);
  assert.equal(await page.locator('#portal-navigation').isVisible(),false);
  assert.equal(await page.locator('.portal-sidebar').isVisible(),false);
  const openPortalView=async view=>{await page.locator('.mir-harmony-toggle').click();await page.locator(`#portal-navigation [data-view="${view}"]`).click();};
  assert.equal(await page.getByRole('button',{name:/Messages/}).count(),1);
  assert.equal(await page.locator('#employee-job-switch option').count(),2);
  await noOverflow();
  if([390,768,1366,1440].includes(width)){fs.mkdirSync('docs/verification/god-mode-client',{recursive:true});await page.screenshot({path:`docs/verification/god-mode-client/portail-entete-${width}x${height}.png`,fullPage:true});}
  if(width===390){
    await page.getByRole('button',{name:'Aide et soutien'}).click();
    await page.locator('.mir-help-faq details').first().waitFor();
    assert.ok(await page.locator('.mir-help-faq details').count()>=4,'la FAQ essentielle reste disponible');
    await page.context().setOffline(true);await page.getByText(/Hors ligne/).first().waitFor();
    await page.context().setOffline(false);await page.locator('.mir-help-close').click();
  }
  await openPortalView('account');
  await page.getByRole('button',{name:/Mes dépenses et reçus/}).click();
  await page.getByRole('heading',{name:'Dépenses et reçus'}).waitFor();
  await page.locator('#expense-draft-form').waitFor();
  await noOverflow();
  if([390,768,1366,1440].includes(width))await page.screenshot({path:`docs/verification/god-mode-client/phase4-depenses-${width}x${height}.png`,fullPage:true});
  await openPortalView('day');
  await page.getByRole('button',{name:/Messages/}).click();
  await page.locator('[data-conversation]').click();
  await page.getByText('Plan mis à jour',{exact:true}).waitFor();
  assert.match(await page.locator('.message-list article small').innerText(),/Lu par 1 sur 1/);
  await openPortalView('day');
  await page.getByRole('button',{name:/Historique, notes et photos/}).click();
  await page.locator('#portal-dialog[open]').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/Commander/}).and(page.locator('.employee-quick-grid button')).click();
  await page.getByRole('heading',{name:'Commander du matériel'}).waitFor();
  await page.locator('#catalogue-category').selectOption('soffites-moulures');
  await page.getByRole('searchbox',{name:'Rechercher un article'}).fill('dépArt');
  const starter=page.locator('[data-product="mir-starter-10ft"]');
  assert.equal(await starter.locator('[data-product-qty]').inputValue(),'','aucune quantité implicite');
  await starter.getByRole('button',{name:'Ajouter',exact:true}).click();
  assert.equal(await page.locator('[data-scroll-cart]').count(),0,'une quantité vide ne peut pas être ajoutée');
  await starter.locator('[data-product-qty]').fill('2');
  await starter.getByRole('button',{name:'Ajouter',exact:true}).click();
  const firstJob=await page.locator('#order-job').inputValue(),secondJob=await page.locator('#order-job option').nth(2).getAttribute('value');
  await page.locator('#order-job').selectOption(secondJob);
  assert.equal(await page.locator('[data-scroll-cart]').count(),0,'le deuxième job ne reprend pas le panier du premier');
  await page.locator('#order-job').selectOption(firstJob);
  assert.equal(await page.locator('[data-scroll-cart]').count(),1,'le brouillon du premier job est conservé');
  await page.getByRole('button',{name:'Vérifier',exact:true}).click();
  await page.getByRole('heading',{name:'Vérifier ma commande'}).waitFor();
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
  if([390,768,1440].includes(width)){fs.mkdirSync('docs/verification/ux-commandes-pliages',{recursive:true});await page.screenshot({path:`docs/verification/ux-commandes-pliages/panier-${width}x${height}.png`,fullPage:true});}
  await page.getByRole('button',{name:'Envoyer ma commande'}).click();
  await page.getByRole('heading',{name:'Mes commandes'}).waitFor();
  assert.equal(await page.locator('.order-info').filter({hasText:'Fixture seulement'}).count(),1);
  await noOverflow();
  assert.deepEqual(errors,[]);
  console.log(width+' px: portail fermé, chantier, dossier, recherche, panier, retour, envoi simulé et suivi OK');
  await page.close();
}
} finally {await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
