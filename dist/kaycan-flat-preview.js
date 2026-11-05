/* MIR — aperçu de couleur unie à partir des images de référence Kaycan et MAC Métal.
 * Le fabricant ne fournit pas de code hexadécimal officiel dans notre catalogue.
 * Le résultat est seulement une approximation locale d'écran et n'est jamais
 * enregistré comme couleur certifiée dans les commandes ou fiches de production.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIRKaycanFlatPreview = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const cache = new Map(), loading = new Set();
  const asset = url => typeof url === 'string' &&
    /^(?:\.\/)?assets\/catalogue-swatches\/[a-z0-9._/-]+\.(?:webp|jpe?g|png)$/i.test(url);

  function isKaycan(finish) {
    return String(finish?.manufacturer || '').trim().toLowerCase() === 'kaycan';
  }
  function isMAC(finish) {
    const name=String(finish?.manufacturer||'').trim().normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return name==='mac metal architectural'||name==='mac metal';
  }
  function isFlatPreview(finish) { return isKaycan(finish)||isMAC(finish); }
  function get(url) { return asset(url) ? cache.get(url) || null : null; }

  // La médiane d'un carré central atténue les lignes, reliefs et perforations
  // présents dans une photographie de produit sans les reproduire sur la tôle.
  function medianRgb(data, width, height) {
    if (!data || width < 1 || height < 1 || data.length < width * height * 4) return null;
    const channels = [[], [], []];
    const minX = Math.floor(width * .2), maxX = Math.ceil(width * .8);
    const minY = Math.floor(height * .2), maxY = Math.ceil(height * .8);
    for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) {
      const p = (y * width + x) * 4;
      if (data[p + 3] < 192) continue;
      for (let n = 0; n < 3; n++) channels[n].push(data[p + n]);
    }
    if (channels[0].length < 5) return null;
    const median = values => {
      values.sort((a,b) => a-b);
      return values[Math.floor(values.length / 2)];
    };
    return '#' + channels.map(values => median(values).toString(16).padStart(2,'0')).join('');
  }

  function sample(url, callback) {
    if (!asset(url) || typeof Image === 'undefined' || typeof document === 'undefined') return null;
    if (cache.has(url)) return cache.get(url);
    if (loading.has(url)) return null;
    loading.add(url);
    const img = new Image();
    img.onload = () => {
      let color = null;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 40;
        const ctx = canvas.getContext('2d', {willReadFrequently:true});
        ctx.drawImage(img, 0, 0, 40, 40);
        color = medianRgb(ctx.getImageData(0, 0, 40, 40).data, 40, 40);
      } catch (_) { /* Aperçu neutre si l'image ne peut pas être lue. */ }
      loading.delete(url);
      cache.set(url, color);
      if (typeof callback === 'function') callback(color);
    };
    img.onerror = () => {
      loading.delete(url);
      cache.set(url, null);
      if (typeof callback === 'function') callback(null);
    };
    img.src = url;
    return null;
  }

  function foreground(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return '#334c3a';
    const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
    return rgb[0]*.299 + rgb[1]*.587 + rgb[2]*.114 < 130 ? '#ffffff' : '#203526';
  }
  return Object.freeze({version:'1.1.0',isKaycan,isMAC,isFlatPreview,get,sample,medianRgb,foreground});
});
