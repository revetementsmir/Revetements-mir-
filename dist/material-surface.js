/* SVG surface appearance shared by the studio elevation, 3D textures and exports.
 * Profile spacing uses documented exposure and the calibrated drawing scale.
 * The physical size of a colour photograph is unknown: grain scale and lighting
 * are illustrative. Neither changes dimensions, joints or takeoff quantities. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./material-coverage.js') : root.MIRMaterialCoverage);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIRMaterialSurface = api;
})(typeof window === 'object' ? window : this, function (coverage) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = value => Number(Number(value).toFixed(5));
  const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
  const smooth = material => /lisse|smooth/i.test(`${material?.finish || ''} ${material?.name || ''}`);
  const modulo = (value,period) => ((value%period)+period)%period;
  // Tile coordinates are drawing units: the preview has no product dimensions
  // or joint specification. Varying offsets and course heights show the style.
  const masonryTiles = {
    'brick-running': {width:96, rows:[10,10,10,10], joints:[[0,32,64],[16,48,80],[0,32,64],[16,48,80]], mortar:1.3, variation:8},
    'brick-long': {width:150, rows:[7,7,7,7], joints:[[0,50,100],[25,75,125],[0,50,100],[25,75,125]], mortar:1.15, variation:7},
    'brick-stack': {width:90, rows:[10,10,10], joints:[[0,30,60],[0,30,60],[0,30,60]], mortar:1.3, variation:5},
    'stone-cut': {width:144, rows:[18,12,22,15], joints:[[0,46,103],[13,52,91,127],[0,56,86,122],[17,70,111]], mortar:1.7, variation:14},
    'stone-ledgestone': {width:132, rows:[5,10,6,8,5,9], joints:[[0,35,83],[14,57,77,116],[0,32,53,91],[9,45,85,119],[0,51,76,108],[18,59,99]], rough:1.25, skew:4, mortar:.85, variation:20},
    'stone-field': {width:192, rows:[24,28,22,25,20], joints:[[4,35,69,104,153],[19,49,88,121,168],[0,32,70,109,138,164],[13,45,84,117,147,178],[5,43,78,111,164]], rough:6, skew:11, mortar:2.4, variation:22},
  };

  function tinted(hex, offset, blend=0) {
    return '#'+[1,3,5].map((i,k)=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*(1-blend)+[230,224,211][k]*blend+offset))).toString(16).padStart(2,'0')).join('');
  }

  function masonryPattern(id, material, color, monochrome, feetPerPixel, anchorX, anchorY) {
    const wanted=material.rendering?.masonryStyle,style=Object.hasOwn(masonryTiles,wanted)?wanted:'brick-running';
    const {width,rows,joints,rough=0,skew=0,mortar,variation}=masonryTiles[style], n=rows.length;
    const levels=rows.reduce((all,h)=>[...all,all.at(-1)+h],[0]), height=levels[n];
    // Use a consistent preview density across elevation raster resolutions. The
    // calibration affects the drawing only and never turns the tile into sizing.
    const scale=positive(feetPerPixel)?Math.max(.02,Math.min(100,.031/feetPerPixel)):1;
    const xPhase=num(modulo(Number.isFinite(anchorX)?anchorX:0,width*scale)),yPhase=num(modulo(Number.isFinite(anchorY)?anchorY:0,height*scale));
    const jointColor=monochrome?'#a9b0a3':tinted(color,0,style==='stone-ledgestone'?.28:.72),cells=[];
    const step=width/8;
    function edgeNodes(x0,x1,y,level) {
      const offset=i=>rough*([-.76,.58,-.45,.89,-.59,.32,.64,-.37][modulo(i+level*3,8)]);
      const point=x=>{const i=Math.floor(x/step),t=x/step-i;return [num(x),num(y+(1-t)*offset(i)+t*offset(i+1))];};
      if(!rough)return [[x0,y],[x1,y]];
      const out=[point(x0)];
      for(let x=(Math.floor(x0/step)+1)*step;x<x1;x+=step)out.push(point(x));
      out.push(point(x1));return out;
    }
    // Wrapped cells cross tile edges so no artificial seam appears at repeats.
    for(let row=rough?-1:0;row<(rough?n+1:n);row++){
      const r=modulo(row,n),y=levels[r]+Math.floor(row/n)*height,sy=rows[r],cuts=joints[r];
      const slant=i=>skew*[.59,-.47,.35,-.64,.18][modulo(i+r*2,5)];
      const kink=i=>skew*[.22,-.3,.38,-.18][modulo(i+r,4)];
      for(let piece=-1;piece<=cuts.length;piece++){
        const i=modulo(piece,cuts.length),j=modulo(piece+1,cuts.length);
        const x0=cuts[i]+Math.floor(piece/cuts.length)*width,x1=cuts[j]+Math.floor((piece+1)/cuts.length)*width;
        if(x1+skew<0||x0-skew>width)continue;
        const top=edgeNodes(x0,x1,y,r), bottom=edgeNodes(x0+slant(i),x1+slant(j),y+sy,(r+1)%n).reverse();
        const pts=[...top,...(skew?[[num(x1+slant(j)*.5+kink(j)),num(y+sy*.48)]]:[]),...bottom,...(skew?[[num(x0+slant(i)*.5+kink(i)),num(y+sy*.48)]]:[])];
        const offset=variation*([-.69,.23,-.14,.76,-.44,.48,-.25][(r*3+i*2)%7]);
        cells.push(`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${monochrome?color:tinted(color,offset)}"/>`);
      }
    }
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" patternTransform="translate(${xPhase} ${yPhase}) scale(${num(scale)})" data-profile="brick" data-masonry-style="${style}" data-scale-status="illustrative"><rect width="${width}" height="${height}" fill="${jointColor}"/><g stroke="${jointColor}" stroke-width="${mortar}" stroke-linejoin="round">${cells.join('')}</g></pattern>`;
  }

  function specification(material = {}, choice = {}, feetPerPixel, sample) {
    const sizing = coverage?.coverageSpec(material,choice);
    const exposureIn = sizing?.exposureIn ?? null;
    const calibrated = positive(feetPerPixel);
    const scaledProfile = calibrated && sizing?.complete === true && positive(exposureIn);
    const pxPerIn = calibrated ? 1 / (feetPerPixel * 12) : 1;
    const selectedPattern = choice.pattern || material.renderPattern || 'plain';
    const pattern = ['lap','vertical'].includes(selectedPattern) && ['horizontal','vertical'].includes(choice.orientation) ? (choice.orientation === 'vertical' ? 'vertical' : 'lap') : selectedPattern;
    const isSmooth = smooth(material);
    const hasSample = !!sample?.dataUri && !isSmooth && sample.assetKind !== 'manufacturer_material_sphere';
    const ratio = positive(sample?.width) && positive(sample?.height) ? sample.width / sample.height : 1;
    // The grain field is independent from the exposure. Changing 5 in to 7 in
    // changes the number of courses, never the size of the wood-grain image.
    const grainWidth = 14 * pxPerIn;
    return {pattern, exposureIn, calibrated, pxPerIn, step:scaledProfile ? exposureIn * pxPerIn : null,
      isSmooth, hasSample, grainWidth, grainHeight:grainWidth / ratio,
      verticalGrain:choice.orientation === 'vertical', grainScaleStatus:'illustrative',
      coverageStatus:sizing?.status||'unknown',profileScaleStatus:scaledProfile ? sizing.status==='user-specified'?'project-exposure':sizing.status==='derived'?'derived-exposure':'documented-exposure' : 'unresolved'};
  }

  function patternDef({id, material = {}, choice = {}, feetPerPixel, sample, monochrome = false, anchorX = 0, anchorY = 0, bounds = [0,0,1000,1000]}) {
    const s = specification(material, choice, feetPerPixel, sample), safeId = esc(id);
    const color = monochrome ? '#fbfcf7' : /^#[\da-f]{6}$/i.test(choice.color || '') ? choice.color : '#d3d6cd';
    if(s.pattern==='brick')return masonryPattern(safeId,material,color,monochrome,feetPerPixel,anchorX,anchorY);
    const step = num(s.step), line = monochrome ? '#a9b0a3' : '#00000035';
    const definition = [], rect = (w,h,fill,extra='') => `<rect width="${num(w)}" height="${num(h)}" fill="${fill}" ${extra}/>`;
    const board = ['lap','vertical','shingle'].includes(s.pattern) && positive(s.step);
    let grain = '', width = board ? step : 180, height = width, profile = '';

    if (!monochrome && s.hasSample) {
      const gw = num(s.grainWidth), gh = num(s.grainHeight), fieldW = gw * 2, fieldH = gh * 2;
      // Mirrored edges meet without a colour seam. A long grain field replaces
      // the former identical five-inch square repeated in both directions.
      // Colour cards can have a collection badge near the edge. The central
      // material area keeps that graphic out of the wall; the original colour
      // card remains untouched in the manufacturer's picker.
      const sw = positive(sample.width) ? sample.width : 256, sh = positive(sample.height) ? sample.height : 256;
      definition.push(`<svg id="${safeId}-sample" width="${gw}" height="${gh}" viewBox="${[sw*.18,sh*.18,sw*.64,sh*.64].map(num).join(' ')}" preserveAspectRatio="xMidYMid meet" overflow="hidden"><image href="${esc(sample.dataUri)}" width="${num(sw)}" height="${num(sh)}"/></svg>`);
      definition.push(`<pattern id="${safeId}-grain" patternUnits="userSpaceOnUse" width="${num(fieldW)}" height="${num(fieldH)}"${s.verticalGrain ? ' patternTransform="rotate(90)"' : ''}><use href="#${safeId}-sample"/><use href="#${safeId}-sample" transform="translate(${num(fieldW)} 0) scale(-1 1)"/><use href="#${safeId}-sample" transform="translate(0 ${num(fieldH)}) scale(1 -1)"/><use href="#${safeId}-sample" transform="translate(${num(fieldW)} ${num(fieldH)}) scale(-1 -1)"/></pattern>`);
      width = s.verticalGrain ? fieldH : fieldW;
      height = s.verticalGrain ? fieldW : fieldH;
      grain = rect(width,height,`url(#${safeId}-grain)`,'opacity=".58"');
    }

    if (board) {
      const vertical = s.pattern === 'vertical', profileId = `${safeId}-profile`;
      if (monochrome) profile = `<path d="${vertical ? `M${step-.7} 0V${step}` : `M0 ${step-.7}H${step}`}" stroke="${line}" stroke-width="1.2"/>`;
      else {
        // A short contact shadow and a subdued lower edge describe the lap.
        // V-grooves have symmetric edges; smooth finishes never inherit grain.
        const vGroove = /v[ -]?(?:groove|style)|rainure en v/i.test(`${material.id} ${material.name} ${material.finish}`);
        const axis = vertical ? 'x2="1" y2="0"' : 'x2="0" y2="1"';
        const stops = vGroove
          ? '<stop offset="0" stop-color="#17201a" stop-opacity=".32"/><stop offset=".035" stop-color="#17201a" stop-opacity="0"/><stop offset=".94" stop-color="#fff" stop-opacity="0"/><stop offset=".975" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#17201a" stop-opacity=".32"/>'
          : '<stop offset="0" stop-color="#101812" stop-opacity=".65"/><stop offset=".06" stop-color="#17201a" stop-opacity=".42"/><stop offset=".14" stop-color="#17201a" stop-opacity=".12"/><stop offset=".24" stop-color="#17201a" stop-opacity="0"/><stop offset=".85" stop-color="#fff" stop-opacity=".02"/><stop offset=".97" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#17201a" stop-opacity=".35"/>';
        definition.push(`<linearGradient id="${safeId}-relief" x1="0" y1="0" ${axis}>${stops}</linearGradient>`);
        profile = rect(step,step,`url(#${safeId}-relief)`);
        if(!vGroove)profile+=`<path d="${vertical?`M0 0V${step}`:`M0 0H${step}`}" stroke="#17201a" stroke-opacity=".45" stroke-width="${num(Math.max(.7,step*.04))}"/>`;
      }
      // Move the pattern's coordinate system, not only its tile bounds: an
      // offset y with unshifted user-space contents clips the relief away.
      const phase=(((vertical?anchorX:anchorY)%step)+step)%step;
      definition.push(`<pattern id="${profileId}" patternUnits="userSpaceOnUse" patternTransform="translate(${vertical?num(phase):0} ${vertical?0:num(phase)})" width="${step}" height="${step}" viewBox="0 0 ${step} ${step}">${profile}</pattern>`);
      profile = profileId;
    }
    // One bounded surface viewport keeps independent profile and grain scales.
    // It also avoids oversized pattern buffers on mobile. Panel seams remain
    // the actual configured layout drawn by the caller, without a fake grid.
    const [x,y,x1,y1] = bounds.map(Number), w = Math.max(1,x1-x), h = Math.max(1,y1-y);
    const surfaceRect = (fill,extra='') => `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" fill="${fill}" ${extra}/>`;
    grain = !monochrome && s.hasSample ? surfaceRect(`url(#${safeId}-grain)`,'opacity=".58"') : '';
    profile = board ? surfaceRect(`url(#${profile})`) : '';
    definition.push(`<pattern id="${safeId}" patternUnits="objectBoundingBox" width="1" height="1" viewBox="${[x,y,w,h].map(num).join(' ')}" preserveAspectRatio="none" data-profile="${esc(s.pattern)}" data-exposure-in="${s.exposureIn == null ? '' : num(s.exposureIn)}" data-coverage-status="${esc(s.coverageStatus)}" data-scale-status="${esc(s.profileScaleStatus)}" data-grain-scale="${s.grainScaleStatus}">${surfaceRect(color)}${grain}${profile}</pattern>`);
    return definition.join('');
  }
  return {specification, patternDef, isSmooth:smooth};
});
