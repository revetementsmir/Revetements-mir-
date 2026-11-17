/* One frame per sheet, used only by client dossier faces. Vector SVG and text. */
(function(root){'use strict';let loading,logo,fonts;
const clientEN=()=>root.MIRClientLocale?.isClient?.(root.location?.pathname,root.location?.search)===true&&root.MIRClientLocale?.getLocale?.()==='en-CA';
const tr=(fr,en)=>clientEN()?en:fr;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error(tr('Le moteur PDF local ne charge pas. Réessayez.','The local PDF engine could not load. Try again.')));document.head.append(s);});}
/* The production-model client sheets already contain their own heading.
 * Relocate that text into the available band beneath the single MIR masthead.
 * Never alter the actual drawing group, dimensions, data, or body layout. */
function relocateProductionHeader(body){
 const group=body.querySelector(':scope > g');if(!group)return;
 const header=[...group.children].filter(n=>n.localName==='text'&&n.getAttribute('x')==='40')
   .map(node=>({node,y:Number(node.getAttribute('y')),value:node.textContent||''}))
   .filter(item=>item.y>=85&&item.y<225).sort((a,b)=>a.y-b.y);
 if(!header.some(x=>x.y===91&&/^(DOSSIER DE PLIAGE|MISE EN PRODUCTION|CUSTOM BENDING FILE|PRODUCTION SHEET)/.test(x.value)))return;
 const item=header.filter(x=>x.y>=121&&x.y<154).map(x=>x.value).join(' ').trim();
 let meta=header.filter(x=>x.y>=154).map(x=>x.value).join(' ').trim();
 if(clientEN()){
  meta=meta.replace(/\bCommande : /g,'Order: ').replace(/\bChantier : /g,'Jobsite: ')
   .replace(/\bChef : /g,'Foreman: ').replace(/\bDate : /g,'Date: ')
   .replace(/\bRévision : /g,'Revision: ').replace(/À préciser/g,'To confirm');
 }
 for(const x of header)x.node.remove();
 const wrap=(value,max)=>{
  const lines=[];let current='';
  for(const word of String(value||'').split(/\s+/).filter(Boolean)){
   if(current&&current.length+word.length+1>max){lines.push(current);current=word;}
   else current+=(current?' ':'')+word;
  }
  if(current)lines.push(current);
  return lines;
 };
 const itemRows=wrap(item,100),metaRows=wrap(meta,105);
 const lines=[...itemRows.map(value=>({value,weight:'700',size:14})),
             ...metaRows.map(value=>({value,weight:'400',size:10}))];
 // Only presentation metadata lives in this 68px band. For unusually long
 // references keep all characters, reducing the step rather than truncating.
 const available=218-169,step=Math.min(16,available/Math.max(1,lines.length-1));
 lines.forEach((line,i)=>{
  const node=body.ownerDocument.createElementNS('http://www.w3.org/2000/svg','text');
  node.setAttribute('x','40');node.setAttribute('y',String(169+i*step));
  node.setAttribute('font-size',String(lines.length>5?9:line.size));
  node.setAttribute('font-weight',line.weight);
  node.setAttribute('fill','#34483d');node.textContent=line.value;
  group.insertBefore(node,group.firstChild);
 });
}
async function make(options){const locale=clientEN()?'en-CA':'fr-CA';if(!loading)loading=script('vendor/mir-pdf/jspdf.umd.min.js').then(()=>script('vendor/mir-pdf/svg2pdf.umd.min.js')).catch(e=>{loading=null;throw e;});await loading;
 if(!logo)logo=fetch('assets/MIR-logo-officiel-original.svg').then(r=>{if(!r.ok)throw Error('Logo MIR introuvable.');return r.text();}).catch(e=>{logo=null;throw e;});
 if(!fonts)fonts=Promise.all(['Regular','Bold'].map(async weight=>{const r=await fetch('vendor/pdfjs/standard_fonts/LiberationSans-'+weight+'.ttf');if(!r.ok)throw Error('Police PDF introuvable.');const bytes=await r.arrayBuffer(),face=new FontFace('MIRDossier',bytes,{weight:weight==='Bold'?'700':'400'});await face.load();document.fonts.add(face);let binary='';for(const x of new Uint8Array(bytes))binary+=String.fromCharCode(x);return {name:weight,base64:btoa(binary)};})).catch(e=>{fonts=null;throw e;});
 const official=await logo,fontFiles=await fonts,pdf=new root.jspdf.jsPDF({unit:'pt',format:'letter',compress:true}),faces=options.faces;for(const f of fontFiles){pdf.addFileToVFS('MIR-'+f.name+'.ttf',f.base64);pdf.addFont('MIR-'+f.name+'.ttf','MIRDossier',f.name==='Bold'?'bold':'normal');}
 if(faces.some(f=>f.layout==='mir-site-five')){
  if(faces.length!==5||faces.some((f,i)=>f.layout!=='mir-site-five'||f.key!==['front','right','back','left','soffits'][i]))throw Error('Le PDF chantier doit contenir exactement les cinq vues ordonnées.');
  for(const [i,face]of faces.entries()){
   const {width,height}=face.paper;if(!(width>=800&&height>=600&&width<=14000&&height<=14000))throw Error('Format chantier illisible.');
   if(i===0){pdf.deletePage(1);pdf.addPage([width,height],width>height?'landscape':'portrait');}else pdf.addPage([width,height],width>height?'landscape':'portrait');
   const svg=new DOMParser().parseFromString(face.svg,'image/svg+xml').documentElement;if(svg.localName!=='svg'||svg.querySelector('parsererror,script,foreignObject'))throw Error('Dessin chantier invalide.');
   for(const node of [svg,...svg.querySelectorAll('text,g')])node.setAttribute('font-family','MIRDossier');
   await pdf.svg(svg,{x:0,y:0,width,height});options.onProgress?.('Page '+(i+1)+' / 5');
  }
  if(pdf.getNumberOfPages()!==5)throw Error('Nombre de pages chantier invalide.');pdf.setProperties({title:options.title,author:'Les Revêtements MIR',creator:'MIR Studio — chantier'});return {blob:pdf.output('blob'),filename:options.filename,pages:5};
 }
 for(let i=0;i<faces.length;i++){if(i)pdf.addPage('letter','portrait');const face=faces[i];options.onProgress?.((locale==='en-CA'?'Creating page ':'Création de la feuille ')+(i+1)+' / '+faces.length);
 const body=new DOMParser().parseFromString(face.svg,'image/svg+xml').documentElement;if(body.querySelector('parsererror'))throw Error('Dessin PDF invalide.');
 relocateProductionHeader(body);
 const background=body.querySelector(':scope > rect');if(background?.getAttribute('width')==='850'&&background?.getAttribute('height')==='1100')background.remove();
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 850 1100');svg.setAttribute('width','850');svg.setAttribute('height','1100');svg.setAttribute('font-family','Arial');
 const title=face.documentTitle||tr('DOSSIER D’ESTIMATION','ESTIMATE FILE'),reference=face.reference||options.reference||options.subtitle||tr('Projet à confirmer','Project to confirm');
 svg.innerHTML='<rect width="850" height="1100" fill="#fff"/><svg x="40" y="27" width="205" height="52" viewBox="0 0 363.68 91.133">'+official.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'')+'</svg><text x="810" y="49" text-anchor="end" font-size="13" fill="#52634f">'+esc(new Intl.DateTimeFormat(locale,{year:'numeric',month:'short',day:'numeric'}).format(new Date()))+'</text><path d="M40 95H810" stroke="#348511" stroke-width="3"/><text x="40" y="127" font-size="23" font-weight="bold" fill="#18251d">'+esc(title)+'</text><text x="40" y="152" font-size="14" fill="#52634f">'+esc(String(reference).slice(0,100))+'</text>'+body.innerHTML+'<path d="M40 1020H810" stroke="#bcc9b7"/><text x="40" y="1043" font-size="12" fill="#52634f">'+esc(tr('Demande de soumission · validation MIR requise avant fabrication.','Quote request · MIR approval required before fabrication.'))+'</text><text x="40" y="1063" font-size="11" fill="#52634f">'+esc(tr('Cotes exactes indiquées. Ne pas mesurer sur le dessin imprimé.','Exact dimensions shown. Do not measure from the printed drawing.'))+'</text><text x="810" y="1063" text-anchor="end" font-size="12">'+(i+1)+' / '+faces.length+'</text>';
 svg.setAttribute('font-family','MIRDossier');for(const node of svg.querySelectorAll('text,g'))node.setAttribute('font-family','MIRDossier');
 await pdf.svg(svg,{x:0,y:0,width:612,height:792});
 }
 pdf.setProperties({title:options.title,author:'Les Revêtements MIR',creator:'MIR — Dossiers client'});return {blob:pdf.output('blob'),filename:options.filename,pages:faces.length};
}
root.MIRDossierPDF=Object.freeze({make});})(window);
