'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),manifest=require(path.join(root,'ops/mir-promotion/manifest.json'));
const out=path.join(root,'artifacts/mir-promotion/functions');fs.mkdirSync(out,{recursive:true});
const results=[];
for(const fn of manifest.functions){
 const stage=path.join(out,fn.name);fs.rmSync(stage,{recursive:true,force:true});
 for(const rel of fn.files){const target=path.join(stage,rel.replace('supabase/functions/',''));fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,rel),target);}
 const hash=crypto.createHash('sha256');let bytes=0;
 for(const rel of fn.files.slice().sort()){const data=fs.readFileSync(path.join(root,rel));hash.update(rel+'\0');hash.update(data);bytes+=data.length;}
 results.push({name:fn.name,verifyJwt:fn.verifyJwt,bytes,sha256:hash.digest('hex'),directory:path.relative(root,stage),files:fn.files});
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({sourceSha:manifest.sourceSha,generatedAt:new Date().toISOString(),functions:results},null,2)+'\n');
console.log(JSON.stringify({output:path.relative(root,out),functions:results.map(x=>({name:x.name,bytes:x.bytes,sha256:x.sha256}))},null,2));
