'use strict';
const assert=require('node:assert/strict');
const {TEST,assertMirTestConfig}=require('./mir-phase3c-test-guard.cjs');
assertMirTestConfig({...TEST,environment:'test'});
const email=process.env.MIR_SANDBOX_ADMIN_EMAIL,password=process.env.MIR_SANDBOX_ADMIN_PASSWORD;
if(!email||!password)throw Error('Missing private admin recipe settings');
(async()=>{const login=await fetch(TEST.supabaseUrl+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:TEST.publishableKey,'content-type':'application/json'},body:JSON.stringify({email,password})}),session=await login.json();assert.equal(login.status,200,'real admin Auth');const token=session.access_token;session.access_token='';session.refresh_token='';const response=await fetch(TEST.supabaseUrl+'/functions/v1/mir-support-tenant-recipe',{method:'POST',headers:{apikey:TEST.publishableKey,authorization:'Bearer '+token,'content-type':'application/json'},body:'{}'}),result=await response.json();assert.equal(response.status,200,result.status||'recipe');assert.equal(result.status,'CERTIFIED_PHASE3C_ISOLATION');assert.equal(result.failed,0);assert.equal(result.fixtures?.distinct,true);assert.equal(result.fixtures?.exclusiveMemberships,true);console.log(JSON.stringify(result));})().catch(error=>{console.error(error.message);process.exitCode=1;});
