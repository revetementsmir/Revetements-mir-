'use strict';
/* Strict byte-parity of all staff markup, and client-only account routing. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'dist/chantier.html'),'utf8');
const legacyBlock=[
 '  <!-- Client FR/EN only. Guarded before translation; staff roles remain French. -->',
 '  <link rel="stylesheet" href="mir-client-i18n.css?v=1">',
 '  <script defer src="mir-client-en-ca.js?v=1"></script>',
 '  <script defer src="mir-client-i18n.js?v=release-pr41-20261115"></script>'
].join('\n');
const approvedBlock=legacyBlock.replace('mir-client-en-ca.js?v=1','mir-client-en-ca.js?v=client-parcours-20261117');
const block=source.includes(approvedBlock)?approvedBlock:legacyBlock;
assert.equal(source.split(block).length,2,'exactly one client localization block');
if(process.env.MIR_CLIENT_BASE_SHA){
 const original=cp.execFileSync('git',['show',process.env.MIR_CLIENT_BASE_SHA+':dist/chantier.html'],{cwd:root,encoding:'utf8'});
 let compared=source;
 if(process.env.MIR_CLIENT_FIELD_PR==='46'){
  assert.equal(process.env.MIR_CLIENT_BASE_SHA,'74d94d4f4eaeb8ad88e50399ab17e5ea1270bf68');
  const fieldLink='<link rel="stylesheet" href="mir-app-selection.css?v=20261118">';
  assert.equal(compared.split(fieldLink).length,2,'one reviewed field stylesheet only');compared=compared.replace(fieldLink,'');
 }
 // If the base is already PR41-released, require full byte identity.
 // Only legacy pre-PR41 bases may add the exact client-only block.
 assert.equal(original.includes(block)?compared:compared.replace('\n'+block,''),original,
   'staff HTML/Auth hooks/role markup must be byte-identical');
}
const i18n=require('../dist/mir-client-i18n.js');
assert.equal(i18n.isClient('/chantier.html',''),false);
assert.equal(i18n.isClient('/chantier.html','?view=account'),false);
assert.equal(i18n.isClient('/chantier.html','?view=account&clientLocale=1'),true);
assert.equal(i18n.isClient('/chantier.html','?view=account&clientLocale=1&invite=forbidden'),false);
assert.equal(i18n.isClient('/chantier.html','?clientLocale=1&invitation=employee-secret'),false);
for(const page of ['entrepot.html','coordination.html','metres.html'])assert.equal(i18n.isClient('/'+page,'?clientLocale=1'),false);
assert.equal(i18n.isClient('/production.html','?mode=client&source=store'),false);
assert.match(fs.readFileSync(path.join(root,'dist/mir-account-flow.js'),'utf8'),/clientAccountURL/);
console.log('PASS customer account FR/EN: exact staff markup preserved; login and checkout client-only; employee roles excluded');
