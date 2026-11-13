'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../dist/chantier-app.js'),'utf8');
for(const label of ['Aujourd’hui','Chantiers','Argent','Cédule','Demandes','Plans','Photos','Entrepôt et livraison','Employé chantier'])assert.ok(source.includes(label),label+' absent');
assert.ok(source.includes("staff==='boss'||staff==='admin'?'boss'"),'Le rôle technique admin doit être présenté comme Boss');
assert.ok(!source.includes("mode==='admin'?'Administration'"),'Le rôle générique Admin ne doit jamais être présenté');
console.log('Navigation Phase 1: libellés des cinq rôles et masquage du rôle technique Admin OK');
