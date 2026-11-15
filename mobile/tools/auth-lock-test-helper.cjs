'use strict';
// Unit-test model only. Actual Android cross-WebView contention is instrumented.
const managers=new WeakMap();
function sharedLocksFor(owner){
 if(managers.has(owner))return managers.get(owner);
 const tails=new Map(),entries=new Set(),locks={query:async()=>({held:[...entries].filter(e=>e.held).map(e=>({name:e.name,mode:'exclusive',clientId:'unit'})),pending:[...entries].filter(e=>!e.held).map(e=>({name:e.name,mode:'exclusive',clientId:'unit'}))}),request(name,options,callback){if(typeof options==='function')callback=options;const previous=tails.get(name)||Promise.resolve(),entry={name,held:false};entries.add(entry);const result=previous.catch(()=>{}).then(async()=>{entry.held=true;try{return await callback({name,mode:'exclusive'});}finally{entries.delete(entry);}});tails.set(name,result.catch(()=>{}));return result;}};
 managers.set(owner,locks);return locks;
}
module.exports={sharedLocksFor};
