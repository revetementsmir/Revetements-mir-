/* Local annotated-plan PDF export. No plan is uploaded. JPEG pages preserve SVG
 * geometry, materials and annotations; print scale is explicitly not asserted. */
(function(global){
  'use strict';
  const utf8 = new TextEncoder();
  const bytes = text => utf8.encode(text);
  function concat(parts){const total=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(total);let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;}
  function hexText(value){let out='FEFF';const str=String(value);for(let i=0;i<str.length;i++)out+=str.charCodeAt(i).toString(16).padStart(4,'0');return `<${out}>`;}
  function assemble(pages,title){
    const objects=new Map();
    const infoId=3+pages.length*3;
    objects.set(1,bytes('<< /Type /Catalog /Pages 2 0 R >>'));
    objects.set(2,bytes(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`));
    pages.forEach((page,i)=>{
      const id=3+i*3,{width,height}=page.paper||{width:1190.551,height:841.890};
      const content=bytes(`q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`);
      objects.set(id,bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 ${id+2} 0 R >> >> /Contents ${id+1} 0 R >>`));
      objects.set(id+1,concat([bytes(`<< /Length ${content.length} >>\nstream\n`),content,bytes('endstream')]));
      objects.set(id+2,concat([bytes(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`),page.jpeg,bytes('\nendstream')]));
    });
    objects.set(infoId,bytes(`<< /Title ${hexText(title)} /Author (Les Revetements MIR) /Creator (MIR Studio) >>`));
    const parts=[bytes('%PDF-1.4\n%MIR\n')],offsets=[0];let length=parts[0].length;
    for(let i=1;i<=infoId;i++){offsets[i]=length;const part=concat([bytes(`${i} 0 obj\n`),objects.get(i),bytes('\nendobj\n')]);parts.push(part);length+=part.length;}
    const xref=length;
    parts.push(bytes(`xref\n0 ${infoId+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${infoId+1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
    return new Blob(parts,{type:'application/pdf'});
  }
  const loadImage=src=>new Promise((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>reject(new Error('Le chargement du dessin a pris trop de temps. Réessayez cet export.')),12000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(new Error('Une image du plan ne peut pas être intégrée au PDF.'));};img.src=src;});
  async function svgImage(svg){
    const doc=new DOMParser().parseFromString(String(svg),'image/svg+xml');
    if(doc.querySelector('parsererror'))throw new Error('Le dessin de cette élévation est invalide.');
    const root=doc.documentElement;root.setAttribute('xmlns','http://www.w3.org/2000/svg');
    for(const element of root.querySelectorAll('image')){
      const href=element.getAttribute('href')||element.getAttributeNS('http://www.w3.org/1999/xlink','href');
      if(!href||href.startsWith('data:'))continue;
      const url=new URL(href,document.baseURI);
      if(url.origin!==location.origin)throw new Error('Une image distante doit être enregistrée dans le projet avant son export.');
      const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Image du plan introuvable.');
      const blob=await response.blob();
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
      element.setAttribute('href',data);element.removeAttribute('xlink:href');
    }
    const box=(root.getAttribute('viewBox')||'0 0 1600 1000').trim().split(/[ ,]+/).map(Number);
    const w=box[2]>0?box[2]:1600,h=box[3]>0?box[3]:1000;
    root.setAttribute('width',String(Math.round(2500)));root.setAttribute('height',String(Math.round(2500*h/w)));
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml;charset=utf-8'}));
    try{return {image:await loadImage(url),ratio:w/h};}finally{URL.revokeObjectURL(url);}
  }
  function wrap(ctx,text,max){
    const lines=[];let current='';
    const words=[];for(const token of String(text).split(/\s+/)){let word='';for(const ch of token){if(word&&ctx.measureText(word+ch).width>max){words.push(word);word='';}word+=ch;}if(word)words.push(word);}
    for(const word of words){const next=current?`${current} ${word}`:word;if(current&&ctx.measureText(next).width>max){lines.push(current);current=word;}else current=next;}
    if(current)lines.push(current);return lines.length?lines:[''];
  }
  function summaryLines(ctx,summary,width){
    return (summary||[]).flatMap(item=>{const label=typeof item==='string'?item:item.label||item.text||'';return wrap(ctx,label,width).map((text,i)=>({text,color:i===0&&typeof item==='object'?item.color:null}));});
  }
  function canvasJPEG(canvas){
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('La création de la page a pris trop de temps.')),15000);
      canvas.toBlob(blob=>{clearTimeout(timer);blob?resolve(blob):reject(new Error('Le dessin ne peut pas être exporté.'));},'image/jpeg',.94);
    });
  }
  async function makePlan({faces,title='MIR — Plan annoté',subtitle='Étude de revêtement',filename='MIR-plan-annote.pdf',onProgress=()=>{}}={}){
    if(!Array.isArray(faces)||!faces.length)throw new Error('Aucune élévation disponible pour l’export.');
    if(faces.every(f=>f.layout==='mir-dossier')){
      if(!global.MIRDossierPDF)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='mir-dossier-pdf.js?v=rendu-1';script.onload=resolve;script.onerror=()=>reject(Error('Le moteur de dossier PDF ne charge pas.'));document.head.append(script);});
      return global.MIRDossierPDF.make({faces,title,subtitle,filename,onProgress});
    }
    const pages=[];let pageNumber=0;
    for(const face of faces){
      onProgress(`Préparation du dessin : ${face.name||'élévation'}…`);
      const drawing=await svgImage(face.svg),canvas=document.createElement('canvas');
      if(face.layout==='bending-sheet'){
        canvas.width=2125;canvas.height=2750;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(drawing.image,0,0,canvas.width,canvas.height);
        const jpeg=await canvasJPEG(canvas);
        pages.push({width:canvas.width,height:canvas.height,paper:{width:612,height:792},jpeg:new Uint8Array(await jpeg.arrayBuffer())});
        pageNumber++;
        continue;
      }
      canvas.width=2976;canvas.height=2105;
      onProgress(`Mise en page : ${face.name||'élévation'}…`);
      const ctx=canvas.getContext('2d'),wide=face.layout==='wide';ctx.font='27px Arial';
      // Fabrication pages use the full printable width. Their summaries are
      // retained below the drawing, never discarded to make the page fit.
      const lines=summaryLines(ctx,face.summary,wide?2740:575),chunks=[],chunkSize=wide?8:43;
      for(let i=0;i<Math.max(1,lines.length);i+=chunkSize)chunks.push(lines.slice(i,i+chunkSize));
      for(let part=0;part<chunks.length;part++){
        pageNumber++;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle='#26322c';ctx.font='bold 59px Arial';ctx.fillText('MIR',85,100);
        ctx.fillStyle='#51a93f';ctx.fillRect(215,54,7,52);
        ctx.fillStyle='#26322c';ctx.font='34px Arial';ctx.fillText(title,250,78);
        ctx.fillStyle='#647166';ctx.font='24px Arial';ctx.fillText(subtitle,250,115);
        ctx.textAlign='right';ctx.fillText(new Intl.DateTimeFormat('fr-CA').format(new Date()),2890,78);ctx.textAlign='left';
        ctx.strokeStyle='#d5ddd6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(85,155);ctx.lineTo(2890,155);ctx.stroke();
        ctx.fillStyle='#1e2c23';ctx.font='bold 39px Arial';ctx.fillText(`${face.name||'Élévation'}${part?' — suite':''}`,85,220);
        const summaryHeight=wide&&chunks[part].length?chunks[part].length*34+30:0;
        const area=wide?{x:85,y:275,w:2805,h:1640-summaryHeight}:{x:85,y:275,w:2040,h:1605};
        const iw=Math.min(area.w,area.h*drawing.ratio),ih=iw/drawing.ratio;
        ctx.drawImage(drawing.image,area.x+(area.w-iw)/2,area.y+(area.h-ih)/2,iw,ih);
        if(wide){
          if(chunks[part].length){
            const top=area.y+area.h+14;ctx.fillStyle='#f4f6f2';ctx.fillRect(85,top,2805,summaryHeight-10);
            ctx.font='25px Arial';let y=top+28;
            for(const line of chunks[part]){ctx.fillStyle='#405744';ctx.fillText(line.text,103,y);y+=34;}
          }
        }else{
          ctx.fillStyle='#f4f6f2';ctx.fillRect(2195,195,695,1730);
          ctx.fillStyle='#26322c';ctx.font='bold 26px Arial';ctx.fillText(face.sidebarTitle||'REPÈRES ET QUANTITÉS',2225,250);
          ctx.font='25px Arial';let y=310;
          for(const line of chunks[part]){if(line.color&&/^#[0-9a-f]{3,8}$/i.test(line.color)){ctx.strokeStyle=line.color;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(2225,y-8);ctx.lineTo(2265,y-8);ctx.stroke();ctx.fillStyle='#26322c';ctx.fillText(line.text,2280,y);}else{ctx.fillStyle='#26322c';ctx.fillText(line.text,2225,y);}y+=36;}
          if(!lines.length){ctx.fillStyle='#667267';ctx.fillText('Choix et annotations du projet.',2225,310);}
        }
        ctx.strokeStyle='#d5ddd6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(85,1970);ctx.lineTo(2890,1970);ctx.stroke();
        ctx.font='22px Arial';ctx.fillStyle='#5e6c61';ctx.fillText(face.scaleNote||'Échelle d’impression variable. Utiliser les cotes et la calibration du projet pour les mesures.',85,2015);
        ctx.font='20px Arial';ctx.fillText(face.footerNote||'Document de travail — choix, dimensions et détails de pose à vérifier avant fabrication.',85,2050);
        ctx.textAlign='right';ctx.fillText(`MIR / ${String(pageNumber).padStart(2,'0')}`,2890,2035);ctx.textAlign='left';
        onProgress(`Création de la page ${pageNumber}…`);
        const jpegBlob=await canvasJPEG(canvas);
        pages.push({width:canvas.width,height:canvas.height,jpeg:new Uint8Array(await jpegBlob.arrayBuffer())});
      }
    }
    onProgress('Assemblage du PDF…');
    return {blob:assemble(pages,title),filename,pages:pages.length};
  }
  let retainedURL=null;
  async function exportPlan(options){
    const result=await makePlan(options),url=URL.createObjectURL(result.blob);
    if(retainedURL)URL.revokeObjectURL(retainedURL);retainedURL=url;
    document.getElementById('mir-pdf-ready')?.remove();
    const panel=document.createElement('section');panel.id='mir-pdf-ready';panel.setAttribute('aria-label','Votre PDF est prêt');
    Object.assign(panel.style,{position:'fixed',bottom:'22px',right:'22px',zIndex:'10000',background:'#fff',border:'1px solid #c5d4be',boxShadow:'0 12px 50px #182a2033',padding:'18px',maxWidth:'min(420px, calc(100vw - 30px))',font:'13px/1.5 Arial',color:'#263d26'});
    const title=document.createElement('strong');title.textContent=`Votre PDF est prêt · ${result.pages} page${result.pages>1?'s':''}`;
    const a=document.createElement('a');a.href=url;a.download=result.filename;a.setAttribute('role','button');a.textContent=`Télécharger ${result.filename} ↓`;
    Object.assign(a.style,{display:'block',padding:'12px 15px',marginTop:'12px',background:'#29472b',color:'#fff',textDecoration:'none',overflowWrap:'anywhere',border:'0',font:'inherit',cursor:'pointer'});
    const close=document.createElement('button');close.type='button';close.textContent='Fermer';close.setAttribute('aria-label','Fermer le téléchargement PDF');Object.assign(close.style,{border:'0',background:'transparent',color:'#5a7052',padding:'10px 0 0',font:'inherit',cursor:'pointer'});close.onclick=()=>panel.remove();
    const preview=document.createElement('a');preview.href=url;preview.target='_blank';preview.rel='noopener';preview.textContent='Ouvrir le PDF ↗';Object.assign(preview.style,{display:'inline-block',padding:'12px 20px 0 0',color:'#29472b'});
    panel.append(title,a,preview,close);document.body.appendChild(panel);a.focus();
    return {pages:result.pages,size:result.blob.size,prepared:true};
  }
  global.MIRPDF=Object.freeze({exportPlan,makePlan,version:'1.1.0'});
})(window);
