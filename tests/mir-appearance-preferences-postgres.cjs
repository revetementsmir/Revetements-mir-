'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('../tools/database/node_modules/@electric-sql/pglite');

const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const migration=path.resolve(__dirname,'../supabase/migrations/20261110160000_user_appearance_preferences.sql');

(async()=>{
  const db=new PGlite(),org=uuid(10),member=uuid(1),outsider=uuid(2);
  try{
    await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema mir_core;create table mir_core.memberships(organization_id uuid,user_id uuid,role text,active boolean,primary key(organization_id,user_id));");
    await db.query('insert into auth.users values($1),($2)',[member,outsider]);
    await db.query("insert into mir_core.memberships values($1,$2,'employee',true)",[org,member]);
    await db.exec(fs.readFileSync(migration,'utf8'));

    const as=async(id,sql,args=[])=>{
      await db.exec('begin;set local role authenticated;');
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);
      try{const result=await db.query(sql,args);await db.exec('commit');return result.rows;}
      catch(error){await db.exec('rollback');throw error;}
    };

    let appearance=(await as(member,'select public.mir_my_appearance($1) value',[org]))[0].value;
    assert.equal(appearance.theme,'automatic');
    assert.equal(appearance.accent,'mir_green');

    appearance=(await as(member,"select public.mir_save_appearance($1,$2::jsonb) value",[org,JSON.stringify({theme:'jobsite_high_visibility',accent:'orange',textScale:1.2,highContrast:true,reducedMotion:true})]))[0].value;
    assert.equal(appearance.theme,'jobsite_high_visibility');
    assert.equal(appearance.accent,'orange');
    assert.equal(Number(appearance.textScale),1.2);
    assert.equal(appearance.highContrast,true);
    assert.equal(appearance.reducedMotion,true);

    const stored=(await as(member,'select public.mir_my_appearance($1) value',[org]))[0].value;
    assert.equal(stored.theme,'jobsite_high_visibility');

    await assert.rejects(()=>as(member,"select public.mir_save_appearance($1,$2::jsonb)",[org,JSON.stringify({theme:'automatic',accent:'manufacturer_red'})]),/Accent MIR invalide/);
    await assert.rejects(()=>as(outsider,'select public.mir_my_appearance($1)',[org]),/Accès MIR inactif/);
    await assert.rejects(()=>as(member,'select * from mir_core.user_appearance_preferences'),/permission denied/i);

    console.log('Préférences MIR: thèmes, accents, accessibilité et isolation par compte OK');
  }finally{await db.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
