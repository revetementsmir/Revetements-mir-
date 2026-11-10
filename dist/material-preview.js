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
  function photoType(image) {
    if (!image) return 'empty';
    const kind = String(image.assetKind || '').toLowerCase();
    if (/drawing|diagram/.test(kind)) return 'profile';
    if (['sample','profile','packshot','installed'].includes(image.cardPresentation)) return image.cardPresentation;
    if (/texture|swatch|sphere/.test(kind)) return 'sample';
    if (image.kind === 'installed') return 'installed';
    return /render|profile/.test(kind) ? 'profile' : 'packshot';
  }
  function photoLabel(image) {
    if (!image) return 'Visuel à compléter';
    const kind = String(image.assetKind || '');
    if (/drawing|diagram/.test(kind)) return 'Dessin fabricant';
    const type = photoType(image);
    if (type === 'installed') return 'Exemple de pose';
    if (type === 'sample') return 'Détail de la matière';
    if (type === 'profile') return 'Vue du profil';
    if (image.matchScope === 'range') return 'Visuel de la gamme';
    return /photo/.test(kind) ? 'Photo fabricant' : 'Visuel fabricant';
  }
  // Source dimensions and safe viewing rectangle in pixels (left, top, width, height).
  // These frames remove empty manufacturer margins without changing the original files.
  const photoFrames = {
    'adseal-dws4580-original-alpha.png': [335,335,4,42,296,257],
    'gentek-fascia-6.jpg': [2159,600,30,16,2129,564],
    'lighttrim-0.jpg': [800,800,115,145,555,442],
    'lt-j002-4.jpg': [800,800,112,143,457,460],
    'lt-j201-4.jpg': [800,800,113,143,455,470],
    'mac-5.png': [2048,649,44,56,1903,536],
    'mac-harrywood-7.png': [2048,544,76,76,1887,434],
    'prime-reliure-basse-brillant.png': [302,301,13,10,281,287],
    'prime-reliure-basse-hdg.png': [318,280,5,5,303,266],
    'prime-reliure-basse-inox.png': [345,305,6,6,329,288],
    'prime-reliure-haute-hdg.png': [295,294,17,11,269,277],
    'rialux-soffit-043e3baaf7.png': [173,168,18,0,148,168],
    'lighttrim-vfcls8114-00f577aac7.jpg': [800,800,23,211,747,575],
    'lighttrim-vfcsss-7a85a9b349.jpg': [800,800,55,270,692,517],
    'lighttrim-vfcsstek-8d6b5a363e.jpg': [800,800,8,250,784,537],
    'lighttrim-vfctek8-e176e16849.jpg': [800,800,29,256,746,532],
    'lighttrim-vtsss10-1d1495877b.jpg': [2000,2000,72,704,1819,1248],
    'lighttrim-vfcsss10-59f522550b.jpg': [800,800,25,301,747,487],
    'lighttrim-vfcsstek10118t-0917ae4f14.jpg': [2000,2000,276,752,1455,1206],
    'lighttrim-vfcltek8114-d7afce62b9.jpg': [800,800,25,211,760,577],
    'lighttrim-vfctek834-362b619371.jpg': [800,800,140,282,530,505],
    'lighttrim-t001-f88cf89671.jpg': [800,800,157,136,456,453]
  };
  // The base TEK 10 photo and its manufacturer colour variants share this layout.
  const tek10Frame = [2000,2000,52,816,1868,1147];
  const canexelFrames = {
    ced9: [750,750,23,251,701,251],
    d5: [750,750,0,233,750,289],
    vstyle: [750,750,25,250,668,200]
  };
  function sourceFrame(src) {
    const path = new URL(src).pathname;
    const canexel = path.match(/\/assets\/products\/employee-store\/deckmart-(ced9|d5|vstyle)-[a-z0-9-]+\.png$/)?.[1];
    if (canexel) return canexelFrames[canexel];
    const asset = path.match(/\/assets\/products\/(?:official-20261104\/)?([^/]+)$/)?.[1];
    if (Object.hasOwn(photoFrames, asset)) return photoFrames[asset];
    return /^lighttrim-vtsstek10-(?:jh[0-9]{4}-)?[0-9a-f]{10}\.jpg$/.test(asset) ? tek10Frame : null;
  }
  function photoImage(image, alt, {loading='lazy', priority=false}={}) {
    const src = local(image?.src);
    if (!src) return '';
    const rawPosition = image.cardObjectPosition || '';
    const position = /^((left|right|top|bottom|center)|(-?\d+(\.\d+)?%))( ((left|right|top|bottom|center)|(-?\d+(\.\d+)?%)))?$/.test(rawPosition) ? rawPosition : '50% 50%';
    const markup = `<img src="${esc(src)}" alt="${esc(image.alt || alt)}" data-catalogue-image data-presentation="${photoType(image)}" style="object-position:${position}" loading="${loading}" ${priority?'fetchpriority="high" ':''}decoding="async">`;
    const frame = sourceFrame(src);
    if (!frame) return markup;
    const [sourceWidth, sourceHeight, left, top, width, height] = frame;
    const style = `--mir-trim-ratio:${width / height};--mir-source-width:${100 * sourceWidth / width}%;--mir-source-height:${100 * sourceHeight / height}%;--mir-source-left:${-100 * left / width}%;--mir-source-top:${-100 * top / height}%`;
    return `<span class="mir-photo-trim" style="${style}"><span class="mir-photo-trim-viewport">${markup}</span></span>`;
  }
  function photoUnavailable() {
    return '<div class="mir-photo-unavailable">Visuel indisponible</div>';
  }
  if (typeof document !== 'undefined') document.addEventListener('error', event => {
    const image = event.target;
    if (!image.matches?.('img[data-catalogue-image]')) return;
    const fallback = document.createElement('div');
    fallback.className = 'mir-photo-unavailable';
    fallback.textContent = 'Visuel indisponible';
    const frame = image.closest('.mir-catalogue-photo');
    (image.closest('.mir-photo-trim') || image).replaceWith(fallback);
    if (!frame) return;
    frame.dataset.photoType = 'empty';
    const caption = frame.closest('article')?.querySelector('.card-photo-label,.mir-photo-caption');
    if (caption) caption.textContent = fallback.textContent;
  }, true);
  function smooth(m, c) {
    return /lisse|smooth/.test(norm(m.finish || m.name)) && c?.swatchUse === 'color_reference';
  }
  function colorReference(m,c) {return c?.swatchUse==='color_reference' && !(m.applications||[]).includes('siding');}
  function exactImage(m, c) {
    if(!c?.id)return null;
    const matches = (m.images || []).filter(i => local(i.src) && (i.colorId === c.id || (i.colorIds || []).includes(c.id)));
    return matches.find(i => i.formatId && i.formatId === m.selectedFormatId) || matches.find(i => !i.formatId) || matches[0];
  }
  function sourceImage(m) {
    const list = (m.images || []).filter(i => local(i.src));
    return list.find(i => i.src === m.primaryImage) || list[0];
  }
  function recipe(m, c) {
    const exact = c && exactImage(m, c);
    if (exact) return {kind:'exact_variant',image:exact,src:local(exact.src),label:`${m.name} · ${c.name}`,source:exact.sourceUrl,formatMatch:!!exact.formatId&&m.selectedFormatId===exact.formatId,formatId:exact.formatId||null};
    if (c && local(c.swatchUrl)) return {kind:smooth(m,c)?'smooth_preview':colorReference(m,c)?'color_reference_preview':'manufacturer_sample',src:local(c.swatchUrl),label:`${m.name} · ${c.name}`,source:c.sourceUrl};
    if (c && /^#[0-9a-f]{6}$/i.test(c.hex || '')) return {kind:'numeric_preview',hex:c.hex,label:`${m.name} · ${c.name}`,source:c.sourceUrl};
    if (c) return {kind:'missing_variant',label:`${m.name} · ${c.name}`,source:c.sourceUrl};
    const im = sourceImage(m);
    return im ? {kind:'product',image:im,src:local(im.src),label:im.alt || m.name,source:im.sourceUrl} : {kind:'missing_product',label:m.name,source:m.sourceUrl};
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
  function canexelSampleSVG(m,c,hex,src) {
    const name=norm(m.name),lines=[];
    if(/planche|couvre-joint|board|batten/.test(name)){
      for(const x of [118,338,558,778])lines.push(`<rect x="${x}" y="0" width="18" height="500" fill="#142018" opacity=".14"/><path d="M${x+3} 0v500M${x+15} 0v500" stroke="#fff" stroke-opacity=".16"/>`);
    }else if(/vstyle|vertical/.test(name)){
      for(let x=70;x<900;x+=95)lines.push(`<path d="M${x} 0v500" stroke="#132018" stroke-opacity=".28"/><path d="M${x+3} 0v500" stroke="#fff" stroke-opacity=".14"/>`);
    }else{
      for(const y of [105,230,355,480])lines.push(`<path d="M0 ${y}h900" stroke="#132018" stroke-opacity=".26"/><path d="M0 ${y+3}h900" stroke="#fff" stroke-opacity=".16"/>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 500" role="img" aria-label="${esc(m.name+' · '+c.name+' · aperçu CanExel')}"><defs><linearGradient id="light" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".10"/><stop offset=".46" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#0b160f" stop-opacity=".08"/></linearGradient><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".32 .045" numOctaves="2" seed="17"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .08"/></feComponentTransfer></filter></defs><rect width="900" height="500" fill="${esc(hex)}"/><rect width="900" height="500" fill="#fff" filter="url(#grain)" opacity=".48"/><rect width="900" height="500" fill="url(#light)"/><g>${lines.join('')}</g><rect x=".75" y=".75" width="898.5" height="498.5" fill="none" stroke="#132018" stroke-opacity=".15" stroke-width="1.5"/></svg>`;
  }
  async function svg(m,c) {
    const r=recipe(m,c);
    if(r.kind==='smooth_preview'||r.kind==='color_reference_preview'||r.kind==='numeric_preview'){
      const hex=r.hex || await displayColor(r.src);
      if(hex)return smoothSVG(m,c,hex);
    }
    if(r.kind==='manufacturer_sample'&&norm(m.brand)==='canexel'){
      const hex=await displayColor(r.src);if(hex)return canexelSampleSVG(m,c,hex,r.src);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 680"><rect width="800" height="680" fill="#fff"/>${r.src?`<image href="${esc(r.src)}" x="75" y="50" width="650" height="530" preserveAspectRatio="xMidYMid meet"/>`:''}<text x="400" y="620" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#354735">${esc(c?.name || m.name)}</text>${!r.src?'<text x="400" y="330" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#667260">Échantillon à associer</text>':''}</svg>`;
  }
  async function render(element,m,c) {
    if(!element)return;
    const request=Symbol('material-preview');element._materialPreviewRequest=request;
    const r=recipe(m,c);element.dataset.previewKind=r.kind;element.dataset.colorId=c?.id || '';
    if(element.classList.contains('mir-catalogue-photo'))element.dataset.photoType=r.image?photoType(r.image):r.kind.startsWith('missing_')?'empty':'sample';
    if(r.kind==='smooth_preview'||r.kind==='color_reference_preview'||r.kind==='numeric_preview'){
      element.innerHTML='<div class="sample-loading">Préparation de la teinte…</div>';
      const hex=r.hex || await displayColor(r.src);if(element._materialPreviewRequest!==request)return;
      element.innerHTML=hex?smoothSVG(m,c,hex):`<div class="sample-unavailable"><strong>${esc(c.name)}</strong><span>Échantillon indisponible</span></div>`;
      element.dataset.displayColor=hex||'';
    } else if(r.kind==='manufacturer_sample'&&norm(m.brand)==='canexel'){
      element.innerHTML='<div class="sample-loading">Préparation de la matière…</div>';
      const hex=await displayColor(r.src);if(element._materialPreviewRequest!==request)return;
      element.innerHTML=hex?canexelSampleSVG(m,c,hex,r.src):photoImage({...r.image,src:r.src,alt:r.label},r.label,{loading:'eager'});
      element.dataset.displayColor=hex||'';
    } else if(r.src) element.innerHTML=photoImage({...r.image,src:r.src,alt:r.label},r.label,{loading:'eager'});
    else element.innerHTML=`<div class="sample-unavailable"><strong>${esc(c?.name || 'Photo à compléter')}</strong><span>${c?'Cette teinte n’a pas encore de visuel associé.':'Référence fabricant en cours de vérification.'}</span></div>`;
    return r;
  }
  async function paintChip(element,m,c) {
    if((!smooth(m,c)&&!colorReference(m,c))||!local(c.swatchUrl))return;
    const hex=await displayColor(c.swatchUrl);if(!hex||!element.isConnected)return;
    element.style.backgroundColor=hex;element.replaceChildren();element.dataset.displayColor=hex;
  }
  function cancel(element){if(element)element._materialPreviewRequest=Symbol('cancelled-preview');}
  root.MIRMaterialPreview={recipe,render,svg,paintChip,displayColor,smooth,colorReference,cancel,photoType,photoLabel,photoImage,photoUnavailable};
})(typeof window!=='undefined'?window:globalThis);
