/* Exact planar contours for architectural-panel layouts. Coordinates are in
 * inches, X right / Y down. The grid already includes the mounting lips: an
 * intersection never enlarges a panel and never adds a second allowance. */
(function (root, factory) {
  const clipping = typeof module === 'object' && module.exports
    ? require('./vendor/polygon-clipping/polygon-clipping.umd.min.js') : root && root.polygonClipping;
  const api = factory(clipping);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MIRArchitecturalWallGeometry = api;
})(typeof window === 'object' ? window : null, function (clipping) {
  'use strict';
  const EPS = 1e-8, MAX_VERTICES = 64, MAX_PIECES = 4096;
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const copy = points => points.map(p => p.slice());
  const issue = (code, message, details = {}) => ({ code, path: 'contourIn', message, ...details });
  const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const same = (a, b, tolerance) => distance(a, b) <= tolerance;
  const toleranceFor = (width, height) => Math.max(EPS, Math.max(width, height) * Number.EPSILON * 128);

  function bounds(points) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const xIn = Math.min(...xs), yIn = Math.min(...ys);
    return { xIn, yIn, widthIn: Math.max(...xs) - xIn, heightIn: Math.max(...ys) - yIn };
  }
  function signedArea(points) {
    // Translate to the first vertex to avoid cancellation far from the origin.
    if (points.length < 3) return 0;
    const origin = points[0]; let twice = 0;
    for (let i = 1; i < points.length - 1; i++) twice += cross(origin, points[i], points[i + 1]);
    return twice / 2;
  }
  const area = points => Math.abs(signedArea(points));
  function orientation(a, b, c, tolerance) {
    const value = cross(a, b, c), threshold = tolerance * Math.max(distance(a, b), distance(a, c));
    return value > threshold ? 1 : value < -threshold ? -1 : 0;
  }
  function onSegment(a, b, p, tolerance) {
    return orientation(a, b, p, tolerance) === 0 &&
      p[0] >= Math.min(a[0], b[0]) - tolerance && p[0] <= Math.max(a[0], b[0]) + tolerance &&
      p[1] >= Math.min(a[1], b[1]) - tolerance && p[1] <= Math.max(a[1], b[1]) + tolerance;
  }
  function intersects(a, b, c, d, tolerance) {
    const o1 = orientation(a, b, c, tolerance), o2 = orientation(a, b, d, tolerance);
    const o3 = orientation(c, d, a, tolerance), o4 = orientation(c, d, b, tolerance);
    return o1 * o2 < 0 && o3 * o4 < 0 ||
      o1 === 0 && onSegment(a, b, c, tolerance) || o2 === 0 && onSegment(a, b, d, tolerance) ||
      o3 === 0 && onSegment(c, d, a, tolerance) || o4 === 0 && onSegment(c, d, b, tolerance);
  }
  function cleanRing(input, tolerance) {
    const points = [];
    for (const p of input) if (!points.length || !same(points.at(-1), p, tolerance)) points.push(p.slice());
    if (points.length > 1 && same(points[0], points.at(-1), tolerance)) points.pop();
    let changed = true;
    while (changed && points.length > 3) {
      changed = false;
      for (let i = 0; i < points.length; i++) {
        const a = points[(i + points.length - 1) % points.length], b = points[i], c = points[(i + 1) % points.length];
        if (onSegment(a, c, b, tolerance)) { points.splice(i, 1); changed = true; break; }
      }
    }
    if (signedArea(points) < 0) points.reverse();
    // Deterministic winding and start vertex, including after a joint move.
    let first = 0;
    for (let i = 1; i < points.length; i++) if (points[i][1] < points[first][1] || points[i][1] === points[first][1] && points[i][0] < points[first][0]) first = i;
    return points.slice(first).concat(points.slice(0, first));
  }
  function validateContour(input, widthIn, heightIn) {
    const errors = [], tolerance = toleranceFor(widthIn, heightIn);
    if (!finite(widthIn) || !finite(heightIn) || widthIn <= 0 || heightIn <= 0)
      return { ok: false, errors: [issue('INVALID_CONTOUR_DIMENSIONS', 'Les dimensions hors tout du contour doivent être positives.')] };
    if (!Array.isArray(input) || input.length < 3 || input.length > MAX_VERTICES + 1 ||
      input.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !finite(n))))
      return { ok: false, errors: [issue('INVALID_CONTOUR', 'Renseignez un contour simple de 3 à 64 sommets numériques en pouces.')] };
    const points = copy(input);
    if (points.length > 1 && same(points[0], points.at(-1), tolerance)) points.pop();
    if (points.length > MAX_VERTICES) return { ok: false, errors: [issue('CONTOUR_VERTEX_LIMIT', 'Le contour peut contenir au maximum 64 sommets.')] };
    // Repeated adjacent vertices can arise at a zero-height eave. They carry no
    // edge and are removed; repeated non-adjacent vertices are rejected below.
    for (let i = points.length - 1; i >= 0 && points.length > 1; i--) if (same(points[i], points[(i + 1) % points.length], tolerance)) points.splice(i, 1);
    if (points.length < 3) return { ok: false, errors: [issue('DEGENERATE_CONTOUR', 'Le contour doit délimiter une surface positive.')] };
    for (let i = 0; i < points.length; i++) {
      const a = points[(i + points.length - 1) % points.length], b = points[i], c = points[(i + 1) % points.length];
      if (orientation(a, b, c, tolerance) === 0 && (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) < 0)
        errors.push(issue('NON_SIMPLE_CONTOUR', 'Le contour revient sur un même côté. Corrigez les sommets.', { vertexIndex: i }));
      for (let j = i + 1; j < points.length; j++) {
        if (j === i + 1 || i === 0 && j === points.length - 1) continue;
        if (intersects(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length], tolerance))
          errors.push(issue('NON_SIMPLE_CONTOUR', 'Le contour se croise ou se touche. Dessinez un seul contour simple, sans trou.', { edgeIndices: [i, j] }));
      }
    }
    const box = bounds(points);
    if (Math.abs(box.xIn) > tolerance || Math.abs(box.yIn) > tolerance ||
      Math.abs(box.xIn + box.widthIn - widthIn) > tolerance || Math.abs(box.yIn + box.heightIn - heightIn) > tolerance)
      errors.push(issue('CONTOUR_BOUNDS_MISMATCH', 'Le contour net doit rejoindre 0 et les dimensions hors tout nettes sur chaque axe.'));
    if (area(points) <= tolerance * tolerance) errors.push(issue('DEGENERATE_CONTOUR', 'Le contour doit délimiter une surface positive.'));
    if (errors.length) return { ok: false, errors };
    const contourIn = cleanRing(points, tolerance);
    return { ok: true, errors: [], contourIn, areaSqIn: area(contourIn), bbox: bounds(contourIn), toleranceIn: tolerance };
  }
  function measures(points) {
    const winding = Math.sign(signedArea(points)), edges = [], vertexAnglesDeg = [];
    for (let i = 0; i < points.length; i++) {
      const previous = points[(i + points.length - 1) % points.length], start = points[i], end = points[(i + 1) % points.length];
      const incoming = [start[0] - previous[0], start[1] - previous[1]], outgoing = [end[0] - start[0], end[1] - start[1]];
      const turn = Math.atan2(incoming[0] * outgoing[1] - incoming[1] * outgoing[0], incoming[0] * outgoing[0] + incoming[1] * outgoing[1]);
      const interior = 180 - winding * turn * 180 / Math.PI;
      const heading = (Math.atan2(outgoing[1], outgoing[0]) * 180 / Math.PI + 360) % 360;
      vertexAnglesDeg.push(interior);
      edges.push({ id: 'E' + (i + 1), index: i, startIn: start.slice(), endIn: end.slice(), lengthIn: distance(start, end), angleDeg: heading, interiorAngleDeg: interior });
    }
    return { edges, vertexAnglesDeg, perimeterIn: edges.reduce((sum, edge) => sum + edge.lengthIn, 0),
      convex: vertexAnglesDeg.every(angle => angle <= 180 + 1e-7), angleConvention: 'heading-clockwise-from-positive-x-y-down; interior-at-start-vertex' };
  }
  function rectangle(x, y, width, height) { return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]]; }
  function components(result, tolerance) {
    const polygons = [];
    for (const polygon of result) {
      if (polygon.length !== 1) throw new Error('CONTOUR_HOLES_UNSUPPORTED');
      const ring = cleanRing(polygon[0], tolerance);
      if (ring.length >= 3 && area(ring) > tolerance * tolerance) polygons.push(ring);
    }
    return polygons.sort((a, b) => {
      const ba = bounds(a), bb = bounds(b);
      return ba.yIn - bb.yIn || ba.xIn - bb.xIn || ba.heightIn - bb.heightIn || ba.widthIn - bb.widthIn || JSON.stringify(a).localeCompare(JSON.stringify(b));
    });
  }
  function intersectPolygons(a, b, tolerance) { return components(clipping.intersection([a], [b]), tolerance); }

  /* Intersect the inward half-planes. A short outer edge can disappear from
   * the inset without collapsing the face; no one-to-one vertex assumption
   * is made. Concave insets remain explicitly subject to validation. */
  function insetFace(points, lip, tolerance) {
    tolerance = tolerance || EPS;
    points = cleanRing(points, tolerance);
    if (!lip) return { faceStatus: 'valid', facePolygonIn: copy(points) };
    const metrics = measures(points);
    if (!metrics.convex) return { faceStatus: 'concave-requires-validation', facePolygonIn: null };
    const lines = points.map((p, i) => {
      const q = points[(i + 1) % points.length], length = distance(p, q);
      const nx = -(q[1] - p[1]) / length, ny = (q[0] - p[0]) / length;
      return { nx, ny, d: nx * p[0] + ny * p[1] + lip };
    });
    let face = copy(points);
    for (const line of lines) {
      const output = [];
      for (let i = 0; i < face.length; i++) {
        const previous = face[(i + face.length - 1) % face.length], current = face[i];
        const pd = line.nx * previous[0] + line.ny * previous[1] - line.d;
        const cd = line.nx * current[0] + line.ny * current[1] - line.d;
        const previousInside = pd >= 0, currentInside = cd >= 0;
        if (previousInside !== currentInside) {
          const t = pd / (pd - cd);
          output.push([previous[0] + t * (current[0] - previous[0]), previous[1] + t * (current[1] - previous[1])]);
        }
        if (currentInside) output.push(current.slice());
      }
      face = output;
      if (face.length < 3) return { faceStatus: 'collapsed', facePolygonIn: null };
    }
    face = cleanRing(face, tolerance);
    if (face.length < 3 || signedArea(face) <= tolerance * tolerance) return { faceStatus: 'collapsed', facePolygonIn: null };
    // Index the supporting outer edge for each inset edge. This survives
    // vanished short edges and allows the volume model to relate the lips.
    const faceSupportEdgeIndices = face.map((p, i) => {
      const q = face[(i + 1) % face.length], midpoint = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      let best = 0, residual = Infinity;
      lines.forEach((line, j) => { const r = Math.abs(line.nx * midpoint[0] + line.ny * midpoint[1] - line.d); if (r < residual) { best = j; residual = r; } });
      return best;
    });
    return { faceStatus: 'valid', facePolygonIn: face, faceSupportEdgeIndices };
  }

  function clipLayout(layout, contourInput) {
    const validation = validateContour(contourInput, layout.widthIn, layout.heightIn);
    if (!validation.ok) return validation;
    if (!clipping || typeof clipping.intersection !== 'function') return { ok: false, errors: [issue('CONTOUR_ENGINE_UNAVAILABLE', 'Le moteur de découpe du contour n’est pas chargé.')] };
    const { contourIn, toleranceIn } = validation, pieces = [], warnings = [];
    try {
      for (const cell of layout.pieces) {
        const polygons = intersectPolygons(contourIn, rectangle(cell.xIn, cell.yIn, cell.widthIn, cell.heightIn), toleranceIn);
        const left = cell.col ? layout.xAxesIn[cell.col - 1] : 0, top = cell.row ? layout.yAxesIn[cell.row - 1] : 0;
        const right = cell.col < layout.columns - 1 ? layout.xAxesIn[cell.col] : layout.widthIn;
        const bottom = cell.row < layout.rows - 1 ? layout.yAxesIn[cell.row] : layout.heightIn;
        const coverageCell = rectangle(left, top, right - left, bottom - top);
        // A cell has a panel only where it actually owns some wall coverage.
        // Its extended lip envelope can enter an adjacent occupied cell even
        // when the nominal cell is empty (e.g. at a concave cutout). Such a
        // disconnected lap-only strip must not become a phantom panel. Filter
        // each component independently, before assigning its stable cell ID.
        const coveredComponents = polygons.map(polygonIn => {
          const coveragePolygonsIn = intersectPolygons(polygonIn, coverageCell, toleranceIn);
          return { polygonIn, coveragePolygonsIn, coverageAreaSqIn: coveragePolygonsIn.reduce((sum, ring) => sum + area(ring), 0) };
        }).filter(component => component.coverageAreaSqIn > toleranceIn * toleranceIn);
        coveredComponents.forEach(({ polygonIn, coveragePolygonsIn, coverageAreaSqIn }, componentIndex) => {
          const bbox = bounds(polygonIn), metrics = measures(polygonIn);
          const face = insetFace(polygonIn, layout.lipIn, toleranceIn), faceBox = face.facePolygonIn && bounds(face.facePolygonIn);
          const id = coveredComponents.length === 1 ? cell.id : cell.id + '-' + (componentIndex + 1);
          pieces.push({ ...cell, ...bbox, bbox: { ...bbox }, id, cellId: cell.id, componentIndex, componentCount: coveredComponents.length,
            cellXIn: cell.xIn, cellYIn: cell.yIn, cellWidthIn: cell.widthIn, cellHeightIn: cell.heightIn,
            gridBounds: { xIn: cell.xIn, yIn: cell.yIn, widthIn: cell.widthIn, heightIn: cell.heightIn },
            polygonIn, localPolygonIn: polygonIn.map(p => [p[0] - bbox.xIn, p[1] - bbox.yIn]),
            ...metrics, ...face,
            faceWidthIn: faceBox ? faceBox.widthIn : null, faceHeightIn: faceBox ? faceBox.heightIn : null,
            areaSqIn: area(polygonIn), coveragePolygonsIn, coverageAreaSqIn,
            geometryType: 'polygon', dimensionBasis: 'outer_including_lips',
            faceGeometryValid: face.faceStatus === 'valid' });
          if (face.faceStatus !== 'valid') warnings.push(issue(face.faceStatus === 'collapsed' ? 'LIP_FACE_COLLAPSE' : 'CONCAVE_FACE_REQUIRES_VALIDATION',
            face.faceStatus === 'collapsed' ? 'Les lips du panneau ' + id + ' ne laissent pas une face à retours simples. Vérifiez ce détail avant fabrication.' :
              'Le contour du panneau ' + id + ' est concave : ses retours et sa face intérieure doivent être validés avant fabrication.', { pieceId: id }));
        });
        if (pieces.length > MAX_PIECES) return { ok: false, errors: [issue('CONTOUR_PIECE_LIMIT', 'La découpe dépasse la limite de 4 096 composantes. Simplifiez la répartition.')] };
      }
    } catch (error) {
      return { ok: false, errors: [issue(error.message === 'CONTOUR_HOLES_UNSUPPORTED' ? 'CONTOUR_HOLES_UNSUPPORTED' : 'CONTOUR_CLIPPING_FAILED',
        error.message === 'CONTOUR_HOLES_UNSUPPORTED' ? 'La découpe produit un trou intérieur non pris en charge.' : 'La découpe géométrique n’a pas pu être calculée. Vérifiez les sommets du contour.')] };
    }
    if (!pieces.length) return { ok: false, errors: [issue('EMPTY_CONTOUR_LAYOUT', 'Aucun panneau ne couvre ce contour.')] };
    const coverageAreaSqIn = pieces.reduce((sum, p) => sum + p.coverageAreaSqIn, 0);
    if (Math.abs(coverageAreaSqIn - validation.areaSqIn) > Math.max(1e-7, validation.areaSqIn * 1e-10))
      return { ok: false, errors: [issue('CONTOUR_COVERAGE_MISMATCH', 'Les polygones ne couvrent pas exactement la surface du contour.')] };
    return { ok: true, errors: [], warnings, contourIn, pieces, zoneAreaSqIn: validation.areaSqIn, coverageAreaSqIn,
      totalPanelAreaSqIn: pieces.reduce((sum, p) => sum + p.areaSqIn, 0) };
  }
  return Object.freeze({ version: '1.0.0', limits: Object.freeze({ maxVertices: MAX_VERTICES, maxPieces: MAX_PIECES }),
    validateContour, clipLayout, measures, area, bounds, insetFace });
});
