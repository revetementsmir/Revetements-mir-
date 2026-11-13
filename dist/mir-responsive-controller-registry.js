/* Passive controller registration. Loading this file never mounts a MIR page. */
(function(root,factory){
 'use strict';
 const current=root?.MIRResponsiveControllers;
 const api=current?.version==='1.0.0'&&typeof current.register==='function'&&typeof current.get==='function'?current:factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRResponsiveControllers=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const factories=new Map();
 function path(value){if(typeof value!=='string'||value.length>180||!/^[-\w]+(?:\/[-\w]+)*\.(?:js|mjs)$/.test(value)||value.split('/').some(part=>['__proto__','prototype','constructor'].includes(part)))throw new TypeError('Chemin de contrôleur MIR invalide.');return value;}
 function register(name,factory){name=path(name);if(typeof factory!=='function')throw new TypeError('Une factory MIR est nécessaire.');const existing=factories.get(name);if(existing)return existing;factories.set(name,factory);return factory;}
 function get(name){return factories.get(path(name));}
 return Object.freeze({version:'1.0.0',register,get,has:name=>factories.has(path(name))});
});
