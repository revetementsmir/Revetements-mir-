/* MIR client localisation. No writes to business records, carts, profiles or session.
 * The public client and production.html?mode=client are the only supported roots. */
(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root && root.document){
    root.MIRClientLocale=api;
    const start=function(){api.init(root);};
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
  }
})(typeof window==='object'?window:null,function(root){
  'use strict';
  const KEY='mir-client-locale-v1';
  const clientFiles=Object.freeze([
    'index.html','boutique.html','materiaux.html','produit.html','selection.html',
    'pliage.html','contact.html','realisations.html','plan.html','production.html',
    'estimation.html','estimation-dossier.html','studio.html','chantier.html'
  ]);
  const dict=root?.MIRClientEnglish || (typeof module==='object'&&module.exports?require('./mir-client-en-ca.js'):{});
  const sources=new WeakMap(),attributes=new WeakMap(),hrefSources=new WeakMap();
  let locale='fr-CA',active=false,observer=null,pending=false;
  const path=(href)=>String(href||'').split(/[?#]/)[0].split('/').pop()||'index.html';
  function isClient(file,search=''){
    const name=path(file);
    if(!clientFiles.includes(name))return false;
    const params=new URLSearchParams(String(search||'').replace(/^\?/,''));
    if(name==='chantier.html')return params.get('clientLocale')==='1'&&!params.has('invite')&&!params.has('token');
    if(name!=='production.html')return true;
    return params.get('mode')==='client'&&params.get('source')!=='store';
  }
  function getLocale(){return locale;}
  function translate(value,lang=locale){
    if(lang!=='en-CA'||typeof value!=='string')return value;
    const cleaned=value.trim().normalize('NFC');
    if(!cleaned)return value;
    const fixed=Object.prototype.hasOwnProperty.call(dict,cleaned)?dict[cleaned]:dynamic(cleaned);
    return fixed===cleaned?value:value.replace(cleaned,fixed);
  }
  function dynamic(value){
    let m=value.match(/^(\d+) références?$/i);
    if(m)return m[1]+' '+(m[1]==='1'?'reference':'references');
    m=value.match(/^(\d+) pièce(?:s)? · ([\d\s,.]+) pi linéaires?$/);
    if(m)return m[1]+' '+(m[1]==='1'?'piece':'pieces')+' · '+m[2]+' linear ft';
    m=value.match(/^(\d+) sur (\d+)$/);
    if(m)return m[1]+' of '+m[2];
    m=value.match(/^(\d+) pièce(?:s)? sur mesure$/);
    if(m)return m[1]+' custom '+(m[1]==='1'?'piece':'pieces');
    m=value.match(/^(\d+) commandes? dans le suivi\.$/);
    if(m)return m[1]+' '+(m[1]==='1'?'order':'orders')+' being tracked.';
    m=value.match(/^(\d+) adresses? enregistrées?\.$/);
    if(m)return m[1]+' '+(m[1]==='1'?'saved address.':'saved addresses.');
    m=value.match(/^Commande ([A-Za-z0-9_-]{1,100})$/);
    if(m)return 'Order '+m[1];
    m=value.match(/^Connecté avec (.+)\. Aucune commande n’a été envoyée\.$/);
    if(m)return 'Signed in as '+m[1]+'. No order has been submitted.';
    return value;
  }
  function number(value,lang=locale,options={}){
    return new Intl.NumberFormat(lang,{maximumFractionDigits:3,...options}).format(value);
  }
  function cad(value,lang=locale){
    return new Intl.NumberFormat(lang,{style:'currency',currency:'CAD'}).format(value);
  }
  function date(value,lang=locale,options={year:'numeric',month:'short',day:'numeric'}){
    return new Intl.DateTimeFormat(lang,options).format(value);
  }
  function excluded(node){
    const e=node?.nodeType===1?node:node?.parentElement;
    return !e || !!e.closest('script,style,noscript,textarea,[contenteditable],template,code,pre,[data-mir-user-content],.mir-help-message,.mir-chat-message,.mir-client-note,.mir-customer-note');
  }
  function updateText(node){
    if(node.nodeType!==3||excluded(node))return;
    const now=node.nodeValue;
    let info=sources.get(node);
    if(!info||now!==info.last){info={source:now,last:now};sources.set(node,info);}
    const next=translate(info.source);
    if(now!==next){info.last=next;node.nodeValue=next;}
  }
  function updateAttributes(el){
    if(!el||el.nodeType!==1||excluded(el))return;
    let info=attributes.get(el);
    if(!info){info=Object.create(null);attributes.set(el,info);}
    for(const name of ['aria-label','aria-description','placeholder','title','alt']){
      if(!el.hasAttribute(name))continue;
      const now=el.getAttribute(name),prior=info[name];
      if(!prior||prior.last!==now)info[name]={source:now,last:now};
      const translated=translate(info[name].source);
      if(translated!==now){info[name].last=translated;el.setAttribute(name,translated);}
    }
  }
  function walk(node){
    if(!node||node.nodeType===8)return;
    if(node.nodeType===3){updateText(node);return;}
    if(node.nodeType!==1||excluded(node))return;
    updateAttributes(node);
    for(let child=node.firstChild;child;child=child.nextSibling)walk(child);
  }
  function customerAccount(){return path(root?.location?.pathname)==='chantier.html';}
  function staffReady(){
    if(!customerAccount())return false;
    const phase=root.MIRPortalActiveClient?.getStatus?.().phase;
    const mode=root.document?.body?.dataset.portalMode||'login';
    return phase==='ready'||(mode!=='login'&&mode!=='client'&&mode!=='loading');
  }
  function clientLinks(doc){
    if(customerAccount())return;
    for(const link of doc.querySelectorAll('a[href]')){
      if(link.closest('[data-mir-user-content]'))continue;
      const href=link.getAttribute('href')||'';
      let saved=hrefSources.get(link);
      if(!saved||saved.last!==href){saved={original:href,last:href};hrefSources.set(link,saved);}
      if(!/^chantier\.html(?:[?#]|$)/.test(saved.original))continue;
      const parts=saved.original.split('#'),url=new URL(parts[0],root.location.href);
      if(locale==='en-CA')url.searchParams.set('clientLocale','1');
      else url.searchParams.delete('clientLocale');
      const next=url.pathname.split('/').pop()+(url.search||'')+(parts[1]?'#'+parts[1]:'');
      if(href!==next){saved.last=next;link.setAttribute('href',next);}
    }
  }
  function metadata(doc){
    const title=doc.querySelector('title'),desc=doc.querySelector('meta[name="description"]');
    if(title)walk(title);
    if(desc){let rec=attributes.get(desc)||Object.create(null);if(!rec.content||rec.content.last!==desc.content)rec.content={source:desc.content,last:desc.content};attributes.set(desc,rec);const next=translate(rec.content.source);if(next!==desc.content){rec.content.last=next;desc.content=next;}}
    doc.documentElement.lang=locale;
  }
  function localeControl(doc){
    const header=doc.querySelector('header.site-header,header.production-header,header.portal-header');
    if(!header)return;
    let group=header.querySelector('.mir-client-locale-switch');
    if(!group){
      const account=header.querySelector('.mir-public-account-avatar, .mir-home-account, .mir-production-client-account');
      const actions=account?.parentElement || header.querySelector('.mir-home-header-actions,.mir-client-actions,.mir-production-client-actions') || header;
      group=doc.createElement('div');group.className='mir-client-locale-switch';group.setAttribute('role','group');
      group.setAttribute('aria-label','Langue du site client');
      for(const [lang,label] of [['fr-CA','FR'],['en-CA','EN']]){
        const button=doc.createElement('button');button.type='button';button.dataset.mirLocale=lang;
        button.lang=lang;button.textContent=label;button.addEventListener('click',function(){setLocale(lang);});
        group.append(button);
      }
      if(account&&account.parentElement===actions)actions.insertBefore(group,account);
      else actions.prepend(group);
    }
    group.setAttribute('aria-label',locale==='en-CA'?'Client website language':'Langue du site client');
    for(const b of group.querySelectorAll('button[data-mir-locale]')){
      const on=b.dataset.mirLocale===locale;
      b.setAttribute('aria-pressed',String(on));
      b.setAttribute('aria-label',b.dataset.mirLocale==='en-CA'?(locale==='en-CA'?'English (Canada), selected':'Anglais canadien'):(locale==='en-CA'?'French (Canada)':'Français canadien, sélectionné'));
    }
  }
  function stopForStaff(){
    locale='fr-CA';const doc=root.document;
    walk(doc.body);metadata(doc);
    doc.querySelector('.mir-client-locale-switch')?.remove();
    observer?.disconnect();observer=null;active=false;
  }
  function render(){
    if(!active)return;
    if(staffReady()){stopForStaff();return;}
    const doc=root.document;
    localeControl(doc);metadata(doc);walk(doc.body);clientLinks(doc);
  }
  function schedule(){
    if(pending||!active)return;
    pending=true;queueMicrotask(function(){pending=false;render();});
  }
  function setLocale(next){
    if(next!=='fr-CA'&&next!=='en-CA')return false;
    if(!active||next===locale)return active;
    locale=next;
    try{root.localStorage.setItem(KEY,next);}catch{}
    render();
    root.dispatchEvent(new CustomEvent('mir:client-locale-changed',{detail:{locale:next}}));
    return true;
  }
  function init(win){
    if(active)return true;
    if(!win||!isClient(win.location.pathname,win.location.search)||staffReady())return false;
    // A complete English release requires separate coverage, PDF and visual certification.
    // The preview is isolated to the unpublished feature branch until the coverage gate is lifted.
    const requested=new URLSearchParams(win.location.search).get('mir-locale-preview')==='1';
    if(requested)try{win.sessionStorage.setItem('mir-client-locale-preview-v1','1');}catch{}
    let preview=requested;
    if(!preview)try{preview=win.sessionStorage.getItem('mir-client-locale-preview-v1')==='1';}catch{}
    if(!preview)return false;
    active=true;
    try{if(win.localStorage.getItem(KEY)==='en-CA')locale='en-CA';}catch{}
    render();
    observer=new MutationObserver(function(records){
      if(!active)return;
      if(records.some(r=>r.type==='characterData'||r.addedNodes?.length||r.removedNodes?.length))schedule();
    });
    observer.observe(win.document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-portal-mode','placeholder','aria-label','aria-description','title']});
    return true;
  }
  return Object.freeze({version:'0.1.0-draft',isClient,getLocale,setLocale,translate,number,cad,date,init,render,KEY});
});