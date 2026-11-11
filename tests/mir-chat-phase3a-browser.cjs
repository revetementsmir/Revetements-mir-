'use strict';
// UI simulation only: fake users, messages, RPC results and Storage. No hosted calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {once}=require('node:events'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist'),out=process.env.MIR_CHAT_PROOF_DIR||path.resolve(__dirname,'../docs/verification/captures/chat-phase3a');
const phase3bOut=path.resolve(__dirname,'../docs/verification/captures/chat-phase3b');
function fixture(){
 const privateId='30000000-0000-4000-8000-000000000100',jobId='30000000-0000-4000-8000-000000000101',actorId='demo-employee-1',colleague='demo-employee-2';
 window.__chatCalls=[];window.__chatDenied=false;window.__chatClosed=false;
 const privateConversation={id:privateId,kind:'private',participants:[actorId,colleague],unread:1};
 const state={...window.MIREmployeeStore.createDemoState([]),actorId};
 const jobConversation={id:jobId,kind:'job',jobId:state.jobs[0].id,jobName:'Chantier fictif A',participants:[actorId,colleague]};
 const msg=(n,body)=>({id:'message-'+n,conversationId:privateId,senderId:colleague,body,sentAt:'2026-11-11T12:0'+n+':00Z',myReceipt:true});
 const recent=msg(3,'Message récent <img src=x onerror=alert(1)>'),old=[msg(1,'Message ancien 1'),msg(2,'Message ancien 2'),recent];
 let jobMessages=[{...msg(4,'Plan PDF chantier'),conversationId:jobId,myReceipt:false,attachmentPath:`${state.organizationId||'30000000-0000-4000-8000-000000000010'}/message/${jobId}/${colleague}/30000000-0000-4000-8000-000000000104.pdf`}];
 state.messaging={contacts:[{id:colleague,name:'Collègue fictif',role:'employe'}],teams:[],conversations:[privateConversation],messages:[recent],conversationPage:{hasMore:true,nextCursor:{id:privateId,createdAt:'date'}},messagePages:{[privateId]:{hasMore:true,nextCursor:{id:recent.id,sentAt:recent.sentAt}}}};
 let publish=()=>{};const ready=()=>({phase:'ready',snapshot:state});
 window.MIRPortalClient={...window.MIRPortalClient,create(){return {config:{},getStatus:ready,subscribe(fn){publish=fn;},async start(){publish(ready());},async refresh(){publish(ready());},
 async chatConversations(cursor){window.__chatCalls.push(['conversations',cursor]);return {items:[jobConversation],hasMore:false,nextCursor:null};},
 async chatSearch(query){window.__chatCalls.push(['search',query]);return {items:query==='récent'?[recent]:[],hasMore:false,nextCursor:null};},
 async chatMessages(conversation,cursor){window.__chatCalls.push(['messages',conversation,cursor]);if(window.__chatDenied)throw Error('Conversation non autorisée');const job=conversation===jobId;return {items:job?jobMessages:cursor?old:[recent],hasMore:!job&&!cursor,nextCursor:!job&&!cursor?{id:recent.id,sentAt:recent.sentAt}:null,conversation:job?{...jobConversation,readOnly:window.__chatClosed}:privateConversation};},
 async ackChatMessage(message){window.__chatCalls.push(['ack',message]);return {readAt:'2026-11-11T12:30:00Z'};},
 async uploadInternal(file,scope,entity){window.__chatCalls.push(['upload',file.type,scope,entity]);return `${state.organizationId||'30000000-0000-4000-8000-000000000010'}/message/${entity}/${actorId}/30000000-0000-4000-8000-000000000105.${file.type==='application/pdf'?'pdf':'png'}`;},
 async chatFileURL(path){window.__chatCalls.push(['file',path]);return URL.createObjectURL(new Blob(['fixture'],{type:path.endsWith('.pdf')?'application/pdf':'image/png'}));},
 async command(name,payload){window.__chatCalls.push(['command',name,payload]);assertFixture(name==='MESSAGE_SEND');jobMessages=[...jobMessages,{...msg(5,payload.body),senderId:actorId,conversationId:jobId}];return {ok:true,snapshot:state};},
 async jobDossier(){throw Error('Dossier non chargé dans cette fixture');},async signOut(){publish({phase:'signed_out'});}
 };}};
 function assertFixture(value){if(!value)throw Error('Unexpected fake command');}
}
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}fs.readFile(file,(e,data)=>e?res.writeHead(404).end():res.writeHead(200,{'content-type':({'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json'})[path.extname(file)]||'application/octet-stream'}).end(data));});
(async()=>{server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;let browser;try{
 browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});fs.mkdirSync(out,{recursive:true});fs.mkdirSync(phase3bOut,{recursive:true});
 for(const [width,height]of[[360,800],[390,844],[430,932],[768,1024],[1024,768],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<500,hasTouch:width<500});page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.route('**/catalogue-fd6866b49d21.json',r=>r.fulfill({json:[]}));
  await page.route('**/portal-client.js*',r=>r.fulfill({body:fs.readFileSync(root+'/portal-client.js','utf8')+'\n('+fixture.toString()+')();',contentType:'application/javascript'}));
  await page.goto(base+'/chantier.html');await page.getByRole('button',{name:/Messages/}).click();
  await page.getByRole('searchbox',{name:'Rechercher dans les messages'}).fill('récent');await page.getByRole('searchbox',{name:'Rechercher dans les messages'}).press('Enter');await page.getByText('Message récent <img src=x onerror=alert(1)>',{exact:true}).click();
  await page.getByText('Message récent <img src=x onerror=alert(1)>',{exact:true}).waitFor();assert.equal(await page.locator('.message-list img,.message-list script').count(),0);
  await page.getByRole('button',{name:'Messages précédents'}).click();await page.getByText('Message ancien 1',{exact:true}).waitFor();assert.equal(await page.locator('.message-list article').count(),3);
  assert.deepEqual(await page.locator('.message-list article p').allTextContents(),['Message ancien 1','Message ancien 2','Message récent <img src=x onerror=alert(1)>']);
  assert.equal(await page.getByRole('button',{name:'Messages précédents'}).count(),0);
  await page.getByRole('button',{name:'← Conversations'}).click();await page.getByRole('button',{name:'Conversations suivantes'}).click();
  await page.getByRole('button',{name:/Chantier · Chantier fictif A/}).click();await page.getByRole('heading',{name:'Chantier · Chantier fictif A'}).waitFor();
  assert.match(await page.locator('#message-form input[type=file]').getAttribute('accept'),/application\/pdf/);await page.getByText('Plan PDF chantier',{exact:true}).waitFor();
  await page.getByLabel('Message',{exact:true}).fill('Brouillon conservé');await page.getByRole('button',{name:'← Conversations'}).click();await page.getByRole('button',{name:/Chantier · Chantier fictif A/}).click();assert.equal(await page.getByLabel('Message',{exact:true}).inputValue(),'Brouillon conservé');
  await page.context().setOffline(true);await page.evaluate(()=>dispatchEvent(new Event('offline')));await page.getByText(/Hors ligne · le brouillon texte reste/).waitFor();assert.equal(await page.getByRole('button',{name:'Envoyer',exact:true}).isDisabled(),true);await page.getByRole('button',{name:/Ouvrir la pièce jointe/}).click();await page.locator('#portal-toast').filter({hasText:'Hors ligne'}).waitFor();await page.context().setOffline(false);await page.evaluate(()=>dispatchEvent(new Event('online')));
  await page.getByLabel('Message',{exact:true}).fill('Envoi fictif');await page.getByLabel('Joindre une photo ou un PDF').setInputFiles({name:'plan-qa.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF fixture UI')});await page.getByRole('button',{name:'Envoyer',exact:true}).click();await page.getByText('Envoi fictif',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__chatCalls.filter(c=>c[0]==='command').length),1);assert.deepEqual(await page.evaluate(()=>window.__chatCalls.find(c=>c[0]==='upload').slice(1)),['application/pdf','message','30000000-0000-4000-8000-000000000101']);
  if([390,768,1024,1440].includes(width)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(phase3bOut,`chat-${width}x${height}.png`),fullPage:true});}
  assert.equal(await page.evaluate(()=>window.__chatCalls.filter(c=>c[0]==='ack').length),1,'un reçu historique absent ne doit pas être accusé');
  await page.getByRole('button',{name:'← Conversations'}).click();await page.evaluate(()=>window.__chatClosed=true);await page.getByRole('button',{name:/Chantier · Chantier fictif A/}).click();
  await page.getByText('Chantier archivé · lecture seule.').waitFor();assert.equal(await page.locator('#message-form').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);
  if([390,1440].includes(width))await page.screenshot({path:path.join(out,`chat-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'← Conversations'}).click();await page.evaluate(()=>window.__chatDenied=true);await page.getByRole('button',{name:/Chantier · Chantier fictif A/}).click();
  await page.locator('#portal-toast').filter({hasText:'Conversation non autorisée'}).waitFor();assert.equal(await page.getByText('Message chantier',{exact:true}).count(),0);assert.equal(await page.locator('[data-conversation="30000000-0000-4000-8000-000000000101"]').count(),0);
  await page.getByRole('button',{name:'Aujourd’hui',exact:true}).click();assert.equal(await page.locator('[data-today-block]').count(),3);
  console.log(`PASS UI simulée ${width}x${height}: recherche, pagination, brouillon, hors ligne, envoi unique, lecture propre, archive, refus, Aujourd’hui intact`);await page.close();
 }
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
