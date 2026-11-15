'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {routes,preview,TEST}=require('../tools/qa/mir-mail-recipe.cjs');
const output=path.resolve('artifacts/mir-mail-offline');fs.mkdirSync(output,{recursive:true});
let network=0;const previous=global.fetch;
global.fetch=(...args)=>{network++;throw new Error('INTERDICTION ENVOI');};
const original={to:['client@example.invalid','boss@example.invalid'],cc:['adjointe@example.invalid'],bcc:['audit@example.invalid']};
const fixture={name:'Personne <FICTIVE>',number:'MIR-QA-2026-0042',item:'Pliage aluminium 12 pi & joint'};
try{
 assert.throws(()=>preview({route:'recuperation',environment:'test',projectRef:TEST}),/non activée/);
 process.env.MIR_MAIL_RECIPE_SIMULATION='1';
 assert.throws(()=>preview({route:'recuperation',environment:'production',projectRef:TEST}),/production/);
 assert.throws(()=>preview({route:'recuperation',environment:'test',projectRef:'gccltmaulvrnthrbnrpd'}),/autre base/);
 assert.throws(()=>preview({route:'unknown',environment:'test',projectRef:TEST}),/inconnu/);
 for(const route of Object.keys(routes))for(const locale of ['fr-CA','en-CA']){
   const m=preview({route,locale,environment:'test',projectRef:TEST,data:fixture,original});
   assert.deepEqual(m.to,['frederickmessely@gmail.com'],'only test inbox');
   assert.deepEqual(m.cc,[],'no Adjointe or third-party copy');
   assert.deepEqual(m.bcc,[],'no hidden copy');
   assert.equal(m.emailSent,false);assert.equal(m.deliveryStatus,'not-sent');
   assert.equal(m.transportCalled,false);assert.equal(m.backendStatusCreated,false);
   assert.deepEqual(m.suppressedOriginal,{to:2,cc:1,bcc:1});
   assert.match(m.subject,/MIR TEST/);assert.match(m.html,new RegExp('lang="'+locale+'"'));
   assert.match(m.text,/MIR-QA-2026-0042/);
   if(route==='commande-fournisseur'&&locale==='fr-CA')assert.match(m.text,/Aperçu fictif du parcours : bon de commande fournisseur/);
   if(route==='invitation-employe')assert.doesNotMatch(m.text,/Pliage aluminium/,'invitation must not include material quotation fixture');
   assert.match(m.html,/Personne &lt;FICTIVE&gt;/);
   assert.doesNotMatch(m.html,/client@example\.invalid|boss@example\.invalid|adjointe@example\.invalid|audit@example\.invalid|<script|api\.resend\.com/i);
   assert.doesNotMatch(m.text,/client@example\.invalid|boss@example\.invalid|adjointe@example\.invalid|audit@example\.invalid/);
   const base=route+'-'+locale;
   fs.writeFileSync(path.join(output,base+'.html'),m.html);
   fs.writeFileSync(path.join(output,base+'.txt'),m.text);
 }
 assert.equal(network,0,'zero outbound fetch calls');
 for(const publicFile of ['dist/index.html','dist/portal-config.js','dist/mir-client-i18n.js']){
   const source=fs.readFileSync(path.resolve(publicFile),'utf8');
   assert.doesNotMatch(source,/MIR_MAIL_RECIPE_SIMULATION|frederickmessely@gmail.com/,'test mailbox must not reach public asset '+publicFile);
 }
 const existing=require('../dist/mir-estimate-presentation.js');
 const originalMessage=existing.notification({payload:{source:'general',contact:{name:fixture.name,email:'fake@example.invalid',phone:'555-0100'},address:{city:'Québec'},selection:{materials:{items:[]}}},requestNumber:fixture.number,privateURL:'https://example.invalid/private',test:true});
 assert.match(originalMessage.subject,/RECETTE MIR TEST/);
 assert.match(originalMessage.text,/MIR-QA-2026-0042/);
 console.log('PASS 10 routes x FR/EN: only Frederick TO, CC/BCC empty, dynamic HTML escaped, 0 network/provider, 0 statuses, existing FR template preserved');
}finally{global.fetch=previous;delete process.env.MIR_MAIL_RECIPE_SIMULATION;}
