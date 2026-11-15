/* Les Revêtements MIR — navigation publique commune.
   Les espaces Harmony/Admin restent exclus. Sans JavaScript, les liens HTML restent visibles. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document){
    root.MIRPublicMenu=api;
    const start=()=>api.init(root);
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
  }
})(typeof window==='object'?window:null,function(){
  'use strict';
  const BREAKPOINT='(max-width: 1100px)';
  const PRIMARY=[
    ['boutique.html','Boutique','boutique'],['pliage.html','Pliage','pliage'],
    ['plan.html','Studio','plan'],['realisations.html','Réalisations','realisations'],
    ['chantier.html#aide','Aide','aide'],['contact.html','Contact','contact']
  ];
  const MOBILE=[
    ['index.html','Accueil','⌂','index'],['boutique.html','Boutique','▦','boutique'],
    ['pliage.html','Pliage','⌁','pliage'],['plan.html','Studio','◈','plan'],
    ['chantier.html?view=orders','Commandes','▤','commandes']
  ];
  function route(path){const file=String(path||'').split('/').pop().split(/[?#]/)[0]||'index.html';return file.replace(/\.html$/,'');}
  function currentFor(key,current){if(key==='boutique')return ['boutique','produit','selection','materiaux'].includes(current);return key===current;}
  function recipeHref(href,test){if(!test||!/^[-\w]+\.html(?:[?#]|$)/.test(href))return href;const [base,hash='']=href.split('#'),join=base.includes('?')?'&':'?';return base+join+'recette=1'+(hash?'#'+hash:'');}
  function accountRoute(current,test=false){
    // Keep client drafts / Studio return links without assigning a role in the URL.
    const context=current==='plan'?'&return=studio':current==='selection'?'&return=panier':'';
    return recipeHref('chantier.html?view=account'+context,test);
  }
  function link(doc,href,label,key,current,test){const a=doc.createElement('a');a.href=recipeHref(href,test);a.textContent=label;if(currentFor(key,current))a.setAttribute('aria-current','page');return a;}
  function normalize(doc,header,nav,current,test){
    nav.replaceChildren(...PRIMARY.map(([href,label,key])=>link(doc,href,label,key,current,test)));
    // Desktop already has the Estimation action; on mobile it stays available in Plus.
    const menuEstimate=link(doc,'estimation.html','Estimation','estimation',current,test);
    menuEstimate.className='mir-menu-estimate';nav.append(menuEstimate);
    let actions=header.querySelector('.mir-home-header-actions, .mir-client-actions');
    if(!actions){actions=doc.createElement('div');header.append(actions);}
    actions.classList.add('mir-home-header-actions','mir-client-actions');
    let account=actions.querySelector('.mir-home-account');
    if(!account){account=link(doc,'chantier.html?view=account','Compte','compte',current,test);account.className='mir-home-account';actions.prepend(account);}
    account.href=accountRoute(current,test);
    account.classList.add('mir-public-account-avatar');
    account.setAttribute('aria-label','Connexion');
    account.setAttribute('title','Connexion / Mon compte');
    account.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7.5" r="3.5"/><path d="M5.5 20v-1.2c0-3.4 2.9-5.8 6.5-5.8s6.5 2.4 6.5 5.8V20"/></svg>';
    let estimate=actions.querySelector('.mir-home-estimate');
    if(!estimate){estimate=link(doc,'estimation.html','Estimation','estimation',current,test);estimate.className='mir-home-estimate';actions.append(estimate);}
    estimate.href=recipeHref('estimation.html',test);estimate.textContent='Estimation';
    let cart=actions.querySelector('.mir-public-cart');
    if(!cart){const initial=doc.querySelector('[data-list-count]')?.textContent||'0';cart=link(doc,'selection.html','Panier','boutique',current,test);cart.className='mir-public-cart';cart.innerHTML=`Panier <b data-list-count>${initial}</b>`;actions.insertBefore(cart,account);}
    // The avatar is the sole Connexion/Compte entry. Bottom navigation provides
    // destinations only, with the authenticated role decided by the portal.
    // Only inner client pages use the mobile/tablet bottom rail.
    actions.append(account); // Account avatar is always the rightmost header action.
    if(current!=='index'&&!doc.querySelector('.mir-mobile-tabs')){
      const tabs=doc.createElement('nav');tabs.className='mir-mobile-tabs';tabs.setAttribute('aria-label','Navigation mobile principale');
      for(const [href,label,icon,key] of MOBILE){const a=link(doc,href,label,key,current,test);a.innerHTML=`<span aria-hidden="true">${icon}</span><small>${label}</small>`;tabs.append(a);}
      doc.body.append(tabs);
    }
  }
  function init(win){
    const doc=win.document;
    if(doc.documentElement.hasAttribute('data-mir-harmony'))return null;
    const header=doc.querySelector('header.mir-client-header, header.mir-home-header');
    const nav=header?.querySelector('nav.mir-client-links');
    if(!header||!nav||header.querySelector('.mir-client-menu-toggle'))return null;
    const query=new URLSearchParams(win.location?.search||'');
    const current=route(doc.documentElement.dataset.mirResponsiveEntry==='true'?(query.get('page')||'index.html'):win.location?.pathname),test=query.get('recette')==='1';
    normalize(doc,header,nav,current,test);
    header.setAttribute('data-mir-public-shell','');doc.body.classList.add('mir-public-navigation');
    doc.body.classList.toggle('mir-public-home',current==='index');
    const media=win.matchMedia(BREAKPOINT);
    const isMobile=()=>{const viewport=header.closest('[data-mir-responsive-viewport]');return viewport?viewport.clientWidth<=1100:media.matches;};
    const toggle=doc.createElement('button');toggle.type='button';toggle.className='mir-client-menu-toggle';toggle.textContent='Plus';
    if(!nav.id)nav.id='mir-client-links-menu';
    toggle.setAttribute('aria-controls',nav.id);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Ouvrir les liens utiles');header.insertBefore(toggle,nav);
    let mobile=false;
    function close(restoreFocus=false){nav.hidden=true;header.classList.remove('mir-client-menu-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Ouvrir les liens utiles');if(restoreFocus)toggle.focus();}
    function open(){nav.hidden=false;header.classList.add('mir-client-menu-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Fermer les liens utiles');}
    function sync(){const now=isMobile();header.classList.toggle('mir-client-menu-ready',now);toggle.hidden=!now;if(!now){nav.hidden=false;header.classList.remove('mir-client-menu-open');toggle.setAttribute('aria-expanded','false');}else if(!mobile)close(false);mobile=now;}
    toggle.addEventListener('click',()=>{if(isMobile())(toggle.getAttribute('aria-expanded')==='true'?close:open)(true);});
    nav.addEventListener('click',event=>{if(isMobile()&&event.target.closest?.('a'))close(false);});
    doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&isMobile()&&toggle.getAttribute('aria-expanded')==='true'){event.preventDefault();close(true);}});
    doc.addEventListener('pointerdown',event=>{if(isMobile()&&!header.contains(event.target)&&toggle.getAttribute('aria-expanded')==='true')close(false);});
    doc.addEventListener('mir:responsive-viewport',sync);
    if(media.addEventListener)media.addEventListener('change',sync);else media.addListener?.(sync);sync();
    return Object.freeze({toggle,nav,close,open,sync});
  }
  return Object.freeze({version:'2.1.0',breakpoint:BREAKPOINT,primary:PRIMARY,mobile:MOBILE,recipeHref,accountRoute,route,init});
});
