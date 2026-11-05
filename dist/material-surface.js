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
    } else if (s.pattern === 'brick') {
      width=62;height=24;grain='';profile=`<path d="M0 0H62M0 12H62M0 24H62M31 0V12M0 12V24M62 12V24" fill="none" stroke="${monochrome?'#abb2a7':'#e8e4d9'}" stroke-width="1.8"/>`;
    }
    // One bounded surface viewport keeps independent profile and grain scales.
    // It also avoids oversized pattern buffers on mobile. Panel seams remain
    // the actual configured layout drawn by the caller, without a fake grid.
    if (s.pattern !== 'brick') {
      const [x,y,x1,y1] = bounds.map(Number), w = Math.max(1,x1-x), h = Math.max(1,y1-y);
      const surfaceRect = (fill,extra='') => `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" fill="${fill}" ${extra}/>`;
      grain = !monochrome && s.hasSample ? surfaceRect(`url(#${safeId}-grain)`,'opacity=".58"') : '';
      profile = board ? surfaceRect(`url(#${profile})`) : '';
      definition.push(`<pattern id="${safeId}" patternUnits="objectBoundingBox" width="1" height="1" viewBox="${[x,y,w,h].map(num).join(' ')}" preserveAspectRatio="none" data-profile="${esc(s.pattern)}" data-exposure-in="${s.exposureIn == null ? '' : num(s.exposureIn)}" data-coverage-status="${esc(s.coverageStatus)}" data-scale-status="${esc(s.profileScaleStatus)}" data-grain-scale="${s.grainScaleStatus}">${surfaceRect(color)}${grain}${profile}</pattern>`);
    } else definition.push(`<pattern id="${safeId}" patternUnits="userSpaceOnUse" width="${num(width)}" height="${num(height)}">${rect(width,height,color)}${grain}${profile}</pattern>`);
    return definition.join('');
  }
  return {specification, patternDef, isSmooth:smooth};
});
