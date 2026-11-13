import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TEST='https://hxtztkmbfpmzrieccwsg.supabase.co';
const A='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9',B='3005c762-de14-4ab0-8bc8-16c4be92d0a4';
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==';
const PDF='JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA3MiA3Ml0gPj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA0IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgoxODQKJSVFT0YK';
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});

Deno.serve(async req=>{
 let password='',created=false,provisioned=false,userId='';
 try{
  if(req.method!=='POST'||new URL(req.url).pathname!=='/mir-chat-tenant-b-recipe')return reply(404,{status:'denied'});
  const host=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(host!==TEST||!service)return reply(503,{status:'test-configuration-required'});
  const caller=req.headers.get('authorization')||'';if(!/^Bearer \S{20,}$/.test(caller))return reply(401,{status:'auth-required'});
  const api=async(path:string,init:RequestInit={},token=service)=>fetch(TEST+path,{...init,headers:{apikey:service,authorization:'Bearer '+token,'content-type':'application/json',...(init.headers||{})},cache:'no-store'});
  const account=await api('/rest/v1/rpc/mir_account_snapshot',{method:'POST',body:'{}'},caller.slice(7));
  const actor=await account.json();if(!account.ok||actor.role!=='admin'||actor.organizationId!==A)return reply(403,{status:'admin-a-required'});
  const users=await api('/auth/v1/admin/users?per_page=1000');const listed=await users.json();
  if(!users.ok)return reply(503,{status:'auth-admin-unavailable'});
  const fixtures=(listed.users||[]).filter((u:any)=>u.app_metadata?.mir_test_fixture==='phase3a_tenant_b');
  if(fixtures.length>1)return reply(409,{status:'duplicate-fixture'});
  const random=crypto.getRandomValues(new Uint8Array(36));password=btoa(String.fromCharCode(...random)).replace(/[+/=]/g,'x')+'Aa9!';
  const email='mir-phase3a-tenant-b@qa.invalid';
  if(fixtures.length){
   userId=fixtures[0].id;
   const reset=await api('/auth/v1/admin/users/'+userId,{method:'PUT',body:JSON.stringify({password})});
   if(!reset.ok)throw Error('AUTH_RESET');
  }else{
   const made=await api('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email,password,email_confirm:true,app_metadata:{mir_test_fixture:'phase3a_tenant_b'}})});
   const newUser=await made.json();if(!made.ok||!newUser.id)throw Error('AUTH_CREATE');created=true;userId=newUser.id;
  }
  const provision=await api('/rest/v1/rpc/mir_chat_tenant_b_recipe_provision',{method:'POST',body:JSON.stringify({actor:userId})});
  const fixture=await provision.json();if(!provision.ok||!fixture.jobId)throw Error('PROVISION_'+provision.status+'_'+String(fixture?.code||'NO_CODE'));provisioned=true;
  const login=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
  const session=await login.json();password='';if(!login.ok||!session.access_token)throw Error('LOGIN');const bToken=session.access_token;session.access_token='';session.refresh_token='';
  const rpc=async(token:string,name:string,args:unknown)=>{const r=await api('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(args)},token);let data:any=null;try{data=await r.json();}catch{}return{status:r.status,data};};
  const checks:{name:string,status:'passed'|'failed',http?:number}[]=[];
  const check=(name:string,ok:boolean,http?:number)=>checks.push({name,status:ok?'passed':'failed',http});
  const bc=await rpc(bToken,'mir_conversation_job',{org:B,job:fixture.jobId});check('B positive conversation',bc.status===200,bc.status);const bConversation=bc.data;
  const ac=await rpc(caller.slice(7),'mir_chat_conversations',{org:A,page_size:20,page_before:null});const aConversation=ac.data?.items?.[0]?.id;check('A positive conversation list',ac.status===200&&!!aConversation,ac.status);
  const ap=await rpc(caller.slice(7),'mir_chat_messages',{org:A,conversation:aConversation,page_size:1,page_before:null});check('A positive read',ap.status===200,ap.status);
  const bp=await rpc(bToken,'mir_chat_messages',{org:B,conversation:bConversation,page_size:1,page_before:null});check('B positive read',bp.status===200,bp.status);
  const ba=await rpc(bToken,'mir_chat_messages',{org:A,conversation:aConversation,page_size:1,page_before:null});check('B to A refused',ba.status===403,ba.status);
  const ab=await rpc(caller.slice(7),'mir_chat_messages',{org:B,conversation:bConversation,page_size:1,page_before:null});check('A to B refused',ab.status===403,ab.status);
  const file=async(token:string,org:string,conversation:string,body:any)=>{const r=await api('/functions/v1/mir-chat-files',{method:'POST',body:JSON.stringify({org,conversation,...body})},token);let data:any=null;try{data=await r.json();}catch{}return{status:r.status,data};};
  const af=await file(caller.slice(7),A,aConversation,{action:'upload',mime:'image/png',base64:PNG});check('A positive gateway upload',af.status===200,af.status);
  const bf=await file(bToken,B,bConversation,{action:'upload',mime:'image/png',base64:PNG});check('B positive gateway upload',bf.status===200,bf.status);
  const bReadsA=await file(bToken,A,aConversation,{action:'download',path:af.data?.path});check('B gateway to A refused',bReadsA.status===403,bReadsA.status);
  const aReadsB=await file(caller.slice(7),B,bConversation,{action:'download',path:bf.data?.path});check('A gateway to B refused',aReadsB.status===403,aReadsB.status);
  const apdf=await file(caller.slice(7),A,aConversation,{action:'upload',mime:'application/pdf',base64:PDF});check('A positive PDF gateway upload',apdf.status===200,apdf.status);
  const bpdf=await file(bToken,B,bConversation,{action:'upload',mime:'application/pdf',base64:PDF});check('B positive PDF gateway upload',bpdf.status===200,bpdf.status);
  const bReadsAPdf=await file(bToken,A,aConversation,{action:'download',path:apdf.data?.path});check('B PDF gateway to A refused',bReadsAPdf.status===403,bReadsAPdf.status);
  const aReadsBPdf=await file(caller.slice(7),B,bConversation,{action:'download',path:bpdf.data?.path});check('A PDF gateway to B refused',aReadsBPdf.status===403,aReadsBPdf.status);
  const failed=checks.filter(c=>c.status==='failed').length;
  return reply(failed?409:200,{status:failed?'FAILED':'CERTIFIED_TENANT_B',passed:checks.length-failed,failed,provisioned:true,reusedFixture:fixtures.length===1,clientBUntouched:true,production:'not-accessed',checks});
 }catch(error){
  password='';
  if(created&&!provisioned&&userId){try{const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';await fetch(TEST+'/auth/v1/admin/users/'+userId,{method:'DELETE',headers:{apikey:service,authorization:'Bearer '+service}});}catch{}}
  return reply(503,{status:'RECIPE_FAILED',passed:0,failed:1,provisioned,clientBUntouched:true,production:'not-accessed',failureClass:error instanceof Error?error.message:'UNKNOWN'});
 }
});
