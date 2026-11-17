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
    // The user selected the same fibre-cement colour specimen as James Hardie.
    // Only the colour template is shared; St-Laurent retains its own palette,
    // product dimensions and manufacturer references.
    'st-laurent-lap-825':{
      ...fixed('hardieplank-cedarmill.png',600,600,null,
        'Échantillon de teinte St-Laurent sur le gabarit de fibrociment James Hardie. Le profil, le grain et les dimensions exacts du produit ne sont pas représentés.'),
      assetKind:'shared_fibre_cement_colour_template',previewForSwatches:true,
      sourcePreview:'./assets/products/st-laurent-4.jpg'
    },
    // V-Groove and Board & Batten keep their distinct installed geometry.
    'st-laurent-v-groove-825':fixed('st-vgroove-9.jpg',993,691,[750,505,240,180],'Détail du profil V-Groove St-Laurent, recadré dans la photo de pose fabricant. Dimensions non représentées.'),
    'st-laurent-board-batten-12':fixed('st-board-9.jpg',993,691,[440,410,370,195],'Détail Board & Batten St-Laurent, recadré dans la photo de pose fabricant. Dimensions non représentées.'),
    'hardie-board-batten':fixed('hardiepanel-smooth.png',600,600,null,'Échantillon du composant HardiePanel lisse. Les couvre-joints et l’assemblage Board & Batten ne sont pas représentés.'),
    // The genuine flat Äkta photograph already supplied by JDP. Never cut a
    // rectangular "board" from the manufacturer's spherical material previews.
    'jdp-akta-306-antique':{
      baseImage:'./assets/catalogue-swatches/jdp-gris-antique-c790727e.png',width:1500,height:2000,
      viewBox:[0,500,1500,1000],maskPath:'M0 500H1500V1500H0Z',
      assetKind:'manufacturer_texture_detail',previewForSwatches:true,sourceUrl:'https://jdprevetement.com/collections/akta/',
      note:'Détail du bois Äkta antiqué, issu de la photo plane officielle Gris antique. Même grain et même cadrage pour chaque teinte. Dimensions non représentées.'
    },
    // The source is the actual Bosco installation photograph. Its upper-left
    // material-only area excludes the superimposed diagram and all windows.
    'rialux-bosco':{
      ...fixed('rialux-bosco.webp',800,534,[0,0,280,187],
        'Détail du bardage Bosco, recadré dans la photo de pose officielle Rialux, sans le dessin superposé. Même grain et même cadrage pour chaque teinte. Dimensions non représentées.'),
      maskPath:'M0 0H280V187H0Z',assetKind:'manufacturer_installed_detail',previewForSwatches:true,sourceUrl:'https://www.rialux.com/collections/'
    },
    // This is explicitly a small texture detail of JDP's original preview,
    // not a newly photographed flat board or a representation of its shape.
    'jdp-bluhouss-307':{
      ...fixed('jdp-bluhouss-307.webp',2000,2000,[640,760,720,480],
        'Détail de la texture fabricant Bluhouss 307, recadré dans son aperçu. Perspective et dimensions non représentatives.'),
      maskPath:'M640 760H1360V1240H640Z',assetKind:'manufacturer_preview_texture_detail',previewForSwatches:true,
      sourceUrl:'https://jdprevetement.com/collections/bluhouss/',sourcePreview:'./assets/products/jdp-bluhouss-307.webp'
    }
  };
  function baseFor(material){
    if(!(material.applications||[]).includes('siding')||!['CanExel','James Hardie','St-Laurent','JDP / Juste du Pin','Rialux'].includes(material.brand))return null;
    if(material.stableSidingPreview){
      const base={...material.stableSidingPreview};
      if(material.brand==='St-Laurent'&&material.renderPattern==='lap'){
        base.previewForSwatches=true;
        base.assetKind='shared_fibre_cement_colour_template';
        base.note='Échantillon de teinte St-Laurent sur le même gabarit de fibrociment James Hardie. Le profil, le grain et les dimensions exacts du produit ne sont pas représentés.';
      }
      return base;
    }
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
  // Read-only geometry contract for the employee shop. Preparation remains
  // explicit: callers keep their catalogue data and lazy-cache prepared copies.
  root.MIRClientSidingPreviews=Object.freeze({prepare,baseFor:material=>{
    const base=baseFor(material);return base?JSON.parse(JSON.stringify(base)):null;
  }});
})(typeof window!=='undefined'?window:globalThis);
