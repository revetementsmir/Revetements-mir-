/* Locates the wall drawing on an elevation sheet in page pixels. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIRFacadeVisual = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const overlap = (a, b, c, d) => Math.max(0, Math.min(b, d) - Math.max(a, c));

  function scan(image, bounds) {
    const [x0, y0, width, height] = bounds, stride = width + 1;
    const gray = new Uint8Array(width * height);
    const contrast = new Uint8Array(width * height);
    const density = new Uint32Array(stride * (height + 1));
    const vertical = new Uint16Array(width * (height + 1));
    const lines = [], pixels = image.data, radius = clamp(Math.round(width / 780), 2, 4);
    const gap = clamp(Math.round(width / 330), 3, 8), minLine = Math.max(32, width * .105);
    for (let y = 0, i = 0; y < height; y++) {
      let src = ((y + y0) * image.width + x0) * 4;
      for (let x = 0; x < width; x++, src += 4, i++) {
        const r = pixels[src], g = pixels[src + 1], b = pixels[src + 2], alpha = pixels[src + 3];
        const level = alpha < 100 ? 255 : (r + 2 * g + b) >> 2;
        gray[i] = level;
        contrast[i] = alpha >= 100 && level < 239 && Math.max(r, g, b) - Math.min(r, g, b) >= 14 ? 1 : 0;
      }
    }
    for (let y = 0; y < height; y++) {
      const row = y * width, up = Math.max(0, y - radius) * width, down = Math.min(height - 1, y + radius) * width;
      const sumRow = y * stride, nextSum = sumRow + stride;
      let lineStart = 0, previous = -gap - 1, hits = 0, rowSum = 0;
      const keepRun = () => {
        const length = previous - lineStart + 1;
        if (length >= minLine && hits / length >= .38) lines.push({ left: lineStart, right: previous + 1, y, quality: hits / length });
      };
      for (let x = 0; x < width; x++) {
        const i = row + x, level = gray[i], dark = level < 226;
        rowSum += (dark || contrast[i] ? 1 : 0) + contrast[i];
        density[nextSum + x + 1] = density[sumRow + x + 1] + rowSum;
        const across = Math.max(gray[row + Math.max(0, x - radius)], gray[row + Math.min(width - 1, x + radius)]);
        vertical[i + width] = vertical[i] + (level < 242 && across - level >= 12 ? 1 : 0);
        if (level >= 242 || Math.max(gray[up + x], gray[down + x]) - level < 12) continue;
        if (x - previous > gap) { keepRun(); lineStart = x; hits = 0; }
        previous = x;
        hits++;
      }
      keepRun();
    }
    const area = (a, t, b, d) => {
      if (a >= b || t >= d) return 0;
      a = clamp(a, 0, width); b = clamp(b, 0, width); t = clamp(t, 0, height); d = clamp(d, 0, height);
      if (a >= b || t >= d) return 0;
      return (density[d * stride + b] - density[d * stride + a] - density[t * stride + b] + density[t * stride + a]) / ((b - a) * (d - t));
    };
    const verticalInk = (x, t, d) => {
      let best = 0;
      for (let i = Math.max(0, x - radius); i < Math.min(width, x + radius + 1); i++) {
        best = Math.max(best, vertical[d * width + i] - vertical[t * width + i]);
      }
      return best / (d - t);
    };
    return { lines, area, verticalInk, radius };
  }

  function facadeBox(image, crop, anchors, ratio) {
    if (!image?.data || !Array.isArray(crop) || crop.length !== 4 || !crop.every(Number.isFinite)) return null;
    const x0 = clamp(Math.round(crop[0]), 0, image.width), y0 = clamp(Math.round(crop[1]), 0, image.height);
    const width = clamp(Math.round(crop[0] + crop[2]) - x0, 0, image.width - x0);
    const height = clamp(Math.round(crop[1] + crop[3]) - y0, 0, image.height - y0);
    if (width < 80 || height < 60 || width * height > 12000000 || height > 65535) return null;
    const levels = anchors?.levels;
    const guide = name => {
      const line = levels?.[name]?.line;
      return line && Number.isFinite(line.y) && line.y >= y0 && line.y < y0 + height ? Math.round(line.y - y0) : null;
    };
    const eaves = guide('eaves'), grade = guide('grade'), ridge = guide('ridge');
    const spans = anchors?.span;
    const known = spans && Number.isFinite(spans.start) && Number.isFinite(spans.end) && spans.start >= x0 && spans.end <= x0 + width && spans.end - spans.start > 30
      ? [Math.round(spans.start - x0), Math.round(spans.end - x0)] : null;
    const expected = Number.isFinite(ratio) && ratio >= .20 && ratio <= 14 ? ratio : null;
    if (!known && !expected && (eaves === null || grade === null)) return null;

    const { lines, area, verticalInk, radius } = scan(image, [x0, y0, width, height]);
    // A thick line can produce several adjacent rows. Keep a representative
    // line without losing a shorter wall boundary nested inside a roof line.
    const strength = line => (line.right - line.left) * (.65 + .35 * line.quality);
    const strong = [];
    for (const line of [...lines].sort((a, b) => strength(b) - strength(a))) {
      if (strong.some(other => Math.abs(line.y - other.y) <= radius * 2 &&
        Math.abs(line.left - other.left) <= radius * 3 && Math.abs(line.right - other.right) <= radius * 3)) continue;
      strong.push(line);
      if (strong.length >= 100) break;
    }
    const guideRadius = Math.max(7, Math.round(height * .016));
    const byGuide = y => y === null ? strong : [
      { y, left: 0, right: width, quality: .28, guide: true },
      ...strong.filter(line => Math.abs(line.y - y) <= guideRadius)
    ];
    const tops = byGuide(eaves), bottoms = byGuide(grade);
    const results = [];
    const pairs = [];
    for (const top of tops) for (const bottom of bottoms) {
      const h = bottom.y - top.y, w = known ? known[1] - known[0] : expected && h * expected;
      if (h < Math.max(36, height * .09) || h > height * .9 || (ridge !== null && top.y < ridge + 3)) continue;
      if (w && (w < Math.max(46, width * .11) || w > width * 1.07)) continue;
      const common = overlap(top.left, top.right, bottom.left, bottom.right);
      if (common < Math.max(34, width * .09, w ? w * .42 : 0)) continue;
      const hScore = (eaves === null ? 0 : 1 - Math.abs(top.y - eaves) / guideRadius) + (grade === null ? 0 : 1 - Math.abs(bottom.y - grade) / guideRadius);
      const broadness = (Math.min(top.right - top.left, bottom.right - bottom.left) + common * .6) / width;
      const left = Math.max(top.left, bottom.left), right = Math.min(top.right, bottom.right);
      const detail = area(left, top.y + Math.round(h * .12), right, bottom.y - Math.round(h * .12));
      if (detail < .009) continue;
      pairs.push({ top, bottom, w, hScore, order: hScore * .28 + broadness + Math.min(detail, .7) * .32 + h / height * .7 });
    }
    pairs.sort((a, b) => b.order - a.order);
    // Evaluate likely pairs first, retaining only distinct bands. This bounds
    // the work on dense sheets with hundreds of dimension and border lines.
    const selected = [];
    for (const pair of pairs) {
      if (selected.some(other => Math.abs(pair.top.y - other.top.y) <= radius && Math.abs(pair.bottom.y - other.bottom.y) <= radius &&
        Math.abs(pair.top.left - other.top.left) <= radius * 3 && Math.abs(pair.top.right - other.top.right) <= radius * 3)) continue;
      const h = pair.bottom.y - pair.top.y;
      const upperLines = strong.filter(line => line.y < pair.top.y - h * .12 && line.y > pair.top.y - h * .92 && line.quality >= .75);
      selected.push({ ...pair, upperLines });
      if (selected.length >= 82) break;
    }

    function score(left, right, pair) {
      const { top, bottom, w: targetWidth, hScore, upperLines } = pair;
      const t = top.y, b = bottom.y, h = b - t, w = right - left;
      if (w < Math.max(45, width * .11) || w / h < .19 || w / h > 14.5) return;
      if (targetWidth && !known && Math.abs(w / targetWidth - 1) > .135) return;
      const alongTop = overlap(left, right, top.left, top.right) / w;
      const alongBottom = overlap(left, right, bottom.left, bottom.right) / w;
      if (alongTop < .61 || alongBottom < .52) return;
      const margin = Math.max(5, Math.round(w * .035));
      const yInset = Math.max(3, Math.round(h * .065));
      const tIn = t + yInset, bIn = b - yInset;
      const interior = area(left + margin, tIn, right - margin, bIn);
      if (interior < .009) return;
      const leftEdge = verticalInk(left, tIn, bIn), rightEdge = verticalInk(right, tIn, bIn);
      const leftChange = area(left + radius, tIn, left + margin, bIn) - area(left - margin, tIn, left - radius, bIn);
      const rightChange = area(right - margin, tIn, right - radius, bIn) - area(right + radius, tIn, right + margin, bIn);
      if (Math.min(leftEdge + Math.max(0, leftChange), rightEdge + Math.max(0, rightChange)) < (known ? .085 : .18)) return;
      // Saturated siding transitions can also divide materials inside a
      // wall. Cap their influence so the full exterior enclosure can win.
      const sideScore = (leftEdge + rightEdge) * .33 + (clamp(leftChange, 0, .4) + clamp(rightChange, 0, .4)) * .39;
      const under = area(left + margin, b + radius, right - margin, b + yInset + radius);
      const above = area(left + margin, t - yInset - radius, right - margin, t - radius);
      const nearBottom = area(left + margin, b - yInset - radius, right - margin, b - radius);
      const nearTop = area(left + margin, t + radius, right - margin, t + yInset + radius);
      const breaks = clamp(nearBottom - under, -.6, .65) * .74 + clamp(nearTop - above, -.6, .65) * .30 - Math.min(under, .8) * .80;
      // Penalize a stripe embedded between matching siding/floors.
      const topMatch = top.guide ? 0 : clamp(1 - (Math.abs(left - top.left) + Math.abs(right - top.right)) / (w * .16), 0, 1);
      const bottomReach = bottom.guide ? 0 : Math.min(1.4, (bottom.right - bottom.left) / w) * bottom.quality;
      // Overall dimension strings often repeat the wall endpoints above
      // the roof. Use that visual agreement as a hint, even without OCR.
      let upperMatch = 0;
      if (!known) for (const line of upperLines) {
        upperMatch = Math.max(upperMatch, line.quality * clamp(1 - (Math.abs(left - line.left) + Math.abs(right - line.right)) / (w * .09), 0, 1));
      }
      const supporting = (alongTop * top.quality + alongBottom * bottom.quality) * .32 + hScore * .14 + topMatch * .55 + bottomReach * .17 + upperMatch * .27;
      const ratioScore = targetWidth && !known ? -Math.abs(w / targetWidth - 1) * 2.4 : 0;
      const coverage = Math.min(interior, .65) * .32 + (h / height + w / width) * .42;
      const value = sideScore + breaks + supporting + ratioScore + coverage;
      if (value > (known ? .48 : .75)) results.push({ left, right, t, b, value });
    }

    for (const pair of selected) {
      const { top, bottom, w: targetWidth } = pair;
      if (known) { score(known[0], known[1], pair); continue; }
      const h = bottom.y - top.y;
      const step = Math.max(2, radius), pad = Math.max(step, Math.round((targetWidth || h) * .037));
      const t = top.y + Math.max(3, Math.round(h * .065)), b = bottom.y - Math.max(3, Math.round(h * .065));
      const left = [], right = [];
      const start = Math.max(0, Math.min(top.left, bottom.left) - pad), end = Math.min(width, Math.max(top.right, bottom.right) + pad);
      for (let x = start; x <= end; x += step) {
        const edge = verticalInk(x, t, b);
        const jump = area(x + radius, t, x + pad, b) - area(x - pad, t, x - radius, b);
        if (edge + Math.abs(jump) < .16) continue;
        left.push({ x, quality: edge * .65 + jump * .77 });
        right.push({ x, quality: edge * .65 - jump * .77 });
      }
      const best = (values, candidates) => {
        values.sort((a, b) => b.quality - a.quality);
        const picked = [];
        for (const point of values) {
          if (picked.every(x => Math.abs(x - point.x) > step * 2)) picked.push(point.x);
          if (picked.length >= 22) break;
        }
        return [...new Set([...picked, ...candidates])];
      };
      const lefts = best(left, [top.left, bottom.left]), rights = best(right, [top.right, bottom.right]);
      for (const l of lefts) for (const r of rights) score(l, r, pair);
    }
    results.sort((a, b) => b.value - a.value);
    const best = results[0];
    if (!best) return null;
    const w = best.right - best.left, h = best.b - best.t;
    if (results.some(other => other.value >= best.value - .075 &&
      (overlap(best.left, best.right, other.left, other.right) < .8 * Math.max(w, other.right - other.left) ||
        overlap(best.t, best.b, other.t, other.b) < .80 * Math.max(h, other.b - other.t)))) return null;
    return { box: [x0 + best.left, y0 + best.t, w, h], source: known ? 'dimension-guides' : 'elevation-outline' };
  }

  function detect({ image, crop, anchors, ratio } = {}) {
    return facadeBox(image, crop || (image && [0, 0, image.width, image.height]), anchors, ratio);
  }

  // The PDF guides identify the upper edge of the foundation and the
  // finished grade. Where two materials have different levels, use the
  // common visible band under the lower guide rather than coating siding.
  function foundation({image,box,anchors}={}){
    if(!Array.isArray(box)||box.length!==4||!box.every(Number.isFinite))return null;
    const [x,y,width,height]=box,bottom=y+height;
    const grade=anchors?.levels?.grade?.line?.y;
    const tolerance=Math.max(4,height*.047);
    if(Number.isFinite(grade)&&Math.abs(grade-bottom)<=tolerance){
      const validTop=top=>Number.isFinite(top)&&grade-top>=Math.max(2,height*.008)&&grade-top<=height*.31;
      const choices=(anchors.levels.foundations||[]).map(level=>{
        if(validTop(level.line?.y))return level.line.y;
        if(!validTop(level.y)||!image?.data)return null;
        // Captions sometimes sit on a dotted leader that OCR cannot trace.
        // Require the source drawing to corroborate the candidate level.
        const pad=Math.max(3,Math.round(height*.012)),start=Math.max(0,Math.round(level.y)-pad);
        const rows=Math.min(image.height-start,pad*2+1);
        if(rows<3)return null;
        const sample=scan(image,[x,start,width,rows]).lines
          .filter(edge=>edge.right-edge.left>width*.4&&edge.quality>.52);
        return sample.length?start+sample.sort((a,b)=>(b.right-b.left)-(a.right-a.left))[0].y:null;
      }).filter(validTop);
      if(choices.length){
        const top=Math.max(...choices);
        return {box:[x,top,width,grade-top],source:'pdf-foundation-guides',multipleLevels:choices.some(other=>top-other>3)};
      }
    }
    if(!image?.data||width<80||height<60||x<0||y<0||x+width>image.width||bottom>image.height)return null;
    const depth=Math.round(height*.25),start=bottom-depth;
    const {lines,area,verticalInk,radius}=scan(image,[x,start,width,depth]);
    const inset=Math.round(width*.06),sample=Math.max(4,Math.round(height*.019));
    const candidates=[];
    for(const edge of lines){
      if(edge.y<sample+radius||edge.y>depth-sample*2||edge.right-edge.left<width*.67||edge.quality<.7)continue;
      const top=area(inset,edge.y-sample-radius,width-inset,edge.y-radius);
      const below=area(inset,edge.y+radius,width-inset,edge.y+sample+radius);
      const base=area(inset,depth-sample,width-inset,depth-1);
      // A siding/brick hatch must stop above a comparatively quiet concrete
      // field bounded by the same two exterior walls.
      const sides=Math.min(verticalInk(edge.left,edge.y+radius,depth),verticalInk(edge.right-1,edge.y+radius,depth));
      if(top<.09||below>top*.48||base>top*.55||top-below<.065||sides<.19)continue;
      candidates.push({y:edge.y,score:(top-below)*2+sides*.45+edge.quality*.1});
    }
    candidates.sort((a,b)=>b.score-a.score);
    const best=candidates[0];
    if(!best||candidates.some(other=>Math.abs(other.y-best.y)>sample&&other.score>best.score-.11))return null;
    return {box:[x,start+best.y,width,depth-best.y],source:'pdf-pixel-transition',needsReview:true};
  }

  return Object.freeze({ detect, foundation });

});
