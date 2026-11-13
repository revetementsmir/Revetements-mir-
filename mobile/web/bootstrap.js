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
window.open=url=>{if(Policy.external(url))Native.openExternal({url}).catch(showError);else if(Policy.allowedRoute(url,origin))location.assign(url);return null;};
let dirty=false;
function showError(error){const node=document.getElementById('mir-native-state');if(node){node.textContent=error?.message||'Action indisponible. Rien n’a été envoyé.';node.setAttribute('role','alert');}}
function networkState(){const node=document.getElementById('mir-native-state');if(node)node.textContent=navigator.onLine?'MIR TEST · Notifications par actualisation':'MIR TEST · Hors ligne — les enregistrements serveur restent à confirmer';}
function mount(){
 const style=document.createElement('style');style.textContent='body{padding-top:calc(env(safe-area-inset-top) + 30px)!important;padding-bottom:env(safe-area-inset-bottom)}#mir-native-state{position:fixed;top:0;left:0;right:0;z-index:10000;background:var(--mir-surface-soft,#e9eee7);color:var(--mir-text,#24422e);padding:5px 10px;font:13px system-ui;min-height:20px}button,input,select{scroll-margin-bottom:100px}.mir-native-signin .mir-help-launch{position:static!important;transform:none!important;pointer-events:auto!important;display:block;margin:16px}';document.head.append(style);
 const banner=document.createElement('div');banner.id='mir-native-state';banner.setAttribute('role','status');document.body.prepend(banner);networkState();
 const observer=new MutationObserver(()=>{
  document.body.classList.toggle('mir-native-signin',!!document.querySelector('#auth-signin-form'));
  for(const el of document.querySelectorAll('[data-auth-screen="signup"],[data-auth-screen="forgot"],#auth-google,.auth-divider,.auth-cart-return,.auth-card>.auth-footnote'))el.hidden=true;
  const intro=document.querySelector('.auth-intro');if(intro){const title=intro.querySelector('h1');if(title&&title.textContent!=='Connexion équipe MIR')title.textContent='Connexion équipe MIR';const text=intro.querySelector('p:not(.portal-eyebrow)');if(text&&text.textContent!=='Connectez-vous avec votre compte équipe. Environnement TEST.')text.textContent='Connectez-vous avec votre compte équipe. Environnement TEST.';}
  const qr=document.querySelector('#wh-camera-start');if(qr)qr.hidden=false;
 });observer.observe(document.body,{childList:true,subtree:true});
}
document.addEventListener('DOMContentLoaded',mount,{once:true});
addEventListener('offline',networkState);addEventListener('online',networkState);
document.addEventListener('input',event=>{if(event.target.closest('form')&&!event.target.closest('#auth-signin-form,#wh-login-form'))dirty=true;},true);
async function download(link){
 const url=new URL(link.href,location.href);if(url.protocol!=='blob:'&&!Policy.allowedRequest(url.href,origin))throw Error('Fichier non autorisé');
 const blob=await rawFetch(url.href).then(r=>{if(!r.ok)throw Error('Fichier indisponible');return r.blob();});
 const bytes=new Uint8Array(await blob.arrayBuffer());if(bytes.length>20*1024*1024||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw Error('Seuls les PDF vérifiés peuvent être ouverts ici.');
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const action=await new Promise(resolve=>{const dialog=document.createElement('dialog');dialog.innerHTML='<h2>PDF prêt</h2><p>Choisissez une action. Aucun fichier n’est envoyé automatiquement.</p><button data-action="open">Ouvrir le PDF</button> <button data-action="share">Partager…</button> <button data-action="cancel">Annuler</button>';document.body.append(dialog);dialog.addEventListener('click',event=>{const value=event.target.dataset.action;if(value){dialog.close();dialog.remove();resolve(value);}});dialog.addEventListener('cancel',()=>{dialog.remove();resolve('cancel');},{once:true});dialog.showModal();});
 if(action!=='cancel')await Native.pdf({data:btoa(binary),name:link.download||'MIR.pdf',action});
}
document.addEventListener('click',async event=>{
 const qr=event.target.closest?.('#wh-camera-start');
 if(qr){event.preventDefault();event.stopImmediatePropagation();try{const result=await Native.scanQr();if(!result.cancelled){const input=document.querySelector('#wh-qr-input');if(!input)throw Error('Saisie QR indisponible');input.value=result.value;input.dispatchEvent(new Event('input',{bubbles:true}));input.closest('form')?.requestSubmit();}}catch(error){showError(error);}return;}
 const input=event.target.closest?.('input[type="file"]');
 if(input){event.preventDefault();event.stopImmediatePropagation();try{const result=input.hasAttribute('capture')?await Native.capturePhoto():await Native.pickFile();if(!result.cancelled){const bytes=Uint8Array.from(atob(result.data),c=>c.charCodeAt(0)),transfer=new DataTransfer();transfer.items.add(new File([bytes],result.name,{type:result.mime}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}}catch(error){showError(error);}return;}
 const link=event.target.closest?.('a[href]');if(!link)return;
 if(link.download||link.href.startsWith('blob:')){event.preventDefault();event.stopImmediatePropagation();download(link).catch(showError);return;}
 if(Policy.external(link.href)){event.preventDefault();event.stopImmediatePropagation();Native.openExternal({url:link.href}).catch(showError);return;}
 if(!Policy.allowedRoute(link.href,origin)){event.preventDefault();event.stopImmediatePropagation();showError(new Error('Ce parcours n’est pas disponible dans MIR TEST.'));return;}
 if(dirty&&!confirm('Quitter cette saisie ? Les données non enregistrées sur le serveur restent à vérifier.')){event.preventDefault();event.stopImmediatePropagation();}
},true);
App.addListener('backButton',()=>{if(dirty&&!confirm('Revenir en arrière et quitter cette saisie ?'))return;const close=document.querySelector('dialog[open] [data-close-dialog],dialog[open] [data-close-production-dialog]');if(close){close.click();return;}if(history.length>1)history.back();else App.minimizeApp();}).catch(()=>{});
App.addListener('appStateChange',({isActive})=>{if(isActive){Native.clearTemporary().catch(()=>{});window.MIRAndroidSession?.resume();}else window.MIRAndroidSession?.pause();}).catch(()=>{});
// One position per explicit business action; no background/watch tracking.
if(navigator.geolocation)navigator.geolocation.getCurrentPosition=(success,error,options={})=>{
 Geolocation.requestPermissions({permissions:['location']}).then(result=>{if(!['granted','limited'].includes(result.location)&&result.coarseLocation!=='granted')throw Error('Permission GPS refusée');return Geolocation.getCurrentPosition({enableHighAccuracy:!!options.enableHighAccuracy,timeout:Math.min(options.timeout||10000,20000),maximumAge:0});}).then(position=>success(position)).catch(reason=>error?.({code:/timeout|timed out|0010/i.test(reason.message)?3:/permission|refus|0003/i.test(reason.message)?1:2,message:reason.message}));
};
if(navigator.geolocation)navigator.geolocation.watchPosition=()=>{throw Error('Le suivi permanent est désactivé. Utilisez une localisation ponctuelle.');};
Native.clearTemporary().catch(()=>{});
