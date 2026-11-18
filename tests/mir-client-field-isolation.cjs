'use strict';
/* PR46 is an authorized field-app delivery, not the historical PR41 translation
 * fixture lot. Preserve public client/Auth/backend and Android navigation while
 * allowing only its reviewed field UI, shared presentation and TEST packaging. */
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..'),BASE='74d94d4f4eaeb8ad88e50399ab17e5ea1270bf68';
assert.equal(process.env.MIR_CLIENT_BASE_SHA,BASE,'Field delivery must retain the approved client baseline');
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const before=file=>cp.execFileSync('git',['show',BASE+':'+file],{cwd:root,encoding:'utf8'}),now=file=>fs.readFileSync(path.join(root,file),'utf8');
const changed=(...paths)=>git('diff','--name-only',BASE,'HEAD','--',...paths).split('\n').filter(Boolean);
const fieldRuntime=new Set(['dist/chantier-app.js','dist/chantier.html','dist/mir-app-selection.css','dist/mir-field-samsung.css','dist/mir-field-views.js','dist/mir-pliage03.css','dist/mir-pliage03.js','dist/production-app.js']);
assert.deepEqual(changed('dist').filter(file=>!fieldRuntime.has(file)),[],'Every other public/client/atelier resource must remain byte-identical');
for(const folder of['server','supabase','ops','scripts','mobile/android/app/src/main','mobile/capacitor.config.ts'])assert.deepEqual(changed(folder),[],folder+' retains permissions, Auth, TEST fixtures, public release gates and native route policy');
const mobileAllowed=new Set(['mobile/README.md','mobile/android/app/build.gradle','mobile/android/app/src/androidTest/java/ca/revetementsmir/equipe/test/MirAndroidTest.java','mobile/android/app/src/androidTest/java/ca/revetementsmir/equipe/test/MirRealRolesTest.java','mobile/android/app/src/androidTest/java/ca/revetementsmir/equipe/test/MirUpgradeTest.java','mobile/package-lock.json','mobile/package.json','mobile/tools/native-screen-proofs.cjs','mobile/tools/result-summary.cjs','mobile/tools/test-native-drawing-target.cjs','mobile/tools/test-native-screen-proofs.cjs','mobile/tools/test-web.cjs']);
assert.deepEqual(changed('mobile').filter(file=>!mobileAllowed.has(file)),[],'Only reviewed TEST packaging and native QA files may change');
const normalizedGradle=now('mobile/android/app/build.gradle').replace("?: '130003'","?: '130001'").replace('versionName "0.13.2-test"','versionName "0.13.1-test"');
assert.equal(normalizedGradle,before('mobile/android/app/build.gradle'),'Android build changes only TEST version identifiers');
for(const file of['mobile/package.json','mobile/package-lock.json']){
 const actual=JSON.parse(now(file)),original=JSON.parse(before(file));actual.version=original.version;if(actual.packages?.[''])actual.packages[''].version=original.packages[''].version;
 assert.deepEqual(actual,original,'No dependency or runtime configuration change: '+file);
}
function block(source,name,indent=''){
 const expression=new RegExp('^'+indent+'(?:async )?function '+name+'\\(','m'),match=expression.exec(source);assert.ok(match,name);
 const start=match.index,next=new RegExp('^'+indent+'(?:async )?function ','gm');next.lastIndex=start+match[0].length;const end=next.exec(source)?.index??source.length;
 return source.slice(start,end).trim();
}
const production=now('dist/production-app.js'),originalProduction=before('dist/production-app.js');
for(const name of['build','makeItem','addPiece','editPiece','clientStepIssues','changeUnit','publicProfileDiagramContent','diagramSVG','faceChoiceCards','renderClientMeasurements'])assert.equal(block(production,name),block(originalProduction,name),'Approved public geometry, validation, rendering and snapshots remain unchanged: '+name);
const app=now('dist/chantier-app.js'),originalApp=before('dist/chantier-app.js');
for(const name of['resumeCheckout','clearInvitation','restoreInvitation','authPasswordFields','renderAuth','renderCustomer','runAuth'])assert.equal(block(app,name,'  '),block(originalApp,name,'  '),'Customer/Auth implementation remains unchanged: '+name);
const fieldLink='<link rel="stylesheet" href="mir-app-selection.css?v=20261118">';
assert.equal(now('dist/chantier.html').split(fieldLink).length,2);
assert.equal(now('dist/chantier.html').replace(fieldLink,''),before('dist/chantier.html'),'Only the exact field stylesheet link may differ in shared login/account HTML');
cp.execFileSync(process.execPath,[path.join(root,'tests/mir-pliage03-field-contract.cjs')],{cwd:root,stdio:'inherit'});
console.log('PASS PR46 field delivery: public client functions, Auth, all backend/TEST fixtures, native navigation and dependencies preserved; explicit UI/package scope only.');
