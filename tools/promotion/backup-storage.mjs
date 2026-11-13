import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
const base=(process.env.MIR_SUPABASE_URL||'').replace(/\/$/,'');const key=process.env.MIR_SUPABASE_SERVICE_KEY;const out=process.env.MIR_STORAGE_BACKUP_DIR;
if(!base||!key||!out)throw Error('MIR_SUPABASE_URL, MIR_SUPABASE_SERVICE_KEY and MIR_STORAGE_BACKUP_DIR are required');
const headers={authorization:`Bearer ${key}`,apikey:key,'content-type':'application/json'};
const buckets=['mir-internal','mir-support'],objects=[];
const safe=name=>{if(!name||name.includes('\\')||name.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('UNSAFE_OBJECT_NAME');return name;};
await fs.mkdir(out,{recursive:true,mode:0o700});
for(const bucket of buckets){const queue=[''];for(let q=0;q<queue.length;q++){const prefix=queue[q];let offset=0;for(;;){const r=await fetch(`${base}/storage/v1/object/list/${bucket}`,{method:'POST',headers,body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}})});if(r.status===404)break;if(!r.ok)throw Error(`LIST_${bucket}_${r.status}`);const page=await r.json();for(const item of page){const name=prefix+item.name;if(!item.id){safe(name);queue.push(name+'/');continue;}safe(name);const d=await fetch(`${base}/storage/v1/object/authenticated/${bucket}/${name.split('/').map(encodeURIComponent).join('/')}`,{headers});if(!d.ok)throw Error(`GET_${bucket}_${d.status}`);const bytes=Buffer.from(await d.arrayBuffer()),target=path.join(out,bucket,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes,{mode:0o600});objects.push({bucket,name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}if(page.length<100)break;offset+=page.length;}}}
await fs.writeFile(path.join(out,'storage-manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),objects},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({buckets,objects:objects.length,output:out}));
