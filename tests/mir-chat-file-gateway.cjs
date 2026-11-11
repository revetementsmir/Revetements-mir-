'use strict';
// Service integration simulated with native Request/Response. No Supabase writes.
const {test}=require('node:test'),assert=require('node:assert/strict'),{png,chunk}=require('./fixtures/mir-chat-png.cjs'),{pdf}=require('./fixtures/mir-chat-pdf.cjs');
const id=n=>'60000000-0000-4000-8000-'+String(n).padStart(12,'0'),org=id(10),conversation=id(20),user=id(1),filename=id(30),path=`${org}/message/${conversation}/${user}/${filename}.png`;
const loaded=Promise.all([import('../supabase/functions/_shared/chat-files.mjs'),import('../supabase/functions/_shared/chat-file-content.mjs')]);
async function fixture(){
 const [{createChatFileService},content]=await loaded,bytes=png(),calls=[],files=new Map([[path,bytes]]);let active=true,validAuth=true,revokeWhileDownloading=false;
 const service=createChatFileService({env:{SUPABASE_URL:'https://hxtztkmbfpmzrieccwsg.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-test-fixture-not-a-secret'},randomUUID:()=>filename,fetch:async(url,init)=>{
  calls.push({url,init});if(url.endsWith('/auth/v1/user'))return Response.json(validAuth?{id:user}:{},{status:validAuth?200:401});
  if(url.includes('/rest/v1/rpc/')){
   const name=url.split('/').at(-1),args=JSON.parse(init.body);if(!active||args.org&&args.org!==org||args.conversation&&args.conversation!==conversation)return Response.json({},{status:403});
   if(name==='mir_chat_file_record')return Response.json({objectId:args.object_id,version:'1',path:args.expected_path,mime:args.expected_mime,size:args.expected_size,userId:args.actor});
   if(name==='mir_chat_file_upload_authorize')return Response.json({userId:user});
   const object=files.get(args.object_path);if(!object)return Response.json({},{status:400});
   return Response.json({userId:user,objectId:id(50),path:args.object_path,version:'1',mime:args.object_path.endsWith('.pdf')?'application/pdf':'image/png',size:object.length});
  }
  if(url.includes('/storage/v1/object/')){
   const key=url.slice(url.indexOf(org)).split('?')[0];
   if(init.method==='POST'){files.set(key,init.body);return Response.json({Key:key,Id:id(50),version:'1'});}
   if(revokeWhileDownloading)active=false;return new Response(files.get(key),{headers:{'Content-Type':'image/png'}});
  }
  throw Error('Unexpected upstream');
 }});
 const request=(body,options={})=>service(new Request('https://example.test/functions/v1/mir-chat-files',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer user-test-fixture-long-enough'},body:JSON.stringify({org,conversation,...body}),...options}));
 return{service,request,calls,files,bytes,content,revoke(){active=false;},reintegrate(){active=true;},invalidAuth(){validAuth=false;},revokeDuringRead(){revokeWhileDownloading=true;}};
}
test('PNG réel structure CRC et décompression, et limites annoncées',async()=>{
 const {content}=await fixture();assert.equal(content.inspectImage(png(),'image/png').inspector,'png-crc-inflate-v1');
 const invalid=[Buffer.from('not a PNG'),png().subarray(0,35),Buffer.concat([png(),Buffer.from('trailing')]),png({width:20000}),png({raw:Buffer.from([9,0,0,0,255])}),png({data:Buffer.from('invalid zlib')}),png({before:[chunk('acTL',Buffer.alloc(8))]})];
 const crc=png();crc[crc.length-1]^=1;invalid.push(crc);
 for(const bytes of invalid)assert.throws(()=>content.inspectImage(bytes,'image/png'),e=>e.status===422);
 assert.throws(()=>content.inspectImage(png({width:8192,height:8192}),'image/png'),e=>e.code==='PNG_DIMENSIONS_OR_HEADER'||e.code==='PNG_DECODE_LIMIT');
 assert.throws(()=>content.inspectImage(png(),'image/jpeg'),/FILE_CONTENT_TYPE/);
});
test('PDF passif structurellement valide; faux, tronqué et actif refusés',async()=>{
 const {content}=await fixture(),valid=pdf();assert.equal(content.inspectPdf(valid).inspector,'pdf-structure-v1');
 for(const bad of [Buffer.from('not a PDF'),valid.subarray(0,-8),Buffer.from(valid.toString('latin1').replace('/Type /Catalog','/Type /Catalog /JavaScript'),'latin1'),Buffer.from(valid.toString('latin1').replace(/startxref\n\d+/,'startxref\n12'),'latin1')])
  assert.throws(()=>content.inspectPdf(bad),e=>e.status===422);
 assert.throws(()=>content.inspectFile(Buffer.alloc(10*1024*1024+1),'application/pdf'),e=>e.status===413);
});
test('upload PDF valide passe par la même autorisation et les invalides restent avant Storage',async()=>{
 const s=await fixture(),bytes=pdf(),r=await s.request({action:'upload',mime:'application/pdf',base64:bytes.toString('base64')});assert.equal(r.status,200);const data=await r.json();
 assert.equal(data.path,path.slice(0,-3)+'pdf');assert.equal(data.mime,'application/pdf');assert.equal(data.inspector,'pdf-structure-v1');
 for(const bad of [Buffer.from('not a PDF'),bytes.subarray(0,-8)]){const x=await fixture(),response=await x.request({action:'upload',mime:'application/pdf',base64:bad.toString('base64')});assert.equal(response.status,422);assert.equal(x.calls.some(c=>c.url.includes('/storage/')),false);}
});
test('upload valide contrôlé avant Storage, chemin généré côté serveur, attestation privée',async()=>{
 const s=await fixture(),r=await s.request({action:'upload',mime:'image/png',base64:s.bytes.toString('base64')});assert.equal(r.status,200);const data=await r.json();assert.equal(data.path,path);assert.equal(data.inspector,'png-crc-inflate-v1');
 assert.match(data.sha256,/^[a-f0-9]{64}$/);assert.ok(s.calls.find(c=>c.url.endsWith('mir_chat_file_record')));
 assert.ok(!JSON.stringify(data).includes('server-test-fixture'));assert.ok(!JSON.stringify(data).includes('token='));
 assert.equal(s.calls.filter(c=>c.url.includes('/storage/')).length,1);
});
test('texte déclaré PNG, CRC faux, encodage faux : 4xx avant tout upload',async()=>{
 for(const base64 of [Buffer.from('not a PNG').toString('base64'),'@@==',png().subarray(0,30).toString('base64')]){
  const s=await fixture(),r=await s.request({action:'upload',mime:'image/png',base64});assert.ok([400,422].includes(r.status));assert.equal(s.calls.some(c=>c.url.includes('/storage/')),false);
 }
});
test('traversées encodées, doubles encodages, séparateurs et champs forgés : 4xx contrôlés',async()=>{
 for(const invalid of [path.replace(filename,'%2e%2e'),path.replace(filename,'%252e%252e'),path.replace(filename,'%2f'),path+'/../x',path+'?download=1',path.replace('/message/','\\message\\'),path.replace(conversation,id(21))]){
  const s=await fixture(),r=await s.request({action:'download',path:invalid});assert.equal(r.status,400,invalid);assert.equal(s.calls.length,0);
 }
 const s=await fixture(),r=await s.request({action:'upload',mime:'image/png',base64:s.bytes.toString('base64'),path});assert.equal(r.status,400);assert.equal(s.calls.length,0);
});
test('lecture privée POST non cachable; retrait, réintégration et aucune URL Storage exposée',async()=>{
 const s=await fixture();let r=await s.request({action:'download',path});assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),s.bytes);
 for(const name of ['Cache-Control','CDN-Cache-Control','Cloudflare-CDN-Cache-Control','Surrogate-Control'])assert.match(r.headers.get(name),/no-store/);
 assert.match(r.headers.get('Vary'),/Authorization/);s.revoke();r=await s.request({action:'download',path});assert.equal(r.status,403);assert.match(r.headers.get('Cache-Control'),/no-store/);
 s.reintegrate();assert.equal((await s.request({action:'download',path})).status,200);
});
test('révocation pendant la lecture ou auth invalide : aucun octet délivré',async()=>{
 const s=await fixture();s.revokeDuringRead();const r=await s.request({action:'download',path});assert.equal(r.status,403);assert.equal((await r.json()).code,'FILE_ACCESS_DENIED');
 const a=await fixture();a.invalidAuth();assert.equal((await a.request({action:'download',path})).status,401);
});
test('autre organisation, objet inexistant et autres conversations refusés',async()=>{
 const s=await fixture();assert.equal((await s.request({action:'download',org:id(11),path:path.replace(org,id(11))})).status,403);
 assert.equal((await s.request({action:'download',path:path.replace(filename,id(31))})).status,403);
 assert.equal((await s.request({action:'download',conversation:id(22),path:path.replace(conversation,id(22))})).status,403);
});
test('routes/méthodes invalides, origine hostile, et projet production : fail closed',async()=>{
 const s=await fixture();assert.equal((await s.request({action:'download',path},{headers:{'Content-Type':'application/json',Origin:'https://evil.invalid'}})).status,403);
 assert.equal((await s.service(new Request('https://example.test/functions/v1/mir-chat-files'))).status,405);
 assert.equal((await s.service(new Request('https://example.test/functions/v1/mir-chat-files/%252e%252e'))).status,404);
 const [{createChatFileService}]=await loaded;let calls=0;const wrong=createChatFileService({env:{SUPABASE_URL:'https://gccltmaulvrnthrbnrpd.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture'},fetch:()=>{calls++;}});
 assert.equal((await wrong(new Request('https://example.test/mir-chat-files',{method:'POST',headers:{'Content-Type':'application/json'}}))).status,503);assert.equal(calls,0);
});
