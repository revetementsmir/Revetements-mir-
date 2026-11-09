/* One frame per sheet, used only by client dossier faces. Vector SVG and text. */
(function(root){'use strict';let loading,logo,fonts;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Le moteur PDF local ne charge pas. Réessayez.'));document.head.append(s);});}
async function make(options){if(!loading)loading=script('vendor/mir-pdf/jspdf.umd.min.js').then(()=>script('vendor/mir-pdf/svg2pdf.umd.min.js')).catch(e=>{loading=null;throw e;});await loading;
 if(!logo)logo=fetch('assets/MIR-logo-officiel-original.svg').then(r=>{if(!r.ok)throw Error('Logo MIR introuvable.');return r.text();}).catch(e=>{logo=null;throw e;});
 if(!fonts)fonts=Promise.all(['Regular','Bold'].map(async weight=>{const r=await fetch('vendor/pdfjs/standard_fonts/LiberationSans-'+weight+'.ttf');if(!r.ok)throw Error('Police PDF introuvable.');const bytes=await r.arrayBuffer(),face=new FontFace('MIRDossier',bytes,{weight:weight==='Bold'?'700':'400'});await face.load();document.fonts.add(face);let binary='';for(const x of new Uint8Array(bytes))binary+=String.fromCharCode(x);return {name:weight,base64:btoa(binary)};})).catch(e=>{fonts=null;throw e;});
 const official=await logo,fontFiles=await fonts,pdf=new root.jspdf.jsPDF({unit:'pt',format:'letter',compress:true}),faces=options.faces;for(const f of fontFiles){pdf.addFileToVFS('MIR-'+f.name+'.ttf',f.base64);pdf.addFont('MIR-'+f.name+'.ttf','MIRDossier',f.name==='Bold'?'bold':'normal');}
 for(let i=0;i<faces.length;i++){if(i)pdf.addPage('letter','portrait');const face=faces[i];options.onProgress?.('Création de la feuille '+(i+1)+' / '+faces.length);
 const body=new DOMParser().parseFromString(face.svg,'image/svg+xml').documentElement;if(body.querySelector('parsererror'))throw Error('Dessin PDF invalide.');
 const background=body.querySelector(':scope > rect');if(background?.getAttribute('width')==='850'&&background?.getAttribute('height')==='1100')background.remove();
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 850 1100');svg.setAttribute('width','850');svg.setAttribute('height','1100');svg.setAttribute('font-family','Arial');
 const title=face.documentTitle||'DOSSIER D’ESTIMATION',reference=face.reference||options.reference||options.subtitle||'Projet à confirmer';
 svg.innerHTML='<rect width="850" height="1100" fill="#fff"/><svg x="40" y="27" width="205" height="52" viewBox="0 0 363.68 91.133">'+official.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'')+'</svg><text x="810" y="49" text-anchor="end" font-size="13" fill="#52634f">'+esc(new Intl.DateTimeFormat('fr-CA').format(new Date()))+'</text><path d="M40 95H810" stroke="#348511" stroke-width="3"/><text x="40" y="127" font-size="23" font-weight="bold" fill="#18251d">'+esc(title)+'</text><text x="40" y="152" font-size="14" fill="#52634f">'+esc(String(reference).slice(0,100))+'</text>'+body.innerHTML+'<path d="M40 1020H810" stroke="#bcc9b7"/><text x="40" y="1043" font-size="12" fill="#52634f">Demande de soumission · validation MIR requise avant fabrication.</text><text x="40" y="1063" font-size="11" fill="#52634f">Cotes exactes indiquées. Ne pas mesurer sur le dessin imprimé.</text><text x="810" y="1063" text-anchor="end" font-size="12">'+(i+1)+' / '+faces.length+'</text>';
 svg.setAttribute('font-family','MIRDossier');for(const node of svg.querySelectorAll('text,g'))node.setAttribute('font-family','MIRDossier');
 await pdf.svg(svg,{x:0,y:0,width:612,height:792});
 }
 pdf.setProperties({title:options.title,author:'Les Revêtements MIR',creator:'MIR — Dossiers client'});return {blob:pdf.output('blob'),filename:options.filename,pages:faces.length};
}
root.MIRDossierPDF=Object.freeze({make});})(window);
