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
  const notes = [];
  let picking = false;
  let selection;
  let highlighted;

  function setPicking(active) {
    picking = active;
    point.setAttribute('aria-pressed', String(active));
    document.body.classList.toggle('mir-annotation-picking', active);
    if (active) status.textContent = 'Clique sur l’élément à annoter. Échap annule la sélection.';
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
    const position = box.width && box.height && event.detail
      ? ` · ${Math.round((event.clientX - box.left) / box.width * 100)} % depuis la gauche, ${Math.round((event.clientY - box.top) / box.height * 100)} % depuis le haut` : '';
    const face = document.querySelector('.face-tabs [aria-pressed="true"]')?.textContent.trim();
    selection = `${label}${face ? ' · vue ' + face : ''}${position}`;
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
