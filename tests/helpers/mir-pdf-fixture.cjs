'use strict';
const fs=require('node:fs');
function makePdf(file,{paddingBytes=108*1024*1024}={}){
 const handle=fs.openSync(file,'w');
 const offsets=[0];
 let cursor=0;
 const write=text=>{cursor+=fs.writeSync(handle,text,cursor,'ascii');};
 const object=content=>{
  offsets.push(cursor);
  write((offsets.length-1)+' 0 obj\n'+content+'\nendobj\n');
 };
 try {
  write('%PDF-1.4\n');
  object('<< /Type /Catalog /Pages 2 0 R >>');
  const count=67, sheets={
   2:[[35,35,'PLAN DES FONDATIONS'],[35,320,'DIMENSIONS DU BATIMENT : 40 pi x 35 pi'],[35,280,'HAUTEUR DU SOLAGE APPARENTE : 2 pi']],
   3:[[35,35,'PLAN DU REZ-DE-CHAUSSEE']],
   5:[[35,35,'COUPE A-A'],[35,320,'HAUTEUR DES MURS : 25 pi'],[35,280,'MONTEE DU TOIT : 8 pi'],[35,240,'TOIT A DEUX VERSANTS']],
   67:[[85,35,'ELEVATION AVANT'],[385,35,'ELEVATION ARRIERE'],[45,270,'POUTRE DE SOUTIEN']]
  };
  const kids=Array.from({length:count},(_,i)=>(i+4)+' 0 R');
  object('<< /Type /Pages /Count '+count+' /Kids ['+kids.join(' ')+'] >>');
  object('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const common=count+4, separate=new Map(Object.keys(sheets).map((key,i)=>[Number(key),common+1+i]));
  for(let n=1;n<=count;n++)object('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 620 420] /Resources << /Font << /F1 3 0 R >> >> /Contents '+(separate.get(n)||common)+' 0 R >>');
  const draw='0.3 0.4 0.6 RG 2 w 35 80 240 150 re S 335 80 240 150 re S';
  const stream=lines=>{
   const glass=lines.some(([, ,text])=>text==='ELEVATION AVANT')?' 0.13 0.11 0.52 rg 110 98 130 45 re f 0 g':'';
   const content=draw+glass+' '+lines.map(([x,y,text])=>'BT /F1 14 Tf 1 0 0 1 '+x+' '+y+' Tm ('+text+') Tj ET').join(' ');
   object('<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream');
  };
  stream([[35,35,'FICHE TECHNIQUE DES MATERIAUX - DONNEES GENERALES DU PROJET']]);
  for(const row of Object.values(sheets))stream(row);
  const length=paddingBytes;
  offsets.push(cursor);
  write((offsets.length-1)+' 0 obj\n<< /Length '+length+' >>\nstream\n');
  cursor+=length;
  write('\nendstream\nendobj\n');
  const xref=cursor;
  write('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');
  for(const offset of offsets.slice(1))write(String(offset).padStart(10,'0')+' 00000 n \n');
  write('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 }finally{fs.closeSync(handle);}
}

module.exports={makePdf};
