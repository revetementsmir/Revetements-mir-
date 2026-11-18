/* Client Studio document presentation. Receives copies of the existing export;
 * never measures geometry, computes quantities or modifies the Studio state. */
(function(global){
  'use strict';
  const VERSION='studio-client-1';
  const C={ink:'#242522',paper:'#f4f1ea',sand:'#bda889',muted:'#c6c1b7',rule:'#6a645a'};
  const PAGE={width:2976,height:2105},MARGIN=100;
  let lastDiagnostics=null;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const string=value=>String(value??'');
  function isClient(){
    const query=new URLSearchParams(global.location?.search||'');
    return String(global.location?.pathname||'').split('/').pop()==='plan.html'&&
      !query.has('embed')&&query.get('context')!=='admin'&&query.get('mode')!=='atelier'&&
      document.body.dataset.mirStudioLayout==='materials-bottom'&&
      global.MIRClientLocale?.isClient?.(global.location?.pathname,global.location?.search)===true;
  }
  function summaryText(row){return typeof row==='string'?row:string(row?.label??row?.text??'');}
  function uniqueMaterials(rows){
    const found=new Set(),result=[];
    for(const row of Array.isArray(rows)?rows:[]){
      const value={brand:string(row?.brand),product:string(row?.product),color:row?.color==null?null:string(row.color)};
      if(!value.brand&&!value.product)continue;
      const key=JSON.stringify(value);if(!found.has(key)){found.add(key);result.push(value);}
    }
    return result;
  }
  const font=(context,size,weight=400)=>{context.font=weight+' '+size+'px "DM Sans", Arial, sans-serif';};
  function drawText(context,page,value,x,y,extra={}){
    const text=string(value);context.fillText(text,x,y);
    page.text.push({text,x,y,font:context.font,color:context.fillStyle,width:context.measureText(text).width,...extra});
  }
  function rule(context,y,x=MARGIN,width=PAGE.width-2*MARGIN){
    context.strokeStyle=C.rule;context.lineWidth=1.5;context.beginPath();context.moveTo(x,y);context.lineTo(x+width,y);context.stroke();
  }
  function fitImage(context,drawing,box){
    const width=Math.min(box.w,box.h*drawing.ratio),height=width/drawing.ratio;
    const placed={x:box.x+(box.w-width)/2,y:box.y+(box.h-height)/2,width,height};
    context.drawImage(drawing.image,placed.x,placed.y,width,height);return placed;
  }
  function faceTitle(face,en){
    const names={front:['Avant','Front'],right:['Droite','Right'],back:['Arrière','Back'],left:['Gauche','Left']};
    const pair=names[face.key],name=string(face.name);
    return pair&&(!name||pair.includes(name))?pair[en?1:0]:name;
  }
  function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}

  async function make(options,helpers){
    if(!isClient()||options?.theme!=='studio-client')throw new Error('Studio client PDF presentation is not available in this context.');
    const {faces,presentationFaces=[],onProgress=()=>{}}=options;
    const includeTechnical=options.includeTechnical===true;
    if(!Array.isArray(faces)||!faces.length||faces.some(face=>face.layout))throw new Error('Invalid Studio elevation document.');
    const en=options.locale==='en-CA',t=(fr,english)=>en?english:fr;
    const {wrap,svgImage,canvasJPEG,assemble,loadImage}=helpers;
    // Font loading and logo are local. The original SVG logo is never recoloured.
    if(document.fonts){await document.fonts.load('400 34px "DM Sans"');await document.fonts.load('600 68px "DM Sans"');}
    const logo=await loadImage(new URL('assets/MIR-logo-officiel-original.svg',document.baseURI).href);
    const measure=document.createElement('canvas').getContext('2d');
    const presentations=new Map(presentationFaces.map(face=>[face.key,face]));
    const diagnostics={renderer:VERSION,locale:en?'en-CA':'fr-CA',paper:'A3 landscape',includeTechnical,
      sourceTitle:string(options.title),sourceSubtitle:string(options.subtitle),
      sourceFaces:faces.map(face=>({key:face.key,name:face.name,summary:clone(face.summary||[])})),
      sourceRows:[],pages:[],notes:['Summary values are used exactly as received; no quantity is calculated or rounded by this renderer.']};
    const descriptors=[];
    // Four client-facing views first. Complete annotated drawings and source
    // rows are available only when the customer requests the detailed version.
    const BODY_TOP=390,BODY_BOTTOM=1910,LINE=46,BODY_FONT=33,TEXT_X=170,TEXT_WIDTH=PAGE.width-MARGIN-TEXT_X;
    for(const face of faces){
      const presentation=presentations.get(face.key),materials=uniqueMaterials(presentation?.materials);
      font(measure,32);
      const compact=[];let materialsShown=0;
      for(const item of materials.slice(0,3)){
        const lines=wrap(measure,[item.brand,item.product].filter(Boolean).join(' · ')+' — '+(item.color||t('Fini à choisir','Finish to choose')),PAGE.width-2*MARGIN);
        // Keep complete descriptors, never truncate a real product/colour name
        // or compress the elevation to accommodate an unusually long label.
        if(compact.length+lines.length>6)break;
        compact.push(...lines);materialsShown++;
      }
      const legendHeight=compact.length?68+compact.length*41+44:105;
      descriptors.push({kind:'presentation',face,svg:typeof presentation?.svg==='string'?presentation.svg:face.svg,compact,materialsShown,materialsAvailable:materials.length,legendHeight});
    }
    if(includeTechnical){
    for(const face of faces){
      const presentation=presentations.get(face.key);
      if(typeof presentation?.svg==='string'&&presentation.svg!==face.svg)descriptors.push({kind:'annotated',face,svg:face.svg});
    }

    // Full-width annex rows: no narrow quantity sidebar, no dropped rows, no
    // shrinking fonts to force a long line or project onto one sheet.
    font(measure,BODY_FONT);
    let annex=null,cursor=BODY_TOP;
    const newAnnex=()=>{annex={kind:'technical',blocks:[]};descriptors.push(annex);cursor=BODY_TOP;return annex;};
    for(let faceIndex=0;faceIndex<faces.length;faceIndex++){
      const face=faces[faceIndex],rows=face.summary||[];
      if(!annex||cursor+150>BODY_BOTTOM)newAnnex();
      annex.blocks.push({kind:'face-heading',faceKey:face.key,text:faceTitle(face,en),x:MARGIN,y:cursor+26});cursor+=96;
      for(let index=0;index<rows.length;index++){
        const row=rows[index],sourceText=summaryText(row);
        const source={faceKey:face.key,faceIndex,index,sourceText,fragments:[]};diagnostics.sourceRows.push(source);
        font(measure,BODY_FONT);const lines=wrap(measure,sourceText,TEXT_WIDTH),color=typeof row==='object'?row?.color:null;
        let offset=0;
        while(offset<lines.length){
          if(cursor+LINE>BODY_BOTTOM){
            newAnnex();annex.blocks.push({kind:'face-heading',faceKey:face.key,text:faceTitle(face,en)+' · '+t('suite, mêmes quantités','continued, same quantities'),x:MARGIN,y:cursor+26});cursor+=96;
          }
          const available=Math.max(1,Math.floor((BODY_BOTTOM-cursor)/LINE));
          const selected=lines.slice(offset,offset+available);
          annex.blocks.push({kind:'summary',faceKey:face.key,index,source,sourceText,lines:selected,x:TEXT_X,y:cursor+BODY_FONT,lineHeight:LINE,color,continued:offset>0});
          cursor+=selected.length*LINE;offset+=selected.length;
        }
        cursor+=14;
      }
      cursor+=40;
    }
    // Document notices retain their full text; they are not replaced by a
    // construction-accuracy claim or an abbreviated interpretation.
    const notices=[string(options.title),string(options.subtitle),...faces.flatMap(face=>[face.scaleNote,face.footerNote].filter(Boolean).map(string))].filter(Boolean);
    if(notices.length){
      if(!annex||cursor+150>BODY_BOTTOM)newAnnex();
      annex.blocks.push({kind:'face-heading',text:t('Repères du document','Document notes'),x:MARGIN,y:cursor+26});cursor+=96;
      for(const notice of notices){
        font(measure,BODY_FONT);const lines=wrap(measure,notice,TEXT_WIDTH);
        for(const line of lines){if(cursor+LINE>BODY_BOTTOM)newAnnex();annex.blocks.push({kind:'notice',text:line,x:TEXT_X,y:cursor+BODY_FONT});cursor+=LINE;}cursor+=14;
      }
    }
    }
    const total=descriptors.length,pages=[];
    for(let index=0;index<total;index++){
      const descriptor=descriptors[index],number=index+1;
      const canvas=document.createElement('canvas');canvas.width=PAGE.width;canvas.height=PAGE.height;
      const context=canvas.getContext('2d');
      const page={number,kind:descriptor.kind,faceKey:descriptor.face?.key||null,text:[],drawing:null};diagnostics.pages.push(page);
      context.fillStyle=C.ink;context.fillRect(0,0,PAGE.width,PAGE.height);
      context.drawImage(logo,MARGIN,62,360,360*logo.naturalHeight/logo.naturalWidth);
      context.fillStyle=C.sand;font(context,26,600);
      context.textAlign='right';drawText(context,page,t('STUDIO MIR · VOTRE PROJET','MIR STUDIO · YOUR PROJECT'),PAGE.width-MARGIN,108);context.textAlign='left';
      rule(context,180);
      if(descriptor.kind!=='technical'){
        const annotated=descriptor.kind==='annotated';
        context.fillStyle=C.paper;font(context,68,600);
        const title=(annotated?t('Annexe · ','Appendix · '):'')+faceTitle(descriptor.face,en);
        const titleLines=wrap(context,title,PAGE.width-2*MARGIN);
        titleLines.forEach((line,i)=>drawText(context,page,line,MARGIN,270+i*78));
        const drawingTop=330+(titleLines.length-1)*78;
        const legendTop=annotated?1915:1915-descriptor.legendHeight;
        const area={x:MARGIN,y:drawingTop,w:PAGE.width-2*MARGIN,h:legendTop-drawingTop-35};
        if(area.h<200)throw new Error(t('Le nom de cette élévation est trop long pour la présentation PDF.','This elevation name is too long for the PDF presentation.'));
        context.fillStyle='#dededb';context.fillRect(area.x,area.y,area.w,area.h);
        onProgress(t('Préparation de l’élévation : ','Preparing elevation: ')+descriptor.face.name+'…');
        const drawing=await svgImage(descriptor.svg);
        page.drawing={...fitImage(context,drawing,{x:area.x+30,y:area.y+24,w:area.w-60,h:area.h-48}),source:annotated?'original-annotated-svg':presentations.has(descriptor.face.key)?'presentation-svg':'original-svg',svgLength:descriptor.svg.length};
        if(!annotated){
          rule(context,legendTop);context.fillStyle=C.sand;font(context,27,600);
          drawText(context,page,t('MATIÈRES · COULEURS','MATERIALS · COLOURS'),MARGIN,legendTop+43);
          context.fillStyle=C.paper;font(context,32);
          if(descriptor.compact.length)descriptor.compact.forEach((line,i)=>drawText(context,page,line,MARGIN,legendTop+88+i*41,{role:'material-excerpt'}));
          else {
            const count=descriptor.materialsAvailable;
            const intro=count?(en?count+' material and colour '+(count===1?'selection':'selections')+' — ':count+' choix de matières et couleurs — '):'';
            drawText(context,page,intro+(includeTechnical?t('voir les annexes.','see the appendices.'):t('Version détaillée disponible dans le Studio.','A detailed version is available in the Studio.')),MARGIN,legendTop+88);
          }
          context.fillStyle=C.muted;font(context,25);
          if(descriptor.compact.length){
            const extra=descriptor.materialsAvailable-descriptor.materialsShown;
            const reference=includeTechnical?t('Choix complets, cotes et quantités : voir les annexes.','Complete selections, dimensions and quantities: see the appendices.'):t('Version détaillée disponible dans le Studio.','A detailed version is available in the Studio.');
            const other=extra>0?(en?extra+' other '+(extra===1?'selection':'selections')+' — ':extra+' autre'+(extra===1?'':'s')+' choix — '):'';
            drawText(context,page,other+reference,MARGIN,1910);
          }
        }else{
          context.fillStyle=C.muted;font(context,26);
          drawText(context,page,t('Dessin annoté d’origine · les quantités sont détaillées dans les pages suivantes.','Original annotated drawing · quantities are detailed on the following pages.'),MARGIN,1925);
        }
      }else{
        context.fillStyle=C.paper;font(context,64,600);drawText(context,page,t('Détails du projet','Project details'),MARGIN,270);
        context.fillStyle=C.muted;font(context,28);drawText(context,page,t('Annexes techniques · mêmes façades, aucune quantité supplémentaire.','Technical appendices · the same elevations, no additional quantities.'),MARGIN,325);
        for(const block of descriptor.blocks){
          if(block.kind==='face-heading'){
            context.fillStyle=C.sand;font(context,38,600);drawText(context,page,block.text,block.x,block.y,{role:'annex-heading'});rule(context,block.y+25);continue;
          }
          context.fillStyle=C.paper;font(context,BODY_FONT);
          if(block.kind==='notice'){drawText(context,page,block.text,block.x,block.y,{role:'document-note'});continue;}
          const fragment={page:number,lines:[],positions:[],continued:block.continued};block.source.fragments.push(fragment);
          block.lines.forEach((line,i)=>{
            const y=block.y+i*block.lineHeight;
            drawText(context,page,line,block.x,y,{role:'source-summary',faceKey:block.faceKey,sourceIndex:block.index});
            fragment.lines.push(line);fragment.positions.push({x:block.x,y,width:context.measureText(line).width});
          });
          context.fillStyle=C.sand;font(context,22,600);
          drawText(context,page,String(block.index+1).padStart(2,'0'),MARGIN,block.y,{role:'source-row-reference'});
          if(!block.continued&&/^#[\da-f]{3,8}$/i.test(block.color||'')){context.fillStyle=block.color;context.fillRect(MARGIN,block.y+12,30,5);}
        }
      }
      rule(context,1970);
      context.fillStyle=C.muted;font(context,23);
      drawText(context,page,t('Échelle d’impression variable · dimensions et pose à valider avant fabrication.','Print scale varies · verify dimensions and installation before fabrication.'),MARGIN,2010);
      drawText(context,page,t('Document de travail, sans valeur de construction.','Working document, not a construction document.'),MARGIN,2047);
      context.fillStyle=C.sand;context.textAlign='right';font(context,26,600);
      drawText(context,page,String(number).padStart(2,'0')+' / '+String(total).padStart(2,'0'),PAGE.width-MARGIN,2032);context.textAlign='left';
      onProgress(t('Création de la page ','Creating page ')+number+' / '+total+'…');
      const jpeg=await canvasJPEG(canvas);pages.push({width:PAGE.width,height:PAGE.height,jpeg:new Uint8Array(await jpeg.arrayBuffer())});
    }
    // Diagnostics record the actual fillText calls and their source-row ranges.
    // They contain no computed or invented quantity and are independent of UI state.
    diagnostics.pageCount=pages.length;
    lastDiagnostics=freeze(clone(diagnostics));
    onProgress(t('Assemblage du PDF…','Assembling PDF…'));
    const result={blob:assemble(pages,string(options.title)||'MIR Studio'),filename:options.filename||'MIR-Studio.pdf',pages:pages.length,renderer:VERSION,diagnostics:clone(diagnostics)};
    return result;
  }
  global.MIRStudioPDF=Object.freeze({version:VERSION,make,isClient,diagnostics:()=>lastDiagnostics?clone(lastDiagnostics):null});
})(window);
