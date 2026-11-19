'use strict';
// Real field UI with a deterministic, private fixture transport. SQL authority
// and durable RPC receipts are checked separately; this test makes no API call.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{serve}=require('./helpers/mir-static-http.cjs');
const fieldFixture=require('./helpers/mir-field-fixture.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/temporary-jobs/browser');
const portalSource=fs.readFileSync(path.join(root,'dist/portal-client.js'),'utf8');
const temporaryId='00000000-0000-4000-8000-000000000855';
function temporaryFixture(){
 const baseCreate=window.MIRPortalClient.create;
 window.MIRPortalClient.create=function(...args){
  const api=baseCreate(...args),rows=[];let listener=()=>{};
  const chef=location.search.includes('chef=1');
  const apply=status=>status?.snapshot?{...status,snapshot:{...status.snapshot,jobs:[...status.snapshot.jobs.filter(j=>!rows.some(r=>r.id===j.id)),...rows],temporaryJobs:{available:true,canCreate:true,canComplete:false,teamId:null,teamAssigned:false,jobs:rows,teams:[]}}}:status;
  const test=window.__temporaryFixture={calls:[],fail:false};
  return {...api,getStatus:()=>apply(api.getStatus()),subscribe(fn){listener=fn;api.subscribe(status=>fn(apply(status)));},
   async jobDossier(id){const row=rows.find(j=>j.id===id);return row?{job:{...row},documents:[],tasks:[],reports:[],extras:[],orders:[],activity:[]}:api.jobDossier(id);},
   async createTemporaryJob(payload,requestId){
    test.calls.push({payload,requestId});if(!chef)throw Error('Chef requis');
    if(test.fail)throw Error('Connexion interrompue. Réessayez.');
    const row={id:'00000000-0000-4000-8000-000000000855',jobId:'00000000-0000-4000-8000-000000000855',name:payload.name,address:payload.address,number:'',city:'',closed:false,revision:1,temporary:true,detailsStatus:'pending_details',teamId:null,teamAssigned:false,assignedMemberIds:[api.getStatus().snapshot.actorId]};
    rows.push(row);listener(apply(api.getStatus()));return{ok:true,jobId:row.id,temporary:true,detailsStatus:'pending_details',job:row};
   }
  };
 };
}
const report={fixture:true,realBackend:false,customerData:false,backendWrites:false,checks:[],errors:[]};
async function screen(page,name){await page.screenshot({path:path.join(out,name+'.png'),fullPage:true,animations:'disabled'});}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const server=await serve(path.join(root,'dist'));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
  for(const scenario of [{chef:false,width:390},{chef:true,width:360},{chef:true,width:430}]){
   const context=await browser.newContext({viewport:{width:scenario.width,height:844},isMobile:true,hasTouch:true,locale:'fr-CA',serviceWorkers:'block'});
   const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(e.message));
   await page.route('**/*',route=>{
    const url=new URL(route.request().url());if(url.origin!==server.base)return route.abort();
    if(url.pathname==='/portal-client.js')return route.fulfill({contentType:'application/javascript',body:portalSource+';('+fieldFixture.toString()+')();('+temporaryFixture.toString()+')();'});
    return route.continue();
   });
   await page.goto(server.base+'/chantier.html?recette=1'+(scenario.chef?'&chef=1':''));await page.locator('#field-header').waitFor();
   await page.locator('#portal-navigation [data-view=punch]').tap();
   if(!scenario.chef){assert.equal(await page.locator('[data-field-temporary-job]').count(),0,'employee cannot create even if a fixture advertises canCreate');report.checks.push('employee: creation absent');await context.close();continue;}
   const create=page.locator('[data-field-temporary-job]');await create.waitFor();const bounds=await create.boundingBox();assert.ok(bounds.height>=44,'temporary job action has a 44px touch target');
   await create.tap();const form=page.locator('#field-temporary-job-form');await form.waitFor();
   assert.match(await form.innerText(),/équipe n’est pas encore affectée/i);assert.equal(await form.locator('[name=address]').getAttribute('required'),null,'address is optional for the chef');
   await form.locator('[name=name]').fill('Chantier temporaire QA');
   await screen(page,'chef-form-'+scenario.width);
   await page.evaluate(()=>__temporaryFixture.fail=true);await form.locator('[type=submit]').tap();
   await form.locator('[data-temporary-job-state]').filter({hasText:'Connexion interrompue'}).waitFor();
   assert.equal(await form.locator('[name=name]').inputValue(),'Chantier temporaire QA','network failure preserves the form');
   assert.equal(await page.evaluate(()=>__fieldFixture.calls.filter(c=>c[0]==='punch').length),0);
   await page.evaluate(()=>__temporaryFixture.fail=false);await form.locator('[type=submit]').tap();await page.locator('#portal-dialog').waitFor({state:'hidden'});
   await page.waitForFunction(id=>document.querySelector('[data-field-punch-job]')?.value===id,temporaryId);
   assert.match(await page.locator('[data-field-punch-job] option:checked').innerText(),/Chantier temporaire QA/);
   assert.equal(await page.evaluate(()=>__temporaryFixture.calls.length),2,'one failed attempt and one successful retry');
   assert.equal(await page.evaluate(()=>__fieldFixture.calls.filter(c=>c[0]==='punch').length),0,'creation does not start or switch a Punch');
   assert.equal(await page.evaluate(()=>MIRPortalActiveClient.getStatus().snapshot.punch.activeShift),null);
   assert.equal(await page.locator('#portal-navigation').isVisible(),true);
   assert.deepEqual(await page.locator('#portal-navigation button span').allTextContents(),['Accueil','Commande','Punch','Messages','Plus']);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
   await page.getByRole('button',{name:'Commencer ma journée',exact:true}).waitFor();
   await screen(page,'chef-created-'+scenario.width);
   report.checks.push('chef '+scenario.width+': no-team creation, optional address, retry, returned job selected, no automatic Punch, preserved navigation');
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
  console.log('PASS temporary jobs mobile UI: employee refusal, chef 360/430px creation and retry, no automatic Punch.');
 }finally{if(browser)await browser.close();await server.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');}
})().catch(error=>{report.passed=false;report.error=error.message;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');console.error(error.stack||error);process.exitCode=1;});
