/* MIR public presentation. Existing catalogue, cart, Auth and drawing engines remain owners of data. */
(()=>{'use strict';function init(){
 const file=location.pathname.split('/').pop()||'index.html',q=new URLSearchParams(location.search);
 const pages=['index.html','boutique.html','produit.html','selection.html','materiaux.html','pliage.html','plan.html','studio.html','studio-public.html','estimation.html','realisations.html','contact.html','maison.html','chantiers.html','aide.html','inspiration.html'];
 let invitation=['invite','invitation','token'].some(key=>q.has(key))||!!document.querySelector('[data-mir-invitation="true"]');try{invitation=invitation||!!sessionStorage.getItem('mir_portal_invitation_v1');}catch{}
 const account=file==='chantier.html'&&q.get('clientLocale')==='1'&&!invitation;
 if(!pages.includes(file)&&!account&&!(file==='production.html'&&q.get('mode')==='client'&&q.get('source')!=='store'))return;
 const body=document.body,home=file==='index.html';
 const english={'Boutique':'Shop','Pliages sur mesure':'Custom metal bending','Studio 3D':'3D Studio','Réalisations':'Our work','Mes demandes':'My requests','Mes commandes':'My orders','Aide':'Help','Contact':'Contact','Panier':'Cart','Mon compte':'My account','Rechercher un produit':'Search for a product','Navigation principale':'Main navigation','Navigation mobile principale':'Main mobile navigation','Accueil':'Home','Pliages':'Metal bending','Demandes':'Requests','Commandes':'Orders','Menu':'Menu','Ouvrir le menu':'Open menu','Fermer le menu':'Close menu','Estimation':'Estimate'};
 const t=s=>window.MIRClientLocale?.translate(s)||(document.documentElement.lang==='en-CA'?(english[s]||s):s);
 const url=href=>{const u=new URL(href,location.href);if(q.get('recette')==='1')u.searchParams.set('recette','1');if(u.pathname.endsWith('/chantier.html'))u.searchParams.set('clientLocale','1');return u.pathname.split('/').pop()+u.search+u.hash;};
 const icons={search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',cart:'<path d="M2 3h3l2.5 12h11L21 7H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',account:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'};
 const svg=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[name]+'</svg>';
 let header=document.querySelector('header[data-mir-public-shell],header.mir-home-header,header.mir-client-header');
 if(account){header=document.createElement('header');header.className='site-header mir-client-header mir-home-header mir-prestige-account-header';header.dataset.mirPublicShell='';header.innerHTML='<a class="brand mir-client-brand" href="'+url('index.html')+'"><img src="assets/MIR-logo-officiel-original.svg" width="364" height="91" alt="Les Revêtements MIR"></a><nav class="mir-client-links"></nav><div class="mir-home-header-actions mir-client-actions"></div>';body.prepend(header);}
 if(!header)return;
 body.classList.add('mir-prestige');body.classList.toggle('mir-prestige-home',home);header.classList.add('mir-prestige-header');header.id='mir-prestige-header';
 header.querySelector('a img')?.closest('a')?.classList.add('mir-client-brand');
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#242522');
 let actions=header.querySelector('.mir-home-header-actions,.mir-client-actions,.header-actions');
 if(!actions){actions=document.createElement('div');header.append(actions);}actions.classList.add('mir-prestige-actions');
 let avatar=actions.querySelector('.mir-public-account-avatar,.mir-home-account,.mir-production-client-account');
 if(!avatar){avatar=document.createElement('a');actions.append(avatar);}avatar.classList.add('mir-public-account-avatar');avatar.href=url('chantier.html?view=account&clientLocale=1');avatar.innerHTML=svg('account');avatar.setAttribute('aria-label',t('Mon compte'));avatar.title=t('Mon compte');
 let cart=actions.querySelector('.mir-public-cart');if(!cart){cart=document.createElement('a');cart.className='mir-public-cart';actions.prepend(cart);}cart.href=url('selection.html');cart.innerHTML=svg('cart')+'<span class="mir-cart-word">'+t('Panier')+'</span><b data-prestige-cart-count>0</b>';cart.setAttribute('aria-label',t('Panier'));
 const search=document.createElement('a');search.className='mir-prestige-search';search.href=url('boutique.html#shop-search');search.innerHTML=svg('search');search.setAttribute('aria-label',t('Rechercher un produit'));actions.prepend(search);
 let locale=header.querySelector('.mir-client-locale-switch,.languages');if(locale){locale.classList.add('mir-client-locale-switch');actions.append(locale);}actions.querySelectorAll(':scope > .site-link').forEach(el=>el.remove());actions.append(avatar);
 const navigation=[['boutique.html','Boutique',['boutique.html','produit.html','materiaux.html']],['pliage.html','Pliages sur mesure',['pliage.html','production.html']],['plan.html','Studio 3D',['plan.html','studio.html']],['realisations.html','Réalisations',['realisations.html']],['chantier.html?view=orders&clientLocale=1','Mes commandes',['chantier.html']],['aide.html','Aide',['aide.html']],['contact.html','Contact',['contact.html']],['estimation.html','Estimation',['estimation.html']]];
 let nav=header.querySelector('nav.mir-client-links');if(!nav){nav=document.createElement('nav');header.append(nav);}nav.className='mir-client-links mir-prestige-nav';nav.id='mir-prestige-desktop-nav';nav.setAttribute('aria-label',t('Navigation principale'));nav.hidden=false;
 nav.replaceChildren(...navigation.map(([href,label,active])=>{const a=document.createElement('a');a.href=url(href);a.textContent=t(label);a.dataset.fr=label;a.dataset.en=english[label]||label;if((active.includes(file)&&(!account||q.get('view')==='orders'))||file==='studio-public.html'&&active.includes('plan.html'))a.setAttribute('aria-current','page');return a;}));
 header.querySelector('.mir-client-menu-toggle')?.remove();
 if(file==='selection.html')cart.setAttribute('aria-current','page');
 if(account&&q.get('view')!=='orders')avatar.setAttribute('aria-current','page');
 for(const [el,label] of [[avatar,'Mon compte'],[cart,'Panier'],[search,'Rechercher un produit'],[nav,'Navigation principale']]){el.dataset.frAriaLabel=label;el.dataset.enAriaLabel=english[label];}
 const cartWord=cart.querySelector('.mir-cart-word');cartWord.dataset.fr='Panier';cartWord.dataset.en='Cart';
 // Keep the TEST context on links created by the existing page engines as well.
 function preserveContext(anchor){if(!anchor?.getAttribute('href')||anchor.getAttribute('href').startsWith('#'))return;const target=new URL(anchor.href,location.href);if(target.origin!==location.origin||!target.pathname.endsWith('.html'))return;if(q.get('recette')==='1')target.searchParams.set('recette','1');if(target.pathname.endsWith('/chantier.html')&&!['invite','invitation','token'].some(key=>target.searchParams.has(key)))target.searchParams.set('clientLocale','1');anchor.href=target.pathname+target.search+target.hash;}
 document.querySelectorAll('a[href]').forEach(preserveContext);document.addEventListener('click',event=>preserveContext(event.target.closest?.('a[href]')),true);
 // The client journey has no bottom navigation on any device.
 document.querySelectorAll('.mir-mobile-tabs').forEach(node=>node.remove());
 document.querySelectorAll('footer.mir-signature-footer nav').forEach(node=>node.remove());
 const menu=document.createElement('button');
 menu.id='mir-client-menu-button';menu.type='button';menu.className='mir-client-menu-button';
 menu.innerHTML='<span aria-hidden="true">☰</span> <span data-fr="Menu" data-en="Menu">Menu</span>';
 menu.setAttribute('aria-controls',nav.id);menu.setAttribute('aria-expanded','false');
 menu.setAttribute('aria-label',t('Ouvrir le menu'));actions.prepend(menu);
 const mobileMenu=matchMedia('(max-width:1100px)');
 function closeMenu(restore=false){
  header.classList.remove('mir-client-menu-open');menu.setAttribute('aria-expanded','false');
  menu.setAttribute('aria-label',t('Ouvrir le menu'));if(mobileMenu.matches)nav.hidden=true;
  if(restore)menu.focus({preventScroll:true});
 }
 function openMenu(){nav.hidden=false;header.classList.add('mir-client-menu-open');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label',t('Fermer le menu'));}
 function placeLocale(){
  locale=header.querySelector('.mir-client-locale-switch,.languages');
  if(!locale)return;
  locale.classList.add('mir-client-locale-switch');
  if(mobileMenu.matches){if(locale.parentElement!==nav)nav.append(locale);}
  else if(locale.parentElement!==actions||locale.nextElementSibling!==avatar)actions.insertBefore(locale,avatar);
 }
 function syncMenu(){
  menu.hidden=!mobileMenu.matches;closeMenu();nav.hidden=mobileMenu.matches;
  placeLocale();
 }
 menu.addEventListener('click',()=>menu.getAttribute('aria-expanded')==='true'?closeMenu():openMenu());
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){event.preventDefault();closeMenu(true);}});
 document.addEventListener('pointerdown',event=>{if(!header.contains(event.target))closeMenu();});
 nav.addEventListener('click',event=>{if(event.target.closest('a')&&mobileMenu.matches)closeMenu();});
 if(mobileMenu.addEventListener)mobileMenu.addEventListener('change',syncMenu);else mobileMenu.addListener(syncMenu);
 syncMenu();
 // Account localization is inserted asynchronously after the public header.
 new MutationObserver(placeLocale).observe(header,{childList:true,subtree:true});
 function counts(){let materials=0,pieces=0;try{materials=JSON.parse(localStorage.getItem('mir-shopping-list-v1')||'{}').items?.length||0;pieces=JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')||'{}').order?.items?.length||0;}catch{}const value=String(materials+pieces);document.querySelectorAll('[data-prestige-cart-count],[data-list-count]').forEach(el=>{if(el.textContent!==value)el.textContent=value;});}
 counts();addEventListener('storage',counts);addEventListener('pageshow',counts);document.addEventListener('click',()=>{setTimeout(counts,0);setTimeout(counts,180);});document.addEventListener('change',()=>setTimeout(counts,0));
 const cartObserver=new MutationObserver(()=>counts());document.querySelectorAll('[data-list-count]').forEach(el=>cartObserver.observe(el,{childList:true,characterData:true,subtree:true}));
 if(location.hash==='#shop-search')document.getElementById('shop-search')?.focus({preventScroll:true});
 function accountScope(){if(!account)return;const mode=body.dataset.portalMode,staff=window.MIRPortalActiveClient?.getStatus?.().phase==='ready'||!['login','client','loading'].includes(mode||'login');body.classList.toggle('mir-prestige',!staff);body.classList.toggle('mir-prestige-account',!staff);header.hidden=staff;document.querySelector('.mir-mobile-tabs')?.toggleAttribute('hidden',staff);}
 accountScope();if(account)new MutationObserver(accountScope).observe(body,{attributes:true,attributeFilter:['data-portal-mode']});
 window.MIRPrestige=Object.freeze({version:'2.0.0',updateCartCount:counts,closeMenu});
}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();})();
