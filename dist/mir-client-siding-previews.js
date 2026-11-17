/* Client catalogue adapter. No shared catalogue objects, prices or dimensions
   are mutated. One local specimen and one fixed crop per compatible profile. */
(function(root){
  'use strict';
  const SAMPLE='./assets/products/';
  const fixed=(baseImage,width,height,viewBox,note)=>({baseImage:SAMPLE+baseImage,width,height,
    viewBox:viewBox||[0,0,width,height],maskPath:'M0 0H'+width+'V'+height+'H0Z',note});
  const bases={
    'canexel-ridgewood-d5':{...fixed('mir-ridgewood-d5/base-ridgewood-d5-v2.webp',1254,1254,[0,188,1254,879]),maskPath:'M0 188H1254V1067H0Z'},
    'canexel-vstyle':fixed('canexel-2.webp',1070,313),
    'canexel-cedrvue-9':fixed('canexel-4.webp',1070,313),
    'canexel-board-batten':fixed('canexel-1.webp',1070,313),
    // These are fixed detail crops of the corresponding manufacturer's actual
    // installed profile. No generic board or fabricated dimensions are added.
    'st-laurent-lap-825':fixed('st-laurent-4.jpg',993,691,[310,0,240,185],'Détail du bardage à clin St-Laurent, recadré dans la photo de pose fabricant. Dimensions non représentées.'),
    'st-laurent-v-groove-825':fixed('st-vgroove-9.jpg',993,691,[750,505,240,180],'Détail du profil V-Groove St-Laurent, recadré dans la photo de pose fabricant. Dimensions non représentées.'),
    'st-laurent-board-batten-12':fixed('st-board-9.jpg',993,691,[440,410,370,195],'Détail Board & Batten St-Laurent, recadré dans la photo de pose fabricant. Dimensions non représentées.'),
    'hardie-board-batten':fixed('hardiepanel-smooth.png',600,600,null,'Échantillon du composant HardiePanel lisse. Les couvre-joints et l’assemblage Board & Batten ne sont pas représentés.')
  };
  function baseFor(material){
    if(!(material.applications||[]).includes('siding')||!['CanExel','James Hardie','St-Laurent'].includes(material.brand))return null;
    if(material.stableSidingPreview)return {...material.stableSidingPreview};
    if(bases[material.id])return {...bases[material.id]};
    if(material.brand!=='James Hardie')return null;
    const image=(material.images||[]).find(image=>image.src===material.primaryImage&&image.assetKind==='manufacturer_profile_texture'&&image.exactProductMatch===true);
    if(!image||!Number.isFinite(image.widthPx)||!Number.isFinite(image.heightPx))return null;
    return {baseImage:image.src,width:image.widthPx,height:image.heightPx,viewBox:[0,0,image.widthPx,image.heightPx],maskPath:'M0 0H'+image.widthPx+'V'+image.heightPx+'H0Z'};
  }
  async function prepare(materials){
    if(!Array.isArray(materials))throw TypeError('A client material array is required');
    const renderer=root.MIRMaterialPreview;
    if(!renderer?.sidingColorLut)return materials.slice();
    return Promise.all(materials.map(async material=>{
      const base=baseFor(material),colors=material.colors||[];
      if(!base||!colors.length)return material;
      // St-Laurent's wood-tone chips contain several colours. Preserve their
      // measured distribution without inventing a commercial "two-tone" group.
      if(material.brand==='St-Laurent')base.useColourDistribution=true;
      const tables=await Promise.all(colors.map(async color=>[color.id,await renderer.sidingColorLut(base,color)]));
      // Never mix a flat swatch and a stable specimen within one product.
      // If a source is unavailable, leave its entire original presentation.
      if(tables.some(([,table])=>!table))return material;
      const note=base.note||'Le même échantillon, le même cadrage, le même grain et les mêmes ombres sont conservés pour chaque couleur. Teinte écran indicative.';
      const stableSidingPreview={...base,method:'fixed_geometry_color_lut',clientPrepared:true,colorLuts:Object.fromEntries(tables),note};
      const variants=colors.map(color=>({src:base.baseImage,colorId:color.id,kind:'product',assetKind:'mir_siding_color_demo',matchScope:'illustration',exactProductMatch:false,
        cardPresentation:'sample',widthPx:base.width,heightPx:base.height,alt:material.name+' · '+color.name+' · échantillon de teinte',sourceUrl:color.sourceUrl||material.sourceUrl,note}));
      return {...material,stableSidingPreview,primaryImage:base.baseImage,imageStatus:'mir_color_preview',imageNote:note,
        images:[...variants,...(material.images||[]).filter(image=>image.assetKind!=='mir_siding_color_demo')]};
    }));
  }
  root.MIRClientSidingPreviews=Object.freeze({prepare});
})(typeof window!=='undefined'?window:globalThis);
