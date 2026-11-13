'use strict';
/* La page de connexion principale MIR doit refuser les accès fictifs et rester
   fermée jusqu'à validation d'un vrai backend, de l'Auth et des politiques RLS. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Auth=require('../dist/portal-client.js');
const read=name=>fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
let count=0;
function test(title,run){run();count++;console.log('PASS '+title);}
test('Le mode démo ?demo=1 est supprimé sans changer de domaine',()=>{
  const r=Auth.captureEntry('https://revetementsmirweb.github.io/MIR/chantier.html?demo=1');
  assert.equal(r.mode,'connected');
  assert.ok(!r.cleanURL.includes('demo='));
});
test('Une invitation n’active jamais un accès de démonstration',()=>{
  const token='a'.repeat(43);
  const r=Auth.captureEntry('https://revetementsmirweb.github.io/MIR/chantier.html?demo=1&invitation='+token);
  assert.equal(r.mode,'connected');
  assert.equal(r.invitationToken,token);
  assert.ok(!r.cleanURL.includes('invitation='));
  assert.ok(!r.cleanURL.includes('demo='));
});
test('Les codes d’authentification ne restent pas dans l’URL',()=>{
  const r=Auth.captureEntry('https://revetementsmirweb.github.io/MIR/chantier.html?code=code-de-test&demo=1');
  assert.equal(r.mode,'connected');
  assert.equal(r.authCallback.kind,'code');
  assert.ok(!r.cleanURL.includes('code='));
});
test('Activation réelle autorisée : clé publique et compte vérifié, jamais de rôle fourni par le navigateur',()=>{
  const cfg=require('./mir-account-config-helper.cjs')();
  assert.equal(cfg.enabled,true);assert.equal(cfg.accountEnabled,true);assert.equal(cfg.passwordEnabled,true);
  assert.match(cfg.publishableKey,/^sb_publishable_/);
  assert.equal(Auth.validateConfig(cfg,cfg.siteOrigin).redirectTo,'https://revetementsmir.github.io/Revetements-mir-/chantier.html');
  assert.deepEqual(Auth.validateConfig({enabled:false}),{enabled:false});
});
test('Une configuration activée sans clé publiable est refusée',()=>{
  assert.throws(()=>Auth.validateConfig({enabled:true,projectRef:'gccltmaulvrnthrbnrpd',
    supabaseUrl:'https://gccltmaulvrnthrbnrpd.supabase.co',publishableKey:'',
    siteOrigin:'https://revetementsmirweb.github.io',callbackPath:'/chantier.html'},
    'https://revetementsmirweb.github.io'));
});
test('Le retour Auth reste strictement limité au dépôt MIR courant',()=>{
  const config={enabled:true,projectRef:'gccltmaulvrnthrbnrpd',
    supabaseUrl:'https://gccltmaulvrnthrbnrpd.supabase.co',
    publishableKey:'sb_publishable_'+'a'.repeat(48),
    siteOrigin:'https://revetementsmir.github.io',
    callbackPath:'/Revetements-mir-/chantier.html'};
  const validated=Auth.validateConfig(config,'https://revetementsmir.github.io');
  assert.equal(validated.redirectTo,'https://revetementsmir.github.io/Revetements-mir-/chantier.html');
  assert.throws(()=>Auth.validateConfig({...config,callbackPath:'/autre.html'},'https://revetementsmir.github.io'));
});
test('Aucun rôle admin n’est attribué sans preuve serveur',()=>{
  assert.throws(()=>Auth.checkedSnapshot({
    mode:'connected',demo:false,actorId:'fake-user',members:[{id:'fake-user',role:'admin',active:false}],
    jobs:[],planVersions:[],catalogue:[],orders:[],deliveries:[],movements:[],
    inventory:{},favorites:{}
  },'fake-user'));
});
test('Une seule page connexion est visible dans le site principal',()=>{
  const login=read('chantier.html'),index=read('index.html'),pliage=read('pliage.html'),boutique=read('boutique.html');
  assert.match(login,/Mon compte — Les Revêtements MIR/);
  assert.doesNotMatch(login,/class="demo-banner"|class="demo-controls"|id="demo-reset"/);
  // Le compte reste neutre pour les clients futurs et l’équipe actuelle.
  // L’authentification demeure désactivée sans backend sécurisé.
  assert.match(index,/href="chantier\.html"[^>]*>Mon compte<\/a>/);
  for(const html of [pliage,boutique]) assert.match(html,/href="chantier\.html"[^>]*>Mon compte/);
});
test('Le portail verrouillé ne propose aucun lien de démo',()=>{
  const portal=read('chantier-app.js');
  // PR #51 simplifie le message sans ouvrir le portail ni proposer de démo.
  assert.match(portal,/Connexion en attente/);
  assert.match(portal,/L’espace équipe n’est pas encore ouvert/);
  assert.doesNotMatch(portal,/href="chantier\.html\?demo=1"/);
  const source=read('portal-client.js');
  assert.match(source,/mode: 'connected'/);
  assert.doesNotMatch(source,/mode: query\.get\('demo'\)/);
});
console.log('MIR connexion: '+count+'/'+count+' tests réussis');
