'use strict';
const assert=require('node:assert/strict');
const {createServiceFixture}=require('./helpers/mir-team-service-fixture.cjs'),{id}=require('./helpers/mir-team-fixture.cjs');
(async()=>{const h=await createServiceFixture();try{
 const inv=await h.prepare(2,201,'new-local@example.invalid','chef_equipe');const token=h.token(inv);
 async function activate(patch={}){const r=await h.handler(new Request('https://edge.local',{method:'POST',headers:{origin:'https://localhost','content-type':'application/json'},body:JSON.stringify({action:'activate',token,email:'new-local@example.invalid',password:'nouveau-mot-de-passe-123',requestId:id(202),...patch})}));return{status:r.status,body:await r.json()};}
 assert.equal((await activate({email:'wrong@example.invalid'})).status,403);assert.equal(h.createCount(),0);
 let r=await activate();assert.equal(r.status,200);assert.equal(r.body.activated,true);assert.equal(r.body.session.access_token,'local-access-8');assert.equal(h.createCount(),1);
 const memberships=(await h.db.query('select m.role,m.active,s.staff_role,s.display_name from mir_core.memberships m join mir_core.staff_capabilities s using(organization_id,user_id) where m.user_id=$1',[id(8)])).rows;assert.deepEqual(memberships,[{role:'employee',active:true,staff_role:'chef_equipe',display_name:'Test Person'}]);
 assert.equal((await h.db.query('select count(*)::int n from mir_core.job_memberships where user_id=$1',[id(8)])).rows[0].n,1);
 assert.equal((await activate()).status,409);assert.equal(h.createCount(),1);
 await h.db.query('update mir_core.memberships set active=false where user_id=$1',[id(8)]);assert.equal((await activate()).status,409);assert.equal((await h.db.query('select active from mir_core.memberships where user_id=$1',[id(8)])).rows[0].active,false);
 console.log('PASS service + actual proposed SQL in PGlite: no-account activation, verified exact email, server role/jobs, replay without duplicate, disabled employee not reactivated. Auth provider simulated; no remote mutation or email.');
}finally{await h.db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
