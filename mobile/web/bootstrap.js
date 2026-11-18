import {registerPlugin} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Geolocation} from '@capacitor/geolocation';
import Policy from './policy.cjs';
const Native=registerPlugin('MIRNative');
window.MIRAndroid=Object.freeze({Native,App,Geolocation,Policy});
// Present before deferred client scripts run: the native sign-in is one page,
// so the public account workspace must not divide its controls into a pager.
document.documentElement.dataset.mirNative='true';
const origin=location.origin;
function embeddedFieldPliage(){
 try{const query=new URLSearchParams(location.search),context=window.parent!==window&&window.parent.MIRFieldDrawingContext?.();return location.pathname.endsWith('/production.html')&&query.get('mode')==='client'&&query.get('source')==='store'&&query.get('kind')==='profile'&&context?.personal===true&&context.presentation==='pliage03'&&typeof context.ownerId==='string'&&context.ownerId.trim().length>0&&window.parent.document.body.dataset.fieldShell==='true';}catch{return false;}
}
const fieldPliageFrame=embeddedFieldPliage();
const rawFetch=window.fetch.bind(window);
window.fetch=(input,options)=>{const url=input instanceof Request?input.url:input;if(!Policy.allowedRequest(url,origin))return Promise.reject(new Error('Service refusé : application MIR TEST uniquement.'));return rawFetch(input,options);};
const rawOpen=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(method,url,...args){if(!Policy.allowedRequest(url,origin))throw Error('Service refusé : MIR TEST uniquement.');return rawOpen.call(this,method,url,...args);};
// Browser navigation cannot hand an untrusted document the native bridge.
function privateAsset(url){try{const u=new URL(url,location.href);return u.protocol==='blob:'||u.hostname===Policy.TEST&&u.pathname.startsWith('/storage/v1/')&&Policy.allowedRequest(u.href,origin);}catch{return false;}}
window.open=url=>{if(privateAsset(url))download({href:url,download:''}).catch(showError);else if(Policy.external(url))Native.openExternal({url}).catch(showError);else if(Policy.allowedRoute(url,origin)){if(!hasUnsavedInput()||confirm('Quitter cette saisie ? Les données non enregistrées restent à vérifier.'))location.assign(url);}else showError(new Error('Lien refusé dans MIR TEST.'));return null;};
let dirty=false;
function hasUnsavedInput(){return document.body.dataset.fieldShell==='true'?!!document.querySelector('#portal-content form[data-field-dirty=true],dialog[open] form[data-field-dirty=true]'):dirty;}
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
function showError(error){if(document.body.dataset.fieldShell==='true'||document.getElementById('mir-device-lock')){let alert=document.getElementById('mir-native-error');if(!alert){alert=document.createElement('div');alert.id='mir-native-error';alert.setAttribute('role','alert');const text=document.createElement('span'),close=document.createElement('button');close.type='button';close.textContent='Fermer';close.onclick=()=>alert.remove();alert.append(text,close);(document.getElementById('mir-device-lock')||document.querySelector('#portal-main'))?.prepend(alert);}const host=document.getElementById('mir-device-lock')||document.querySelector('#portal-main');if(host&&alert.parentElement!==host)host.prepend(alert);alert.querySelector('span').textContent=error?.message||'Action indisponible. Rien n’a été envoyé.';return;}const node=document.getElementById('mir-native-state');if(node){node.hidden=false;node.textContent=error?.message||'Action indisponible. Rien n’a été envoyé.';node.setAttribute('role','alert');}}
function networkState(){const node=document.getElementById('mir-native-state');if(node){if(fieldPliageFrame){node.hidden=true;return;}node.textContent=navigator.onLine?'MIR TEST · Notifications par actualisation':'MIR TEST · Hors ligne — les enregistrements serveur restent à confirmer';}}
function nativeAuthLayout(){
 const grid=document.querySelector('.auth-grid'),signin=grid?.querySelector('#auth-signin-form');
 document.body.classList.toggle('mir-native-auth',!!grid);
 document.body.classList.toggle('mir-native-signin',!!signin);
 if(!grid||grid.dataset.mirNativeAuth==='08')return;
 const intro=grid.querySelector('.auth-intro'),card=grid.querySelector('.auth-card');
 if(!intro||!card)return;
 grid.dataset.mirNativeAuth='08';
 const brand=document.createElement('div'),logo=document.createElement('img');
 brand.className='mir-native-auth-brand';logo.src='assets/MIR-logo-officiel-original.svg';logo.alt='Les Revêtements MIR';logo.width=245;logo.height=61;brand.append(logo);intro.prepend(brand);
 const eyebrow=intro.querySelector('.portal-eyebrow');if(eyebrow)eyebrow.textContent='ESPACE ÉQUIPE';
 for(const el of grid.querySelectorAll('[data-auth-screen="signup"],.auth-cart-return'))el.hidden=true;
 document.querySelector('#mir-email-toggle')?.remove();
 if(signin){
  signin.hidden=false;
  if(!grid.matches('[data-mir-invitation="true"]')){
   intro.querySelector('h1')?.remove();
   const description=intro.querySelector('p:not(.portal-eyebrow)');if(description)description.hidden=true;
  }
  const submit=signin.querySelector('button[type="submit"]');if(submit?.textContent==='Me connecter')submit.textContent='Se connecter';
  const forgot=grid.querySelector('[data-auth-screen="forgot"]'),divider=grid.querySelector('.auth-divider'),google=grid.querySelector('#auth-google');
  const googleNote=google?.nextElementSibling?.matches('.auth-footnote')?google.nextElementSibling:null;
  if(forgot){forgot.hidden=false;forgot.disabled=false;forgot.removeAttribute('title');}
  if(divider){divider.hidden=false;divider.querySelector('span').textContent='ou';}
  if(google){google.hidden=false;if(googleNote){googleNote.id='mir-native-google-note';google.setAttribute('aria-describedby',googleNote.id);}}
  // Move the original controls, retaining the existing submit/click handlers.
  const feedback=Array.from(card.querySelectorAll(':scope > .auth-error,:scope > .auth-message'));
  card.append(signin,...feedback,...[forgot,divider,google,googleNote].filter(Boolean));
 }
 const email=grid.querySelector('#auth-email');
 if(email){email.placeholder='Votre courriel';email.autocapitalize='none';email.spellcheck=false;}
 for(const input of grid.querySelectorAll('#auth-email,#auth-password')){
  const field=document.createElement('span');field.className='mir-native-auth-field';input.before(field);field.append(input);
  if(input.id==='auth-email'){
   const mark=document.createElement('span');mark.className='mir-native-auth-mail';mark.setAttribute('aria-hidden','true');
   mark.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>';field.prepend(mark);
  }else{
   input.placeholder='Votre mot de passe';
   const checkbox=grid.querySelector('#auth-show-password'),toggle=document.createElement('button');
   checkbox?.closest('.auth-show-password')?.setAttribute('hidden','');
   toggle.type='button';toggle.id='mir-native-password-toggle';toggle.setAttribute('aria-controls','auth-password');toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Afficher le mot de passe');
   toggle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
   toggle.onclick=()=>{const visible=input.type==='password';if(checkbox){checkbox.checked=visible;checkbox.dispatchEvent(new Event('change',{bubbles:true}));}else input.type=visible?'text':'password';toggle.setAttribute('aria-pressed',String(visible));toggle.setAttribute('aria-label',visible?'Masquer le mot de passe':'Afficher le mot de passe');};field.append(toggle);
  }
 }
 const reset=grid.querySelector('#auth-reset-form');
 if(reset&&!window.MIRTeamTestConfig?.recoveryEnabled){
  const description=intro.querySelector('p:not(.portal-eyebrow)');if(description)description.textContent='Contactez votre responsable MIR pour récupérer votre accès.';
  const submit=reset.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
  const note=document.createElement('p');note.className='auth-footnote';note.id='mir-native-recovery-note';note.textContent='La récupération par courriel n’est pas encore activée dans MIR TEST. Contactez votre responsable MIR.';reset.after(note);submit?.setAttribute('aria-describedby',note.id);
 }
 const help=document.createElement('button');help.type='button';help.id='mir-native-auth-help';help.className='auth-text-button';help.textContent='Besoin d’aide ?';
 help.onclick=()=>{const launch=document.querySelector('.mir-help-launch');if(launch)launch.click();else showError(new Error('Le Centre d’aide est indisponible. Contactez votre responsable MIR.'));};grid.append(help);
}
function mount(){
 // The embedded personal drawing already lives below the parent's native
 // status/safe-area chrome. Keep local errors, but never add a second fixed
 // TEST/network banner or a second 30px top inset over the drawing title.
 const style=document.createElement('style');style.textContent=(fieldPliageFrame?'#mir-native-state{position:static}':'body{padding-top:calc(env(safe-area-inset-top) + 30px)!important;padding-bottom:env(safe-area-inset-bottom)}#mir-native-state{position:fixed;top:0;left:0;right:0;z-index:10000}')+'#mir-native-state{background:var(--mir-surface-soft,#e9eee7);color:var(--mir-text,#24422e);padding:5px 10px;font:13px system-ui;min-height:20px}button,input,select{scroll-margin-bottom:100px}.mir-native-signin .mir-help-launch{position:static!important;transform:none!important;pointer-events:auto!important;display:block;margin:16px}';document.head.append(style);
 const banner=document.createElement('div');banner.id='mir-native-state';banner.setAttribute('role','status');document.body.prepend(banner);networkState();
 const observer=new MutationObserver(()=>{
  restoreAbsence();
  nativeAuthLayout();
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
 nativeAuthLayout();
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
 if(action!=='cancel'){assertSession();if(action==='open'&&hasUnsavedInput()&&!confirm('Ouvrir le PDF et quitter cette saisie ? Les données non enregistrées restent à vérifier.'))return;let name=link.download||'MIR.pdf';if(!name.toLowerCase().endsWith('.pdf'))name+='.pdf';const result=await Native.pdf({data:btoa(binary),name,action});if(result?.saved){const node=document.getElementById('mir-native-state');if(node)node.textContent='PDF enregistré dans le fichier choisi.';}}
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
 if(hasUnsavedInput()&&!confirm('Quitter cette saisie ? Les données non enregistrées sur le serveur restent à vérifier.')){event.preventDefault();event.stopImmediatePropagation();}
},true);
App.addListener('backButton',()=>{if(window.MIRFieldChoices?.close()||document.querySelector('#field-drawing-frame')?.contentWindow?.MIRFieldChoices?.close())return;const dialog=document.querySelector('dialog[open]');if(dialog){if(!dialog.dataset.mirNativeFile&&hasUnsavedInput()&&!confirm('Fermer cette saisie et quitter les changements non enregistrés ?'))return;const close=dialog.querySelector('[data-close-dialog],[data-close-production-dialog]');if(close)close.click();else{const event=new Event('cancel',{cancelable:true});if(dialog.dispatchEvent(event))dialog.close();}return;}if(hasUnsavedInput()&&!confirm('Revenir en arrière et quitter cette saisie ?'))return;if(window.MIRFieldBack?.())return;if(history.length>1)history.back();else App.minimizeApp();}).catch(()=>{});
App.addListener('appStateChange',async({isActive})=>{if(isActive){try{await unlockDevice();}catch(error){showError(error);return;}Native.clearTemporary().catch(()=>{});window.MIRFieldRuntime?.update(true);window.MIRFieldRuntime?.measure();window.MIRAndroidSession?.resume();}else{window.MIRAndroidSession?.pause();if(Native.authLockStatus){const state=await Native.authLockStatus();if(state.enabled){showDeviceLock();await Native.lockAuth();}}}}).catch(()=>{});
// One position per explicit business action; no background/watch tracking.
if(navigator.geolocation)navigator.geolocation.getCurrentPosition=(success,error,options={})=>{
 Geolocation.requestPermissions({permissions:['location']}).then(result=>{if(!['granted','limited'].includes(result.location)&&result.coarseLocation!=='granted')throw Error('Permission GPS refusée');return Geolocation.getCurrentPosition({enableHighAccuracy:!!options.enableHighAccuracy,timeout:Math.min(options.timeout||10000,20000),maximumAge:0});}).then(position=>success(position)).catch(reason=>error?.({code:/timeout|timed out|0010/i.test(reason.message)?3:/permission|refus|0003/i.test(reason.message)?1:2,message:reason.message}));
};
if(navigator.geolocation)navigator.geolocation.watchPosition=()=>{throw Error('Le suivi permanent est désactivé. Utilisez une localisation ponctuelle.');};
Native.clearTemporary().catch(()=>{});

// The SDK validates and exchanges only a pending PKCE flow from MIR TEST.
App.addListener('appUrlOpen',({url})=>receiveAuth(url).catch(showError)).catch(()=>{});
App.getLaunchUrl().then(result=>{if(result?.url)receiveAuth(result.url).catch(showError);}).catch(()=>{});

let unlocking=null;
function showDeviceLock(){document.documentElement.dataset.mirDeviceLocked='true';if(!document.body){document.addEventListener('DOMContentLoaded',()=>{if(document.documentElement.dataset.mirDeviceLocked)showDeviceLock();},{once:true});return;}if(document.getElementById('mir-device-lock'))return;const layer=document.createElement('section');layer.id='mir-device-lock';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','MIR verrouillé');const button=document.createElement('button');button.className='button';button.textContent='Déverrouiller MIR TEST';button.onclick=()=>unlockDevice().catch(showError);layer.append(button);document.body.append(layer);button.focus();}
function unlockDevice(){if(unlocking)return unlocking;if(!Native.authLockStatus)return Promise.resolve();unlocking=(async()=>{try{const status=await Native.authLockStatus();if(status.locked){showDeviceLock();await Native.unlockAuth();}delete document.documentElement.dataset.mirDeviceLocked;document.getElementById('mir-device-lock')?.remove();}catch(error){showDeviceLock();throw error;}finally{unlocking=null;}})();return unlocking;}
window.MIRAndroidUnlock=unlockDevice;
function mountLockOption(){if(document.body.dataset.portalConnection!=='connected'||document.body.dataset.fieldShell==='true'&&!document.querySelector('#harmony-settings-form')||document.getElementById('mir-device-lock-option'))return;const button=document.createElement('button');button.type='button';button.id='mir-device-lock-option';button.className='button secondary';button.textContent='Verrouillage de cet appareil (facultatif)';button.onclick=async()=>{try{const state=await Native.authLockStatus();await Native.setAuthLock({enabled:!state.enabled});button.textContent=!state.enabled?'Verrouillage système activé':'Verrouillage système désactivé';}catch(error){showError(error);}};document.getElementById('portal-content')?.append(button);}
document.addEventListener('DOMContentLoaded',()=>{mountLockOption();new MutationObserver(mountLockOption).observe(document.body,{childList:true,subtree:true});},{once:true});

async function receiveAuth(url){
 if(!window.MIRAndroidAcceptAuth)await new Promise((resolve,reject)=>{const ready=()=>{clearTimeout(timer);resolve();};const timer=setTimeout(()=>{window.removeEventListener('mir-native-auth-ready',ready);reject(Error('Connexion non initialisée. Rouvrez MIR TEST.'));},10000);window.addEventListener('mir-native-auth-ready',ready,{once:true});});
 await unlockDevice();await window.MIRAndroidAcceptAuth(url);
}

window.addEventListener('mir:form-closed',()=>{dirty=false;});
