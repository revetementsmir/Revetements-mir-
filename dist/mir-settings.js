(function(root,factory){'use strict';const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRHarmonySettings=api;})(typeof window==='object'?window:globalThis,function(root){
 'use strict';
 const KEY='mir_harmony_preferences_v1',defaults=()=>({theme:'system',textSize:'standard',reducedMotion:'auto',highContrast:false,dateLocale:'fr-CA'});
 const valid=value=>({theme:['light','dark','system'].includes(value?.theme)?value.theme:'system',textSize:value?.textSize==='large'?'large':'standard',reducedMotion:value?.reducedMotion==='on'?'on':'auto',highContrast:value?.highContrast===true,dateLocale:'fr-CA'});
 function read(storage=root?.localStorage){try{return valid(JSON.parse(storage?.getItem(KEY)||'null'));}catch(_){return defaults();}}
 function resolveTheme(value,media=root?.matchMedia?.('(prefers-color-scheme: dark)')){return value.theme==='system'?(media?.matches?'dark':'light'):value.theme;}
 function apply(value=read(),doc=root?.document,media=root?.matchMedia?.('(prefers-color-scheme: dark)')){value=valid(value);if(!doc?.documentElement)return value;const el=doc.documentElement;el.dataset.mirTheme=resolveTheme(value,media);el.dataset.mirThemeChoice=value.theme;el.dataset.mirText=value.textSize;el.dataset.mirMotion=value.reducedMotion==='on'||(value.reducedMotion==='auto'&&root?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)?'reduced':'standard';el.dataset.mirContrast=value.highContrast?'high':'standard';el.style.colorScheme=el.dataset.mirTheme;doc.querySelector?.('meta[name="theme-color"]')?.setAttribute('content',el.dataset.mirTheme==='dark'?'#17251c':'#2d4032');return value;}
 function store(value,storage=root?.localStorage){const clean=valid(value);try{storage?.setItem(KEY,JSON.stringify(clean));}catch(_){}apply(clean);return clean;}
 let current=read();apply(current);
 const system=root?.matchMedia?.('(prefers-color-scheme: dark)'),motion=root?.matchMedia?.('(prefers-reduced-motion: reduce)');
 const sync=()=>{current=read();apply(current);root?.dispatchEvent?.(new CustomEvent('mir:settings-applied',{detail:current}));};
 system?.addEventListener?.('change',()=>{if(read().theme==='system')sync();});motion?.addEventListener?.('change',()=>{if(read().reducedMotion==='auto')sync();});
 root?.addEventListener?.('storage',event=>{if(event.key===KEY)sync();});
 return Object.freeze({KEY,defaults,valid,read,resolveTheme,apply,store,sync});
});
