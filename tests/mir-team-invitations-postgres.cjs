'use strict';
const assert=require('node:assert/strict');
const {createFixture,id}=require('./helpers/mir-team-fixture.cjs');
(async()=>{const {db,actor,action,prepare,token}=await createFixture();let count=0;try{
const ok=name=>{count++;console.log('PASS',name);};
await assert.rejects(()=>prepare(3,100));await assert.rejects(()=>prepare(4,101));await assert.rejects(()=>prepare(2,102,'user5@example.invalid','boss'));await assert.rejects(()=>prepare(1,103,'user5@example.invalid','admin'));await assert.rejects(()=>prepare(1,104,'user5@example.invalid','employe',id(31)));ok('manager/organization/role/job ACL');
let inv=await prepare(2,105);assert.equal(inv.deliveryStatus,'pending');assert.equal(inv.providerReceipt,undefined);
const replay=await prepare(2,105);assert.equal(replay.activationPath,undefined);assert.equal(replay.id,inv.id);await assert.rejects(()=>prepare(1,106));ok('preparation without send, idempotency, duplicate pending refused');
await assert.rejects(()=>actor(6,'select public.mir_team_accept_invitation($1) r',[token(inv)]));
const renewed=await action(2,'resend',107,{invitationId:inv.id});await assert.rejects(()=>actor(5,'select public.mir_team_accept_invitation($1) r',[token(inv)]));
assert.equal((await actor(5,'select public.mir_team_accept_invitation($1) r',[token(renewed)])).ok,true);
assert.equal((await actor(5,'select public.mir_team_accept_invitation($1) r',[token(renewed)])).alreadyAccepted,true);assert.equal((await db.query('select count(*)::int n from mir_core.memberships where user_id=$1',[id(5)])).rows[0].n,1);ok('wrong identity, rotated old link refused, acceptance and replay no duplication');
await db.query('update mir_core.memberships set active=false where user_id=$1',[id(5)]);await assert.rejects(()=>actor(5,'select public.mir_team_accept_invitation($1) r',[token(renewed)]));ok('disabled employee stays disabled on replay');
inv=await prepare(1,108,'user6@example.invalid');await db.query("update mir_core.account_invitations set expires_at=now()-interval '1 second' where id=$1",[inv.id]);await assert.rejects(()=>actor(6,'select public.mir_team_accept_invitation($1) r',[token(inv)]));ok('expired invitation refused');
inv=await prepare(1,109,'user7@example.invalid');await action(1,'revoke',110,{invitationId:inv.id});await assert.rejects(()=>actor(7,'select public.mir_team_accept_invitation($1) r',[token(inv)]));await assert.rejects(()=>action(1,'resend',111,{invitationId:inv.id}));ok('revoked link cannot be consumed or renewed');
await assert.rejects(()=>actor(1,'select public.mir_portal_accept_invitation($1) r',['a'.repeat(43)]));ok('legacy acceptance cannot bypass contract');
await assert.rejects(()=>action(2,'prepare',105,{email:'changed@example.invalid',name:'Test Person',role:'employe',jobIds:[id(30)]}));ok('idempotency key cannot be reused with another payload');
inv=await prepare(1,112,'user7@example.invalid','chef_equipe');
await db.query('insert into mir_core.memberships values($1,$2,$3,true)',[id(10),id(7),'employee']);await db.query('insert into mir_core.staff_capabilities values($1,$2,$3,$4,$2,true)',[id(10),id(7),'employe','Existing']);
await assert.rejects(()=>actor(7,'select public.mir_team_accept_invitation($1) r',[token(inv)]));assert.equal((await db.query('select staff_role from mir_core.staff_capabilities where user_id=$1',[id(7)])).rows[0].staff_role,'employe');ok('incompatible existing role is preserved');
await db.query('update auth.users set email_confirmed_at=null where id=$1',[id(6)]);inv=await prepare(1,113,'user6@example.invalid');await assert.rejects(()=>actor(6,'select public.mir_team_accept_invitation($1) r',[token(inv)]));ok('unconfirmed email cannot accept');
await db.exec('begin');await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[id(1),JSON.stringify({iss:'https://wrong-project.example/auth/v1'})]);await db.exec('set local role authenticated');await assert.rejects(()=>db.query('select public.mir_team_invitations()'));await db.exec('rollback');ok('foreign identity issuer refused');
async function enrollment(action,tok,email,request,user=null,tag='a'.repeat(64)){
 await db.exec('begin');try{await db.exec('set local role service_role');const r=(await db.query('select public.mir_team_enrollment($1,$2,$3,$4,$5,$6) r',[action,tok,email,id(request),user,tag])).rows[0].r;await db.exec('commit');return r;}catch(e){await db.exec('rollback');throw e;}
}
inv=await prepare(2,120,'user8@example.invalid');let t8=token(inv);
await assert.rejects(()=>actor(3,'select public.mir_team_enrollment($1,$2,$3,$4,$5,$6) r',['claim',t8,'user8@example.invalid',id(121),null,'a'.repeat(64)]));
await assert.rejects(()=>enrollment('claim',t8,'wrong@example.invalid',121));
let claimed=await enrollment('claim',t8,'user8@example.invalid',121);assert.equal(claimed.userId,null);assert.equal(claimed.invitationId,inv.id);await assert.rejects(()=>enrollment('claim',t8,'user8@example.invalid',122),/en cours/);ok('new identity enrollment is service-only, exact-email and atomically claimed');
await db.query('insert into auth.users values($1,$2,null,$3)',[id(8),'user8@example.invalid',JSON.stringify({mir_team_invitation:inv.id})]);
await assert.rejects(()=>enrollment('bind',t8,'user8@example.invalid',121,id(7)));
assert.equal((await enrollment('bind',t8,'user8@example.invalid',121,id(8))).userId,id(8));
await assert.rejects(()=>actor(8,'select public.mir_team_accept_invitation($1) r',[t8]));
await db.query('update auth.users set email_confirmed_at=now() where id=$1',[id(8)]);assert.equal((await actor(8,'select public.mir_team_accept_invitation($1) r',[t8])).ok,true);assert.equal((await enrollment('claim',t8,'user8@example.invalid',123)).existingAccount,true);ok('new unconfirmed identity has no business rights until verification and acceptance; no session replay');
inv=await prepare(1,124,'user3@example.invalid');assert.equal((await enrollment('claim',token(inv),'user3@example.invalid',125)).existingAccount,true);ok('existing account never enters privileged password enrollment');
inv=await prepare(2,126,'user9@example.invalid');const old9=token(inv);await enrollment('claim',old9,'user9@example.invalid',127);
await db.query('insert into auth.users values($1,$2,null,$3)',[id(9),'user9@example.invalid',JSON.stringify({mir_team_invitation:inv.id})]);
const fresh9=await action(2,'resend',128,{invitationId:inv.id});await assert.rejects(()=>enrollment('bind',old9,'user9@example.invalid',127,id(9)));assert.equal((await enrollment('bind',token(fresh9),'user9@example.invalid',127,id(9))).userId,id(9));
await action(2,'revoke',129,{invitationId:inv.id});await assert.rejects(()=>enrollment('bind',token(fresh9),'user9@example.invalid',127,id(9)));ok('rotation and revocation invalidate in-flight enrollment capabilities');
inv=await prepare(2,130,'user10@example.invalid');await enrollment('claim',token(inv),'user10@example.invalid',131);
await db.query("update mir_core.team_enrollments set lease_until=now()-interval '1 second' where email=$1",['user10@example.invalid']);
assert.equal((await enrollment('claim',token(inv),'user10@example.invalid',132,null,'b'.repeat(64))).existingAccount,true);assert.equal((await enrollment('claim',token(inv),'user10@example.invalid',132)).email,'user10@example.invalid');ok('ambiguous retry cannot silently change chosen password or duplicate identity');
assert.equal((await actor(2,'select public.mir_team_invitation_preview($1) r',[token(inv)])).email,'user10@example.invalid');await assert.rejects(()=>actor(3,'select public.mir_team_invitation_preview($1) r',[token(inv)]));await assert.rejects(()=>actor(4,'select public.mir_team_invitation_preview($1) r',[token(inv)]));ok('email preview uses current manager rights and organization, without send status');
await db.query('update auth.users set email_confirmed_at=now() where id=$1',[id(6)]);
await db.query("insert into mir_core.account_invitations(organization_id,email,token_hash,job_ids,request_id,created_by) values($1,$2,encode(sha256(convert_to($3,'UTF8')),'hex'),'{}',$4,$5)",[id(20),'user6@example.invalid','z'.repeat(43),id(135),id(4)]);
await assert.rejects(()=>actor(6,'select public.mir_team_accept_invitation($1) r',['z'.repeat(43)]));assert.equal((await db.query('select count(*)::int n from mir_core.memberships where organization_id=$1 and user_id=$2',[id(20),id(6)])).rows[0].n,0);ok('foreign-organization token cannot create a membership through the acceptance RPC');
console.log(count+' SQL scenarios groups passed; PGlite fixture, no remote database.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
