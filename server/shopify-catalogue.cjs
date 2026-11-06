'use strict';
// Projection only: MIR stays the master. This module has no network or secrets.
function project(publication){
 if(!publication?.id)throw Error('Référence du modèle maître requise');
 const variants=[['aluminium',publication.aluminumCents],['acier',publication.steelCents]]
 .filter(([,price])=>Number.isSafeInteger(price)&&price>0&&publication.saleLengthIn===120)
 .map(([metal,price])=>({externalReference:publication.id+':'+metal+':120',metal,lengthIn:120,priceCents:price,currency:'CAD',availability:null}));
 return {master:'MIR',externalReference:publication.id,version:publication.version,revision:publication.revision,
 title:publication.name,status:publication.boutique&&!publication.archived&&variants.length?'active':'draft',variants};
}
function orderReference(shop,orderId){if(!/^[a-z0-9-]+\.myshopify\.com$/.test(shop)||!String(orderId||''))throw Error('Référence Shopify invalide');return {source:'shopify',shop,externalOrderId:String(orderId)};}
module.exports={project,orderReference};
