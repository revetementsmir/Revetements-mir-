import {registerPlugin} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Geolocation} from '@capacitor/geolocation';
import Policy from './policy.cjs';
const Native=registerPlugin('MIRNative');
window.MIRAndroid=Object.freeze({Native,App,Geolocation,Policy});
const origin=location.origin;
const rawFetch=window.fetch.bind(window);
window.fetch=(input,options)=>{const url=input instanceof Request?input.url:input;if(!Policy.allowedRequest(url,origin))return Promise.reject(new Error('Service refusé : application MIR TEST uniquement.'));return rawFetch(input,options);};
const rawOpen=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(method,url,...args){if(!Policy.allowedRequest(url,origin))throw Error('Service refusé : MIR TEST uniquement.');return rawOpen.call(this,method,url,...args);};
// Browser navigation cannot hand an untrusted document the native bridge.
function privateAsset(url){try{const u=new URL(url,location.href);return u.protocol==='blob:'||u.hostname===Policy.TEST&&u.pathname.startsWith('/storage/v1/')&&Policy.allowedRequest(u.href,origin);}catch{return false;}}
window.open=url=>{if(privateAsset(url))download({href:url,download:''}).catch(showError);else if(Policy.external(url))Native.openExternal({url}).catch(showError);else if(Policy.allowedRoute(url,origin)){if(!dirty||confirm('Quitter cette saisie ? Les données non enregistrées restent à vérifier.'))location.assign(url);}else showError(new Error('Lien refusé dans MIR TEST.'));return null;};
let dirty=false;
// The portal refreshes its snapshot every 15 seconds and replaces forms.
// Keep only unsaved absence input in memory, within the same actor and view.
// No storage, save, RPC or server preference is involved.
let absenceDraft=null;
function rememberAbsence(event){
 const form=event.target.closest?.('#absence-draft-form');if(!form)return;
 const actor=window.MIRAndroidSession?.currentUserId?.();if(!actor)return;
 absenceDraft={actor,form,fields:[...form.elements].filter(e=>e.name&&e.type!=='file').map(e=>({name:e.name,value:e.value,checked:e.checked,type:e.type}))};
}
function restoreAbsence(){
 if(!absenceDraft)return;
 const form=document.querySelector('#absence-draft-form');
 if(!form||absenceDraft.actor!==window.MIRAndroidSession?.currentUserId?.()){absenceDraft=null;return;}
 if(form===absenceDraft.form)return;
 for(const field of absenceDraft.fields){const el=form.elements.namedItem(field.name);if(!el||el.type!==field.type)continue;el.value=field.value;if(['checkbox','radio'].includes(field.type))el.checked=field.checked;}
 absenceDraft.form=form;
}
document.addEventListener('input',rememberAbsence,true);document.addEventListener('change',rememberAbsence,true);
for(const name of ['submit','reset'])document.addEventListener(name,event=>{if(event.target.id==='absence-draft-form')absenceDraft=null;},true);
function showError(error){const node=document.getElementById('mir-native-state');if(node){node.textContent=error?.message||'Action indisponible. Rien n’a été envoyé.';node.setAttribute('role','alert');}}
function networkState(){const node=document.getElementById('mir-native-state');if(node)node.textContent=navigator.onLine?'MIR TEST · Notifications par actualisation':'MIR TEST · Hors ligne — les enregistrements serveur restent à confirmer';}
function mount(){
 const style=document.createElement('style');style.textContent='body{padding-top:calc(env(safe-area-inset-top) + 30px)!important;padding-bottom:env(safe-area-inset-bottom)}#mir-native-state{position:fixed;top:0;left:0;right:0;z-index:10000;background:var(--mir-surface-soft,#e9eee7);color:var(--mir-text,#24422e);padding:5px 10px;font:13px system-ui;min-height:20px}button,input,select{scroll-margin-bottom:100px}.mir-native-signin .mir-help-launch{position:static!important;transform:none!important;pointer-events:auto!important;display:block;margin:16px}';document.head.append(style);
 const banner=document.createElement('div');banner.id='mir-native-state';banner.setAttribute('role','status');document.body.prepend(banner);networkState();
 const observer=new MutationObserver(()=>{
  restoreAbsence();
  document.body.classList.toggle('mir-native-signin',!!document.querySelector('#auth-signin-form'));
  for(const el of document.querySelectorAll('[data-auth-screen="signup"],[data-auth-screen="forgot"],#auth-google,.auth-divider,.auth-cart-return,.auth-card>.auth-footnote'))el.hidden=true;
  const intro=document.querySelector('.auth-intro');if(intro){const title=intro.querySelector('h1');if(title&&title.textContent!=='Connexion équipe MIR')title.textContent='Connexion équipe MIR';const text=intro.querySelector('p:not(.portal-eyebrow)');if(text&&text.textContent!=='Connectez-vous avec votre compte équipe. Environnement TEST.')text.textContent='Connectez-vous avec votre compte équipe. Environnement TEST.';}
  // Harmony moves/inserts links after login. Keep permitted internal links.
  for(const link of document.querySelectorAll('a[href]')){
   const url=new URL(link.href,location.href);
   if(!link.hasAttribute('download')&&!privateAsset(link.href)&&!Policy.external(link.href)&&!Policy.allowedRoute(link.href,origin)&&!link.hasAttribute('data-mir-native-public'))link.setAttribute('data-mir-native-public','');
  }
  const menu=document.querySelector('#mir-harmony-menu'),help=document.querySelector('.mir-help-launch');
  let businessHelp=document.querySelector('#mir-native-business-help');
  if(menu&&help&&document.body.dataset.portalConnection==='connected'){
   if(!businessHelp){businessHelp=document.createElement('button');businessHelp.type='button';businessHelp.id='mir-native-business-help';businessHelp.textContent='Centre d’aide métier';businessHelp.onclick=()=>{document.querySelector('.mir-harmony-toggle')?.click();help.click();};menu.append(businessHelp);}
  }else businessHelp?.remove();
  const qr=document.querySelector('#wh-camera-start');if(qr)qr.hidden=false;
 });observer.observe(document.body,{childList:true,subtree:true});
}
document.addEventListener('DOMContentLoaded',mount,{once:true});
addEventListener('offline',networkState);addEventListener('online',networkState);
function keepInputVisible(){requestAnimationFrame(()=>requestAnimationFrame(()=>{const field=document.activeElement;if(!field?.matches?.('input,textarea,select,[contenteditable="true"]'))return;const rect=field.getBoundingClientRect(),view=window.visualViewport,bottom=(view?.offsetTop||0)+(view?.height||innerHeight)-16;if(rect.bottom>bottom||rect.top<(view?.offsetTop||0)+40)field.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});}));}
window.visualViewport?.addEventListener('resize',keepInputVisible);window.visualViewport?.addEventListener('scroll',keepInputVisible);addEventListener('resize',keepInputVisible);document.addEventListener('focusin',keepInputVisible);
document.addEventListener('input',event=>{if(event.target.closest('form')&&!event.target.closest('#auth-signin-form,#wh-login-form'))dirty=true;},true);
async function download(link){
 const actor=()=>window.MIRAndroidSession?.currentUserId?window.MIRAndroidSession.currentUserId():window.MIRPortalActiveClient?.getStatus()?.user?.id||null,startedBy=actor(),assertSession=()=>{if(actor()!==startedBy)throw Error('La session a changé. Ouvrez à nouveau le fichier depuis votre compte.');};
 const url=new URL(link.href,location.href);if(url.protocol!=='blob:'&&!Policy.allowedRequest(url.href,origin))throw Error('Fichier non autorisé');
 const blob=await rawFetch(url.href).then(r=>{if(!r.ok)throw Error('Fichier indisponible');return r.blob();});
 const bytes=new Uint8Array(await blob.arrayBuffer());if(bytes.length>20*1024*1024)throw Error('Fichier trop volumineux : maximum 20 Mo.');
 assertSession();
 const pdf=String.fromCharCode(...bytes.slice(0,5))==='%PDF-';
 if(!pdf){
  const png=bytes[0]===137&&String.fromCharCode(...bytes.slice(1,4))==='PNG',jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(!png&&!jpeg&&!webp)throw Error('Fichier refusé : PDF, JPEG, PNG ou WebP vérifié seulement.');
  const source=URL.createObjectURL(new Blob([bytes],{type:png?'image/png':jpeg?'image/jpeg':'image/webp'})),dialog=document.createElement('dialog'),image=document.createElement('img'),close=document.createElement('button');image.src=source;image.alt='Pièce jointe privée MIR';image.style.cssText='display:block;max-width:100%;max-height:70vh;object-fit:contain';close.type='button';close.textContent='Fermer';close.style.minHeight='44px';dialog.append(image,close);dialog.dataset.mirNativeFile='true';dialog.setAttribute('aria-label','Pièce jointe privée');document.body.append(dialog);close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{URL.revokeObjectURL(source);dialog.remove();},{once:true});dialog.showModal();return;
 }
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const action=await new Promise(resolve=>{const dialog=document.createElement('dialog');dialog.innerHTML='<h2>PDF prêt</h2><p>Choisissez une action. Aucun fichier n’est envoyé automatiquement.</p><button data-action="open">Ouvrir le PDF</button> <button data-action="save">Enregistrer le PDF…</button> <button data-action="share">Partager…</button> <button data-action="cancel">Annuler</button>';dialog.dataset.mirNativeFile='true';document.body.append(dialog);dialog.addEventListener('click',event=>{const value=event.target.dataset.action;if(value){dialog.close();dialog.remove();resolve(value);}});dialog.addEventListener('cancel',()=>{dialog.remove();resolve('cancel');},{once:true});dialog.showModal();});
 if(action!=='cancel'){assertSession();if(action==='open'&&dirty&&!confirm('Ouvrir le PDF et quitter cette saisie ? Les données non enregistrées restent à vérifier.'))return;let name=link.download||'MIR.pdf';if(!name.toLowerCase().endsWith('.pdf'))name+='.pdf';const result=await Native.pdf({data:btoa(binary),name,action});if(result?.saved){const node=document.getElementById('mir-native-state');if(node)node.textContent='PDF enregistré dans le fichier choisi.';}}
}
document.addEventListener('click',async event=>{
 const qr=event.target.closest?.('#wh-camera-start');
 if(qr){event.preventDefault();event.stopImmediatePropagation();try{const result=await Native.scanQr();if(!result.cancelled){const input=document.querySelector('#wh-qr-input');if(!input)throw Error('Saisie QR indisponible');input.value=result.value;input.dispatchEvent(new Event('input',{bubbles:true}));input.closest('form')?.requestSubmit();}}catch(error){showError(error);}return;}
 const input=event.target.closest?.('input[type="file"]');
 if(input){event.preventDefault();event.stopImmediatePropagation();try{const result=input.hasAttribute('capture')?await Native.capturePhoto():await Native.pickFile();if(!result.cancelled){const bytes=Uint8Array.from(atob(result.data),c=>c.charCodeAt(0)),transfer=new DataTransfer();transfer.items.add(new File([bytes],result.name,{type:result.mime}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}}catch(error){showError(error);}return;}
 const link=event.target.closest?.('a[href]');if(!link)return;
 if(link.hasAttribute('download')||privateAsset(link.href)){event.preventDefault();event.stopImmediatePropagation();download(link).catch(showError);return;}
 if(Policy.external(link.href)){event.preventDefault();event.stopImmediatePropagation();Native.openExternal({url:link.href}).catch(showError);return;}
 if(!Policy.allowedRoute(link.href,origin)){event.preventDefault();event.stopImmediatePropagation();showError(new Error('Ce parcours n’est pas disponible dans MIR TEST.'));return;}
 if(dirty&&!confirm('Quitter cette saisie ? Les données non enregistrées sur le serveur restent à vérifier.')){event.preventDefault();event.stopImmediatePropagation();}
},true);
App.addListener('backButton',()=>{const dialog=document.querySelector('dialog[open]');if(dialog){if(!dialog.dataset.mirNativeFile&&dirty&&!confirm('Fermer cette saisie et quitter les changements non enregistrés ?'))return;const close=dialog.querySelector('[data-close-dialog],[data-close-production-dialog]');if(close)close.click();else{const event=new Event('cancel',{cancelable:true});if(dialog.dispatchEvent(event))dialog.close();}return;}if(dirty&&!confirm('Revenir en arrière et quitter cette saisie ?'))return;if(history.length>1)history.back();else App.minimizeApp();}).catch(()=>{});
App.addListener('appStateChange',({isActive})=>{if(isActive){Native.clearTemporary().catch(()=>{});window.MIRAndroidSession?.resume();}else window.MIRAndroidSession?.pause();}).catch(()=>{});
// One position per explicit business action; no background/watch tracking.
if(navigator.geolocation)navigator.geolocation.getCurrentPosition=(success,error,options={})=>{
 Geolocation.requestPermissions({permissions:['location']}).then(result=>{if(!['granted','limited'].includes(result.location)&&result.coarseLocation!=='granted')throw Error('Permission GPS refusée');return Geolocation.getCurrentPosition({enableHighAccuracy:!!options.enableHighAccuracy,timeout:Math.min(options.timeout||10000,20000),maximumAge:0});}).then(position=>success(position)).catch(reason=>error?.({code:/timeout|timed out|0010/i.test(reason.message)?3:/permission|refus|0003/i.test(reason.message)?1:2,message:reason.message}));
};
if(navigator.geolocation)navigator.geolocation.watchPosition=()=>{throw Error('Le suivi permanent est désactivé. Utilisez une localisation ponctuelle.');};
Native.clearTemporary().catch(()=>{});
