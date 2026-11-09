/* Public API URLs only. No secret, sender, recipient or privileged key. */
(()=>{const test=new URLSearchParams(location.search).get('recette')==='1';window.MIREstimateConfig=Object.freeze({apiBase:test?'https://hxtztkmbfpmzrieccwsg.supabase.co/functions/v1/mir-estimates':'',environment:test?'test':'production'});})();
