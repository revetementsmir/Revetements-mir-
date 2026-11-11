(function(global){
 'use strict';
 let rows=[],pending;
 const mirFixed=new Map([['beck-panelfast-ags100',Object.freeze({itemId:'beck-panelfast-ags100',formatId:null,state:'adjusted',amountCents:51599,currency:'CAD',unit:'boîte de 12 bobines'})]]);

 const key=(item,format)=>`${item}::${format||''}`;
 async function load(){
  if(pending)return pending;
  pending=(async()=>{const c=global.MIRPortalConfig;if(!c?.supabaseUrl||!c?.publishableKey)return rows;
   const response=await fetch(`${c.supabaseUrl}/rest/v1/rpc/mir_public_boutique_prices`,{method:'POST',headers:{apikey:c.publishableKey,'content-type':'application/json'},body:'{}',cache:'no-store'});
   if(!response.ok)throw new Error('Les prix publiés ne peuvent pas être chargés.');
   const data=await response.json();rows=Array.isArray(data)?data:[];return rows;
  })().catch(()=>[]);return pending;
 }
 function resolve(item,format){const fixed=mirFixed.get(item);if(fixed)return fixed;const map=new Map(rows.map(x=>[key(x.itemId,x.formatId),x]));return map.get(key(item,format))||map.get(key(item,''))||{itemId:item,formatId:format||null,state:'on_request',amountCents:null,currency:'CAD',unit:'unité'};}
 function label(item,format){const p=resolve(item,format);return Number.isInteger(p.amountCents)?`${new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(p.amountCents/100)} / ${p.unit}`:'Prix sur demande';}
 global.MIRBoutiquePricing=Object.freeze({load,resolve,label,rows:()=>[...rows.filter(x=>!mirFixed.has(x.itemId)),...mirFixed.values()]});
})(window);
