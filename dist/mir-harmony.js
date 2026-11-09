/* Shared MIR header. Reuses existing navigation nodes and their authorization.
   It never grants a role, starts a session or opens a protected workspace. */
(function(){
 'use strict';
 function init(){
  const header=document.querySelector('body > header');if(!header||header.hasAttribute('data-mir-public-shell'))return;
  const page=location.pathname.split('/').pop(),params=new URLSearchParams(location.search);
  const admin=page==='production.html'&&params.get('mode')!=='client';
  const wall=page==='calepinage.html';
  const logo=header.querySelector('a:has(img)');if(!logo)return;
  header.id='mir-harmony-header';header.classList.add('mir-harmony-header');logo.classList.add('mir-harmony-logo');
  const title=document.createElement('span');title.className='mir-harmony-title';
  const titles={'production.html':params.get('kind')==='profile'?'Pliage':'Atelier','calepinage.html':'Panneaux','boutique.html':'Boutique','pliage.html':'Pliage','entrepot.html':'Entrepôt','chantier.html':'Mon compte','selection.html':'Mon dossier'};
  title.textContent=titles[page]||'MIR';
  const portal=page==='chantier.html';
  const dossier=document.createElement(admin||portal||wall?'button':'a');dossier.className='mir-harmony-dossier';
  if(admin){dossier.type='button';dossier.addEventListener('click',()=>{document.querySelector('[data-mir-tab="draw"]')?.click();const original=document.querySelector('#mode-link');if(!document.body.classList.contains('mir-v4-dossier-open'))original?.click();document.querySelector('#production-order')?.scrollIntoView({block:'start'});});}
  else if(wall){dossier.type='button';dossier.addEventListener('click',()=>window.MirWorkspace?.openInspector(document.querySelector('#project-name')));}
  else if(portal){dossier.type='button';dossier.addEventListener('click',()=>{if(['login','client'].includes(document.body.dataset.portalMode)){location.href='selection.html';return;}document.querySelector('#portal-navigation [data-view="projects"]')?.click();document.querySelector('#portal-main')?.focus();});}
  else dossier.href=page==='production.html'&&params.get('source')==='store'?'#production-order':'selection.html#mir-unified-dossier';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='mir-harmony-toggle';toggle.textContent=portal?'Menu':'☰';toggle.setAttribute('aria-label','Ouvrir le menu MIR');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','mir-harmony-menu');
  const menu=document.createElement('div');menu.id='mir-harmony-menu';menu.className='mir-harmony-menu';menu.hidden=true;
  // Retain originals, including account controls and permitted links.
  for(const child of [...header.children])if(child!==logo)menu.append(child);
  if(page==='production.html'&&!admin){for(const nav of menu.querySelectorAll('nav'))if(!nav.classList.contains('mir-production-client-nav'))nav.hidden=true;}
  if(admin){const tabs=document.querySelector('#mir-procurement-tabs');if(tabs){for(const nav of menu.querySelectorAll('nav'))nav.hidden=true;menu.prepend(tabs);}}
  if(wall){for(const nav of menu.querySelectorAll('nav'))nav.hidden=true;const nav=document.createElement('nav');nav.setAttribute('aria-label','Navigation client du projet');
   for(const [label,href]of [['Mon dossier','selection.html#mir-unified-dossier'],['Panneaux','production.html?mode=client'],['Studio 3D','plan.html'],['Mon panier','selection.html'],['Demander une estimation','estimation.html']]){const a=document.createElement('a');a.href=href;a.textContent=label;nav.append(a);}menu.prepend(nav);}
  if(!admin&&!portal&&!wall&&params.get('source')!=='store'&&!menu.querySelector('a[href="selection.html"]')){const complete=document.createElement('a');complete.href='selection.html';complete.textContent='Mon dossier complet';menu.append(complete);}
  header.append(title,dossier,toggle,menu);
  const owned=new Set([logo,title,dossier,toggle,menu]);new MutationObserver(()=>{for(const node of [...header.children])if(!owned.has(node))menu.append(node);}).observe(header,{childList:true});
  // Le menu métier du portail reste dans son conteneur : latéral au bureau et
  // fixé en bas sur téléphone. Le déplacer dans le menu d'en-tête le masquait.

  function close(focus=false){menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Ouvrir le menu MIR');if(focus)toggle.focus();}
  toggle.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Fermer le menu MIR':'Ouvrir le menu MIR');if(open)menu.querySelector('a,button')?.focus();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault();close(true);}});
  document.addEventListener('click',e=>{if(!header.contains(e.target))close();});
  menu.addEventListener('click',e=>{const target=e.target.closest('a,button');if(!target)return;if(target.dataset.mirTab){title.textContent=target.textContent.trim();}close(true);});
  function count(){let total=0;try{const key=admin?'mir_production_admin_dossier_v1':params.get('source')==='store'?'mir_production_employee_dossier_v1':'mir_production_client_dossier_v1';const data=JSON.parse(localStorage.getItem(key)||'null');total=(data?.order?.items||[]).reduce((n,i)=>n+(Number(i.spec?.quantity)||1),0);}catch{}if(portal){if(['login','client'].includes(document.body.dataset.portalMode)){total=window.MIRAccountFlow?.cartCount(localStorage)||0;if(!menu.querySelector('[data-client-shortcuts]')){const links=document.createElement('nav');links.dataset.clientShortcuts='';links.setAttribute('aria-label','Parcours client');for(const [text,href]of [['Mon panier','selection.html'],['Demander une estimation','estimation.html'],['Studio 3D','plan.html']]){const a=document.createElement('a');a.textContent=text;a.href=href;links.append(a);}menu.append(links);}}else total=Number(document.querySelector('#order-cart .cart-count')?.textContent)||0;}
   if(!admin&&!portal&&!wall&&params.get('source')!=='store')try{const list=JSON.parse(localStorage.getItem('mir-shopping-list-v1')||'null');total+=(list?.items||[]).length;}catch{}dossier.textContent=(portal&&['login','client'].includes(document.body.dataset.portalMode)?'Mon panier':'Mon dossier')+' · '+total;}
  count();if(wall){const wallCount=()=>{const total=window.MIRCalepinageWorkspace?.getState()?.layout?.pieces?.length;dossier.textContent='Mon dossier · '+(total||0);};window.addEventListener('mir-calepinage-rendered',wallCount);window.addEventListener('mir-calepinage-ready',wallCount);}const portalMain=document.querySelector('#portal-main');if(portalMain)new MutationObserver(count).observe(portalMain,{subtree:true,childList:true,characterData:true});const commerceCount=document.querySelector('[data-list-count]');if(commerceCount)new MutationObserver(count).observe(commerceCount,{subtree:true,childList:true,characterData:true});window.addEventListener('mir:workshop-saved',count);window.addEventListener('storage',count);
  const tabs=document.querySelector('#mir-procurement-tabs');if(tabs){const syncTitle=()=>{const selected=tabs.querySelector('[aria-current="page"],[aria-pressed="true"]');if(selected)title.textContent=selected.textContent.trim();};syncTitle();new MutationObserver(syncTitle).observe(tabs,{subtree:true,attributes:true,attributeFilter:['aria-current','aria-pressed']});}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
