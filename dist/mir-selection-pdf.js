/* MIR — export PDF de la sélection client.
 * Présente les besoins sans prix, paiement ni promesse de disponibilité.
 * Aucune donnée envoyée; le moteur PDF local existant prépare le téléchargement.
 */
(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIRSelectionPDF=api;
})(typeof window==='object'?window:null,function(browser){
  'use strict';
  const xml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function clean(value){
    return String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,600);
  }
  function wrap(value,max=46){
    const words=clean(value).split(/\s+/).filter(Boolean),parts=[];
    let current='';
    for(const original of words){
      let word=original;
      while(word.length>max){
        if(current){parts.push(current);current='';}
        parts.push(word.slice(0,max));word=word.slice(max);
      }
      if(word){
        const next=current?current+' '+word:word;
        if(next.length>max&&current){parts.push(current);current=word;}
        else current=next;
      }
    }
    if(current)parts.push(current);
    return parts.length?parts:['À confirmer'];
  }
  function text(x,y,value,{size=26,color='#25362a',weight='400'}={}){
    return '<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="'+weight+'">'+xml(value)+'</text>';
  }
  function normalize(items){
    if(!Array.isArray(items))throw Error('Sélection de matériaux invalide.');
    return items.map((item,index)=>{
      const quantity=Number(item?.quantity);
      if(!item||!clean(item.name)||!Number.isFinite(quantity)||quantity<=0||quantity>1000000)
        throw Error('Quantité ou référence invalide à la ligne '+(index+1)+'.');
      return {
        reference:clean(item.manufacturerReference||item.reference)||'À confirmer',name:clean(item.name),brand:clean(item.brand)||'Fabricant à confirmer',
        color:clean(item.colorName)||'À confirmer',format:clean([item.formatName, browser?.MIRCommerceValidateQuantity&&!browser.MIRCommerceValidateQuantity(item).ok?'QUANTITÉ À CORRIGER : '+browser.MIRCommerceValidateQuantity(item).message:''].filter(Boolean).join(' · ')),
        quantity,unit:clean(item.unit)||'pièces'
      };
    });
  }
  function itemRows(items){return items.map((item,i)=>{const cells=[String(i+1).padStart(2,'0'),[item.name,item.reference].join(' · '),item.brand,[item.color,item.format].filter(Boolean).join(' · '),String(item.quantity.toLocaleString('fr-CA',{maximumFractionDigits:6})),item.unit],limits=[3,31,17,22,9,9],lines=cells.map((v,j)=>wrap(v,limits[j]));return {item,index:i+1,lines,height:Math.max(85,24+20*Math.max(...lines.map(x=>x.length)))};});}
  function groups(rows){const pages=[];let current=[],height=0;for(const row of rows){if(height+row.height>650&&current.length){pages.push(current);current=[];height=0;}current.push(row);height+=row.height;}if(current.length)pages.push(current);return pages;}
  function drawing(rows,project,page,total,excluded){
   const x=[40,74,320,455,638,720],parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 1100">'];
   parts.push(text(40,190,'Projet : '+(project||'À confirmer'),{size:16,weight:'700'}));
   parts.push('<rect x="40" y="210" width="770" height="38" fill="#edf2e8"/>');
   ['N°','ARTICLE / RÉFÉRENCE','FABRICANT','FINI / FORMAT','QUANTITÉ','UNITÉ'].forEach((v,j)=>parts.push(text(x[j]+4,234,v,{size:12,weight:'700'})));
   let y=248;for(const row of rows){if(row.index%2===0)parts.push('<rect x="40" y="'+y+'" width="770" height="'+row.height+'" fill="#f7f8f5"/>');row.lines.forEach((lines,j)=>lines.forEach((v,k)=>parts.push(text(x[j]+4,y+25+k*20,v,{size:14,weight:j===0?'700':'400'}))));y+=row.height;parts.push('<path d="M40 '+y+'H810" stroke="#d7ded2"/>');}
   parts.push(text(40,950,'Document de préparation : ceci ne constitue PAS une commande.',{size:14,weight:'700'}));
   parts.push(text(40,973,'Prix, stocks, unités de vente et compatibilités à confirmer par MIR.',{size:13}));
   if(excluded>0)parts.push(text(40,995,excluded+' référence(s) masquée(s) ou indisponible(s), exclue(s) de ce PDF.',{size:12,color:'#9a5b22'}));
   parts.push('</svg>');return parts.join('');
  }
  function buildOptions({project='',reference='',items=[],excludedCount=0}={}){
    const normalized=normalize(items);
    if(!normalized.length)throw Error('Aucun matériau disponible dans votre sélection.');
    const rows=itemRows(normalized),pages=groups(rows);
    return {
      title:'MIR — Sélection de matériaux',
      subtitle:clean(project)||'Votre projet',
      filename:'MIR-selection-materiaux.pdf',
      faces:pages.map((page,i)=>({
        name:'Sélection · page '+(i+1)+' / '+pages.length,
        layout:'mir-dossier',documentTitle:'SÉLECTION DE MATÉRIAUX',reference:clean(reference)||clean(project)||'Projet à confirmer',
        svg:drawing(page,clean(project),i+1,pages.length,Number(excludedCount)||0),
        summary:['Cette liste est conservée localement et ne constitue pas une commande.','Quantités et unités à valider · Aucun prix ou paiement confirmé.'],
        scaleNote:'Liste de besoins estimés, sans échelle ni quantités de fabrication garanties.',
        footerNote:'Les Revêtements MIR · Prix, livraison et disponibilité sur confirmation.'
      }))
    };
  }
  return Object.freeze({version:'1.0.0',buildOptions,normalize});
});
