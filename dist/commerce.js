/* MIR catalogue, product sheets and local project selection. No checkout is implied. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const safe = url => {if(typeof url!=='string'||!url.trim())return '';try{const u=new URL(url,document.baseURI);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  const localAsset = url => {const u=safe(url);return u&&new URL(u).origin===location.origin?u:'';};
  function configurationURL(m,c){
    const href=localAsset(m.configurationUrl);if(!href)return '';
    const url=new URL(href),target=new URL('production.html',document.baseURI);
    if(url.pathname!==target.pathname||url.searchParams.get('mode')!=='client'||url.searchParams.get('material')!==m.id)return '';
    if(c?.id&&(m.colors||[]).some(x=>x.id===c.id))url.searchParams.set('color',c.id);
    return url.href;
  }
  const number = n => new Intl.NumberFormat('fr-CA',{maximumFractionDigits:3}).format(n);
  const money = n => new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(n);
  // A tariff per area is not a price for one unmeasured panel. The configurator
  // owns the quantity calculation; this page only presents MIR's approved rate.
  function customColor(c){return ['ral','custom'].includes(c?.selectionType)||/^ral(?:\b|\s)/.test(norm(c?.system))||/^ral\s*\d/.test(norm(c?.code));}
  function surfaceTariff(m,c){
    const p=m.pricing;
    return !customColor(c)&&m.configurationRequired===true&&p?.status==='configured'&&p.calculationEnabled===true&&p.unit==='in2'&&p.currency==='CAD'&&Number.isFinite(p.amount)&&p.amount>0&&p.scope==='aluminium'&&Array.isArray(p.productIds)&&p.productIds.includes(m.id)&&(m.applications||[]).includes('architectural-panel')?p:null;
  }
  function productPriceNote(m,c){
    if(m.status==='pending_identity')return 'Référence exacte à confirmer avant sélection';
    if(customColor(c))return 'Couleur personnalisée · soumission obligatoire';
    const p=surfaceTariff(m,c);if(p)return `Tarif MIR : ${number(p.amount)} $ CA/po²`;
    return window.MIRBoutiquePricing?.label(m.id,activeFormat?.id)||'Prix sur demande';
  }
  function productPriceDetails(m,c){
    if(customColor(c))return 'Aucun prix automatique pour une couleur personnalisée ou RAL. Le dessin et les mesures accompagnent la demande de soumission.';
    if(surfaceTariff(m,c))return 'Surface de la forme hors tout, lips compris. Couleur personnalisée ou RAL : soumission obligatoire. Taxes et livraison non calculées. Disponibilité du fini à confirmer.';
    const published=window.MIRBoutiquePricing?.resolve(m.id,activeFormat?.id);
    return Number.isInteger(published?.amountCents)?'Prix MIR publié avant taxes. La disponibilité sera confirmée avec MIR.':'';
  }
  const units=['pi²','pi lin.','pièces','cartouches','saucisses','boîtes','rouleaux','kits','paquets','cartons'];
  const KEY='mir-shopping-list-v1';
  let materials=[],hiddenProducts=new Set(),list={version:1,project:'',items:[]},activeColor=null,activeProduct=null,activeFormat=null;
  try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.items)){list={version:1,project:String(saved.project||'').slice(0,100),items:saved.items.filter(x=>x&&typeof x.materialId==='string'&&Number.isFinite(x.quantity)&&x.quantity>0&&x.quantity<=1000000).map(x=>({...x,unit:units.includes(x.unit)?x.unit:'pièces'}))};}}catch{}
  // Return context is filter data, never a caller-supplied URL.
  let shopContext='';
  function cleanShopContext(raw){const source=new URLSearchParams(String(raw||'').slice(0,2048)),out=new URLSearchParams();for(const key of ['brand','family','type','q','view','revision']){const value=source.get(key);if(value&&value.length<=(key==='q'?128:100)&&!/[\u0000-\u001f]/.test(value))out.set(key,value);}return out.toString();}
  function rememberShopContext(value){shopContext=cleanShopContext(value);try{sessionStorage.setItem('mir_shop_context_v1',shopContext);}catch{}}
  function returnToShop(){return 'boutique.html'+(shopContext?'?'+shopContext:'')+'#collections';}
  function productHref(id,color,format){const q=new URLSearchParams({id});if(color)q.set('color',color);if(format)q.set('format',format);if(shopContext)q.set('from',shopContext);return 'produit.html?'+q;}
  window.MIRCommerceValidateQuantity=x=>cartQuantityState(x);
  const O=window.MIRCatalogueOrder, V=window.MIRMaterialPreview, Q=window.MIRCommerceQuantity;
  const categories=O.categories;
  const applications={siding:'Revêtement',soffit:'Soffite',fascia:'Fascia',trim:'Moulure',bending:'Pliage','architectural-panel':'Panneau architectural',fastener:'Fixation',sealant:'Scellant',opening_trim:'Contour d’ouverture','opening-trim':'Contour d’ouverture',band:'Bandeau',accessory:'Accessoire',membrane:'Membrane',touchup:'Retouche','touch-up':'Retouche','siding-joint':'Joint de revêtement',capping:'Capage'};
  const orientation={vertical:'Verticale',horizontal:'Horizontale'};
  const sold=m=>!!m&&!hiddenProducts.has(m.id)&&m.status!=='visualization_only'&&m.commercialStatus!=='not_for_sale';
  const hasExactImage=m=>!!heroImage(m)&&!/^missing|provisional|placeholder/i.test(String(m.imageStatus||''));
  const requestable=m=>sold(m)&&hasExactImage(m)&&m.status!=='pending_identity'&&m.orderable!==false;
  const category=m=>O.category(m);
  const formats=Q.formats;
  function formatOptions(m,colorId,selected,showDimensions=false){return '<option value="">Choisir le format</option>'+formats(m,colorId).map(f=>`<option value="${esc(f.id)}"${f.id===selected?' selected':''}>${esc(formatLabel(f))}${showDimensions&&f.widthIn?` · ${fraction(f.widthIn)} × ${fraction(f.lengthIn)} po`:''}</option>`).join('');}
  function formatLabel(f){if(!f)return '';if(f.label)return f.label;return f.widthIn?`${number(f.widthIn/12)} × ${number(f.lengthIn/12)} pi`:`${fraction(f.lengthIn)} po`;}
  function withFormat(m,f){
    if(f?.volumeMl)return {...m,selectedFormatId:f.id,dimensions:{volumeMl:f.volumeMl},unit:f.label};
    if(f){const nominal=f.measurementKind==='nominal'||f.stockConfirmationRequired===true;return {...m,selectedFormatId:f.id,manufacturerCode:f.manufacturerCode||m.manufacturerCode,dimensions:{...m.dimensions,...(nominal?{widthIn:null,actualWidthIn:null,lengthIn:null,nominalWidthIn:f.widthIn||m.dimensions?.nominalWidthIn,nominalLengthIn:f.lengthIn}:{...(f.widthIn?{widthIn:f.widthIn}:{}),lengthIn:f.lengthIn}),lengthFt:null,lengthM:null,lengthFtPublished:null,lengthMPublished:null}};}
    if(formats(m).length>1){const d={...m.dimensions};for(const key of ['lengthIn','lengthFt','lengthM','lengthFtPublished','lengthMPublished','nominalLengthIn'])delete d[key];return {...m,dimensions:d};}
    return m;
  }
  function fraction(n){if(!Number.isFinite(n))return 'À confirmer';if(Math.abs(n*16-Math.round(n*16))>0.00001)return number(n);const whole=Math.floor(n),numerator=Math.round((n-whole)*16);if(!numerator)return `${whole}`;if(numerator===16)return `${whole+1}`;let p=numerator,q=16;while(p%2===0&&q>1){p/=2;q/=2;}return `${whole?whole+' ':''}${p}/${q}`;}
  function dimensions(m){if(m.configurationRequired===true)return 'Sur mesure · à configurer';const d=m.dimensions||{},w=d.actualWidthIn||d.widthIn,l=d.lengthIn||(d.lengthFt?d.lengthFt*12:null);if(w&&l)return `${fraction(w)} po × ${fraction(l)} po`;if(d.lengthMinFt&&d.lengthMaxFt)return `Longueurs : ${number(d.lengthMinFt)} à ${number(d.lengthMaxFt)} pi`;if(l)return `Longueur : ${fraction(l)} po`;if(d.lengthM)return `${w?fraction(w)+' po × ':''}${number(d.lengthM)} m`;if(w)return `Largeur : ${fraction(w)} po`;if(d.nominalWidthIn&&d.nominalLengthIn)return `${fraction(d.nominalWidthIn)} × ${fraction(d.nominalLengthIn)} po nominaux`;if(d.nominalWidthIn)return `${fraction(d.nominalWidthIn)} po nominal`;if(d.volumeMl)return `${number(d.volumeMl)} ml`;if(d.representativeCartridgeMl)return `${number(d.representativeCartridgeMl)} ml`;return 'Dimensions à confirmer';}
  function images(m){return (m.images||[]).filter(x=>localAsset(x.src));}
  function heroImage(m){const im=images(m);return im.find(x=>x.src===m.primaryImage)||im[0];}
  const presentation=V.photoType, photoLabel=V.photoLabel;
  function placeholder(){return '<div class="product-placeholder" role="img" aria-label="Photo fabricant non disponible"><svg viewBox="0 0 160 110" fill="none" stroke="currentColor" stroke-width="1"><path d="M18 85V30l65-15 60 31v50L78 70 18 85Zm0-55 60 26 65-10M78 56v40M38 25l61 27M58 20l61 28"/></svg><span>Visuel fabricant à compléter</span></div>';}
  function imageMarkup(m,large=false,c=null){if(m.stableSidingPreview)return V.stableSidingSVG(m,c)||placeholder();if(m.paintPotIndices)return paintPotSVG(m,c);const im=heroImage(m);return im?V.photoImage(im,m.name,{loading:large?'eager':'lazy',priority:large}):placeholder();}

  // Sixteen studio packshots supplied by MIR: fixed 600x600 tiles in one 2400x2400 WebP.
  // Keep the same SVG, viewport, framing and background; change only the selected cell.
  const paintPotAtlas='./assets/products/mir-canexel-touchup/canexel-pots-16.webp';
  const paintPotCell=600,paintPotColumns=4;
  function paintPotIndex(m,c){
    const choice=c||m.colors?.[0];
    const index=m.paintPotIndices?.[norm(choice?.name)];
    return Number.isInteger(index)&&index>=0&&index<16?index:null;
  }
  function paintPotSVG(m,c){
    const choice=c||m.colors?.[0],index=paintPotIndex(m,choice);
    if(index===null)return '<div class="sample-unavailable"><strong>'+esc(choice?.name||'Couleur à confirmer')+'</strong><span>Photo MIR de cette couleur à venir · consulter le nuancier.</span></div>';
    const label=m.name+' — '+choice.name+' — visuel MIR indicatif';
    const x=-paintPotCell*(index%paintPotColumns),y=-paintPotCell*Math.floor(index/paintPotColumns);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="'+esc(label)+'" data-mir-canexel-pot="'+index+'" style="display:block;width:100%;height:100%;max-width:100%;object-fit:contain"><image href="'+paintPotAtlas+'" x="'+x+'" y="'+y+'" width="2400" height="2400" preserveAspectRatio="xMidYMid meet"/></svg>';
  }
  function renderPaintPot(el,m,c){
    if(!el)return;
    V.cancel(el);
    const choice=c||m.colors?.[0],index=paintPotIndex(m,choice),svg=el.querySelector('svg[data-mir-canexel-pot]');
    el.dataset.previewKind='mir-canexel-touchup';
    el.dataset.colorId=choice?.id||'';
    if(el.classList.contains('mir-catalogue-photo'))el.dataset.photoType=index===null?'empty':'packshot';
    if(index===null||!svg){el.innerHTML=paintPotSVG(m,choice);return;}
    const picture=svg.querySelector('image');
    if(!picture){el.innerHTML=paintPotSVG(m,choice);return;}
    picture.setAttribute('x',String(-paintPotCell*(index%paintPotColumns)));
    picture.setAttribute('y',String(-paintPotCell*Math.floor(index/paintPotColumns)));
    svg.setAttribute('data-mir-canexel-pot',String(index));
    svg.setAttribute('aria-label',m.name+' — '+choice.name+' — visuel MIR indicatif');
  }

  const screwAssetRoot='./assets/products/mir-screws/';
  const screwImages=new Map();
  function screwImage(path){
    if(!screwImages.has(path)){
      const image=new Image();
      image.src=path;
      screwImages.set(path,image.decode().then(()=>image).catch(()=>null));
    }
    return screwImages.get(path);
  }
  async function renderScrew(element,m,c){
    const base=screwAssetRoot+m.screwPreview+'.webp';
    const mask=screwAssetRoot+m.screwPreview+'-head.svg';
    const request=Symbol('screw-preview');
    element._materialPreviewRequest=request;
    if(element.dataset.screwPreview!==base){
      element.dataset.screwPreview=base;
      element.innerHTML=`<span class="mir-screw-preview"><img src="${esc(base)}" alt="${esc(m.name)}"><canvas aria-hidden="true" hidden></canvas></span>`;
    }
    element.dataset.previewKind='screw';
    element.dataset.colorId=c?.id||'';
    if(element.classList.contains('mir-catalogue-photo'))element.dataset.photoType='packshot';
    const canvas=element.querySelector('canvas');
    const hex=/^#[0-9a-f]{6}$/i.test(c?.hex||'')?c.hex:c?.swatchUrl?await V.displayColor(c.swatchUrl):null;
    if(element._materialPreviewRequest!==request)return;
    if(!hex){canvas.hidden=true;return;}
    const [image,head]=await Promise.all([screwImage(base),screwImage(mask)]);
    if(element._materialPreviewRequest!==request)return;
    if(!image||!head){canvas.hidden=true;return;}
    canvas.width=image.naturalWidth;
    canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)return;
    ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(head,0,0,canvas.width,canvas.height);
    const alpha=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const rgb=hex.slice(1).match(/../g).map(channel=>parseInt(channel,16));
    const midtone={'lighttrim-vfcs':99,'lighttrim-vfctek8':163,'fascia-2po':203}[m.screwPreview];
    for(let i=0;i<pixels.data.length;i+=4){
      if(!alpha[i+3]){pixels.data[i+3]=0;continue;}
      const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
      const level=(r+g+b)/3;
      // Fade tint into the white background where the head edge is antialiased.
      const edgeOpacity=Math.min(1,(255-Math.min(r,g,b))/18);
      const shade=Math.min(1.14,Math.max(.35,1+(level-midtone)/150));
      const reflection=Math.max(0,level-210)*.36;
      for(let channel=0;channel<3;channel++)pixels.data[i+channel]=rgb[channel]*shade+reflection;
      pixels.data[i+3]=alpha[i+3]*edgeOpacity;
    }
    ctx.putImageData(pixels,0,0);
    canvas.dataset.colorId=c.id;
    canvas.hidden=false;
  }
  function renderVisual(element,m,c){if(m.paintPotIndices)return renderPaintPot(element,m,c);if(m.screwPreview)return renderScrew(element,m,c);if(m.keepProductPhoto)c=null;const recipe=V.recipe(m,c);if(recipe.kind==='missing_product'||recipe.kind==='missing_variant'){V.cancel(element);element.innerHTML=placeholder();return;}const rendered=V.render(element,m,c),request=element._materialPreviewRequest;return Promise.resolve(rendered).then(r=>{if(element._materialPreviewRequest===request&&element.querySelector('.sample-unavailable'))element.innerHTML=placeholder();return r;});}
  function colors(m){return Array.isArray(m.colors)?m.colors:[];}
  function swatchClass(c){return !localAsset(c.swatchUrl)&&!/^#[0-9a-f]{6}$/i.test(c.hex||'')?' mir-named-swatch':'';}
  function swatch(c){return localAsset(c.swatchUrl)?`<img src="${esc(localAsset(c.swatchUrl))}" alt="" loading="lazy">`:/^#[0-9a-f]{6}$/i.test(c.hex||'')?`<span aria-hidden="true" style="display:block;width:100%;height:100%;background-color:${c.hex}"></span>`:`<span>${esc(c.name)}</span>`;}
  function notify(msg){const el=$('#commerce-toast');el.textContent=msg;el.classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove('visible'),4000);}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(list));updateCount();return true;}catch{notify('Le navigateur ne peut pas enregistrer cette sélection. Téléchargez votre liste.');return false;}}
  function updateCount(){document.querySelectorAll('[data-list-count]').forEach(el=>el.textContent=list.items.length);}
  function unitOptions(value,m,formatId){return (m?Q.policy(m,formatId).rules.map(r=>r.unit).concat(value&&!Q.policy(m,formatId).rules.some(r=>r.unit===value)?[value]:[]):units).map(u=>`<option${u===value?' selected':''}>${esc(u)}</option>`).join('');}
  function card(m){const im=heroImage(m),cs=colors(m),shown=cs.slice(0,3),f=formats(m),price=m.regionalPricing&&!m.regionalPricing.formatPrices?productPriceNote(m,cs[0]):m.regionalPricing?.formatPrices?'Prix selon le format':'Prix sur demande';return `<article class="shop-card" data-shop-card="${esc(m.id)}"><a data-card-link href="${esc(productHref(m.id))}"><div class="shop-card-photo" data-photo-type="${presentation(im)}"><div class="card-preview">${imageMarkup(m)}</div><span class="card-photo-label">${esc(photoLabel(im))}</span></div></a><div class="shop-card-copy"><span class="shop-card-brand">${esc(m.brand)}</span><h3><a data-card-link href="${esc(productHref(m.id))}">${esc(m.name)}</a></h3><p class="shop-card-size">${esc(f.length>1?f.map(formatLabel).join(' · '):dimensions(m))}</p><p class="product-price-note shop-card-price">${esc(price)}</p><details class="mir-card-colors"${cs.length?'':' hidden'}><summary>${cs.length} nuance${cs.length>1?'s':''}</summary><div class="shop-card-swatches" aria-label="Nuances de ${esc(m.name)}">${shown.map(c=>`<button type="button" class="shop-swatch-small${swatchClass(c)}" data-card-color="${esc(c.id)}" data-material="${esc(m.id)}" title="${esc(c.name)}" aria-label="Voir ${esc(c.name)} sur ${esc(m.name)}" aria-pressed="false">${swatch(c)}</button>`).join('')}${cs.length>3?`<a href="${esc(productHref(m.id))}" class="more-colors">+${cs.length-3}</a>`:''}</div><p class="card-color-name">${m.status==='pending_identity'?'Référence à identifier':cs.length?`${cs.length} nuances référencées`:m.colorStatus==='not_applicable'?esc(m.finish||'Fini de la référence'):esc(m.finish||'Finition à préciser')}</p></details><a class="product-card-link" data-card-link href="${esc(productHref(m.id))}">Choisir ce matériau <span>→</span></a></div></article>`;}
  function hydrateChips(container=document){
    for(const card of container.querySelectorAll('[data-shop-card]')){
      const material=materials.find(m=>m.id===card.dataset.shopCard);
      if(!material||(material.keepProductPhoto&&!material.paintPotIndices))continue;
      if(material.screwPreview)renderScrew(card.querySelector('.card-preview'),material,null);
      for(const button of card.querySelectorAll('[data-card-color]')){
        const color=colors(material).find(c=>c.id===button.dataset.cardColor);
        if(color)V.paintChip(button,material,color);
      }
    }
  }
  function facts(m,c){const d=m.dimensions||{},a=[];a.push(['Matière',m.family]);if(m.manufacturerCode)a.push(['Code fabricant',m.manufacturerCode]);if(formats(m).length>1)a.push(['Formats proposés',formats(m).map(formatLabel).join(' / ')]);if(m.finish)a.push(['Fini',m.finish]);for(const [key,label,unit] of [['actualWidthIn','Largeur réelle','po'],['nominalWidthIn','Largeur nominale','po'],['nominalHeightIn','Hauteur nominale','po'],['nominalLengthIn','Longueur nominale','po'],['exposedWidthIn','Largeur exposée','po'],['coveredWidthIn','Largeur couverte','po'],['coveredHeightIn','Hauteur couverte','po'],['profileDepthIn','Profondeur du profil','po'],['lengthFt','Longueur','pi'],['lengthMinFt','Longueur minimale','pi'],['lengthMaxFt','Longueur maximale','pi'],['nominalThicknessIn','Épaisseur nominale','po'],['metalThicknessIn','Épaisseur du métal','po'],['metalThicknessMils','Épaisseur du métal','mils'],['lengthM','Longueur publiée','m'],['lengthMPublished','Longueur publiée','m'],['lengthFtPublished','Longueur publiée','pi']])if(d[key])a.push([label,`${fraction(d[key])} ${unit}`]);if(d.nominalSection)a.push(['Section nominale',d.nominalSection]);if(d.availableGauges?.length)a.push(['Calibres publiés',d.availableGauges.join(' / ')]);a.push(['Applications',(m.applications||[]).map(x=>applications[x]||x).join(', ')]);if(m.allowedOrientations?.length)a.push(['Pose documentée',m.allowedOrientations.map(x=>orientation[x]||x).join(' ou ')]);if(d.widthIn)a.push(['Largeur physique',`${fraction(d.widthIn)} po`]);if(d.lengthIn)a.push(['Longueur physique',`${fraction(d.lengthIn)} po`]);if(d.thicknessIn)a.push(['Épaisseur',`${fraction(d.thicknessIn)} po`]);if(d.metalThicknessMm)a.push(['Épaisseur du métal',`${number(d.metalThicknessMm)} mm`]);if(d.availableLengthsIn?.length)a.push(['Longueurs référencées',d.availableLengthsIn.map(n=>`${fraction(n)} po`).join(' / ')]);if(m.coverage?.exposureIn)a.push(['Exposition utile',`${fraction(m.coverage.exposureIn)} po`]);if(m.soffitType)a.push(['Type de soffite',m.soffitType==='vented'?'Ventilé':m.soffitType==='solid'?'Non ventilé':m.soffitType]);if(d.representativeCartridgeMl)a.push(['Format de référence',`${number(d.representativeCartridgeMl)} ml`]);if(d.volumeMl)a.push(['Volume',`${number(d.volumeMl)} ml`]);if(m.packaging?.piecesPerBox||m.packaging?.piecesPerCarton)a.push(['Pièces par boîte',number(m.packaging.piecesPerBox||m.packaging.piecesPerCarton)]);if(m.packaging?.containersPerCarton)a.push(['Contenants par boîte',number(m.packaging.containersPerCarton)]);if(m.packaging?.contents?.length)a.push(['Contenu du kit',m.packaging.contents.join(' · ')]);if(m.unit)a.push(['Unité documentée',m.unit]);for(const item of m.specifications||[])if(item&&item.label&&item.value)a.push([item.label,item.value]);const tariff=surfaceTariff(m,c);if(tariff){a.push(['Tarif MIR',`${number(tariff.amount)} $ CA/po²`],['Base du tarif','Surface en projection de la forme hors tout, lips compris; projection C non ajoutée.'],['Couleur personnalisée ou RAL','Soumission obligatoire, sans prix automatique.'],['Taxes et livraison','Non calculées.']);}else if(customColor(c))a.push(['Prix','Soumission obligatoire pour la couleur personnalisée, sans prix automatique.']);return a.filter(x=>x[1]);}
  function defaultUnit(m){return Q.policy(m,activeFormat?.id).defaultUnit;}
  function cartQuantityState(x){const m=materials.find(m=>m.id===x.materialId);return m&&sold(m)?Q.validate(m,x):{ok:true};}
  function quantityWarning(x,i){const state=cartQuantityState(x);return `<div class="mir-quantity-status" ${state.ok?'':'role="alert"'}><p>${esc(state.message||'')}</p>${!state.ok&&state.suggestion?`<button type="button" class="quiet-button" data-quantity-fix="${i}">Appliquer ${number(state.suggestion)} ${esc(x.unit)}</button>`:''}</div>`;}
  // Use the manufacturer's material swatch when the catalogue cover is a profile rendering.
  const brandSwatches={
    'mac-norwood':'mac-bouleau-fume',
    'vicwest-bellara-plank135':'vicwest-amber-birch'
  };
  function brandCover(products){
    for(const product of products){
      const swatch=product.colors?.find(color=>color.id===brandSwatches[product.id]&&color.verified);
      const src=localAsset(swatch?.swatchUrl);
      if(src)return {src, framing:'material'};
    }
    const candidates=products.flatMap(product=>images(product)).filter(image=>!/drawing|diagram/i.test(image.assetKind));
    const installed=candidates.find(image=>presentation(image)==='installed'&&!/family/i.test(image.assetKind));
    const sample=candidates.find(image=>presentation(image)==='sample'&&!/sphere/i.test(image.assetKind));
    const image=installed||sample||candidates.find(image=>!/family/i.test(image.assetKind))||candidates[0];
    if(!image)return null;
    const sphere=/sphere|jdp-akta-portobello|jdp-bluhouss/i.test((image.assetKind||'')+' '+image.src);
    const framing=sphere?'sample-crop':installed||sample?'material':'packshot';
    return {src:localAsset(image.src),framing};
  }
  function brandCollectionCard(brand,products){
    const cover=brandCover(products);
    const types=[...new Set(products.map(O.section))].map(id=>O.sections.find(section=>section[0]===id)?.[1]).filter(Boolean);
    const count=products.length;
    return `<a class="brand-collection-card" href="?brand=${encodeURIComponent(brand)}#collections">
      <div class="brand-collection-image" data-framing="${cover?.framing||'empty'}">
        ${cover?`<img src="${esc(cover.src)}" alt="" loading="lazy" decoding="async">`:'<span>Photo à venir</span>'}
      </div>
      <div class="brand-collection-copy">
        <span class="brand-collection-count">${count} référence${count===1?'':'s'}</span>
        <h3>${esc(brand)}</h3>
        <p>${esc(types.slice(0,3).join(' · '))}</p>
        <b>Voir la collection <span aria-hidden="true">→</span></b>
      </div>
    </a>`;
  }
  function showShop(){
    const qs=new URLSearchParams(location.search),brand=$('#shop-brand'),family=$('#shop-family'),profile=$('#shop-profile'),search=$('#shop-search');
    let all=qs.get('view')==='all';
    const review=qs.get('revision')==='1'?shopReview(render):null;
    if(review)all=true;

    const brands=[...new Set(materials.filter(sold).map(m=>m.brand))].sort(O.brandCompare);
    brand.innerHTML='<option value="all">Tous les fabricants</option>'+brands.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('');
    family.innerHTML='<option value="all">Toutes les matières</option>'+categories.map(([id,label])=>`<option value="${id}">${label}</option>`).join('');
    profile.innerHTML='<option value="all">Tous les types</option>'+O.sections.filter(([id])=>materials.some(m=>sold(m)&&O.section(m)===id)).map(([id,label])=>`<option value="${id}">${label}</option>`).join('');
    if(brands.includes(qs.get('brand')))brand.value=qs.get('brand');if(categories.some(x=>x[0]===qs.get('family')))family.value=qs.get('family');if(O.sections.some(x=>x[0]===qs.get('type')))profile.value=qs.get('type');search.value=qs.get('q')||'';
    const categoryRepresentatives={
      fibre:'hardieplank-select-625',
      wood:'canexel-ridgewood-d5',
      metal:'rialux-tiago',
      vinyl:'gentek-sequoia-d4-64496',
      finish:'gentek-soffit16-2panel-vented',
      fix:'prime-siding-2-30644'
    };
    $('#category-cards').innerHTML=categories.map(([id,label])=>{
      const m=materials.find(m=>m.id===categoryRepresentatives[id]&&sold(m)&&heroImage(m))||materials.find(m=>sold(m)&&category(m)===id&&heroImage(m));
      const framing=id==='fix'?'packshot':'sample';
      return `<a href="?family=${id}#collections" class="category-card" data-category="${id}" aria-label="${esc(label)} : voir les matériaux"><div class="category-photo" data-presentation="${framing}">${m?imageMarkup(m):placeholder()}</div><h3>${esc(label)}</h3><span class="category-action">Explorer <span aria-hidden="true">→</span></span></a>`;
    }).join('');
    $('#shop-brand-directory').innerHTML=brands.map(b=>brandCollectionCard(b,materials.filter(m=>sold(m)&&m.brand===b))).join('');
    if(review)for(const link of document.querySelectorAll('.category-card[href],.brand-collection-card[href]')){
      const url=new URL(link.href);url.searchParams.set('revision','1');link.href=url.href;
    }

    function render(){const p=new URLSearchParams();if(brand.value!=='all')p.set('brand',brand.value);if(family.value!=='all')p.set('family',family.value);if(profile.value!=='all')p.set('type',profile.value);if(search.value.trim())p.set('q',search.value.trim());if(all)p.set('view','all');if(review)p.set('revision','1');rememberShopContext(p.toString());const q=norm(search.value).replace(/\bpanneaux\b/g,'panneau'),directory=!review&&!all&&brand.value==='all'&&family.value==='all'&&profile.value==='all'&&!q;const result=materials.filter(m=>sold(m)&&!review?.isRemoved(m.id)&&(brand.value==='all'||m.brand===brand.value)&&(family.value==='all'||O.matchesCategory(m,family.value))&&(profile.value==='all'||O.section(m)===profile.value)&&(!q||q.split(/\s+/).every(token=>norm([m.id,m.manufacturerCode,m.name,m.brand,m.family,m.finish,m.description,JSON.stringify(m.dimensions||{}),dimensions(m),...colors(m).map(c=>c.name+' '+(c.code||''))].join(' ')).replace(/\bpanneaux\b/g,'panneau').includes(token)))).sort(O.compare);
      document.body.classList.toggle('mir-shop-searching',!!q);document.body.classList.toggle('mir-shop-filtered',!directory);$('#collection-title').textContent=directory?'Collections par fabricant':'Résultats';$('#shop-brand-directory').hidden=!directory;$('#shop-all-button').hidden=!directory;$('#shop-grid').hidden=directory;
      $('#shop-grid').innerHTML=directory?'':O.group(result).map(g=>`<section class="manufacturer-group"><header><div><p class="eyebrow">LA COLLECTION</p><h3>${esc(g.brand)}</h3></div><span>${g.sections.reduce((n,s)=>n+s.items.length,0)} références</span></header>${g.sections.map(s=>`<section class="profile-group"><h4>${esc(s.label)} <span>${s.items.length}</span></h4><div class="shop-grid">${s.items.map(card).join('')}</div></section>`).join('')}</section>`).join('');
      $('#shop-empty').hidden=!!result.length||directory;const active=[brand.value!=='all'?'fabricant « '+brand.value+' »':'',family.value!=='all'?'famille « '+family.options[family.selectedIndex].text+' »':'',profile.value!=='all'?'type « '+profile.options[profile.selectedIndex].text+' »':''].filter(Boolean);$('#shop-empty').textContent='Aucun résultat'+(search.value.trim()?' pour « '+search.value.trim()+' »':'')+'. '+(active.length?'Filtres actifs : '+active.join(', ')+'. Modifiez ces filtres ou utilisez Réinitialiser.':'Aucun filtre actif. Essayez un nom de produit, un fabricant ou un code couleur, par exemple « panneau Hardie » ou « 458-264 ».');$('#shop-results-count').textContent=directory?`${brands.length} fabricants · choisissez votre collection`:`${result.length} référence${result.length>1?'s':''}${brand.value==='all'?'':` · ${brand.value}`}`;
      $('#shop-active-filters').textContent=directory?'Commencez par un fabricant. Ses gammes, formats et couleurs restent ensemble.':[brand.value==='all'?'Tous les fabricants':brand.value,family.value==='all'?'':categories.find(x=>x[0]===family.value)?.[1],profile.value==='all'?'':O.sections.find(x=>x[0]===profile.value)?.[1]].filter(Boolean).join(' / ');
      history.replaceState(null,'',location.pathname+(p.size?'?'+p:'')+location.hash);hydrateChips($('#shop-grid'));review?.decorate();
    }
    $('#shop-filter-toggle').onclick=()=>{const panel=$('#shop-filter-panel'),open=panel.hidden;panel.hidden=!open;$('#shop-filter-toggle').setAttribute('aria-expanded',String(open));if(open)brand.focus();};
    [brand,family,profile].forEach(el=>el.addEventListener('change',render));search.addEventListener('input',render);$('#shop-reset').onclick=()=>{brand.value=family.value=profile.value='all';search.value='';all=false;render();};$('#shop-all-button').onclick=()=>{all=true;render();};render();
  }
  function shopReview(render){
    const key='mir-catalogue-review-v1',grid=$('#shop-grid');
    const read=()=>{
      const raw=localStorage.getItem(key);
      if(raw===null)return [];
      const saved=JSON.parse(raw);
      if(saved.version!==1||!Array.isArray(saved.fiches))throw new Error('Format de révision inconnu');
      return saved.fiches;
    };
    let records;
    try{records=read();}
    catch{notify('Le navigateur ne peut pas ouvrir les données de révision.');return null;}
    const toolbar=document.createElement('aside');
    toolbar.className='mir-shop-review-toolbar';
    toolbar.setAttribute('aria-label','Révision temporaire du catalogue');
    toolbar.innerHTML='<span data-review-count></span><button type="button" data-review-undo>Rétablir la dernière</button><button type="button" data-review-export>Exporter JSON</button><a data-review-exit>Quitter</a>';
    const dialog=document.createElement('dialog');
    dialog.className='mir-shop-review-dialog';
    dialog.setAttribute('aria-labelledby','mir-review-title');
    dialog.innerHTML='<form><h2 id="mir-review-title">Annotation</h2><p data-review-product></p><label>Note<textarea rows="5" maxlength="3000"></textarea></label><p data-review-error role="alert"></p><div><button type="button" data-review-cancel>Annuler</button><button type="submit">Enregistrer</button></div></form>';
    document.body.append(toolbar,dialog);
    document.body.classList.add('mir-shop-review-active');
    const field=dialog.querySelector('textarea'),status=dialog.querySelector('[data-review-error]');
    const find=id=>records.find(row=>row.id===id);
    const controls='<div class="mir-shop-review-actions"><button type="button" data-review-note>Annotation</button><button type="button" data-review-remove>Supprimer</button></div>';
    let editing=null;
    function update(product,values){
      try{
        const latest=read(),previous=latest.find(row=>row.id===product.id);
        const row={id:product.id,nom:product.nom,fabricant:product.fabricant,...previous,...values};
        const next=latest.filter(entry=>entry.id!==row.id);
        if(row.annotation||row.supprimeLe)next.push(row);
        localStorage.setItem(key,JSON.stringify({version:1,fiches:next}));
        records=next;
        return true;
      }catch{return false;}
    }
    function refreshAt(anchor,top=anchor?.getBoundingClientRect().top){
      const id=anchor?.dataset.shopCard;
      render();
      const retained=id&&[...grid.querySelectorAll('[data-shop-card]')].find(card=>card.dataset.shopCard===id);
      if(retained)window.scrollBy({top:retained.getBoundingClientRect().top-top,behavior:'instant'});
      return retained;
    }
    grid.addEventListener('click',event=>{
      const action=event.target.closest('[data-review-note],[data-review-remove]');
      const card=action?.closest('[data-shop-card]');
      if(!card)return;
      const material=materials.find(m=>m.id===card.dataset.shopCard);
      if(!material)return;
      const product={id:material.id,nom:material.name,fabricant:material.brand};
      if(action.hasAttribute('data-review-note')){
        editing=product;field.value=find(product.id)?.annotation||'';
        dialog.querySelector('[data-review-product]').textContent=material.name;
        status.textContent='';dialog.showModal();
        return;
      }
      const cards=[...grid.querySelectorAll('[data-shop-card]')],index=cards.indexOf(card);
      const anchor=cards[index+1]||cards[index-1];
      if(!update(product,{supprimeLe:new Date().toISOString()}))return notify('La suppression locale n’a pas pu être enregistrée.');
      // Bring the next card into the removed card’s slot, even across groups.
      const top=cards[index+1]?Math.max(8,card.getBoundingClientRect().top):undefined;
      const retained=refreshAt(anchor,top);
      if(retained)retained.querySelector('[data-review-remove]').focus({preventScroll:true});
      else toolbar.querySelector('[data-review-undo]').focus({preventScroll:true});
    });
    dialog.querySelector('[data-review-cancel]').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=event=>{
      event.preventDefault();
      const annotation=field.value.trim();
      if(!update(editing,{annotation,annoteLe:annotation?new Date().toISOString():null})){
        status.textContent='La note n’a pas pu être sauvegardée.';return;
      }
      const card=[...grid.querySelectorAll('[data-shop-card]')].find(el=>el.dataset.shopCard===editing.id);
      if(card)card.querySelector('[data-review-note]').textContent=annotation?'Annotation enregistrée':'Annotation';
      updateToolbar();dialog.close();
    };
    const lastRemoved=()=>records.reduce((last,row)=>row.supprimeLe&&(!last||row.supprimeLe>=last.supprimeLe)?row:last,null);
    toolbar.querySelector('[data-review-undo]').onclick=()=>{
      const product=lastRemoved();
      if(!product)return;
      const visible=[...grid.querySelectorAll('[data-shop-card]')].find(card=>card.getBoundingClientRect().bottom>0);
      if(!update(product,{supprimeLe:null}))return notify('La restauration locale n’a pas pu être enregistrée.');
      refreshAt(visible);
    };
    toolbar.querySelector('[data-review-export]').onclick=()=>{
      let fiches;
      try{fiches=read();}catch{return notify('Impossible de lire les données de révision.');}
      const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,exporteLe:new Date().toISOString(),fiches},null,2)],{type:'application/json'}));
      const link=document.createElement('a');
      link.href=url;link.download='MIR-revision-boutique.json';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    };
    function updateToolbar(){
      const removed=records.filter(row=>row.supprimeLe).length;
      const noted=records.filter(row=>row.annotation).length;
      toolbar.querySelector('[data-review-count]').textContent=`Révision · ${noted} notes · ${removed} retirées`;
      toolbar.querySelector('[data-review-undo]').disabled=!removed;
      const url=new URL(location.href);url.searchParams.delete('revision');
      toolbar.querySelector('[data-review-exit]').href=url.href;
    }
    return {
      isRemoved:id=>!!find(id)?.supprimeLe,
      decorate(){
        for(const card of grid.querySelectorAll('[data-shop-card]')){
          card.querySelector('.shop-card-copy').insertAdjacentHTML('beforeend',controls);
          if(find(card.dataset.shopCard)?.annotation)card.querySelector('[data-review-note]').textContent='Annotation enregistrée';
        }
        updateToolbar();
      }
    };
  }
  function productActions(m){
    const href=configurationURL(m,activeColor);
    if(m.configurationRequired===true)return href?`<a id="product-configure" class="mir-button" href="${esc(href)}">Configurer mon panneau <span>→</span></a>`:'<button type="button" class="mir-button" disabled>Configuration indisponible</button>';
    const enabled=requestable(m),label=enabled?'Ajouter à ma demande <span aria-hidden="true">＋</span>':'Demande indisponible · fiche à compléter';
    return `<button type="button" id="product-add" class="mir-button" ${enabled?'':'disabled'}>${label}</button>${href?`<a id="product-configure" class="quiet-button" href="${esc(href)}">Configurer ce produit →</a>`:''}${(m.applications||[]).includes('siding')?`<a class="quiet-button" href="plan.html?material=${encodeURIComponent(m.id)}">Essayer ce profil dans le studio →</a>`:''}${(m.applications||[]).includes('bending')?'<a class="quiet-button" href="pliage.html">Configurer un pliage →</a>':''}`;
  }
  function showProduct(){const qs=new URLSearchParams(location.search);let fallback='';try{fallback=sessionStorage.getItem('mir_shop_context_v1')||'';}catch{}shopContext=cleanShopContext(qs.get('from')||fallback);$('#product-return').href=qs.get('return')==='cart'?'selection.html':returnToShop();if(qs.get('return')==='cart')$('#product-return').textContent='← Retour à ma demande';const m=materials.find(x=>x.id===qs.get('id')&&sold(x));if(!m){$('#product-detail').innerHTML='<div><h1>Cette référence est introuvable.</h1><p><a href="boutique.html">Revenir à la boutique →</a></p></div>';return;}activeProduct=m;const ims=m.stableSidingPreview?[]:images(m).filter(x=>!x.colorId&&!(x.colorIds||[]).length),im=heroImage(m),cs=colors(m);activeColor=cs.find(c=>c.id===qs.get('color'))||cs[0]||null;activeFormat=formats(m,activeColor?.id).find(f=>f.id===qs.get('format'))||null;document.title=`${m.name} — MIR`;$('#product-brand-link').textContent=m.brand;$('#product-brand-link').href=`boutique.html?brand=${encodeURIComponent(m.brand)}#collections`;$('#product-crumb').textContent=m.name;
    $('#product-detail').innerHTML=`<div class="product-gallery"><div id="product-photo" class="product-main-photo mir-catalogue-photo mir-catalogue-photo-detail" data-photo-type="${presentation(im)}">${imageMarkup(m,true,activeColor)}</div>${m.stableSidingPreview?'':`<div class="product-preview-tabs"><button type="button" id="show-selected-sample" aria-pressed="true">Échantillon choisi</button><button type="button" id="show-product-photo" aria-pressed="false" ${im?'':'disabled'}>Photo du profil</button></div>`}<p id="product-photo-note" class="product-photo-note"></p>${ims.length>1?`<div class="product-thumbs" aria-label="Photos du matériau">${ims.map((x,i)=>`<button type="button" data-photo="${i}" aria-label="Voir ${esc(x.alt||photoLabel(x))}" aria-pressed="${x===im}"><img src="${esc(localAsset(x.src))}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`:''}</div><div class="product-info"><a class="product-brand" href="boutique.html?brand=${encodeURIComponent(m.brand)}#collections">${esc(m.brand)} →</a><h1>${esc(m.name)}</h1><p class="product-intro">${esc(m.description)}</p><p class="product-price-note" id="product-price-note">${esc(productPriceNote(m,activeColor))}</p><p class="product-source-note" id="product-price-details"${productPriceDetails(m,activeColor)?'':' hidden'}>${esc(productPriceDetails(m,activeColor))}</p><div class="product-quickfacts"><span>${esc(m.family)}</span>${m.finish?`<span>${esc(m.finish)}</span>`:''}${(m.allowedOrientations||[]).map(o=>`<span>Pose ${esc((orientation[o]||o).toLowerCase())}</span>`).join('')}</div><div class="product-color-section"${cs.length?'':' hidden'}><div class="product-color-heading"><strong>${m.colorStatus==='not_applicable'?'Fini':'Couleur'} : <span id="selected-color-name"></span></strong>${cs[0]?.sourceUrl?`<a target="_blank" rel="noopener" href="${esc(safe(cs[0].sourceUrl))}">Nuancier fabricant →</a>`:''}</div><div class="product-color-picker" aria-label="Couleurs ${esc(m.brand)}">${cs.map(c=>`<button type="button" class="${swatchClass(c)}" data-color="${esc(c.id)}" title="${esc(c.name)}" aria-label="${esc(`${m.brand} — ${c.name}${c.code?' — code '+c.code:''} — ${m.finish||m.name}`)}" aria-pressed="false">${swatch(c)}</button>`).join('')}</div><p id="color-note" class="product-color-description"></p></div>${formats(m).length?`<div class="product-format"><label for="product-format">${m.renderPattern==='panel'?'Format du panneau':'Format / longueur'}</label><select id="product-format" required>${formatOptions(m,activeColor?.id,activeFormat?.id,true)}</select></div>`:''}${m.configurationRequired===true?'':`<div class="product-order-fields"><label><span>Quantité souhaitée</span><input id="product-quantity" type="number" required min="1" max="1000000" step="1" value="1" inputmode="decimal"></label><label><span>Unité du besoin</span><select id="product-unit">${unitOptions(defaultUnit(m),m,activeFormat?.id)}</select></label></div>`}<p id="product-quantity-note" class="mir-quantity-status" role="status"></p><div class="product-actions-main">${productActions(m)}</div><p class="product-save-note">${m.configurationRequired===true?(surfaceTariff(m,activeColor)?'Indiquez la forme et les mesures dans le configurateur pour calculer le prix. La disponibilité du fini et la faisabilité seront confirmées avec MIR.':'Indiquez la forme, les dimensions, la matière et le fini dans le configurateur. Prix et faisabilité seront confirmés avec MIR.'):'Votre sélection est conservée sur cet appareil. Les quantités, le conditionnement et la couleur seront confirmés avec MIR.'}</p></div>`;
    function notePhoto(x){$('#product-photo-note').innerHTML=x?`${esc(photoLabel(x))} · ${esc(x.credit||m.brand)}. ${esc(x.note||'Le visuel présente le profil; la teinte choisie est indiquée séparément.')}${x.sourceUrl?` <a href="${esc(safe(x.sourceUrl))}" target="_blank" rel="noopener">Source →</a>`:''}`:'Aucune photo exacte du fabricant n’est encore associée à cette référence.';}
    let selectedPreview=true;
    function markPreview(on){selectedPreview=on;$('#show-selected-sample')?.setAttribute('aria-pressed',String(on));$('#show-product-photo')?.setAttribute('aria-pressed',String(!on));}
    function showSelected(){markPreview(true);renderVisual($('#product-photo'),withFormat(m,activeFormat),activeColor);
      if(m.stableSidingPreview){
        $('#product-photo-note').textContent='Illustration de la couleur choisie. Rendu écran indicatif.';
        return;
      }
      if(m.paintPotIndices){
        $('#product-photo-note').textContent=paintPotIndex(m,activeColor)===null?'Photo MIR non encore disponible pour cette teinte. Référence de couleur disponible dans le nuancier.':'Photo de retouche MIR · '+(activeColor?.name||'teinte à confirmer')+' · touche de peinture sèche sur le couvercle. Rendu écran indicatif.';
        return;
      }
      if(m.keepProductPhoto||m.screwPreview){
        const note=$('#product-photo-note');
        note.textContent=m.keepProductPhoto?'Photo du produit. L’échantillon de teinte est dans le nuancier.':
          m.screwPreview==='fascia-2po'?'Illustration de la vis · aperçu de la teinte sur la tête.':
          activeColor?.swatchUrl||activeColor?.hex?'Aperçu de la teinte sur la tête de la vis.':'Photo de référence de la vis. Teinte à préciser.';
        return;
      }
      const r=V.recipe(withFormat(m,activeFormat),activeColor);$('#product-photo-note').innerHTML=activeColor?`${r.kind==='smooth_preview'?'Aperçu du fini lisse, teinte tirée de l’échantillon fabricant.':r.kind==='exact_variant'?(r.formatMatch?'Photo de la couleur et du format sélectionnés.':'Photo de la couleur choisie; le format photographié peut différer du format retenu.'):r.kind==='color_reference_preview'?'Référence de couleur issue du nuancier; la photo du produit est accessible séparément.':r.kind==='manufacturer_sample'?'Échantillon du nuancier fabricant.':'Aperçu de la teinte sélectionnée.'} <strong>${esc(activeColor.name)}</strong>. Le rendu écran est indicatif.${activeColor.sourceUrl?` <a href="${esc(safe(activeColor.sourceUrl))}" target="_blank" rel="noopener">Source →</a>`:''}`:'';if(!activeColor)notePhoto(im);document.querySelectorAll('[data-photo]').forEach(a=>a.setAttribute('aria-pressed','false'));}
    function showPhoto(x){V.cancel($('#product-photo'));delete $('#product-photo').dataset.screwPreview;delete $('#product-photo').dataset.previewKind;markPreview(false);$('#product-photo').dataset.photoType=presentation(x);$('#product-photo').innerHTML=x?`<img src="${esc(localAsset(x.src))}" alt="${esc(x.alt||m.name)}" data-presentation="${presentation(x)}" style="object-position:${position(x)}">`:placeholder();notePhoto(x);}
    const sampleButton=$('#show-selected-sample'),photoButton=$('#show-product-photo');
    if(sampleButton)sampleButton.onclick=showSelected;
    if(photoButton)photoButton.onclick=()=>showPhoto(im);
    document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{showPhoto(ims[+b.dataset.photo]);document.querySelectorAll('[data-photo]').forEach(a=>a.setAttribute('aria-pressed',a===b));});
    function updateURL(){const p=new URLSearchParams({id:m.id});if(qs.get('return')==='cart')p.set('return','cart');if(shopContext)p.set('from',shopContext);if(activeColor)p.set('color',activeColor.id);if(activeFormat)p.set('format',activeFormat.id);history.replaceState(null,'',location.pathname+'?'+p);}
    function colorState(){$('#product-price-note').textContent=productPriceNote(m,activeColor);const priceDetails=productPriceDetails(m,activeColor);$('#product-price-details').textContent=priceDetails;$('#product-price-details').hidden=!priceDetails;const priceTable=$('.product-facts-table tbody');if(priceTable)priceTable.innerHTML=facts(withFormat(m,activeFormat),activeColor).map(([a,b])=>`<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('');const configure=$('#product-configure');if(configure)configure.href=configurationURL(m,activeColor);document.querySelectorAll('[data-color]').forEach(b=>{const selected=b.dataset.color===activeColor?.id;b.setAttribute('aria-pressed',selected);const c=cs.find(c=>c.id===b.dataset.color);if(c){b.setAttribute('aria-label',`${m.brand} — ${c.name}${c.code?' — code '+c.code:''} — ${m.finish||m.name}${selected?' — sélectionné':''}`);if(!m.keepProductPhoto)V.paintChip(b,m,c);}});$('#selected-color-name').textContent=activeColor?.name||(m.colorStatus==='not_applicable'?(m.finish||'Sans option de couleur'):'À confirmer');$('#color-note').textContent=activeColor?`${activeColor.availabilityNote||'Teinte du fabricant; disponibilité à confirmer.'} ${V.smooth(m,activeColor)?'Le fini lisse reste lisse; la photo originale du profil est accessible à gauche.':activeColor.swatchTextureNote||''}`:m.colorStatus==='not_applicable'?'Le fini est défini par la référence; aucun nuancier de couleur ne s’applique.':'Le nuancier exact de cette référence reste à confirmer avec le fabricant.';showSelected();updateURL();}
    document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{
      activeColor=cs.find(c=>c.id===b.dataset.color);
      const field=$('#product-format');
      if(field&&m.requireColor){
        field.innerHTML=formatOptions(m,activeColor?.id,activeFormat?.id,true);
        activeFormat=formats(m,activeColor?.id).find(f=>f.id===field.value)||null;
        field.dispatchEvent(new Event('change'));
      }
      colorState();
    });colorState();
    function quantityControls(reset=false){
      const input=$('#product-quantity'),select=$('#product-unit');if(!input)return;
      const policy=Q.policy(m,activeFormat?.id),old=select.value;
      select.innerHTML=unitOptions(policy.rules.some(r=>r.unit===old)?old:policy.defaultUnit,m,activeFormat?.id);
      const rule=policy.rules.find(r=>r.unit===select.value);input.min=String(rule.step);input.step=String(rule.step);
      if(reset)input.value=String(rule.step);
      input.setCustomValidity('');const state=Q.validate(m,{quantity:Number(input.value),unit:select.value,formatId:activeFormat?.id,colorId:activeColor?.id});
      $('#product-quantity-note').textContent=state.message;
      if(!state.ok)input.setCustomValidity(state.message);
    }
    quantityControls(true);
    $('#product-unit')?.addEventListener('change',()=>quantityControls(false));
    $('#product-quantity')?.addEventListener('input',()=>quantityControls(false));
    $('#product-format')?.addEventListener('change',()=>{activeFormat=formats(m,activeColor?.id).find(f=>f.id===$('#product-format').value)||null;updateURL();const table=$('.product-facts-table tbody');if(table)table.innerHTML=facts(withFormat(m,activeFormat),activeColor).map(([a,b])=>`<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('');showSelected();quantityControls(false);});
    if($('#product-add'))$('#product-add').onclick=()=>{if(!requestable(m))return;if($('#product-format')&&!$('#product-format').reportValidity())return;const input=$('#product-quantity'),quantity=Number(input.value),unit=$('#product-unit').value;if(!input.reportValidity()||!Q.validate(m,{quantity,unit,formatId:activeFormat?.id,colorId:activeColor?.id}).ok||!Number.isFinite(quantity)||quantity<=0||quantity>1000000)return;const colorId=activeColor?.id||null,existing=list.items.find(x=>x.materialId===m.id&&x.colorId===colorId&&x.unit===unit&&(x.formatId||null)===(activeFormat?.id||null));if(existing){if(!Q.validate(m,existing).ok){notify('Corrigez d’abord la quantité de cet article dans votre demande avant d’en ajouter.');return;}if(existing.quantity+quantity>1000000){notify('La quantité maximale est dépassée.');return;}existing.quantity+=quantity;}else list.items.push({materialId:m.id,brand:m.brand,name:m.name,colorId,colorName:activeColor?.name||(m.colorStatus==='not_applicable'?(m.finish||'Sans option de couleur'):'À confirmer'),quantity,unit,formatId:activeFormat?.id||null,format:activeFormat?{...activeFormat}:null,formatName:activeFormat?formatLabel(activeFormat):null});if(persist()){const notice=$('#product-added');notice.hidden=false;notice.querySelector('p').textContent=number(quantity)+' '+unit+' · '+(activeColor?.name||'Fini à confirmer');notice.scrollIntoView({block:'nearest',behavior:'instant'});}};
    $('#product-docs').innerHTML=`<div><h2>La matière, en détail.</h2><table class="product-facts-table"><tbody>${facts(withFormat(m,activeFormat),activeColor).map(([a,b])=>`<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table><p class="product-source-note">Dimensions physiques et exposition utile sont distinctes. Les besoins saisis ne sont pas convertis automatiquement en boîtes ou en pièces livrables.</p>${m.gaps?.length?`<p class="product-source-note">${m.gaps.map(esc).join(' ')}</p>`:''}</div><div><h2>Les documents qui comptent.</h2>${(m.documents||[]).filter(d=>safe(d.url)).map(d=>`<a class="product-resource" href="${esc(safe(d.url))}" target="_blank" rel="noopener"><span>${esc(d.title)} <b>→</b></span><small>${d.scope==='system'?'Document du système ou de la gamme. ':d.scope==='product'?'Document du produit. ':''}${esc(d.note||'Consultez les prescriptions et la version du fabricant.')}</small></a>`).join('')||'<p class="product-source-note">Les documents exacts de cette référence restent à compléter.</p>'}<div class="product-tech-buttons"><button id="product-pdf" class="mir-button">Préparer la fiche MIR ↓</button>${m.sourceUrl?`<a href="${esc(safe(m.sourceUrl))}" class="quiet-button" target="_blank" rel="noopener">Page fabricant →</a>`:''}</div><p class="product-source-note">La fiche MIR rassemble les renseignements référencés. Les documents originaux du fabricant demeurent la référence pour la pose et les garanties.</p></div>`;
    const title=document.createElement('div');title.className='mir-product-title';
    for(const node of [$('.product-info>.product-brand'),$('.product-info>h1'),$('.product-info>.product-intro')])if(node)title.append(node);
    $('#product-detail').prepend(title);
    const gallery=$('.product-gallery'),photos=document.createElement('details');photos.className='mir-product-photos';photos.innerHTML=m.stableSidingPreview?'<summary>Échantillon et sources</summary>':'<summary>Photo du profil et sources</summary>';
    for(const node of [...gallery.children])if(node.id!=='product-photo')photos.append(node);gallery.append(photos);
    const picker=$('.product-color-picker'),extra=document.createElement('details');extra.id='product-all-colors';extra.innerHTML='<summary>Voir tout le nuancier</summary><div class="product-extra-colors"></div>';
    for(const button of [...picker.children].slice(6))extra.querySelector('div').append(button);picker.after(extra);extra.hidden=cs.length<=6;
    if(cs.length>24){
      const search=document.createElement('label');
      search.textContent='Rechercher une couleur par nom ou code';
      const input=document.createElement('input');
      input.type='search';
      search.append(input);
      picker.before(search);
      const options=[...picker.querySelectorAll('[data-color]'),...extra.querySelectorAll('[data-color]')];
      input.addEventListener('input',()=>{
        const query=norm(input.value.trim());
        if(query)extra.open=true;
        for(const option of options)option.hidden=!norm(option.getAttribute('aria-label')).includes(query);
      });
    }
    const technical=$('#product-technical');technical.append(photos,$('#color-note'));const sampleNote=document.createElement('p');sampleNote.className='mir-sample-note';sampleNote.textContent=m.stableSidingPreview?'Échantillon MIR · rendu écran indicatif':m.keepProductPhoto?'Photo du produit · teinte au nuancier':
      m.screwPreview?(m.screwPreview==='fascia-2po'?'Illustration · teinte indicative':'Aperçu de la teinte sur la tête'):
      im?.assetKind?.startsWith('MIR_user_provided_')?'Visuel fourni par MIR · longueur à sélectionner':
      im||cs.some(c=>c.swatchUrl)?'Visuel indicatif · référence fabricant':'Photo non disponible · visuel de remplacement';gallery.append(sampleNote);for(const a of [...$('.product-actions-main').querySelectorAll('a.quiet-button')])technical.append(a);
    const notice=document.createElement('div');notice.id='product-added';notice.className='mir-product-added';notice.hidden=true;notice.setAttribute('role','status');notice.innerHTML='<strong>Ajouté à votre demande</strong><p></p><a class="mir-button" href="selection.html">Voir ma demande →</a>';$('.product-actions-main').after(notice);
    const accessory=x=>(x.applications||[]).some(a=>['accessory','fastener','fasteners','sealant','membrane','touchup','touch-up','trim','opening-trim','siding-joint'].includes(a));
    $('#product-pdf').onclick=productPDF;$('#related-grid').innerHTML=materials.filter(x=>sold(x)&&x.id!==m.id&&accessory(x)&&O.section(x)!==O.section(m)).sort((a,b)=>(b.brand===m.brand)-(a.brand===m.brand)||O.compare(a,b)).slice(0,3).map(card).join('');hydrateChips($('#related-grid'));
  }
  async function productPreviewSVG(m,c){
    if(!m.screwPreview)return V.svg(m,m.keepProductPhoto?null:c);
    const holder=document.createElement('div');
    await renderScrew(holder,m,c);
    const image=await screwImage(holder.dataset.screwPreview);
    if(!image)return V.svg(m,null);
    const overlay=holder.querySelector('canvas');
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth;
    canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(image,0,0);
    if(!overlay.hidden)ctx.drawImage(overlay,0,0);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 680"><rect width="800" height="680" fill="#fff"/><image href="${canvas.toDataURL('image/png')}" x="75" y="50" width="650" height="530" preserveAspectRatio="xMidYMid meet"/><text x="400" y="620" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#354735">${esc(c?.name||m.name)}</text></svg>`;
  }
  async function productPDF(){const b=$('#product-pdf'),m=activeProduct,c=activeColor?{...activeColor}:null,f=activeFormat?{...activeFormat}:null;if(formats(m).length&&!f){$('#product-format').reportValidity();return;}b.disabled=true;b.textContent='Préparation…';try{const svg=await productPreviewSVG(withFormat(m,f),c);await window.MIRPDF.exportPlan({title:'MIR — Fiche matériau',subtitle:m.brand,filename:`MIR-${m.id}${f?'-'+f.id:''}.pdf`,faces:[{name:m.name,svg,summary:[...facts(withFormat(m,f),c).map(([a,v])=>`${a} : ${v}`),...(f?[`Format retenu : ${formatLabel(f)}`]:[]),`Couleur retenue : ${c?.name||(m.colorStatus==='not_applicable'?(m.finish||'Sans option de couleur'):'À confirmer')}`,surfaceTariff(m,c)?'Le prix du panneau sera calculé après saisie de la forme et des mesures. Disponibilité du fini et faisabilité MIR à confirmer.':productPriceNote(m,c)+'.','Les documents fabricant priment sur cette synthèse.',...(m.documents||[]).map(d=>`${d.title} — ${d.url}`),`Source produit : ${m.sourceUrl||'à confirmer'}`]}]});notify('Fiche PDF prête.');}catch(e){notify(e.message||'Impossible de préparer le PDF.');}finally{b.disabled=false;b.textContent='Préparer la fiche MIR ↓';}}
  function selectionHref(x){const p=new URLSearchParams({id:x.materialId,return:'cart'});if(x.colorId)p.set('color',x.colorId);if(x.formatId)p.set('format',x.formatId);return 'produit.html?'+p;}
  function showSelection(){const dossier=$('#mir-project-dossier');if(new URLSearchParams(location.search).get('view')==='dossier'||location.hash==='#mir-unified-dossier')dossier.open=true;document.addEventListener('click',e=>{if(e.target.closest('a[href$="#mir-unified-dossier"]'))dossier.open=true;});const project=$('#selection-project-name');project.value=list.project;project.oninput=()=>{list.project=project.value;persist();};function render(){updateCount();let hasPieces=false;try{hasPieces=JSON.parse(localStorage.getItem('mir_production_client_dossier_v1')||'null')?.order?.items?.length>0;}catch{}$('#mir-cart-confirm').hidden=!list.items.length&&!hasPieces;const invalid=list.items.some(x=>!cartQuantityState(x).ok);$('#cart-estimate').setAttribute('aria-disabled',String(invalid));$('#cart-estimate').onclick=e=>{if(invalid){e.preventDefault();document.querySelector('.mir-quantity-status[role=alert]')?.scrollIntoView({block:'center'});}};$('#selection-items').innerHTML=list.items.map((x,i)=>{const m=materials.find(m=>m.id===x.materialId);if(!sold(m))return `<article class="selection-item"><div><h2>${esc(x.name)}</h2><p>Article indisponible · exclu de l’export.</p></div><button class="remove-selection" data-remove="${i}" aria-label="Retirer ${esc(x.name)}">×</button></article>`;return `<article class="selection-item"><a href="${esc(selectionHref(x))}" class="selection-item-photo" data-selection-preview="${i}">${m?imageMarkup(m,false,m.colors?.find(c=>c.id===x.colorId)):placeholder()}</a><div><span class="shop-card-brand">${esc(x.brand)}</span><h2><a href="${esc(selectionHref(x))}">${esc(x.name)}</a></h2><p>Finition : <span class="mir-cart-finish">${esc(x.colorName)}</span>${x.formatName?`<br>Format : ${esc(x.formatName)}`:''}<br>${window.MIRBoutiquePricing?.label(x.materialId,x.formatId)||'Prix sur demande'}</p><label class="mir-cart-color"${colors(m).length?'':' hidden'}><span>Teinte</span><select data-cart-color="${i}" aria-label="Teinte pour ${esc(x.name)}">${m.requireColor?'<option value="">Choisir la couleur</option>':''}${(m.colors||[]).map(c=>`<option value="${esc(c.id)}"${c.id===x.colorId?' selected':''}>${esc(c.name)}</option>`).join('')||`<option value="">${esc(x.colorName)}</option>`}</select></label>${formats(m).length?`<label class="mir-cart-format"><span>Format</span><select data-cart-format="${i}" aria-label="Format pour ${esc(x.name)}">${formatOptions(m,x.colorId,x.formatId)}</select></label>`:''}${quantityWarning(x,i)}</div><label class="selection-qty"><span class="field-label">Quantité</span><input type="number" required min="0.01" max="1000000" step="any" value="${x.quantity}" data-qty="${i}" aria-label="Quantité pour ${esc(x.name)}"></label><label class="selection-unit"><span class="field-label">Unité du besoin</span><select data-unit="${i}" aria-label="Unité pour ${esc(x.name)}">${unitOptions(x.unit,m,x.formatId)}</select></label><button class="remove-selection" data-remove="${i}" aria-label="Retirer ${esc(x.name)}">×</button></article>`;}).join('')||'<div class="shop-empty"><p>Votre demande est vide.</p><p><a href="boutique.html">Découvrir les matériaux →</a></p></div>';$('#selection-summary').innerHTML=`${list.items.length} article${list.items.length>1?'s':''} dans votre demande.<small>Les quantités exprimées en pi², en pieds linéaires ou en pièces restent séparées. L’équipe MIR pourra préciser le conditionnement et les accessoires compatibles.</small>`;document.querySelectorAll('[data-selection-preview]').forEach(el=>{const x=list.items[+el.dataset.selectionPreview],m=materials.find(m=>m.id===x.materialId),c=m?.colors?.find(c=>c.id===x.colorId);if(m)renderVisual(el,withFormat(m,x.format),c);});$('#selection-export').disabled=!list.items.length;$('#selection-export-pdf').disabled=!list.items.some(x=>sold(materials.find(m=>m.id===x.materialId)));document.querySelectorAll('[data-cart-color]').forEach(select=>select.onchange=()=>{const item=list.items[+select.dataset.cartColor],m=materials.find(m=>m.id===item.materialId),color=m?.colors?.find(c=>c.id===select.value);if(!color)return;item.colorId=color.id;item.colorName=color.name;
      if(m.requireColor&&formats(m).length){
        if(!formats(m,color.id).some(f=>f.id===item.formatId)){item.formatId=item.format=item.formatName=null;item.unit=defaultUnit(m);}
        persist();render();return;
      }
      persist();const preview=document.querySelector('[data-selection-preview="'+select.dataset.cartColor+'"]');if(preview)renderVisual(preview,withFormat(m,item.format),color);const name=select.closest('.selection-item').querySelector('.mir-cart-finish');if(name)name.textContent=color.name;});document.querySelectorAll('[data-quantity-fix]').forEach(b=>b.onclick=()=>{const x=list.items[+b.dataset.quantityFix],state=cartQuantityState(x);if(state.suggestion){x.quantity=state.suggestion;persist();render();}});
      document.querySelectorAll('[data-cart-format]').forEach(select=>select.onchange=()=>{const x=list.items[+select.dataset.cartFormat],m=materials.find(m=>m.id===x.materialId),f=formats(m,x.colorId).find(f=>f.id===select.value);if(f?.unit)x.unit=f.unit;x.formatId=f?.id||null;x.format=f?{...f}:null;x.formatName=f?formatLabel(f):null;persist();render();});
      document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{list.items.splice(+b.dataset.remove,1);persist();render();});document.querySelectorAll('[data-qty]').forEach(input=>input.onchange=()=>{input.setCustomValidity('');if(input.reportValidity()&&Number.isFinite(Number(input.value))&&Number(input.value)>0){const x=list.items[+input.dataset.qty],next={...x,quantity:Number(input.value)},state=cartQuantityState(next);if(!state.ok){notify(state.message);input.value=x.quantity;return;}x.quantity=next.quantity;persist();render();}});document.querySelectorAll('[data-unit]').forEach(input=>input.onchange=()=>{list.items[+input.dataset.unit].unit=input.value;persist();render();});}
    const pdfButton=$('#selection-export-pdf'),pdfStatus=$('#selection-pdf-status');
    pdfButton.onclick=async()=>{
      if(!window.MIRPDF?.exportPlan||!window.MIRSelectionPDF?.buildOptions){
        pdfStatus.textContent='Export PDF indisponible. La sauvegarde JSON reste disponible.';
        return;
      }
      const available=list.items.filter(x=>sold(materials.find(m=>m.id===x.materialId)));
      pdfButton.disabled=true;pdfButton.setAttribute('aria-busy','true');
      pdfStatus.textContent='Préparation du PDF de votre sélection…';
      try{
        const options=window.MIRSelectionPDF.buildOptions({
          project:list.project,items:available,excludedCount:list.items.length-available.length
        });
        const result=await window.MIRPDF.exportPlan(options);
        pdfStatus.textContent='PDF prêt ('+result.pages+' page'+(result.pages>1?'s':'')+'). Utilisez le bouton Télécharger dans le panneau.';
      }catch(error){
        pdfStatus.textContent='PDF non préparé : '+String(error?.message||'Erreur inconnue')+'. Sauvegardez votre JSON si nécessaire.';
      }finally{
        pdfButton.removeAttribute('aria-busy');
        pdfButton.disabled=!list.items.some(x=>sold(materials.find(m=>m.id===x.materialId)));
      }
    };
    $('#selection-export').onclick=()=>{const payload={...list,createdAt:new Date().toISOString(),status:'selection_non_commandee',note:'Quantités souhaitées; prix, stock, unités livrables et compatibilités à confirmer.',items:list.items.filter(x=>sold(materials.find(m=>m.id===x.materialId))).map(x=>({...x,sourceUrl:materials.find(m=>m.id===x.materialId)?.sourceUrl||null}))};const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.href=url;a.download='MIR-selection-materiaux.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);};render();
  }
  document.addEventListener('click',event=>{const b=event.target.closest('[data-card-color]');if(!b)return;const m=materials.find(m=>m.id===b.dataset.material),c=m?.colors?.find(c=>c.id===b.dataset.cardColor),card=b.closest('[data-shop-card]');if(!m||!c||!card)return;card.querySelectorAll('[data-card-color]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(!m.keepProductPhoto||m.paintPotIndices){renderVisual(card.querySelector('.card-preview'),m,c);card.querySelector('.card-photo-label').textContent=m.paintPotIndices?'Pot de retouche MIR · teinte indicative':m.stableSidingPreview?'Échantillon MIR':m.screwPreview?'Aperçu de teinte':'Couleur choisie';}card.querySelector('.card-color-name').textContent=c.name;card.querySelectorAll('[data-card-link]').forEach(a=>a.href=productHref(m.id,c.id));});
  document.addEventListener('error',event=>{const img=event.target;if(img.tagName!=='IMG'||img.hasAttribute('data-catalogue-image')||!img.closest('.shop-card-photo,.category-photo,.product-main-photo,.selection-item-photo'))return;const holder=img.closest('.card-preview,.category-photo,.product-main-photo,.selection-item-photo');if(holder)holder.innerHTML=placeholder();},true);
  function attachScrewPreview(material,key){
    material.screwPreview=key;
    const source=heroImage(material);
    if(!source)return;
    const src=screwAssetRoot+key+'.webp';
    material.images=[{...source,src},...material.images.filter(image=>image!==source)];
    material.primaryImage=src;
  }
  function applyBoutiqueReview(kaycanSwatches){
    const nails=materials.find(m=>m.id==='prime-siding-2-30724');
    if(nails){
      // Conserver la marque et la référence exactes fournies par MIR.
      nails.name='PRIME 30724 — Clous annelés en bobine 2 po · galvanisés à chaud';
      nails.brand='PRIME / Premier Outils Pro';
    }
    for(const id of ['lighttrim-vfcltek8114','lighttrim-vfcls8114','lighttrim-vfctek834']){
      const screw=materials.find(m=>m.id===id);
      if(!screw)continue;
      screw.finish ||= screw.colors?.[0]?.name;
      screw.colors=[];
      screw.colorStatus='not_applicable';
    }
    for(const id of ['lighttrim-vfcs','lighttrim-vfctek8']){
      const screw=materials.find(m=>m.id===id);
      if(screw)attachScrewPreview(screw,id);
    }
    const fascia=materials.find(m=>m.id==='pending-kaycan-fascia-hex-quarter-inch');
    if(fascia){
      const references=window.MIRBendingFinishes.kaycanAluminumPalette(materials);
      const palette=new Map(references.map(color=>[norm(color.name),color]));
      for(const id of ['kaycan-fascia-6-0480','kaycan-urbanix-coil-0747']){
        for(const color of colors(materials.find(m=>m.id===id)||{})){
          if(!palette.has(norm(color.name)))palette.set(norm(color.name),color);
        }
      }
      for(const color of kaycanSwatches.extra||[]){
        if(!palette.has(norm(color.name)))palette.set(norm(color.name),color);
      }
      fascia.name='Vis de fascia 2 po — tête hexagonale ¼ po, teintes aluminium Kaycan';
      fascia.family='Fixations';
      fascia.dimensions={...fascia.dimensions,lengthIn:2};
      fascia.description='Vis de fascia de 2 po, tête hexagonale ¼ po. Teintes aluminium Kaycan offertes selon MIR. Prix et conditionnement sur demande.';
      fascia.status='mir_reference';
      fascia.requireColor=true;
      fascia.unit='Pièces souhaitées (conditionnement MIR à confirmer)';
      fascia.gaps=['Référence fournisseur et conditionnement à confirmer avec MIR.'];
      fascia.specifications=[{label:'Longueur',value:'2 po'},{label:'Tête hexagonale',value:'¼ po'}];
      fascia.colors=[...palette.values()].map(color=>({...color,...kaycanSwatches.sampled?.[color.id],
        availabilityNote:'Teinte offerte selon MIR. Aperçu à l’écran. Prix et conditionnement sur demande.'}));
      fascia.images=[{src:screwAssetRoot+'fascia-2po.webp',alt:'Illustration de la vis de fascia 2 po',cardPresentation:'packshot',note:'Illustration de référence fournie par MIR.'}];
      attachScrewPreview(fascia,'fascia-2po');
    }
    const hardieKit=materials.find(m=>m.id==='hardie-colorplus-touch-up-kit');
    const hardieColor=colors(materials.find(m=>m.id==='hardieplank-select-825')||{}).find(c=>c.id==='hardie-etain-vieilli');
    if(hardieKit&&hardieColor){
      const source='https://www.jameshardie.com/product-catalog/accessories-siding-products/hardie-colorplus-touch-up-kits/touch-up-kit/';
      hardieKit.keepProductPhoto=true;
      hardieKit.documents=[...hardieKit.documents,{kind:'technical',title:'James Hardie — kit de retouche ColorPlus',url:source,verified:true}];
      hardieKit.colors=[{...hardieColor,name:'Étain vieilli (Aged Pewter)',
        availabilityNote:'Teinte de référence. Disponibilité du kit dans cette teinte à confirmer avec MIR.'}];
    }
    const canexelPaint=materials.find(m=>m.id==='canexel-touch-up-284ml');
    if(canexelPaint){
      const source='https://boutique.aluminiumbbouchard.ca/produit/peinture-de-retouche-pour-le-canexel-284ml/';
      const guide=colors(materials.find(m=>m.id==='canexel-vstyle')||{});
      const names=['Acadia','Barista','Blanc','Bleu minuit','Bois de grange','Bois de Santal','Charbon','Falaise','Granit','Gris brume','Loup gris','Moka foncé','Noir','Renard roux','Rouge campagne','Sable','Scandinave','Sierra','Toundra','Yellowstone'];
      canexelPaint.keepProductPhoto=true;
      canexelPaint.paintPotIndices={'blanc':0,'noir':1,'gris brume':2,'sable':3,'bleu minuit':4,'granit':5,'toundra':6,'charbon':7,'moka fonce':8,'scandinave':9,'bois de santal':10,'acadia':11,'sierra':12,'barista':13,'falaise':14,'loup gris':15};
      canexelPaint.documents=[...canexelPaint.documents,{kind:'technical',title:'Aluminium B. Bouchard — couleurs et format 284 ml',url:source,verified:true}];
      canexelPaint.colors=names.map(name=>{
        const reference=guide.find(c=>norm(c.name)===norm(name));
        return {...reference,id:reference?.id||'canexel-'+norm(name).replaceAll(' ','-'),name,
          sourceUrl:source,availabilityNote:'Teinte répertoriée par le détaillant. Disponibilité MIR à confirmer.'};
      });
    }
  }
  async function init(){updateCount();const [response,visibility,adseal,kaycanSwatches,regionalPricing]=await Promise.all([fetch('./catalogue-fd6866b49d21.json'),fetch('./boutique-visibilite.json',{cache:'no-cache'}),fetch('./catalogue-adseal-4580.json').then(r=>r.ok?r.json():null).catch(()=>null),fetch(screwAssetRoot+'kaycan-fascia-colours.json').then(r=>r.ok?r.json():{}).catch(()=>({})),fetch('./mir-regional-pricing-20261110.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null)]);if(!visibility.ok)throw new Error('La disponibilité des articles ne peut pas être vérifiée. Réessayez dans un instant.');const {hidden}=await visibility.json();if(!Array.isArray(hidden))throw new Error('La disponibilité des articles est invalide.');hiddenProducts=new Set(hidden);if(!response.ok)throw new Error('Le catalogue ne peut pas être chargé. Réessayez dans un instant.');materials=(await response.json()).materials||[];for(const material of materials){const price=regionalPricing?.priced?.[material.id];if(price)material.regionalPricing={...price,researchedOn:regionalPricing.researchedOn,markupPercent:regionalPricing.markupPercent};}
  await window.MIRBoutiquePricing?.load();
  for(const material of materials){const rows=window.MIRBoutiquePricing?.rows().filter(x=>x.itemId===material.id)||[];if(rows.length)material.regionalPricing=rows.some(x=>x.formatId)?{formatPrices:Object.fromEntries(rows.map(x=>[x.formatId,{amount:Number.isInteger(x.amountCents)?x.amountCents/100:null}]))}:{amount:Number.isInteger(rows[0].amountCents)?rows[0].amountCents/100:null};}
  const sealant=materials.find(m=>m.id===adseal?.id);
  if(sealant){
    for(const color of adseal.colors){
      color.sourceUrl=adseal.sourceUrl;
      color.availabilityNote=color.formatIds?'Format répertorié par Adfast. Stock et minimums à confirmer avec MIR.':'Teinte du nuancier sur demande. Le format reste à confirmer.';
    }
    Object.assign(sealant,adseal);
  }applyBoutiqueReview(kaycanSwatches);const view=document.body.dataset.commerceView;if(view==='shop')showShop();if(view==='product')showProduct();if(view==='selection')showSelection();}
  window.addEventListener('storage',e=>{if(e.key===KEY){try{const s=JSON.parse(e.newValue);if(s&&Array.isArray(s.items)){list=s;updateCount();if(document.body.dataset.commerceView==='selection')showSelection();}}catch{}}});
  init().catch(e=>{const target=$('#shop-grid')||$('#product-detail')||$('#selection-items');if(target)target.innerHTML=`<p class="shop-empty">${esc(e.message)}</p>`;});
})();
