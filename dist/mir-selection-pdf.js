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
        name:clean(item.name),brand:clean(item.brand)||'Fabricant à confirmer',
        color:clean(item.colorName)||'À confirmer',format:clean([item.formatName, browser?.MIRCommerceValidateQuantity&&!browser.MIRCommerceValidateQuantity(item).ok?'QUANTITÉ À CORRIGER : '+browser.MIRCommerceValidateQuantity(item).message:''].filter(Boolean).join(' · ')),
        quantity,unit:clean(item.unit)||'pièces'
      };
    });
  }
  function itemRows(items){
    return items.map((item,i)=>{
      const heading=wrap(item.name,43),details=wrap(item.color+(item.format?' · '+item.format:''),37);
      const height=Math.max(105,58+32*Math.max(heading.length,details.length));
      return {item,index:i+1,heading,details,height};
    });
  }
  function groups(rows){
    const pages=[];let rowsOnPage=[],height=0;
    for(const row of rows){
      if(rowsOnPage.length&&height+row.height>780){pages.push(rowsOnPage);rowsOnPage=[];height=0;}
      rowsOnPage.push(row);height+=row.height;
    }
    if(rowsOnPage.length)pages.push(rowsOnPage);
    return pages;
  }
  function drawing(rows,project,page,total,excluded){
    const drawingHeight=347+rows.reduce((a,x)=>a+x.height,0)+175;
    const h=Math.max(1150,drawingHeight),parts=[];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 '+h+'">');
    parts.push('<rect width="1600" height="'+h+'" fill="#ffffff"/>');
    parts.push('<rect x="50" y="42" width="9" height="95" fill="#348511"/>');
    parts.push(text(86,90,'LES REVÊTEMENTS MIR',{size:42,weight:'700'}));
    parts.push(text(86,138,'SÉLECTION DE MATÉRIAUX — À CONFIRMER',{size:25,color:'#36643a',weight:'700'}));
    const projectLines=wrap(project||'Projet sans nom',78);
    parts.push(text(50,199,'Projet : '+projectLines[0],{size:26,weight:'700'}));
    projectLines.slice(1).forEach((line,i)=>parts.push(text(50,230+i*30,line,{size:23})));
    parts.push(text(50,258,'Références souhaitées · quantités non validées · page '+page+' / '+total,{size:22,color:'#607264'}));
    parts.push('<rect x="50" y="285" width="1500" height="47" fill="#ebf2e7"/>');
    parts.push(text(70,317,'N°',{size:22,weight:'700'}));
    parts.push(text(155,317,'MATÉRIAU / FABRICANT',{size:22,weight:'700'}));
    parts.push(text(825,317,'COULEUR / FORMAT',{size:22,weight:'700'}));
    parts.push(text(1370,317,'BESOIN',{size:22,weight:'700'}));
    let y=347;
    for(const row of rows){
      const {item,heading,details,index,height}=row;
      if(index%2===0)parts.push('<rect x="50" y="'+y+'" width="1500" height="'+height+'" fill="#f6f8f4"/>');
      parts.push(text(70,y+34,String(index).padStart(2,'0'),{size:24,weight:'700'}));
      heading.forEach((line,i)=>parts.push(text(155,y+34+i*32,line,{size:25,weight:i===0?'700':'400'})));
      parts.push(text(155,y+34+heading.length*32,item.brand,{size:22,color:'#657567'}));
      details.forEach((line,i)=>parts.push(text(825,y+34+i*32,line,{size:23,color:'#344837'})));
      parts.push(text(1370,y+34,String(item.quantity.toLocaleString('fr-CA',{maximumFractionDigits:3})),{size:24,weight:'700'}));
      parts.push(text(1370,y+63,item.unit,{size:20,color:'#657567'}));
      y+=height;
    }
    const notesY=h-120;
    parts.push('<path d="M50 '+(notesY-24)+' H1550" stroke="#cbd8c8" stroke-width="2"/>');
    parts.push(text(50,notesY+9,'Document de préparation : ceci ne constitue PAS une commande.',{size:24,weight:'700'}));
    parts.push(text(50,notesY+44,'Prix, stocks, unités de vente et compatibilités à confirmer par MIR.',{size:22}));
    if(excluded>0)parts.push(text(50,notesY+78,excluded+' référence(s) masquée(s) ou indisponible(s), exclue(s) de ce PDF.',{size:21,color:'#9a5b22'}));
    parts.push('</svg>');
    return parts.join('');
  }
  function buildOptions({project='',items=[],excludedCount=0}={}){
    const normalized=normalize(items);
    if(!normalized.length)throw Error('Aucun matériau disponible dans votre sélection.');
    const rows=itemRows(normalized),pages=groups(rows);
    return {
      title:'MIR — Sélection de matériaux',
      subtitle:clean(project)||'Votre projet',
      filename:'MIR-selection-materiaux.pdf',
      faces:pages.map((page,i)=>({
        name:'Sélection · page '+(i+1)+' / '+pages.length,
        layout:'wide',
        svg:drawing(page,clean(project),i+1,pages.length,Number(excludedCount)||0),
        summary:['Cette liste est conservée localement et ne constitue pas une commande.','Quantités et unités à valider · Aucun prix ou paiement confirmé.'],
        scaleNote:'Liste de besoins estimés, sans échelle ni quantités de fabrication garanties.',
        footerNote:'Les Revêtements MIR · Prix, livraison et disponibilité sur confirmation.'
      }))
    };
  }
  return Object.freeze({version:'1.0.0',buildOptions,normalize});
});
