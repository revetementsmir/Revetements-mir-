'use strict';
/* Local-only contract/transport regression tests. Edge HTTP is injected and
 * Node notifications are captured in memory: no backend, listener or email. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {randomUUID,randomBytes,createHash}=require('node:crypto');
const {LIMITS,PROJECT_DETAILS_VERSION,canonical,payloadOf,submissionManifest}=require('../supabase/functions/_shared/estimate-contract.mjs');
const {createService,createFileRepository}=require('../server/estimate-service.cjs');
const {edgeFixture}=require('./helpers/mir-estimate-edge-fixture.mjs');
const presentation=require('../dist/mir-estimate-presentation.js');

const types=['house','chalet','multi_unit','renovation'];
const timelines=['undecided','asap','within_3_months','within_6_months','later'];
const sources=['general','studio','cart','bending'];
const pdf=Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const clone=value=>structuredClone(value);
const legacy=source=>({
 version:1,source,contact:{name:'Recette locale',email:'capture@example.invalid',phone:'418 555-0100'},
 address:{street:'123, rue fictive',city:'Saint-Élie-de-Caxton',postalCode:'G0X 2N0'},note:'Conserver cette note et les pièces jointes.',
 ...(['cart','bending'].includes(source)?{selection:{materials:{items:[{name:'Article de recette',quantity:2,color:'Couleur de recette'}]},pieces:{order:{items:[{name:'Pli de recette',quantity:3}]}}}}:{}),
 ...(source==='studio'?{studio:{estimate:[{name:'Façade de recette',quantity:42}],previewOnly:[{name:'Aperçu exclu'}],faces:[{openings:[{width:3,height:4}]}]}}:{})
});
const details=(type='renovation',timeline='within_3_months')=>({type,timeline,dimensions:'42 × 32 pi\nDeux étages, mesures approximatives.',materials:'Fibrociment, soffites et moulures à confirmer.'});
const normalize=p=>payloadOf(JSON.stringify(p),LIMITS.maxPayloadBytes);
const metadata=source=>({id:'1',field:['cart','bending'].includes(source)?'dossier':'plans',filename:'plan-original.pdf',bytes:pdf.length,sha256:sha(pdf)});
const postNode=(handler,id,payload,source=payload.source)=>{
 const form=new FormData();form.set('requestId',id);form.set('payload',JSON.stringify(payload));
 form.append(metadata(source).field,new File([pdf],'plan-original.pdf',{type:'application/pdf'}));
 return handler(new Request('http://local/api/estimates',{method:'POST',body:form}));
};
const readNode=(handler,id)=>handler(new Request('http://local/api/estimates/'+id,{headers:{authorization:'Bearer staff-local'}}));
const edgeRequest=(f,route,{body,token}={})=>f.handler(new Request(f.base+'/functions/v1/mir-estimates'+route,{
 method:body?'POST':'GET',headers:{origin:f.origin,...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined
}));
async function nodeFixture(t){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mir-estimation-04-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const repository=createFileRepository(directory);await repository.init();const sent=[];
 const provider={supportsIdempotency:true,async send(message){assert.equal(message.to,'capture@example.invalid');sent.push(message);return {accepted:true,messageId:'local-'+sent.length};}};
 const config={enabled:true,sender:'MIR Local <sender@example.invalid>',recipient:'capture@example.invalid',privateBaseUrl:'https://example.invalid/estimation-dossier.html',organizationId:'org-local',staffUserIds:['staff-local'],allowedOrigins:[],rateMax:100};
 const authenticateStaff=async token=>token==='staff-local'?{id:'staff-local',role:'employee',organizationId:'org-local'}:null;
 const handler=createService({repository,provider,config,authenticateStaff});
 return {directory,repository,provider,config,authenticateStaff,handler,sent};
}

test('Estimation04 : anciennes formes et empreintes conservées pour les quatre provenances',()=>{
 for(const source of sources){
  const before=legacy(source),after=normalize(before),files=[metadata(source)];
  assert.deepEqual(after,before);assert.equal(Object.hasOwn(after,'projectDetails'),false);
  assert.equal(sha(canonical({payload:after,files})),sha(canonical({payload:before,files})));
  const manifest=submissionManifest({requestId:randomUUID(),payload:before,files});
  assert.deepEqual(manifest.payload,before);assert.deepEqual(manifest.files,files);
 }
});

test('Estimation04 : quatre types distincts, cinq échéanciers et champs complets jusqu’à 2000 caractères',()=>{
 for(const type of types)for(const timeline of timelines){
  const p={...legacy('general'),projectDetails:{type,timeline,dimensions:'é'.repeat(1999)+'D',materials:'à'.repeat(1999)+'M'}};
  const before=clone(p),actual=normalize(p);assert.deepEqual(actual,p);assert.deepEqual(p,before);
 }
 assert.notEqual(canonical(normalize({...legacy('general'),projectDetails:details('renovation')})),canonical(normalize({...legacy('general'),projectDetails:details('house')})));
 const optional=normalize({...legacy('general'),projectDetails:{type:'chalet'}});
 assert.deepEqual(optional.projectDetails,{type:'chalet'});
 assert.deepEqual(normalize({...legacy('general'),projectDetails:{type:'house',dimensions:'  ',materials:' Bois  '}}).projectDetails,{type:'house',dimensions:'',materials:'Bois'});
});

test('Estimation04 : erreur explicite au lieu de perdre un type, échéancier ou champ non pris en charge',()=>{
 const invalid=[null,[],false,{}, {type:'other'}, {type:'autre'}, {type:'renovation',timeline:'soon'}, {type:'house',timeline:null},
  {type:'house',dimensions:null}, {type:'house',materials:42}, {type:'house',dimensions:'x'.repeat(2001)}, {type:'house',materials:'x'.repeat(2001)},
  {type:'house',materials:'bois\u0000acier'}, {type:'house',municipality:'Québec'}];
 for(const projectDetails of invalid)assert.throws(()=>normalize({...legacy('general'),projectDetails}),e=>e.status===400&&['PROJECT_DETAILS','PROJECT_TYPE','PROJECT_TIMELINE','INPUT'].includes(e.code),JSON.stringify(projectDetails));
});

test('Estimation04 : les deux configurations annoncent la capacité sans activer l’envoi',async()=>{
 assert.equal(PROJECT_DETAILS_VERSION,1);
 const handler=createService({config:{enabled:false}}),node=await(await handler(new Request('http://local/api/estimates/config'))).json();
 const f=edgeFixture({enabled:false}),edge=await(await edgeRequest(f,'/config')).json();
 for(const config of [node,edge]){assert.equal(config.projectDetailsVersion,1);assert.equal(config.enabled,false);assert.deepEqual(config.limits,LIMITS);}
 assert.equal(f.records.size,0);assert.equal(f.accepted.size,0);
});

test('Estimation04 : Node conserve projet, coordonnées, sélection, notes et PDF ; reprise sans double notification',async t=>{
 const f=await nodeFixture(t);
 for(const [index,source] of sources.entries()){
  const id=randomUUID(),p={...legacy(source),projectDetails:details(types[index],timelines[index])};
  const sent=await postNode(f.handler,id,p);assert.equal(sent.status,201,await sent.text());
  const record=await(await readNode(f.handler,id)).json();assert.deepEqual(record.payload,p);
  const onDisk=JSON.parse(await fs.readFile(path.join(f.directory,'requests',id,'submission.json'),'utf8'));assert.deepEqual(onDisk.payload,p);
  assert.deepEqual(await f.repository.file(id,'1'),pdf);assert.deepEqual(record.files,[metadata(source)]);
  assert.match(f.sent.at(-1).text,/Type de projet/);assert.ok(f.sent.at(-1).text.includes(p.address.city));assert.ok(f.sent.at(-1).text.includes(p.note));
  const restarted=createService({repository:createFileRepository(f.directory),provider:f.provider,config:f.config,authenticateStaff:f.authenticateStaff});
  assert.equal((await postNode(restarted,id,p)).status,200);assert.equal(f.sent.length,index+1);
  const changed=clone(p);changed.projectDetails.materials+=' Nouvelle information';
  assert.equal((await postNode(restarted,id,changed)).status,409);assert.equal(f.sent.length,index+1);
 }
});

test('Estimation04 : Edge simule stockage et lecture intégraux avec documents et reprise identiques',async()=>{
 const f=edgeFixture();
 for(const [index,source] of sources.entries()){
  const p={...legacy(source),projectDetails:details(types[index],timelines[index])};
  const input={requestId:randomUUID(),resumeToken:randomBytes(32).toString('hex'),payload:p,files:[metadata(source)],challenge:await f.challenge()};
  const prepared=await edgeRequest(f,'/prepare',{body:input});assert.equal(prepared.status,200);
  for(const file of (await prepared.json()).files)await f.network(file.url,{method:'PUT',body:pdf});
  const submit={requestId:input.requestId,resumeToken:input.resumeToken};assert.equal((await edgeRequest(f,'',{body:submit})).status,200);
  const record=await(await edgeRequest(f,'/'+input.requestId,{token:'adjointe'})).json();assert.deepEqual(record.payload,p);assert.deepEqual(record.files,[metadata(source)]);
  assert.deepEqual(Buffer.from(f.objects.get(input.requestId+'/1.pdf')),pdf);
  const notice=[...f.accepted.values()].at(-1).body;assert.match(notice.text,/Type de projet/);assert.ok(notice.text.includes(p.address.city));
  assert.equal((await edgeRequest(f,'',{body:submit})).status,200);assert.equal(f.accepted.size,index+1);
  const changed=clone(input);changed.payload.projectDetails.timeline='later';
  assert.equal((await edgeRequest(f,'/prepare',{body:changed})).status,409);assert.equal(f.accepted.size,index+1);
 }
});

test('Estimation04 : demandes historiques déjà reçues restent reprenables avec leur empreinte existante',async t=>{
 const f=await nodeFixture(t),p=legacy('general'),id=randomUUID(),files=[{...metadata('general'),content:pdf}];
 const contentHash=sha(canonical({payload:p,files:[metadata('general')]}));
 await f.repository.create({id,payload:p,files,contentHash},{sender:f.config.sender,recipient:f.config.recipient,privateBaseUrl:f.config.privateBaseUrl});
 await f.repository.status(id,{state:'received'});
 assert.equal((await postNode(f.handler,id,p)).status,200);assert.equal(f.sent.length,0);
 assert.equal(Object.hasOwn((await(await readNode(f.handler,id)).json()).payload,'projectDetails'),false);
 const edge=edgeFixture(),input={requestId:randomUUID(),resumeToken:randomBytes(32).toString('hex'),payload:p,files:[],challenge:await edge.challenge()};
 assert.equal((await edgeRequest(edge,'/prepare',{body:input})).status,200);
 const record=edge.records.get(input.requestId);assert.equal(record.content_hash,sha(canonical({payload:p,files:[]})));
 record.state='received';assert.equal((await edgeRequest(edge,'/prepare',{body:input})).status,200);
 assert.equal((await edgeRequest(edge,'',{body:{requestId:input.requestId,resumeToken:input.resumeToken}})).status,200);
 assert.equal(edge.accepted.size,0);assert.equal(Object.hasOwn(record.payload,'projectDetails'),false);
});

test('Estimation04 : données de projet invalides refusées avant stockage ou notification dans les deux transports',async t=>{
 const f=await nodeFixture(t),edge=edgeFixture(),p={...legacy('general'),projectDetails:{type:'renovation',dimensions:'x'.repeat(2001)}};
 assert.equal((await postNode(f.handler,randomUUID(),p)).status,400);
 assert.deepEqual(await fs.readdir(path.join(f.directory,'requests')),[]);assert.equal(f.sent.length,0);
 const input={requestId:randomUUID(),resumeToken:randomBytes(32).toString('hex'),payload:p,files:[],challenge:await edge.challenge()};
 assert.equal((await edgeRequest(edge,'/prepare',{body:input})).status,400);assert.equal(edge.records.size,0);assert.equal(edge.accepted.size,0);
});

test('Estimation04 : résumé des notifications sans troncature des nouveaux champs, avec échappement HTML',async()=>{
 const p={...legacy('general'),projectDetails:{type:'renovation',timeline:'later',dimensions:'D'.repeat(1940)+'<script>fin-dimensions</script>',materials:'M'.repeat(1940)+'<img src=x onerror=1>fin-matériaux'}};
 const before=clone(p),n=presentation.notification({payload:p,requestNumber:'LOCAL-04',privateURL:'https://example.invalid/private'});
 assert.ok(n.text.includes(p.projectDetails.dimensions));assert.ok(n.text.includes(p.projectDetails.materials));
 for(const label of ['Rénovation','Plus tard','fin-dimensions','fin-matériaux']){assert.ok(n.text.includes(label));assert.ok(n.html.includes(label));}
 assert.match(n.html,/&lt;script&gt;/);assert.match(n.html,/&lt;img src=x onerror=1&gt;/);assert.doesNotMatch(n.html,/<script>|<img src=x/);
 assert.deepEqual(p,before);
 assert.equal(await fs.readFile('dist/mir-estimate-presentation.js','utf8'),await fs.readFile('supabase/functions/_shared/estimate-presentation.js','utf8'));
});
