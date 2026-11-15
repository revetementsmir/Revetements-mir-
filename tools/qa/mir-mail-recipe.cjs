'use strict';
/* OFFLINE QA ONLY: Node tooling, never imported by dist/, APK, Edge or a worker.
 * No provider object, fetch, SMTP, database, mailbox or delivery operation. */
const assert=require('node:assert/strict');
const TEST='hxtztkmbfpmzrieccwsg';
const QA_RECIPIENT='frederickmessely@gmail.com';
const routes=Object.freeze({
  'estimation-generale':{source:'dist/estimation.html → mir-estimates',transport:'Edge/Resend (disabled)',template:'estimate-presentation.notification'},
  'estimation-studio':{source:'dist/plan.html → mir-estimates',transport:'Edge/Resend (disabled)',template:'estimate-presentation.notification'},
  'soumission-materiaux':{source:'dist/selection.html → mir-estimates',transport:'Edge/Resend (disabled)',template:'estimate-presentation.notification'},
  'soumission-pliage':{source:'dist/pliage.html → mir-estimates',transport:'Edge/Resend (disabled)',template:'estimate-presentation.notification'},
  'commande-client':{source:'dist/commerce.js / mir-unified-order-cart.js',transport:'aucun envoi client établi',template:'aperçu QA proposé; pas de modèle opérationnel'},
  'commande-fournisseur':{source:'server/supplier-send.cjs',transport:'provider.send (non branché)',template:'Bon de commande MIR, PDF privé non ouvert ici'},
  'invitation-employe':{source:'mir-team-invitations → team-invitation-email.mjs',transport:'MIR_TEAM_TRANSPORT disabled',template:'renderInvitation (FR actuel)'},
  'recuperation':{source:'portal-client.js resetPasswordForEmail',transport:'Supabase Auth, non appelé',template:'Supabase Auth (non vérifié en exécution)'},
  'confirmation':{source:'portal-client.js auth.resend',transport:'Supabase Auth, non appelé',template:'Supabase Auth (non vérifié en exécution)'},
  'connexion-courriel':{source:'portal-client.js signInWithOtp',transport:'Supabase Auth; emailEnabled false',template:'Supabase Auth (non vérifié en exécution)'}
});
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function preview({route,locale='fr-CA',environment,projectRef,data={},original={}}){
  assert.equal(process.env.MIR_MAIL_RECIPE_SIMULATION,'1','Recette courriel hors ligne non activée');
  assert.equal(environment,'test','Refus de toute recette production');
  assert.equal(projectRef,TEST,'Refus de toute autre base');
  assert.ok(Object.hasOwn(routes,route),'Parcours inconnu');
  assert.ok(['fr-CA','en-CA'].includes(locale),'Langue non prise en charge');
  for(const [key,value]of Object.entries(data))if(typeof value!=='string'||value.length>120)throw Error('Fictional data invalid: '+key);
  const isEn=locale==='en-CA';
  const category=(isEn?{
    'estimation-generale':'estimate request','estimation-studio':'Studio estimate',
    'soumission-materiaux':'materials quotation','soumission-pliage':'bending quotation',
    'commande-client':'customer order preview','commande-fournisseur':'supplier purchase order',
    'invitation-employe':'team invitation','recuperation':'password recovery',
    'confirmation':'account confirmation','connexion-courriel':'email sign-in'
  }:{
    'estimation-generale':'demande d’estimation','estimation-studio':'estimation Studio',
    'soumission-materiaux':'soumission matériaux','soumission-pliage':'soumission pliage',
    'commande-client':'aperçu de commande client','commande-fournisseur':'bon de commande fournisseur',
    'invitation-employe':'invitation employé','recuperation':'récupération de mot de passe',
    'confirmation':'confirmation de compte','connexion-courriel':'connexion par courriel'
  })[route];
  const name=String(data.name||'Client fictif'),number=String(data.number||'MIR-TEST-0042'),item=String(data.item||'Revêtement témoin 12 pi');
  const subject=(isEn?'[MIR TEST PREVIEW] ':'[APERÇU MIR TEST] ')+category+' · '+number;
  const paragraphs=isEn?[
    'LOCAL PREVIEW ONLY — no message has been sent.',
    'Hello '+name+',',
    'This is a fictional '+category+' for testing only.',
    'Reference: '+number+'. Example item: '+item+'.',
    'The original recipients and all copies are suppressed; this is not a delivery receipt.'
  ]:[
    'APERÇU LOCAL UNIQUEMENT — aucun message n’a été envoyé.',
    'Bonjour '+name+',',
    'Voici une '+category+' fictive pour la recette seulement.',
    'Référence : '+number+'. Exemple : '+item+'.',
    'Les destinataires et copies d’origine sont écartés; ceci n’est pas une preuve de livraison.'
  ];
  const html='<!doctype html><html lang="'+locale+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safe(subject)+'</title><body style="margin:0;padding:28px;max-width:600px;font:16px/1.6 Arial,sans-serif;color:#203127;background:#fff"><h1 style="font-size:22px">'+safe(subject)+'</h1>'+paragraphs.map(p=>'<p>'+safe(p)+'</p>').join('')+'<p>Les Revêtements MIR</p></body></html>';
  // This is a pure transformation. Original addresses are deliberately never copied
  // into to/cc/bcc, HTML, text, logs, artifacts or returned receipt fields.
  return Object.freeze({
    mode:'offline-simulation',environment:'test',route,locale,
    to:Object.freeze([QA_RECIPIENT]),cc:Object.freeze([]),bcc:Object.freeze([]),
    subject,text:paragraphs.join('\n\n'),html,deliveryStatus:'not-sent',emailSent:false,
    transportCalled:false,backendStatusCreated:false,
    suppressedOriginal:Object.freeze({
      to:Array.isArray(original.to)?original.to.length:0,
      cc:Array.isArray(original.cc)?original.cc.length:0,
      bcc:Array.isArray(original.bcc)?original.bcc.length:0
    })
  });
}
module.exports=Object.freeze({routes,preview,TEST});
