/* MIR : le menu mobile public s'applique au configurateur client seulement.
   Aucun changement de comportement pour l'atelier Admin ou le moteur Studio. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root?.document){
  root.MIRProductionClientNavigation=api;
  api.init(root);
 }
})(typeof window==='object'?window:null,function(){
 'use strict';
 function init(win){
  const doc=win?.document;
  if(!doc?.documentElement.classList.contains('mir-production-client'))return false;
  const header=doc.querySelector('header.production-header');
  const links=header?.querySelector('nav.mir-production-client-nav');
  const logo=header?.querySelector('.production-brand');
  const actions=header?.querySelector('.mir-production-client-actions');
  if(!header||!links||!logo||!actions)return false;
  doc.body.classList.add('mir-signature');
  header.classList.add('mir-client-header');
  logo.classList.add('mir-client-brand');
  const params=new URLSearchParams(win.location.search);
  if(params.get('kind')==='profile'&&params.get('source')!=='store'){
   doc.documentElement.removeAttribute('data-mir-harmony');
   header.setAttribute('data-mir-public-shell','');
   header.classList.add('mir-home-header');
   links.classList.remove('mir-production-client-nav');
   links.setAttribute('aria-label','Navigation principale');
   actions.classList.remove('mir-client-actions','mir-production-client-actions');
   actions.querySelector('.mir-home-account')?.classList.remove('mir-production-client-account');
  }
  // Le même contrôleur public (Escape, clic extérieur, focus, ARIA) sera chargé
  // ensuite par mir-public-menu.js, sans le recopier.
  return true;
 }
 return Object.freeze({version:'1.0.0',init});
});
