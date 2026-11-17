/* Presentation adapter. Reads the existing cart and published pricing API.
 * Never changes saved selections, quantities, estimate drafts or transport. */
(()=>{'use strict';
const start=()=>{
 const doc=document,locale=()=>window.MIRClientLocale?.getLocale?.()||'fr-CA',en=()=>locale()==='en-CA';
 const money=n=>new Intl.NumberFormat(locale(),{style:'currency',currency:'CAD'}).format(n/100);
 const unit=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
 const saleUnit=s=>{const u=unit(s);if(/^boites?(\b| de )/.test(u))return 'box';if(/^paquets?(\b| de )/.test(u))return 'pack';if(/^cartons?(\b| de )/.test(u))return 'carton';if(/^rouleaux?(\b| de )/.test(u)||/^rouleau(\b| de )/.test(u))return 'roll';if(/^cartouches?$/.test(u))return 'cartridge';if(/^saucisses?$/.test(u))return 'sausage';if(/^pieces?$/.test(u))return 'piece';return u;};
 const set=(node,text)=>{if(node&&node.textContent!==text)node.textContent=text;};
 const items=doc.querySelector('#selection-items'),totals=doc.querySelector('#mir-cart-amounts');
 let pending=false;
 function renderAmounts(){
  if(!items||!totals)return;
  let cart;try{cart=JSON.parse(localStorage.getItem('mir-shopping-list-v1')||'null');}catch{return;}
  let subtotal=0,priced=0,unpriced=0;
  for(const article of items.querySelectorAll('.selection-item')){
   const index=Number(article.querySelector('[data-selection-preview]')?.dataset.selectionPreview),item=cart?.items?.[index];if(!item)continue;
   const price=window.MIRBoutiquePricing?.resolve?.(item.materialId,item.formatId),quantity=Number(item.quantity);
   const valid=window.MIRCommerceValidateQuantity?.(item);
   const compatible=Number.isInteger(price?.amountCents)&&price.amountCents>=0&&Number.isFinite(quantity)&&quantity>0&&saleUnit(price.unit)===saleUnit(item.unit)&&valid?.ok!==false;
   let node=article.querySelector('.mir-line-amount');if(!node){node=doc.createElement('p');node.className='mir-line-amount';node.setAttribute('data-mir-user-content','');article.append(node);}
   const line=compatible?Math.round(price.amountCents*quantity):null;
   if(line!==null){subtotal+=line;priced++;}else unpriced++;
   const title=line!==null?money(line):(en()?'Amount to confirm':'Montant à confirmer'),note=en()?'Before taxes and delivery':'Avant taxes et livraison';
   if(node.dataset.value!==title+'|'+note){node.dataset.value=title+'|'+note;node.replaceChildren(doc.createTextNode(title));const small=doc.createElement('small');small.textContent=note;node.append(small);}
  }
  let customCount=0;try{customCount=JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')||'null')?.order?.items?.length||0;}catch{}
  const summary=doc.querySelector('#selection-summary');
  if(summary){let count=summary.querySelector('.mir-cart-item-count');if(!count){for(const child of [...summary.childNodes])if(child.nodeType===3)child.remove();count=doc.createElement('span');count.className='mir-cart-item-count';count.setAttribute('data-mir-user-content','');summary.prepend(count);}const n=cart?.items?.length||0;set(count,en()?n+' material '+(n===1?'item':'items')+' and '+customCount+' custom '+(customCount===1?'piece':'pieces')+' in your cart.':n+' article'+(n===1?'':'s')+' de matériaux et '+customCount+' pièce'+(customCount===1?'':'s')+' sur mesure dans votre panier.');}
  let pieces=[];try{pieces=window.MIRUnifiedClientDossier?.read(localStorage)?.pieces||[];}catch{}
  const rows=doc.querySelectorAll('#mir-unified-pieces li');
  pieces.forEach((piece,index)=>{const row=rows[index];if(!row)return;const spec=piece.spec||{},dims=spec.segments?.map(x=>[x.label,x.length])||Object.entries(spec.dimensions||{}),measure=spec.unit==='mm'?'mm':en()?'in':'po';const text=dims.filter(([,v])=>Number.isFinite(Number(v))).map(([key,value])=>key+' '+new Intl.NumberFormat(locale(),{maximumFractionDigits:3}).format(value)+' '+measure).join(' · ')+(spec.length?(dims.length?' · ':'')+(en()?'Length ':'Longueur ')+new Intl.NumberFormat(locale(),{maximumFractionDigits:3}).format(spec.length)+' '+measure:'');let node=row.querySelector('.mir-piece-dimensions');if(!node){node=doc.createElement('span');node.className='mir-piece-dimensions';node.setAttribute('data-mir-user-content','');row.append(node);}set(node,text);});
  const label=en()?'Materials with a published price':'Matériaux avec un prix publié';
  const value=priced?money(subtotal):(en()?'On request':'Sur demande');
  const note=(en()?'Before taxes and delivery.':'Avant taxes et livraison.')+((unpriced||customCount)?(en()?' Other materials and custom pieces will be confirmed by MIR.':' Les autres matériaux et pièces sur mesure seront confirmés par MIR.'):'');
  const signature=[label,value,note].join('|');
  if(totals.dataset.value!==signature){totals.dataset.value=signature;totals.setAttribute('data-mir-user-content','');totals.replaceChildren(doc.createTextNode(label));const strong=doc.createElement('strong');strong.textContent=value;const small=doc.createElement('small');small.textContent=note;totals.append(strong,small);}
 }
 const schedule=()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;renderAmounts();});};
 if(items){new MutationObserver(schedule).observe(items,{childList:true,subtree:true});const pieces=doc.querySelector('#mir-unified-pieces');if(pieces)new MutationObserver(schedule).observe(pieces,{childList:true,subtree:true});doc.addEventListener('input',e=>{if(e.target.closest('#selection-items'))schedule();});doc.addEventListener('change',e=>{if(e.target.closest('#selection-items'))schedule();});window.addEventListener('storage',schedule);window.MIRBoutiquePricing?.load?.().then(schedule);schedule();}
 const dialog=doc.querySelector('#mir-estimate-dialog'),send=doc.querySelector('#estimate-send'),status=doc.querySelector('#estimate-status');
 const renderEstimate=()=>{set(send,en()?'Send request':'Envoyer la demande');if(dialog&&status){const received=/^(Demande reçue|Request received)/i.test(status.textContent.trim());if(dialog.dataset.received!==String(received))dialog.dataset.received=String(received);}};
 if(status)new MutationObserver(renderEstimate).observe(status,{childList:true,subtree:true,characterData:true});
 doc.addEventListener('mir:locale-change',()=>{schedule();renderEstimate();});
 window.addEventListener('mir:client-locale-changed',()=>{schedule();renderEstimate();});
 new MutationObserver(()=>{schedule();renderEstimate();}).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});renderEstimate();
};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
