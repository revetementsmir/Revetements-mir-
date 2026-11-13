/* Les Revêtements MIR — navigation publique commune.
   Les espaces Harmony/Admin restent exclus. Sans JavaScript, les liens HTML restent visibles. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document){
    root.MIRPublicMenu=api;
    const start=()=>{if(root.document.documentElement.dataset.mirResponsiveEntry!=='true')api.init(root);};
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
    ['pliage.html','Pliage','⌁','pliage'],['chantier.html?view=orders','Commandes','▤','commandes'],
    ['chantier.html?view=account','Compte','○','compte']
  ];
  function route(path){const file=String(path||'').split('/').pop().split(/[?#]/)[0]||'index.html';return file.replace(/\.html$/,'');}
  function currentFor(key,current){if(key==='boutique')return ['boutique','produit','selection','materiaux'].includes(current);return key===current;}
  function recipeHref(href,test){if(!test||!/^[-\w]+\.html(?:[?#]|$)/.test(href))return href;const [base,hash='']=href.split('#'),join=base.includes('?')?'&':'?';return base+join+'recette=1'+(hash?'#'+hash:'');}
  function link(doc,href,label,key,current,test){const a=doc.createElement('a');a.href=recipeHref(href,test);a.textContent=label;if(currentFor(key,current))a.setAttribute('aria-current','page');return a;}
  function normalize(doc,header,nav,current,test,scope=doc,page=doc.body){
    nav.replaceChildren(...PRIMARY.map(([href,label,key])=>link(doc,href,label,key,current,test)));
    let actions=header.querySelector('.mir-home-header-actions, .mir-client-actions');
    if(!actions){actions=doc.createElement('div');header.append(actions);}
    actions.classList.add('mir-home-header-actions','mir-client-actions');
    let account=actions.querySelector('.mir-home-account');
    if(!account){account=link(doc,'chantier.html?view=account','Compte','compte',current,test);account.className='mir-home-account';actions.prepend(account);}
    account.href=recipeHref('chantier.html?view=account',test);account.textContent='Compte';
    let estimate=actions.querySelector('.mir-home-estimate');
    if(!estimate){estimate=link(doc,'estimation.html','Estimation','estimation',current,test);estimate.className='mir-home-estimate';actions.append(estimate);}
    estimate.href=recipeHref('estimation.html',test);estimate.textContent='Estimation';
    let cart=actions.querySelector('.mir-public-cart');
    if(!cart){const initial=scope.querySelector('[data-list-count]')?.textContent||'0';cart=link(doc,'selection.html','Panier','boutique',current,test);cart.className='mir-public-cart';cart.innerHTML=`Panier <b data-list-count>${initial}</b>`;actions.insertBefore(cart,account);}
    if(!scope.querySelector('.mir-mobile-tabs')){
      const tabs=doc.createElement('nav');tabs.className='mir-mobile-tabs';tabs.setAttribute('aria-label','Navigation mobile principale');
      for(const [href,label,icon,key] of MOBILE){const a=link(doc,href,label,key,current,test);a.innerHTML=`<span aria-hidden="true">${icon}</span><small>${label}</small>`;tabs.append(a);}
      page.append(tabs);
    }
  }
  function init(win,options={}){
    const doc=options.context?.document||win.document,scope=options.root||doc,page=options.page||doc.body,viewport=options.viewport,url=options.url||win.location;
    if(options.signal?.aborted)return null;
    let disposed=false;const removers=[];
    const listen=(target,type,handler,settings)=>{const guarded=event=>{if(!disposed)handler(event);};target.addEventListener(type,guarded,settings);removers.push(()=>target.removeEventListener?.(type,guarded,settings));};
    if((options.page||doc.documentElement).hasAttribute('data-mir-harmony'))return null;
    const header=scope.querySelector('header.mir-client-header, header.mir-home-header');
    const nav=header?.querySelector('nav.mir-client-links');
    if(!header||!nav||header.querySelector('.mir-client-menu-toggle'))return null;
    const query=new URLSearchParams(url?.search||'');
    const current=route(options.url?url.pathname:doc.documentElement.dataset.mirResponsiveEntry==='true'?(query.get('page')||'index.html'):url?.pathname),test=query.get('recette')==='1';
    normalize(doc,header,nav,current,test,scope,page);
    header.setAttribute('data-mir-public-shell','');page.classList.add('mir-public-navigation');
    const media=win.matchMedia(BREAKPOINT);
    const isMobile=()=>{const frame=viewport||header.closest('[data-mir-responsive-viewport]');return frame?frame.clientWidth<=1100:media.matches;};
    const toggle=doc.createElement('button');toggle.type='button';toggle.className='mir-client-menu-toggle';toggle.textContent='Plus';
    if(!nav.id)nav.id='mir-client-links-menu';
    toggle.setAttribute('aria-controls',nav.id);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Ouvrir les liens utiles');header.insertBefore(toggle,nav);
    let mobile=false;
    function close(restoreFocus=false){if(disposed)return;nav.hidden=true;header.classList.remove('mir-client-menu-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Ouvrir les liens utiles');if(restoreFocus)toggle.focus();}
    function open(){if(disposed)return;nav.hidden=false;header.classList.add('mir-client-menu-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Fermer les liens utiles');}
    function sync(){if(disposed)return;const now=isMobile();header.classList.toggle('mir-client-menu-ready',now);toggle.hidden=!now;if(!now){nav.hidden=false;header.classList.remove('mir-client-menu-open');toggle.setAttribute('aria-expanded','false');}else if(!mobile)close(false);mobile=now;}
    listen(toggle,'click',()=>{if(isMobile())(toggle.getAttribute('aria-expanded')==='true'?close:open)(true);});
    listen(nav,'click',event=>{if(isMobile()&&event.target.closest?.('a'))close(false);});
    listen(scope,'keydown',event=>{if(event.key==='Escape'&&isMobile()&&toggle.getAttribute('aria-expanded')==='true'){event.preventDefault();close(true);}});
    listen(scope,'pointerdown',event=>{if(isMobile()&&!header.contains(event.target)&&toggle.getAttribute('aria-expanded')==='true')close(false);});
    listen(scope,'mir:responsive-viewport',sync);
    if(media.addEventListener)listen(media,'change',sync);else{media.addListener?.(sync);removers.push(()=>media.removeListener?.(sync));}
    const resize=viewport&&typeof win.ResizeObserver==='function'?new win.ResizeObserver(sync):null;resize?.observe(viewport);
    function dispose(){if(disposed)return;disposed=true;resize?.disconnect();for(const remove of removers.splice(0))remove();}
    if(options.signal){const stop=()=>dispose();options.signal.addEventListener('abort',stop,{once:true});removers.push(()=>options.signal.removeEventListener('abort',stop));}
    sync();return Object.freeze({toggle,nav,close,open,sync,dispose});
  }
  return Object.freeze({version:'2.1.0',breakpoint:BREAKPOINT,primary:PRIMARY,mobile:MOBILE,recipeHref,route,init});
});
