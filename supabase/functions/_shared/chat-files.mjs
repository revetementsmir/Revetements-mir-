import { FileError,inspectFile,MAX_FILE_BYTES } from './chat-file-content.mjs';
const TEST_URL='https://hxtztkmbfpmzrieccwsg.supabase.co';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EXT={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/heic':'heic','image/heif':'heif','application/pdf':'pdf'};
export const PRIVATE_HEADERS={'Cache-Control':'private, no-store, max-age=0, must-revalidate','CDN-Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store','Surrogate-Control':'no-store','Pragma':'no-cache','Expires':'0','Vary':'Authorization, Origin','X-Content-Type-Options':'nosniff'};
export function canonicalPath(path,org,conversation){
 if(typeof path!=='string'||path.length>250||/[%\\\s?#\u0000-\u001f]/.test(path))throw new FileError('FILE_PATH',400);
 const p=path.split('/'),file=p[4]?.split('.');
 if(p.length!==5||p[0]!==org||p[1]!=='message'||p[2]!==conversation||!UUID.test(p[3])||file?.length!==2||!UUID.test(file[0])||!Object.values(EXT).includes(file[1]))throw new FileError('FILE_PATH',400);
 return path;
}
async function bounded(response,limit){
 if(Number(response.headers.get('content-length'))>limit)throw new FileError('FILE_SIZE',413);
 const reader=response.body?.getReader();if(!reader)throw new FileError('FILE_EMPTY',422);
 const chunks=[];let size=0;
 try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>limit){await reader.cancel();throw new FileError('FILE_SIZE',413);}chunks.push(item.value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return bytes;
}
export function createChatFileService({env,fetch:network=globalThis.fetch,randomUUID=()=>crypto.randomUUID()}={}){
 const get=k=>env?.get?.(k)??env?.[k];
 return async req=>{
  const origin=req.headers.get('origin'),headers={...PRIVATE_HEADERS};
  if(origin==='https://revetementsmir.github.io')headers['Access-Control-Allow-Origin']=origin;
  const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json'}});
  try{
   if(origin&&origin!=='https://revetementsmir.github.io')return json(403,{code:'ORIGIN_DENIED'});
   // Validation occurs before any upstream Storage request. Encodings are never decoded into trusted paths.
   if(!/^\/(?:functions\/v1\/)?mir-chat-files\/?$/.test(new URL(req.url).pathname)||new URL(req.url).search)return json(404,{code:'ROUTE_DENIED'});
   if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type'}});
   if(req.method!=='POST')return json(405,{code:'METHOD_DENIED'});
   if(!req.headers.get('content-type')?.startsWith('application/json'))return json(415,{code:'CONTENT_TYPE'});
   const host=get('SUPABASE_URL'),service=get('SUPABASE_SERVICE_ROLE_KEY');
   // This prepared implementation cannot accidentally operate on production.
   if(host!==TEST_URL||!service)return json(503,{code:'TEST_CONFIGURATION_REQUIRED'});
   const authorization=req.headers.get('authorization');if(!/^Bearer [A-Za-z0-9_.-]{20,}$/.test(authorization||''))return json(401,{code:'AUTH_REQUIRED'});
   let input;try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await bounded(req,Math.ceil(MAX_FILE_BYTES*4/3)+4096)));}catch(error){if(error instanceof FileError)throw error;throw new FileError('JSON_INVALID',400);}
   const {action,org,conversation,path,mime,base64}=input||{};
   if(!UUID.test(org||'')||!UUID.test(conversation||'')||!['upload','validate','download'].includes(action))throw new FileError('FILE_REQUEST',400);
   const allowed=action==='upload'?['action','org','conversation','mime','base64']:['action','org','conversation','path'];
   if(Object.keys(input).some(k=>!allowed.includes(k)))throw new FileError('FILE_REQUEST',400);
   if(action!=='upload')canonicalPath(path,org,conversation);
   const backend=async(url,init={})=>network(host+url,{...init,cache:'no-store',redirect:'error'});
   const auth=await backend('/auth/v1/user',{headers:{apikey:service,Authorization:authorization}});
   if(!auth.ok)return json(401,{code:'AUTH_REQUIRED'});
   const user=await auth.json();if(!UUID.test(user?.id||''))return json(401,{code:'AUTH_REQUIRED'});
   const rpc=async(name,args,admin=false)=>{
    const r=await backend('/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:service,Authorization:admin?'Bearer '+service:authorization,'Content-Type':'application/json'},body:JSON.stringify(args)});
    if(!r.ok)throw new FileError('FILE_ACCESS_DENIED',r.status>=500?503:403);return r.json();
   };
   const uploadAuth=()=>rpc('mir_chat_file_upload_authorize',{org,conversation});
   let bytes,objectPath=path,facts,uploaded;
   if(action==='upload'){
    if(!EXT[mime]||typeof base64!=='string'||base64.length%4||base64.length>Math.ceil(MAX_FILE_BYTES*4/3)+4||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw new FileError('FILE_ENCODING',400);
    const identity=await uploadAuth();if(identity.userId!==user.id)throw new FileError('FILE_ACCESS_DENIED',403);
    try{bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));}catch{throw new FileError('FILE_ENCODING',400);}inspectFile(bytes,mime);
    objectPath=canonicalPath(`${org}/message/${conversation}/${user.id}/${randomUUID()}.${EXT[mime]}`,org,conversation);
    const r=await backend('/storage/v1/object/mir-internal/'+objectPath,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':mime,'cache-control':'no-store','x-upsert':'false'},body:bytes});
    if(!r.ok)throw new FileError('UPLOAD_UNAVAILABLE',503);
    uploaded=await r.json();if(!UUID.test(uploaded?.Id||''))throw new FileError('UPLOAD_UNAVAILABLE',503);
    await uploadAuth(); // Revocation during upload must not result in a successful attachment.
   }
   const authorize=()=>rpc('mir_chat_file_authorize',{org,conversation,object_path:objectPath});
   facts=action==='upload'?{userId:user.id,path:objectPath,objectId:uploaded.Id,version:uploaded.version??null,mime,size:bytes.length}:await authorize();
   if(facts.userId!==user.id||facts.path!==objectPath||!EXT[facts.mime])throw new FileError('FILE_ACCESS_DENIED',403);
   if(action!=='upload'){
    const r=await backend('/storage/v1/object/authenticated/mir-internal/'+objectPath+'?cacheNonce='+randomUUID(),{headers:{apikey:service,Authorization:'Bearer '+service,'Cache-Control':'no-store'}});
    if(!r.ok)throw new FileError('FILE_UNAVAILABLE',r.status>=500?503:404);
    bytes=await bounded(r,MAX_FILE_BYTES);
   }
   if(bytes.length!==facts.size)throw new FileError('FILE_SIZE_MISMATCH',422);
   const inspected=inspectFile(bytes,facts.mime);
   const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   const proof=await rpc('mir_chat_file_record',{object_id:facts.objectId,object_version:facts.version,content_sha256:sha256,inspector:inspected.inspector,actor:user.id,expected_path:objectPath,expected_size:bytes.length,expected_mime:facts.mime},true);
   if(proof.objectId!==facts.objectId||proof.path!==objectPath||proof.size!==bytes.length||proof.mime!==facts.mime||facts.version!==null&&proof.version!==facts.version)throw new FileError('FILE_CHANGED',409);
   facts.version=proof.version;
   const latest=await authorize();
   if(latest.objectId!==facts.objectId||latest.version!==facts.version||latest.size!==facts.size||latest.mime!==facts.mime)throw new FileError('FILE_CHANGED',409);
   if(action!=='download')return json(200,{path:objectPath,mime:facts.mime,size:bytes.length,sha256,inspector:inspected.inspector});
   return new Response(bytes,{status:200,headers:{...headers,'Content-Type':facts.mime,'Content-Length':String(bytes.length),'Content-Disposition':'attachment; filename="'+objectPath.split('/').at(-1)+'"'}});
  }catch(error){if(error instanceof FileError)return json(error.status,{code:error.code});return json(503,{code:'FILE_SERVICE_UNAVAILABLE'});}
 };
}
