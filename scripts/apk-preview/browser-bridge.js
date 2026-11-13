/* Browser capabilities for the source-identical app UI. Never a native Android claim. */
(()=>{
 'use strict';
 const authKey='apk-preview-auth';
 const unavailable=async()=>{throw Error('Cette fonction native se vérifie dans l’APK sur votre téléphone.');};
 const Native={readAuth:async()=>({value:sessionStorage.getItem(authKey)}),writeAuth:async({value})=>{sessionStorage.setItem(authKey,value);return{};},clearAuth:async()=>{sessionStorage.removeItem(authKey);return{};},clearTemporary:async()=>({}),pdf:unavailable,pickFile:unavailable,capturePhoto:unavailable,scanQr:unavailable,openExternal:async({url})=>{const u=new URL(url);if(u.protocol!=='https:')throw Error('Adresse refusée');window.location.assign(u.href);return{};}};
 const App={addListener:async()=>({remove(){}}),minimizeApp:unavailable};
 const Geolocation={requestPermissions:unavailable,getCurrentPosition:unavailable};
 const root=new URL('./',document.currentScript.src);
 const runtime={Native,App,Geolocation,root};
 Object.defineProperty(window,'MIRAPKPreview',{value:runtime,configurable:false});
 // The original SDK's purge can only touch the preview's namespace (the guard
 // loaded immediately before this script owns Storage, IDB and Cache wrappers).
})();
