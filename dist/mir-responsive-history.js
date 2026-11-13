// Keep the viewer's route while MIR updates its own filters with History API.
// Only loaded by responsive.html, before the original page scripts.
(()=>{
 'use strict';
 const initial=new URL(location.href),page=initial.searchParams.get('page')||'index.html';
 for(const method of ['replaceState','pushState']){
  const native=history[method].bind(history);
  history[method]=function(state,title,url){
   if(url!==undefined&&url!==null){
    const target=new URL(url,location.href);
    if(target.origin===location.origin&&target.pathname===initial.pathname){
     const current=new URL(location.href);
     target.searchParams.set('page',current.searchParams.get('page')||page);
     for(const key of ['layout','phone','tablet','desktop'])if(!target.searchParams.has(key)&&current.searchParams.has(key))target.searchParams.set(key,current.searchParams.get(key));
     url=target.href;
    }
   }
   return native(state,title,url);
  };
 }
})();
