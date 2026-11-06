'use strict';
// Real PostgreSQL execution in WASM, not an RLS mock. Supabase auth schema is
// represented by the minimal users/uid contract; hosted Auth/Storage need staging QA.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('../tools/database/node_modules/@electric-sql/pglite');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
test('Socle PostgreSQL : contraintes, RLS et sauvegardes',async t=>{
  const db=new PGlite();
  async function actor(user,sql,params=[]){
    await db.exec('begin; set local role authenticated;');
    try{
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);
      const r=await db.query(sql,params);await db.exec('commit');return r.rows;
    }catch(e){await db.exec('rollback');throw e;}
  }
  const count=(table,where='')=>`select count(*)::int as n from mir_core.${table} ${where}`;
  const reject=(user,sql,params,code)=>assert.rejects(actor(user,sql,params),e=>{assert.equal(e.code,code);return true;});
  try{
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
    await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/202611060001_shared_foundation.sql'),'utf8'));
    await db.exec(`insert into auth.users values ${[1,2,3,4,5,6].map(n=>`('${id(n)}')`).join(',')};
      insert into mir_core.organizations values('${id(10)}','MIR'),('${id(20)}','Autre');
      insert into mir_core.memberships values
      ('${id(10)}','${id(1)}','admin',true),('${id(10)}','${id(2)}','employee',true),
      ('${id(10)}','${id(3)}','client',true),('${id(20)}','${id(4)}','admin',true),
      ('${id(10)}','${id(5)}','employee',false),('${id(10)}','${id(6)}','client',true);
      insert into mir_core.catalogue_items(organization_id,id,name,channel,published,specification) values
      ('${id(10)}','${id(31)}','Magasin','store',true,'{}'),
      ('${id(10)}','${id(32)}','Boutique','boutique',true,'{}'),
      ('${id(10)}','${id(33)}','Brouillon','store',false,'{}');`);
    await t.test('Admin voit son organisation; aucune fuite inter-organisations',async()=>{
      assert.equal((await actor(id(1),count('catalogue_items')))[0].n,3);
      assert.equal((await actor(id(4),count('catalogue_items')))[0].n,0);
      assert.equal((await actor(id(1),count('organizations')))[0].n,1);
    });
    await t.test('Employé : Magasin publié; client : Boutique publiée; inactif refusé',async()=>{
      assert.deepEqual((await actor(id(2),'select name from mir_core.catalogue_items')).map(r=>r.name),['Magasin']);
      assert.deepEqual((await actor(id(3),'select name from mir_core.catalogue_items')).map(r=>r.name),['Boutique']);
      assert.equal((await actor(id(5),count('catalogue_items')))[0].n,0);
      assert.equal((await actor(id(2),count('suppliers')))[0].n,0);
    });
    await t.test('Accès anonyme et élévation de rôle interdits',async()=>{
      await db.exec('set role anon');
      await assert.rejects(db.query(count('catalogue_items')),e=>e.code==='42501');await db.exec('reset role');
      await reject(id(2),"insert into mir_core.memberships values($1,$2,'admin',true)",[id(20),id(2)],'42501');
      await reject(id(2),"insert into mir_core.models(organization_id,name) values($1,'forgé')",[id(10)],'42501');
      // Client-side metadata cannot override the authoritative membership.
      await db.query("select set_config('request.jwt.claim.role','admin',false)");
      assert.equal((await actor(id(2),'select mir_core.has_role($1,array[\'admin\']) as ok',[id(10)]))[0].ok,false);
    });
    await t.test('Modèles versionnés : isolation et instantanés immuables',async()=>{
      await actor(id(1),'insert into mir_core.models(organization_id,id,name) values($1,$2,$3)',[id(10),id(40),'Moulure']);
      await actor(id(1),'insert into mir_core.model_versions(organization_id,model_id,version,specification) values($1,$2,1,$3)',[id(10),id(40),{dimensions:{A:'1 1/2'},material:'acier',color:'noir'}]);
      await reject(id(1),"update mir_core.model_versions set specification='{}'",[],'42501');
      await reject(id(1),"insert into mir_core.model_versions(organization_id,model_id,version,specification) values($1,$2,1,'{}')",[id(10),id(40)],'23505');
      await reject(id(4),"insert into mir_core.model_versions(organization_id,model_id,version,specification) values($1,$2,1,'{}')",[id(20),id(40)],'23503');
      assert.equal((await actor(id(2),count('model_versions')))[0].n,0);
    });
    await db.exec(`insert into mir_core.suppliers(organization_id,id,name,email) values('${id(10)}','${id(50)}','Test','supplier@example.invalid');
      insert into mir_core.orders(organization_id,id,kind,owner_id,supplier_id) values
      ('${id(10)}','${id(60)}','supplier','${id(1)}','${id(50)}'),
      ('${id(10)}','${id(61)}','employee','${id(2)}',null),
      ('${id(10)}','${id(62)}','client','${id(3)}',null),
      ('${id(10)}','${id(63)}','client','${id(6)}',null);
      insert into mir_core.order_revisions(organization_id,order_id,revision,snapshot,created_by)
      select organization_id,id,1,'{}','${id(1)}' from mir_core.orders;`);
    await t.test('Employé et client lisent uniquement leurs propres demandes',async()=>{
      assert.deepEqual((await actor(id(2),'select id from mir_core.orders')).map(r=>r.id),[id(61)]);
      assert.deepEqual((await actor(id(3),'select id from mir_core.orders')).map(r=>r.id),[id(62)]);
      assert.equal((await actor(id(3),count('order_revisions')))[0].n,1);
      await reject(id(3),"insert into mir_core.orders(organization_id,kind,owner_id) values($1,'client',$2)",[id(10),id(3)],'42501');
    });
    await t.test('Une pièce peut être ajoutée sans modèle; quantités invalides refusées',async()=>{
      const sql="insert into mir_core.order_lines(organization_id,order_id,revision,quantity,unit,specification) values($1,$2,1,$3,'po',$4)";
      await actor(id(1),sql,[id(10),id(60),2,{dimensions:{A:'1/2'},length:120}]);
      assert.equal((await actor(id(1),'select model_id from mir_core.order_lines'))[0].model_id,null);
      await reject(id(1),sql,[id(10),id(60),-1,{}],'23514');
      assert.equal((await actor(id(2),count('order_lines')))[0].n,0);
    });
    await t.test('Suppression des historiques et écritures directes des envois interdites',async()=>{
      await reject(id(1),'delete from mir_core.order_revisions',[],'42501');
      await reject(id(1),"insert into mir_core.send_jobs(organization_id) values($1)",[id(10)],'42501');
      assert.equal((await actor(id(2),count('send_jobs')))[0].n,0);
    });
    await t.test('Document lié à la révision; contrainte empêche deux envois de la même révision',async()=>{
      await db.query('insert into mir_core.documents(organization_id,id,order_id,revision,object_path,sha256) values($1,$2,$3,1,$4,$5)',[id(10),id(70),id(60),'private/test.pdf','a'.repeat(64)]);
      const sql="insert into mir_core.send_jobs(organization_id,order_id,revision,document_id,operation,idempotency_key,recipient) values($1,$2,1,$3,'purchase-order',$4,'supplier@example.invalid')";
      await db.query(sql,[id(10),id(60),id(70),id(80)]);
      await assert.rejects(db.query(sql,[id(10),id(60),id(70),id(81)]),e=>e.code==='23505');
      await assert.rejects(db.query(sql,[id(10),id(61),id(70),id(82)]),e=>e.code==='23503');
      assert.equal((await actor(id(3),count('documents')))[0].n,0);
      const job=(await db.query('select id from mir_core.send_jobs')).rows[0].id;
      await assert.rejects(db.query("insert into mir_core.send_attempts(organization_id,job_id,status) values($1,$2,'accepted')",[id(10),job]),e=>e.code==='23514');
    });
    const backup={schema:'mir-local-backup-1',entries:[{key:'mir_production_templates_v1',raw:'{"version":1,"records":[]}'}]};
    const stage=(user,payload=backup)=>actor(user,'select mir_core.stage_local_backup($1,$2) as id',[id(10),payload]);
    await t.test('Migration en quarantaine : confirmation, dédoublonnage et aucune commande créée',async()=>{
      const a=await stage(id(1)),b=await stage(id(1));assert.equal(a[0].id,b[0].id);
      assert.equal((await actor(id(1),count('import_batches')))[0].n,1);
      assert.equal((await actor(id(1),count('orders')))[0].n,4);
      assert.deepEqual((await actor(id(1),'select backup from mir_core.import_batches'))[0].backup,backup);
      await actor(id(1),'select mir_core.revert_staged_backup($1,$2)',[id(10),a[0].id]);
      assert.equal((await actor(id(1),'select state from mir_core.import_batches'))[0].state,'reverted');
    });
    await t.test('Serveur refuse import étranger, employé, clé Auth, JSON corrompu et format absent',async()=>{
      for(const u of [id(2),id(3),id(4),id(5)])await assert.rejects(stage(u),e=>e.code==='42501');
      for(const payload of [{},null,{...backup,entries:[{key:'sb-auth-token',raw:'{}'}]}, {...backup,entries:[{key:backup.entries[0].key,raw:'null'}]}, {...backup,entries:[backup.entries[0],backup.entries[0]]}])
        await assert.rejects(stage(id(1),payload),e=>e.code==='22023');
    });
    await t.test('Désactivation : permissions révoquées à la prochaine requête',async()=>{
      await db.query('update mir_core.memberships set active=false where user_id=$1',[id(2)]);
      assert.equal((await actor(id(2),count('orders')))[0].n,0);
      assert.equal((await actor(id(2),count('catalogue_items')))[0].n,0);
    });
    await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/202611060003_shared_catalogue.sql'),'utf8'));
    await t.test('Publication unique, prix serveur et isolation du catalogue',async()=>{
      const sql='select mir_core.publish_model($1,$2,1,$3,$4) as revision';
      const settings={boutique:true,store:true,supplier_po:true,aluminum_cents:2500,steel_cents:3000,locked_measures:{A:'3 1/2'}};
      await reject(id(3),sql,[id(10),id(40),0,settings],'42501');
      assert.equal((await actor(id(1),sql,[id(10),id(40),0,settings]))[0].revision,1);
      assert.equal((await actor(id(3),count('model_publications')))[0].n,1);
      assert.equal((await actor(id(4),count('model_publications')))[0].n,0);
      await reject(id(3),'update mir_core.model_publications set steel_cents=1',[],'42501');
      await reject(id(1),sql,[id(10),id(40),0,settings],'40001');
      await actor(id(1),sql,[id(10),id(40),1,{...settings,archived:true}]);
      assert.equal((await actor(id(3),count('model_publications')))[0].n,0);
    });
    await t.test('Toutes les tables du schéma sont sous RLS',async()=>{
      const r=await db.query("select relname from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='mir_core' and relkind='r' and not relrowsecurity");assert.equal(r.rows.length,0);
    });
  }finally{await db.close();}
});
