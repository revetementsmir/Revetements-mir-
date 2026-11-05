/* MIR — renderer for the duplex concept. No libraries or remote requests.
 *
 * GEOMETRY IS SCHEMATIC, NOT A MEASURED MODEL FOR ORDERING MATERIALS.
 * The supplied floor/elevation sheets show 44 ft × 34 ft (13.4112 × 10.3632 m)
 * and two 12 ft front gables. Front grade-to-ridge is 26 ft 2 in (7.9756 m);
 * roof rise is 5 ft 7.5 in (1.7145 m). The schematic wall height is derived
 * as 6.2611 m. Applying this FRONT datum to every face assumes flat grade;
 * it does not reproduce the side/rear terrain or exposed-basement levels.
 * The ground-floor sheet (page 5, A-7) shows a central recess: its width is
 * 10 ft + 10 ft in the printed dimension chain; its depth is approximately
 * 2 ft, measured along ONE exterior wall face in the raster, not a printed
 * dimension. The apparent second step is the wall build-up, not another notch.
 * Roof intersections, overhang and foundation remain simplified. Soffits
 * follow the actual underside plane; no display bevel tilts them to the viewer.
 * Gross model areas are conditional geometry only:
 * openings, product coverage, waste and construction details are not deducted.
 *
 * API: await MIR3D.render(canvas, { views: { front, right, back, left },
 *   angle: 32, elevation:22, roofColor:'#4e5354',
 *   fasciaColor: '#272d2b', soffitColor: '#d9d9d0',
 *   soffitType: 'vented' | 'solid' | 'concealed',
 *   roofExposureIn:6, soffitCoverageIn:16, // documented covering dimensions, optional
 *   roofStyle:'duplex' | 'hip' | 'gable' | 'flat',
 *   foundationDrop: 0.8,
 *   footprint: { type: 'front-recess' }, // or 'rectangle' to disable the notch
 *   recess: { enabled:true, start:3.6576, width:6.096, depth:0.6096,
 *     height:6.2611, upperStorey:'recessed-confirmed', returnColor:'#d7d8d0',
 *     returnColors:{'return-left':'#d7d8d0','return-right':'#d7d8d0'} },
 *   porch:{enabled:true,projection:.9327,ceilingHeight:3.4,roofRise:.56,
 *     divider:{enabled:true,width:.20,color:'#444844'}},
 *   structures:[{id:'column-left',type:'column',origin:[-3.048,-6.1143,.86],
 *     size:[.1524,.1524,2.54],color:'#383d39',material:'unknown',
 *     sourceStatus:'schematic-position-from-plan'}],
 *   textureBottoms: { front: 0, right: -0.8, back: -0.8, left: -0.8 },
 *   exportSize: { width:2200, height:1500 }, // optional, exact output pixels
 *   dimensions: { width: 13.4112, depth: 10.3632, wallHeight: 6.2611, roofRise: 1.7145 }
 * });
 * Recess start is measured from the front-left corner; all dimensions are m.
 * startFt/widthFt/depthFt/heightFt and heightMeters are explicit input aliases;
 * recessHeight is a top-level height alias. footprint.recess is also accepted.
 * The legacy partial recess uses a 3.4 m APPROXIMATE porch-fascia alignment.
 * 'flush-assumption' retains that partial-height behavior for existing callers.
 * 'recessed-assumption' and 'recessed-confirmed' both continue to wallHeight;
 * the latter records the user's confirmation of the SAME setback on both
 * storeys in the supplied study, not a claim that an upper-floor sheet exists.
 * Full-height duplex recesses also shape the central roof edge and its returns.
 * The porch ceiling stays independent at its own supplied height. There is no
 * invented inter-storey ceiling in a continuous recess. The generic roof
 * templates retain their caller-selected outline and legacy ceiling behavior.
 * MIR3D.geometry(options) returns the footprint, gross return areas and their
 * assumptions without loading images or requiring a canvas.
 * Angle 0 = front; 90 = right; 180 = back; 270 = left.
 * SVGs: tight elevation viewBox, reference ground at bottom by default,
 * transparent outside walls. textureBottoms explicitly changes the world-Z
 * position of each SVG bottom (metres, negative = below the reference ground).
 * To retain a basement, extend that SVG's viewBox downwards by the corresponding
 * physical distance at its existing pixel/metre scale; do not shrink the image.
 * foundationDrop extends the wall shell below z=0 and lowers the ground shadow.
 * Both options default to zero. This basement extension is schematic, not a
 * reconstruction of site grade, foundation depth or excavated ground.
 * A calibrated SVG carries data-meters-per-unit="..." on its root. Both axes
 * use that exact physical scale, independently of subsequent volume edits.
 * An elevation narrower than the working model is not stretched to fill it;
 * textureScaleWarnings reports width disagreements greater than 1 percent.
 * Legacy SVGs without calibration retain a UNIFORM fit to the façade width.
 * The SVG aspect ratio is never independently stretched to a wall height.
 * Side façades have depth as their width. Rear/left SVGs are exterior views,
 * not mirrored copies of front/right. Roof parts in an SVG are clipped away.
 * An omitted/unknown soffitType produces a neutral panel appearance with no
 * perforations or ventilation slot. This is not a claim of product ventilation.
 * Porch and structure dimensions are explicitly supplied working geometry;
 * the renderer never infers structural material, load capacity or hidden parts.
 * `porch` is disabled unless enabled:true. `studyStructureDefaults()` returns
 * clearly marked starting boxes for the TWO outer porch posts in this PDF;
 * the central projecting partition is a wall, never an inferred steel post.
 * `mesh()` exports plain model-space polygons for a geometry-faithful reference.
 * render() returns diagnostics; no CSS, labels or DOM controls are injected.
 * roofCourses() and soffitCourses() expose the same model-space line segments
 * used by painting. Roof exposure is measured ALONG each sloped face; soffit
 * coverage is measured along its first edge. Unknown covering widths produce
 * no fabricated regular grid. These rows do not establish purchase quantities.
 * exportSize enables detached-canvas rendering at DPR 1 without CSS dimensions;
 * dimensions must be integers 64..8192, with at most 16,777,216 total pixels.
 * Omit it for normal responsive UI rendering. Dispose temporary export canvases.
 * pick(canvas, clientX, clientY) resolves the top painted surface, then uses
 * the inverse of the exact orthographic texture transform to return SVG pixels.
 * projectPoint(canvas, view, [svgX,svgY]) is the inverse, for visible points.
 */
(function (global) {
  'use strict';

  const DEFAULTS = Object.freeze({ width: 13.4112, depth: 10.3632, wallHeight: 6.2611, roofRise: 1.7145 });
  const RECESS_DEFAULTS = Object.freeze({ enabled:true, start:3.6576, width:6.096, depth:0.6096, height:3.4, upperStorey:'flush-assumption' });
  const PORCH_DEFAULTS = Object.freeze({ enabled:false, projection:.9327, ceilingHeight:3.4, roofRise:.56, fasciaHeight:.1524, floorHeight:.86,balconyEnabled:false,floorDeckThickness:.16,
    divider:Object.freeze({enabled:true,width:.20,color:'#d7d8d0'}),
    sourceStatus:'schematic-from-raster-confirm-dimensions', sourcePage:5, sourceSheet:'A-7' });
  const states = new WeakMap();
  const imageCache = new Map();
  const CACHE_LIMIT = 8;
  const TEXTURE_WIDTH_TOLERANCE = .01;
  const MAX_COURSE_LINES = 4096;
  const PI = Math.PI;
  let renderCounter = 0;

  const positive = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  function normal(poly) {
    const a = sub(poly[1], poly[0]), b = sub(poly[2], poly[0]);
    const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const length = Math.hypot(...n) || 1;
    return n.map(v => v / length);
  }

  function cleanColor(value, fallback) {
    return typeof value === 'string' && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i.test(value) ? value : fallback;
  }

  function exportSizeFrom(value) {
    if(value==null)return null;
    if(typeof value!=='object'||!Number.isInteger(value.width)||!Number.isInteger(value.height)||
      value.width<64||value.height<64||value.width>8192||value.height>8192||value.width*value.height>16777216)
      throw new RangeError('Export : largeur et hauteur doivent être des entiers de 64 à 8192 pixels, pour un maximum de 16 777 216 pixels.');
    return {width:value.width,height:value.height};
  }

  function dimensionsFrom(options) {
    const d = {};
    for (const name of Object.keys(DEFAULTS)) d[name] = positive(options.dimensions && options.dimensions[name], DEFAULTS[name]);
    const rise = options.dimensions && options.dimensions.roofRise;
    if(rise != null && Number.isFinite(Number(rise)) && Number(rise)>=0)d.roofRise=Number(rise);
    if(options.roofStyle==='flat')d.roofRise=0;
    return d;
  }

  function recessFrom(d, options) {
    const footprint = options.footprint && typeof options.footprint === 'object' ? options.footprint : {};
    const shape = typeof options.footprint === 'string' ? options.footprint : footprint.type;
    const supplied = { ...(footprint.recess || {}), ...(options.recess && typeof options.recess === 'object' ? options.recess : {}) };
    const read = (key, fallback) => {
      let value = supplied[key];
      if (value == null) value = supplied[key + 'Meters'];
      if (value == null && supplied[key + 'Ft'] != null) value = Number(supplied[key + 'Ft']) * .3048;
      if (key === 'height' && value == null && options.recessHeight != null) value = options.recessHeight;
      if (value == null) return fallback;
      if (!Number.isFinite(Number(value)) || Number(value) < 0) throw new RangeError(`Retrait : ${key} doit être un nombre positif ou nul, en mètres.`);
      return Number(value);
    };
    const start = read('start', d.width * 12 / 44);
    const width = read('width', d.width * 20 / 44);
    const depth = read('depth', RECESS_DEFAULTS.depth);
    const upperStorey = ['recessed-assumption','recessed-confirmed'].includes(supplied.upperStorey) ? supplied.upperStorey : 'flush-assumption';
    const continuous = upperStorey !== 'flush-assumption';
    const height = continuous ? d.wallHeight : read('height', Math.min(d.wallHeight, RECESS_DEFAULTS.height * d.width / DEFAULTS.width));
    const enabled = shape !== 'rectangle' && options.recess !== false && footprint.recess !== false && supplied.enabled !== false && width > 0 && depth > 0 && height > 0;
    if (enabled && (start <= 0 || start + width >= d.width)) throw new RangeError('Le retrait doit conserver un pan de façade à gauche et à droite.');
    if (enabled && depth >= d.depth) throw new RangeError('La profondeur du retrait doit être inférieure à celle du bâtiment.');
    if (enabled && height > d.wallHeight) throw new RangeError('La hauteur du retrait doit être inférieure ou égale à la hauteur de mur.');
    return { enabled, start, width, depth, height, upperStorey, returnColor:cleanColor(supplied.returnColor, '#d7d8d0'),
      returnColors:Object.fromEntries(['return-left','return-right'].map(id=>[id,cleanColor(supplied.returnColors?.[id],cleanColor(supplied.returnColor,'#d7d8d0'))])),
      returnFinishAssigned:Object.fromEntries(['return-left','return-right'].map(id=>[id,!!cleanColor(supplied.returnColors?.[id],null)])),
      status:'unverified-working-geometry', sourcePage:5, sourceSheet:'A-7', sourcePlan:'rez-de-chaussée',
      depthProvenance:'Raster exterior-face measurement ≈1.98 ft; working value 2 ft, or caller value. Not a printed dimension.',
      heightProvenance:continuous?'Full wall height from the working volume; independent of the porch ceiling. Not a new printed dimension.':'Approximate porch-fascia raster alignment, or caller value. Not a printed storey height.',
      upperStoreyProvenance:upperStorey==='recessed-confirmed'?'Same setback on both storeys confirmed by the user for this study; no upper-floor sheet supplied.':'No upper-floor plan supplied; selected continuation is an explicit assumption.' };
  }

  function porchFrom(d,recess,options) {
    const supplied=options.porch&&typeof options.porch==='object'?options.porch:{};
    const read=(key,fallback)=>{const v=supplied[key];if(v==null)return fallback;if(!Number.isFinite(Number(v))||Number(v)<0)throw new RangeError(`Porche : ${key} doit être un nombre positif ou nul, en mètres.`);return Number(v);};
    const start=read('start',recess.start),width=read('width',recess.width),projection=read('projection',PORCH_DEFAULTS.projection);
    // A wall setback can span two storeys; it never sets the porch elevation.
    const ceilingHeight=read('ceilingHeight',PORCH_DEFAULTS.ceilingHeight),roofRise=read('roofRise',PORCH_DEFAULTS.roofRise);
    const fasciaHeight=read('fasciaHeight',PORCH_DEFAULTS.fasciaHeight),floorHeight=read('floorHeight',PORCH_DEFAULTS.floorHeight);
    const balconyEnabled=supplied.balconyEnabled===true, floorDeckThickness=read('floorDeckThickness',PORCH_DEFAULTS.floorDeckThickness);
    const div=supplied.divider&&typeof supplied.divider==='object'?supplied.divider:{};
    const divider={enabled:supplied.divider!==false&&div.enabled!==false,width:positive(div.width,PORCH_DEFAULTS.divider.width),color:cleanColor(div.color,PORCH_DEFAULTS.divider.color)};
    const enabled=supplied.enabled===true&&width>0&&projection>0&&ceilingHeight>0;
    if(enabled&&(start<0||start+width>d.width||ceilingHeight+fasciaHeight+roofRise>d.wallHeight))throw new RangeError('Le porche doit rester sous le haut du mur et dans la largeur du bâtiment.');
    if(enabled&&(floorHeight>=ceilingHeight||divider.width>=width||floorDeckThickness>=floorHeight))throw new RangeError('La hauteur libre, le plancher du balcon et la largeur du porche doivent rester cohérents.');
    return {enabled,start,width,projection,ceilingHeight,roofRise,fasciaHeight,floorHeight,balconyEnabled,floorDeckThickness,divider,
      backOffset:recess.enabled?recess.depth:0,sourceStatus:String(supplied.sourceStatus||PORCH_DEFAULTS.sourceStatus),
      inferredStructuralMaterial:false,netArea:null,notCertifiedTakeoff:true};
  }

  function structuresFrom(options) {
    if(options.structures==null)return [];
    if(!Array.isArray(options.structures)||options.structures.length>200)throw new RangeError('Les poutres et colonnes doivent former une liste de 200 éléments au maximum.');
    const ids=new Set();
    return options.structures.filter(s=>s&&s.enabled!==false).map((s,index)=>{
      const id=typeof s.id==='string'&&s.id.trim()?s.id.trim():`structure-${index+1}`;
      if(ids.has(id))throw new RangeError('Chaque poutre ou colonne doit avoir un identifiant distinct.');ids.add(id);
      if(!['beam','column'].includes(s.type))throw new RangeError('Une structure doit être une poutre ou une colonne.');
      if(!Array.isArray(s.origin)||s.origin.length!==3||!s.origin.every(v=>Number.isFinite(Number(v))&&Math.abs(Number(v))<=10000))throw new RangeError('La position d’une poutre ou colonne doit contenir trois coordonnées en mètres.');
      if(!Array.isArray(s.size)||s.size.length!==3||!s.size.every(v=>Number.isFinite(Number(v))&&Number(v)>0&&Number(v)<=10000))throw new RangeError('Les dimensions d’une poutre ou colonne doivent être positives, en mètres.');
      return {id,type:s.type,origin:s.origin.map(Number),size:s.size.map(Number),color:cleanColor(s.color,'#424943'),
        material:['steel','aluminum'].includes(s.material)?s.material:'unknown',label:String(s.label||''),
        sourceStatus:String(s.sourceStatus||'user-defined-unverified'),structuralVerification:false};
    });
  }

  function studyStructureDefaults(options={}) {
    const d=dimensionsFrom(options),r=recessFrom(d,options),p=porchFrom(d,r,{...options,porch:{...PORCH_DEFAULTS,...(options.porch||{}),enabled:true}});
    const a=d.width/2,b=d.depth/2,w=.1524,x=-a+p.start,y=-b-p.projection;
    const posts=[0,1].map(i=>({id:i?'porch-column-right':'porch-column-left',type:'column',
      label:i?'Colonne extérieure droite du porche':'Colonne extérieure gauche du porche',
      origin:[i?x+p.width-w:x,y,p.floorHeight],size:[w,w,p.ceilingHeight-p.floorHeight],
      color:'#424943',material:'unknown',sourceStatus:'position-visible-on-A-7-section-and-height-schematic',
      sourcePage:5,sourceSheet:'A-7',structuralVerification:false}));
    // Horizontal roof support is a schematic placement, not a load calculation.
    const beamHeight=.23;
    posts.push({id:'porch-front-beam',type:'beam',label:'Poutre sous le toit du porche',
      origin:[x,y,p.ceilingHeight-beamHeight],size:[p.width,.1524,beamHeight],
      color:'#424943',material:'unknown',sourceStatus:'emplacement-schematique-A-7-a-valider',
      sourcePage:5,sourceSheet:'A-7',structuralVerification:false});
    return posts;
  }

  function studyDefaults(dimensions={}) {
    const d=dimensionsFrom({dimensions});
    const recess={...RECESS_DEFAULTS,start:d.width*12/44,width:d.width*20/44,height:d.wallHeight,upperStorey:'recessed-confirmed'};
    const porch={...PORCH_DEFAULTS,enabled:true,balconyEnabled:true,divider:{...PORCH_DEFAULTS.divider},
      provenance:'A-7 : emprise du porche et deux poteaux extérieurs visibles; projection et hauteurs lues sur raster, à confirmer. Le centre est une cloison séparative.'};
    return {footprint:{type:'front-recess'},recess,recessRevision:4,porch,structures:studyStructureDefaults({dimensions,recess,porch}),roofStyle:'duplex',
      sourceStatus:'schematic-from-supplied-duplex-only',
      provenance:'Étude du PDF fourni, élévations A-2 à A-5 et rez-de-chaussée A-7. Retrait identique aux deux étages confirmé par l’utilisateur. Aucune coupe, aucun plan d’étage ou de fondation fourni; matériau porteur des poteaux et poutres non déterminé.'};
  }

  // Axis-aligned clipping preserves the original facade coordinates and SVG
  // scale. It partitions walls; it never squeezes a whole elevation into a bay.
  function clipAxis(poly, axis, value, keepGreater) {
    if (!poly.length) return [];
    const result = [], inside = p => keepGreater ? p[axis] >= value - 1e-9 : p[axis] <= value + 1e-9;
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length], pIn = inside(p), qIn = inside(q);
      if (pIn) result.push(p);
      if (pIn !== qIn) result.push(mix(p, q, (value - p[axis]) / (q[axis] - p[axis])));
    });
    return result.filter((p, i) => !i || Math.hypot(...sub(p, result[i - 1])) > 1e-8);
  }

  function area3D(poly) {
    if (poly.length < 3) return 0;
    const sum = [0,0,0];
    poly.forEach((p,i) => { const q=poly[(i+1)%poly.length]; sum[0]+=p[1]*q[2]-p[2]*q[1]; sum[1]+=p[2]*q[0]-p[0]*q[2]; sum[2]+=p[0]*q[1]-p[1]*q[0]; });
    return Math.hypot(...sum) / 2;
  }

  function footprintMetrics(d, recess) {
    const a=d.width/2, b=d.depth/2, x=-a+recess.start, r=recess.depth;
    const points = recess.enabled ? [[-a,-b],[x,-b],[x,-b+r],[x+recess.width,-b+r],[x+recess.width,-b],[a,-b],[a,b],[-a,b]] : [[-a,-b],[a,-b],[a,b],[-a,b]];
    let twiceArea=0, perimeter=0;
    points.forEach((p,i)=>{const q=points[(i+1)%points.length];twiceArea+=p[0]*q[1]-p[1]*q[0];perimeter+=Math.hypot(q[0]-p[0],q[1]-p[1]);});
    return { type:recess.enabled?'front-recess':'rectangle', points, units:'m', origin:'Building centre; front is y=-depth/2; x runs left to right in front elevation.',
      area:Math.abs(twiceArea)/2, perimeter, rectangleArea:d.width*d.depth, rectanglePerimeter:2*(d.width+d.depth),
      removedArea:recess.enabled?recess.width*r:0, addedPerimeter:recess.enabled?2*r:0,
      sourcePlan:recess.upperStorey==='recessed-confirmed'?'RDC footprint; same upper-storey setback confirmed by the user. No foundation or upper-floor sheet supplied.':'RDC only; not a foundation or upper-floor plan', status:'conditional-model-geometry' };
  }

  function svgMetersPerUnit(root) {
    const raw = root.getAttribute('data-meters-per-unit');
    if (raw == null) return null; // Compatibility with uncalibrated legacy callers.
    const value = String(raw).trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !(Number(value)>0) || !Number.isFinite(Number(value)))
      throw new Error('Échelle SVG invalide : data-meters-per-unit doit être un nombre positif en mètres par unité.');
    return Number(value);
  }

  function textureScale(item, modelWidthMeters, wallHeightMeters) {
    if (item.fitWall) return {calibrated:false, metersPerUnit:modelWidthMeters/item.viewBox[2],
      widthMeters:modelWidthMeters, heightMeters:wallHeightMeters, modelWidthMeters,
      widthDifferenceMeters:0, relativeWidthDifference:0, scaleStatus:'fit-to-wall'};
    const calibrated = Number.isFinite(item.metersPerUnit) && item.metersPerUnit > 0;
    const metersPerUnit = calibrated ? item.metersPerUnit : modelWidthMeters / item.viewBox[2];
    const widthMeters = item.viewBox[2] * metersPerUnit, heightMeters = item.viewBox[3] * metersPerUnit;
    const widthDifferenceMeters = widthMeters - modelWidthMeters;
    return {calibrated, metersPerUnit, widthMeters, heightMeters, modelWidthMeters,
      widthDifferenceMeters, relativeWidthDifference:Math.abs(widthDifferenceMeters)/modelWidthMeters,
      scaleStatus:calibrated?'calibrated-drawing':'legacy-fit-to-model'};
  }

  // Intersect a polygon with a plane whose normal lies in its surface. These
  // world-space segments preserve the supplied covering distance on slopes,
  // triangles and mitred soffits; they do not redistribute a last cut equally.
  function courseLayout(poly, inches, mode) {
    const empty = reason => ({segments:[],spacingMeters:null,axis:null,origin:null,reason});
    if (typeof inches !== 'number' || !Number.isFinite(inches) || inches <= 0) return empty('covering-width-unknown');
    if (!Array.isArray(poly) || poly.length < 3 || !poly.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)) || area3D(poly)<1e-10) return empty('invalid-surface');
    const spacingMeters = inches * .0254, n = normal(poly);
    // Project vertical up into the roof plane: one unit on this axis is one
    // metre along the slope, regardless of pitch or azimuth.
    let axis = mode==='roof' ? [-n[2]*n[0],-n[2]*n[1],1-n[2]*n[2]] : sub(poly[1],poly[0]);
    const length = Math.hypot(...axis);
    if (length<1e-9) return {...empty(mode==='roof'?'flat-roof-direction-unknown':'invalid-course-direction'),spacingMeters};
    axis = axis.map(v=>v/length);
    const coordinates = poly.map(p=>dot(p,axis)), low=Math.min(...coordinates), high=Math.max(...coordinates);
    const origin = mode==='roof' ? low : coordinates[0];
    const first = Math.floor((low-origin)/spacingMeters+1e-9)+1;
    const last = Math.ceil((high-origin)/spacingMeters-1e-9)-1;
    if (last-first+1>MAX_COURSE_LINES) return {segments:[],spacingMeters,axis,origin,reason:'covering-grid-too-dense'};
    const segments=[];
    for(let index=first;index<=last;index++) {
      const distance=origin+index*spacingMeters, intersections=[];
      poly.forEach((p,i)=>{
        const q=poly[(i+1)%poly.length],a=coordinates[i],b=coordinates[(i+1)%poly.length];
        if ((a<=distance&&b>distance)||(b<=distance&&a>distance)) {
          const point=mix(p,q,(distance-a)/(b-a));
          if(!intersections.some(other=>Math.hypot(...sub(point,other))<1e-8))intersections.push(point);
        }
      });
      // Along the intersection line, pairs delimit the interior even for a
      // concave caller polygon. Generated MIR roof/soffit faces are planar.
      const tangent=[n[1]*axis[2]-n[2]*axis[1],n[2]*axis[0]-n[0]*axis[2],n[0]*axis[1]-n[1]*axis[0]];
      intersections.sort((a,b)=>dot(a,tangent)-dot(b,tangent));
      for(let i=0;i+1<intersections.length;i+=2)if(Math.hypot(...sub(intersections[i+1],intersections[i]))>1e-8)
        segments.push({index,offsetMeters:index*spacingMeters,points:[intersections[i],intersections[i+1]]});
    }
    return {segments,spacingMeters,axis,origin,reason:null};
  }
  const roofCourses = (poly, exposureIn) => courseLayout(poly, exposureIn, 'roof');
  const soffitCourses = (poly, coverageIn) => courseLayout(poly, coverageIn, 'soffit');

  function loadSVG(source) {
    if (!source) return Promise.resolve(null);
    if (typeof source !== 'string') return Promise.reject(new Error('Une vue doit être une chaîne SVG.'));
    if (imageCache.has(source)) {
      const cached = imageCache.get(source);
      imageCache.delete(source); imageCache.set(source, cached);
      return cached;
    }
    const promise = new Promise((resolve, reject) => {
      let url;
      try {
        const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
        const root = doc.documentElement;
        if (root.localName !== 'svg' || doc.querySelector('parsererror')) throw new Error('SVG non valide.');
        // Image input is local SVG only: do not permit remote assets or executable HTML.
        root.querySelectorAll('script, foreignObject, iframe').forEach(el => el.remove());
        root.querySelectorAll('*').forEach(el => {
          for (const attr of Array.from(el.attributes)) {
            if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
            if (/(^|:)href$/i.test(attr.name) && !/^(#|data:image\/)/i.test(attr.value)) el.removeAttribute(attr.name);
            if (/url\(\s*['"]?(?:https?:|\/\/)/i.test(attr.value)) el.removeAttribute(attr.name);
          }
        });
        root.querySelectorAll('style').forEach(el => {
          if (/@import|url\(\s*['"]?(?:https?:|\/\/)/i.test(el.textContent)) el.remove();
        });
        const vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
        const w = vb.length === 4 ? positive(vb[2], 1000) : positive(parseFloat(root.getAttribute('width')), 1000);
        const h = vb.length === 4 ? positive(vb[3], 520) : positive(parseFloat(root.getAttribute('height')), 520);
        root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        if (!root.hasAttribute('viewBox')) root.setAttribute('viewBox', `0 0 ${w} ${h}`);
        const metersPerUnit = svgMetersPerUnit(root);
        const fitWall = root.getAttribute('data-fit-wall-height') === 'true';
        const pixels = fitWall ? Math.max(1, Math.round(1280 * Math.min(1, w / h))) : 1800;
        root.setAttribute('width', String(pixels));
        root.setAttribute('height', String(Math.max(1, Math.round(pixels * h / w))));
        const img = new Image();
        url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml;charset=utf-8' }));
        img.onload = () => { URL.revokeObjectURL(url); resolve({ image: img, ratio: h / w,viewBox:vb.length===4&&vb.every(Number.isFinite)?vb:[0,0,w,h],metersPerUnit,fitWall }); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Décodage de la vue SVG impossible.')); };
        img.src = url;
      } catch (error) {
        if (url) URL.revokeObjectURL(url);
        reject(error);
      }
    });
    imageCache.set(source, promise);
    promise.catch(() => { if (imageCache.get(source) === promise) imageCache.delete(source); });
    while (imageCache.size > CACHE_LIMIT) imageCache.delete(imageCache.keys().next().value);
    return promise;
  }


  // Paysagement commercial purement illustratif. Il ne modifie aucun métré.
  function commercialSitePlan(d,options={}){
    if(options.siteStyle!=='commercial')return null;
    const a=d.width/2,b=d.depth/2,z=0;
    const rect=(x0,y0,x1,y1)=>[[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]];
    const xl=-a-2.0,xr=a+2.0,front=-b-7.5,walk=-b-1.65,back=-b-.35;
    const surfaces=[
      {id:'terrain-gazon',poly:rect(xl-1,front-1.2,xr+1,b+1.2),color:'#b6c8a5'},
      {id:'stationnement-asphalte',poly:rect(xl,front,xr,walk),color:'#626869'},
      {id:'entree-asphalte',poly:rect(xr-3.1,front-1.2,xr,walk),color:'#626869'},
      {id:'trottoir',poly:rect(xl,walk,xr,back),color:'#d8d4cb'},
      {id:'bordure',poly:rect(xl,walk-.17,xr,walk),color:'#aaa9a2'}
    ];
    const bays=Math.max(3,Math.min(7,Math.floor((xr-xl)/2.7)));
    const lines=[];
    for(let i=0;i<=bays;i++){const x=xl+(xr-xl)*i/bays;lines.push({id:'case-'+i,from:[x,front+.5,z+.02],to:[x,walk-.29,z+.02],width:.044,color:'#f5f5e9'});}
    for(let x=xl+2.4;x<xr;x+=2.4)lines.push({id:'joint-'+x,from:[x,walk,z+.02],to:[x,back,z+.02],width:.015,color:'#acaeaa'});
    const plants=[{point:[xl-.5,walk-.5,z],radius:.38},{point:[xr+.5,walk-.5,z],radius:.38}];
    return {surfaces,lines,plants,parkingBayCount:bays,noVehicles:true,
      sourceStatus:'illustrative-commercial-landscape-unmeasured',notCertifiedTakeoff:true};
  }

  function build(d, options) {
    const faces = [], a = d.width / 2, b = d.depth / 2, h = d.wallHeight, rise = d.roofRise;
    const foundationDrop = positive(options.foundationDrop, 0), ground = -foundationDrop;
    const recess = recessFrom(d, options), footprint = footprintMetrics(d, recess);
    const porch=porchFrom(d,recess,options),structures=structuresFrom(options);
    const roofStyle=['duplex','hip','gable','flat'].includes(options.roofStyle)?options.roofStyle:'duplex';
    const wing = d.width * 12 / 44, c = a - wing / 2, inner = a - wing;
    const notchedDuplex = roofStyle==='duplex' && recess.enabled && recess.height >= h-1e-8;
    // One set of boundaries controls the full-height walls, gables and roof.
    // Editing the setback width or start must not leave a second outline above.
    const leftInner=notchedDuplex?-a+recess.start:-inner, rightInner=notchedDuplex?leftInner+recess.width:inner;
    const leftRidge=notchedDuplex?(-a+leftInner)/2:-c, rightRidge=notchedDuplex?(rightInner+a)/2:c;
    const e = Math.min(.30, d.width * .025, d.depth * .035), top = h + rise;
    const X = a + e, Y = b + e, Z = h + .06, P = top + .06;
    const notchOverhang=notchedDuplex?Math.min(e,recess.width/4):e;
    const roofLeftInner=leftInner+notchOverhang, roofRightInner=rightInner-notchOverhang;
    const centreFrontY=-Y+(notchedDuplex?recess.depth:0), ridgeY=notchedDuplex?recess.depth/2:0, fasciaDrop = .15;
    const add = (id, poly, type, n, extra) => {
      if (poly.length < 3 || area3D(poly) < 1e-9) return;
      const computed = n || normal(poly);
      const outward = (type==='roof'&&computed[2]<0)||(type==='soffit'&&computed[2]>0) ? computed.map(v=>-v) : computed;
      faces.push({ id, poly, type, normal: outward, ...extra });
    };
    const addBox=(id,origin,size,type,color,extra={})=>{
      const [x,y,z]=origin,[w,depth,height]=size,X=x+w,Y=y+depth,Z=z+height,meta={fillColor:color,...extra};
      add(id+'-front',[[x,y,z],[X,y,z],[X,y,Z],[x,y,Z]],type,[0,-1,0],meta);
      add(id+'-right',[[X,y,z],[X,Y,z],[X,Y,Z],[X,y,Z]],type,[1,0,0],meta);
      add(id+'-back',[[X,Y,z],[x,Y,z],[x,Y,Z],[X,Y,Z]],type,[0,1,0],meta);
      add(id+'-left',[[x,Y,z],[x,y,z],[x,y,Z],[x,Y,Z]],type,[-1,0,0],meta);
      add(id+'-top',[[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],type,[0,0,1],meta);
      add(id+'-bottom',[[x,Y,z],[X,Y,z],[X,y,z],[x,y,z]],type,[0,0,-1],meta);
    };
    // Local horizontal coordinate runs left-to-right as seen from OUTSIDE each elevation.
    const frontProfile = roofStyle==='duplex'? [[-a,-b,ground],[a,-b,ground],[a,-b,h],[rightRidge,-b,top],[rightInner,-b,h],[leftInner,-b,h],[leftRidge,-b,top],[-a,-b,h]]:
      [[-a,-b,ground],[a,-b,ground],[a,-b,h],[-a,-b,h]];
    const frontPart = (id, poly, y) => add(id, poly.map(p=>[p[0],y,p[2]]), 'wall', [0,-1,0], { base:[-a,y,0], u:[1,0,0], width:d.width, textureView:'front', texturePhysicalWidth:d.width });
    if (!recess.enabled) {
      frontPart('front',frontProfile,-b);
    } else {
      const L=-a+recess.start, R=L+recess.width, y=-b+recess.depth, z=recess.height;
      const middle=clipAxis(clipAxis(frontProfile,0,L,true),0,R,false);
      frontPart('front-left',clipAxis(frontProfile,0,L,false),-b);
      frontPart('front-right',clipAxis(frontProfile,0,R,true),-b);
      frontPart('front-upper',clipAxis(middle,2,z,true),-b);
      frontPart('front',clipAxis(middle,2,z,false),y);
      // The same two return planes bound the complete recessed wall height.
      // Their finishes are unassigned: never duplicate doors/windows from an
      // exterior side elevation onto these previously undocumented surfaces.
      add('return-left',[[L,-b,ground],[L,y,ground],[L,y,z],[L,-b,z]],'wall',[1,0,0],{base:[L,-b,0],u:[0,1,0],width:recess.depth,role:'recess-return',returnId:'return-left',textureView:'return-left',fillColor:recess.returnColors['return-left']});
      add('return-right',[[R,y,ground],[R,-b,ground],[R,-b,z],[R,y,z]],'wall',[-1,0,0],{base:[R,y,0],u:[0,-1,0],width:recess.depth,role:'recess-return',returnId:'return-right',textureView:'return-right',fillColor:recess.returnColors['return-right']});
      // This horizontal underside has its real downward normal. It must not
      // be tilted towards the viewer merely to make a soffit visually bigger.
      if(!notchedDuplex&&z>=h-1e-8){
        const roofUnderside=Z-fasciaDrop;
        add('soffit-recess-roof',[[L,-b,roofUnderside],[R,-b,roofUnderside],[R,y,roofUnderside],[L,y,roofUnderside]],'soffit',[0,0,-1],{role:'recess-roof-underside',measurementStatus:'caller-selected-generic-roof-outline'});
      }else if(!porch.enabled&&!notchedDuplex)add('soffit-recess',[[L,-b,z],[R,-b,z],[R,y,z],[L,y,z]],'soffit',[0,0,-1],{role:'recess-ceiling',measurementStatus:'assumed-upper-storey-continuation'});
      // A step in a wall is not evidence of a fascia. The former suspended
      // strip across the recess is intentionally absent; a real porch below
      // adds fascia only at its exposed roof edge.
    }
    add('right', roofStyle==='gable'?[[a,-b,ground],[a,b,ground],[a,b,h],[a,0,top],[a,-b,h]]:[[a,-b,ground],[a,b,ground],[a,b,h],[a,-b,h]], 'wall', [1,0,0], { base:[a,-b,0], u:[0,1,0], width:d.depth });
    add('back', [[a,b,ground],[-a,b,ground],[-a,b,h],[a,b,h]], 'wall', [0,1,0], { base:[a,b,0], u:[-1,0,0], width:d.width });
    add('left', roofStyle==='gable'?[[-a,b,ground],[-a,-b,ground],[-a,-b,h],[-a,0,top],[-a,b,h]]:[[-a,b,ground],[-a,-b,ground],[-a,-b,h],[-a,b,h]], 'wall', [-1,0,0], { base:[-a,b,0], u:[0,-1,0], width:d.depth });

    // Six adjoining roof planes: transverse main ridge and two front gables.
    // Deliberately no overlapping dormer boxes or a second generic giant front gable.
    if(roofStyle==='duplex'){
      add('roof-main-front', [[roofLeftInner,centreFrontY,Z],[roofRightInner,centreFrontY,Z],[rightRidge,ridgeY,P],[leftRidge,ridgeY,P]], 'roof');
      add('roof-main-back', [[X,Y,Z],[-X,Y,Z],[leftRidge,ridgeY,P],[rightRidge,ridgeY,P]], 'roof');
      add('roof-left-outer', [[-X,Y,Z],[-X,-Y,Z],[leftRidge,-Y,P],[leftRidge,ridgeY,P]], 'roof');
      add('roof-left-inner', notchedDuplex?[[leftRidge,-Y,P],[roofLeftInner,-Y,Z],[roofLeftInner,centreFrontY,Z],[leftRidge,ridgeY,P]]:[[leftRidge,-Y,P],[roofLeftInner,-Y,Z],[leftRidge,ridgeY,P]], 'roof');
      add('roof-right-inner', notchedDuplex?[[roofRightInner,centreFrontY,Z],[roofRightInner,-Y,Z],[rightRidge,-Y,P],[rightRidge,ridgeY,P]]:[[roofRightInner,-Y,Z],[rightRidge,-Y,P],[rightRidge,ridgeY,P]], 'roof');
      add('roof-right-outer', [[rightRidge,-Y,P],[X,-Y,Z],[X,Y,Z],[rightRidge,ridgeY,P]], 'roof');
    }else if(roofStyle==='gable'){
      add('roof-main-front',[[-X,-Y,Z],[X,-Y,Z],[X,0,P],[-X,0,P]],'roof');
      add('roof-main-back',[[X,Y,Z],[-X,Y,Z],[-X,0,P],[X,0,P]],'roof');
    }else if(roofStyle==='hip'){
      const ridge=Math.max(0,a-b);
      add('roof-main-front',[[-X,-Y,Z],[X,-Y,Z],[ridge,0,P],[-ridge,0,P]],'roof');
      add('roof-main-back',[[X,Y,Z],[-X,Y,Z],[-ridge,0,P],[ridge,0,P]],'roof');
      add('roof-right',[[X,-Y,Z],[X,Y,Z],[ridge,0,P]],'roof');
      add('roof-left',[[-X,Y,Z],[-X,-Y,Z],[-ridge,0,P]],'roof');
    }else{
      add('roof-flat',[[-X,-Y,Z],[X,-Y,Z],[X,Y,Z],[-X,Y,Z]],'roof');
    }

    function trim(id, start, end, inward, outward, innerEnds) {
      const lowerA = [start[0], start[1], start[2] - fasciaDrop];
      const lowerB = [end[0], end[1], end[2] - fasciaDrop];
      const role=Math.abs(start[2]-end[2])>.00001?'gable-edge':'gutter-edge';
      add('fascia-' + id, [start,end,lowerB,lowerA], 'fascia', outward,{role});
      const innerA = innerEnds?[innerEnds[0][0],innerEnds[0][1],lowerA[2]]:[lowerA[0] + inward[0] * e, lowerA[1] + inward[1] * e, lowerA[2]];
      const innerB = innerEnds?[innerEnds[1][0],innerEnds[1][1],lowerB[2]]:[lowerB[0] + inward[0] * e, lowerB[1] + inward[1] * e, lowerB[2]];
      add('soffit-' + id, [lowerA,lowerB,innerB,innerA], 'soffit',null,{role:role==='gable-edge'?'gable-underside':'eave-underside'});
      // Short horizontal leg under the board: the visible L of fascia cladding.
      const leg=Math.min(.025,e*.15),legA=[lowerA[0]+inward[0]*leg,lowerA[1]+inward[1]*leg,lowerA[2]-.001],legB=[lowerB[0]+inward[0]*leg,lowerB[1]+inward[1]*leg,lowerB[2]-.001];
      const underside=[lowerA,lowerB,legB,legA],n=normal(underside);
      add('fascia-leg-'+id,underside,'fascia',n[2]>0?n.map(v=>-v):n,{role:'fascia-bottom-return'});
    }
    const frontEdge = roofStyle==='duplex'?[[-X,-Y,Z],[leftRidge,-Y,P],[roofLeftInner,-Y,Z],[roofRightInner,-Y,Z],[rightRidge,-Y,P],[X,-Y,Z]]:[[-X,-Y,Z],[X,-Y,Z]];
    if(notchedDuplex){
      trim('front-0',frontEdge[0],frontEdge[1],[0,1,0],[0,-1,0]);
      trim('front-1',frontEdge[1],frontEdge[2],[0,1,0],[0,-1,0]);
      const L=[roofLeftInner,centreFrontY,Z],R=[roofRightInner,centreFrontY,Z],wallY=-b+recess.depth;
      // Mitred inner endpoints share the actual wall corners. Plain strips
      // would leave an e×e hole at each re-entrant corner of the soffit.
      trim('return-left',frontEdge[2],L,[-1,0,0],[1,0,0],[[leftInner,-Y],[leftInner,wallY]]);
      trim('front-2',L,R,[0,1,0],[0,-1,0],[[leftInner,wallY],[rightInner,wallY]]);
      trim('return-right',R,frontEdge[3],[1,0,0],[-1,0,0],[[rightInner,wallY],[rightInner,-Y]]);
      trim('front-3',frontEdge[3],frontEdge[4],[0,1,0],[0,-1,0]);
      trim('front-4',frontEdge[4],frontEdge[5],[0,1,0],[0,-1,0]);
    }else for (let i = 0; i < frontEdge.length - 1; i++) trim('front-' + i, frontEdge[i], frontEdge[i+1], [0,1,0], [0,-1,0]);
    if(roofStyle==='gable'){
      trim('right-front',[X,-Y,Z],[X,0,P],[-1,0,0],[1,0,0]);
      trim('right-back',[X,0,P],[X,Y,Z],[-1,0,0],[1,0,0]);
      trim('left-back',[-X,Y,Z],[-X,0,P],[1,0,0],[-1,0,0]);
      trim('left-front',[-X,0,P],[-X,-Y,Z],[1,0,0],[-1,0,0]);
    }else{
      trim('right', [X,-Y,Z], [X,Y,Z], [-1,0,0], [1,0,0]);
      trim('left', [-X,Y,Z], [-X,-Y,Z], [1,0,0], [-1,0,0]);
    }
    trim('back', [X,Y,Z], [-X,Y,Z], [0,-1,0], [0,1,0]);
    if(porch.enabled){
      const L=-a+porch.start,R=L+porch.width,F=-b-porch.projection,B=-b+porch.backOffset,C=porch.ceilingHeight,T=C+porch.fasciaHeight,RT=T+porch.roofRise;
      if(porch.balconyEnabled){
        // Show the balcony/porch deck independently from the roof. No unproven
        // guardrails, stairs or structural capacity are inferred from a raster.
        addBox('balcony-deck',[L,F,porch.floorHeight-porch.floorDeckThickness],
          [porch.width,B-F,porch.floorDeckThickness],'balcony','#c6c8be',
          {role:'balcony-platform',sourceStatus:porch.sourceStatus,notCertifiedTakeoff:true});
      }
      add('roof-porch',[[L,F,T],[R,F,T],[R,B,RT],[L,B,RT]],'roof',null,{role:'porch-roof',measurementStatus:porch.sourceStatus});
      add('soffit-porch',[[L,F,C],[R,F,C],[R,B,C],[L,B,C]],'soffit',[0,0,-1],{role:'porch-ceiling',measurementStatus:porch.sourceStatus});
      add('fascia-porch-front',[[L,F,T],[R,F,T],[R,F,C],[L,F,C]],'fascia',[0,-1,0],{role:'gutter-edge'});
      const leg=Math.min(.025,porch.projection*.1);
      add('fascia-leg-porch-front',[[L,F,C-.001],[R,F,C-.001],[R,F+leg,C-.001],[L,F+leg,C-.001]],'fascia',[0,0,-1],{role:'fascia-bottom-return'});
      const edgeTop=T+porch.roofRise*porch.projection/(B-F);
      add('fascia-porch-left',[[L,F,C],[L,-b,C],[L,-b,edgeTop],[L,F,T]],'fascia',[-1,0,0],{role:'porch-exposed-side'});
      add('fascia-porch-right',[[R,-b,C],[R,F,C],[R,F,T],[R,-b,edgeTop]],'fascia',[1,0,0],{role:'porch-exposed-side'});
      if(porch.divider.enabled){
        addBox('porch-divider',[(L+R-porch.divider.width)/2,F,porch.floorHeight],[porch.divider.width,B-F,C-porch.floorHeight],
          'divider',porch.divider.color,{role:'porch-divider',sourceStatus:porch.sourceStatus});
      }
    }
    for(const s of structures)addBox('structure-'+s.id,s.origin,s.size,s.type,s.color,{structureId:s.id,material:s.material,sourceStatus:s.sourceStatus,role:s.type==='column'?'vertical-post':'horizontal-beam'});
    const steps=options.concreteSteps&&typeof options.concreteSteps==='object'?options.concreteSteps:null;
    if(steps?.enabled===true){
      const count=Math.max(1,Math.min(12,Math.round(positive(steps.count,4))));
      const width=Math.max(.8,Math.min(4,positive(steps.width,1.8)));
      const tread=Math.max(.22,Math.min(.55,positive(steps.tread,.30)));
      const riser=Math.max(.09,Math.min(.22,positive(steps.riser,.16)));
      const landing=-b-(porch.enabled?porch.projection:.35)-.07;
      for(let i=0;i<count;i++)addBox('concrete-stair-'+(i+1),
        [-width/2,landing-(count-i)*tread,0],[width,tread,(i+1)*riser],
        'concrete','#b7b8b3',{role:'concrete-step',sourceStatus:'proposition-a-valider-sur-le-PDF',notCertifiedTakeoff:true});
    }
    return { faces, a, b, e, top, ground, foundationDrop, dimensions:d, roofStyle, recess, footprint, porch, structures,
      sourcePlan:typeof options.sourcePlan==='string'?options.sourcePlan:roofStyle==='duplex'&&recess.enabled?'rez-de-chaussée, page 5 / A-7':'caller-supplied working geometry'};
  }

  function geometrySummary(mesh) {
    const r=mesh.recess;
    const returns=mesh.faces.filter(f=>f.role==='recess-return').map(f=>({id:f.id,poly:f.poly,depth:r.depth,heightAboveGround:r.height,
      grossAreaAboveGround:r.depth*r.height,grossFoundationArea:r.depth*mesh.foundationDrop,grossAreaIncludingFoundation:area3D(f.poly),
      netArea:null,openingsDeducted:false,finishAssigned:!!r.returnFinishAssigned?.[f.id],status:'unverified-working-geometry'}));
    const ceiling=mesh.faces.find(f=>f.role==='recess-ceiling');
    const porchCeiling=mesh.faces.find(f=>f.role==='porch-ceiling');
    return { dimensions:{...mesh.dimensions}, roofStyle:mesh.roofStyle, footprint:mesh.footprint, recess:{...r},porch:{...mesh.porch},
      surfaces:{returns,additionalReturnAreaAboveGround:returns.reduce((sum,f)=>sum+f.grossAreaAboveGround,0),
        additionalFoundationReturnArea:returns.reduce((sum,f)=>sum+f.grossFoundationArea,0),
        recessCeiling:ceiling?{id:ceiling.id,poly:ceiling.poly,grossArea:area3D(ceiling.poly),normal:ceiling.normal,netArea:null,
          status:'conditional-on-upper-storey-assumption',isEntirePorchSoffit:false}:null,
        porchCeiling:porchCeiling?{id:porchCeiling.id,poly:porchCeiling.poly,grossArea:area3D(porchCeiling.poly),normal:porchCeiling.normal,netArea:null,
          dividerDeducted:false,status:mesh.porch.sourceStatus,isEntirePorchSoffit:true}:null,
        soffits:mesh.faces.filter(f=>f.type==='soffit').map(f=>({id:f.id,role:f.role,poly:f.poly,normal:f.normal,grossModelArea:area3D(f.poly)})),
        fascias:mesh.faces.filter(f=>f.type==='fascia').map(f=>({id:f.id,role:f.role,poly:f.poly,normal:f.normal,grossModelArea:area3D(f.poly)})),
        structures:mesh.structures.map(s=>({...s,origin:s.origin.slice(),size:s.size.slice(),grossBoxArea:2*(s.size[0]*s.size[1]+s.size[0]*s.size[2]+s.size[1]*s.size[2]),netArea:null,notCertifiedTakeoff:true})),
        walls:mesh.faces.filter(f=>f.type==='wall').map(f=>({id:f.id,grossModelArea:area3D(f.poly),netArea:null,openingsDeducted:false})),
        areaUnit:'m2',notCertifiedTakeoff:true},
      wallParts:mesh.faces.filter(f=>f.type==='wall').map(f=>({id:f.id,poly:f.poly,normal:f.normal,textureView:f.textureView||(['front','right','back','left'].includes(f.id)?f.id:null),texturePhysicalWidth:f.texturePhysicalWidth||f.width})),
      assumptions:r.enabled?[
        'Recess depth is raster-estimated or caller-supplied; 2 ft is not a printed source dimension.',
        r.upperStorey==='recessed-confirmed'?'Same setback on both storeys is user-confirmed; no upper-floor sheet was supplied.':'Only the ground-floor plan is supplied; upper-storey continuation is assumed.',
        r.upperStorey==='flush-assumption'?'Recess height is an approximate porch-fascia alignment or caller-supplied value.':'The continuous recess reaches the working wall height; the porch ceiling is independent.',
        'Any continuation below ground follows foundationDrop as a display assumption, not a foundation drawing.',
        mesh.porch.enabled?'The optional porch includes its projecting underside at its own height; no duplicate ceiling is added at that height.':ceiling?'The recess ceiling excludes the projecting porch; no porch is inferred unless explicitly enabled.':mesh.roofStyle==='duplex'?'The full-height duplex setback follows the roof edge; no inter-storey ceiling or projecting porch is inferred.':'The caller-selected generic roof outline is retained with its own roof underside; no inter-storey ceiling or porch is inferred.',
        'Return finishes, openings, product coverage and waste are not resolved by this geometry.'
      ]:[], sourcePlan:mesh.sourcePlan, schematic:true };
  }

  function geometry(options = {}) {
    return geometrySummary(build(dimensionsFrom(options), options));
  }

  function exportMesh(options={}) {
    const model=build(dimensionsFrom(options),options);
    return {units:'m',origin:'building-centre; front y negative; z up',schematic:true,
      ...geometrySummary(model),faces:model.faces.map(f=>({...f,poly:f.poly.map(p=>p.slice()),normal:f.normal.slice(),
        ...(f.base?{base:f.base.slice(),u:f.u.slice()}:{}),color:f.fillColor||cleanColor(f.type==='roof'?options.roofColor:f.type==='soffit'?options.soffitColor:options.fasciaColor,f.type==='roof'?'#505658':f.type==='soffit'?'#d8dbd1':'#303735')}))};
  }

  function pointInPolygon(point,polygon) {
    let hit=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[j],b=polygon[i],dx=b[0]-a[0],dy=b[1]-a[1],cross=(point[0]-a[0])*dy-(point[1]-a[1])*dx;
      if(Math.abs(cross)<1e-6&&point[0]>=Math.min(a[0],b[0])-1e-6&&point[0]<=Math.max(a[0],b[0])+1e-6&&point[1]>=Math.min(a[1],b[1])-1e-6&&point[1]<=Math.max(a[1],b[1])+1e-6)return true;
      if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  }
  function surfaceAt(state,point) {
    // Match the renderer's painter order, including occluding roofs and trim.
    for(let i=(state.hitSurfaces||[]).length-1;i>=0;i--){const surface=state.hitSurfaces[i];if(pointInPolygon(point,surface.screenPolygon))return surface;}
    return null;
  }
  function pick(canvas,clientX,clientY) {
    const state=states.get(canvas),box=canvas?.getBoundingClientRect();
    if(!state?.size||!box?.width||!box?.height||![clientX,clientY].every(Number.isFinite))return null;
    const point=[(clientX-(box.left||0))*state.size[0]/box.width,(clientY-(box.top||0))*state.size[1]/box.height];
    const surface=surfaceAt(state,point);if(!surface)return null;
    const hit={surfaceId:surface.surfaceId,type:surface.type,role:surface.role||null,view:surface.view||null,screenPoint:point,renderId:state.pickingRenderId};
    if(surface.structureId){hit.structureId=surface.structureId;hit.material=surface.material;}
    if(surface.returnId)hit.returnId=surface.returnId;
    if(surface.role==='porch-divider')return {...hit,type:'wall',view:'front',zoneId:'pilier',sharedFinish:true};
    if(surface.role==='recess-return'&&!surface.textureFrame){hit.view='front';hit.zoneId='centre_RDC';hit.sharedFinish=!surface.independentFinish;}
    const frame=surface.textureFrame;
    if(frame){
      const [ux,uy]=frame.horizontal,[vx,vy]=frame.vertical,dx=point[0]-frame.origin[0],dy=point[1]-frame.origin[1],det=ux*vy-uy*vx;
      if(Math.abs(det)>1e-9){
        const u=(dx*vy-dy*vx)/det,v=(ux*dy-uy*dx)/det;
        // A calibrated elevation may leave part of an inconsistent volume
        // uncovered. Do not pretend that unpainted area belongs to the PDF.
        if(u>=-1e-9&&u<=1+1e-9&&v>=-1e-9&&v<=1+1e-9){hit.uv=[u,v];hit.sourcePoint=[frame.viewBox[0]+u*frame.viewBox[2],frame.viewBox[1]+v*frame.viewBox[3]];}
      }
    }
    return hit;
  }
  function projectPoint(canvas,view,sourcePoint) {
    const state=states.get(canvas),box=canvas?.getBoundingClientRect();if(!state?.size||!box?.width||!box?.height||!Array.isArray(sourcePoint)||!sourcePoint.every(Number.isFinite))return null;
    for(const surface of state.hitSurfaces||[]){
      const frame=surface.textureFrame;if(surface.view!==view||!frame)continue;
      const u=(sourcePoint[0]-frame.viewBox[0])/frame.viewBox[2],v=(sourcePoint[1]-frame.viewBox[1])/frame.viewBox[3];
      if(u<0||u>1||v<0||v>1)continue;
      const point=[frame.origin[0]+u*frame.horizontal[0]+v*frame.vertical[0],frame.origin[1]+u*frame.horizontal[1]+v*frame.vertical[1]];
      if(!pointInPolygon(point,surface.screenPolygon)||surfaceAt(state,point)?.surfaceId!==surface.surfaceId)continue;
      return {clientX:(box.left||0)+point[0]*box.width/state.size[0],clientY:(box.top||0)+point[1]*box.height/state.size[1],screenPoint:point,surfaceId:surface.surfaceId,view};
    }
    return null;
  }

  function draw(canvas, options, images, state, token, errors) {
    const rect = canvas.getBoundingClientRect();
    const output=options.exportSize;
    const W = output?.width || canvas.clientWidth || rect.width, H = output?.height || canvas.clientHeight || rect.height;
    if (!(W > 0 && H > 0)) return { rendered:false, reason:'canvas-hidden', renderId:token };
    const dpr = output ? 1 : Math.max(1, Math.min(global.devicePixelRatio || 1, 2.5));
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Le rendu Canvas 2D n’est pas disponible.');
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const d = dimensionsFrom(options);
    const mesh = build(d, options);
    const angle = Number.isFinite(Number(options.angle)) ? Number(options.angle) : 32;
    const requestedElevation=options.elevation??options.cameraElevation;
    const elevationDegrees=Number.isFinite(Number(requestedElevation))?Math.max(5,Math.min(75,Number(requestedElevation))):22;
    const az = angle * PI / 180, elevation = elevationDegrees * PI / 180;
    const co = Math.cos(az), si = Math.sin(az), ce = Math.cos(elevation), se = Math.sin(elevation);
    const camera = [si * ce, -co * ce, se];
    const flat = p => [p[0] * co + p[1] * si, (p[0] * si - p[1] * co) * se - p[2] * ce];
    const site=commercialSitePlan(d,options);
    const extent = mesh.faces.flatMap(f => f.poly).concat(site?site.surfaces.flatMap(p=>p.poly):[]).map(flat);
    const minX = Math.min(...extent.map(p=>p[0])), maxX = Math.max(...extent.map(p=>p[0]));
    const minY = Math.min(...extent.map(p=>p[1])), maxY = Math.max(...extent.map(p=>p[1]));
    const padX = Math.max(18, W * .065), padTop = Math.max(18, H * .08), padBottom = Math.max(24, H * .13);
    const zoom=Math.max(.7,Math.min(3.5,Number.isFinite(Number(options.zoom))?Number(options.zoom):1));
    const scale = Math.max(.001, Math.min((W - 2*padX)/(maxX-minX), (H-padTop-padBottom)/(maxY-minY)))*zoom;
    const tx = W/2 - (minX+maxX)/2*scale;
    const ty = padTop + (H-padTop-padBottom-(maxY-minY)*scale)/2 - minY*scale;
    const project = p => { const q=flat(p); return [tx+q[0]*scale,ty+q[1]*scale]; };
    const trace = points => { ctx.beginPath(); points.forEach((v,i)=>{const p=project(v);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath(); };
    const line = (a,b,color,width) => {ctx.beginPath();ctx.moveTo(...project(a));ctx.lineTo(...project(b));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
    const patch = (points,color) => {trace(points);ctx.fillStyle=color;ctx.fill();};
    const local = (face,u,z) => [face.base[0]+face.u[0]*u,face.base[1]+face.u[1]*u,z];

    // Grounding shadow only; leave the host's canvas background visible.
    const floorZ = mesh.ground - .025;
    const floor = [[-mesh.a-.6,-mesh.b-.6,floorZ],[mesh.a+.9,-mesh.b-.6,floorZ],[mesh.a+.9,mesh.b+.85,floorZ],[-mesh.a-.6,mesh.b+.85,floorZ]];
    ctx.save(); ctx.shadowColor='rgba(28,37,29,.19)';ctx.shadowBlur=Math.max(12,scale*.55);ctx.shadowOffsetY=7;
    patch(floor,'rgba(62,73,55,.055)');ctx.restore();
    if(site){
      for(const surface of site.surfaces)patch(surface.poly,surface.color);
      for(const seam of site.lines)line(seam.from,seam.to,seam.color,Math.max(.8,scale*seam.width));
      for(const plant of site.plants){
        const [sx,sy]=project(plant.point);
        ctx.beginPath();ctx.ellipse(sx,sy,Math.max(3,scale*plant.radius),Math.max(2,scale*plant.radius*.48),0,0,PI*2);
        ctx.fillStyle='#799c74';ctx.fill();ctx.strokeStyle='#4b704c';ctx.lineWidth=.8;ctx.stroke();
      }
    }
    const fascia = cleanColor(options.fasciaColor, '#303735');
    const soffit = cleanColor(options.soffitColor, '#d8dbd1');
    const roofColor=cleanColor(options.roofColor,'#505658');
    const soffitType = ['vented','solid','concealed'].includes(options.soffitType) ? options.soffitType : 'neutral';
    const textureBottoms = {};
    for (const name of ['front','right','back','left','return-left','return-right']) {
      const value = options.textureBottoms && options.textureBottoms[name];
      textureBottoms[name] = value != null && Number.isFinite(Number(value)) ? Number(value) : 0;
    }
    const textureScales=Object.fromEntries(Object.entries(images).filter(([,item])=>item).map(([view,item])=>[
      view,textureScale(item,view.startsWith('return-')?mesh.recess.depth:(view==='front'||view==='back'?d.width:d.depth),d.wallHeight)
    ]));
    const textureScaleWarnings=Object.entries(textureScales).filter(([,info])=>info.calibrated&&info.relativeWidthDifference>TEXTURE_WIDTH_TOLERANCE).map(([view,info])=>({
      code:'TEXTURE_MODEL_WIDTH_MISMATCH',view,message:'Volume et élévation à recaler : la couvrance garde l’échelle du dessin.',
      ...info,toleranceRelative:TEXTURE_WIDTH_TOLERANCE
    }));
    const faceOrder = {wall:0,divider:0,soffit:1,roof:2,fascia:3,column:4,beam:4,concrete:4};
    const visible = mesh.faces.filter(f=>dot(f.normal,camera)>.0001).map(f=>({...f,depth:f.poly.reduce((sum,p)=>sum+dot(p,camera),0)/f.poly.length})).sort((a,b)=>a.depth-b.depth || faceOrder[a.type]-faceOrder[b.type]);

    function paintWall(face) {
      trace(face.poly);ctx.save();ctx.clip();ctx.fillStyle=face.fillColor||'#d7d8d0';ctx.fill();
      if (mesh.foundationDrop > 0) patch([local(face,0,mesh.ground),local(face,face.width,mesh.ground),local(face,face.width,0),local(face,0,0)],'#b9bcb3');
      const sourceView = face.textureView || face.id;
      const item = images[sourceView];
      const stoneHeight = face.role==='recess-return'||item?.fitWall?0:Math.min(.86,d.wallHeight*.18);
      if(stoneHeight>0)patch([local(face,0,0),local(face,face.width,0),local(face,face.width,stoneHeight),local(face,0,stoneHeight)],'#b2b2a5');
      for(let z=.13,row=0;z<stoneHeight;z+=.145,row++) {
        line(local(face,0,z),local(face,face.width,z),'rgba(244,241,228,.75)',.7);
        for(let u=(row%2)*.31;u<face.width;u+=.62) line(local(face,u,z),local(face,u,Math.min(z+.145,stoneHeight)),'rgba(244,241,228,.65)',.6);
      }
      if (item) {
        const {widthMeters:worldWidth,heightMeters:worldHeight}=textureScales[sourceView];
        const bottom = textureBottoms[sourceView];
        const A=project(local(face,0,bottom+worldHeight)),B=project(local(face,worldWidth,bottom+worldHeight)),C=project(local(face,0,bottom));
        const iw=item.image.naturalWidth || item.image.width, ih=item.image.naturalHeight || item.image.height;
        ctx.save();ctx.transform((B[0]-A[0])/iw,(B[1]-A[1])/iw,(C[0]-A[0])/ih,(C[1]-A[1])/ih,A[0],A[1]);
        ctx.drawImage(item.image,0,0,iw,ih);ctx.restore();
      }
      if(face.role==='recess-return'&&options.returnMasonry?.heightMeters>0){
        const height=Math.min(d.wallHeight,Number(options.returnMasonry.heightMeters)),w=face.width;
        if(height>0&&w>0){
          // Même altitude physique et joints que le soubassement frontal.
          // Surimpression géométrique : la brique reste visible même si
          // la texture SVG du petit retour n'est pas chargée.
          patch([local(face,0,0),local(face,w,0),local(face,w,height),local(face,0,height)],
            cleanColor(options.returnMasonry.color,'#ab9383'));
          for(let row=0,z=.075;z<height;row++,z+=.075){
            line(local(face,0,z),local(face,w,z),'rgba(70,53,42,.46)',.7);
            for(let u=(row%2)*.14;u<w;u+=.28)
              line(local(face,u,Math.max(0,z-.075)),local(face,u,z),'rgba(70,53,42,.42)',.65);
          }
        }
      }
      const shade = Math.max(0,.105 - dot(face.normal,[-.35,-.85,.4])*.07);
      trace(face.poly);ctx.fillStyle=`rgba(21,32,26,${shade})`;ctx.fill();ctx.restore();
    }

    function paintRoof(face) {
      const light = Math.max(0, dot(face.normal,[-.28,-.40,.82]));
      trace(face.poly);ctx.save();ctx.clip();ctx.fillStyle=roofColor;ctx.fill();
      ctx.fillStyle=`rgba(13,21,18,${Math.max(.025,.20-light*.17)})`;ctx.fill();
      // Exact exposure in the surface plane, never a fixed change of altitude.
      for(const row of roofCourses(face.poly,options.roofExposureIn).segments)
        line(row.points[0],row.points[1],'rgba(15,23,22,.19)',.65);
      ctx.restore();
    }

    function paintSolid(face) {
      patch(face.poly,face.fillColor||fascia);
      const shade=Math.max(.025,.14-dot(face.normal,[-.35,-.85,.4])*.10);
      trace(face.poly);ctx.fillStyle=`rgba(18,28,22,${shade})`;ctx.fill();
    }

    function paintSoffit(face) {
      patch(face.poly,soffit);ctx.save();trace(face.poly);ctx.clip();
      const [a,b,c,d]=face.poly;
      const length=Math.hypot(...sub(b,a));
      for(const row of soffitCourses(face.poly,options.soffitCoverageIn).segments)
        line(row.points[0],row.points[1],'rgba(20,32,27,.24)',.6);
      if(soffitType==='vented') {
        const holes=Math.max(2,Math.floor(length/.10));
        for(let row=0;row<3;row++)for(let i=1;i<holes;i++) {
          const p=mix(mix(a,b,i/holes),mix(d,c,i/holes),.30+row*.20),q=project(p);
          ctx.beginPath();ctx.arc(q[0],q[1],Math.max(.38,Math.min(.85,scale*.012)),0,PI*2);ctx.fillStyle='rgba(20,27,24,.55)';ctx.fill();
        }
      } else if(soffitType==='concealed') {
        line(mix(a,d,.79),mix(b,c,.79),'rgba(14,24,20,.64)',Math.max(.8,scale*.019));
      }
      ctx.restore();
    }

    for(const face of visible) {
      if(face.type==='wall')paintWall(face);
      else if(face.type==='roof')paintRoof(face);
      else if(face.type==='soffit')paintSoffit(face);
      else if(['column','beam','divider','balcony','concrete'].includes(face.type))paintSolid(face);
      else patch(face.poly,fascia);
      trace(face.poly);ctx.strokeStyle=face.type==='roof'?'rgba(20,27,25,.54)':'rgba(28,38,30,.24)';ctx.lineWidth=face.type==='fascia'?.55:.75;ctx.lineJoin='round';ctx.stroke();
    }
    state.size = [W,H,dpr];
    state.pickingRenderId=token;
    state.hitSurfaces=visible.map(face=>{
      const view=face.textureView||(['front','right','back','left'].includes(face.id)?face.id:null),item=images[view];
      const surface={surfaceId:face.id,type:face.type,role:face.role||null,view,screenPolygon:face.poly.map(project)};
      if(face.structureId){surface.structureId=face.structureId;surface.material=face.material;surface.sourceStatus=face.sourceStatus;}
      if(face.returnId){surface.returnId=face.returnId;surface.independentFinish=!!mesh.recess.returnFinishAssigned?.[face.returnId];}
      if(face.type==='wall'&&item){
        const {widthMeters:width,heightMeters:height}=textureScales[view],bottom=textureBottoms[view],A=project(local(face,0,bottom+height)),B=project(local(face,width,bottom+height)),C=project(local(face,0,bottom));
        surface.textureFrame={origin:A,horizontal:sub(B,A),vertical:sub(C,A),viewBox:item.viewBox};
      }
      return surface;
    });
    const textureWorldHeights = Object.fromEntries(Object.entries(textureScales).map(([key,info])=>[key,info.heightMeters]));
    const textureBounds = Object.fromEntries(Object.entries(textureWorldHeights).map(([key,height])=>[key,{bottom:textureBottoms[key],top:textureBottoms[key]+height}]));
    const coveringLayouts=type=>mesh.faces.filter(f=>f.type===type).map(face=>{
      const layout=type==='roof'?roofCourses(face.poly,options.roofExposureIn):soffitCourses(face.poly,options.soffitCoverageIn);
      return {surfaceId:face.id,spacingMeters:layout.spacingMeters,lineCount:layout.segments.length,reason:layout.reason};
    });
    const result = { rendered:true, renderId:token, angle,elevation:elevationDegrees,zoom,siteStyle:site?'commercial':'none',sitePlan:site?{parkingBayCount:site.parkingBayCount,sourceStatus:site.sourceStatus,noVehicles:true}:null,returnMasonry:options.returnMasonry||null,roofColor, ...geometrySummary(mesh), foundationDrop:mesh.foundationDrop, groundZ:mesh.ground, soffitVisualization:soffitType, missingViews:['front','right','back','left'].filter(key=>!images[key]), visibleFaces:visible.map(f=>f.id), hitSurfaces:state.hitSurfaces,textureWorldHeights, textureBounds, textureScales,textureScaleWarnings,coveringLayouts:{roof:coveringLayouts('roof'),soffit:coveringLayouts('soffit')},errors };
    state.lastResult=result;
    return result;
  }

  async function render(canvas, options = {}) {
    if(!canvas || typeof canvas.getContext!=='function')throw new TypeError('MIR3D.render attend un canvas.');
    const exportSize=exportSizeFrom(options.exportSize);
    let state=states.get(canvas);
    if(!state) {
      state={token:0,options:null,observer:null,frame:null,size:null};states.set(canvas,state);
    }
    if(!exportSize&&!state.observer&&typeof global.ResizeObserver==='function') {
      state.observer=new global.ResizeObserver(()=>{
        // An in-flight render reads the current canvas size after its images
        // load. Replacing it here would cancel the caller's initial render.
        if(!state.options||state.options.exportSize||state.pending)return;
        const box=canvas.getBoundingClientRect(),dpr=Math.max(1,Math.min(global.devicePixelRatio||1,2.5));
        if(state.size&&Math.abs(state.size[0]-box.width)<.5&&Math.abs(state.size[1]-box.height)<.5&&state.size[2]===dpr)return;
        if(state.frame)global.cancelAnimationFrame(state.frame);
        state.frame=global.requestAnimationFrame(()=>{state.frame=null;render(canvas,state.options).catch(()=>{});});
      });
      state.observer.observe(canvas);
    }
    if(state.frame){global.cancelAnimationFrame(state.frame);state.frame=null;}
    const token=++renderCounter;state.token=token;
    // Snapshot all caller data before awaiting images: slider changes cannot mutate this render.
    const snapshot={...options,exportSize,views:{...(options.views||{})},dimensions:{...(options.dimensions||{})},textureBottoms:{...(options.textureBottoms||{})},
      recess:options.recess&&typeof options.recess==='object'?{...options.recess,returnColors:{...(options.recess.returnColors||{})}}:options.recess,
      porch:options.porch&&typeof options.porch==='object'?{...options.porch,divider:options.porch.divider&&typeof options.porch.divider==='object'?{...options.porch.divider}:options.porch.divider}:options.porch,
      structures:Array.isArray(options.structures)?options.structures.map(s=>s&&({...s,origin:Array.isArray(s.origin)?s.origin.slice():s.origin,size:Array.isArray(s.size)?s.size.slice():s.size})):options.structures,
      footprint:options.footprint&&typeof options.footprint==='object'?{...options.footprint,recess:options.footprint.recess&&typeof options.footprint.recess==='object'?{...options.footprint.recess}:options.footprint.recess}:options.footprint};
    state.options=snapshot;
    const names=['front','right','back','left','return-left','return-right'];
    state.pending=true;
    try {
      const settled=await Promise.allSettled(names.map(key=>loadSVG(snapshot.views[key])));
      if(state.token!==token)return {rendered:false,cancelled:true,renderId:token};
      const images={},errors=[];
      settled.forEach((result,i)=>{if(result.status==='fulfilled')images[names[i]]=result.value;else{images[names[i]]=null;errors.push({view:names[i],message:String(result.reason.message||result.reason)});}});
      return draw(canvas,snapshot,images,state,token,errors);
    } finally {
      if(state.token===token)state.pending=false;
    }
  }

  function diagnostics(canvas) {
    return states.get(canvas)?.lastResult || null;
  }

  function dispose(canvas) {
    const state=states.get(canvas);if(!state)return;
    state.token=++renderCounter;if(state.observer)state.observer.disconnect();
    if(state.frame)global.cancelAnimationFrame(state.frame);states.delete(canvas);
  }

  global.MIR3D=Object.freeze({render,dispose,diagnostics,geometry,mesh:exportMesh,pick,projectPoint,roofCourses,soffitCourses,commercialSitePlan,studyDefaults,studyStructureDefaults,version:'1.8.0',defaults:DEFAULTS,recessDefaults:RECESS_DEFAULTS,porchDefaults:PORCH_DEFAULTS});
})(window);
