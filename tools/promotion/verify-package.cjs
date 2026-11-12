'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),m=require(path.join(root,'ops/mir-promotion/manifest.json'));let checks=0;const ok=(v,n)=>{assert.ok(v,n);checks++;console.log('PASS '+n);};
const hashes=require(path.join(root,'ops/mir-promotion/migration-sha256.json'));
ok(m.globalDbPushAllowed===false,'db push global interdit');
for(const rel of m.orderedSql)ok(fs.existsSync(path.join(root,rel)),'fichier ordonné présent '+path.basename(rel));
for(const rel of [...m.orderedSql,...m.optionalContentNotAutomatic]){
 const expected=hashes.orderedSql[rel]||hashes.optionalContentNotAutomatic[rel];
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');
 ok(expected===actual,'empreinte figée '+path.basename(rel));
}
for(const rel of m.excludedSql)ok(!m.orderedSql.includes(rel),'fixture ou correctif TEST exclu '+path.basename(rel));
for(const rel of m.optionalContentNotAutomatic){ok(fs.existsSync(path.join(root,rel)),'contenu initial séparé '+path.basename(rel));ok(!m.orderedSql.includes(rel),'contenu initial non automatique '+path.basename(rel));}
ok(m.excludedFunctions.includes('mir-chat-tenant-b-recipe')&&m.excludedFunctions.includes('mir-support-tenant-recipe'),'fonctions de recette exclues');
const pages=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
ok(/push:\s*\n\s*branches: \[main\]/.test(pages),'Pages déclenché par push main');
ok(/uses: actions\/deploy-pages@v4/.test(pages),'workflow réalise un vrai déploiement Pages');
ok(!m.secretNames.some(x=>/=|@/.test(x)),'manifest ne contient que des noms de secrets');
for(const fn of m.functions)for(const rel of fn.files)ok(fs.existsSync(path.join(root,rel)),`bundle ${fn.name}: ${path.basename(rel)}`);
ok(m.blockedSql.length===0,'aucun préalable SQL métier manquant');
console.log(`Lot de promotion : ${checks}/${checks} contrôles réussis`);
