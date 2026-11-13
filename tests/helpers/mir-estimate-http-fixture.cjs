'use strict';
/* Test-only HTTP mailbox. Never imported from dist or the production entrypoint. */
const http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createFileRepository}=require('../../server/estimate-service.cjs');
const {createResendProvider}=require('../../server/estimate-provider.cjs');
const {start}=require('../../server/estimate-server.cjs');
async function createFixture({origin='http://127.0.0.1:8765',privateBaseUrl=origin+'/estimation-dossier.html'}={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mir-estimate-browser-')),received=new Map(),attempts=[];let fail=false;
 const mailbox=http.createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const message=JSON.parse(Buffer.concat(chunks).toString()),key=req.headers['idempotency-key'];attempts.push({key,message});if(fail)return res.writeHead(503,{'content-type':'application/json'}).end('{"error":"fixture unavailable"}');let receipt=received.get(key);if(!receipt){receipt={id:'fixture-'+received.size,message};received.set(key,receipt);}res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({id:receipt.id}));}catch{res.writeHead(400).end();}});
 await new Promise(r=>mailbox.listen(0,'127.0.0.1',r));
 const repository=createFileRepository(dir),provider=createResendProvider({apiKey:'test-fixture-only',endpoint:'http://127.0.0.1:'+mailbox.address().port+'/emails',allowTestEndpoint:true}),authenticateStaff=async token=>token==='staff-test'?{id:'fixture-staff',role:'employee',organizationId:'fixture-org'}:token==='foreign-test'?{id:'fixture-foreign',role:'admin',organizationId:'foreign-org'}:null;
 const env={MIR_ESTIMATE_ENABLED:'true',MIR_ESTIMATE_DATA_DIR:dir,MIR_ESTIMATE_FROM:'MIR Test <sender@example.invalid>',MIR_ESTIMATE_TO:'capture@example.invalid',MIR_ESTIMATE_PRIVATE_URL:privateBaseUrl,RESEND_API_KEY:'test-fixture-only',MIR_ESTIMATE_ORGANIZATION_ID:'fixture-org',MIR_ESTIMATE_SUPABASE_URL:'https://fixture.supabase.co',MIR_ESTIMATE_SUPABASE_PUBLIC_KEY:'public-fixture-only',MIR_ESTIMATE_ALLOWED_ORIGINS:origin,MIR_ESTIMATE_RATE_SECRET:'fixture-only-rate-secret',MIR_ESTIMATE_STAFF_USER_IDS:'fixture-staff',MIR_ESTIMATE_RATE_MAX:'1000'};
 const runtime=await start({env,provider,authenticateStaff,repository,port:0,allowLocalTestOrigin:true});
 return {server:runtime.server,base:'http://127.0.0.1:'+runtime.server.address().port,received,attempts,repository,dir,setFail:value=>{fail=!!value;},async close(){await new Promise(r=>runtime.server.close(r));await new Promise(r=>mailbox.close(r));await fs.rm(dir,{recursive:true,force:true});}};
}
module.exports={createFixture};
