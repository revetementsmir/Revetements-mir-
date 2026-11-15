'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const file='mobile/android/app/src/androidTest/java/ca/revetementsmir/equipe/test/MirRealRolesTest.java',ref=process.env.MIR_READINESS_BEFORE||'';
if(ref&&!/^[a-f0-9]{7,40}$/.test(ref))throw Error('Exact Git revision required');
const source=ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8'),expressions=new Set();
for(const match of source.matchAll(/"(?:[^"\\]|\\.)*"/g)){let value;try{value=JSON.parse(match[0]);}catch{continue;}if(value.includes('MIRPortalActiveClient?.getStatus().phase')&&value.includes('ready')&&!value.includes('JSON.stringify'))expressions.add(value);}
assert.ok(expressions.size>=1,'Actual Android readiness waits must be exercised');
for(const expression of expressions){assert.equal(vm.runInNewContext(expression,{window:{}}),false,'Activity recreation starts before the page globals exist');assert.equal(vm.runInNewContext(expression,{window:{MIRPortalActiveClient:{getStatus:()=>({phase:'booting'})}}}),false);assert.equal(vm.runInNewContext(expression,{window:{MIRPortalActiveClient:{getStatus:()=>({phase:'ready'})}}}),true,'A verified ready result is still required');}
console.log(`PASS native readiness: ${expressions.size} actual Java predicates; absent globals and booting wait, only ready succeeds.`);
