/* Loaded first by the generated TEST site only. No production endpoint fallback. */
(()=>{
 'use strict';
 const prefix='mir-test:hxtztkmbfpmzrieccwsg:',host='hxtztkmbfpmzrieccwsg.supabase.co';
 const root=new URL('./',document.currentScript.src);
 function stop(message){window.stop();document.open();document.write('<!doctype html><html lang="fr"><meta charset="utf-8"><title>MIR TEST bloqué</title><p role="alert">MIR TEST ne peut pas être isolé. Fermez cette page et utilisez le lien TEST vérifié.</p>');document.close();throw Error(message);}
 if(!location.pathname.startsWith(root.pathname)||!root.pathname.endsWith('/test/'))return stop('TEST_PATH_REQUIRED');
 function banner(){if(document.querySelector('[data-mir-test-banner]'))return;const el=document.createElement('aside');el.dataset.mirTestBanner='true';el.setAttribute('role','status');el.textContent='TEST · MIR TEST · envois externes désactivés';el.style.cssText='position:fixed;bottom:3px;left:8px;z-index:2147483500;max-width:90%;padding:4px 8px;background:#fff0c2;color:#603500;border:1px solid #9e6d16;border-radius:5px;font:700 11px/1.4 system-ui;pointer-events:none';document.body.append(el);}
 if(window.MIRTestEnvironment){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',banner,{once:true}):banner();return;}
 try{
   const wrapStorage=storage=>{
     const keys=()=>Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(key=>key?.startsWith(prefix)).map(key=>key.slice(prefix.length));
     const methods={getItem:key=>storage.getItem(prefix+String(key)),setItem:(key,value)=>storage.setItem(prefix+String(key),String(value)),removeItem:key=>storage.removeItem(prefix+String(key)),clear:()=>keys().forEach(key=>storage.removeItem(prefix+key)),key:index=>keys()[index]??null};
     return new Proxy(Object.create(null),{get(_,key){if(key==='length')return keys().length;if(key===Symbol.toStringTag)return 'Storage';if(key in methods)return methods[key];return typeof key==='string'?methods.getItem(key):undefined;},set(_,key,value){methods.setItem(key,value);return true;},deleteProperty(_,key){methods.removeItem(key);return true;},ownKeys:keys,getOwnPropertyDescriptor(_,key){if(keys().includes(key))return {value:methods.getItem(key),enumerable:true,configurable:true,writable:true};}});
   };
   for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{value:wrapStorage(window[name]),configurable:false});
   const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window),listeners=new WeakMap();
   window.addEventListener=function(type,listener,options){if(type!=='storage'||!listener)return add(type,listener,options);let wrapped=listeners.get(listener);if(!wrapped){wrapped=event=>{if(!event.key?.startsWith(prefix))return;const clean=new StorageEvent('storage',{key:event.key.slice(prefix.length),oldValue:event.oldValue,newValue:event.newValue,url:event.url});typeof listener==='function'?listener.call(window,clean):listener.handleEvent(clean);};listeners.set(listener,wrapped);}return add(type,wrapped,options);};
   window.removeEventListener=function(type,listener,options){return remove(type,type==='storage'?(listeners.get(listener)||listener):listener,options);};
   if(window.indexedDB){for(const name of ['open','deleteDatabase']){const native=indexedDB[name].bind(indexedDB);indexedDB[name]=function(database,...args){return native(prefix+String(database),...args);};}if(indexedDB.databases){const native=indexedDB.databases.bind(indexedDB);indexedDB.databases=async()=> (await native()).filter(db=>db.name?.startsWith(prefix)).map(db=>({...db,name:db.name.slice(prefix.length)}));}}
   if(window.caches){for(const name of ['open','delete','has']){const native=caches[name].bind(caches);caches[name]=key=>native(prefix+String(key));}const native=caches.keys.bind(caches);caches.keys=async()=> (await native()).filter(key=>key.startsWith(prefix)).map(key=>key.slice(prefix.length));}
   function allowed(input){const url=new URL(typeof input==='object'&&input?.url?input.url:String(input),location.href);if(url.origin===location.origin||url.protocol==='blob:'||url.protocol==='data:')return;if(url.hostname==='atelier.atelier-app-001.workers.dev')return;if(url.hostname!==host)throw Error('TEST_ENDPOINT_DENIED');if(url.pathname.startsWith('/functions/')||/^\/auth\/v1\/(otp|signup|recover|invite|authorize|admin)(\/|$)/.test(url.pathname))throw Error('TEST_EXTERNAL_DELIVERY_DISABLED');}
   const fetcher=window.fetch.bind(window);window.fetch=function(input,init){try{allowed(input);}catch(error){return Promise.reject(error);}return fetcher(input,init);};
   const open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url,...args){allowed(url);return open.call(this,method,url,...args);};
   for(const name of ['WebSocket','EventSource'])if(window[name]){const Native=window[name];window[name]=class extends Native{constructor(url,...args){allowed(url);super(url,...args);}};}
   if(navigator.sendBeacon){const native=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=(url,data)=>{allowed(url);return native(url,data);};}
   Object.defineProperty(window,'MIRTestEnvironment',{value:Object.freeze({environment:'test',projectRef:'hxtztkmbfpmzrieccwsg',root:root.pathname}),configurable:false});
   document.documentElement.dataset.mirEnvironment='test';
   document.readyState==='loading'?document.addEventListener('DOMContentLoaded',banner,{once:true}):banner();
 }catch(error){stop(error.message);}
})();
