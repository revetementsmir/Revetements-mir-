/* Authoritative site measurements and axial overall allowances. Inches throughout. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MIRArchitecturalInput = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';
  const EPS = 1e-7;
  const finite = Number.isFinite;
  const issue = message => ({ message });
  const bounds = points => ({ minX: Math.min(...points.map(p => p[0])), maxX: Math.max(...points.map(p => p[0])), minY: Math.min(...points.map(p => p[1])), maxY: Math.max(...points.map(p => p[1])) });
  function normalizeSketch(points, widthIn, heightIn) {
    if (!Array.isArray(points) || points.length < 3 || points.length > 64 || !finite(widthIn) || !finite(heightIn) || widthIn <= 0 || heightIn <= 0 || points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !finite(n)))) return null;
    const b = bounds(points), w = b.maxX - b.minX, h = b.maxY - b.minY;
    if (w <= EPS || h <= EPS) return null;
    return points.map(([x,y]) => [(x-b.minX) * widthIn/w, (y-b.minY) * heightIn/h]);
  }
  function gableFromPitch(widthIn, eaveIn, leftPitch, rightPitch = leftPitch) {
    if (![widthIn, eaveIn, leftPitch, rightPitch].every(finite) || widthIn <= 0 || eaveIn < 0 || leftPitch <= 0 || rightPitch <= 0) return null;
    const peakXIn = widthIn * (rightPitch / (leftPitch + rightPitch));
    const heightIn = eaveIn + peakXIn * (leftPitch / 12);
    if (peakXIn <= 0 || peakXIn >= widthIn || !finite(heightIn) || heightIn <= eaveIn) return null;
    return { peakXIn, heightIn };
  }
  function prepare({ widthIn: w, heightIn: h, clearances = {}, shape = {} } = {}) {
    const errors = [];
    if (!finite(w) || !finite(h) || w <= 0 || h <= 0) return { ok:false, errors:[issue('Entrez la largeur et la hauteur totales prises au chantier.')] };
    const g = Object.fromEntries(['left','right','top','bottom'].map(k => [k, clearances[k] ?? 0]));
    if (Object.values(g).some(n => !finite(n) || n < 0)) return {ok:false,errors:[issue('Le lousse doit être une mesure positive ou zéro.')]};
    const uw = w-g.left-g.right, uh = h-g.top-g.bottom;
    if (uw <= EPS || uh <= EPS) return {ok:false,errors:[issue('Le lousse total doit être plus petit que la mesure chantier correspondante.')]};
    const type = shape.type || 'rectangle';
    let points;
    if (type === 'rectangle') points = [[0,0],[w,0],[w,h],[0,h]];
    else if (type === 'gable' || type === 'slope') {
      const left = shape.leftHeightIn, right = shape.rightHeightIn;
      if (![left,right].every(n => finite(n) && n >= 0 && n <= h)) errors.push(issue('Les hauteurs gauche et droite doivent être comprises entre zéro et la hauteur totale chantier.'));
      if (type === 'gable') {
        if (!finite(shape.peakXIn) || shape.peakXIn <= 0 || shape.peakXIn >= w) errors.push(issue('Positionnez la pointe entre les deux extrémités du mur.'));
        points = [[0,h-left],[shape.peakXIn,0],[w,h-right],[w,h],[0,h]];
      } else {
        if (finite(left) && finite(right) && Math.abs(Math.max(left,right)-h) > EPS) errors.push(issue('Le côté le plus haut doit correspondre à la hauteur totale chantier.'));
        points = [[0,h-left],[w,h-right],[w,h],[0,h]];
      }
    } else if (type === 'free') {
      points = shape.pointsIn;
      if (!Array.isArray(points) || points.length < 3 || points.length > 64 || points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !finite(n)))) return {ok:false,errors:[issue('Fermez un contour de 3 à 64 sommets, avec des cotes valides.')]};
      const b = bounds(points);
      if (Math.abs(b.minX) > EPS || Math.abs(b.minY) > EPS || Math.abs(b.maxX-w) > EPS || Math.abs(b.maxY-h) > EPS) errors.push(issue('Les sommets fixes doivent rejoindre les dimensions totales chantier : gauche 0, droite '+w+' po, bas 0 et haut '+h+' po. Ajustez les cotes des sommets; elles ne sont pas redimensionnées automatiquement.'));
    } else errors.push(issue('Choisissez une forme de mur reconnue.'));
    if (errors.length) return {ok:false,errors};
    // This is a reduction of the overall X/Y envelope, not a constant normal
    // offset from sloping edges. Keep the measured outline intact for audit.
    const net = points.map(([x,y]) => [x*uw/w,y*uh/h]);
    return {ok:true,errors:[],type,measuredWidthIn:w,measuredHeightIn:h,widthIn:uw,heightIn:uh,
      totalGapWidthIn:g.left+g.right,totalGapHeightIn:g.top+g.bottom,clearances:g,
      measuredPointsIn:points.map(p => p.slice()),contourIn:net,clearanceMethod:'overall-axial'};
  }
  return Object.freeze({version:'1.0.0',prepare,normalizeSketch,gableFromPitch});
});
