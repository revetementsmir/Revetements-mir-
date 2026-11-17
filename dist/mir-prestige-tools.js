/* Presentation only. Never activate the prestige layer in a staff workshop. */
(function(){
  'use strict';
  const page=location.pathname.split('/').pop();
  const query=new URLSearchParams(location.search);
  if(page==='production.html'&&query.get('mode')==='client'&&query.get('source')!=='store'){
    document.body.setAttribute('data-mir-prestige-tools','production');
    // The explicit client/non-store guard above excludes every staff route.
    // Mark the existing public header before DOMContentLoaded so Harmony keeps
    // ownership of internal headers only; no business controls are changed.
    const header=document.querySelector('header.production-header');
    if(header){
      document.documentElement.removeAttribute('data-mir-harmony');
      header.setAttribute('data-mir-public-shell','');
      header.classList.add('mir-client-header','mir-home-header');
      header.querySelector('.mir-client-links')?.classList.remove('mir-production-client-nav');
      header.querySelector('.mir-production-client-actions')?.classList.remove('mir-production-client-actions');
      header.querySelector('.mir-production-client-account')?.classList.remove('mir-production-client-account');
      header.querySelector('nav[aria-label="Navigation du site"]')?.setAttribute('hidden','');
    }
    // Both client shapes add a line to the common cart. Change only these
    // action labels; keep revision, model and exported-document wording intact.
    function cartActionLabels(){
      const actions=[document.getElementById('add-production-piece'),document.getElementById('client-step-next'),document.querySelector('nav.mir-production-steps > ol:first-child > li:last-child')].filter(Boolean);
      const cartLabels=new Set(['Ajouter au dossier','Add to project file','Ajouter à ma soumission','Add to my quote request','Ajouter au panier','Add to cart']);
      const sync=()=>{
        const label=document.documentElement.lang==='en-CA'?'Add to cart':'Ajouter au panier';
        actions.forEach(action=>action.childNodes.forEach(node=>{
          if(node.nodeType!==3||!cartLabels.has(node.nodeValue.trim()))return;
          const next=node.nodeValue.replace(node.nodeValue.trim(),label);
          if(node.nodeValue!==next)node.nodeValue=next;
        }));
      };
      sync();
      const observer=new MutationObserver(sync);
      actions.forEach(action=>observer.observe(action,{childList:true,subtree:true,characterData:true}));
      observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    }
    document.readyState==='loading'?document.addEventListener('DOMContentLoaded',cartActionLabels,{once:true}):cartActionLabels();
  }
  const scope=document.body.dataset.mirPrestigeTools;
  if(!scope)return;
  if(scope==='plan'){
    // Put the working import action first without replacing its bound listener.
    const actions=document.querySelector('.studio-start');
    const importer=document.getElementById('import-pdf');
    if(actions&&importer)actions.prepend(importer);
  }
})();
