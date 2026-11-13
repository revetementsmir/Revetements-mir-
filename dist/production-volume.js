/* MIR architectural panels: opaque, finished geometry, not a sheet development.
 * A/B include the mounting lips. The face is inset by each lip, then projected
 * by C. Fold radii, material thickness and corner manufacturing are not inferred.
 */
(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MIRProductionVolume = api;
})(typeof window === 'object' ? window : globalThis, function (root) {
  'use strict';
  const finite = Number.isFinite;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
  const sub = (a, b) => a.map((value, index) => value - b[index]);
  const add = (a, b) => a.map((value, index) => value + b[index]);
  const mul = (a, amount) => a.map(value => value * amount);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const length = point => Math.hypot(...point);
  const unit = point => mul(point, 1 / (length(point) || 1));
  const area2 = points => points.reduce((sum, a, index) => { const b = points[(index + 1) % points.length]; return sum + a[0] * b[1] - b[0] * a[1]; }, 0);
  const cleanNumber = number => Math.abs(number) < 1e-8 ? 0 : Math.round(number * 1e8) / 1e8;
  const screenNumber = number => String(Math.round(number * 1000) / 1000);
  const pointString = points => points.map(point => point.slice(0, 2).map(screenNumber).join(',')).join(' ');
  const issue = (code, message, edgeId = null) => ({ code, message, edgeId });
  let renderSequence = 0;

  function safeSwatch(value) {
    if (typeof value !== 'string' || value.length > 500) return null;
    const path = value.startsWith('./') ? value.slice(2) : value;
    const parts = path.split('/');
    if (parts[0] !== 'assets' || parts.length < 2 || parts.some(part =>
      !part || part === '.' || part === '..' || !/^[A-Za-z0-9._-]+$/.test(part))) return null;
    if (!/\.(?:png|jpe?g|webp|avif|gif|svg)$/i.test(parts[parts.length - 1])) return null;
    return path;
  }

  function boundsOf(points) {
    return { minX: Math.min(...points.map(p => p[0])), maxX: Math.max(...points.map(p => p[0])),
      minY: Math.min(...points.map(p => p[1])), maxY: Math.max(...points.map(p => p[1])),
      minZ: Math.min(...points.map(p => p[2] || 0)), maxZ: Math.max(...points.map(p => p[2] || 0)) };
  }

  function normalOf(points) {
    for (let index = 1; index + 1 < points.length; index++) {
      const value = cross(sub(points[index], points[0]), sub(points[index + 1], points[0]));
      if (length(value) > 1e-10) return unit(value);
    }
    return null;
  }

  /** Geometry in millimetres; the outer polygon is ALWAYS the A/B envelope. */
  function buildMesh(model) {
    const errors = [], warnings = [];
    const outer = (model?.pointsMM || []).map(point => Array.isArray(point) ? point.slice(0, 2) : []);
    const result = { valid: false, errors, warnings, outer, front: [], lips: [], faces: [], bounds: null,
      projectionMM: model?.reliefMM ?? null, interpretation: 'lips-included-in-overall' };
    if (model?.kind !== 'panel' || outer.length < 3 || outer.length > 128 ||
      outer.some(point => point.length !== 2 || point.some(value => !finite(value)))) {
      errors.push(issue('PANEL_GEOMETRY_REQUIRED', 'Complétez la largeur et la hauteur du panneau.'));
      return result;
    }
    const bounds = boundsOf(outer), diagonal = Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    const tolerance = Math.max(1e-7, diagonal * 1e-9);
    result.tolerance = tolerance;
    result.bounds = { ...bounds, minZ: 0, maxZ: finite(model.reliefMM) ? model.reliefMM : 0 };
    if (!finite(model.reliefMM) || model.reliefMM < 0) {
      errors.push(issue('PROJECTION_REQUIRED', 'Précisez la projection C; 0 correspond à une pièce plate.'));
    }
    const signedArea = area2(outer), winding = Math.sign(signedArea);
    if (!winding || Math.abs(signedArea) < tolerance * tolerance) {
      errors.push(issue('PANEL_AREA_REQUIRED', 'La forme doit avoir une surface positive.'));
      return result;
    }
    const lines = outer.map((a, index) => {
      const b = outer[(index + 1) % outer.length], edge = model.edges?.[index];
      const direction = sub(b, a), span = length(direction);
      if (span <= tolerance) errors.push(issue('EDGE_COLLAPSED', 'Un côté de la forme est trop court.', edge?.id));
      const inward = [-direction[1] / (span || 1) * winding, direction[0] / (span || 1) * winding];
      const lip = edge?.lipMM;
      if (!finite(lip) || lip < 0) errors.push(issue('LIP_REQUIRED', 'Indiquez la largeur de chaque lip; 0 signifie sans lip.', edge?.id));
      return { a, b, inward, offset: dot(inward, a) + (finite(lip) ? lip : 0),
        lipMM: lip, edgeId: edge?.id || String(index + 1), index };
    });
    if (model.shape === 'polygon') return polygonMesh(result, lines, model, winding, tolerance);
    // The preset shapes are convex. Reject an invalid imported outline rather
    // than drawing an attractive but incorrect inward offset.
    for (const line of lines) {
      if (outer.some(point => dot(line.inward, sub(point, line.a)) < -tolerance)) {
        errors.push(issue('CONVEX_OUTLINE_REQUIRED', 'Cette forme ne permet pas de représenter les retours automatiquement.'));
        break;
      }
    }
    if (errors.length) return result;
    const front = lines.map((current, index) => {
      const previous = lines[(index + lines.length - 1) % lines.length];
      const [a, b] = previous.inward, [c, d] = current.inward, determinant = a * d - b * c;
      if (Math.abs(determinant) < 1e-10) return null;
      return [(previous.offset * d - b * current.offset) / determinant,
        (a * current.offset - previous.offset * c) / determinant];
    });
    const insetInvalid = front.some(point => !point || point.some(value => !finite(value))) ||
      front.some(point => lines.some(line => dot(line.inward, point) < line.offset - tolerance)) ||
      front.some((point, index) => length(sub(front[(index + 1) % front.length], point)) <= tolerance) ||
      Math.sign(area2(front)) !== winding || Math.abs(area2(front)) <= tolerance * tolerance;
    if (insetInvalid) {
      errors.push(issue('LIPS_COLLAPSE_FACE', 'Ces lips ne laissent pas une face valide. Réduisez leur largeur ou augmentez le hors tout.'));
      return result;
    }
    result.front = front.map(point => point.map(cleanNumber));
    const C = model.reliefMM;
    const pushFace = (id, kind, points, edgeId = null) => {
      const normal = normalOf(points);
      if (!normal) return;
      result.faces.push({ id, kind, edgeId, points: points.map(point => point.map(cleanNumber)), normal,
        // Sheet faces are opaque on BOTH sides. The open rear is not a cap.
        doubleSided: true });
    };
    pushFace('face', 'face', front.map(([x, y]) => [x, y, C]));
    for (let index = 0; index < outer.length; index++) {
      const next = (index + 1) % outer.length, line = lines[index];
      const a = outer[index], b = outer[next], qa = front[index], qb = front[next];
      if (C > tolerance) pushFace(`wall-${line.edgeId}`, 'wall', [[...qa, 0], [...qb, 0], [...qb, C], [...qa, C]], line.edgeId);
      const lipPoints = [[...a, 0], [...b, 0], [...qb, 0], [...qa, 0]];
      result.lips.push({ edgeId: line.edgeId, widthMM: line.lipMM, points: lipPoints });
      if (line.lipMM > tolerance) pushFace(`lip-${line.edgeId}`, 'lip', lipPoints, line.edgeId);
    }
    result.valid = true;
    return result;
  }

  function planarSimple(points, tolerance) {
    if (points.length < 3 || points.some(p => p.some(n => !finite(n))) || Math.abs(area2(points)) <= tolerance * tolerance) return false;
    const turn = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const on = (a, b, p) => Math.abs(turn(a, b, p)) <= tolerance * Math.max(1, length(sub(b, a))) && p[0] >= Math.min(a[0], b[0]) - tolerance && p[0] <= Math.max(a[0], b[0]) + tolerance && p[1] >= Math.min(a[1], b[1]) - tolerance && p[1] <= Math.max(a[1], b[1]) + tolerance;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if (length(sub(b, a)) <= tolerance) return false;
      for (let j = i + 1; j < points.length; j++) {
        if (j === i + 1 || i === 0 && j === points.length - 1) continue;
        const c = points[j], d = points[(j + 1) % points.length], x = turn(a, b, c), y = turn(a, b, d), z = turn(c, d, a), t = turn(c, d, b);
        if ((x > tolerance && y < -tolerance || x < -tolerance && y > tolerance) && (z > tolerance && t < -tolerance || z < -tolerance && t > tolerance) || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b)) return false;
      }
    }
    return true;
  }
  function clipPlane(points, normal, offset, tolerance) {
    const result = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length], da = dot(normal, a) - offset, db = dot(normal, b) - offset;
      const insideA = da >= -tolerance, insideB = db >= -tolerance;
      if (insideA) result.push(a.slice());
      if (insideA !== insideB) { const t = da / (da - db); result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return result.filter((p, i) => length(sub(p, result[(i + result.length - 1) % result.length])) > tolerance);
  }
  function polygonMesh(result, lines, model, winding, tolerance) {
    if (result.errors.length) return result;
    const outer = result.outer, convex = lines.every(line => outer.every(p => dot(line.inward, sub(p, line.a)) >= -tolerance));
    if (!planarSimple(outer, tolerance)) { result.errors.push(issue('INVALID_PANEL_POLYGON', 'Le contour doit être simple, sans croisement ni côté nul.')); return result; }
    let front = lines.every(line => line.lipMM === 0) ? outer.map(p => p.slice()) : lines.map((current, i) => {
      const previous = lines[(i + lines.length - 1) % lines.length], [a, b] = previous.inward, [c, d] = current.inward, determinant = a * d - b * c;
      return Math.abs(determinant) < 1e-12 ? null : [(previous.offset * d - b * current.offset) / determinant, (a * current.offset - previous.offset * c) / determinant];
    });
    const matched = front.every(p => p && p.every(finite)) && planarSimple(front, tolerance) && Math.sign(area2(front)) === winding && (!convex || front.every(p => lines.every(line => dot(line.inward, p) >= line.offset - tolerance)));
    let bands = [];
    if (matched) bands = lines.map((line, i) => ({ line, points: [line.a, line.b, front[(i + 1) % front.length], front[i]] }));
    else if (convex) {
      // An edge at a point may disappear after an inset. Sequential half-plane
      // clipping preserves the valid face and partitions the outer lip region.
      front = outer.map(p => p.slice());
      for (const line of lines) {
        const band = clipPlane(front, mul(line.inward, -1), -line.offset, tolerance);
        if (band.length >= 3 && Math.abs(area2(band)) > tolerance * tolerance) bands.push({ line, points: band });
        front = clipPlane(front, line.inward, line.offset, tolerance);
        if (front.length < 3) break;
      }
    } else {
      result.errors.push(issue('CONCAVE_RETURNS_REQUIRE_VALIDATION', 'Le contour de coupe est conservé. Les lips de cet angle rentrant nécessitent un détail d’atelier; le volume n’est pas déduit.'));
      return result;
    }
    if (front.length < 3 || !planarSimple(front, tolerance) || Math.sign(area2(front)) !== winding) {
      result.errors.push(issue('LIPS_COLLAPSE_FACE', 'Ces lips ne laissent pas une face valide. Réduisez leur largeur ou augmentez le hors tout.')); return result;
    }
    bands = bands.map(band => ({ ...band, points: band.points.filter((p, i, all) => length(sub(p, all[(i + all.length - 1) % all.length])) > tolerance) })).filter(band => band.points.length >= 3 && Math.abs(area2(band.points)) > tolerance * tolerance);
    if (!convex) {
      // Accept a concave miter only when the face and every lip form an exact,
      // nonoverlapping partition of the original contour. Narrow/self-crossing
      // offsets are left unresolved; no rectangular substitute is constructed.
      const clipping = typeof module === 'object' && module.exports ? require('./vendor/polygon-clipping/polygon-clipping.umd.min.js') : root?.polygonClipping;
      const polygonArea = multi => multi.reduce((sum, polygon) => sum + Math.abs(area2(polygon[0])) / 2 - polygon.slice(1).reduce((holes, ring) => holes + Math.abs(area2(ring)) / 2, 0), 0);
      const outerArea = Math.abs(area2(outer)) / 2, areaTolerance = Math.max(1e-5, outerArea * 1e-10);
      let validPartition = false;
      if (clipping && bands.every(band => planarSimple(band.points, tolerance))) try {
        const polygons = [front, ...bands.map(band => band.points)], union = clipping.union(...polygons.map(p => [p]));
        const totalArea = polygons.reduce((sum, p) => sum + Math.abs(area2(p)) / 2, 0);
        validPartition = Math.abs(totalArea - outerArea) <= areaTolerance && Math.abs(polygonArea(union) - outerArea) <= areaTolerance && polygonArea(clipping.difference(union, [outer])) <= areaTolerance && polygonArea(clipping.difference([outer], union)) <= areaTolerance;
      } catch (_) { validPartition = false; }
      if (!validPartition) {
        result.errors.push(issue('CONCAVE_RETURNS_REQUIRE_VALIDATION', 'Le contour de coupe est conservé. Les retours se chevauchent ou ne sont pas vérifiables; leur détail doit être validé en atelier.')); return result;
      }
      result.warnings.push(issue('CONCAVE_CORNER_WORKSHOP_VALIDATION', 'Volume géométrique à angles vifs. Les assemblages aux angles rentrants, rayons de pli et découpes de raccord restent à valider en atelier.'));
    }
    const C = model.reliefMM;
    const pushFace = (id, kind, points, edgeId = null) => {
      const normal = normalOf(points); if (!normal) return;
      result.faces.push({ id, kind, edgeId, points: points.map(p => p.map(cleanNumber)), normal, doubleSided: true });
    };
    result.front = front.map(p => p.map(cleanNumber));
    pushFace('face', 'face', front.map(([x, y]) => [x, y, C]));
    for (let i = 0; i < front.length; i++) {
      const a = front[i], b = front[(i + 1) % front.length];
      const source = lines.find(line => Math.abs(dot(line.inward, a) - line.offset) <= tolerance * 4 && Math.abs(dot(line.inward, b) - line.offset) <= tolerance * 4);
      if (C > tolerance) pushFace('wall-' + (source?.edgeId || i + 1), 'wall', [[...a, 0], [...b, 0], [...b, C], [...a, C]], source?.edgeId || null);
    }
    for (const { line, points } of bands) {
      const points3 = points.map(p => [...p, 0]);
      result.lips.push({ edgeId: line.edgeId, widthMM: line.lipMM, points: points3 });
      if (line.lipMM > tolerance) pushFace('lip-' + line.edgeId, 'lip', points3, line.edgeId);
    }
    result.valid = true;
    return result;
  }

  // BSP splitting requires convex primitives. Triangulate a concave planar
  // face while retaining its physical id; internal diagonals are not outlines.
  function convexPrimitives(face) {
    const normal = face.normal || normalOf(face.points), drop = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
    const points = face.points.map(p => p.filter((_, i) => i !== drop)), winding = Math.sign(area2(points));
    const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const tolerance = Math.max(1e-8, Math.abs(area2(points)) * 1e-12);
    if (points.every((p, i) => winding * turn(points[(i + points.length - 1) % points.length], p, points[(i + 1) % points.length]) >= -tolerance)) return [face];
    const remaining = points.map((_, i) => i), parts = [];
    while (remaining.length > 3) {
      let found = false;
      for (let k = 0; k < remaining.length; k++) {
        const a = remaining[(k + remaining.length - 1) % remaining.length], b = remaining[k], c = remaining[(k + 1) % remaining.length];
        if (winding * turn(points[a], points[b], points[c]) <= tolerance) continue;
        if (remaining.some(i => i !== a && i !== b && i !== c && winding * turn(points[a], points[b], points[i]) >= -tolerance && winding * turn(points[b], points[c], points[i]) >= -tolerance && winding * turn(points[c], points[a], points[i]) >= -tolerance)) continue;
        parts.push({ ...face, points: [face.points[a], face.points[b], face.points[c]] }); remaining.splice(k, 1); found = true; break;
      }
      if (!found) return [];
    }
    parts.push({ ...face, points: remaining.map(i => face.points[i]) });
    return parts;
  }

  function planeFor(polygon) {
    const normal = normalOf(polygon.points);
    return normal ? { normal, offset: dot(normal, polygon.points[0]) } : null;
  }
  function classification(polygon, plane, tolerance) {
    let front = false, back = false;
    for (const point of polygon.points) {
      const distance = dot(plane.normal, point) - plane.offset;
      if (distance > tolerance) front = true;
      if (distance < -tolerance) back = true;
    }
    return front && back ? 'split' : front ? 'front' : back ? 'back' : 'coplanar';
  }
  function uniqueVertices(points, tolerance) {
    const out = [];
    for (const point of points) if (!out.length || length(sub(point, out[out.length - 1])) > tolerance) out.push(point);
    if (out.length > 1 && length(sub(out[0], out[out.length - 1])) <= tolerance) out.pop();
    return out;
  }
  function splitPolygon(polygon, plane, tolerance) {
    const front = [], back = [];
    for (let index = 0; index < polygon.points.length; index++) {
      const a = polygon.points[index], b = polygon.points[(index + 1) % polygon.points.length];
      const da = dot(plane.normal, a) - plane.offset, db = dot(plane.normal, b) - plane.offset;
      if (da >= -tolerance) front.push(a);
      if (da <= tolerance) back.push(a);
      if (da > tolerance && db < -tolerance || da < -tolerance && db > tolerance) {
        const intersection = add(a, mul(sub(b, a), da / (da - db)));
        front.push(intersection); back.push(intersection);
      }
    }
    const part = points => {
      const cleaned = uniqueVertices(points, tolerance);
      return cleaned.length >= 3 && normalOf(cleaned) ? { ...polygon, points: cleaned } : null;
    };
    return { front: part(front), back: part(back) };
  }

  // A BSP painter order, rather than sorting average depths. Large front faces
  // cannot reveal a far wall or lip when the panel is rotated through 360°.
  function buildBSP(polygons, tolerance) {
    if (!polygons.length) return null;
    const splitter = polygons[0], plane = planeFor(splitter);
    if (!plane) return buildBSP(polygons.slice(1), tolerance);
    const coplanar = [], front = [], back = [];
    for (const polygon of polygons) {
      const side = classification(polygon, plane, tolerance);
      if (side === 'coplanar') coplanar.push(polygon);
      else if (side === 'front') front.push(polygon);
      else if (side === 'back') back.push(polygon);
      else {
        const halves = splitPolygon(polygon, plane, tolerance);
        if (halves.front) front.push(halves.front);
        if (halves.back) back.push(halves.back);
      }
    }
    return { plane, coplanar, front: buildBSP(front, tolerance), back: buildBSP(back, tolerance) };
  }
  function orderedPolygons(tree, towardCamera, output = []) {
    if (!tree) return output;
    const front = dot(tree.plane.normal, towardCamera) >= 0;
    orderedPolygons(front ? tree.back : tree.front, towardCamera, output);
    output.push(...tree.coplanar);
    orderedPolygons(front ? tree.front : tree.back, towardCamera, output);
    return output;
  }
  function rotation(yaw, pitch) {
    const a = yaw * Math.PI / 180, b = pitch * Math.PI / 180;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    return { towardCamera: [-sa * cb, sb, ca * cb],
      apply([x, y, z]) { const xx = x * ca + z * sa, zz = -x * sa + z * ca; return [xx, y * cb - zz * sb, y * sb + zz * cb]; } };
  }
  function originalEdge(a, b, face, tolerance) {
    for (let index = 0; index < face.points.length; index++) {
      const start = face.points[index], end = face.points[(index + 1) % face.points.length], edge = sub(end, start), square = dot(edge, edge);
      if (square < tolerance * tolerance) continue;
      const onEdge = point => {
        const t = dot(sub(point, start), edge) / square;
        return t >= -tolerance && t <= 1 + tolerance && length(sub(point, add(start, mul(edge, t)))) < tolerance * 4;
      };
      if (onEdge(a) && onEdge(b)) return true;
    }
    return false;
  }

  /** Returns painter-ordered projected polygons; useful for precise QA. */
  function project(model, options = {}) {
    const mesh = buildMesh(model), width = finite(options.width) ? clamp(options.width, 320, 2400) : 800,
      height = finite(options.height) ? clamp(options.height, 300, 1600) : 520;
    const rawYaw = finite(options.yaw) ? options.yaw : -35;
    const yaw = ((rawYaw % 360) + 540) % 360 - 180, pitch = finite(options.pitch) ? clamp(options.pitch, -89, 89) : 23;
    const zoom = finite(options.zoom) ? clamp(options.zoom, .5, 4) : 1;
    const result = { mesh, width, height, yaw, pitch, zoom, polygons: [], scale: 1, projectPoint: null };
    if (!mesh.valid) return result;
    const rotate = rotation(yaw, pitch), b = mesh.bounds;
    const center = [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, model.reliefMM / 2];
    const vertices = mesh.faces.flatMap(face => face.points), rotated = vertices.map(point => rotate.apply(sub(point, center))), pb = boundsOf(rotated);
    const margins = { x: 70, top: 60, bottom: 108 };
    const availableWidth = width - margins.x * 2, availableHeight = height - margins.top - margins.bottom;
    const scale = Math.min(availableWidth / Math.max(pb.maxX - pb.minX, 1e-8), availableHeight / Math.max(pb.maxY - pb.minY, 1e-8)) * zoom;
    const target = [width / 2, margins.top + availableHeight / 2], projectedCenter = [(pb.minX + pb.maxX) / 2, (pb.minY + pb.maxY) / 2];
    const projectPoint = point => {
      const p = rotate.apply(sub(point, center));
      return [target[0] + (p[0] - projectedCenter[0]) * scale, target[1] - (p[1] - projectedCenter[1]) * scale, p[2]];
    };
    const tree = buildBSP(mesh.faces.flatMap(convexPrimitives), mesh.tolerance), faces = new Map(mesh.faces.map(face => [face.id, face]));
    const polygons = orderedPolygons(tree, rotate.towardCamera).map(polygon => {
      const points = polygon.points.map(projectPoint), physicalEdges = [];
      for (let index = 0; index < polygon.points.length; index++) {
        const next = (index + 1) % polygon.points.length;
        if (originalEdge(polygon.points[index], polygon.points[next], faces.get(polygon.id), mesh.tolerance))
          physicalEdges.push([points[index], points[next]]);
      }
      let normal = polygon.normal;
      if (dot(normal, rotate.towardCamera) < 0) normal = mul(normal, -1);
      return { ...polygon, points, physicalEdges, cameraNormal: rotate.apply(normal) };
    }).filter(polygon => Math.abs(area2(polygon.points)) > 1e-5);
    return { ...result, polygons, scale, projectPoint, projectedBounds: pb, towardCamera: rotate.towardCamera };
  }

  function formatMeasurement(mm, unitName, formatter) {
    if (typeof formatter === 'function') return formatter(mm, unitName);
    if (typeof root?.MIRProduction?.formatMeasurement === 'function') return root.MIRProduction.formatMeasurement(mm, unitName);
    if (!finite(mm)) return 'À préciser';
    if (unitName === 'mm') return String(Math.round(mm * 10000) / 10000) + ' mm';
    const inches = mm / 25.4, sixteenths = Math.round(inches * 64);
    if (Math.abs(inches * 64 - sixteenths) < 1e-6) {
      const whole = Math.floor(sixteenths / 64), numerator = sixteenths % 64;
      if (!numerator) return whole + ' po';
      const gcd = (a, b) => b ? gcd(b, a % b) : a, common = gcd(numerator, 64);
      return (whole ? whole + ' ' : '') + numerator / common + '/' + 64 / common + ' po';
    }
    return String(Math.round(inches * 10000) / 10000) + ' po';
  }
  function lighting(normal, kind) {
    const light = unit([-.35, .65, 1]);
    const diffuse = Math.max(0, dot(unit(normal), light));
    const factor = .62 + .38 * diffuse;
    return { factor, lift: kind === 'lip' ? 6 / 255 : 0 };
  }
  function shade(hex, normal, kind) {
    const source = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : '#b7c3ac';
    const rgb = [1, 3, 5].map(index => parseInt(source.slice(index, index + 2), 16));
    const { factor, lift } = lighting(normal, kind);
    // Opaque RGB shading: there is no alpha overlay over another face.
    const values = rgb.map(value => Math.round(clamp(value * factor + lift * 255, 0, 255)));
    return '#' + values.map(value => value.toString(16).padStart(2, '0')).join('');
  }

  function swatchPaints(scene, source, renderId) {
    const paints = new Map(); let definitions = '';
    if (!source || !scene.mesh.valid) return { paints, definitions };
    const box = scene.mesh.bounds, across = box.maxX - box.minX, tall = box.maxY - box.minY;
    for (let index = 0; index < scene.mesh.faces.length; index++) {
      const face = scene.mesh.faces[index], visible = scene.polygons.find(polygon => polygon.id === face.id);
      if (!visible) continue;
      const paintId = `mir-panel-swatch-${renderId}-${index}`, filterId = `${paintId}-light`;
      let origin, along, down;
      if (face.kind === 'wall') {
        // An affine map follows the wall as the piece rotates; all BSP pieces
        // of this physical face keep the same image map, with no texture seams.
        origin = face.points[3];
        along = sub(face.points[2], origin);
        down = sub(face.points[0], origin);
      } else {
        // Face and mounting lips share the outer A/B image map. Grain remains
        // aligned with the panel rather than fixed to the browser viewport.
        origin = [box.minX, box.maxY, face.points[0][2]];
        along = [across, 0, 0]; down = [0, -tall, 0];
      }
      const start = scene.projectPoint(origin), u = sub(scene.projectPoint(add(origin, along)), start), v = sub(scene.projectPoint(add(origin, down)), start);
      const matrix = [u[0], u[1], v[0], v[1], start[0], start[1]].map(screenNumber).join(' ');
      const { factor, lift } = lighting(visible.cameraNormal, face.kind);
      const transform = Math.abs(u[0] * v[1] - u[1] * v[0]) > 1e-8
        ? `patternUnits="userSpaceOnUse" patternContentUnits="userSpaceOnUse" patternTransform="matrix(${matrix})"`
        : 'patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox"';
      // The opaque backing is intentional: even a transparent source image
      // cannot turn the metal translucent. It is neutral, not a made-up RGB
      // match for the manufacturer's named finish.
      definitions += `<pattern id="${paintId}" x="0" y="0" width="1" height="1" ${transform}><rect x="0" y="0" width="1" height="1" fill="#ffffff"/><image href="${esc(source)}" x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern>`;
      definitions += `<filter id="${filterId}" x="-1%" y="-1%" width="102%" height="102%" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="${screenNumber(factor)}" intercept="${screenNumber(lift)}"/><feFuncG type="linear" slope="${screenNumber(factor)}" intercept="${screenNumber(lift)}"/><feFuncB type="linear" slope="${screenNumber(factor)}" intercept="${screenNumber(lift)}"/><feFuncA type="identity"/></feComponentTransfer></filter>`;
      paints.set(face.id, { fill: `url(#${paintId})`, filter: `url(#${filterId})` });
    }
    return { paints, definitions };
  }
  function metadataRows(model, scene, illustrative, formatter) {
    const { width, height } = scene, gutter = 30, column = (width - gutter * 2) / 3,
      labelSize = clamp(width / 800, .5, 1.3) * 12, valueSize = clamp(width / 800, .5, 1.3) * 27;
    const rows = [
      { key: 'A', title: 'LARGEUR HORS TOUT', mm: model?.widthMM },
      { key: 'B', title: 'HAUTEUR HORS TOUT', mm: model?.heightMM },
      { key: 'C', title: 'PROJECTION', mm: model?.reliefMM }
    ];
    return `<g data-panel-dimensions="overall-and-projection">` + rows.map((row, index) => {
      const x = gutter + column * (index + .5);
      return `<text x="${screenNumber(x)}" y="${height - 64}" text-anchor="middle" fill="#66755e" font-size="${screenNumber(labelSize)}" letter-spacing=".8">${row.key} · ${row.title}</text>` +
        `<text x="${screenNumber(x)}" y="${height - 29}" text-anchor="middle" fill="#283b2d" font-size="${screenNumber(valueSize)}" font-weight="600">${esc(illustrative ? 'À saisir' : formatMeasurement(row.mm, model?.unit, formatter))}</text>`;
    }).join('') + '</g>';
  }

  function render(model, options = {}) {
    const scene = project(model, options), { width, height, mesh } = scene;
    const illustrative = options.illustrative === true, renderId = ++renderSequence;
    // Older model normalization retains swatchUrl in spec.finish only.
    const swatch = [options.swatchUrl, model?.finish?.swatchUrl, model?.spec?.finish?.swatchUrl]
      .map(safeSwatch).find(Boolean) || null;
    const texture = swatchPaints(scene, swatch, renderId);
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(model?.name || 'Panneau')} — volume opaque; lips inclus dans le hors tout" font-family="Arial,sans-serif" data-panel-volume="opaque" data-yaw="${screenNumber(scene.yaw)}" data-pitch="${screenNumber(scene.pitch)}" data-zoom="${screenNumber(scene.zoom)}">`;
    svg += `<title>${esc(model?.name || 'Panneau')} — largeur et hauteur hors tout, projection C</title>`;
    svg += '<desc>Les lèvres périphériques sont incluses dans la largeur et la hauteur hors tout. La face avance de C. Les faces sont opaques; les coins et rayons de fabrication restent à valider.</desc>';
    svg += `<text x="${width / 2}" y="31" text-anchor="middle" font-size="12" letter-spacing="1" fill="#6f8064">${illustrative ? 'PROPORTIONS DU MODÈLE · COTES À SAISIR' : 'GLISSEZ POUR TOURNER LA PIÈCE'}</text>`;
    if (!mesh.valid) {
      svg += `<g data-geometry-error="${esc(mesh.errors[0]?.code || 'GEOMETRY_INVALID')}"><text x="${width / 2}" y="${height * .39}" text-anchor="middle" fill="#6f4e32" font-size="23" font-weight="600">Le volume attend vos cotes.</text>`;
      const message = mesh.errors[0]?.message || 'Vérifiez les dimensions du panneau.';
      const words = message.split(' '), lines = []; let line = '';
      for (const word of words) { if ((line + ' ' + word).trim().length > 58) { lines.push(line); line = word; } else line = (line + ' ' + word).trim(); }
      if (line) lines.push(line);
      svg += lines.map((text, index) => `<text x="${width / 2}" y="${height * .39 + 37 + index * 27}" text-anchor="middle" fill="#6f6d60" font-size="19">${esc(text)}</text>`).join('') + '</g>';
    } else {
      // Clip only the drawing when zooming; the three dimensions stay readable.
      const clipId = 'mir-panel-volume-clip-' + renderId;
      svg += `<defs><clipPath id="${clipId}"><rect x="16" y="46" width="${width - 32}" height="${height - 140}"/></clipPath>${texture.definitions}</defs><g clip-path="url(#${clipId})" data-panel-faces="true"${swatch ? ` data-local-swatch="${esc(swatch)}"` : ''}>`;
      for (const polygon of scene.polygons) {
        const paint = texture.paints.get(polygon.id), fill = paint?.fill || shade(model?.finish?.hex, polygon.cameraNormal, polygon.kind);
        svg += `<polygon data-surface="${esc(polygon.id)}" data-surface-kind="${polygon.kind}" points="${pointString(polygon.points)}" fill="${fill}" stroke="${fill}" stroke-width="0.35" stroke-linejoin="round"${paint ? ` filter="${paint.filter}"` : ''}/>`;
        for (const [a, b] of polygon.physicalEdges) {
          svg += `<path d="M${screenNumber(a[0])},${screenNumber(a[1])}L${screenNumber(b[0])},${screenNumber(b[1])}" fill="none" stroke="#4b5b46" stroke-width="1.15" stroke-linecap="round"/>`;
        }
      }
      if (!scene.polygons.length) {
        // A flat sheet exactly edge-on has a line silhouette, not a fictitious
        // volume or transparent face. Known C=0 remains zero.
        const outline = mesh.outer.map(([x, y]) => scene.projectPoint([x, y, 0]));
        svg += `<polyline data-panel-edge-on="true" points="${pointString([...outline, outline[0]])}" fill="none" stroke="#4b5b46" stroke-width="1.5"/>`;
      }
      svg += '</g>';
    }
    svg += metadataRows(model, scene, illustrative, options.formatMeasurement);
    return svg + '</svg>';
  }

  return Object.freeze({ version: '1.0.0', buildMesh, project, render });
});
