'use strict';
/* A verified, secret-free, uniquely identified TEST run is injected into the
 * debug Android app private files. Never packaged in APK sources or Pages. */
const {spawnSync}=require('node:child_process');
const {validateManifest,loadManifest}=require('./verify-pr39-native-fixture.cjs');
const manifest=validateManifest(loadManifest());
const {runId,marker,projectRef,employee,chef}=manifest;
if(projectRef!=='hxtztkmbfpmzrieccwsg'||marker!=='QA-NATIVE-RUN-'+runId.replaceAll('-','')
  ||employee.id!=='3980647a-d83a-48ad-9d90-8fc2b314807f'
  ||chef.id!=='ec421778-b39b-492e-9e4b-5e044015e98f')
 throw Error('Per-run MIR TEST identities invalid');
const data=JSON.stringify(manifest);
if(/email|password|Bearer|sb_secret_|service_role/i.test(data))throw Error('A private credential must not appear in the Android fixture manifest');
const r=spawnSync('adb',['shell','run-as','ca.revetementsmir.equipe.test.preview','sh','-c',
  "'umask 077; mkdir -p files && cat > files/native-qa-run-manifest.json && chmod 600 files/native-qa-run-manifest.json'"],
 {input:data,encoding:'utf8',timeout:15000,maxBuffer:1024*256});
if(r.status!==0)throw Error('MIR TEST run-specific Android fixture injection refused');
console.log('MIR TEST runtime Android fixture loaded for this exact run; no credentials or historical punch IDs in APK.');
