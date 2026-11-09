'use strict';
/* Run behind an HTTPS reverse proxy with a mounted private durable volume.
 * GitHub Pages only hosts the public form; it cannot execute this process. */
const http=require('node:http');
const {Readable}=require('node:stream');
const {createService,createFileRepository,LIMITS}=require('./estimate-service.cjs');
const {createResendProvider,createSupabaseStaffAuthenticator}=require('./estimate-provider.cjs');
const required=['MIR_ESTIMATE_DATA_DIR','MIR_ESTIMATE_FROM','MIR_ESTIMATE_TO','MIR_ESTIMATE_PRIVATE_URL','RESEND_API_KEY','MIR_ESTIMATE_ORGANIZATION_ID','MIR_ESTIMATE_SUPABASE_URL','MIR_ESTIMATE_SUPABASE_PUBLIC_KEY','MIR_ESTIMATE_ALLOWED_ORIGINS','MIR_ESTIMATE_RATE_SECRET'];
function configuration(env){
 const missing=required.filter(key=>!env[key]);
 if(env.MIR_ESTIMATE_ENABLED!=='true')missing.push('MIR_ESTIMATE_ENABLED');
 return {missingConfiguration:missing,enabled:missing.length===0,dataDir:env.MIR_ESTIMATE_DATA_DIR,sender:env.MIR_ESTIMATE_FROM,recipient:env.MIR_ESTIMATE_TO||'estimation@revetementsmir.com',privateBaseUrl:env.MIR_ESTIMATE_PRIVATE_URL,organizationId:env.MIR_ESTIMATE_ORGANIZATION_ID,rateSecret:env.MIR_ESTIMATE_RATE_SECRET,rateMax:Math.max(1,Math.min(1000,Number(env.MIR_ESTIMATE_RATE_MAX)||8)),staffUserIds:(env.MIR_ESTIMATE_STAFF_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean),allowedOrigins:(env.MIR_ESTIMATE_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean),limits:LIMITS};
}
async function start({env=process.env,provider,authenticateStaff,repository,port=Number(env.PORT||8787),host=env.HOST||'127.0.0.1',allowLocalTestOrigin=false}={}){
 const config=configuration(env);
 if(config.enabled){
  const testOrigin=allowLocalTestOrigin&&provider&&authenticateStaff&&/@[^@]+\.invalid$/.test(config.recipient);
  const loopback=url=>testOrigin&&url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  const privateURL=new URL(config.privateBaseUrl);if(privateURL.protocol!=='https:'&&!loopback(privateURL))throw Error('MIR_ESTIMATE_PRIVATE_URL doit utiliser HTTPS');
  for(const origin of config.allowedOrigins){const parsed=new URL(origin);if(parsed.origin!==origin||(parsed.protocol!=='https:'&&!loopback(parsed)))throw Error('Les origines publiques doivent être des origines HTTPS exactes');}
 }
 // An unconfigured instance exposes only its public capabilities, no storage.
 repository||=config.dataDir?createFileRepository(config.dataDir):{init:async()=>{}};
 await repository.init();
 if(config.enabled){provider||=createResendProvider({apiKey:env.RESEND_API_KEY});authenticateStaff||=createSupabaseStaffAuthenticator({url:env.MIR_ESTIMATE_SUPABASE_URL,publishableKey:env.MIR_ESTIMATE_SUPABASE_PUBLIC_KEY,organizationId:config.organizationId});}
 const handle=createService({repository,provider,authenticateStaff,config});
 const server=http.createServer(async(req,res)=>{
  try{
   const abort=new AbortController();req.on('aborted',()=>abort.abort());
   const request=new Request('http://server'+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{}),signal:abort.signal});
   const response=await handle(request,{clientAddress:req.socket.remoteAddress});
   res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
  }catch{if(!res.headersSent)res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({ok:false,error:'INTERRUPTED',message:'La réponse a été interrompue. Reprenez le même brouillon.',retryable:true}));}
 });
 server.requestTimeout=120000;server.headersTimeout=30000;server.maxHeadersCount=40;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});return {server,handle,config};
}
if(require.main===module)start().then(({server,config})=>console.log('Service estimations MIR port '+server.address().port+' — '+(config.enabled?'configuré':'non raccordé (voir /api/estimates/config)'))).catch(error=>{console.error('Démarrage estimations impossible : '+error.message);process.exitCode=1;});
module.exports={start,configuration};
