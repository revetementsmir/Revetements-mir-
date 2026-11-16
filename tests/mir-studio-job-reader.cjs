'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/studio-job-reader-bridge.js','utf8'),TEST='hxtztkmbfpmzrieccwsg';
function setup({environment='test',projectRef=TEST,index={data:[{documentId:'doc',current:true,status:'draft'}]},onIndex}={}){
 const calls=[],listeners=[],events=[],status={phase:'ready',user:{id:'employee'},account:{organizationId:'org'}},canonical={documents:[{id:'doc',name:'MIR · synthetic',object_path:'org/job/family/doc.pdf'}],job:{id:'job'}};
 const sdk={createClient(){calls.push('createClient');return {async rpc(name,args){calls.push({name,args});if(name==='mir_job_dossier_snapshot')return {data:canonical,error:null};if(name==='mir_studio_site_document_index'){await onIndex?.(status);return index;}return {data:'canonical-other-rpc'};}};}};
 const portal={unchanged:{},create(options){const connection=options.sdk.createClient('synthetic.invalid','public');return {getStatus:()=>status,subscribe:f=>listeners.push(f),jobDossier:()=>connection.rpc('mir_job_dossier_snapshot',{org:'org',job:'job'}),other:()=>connection.rpc('unrelated')};}};
 const root={MIRPortalConfig:{environment,projectRef,supabaseUrl:`https://${projectRef}.supabase.co`},MIRPortalClient:portal};
 vm.runInNewContext(source,{window:root,document:{body:{},addEventListener:(...a)=>events.push(a),querySelectorAll:()=>[]},MutationObserver:class{observe(){}},Map,Proxy,Object,Reflect});
 return {root,portal,sdk,calls,status,listeners,events,canonical};
}
(async()=>{
 for(const options of [{environment:'production'},{projectRef:'another-project'}]){const s=setup(options);assert.equal(s.root.MIRPortalClient,s.portal);assert.equal(s.calls.length,0);assert.equal(s.events.length,0);}
 const s=setup(),c=s.root.MIRPortalClient.create({sdk:s.sdk});assert.equal(s.root.MIRPortalClient.unchanged,s.portal.unchanged);assert.deepEqual(await c.jobDossier(),{data:s.canonical,error:null});assert.equal((await c.other()).data,'canonical-other-rpc');assert.deepEqual(s.calls.filter(x=>x.name).map(x=>x.name),['mir_job_dossier_snapshot','mir_studio_site_document_index','unrelated']);
 const missing=setup({index:{data:null,error:{code:'PGRST202'}}});assert.equal((await missing.root.MIRPortalClient.create({sdk:missing.sdk}).jobDossier()).data,missing.canonical);
 const denied=setup({index:{data:null,error:{code:'42501'}}});assert.equal((await denied.root.MIRPortalClient.create({sdk:denied.sdk}).jobDossier()).error.code,'42501');
 const malformed=setup({index:{data:{wrong:true}}});assert.equal((await malformed.root.MIRPortalClient.create({sdk:malformed.sdk}).jobDossier()).error.code,'RESPONSE_UNCERTAIN');
 const changed=setup({onIndex:status=>{status.user={id:'another-employee'};}});assert.equal((await changed.root.MIRPortalClient.create({sdk:changed.sdk}).jobDossier()).error.code,'SESSION_CHANGED');
 console.log('PASS Studio job reader: production no-op, canonical client preserved, authorized metadata only, missing routine compatibility, access denial and account-switch rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
