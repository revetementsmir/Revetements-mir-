/* Public inspiration gallery. Reuses MIR locale; stores no customer data. */
(function(){
  'use strict';
  function init(){
    if(!document.body.classList.contains('mir-inspiration-page'))return;
    const data=window.MIRInspirationData,tabs=document.getElementById('mir-inspiration-tabs'),panel=document.getElementById('mir-inspiration-panel'),grid=document.getElementById('mir-inspiration-grid'),dialog=document.getElementById('mir-inspiration-dialog');
    if(!data?.styles?.length||!tabs||!panel||!grid||!dialog)return;
    const styles=data.styles,buttons=[...tabs.querySelectorAll('[data-inspiration-tab]')],cards=[...grid.querySelectorAll('[data-inspiration-card]')],large=document.getElementById('mir-inspiration-large');
    if(cards.length!==4||!large)return;
    const close=dialog.querySelector('[data-inspiration-close]'),previous=dialog.querySelector('[data-inspiration-prev]'),next=dialog.querySelector('[data-inspiration-next]'),retryLarge=dialog.querySelector('[data-inspiration-retry="dialog"]'),status=dialog.querySelector('[data-inspiration-dialog-error]'),title=document.getElementById('mir-inspiration-dialog-title'),caption=document.getElementById('mir-inspiration-caption'),position=document.getElementById('mir-inspiration-position');
    let selected=styles.find(style=>style.id===data.initialStyle)||styles[0],activeIndex=0,opener=null,lastLocale='',retrySerial=0;
    const imageJobs=new WeakMap();
    const locale=()=>/^en(?:-|$)/i.test(window.MIRClientLocale?.getLocale?.()||document.documentElement.lang)?'en':'fr';
    function text(node,fr,en){
      if(!node)return;node.dataset.fr=fr;node.dataset.en=en;
      const value=locale()==='en'?en:fr;if(node.textContent!==value)node.textContent=value;
    }
    function attribute(node,name,fr,en){
      if(!node)return;const suffix=name.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
      node.dataset['fr'+suffix[0].toUpperCase()+suffix.slice(1)]=fr;node.dataset['en'+suffix[0].toUpperCase()+suffix.slice(1)]=en;
      const value=locale()==='en'?en:fr;if(node.getAttribute(name)!==value)node.setAttribute(name,value);
    }
    function photoAt(index){return selected.photos[index];}
    function errorMessage(node){text(node,'L’image n’a pas pu être chargée.','The image could not be loaded.');}
    function imageState(image,state,holder,error,retry){
      const restoreFocus=state!=='error'&&retry===document.activeElement;
      image.dataset.inspirationState=state;image.hidden=state!=='ready';
      holder?.setAttribute('aria-busy',String(state==='loading'));
      if(error){error.setAttribute('role','status');error.hidden=state!=='error';}if(retry)retry.hidden=state!=='error';
      if(error)errorMessage(error.querySelector('[data-inspiration-error-message]')||error);
      if(restoreFocus)(holder?.matches('[data-inspiration-index]')?holder:close)?.focus({preventScroll:true});
    }
    function loadImage(image,src,{holder,error,retry,again=false}={}){
      if(!again&&image.dataset.inspirationSource===src)return;
      const previousJob=imageJobs.get(image);previousJob?.cleanup();
      const requested=again?src+'?mirRetry='+(++retrySerial):src,expected=new URL(requested,location.href).href,token={};
      image.dataset.inspirationSource=src;imageJobs.set(image,token);imageState(image,'loading',holder,error,retry);
      const active=()=>imageJobs.get(image)===token;
      const loaded=()=>{if(!active()||image.currentSrc&&image.currentSrc!==expected)return;token.cleanup();imageState(image,'ready',holder,error,retry);};
      const failed=()=>{if(!active()||image.currentSrc&&image.currentSrc!==expected)return;token.cleanup();imageState(image,'error',holder,error,retry);};
      token.cleanup=()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',failed);};
      image.addEventListener('load',loaded);image.addEventListener('error',failed);
      if(image.getAttribute('src')!==requested)image.setAttribute('src',requested);
      else if(image.complete)queueMicrotask(()=>image.naturalWidth?loaded():failed());
    }
    function cardText(card,index){
      const photo=photoAt(index),button=card.querySelector('[data-inspiration-index]'),image=card.querySelector('[data-inspiration-image]'),label=card.querySelector('[data-inspiration-card-caption]'),retry=card.querySelector('[data-inspiration-retry]');
      text(label,photo.caption.fr,photo.caption.en);attribute(image,'alt',photo.alt.fr,photo.alt.en);
      attribute(button,'aria-label','Agrandir : '+photo.caption.fr,'Enlarge: '+photo.caption.en);
      text(retry,'Réessayer','Try again');attribute(retry,'aria-label','Réessayer de charger : '+photo.caption.fr,'Try loading again: '+photo.caption.en);
      errorMessage(card.querySelector('[data-inspiration-error-message]'));
    }
    function renderCards(){
      cards.forEach((card,index)=>{const photo=photoAt(index),image=card.querySelector('[data-inspiration-image]');cardText(card,index);image.style.objectPosition=photo.position||'50% 50%';image.loading='eager';image.decoding='async';
        loadImage(image,photo.src,{holder:card.querySelector('[data-inspiration-index]'),error:card.querySelector('[data-inspiration-error]'),retry:card.querySelector('[data-inspiration-retry]')});
      });
    }
    function modalText(){
      const photo=photoAt(activeIndex);text(title,selected.name.fr,selected.name.en);text(caption,photo.caption.fr,photo.caption.en);attribute(large,'alt',photo.alt.fr,photo.alt.en);
      text(position,(activeIndex+1)+' sur 4',(activeIndex+1)+' of 4');text(close?.querySelector('[data-inspiration-close-label]'),'Fermer','Close');attribute(close,'aria-label','Fermer l’image agrandie','Close enlarged image');
      attribute(previous,'aria-label','Image précédente','Previous image');attribute(next,'aria-label','Image suivante','Next image');text(retryLarge,'Réessayer','Try again');errorMessage(status?.querySelector('[data-inspiration-error-message]'));
    }
    function showImage(index){
      activeIndex=(index+4)%4;const photo=photoAt(activeIndex);modalText();large.style.objectPosition=photo.position||'50% 50%';
      loadImage(large,photo.largeSrc,{holder:dialog.querySelector('.mir-inspiration-dialog-stage'),error:status,retry:retryLarge});
    }
    function open(index,button){
      if(!Number.isInteger(index)||index<0||index>=4)return;opener=button;showImage(index);
      if(!dialog.open)dialog.showModal();close?.focus({preventScroll:true});
    }
    function selectStyle(id,{focus=false}={}){
      const style=styles.find(item=>item.id===id);if(!style)return;
      const changed=selected!==style;selected=style;
      buttons.forEach(button=>{const on=button.dataset.inspirationTab===id;button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1;});
      const tab=buttons.find(button=>button.dataset.inspirationTab===id);panel.setAttribute('aria-labelledby',tab.id);panel.dataset.inspirationStyle=id;
      if(changed)renderCards();if(focus){tab.focus({preventScroll:true});tab.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
    }
    function renderLanguage(){
      lastLocale=locale();buttons.forEach(button=>{const style=styles.find(item=>item.id===button.dataset.inspirationTab);if(style)text(button,style.name.fr,style.name.en);});
      attribute(tabs,'aria-label','Choisir un style architectural','Choose an architectural style');cards.forEach(cardText);
      document.title=locale()==='en'?'Your next inspiration | Les Revêtements MIR':'Votre prochaine inspiration | Les Revêtements MIR';
      const description=document.querySelector('meta[name="description"]');if(description)description.content=locale()==='en'?'Explore seven styles and twenty-eight inspirations for your home’s siding.':'Explorez sept styles et vingt-huit inspirations pour imaginer le revêtement de votre maison.';
      document.querySelectorAll('main [data-fr][data-en],.mir-inspiration-footer [data-fr][data-en]').forEach(node=>text(node,node.dataset.fr,node.dataset.en));
      if(dialog.open)modalText();
    }
    buttons.forEach(button=>{button.setAttribute('role','tab');button.id||='mir-inspiration-tab-'+button.dataset.inspirationTab;button.setAttribute('aria-controls',panel.id);});
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-orientation','horizontal');panel.setAttribute('role','tabpanel');
    tabs.addEventListener('click',event=>{const button=event.target.closest('[data-inspiration-tab]');if(button&&tabs.contains(button))selectStyle(button.dataset.inspirationTab);});
    tabs.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey)return;const button=event.target.closest('[data-inspiration-tab]'),index=buttons.indexOf(button);if(index<0)return;
      const target=event.key==='ArrowRight'?(index+1)%buttons.length:event.key==='ArrowLeft'?(index+buttons.length-1)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:-1;
      if(target<0)return;event.preventDefault();selectStyle(buttons[target].dataset.inspirationTab,{focus:true});
    });
    grid.addEventListener('click',event=>{
      const retry=event.target.closest('[data-inspiration-retry]');if(retry&&grid.contains(retry)){const index=Number(retry.dataset.inspirationRetry),card=cards[index];if(!card)return;loadImage(card.querySelector('[data-inspiration-image]'),photoAt(index).src,{holder:card.querySelector('[data-inspiration-index]'),error:card.querySelector('[data-inspiration-error]'),retry,again:true});return;}
      const button=event.target.closest('[data-inspiration-index]');if(button&&grid.contains(button))open(Number(button.dataset.inspirationIndex),button);
    });
    close?.addEventListener('click',()=>dialog.close());previous?.addEventListener('click',()=>showImage(activeIndex-1));next?.addEventListener('click',()=>showImage(activeIndex+1));
    retryLarge?.addEventListener('click',()=>loadImage(large,photoAt(activeIndex).largeSrc,{holder:dialog.querySelector('.mir-inspiration-dialog-stage'),error:status,retry:retryLarge,again:true}));
    dialog.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey)return;const target=event.key==='ArrowLeft'?activeIndex-1:event.key==='ArrowRight'?activeIndex+1:event.key==='Home'?0:event.key==='End'?3:null;if(target===null)return;event.preventDefault();showImage(target);});
    dialog.addEventListener('close',()=>{if(opener?.isConnected&&(document.activeElement===document.body||dialog.contains(document.activeElement)))opener.focus({preventScroll:true});});
    window.addEventListener('mir:client-locale-changed',renderLanguage);
    new MutationObserver(()=>{if(locale()!==lastLocale)renderLanguage();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    selectStyle(selected.id);renderCards();renderLanguage();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
