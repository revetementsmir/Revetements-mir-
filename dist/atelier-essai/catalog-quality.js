const clone=v=>JSON.parse(JSON.stringify(v));
const str=v=>String(v??'').trim();
const VALID_PHOTO=new Set(['exact','variant','sample','substitute','missing']);
const VALID_INFO=new Set(['verified','partial','unknown','not_applicable']);
const VALID_PRICE=new Set(['confirmed','quote','unknown']);
const VALID_STOCK=new Set(['confirmed','unknown','unavailable']);

function status(v, allowed, fallback){const s=str(v).toLowerCase();return allowed.has(s)?s:fallback}
function hasSources(item){return Array.isArray(item?.sources)&&item.sources.some(s=>str(typeof s==='string'?s:s?.url||s?.label))}

export function assessCatalogItem(item={}){
  const photo=status(item?.photo?.status,VALID_PHOTO,'missing');
  const price=status(item?.price?.status,VALID_PRICE,'unknown');
  const stock=status(item?.stock?.status,VALID_STOCK,'unknown');
  const compatibility=status(item?.compatibility?.status,VALID_INFO,'unknown');
  const dimensions=status(item?.dimensions?.status,VALID_INFO,'unknown');
  const coverage=status(item?.coverage?.status,VALID_INFO,'unknown');
  const colors=status(item?.colors?.status,VALID_INFO,'unknown');
  const identityComplete=!!(str(item.manufacturer)&&str(item.name)&&(str(item.sku)||str(item.id)));
  const sourceValidated=hasSources(item);
  const requiresQuote=price==='quote'||item?.customColor===true||item?.ralCustom===true;
  const canClaimExactPhoto=photo==='exact';
  const canClaimExactVariantPhoto=photo==='exact'||photo==='variant';
  const canShowPrice=price==='confirmed'&&Number.isFinite(Number(item?.price?.amount))&&Number(item.price.amount)>=0&&!!str(item?.price?.currency);
  const canShowStock=stock==='confirmed'&&Number.isFinite(Number(item?.stock?.quantity))&&Number(item.stock.quantity)>=0;
  const techVerified=[dimensions,coverage].every(s=>s==='verified'||s==='not_applicable');
  const compatibilityVerified=compatibility==='verified'||compatibility==='not_applicable';
  const exactPresentation=identityComplete&&sourceValidated&&canClaimExactVariantPhoto&&techVerified&&compatibilityVerified&&colors!=='unknown';
  const warnings=[];
  if(!identityComplete)warnings.push('Identité produit incomplète');
  if(!sourceValidated)warnings.push('Source fabricant/documentaire à confirmer');
  if(photo==='missing')warnings.push('Photo exacte manquante');
  if(photo==='substitute')warnings.push('Visuel de substitution — ne pas présenter comme photo exacte');
  if(photo==='sample')warnings.push('Échantillon couleur — ne pas présenter comme photo du produit');
  if(price==='unknown')warnings.push('Prix à confirmer');
  if(price==='quote')warnings.push('Prix sur soumission');
  if(stock==='unknown')warnings.push('Stock/disponibilité à confirmer');
  if(stock==='unavailable')warnings.push('Indisponible selon l’état saisi');
  if(compatibility==='unknown'||compatibility==='partial')warnings.push('Compatibilité à vérifier');
  if(dimensions==='unknown'||dimensions==='partial')warnings.push('Dimensions/format à vérifier');
  if(coverage==='unknown'||coverage==='partial')warnings.push('Couvrance à vérifier');
  if(colors==='unknown'||colors==='partial')warnings.push('Couleurs/finitions à vérifier');
  const canShowPublic=identityComplete&&sourceValidated;
  const canSellDirect=canShowPublic&&canShowPrice&&canShowStock&&Number(item.stock.quantity)>0&&!requiresQuote&&techVerified&&compatibilityVerified;
  return {identityComplete,sourceValidated,photo,price,stock,compatibility,dimensions,coverage,colors,requiresQuote,canClaimExactPhoto,canClaimExactVariantPhoto,canShowPrice,canShowStock,canShowPublic,canSellDirect,exactPresentation,warnings};
}

export function buildCatalogPresentation(item={}, {channel='public'}={}){
  const a=assessCatalogItem(item);
  const photoLabels={exact:'Photo exacte',variant:'Photo de variante confirmée',sample:'Échantillon couleur',substitute:'Visuel de substitution',missing:'Photo à confirmer'};
  let action='contact';
  if(a.canSellDirect) action='add_to_cart';
  else if(a.requiresQuote) action='request_quote';
  else if(a.stock==='unavailable') action='unavailable';
  else if(!a.canShowPublic) action='admin_review';
  const level=!a.canShowPublic?'draft':a.exactPresentation?'exact':'qualified';
  return {
    id:str(item.id||item.sku),manufacturer:str(item.manufacturer),name:str(item.name),sku:str(item.sku),channel,
    level,publicVisible:a.canShowPublic,action,
    photo:{status:a.photo,label:photoLabels[a.photo],url:str(item?.photo?.url),claimExact:a.canClaimExactPhoto},
    price:a.canShowPrice?{visible:true,amount:Number(item.price.amount),currency:str(item.price.currency),label:null}:{visible:false,amount:null,currency:null,label:a.requiresQuote?'Sur soumission':'À confirmer'},
    stock:a.canShowStock?{visible:true,quantity:Number(item.stock.quantity),label:Number(item.stock.quantity)>0?'Stock confirmé':'Rupture confirmée'}:{visible:false,quantity:null,label:a.stock==='unavailable'?'Indisponible':'Disponibilité à confirmer'},
    compatibility:{status:a.compatibility,label:a.compatibility==='verified'?'Compatibilité vérifiée':a.compatibility==='not_applicable'?'Non applicable':'Compatibilité à vérifier'},
    warnings:clone(a.warnings),canSellDirect:a.canSellDirect,exactPresentation:a.exactPresentation
  };
}

export function validateCatalogPublication(item={}, {claimExact=false, requireDirectSale=false}={}){
  const a=assessCatalogItem(item);const errors=[];
  if(!a.identityComplete)errors.push('Identité produit incomplète');
  if(!a.sourceValidated)errors.push('Source requise');
  if(claimExact&&!a.exactPresentation)errors.push('La fiche ne peut pas être présentée comme exacte');
  if(requireDirectSale&&!a.canSellDirect)errors.push('Les données ne permettent pas une vente directe fiable');
  return {ok:errors.length===0,errors,assessment:a};
}
