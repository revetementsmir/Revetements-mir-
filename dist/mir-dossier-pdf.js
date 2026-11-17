/* One frame per sheet, used only by client dossier faces. Vector SVG and text. */
(function(root){'use strict';let loading,logo,fonts;
const clientEN=()=>root.MIRClientLocale?.isClient?.(root.location?.pathname,root.location?.search)===true&&root.MIRClientLocale?.getLocale?.()==='en-CA';
const tr=(fr,en)=>clientEN()?en:fr;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error(tr('Le moteur PDF local ne charge pas. Réessayez.','The local PDF engine could not load. Try again.')));document.head.append(s);});}
/* Only the metadata band is rearranged. Drawing groups, dimensions and source
 * objects are never changed. Long metadata continues on a separate sheet. */
function wrap(value,size,width=770,weight='400'){
 const context=document.createElement('canvas').getContext('2d');context.font=weight+' '+size+'px MIRDossier';
 const rows=[];let line='';
 for(let word of String(value||'').split(/\s+/).filter(Boolean)){
  while(context.measureText(word).width>width){
   if(line){rows.push(line);line='';}let count=word.length;
   while(count>1&&context.measureText(word.slice(0,count)).width>width)count--;
   rows.push(word.slice(0,count));word=word.slice(count);
  }
  if(!word)continue;
  if(line&&context.measureText(line+' '+word).width>width){rows.push(line);line=word;}
  else line+=(line?' ':'')+word;
 }
 if(line)rows.push(line);return rows;
}
function addText(body,group,value,y,size=12,weight='400'){
 const node=body.ownerDocument.createElementNS('http://www.w3.org/2000/svg','text');
 for(const [key,v] of Object.entries({x:40,y,'font-size':size,'font-weight':weight,fill:'#242522'}))node.setAttribute(key,String(v));
 node.textContent=value;group.append(node);
}
function relocateProductionHeader(body){
 const group=body.querySelector(':scope > g');if(!group)return [];
 const header=[...group.children].filter(n=>n.localName==='text'&&n.getAttribute('x')==='40')
  .map(node=>({node,y:Number(node.getAttribute('y')),size:Number(node.getAttribute('font-size')),value:node.textContent||''}));
 const primary=header.some(x=>x.y===91&&/^(DOSSIER DE PLIAGE|MISE EN PRODUCTION|CUSTOM BENDING FILE|PRODUCTION SHEET)/.test(x.value));
 const continued=header.some(x=>x.y===120&&/^Continuation/.test(x.value));
 if(!primary&&!continued)return [];
 // Continuation detail columns begin at y=260 and must stay exactly there.
 const owned=continued?header.filter(x=>x.size===20||(x.y===205&&x.size===13)):header.filter(x=>x.y<300&&(x.size===18||x.size===12));
 let item=owned.filter(x=>primary?x.size===18:x.size===20).map(x=>x.value).join(' ').trim();
 let meta=owned.filter(x=>primary?x.size===12&&x.y!==91:x.y===205&&x.size===13).map(x=>x.value).join(' ').trim();
 if(clientEN()&&continued){
  item=item.replace(/^Continuation — quantité déjà comptée/,'Continued — quantity already counted');
  if(meta==='Bloc complémentaire seulement · aucun dessin, matériau, longueur ou quantité répété.')meta='Additional information only · no drawing, material, length or quantity repeated.';
 }
 if(clientEN())meta=meta.replace(/\bCommande : /g,'Order: ').replace(/\bChantier : /g,'Jobsite: ').replace(/\bChef : /g,'Foreman: ').replace(/\bDate : /g,'Date: ').replace(/\bRévision : /g,'Revision: ').replace(/À préciser/g,'To confirm');
 const lines=[...wrap(item,14,770,'700').map(value=>({value,size:14,weight:'700',step:17})),...wrap(meta,10).map(value=>({value,size:10,weight:'400',step:12}))];
 for(const x of owned)x.node.remove();
 if(lines.reduce((sum,x)=>sum+x.step,0)>57){
  addText(body,group,wrap(item,14,770,'700')[0]||'',180,14,'700');
  addText(body,group,tr('Identification complète en annexe · aucune quantité supplémentaire.','Full identification in appendix · no additional quantity.'),205,11);
  return [item,meta];
 }
 let y=180;for(const line of lines){addText(body,group,line.value,y,line.size,line.weight);y+=line.step;}
 return [];
}
function prepareFaces(faces,options){
 const prepared=[];
 for(const face of faces){
  const body=new DOMParser().parseFromString(face.svg,'image/svg+xml').documentElement;
  if(body.querySelector('parsererror'))throw Error('Dessin PDF invalide.');
  const supplement=relocateProductionHeader(body),reference=face.reference||options.reference||options.subtitle||tr('Projet à confirmer','Project to confirm');
  const referenceRows=wrap(reference,12,758);if(referenceRows.length>2)supplement.unshift(reference);
  const shown=referenceRows.slice(0,2);if(referenceRows.length>2)shown[1]+='…';
  prepared.push({...face,body,referenceRows:shown});
  // Extreme references have a readable continuation, not tiny or missing text.
  if(supplement.length){
   const rows=supplement.flatMap(value=>[...wrap(value,14), '']);
   for(let start=0;start<rows.length;start+=35){
    const extra=new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg"/>','image/svg+xml').documentElement;
    rows.slice(start,start+35).forEach((value,i)=>addText(extra,extra,value,205+i*21,14));
    addText(extra,extra,tr('Informations complémentaires seulement · quantités déjà comptées.','Additional information only · quantities already counted.'),180,12,'700');
    prepared.push({documentTitle:tr('IDENTIFICATION DU DOSSIER','FILE IDENTIFICATION'),body:extra,referenceRows:[tr('Annexe au document précédent','Appendix to the preceding document')]});
   }
  }
 }
 return prepared;
}
async function make(options){const locale=clientEN()?'en-CA':'fr-CA';if(!loading)loading=script('vendor/mir-pdf/jspdf.umd.min.js').then(()=>script('vendor/mir-pdf/svg2pdf.umd.min.js')).catch(e=>{loading=null;throw e;});await loading;
 if(!logo)logo=fetch('assets/MIR-logo-officiel-original.svg').then(r=>{if(!r.ok)throw Error('Logo MIR introuvable.');return r.text();}).catch(e=>{logo=null;throw e;});
 if(!fonts)fonts=Promise.all(['Regular','Bold'].map(async weight=>{const r=await fetch('vendor/pdfjs/standard_fonts/LiberationSans-'+weight+'.ttf');if(!r.ok)throw Error('Police PDF introuvable.');const bytes=await r.arrayBuffer(),face=new FontFace('MIRDossier',bytes,{weight:weight==='Bold'?'700':'400'});await face.load();document.fonts.add(face);let binary='';for(const x of new Uint8Array(bytes))binary+=String.fromCharCode(x);return {name:weight,base64:btoa(binary)};})).catch(e=>{fonts=null;throw e;});
 const official=await logo,fontFiles=await fonts,pdf=new root.jspdf.jsPDF({unit:'pt',format:'letter',compress:true}),faces=options.faces;for(const f of fontFiles){pdf.addFileToVFS('MIR-'+f.name+'.ttf',f.base64);pdf.addFont('MIR-'+f.name+'.ttf','MIRDossier',f.name==='Bold'?'bold':'normal');}
 const prepared=prepareFaces(faces,options);
 for(let i=0;i<prepared.length;i++){if(i)pdf.addPage('letter','portrait');const face=prepared[i];options.onProgress?.((locale==='en-CA'?'Creating page ':'Création de la feuille ')+(i+1)+' / '+prepared.length);
 const body=face.body;
 const background=body.querySelector(':scope > rect');if(background?.getAttribute('width')==='850'&&background?.getAttribute('height')==='1100')background.remove();
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 850 1100');svg.setAttribute('width','850');svg.setAttribute('height','1100');svg.setAttribute('font-family','Arial');
 const title=face.documentTitle||tr('DOSSIER D’ESTIMATION','ESTIMATE FILE');
 svg.innerHTML='<rect width="850" height="1100" fill="#fff"/><svg x="40" y="27" width="205" height="52" viewBox="0 0 363.68 91.133">'+official.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'')+'</svg><text x="810" y="49" text-anchor="end" font-size="13" fill="#625e55">'+esc(new Intl.DateTimeFormat(locale,{year:'numeric',month:'short',day:'numeric'}).format(new Date()))+'</text><path d="M40 95H810" stroke="#bda889" stroke-width="3"/><text x="40" y="127" font-size="23" font-weight="bold" fill="#242522">'+esc(title)+'</text>'+face.referenceRows.map((value,n)=>'<text x="40" y="'+(148+n*14)+'" font-size="12" fill="#625e55">'+esc(value)+'</text>').join('')+body.innerHTML+'<path d="M40 1020H810" stroke="#d8cdbc"/><text x="40" y="1043" font-size="12" fill="#625e55">'+esc(tr('Demande de soumission · validation MIR requise avant fabrication.','Quote request · MIR approval required before fabrication.'))+'</text><text x="40" y="1063" font-size="11" fill="#625e55">'+esc(tr('Cotes exactes indiquées. Ne pas mesurer sur le dessin imprimé.','Exact dimensions shown. Do not measure from the printed drawing.'))+'</text><text x="810" y="1063" text-anchor="end" font-size="12">'+(i+1)+' / '+prepared.length+'</text>';
 svg.setAttribute('font-family','MIRDossier');for(const node of svg.querySelectorAll('text,g'))node.setAttribute('font-family','MIRDossier');
 await pdf.svg(svg,{x:0,y:0,width:612,height:792});
 }
 pdf.setProperties({title:options.title,author:'Les Revêtements MIR',creator:'MIR — Dossiers client'});return {blob:pdf.output('blob'),filename:options.filename,pages:prepared.length};
}
root.MIRDossierPDF=Object.freeze({make});})(window);
