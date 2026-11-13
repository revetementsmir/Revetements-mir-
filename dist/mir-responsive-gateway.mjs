// Only scripts declared by the reviewed MIR pages can be loaded here.
// Real controllers run inside explicit view contexts; this is not an auth boundary.
const ALLOWED_SCRIPTS = new Set([
 "annotated-pdf.js",
 "architectural-wall-geometry.js",
 "architectural-wall-input.js",
 "architectural-wall-view.js",
 "atelier-essai/mir-calepinage-extension.js",
 "calepinage-app.js",
 "catalogue-order.js",
 "catalogue.js",
 "chantier-app.js",
 "commerce.js",
 "coordination-app.js",
 "custom-model-cards.js",
 "employee-store-model.js",
 "entrepot-app.js",
 "kaycan-flat-preview.js",
 "material-coverage.js",
 "material-preview.js",
 "material-surface.js",
 "mir-account-flow.js",
 "mir-admin-live3d.js",
 "mir-bend-pricing.js",
 "mir-bending-finishes.js",
 "mir-bending-lengths.js",
 "mir-bending-presets.js",
 "mir-boutique-pricing.js",
 "mir-catalogue-policy.js",
 "mir-client-pliage-viewport.js",
 "mir-client-return.js",
 "mir-commerce-quantity.js",
 "mir-coordination-client.js",
 "mir-direct-model-save.js",
 "mir-estimate-config.js",
 "mir-estimate-drafts.js",
 "mir-estimate-upload.js",
 "mir-estimate.js",
 "mir-freeform-workshop.js",
 "mir-harmony.js",
 "mir-help-center.js",
 "mir-miniature.js",
 "mir-order-coordination.js",
 "mir-panel-dimensions.js",
 "mir-panel-po-pdf.js",
 "mir-panel-roof.js",
 "mir-panel-sketch.js",
 "mir-panel-workbench.js",
 "mir-po-workflow.js",
 "mir-procurement.js",
 "mir-production-client-nav.js",
 "mir-profile-recognition.js",
 "mir-public-menu.js",
 "mir-realisations.js",
 "mir-selection-pdf.js",
 "mir-settings.js",
 "mir-shared-client.js",
 "mir-store-color-policy.js",
 "mir-store-review.js",
 "mir-today.js",
 "mir-unified-client-dossier.js",
 "mir-unified-order-cart.js",
 "mir-vertical-layout.js",
 "mir-warehouse-client.js",
 "mir-warehouse-coordination-ui.js",
 "mir-warehouse-core.js",
 "mir-workspace.js",
 "model-measure-defaults.js",
 "panel-layout-engine.js",
 "panel-layout-output.js",
 "panel-layout-pdf.js",
 "plan-3d.js",
 "plan-annotations.js",
 "plan-app.js",
 "plan-facade-visual.js",
 "plan-import-core.js",
 "plan-import.js",
 "plan-layout.js",
 "pliage.js",
 "portal-client.js",
 "portal-config.js",
 "production-admin-v4.js",
 "production-app.js",
 "production-model.js",
 "production-volume.js",
 "profile-production-transfer.js",
 "project-store.js",
 "shared-config.js",
 "studio-capture.mjs",
 "studio-features.js",
 "studio-wall-sections.js",
 "takeoff-engine.js",
 "template-library-backup.js",
 "unico-data.js",
 "vendor/polygon-clipping/polygon-clipping.umd.min.js",
 "vendor/qrcode.min.js",
 "vendor/supabase-client.js"
]);
for(const path of ['plan-structure-notes.js','plan-stair-vision.js','plan-sheet-detection.js','plan-scan-ocr.js','plan-spatial-dimensions.js'])ALLOWED_SCRIPTS.add(path);
const PLAN_IMPORT = ['project-store.js','plan-import-core.js','plan-structure-notes.js','plan-stair-vision.js','plan-sheet-detection.js','plan-scan-ocr.js','plan-spatial-dimensions.js','plan-facade-visual.js'];
const PAGES = new Set(["index.html", "contact.html", "boutique.html", "produit.html", "selection.html", "pliage.html", "production.html", "chantier.html", "entrepot.html", "coordination.html", "calepinage.html", "plan.html", "realisations.html", "materiaux.html", "estimation.html"]);
const PURE = new Set(['commerce.js','mir-public-menu.js','vendor/supabase-client.js','vendor/qrcode.min.js','vendor/polygon-clipping/polygon-clipping.umd.min.js']);
const REGISTRY = 'mir-responsive-controller-registry.js';
const FACTORY_BUILD = 'mir-views-20261113-1';
const states = new WeakMap();
const cancelled = () => new DOMException('Vue MIR fermée.','AbortError');

function canonicalScript(value,base) {
 const source=typeof value==='string'?{src:value,type:'classic'}:value;
 if(!source||typeof source.src!=='string'||source.src.length>2400)throw new TypeError('Script MIR invalide.');
 const url=new URL(source.src,base),directory=new URL('./',base);
 if(url.origin!==directory.origin||url.username||url.password||!url.pathname.startsWith(directory.pathname)||url.hash)throw new TypeError('Script externe ou hors du site MIR refusé.');
 const path=url.pathname.slice(directory.pathname.length);
 if(!ALLOWED_SCRIPTS.has(path))throw new TypeError('Ce script ne dispose pas de contrôleur MIR : '+path);
 const type=String(source.type||'classic').trim().toLowerCase();
 if(!['classic','text/javascript','application/javascript','module'].includes(type)||type==='module'&&path!=='studio-capture.mjs'||path.endsWith('.mjs')&&path!=='studio-capture.mjs')throw new TypeError('Module MIR non pris en charge : '+path);
 return{path,url,type};
}
function assertActive(gateway,context,signal) {if(gateway.disposed||context.signal?.aborted||signal?.aborted)throw cancelled();}
function untilAbort(promise,signal) {
 if(!signal)return promise;if(signal.aborted)return Promise.reject(cancelled());
 return new Promise((resolve,reject)=>{const abort=()=>{cleanup();reject(cancelled());};const cleanup=()=>signal.removeEventListener('abort',abort);signal.addEventListener('abort',abort,{once:true});promise.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});});
}
function markPreview(state,win) {
 if(state.marks)return;
 state.marks=[win.document.documentElement,win.document.body].map(node=>{if(!node)throw new Error('Le document Responsive MIR est indisponible.');const value=node.getAttribute('data-mir-responsive-entry');node.setAttribute('data-mir-responsive-entry','true');return{node,value};});
}
function loadNative(state,win,path,url) {
 const key=new URL(path,state.base).href;if(state.loads.has(key))return state.loads.get(key);
 const pending=new Promise((resolve,reject)=>{
  const script=win.document.createElement('script');script.async=false;script.type='text/javascript';
  const target=new URL(url||key);target.searchParams.set('mir-responsive-factory',FACTORY_BUILD);script.src=target.href;
  let done=false;const finish=error=>{if(done)return;done=true;win.clearTimeout(timer);script.onload=script.onerror=null;if(error){script.remove();reject(error);}else resolve();};
  const timer=win.setTimeout(()=>finish(new Error('Chargement du contrôleur MIR trop long : '+path)),20000);
  script.onload=()=>finish();script.onerror=()=>finish(new Error('Contrôleur MIR indisponible : '+path));
  win.document.head.append(script);
 });
 state.loads.set(key,pending);pending.catch(()=>{if(state.loads.get(key)===pending)state.loads.delete(key);});return pending;
}
function stableOptions(value,state,seen=new Set()) {
 if(value===null||typeof value!=='object'&&typeof value!=='function')return JSON.stringify(value)??String(value);
 if(typeof value==='function'||Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null&&!Array.isArray(value)){if(!state.identities.has(value))state.identities.set(value,++state.identityCount);return'@'+state.identities.get(value);}
 if(seen.has(value))throw new TypeError('Options SDK MIR circulaires.');seen.add(value);
 const text=Array.isArray(value)?'['+value.map(item=>stableOptions(item,state,seen)).join(',')+']':'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stableOptions(value[key],state,seen)).join(',')+'}';seen.delete(value);return text;
}
function sharedSDK(state,sdk) {
 if(!sdk||typeof sdk.createClient!=='function')return null;
 if(state.providers.has(sdk))return state.providers.get(sdk);
 const provider=Object.create(sdk);
 Object.defineProperty(provider,'createClient',{value(url,key,options){
  if(!state.references)throw new Error('La session Responsive MIR est fermée.');
  const identity=JSON.stringify([String(url),String(key)])+'|'+stableOptions(options,state);
  if(!state.clients.has(identity))state.clients.set(identity,sdk.createClient(url,key,options));
  return state.clients.get(identity);
 },enumerable:true});
 Object.freeze(provider);state.providers.set(sdk,provider);return provider;
}
function startup(context) {
 if(context.pageName==='production.html') {
  const params=new URLSearchParams(context.location.search);
  if(params.get('mode')==='client') {context.document.documentElement.classList.add('mir-production-client');if(params.get('kind')==='profile'&&params.get('source')!=='store')context.document.documentElement.dataset.mirProfileStartup=params.get('profile')||params.get('template')||context.location.hash==='#production-order'?'direct':'choice';}
 }
}
function indexRedirect(context) {
 if(context.pageName!=='index.html')return null;
 const previous={'#realisations':'realisations.html','#au-coeur-du-centre-ville':'realisations.html#au-coeur-du-centre-ville','#nous-joindre':'contact.html','#matieres':'boutique.html'};
 const redirect=()=>{const target=previous[context.location.hash];if(target)context.location.replace(target);};
 const click=event=>{if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const link=event.composedPath?.().find(node=>node?.matches?.('a[href]'))||event.target.closest?.('a[href]'),target=link&&previous[link.getAttribute('href')];if(target){event.preventDefault();context.location.replace(target);}};
 context.root.addEventListener('click',click,true);context.window.addEventListener('hashchange',redirect);const timer=context.window.setTimeout(redirect,0);
 return{dispose(){context.window.clearTimeout(timer);context.root.removeEventListener('click',click,true);context.window.removeEventListener('hashchange',redirect);}};
}
function studioCapture(context) {
 const launch=context.document.querySelector('#mir-start-capture');if(!launch)return null;
 const click=()=>{const status=context.document.querySelector('#mir-capture-status'),workspace=context.root.host?.closest('.preview-workspace'),trigger=workspace?.querySelector('.preview-workspace-toolbar .capture-trigger');if(!trigger){if(status)status.textContent='Le Studio Capture commun n’est pas disponible dans cette vue.';return;}if(status)status.textContent='Choisis le cadre MIR à capturer.';trigger.click();};
 launch.addEventListener('click',click);return{dispose(){launch.removeEventListener('click',click);}};
}
export function createMirSessionGateway({window:win=globalThis.window,baseURL,baseUrl,services:initialServices={}}={}) {
 if(!win?.document)throw new TypeError('Une fenêtre MIR est nécessaire.');
 const base=new URL('./',baseURL||baseUrl||win.document.baseURI);
 if(!['http:','https:'].includes(base.protocol)||base.origin!==win.location.origin)throw new TypeError('Le gateway doit rester sur le site MIR courant.');
 let state=states.get(win);
 if(state&&state.base!==base.href)throw new Error('Deux versions de site MIR ne peuvent pas partager cette fenêtre.');
 if(!state){state={base:base.href,loads:new Map(),clients:new Map(),providers:new WeakMap(),identities:new WeakMap(),identityCount:0,references:0,marks:null};states.set(win,state);}
 state.references++;markPreview(state,win);
 const lifetime=new (win.AbortController||AbortController)(),gateway={disposed:false},services={...initialServices},prepared=new WeakMap(),mounted=new WeakMap(),active=new Set();
 async function prepare({scripts,context,pageName=context?.pageName,signal}={}) {
  if(!context?.root||!context?.window||!context?.document||!PAGES.has(pageName)||!Array.isArray(scripts)||scripts.length>128)throw new TypeError('La vue MIR et ses scripts sont nécessaires.');
  assertActive(gateway,context,signal);const operationSignal=AbortSignal.any([lifetime.signal,context.signal,signal].filter(Boolean));const descriptors=scripts.map(script=>canonicalScript(script,base));
  if(descriptors.some(item=>item.path==='plan-import.js'))for(const path of PLAN_IMPORT)if(!descriptors.some(item=>item.path===path))descriptors.splice(descriptors.findIndex(item=>item.path==='plan-import.js'),0,canonicalScript({src:new URL(path,base).href,type:'classic'},base));
  context.globals=context.window;context.pageName=pageName;
  await untilAbort(loadNative(state,win,REGISTRY),operationSignal);assertActive(gateway,context,signal);
  const registry=win.MIRResponsiveControllers;if(typeof registry?.register!=='function'||typeof registry?.get!=='function')throw new Error('Le registre des contrôleurs MIR n’a pas été chargé.');
  const bundle='mir-responsive-controller-bundles/'+pageName+'.js';
  await untilAbort(Promise.all([loadNative(state,win,bundle),...descriptors.filter(item=>PURE.has(item.path)).map(item=>loadNative(state,win,item.path,item.url.href))]),operationSignal);assertActive(gateway,context,signal);
  for(const item of descriptors)if(!PURE.has(item.path)&&item.path!=='studio-capture.mjs'&&typeof registry.get(item.path)!=='function')throw new Error('La factory MIR n’a pas été enregistrée : '+item.path);
  Object.assign(services,{MIRCommerce:win.MIRCommerce,MIRPublicMenu:win.MIRPublicMenu});
  const provider=sharedSDK(state,initialServices.MIRSupabase||win.MIRSupabase);if(provider)services.MIRSupabase=provider;
  const exported={...services};Object.assign(context.window,exported);prepared.set(context,{descriptors,registry});return{services:exported};
 }
 function mountPage(context) {
  assertActive(gateway,context);if(mounted.has(context))return mounted.get(context);
  const record=prepared.get(context);if(!record)throw new Error('Les contrôleurs de cette vue MIR ne sont pas préparés.');
  const components=[],pending=[];let disposed=false;
  const add=result=>{if(!result)return;if(typeof result.then==='function'){pending.push(Promise.resolve(result).then(component=>{if(disposed)component?.dispose?.();else if(component){components.push(component);return component.ready;}}));}else{components.push(result);if(result.ready)pending.push(result.ready);}};
  const component={ready:null,dispose(){if(disposed)return;disposed=true;for(const item of components.reverse())try{item?.dispose?.();}catch{}const portal=context.window.MIRPortalActiveClient;try{portal?.dispose?.();}catch{}active.delete(component);}};
  mounted.set(context,component);active.add(component);
  if(context.signal){const stop=()=>component.dispose();context.signal.addEventListener('abort',stop,{once:true});components.push({dispose(){context.signal.removeEventListener('abort',stop);}});}
  try {
   startup(context);add(indexRedirect(context));
   for(const item of record.descriptors) {
    assertActive(gateway,context);
    if(item.path==='commerce.js'){const api=context.window.MIRCommerce;if(typeof api?.mount!=='function')throw new Error('Le contrôleur Commerce MIR est indisponible.');add(api.mount({...context,onURLChange:context.updateURL,context}));}
    else if(item.path==='studio-capture.mjs')add(studioCapture(context));
    else if(!PURE.has(item.path))add(record.registry.get(item.path).call(context.globals,context));
   }
   component.ready=Promise.all(pending).then(()=>{assertActive(gateway,context);return true;});component.ready.catch(()=>{});return component;
  }catch(error){for(const promise of pending)Promise.resolve(promise).catch(()=>{});component.dispose();throw error;}
 }
 function dispose() {
  if(gateway.disposed)return;gateway.disposed=true;lifetime.abort();for(const component of [...active])component.dispose();state.references--;
  if(!state.references){for(const client of state.clients.values()){try{if(typeof client?.auth?.dispose==='function')Promise.resolve(client.auth.dispose()).catch(()=>{});else client?.auth?.stopAutoRefresh?.();}catch{}try{Promise.resolve(client?.removeAllChannels?.()).catch(()=>{});}catch{}}state.clients.clear();for(const {node,value}of state.marks||[])if(node.getAttribute('data-mir-responsive-entry')==='true'){if(value===null)node.removeAttribute('data-mir-responsive-entry');else node.setAttribute('data-mir-responsive-entry',value);}states.delete(win);}
 }
 return{services,prepare,mountPage,dispose};
}
