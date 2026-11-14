'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {renderInvitation}=require('../supabase/proposals/employee-auth/invitation-email.cjs');
const data={name:'Personne <TEST>',organization:'Équipe fictive & associés',manager:'Responsable TEST',expiresAt:'2026-11-17T17:00:00Z',activationUrl:'https://example.invalid/activation',helpEmail:'aide@example.invalid',preview:true};
const email=renderInvitation(data);assert.match(email.html,/Personne &lt;TEST&gt;/);assert.match(email.text,/Personne <TEST>/);assert.match(email.html,/heure de Toronto/);assert.doesNotMatch(email.html,/<script|<img/);assert.match(email.text,/Aucun APK/);
for(const patch of [{activationUrl:'https://evil.example/a'},{activationUrl:'javascript:alert(1)'},{helpEmail:'x" onclick="alert(1)'},{expiresAt:'invalid'},{preview:false}])assert.throws(()=>renderInvitation({...data,...patch}));
const out=path.resolve('artifacts/employee-auth-audit/email');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'preview.html'),email.html);fs.writeFileSync(path.join(out,'preview.txt'),email.text);
console.log('PASS invitation HTML/texte, échappement, destinations et aide; valeurs fictives uniquement, aucun envoi.');
