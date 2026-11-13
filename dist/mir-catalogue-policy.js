(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MIRCataloguePolicy=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('fr-CA');
  const woodLike=value=>/^(?:noyer noir|chene blanc|bois blanchi|whitewashed)\b/.test(value);
  const matchesBase=(value,words)=>!woodLike(value)&&words.some(word=>value===word||value.startsWith(word+' ')||new RegExp('(?:^|[-/·]\\s*)'+word+'(?:\\s|$)').test(value));
  function priority(color){
    const values=[color?.name,color?.code,color?.commercialName,color?.officialName].map(fold);
    if(values.some(value=>matchesBase(value,['noir','black'])))return 0;
    if(values.some(value=>matchesBase(value,['blanc','white','bright white','pure white','bone white','imperial white','cambridge white'])))return 1;
    return 2;
  }
  function selectable(color){
    return !!color&&color.verified!==false&&color.archived!==true&&color.available!==false&&color.compatible!==false&&color.status!=='archived'&&color.availabilityAtProfile!=='unavailable';
  }
  function sortColors(colors){
    return (Array.isArray(colors)?colors:[]).map((color,index)=>({color,index})).filter(row=>selectable(row.color))
      .sort((a,b)=>priority(a.color)-priority(b.color)||a.index-b.index).map(row=>row.color);
  }
  return Object.freeze({fold,priority,selectable,sortColors});
});
