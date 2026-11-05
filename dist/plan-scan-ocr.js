/* Reads plan titles and dimension labels from image-only PDF sheets. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIRScanOCR = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const overviewEdge = 2550;
  const detailEdge = 6600;
  const maxTileWidth = 3100;
  const maxTileHeight = 2200;
  const overlap = 110;

  function canvas(width, height) {
    if (typeof document !== 'object') return require('@napi-rs/canvas').createCanvas(width, height);
    const result = document.createElement('canvas');
    result.width = width;
    result.height = height;
    return result;
  }

  function bounds(region, scale, viewport) {
    const [x, y, width, height] = region;
    const left = Math.max(0, Math.floor(x * scale));
    const top = Math.max(0, Math.floor(y * scale));
    const right = Math.min(Math.ceil(viewport.width), Math.ceil((x + width) * scale));
    const bottom = Math.min(Math.ceil(viewport.height), Math.ceil((y + height) * scale));
    return [left, top, right - left, bottom - top];
  }

  function spans(start, length, maximum) {
    const count = Math.max(1, Math.ceil((length - overlap) / (maximum - overlap)));
    const step = Math.ceil(length / count);
    return Array.from({ length: count }, (_, i) => {
      const left = Math.max(start, start + i * step - overlap / 2);
      const right = Math.min(start + length, start + (i + 1) * step + overlap / 2);
      return [left, right - left];
    });
  }

  function tiles([x, y, width, height]) {
    return spans(y, height, maxTileHeight).flatMap(([top, h]) =>
      spans(x, width, maxTileWidth).map(([left, w]) => [left, top, w, h]));
  }

  function sideStrips([x, y, width, height]) {
    // Vertical dimensions usually run down either side of a drawing. Keep
    // nearby notes and the drawing margin in the scan for each direction.
    const edge = Math.ceil(width * .43);
    return [[x, y, edge, height], [x + width - edge, y, edge, height]].flatMap(tiles);
  }

  async function raster(page, viewport, [x, y, width, height]) {
    const image = canvas(width, height);
    try {
      await page.render({
        canvasContext: image.getContext('2d', { willReadFrequently: true }), viewport,
        transform: [1, 0, 0, 1, -x, -y], background: '#fff', annotationMode: 0
      }).promise;
      return image;
    } catch (error) {
      image.width = image.height = 1;
      throw error;
    }
  }

  async function read(worker, image, [x, y, width, height], scale, orientation = '') {
    let input = image;
    try {
      if (orientation) {
        input = canvas(height, width);
        const ctx = input.getContext('2d');
        if (orientation === 'cw') { ctx.translate(height, 0); ctx.rotate(Math.PI / 2); }
        else { ctx.translate(0, width); ctx.rotate(-Math.PI / 2); }
        ctx.drawImage(image, 0, 0);
      }
      const { data } = await worker.recognize(input, {}, { blocks: true });
      const words = [], rows = [];
      const record = ({ text, bbox, confidence }) => {
        if (!text?.trim() || !bbox) return null;
        const { x0, y0, x1, y1 } = bbox;
        let box = [x0, y0, x1, y1];
        if (orientation === 'cw') box = [y0, height - x1, y1, height - x0];
        if (orientation === 'ccw') box = [width - y1, x0, width - y0, x1];
        return { text: text.trim(), box: box.map((point, i) => (point + (i % 2 ? y : x)) / scale),
          confidence, source: 'ocr', ...(orientation && { orientation }) };
      };
      for (const block of data.blocks || []) for (const paragraph of block.paragraphs || [])
        for (const line of paragraph.lines || []) {
          const row = record(line);
          if (row) rows.push(row);
          for (const word of line.words || []) {
            const value = record(word);
            if (value) words.push(value);
          }
        }
      return { words, rows, text: data.text || '' };
    } finally {
      if (input !== image) input.width = input.height = 1;
    }
  }

  function distinct(words, scale) {
    const buckets = new Map(), result = [], step = 32 / scale;
    for (const word of words.sort((a, b) => b.confidence - a.confidence)) {
      const [left, top, right, bottom] = word.box;
      const x = Math.floor((left + right) / 2 / step), y = Math.floor((top + bottom) / 2 / step);
      const key = (a, b) => `${word.orientation || ''}:${a}:${b}`;
      let duplicate = false;
      for (let row = y - 1; row <= y + 1 && !duplicate; row++) for (let col = x - 1; col <= x + 1 && !duplicate; col++) {
        duplicate = (buckets.get(key(col, row)) || []).some(([l, t, r, b]) => {
          const shared = Math.max(0, Math.min(right, r) - Math.max(left, l)) * Math.max(0, Math.min(bottom, b) - Math.max(top, t));
          return shared > .75 * Math.max((right - left) * (bottom - top), (r - l) * (b - t));
        });
      }
      if (duplicate) continue;
      const bucket = key(x, y);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(word.box);
      result.push(word);
    }
    return result;
  }

  async function scan(page, base, { worker, mode = 'overview', regions, vertical = false, cancelled = () => false, hasTitles }) {
    const detail = mode === 'detail';
    const scale = Math.min(3, (detail ? detailEdge : overviewEdge) / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const areas = (detail && regions?.length ? regions : [[0, 0, base.width, base.height]])
      .map(region => bounds(region, scale, viewport)).filter(([, , w, h]) => w >= 16 && h >= 16);
    const passes = [
      { boxes: detail ? areas.flatMap(tiles) : areas, orientations: [''] },
      { boxes: detail && vertical ? areas.flatMap(sideStrips) : [], orientations: ['cw', 'ccw'] }
    ];
    const words = [], rows = [], verticalWords = [], texts = [];
    async function recognize(box, view, imageScale, orientations) {
      if (cancelled()) return;
      const image = await raster(page, view, box);
      try {
        for (const orientation of orientations) {
          if (cancelled()) return;
          const result = await read(worker, image, box, imageScale, orientation);
          if (orientation) verticalWords.push(...result.words);
          else { words.push(...result.words); rows.push(...result.rows); texts.push(result.text); }
        }
      } finally { image.width = image.height = 1; }
    }
    for (const { boxes, orientations } of passes) for (const box of boxes) await recognize(box, viewport, scale, orientations);
    if (!detail && hasTitles && !cancelled() && !hasTitles({ rows, words, text: texts.join('\n') })) {
      const { width, height } = base;
      const retryScale = Math.min(3, 4450 / Math.max(width, height));
      if (retryScale > scale) {
        const retryView = page.getViewport({ scale: retryScale });
        // Small drawing labels are often below the drawing or in the lower
        // cartouche. Retry those bands before moving to the next page.
        const titleBands = [[.8 * width, .61 * height, .2 * width, .38 * height], [.1 * width, .55 * height, .7 * width, .44 * height]];
        for (const band of titleBands) {
          await recognize(bounds(band, retryScale, retryView), retryView, retryScale, ['']);
          if (cancelled() || hasTitles({ rows, words, text: texts.join('\n') })) break;
        }
      }
    }
    if (cancelled()) return { words: [], rows: [], verticalWords: [], text: '' };
    return { words: detail || texts.length > 1 ? distinct(words, scale) : words, rows,
      verticalWords: distinct(verticalWords, scale), text: texts.join('\n') };
  }

  return { scan };
});
