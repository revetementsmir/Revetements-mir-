/* MIR takeoff engine. Pure geometry and explicit shop rules; no DOM or network.
 * Coordinates are pixels unless a face deliberately uses feet with feetPerPixel=1.
 * Areas use analytic line-segment intersections (floating-point precision), not pixels.
 * Panel widthIn/heightIn are the TOTAL layout dimensions, not one panel's dimensions.
 * Unknown measurements remain null. No splice is created to make a long cut fit stock.
 */
(function (factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window === 'object') window.MIRTakeoff = api;
})(function () {
  'use strict';
  const VERSION = '5.0.0';
  const EPS = 1e-9;
  const PROFILES = Object.freeze({
    'drip-edge': "Goutte d’eau", 'window-l': 'L de fenêtre',
    'vented-sill': 'Bas de fenêtre ventilé', 'brick-l': 'L de maçonnerie',
    'brick-j': 'J de maçonnerie', starter: 'Moulure de départ',
    'top-vent': 'Ventilation de haut de mur', 'panel-l-7/8': 'L 7/8 de panneau',
    'panel-z': 'Z de panneau', 'roof-l-6': 'L 6 po au-dessus du toit',
    'soffit-j': 'J de soffite', fascia: 'Fascia',
    'rodent-guard': 'Moulure anti-rongeur', 'band': 'Bandeau', 'opening-contour': 'Contour de baie'
  });
  const STOCK_LIMITS = Object.freeze(Object.fromEntries(Object.keys(PROFILES).map(p => [p, p === 'soffit-j' ? 144 : 120])));
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const nonnegative = value => finite(value) && value >= 0;
  const positive = value => finite(value) && value > 0;
  const colorOf = value => typeof value === 'string' && value.trim() ? value.trim() : null;
  const colourlessProfile = profile => profile === 'starter' || profile === 'rodent-guard';
  function profileFinish(source, profile, color) {
    if (colourlessProfile(profile)) return {
      brand: source.accessoryBrand ?? (source.colorPolicy === 'uncoloured' ? source.brand : 'Profil atelier'),
      materialId: source.accessoryMaterialId ?? (source.colorPolicy === 'uncoloured' ? source.materialId : 'mir-' + profile),
      colorId: null, colorName: 'Sans couleur', color: null, colorPolicy: 'uncoloured'
    };
    const selected = profile === 'window-l' && source.lFinish ? source.lFinish : source;
    return {brand: selected.brand ?? null, materialId: selected.materialId ?? null,
      colorId: selected.colorId ?? null, colorName: selected.colorName ?? null,
      color: colorOf(selected === source ? color : selected.color), colorPolicy: 'selected'};
  }
  // A manufacturer's reference is the identity; a display RGB fallback is not a purchasable color.
  const finishKey = value => [value.brand??null,value.materialId??null,value.colorId??value.colorName??value.color??null];
  const samePoint = (a, b) => a[0] === b[0] && a[1] === b[1];
  const pointOK = p => Array.isArray(p) && p.length >= 2 && finite(p[0]) && finite(p[1]);
  const cross = (ax, ay, bx, by) => ax * by - ay * bx;
  const sum = values => values.reduce((a, b) => a + b, 0);
  const sumKnown = values => sum(values.filter(finite));
  const sumComplete = values => values.every(finite) ? sum(values) : null;
  const almostZero = value => Math.abs(value) < EPS ? 0 : value;
  function warning(code, message, source, details) {
    return {code, message, sourceId: source?.id ?? null,
      sourceType: source?.sourceType ?? null, face: source?.face ?? source?.key ?? null,
      ...(details ? {details} : {})};
  }
  function uniqueWarnings(warnings) {
    const seen = new Set();
    return warnings.filter(w => {
      const k = JSON.stringify([w.code, w.sourceId, w.face, w.message, w.details]);
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  }
  function cleanLine(points) {
    if (!Array.isArray(points) || points.length < 2 || !points.every(pointOK)) return null;
    const result = [];
    for (const p of points) if (!result.length || !samePoint(result[result.length - 1], p)) result.push([p[0], p[1]]);
    return result;
  }
  function areaOfRing(ring) {
    const [ox, oy] = ring[0];
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      area += (a[0] - ox) * (b[1] - oy) - (b[0] - ox) * (a[1] - oy);
    }
    return Math.abs(area) / 2;
  }
  function segmentIntersection(a, b, c, d) {
    const ux = b[0] - a[0], uy = b[1] - a[1], vx = d[0] - c[0], vy = d[1] - c[1];
    const den = cross(ux, uy, vx, vy), wx = c[0] - a[0], wy = c[1] - a[1];
    if (den === 0) {
      if (cross(wx, wy, ux, uy) !== 0) return null;
      const xOverlap = Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) >= Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0]));
      const yOverlap = Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1])) >= Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1]));
      return xOverlap && yOverlap ? {collinear: true} : null;
    }
    const t = cross(wx, wy, vx, vy) / den, u = cross(wx, wy, ux, uy) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? {x: a[0] + t * ux, y: a[1] + t * uy, t, u} : null;
  }
  function cleanRing(points) {
    if (!Array.isArray(points) || points.length < 3 || !points.every(pointOK)) return {error: 'invalid_coordinates'};
    const ring = [];
    for (const p of points) if (!ring.length || !samePoint(ring[ring.length - 1], p)) ring.push([p[0], p[1]]);
    if (ring.length > 1 && samePoint(ring[0], ring[ring.length - 1])) ring.pop();
    if (ring.length < 3 || areaOfRing(ring) === 0) return {error: 'zero_area'};
    for (let i = 0; i < ring.length; i++) {
      for (let j = i + 1; j < ring.length; j++) {
        if (j === i + 1 || (i === 0 && j === ring.length - 1)) continue;
        if (segmentIntersection(ring[i], ring[(i + 1) % ring.length], ring[j], ring[(j + 1) % ring.length])) return {error: 'self_intersection'};
      }
    }
    return {ring};
  }
  function polygonArea(points, feetPerPixel) {
    const parsed = cleanRing(points);
    if (!parsed.ring) return null;
    if (arguments.length < 2) return areaOfRing(parsed.ring);
    return positive(feetPerPixel) ? areaOfRing(parsed.ring) * feetPerPixel * feetPerPixel : null;
  }
  function polylineLength(points, feetPerPixel) {
    const line = cleanLine(points);
    if (!line) return null;
    const scale = arguments.length < 2 ? 1 : feetPerPixel;
    if (!positive(scale)) return null;
    let length = 0;
    for (let i = 1; i < line.length; i++) length += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
    return length * scale;
  }
  function calibrate(points, referenceFt) {
    if (!Array.isArray(points) || points.length !== 2 || !positive(referenceFt)) return null;
    const distance = polylineLength(points);
    return positive(distance) ? referenceFt / distance : null;
  }
  function intervalUnion(lists) {
    const entries = lists.flat().filter(p => p[1] > p[0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged = [];
    for (const p of entries) {
      const last = merged[merged.length - 1];
      if (last && p[0] <= last[1]) last[1] = Math.max(last[1], p[1]);
      else merged.push(p.slice());
    }
    return merged;
  }
  function intervalIntersection(a, b) {
    const out = []; let i = 0, j = 0;
    while (i < a.length && j < b.length) {
      const lo = Math.max(a[i][0], b[j][0]), hi = Math.min(a[i][1], b[j][1]);
      if (hi > lo) out.push([lo, hi]);
      if (a[i][1] < b[j][1]) i++; else j++;
    }
    return out;
  }
  function intervalDifference(a, b) {
    const out = [];
    for (const p of a) {
      let cursor = p[0];
      for (const q of b) {
        if (q[1] <= cursor) continue;
        if (q[0] >= p[1]) break;
        if (q[0] > cursor) out.push([cursor, Math.min(q[0], p[1])]);
        cursor = Math.max(cursor, q[1]);
        if (cursor >= p[1]) break;
      }
      if (cursor < p[1]) out.push([cursor, p[1]]);
    }
    return out;
  }
  const intervalLength = a => sum(a.map(p => p[1] - p[0]));
  function ringIntervals(ring, x) {
    const ys = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      if ((a[0] < x && x < b[0]) || (b[0] < x && x < a[0])) ys.push(a[1] + (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0]));
    }
    ys.sort((a, b) => a - b);
    const intervals = [];
    for (let i = 0; i + 1 < ys.length; i += 2) if (ys[i + 1] > ys[i]) intervals.push([ys[i], ys[i + 1]]);
    return intervals;
  }
  /* Every polygon edge is linear. Between successive vertex/intersection x values,
   * interval endpoint order is fixed, so a Boolean cross-section length is linear.
   * Its midpoint integral is analytic, including concave outlines and overlaps. */
  function sweepAreas(rings, evaluate, count) {
    const totals = new Array(count).fill(0);
    if (!rings.length) return totals;
    const events = [], edges = [];
    rings.forEach(ring => ring.forEach((a, i) => {
      events.push(a[0]); edges.push([a, ring[(i + 1) % ring.length]]);
    }));
    for (let i = 0; i < edges.length; i++) {
      const [a, b] = edges[i];
      for (let j = i + 1; j < edges.length; j++) {
        const [c, d] = edges[j];
        if (Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) < Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0]))) continue;
        if (Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1])) < Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1]))) continue;
        const hit = segmentIntersection(a, b, c, d);
        if (hit && finite(hit.x)) events.push(hit.x);
      }
    }
    const xs = [...new Set(events)].sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      const width = xs[i] - xs[i - 1], x = xs[i - 1] + width / 2;
      if (!(width > 0 && x > xs[i - 1] && x < xs[i])) continue;
      const values = evaluate(rings.map(ring => ringIntervals(ring, x)), {x, width, left: xs[i - 1], right: xs[i]});
      for (let k = 0; k < count; k++) totals[k] += values[k] * width;
    }
    return totals.map(almostZero);
  }
  function booleanArea({include = [], exclude = [], clip = []} = {}) {
    if (![include, exclude, clip].every(Array.isArray)) return null;
    const all = [...include, ...exclude, ...clip].map(cleanRing);
    if (all.some(p => !p.ring)) return null;
    return sweepAreas(all.map(p => p.ring), sections => {
      let result = intervalUnion(sections.slice(0, include.length));
      for (let i = include.length + exclude.length; i < sections.length; i++) result = intervalIntersection(result, sections[i]);
      result = intervalDifference(result, intervalUnion(sections.slice(include.length, include.length + exclude.length)));
      return [intervalLength(result)];
    }, 1)[0];
  }
  const ringBounds = p => [Math.min(...p.map(v => v[0])), Math.min(...p.map(v => v[1])), Math.max(...p.map(v => v[0])), Math.max(...p.map(v => v[1]))];
  const rectangle = (x0, y0, x1, y1) => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  function compareRows(a, b) {
    return (a.source.decorationLayer || 0) - (b.source.decorationLayer || 0) || a.depth - b.depth ||
      ((finite(a.source.priority) ? a.source.priority : a.source.kind === 'masonry' ? -2 : 0) -
       (finite(b.source.priority) ? b.source.priority : b.source.kind === 'masonry' ? -2 : 0)) || a.index - b.index;
  }
  function paintOrder(face = {}) {
    const zones = Array.isArray(face) ? face : face.zones || [], map = new Map(zones.map(z => [z.id,z]));
    function depth(z, seen = new Set()) {
      if (!z?.parent || !map.has(z.parent) || seen.has(z.id)) return 0;
      return 1 + depth(map.get(z.parent), new Set([...seen,z.id]));
    }
    return zones.map((source,index) => ({source,index,depth:depth(source)})).sort(compareRows).map(r => r.source);
  }
  function regionContext(face, zoneId) {
    const measured = measureFace(face), zones = face.zones || [], map = new Map(), rings = [];
    for (const [index, source] of zones.entries()) {
      const parsed = cleanRing(source.polygon);
      if (!parsed.ring) continue;
      const row = {source,index,ringIndex:rings.length}; rings.push(parsed.ring); map.set(source.id,row);
    }
    const openingIndices = [];
    for (const o of face.openings || []) {const p=cleanRing(o.polygon);if(p.ring){openingIndices.push(rings.length);rings.push(p.ring);}}
    const order = paintOrder(face).map(z => map.get(z.id)).filter(Boolean), target = map.get(zoneId);
    return {face, rings, map, order, target, openingIndices, valid:measured.geometryValid && !!target,
      warnings:measured.warnings.filter(w => w.code !== 'MISSING_SCALE')};
  }
  function effectiveSections(context, sections, row, cache = new Map()) {
    if (cache.has(row.index)) return cache.get(row.index);
    let value = sections[row.ringIndex] || [];
    if (row.source.parent && context.map.has(row.source.parent)) value = intervalIntersection(value,effectiveSections(context,sections,context.map.get(row.source.parent),cache));
    cache.set(row.index,value); return value;
  }
  function assignedSection(context, sections) {
    if (!context.valid) return [];
    const cache=new Map(), position=context.order.indexOf(context.target);
    const target=effectiveSections(context,sections,context.target,cache);
    const above=intervalUnion(context.order.slice(position+1).map(r=>effectiveSections(context,sections,r,cache)));
    const openings=intervalUnion(context.openingIndices.map(i=>sections[i]));
    return intervalDifference(target,intervalUnion([above,openings]));
  }
  function containsPoint(ring, point) {
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
      const a=ring[j],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],px=point[0]-a[0],py=point[1]-a[1];
      if(Math.abs(cross(dx,dy,px,py)) <= EPS*Math.max(1,Math.hypot(dx,dy)) && px*dx+py*dy>=-EPS && px*dx+py*dy<=dx*dx+dy*dy+EPS)return true;
      if((a[1]>point[1])!==(b[1]>point[1]) && point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function containsRegion(context, row, point) {
    if(!containsPoint(context.rings[row.ringIndex],point))return false;
    return !row.source.parent || !context.map.has(row.source.parent) || containsRegion(context,context.map.get(row.source.parent),point);
  }
  function clippedSegment(context, a, b) {
    if(!context.valid || samePoint(a,b))return [];
    const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,events=[0,1];
    for(const ring of context.rings)for(let i=0;i<ring.length;i++){
      const c=ring[i],d=ring[(i+1)%ring.length],hit=segmentIntersection(a,b,c,d);
      if(hit?.collinear){for(const p of [c,d]){const t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den;if(t>0&&t<1)events.push(t);}}
      else if(hit&&finite(hit.t))events.push(Math.max(0,Math.min(1,hit.t)));
    }
    const sorted=[...new Set(events)].sort((x,y)=>x-y),out=[],position=context.order.indexOf(context.target),above=context.order.slice(position+1);
    for(let i=1;i<sorted.length;i++){
      const t0=sorted[i-1],t1=sorted[i];if(t1-t0<EPS)continue;const t=(t0+t1)/2,p=[a[0]+dx*t,a[1]+dy*t];
      if(!containsRegion(context,context.target,p)||context.openingIndices.some(j=>containsPoint(context.rings[j],p))||above.some(r=>containsRegion(context,r,p)))continue;
      const start=[a[0]+dx*t0,a[1]+dy*t0],end=[a[0]+dx*t1,a[1]+dy*t1],last=out[out.length-1];
      if(last&&Math.hypot(last[1][0]-start[0],last[1][1]-start[1])<EPS)last[1]=end;else out.push([start,end]);
    }
    return out;
  }
  /** A visible line uses the same ancestor clips, holes and paint attribution as area measurement. */
  function clipLineToZone(face, zoneId, orientation, position) {
    const context=regionContext(face,zoneId), valid=context.valid&&['vertical','horizontal'].includes(orientation)&&finite(position)&&position>=0&&position<=1;
    if(!valid)return {segments:[],lengthFt:null,complete:false,warnings:[warning('JOINT_GEOMETRY_UNKNOWN','Zone, orientation ou position de joint invalide.',{id:zoneId,face:face.key})]};
    const b=ringBounds(context.target.source.polygon),coordinate=orientation==='vertical'?b[0]+position*(b[2]-b[0]):b[1]+position*(b[3]-b[1]);
    const segments=orientation==='vertical'?clippedSegment(context,[coordinate,b[1]],[coordinate,b[3]]):clippedSegment(context,[b[0],coordinate],[b[2],coordinate]);
    return {segments,lengthFt:positive(face.feetPerPixel)?sum(segments.map(p=>polylineLength(p,face.feetPerPixel))):null,
      complete:positive(face.feetPerPixel),warnings:context.warnings,coordinate};
  }
  function regionInRectangle(context, box) {
    const cell=rectangle(...box),rings=[...context.rings,cell];let bounds=[Infinity,Infinity,-Infinity,-Infinity],labelPoint=null,best=0;
    const sectionAt=x=>{const sections=rings.map(r=>ringIntervals(r,x));return intervalIntersection(assignedSection(context,sections),sections[sections.length-1]);};
    const area=sweepAreas(rings,(sections,strip)=>{
      const region=intervalIntersection(assignedSection(context,sections),sections[sections.length-1]),length=intervalLength(region);
      if(length>EPS){bounds[0]=Math.min(bounds[0],strip.left);bounds[2]=Math.max(bounds[2],strip.right);
        const q1=sectionAt(strip.left+strip.width/4),q3=sectionAt(strip.left+strip.width*3/4);
        for(let j=0;j<Math.min(q1.length,q3.length);j++)for(let k=0;k<2;k++){
          const y1=1.5*q1[j][k]-.5*q3[j][k],y3=1.5*q3[j][k]-.5*q1[j][k];bounds[1]=Math.min(bounds[1],y1,y3);bounds[3]=Math.max(bounds[3],y1,y3);
        }
        for(const r of region){const score=(r[1]-r[0])*strip.width;if(score>best){best=score;labelPoint=[strip.x,(r[0]+r[1])/2];}}
      }
      return [length];
    },1)[0];
    return {areaPx2:area,boundsPx:area>EPS?bounds:null,labelPoint};
  }
  function normalLines(lines) {
    const seen=new Set();return (Array.isArray(lines)?lines:[]).filter(l=>l&&finite(l.position)&&l.position>0&&l.position<1)
      .map((l,i)=>({id:String(l.id??`line-${i+1}`),position:l.position})).sort((a,b)=>a.position-b.position).filter(l=>{const k=Math.round(l.position*1e9);if(seen.has(k))return false;seen.add(k);return true;});
  }
  function fitsStock(widthIn,heightIn,maxWidthIn=48,maxLengthIn=120,rotationAllowed=true) {
    if(![widthIn,heightIn,maxWidthIn,maxLengthIn].every(positive))return {fits:null,rotationRequired:null};
    const direct=widthIn<=maxWidthIn+EPS&&heightIn<=maxLengthIn+EPS,rotated=rotationAllowed&&heightIn<=maxWidthIn+EPS&&widthIn<=maxLengthIn+EPS;
    return {fits:!!(direct||rotated),rotationRequired:!direct&&!!rotated};
  }
  /** Stock rotation is a CUTTING operation only, never permission to change installation orientation. */
  function panelLayout(face,zoneId,layout={},options={}) {
    const context=regionContext(face,zoneId),warnings=[];
    if(!context.valid)return {vertical:[],horizontal:[],cells:[],complete:false,warnings:[warning('PANEL_ZONE_UNKNOWN','Zone de calepinage absente ou invalide.',{id:zoneId,face:face.key})]};
    const b=ringBounds(context.target.source.polygon),scale=positive(face.feetPerPixel)?face.feetPerPixel:null;
    const vertical=normalLines(layout.vertical).map(l=>({...l,...clipLineToZone(face,zoneId,'vertical',l.position)}));
    const horizontal=normalLines(layout.horizontal).map(l=>{
      const clipped=clipLineToZone(face,zoneId,'horizontal',l.position),segments=[];
      for(const line of clipped.segments){const y=line[0][1],cuts=[line[0][0],line[1][0]];
        for(const v of vertical)if(v.coordinate>line[0][0]+EPS&&v.coordinate<line[1][0]-EPS&&v.segments.some(s=>y>=s[0][1]-EPS&&y<=s[1][1]+EPS))cuts.push(v.coordinate);
        cuts.sort((a,b)=>a-b);for(let i=1;i<cuts.length;i++)if(cuts[i]-cuts[i-1]>EPS)segments.push([[cuts[i-1],y],[cuts[i],y]]);
      }
      return {...l,...clipped,segments};
    });
    const xs=[b[0],...vertical.map(l=>l.coordinate),b[2]],ys=[b[1],...horizontal.map(l=>l.coordinate),b[3]],cells=[];
    // An explicit unknown supplier format must never inherit the historical
    // atelier stock default. Callers without stockKnown keep the legacy API.
    const stockKnown=options.stockKnown!==false;
    const maxWidthIn=stockKnown?(positive(options.maxWidthIn)?options.maxWidthIn:48):null,maxLengthIn=stockKnown?(positive(options.maxLengthIn)?options.maxLengthIn:120):null;
    for(let row=1;row<ys.length;row++)for(let column=1;column<xs.length;column++){
      const box=[xs[column-1],ys[row-1],xs[column],ys[row]],m=regionInRectangle(context,box);if(!(m.areaPx2>EPS))continue;
      const widthIn=scale?(m.boundsPx[2]-m.boundsPx[0])*scale*12:null,heightIn=scale?(m.boundsPx[3]-m.boundsPx[1])*scale*12:null;
      const fit=fitsStock(widthIn,heightIn,maxWidthIn,maxLengthIn,options.rotationAllowed!==false),id=`${zoneId}:cell-${row}-${column}`;
      const special=Math.abs(m.areaPx2-(m.boundsPx[2]-m.boundsPx[0])*(m.boundsPx[3]-m.boundsPx[1]))>1e-6;
      cells.push({id,row,column,boundsPx:m.boundsPx,layoutBoundsPx:box,labelPoint:m.labelPoint,widthIn,heightIn,areaFt2:scale?m.areaPx2*scale*scale:null,areaPx2:m.areaPx2,...fit,special});
      if(fit.fits===false)warnings.push(warning('PANEL_TOO_LARGE','Morceau hors format de stock, même après rotation de débit : ajouter un joint ou revoir le découpage.',{id,face:face.key},{widthIn,heightIn,maxWidthIn,maxLengthIn}));
    }
    if(!scale)warnings.push(warning('MISSING_SCALE','Échelle requise pour les dimensions des panneaux.',{id:zoneId,face:face.key}));
    if(!stockKnown)warnings.push(warning('PANEL_FORMAT_UNKNOWN','Format physique du produit à confirmer; les dimensions des coupes ne sont pas validées contre un stock supposé.',{id:zoneId,face:face.key}));
    return {zoneId,vertical,horizontal,cells,maxWidthIn,maxLengthIn,stockKnown,stockRotationAllowed:options.rotationAllowed!==false,
      areaFt2:sumComplete(cells.map(c=>c.areaFt2)),complete:!!scale&&stockKnown&&cells.every(c=>c.fits===true),warnings,
      rotationNote:'Rotation pour le débit du stock seulement; respecter le sens du fini et la pose autorisée du fabricant.'};
  }
  function boardLayout(face,zoneId,vertical=[],maximumIn=144) {
    const result=panelLayout(face,zoneId,{vertical,horizontal:[]},{maxWidthIn:maximumIn,maxLengthIn:Number.MAX_SAFE_INTEGER,rotationAllowed:false});
    return {...result,maximumIn,cells:result.cells.map(c=>({...c,lengthIn:c.widthIn})),
      warnings:result.warnings.map(w=>w.code==='PANEL_TOO_LARGE'?{...w,code:'BOARD_TOO_LONG',message:'Segment de clin plus long que le stock disponible : définir un joint vertical de débit.'}:w),
      note:'Contrôle de longueur des segments horizontaux; ne constitue pas un plan de coupe rang par rang.'};
  }
  function wallAccessories(face) {
    const rows=[],originals=(face.zones||[]).filter(z=>!z.decorationType&&!String(z.id).startsWith('retour_'));
    const body={...face,zones:originals},roots=originals.filter(z=>!z.parent&&z.kind!=='masonry'),order=paintOrder(body),map=new Map(originals.map(z=>[z.id,z])),seen=new Set();
    function inZone(z,p,visited=new Set()){if(!z||visited.has(z.id)||!cleanRing(z.polygon).ring||!containsPoint(z.polygon,p))return false;visited.add(z.id);return !z.parent||inZone(map.get(z.parent),p,visited);}
    function visible(p){return order.slice().reverse().find(z=>inZone(z,p));}
    for(const root of roots){const parsed=cleanRing(root.polygon);if(!parsed.ring)continue;const p=root.polygon,b=ringBounds(p),delta=Math.max(1,b[2]-b[0],b[3]-b[1])*1e-7;
      const gable=p.length===5&&p[1][1]<p[0][1]&&p[1][1]<p[2][1];
      for(const where of ['base','top']){if(where==='top'&&gable)continue;
        const direction=where==='top'?1:-1,kind=where==='top'?'top-vent':'rodent-guard';
        const candidates=clipLineToZone({...face,zones:[{...root,parent:undefined}]},root.id,'horizontal',where==='top'?0:1).segments;
        for(const [a,bp] of candidates){const y=a[1],events=[a[0],bp[0]];
          for(const z of originals)for(let i=0;i<z.polygon.length;i++){const c=z.polygon[i],d=z.polygon[(i+1)%z.polygon.length],hit=segmentIntersection(a,bp,c,d);if(hit?.collinear)for(const q of [c,d]){if(q[0]>a[0]&&q[0]<bp[0])events.push(q[0]);}else if(hit&&finite(hit.t))events.push(a[0]+(bp[0]-a[0])*hit.t);}
          events.sort((x,y)=>x-y);
          for(let i=1;i<events.length;i++){const x0=events[i-1],x1=events[i];if(x1-x0<EPS)continue;const x=(x0+x1)/2,inside=visible([x,y+direction*delta]),outside=visible([x,y-direction*delta]);
            // A boundary between two wall zones is internal, even when those zones have no parent link.
            if(!inside||inside.kind==='masonry'||outside&&(where==='top'||outside.kind!=='masonry'))continue;
            const points=[[x0,y],[x1,y]],key=JSON.stringify([kind,points]);if(seen.has(key))continue;seen.add(key);
            const band=where==='top'?(face.zones||[]).find(z=>z.decorationType==='band'&&z.parent===root.id):null,selection=band?.selection||inside.selection||{};
            rows.push({id:`${face.key}-${where}-${root.id}-${rows.length+1}`,face:face.key,zoneId:inside.id,rootZoneId:root.id,kind,points,...selection,location:where==='top'?'wall-top':'wall-base',
              provenance:where==='top'?'Bord supérieur réellement exposé du mur; pignons, brique et limites internes exclus.':'Anti-rongeur au bord inférieur exposé du parement, interrompu aux ouvertures.'});
          }
        }
      }
    }
    // Intersections with unrelated accent vertices may subdivide a boundary for
    // classification. They must not create convenient, fictitious stock joints.
    const merged=[];
    for(const row of rows.sort((a,b)=>a.kind.localeCompare(b.kind)||JSON.stringify(finishKey(a)).localeCompare(JSON.stringify(finishKey(b)))||a.points[0][1]-b.points[0][1]||a.points[0][0]-b.points[0][0])){
      const last=merged[merged.length-1];
      if(last&&last.kind===row.kind&&JSON.stringify(finishKey(last))===JSON.stringify(finishKey(row))&&samePoint(last.points[1],row.points[0]))last.points[1]=row.points[1];else merged.push({...row,points:row.points.map(p=>p.slice())});
    }return merged;
  }
  function measureFace(face = {}) {
    const key = face.key ?? face.face ?? face.id ?? null, warnings = [];
    const scale = positive(face.feetPerPixel) ? face.feetPerPixel : null;
    const zonesInput = Array.isArray(face.zones) ? face.zones : [];
    const openingsInput = Array.isArray(face.openings) ? face.openings : [];
    let valid = (face.zones === undefined || Array.isArray(face.zones)) && (face.openings === undefined || Array.isArray(face.openings));
    if (!valid) warnings.push(warning('UNKNOWN_GEOMETRY_COLLECTION', 'Zones ou ouvertures inconnues : une liste vide explicite est différente de null.', {face: key}));
    if (!scale) warnings.push(warning('MISSING_SCALE', 'Échelle uniforme en pieds par pixel à renseigner pour cette façade.', {face: key}));
    const rings = [], map = new Map();
    const zones = zonesInput.map((z, index) => {
      const id = z.id ?? `zone-${index + 1}`, parsed = cleanRing(z.polygon);
      const row = {source: z, id, index, ringIndex: -1, parentIndex: null, depth: 0, valid: true};
      if (!parsed.ring || map.has(id)) {
        row.valid = false; valid = false;
        warnings.push(warning(map.has(id) ? 'DUPLICATE_ZONE_ID' : 'INVALID_POLYGON', 'Zone non mesurable : identifiant dupliqué ou polygone invalide.', {id, face: key}, {reason: parsed.error ?? 'duplicate_id'}));
      } else {row.ringIndex = rings.length; rings.push(parsed.ring); map.set(id, row);}
      return row;
    });
    const visiting = new Set(), finished = new Set();
    function resolve(row) {
      if (finished.has(row.index)) return row.valid;
      if (visiting.has(row.index)) {row.valid = false; valid = false; return false;}
      visiting.add(row.index);
      if (row.source.parent != null) {
        const parent = map.get(row.source.parent);
        if (!parent || !resolve(parent)) row.valid = false;
        else {row.parentIndex = parent.index; row.depth = parent.depth + 1;}
        if (!row.valid) {
          valid = false;
          warnings.push(warning('INVALID_ZONE_PARENT', 'Parent absent, invalide ou cyclique : le découpage de cet accent reste indéterminé.', {id: row.id, face: key}));
        }
      }
      visiting.delete(row.index); finished.add(row.index); return row.valid;
    }
    zones.forEach(resolve);
    const openingIndices = [];
    for (const o of openingsInput) {
      const parsed = cleanRing(o.polygon);
      if (!parsed.ring) {
        valid = false;
        warnings.push(warning('INVALID_OPENING_POLYGON', 'Contour d’ouverture invalide : surface nette indéterminée.', {id: o.id, face: key}, {reason: parsed.error}));
      } else {openingIndices.push(rings.length); rings.push(parsed.ring);}
    }
    // Children paint above ancestors; equal-depth siblings follow input order.
    // Masonry roots paint first, matching the elevation editor's visible layering.
    const order = zones.filter(z => z.valid).sort(compareRows);
    const stride = 5, end = zones.length * stride;
    const areas = sweepAreas(rings, sections => {
      const effective = new Map();
      function clipped(row) {
        if (effective.has(row.index)) return effective.get(row.index);
        let value = sections[row.ringIndex] || [];
        if (row.parentIndex != null) value = intervalIntersection(value, clipped(zones[row.parentIndex]));
        effective.set(row.index, value); return value;
      }
      const openings = intervalUnion(openingIndices.map(i => sections[i]));
      let covered = []; const values = new Array(end + 3).fill(0);
      for (let i = order.length - 1; i >= 0; i--) {
        const row = order[i], region = clipped(row), assigned = intervalDifference(region, covered);
        const hole = intervalIntersection(assigned, openings), net = intervalDifference(assigned, openings);
        const offset = row.index * stride;
        values[offset] = intervalLength(region);
        values[offset + 1] = intervalLength(assigned);
        values[offset + 2] = intervalLength(hole);
        values[offset + 3] = intervalLength(region) - intervalLength(assigned);
        values[offset + 4] = intervalLength(net);
        covered = intervalUnion([covered, region]);
      }
      values[end] = intervalLength(covered);
      values[end + 1] = intervalLength(intervalIntersection(covered, openings));
      values[end + 2] = intervalLength(intervalDifference(covered, openings));
      return values;
    }, end + 3);
    const complete = valid && scale !== null, ft2 = px2 => complete ? px2 * scale * scale : null;
    const zoneResults = zones.map((z, i) => {
      const a = areas.slice(i * stride, i * stride + stride), selection = z.source.selection || {};
      return {id: z.id, face: key, parent: z.source.parent ?? null, kind: z.source.kind ?? 'siding',
        materialId: selection.materialId ?? z.source.materialId ?? null,
        color: colorOf(selection.color ?? z.source.color), colorId: selection.colorId ?? z.source.colorId ?? null,
        colorName:selection.colorName??z.source.colorName??null,brand:selection.brand??z.source.brand??null,
        decorationType:z.source.decorationType??null, decorationKey:z.source.decorationKey??null,
        provenance: z.source.provenance ?? null,
        polygonPx2: z.ringIndex >= 0 ? areaOfRing(rings[z.ringIndex]) : null,
        grossPx2: z.valid ? a[0] : null, assignedGrossPx2: z.valid ? a[1] : null,
        openingPx2: z.valid ? a[2] : null, overlapPx2: z.valid ? a[3] : null, netPx2: z.valid ? a[4] : null,
        grossFt2: ft2(a[0]), assignedGrossFt2: ft2(a[1]), openingFt2: ft2(a[2]), overlapFt2: ft2(a[3]), netFt2: ft2(a[4]), complete};
    });
    for (const check of Array.isArray(face.calibrationChecks) ? face.calibrationChecks : []) {
      const actual = polylineLength(check.points, scale), expected = check.referenceFt;
      if (positive(actual) && positive(expected)) {
        const relativeError = Math.abs(actual - expected) / expected;
        if (relativeError > (nonnegative(check.toleranceFraction) ? check.toleranceFraction : 0.02)) warnings.push(warning('CALIBRATION_MISMATCH', 'Une autre cote contredit l’échelle uniforme : vérifier le scan et les points de référence.', {face: key, id: check.id ?? null}, {measuredFt: actual, referenceFt: expected, relativeError}));
      }
    }
    return {face: key, feetPerPixel: scale, scaleModel: 'uniform_xy',
      method: 'analytic_vertical_arrangement', geometryValid: valid, zones: zoneResults,
      grossPx2: valid ? areas[end] : null, openingPx2: valid ? areas[end + 1] : null, netPx2: valid ? areas[end + 2] : null,
      grossFt2: ft2(areas[end]), openingFt2: ft2(areas[end + 1]), netFt2: ft2(areas[end + 2]),
      knownNetFt2: complete ? ft2(areas[end + 2]) : 0, complete, warnings};
  }
  function aggregateAreas(faces) {
    const groups = new Map();
    for (const face of faces) for (const z of face.zones) {
      const key = JSON.stringify(finishKey(z));
      if (!groups.has(key)) groups.set(key, {brand:z.brand,materialId:z.materialId,colorId:z.colorId,colorName:z.colorName,color:z.color,zones:[],gross:[],net:[],decor:[],siding:[]});
      const g = groups.get(key); g.zones.push({face: face.face, id: z.id}); g.gross.push(z.assignedGrossFt2); g.net.push(z.netFt2);(z.decorationType?g.decor:g.siding).push(z.netFt2);
    }
    const materialTotals = [...groups.values()].map(g => ({brand:g.brand,materialId:g.materialId,colorId:g.colorId,colorName:g.colorName,color:g.color,
      zones: g.zones, grossFt2: sumComplete(g.gross), netFt2: sumComplete(g.net),
      knownGrossFt2: sumKnown(g.gross), knownNetFt2: sumKnown(g.net),
      decorationFt2:sumComplete(g.decor),nonDecorationFt2:sumComplete(g.siding),knownDecorationFt2:sumKnown(g.decor),knownNonDecorationFt2:sumKnown(g.siding),
      hasDecoration:g.decor.length>0,hasSiding:g.siding.length>0,complete: g.net.every(finite)}));
    return {faces, materialTotals, grossFt2: sumComplete(faces.map(f => f.grossFt2)),
      openingFt2: sumComplete(faces.map(f => f.openingFt2)), netFt2: sumComplete(faces.map(f => f.netFt2)),
      knownNetFt2: sumKnown(faces.map(f => f.netFt2)), complete: faces.every(f => f.complete)};
  }
  function bestFit(items, capacity) {
    const bins = [];
    for (const item of items) {
      let selected = -1, least = Infinity;
      for (let i = 0; i < bins.length; i++) {
        const rest = capacity - bins[i].used - item.size;
        if (rest >= -EPS && rest < least) {least = rest; selected = i;}
      }
      if (selected < 0) {bins.push({used: item.size, items: [item]});}
      else {bins[selected].used += item.size; bins[selected].items.push(item);}
    }
    return bins.map(b => b.items);
  }
  function searchPacking(items, capacity, target, budget) {
    const bins = Array.from({length: target}, () => []), remaining = new Array(target).fill(capacity), memo = new Set();
    let result = null, exhausted = false;
    function visit(index) {
      if (++budget.nodes > budget.maximum) {exhausted = true; return false;}
      if (index === items.length) {result = bins.map(b => b.slice()); return true;}
      const key = `${index}:${remaining.slice().sort((a, b) => a - b).join(',')}`;
      if (memo.has(key)) return false;
      const seen = new Set();
      const indices = remaining.map((r, i) => i).sort((a, b) => remaining[a] - remaining[b]);
      for (const i of indices) {
        if (remaining[i] + EPS < items[index].size || seen.has(remaining[i])) continue;
        seen.add(remaining[i]);
        const old = remaining[i]; remaining[i] -= items[index].size; bins[i].push(items[index]);
        if (visit(index + 1)) return true;
        bins[i].pop(); remaining[i] = old;
        if (exhausted) return false;
        if (old === capacity) break;
      }
      memo.add(key); return false;
    }
    visit(0); return {bins: result, exhausted};
  }
  function packCuts(pieces = [], options = {}) {
    const warnings = [], map = new Map();
    const kerfIn = own(options, 'kerfIn') ? options.kerfIn : 0;
    const kerfValid = nonnegative(kerfIn);
    const exactLimit = Number.isInteger(options.exactPackingLimit) && options.exactPackingLimit >= 0 ? options.exactPackingLimit : 20;
    const searchLimit = Number.isInteger(options.maxSearchNodes) && options.maxSearchNodes >= 0 ? options.maxSearchNodes : 50000;
    if (!Array.isArray(pieces)) return {groups: [], barCount: null, knownBarCount: 0, complete: false, warnings: [warning('INVALID_CUTS', 'La liste de pièces doit être un tableau.')]};
    if (!kerfValid) warnings.push(warning('UNKNOWN_KERF', 'Trait de coupe inconnu ou invalide; aucune répartition de barres n’est validée.'));
    for (let index = 0; index < pieces.length; index++) {
      const original = pieces[index], profile = typeof original.profile === 'string' && original.profile ? original.profile : null;
      const source = colourlessProfile(profile) ? {...original, ...profileFinish(original, profile, original.color)} : original;
      const color = colorOf(source.color), stockIn = positive(source.stockIn) ? source.stockIn : null;
      const materialId=source.materialId??null,colorId=source.colorId??null,brand=source.brand??null,colorName=source.colorName??null;
      const key = JSON.stringify([profile,...finishKey({brand,materialId,colorId,colorName,color}),stockIn]);
      if (!map.has(key)) map.set(key, {key,profile,brand,materialId,colorId,colorName,color,stockIn,cuts:[]});
      map.get(key).cuts.push({...source, id: source.id ?? `cut-${index + 1}`});
    }
    const groups = [...map.values()].map((group, gi) => {
      const {profile, color, stockIn} = group;
      const pending = [], fit = [], zero = [];
      const allowedStock = stockIn !== null && (!STOCK_LIMITS[profile] || stockIn <= STOCK_LIMITS[profile]);
      const context = {id: group.key, sourceType: 'cut-group'};
      const usable = kerfValid && profile !== null && (colourlessProfile(profile) || color !== null) && allowedStock;
      for (const cut of group.cuts) {
        if (cut.lengthIn === 0) {zero.push(cut.id); continue;}
        let reason = null;
        if (!nonnegative(cut.lengthIn)) reason = 'unknown_length';
        else if (!profile) reason = 'unknown_profile';
        else if (color === null && !colourlessProfile(profile)) reason = 'unknown_color';
        else if (!stockIn) reason = 'unknown_stock';
        else if (!allowedStock) reason = 'stock_exceeds_rule_maximum';
        else if (!kerfValid) reason = 'unknown_kerf';
        else if (cut.lengthIn > stockIn + EPS) reason = 'over_stock';
        if (reason) {
          pending.push({pieceId: cut.id, lengthIn: nonnegative(cut.lengthIn) ? cut.lengthIn : null, reason});
          warnings.push(warning(reason === 'over_stock' ? 'CUT_TOO_LONG' : 'CUT_UNRESOLVED', reason === 'over_stock'
            ? 'Pièce continue plus longue que la barre disponible; aucun joint n’a été inventé.'
            : 'La coupe attend une longueur, un profil, une couleur ou un stock valide.', cut,
          {pieceId: cut.id, reason, lengthIn: nonnegative(cut.lengthIn) ? cut.lengthIn : null, stockIn}));
        } else fit.push({cut, size: cut.lengthIn + kerfIn});
      }
      fit.sort((a, b) => b.size - a.size || String(a.cut.id).localeCompare(String(b.cut.id)));
      const capacity = usable ? stockIn + kerfIn : 0;
      let bins = fit.length ? bestFit(fit, capacity) : [], optimality = 'proven', method = 'empty', lowerBound = 0, visitedNodes = 0;
      if (fit.length) {
        const volumeBound = Math.ceil((sum(fit.map(i => i.size)) - EPS) / capacity);
        lowerBound = Math.max(volumeBound, fit.filter(i => i.size > capacity / 2 + EPS).length, 1);
        method = 'best-fit-decreasing';
        if (bins.length > lowerBound) {
          optimality = 'heuristic';
          if (fit.length <= exactLimit && searchLimit > 0) {
            const budget = {nodes: 0, maximum: searchLimit};
            let allSmallerRejected = true;
            for (let target = lowerBound; target < bins.length; target++) {
              const trial = searchPacking(fit, capacity, target, budget);
              if (trial.bins) {bins = trial.bins; optimality = 'proven'; method = 'bounded-exact-search'; break;}
              if (trial.exhausted) {allSmallerRejected = false; break;}
            }
            visitedNodes = budget.nodes;
            if (allSmallerRejected && optimality !== 'proven') {optimality = 'proven'; method = 'exact-search-no-smaller-packing';}
          }
        } else method = 'best-fit-matches-lower-bound';
      }
      const bars = bins.map((bin, bi) => {
        let cursor = 0;
        const cuts = bin.map((item, index) => {
          if (index) cursor += kerfIn;
          const startIn = cursor; cursor += item.cut.lengthIn;
          return {pieceId: item.cut.id, sourceId: item.cut.sourceId ?? null,
            lengthIn: item.cut.lengthIn, startIn, endIn: cursor};
        });
        return {id: `group-${gi + 1}-bar-${bi + 1}`, stockIn, cuts, usedIn: cursor,
          materialIn: sum(cuts.map(c => c.lengthIn)), kerfBetweenPiecesIn: kerfIn * Math.max(0, cuts.length - 1),
          wasteIn: Math.max(0, stockIn - cursor)};
      });
      const complete = pending.length === 0;
      if (optimality === 'heuristic') warnings.push(warning('PACKING_HEURISTIC', 'Plan de coupe réalisable; le nombre minimal de barres n’a pas été prouvé.', context));
      return {key:group.key,profile,brand:group.brand,materialId:group.materialId,colorId:group.colorId,colorName:group.colorName,color,stockIn,kerfIn:kerfValid?kerfIn:null,
        bars, unplaced: pending, zeroLengthPieceIds: zero, barCount: complete ? bars.length : null,
        knownBarCount: bars.length, complete, optimality: complete ? optimality : 'not_applicable',
        packedSubsetOptimality: optimality, method, lowerBound, visitedNodes,
        pieceCount: group.cuts.length - zero.length, packedPieceCount: fit.length};
    });
    const complete = groups.every(g => g.complete) && kerfValid;
    return {groups, barCount: complete ? sum(groups.map(g => g.barCount)) : null,
      knownBarCount: sum(groups.map(g => g.knownBarCount)), complete,
      optimality: complete ? (groups.every(g => g.optimality === 'proven') ? 'proven' : 'heuristic') : 'not_applicable',
      kerfConvention: 'Minimum between adjacent pieces; end waste includes any final saw cut. No initial end trim.',
      warnings: uniqueWarnings(warnings)};
  }
  function straightRuns(points) {
    const line = cleanLine(points);
    if (!line) return null;
    const kept = [];
    for (const p of line) {
      while (kept.length >= 2) {
        const a = kept[kept.length - 2], b = kept[kept.length - 1];
        const ux = b[0] - a[0], uy = b[1] - a[1], vx = p[0] - b[0], vy = p[1] - b[1];
        if (cross(ux, uy, vx, vy) !== 0 || ux * vx + uy * vy < 0) break;
        kept.pop();
      }
      kept.push(p);
    }
    return kept.slice(1).map((p, i) => [kept[i], p]);
  }
  function rectangularOpening(polygon) {
    const parsed = cleanRing(polygon);
    if (!parsed.ring) return null;
    const p = parsed.ring;
    if (p.length !== 4) return false;
    for (let i = 0; i < 4; i++) {
      const a = p[i], b = p[(i + 1) % 4], c = p[(i + 2) % 4];
      const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1];
      if (Math.abs(ux * vx + uy * vy) > 1e-6 * Math.hypot(ux, uy) * Math.hypot(vx, vy)) return false;
    }
    return true;
  }
  function calculate(input = {}) {
    const settings = input.settings || {}, warnings = [], pieces = [];
    let inputValid = true;
    const list = key => {
      if (input[key] === undefined) return [];
      if (Array.isArray(input[key])) return input[key];
      warnings.push(warning('INVALID_COLLECTION', `La liste ${key} est inconnue ou invalide.`)); inputValid = false; return [];
    };
    const faceInputs = list('faces'), faceMap = new Map(faceInputs.map(f => [f.key ?? f.face ?? f.id, f]));
    const areaFaces = faceInputs.map(measureFace); areaFaces.forEach(f => warnings.push(...f.warnings));
    const areas = aggregateAreas(areaFaces);
    const numericSetting = (key, fallback) => {
      const value = own(settings, key) ? settings[key] : fallback;
      if (!nonnegative(value)) {inputValid = false; warnings.push(warning('INVALID_SETTING', `Valeur ${key} inconnue ou invalide.`)); return null;}
      return value;
    };
    const dripExtraIn = numericSetting('dripExtraIn', 4), outerDripExtraIn=numericSetting('outerDripExtraIn',4), windowLExtraIn = 3;
    if(own(settings,'windowLExtraIn')&&settings.windowLExtraIn!==3)warnings.push(warning('WINDOW_L_ALLOWANCE_FIXED','La règle atelier v4 conserve toujours 3 po au total par fenêtre; l’ancienne valeur a été remplacée.'));
    function stock(profile, source, field) {
      let value;
      if (field && own(source, field)) value = source[field];
      else if (own(source.stockByProfile, profile)) value = source.stockByProfile[profile];
      else if (own(source, 'stockIn')) value = source.stockIn;
      else if (own(settings.stockByProfile, profile)) value = settings.stockByProfile[profile];
      else if (profile === 'drip-edge') value = own(settings, 'dripStockIn') ? settings.dripStockIn : 120;
      else if (profile === 'window-l') value = own(settings, 'windowLStockIn') ? settings.windowLStockIn : 120;
      else value = own(settings, 'defaultStockIn') ? settings.defaultStockIn : profile==='soffit-j'?144:120;
      if (!positive(value)) return null;
      if (STOCK_LIMITS[profile] && value > STOCK_LIMITS[profile]) {
        warnings.push(warning('STOCK_EXCEEDS_MAXIMUM', 'La longueur de stock dépasse le maximum demandé pour ce profil.', source, {profile, stockIn: value, maximumIn: STOCK_LIMITS[profile]})); return null;
      }
      return value;
    }
    function piece(source, suffix, profile, lengthIn, color, stockIn, extras = {}) {
      const row = {id: `${source.sourceType}:${source.face ?? ''}:${source.id}:${suffix}`,
        sourceId: source.id, sourceType: source.sourceType, face: source.face ?? null,
        profile,...profileFinish(source,profile,color),lengthIn:nonnegative(lengthIn)?lengthIn:null,
        lengthFt: nonnegative(lengthIn) ? lengthIn / 12 : null, stockIn: positive(stockIn) ? stockIn : null,
        allowanceIn: 0, requiredContinuous: true, provenance: source.provenance ?? null, ...extras};
      pieces.push(row); return row;
    }
    function uniqueSources(rows, sourceType) {
      const seen = new Set(), result = [];
      rows.forEach((source, index) => {
        const item = {...source, id: source.id ?? `${sourceType}-${index + 1}`, sourceType};
        const key = JSON.stringify([item.face ?? null, item.id]);
        if (seen.has(key)) {inputValid = false; warnings.push(warning('DUPLICATE_SOURCE_ID', 'Identifiant dupliqué : la seconde saisie est exclue du métrage.', item));}
        else {seen.add(key); if (item.enabled !== false) result.push(item);}
      });
      return result;
    }
    const decorations=[];
    for(const f of faceInputs){
      for(const note of f.decorationWarnings||[]){warnings.push(warning('DECORATION_TO_VALIDATE',note,{face:f.key}));inputValid=false;}
      for(const z of f.zones||[]){if(!z.decorationType)continue;
        const source={id:z.id,sourceType:'decoration',face:f.key,...z.selection,provenance:z.provenance};
        const profile=z.decorationType==='band'?'band':'opening-contour',orientation=z.decorationType==='band'||['top','bottom'].includes(z.side)?'horizontal':'vertical';
        const line=clipLineToZone(f,z.id,orientation,.5),start=pieces.length;
        for(const [i,points] of line.segments.entries())piece(source,`run-${i+1}`,profile,positive(f.feetPerPixel)?polylineLength(points,f.feetPerPixel)*12:null,z.selection?.color,stock(profile,source),{points,geometryRole:z.decorationType,decorationKey:z.decorationKey,decorationSide:z.side,decorationZoneIds:[z.id],orientation});
        const measured=areaFaces.find(a=>a.face===f.key)?.zones.find(a=>a.id===z.id);
        const missingCut=measured?.netFt2>EPS&&!line.segments.length;
        if(missingCut){piece(source,'cut-to-detail',profile,null,z.selection?.color,stock(profile,source),{geometryRole:z.decorationType,decorationKey:z.decorationKey,decorationZoneIds:[z.id]});warnings.push(warning('DECORATION_CUT_TO_DETAIL','Surface décorative présente sans axe de coupe mesurable : détailler le morceau; la quantité ne devient pas zéro.',source));}
        decorations.push({id:z.id,face:f.key,decorationKey:z.decorationKey,type:z.decorationType,profile,brand:source.brand,materialId:source.materialId,colorId:source.colorId,colorName:source.colorName,color:z.selection?.color,
          areaFt2:measured?.netFt2??null,lengthFt:missingCut?null:line.lengthFt,segments:line.segments,pieceIds:pieces.slice(start).map(p=>p.id),complete:line.complete&&!missingCut&&!!source.materialId});
        if(!source.materialId){warnings.push(warning('DECORATION_MATERIAL_UNKNOWN','Matériau de bandeau ou de contour à choisir.',source));inputValid=false;}
      }
    }
    // A surround copied across several parent masks is still one continuous
    // board. Merge adjacent runs of that same side before stock allocation;
    // otherwise accent boundaries would become fictitious cutting joints.
    const decorativeGroups=new Map(),decorativeUnmerged=[];
    for(const p of pieces){if(!p.points||p.points.length!==2||!p.decorationKey||!finite(p.lengthIn)){decorativeUnmerged.push(p);continue;}
      const axis=p.orientation==='vertical'?1:0,coordinate=p.points[0][1-axis],key=JSON.stringify([p.face,p.profile,...finishKey(p),p.stockIn,p.decorationKey,p.decorationSide??null,axis,coordinate]);
      if(!decorativeGroups.has(key))decorativeGroups.set(key,[]);decorativeGroups.get(key).push(p);
    }
    const decorativeMerged=[...decorativeUnmerged];
    for(const group of decorativeGroups.values()){const axis=group[0].orientation==='vertical'?1:0;let last=null;
      for(const p of group.sort((a,b)=>a.points[0][axis]-b.points[0][axis])){if(last&&p.points[0][axis]<=last.points[1][axis]+EPS){last.points[1][axis]=Math.max(last.points[1][axis],p.points[1][axis]);last.lengthFt=polylineLength(last.points,faceMap.get(p.face)?.feetPerPixel);last.lengthIn=last.lengthFt*12;last.decorationZoneIds.push(...p.decorationZoneIds);last.sourceIds.push(p.sourceId);}else{last={...p,points:p.points.map(v=>v.slice()),decorationZoneIds:[...p.decorationZoneIds],sourceIds:[p.sourceId]};decorativeMerged.push(last);}}
    }
    pieces.splice(0,pieces.length,...decorativeMerged);
    for(const d of decorations)d.pieceIds=pieces.filter(p=>p.decorationZoneIds?.includes(d.id)).map(p=>p.id);
    const windows = uniqueSources(list('windows'), 'window').map(w => {
      const start = pieces.length, width = positive(w.widthIn) ? w.widthIn : null, height = positive(w.heightIn) ? w.heightIn : null;
      const vented = typeof w.ventedSill === 'boolean' ? w.ventedSill : null;
      const opening = faceMap.get(w.face)?.openings?.find(o => o.id === (w.openingId ?? w.id));
      const isNonRectangular = w.shape === 'non-rectangular' || (opening?.polygon && rectangularOpening(opening.polygon) === false);
      const scopeAllowed = !isNonRectangular || w.rectangularPartOnly === true;
      const dimension = value => scopeAllowed ? value : null;
      if (!width || !height) warnings.push(warning('WINDOW_DIMENSIONS_UNKNOWN', 'Largeur et hauteur explicites de fenêtre requises; aucune cote n’est déduite du cadre englobant.', w));
      if (vented === null) warnings.push(warning('WINDOW_SILL_CHOICE_UNKNOWN', 'Choisir un bas de fenêtre ventilé ou un L avant de répartir les pièces.', w));
      if (isNonRectangular) warnings.push(warning(w.rectangularPartOnly ? 'WINDOW_RECTANGULAR_SCOPE_ONLY' : 'NON_RECTANGULAR_WINDOW', w.rectangularPartOnly
        ? 'Calcul limité explicitement à la partie rectangulaire; les autres contours attendent des coupes renseignées.'
        : 'Fenêtre non rectangulaire : préciser ses contours et ses coupes; le moteur ne remplace pas les jambages par la hauteur du cadre englobant.', w));
      const dw = dimension(width), dh = dimension(height), lCount = vented === true ? 2 : vented === false ? 3 : null;
      const perL = lCount && finite(windowLExtraIn) ? windowLExtraIn / lCount : null;
      const add = (a, b) => finite(a) && finite(b) ? a + b : null;
      piece(w, 'drip', 'drip-edge', add(dw, dripExtraIn), w.color, stock('drip-edge', w, 'dripStockIn'), {baseLengthIn: dw, allowanceIn: dripExtraIn});
      const doubleDrip=w.trimMode==='material',frameWidth=nonnegative(w.faceWidthIn)?w.faceWidthIn:null;
      const outerWidth=positive(w.outerWidthIn)?w.outerWidthIn:finite(dw)&&finite(frameWidth)?dw+2*frameWidth:null;
      if(doubleDrip){
        piece(w,'outer-drip','drip-edge',add(outerWidth,own(w,'outerDripExtraIn')?w.outerDripExtraIn:outerDripExtraIn),w.color,stock('drip-edge',w,'dripStockIn'),
          {baseLengthIn:outerWidth,allowanceIn:own(w,'outerDripExtraIn')?w.outerDripExtraIn:outerDripExtraIn,location:'outer-trim-head'});
        warnings.push(warning('DOUBLE_DRIP_ASSUMPTION','Contour en matériau : deux gouttes d’eau distinctes, baie puis largeur extérieure du contour. Surplus et largeur extérieure à confirmer.',w));
      }
      if(w.includeRodentGuard!==false)piece(w,'rodent-head','rodent-guard',dw,w.color,stock('rodent-guard',w),{baseLengthIn:dw,location:'above-window'});
      ['left', 'right'].forEach(side => piece(w, side, 'window-l', add(dh, perL), w.color, stock('window-l', w, 'lStockIn'), {baseLengthIn: dh, allowanceIn: perL, location: side}));
      if (vented === true) piece(w, 'sill', 'vented-sill', dw, w.color, stock('vented-sill', w, 'sillStockIn'), {baseLengthIn: dw, location: 'bottom'});
      else if (vented === false) piece(w, 'bottom', 'window-l', add(dw, perL), w.color, stock('window-l', w, 'lStockIn'), {baseLengthIn: dw, allowanceIn: perL, location: 'bottom'});
      else piece(w, 'bottom', 'window-bottom-unresolved', null, w.color, null, {location: 'bottom'});
      const cutList = pieces.slice(start);
      return {id: w.id, face: w.face ?? null, widthIn: width, heightIn: height, ventedSill: vented,
        scope: isNonRectangular && w.rectangularPartOnly ? 'rectangular_part_only' : 'whole_rectangular_window',
        lAllowance: {totalIn: windowLExtraIn, pieceCount: lCount, perPieceIn: perL, distribution: 'equal_across_L_pieces'},
        dripLengthIn: cutList[0].lengthIn, outerDripLengthIn:doubleDrip?cutList.find(p=>p.location==='outer-trim-head')?.lengthIn??null:null,
        dripCount:doubleDrip?2:1,outerWidthIn:doubleDrip?outerWidth:null,
        lLengthIn: sumComplete(cutList.filter(p => p.profile === 'window-l').map(p => p.lengthIn)),
        ventedSillLengthIn: vented === true ? dw : vented === false ? 0 : null,
        pieceIds: cutList.map(p => p.id), complete: scopeAllowed && !isNonRectangular && cutList.every(p => finite(p.lengthIn))};
    });
    function lengthRuns(source) {
      const explicit = nonnegative(source.lengthFt) ? source.lengthFt : null;
      if (explicit !== null) return {lengthFt: explicit, runsFt: [explicit], origin: 'explicit_length_ft', complete: true};
      if (own(source, 'lengthFt') && source.lengthFt !== null && source.lengthFt !== undefined) warnings.push(warning('INVALID_LENGTH', 'La longueur doit être un nombre positif ou nul en pieds.', source));
      if (source.points !== undefined) {
        const runs = straightRuns(source.points), scale = positive(source.feetPerPixel) ? source.feetPerPixel : faceMap.get(source.face)?.feetPerPixel;
        if (runs && positive(scale)) {
          const lengths = runs.map(points => polylineLength(points, scale));
          return {lengthFt: sum(lengths), runsFt: lengths, origin: 'calibrated_polyline', complete: true};
        }
      }
      warnings.push(warning('LINE_LENGTH_UNKNOWN', 'Longueur explicite ou polyligne à échelle requise.', source));
      return {lengthFt: null, runsFt: [null], origin: 'unknown', complete: false};
    }
    function segmentProfile(s) {
      if (s.kind === 'brick') return typeof s.trim === 'string' && ['L', 'J'].includes(s.trim.toUpperCase()) ? `brick-${s.trim.toLowerCase()}` : null;
      const aliases = {'top-wall': 'top-vent', 'top-wall-vent': 'top-vent', 'roof-l6': 'roof-l-6', 'j-soffit': 'soffit-j'};
      const profile = aliases[s.kind] || s.kind;
      return own(PROFILES, profile) ? profile : null;
    }
    const segments = uniqueSources(list('segments'), 'segment').map(s => {
      const profile = segmentProfile(s), measured = lengthRuns(s), start = pieces.length;
      let color = colorOf(s.color), eligible = true;
      if (!profile) {eligible = false; warnings.push(warning('SEGMENT_PROFILE_UNKNOWN', 'Choisir un profil de moulure; pour la brique, choisir L ou J.', s));}
      if (profile === 'roof-l-6') {
        const zone = faceMap.get(s.face)?.zones?.find(z => z.id === s.zoneId);
        if(zone?.selection)for(const key of ['brand','materialId','colorId','colorName'])if(zone.selection[key]!=null)s[key]=zone.selection[key];
        const zoneColor = colorOf(zone?.selection?.color ?? zone?.color), statedColor = colorOf(s.sidingColor);
        color = zoneColor || statedColor;
        if (zoneColor && statedColor && zoneColor !== statedColor) warnings.push(warning('ROOF_L_COLOR_MISMATCH', 'La couleur du L 6 po reprend la zone de parement; la valeur contradictoire saisie séparément est ignorée.', s));
        if (!color) warnings.push(warning('ROOF_L_SIDING_COLOR_UNKNOWN', 'Le L 6 po doit reprendre la couleur du parement associé; renseigner sidingColor ou zoneId.', s));
      }
      if (profile === 'soffit-j') {
        if (s.edgeType === 'fascia') return {id: s.id, face: s.face ?? null, profile, lengthFt: 0, measuredLengthFt: measured.lengthFt, pieceIds: [], excludedReason: 'fascia_edge', complete: true};
        if (!['wall', 'interior'].includes(s.edgeType)) {eligible = false; warnings.push(warning('SOFFIT_EDGE_TYPE_UNKNOWN', 'Le J de soffite exige un bord de mur ou intérieur; le bord de fascia est exclu.', s));}
      }
      measured.runsFt.forEach((length, i) => piece(s, `run-${i + 1}`, profile ?? 'profile-unresolved', eligible && finite(length) ? length * 12 : null, color, profile ? stock(profile, s) : null));
      return {id: s.id, face: s.face ?? null, profile, color, lengthFt: eligible ? measured.lengthFt : null,
        origin: measured.origin, pieceIds: pieces.slice(start).map(p => p.id), complete: eligible && measured.complete && (profile !== 'roof-l-6' || color !== null)};
    });
    const soffits = uniqueSources(list('soffits'), 'soffit').map(s => {
      const start = pieces.length, fasciaLengthFt = nonnegative(s.fasciaLengthFt) ? s.fasciaLengthFt : null;
      const depthIn = nonnegative(s.depthIn) ? s.depthIn : null;
      const areaFt2 = fasciaLengthFt !== null && depthIn !== null ? fasciaLengthFt * depthIn / 12 : null;
      let edgeComplete = Array.isArray(s.edges), excludedFasciaEdgeLengthFt = 0;
      if (areaFt2 === null) warnings.push(warning('SOFFIT_DIMENSIONS_UNKNOWN', 'Surface de soffite : longueur complète du fascia et profondeur en pouces requises.', s));
      if (!edgeComplete) warnings.push(warning('SOFFIT_EDGES_UNKNOWN', 'Classer les bords de soffite pour calculer le J; les bords de fascia seront exclus.', s));
      for (const [index, edge] of (Array.isArray(s.edges) ? s.edges : []).entries()) {
        if (edge.enabled === false) continue;
        if (edge.type === 'fascia') {
          excludedFasciaEdgeLengthFt = finite(excludedFasciaEdgeLengthFt) && nonnegative(edge.lengthFt) ? excludedFasciaEdgeLengthFt + edge.lengthFt : null;
          continue;
        }
        if (!['wall', 'interior'].includes(edge.type)) {
          edgeComplete = false; warnings.push(warning('SOFFIT_EDGE_TYPE_UNKNOWN', 'Type de bord inconnu; choisir mur, intérieur ou fascia.', s, {edgeIndex: index}));
          piece(s, `edge-${index + 1}`, 'soffit-j', null, s.color, stock('soffit-j', s)); continue;
        }
        const measured = lengthRuns({...s, ...edge, id: `${s.id}:edge-${index + 1}`});
        if (!measured.complete) edgeComplete = false;
        measured.runsFt.forEach((length, run) => piece(s, `edge-${index + 1}-run-${run + 1}`, 'soffit-j', finite(length) ? length * 12 : null, edge.color ?? s.color, stock('soffit-j', {...s, ...edge}), {edgeType: edge.type}));
      }
      const cutList = pieces.slice(start);
      return {id: s.id, face: s.face ?? null, fasciaLengthFt, depthIn, areaFt2, deduction45Ft2: 0,
        method: 'full_fascia_length_times_depth', jLengthFt: edgeComplete ? sumComplete(cutList.map(p => p.lengthFt)) : null,
        knownJLengthFt: sumKnown(cutList.map(p => p.lengthFt)), excludedFasciaEdgeLengthFt,
        pieceIds: cutList.map(p => p.id), complete: areaFt2 !== null && edgeComplete};
    });
    const panels = uniqueSources(list('panels'), 'panel-layout').map(p => {
      if(p.layout&&p.zoneId){
        const f=faceMap.get(p.face),layout=f?panelLayout(f,p.zoneId,p.layout,{maxWidthIn:p.maxWidthIn,maxLengthIn:p.maxLengthIn,stockKnown:p.stockKnown,rotationAllowed:p.rotationAllowed!==false}):{vertical:[],horizontal:[],cells:[],complete:false,warnings:[warning('PANEL_ZONE_UNKNOWN','Façade du calepinage absente.',p)]};
        const start=pieces.length;warnings.push(...layout.warnings);
        for(const [orientation,lines,profile,sequence] of [['vertical',layout.vertical,'panel-l-7/8',1],['horizontal',layout.horizontal,'panel-z',2]])for(const line of lines)for(const [i,points] of line.segments.entries()){
          const length=positive(f?.feetPerPixel)?polylineLength(points,f.feetPerPixel)*12:null;
          piece(p,`${orientation}-${line.id}-${i+1}`,profile,length,p.color,stock(profile,p,orientation==='vertical'?'verticalStockIn':'horizontalStockIn'),{orientation,sequence,points,lineId:line.id});
        }
        const cuts=pieces.slice(start);return {...layout,id:p.id,face:p.face,zoneId:p.zoneId,materialId:p.materialId,color:p.color,colorId:p.colorId,formatId:p.formatId||null,formatLabel:p.formatLabel||null,orientation:p.orientation||null,
          dimensionsScope:'clipped_real_layout',pieceIds:cuts.map(c=>c.id),verticalPieceIds:cuts.filter(c=>c.orientation==='vertical').map(c=>c.id),horizontalPieceIds:cuts.filter(c=>c.orientation==='horizontal').map(c=>c.id),
          verticalLengthFt:sumComplete(cuts.filter(c=>c.orientation==='vertical').map(c=>c.lengthFt)),horizontalLengthFt:sumComplete(cuts.filter(c=>c.orientation==='horizontal').map(c=>c.lengthFt))};
      }
      const start = pieces.length, widthIn = positive(p.widthIn) ? p.widthIn : null, heightIn = positive(p.heightIn) ? p.heightIn : null;
      const columns = Number.isInteger(p.columns) && p.columns > 0 ? p.columns : null;
      const rows = Number.isInteger(p.rows) && p.rows > 0 ? p.rows : null;
      if (columns === null || rows === null || widthIn === null || heightIn === null) warnings.push(warning('PANEL_LAYOUT_INCOMPLETE', 'Dimensions totales en pouces et nombres entiers de colonnes/rangées requis.', p));
      if (columns !== null && rows !== null) {
        for (let column = 1; column < columns; column++) {
          const x = widthIn === null ? null : column * widthIn / columns;
          piece(p, `vertical-${column}`, 'panel-l-7/8', heightIn, p.color, stock('panel-l-7/8', p, 'verticalStockIn'),
            {orientation: 'vertical', sequence: 1, fromIn: [x, 0], toIn: [x, heightIn]});
        }
        for (let row = 1; row < rows; row++) for (let column = 0; column < columns; column++) {
          const width = widthIn === null ? null : widthIn / columns, y = heightIn === null ? null : row * heightIn / rows;
          piece(p, `horizontal-${row}-${column + 1}`, 'panel-z', width, p.color, stock('panel-z', p, 'horizontalStockIn'),
            {orientation: 'horizontal', sequence: 2, fromIn: [width === null ? null : column * width, y], toIn: [width === null ? null : (column + 1) * width, y]});
        }
      }
      const cutList = pieces.slice(start);
      return {id: p.id, face: p.face ?? null, widthIn, heightIn, columns, rows, dimensionsScope: 'whole_layout',
        areaFt2: widthIn !== null && heightIn !== null ? widthIn * heightIn / 144 : null,
        verticalLengthFt: columns === null || heightIn === null ? null : (columns - 1) * heightIn / 12,
        horizontalLengthFt: rows === null || widthIn === null ? null : (rows - 1) * widthIn / 12,
        verticalPieceIds: cutList.filter(c => c.orientation === 'vertical').map(c => c.id),
        horizontalPieceIds: cutList.filter(c => c.orientation === 'horizontal').map(c => c.id),
        pieceIds: cutList.map(c => c.id), complete: [widthIn, heightIn, columns, rows].every(positive)};
    });
    const totalMap = new Map();
    for (const p of pieces) {
      const key = JSON.stringify([p.profile,...finishKey(p)]);
      if (!totalMap.has(key)) totalMap.set(key, {profile:p.profile,brand:p.brand,materialId:p.materialId,colorId:p.colorId,colorName:p.colorName,color:p.color,lengths:[],pieceIds:[]});
      const group = totalMap.get(key); group.lengths.push(p.lengthIn); if (p.lengthIn !== 0) group.pieceIds.push(p.id);
    }
    const linearTotals = [...totalMap.values()].map(g => {
      const lengthIn = sumComplete(g.lengths);
      return {profile:g.profile,brand:g.brand,materialId:g.materialId,colorId:g.colorId,colorName:g.colorName,color:g.color,lengthIn,lengthFt:lengthIn===null?null:lengthIn/12,
        knownLengthFt: sumKnown(g.lengths) / 12, pieceCount: g.pieceIds.length, pieceIds: g.pieceIds, complete: lengthIn !== null};
    });
    const packing = packCuts(pieces, settings); warnings.push(...packing.warnings);
    const boards=uniqueSources(list('boards'),'board-layout').map(p=>{
      const f=faceMap.get(p.face);const layout=f?boardLayout(f,p.zoneId,p.vertical||[],positive(p.maximumIn)?p.maximumIn:144):{cells:[],complete:false,warnings:[warning('BOARD_ZONE_UNKNOWN','Zone de clin absente.',p)]};
      warnings.push(...layout.warnings);return {...layout,id:p.id,face:p.face,zoneId:p.zoneId,materialId:p.materialId,color:p.color,colorId:p.colorId};
    });
    const complete = inputValid && areas.complete && [windows, segments, soffits, panels,boards,decorations].every(rows => rows.every(r => r.complete)) && packing.complete;
    const materialByFace=areaFaces.map(f=>({face:f.face,...aggregateAreas([f])}));
    return {version: VERSION, areas,materialByFace,windows,segments,soffits,panels,boards,decorations,pieces,linearTotals,packing,
      soffitAreaFt2: sumComplete(soffits.map(s => s.areaFt2)), knownSoffitAreaFt2: sumKnown(soffits.map(s => s.areaFt2)),
      complete, warnings: uniqueWarnings(warnings),
      assumptions: [
        'Échelle uniforme X=Y, indépendante par façade; la justesse des cotes et des tracés reste une donnée d’entrée.',
        'Les zones enfants sont limitées à leurs ancêtres; à profondeur égale, la dernière zone peinte reçoit le recouvrement.',
        'Ouvertures et accents sont soustraits par union, sans double déduction.',
        `Goutte d’eau : supplément total ${dripExtraIn ?? 'inconnu'} po par fenêtre; stock maximal 120 po. Contour en matériau : seconde goutte extérieure distincte.`,
        `L de fenêtre : supplément total ${windowLExtraIn ?? 'inconnu'} po réparti également entre les seules pièces L; stock maximal 120 po.`,
        'Panneaux : dimensions totales du calepinage; L verticaux continus posés avant les Z, séparés à chaque colonne.',
        '7/8 po et 6 po désignent des profils : ces valeurs ne sont pas ajoutées aux pieds linéaires.',
        'Soffite : rectangle de longueur complète du fascia × profondeur, sans retrait des coupes à 45 degrés.',
        'Stock des moulures : 120 po; seul le J de soffite utilise 144 po. Groupement par profil, matériau, couleur et stock.',
        'Surfaces décoratives et longueurs de coupe décrivent les mêmes bandeaux/contours; ne pas les commander deux fois.',
        'Rotation de panneau permise pour débit uniquement, sans modifier les règles de pose du fabricant.',
        'Le trait de coupe sépare les pièces; la chute finale inclut son éventuel trait de coupe. Aucun dressage initial simulé.'
      ]};
  }
  return Object.freeze({version: VERSION, profiles: PROFILES, stockLimits:STOCK_LIMITS, polygonArea, polylineLength, calibrate,
    booleanArea, paintOrder,clipLineToZone,panelLayout,boardLayout,wallAccessories,panelCells:(face,zoneId,layout,options)=>panelLayout(face,zoneId,layout,options).cells,
    fitsStock,measureFace,packCuts,calculate});
});
