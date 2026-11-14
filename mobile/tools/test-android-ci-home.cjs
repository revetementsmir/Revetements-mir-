'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {verifyHome}=require('./android-ci-home.cjs');
const dir=path.join(__dirname,'fixtures/android-ci-home'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'provenance.json'),'utf8'));
for(const entry of manifest.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,entry.file))).digest('hex'),entry.sha256,'Original CI evidence hash');
assert.throws(()=>verifyHome(dir,'transient'),/focused window/,'9d660 immediate HOME transition is refused');
assert.ok(verifyHome(dir,'healthy').litPixels>0,'9d660 later healthy HOME is accepted');
assert.throws(()=>verifyHome(dir,'anr'),/ANR/,'2154 actual Quickstep ANR is refused');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mir-home-black-'));
try{
 for(const suffix of ['-window.txt','-activity.txt','-ui.xml'])fs.copyFileSync(path.join(dir,'healthy'+suffix),path.join(temp,'black'+suffix));
 fs.copyFileSync(path.join(dir,'transient.png'),path.join(temp,'black.png'));
 assert.throws(()=>verifyHome(temp,'black'),/black\/blank transition/,'A black original PNG is refused even if focus/XML already report HOME');
}finally{fs.rmSync(temp,{recursive:true});}
console.log('PASS HOME presentation: 4 cases using unaltered real CI PNGs/XML/focus, provenance verified.');
