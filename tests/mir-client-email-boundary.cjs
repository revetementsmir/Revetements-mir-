'use strict';
/* Customer email boundaries: only existing templates, no sender or transport.
 * These templates are internal MIR team notifications / employee invitations,
 * not customer messages. They must remain byte-identical and non-operational. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const browserFile=fs.readFileSync(path.join(root,'dist/mir-estimate-presentation.js'),'utf8');
const edgeFile=fs.readFileSync(path.join(root,'supabase/functions/_shared/estimate-presentation.js'),'utf8');
assert.equal(browserFile,edgeFile,'client and Edge copies of original internal mail presentation must match exactly');
if(process.env.MIR_CLIENT_BASE_SHA){
 for(const file of ['dist/mir-estimate-presentation.js','supabase/functions/_shared/estimate-presentation.js','supabase/functions/_shared/team-invitation-email.mjs']){
  const original=cp.execFileSync('git',['show',process.env.MIR_CLIENT_BASE_SHA+':'+file],{cwd:root,encoding:'utf8'});
  assert.equal(fs.readFileSync(path.join(root,file),'utf8'),original,'internal/team email template must remain unchanged: '+file);
 }
}
const presentation=require('../dist/mir-estimate-presentation.js');
const payload={source:'general',address:{street:'123 rue fictive',city:'Québec',postalCode:'G1A 1A1'},contact:{name:'MIR Test Customer',email:'customer@example.invalid',phone:'555-0100'},note:'No real delivery',selection:{materials:{items:[]}}};
const before=JSON.stringify(payload);
const message=presentation.notification({payload,requestNumber:'MIR-QA-EN-01',privateURL:'https://example.invalid/private-test',test:true});
assert.match(message.subject,/RECETTE MIR TEST/);
assert.match(message.text,/demande fictive, ne pas traiter/);
assert.match(message.html,/cid:mir-logo/);
assert.match(message.text,/MIR-QA-EN-01/);
assert.doesNotMatch(message.html,/<script\b|api\.resend\.com|gmail\.com\/send/i);
assert.equal(JSON.stringify(payload),before,'customer record untouched by simulated rendering');
console.log('PASS MIR customer mail boundary: existing templates are internal; fake HTML and text only; no outgoing email, no Edge changes');
