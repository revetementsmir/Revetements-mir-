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
    'estimation.html','estimation-dossier.html','studio.html','chantier.html','maison.html','chantiers.html','aide.html'
  ]);
  const dict=root?.MIRClientEnglish || (typeof module==='object'&&module.exports?require('./mir-client-en-ca.js'):{});
  const cataloguePhrases=Object.keys(dict).filter(key=>key.length>=18&&dict[key]!==key).sort((a,b)=>b.length-a.length);
  const sources=new WeakMap(),attributes=new WeakMap(),hrefSources=new WeakMap();
  let locale='fr-CA',active=false,observer=null,pending=false;
  const path=(href)=>String(href||'').split(/[?#]/)[0].split('/').pop()||'index.html';
  function isClient(file,search=''){
    const name=path(file);
    if(!clientFiles.includes(name))return false;
    const params=new URLSearchParams(String(search||'').replace(/^\?/,''));
    if(name==='chantier.html'){
      // The portal may consume the invitation URL before locale initialisation.
      // Presence only: never read or display the invitation credential itself.
      let invitationPending=false;
      try{invitationPending=!!root?.sessionStorage?.getItem('mir_portal_invitation_v1')||!!root?.document?.querySelector('[data-mir-invitation="true"]');}catch{}
      return params.get('clientLocale')==='1'&&!invitationPending&&!params.has('invite')&&!params.has('invitation')&&!params.has('token');
    }
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
    m=value.match(/^Mon panier\s*:\s*(\d+)$/);
    if(m)return 'My cart: '+m[1];
    m=value.match(/^Commande ([A-Za-z0-9_-]{1,100})$/);
    if(m)return 'Order '+m[1];
    m=value.match(/^Connecté avec (.+)\. Aucune commande n’a été envoyée\.$/);
    if(m)return 'Signed in as '+m[1]+'. No order has been submitted.';
    m=value.match(/^Aucun résultat(?: pour « (.*?) »)?\. Aucun filtre actif\. Essayez un nom de produit, un fabricant ou un code couleur, par exemple « panneau Hardie » ou « 458-264 »\.$/);
    if(m)return 'No results'+(m[1]?' for “'+m[1]+'”':'')+'. No filters selected. Try a product name, manufacturer or colour code, such as “Hardie panel” or “458-264”.';
    m=value.match(/^Aucun résultat(?: pour « (.*?) »)?\. Filtres actifs : (.+)\. Modifiez ces filtres ou utilisez Réinitialiser\.$/);
    if(m)return 'No results'+(m[1]?' for “'+m[1]+'”':'')+'. Active filters: '+m[2].replace(/fabricant « /g,'manufacturer “').replace(/famille « /g,'family “').replace(/type « /g,'type “').replace(/ »/g,'”')+'. Change these filters or select Reset.';
    m=value.match(/^(\d+) articles? dans votre panier\.$/);
    if(m)return m[1]+' '+(m[1]==='1'?'item':'items')+' in your cart.';
    m=value.match(/^Aperçu métal neutre\. Le nom et l’échantillon du fabricant ci-contre définissent la couleur choisie\. Somme des côtés : (.+?); largeur de la bobine : (.+?)\. Le développé final dépend du rayon et des corrections de pliage\.$/);
    if(m)return 'Neutral metal preview. The manufacturer name and sample alongside define the selected colour. Total sides: '+m[1]+'; coil width: '+m[2]+'. The final developed width depends on the radius and bending allowances.';
    // Read-only technical captions: retain letters and numeric measurements.
    m=value.match(/^([A-Z] · )([\d\s.,¼½¾⅛⅜⅝⅞/]+ (?:po|mm))$/);
    if(m)return m[1]+displayDimensions(m[2]);
    m=value.match(/^Développé total = ([\d\s.,¼½¾⅛⅜⅝⅞/]+ (?:po|mm))$/);
    if(m)return 'Developed length = '+displayDimensions(m[1]);
    m=value.match(/^Pli ([A-Z] → [A-Z])$/);
    if(m)return 'Bend '+m[1];
    m=value.match(/^Sens du pli (\d+)$/);
    if(m)return 'Bend '+m[1]+' direction';
    // Strict presentation patterns. No catalogue records, option values or
    // customer content are rewritten; manufacturer colour names remain source labels.
    m=value.match(/^(\d+) (nuances?|nuances référencées|couleurs documentées)$/);
    if(m)return m[1]+' '+(m[1]==='1'?'colour':'colours')+(m[2].includes('documentées')?' documented':m[2].includes('référencées')?' listed':'');
    m=value.match(/^(\d+) références?( · .+)$/);
    if(m)return m[1]+' '+(m[1]==='1'?'reference':'references')+m[2];
    m=value.match(/^(\d+) fabricants · choisissez votre collection$/);
    if(m)return m[1]+' manufacturers · choose a collection';
    m=value.match(/^(\d+) cotes? ou détails? à renseigner$/);
    if(m)return m[1]+' measurements or details to enter';
    m=value.match(/^([\d.,]+) pi² par pièce complète \(surface utile\)\.$/);
    if(m)return m[1].replace(',','.')+' sq. ft. per full piece (usable coverage).';
    m=value.match(/^([\d\s,\u00a0]+) éléments par (boîte|paquet)\. (.*)$/);
    if(m)return Number(m[1].replace(/[\s,\u00a0]/g,'')).toLocaleString('en-CA')+' items per '+(m[2]==='boîte'?'box':'pack')+'. '+translate(m[3],'en-CA');
    m=value.match(/^([\d.,]+) pi² utiles par pièce\. (.*)$/);
    if(m)return m[1].replace(',','.')+' usable sq. ft. per piece. '+translate(m[2],'en-CA');
    m=value.match(/^([\d\s,.\u00a0]+)\s*\$\s*(?:CA)?\s*\/\s*(.+)$/);
    if(m){const amount=Number(m[1].replace(/[\s\u00a0]/g,'').replace(',','.'));if(Number.isFinite(amount))return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(amount)+' / '+translate(m[2],'en-CA');}
    m=value.match(/^(Longueur|Longueurs|Largeur) : (.+)$/);
    if(m)return ({Longueur:'Length',Longueurs:'Lengths',Largeur:'Width'})[m[1]]+': '+displayDimensions(m[2]);
    m=value.match(/^Couleurs (.+)$/);
    if(m)return m[1]+' colours';
    m=value.match(/^(.+) : voir les matériaux$/);
    if(m&&Object.prototype.hasOwnProperty.call(dict,m[1]))return translate(m[1],'en-CA')+': view materials';
    if(/^[\d¼½¾⅛⅜⅝⅞]/.test(value)&&/\b(?:po|pi)\b/.test(value)&&!/[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(value.replace(/largeur réelle|nominal|visibles|po|pi|PID|mils|mm|cm|m/g,'')))return displayDimensions(value);
    const sourcePrefixes=[
      ['Document du produit. ','Product document. '],
      ['Document du système ou de la gamme. ','System or product-line document. '],
      ['Visuel fabricant · ','Manufacturer image · '],
      ['Référence fabricant; disponibilité, délai et offre MIR à confirmer. Affichage écran indicatif. ','Manufacturer reference; confirm availability, lead time and the MIR offering. Screen colours are indicative. ']
    ];
    for(const [source,target]of sourcePrefixes){if(value.startsWith(source))return target+translate(value.slice(source.length),'en-CA');}
    for(const separator of [' · ',' / ']){
      if(value.includes(separator)){
        const parts=value.split(separator);
        if(parts.every(part=>Object.prototype.hasOwnProperty.call(dict,part)))return parts.map(part=>dict[part]).join(separator);
      }
    }
    return value;
  }
  function displayDimensions(value){
    return String(value).replace(/(\d),(\d)/g,'$1.$2').replace(/\bpo²/g,'sq. in.').replace(/\bpi²/g,'sq. ft.').replace(/\bpo\b/g,'in.').replace(/\bpi\b/g,'ft').replace(/largeur réelle/g,'actual width').replace(/visibles/g,'exposure').replace(/ à /g,' to ');
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
  // Export-time view only. Never mutate the saved drawing, customer notes,
  // material catalogue or existing PDF configuration.
  function pdfText(value){
    if(typeof value!=='string')return value;
    const exact=translate(value,'en-CA');
    if(exact!==value)return exact;
    // Exact approved terminology on dimensioned client sheets. No lookup
    // service; never change a saved user note, SKU or manufacturer colour.
    const staticSheet={
      'DOSSIER DE PLIAGE':'CUSTOM BENDING FILE',
      'Demande de soumission':'Quote request',
      'Récapitulatif de pliage':'Bending summary',
      'Mise en production':'Production sheet',
      'MATÉRIAU / FINI':'MATERIAL / FINISH',
      'QUANTITÉ / LONGUEUR':'QUANTITY / LENGTH',
      'COTES FINIES ET POINTS À VALIDER':'FINISHED DIMENSIONS AND ITEMS TO VERIFY',
      'Soumission obligatoire':'Quote required',
      'Disponibilité à confirmer':'Availability to confirm',
      'à préciser':'to confirm',
      'à valider.':'to confirm.',
      'l’étoile':'the star',
      'par l’atelier et le fournisseur.':'by the workshop and supplier.',
      'personnalisée, y compris RAL, exige une':'including RAL, requires a',
      'personnalisée, y compris RAL, exige une soumission. Aucun prix automatique.':'including RAL, requires a quote. No automatic pricing.',
      'Toute couleur personnalisée, y compris RAL, exige une soumission. Aucun prix automatique.':'All custom colours, including RAL, require a quote. No automatic pricing.',
      'soumission. Aucun prix automatique.':'quote. No automatic pricing.',
      'La référence spéciale doit être confirmée':'The special reference must be confirmed',
      'Soumission obligatoire : Toute couleur':'Quote required: Any custom colour',
      'Notes : Aucune commande transmise; détails':'Notes: No order submitted; details',
      'Face 1 — côté indiqué par':'Face 1 — side marked by',
      'Face 2 — côté indiqué par':'Face 2 — side marked by',
      'La référence spéciale doit être confirmée par l’atelier et le fournisseur.':'The special reference must be confirmed by the workshop and supplier.',
      'Soumission obligatoire : Toute couleur personnalisée, y compris RAL, exige une soumission. Aucun prix automatique.':'Quote required: All custom colours, including RAL, require a quote. No automatic price.'
    };
    if(Object.prototype.hasOwnProperty.call(staticSheet,value))return staticSheet[value];
    // Some SVG renderers split this fixed business warning after the prefix.
    // Translate only the known fixed fragments; never translate customer notes.
    if(value.startsWith('Soumission obligatoire : Toute couleur personnalisée, y compris RAL, exige une soumission. Aucun prix automatique.'))return value.replace('Soumission obligatoire : Toute couleur personnalisée, y compris RAL, exige une soumission. Aucun prix automatique.','Quote required: All custom colours, including RAL, require a quote. No automatic pricing.');
    const prefixes=[
      [/^Pli /,'Bend '],
      [/^Développé total = /,'Developed length = '],
      [/^Développé de tôle : /,'Developed sheet: '],
      [/^Face colorée : /,'Painted face: '],
      [/^Soumission obligatoire : /,'Quote required: '],
      [/^Emplacement : /,'Location: '],
      [/^Notes : /,'Notes: '],
      [/^Surface tarifée = /,'Priced area = '],
      [/^Tarif MIR = /,'MIR rate = '],
      [/^Prix par pièce = /,'Price per piece = '],
      [/^Majoration aluminium : /,'Aluminum surcharge: '],
      [/^A hors tout, lips compris = /,'A overall, including lips = '],
      [/^B hors tout, lips compris = /,'B overall, including lips = '],
      [/^C projection = /,'C projection = ']
    ];
    let technical=value;
    for(const [re,label]of prefixes)technical=technical.replace(re,label);
    // Translate unit abbreviations in document labels only: no conversions.
    if(technical!==value||/[\d½¼¾⅛⅜⅝⅞]\s*po(?:²)?\b/.test(value)){
      technical=technical.replace(/Face ([12]) — côté indiqué par/g,'Face $1 — side marked by')
        .replace(/\bpo²\b/g,'sq in').replace(/(\d(?:[0-9\s.,½¼¾⅛⅜⅝⅞/]*))\s+po\b/g,'$1 in.');
      return technical;
    }
    const patterns=[
      [/^Quantité : (.+)$/,'Quantity: $1'],
      [/^Longueur L : (.+)$/,'Length L: $1'],
      [/^Total : (.+) pi linéaires?$/,'Total: $1 linear ft'],
      [/^Produit : (.+)$/,'Product: $1'],
      [/^Fabricant : (.+)$/,'Manufacturer: $1'],
      [/^Couleur : (.+)$/,'Colour: $1'],
      [/^Face peinte : intérieure$/,'Painted face: inside'],
      [/^Face peinte : extérieure$/,'Painted face: outside'],
      [/^Épaisseur : (.+)$/,'Thickness: $1'],
      [/^Repère : (.+)$/,'Reference: $1'],
      [/^Pièce (\d+) — (.+)$/,'Piece $1 — $2'],
      [/^([A-E]) — (Hauteur|Retour|Dos|Fond|Face|Côté gauche|Côté droit|Sous-face) : (.+)$/,'$1 — $2: $3'],
      [/^(.+) pièce\(s\)$/,'$1 pieces'],
      [/^(.+) pi linéaires?$/,'$1 linear ft']
    ];
    for(const [pattern,template]of patterns){
      if(pattern.test(value)){
        const result=value.replace(pattern,template);
        // Replace only approved technical terms, not free text or identifiers.
        if(pattern.source.includes('Hauteur|Retour')){
          return result.replace(/\bHauteur\b/g,'Height').replace(/\bRetour\b/g,'Return')
            .replace(/\bDos\b/g,'Back').replace(/\bFond\b/g,'Bottom')
            .replace(/\bFace\b/g,'Face').replace(/\bCôté gauche\b/g,'Left side')
            .replace(/\bCôté droit\b/g,'Right side').replace(/\bSous-face\b/g,'Underside');
        }
        return result;
      }
    }
    return value;
  }
  // The checkout/Studio store can contain a user-entered string identical to
  // a UI label ("Panier", "Boutique", etc.). It is never translated in PDF output.
  // Read approved local stores only; no writes, network, or new persistent key.
  function customerPdfProtectedStrings(){
    const originals=new Set(),notes=new Set();
    const fields=/^(?:project|name|note|notes|subject|body|label|title|email|street|address|city|recipient|location|colour|color|colorName|code|sku|reference|manufacturerReference|manufacturer|brand|description)$/i;
    const walkFields=(value,key='',depth=0)=>{
      if(depth>16||value===null)return;
      if(typeof value==='string'){
        if(fields.test(key)&&value.trim()){
          originals.add(value.trim());
          if(/^(note|notes|body|description)$/i.test(key))notes.add(value.trim());
        }
      }else if(Array.isArray(value)){
        if(value.length>1000)return;
        for(const v of value)walkFields(v,key,depth+1);
      }else if(typeof value==='object'){
        for(const [k,v]of Object.entries(value).slice(0,100))walkFields(v,k,depth+1);
      }
    };
    for(const key of ['mir-shopping-list-v1','mir_production_client_dossier_v1','mir-bending-v1']){
      try{
        const data=JSON.parse(root.localStorage?.getItem(key)||'null');
        if(data&&typeof data==='object')walkFields(data);
      }catch{}
    }
    return {originals,notes};
  }
  function protectedPdfText(value,protectedContent){
    const source=String(value||'').trim();
    if(protectedContent.originals.has(source))return source;
    const notePrefix=source.match(/^(Notes?\s*:\s*|Emplacement\s*:\s*)(.*)$/);
    if(notePrefix&&[...protectedContent.notes].some(note=>note.includes(notePrefix[2]))) {
      return notePrefix[1].startsWith('Note')?'Notes: '+notePrefix[2]:'Location: '+notePrefix[2];
    }
    // A long user note can be wrapped into several SVG <text> fragments.
    if(source.length>=4&&[...protectedContent.notes].some(note=>note.includes(source)))return source;
    return null;
  }
  function translateSvgLabels(svg,protectedContent=customerPdfProtectedStrings()){
    if(typeof svg!=='string'||typeof root?.DOMParser!=='function')return svg;
    const parsed=new root.DOMParser().parseFromString(svg,'image/svg+xml');
    if(parsed.querySelector('parsererror')||parsed.documentElement.localName!=='svg')return svg;
    // SVG text nodes only. Paths, cotes, viewBox, transform and every geometry
    // attribute remain untouched. Arbitrary notes retain their original text.
    for(const textNode of parsed.querySelectorAll('text,tspan')){
      for(const child of [...textNode.childNodes]){
        if(child.nodeType!==3)continue;
        const before=child.nodeValue,source=before.trim();
        const protectedValue=protectedPdfText(source,protectedContent);
        // A single long workshop warning can be split at arbitrary points
        // by the existing PDF layout. Translate the fixed warning fragment
        // only after checking protected customer-authored text.
        let after=protectedValue===null?pdfText(source):protectedValue;
        if(protectedValue===null&&after===source&&source.includes('personnalisée, y compris RAL, exige une soumission. Aucun prix automatique.')){
          after=source.replace('personnalisée, y compris RAL, exige une soumission. Aucun prix automatique.','including RAL, requires a quote. No automatic pricing.');
        }
        if(after!==source)child.nodeValue=before.replace(source,after);
      }
    }
    return new root.XMLSerializer().serializeToString(parsed.documentElement);
  }
  function localizePdfOptions(options){
    if(!active||locale!=='en-CA'||staffReady()||!options||!Array.isArray(options.faces))return options;
    const protectedContent=customerPdfProtectedStrings();
    const readOnlyTranslation=text=>{
      if(typeof text!=='string')return text;
      return protectedPdfText(text,protectedContent)??pdfText(text);
    };
    const file=String(options.filename||'');
    const englishFile=file.endsWith('.pdf')&&!/-en-CA\.pdf$/i.test(file)
      ?file.replace(/\.pdf$/i,'-en-CA.pdf'):file;
    return {
      ...options,
      title:readOnlyTranslation(options.title),subtitle:readOnlyTranslation(options.subtitle),
      filename:englishFile,locale:'en-CA',
      faces:options.faces.map(face=>({
        ...face,
        svg:translateSvgLabels(face.svg,protectedContent),
        documentTitle:readOnlyTranslation(face.documentTitle),
        scaleNote:readOnlyTranslation(face.scaleNote),footerNote:readOnlyTranslation(face.footerNote),
        sidebarTitle:readOnlyTranslation(face.sidebarTitle),
        // Name and reference fields often contain customer-entered identifiers.
        // They are deliberately not rewritten.
        summary:Array.isArray(face.summary)?face.summary.map(row=>
          typeof row==='string'?readOnlyTranslation(row):
          row&&typeof row==='object'&&typeof row.label==='string'?{...row,label:readOnlyTranslation(row.label)}:
          row&&typeof row==='object'&&typeof row.text==='string'?{...row,text:readOnlyTranslation(row.text)}:row
        ):face.summary
      }))
    };
  }
  function installPdfAdapter(){
    if(!active||staffReady()||!root?.MIRPDF||root.MIRPDF.__mirClientLocaleWrapped)return false;
    const original=root.MIRPDF;
    root.MIRPDF=Object.freeze({
      ...original,
      __mirClientLocaleWrapped:true,
      exportPlan(options){return original.exportPlan(localizePdfOptions(options));},
      makePlan(options){return original.makePlan(localizePdfOptions(options));}
    });
    return true;
  }
  function excluded(node){
    const e=node?.nodeType===1?node:node?.parentElement;
    return !e || !!e.closest('script,style,noscript,textarea,[contenteditable],template,code,pre,[data-mir-user-content],.mir-help-message,.mir-chat-message,.mir-client-note,.mir-customer-note,.account-address h3,.account-address p,.mir-help-request strong,.mir-help-side section > h2,#selected-color-name,.mir-cart-finish,select[data-cart-color] option,.official-color b,[data-mir-source-color]');
  }
  // Catalogue paragraphs often join multiple independently sourced notes.
  // Translate exact curated segments only inside read-only product information.
  function catalogueComposite(value){
    if(locale!=='en-CA')return value;
    const clean=value.trim();
    if(Object.prototype.hasOwnProperty.call(dict,clean))return translate(value);
    const fragments=[];let masked=value;
    for(const source of cataloguePhrases){
      if(!masked.includes(source))continue;
      const token='\uE000'+fragments.length+'\uE001';fragments.push(dict[source]);masked=masked.split(source).join(token);
    }
    masked=translate(masked);
    return masked.replace(/\uE000(\d+)\uE001/g,(_,i)=>fragments[Number(i)]);
  }
  function updateText(node){
    if(node.nodeType!==3||excluded(node))return;
    const now=node.nodeValue;
    let info=sources.get(node);
    if(!info||now!==info.last){info={source:now,last:now};sources.set(node,info);}
    let next=translate(info.source);
    if(locale==='en-CA'&&node.parentElement?.closest('.product-source-note,.product-photo-note,.product-color-description,.document-note,.product-docs'))next=catalogueComposite(info.source);
    if(now!==next){info.last=next;node.nodeValue=next;}
  }
  function updateAttributes(el){
    if(!el||el.nodeType!==1||(excluded(el)&&el.tagName!=='TEXTAREA'))return;
    // HTML options without a value derive their business value from visible text.
    // Freeze the original value before localising the label (units must stay stable).
    if(el.tagName==='OPTION'&&!el.hasAttribute('value'))el.setAttribute('value',el.value);
    let info=attributes.get(el);
    if(!info){info=Object.create(null);attributes.set(el,info);}
    for(const name of ['aria-label','aria-description','placeholder','title','alt']){
      // Translate only the static prompt, never the customer's textarea content.
      if(el.tagName==='TEXTAREA'&&name!=='placeholder')continue;
      if(!el.hasAttribute(name))continue;
      if((name==='title'||name==='aria-label')&&el.matches('[data-color],[data-card-color]'))continue;
      const now=el.getAttribute(name),prior=info[name];
      if(!prior||prior.last!==now)info[name]={source:now,last:now};
      const translated=translate(info[name].source);
      if(translated!==now){info[name].last=translated;el.setAttribute(name,translated);}
    }
  }
  function walk(node){
    if(!node||node.nodeType===8)return;
    if(node.nodeType===3){updateText(node);return;}
    if(node.nodeType===1&&node.tagName==='TEXTAREA'){updateAttributes(node);return;}
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
      url.searchParams.set('clientLocale','1');
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
    const header=doc.querySelector('header.site-header,header.production-header,header.portal-header,header.mir-client-header');
    if(!header)return;
    // Harmony moves the original header actions into its collapsed menu.
    // Place the customer language control inside Harmony's owned title slot so
    // the control remains visible; do not touch or clone staff navigation.
    const harmonySlot=customerAccount()?header.querySelector('.mir-harmony-title'):null;
    let group=header.querySelector('.mir-client-locale-switch');
    if(group&&harmonySlot&&group.parentElement!==harmonySlot)harmonySlot.append(group);
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
      if(harmonySlot)harmonySlot.append(group);
      else if(actions.querySelector(':scope > .mir-public-cart'))actions.insertBefore(group,actions.querySelector(':scope > .mir-public-cart'));
      else if(account&&account.parentElement===actions)actions.insertBefore(group,account);
      else actions.prepend(group);
    }
    group.setAttribute('aria-label',locale==='en-CA'?'Client website language':'Langue du site client');
    for(const b of group.querySelectorAll('button[data-mir-locale]')){
      const on=b.dataset.mirLocale===locale;
      b.setAttribute('aria-pressed',String(on));
      b.setAttribute('aria-label',b.dataset.mirLocale==='en-CA'?(locale==='en-CA'?'English (Canada), selected':'Anglais canadien'):(locale==='en-CA'?'French (Canada)':'Français canadien, sélectionné'));
    }
  }
  // Customer-only visual dates: retain server timestamps/status IDs unchanged.
  // The existing internal/staff date() function is deliberately not modified.
  function customerDates(doc){
    if(!customerAccount()||doc.body?.dataset.portalMode!=='client')return;
    const account=root.MIRPortalActiveClient?.getStatus?.().account;
    if(!account?.orders?.length)return;
    const statuses={draft:'Brouillon',validated:'Validée',submitted:'À confirmer',sent:'Envoyée',shipped:'Expédiée',delivered:'Livrée',cancelled:'Annulée'};
    const fmt=value=>{
      if(!value)return '';
      const instant=new Date(value);
      if(!Number.isFinite(instant.getTime()))return '';
      return new Intl.DateTimeFormat(locale,{year:'numeric',month:'short',day:'numeric'}).format(instant);
    };
    const rows=doc.querySelectorAll('.customer-account .account-order');
    for(const [index,order]of account.orders.entries()){
      const card=rows[index];if(!card)continue;
      const stamp=fmt(order.createdAt),status=locale==='en-CA'
        ?translate(statuses[order.status]||order.status||'À confirmer','en-CA')
        :(statuses[order.status]||order.status||'À confirmer');
      const desc=card.querySelector('p');
      if(desc&&stamp){const next=stamp+' · '+status;if(desc.textContent!==next)desc.textContent=next;}
      card.querySelectorAll('li').forEach((item,i)=>{
        const event=order.events?.[i],dateLabel=fmt(event?.createdAt);if(!dateLabel)return;
        const label=event.label|| (locale==='en-CA'?'Status updated':'Statut mis à jour');
        const next=dateLabel+' · '+label;
        if(item.textContent!==next)item.textContent=next;
      });
    }
  }
  function stopForStaff(){
    locale='fr-CA';const doc=root.document;
    walk(doc.body);metadata(doc);
    doc.querySelectorAll('.mir-client-locale-switch').forEach(control=>control.remove());
    observer?.disconnect();observer=null;active=false;
  }
  function render(){
    if(!active)return;
    if(staffReady()||!isClient(root.location.pathname,root.location.search)){stopForStaff();return;}
    const doc=root.document;
    localeControl(doc);metadata(doc);walk(doc.body);customerDates(doc);clientLinks(doc);installPdfAdapter();
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
    // Approved public client release. isClient and staffReady guards above remain mandatory.
    // Locale preference never mutates the customer cart or any business record.
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
  return Object.freeze({version:'0.3.0-public',isClient,getLocale,setLocale,translate,number,cad,date,pdfText,localizePdfOptions,installPdfAdapter,init,render,KEY});
});