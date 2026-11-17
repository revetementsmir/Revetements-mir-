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
  let measureContext;
  function widthOf(value,size=14,weight='400'){
    if(browser?.document){measureContext ||= browser.document.createElement('canvas').getContext('2d');if(measureContext){measureContext.font=weight+' '+size+'px Arial';return measureContext.measureText(value).width;}}
    return [...String(value)].reduce((sum,c)=>sum+(/[MW@%]/.test(c)?.9:/[ilI1 .,;:!|]/.test(c)?.28:/[A-Z0-9]/.test(c)?.65:.5)*size,0);
  }
  function wrap(value,max=46,locale='fr-CA',width=Infinity,size=14,weight='400'){
    // Fields are normalized once. Do not truncate their joined display text.
    const words=String(value??'').replace(/\s+/g,' ').trim().split(/\s+/).filter(Boolean),parts=[];
    let current='';
    for(const original of words){
      let word=original;
      while(word.length>max||widthOf(word,size,weight)>width){
        if(current){parts.push(current);current='';}
        let end=Math.min(max,word.length);while(end>1&&widthOf(word.slice(0,end),size,weight)>width)end--;
        parts.push(word.slice(0,end));word=word.slice(end);
      }
      if(word){
        const next=current?current+' '+word:word;
        if((next.length>max||widthOf(next,size,weight)>width)&&current){parts.push(current);current=word;}
        else current=next;
      }
    }
    if(current)parts.push(current);
    return parts.length?parts:[locale==='en-CA'?'To confirm':'À confirmer'];
  }
  function text(x,y,value,{size=26,color='#242522',weight='400'}={}){
    return '<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="'+weight+'">'+xml(value)+'</text>';
  }
  function normalize(items,locale='fr-CA'){
    if(!Array.isArray(items))throw Error(locale==='en-CA'?'Invalid materials selection.':'Sélection de matériaux invalide.');
    return items.map((item,index)=>{
      const quantity=Number(item?.quantity),en=locale==='en-CA';
      if(!item||!clean(item.name)||!Number.isFinite(quantity)||quantity<=0||quantity>1000000)
        throw Error((locale==='en-CA'?'Invalid quantity or reference on line ':'Quantité ou référence invalide à la ligne ')+(index+1)+'.');
      return {
        reference:clean(item.manufacturerReference||item.reference)||(en?'To confirm':'À confirmer'),name:clean(item.name),brand:clean(item.brand)||(en?'Manufacturer to confirm':'Fabricant à confirmer'),
        color:clean(item.colorName)||(en?'To confirm':'À confirmer'),format:clean([item.formatName, browser?.MIRCommerceValidateQuantity&&!browser.MIRCommerceValidateQuantity(item).ok?(en?'QUANTITY TO CORRECT: ':'QUANTITÉ À CORRIGER : ')+browser.MIRCommerceValidateQuantity(item).message:''].filter(Boolean).join(' · ')),
        quantity,unit:clean(item.unit)||(en?'pieces':'pièces')
      };
    });
  }
  // Only presentation labels change: stored quantities, units and product formats stay intact.
  function displayUnit(unit,locale){
    if(locale!=='en-CA')return unit;
    return ({'pièces':'pieces','pièce':'piece','pi²':'sq ft','pi2':'sq ft','pi':'ft','po':'in.','po²':'sq in','mm':'mm','m²':'sq m'})[unit]||unit;
  }
  function displayFormat(format,locale){
    if(locale!=='en-CA')return format;
    return String(format).replace(/\bpi²\b/g,'sq ft').replace(/\bpi\b/g,'ft').replace(/\bpo\b/g,'in.');
  }
  function itemRows(items,locale='fr-CA'){return items.map((item,i)=>{const cells=[String(i+1).padStart(2,'0'),[item.name,item.reference].join(' · '),item.brand,[item.color,displayFormat(item.format,locale)].filter(Boolean).join(' · '),String(item.quantity.toLocaleString(locale,{maximumFractionDigits:6})),displayUnit(item.unit,locale)],limits=[3,40,24,30,12,12],widths=[26,236,125,173,72,82],lines=cells.map((v,j)=>j===1?[...wrap(item.name,limits[j],locale,widths[j]),...wrap(item.reference,limits[j],locale,widths[j])]:j===3?[...wrap(item.color,limits[j],locale,widths[j]),...wrap(displayFormat(item.format,locale),limits[j],locale,widths[j])]:wrap(v,limits[j],locale,widths[j]));return {item,index:i+1,lines,height:Math.max(85,24+20*Math.max(...lines.map(x=>x.length)))};});}
  function groups(rows,available,locale){
    const pages=[];let current=[],height=0;
    const flush=()=>{if(current.length)pages.push(current);current=[];height=0;};
    const add=row=>{if(height+row.height>available)flush();current.push(row);height+=row.height;};
    for(const row of rows){
      if(row.height<=available){add(row);continue;}
      // A long product/reference is continued, never clipped or silently lost.
      // Quantities and units appear once, on the first fragment only.
      flush();const total=Math.max(...row.lines.map(x=>x.length));let offset=0;
      while(offset<total){
        const continuation=offset>0,capacity=Math.max(1,Math.floor((available-24)/20)-(continuation?1:0)),count=Math.min(capacity,total-offset);
        const lines=row.lines.map((cell,j)=>j===0||j===4||j===5?(continuation?[]:cell):cell.slice(offset,offset+count));
        if(continuation)lines[1].unshift((locale==='en-CA'?'Continued · item ':'Suite · article ')+String(row.index).padStart(2,'0'));
        add({...row,lines,height:Math.max(85,24+20*Math.max(...lines.map(x=>x.length)))});offset+=count;
        if(offset<total)flush();
      }
    }
    flush();return pages;
  }
  function drawing(rows,project,page,total,excluded,locale='fr-CA'){
   const en=locale==='en-CA',projectRows=wrap((en?'Project: ':'Projet : ')+(project||(en?'To confirm':'À confirmer')),130,locale,770,16,'700'),tableY=210+(projectRows.length-1)*20;
   const x=[40,74,320,455,638,720],parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 1100">'];
   projectRows.forEach((line,i)=>parts.push(text(40,190+i*20,line,{size:16,weight:'700'})));
   parts.push('<rect x="40" y="'+tableY+'" width="770" height="38" fill="#e9e2d6"/>');
   (en?['No.','ITEM / REFERENCE','MANUFACTURER','FINISH / SIZE','QUANTITY','UNIT']:['N°','ARTICLE / RÉFÉRENCE','FABRICANT','FINI / FORMAT','QUANTITÉ','UNITÉ']).forEach((v,j)=>parts.push(text(x[j]+4,tableY+24,v,{size:12,weight:'700'})));
   let y=tableY+38;for(const row of rows){if(row.index%2===0)parts.push('<rect x="40" y="'+y+'" width="770" height="'+row.height+'" fill="#f4f1ea"/>');row.lines.forEach((lines,j)=>lines.forEach((v,k)=>parts.push(text(x[j]+4,y+25+k*20,v,{size:14,weight:j===0?'700':'400'}))));y+=row.height;parts.push('<path d="M40 '+y+'H810" stroke="#d8cdbc"/>');}
   parts.push(text(40,950,en?'Preparation document: this is NOT an order.':'Document de préparation : ceci ne constitue PAS une commande.',{size:14,weight:'700'}));
   parts.push(text(40,973,en?'MIR must confirm pricing, stock, sales units and compatibility.':'Prix, stocks, unités de vente et compatibilités à confirmer par MIR.',{size:13}));
   if(excluded>0)parts.push(text(40,995,excluded+(en?' hidden or unavailable reference(s), excluded from this PDF.':' référence(s) masquée(s) ou indisponible(s), exclue(s) de ce PDF.'),{size:12,color:'#9a5b22'}));
   parts.push('</svg>');return parts.join('');
  }
  function buildOptions({project='',reference='',items=[],excludedCount=0,locale=browser?.MIRClientLocale?.getLocale?.()||'fr-CA'}={}){
    locale=locale==='en-CA'?'en-CA':'fr-CA';const en=locale==='en-CA';
    const normalized=normalize(items,locale);
    if(!normalized.length)throw Error(en?'No materials are available in your selection.':'Aucun matériau disponible dans votre sélection.');
    const projectRows=wrap((en?'Project: ':'Projet : ')+(clean(project)||(en?'To confirm':'À confirmer')),130,locale,770,16,'700');
    const rows=itemRows(normalized,locale),pages=groups(rows,920-(248+(projectRows.length-1)*20),locale);
    return {
      title:en?'MIR — Materials selection':'MIR — Sélection de matériaux',
      subtitle:clean(project)||(en?'Your project':'Votre projet'),
      filename:en?'MIR-materials-selection-en-CA.pdf':'MIR-selection-materiaux.pdf',
      faces:pages.map((page,i)=>({
        name:(en?'Selection · page ':'Sélection · page ')+(i+1)+' / '+pages.length,
        layout:'mir-dossier',documentTitle:en?'MATERIALS SELECTION':'SÉLECTION DE MATÉRIAUX',reference:clean(reference)||clean(project)||(en?'Project to confirm':'Projet à confirmer'),
        svg:drawing(page,clean(project),i+1,pages.length,Number(excludedCount)||0,locale),
        summary:en?['This list is stored locally and is not an order.','Quantities and sales units must be verified · No pricing or payment confirmed.']:['Cette liste est conservée localement et ne constitue pas une commande.','Quantités et unités à valider · Aucun prix ou paiement confirmé.'],
        scaleNote:en?'Estimated materials list, not to scale; fabrication quantities are not guaranteed.':'Liste de besoins estimés, sans échelle ni quantités de fabrication garanties.',
        footerNote:en?'Les Revêtements MIR · Pricing, delivery and availability subject to confirmation.':'Les Revêtements MIR · Prix, livraison et disponibilité sur confirmation.'
      }))
    };
  }
  return Object.freeze({version:'1.0.0',buildOptions,normalize});
});
