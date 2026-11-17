/* Store-only view adapter. No catalogue, price, format or cart mutations. */
(function(root){
  'use strict';
  const prepared=new WeakMap(),requests=new WeakMap();
  let serial=0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function base(material){return material&&root.MIRClientSidingPreviews?.baseFor?.(material);}
  function markup(material){
    const b=base(material);
    if(!b||!/^\.?\/?assets\//.test(b.baseImage)||!Array.isArray(b.viewBox)||!b.viewBox.every(Number.isFinite))return '';
    const id='mir-store-specimen-'+(++serial),[x,y,w,h]=b.viewBox;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="mir-store-siding-sample" viewBox="${b.viewBox.join(' ')}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" role="img" aria-label="${esc(material.name+' · échantillon de revêtement')}" style="display:block;width:100%;height:100%"><defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><image href="${esc(b.baseImage)}" width="${Number(b.width)}" height="${Number(b.height)}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${id})"/></svg>`;
  }
  function label(material){return base(material)?'Échantillon du revêtement · teinte à choisir':'';}
  async function render(element,caption,material,color){
    if(!element||!base(material))return false;
    const token={};requests.set(element,token);
    root.MIRMaterialPreview.cancel(element);
    if(!color){element.innerHTML=markup(material);if(caption)caption.textContent=label(material);return true;}
    if(!prepared.has(material))prepared.set(material,root.MIRClientSidingPreviews.prepare([material]).then(rows=>rows[0]).catch(()=>material));
    const sample=await prepared.get(material);
    if(requests.get(element)!==token||!element.isConnected)return true;
    if(!sample.stableSidingPreview?.clientPrepared)return false;
    await root.MIRMaterialPreview.render(element,sample,color);
    if(requests.get(element)===token&&caption)caption.textContent='Aperçu de teinte · '+color.name+' · rendu écran indicatif';
    return true;
  }
  root.MIRStoreSidingPreviews=Object.freeze({markup,label,render});
})(window);
