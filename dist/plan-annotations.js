(() => {
  'use strict';
  if (!new URLSearchParams(location.search).has('annoter')) return;

  const panel = document.createElement('aside');
  panel.className = 'mir-annotations';
  panel.setAttribute('aria-label', 'Annotations du Studio');
  panel.innerHTML = `
    <strong>Annotations du Studio</strong>
    <button type="button" aria-pressed="false">Pointer un élément</button>
    <p role="status">Active le pointeur, puis clique sur un élément de la page.</p>
    <label>Note<textarea rows="2"></textarea></label>
    <button type="button" disabled>Ajouter</button>
    <button type="button" disabled>Copier les notes</button>
    <ol></ol>
    <textarea hidden readonly aria-label="Notes à copier manuellement"></textarea>`;
  document.body.append(panel);
  const [point, add, copy] = panel.querySelectorAll('button');
  const [note, manual] = panel.querySelectorAll('textarea');
  const status = panel.querySelector('p');
  const list = panel.querySelector('ol');
  const reticle = document.createElement('div');
  reticle.className = 'mir-annotation-reticle';
  const pin = document.createElement('div');
  pin.className = 'mir-annotation-pin';
  const lens = document.createElement('canvas');
  lens.className = 'mir-annotation-lens';
  lens.width = lens.height = 144;
  for (const guide of [reticle, pin, lens]) {
    guide.hidden = true;
    guide.setAttribute('aria-hidden', 'true');
    document.body.append(guide);
  }
  const notes = [];
  let picking = false;
  let selection;
  let highlighted;
  let anchor;

  function place(guide, x, y) {
    guide.style.left = x + 'px';
    guide.style.top = y + 'px';
  }

  function placePin() {
    if (!anchor?.target.isConnected) { pin.hidden = true; return; }
    const box = anchor.target.getBoundingClientRect();
    pin.hidden = !box.width || !box.height;
    place(pin, box.left + anchor.x * box.width, box.top + anchor.y * box.height);
  }

  window.addEventListener('scroll', placePin, {capture:true, passive:true});
  window.addEventListener('resize', placePin);
  document.addEventListener('pointermove', event => {
    reticle.hidden = lens.hidden = true;
    if (!picking || panel.contains(event.target)) return;
    place(reticle, event.clientX, event.clientY);
    reticle.hidden = false;
    const canvas = event.target.closest('#three-canvas');
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height || !canvas.width || !canvas.height) return;
    const ctx = lens.getContext('2d');
    const size = 48;
    ctx.clearRect(0, 0, 144, 144);
    ctx.drawImage(canvas,
      (event.clientX - box.left - size/2) * canvas.width/box.width,
      (event.clientY - box.top - size/2) * canvas.height/box.height,
      size * canvas.width/box.width, size * canvas.height/box.height, 0, 0, 144, 144);
    ctx.strokeStyle = '#0079e8';
    ctx.beginPath();
    ctx.moveTo(60, 72); ctx.lineTo(84, 72);
    ctx.moveTo(72, 60); ctx.lineTo(72, 84);
    ctx.stroke();
    place(lens, event.clientX + 164 < innerWidth ? event.clientX + 16 : event.clientX - 160,
      Math.max(0, Math.min(innerHeight - 148, event.clientY + 16)));
    lens.hidden = false;
  }, {passive:true});
  document.documentElement.addEventListener('pointerleave', () => { reticle.hidden = lens.hidden = true; });

  function setPicking(active) {
    picking = active;
    point.setAttribute('aria-pressed', String(active));
    document.body.classList.toggle('mir-annotation-picking', active);
    reticle.hidden = lens.hidden = true;
    if (active) status.textContent = 'Vise avec la croix, puis clique. Échap annule la sélection.';
  }
  point.onclick = () => setPicking(!picking);
  note.oninput = () => { add.disabled = !selection || !note.value.trim(); };
  document.addEventListener('keydown', event => {
    if (picking && event.key === 'Escape') {
      setPicking(false);
      status.textContent = 'Sélection annulée.';
    }
  }, true);
  document.addEventListener('click', event => {
    if (!picking || panel.contains(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setPicking(false);
    const target = event.target.closest('button, a, input, select, canvas, [data-zone], [data-opening], [aria-label], h1, h2, h3, p') || event.target;
    const label = target.getAttribute('aria-label') || target.textContent.trim().replace(/\s+/g, ' ').slice(0, 90) || target.id || target.tagName.toLowerCase();
    const box = target.getBoundingClientRect();
    const hit = target.id === 'three-canvas' && event.detail
      ? window.MIR3D?.pick(target, event.clientX, event.clientY) : null;
    const x = box.width && event.detail ? (event.clientX - box.left) / box.width : .5;
    const y = box.height && event.detail ? (event.clientY - box.top) / box.height : .5;
    anchor = {target, x, y};
    placePin();
    const percent = value => (value * 100).toFixed(1).replace('.', ',');
    const position = event.detail ? ` · ${percent(x)} % depuis la gauche, ${percent(y)} % depuis le haut` : '';
    const face = hit?.view || document.querySelector('.face-tabs [aria-pressed="true"]')?.textContent.trim();
    selection = `${label}${face ? ' · vue ' + face : ''}${hit?.surfaceId ? ' · surface ' + hit.surfaceId : ''}${position}`;
    highlighted?.classList.remove('mir-annotation-selected');
    highlighted = target;
    highlighted.classList.add('mir-annotation-selected');
    status.textContent = selection;
    note.oninput();
    note.focus();
  }, true);
  add.onclick = () => {
    if (!selection || !note.value.trim()) return;
    const entry = `${selection} — ${note.value.trim()}`;
    notes.push(entry);
    const item = document.createElement('li');
    item.textContent = entry;
    list.append(item);
    note.value = '';
    note.oninput();
    copy.disabled = false;
    manual.hidden = true;
    status.textContent = 'Annotation ajoutée.';
  };
  copy.onclick = async () => {
    const content = notes.map((entry, index) => `${index + 1}. ${entry}`).join('\n');
    try {
      await navigator.clipboard.writeText(content);
      status.textContent = 'Notes copiées. Colle-les dans le clavardage.';
    } catch {
      manual.value = content;
      manual.hidden = false;
      manual.select();
      status.textContent = 'Copie le texte sélectionné et colle-le dans le clavardage.';
    }
  };
})();
