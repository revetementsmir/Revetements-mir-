/* Les Revêtements MIR — menu public progressif (aucun effet sur l'Admin).
   Sans JavaScript, les liens HTML originaux restent visibles. */
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
  function init(win){
    const doc=win.document;
    if(doc.documentElement.hasAttribute("data-mir-harmony"))return null;
    const header=doc.querySelector('header.mir-client-header');
    const nav=header?.querySelector('nav.mir-client-links');
    if(!header||!nav||header.querySelector('.mir-client-menu-toggle'))return null;
    const media=win.matchMedia(BREAKPOINT);
    const toggle=doc.createElement('button');
    toggle.type='button';
    toggle.className='mir-client-menu-toggle';
    toggle.textContent='Menu';
    if(!nav.id)nav.id='mir-client-links-menu';
    toggle.setAttribute('aria-controls',nav.id);
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','Ouvrir le menu principal');
    header.insertBefore(toggle,nav);

    // La sélection est utile dans le menu mobile, sans élargir l'en-tête PC.
    if(!nav.querySelector('a[href="selection.html"]')){
      const select=doc.createElement('a');
      select.href='selection.html';
      select.className='mir-mobile-selection';
      select.textContent='Ma sélection';
      nav.append(select);
    }
    let mobile=false;
    function close(restoreFocus=false){
      nav.hidden=true;
      header.classList.remove('mir-client-menu-open');
      toggle.setAttribute('aria-expanded','false');
      toggle.setAttribute('aria-label','Ouvrir le menu principal');
      if(restoreFocus)toggle.focus();
    }
    function open(){
      nav.hidden=false;
      header.classList.add('mir-client-menu-open');
      toggle.setAttribute('aria-expanded','true');
      toggle.setAttribute('aria-label','Fermer le menu principal');
    }
    function sync(){
      const now=media.matches;
      header.classList.toggle('mir-client-menu-ready',now);
      toggle.hidden=!now;
      if(!now){
        nav.hidden=false;
        header.classList.remove('mir-client-menu-open');
        toggle.setAttribute('aria-expanded','false');
        toggle.setAttribute('aria-label','Ouvrir le menu principal');
      }else if(!mobile)close(false);
      mobile=now;
    }
    toggle.addEventListener('click',()=>{
      if(!media.matches)return;
      if(toggle.getAttribute('aria-expanded')==='true')close(true);else open();
    });
    nav.addEventListener('click',event=>{
      if(media.matches&&event.target.closest?.('a'))close(false);
    });
    doc.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&media.matches&&toggle.getAttribute('aria-expanded')==='true'){
        event.preventDefault();close(true);
      }
    });
    doc.addEventListener('pointerdown',event=>{
      if(media.matches&&!header.contains(event.target)&&toggle.getAttribute('aria-expanded')==='true')close(false);
    });
    if(media.addEventListener)media.addEventListener('change',sync);
    else media.addListener?.(sync);
    sync();
    return Object.freeze({toggle,nav,close,open,sync});
  }
  return Object.freeze({version:'1.0.0',breakpoint:BREAKPOINT,init});
});
