'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const snapshot=require('../../docs/verification/production-schema/production-schema.json');
const owners=require('../../docs/verification/production-schema/owners.json');
for(const f of require('../../docs/verification/production-schema/storage-trigger-functions.json'))if(!snapshot.functions.some(x=>x.schema===f.schema&&x.name===f.name&&x.identity===f.identity))snapshot.functions.push(f);
const qi=s=>'"'+s.replaceAll('"','""')+'"';
const lit=s=>"'"+s.replaceAll("'","''")+"'";
const name=(s,n)=>qi(s)+'.'+qi(n);
function acl(sql,acl,kind,target){
  sql.push(`revoke all on ${kind} ${target} from public,anon,authenticated,service_role;`);
  if(!acl)return;
  for(const item of acl.replace(/^\{|\}$/g,'').split(',')){
    const m=item.replaceAll('"','').match(/^([^=]*)=([^/]*)\/(.*)$/);if(!m)continue;
    const role=m[1]?qi(m[1]):'public';
    const map=kind==='function'?{X:'execute'}:kind==='schema'?{U:'usage',C:'create'}:{r:'select',a:'insert',w:'update',d:'delete',D:'truncate',x:'references',t:'trigger',m:'maintain'};
    sql.push(`set role ${qi(m[3])};`);
    for(const [code,priv]of Object.entries(map))if(m[2].includes(code))sql.push(`grant ${priv} on ${kind} ${target} to ${role}${m[2].includes(code+'*')?' with grant option':''};`);
    sql.push('reset role;');
  }
}
function schemaSql(){
  const sql=['set check_function_bodies=off;'];
  const roles=new Set(['anon','authenticated','service_role','supabase_auth_admin','supabase_storage_admin','supabase_admin','dashboard_user']);
  roles.add('pg_database_owner');
  for(const table of snapshot.tables)for(const entry of (table.acl||'').replace(/^\{|\}$/g,'').split(',')){const r=entry.split('=')[0].replaceAll('"','');if(r&&r!=='postgres')roles.add(r);}
  for(const p of snapshot.policies||[])for(const r of p.roles)if(r!=='public'&&r!=='postgres')roles.add(r);
  for(const r of roles)if(r!=='pg_database_owner')sql.push(`create role ${qi(r)};`);
  for(const s of ['auth','storage','mir_core','extensions'])sql.push(`create schema ${qi(s)};`);
  for(const e of snapshot.enums||[])sql.push(`create type ${name(e.schema,e.name)} as enum (${e.labels.map(lit).join(',')});`);
  for(const f of snapshot.functions.filter(f=>f.schema==='auth'))sql.push(f.definition+';');
  // Tables are created before constraints, so foreign-key order is immaterial.
  for(const t of snapshot.tables){
    const cols=t.columns.map(c=>`${qi(c.name)} ${c.type}${c.identity?` generated ${c.identity==='a'?'always':'by default'} as identity`:c.generated?` generated always as (${c.default}) stored`:c.default?` default ${c.default}`:''}${c.notnull?' not null':''}`);
    sql.push(`create table ${name(t.schema,t.name)} (${cols.join(',')});`);
  }
  for(const f of snapshot.functions.filter(f=>f.schema!=='auth'))sql.push(f.definition+';');
  for(const t of owners.tables)sql.push(`alter table ${name(t.schema,t.name)} owner to ${qi(t.owner)};`);
  for(const f of snapshot.functions){const owner=owners.functions.find(x=>x.schema===f.schema&&x.name===f.name&&x.identity===f.identity)?.owner;if(owner)sql.push(`alter function ${name(f.schema,f.name)}(${f.identity}) owner to ${qi(owner)};`);}
  for(const s of owners.schemas)sql.push(`alter schema ${qi(s.name)} owner to ${qi(s.owner)};`);
  for(const s of snapshot.schema_acl)acl(sql,s.acl,'schema',qi(s.name));
  for(const foreign of [false,true])for(const t of snapshot.tables)for(const c of t.constraints)if((c.type==='f')===foreign)sql.push(`alter table ${name(t.schema,t.name)} add constraint ${qi(c.name)} ${c.definition};`);
  for(const t of snapshot.tables){
    for(const i of t.indexes)sql.push(i.definition+';');
    for(const tr of t.triggers)sql.push(tr+';');
    if(t.rls)sql.push(`alter table ${name(t.schema,t.name)} enable row level security;`);
    if(t.force_rls)sql.push(`alter table ${name(t.schema,t.name)} force row level security;`);
    acl(sql,t.acl,'table',name(t.schema,t.name));
  }
  for(const p of snapshot.policies||[])sql.push(`create policy ${qi(p.policyname)} on ${name(p.schemaname,p.tablename)} as ${p.permissive} for ${p.cmd} to ${p.roles.map(r=>r==='public'?'public':qi(r)).join(',')}${p.qual?' using ('+p.qual+')':''}${p.with_check?' with check ('+p.with_check+')':''};`);
  for(const f of snapshot.functions){
    const target=`${name(f.schema,f.name)}(${f.identity})`;
    // NULL function ACL means the PostgreSQL default PUBLIC EXECUTE.
    acl(sql,f.acl===null?'{=X/postgres,postgres=X/postgres}':f.acl,'function',target);
  }
  for(const s of snapshot.schema_acl)acl(sql,s.acl,'schema',qi(s.name));
  for(const d of snapshot.defaults||[]){
    const kind=d.type==='f'?'functions':d.type==='r'?'tables':null;if(!kind)continue;
    for(const item of d.acl.replace(/^\{|\}$/g,'').split(',')){
      const m=item.match(/^([^=]*)=([^/]*)\//);if(!m)continue;
      const role=m[1]?qi(m[1]):'public';
      const map=d.type==='f'?{X:'execute'}:{r:'select',a:'insert',w:'update',d:'delete',D:'truncate',x:'references',t:'trigger'};
      for(const [code,priv]of Object.entries(map))if(m[2].includes(code))sql.push(`alter default privileges in schema ${qi(d.schema)} grant ${priv} on ${kind} to ${role};`);
    }
  }
  sql.push('set check_function_bodies=on;');
  return sql.join('\n');
}
async function initializeRehearsal(db){
  await db.exec(schemaSql());
  const {files}=require('./prepare-backend-transport.cjs');
  for(const file of files)await db.exec(fs.readFileSync(path.join(ROOT,'supabase/production-transport',file),'utf8'));
}
module.exports={ROOT,snapshot,schemaSql,initializeRehearsal,lit,qi,name};
if(require.main===module)process.stdout.write(schemaSql());
