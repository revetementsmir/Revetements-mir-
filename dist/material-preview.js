/* Colour-aware material previews. Manufacturer assets stay unchanged.
   A sampled screen colour is a display value, never a manufacturer specification. */
(function (root) {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const samples = new Map();
  const local = value => {
    try { const u = new URL(value, document.baseURI); return value && u.origin === location.origin && /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; }
  };
  function smooth(m, c) {
    return /lisse|smooth/.test(norm(m.finish || m.name)) && c?.swatchUse === 'color_reference';
  }
  function colorReference(m,c) {return c?.swatchUse==='color_reference' && !(m.applications||[]).includes('siding');}
  function exactImage(m, c) {
    if(!c?.id)return null;
    return (m.images || []).find(i => local(i.src) && (i.colorId === c?.id || (i.colorIds || []).includes(c?.id)));
  }
  function sourceImage(m) {
    const list = (m.images || []).filter(i => local(i.src));
    return list.find(i => i.src === m.primaryImage) || list[0];
  }
  function recipe(m, c) {
    const exact = c && exactImage(m, c);
    if (exact) return {kind:'exact_variant',src:local(exact.src),label:`${m.name} · ${c.name}`,source:exact.sourceUrl,formatMatch:!!exact.formatId&&m.selectedFormatId===exact.formatId,formatId:exact.formatId||null};
    if (c && local(c.swatchUrl)) return {kind:smooth(m,c)?'smooth_preview':colorReference(m,c)?'color_reference_preview':'manufacturer_sample',src:local(c.swatchUrl),label:`${m.name} · ${c.name}`,source:c.sourceUrl};
    if (c && /^#[0-9a-f]{6}$/i.test(c.hex || '')) return {kind:'numeric_preview',hex:c.hex,label:`${m.name} · ${c.name}`,source:c.sourceUrl};
    if (c) return {kind:'missing_variant',label:`${m.name} · ${c.name}`,source:c.sourceUrl};
    const im = sourceImage(m);
    return im ? {kind:'product',src:local(im.src),label:im.alt || m.name,source:im.sourceUrl} : {kind:'missing_product',label:m.name,source:m.sourceUrl};
  }
  async function displayColor(src) {
    const url = local(src); if (!url) return null;
    if (!samples.has(url)) samples.set(url, new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 20;
          const ctx = canvas.getContext('2d', {willReadFrequently:true});
          // Centre of the original colour chip, away from labels and white margins.
          ctx.drawImage(image,image.naturalWidth*.25,image.naturalHeight*.25,image.naturalWidth*.5,image.naturalHeight*.5,0,0,20,20);
          const pixels=ctx.getImageData(0,0,20,20).data, sum=[0,0,0];let count=0;
          for(let i=0;i<pixels.length;i+=4) if(pixels[i+3]>230){sum[0]+=pixels[i];sum[1]+=pixels[i+1];sum[2]+=pixels[i+2];count++;}
          resolve(count?'#'+sum.map(n=>Math.round(n/count).toString(16).padStart(2,'0')).join(''):null);
        } catch { resolve(null); }
      };
      image.onerror=()=>resolve(null); image.src=url;
    }));
    return samples.get(url);
  }
  function smoothSVG(m,c,hex) {
    if(!(m.applications||[]).includes('siding'))return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 680" role="img" aria-label="${esc(m.name+' · '+c.name+' · référence de couleur')}"><rect width="800" height="680" fill="#fff"/><rect x="184" y="144" width="432" height="372" rx="3" fill="${esc(hex)}" stroke="#26352b" stroke-opacity=".18"/><text x="400" y="590" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#354735">${esc(c.name)}</text><text x="400" y="622" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#697567">Référence de couleur · aperçu à l’écran</text><text x="400" y="648" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#697567">Photo du produit accessible séparément</text></svg>`;
    const panel = m.renderPattern === 'panel' || /panel|panneau/.test(norm(m.name));
    const shape = panel ? '<path d="M164 130h450v430H164z"/>' : '<path d="M105 182h570v100H105zM105 288h570v100H105zM105 394h570v100H105z"/>';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 680" role="img" aria-label="${esc(m.name+' · '+c.name+' · aperçu du fini lisse')}"><rect width="800" height="680" fill="#fff"/><g fill="#24352c" opacity=".10" transform="translate(8,9)">${shape}</g><g fill="${esc(hex)}" stroke="#26352b" stroke-opacity=".18" stroke-width="1.2">${shape}</g><text x="400" y="620" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="#354735">${esc(c.name)}</text><text x="400" y="648" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#697567">Fini lisse · aperçu de teinte à l’écran</text></svg>`;
  }
  async function svg(m,c) {
    const r=recipe(m,c);
    if(r.kind==='smooth_preview'||r.kind==='color_reference_preview'||r.kind==='numeric_preview'){
      const hex=r.hex || await displayColor(r.src);
      if(hex)return smoothSVG(m,c,hex);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 680"><rect width="800" height="680" fill="#fff"/>${r.src?`<image href="${esc(r.src)}" x="75" y="50" width="650" height="530" preserveAspectRatio="xMidYMid meet"/>`:''}<text x="400" y="620" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#354735">${esc(c?.name || m.name)}</text>${!r.src?'<text x="400" y="330" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#667260">Échantillon à associer</text>':''}</svg>`;
  }
  async function render(element,m,c) {
    if(!element)return;
    const request=Symbol('material-preview');element._materialPreviewRequest=request;
    const r=recipe(m,c);element.dataset.previewKind=r.kind;element.dataset.colorId=c?.id || '';
    if(r.kind==='smooth_preview'||r.kind==='color_reference_preview'||r.kind==='numeric_preview'){
      element.innerHTML='<div class="sample-loading">Préparation de la teinte…</div>';
      const hex=r.hex || await displayColor(r.src);if(element._materialPreviewRequest!==request)return;
      element.innerHTML=hex?smoothSVG(m,c,hex):`<div class="sample-unavailable"><strong>${esc(c.name)}</strong><span>Échantillon indisponible</span></div>`;
      element.dataset.displayColor=hex||'';
    } else if(r.src) element.innerHTML=`<img src="${esc(r.src)}" alt="${esc(r.label)}" loading="eager" decoding="async">`;
    else element.innerHTML=`<div class="sample-unavailable"><strong>${esc(c?.name || 'Photo à compléter')}</strong><span>${c?'Cette teinte n’a pas encore de visuel associé.':'Référence fabricant en cours de vérification.'}</span></div>`;
    return r;
  }
  async function paintChip(element,m,c) {
    if((!smooth(m,c)&&!colorReference(m,c))||!local(c.swatchUrl))return;
    const hex=await displayColor(c.swatchUrl);if(!hex||!element.isConnected)return;
    element.style.backgroundColor=hex;element.replaceChildren();element.dataset.displayColor=hex;
  }
  function cancel(element){if(element)element._materialPreviewRequest=Symbol('cancelled-preview');}
  root.MIRMaterialPreview={recipe,render,svg,paintChip,displayColor,smooth,colorReference,cancel};
})(typeof window!=='undefined'?window:globalThis);
