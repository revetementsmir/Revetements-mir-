import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
const base=(process.env.MIR_SUPABASE_URL||'').replace(/\/$/,'');const key=process.env.MIR_SUPABASE_SERVICE_KEY;const dir=process.env.MIR_STORAGE_BACKUP_DIR;
if(!base||!key||!dir||process.env.MIR_ALLOW_STORAGE_RESTORE!=='YES')throw Error('Explicit restore environment is required');
const manifest=JSON.parse(await fs.readFile(path.join(dir,'storage-manifest.json'),'utf8')),headers={authorization:`Bearer ${key}`,apikey:key};
const allowed=new Set(['mir-internal','mir-support']),safe=name=>{if(!name||name.includes('\\')||name.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('UNSAFE_OBJECT_NAME');return name;};
let restored=0,kept=0;
for(const item of manifest.objects){if(!allowed.has(item.bucket))throw Error('UNSAFE_BUCKET');safe(item.name);const file=await fs.readFile(path.join(dir,item.bucket,item.name));if(crypto.createHash('sha256').update(file).digest('hex')!==item.sha256)throw Error('HASH_MISMATCH');
 const url=`${base}/storage/v1/object/${item.bucket}/${item.name.split('/').map(encodeURIComponent).join('/')}`,existing=await fetch(url.replace('/object/','/object/authenticated/'),{headers});
 if(existing.ok){const bytes=Buffer.from(await existing.arrayBuffer());if(crypto.createHash('sha256').update(bytes).digest('hex')===item.sha256){kept++;continue;}throw Error('EXISTING_OBJECT_DIFFERS');}
 const r=await fetch(url,{method:'POST',headers:{...headers,'content-type':'application/octet-stream','x-upsert':'false'},body:file});if(!r.ok)throw Error(`RESTORE_${r.status}`);restored++;}
console.log(JSON.stringify({restored,kept}));
