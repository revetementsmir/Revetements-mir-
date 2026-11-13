/* MIR employee store — LOCAL DEMONSTRATION ONLY.
 * Pure, serializable model: no fetch, storage, authentication, emails or backend.
 * Actor checks simulate the intended workflow; they are not a security boundary.
 * Catalogue IDs are internal references, never invented supplier SKUs.
 * Unknown stock remains null. Reservation changes no physical stock; a delivery
 * decreases physical stock AND its reservation once, using a mandatory requestId.
 */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIREmployeeStore=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const VERSION=1,MODE='local_demo',DEMO_TIME='2026-11-04T00:00:00.000Z';
  const CATEGORIES=Object.freeze([
    {id:'fixations',name:'Fixations'},
    {id:'membranes-joints',name:'Membranes et joints'},
    {id:'soffites-moulures',name:'Soffites et moulures'},
    {id:'lames-consommables',name:'Lames et consommables'},
    {id:'revetements',name:'Revêtements'},
    {id:'pliages',name:'Pliages sur mesure'}
  ].map(Object.freeze));
  const DEMO_IDS=Object.freeze({admin:'demo-admin',employee1:'demo-employee-1',employee2:'demo-employee-2',job1:'demo-job-1',job2:'demo-job-2'});
  const copy=v=>JSON.parse(JSON.stringify(v));
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const clean=s=>typeof s==='string'?s.trim():'';
  const sum=a=>a.reduce((n,v)=>n+v,0);
  const materialsOf=v=>Array.isArray(v)?v:Array.isArray(v?.materials)?v.materials:[];
  const error=(code,message,details)=>({code,message,...(details?{details}:{})});
  const fail=(code,message,details)=>{throw error(code,message,details);};
  const validDate=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
  const normalizedBrand=s=>String(s||'').toLowerCase().replace(/ canada$/,'').trim();
  function categoryFor(m){
    const a=m.applications||[];
    if(a.includes('fastener')||/Fixation/i.test(m.family||''))return 'fixations';
    if(a.includes('sealant')||a.includes('siding-joint')||/Membrane/i.test(m.family||''))return 'membranes-joints';
    if(a.includes('touch-up'))return 'lames-consommables';
    if(a.includes('bending')||a.includes('capping'))return 'pliages';
    if(a.includes('siding')||a.includes('architectural-panel'))return 'revetements';
    return 'soffites-moulures';
  }
  function requestUnit(m){
    const u=String(m.unit||'').toLowerCase(),a=m.applications||[];
    if(/^paquet(?:\s|$)/.test(u))return 'paquet';
    if(/^pièce(?:\s|$)/.test(u))return 'pièce';
    if(/^boîte(?:\s|$)/.test(u))return 'boîte';
    if(/^à confirmer$/.test(u))return 'à confirmer';
    if(a.includes('fastener')||/Fixation/i.test(m.family||''))return 'boîte';
    if(/rouleau|bobine/i.test(m.name||'')||/rouleau/.test(u))return 'rouleau';
    if(a.includes('sealant'))return 'cartouche';
    if(a.includes('touch-up'))return /kit/i.test(m.name||'')?'kit':'contenant';
    if(/membrane/i.test(m.family||''))return 'rouleau';
    if(a.includes('bending')||a.includes('capping'))return 'feuille';
    return 'pièce';
  }
  function paletteFor(materials,brand){
    const found=new Map();
    for(const m of materials.filter(m=>normalizedBrand(m.brand)===normalizedBrand(brand)))for(const c of m.colors||[]){
      if(!c.id||!c.name||c.verified===false||found.has(c.id))continue;
      found.set(c.id,{id:c.id,name:c.name,swatchImage:c.swatchImage||c.swatchUrl||null,sourceUrl:c.sourceUrl||m.sourceUrl||null,
        sourceMaterialId:m.id,scope:'manufacturer_request_only',availabilityConfirmedForItem:false});
    }return [...found.values()];
  }
  function buildCatalogue(materials){
    const source=materialsOf(materials),items=[];
    for(const m of source){
      if(m.excludeFromCommerce===true||m.commercialStatus==='not_for_sale'||m.status==='visualization_only'||
        (m.applications||[]).some(a=>a==='roofing'||a==='masonry'))continue;
      const category=categoryFor(m),pending=m.orderable===false||m.configurationRequired===true||/pending_identity|supplier_identity_to_confirm|procurement_pending/.test(m.status||'');
      let colors=(m.colors||[]).filter(c=>c.id&&c.name&&c.verified!==false).map(c=>({...copy(c),scope:'product_reference',
        swatchImage:c.swatchImage||c.swatchUrl||null,sourceUrl:c.sourceUrl||m.sourceUrl||null}));
      let colorScope=m.colorStatus==='collection_only'?'manufacturer_request_only':'product_reference';
      const wantsColor=(m.applications||[]).some(a=>['siding','architectural-panel','soffit','fascia','trim','opening-trim','band','touch-up','siding-joint','bending','capping','sealant'].includes(a))||m.id==='pending-kaycan-fascia-hex-quarter-inch'||(m.applications||[]).includes('fastener')&&colors.length>0;
      if(!colors.length&&wantsColor&&m.colorStatus!=='primed_only'){
        colors=paletteFor(source,m.brand);colorScope='manufacturer_request_only';
      }
      const fixedFinish=colors.length===1&&colors[0].finishOption===true?colors[0]:null;
      const colorPolicy=['primed_only','not_applicable'].includes(m.colorStatus)||fixedFinish?'none':colors.length&&wantsColor?'required':'none';
      const colorNote=colorScope==='manufacturer_request_only'&&colors.length
        ?'Teinte du fabricant demandée; disponibilité sur cette référence à confirmer.'
        :wantsColor&&!colors.length&&m.colorStatus!=='primed_only'?'Référence de teinte à confirmer; aucune palette générique ajoutée.':null;
      const unit=requestUnit(m);
      items.push({id:m.id,materialId:m.id,name:m.name,description:m.description||'',brand:m.brand||null,category,unit,unitLabel:m.unit||unit,
        unitBasis:'internal_request_unit',quantityStep:1,sku:null,manufacturerReference:m.manufacturerCode||m.dimensions?.manufacturerPid||null,
        packaging:copy(m.packaging||{}),mirPreferred:m.mirPreferred===true,
        formats:copy((m.formats||[]).filter(f=>clean(f.id)&&finite(f.lengthIn)&&f.lengthIn>0)),
        colorPolicy,colors,colorScope,colorNote,baseColorId:m.colorStatus==='primed_only'?'primed':fixedFinish?.id||null,
        baseColorName:m.colorStatus==='primed_only'?'Apprêté':fixedFinish?.name||null,dimensions:copy(m.dimensions||{}),
        stockLengthIn:finite(m.dimensions?.lengthIn)?m.dimensions.lengthIn:null,measureFields:[],profile:null,
        status:pending?'to_identify':'reference',statusLabel:m.configurationRequired===true?'Configuration à confirmer':pending?'Référence à confirmer':'Référence catalogue',
        ...(m.configurationRequired===true?{configurationRequired:true,configurationUrl:m.configurationUrl||null}:{}),
        referencePending:pending,orderable:m.orderable!==false,orderableReason:m.orderableReason||null,primaryImage:m.primaryImage||m.images?.[0]?.src||null,
        sourceUrl:m.sourceUrl||null,documents:copy(m.documents||[]),notes:copy(m.notes||[]),
        commercialNote:'Demande interne de démonstration; prix, stock réel et unité de vente MIR non connectés.',active:true});
    }
    const add=record=>{if(!items.some(i=>i.id===record.id))items.push({materialId:null,brand:null,unit:'pièce',quantityStep:1,
      sku:null,manufacturerReference:null,colorPolicy:'none',colors:[],dimensions:{},measureFields:[],profile:null,
      stockLengthIn:null,primaryImage:null,sourceUrl:null,documents:[],notes:[],status:'request',statusLabel:'Demande MIR',
      referencePending:false,active:true,unitBasis:'internal_request_unit',commercialNote:'Article demandé à MIR; aucune référence fournisseur inventée.',...record});};
    add({id:'mir-starter-10ft',name:'Moulure de départ — 10 pi',category:'soffites-moulures',unit:'longueur',stockLengthIn:120,
      dimensions:{lengthIn:120},profile:'starter',colorPolicy:'none',notes:['Règle atelier MIR : aucune couleur à sélectionner. Longueur de préparation de 10 pi, pas un SKU fournisseur.']});
    add({id:'mir-rodent-guard-10ft',name:'Moulure anti-rongeur — 10 pi',category:'soffites-moulures',unit:'longueur',stockLengthIn:120,
      dimensions:{lengthIn:120},profile:'rodent-guard',colorPolicy:'none',notes:['Règle atelier MIR : aucune couleur à sélectionner. Longueur de préparation de 10 pi, pas un SKU fournisseur.']});
    const pendingItems=[
      {id:'mir-request-hardie-screws',name:'Vis pour revêtement James Hardie — référence à préciser',brand:null,category:'fixations',unit:'boîte',notes:['Compatibilité, support, longueur et conditionnement à confirmer. Ne désigne pas une vis fabriquée par James Hardie.']},
      {id:'pending-3m-white-membrane-3in',name:'Membrane blanche 3 po — référence 3M à confirmer',brand:'3M',category:'membranes-joints',unit:'rouleau'},
      {id:'pending-kaycan-fascia-hex-quarter-inch',name:'Vis à fascia — tête hexagonale ¼ po, teinte Kaycan à confirmer',brand:'Kaycan',category:'fixations',unit:'boîte'},
      {id:'mir-request-gentek-coil-100ft',name:'Rouleau aluminium Gentek — demande de 100 pi exacts à confirmer',brand:'Gentek Canada',category:'pliages',unit:'rouleau',notes:['Ne remplace pas silencieusement cette demande par le 3037 documenté à 98,5 pi.']},
      {id:'mir-request-fibre-cement-blade',name:'Lame pour fibrociment — diamètre et alésage à préciser',category:'lames-consommables',unit:'pièce'},
      {id:'mir-request-metal-blade',name:'Lame pour métal — format et outil à préciser',category:'lames-consommables',unit:'pièce'},
      {id:'mir-request-driver-bits',name:'Embouts de vissage — profil et dimension à préciser',category:'lames-consommables',unit:'ensemble'},
      {id:'mir-request-adfast',name:'Adfast — produit complémentaire à préciser',brand:'Adfast',category:'membranes-joints',unit:'unité'},
      {id:'mir-request-soffit-staples-1in',name:'Broches à soffite — 1 po',category:'fixations',unit:'boîte',dimensions:{lengthIn:1},
        notes:['Longueur demandée par MIR : 1 po. Couronne, calibre, fini, cloueuse et conditionnement à identifier.']},
      {id:'mir-request-maibec-staples',name:'Broches pour Maibec — référence à préciser',category:'fixations',unit:'boîte',
        notes:['Usage demandé pour Maibec; aucune broche fabricant ou compatibilité de pose n’est inventée. Vérifier longueur, couronne, calibre, protection et outil.']},
      {id:'mir-request-framing-nails-3-1-4in',name:'Clous à charpente — 3¼ po',category:'fixations',unit:'boîte',dimensions:{lengthIn:3.25},
        notes:['Longueur demandée par MIR : 3¼ po. Angle, reliure, calibre, fini et conditionnement à identifier.']},
      {id:'mir-request-tuck-tape-red',name:'Tuck Tape rouge — format à préciser',brand:'Tuck Tape',category:'membranes-joints',unit:'rouleau',
        baseColorId:'requested-red',baseColorName:'Rouge',notes:['Marque et teinte demandées par MIR; référence, largeur, longueur du rouleau et application à confirmer.']},
      {id:'mir-request-fibro-joint-paper-6in',name:'Papier joint fibrociment — 6 po',category:'membranes-joints',unit:'rouleau',dimensions:{widthIn:6},
        notes:['Largeur demandée par MIR : 6 po. Matière, longueur, conditionnement et compatibilité du système de parement à confirmer.']},
      {id:'mir-request-fibro-joint-paper-8in',name:'Papier joint fibrociment — 8 po',category:'membranes-joints',unit:'rouleau',dimensions:{widthIn:8},
        notes:['Largeur demandée par MIR : 8 po. Matière, longueur, conditionnement et compatibilité du système de parement à confirmer.']},
      {id:'mir-request-soffit-j-black-12ft',name:'J à soffite noir — 12 pi',category:'soffites-moulures',unit:'longueur',profile:'J',stockLengthIn:144,
        dimensions:{lengthIn:144},baseColorId:'requested-black',baseColorName:'Noir',notes:['Demande MIR : J à soffite noir de 12 pi. Fabricant, code couleur et dimensions du profil à identifier.']},
      {id:'mir-request-soffit-j-white-12ft',name:'J à soffite blanc — 12 pi',category:'soffites-moulures',unit:'longueur',profile:'J',stockLengthIn:144,
        dimensions:{lengthIn:144},baseColorId:'requested-white',baseColorName:'Blanc',notes:['Demande MIR : J à soffite blanc de 12 pi. Fabricant, code couleur et dimensions du profil à identifier.']},
      {id:'mir-request-olfa-blades-1in',name:'Lames OLFA — 1 po, format à préciser',brand:'OLFA',category:'lames-consommables',unit:'paquet',
        notes:['Format demandé par MIR : 1 po. Référence de lame, largeur réelle, compatibilité du couteau et nombre par paquet à confirmer.']},
      {id:'mir-request-saw-blade-wood-7-1-4in',name:'Lame de scie à bois — 7¼ po',category:'lames-consommables',unit:'pièce',dimensions:{diameterIn:7.25},
        notes:['Diamètre demandé par MIR : 7¼ po. Alésage, denture, vitesse admissible et compatibilité de la scie à confirmer.']},
      {id:'mir-request-saw-blade-fibro-7-1-4in',name:'Lame de scie à fibrociment — 7¼ po',category:'lames-consommables',unit:'pièce',dimensions:{diameterIn:7.25},
        notes:['Diamètre demandé par MIR : 7¼ po. Référence, alésage et outil compatible à identifier; aucune lame universelle présumée.']},
      {id:'mir-request-track-saw-blade-fibro',name:'Lame de scie sur rail (track saw) — fibrociment',category:'lames-consommables',unit:'pièce',
        notes:['Fabricant et modèle de scie, diamètre, alésage et trait de coupe à préciser avant choix de la lame.']},
      {id:'mir-request-track-saw-blade-wood',name:'Lame de scie sur rail (track saw) — bois',category:'lames-consommables',unit:'pièce',
        notes:['Fabricant et modèle de scie, diamètre, alésage, denture et trait de coupe à préciser avant choix de la lame.']},
      {id:'mir-request-fascia-screws-black-2in',name:'Vis à fascia noires — 2 po · tête hexagonale ¼ po',brand:'Kaycan',category:'fixations',unit:'boîte',
        dimensions:{lengthIn:2,hexHeadIn:0.25},baseColorId:'requested-kaycan-black',baseColorName:'Noir — référence Kaycan à confirmer',
        notes:['Longueur, tête et teinte demandées par MIR. Fournisseur de la vis, code de couleur Kaycan, calibre, protection et conditionnement à identifier.']},
      {id:'mir-request-fascia-screws-white-2in',name:'Vis à fascia blanches — 2 po · tête hexagonale ¼ po',brand:'Kaycan',category:'fixations',unit:'boîte',
        dimensions:{lengthIn:2,hexHeadIn:0.25},baseColorId:'requested-kaycan-white',baseColorName:'Blanc — référence Kaycan à confirmer',
        notes:['Longueur, tête et teinte demandées par MIR. Fournisseur de la vis, code de couleur Kaycan, calibre, protection et conditionnement à identifier.']}
    ];
    for(const item of pendingItems)add({...item,status:'to_identify',statusLabel:'Référence à confirmer',referencePending:true});

    // Import ciblé de la revue du magasin ChatGPT Sites (annotations MIR v32).
    // Les IDs existants restent les clés des paniers et commandes historiques.
    const revise=(id,changes)=>{const target=items.find(item=>item.id===id);if(target)Object.assign(target,changes);};
    revise('mir-request-soffit-staples-1in',{
      name:'PRIME 40713 — Agrafes à soffite 1 po · 5 000/boîte',brand:'PRIME',
      manufacturerReference:'40713',packaging:{piecesPerBox:5000},dimensions:{lengthIn:1},
      notes:['Référence PRIME 40713 confirmée par MIR : 1 po, 5 000 par boîte. Vérifier la compatibilité de l’agrafeuse et la couronne avant préparation.'],
      status:'reference',statusLabel:'Référence MIR',referencePending:false
    });
    revise('mir-request-adfast',{
      name:'ADSEAL — Lingettes nettoyantes universelles',brand:'Adfast',category:'lames-consommables',
      unit:'contenant',packaging:{piecesPerBox:90},
      sourceUrl:'https://lesideesdepoxy.com/products/lingettes-nettoyantes-universelles-adseal',
      notes:['Nettoyage des résidus non durcis de scellant, silicone, colle ou mousse. Nombre de lingettes et photo de l’emballage à confirmer avant achat : des contenants ADFAST de 72 existent aussi.'],
      status:'to_identify',statusLabel:'Emballage à confirmer',referencePending:true
    });
    const kaycanColorRequests=paletteFor(source,'Kaycan').filter(color=>!/^(noir|blanc)(?:\s|$)/i.test(color.name));
    revise('pending-kaycan-fascia-hex-quarter-inch',{
      name:'Vis à fascia — 2 po · hex ¼ po · couleur Kaycan',brand:'Kaycan',
      dimensions:{lengthIn:2,hexHeadIn:0.25},
      colorPolicy:kaycanColorRequests.length?'required':'none',colors:kaycanColorRequests,
      colorScope:'manufacturer_request_only',
      colorNote:'Teinte demandée selon la palette Kaycan; la disponibilité sur les vis doit être confirmée.',
      notes:['Vis à fascia 2 po, tête hexagonale ¼ po, sans rondelle. Vérifier code et conditionnement fournisseur.']
    });
    revise('mir-request-fascia-screws-black-2in',{
      name:'Vis à fascia — 2 po · hex ¼ po · noir',baseColorName:'Noir',
      notes:['Sans rondelle. La tête et l’ourlet sont noirs; filets métalliques. Vérifier les caractéristiques et le conditionnement.']
    });
    revise('mir-request-fascia-screws-white-2in',{
      name:'Vis à fascia — 2 po · hex ¼ po · blanc',baseColorName:'Blanc',
      notes:['Sans rondelle. La tête et l’ourlet sont blancs; filets métalliques. Vérifier les caractéristiques et le conditionnement.']
    });
    // Une fiche par profil CanExel. La palette indique une demande de couleur,
    // jamais une preuve de stock pour la moulure de joint.
    const canexelColors=[...new Map(source.filter(m=>/canexel/i.test((m.brand||'')+' '+(m.name||'')))
      .flatMap(m=>m.colors||[]).filter(c=>c.id&&c.name&&c.verified!==false)
      .map(c=>[c.id,{id:c.id,name:c.name,swatchImage:c.swatchImage||c.swatchUrl||null,scope:'manufacturer_request_only',availabilityConfirmedForItem:false}])).values()];
    [
      ['canexel-joint-cedrvue-6','Ced’R-Vue 6 po',false],
      ['canexel-joint-cedrvue-9','Ced’R-Vue 9 po',true],
      ['canexel-joint-ridgewood-d5-12','Ridgewood D-5 12 po',true],
      ['canexel-joint-vstyle-12','VStyle 12 po',true]
    ].forEach(([id,profile,documented])=>add({
      id,name:'CanExel — Moulure de joint '+profile,brand:'Maibec CanExel',
      category:'membranes-joints',unit:'pièce',colors:copy(canexelColors),
      colorPolicy:canexelColors.length?'required':'none',colorScope:'manufacturer_request_only',
      colorNote:documented?'Couleur demandée; stock et compatibilité à valider.':'Moulure de joint aluminium 6 po non confirmée par le guide Maibec 2026.',
      sourceUrl:'https://maibec.com/fr/produits/canexel/',
      notes:[documented?'Moulure de joint aluminium documentée dans le guide Maibec 2026; photo exacte et couleur à confirmer.':'Profil Ced’R-Vue 6 po documenté, mais moulure de joint aluminium 6 po non confirmée; ne pas substituer une moulure 9 po.'],
      status:'to_identify',statusLabel:'Moulure à vérifier',referencePending:true
    }));
    // Demandé sur ChatGPT Sites : conserver noir/blanc à 100 pi et
    // permettre les demandes couleur en 10, 20, 50 ou 100 pi sans inventer de SKU.
    for(const [id,name,color,base] of [
      ['mir-coil-black-100ft','Rouleau aluminium noir · 100 pi','Noir','requested-black'],
      ['mir-coil-white-100ft','Rouleau aluminium blanc · 100 pi','Blanc','requested-white']
    ])add({id,name,category:'pliages',unit:'rouleau',brand:'MIR',stockLengthIn:1200,
      dimensions:{lengthIn:1200},baseColorId:base,baseColorName:color,
      notes:['Demande d’atelier 100 pi; fabricant, largeur, calibre et référence fournisseur à confirmer.'],
      referencePending:true,status:'to_identify',statusLabel:'Format à confirmer'});
    for(const brand of ['Kaycan','Gentek Canada']){
      const bid=brand==='Kaycan'?'kaycan':'gentek';
      const palette=paletteFor(source,brand);
      add({id:'mir-coil-color-'+bid,name:'Rouleau aluminium couleur — '+brand,brand,
        category:'pliages',unit:'rouleau',
        colors:palette,colorPolicy:palette.length?'required':'none',
        colorScope:'manufacturer_request_only',
        formats:[10,20,50,100].map(feet=>({id:bid+'-'+feet+'ft',label:feet+' pi',lengthIn:feet*12})),
        notes:['Longueurs 10/20/50/100 pi demandées par MIR; confirmer stock, coupe et teinte avant préparation.'],
        referencePending:true,status:'to_identify',statusLabel:'Longueur à confirmer'});
    }
    for(const item of items){
      if(!/kaycan|quality edge|truvent/i.test(item.brand||''))continue;
      if(!/soffit|soffite|truvent/i.test(item.name||''))continue;
      const black=item.colors?.find(c=>/\bnoir\b|^black$/i.test(c.name||''));
      if(black&&item.colorPolicy==='required'){item.baseColorId=black.id;item.baseColorName=black.name;}
    }

    const brands=[{id:'kaycan',name:'Kaycan',metal:'aluminium'},{id:'gentek',name:'Gentek Canada',metal:'aluminium'},{id:'vicwest',name:'Vicwest',metal:'acier'}];
    const trimProfiles=[
      ['window-l','L de fenêtre','L',120],['soffit-j','J à soffite','J',144],
      ['corner-inside','Coin intérieur','corner-inside',120],['corner-outside','Coin extérieur','corner-outside',120],
      ['top-vent','Ventilation de haut de mur','top-vent',120],['vented-sill','Bas de fenêtre ventilé','vented-sill',120],
      ['panel-l-7-8','L 7/8 entre panneaux','panel-l-7/8',120],['panel-z','Z à panneau','Z',120],
      ['roof-l6','L 6 po au-dessus du toit','roof-l-6',120],['drip-edge','Goutte d’eau','drip-edge',120]
    ];
    const bends=[
      {id:'l',name:'Pliage en L',profile:'L',fields:[['A','Aile A'],['B','Aile B']]},
      {id:'j',name:'Pliage en J',profile:'J',fields:[['A','Âme A'],['B','Grande aile B'],['C','Retour C']]},
      {id:'z',name:'Pliage en Z',profile:'Z',fields:[['A','Hauteur A'],['B','Aile inférieure B'],['C','Aile supérieure C']]},
      {id:'fascia-l',name:'Fascia en L sur mesure',profile:'fascia-l',fields:[['A','Hauteur visible A'],['B','Retour inférieur B']]},
      {id:'beam',name:'Habillage de poutre (beam)',profile:'beam',fields:[['A','Dessous A'],['B','Côté B'],['C','Côté C']]},
      {id:'column',name:'Habillage de colonne',profile:'column',fields:[['A','Face A'],['B','Face B'],['C','Face C'],['D','Face D']]}
    ];
    for(const brand of brands){
      const colors=paletteFor(source,brand.name),colorPolicy='required';
      const common={brand:brand.name,metal:brand.metal,colors,colorPolicy,colorScope:'manufacturer_request_only',
        colorNote:'Teinte du fabricant demandée; disponibilité sur ce profil et choix de tôle à confirmer.',
        referencePending:false,sourceKind:'mir_workshop_request',statusLabel:'Profil demandé à MIR'};
      for(const [id,name,profile,length] of trimProfiles)add({...common,id:`mir-${id}-${brand.id}`,name:`${name} — ${length/12} pi · ${brand.name}`,
        category:'soffites-moulures',unit:'longueur',stockLengthIn:length,dimensions:{lengthIn:length},profile,
        notes:['Longueur selon la règle atelier MIR; profil, métal et disponibilité à confirmer avant préparation.']});
      for(const b of bends)add({...common,id:`mir-bend-${b.id}-${brand.id}`,name:`${b.name} · ${brand.name}`,category:'pliages',unit:'pièce',
        profile:b.profile,customBending:true,manufacturingReviewRequired:true,
        measureFields:[...b.fields.map(([key,label])=>({key,label,min:0,max:null,required:true})),{key:'L',label:'Longueur',min:0,max:120,required:true}],
        notes:['Cotes en pouces. Longueur maximale demandée : 10 pi selon la règle atelier MIR.',
          'Côté visible, retours, angles, épaisseur, rayons et largeur développée à valider avant fabrication. Aucune consommation automatique de bobine.']});
    }
    const deckmartSource='https://www.deckmart.com/products/maibec-canexel-aluminum-joint-mould';
    const deckmartVariants=[
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-acadia",
    "name": "Acadia",
    "supplierReference": "261-60311",
    "supplierVariantId": "50345495658778",
    "variantImage": "assets/products/employee-store/deckmart-ced9-acadia.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-acadia",
    "name": "Acadia",
    "supplierReference": "261-60337",
    "supplierVariantId": "50345504702746",
    "variantImage": "assets/products/employee-store/deckmart-d5-acadia.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-acadia",
    "name": "Acadia",
    "supplierReference": "261-63200",
    "supplierVariantId": "50351522087194",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-acadia.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-noir",
    "name": "Noir",
    "supplierReference": "261-60408",
    "supplierVariantId": "50345495691546",
    "variantImage": "assets/products/employee-store/deckmart-ced9-noir.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-noir",
    "name": "Noir",
    "supplierReference": "261-60407",
    "supplierVariantId": "50345504735514",
    "variantImage": "assets/products/employee-store/deckmart-d5-noir.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-noir",
    "name": "Noir",
    "supplierReference": "261-63202",
    "supplierVariantId": "50351522119962",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-noir.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-noir-2-0",
    "name": "Noir 2.0",
    "supplierReference": "261-61008",
    "supplierVariantId": "50345495724314",
    "variantImage": null,
    "imageVerified": false
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-noir-2-0",
    "name": "Noir 2.0",
    "supplierReference": "261-61007",
    "supplierVariantId": "50345504768282",
    "variantImage": "assets/products/employee-store/deckmart-d5-noir-2-0.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-noir-2-0",
    "name": "Noir 2.0",
    "supplierReference": "261-61011",
    "supplierVariantId": "50351522152730",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-noir-2-0.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-granit",
    "name": "Granit",
    "supplierReference": "261-60321",
    "supplierVariantId": "50345495757082",
    "variantImage": "assets/products/employee-store/deckmart-ced9-granit.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-granit",
    "name": "Granit",
    "supplierReference": "261-60347",
    "supplierVariantId": "50345504801050",
    "variantImage": "assets/products/employee-store/deckmart-d5-granit.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-granit",
    "name": "Granit",
    "supplierReference": "261-63207",
    "supplierVariantId": "50351522185498",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-granit.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-bleu-minuit",
    "name": "Bleu minuit",
    "supplierReference": "261-60322",
    "supplierVariantId": "50345495789850",
    "variantImage": "assets/products/employee-store/deckmart-ced9-bleu-minuit.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-bleu-minuit",
    "name": "Bleu minuit",
    "supplierReference": "261-60348",
    "supplierVariantId": "50345504833818",
    "variantImage": "assets/products/employee-store/deckmart-d5-bleu-minuit.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-bleu-minuit",
    "name": "Bleu minuit",
    "supplierReference": "261-63209",
    "supplierVariantId": "50351522218266",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-bleu-minuit.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-gris-brume",
    "name": "Gris brume",
    "supplierReference": "261-60313",
    "supplierVariantId": "50345495822618",
    "variantImage": "assets/products/employee-store/deckmart-ced9-gris-brume.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-gris-brume",
    "name": "Gris brume",
    "supplierReference": "261-60339",
    "supplierVariantId": "50345504866586",
    "variantImage": "assets/products/employee-store/deckmart-d5-gris-brume.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-gris-brume",
    "name": "Gris brume",
    "supplierReference": "261-63210",
    "supplierVariantId": "50351522251034",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-gris-brume.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-sable",
    "name": "Sable",
    "supplierReference": "261-60315",
    "supplierVariantId": "50345495855386",
    "variantImage": "assets/products/employee-store/deckmart-ced9-sable.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-sable",
    "name": "Sable",
    "supplierReference": "261-60341",
    "supplierVariantId": "50345504899354",
    "variantImage": "assets/products/employee-store/deckmart-d5-sable.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-sable",
    "name": "Sable",
    "supplierReference": "261-63213",
    "supplierVariantId": "50351522283802",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-sable.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-blanc",
    "name": "Blanc",
    "supplierReference": "261-60310",
    "supplierVariantId": "50345495888154",
    "variantImage": "assets/products/employee-store/deckmart-ced9-blanc.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-blanc",
    "name": "Blanc",
    "supplierReference": "261-60336",
    "supplierVariantId": "50345504932122",
    "variantImage": "assets/products/employee-store/deckmart-d5-blanc.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-blanc",
    "name": "Blanc",
    "supplierReference": "261-63219",
    "supplierVariantId": "50351522316570",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-blanc.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-bois-de-santal",
    "name": "Bois de Santal",
    "supplierReference": "261-60523",
    "supplierVariantId": "50345495920922",
    "variantImage": "assets/products/employee-store/deckmart-ced9-bois-de-santal.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-bois-de-santal",
    "name": "Bois de Santal",
    "supplierReference": "261-60524",
    "supplierVariantId": "50345504964890",
    "variantImage": "assets/products/employee-store/deckmart-d5-bois-de-santal.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-bois-de-santal",
    "name": "Bois de Santal",
    "supplierReference": "261-63214",
    "supplierVariantId": "50351522349338",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-bois-de-santal.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-falaise",
    "name": "Falaise",
    "supplierReference": "261-60537",
    "supplierVariantId": "50345495953690",
    "variantImage": "assets/products/employee-store/deckmart-ced9-falaise.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-falaise",
    "name": "Falaise",
    "supplierReference": "261-60538",
    "supplierVariantId": "50345504997658",
    "variantImage": "assets/products/employee-store/deckmart-d5-falaise.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-falaise",
    "name": "Falaise",
    "supplierReference": "261-63204",
    "supplierVariantId": "50351522382106",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-falaise.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-loup-gris",
    "name": "Loup gris",
    "supplierReference": "261-60874",
    "supplierVariantId": "50345495986458",
    "variantImage": "assets/products/employee-store/deckmart-ced9-loup-gris.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-loup-gris",
    "name": "Loup gris",
    "supplierReference": "261-60873",
    "supplierVariantId": "50345505030426",
    "variantImage": "assets/products/employee-store/deckmart-d5-loup-gris.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-loup-gris",
    "name": "Loup gris",
    "supplierReference": "261-63217",
    "supplierVariantId": "50351522414874",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-loup-gris.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-sierra",
    "name": "Sierra",
    "supplierReference": "261-60910",
    "supplierVariantId": "50345496019226",
    "variantImage": "assets/products/employee-store/deckmart-ced9-sierra.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-sierra",
    "name": "Sierra",
    "supplierReference": "261-60911",
    "supplierVariantId": "50345505063194",
    "variantImage": "assets/products/employee-store/deckmart-d5-sierra.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-sierra",
    "name": "Sierra",
    "supplierReference": "261-63216",
    "supplierVariantId": "50351522447642",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-sierra.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-barista",
    "name": "Barista",
    "supplierReference": "261-60924",
    "supplierVariantId": "50345496051994",
    "variantImage": "assets/products/employee-store/deckmart-ced9-barista.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-barista",
    "name": "Barista",
    "supplierReference": "261-60925",
    "supplierVariantId": "50345505095962",
    "variantImage": "assets/products/employee-store/deckmart-d5-barista.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-barista",
    "name": "Barista",
    "supplierReference": "261-63221",
    "supplierVariantId": "50351522480410",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-barista.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-scandinave",
    "name": "Scandinave",
    "supplierReference": "261-63004",
    "supplierVariantId": "50345496084762",
    "variantImage": "assets/products/employee-store/deckmart-ced9-scandinave.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-scandinave",
    "name": "Scandinave",
    "supplierReference": "261-63003",
    "supplierVariantId": "50345505128730",
    "variantImage": "assets/products/employee-store/deckmart-d5-scandinave.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-scandinave",
    "name": "Scandinave",
    "supplierReference": "261-63011",
    "supplierVariantId": "50351522513178",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-scandinave.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-cedrvue-9",
    "colorId": "canexel-moka-fonce",
    "name": "Moka foncé",
    "supplierReference": "261-63104",
    "supplierVariantId": "50345496117530",
    "variantImage": "assets/products/employee-store/deckmart-ced9-moka-fonce.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-ridgewood-d5-12",
    "colorId": "canexel-moka-fonce",
    "name": "Moka foncé",
    "supplierReference": "261-63103",
    "supplierVariantId": "50345505161498",
    "variantImage": "assets/products/employee-store/deckmart-d5-moka-fonce.png",
    "imageVerified": true
  },
  {
    "itemId": "canexel-joint-vstyle-12",
    "colorId": "canexel-moka-fonce",
    "name": "Moka foncé",
    "supplierReference": "261-63111",
    "supplierVariantId": "50351522545946",
    "variantImage": "assets/products/employee-store/deckmart-vstyle-moka-fonce.png",
    "imageVerified": true
  }
];
    for(const itemId of [...new Set(deckmartVariants.map(variant=>variant.itemId))]){
      const item=items.find(entry=>entry.id===itemId);
      const colors=deckmartVariants.filter(variant=>variant.itemId===itemId).map(variant=>({
        ...item.colors.find(color=>color.id===variant.colorId),id:variant.colorId,name:variant.name,
        verified:true,scope:'supplier_product_variant',availabilityConfirmedForItem:true,
        sourceUrl:deckmartSource+'?variant='+variant.supplierVariantId,
        supplierReference:variant.supplierReference,variantImage:variant.variantImage
      }));
      item.colors=[...colors,...item.colors.filter(color=>!colors.some(variant=>variant.id===color.id))];
      item.storeColors=colors;
      item.colorPolicy='required';
      item.sourceUrl=deckmartSource;
      item.supplierSource=deckmartSource;
      item.colorScope='supplier_product_variant';
      item.colorNote='Combinaison documentée chez DeckMart; disponibilité MIR à confirmer.';
    }
    return items.sort((a,b)=>CATEGORIES.findIndex(c=>c.id===a.category)-CATEGORIES.findIndex(c=>c.id===b.category)||Number(b.mirPreferred===true)-Number(a.mirPreferred===true)||a.name.localeCompare(b.name,'fr'));
  }
  function parseInches(value){
    if(finite(value))return value;
    if(typeof value!=='string')return null;
    let s=value.trim().replace(/,/g,'.').replace(/\u00a0/g,' ').replace(/\s*(?:po|in|inches)\s*$/i,'').replace(/[″”]/g,'"');
    const vulgar={'¼':'1/4','½':'1/2','¾':'3/4','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8'};
    s=s.replace(/[¼½¾⅛⅜⅝⅞]/g,m=>' '+vulgar[m]).replace(/"+$/,'').trim();
    if(!s)return null;
    const match=s.match(/^([+-]?\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?$/);
    if(!match||(!match[1]&&!match[2]))return null;
    const whole=match[1]?Number(match[1]):0,den=match[3]?Number(match[3]):1;
    if(!den)return null;const frac=match[2]?Number(match[2])/den:0;
    return Number.isFinite(whole+frac)?whole+(whole<0?-frac:frac):null;
  }
  function stockKeyOf(line){
    const values=[line.itemId,line.unit,line.brand||null,line.colorId||null,
      Object.entries(line.dimensionsIn||{}).sort((a,b)=>a[0].localeCompare(b[0]))];
    // Preserve earlier keys. Only a newly selected multi-format reference adds
    // a format identity; old order and stock snapshots are never remapped.
    if(line.formatId)values.push(line.formatId);
    return JSON.stringify(values);
  }
  function configureLine(state,spec={}){
    try{
      const item=(state?.catalogue||[]).find(i=>i.id===spec.itemId&&i.active!==false);
      if(!item)fail('ITEM_UNKNOWN','Cet article est absent ou désactivé.');
      if(item.orderable===false)fail('ITEM_NOT_ORDERABLE',item.orderableReason||'Cette référence doit être confirmée avant de pouvoir être ajoutée à une commande.');
      const quantity=typeof spec.quantity==='string'&&spec.quantity.trim()?Number(spec.quantity):spec.quantity;
      if(!Number.isSafeInteger(quantity)||quantity<=0||!Number.isInteger(quantity/(item.quantityStep||1)))fail('INVALID_QUANTITY','Indiquer une quantité positive dans l’unité de cet article.');
      if(spec.unit&&spec.unit!==item.unit)fail('UNIT_MISMATCH','L’unité doit rester celle de l’article; aucune conversion boîte/pièce n’est automatique.');
      if(spec.brand&&spec.brand!==item.brand)fail('BRAND_MISMATCH','Choisir la référence de la bonne marque; la couleur ne peut pas être transférée à une autre marque.');
      const formats=item.formats||[];let format=null;
      if(formats.length>1&&!spec.formatId)fail('FORMAT_REQUIRED','Choisir le format ou la longueur de cet article.');
      if(spec.formatId){format=formats.find(f=>f.id===spec.formatId);if(!format)fail('FORMAT_UNKNOWN','Ce format ne correspond pas à l’article sélectionné.');}
      else if(formats.length===1)format=formats[0];
      const formatId=formats.length>1?format?.id||null:null;
      const dimensions={...copy(item.dimensions||{}),...(format?{lengthIn:format.lengthIn,...(finite(format.widthIn)?{widthIn:format.widthIn}:{}),...(format.measurementKind?{measurementKind:format.measurementKind}:{})}:{})};
      const manufacturerReference=format?.manufacturerCode||item.manufacturerReference||null;
      let colorId=item.baseColorId||null,colorName=item.baseColorName||null;
      if(item.colorPolicy==='none'){
        if(spec.colorId&&spec.colorId!==item.baseColorId)fail('COLOR_NOT_APPLICABLE','Cet article ne demande pas de couleur.');
      }else if(spec.colorId){
        const color=item.colors.find(c=>c.id===spec.colorId);
        if(!color)fail('COLOR_UNKNOWN','La teinte choisie ne fait pas partie des références de cet article ou de cette marque.');
        colorId=color.id;colorName=color.name;
      }else if(item.colorPolicy==='required')fail('COLOR_REQUIRED','Choisir la référence de couleur du fabricant.');
      const dimensionsIn={},provided=spec.dimensionsIn||{};
      for(const field of item.measureFields||[]){
        const n=parseInches(provided[field.key]);
        if(!finite(n)||n<=0)fail('MEASURE_REQUIRED',`Indiquer une cote positive pour ${field.label||field.key}.`,{field:field.key});
        if(finite(field.max)&&n>field.max)fail('MEASURE_TOO_LARGE',`${field.label||field.key} dépasse ${field.max} po.`,{field:field.key,maximumIn:field.max});
        dimensionsIn[field.key]=n;
      }
      const expected=new Set((item.measureFields||[]).map(f=>f.key));
      if(Object.keys(provided).some(k=>!expected.has(k)))fail('MEASURE_UNKNOWN','Une cote ne correspond pas au profil sélectionné.');
      const supplierColor=item.storeColors?.find(color=>color.id===colorId);
      const line={itemId:item.id,name:item.name,brand:item.brand||null,materialId:item.materialId||null,
        quantity,unit:item.unit,colorId,colorName,colorScope:item.colorScope||null,dimensionsIn,
        profile:item.profile||null,stockLengthIn:format?.lengthIn||item.stockLengthIn||null,sku:item.sku||null,
        manufacturerReference,packaging:copy(item.packaging||{}),formatId,format:copy(format),formatLabel:format?.label||null,
        referencePending:!!item.referencePending,reservable:!item.referencePending,
        manufacturingReviewRequired:!!item.manufacturingReviewRequired,
        developedFacesSumIn:item.customBending?sum(Object.entries(dimensionsIn).filter(([k])=>k!=='L').map(([,v])=>v)):null,
        reviewNotes:[...(item.referencePending?['Référence exacte à identifier avant réservation ou livraison.']:[]),
          ...(item.colorNote?[item.colorNote]:[]),...(format?['Format demandé; disponibilité de la combinaison format, finition et couleur à confirmer.']:[]),...(item.customBending?['Cotes et faisabilité à valider avant fabrication.']:[])],
        snapshot:{id:item.id,name:item.name,brand:item.brand||null,unit:item.unit,unitLabel:item.unitLabel||item.unit,
          ...(supplierColor?{supplierReference:supplierColor.supplierReference,supplierSource:supplierColor.sourceUrl}:{}),
          category:item.category,sku:item.sku||null,manufacturerReference,formatId,format:copy(format),formatLabel:format?.label||null,
          packaging:copy(item.packaging||{}),sourceUrl:item.sourceUrl||null,documents:copy(item.documents||[]),
          dimensions,notes:copy(item.notes||[])}};
      line.stockKey=stockKeyOf(line);return {ok:true,line,error:null};
    }catch(e){return {ok:false,line:null,error:e.code?e:error('CONFIGURATION_INVALID','La configuration ne peut pas être lue.')};}
  }
  function totalsByUnit(order){
    const map={};for(const l of order.lines||[]){const r=map[l.unit]||(map[l.unit]={unit:l.unit,requestedQty:0,deliveredQty:0,cancelledQty:0,reservedQty:0,remainingQty:0});
      r.requestedQty+=l.requestedQty;r.deliveredQty+=l.deliveredQty;r.cancelledQty+=l.cancelledQty;r.reservedQty+=l.reservedQty;
      r.remainingQty+=l.requestedQty-l.deliveredQty-l.cancelledQty;}return Object.values(map);
  }
  function orderSummary(order={lines:[]}){
    const lines=order.lines||[],remaining=l=>l.requestedQty-l.deliveredQty-l.cancelledQty;
    const open=lines.filter(l=>remaining(l)>0),someDelivered=lines.some(l=>l.deliveredQty>0),someCancelled=lines.some(l=>l.cancelledQty>0);
    let status='requested',statusLabel='Demandée';
    if(!open.length){status=someDelivered?(someCancelled?'closed':'delivered'):'cancelled';statusLabel=status==='delivered'?'Livrée':status==='closed'?'Terminée — solde annulé':'Annulée';}
    else if(someDelivered){status='partially_delivered';statusLabel='Livraison partielle';}
    else if(open.every(l=>l.reservedQty===remaining(l))){status='reserved';statusLabel='Réservée';}
    else if(open.some(l=>l.reservedQty>0)){status='partially_reserved';statusLabel='Réservation partielle';}
    const byUnit=totalsByUnit(order),sameUnit=byUnit.length===1,one=sameUnit?byUnit[0]:{};
    return {status,statusLabel,lineCount:lines.length,openLineCount:open.length,complete:!open.length,byUnit,
      unit:sameUnit?one.unit:null,requestedQty:sameUnit?one.requestedQty:null,deliveredQty:sameUnit?one.deliveredQty:null,
      cancelledQty:sameUnit?one.cancelledQty:null,reservedQty:sameUnit?one.reservedQty:null,remainingQty:sameUnit?one.remainingQty:null,
      requested:sameUnit?one.requestedQty:null,delivered:sameUnit?one.deliveredQty:null,remaining:sameUnit?one.remainingQty:null};
  }
  function refreshOrder(order){
    for(const l of order.lines)l.remainingQty=l.requestedQty-l.deliveredQty-l.cancelledQty;
    const summary=orderSummary(order);order.status=summary.status;order.statusLabel=summary.statusLabel;return order;
  }
  function createDemoState(materials,options={}){
    const now=validDate(options.now)?new Date(options.now).toISOString():DEMO_TIME;
    const state={schemaVersion:VERSION,mode:MODE,demo:true,createdAt:now,updatedAt:now,
      notice:'Démonstration locale : aucun compte réel, courriel, commande fournisseur ou stock réel n’est connecté.',
      members:[
        {id:DEMO_IDS.admin,name:'Responsable MIR — démo',email:null,role:'admin',active:true,jobIds:[DEMO_IDS.job1,DEMO_IDS.job2]},
        {id:DEMO_IDS.employee1,name:'Équipe 1 — démo',email:null,role:'employee',active:true,jobIds:[DEMO_IDS.job1]},
        {id:DEMO_IDS.employee2,name:'Équipe 2 — démo',email:null,role:'employee',active:true,jobIds:[DEMO_IDS.job2]}
      ],
      jobs:[
        {id:DEMO_IDS.job1,name:'Duplex — chantier de démonstration',address:null,status:'active',demo:true,assignedMemberIds:[DEMO_IDS.employee1],publishedVersionId:'demo-plan-1-v1'},
        {id:DEMO_IDS.job2,name:'Résidence — chantier de démonstration',address:null,status:'active',demo:true,assignedMemberIds:[DEMO_IDS.employee2],publishedVersionId:'demo-plan-2-v1'}
      ],
      planVersions:[
        {id:'demo-plan-1-v1',jobId:DEMO_IDS.job1,label:'Plan chantier — exemple de publication',revision:'DÉMO-001',publishedAt:now,documents:[],notes:['Aucun PDF client n’est joint à cet exemple.'],status:'published_demo',demo:true},
        {id:'demo-plan-2-v1',jobId:DEMO_IDS.job2,label:'Plan chantier — exemple de publication',revision:'DÉMO-001',publishedAt:now,documents:[],notes:['Aucun PDF client n’est joint à cet exemple.'],status:'published_demo',demo:true}
      ],
      catalogue:buildCatalogue(materials),favorites:{[DEMO_IDS.employee1]:['mir-starter-10ft','mir-rodent-guard-10ft'],[DEMO_IDS.employee2]:[]},
      orders:[],deliveries:[],inventory:{},movements:[],invitationDrafts:[],audit:[],receipts:{},
      counters:{order:0,delivery:0,movement:0,invitation:0,plan:0,event:0}};
    if(options.seedExamples!==false){
      const configured=configureLine(state,{itemId:'mir-starter-10ft',quantity:10});
      const id='DEMO-C001';state.counters.order=1;
      const line={...configured.line,id:`${id}-L001`,requestedQty:10,deliveredQty:0,cancelledQty:0,reservedQty:0,remainingQty:10};
      state.orders.push(refreshOrder({id,jobId:DEMO_IDS.job1,requestedById:DEMO_IDS.employee1,lines:[line],deliveryMode:'delivery',
        note:'Demande fictive de 10 longueurs pour essayer une livraison partielle; inventaire encore inconnu.',createdAt:now,updatedAt:now,demo:true}));
    }
    return state;
  }
  const memberFor=(state,id)=>(state.members||[]).find(m=>m.id===id&&m.active===true);
  const canSeeJob=(state,actor,job)=>!!actor&&!!job&&(actor.role==='admin'||job.assignedMemberIds.includes(actor.id));
  function listJobs(state,actorId){
    const actor=memberFor(state,actorId);if(!actor)return [];
    return (state.jobs||[]).filter(j=>canSeeJob(state,actor,j)).map(j=>({...copy(j),publishedPlan:copy((state.planVersions||[]).find(p=>p.id===j.publishedVersionId&&p.status==='published_demo')||null)}));
  }
  function listOrders(state,actorId,{view='all',jobId}={}){
    const actor=memberFor(state,actorId);if(!actor)return [];
    return (state.orders||[]).filter(o=>{
      const job=state.jobs.find(j=>j.id===o.jobId);if(!canSeeJob(state,actor,job)||actor.role!=='admin'&&o.requestedById!==actor.id)return false;
      if(jobId&&o.jobId!==jobId)return false;
      if(view==='pending')return o.lines.some(l=>l.remainingQty>0);
      if(view==='history')return o.lines.some(l=>l.remainingQty===0);
      return true;
    }).map(o=>{
      const visible=copy(o);visible.lines=visible.lines.filter(l=>view==='pending'?l.remainingQty>0:view==='history'?l.remainingQty===0:true);
      return {...visible,summary:orderSummary(visible),orderSummaryOriginal:orderSummary(o),
        deliveries:copy((state.deliveries||[]).filter(d=>d.orderId===o.id))};
    });
  }
  function stockFor(state,stockKey){
    const inventory=state.inventory?.[stockKey],lines=(state.orders||[]).flatMap(o=>o.lines||[]).filter(l=>l.stockKey===stockKey);
    const reserved=sum(lines.map(l=>l.reservedQty)),onHand=finite(inventory?.onHand)?inventory.onHand:null;
    return {stockKey,onHand,reserved,available:onHand===null?null:onHand-reserved,known:onHand!==null,
      unit:inventory?.unit||lines[0]?.unit||null,demo:true,updatedAt:inventory?.updatedAt||null};
  }
  function listInventory(state){
    const keys=new Set([...Object.keys(state.inventory||{}),...(state.orders||[]).flatMap(o=>o.lines.map(l=>l.stockKey))]);
    return [...keys].map(k=>{const line=state.orders.flatMap(o=>o.lines).find(l=>l.stockKey===k),entry=state.inventory[k];
      return {...stockFor(state,k),name:entry?.name||line?.name||'Référence de démonstration',itemId:entry?.itemId||line?.itemId||null,colorName:entry?.colorName||line?.colorName||null};});
  }
  function stable(value){
    if(Array.isArray(value))return value.map(stable);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
    return value;
  }
  function stockDescriptor(state,key){
    let values;try{values=JSON.parse(key);}catch(_){fail('STOCK_KEY_INVALID','La référence de stock doit provenir d’une configuration d’article.');}
    if(!Array.isArray(values)||![5,6].includes(values.length)||!Array.isArray(values[4]))fail('STOCK_KEY_INVALID','La référence de stock est invalide.');
    const [itemId,unit,brand,colorId,dims,formatId]=values;
    const r=configureLine(state,{itemId,unit,brand,colorId,formatId,dimensionsIn:Object.fromEntries(dims),quantity:1});
    if(!r.ok||r.line.stockKey!==key){
      // A historical order is its own immutable reference. Continue counting and
      // delivering that exact saved line, without guessing a newly added format.
      const historical=(state.orders||[]).flatMap(o=>o.lines||[]).find(l=>l.stockKey===key&&stockKeyOf(l)===key);
      if(historical)return {...copy(historical),quantity:1};
      if(!r.ok)throw r.error;fail('STOCK_KEY_INVALID','La référence de stock ne correspond pas à cette variante.');
    }
    return r.line;
  }
  function validateState(state){
    const errors=[],add=(code,message,details)=>errors.push(error(code,message,details));
    if(state?.schemaVersion!==VERSION||state?.mode!==MODE||state?.demo!==true)return {valid:false,errors:[error('STATE_NOT_DEMO','Cet état n’est pas une démonstration MIR compatible.')]};
    for(const key of ['members','jobs','planVersions','catalogue','orders','deliveries','movements','invitationDrafts','audit'])if(!Array.isArray(state[key]))add('INVALID_COLLECTION',`Collection ${key} invalide.`);
    if(errors.length)return {valid:false,errors};
    if(!state.inventory||typeof state.inventory!=='object'||!state.receipts||!state.counters)return {valid:false,errors:[error('INVALID_STATE','État de stock ou journal invalide.')]};
    for(const key of ['members','jobs','planVersions','catalogue','orders','deliveries','movements']){
      const ids=state[key].map(r=>r.id);if(new Set(ids).size!==ids.length||ids.some(id=>!clean(id)))add('DUPLICATE_ID',`Identifiant absent ou dupliqué dans ${key}.`);
    }
    const lineIds=new Set(),lines=[];
    for(const o of state.orders){
      if(!state.jobs.some(j=>j.id===o.jobId)||!state.members.some(m=>m.id===o.requestedById)||!Array.isArray(o.lines)||!o.lines.length){add('INVALID_ORDER','Commande sans chantier, demandeur ou lignes.',{orderId:o.id});continue;}
      for(const l of o.lines){
        if(lineIds.has(l.id))add('DUPLICATE_LINE','Identifiant de ligne dupliqué.');lineIds.add(l.id);lines.push(l);
        if(![l.requestedQty,l.deliveredQty,l.cancelledQty,l.reservedQty].every(n=>Number.isSafeInteger(n)&&n>=0)||l.requestedQty<=0||l.deliveredQty+l.cancelledQty>l.requestedQty||l.reservedQty>l.requestedQty-l.deliveredQty-l.cancelledQty)
          add('INVALID_LINE_QUANTITY','Quantités demandées, livrées, annulées ou réservées incohérentes.',{lineId:l.id});
        if(l.stockKey!==stockKeyOf(l)||l.quantity!==l.requestedQty||l.remainingQty!==l.requestedQty-l.deliveredQty-l.cancelledQty)add('LINE_MISMATCH','Identité de variante ou reliquat incohérent.',{lineId:l.id});
        if(l.referencePending&&l.reservedQty>0)add('UNCONFIRMED_REFERENCE_RESERVED','Une référence non identifiée ne peut pas être réservée.',{lineId:l.id});
      }
      if(o.status!==orderSummary(o).status)add('ORDER_STATUS_MISMATCH','Le statut ne correspond pas aux quantités.',{orderId:o.id});
    }
    const deliveredByLine=new Map(),deliveryKeys=new Set();
    for(const d of state.deliveries){
      const o=state.orders.find(o=>o.id===d.orderId);if(!o||!Array.isArray(d.lines)||!d.lines.length){add('INVALID_DELIVERY','Livraison sans commande ou ligne.');continue;}
      for(const dl of d.lines){
        const key=`${d.id}:${dl.lineId}`,l=o.lines.find(l=>l.id===dl.lineId);
        if(deliveryKeys.has(key)||!l||!Number.isSafeInteger(dl.quantity)||dl.quantity<=0||dl.stockKey!==l.stockKey)add('INVALID_DELIVERY_LINE','Ligne de livraison invalide ou dupliquée.');deliveryKeys.add(key);
        deliveredByLine.set(dl.lineId,(deliveredByLine.get(dl.lineId)||0)+dl.quantity);
        const moves=state.movements.filter(m=>m.type==='delivery'&&m.deliveryId===d.id&&m.lineId===dl.lineId);
        if(moves.length!==1||moves[0]?.delta!==-dl.quantity)add('DELIVERY_MOVEMENT_MISMATCH','Une livraison doit correspondre à une seule sortie physique.',{deliveryId:d.id,lineId:dl.lineId});
      }
    }
    for(const l of lines)if((deliveredByLine.get(l.id)||0)!==l.deliveredQty)add('DELIVERED_TOTAL_MISMATCH','Le total livré ne correspond pas à l’historique.',{lineId:l.id});
    for(const key of new Set([...Object.keys(state.inventory),...lines.map(l=>l.stockKey)])){
      const s=stockFor(state,key),entry=state.inventory[key];
      if(entry&&(entry.onHand!==null&&(!Number.isSafeInteger(entry.onHand)||entry.onHand<0)))add('INVALID_STOCK','Stock physique invalide.');
      if(s.reserved>0&&s.onHand===null||s.onHand!==null&&s.reserved>s.onHand)add('OVER_RESERVED','La réservation dépasse le stock physique connu.',{stockKey:key});
      const movements=state.movements.filter(m=>m.stockKey===key);
      if(entry&&s.known&&(!movements.length||movements[movements.length-1].after!==s.onHand))add('STOCK_HISTORY_MISMATCH','Le stock physique ne correspond pas au dernier mouvement.',{stockKey:key});
      for(let i=0;i<movements.length;i++){
        const m=movements[i],expectedBefore=i?movements[i-1].after:null;
        if(m.before!==expectedBefore||!Number.isSafeInteger(m.after)||m.after<0||m.delta!==(m.before===null?null:m.after-m.before))
          add('MOVEMENT_CHAIN_MISMATCH','La suite de mouvements de stock est incohérente.',{movementId:m.id});
      }
    }
    return {valid:errors.length===0,errors};
  }
  function restoreState(raw,materials){
    try{const state=typeof raw==='string'?JSON.parse(raw):copy(raw),check=validateState(state);
      if(!check.valid)return {ok:false,state:null,error:error('STATE_INVALID','La démonstration sauvegardée est incohérente; réinitialiser les données locales.',check.errors)};
      if(materials)state.catalogue=buildCatalogue(materials);return {ok:true,state,error:null};
    }catch(_){return {ok:false,state:null,error:error('STATE_INVALID','La démonstration sauvegardée ne peut pas être lue.')};}
  }
  function reduce(state,action={}){
    let next;
    try{
      const initial=validateState(state);if(!initial.valid)fail('STATE_INVALID','L’état de démonstration doit être réinitialisé.',initial.errors);
      const actor=memberFor(state,action.actorId);if(!actor)fail('ACTOR_INACTIVE','Choisir un membre de démonstration actif.');
      const type=clean(action.type),requestId=clean(action.requestId),at=validDate(action.at)?new Date(action.at).toISOString():state.updatedAt;
      // Replays are reads of an old result, so current simulated access still applies.
      if(['SET_INVENTORY','RESERVE_ORDER','RECORD_DELIVERY','CANCEL_REMAINDER','ASSIGN_JOB','SET_MEMBER_ACTIVE','SAVE_INVITATION_DRAFT','PUBLISH_PLAN'].includes(type)&&actor.role!=='admin')
        fail('ADMIN_REQUIRED','Cette action appartient au responsable de démonstration.');
      if(type==='CREATE_ORDER'){
        const job=state.jobs.find(j=>j.id===action.jobId);
        if(!canSeeJob(state,actor,job)||job.status!=='active')fail('JOB_NOT_ASSIGNED','Choisir un chantier actif attribué à cet employé.');
      }
      if(['CREATE_ORDER','RESERVE_ORDER','RECORD_DELIVERY','CANCEL_REMAINDER','SET_INVENTORY'].includes(type)&&!requestId)fail('REQUEST_ID_REQUIRED','Une référence de requête est nécessaire pour éviter les doublons.');
      const semantic={...action};delete semantic.at;delete semantic.requestId;
      const fingerprint=JSON.stringify(stable(semantic)),receiptKey=requestId?JSON.stringify([actor.id,requestId]):null;
      if(receiptKey&&state.receipts[receiptKey]){
        const previous=state.receipts[receiptKey];
        if(previous.fingerprint!==fingerprint)fail('IDEMPOTENCY_CONFLICT','Cette référence de requête a déjà servi à une action différente.');
        return {ok:true,state,result:{...copy(previous.result),replayed:true},error:null};
      }
      next=copy(state);let result={};
      const admin=()=>{if(actor.role!=='admin')fail('ADMIN_REQUIRED','Cette action appartient au responsable de démonstration.');};
      const getOrder=()=>{const o=next.orders.find(o=>o.id===action.orderId);if(!o)fail('ORDER_UNKNOWN','Commande introuvable.');return o;};
      const getJob=id=>{const j=next.jobs.find(j=>j.id===id);if(!j)fail('JOB_UNKNOWN','Chantier introuvable.');return j;};
      const sequence=(kind,prefix)=>`${prefix}${String(++next.counters[kind]).padStart(3,'0')}`;
      const audit=(message,detail={})=>next.audit.push({id:sequence('event','DEMO-E'),type,actorId:actor.id,at,message,...detail,demo:true});
      function quantitiesFor(o,all=false){
        const quantities=action.quantities||(all?Object.fromEntries(o.lines.map(l=>[l.id,l.remainingQty])):{});
        if(!quantities||typeof quantities!=='object'||Array.isArray(quantities))fail('QUANTITIES_INVALID','Indiquer les quantités par ligne.');
        const rows=[];for(const [id,q] of Object.entries(quantities)){
          const l=o.lines.find(l=>l.id===id);if(!l)fail('LINE_UNKNOWN','Une ligne ne fait pas partie de cette commande.');
          if(!Number.isSafeInteger(q)||q<0)fail('INVALID_QUANTITY','Les quantités livrées ou annulées doivent être des nombres entiers positifs.');
          if(q>0)rows.push({line:l,quantity:q});
        }if(!rows.length)fail('QUANTITY_REQUIRED','Indiquer au moins une quantité positive.');return rows;
      }
      if(type==='TOGGLE_FAVORITE'){
        if(!next.catalogue.some(i=>i.id===action.itemId&&i.active!==false))fail('ITEM_UNKNOWN','Article introuvable.');
        const favorite=next.favorites[actor.id]||(next.favorites[actor.id]=[]),i=favorite.indexOf(action.itemId);
        if(i<0)favorite.push(action.itemId);else favorite.splice(i,1);result={itemId:action.itemId,favorite:i<0};
      }else if(type==='CREATE_ORDER'){
        const job=getJob(action.jobId);if(!canSeeJob(next,actor,job)||job.status!=='active')fail('JOB_NOT_ASSIGNED','Choisir un chantier actif attribué à cet employé.');
        if(!Array.isArray(action.lines)||!action.lines.length)fail('EMPTY_ORDER','Ajouter au moins un article.');
        if(!['delivery','pickup'].includes(action.deliveryMode||'delivery'))fail('DELIVERY_MODE_INVALID','Choisir livraison ou ramassage.');
        const id=sequence('order','DEMO-C'),lines=action.lines.map((spec,i)=>{
          const r=configureLine(next,spec);if(!r.ok)throw r.error;
          return {...r.line,id:`${id}-L${String(i+1).padStart(3,'0')}`,requestedQty:r.line.quantity,deliveredQty:0,cancelledQty:0,reservedQty:0,remainingQty:r.line.quantity};
        });
        const order=refreshOrder({id,jobId:job.id,requestedById:actor.id,lines,deliveryMode:action.deliveryMode||'delivery',
          note:clean(action.note),createdAt:at,updatedAt:at,demo:true});next.orders.push(order);result={orderId:id,order:copy(order)};
        audit('Demande de démonstration créée.',{orderId:id,jobId:job.id});
      }else if(type==='SET_INVENTORY'){
        admin();const d=stockDescriptor(next,action.stockKey),quantity=action.quantity;
        if(!d.reservable)fail('REFERENCE_UNCONFIRMED','Identifier cette référence avant de simuler son stock.');
        if(action.unit&&action.unit!==d.unit)fail('UNIT_MISMATCH','L’unité du comptage doit correspondre à la variante.');
        if(!Number.isSafeInteger(quantity)||quantity<0)fail('STOCK_QUANTITY_INVALID','Indiquer un stock physique de démonstration entier et non négatif.');
        const old=stockFor(next,action.stockKey);if(quantity<old.reserved)fail('STOCK_BELOW_RESERVED','Le stock physique ne peut pas être inférieur aux quantités déjà réservées.');
        next.inventory[action.stockKey]={stockKey:action.stockKey,itemId:d.itemId,name:d.name,colorName:d.colorName,unit:d.unit,
          formatId:d.formatId||null,formatLabel:d.formatLabel||null,manufacturerReference:d.manufacturerReference||null,packaging:copy(d.packaging||{}),snapshot:copy(d.snapshot||{}),
          onHand:quantity,updatedAt:at,recordedById:actor.id,demo:true};
        const move={id:sequence('movement','DEMO-M'),type:'count',stockKey:action.stockKey,unit:d.unit,before:old.onHand,after:quantity,
          delta:old.onHand===null?null:quantity-old.onHand,note:clean(action.note),at,actorId:actor.id,requestId,demo:true};
        next.movements.push(move);result={stock:stockFor(next,action.stockKey),movementId:move.id};
        audit('Comptage de stock fictif enregistré.',{stockKey:action.stockKey});
      }else if(type==='RESERVE_ORDER'){
        admin();const o=getOrder(),warnings=[];let reservedQty=0;
        for(const l of o.lines){
          const need=l.remainingQty-l.reservedQty;if(need<=0)continue;
          if(!l.reservable){warnings.push(`${l.name} : référence à identifier.`);continue;}
          const stock=stockFor(next,l.stockKey);
          if(!stock.known){warnings.push(`${l.name} : stock inconnu, aucune réservation.`);continue;}
          const quantity=Math.min(need,Math.max(0,stock.available));l.reservedQty+=quantity;reservedQty+=quantity;
          if(quantity<need)warnings.push(`${l.name} : ${need-quantity} ${l.unit} encore sans réservation.`);
        }
        o.updatedAt=at;refreshOrder(o);result={orderId:o.id,reservedQty,warnings,summary:orderSummary(o)};
        audit('Réservations de démonstration calculées sans modifier le stock physique.',{orderId:o.id});
      }else if(type==='RECORD_DELIVERY'){
        admin();const o=getOrder(),rows=quantitiesFor(o),id=sequence('delivery','DEMO-L');
        // Check every line before applying any decrement: failed batches are atomic.
        for(const {line:l,quantity:q} of rows){
          if(q>l.remainingQty)fail('OVER_DELIVERY','La livraison dépasse la quantité restant à recevoir.');
          if(q>l.reservedQty)fail('UNRESERVED_QUANTITY','Réserver cette quantité sur un stock connu avant de la livrer.');
          const s=stockFor(next,l.stockKey);if(!s.known||s.onHand<q)fail('INSUFFICIENT_STOCK','Le stock physique confirmé ne permet pas cette livraison.');
        }
        const delivery={id,orderId:o.id,actorId:actor.id,createdAt:at,at,requestId,note:clean(action.note),lines:[],quantities:{},demo:true};
        for(const {line:l,quantity:q} of rows){
          const inv=next.inventory[l.stockKey],before=inv.onHand;inv.onHand-=q;inv.updatedAt=at;l.reservedQty-=q;l.deliveredQty+=q;
          delivery.lines.push({lineId:l.id,itemId:l.itemId,name:l.name,stockKey:l.stockKey,unit:l.unit,quantity:q});
          delivery.quantities[l.id]=q;
          next.movements.push({id:sequence('movement','DEMO-M'),type:'delivery',deliveryId:id,lineId:l.id,orderId:o.id,
            stockKey:l.stockKey,unit:l.unit,before,after:inv.onHand,delta:-q,at,actorId:actor.id,requestId,demo:true});
        }
        next.deliveries.push(delivery);o.updatedAt=at;refreshOrder(o);result={deliveryId:id,delivery:copy(delivery),orderId:o.id,summary:orderSummary(o)};
        audit('Livraison de démonstration enregistrée; le reliquat et l’historique sont conservés.',{orderId:o.id,deliveryId:id});
      }else if(type==='CANCEL_REMAINDER'){
        admin();const o=getOrder(),rows=quantitiesFor(o,true);
        for(const {line:l,quantity:q} of rows){if(q>l.remainingQty)fail('OVER_CANCELLATION','L’annulation dépasse le reliquat non livré.');}
        for(const {line:l,quantity:q} of rows){l.cancelledQty+=q;l.reservedQty=Math.min(l.reservedQty,l.requestedQty-l.deliveredQty-l.cancelledQty);}
        o.updatedAt=at;refreshOrder(o);result={orderId:o.id,summary:orderSummary(o)};
        audit('Reliquat annulé dans la démonstration; réservation libérée, aucun stock physique ajouté.',{orderId:o.id});
      }else if(type==='ASSIGN_JOB'){
        admin();const job=getJob(action.jobId);
        let members=action.memberIds;
        if(!Array.isArray(members)&&clean(action.memberId)&&typeof action.assigned==='boolean'){
          const current=job.assignedMemberIds.filter(id=>id!==action.memberId);members=action.assigned?[...current,action.memberId]:current;
        }
        const ids=[...new Set(members||[])];
        if(!Array.isArray(members)||ids.some(id=>!next.members.some(m=>m.id===id&&m.role==='employee'&&m.active)))fail('ASSIGNMENT_INVALID','Choisir des employés de démonstration actifs.');
        job.assignedMemberIds=ids;
        for(const m of next.members)if(m.role!=='admin')m.jobIds=next.jobs.filter(j=>j.assignedMemberIds.includes(m.id)).map(j=>j.id);
        result={job:copy(job)};audit('Attribution du chantier de démonstration mise à jour.',{jobId:job.id});
      }else if(type==='SET_MEMBER_ACTIVE'){
        admin();const member=next.members.find(m=>m.id===action.memberId&&m.role==='employee');
        if(!member||typeof action.active!=='boolean')fail('MEMBER_UNKNOWN','Choisir un employé de démonstration.');member.active=action.active;
        result={member:copy(member)};audit('État du membre de démonstration modifié.',{memberId:member.id});
      }else if(type==='SAVE_INVITATION_DRAFT'){
        admin();const email=clean(action.email).toLowerCase(),jobIds=[...new Set(action.jobIds||[])];
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('EMAIL_INVALID','Indiquer une adresse courriel pour le brouillon local.');
        if(jobIds.some(id=>!next.jobs.some(j=>j.id===id)))fail('JOB_UNKNOWN','Un chantier du brouillon est introuvable.');
        const hours=action.expiresInHours??72;if(!finite(hours)||hours<=0)fail('EXPIRY_INVALID','Indiquer une durée positive.');
        const draft={id:sequence('invitation','DEMO-I'),email,jobIds,role:'employee',status:'draft_not_sent',
          createdAt:at,expiresInHours:hours,proposedExpiresAt:new Date(Date.parse(at)+hours*3600000).toISOString(),
          sentAt:null,token:null,url:null,demo:true,notice:'Brouillon local uniquement; aucun lien, compte ni courriel créé.'};
        next.invitationDrafts.push(draft);result={draft:copy(draft)};audit('Brouillon local d’invitation enregistré; aucun envoi.',{draftId:draft.id});
      }else if(type==='PUBLISH_PLAN'){
        admin();const job=getJob(action.jobId),label=clean(action.label),revision=clean(action.revision);
        if(!label||!revision)fail('PLAN_DETAILS_REQUIRED','Indiquer un titre et une révision de démonstration.');
        const documents=Array.isArray(action.documents)?action.documents.map(d=>({name:clean(d.name),url:clean(d.url)})):[];
        if(documents.some(d=>!d.name||!(/^(?:https:\/\/|\.\/)/.test(d.url))||/[\u0000-\u001f]/.test(d.url)))fail('PLAN_DOCUMENT_INVALID','Le lien de document doit être local relatif ou HTTPS.');
        const previous=next.planVersions.find(p=>p.id===job.publishedVersionId);if(previous)previous.status='superseded_demo';
        const published={id:sequence('plan','DEMO-PV'),jobId:job.id,label,revision,documents,
          notes:Array.isArray(action.notes)?action.notes.map(String):[],publishedAt:at,status:'published_demo',demo:true};
        next.planVersions.push(published);job.publishedVersionId=published.id;result={plan:copy(published)};
        audit('Version de plan publiée dans la démonstration locale.',{jobId:job.id,planVersionId:published.id});
      }else fail('ACTION_UNKNOWN','Cette action de démonstration n’est pas prise en charge.');
      next.updatedAt=at;result={...result,demo:true};
      if(receiptKey)next.receipts[receiptKey]={fingerprint,result:copy(result),at};
      const final=validateState(next);if(!final.valid)fail('INVARIANT_FAILED','L’action violerait les règles de quantités; aucune modification conservée.',final.errors);
      return {ok:true,state:next,result,error:null};
    }catch(e){return {ok:false,state,result:null,error:e?.code?e:error('ACTION_FAILED','L’action n’a pas pu être appliquée à la démonstration.')};}
  }
  return Object.freeze({version:VERSION,MODE,DEMO_IDS,CATEGORIES,buildCatalogue,createDemoState,configureLine,parseInches,
    orderSummary,listJobs,listOrders,stockFor,listInventory,validateState,restoreState,reduce});
});
