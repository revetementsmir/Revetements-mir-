'use strict';
// Unit-test model only. Actual Android cross-WebView contention is instrumented.
const managers=new WeakMap();
function sharedLocksFor(owner){
 if(managers.has(owner))return managers.get(owner);
 const tails=new Map(),locks={request(name,options,callback){if(typeof options==='function')callback=options;const previous=tails.get(name)||Promise.resolve(),result=previous.catch(()=>{}).then(()=>callback({name,mode:'exclusive'}));tails.set(name,result.catch(()=>{}));return result;}};
 managers.set(owner,locks);return locks;
}
module.exports={sharedLocksFor};
