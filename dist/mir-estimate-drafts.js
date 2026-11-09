(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIREstimateDrafts=api;})(typeof window==='object'?window:null,function(){
'use strict';let opening;
function db(){if(!opening)opening=new Promise((resolve,reject)=>{const r=indexedDB.open('mir-estimates-drafts-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'source'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(Error('Le navigateur ne permet pas de conserver votre brouillon.'));};});return opening;}
async function operation(mode,action){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('drafts',mode),r=action(tx.objectStore('drafts'));let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('Le brouillon n’a pas pu être conservé sur cet appareil.'));});}
return Object.freeze({get:source=>operation('readonly',s=>s.get(source)),save:draft=>operation('readwrite',s=>s.put(draft)),remove:source=>operation('readwrite',s=>s.delete(source))});
});
