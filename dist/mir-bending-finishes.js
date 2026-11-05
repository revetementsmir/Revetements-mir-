/* Shared product and colour references for bending and Studio trim. */
(function(root){
'use strict';
function expandAluminumPalettes(catalogue){
 const find=id=>catalogue.find(product=>product.id===id);
 const normalize=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const kaycan=find('kaycan-coil-0721-30m');
 if(kaycan){
  const kaycanSource='https://www.kaycan.com/product/aluminum/aluminum-siding/acm/';
  const samples=[...(find('kaycan-fascia-6-0480')?.colors||[]),...(find('kaycan-urbanix-coil-0747')?.colors||[])];
  const names=[
   'Noir','Noir LG','Noir SG','Étain Bruni','Cactus','Noir Charbon','Charbon','Brun Chocolat',
   'Brun Chocolat LG','Brun Chocolat SG','Chocolat SG','Rouge Colonial','Brun Commercial','Vert Forêt',
   'Gris Gothique','Gris Grafton','Récolte de Cèdre','Ivoire','Ivoire LG','Ivoire SG','Vert Lierre',
   'Kaki','Lin','Beige MC','Santal MC','Mocha','Gris Perle','Blanc Polaire','Beige Prestige','Rockwood',
   'Granite Rustique','Sable','Santal','Gris Argenté','Gris Ardoise','Gris Soho','Blanc','Blanc LG','Blanc SG','Osier','Blanc Loup'
  ];
  const references=names.map((name,index)=>{
   const sample=samples.find(c=>normalize(c.name)===normalize(name));
   return {...sample,id:sample?.id||'kaycan-reference-'+(index+1),name,sourceUrl:kaycanSource,
    availabilityAtProfile:'unverified',availabilityNote:'Teinte du nuancier aluminium Kaycan. Disponibilité du rouleau 0721 à confirmer auprès du distributeur.'};
  });
  const existing=new Set(kaycan.colors.map(c=>normalize(c.name)));
  kaycan.colors=[...kaycan.colors,...references.filter(c=>!existing.has(normalize(c.name)))];
  kaycan.name='Rouleau aluminium 0721 · références de couleur à confirmer';
 }
 const gentek=find('gentek-coil-3037');
 if(gentek){
  const sourceUrl='https://www.gentek.ca/wp-content/uploads/sites/2/2023/08/Gentek-Product-Directory-ENG-March2026.pdf';
  const documented={
   'Blanc Pur 30':'431','Amande':'432','Noir':'425','Brownstone':'471',
   'Bleu littoral':'4P9','Espresso':'43P','Gris Hudson':'4C2',
   'Minerai de fer':'4P6','Rouge majestueux':'4C5','Bleu crépuscule':'4C6','Fougère des prés':'4C3',
   'Vagues de minuit':'409','Poussière de lune':'416','Brun Rockport':'4C4','Bleu Rockwell':'4P2'
  };
  const existing=new Set(gentek.colors.map(c=>c.id));
  const references=(find('gentek-fascia6-ribbed')?.colors||[]).filter(c=>!existing.has(c.id)).map(c=>{
   const code=documented[c.name];
   return {...c,code:code||c.code,sourceUrl:code?sourceUrl:c.sourceUrl,availabilityAtProfile:code?'documented':'unverified',
    availabilityNote:code?'Teinte indiquée pour le 3037 dans la matrice Gentek. Stock et fini à confirmer.':'Référence aluminium Gentek. Disponibilité du rouleau 3037 à confirmer.'};
  });
  gentek.colors=[...gentek.colors,...references];
 }
}
function macSteelPalette(catalogue){
 const sourceUrl='https://macmetalarchitectural.com/nos-couleurs/';
 const swatches=new Map(catalogue.filter(m=>m.brand==='MAC Métal architectural').flatMap(m=>(m.colors||[]).map(c=>[c.name,c.swatchUrl||c.swatchImage])));
 const collections=[
  ['Inspiration',[[101,'Blanc Titane'],[102,'Noir Titane'],[103,'Gris Métallique'],[104,'Cuivre Métallisé'],[105,'Gris Ardoise'],[106,'Gris Fusain'],[107,'Rouge Vif'],[108,'Bleu Automne'],[109,'Rouge Grès'],[110,'Vert Anglais'],[111,'Brun Foncé'],[112,'Noir Onyx']]],
  ['Signature',[[202,'Anthracite'],[203,'Zinc Brossé'],[204,'Quartz Cendré'],[205,'Bronze Cuivré']]],
  ['Bois',[[301,'Torréfié'],[302,'Cèdre'],[303,'Noyer Noir'],[304,'Bouleau Fumé'],[305,'Frêne Gris'],[306,'Pin Scandinave'],[310,'Chêne Blanc'],[312,'Teck'],[313,'Liège']]]
 ];
 return {id:'mac-acier-moulures',brand:'MAC Métal architectural',name:'Nuancier acier pour moulures',family:'acier',steelProfileOnly:true,sourceUrl,
  colors:collections.flatMap(([collection,entries])=>entries.map(([code,name])=>({id:'mac-acier-'+code,code:String(code),name,collection,sourceUrl,swatchUrl:swatches.get(name),availabilityNote:'Référence MAC. Disponibilité du rouleau, calibre et fini à confirmer pour cette moulure.'})))};
}
function catalogue(products){
 expandAluminumPalettes(products);
 return [...products.filter(product=>(product.applications||[]).includes('bending')),macSteelPalette(products)];
}
function forMetal(products,metal){
 const type=metal==='steel'||metal==='acier'?'steel':metal==='aluminum'||metal==='aluminium'?'aluminum':null;
 return products.filter(p=>!p.architecturalPanel&&type===(p.steelProfileOnly||/acier/i.test(p.family||p.name)?'steel':'aluminum'));
}
root.MIRBendingFinishes=Object.freeze({catalogue,forMetal});
})(typeof window==='object'?window:globalThis);
