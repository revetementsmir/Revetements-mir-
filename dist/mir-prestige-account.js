/* Visual enhancement of the existing client forms. No Auth calls or writes. */
(()=>{'use strict';
 const doc=document,params=new URLSearchParams(location.search);
 const file=location.pathname.split('/').pop();
 if(file==='chantier.html'&&params.get('clientLocale')==='1'&&
    !['invite','invitation','token'].some(key=>params.has(key))){
   let helpLaunch=null;
   const sync=()=>{
     const status=window.MIRPortalActiveClient?.getStatus?.();
     let invitation=!!doc.querySelector('[data-mir-invitation="true"]');
     try{invitation=invitation||!!sessionStorage.getItem('mir_portal_invitation_v1');}catch{}
     const eligible=!invitation&&['login','client'].includes(doc.body.dataset.portalMode)&&status?.phase!=='ready';
     doc.body.classList.toggle('mir-prestige-account',eligible);
     helpLaunch=helpLaunch||doc.querySelector('.mir-help-launch');
     if(!eligible){
       doc.querySelectorAll('.mir-prestige-account-support').forEach(el=>el.remove());
       if(helpLaunch&&helpLaunch.parentElement!==doc.body)doc.body.append(helpLaunch);
       return;
     }
     const card=doc.querySelector('.auth-card');
     if(card&&!card.querySelector('.mir-prestige-account-support')){
       const support=doc.createElement('p');support.className='mir-prestige-account-support';
       const link=doc.createElement('a');link.href='aide.html';link.textContent='Besoin d’aide pour votre compte?';
       support.append(link);card.append(support);
     }
     const destination=card||doc.querySelector('.customer-account');
     if(helpLaunch&&destination&&helpLaunch.parentElement!==destination)destination.append(helpLaunch);
   };
   const start=()=>{sync();new MutationObserver(sync).observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-portal-mode']});};
   doc.readyState==='loading'?doc.addEventListener('DOMContentLoaded',start,{once:true}):start();
 }
 if(file==='aide.html'){
   const start=()=>{
     const input=doc.querySelector('#help-search'),rows=[...doc.querySelectorAll('.mir-prestige-faq')],empty=doc.querySelector('#help-empty');
     if(!input)return;
     const norm=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
     const filter=()=>{const terms=norm(input.value.trim()).split(/\s+/).filter(Boolean);let shown=0;
       for(const row of rows){row.hidden=!terms.every(word=>norm(row.textContent).includes(word));if(!row.hidden)shown++;}
       empty.hidden=shown!==0;
     };
     input.addEventListener('input',filter);window.addEventListener('mir:client-locale-changed',filter);
   };
   doc.readyState==='loading'?doc.addEventListener('DOMContentLoaded',start,{once:true}):start();
 }
})();
