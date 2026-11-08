/* Client moulding wizard only. Keep every form node and value while paging. */
(() => {
 const $ = (selector) => document.querySelector(selector);
 const body = document.body;
 const main = $('#production-main');
 const params = new URLSearchParams(location.search);
 if (!main || params.get('mode') !== 'client' || params.get('source') === 'store') return;

 const controls = new Map();
 let frame = 0;
 let lastState = '';
 const preview = document.createElement('button');
 preview.type = 'button';
 preview.hidden = true;
 preview.className = 'secondary-button';
 preview.id = 'client-viewport-preview';
 preview.textContent = 'Voir le dessin';
 preview.addEventListener('click', () => {
  const showing = body.toggleAttribute('data-client-preview');
  preview.textContent = showing ? 'Retour aux réglages' : 'Voir le dessin';
  if (showing) $('#production-preview').focus({preventScroll:true});
 });
 $('#production-preview').tabIndex = -1;
 main.prepend(preview);
 const localDossier = document.createElement('a');
 localDossier.id = 'client-viewport-dossier';
 localDossier.href = '#production-order';
 localDossier.textContent = 'Voir les pièces et le PDF';
 const backToWizard = document.createElement('a');
 backToWizard.id = 'client-viewport-return';
 backToWizard.href = '#production-main';
 backToWizard.textContent = '← Retour à la moulure';
 const order = $('#production-order');
 order.prepend(backToWizard);
 order.addEventListener('click', (event) => {
  if (body.dataset.clientEntry && event.target.closest('[data-edit-piece]')) {
   history.replaceState(null,'',location.pathname+location.search);
  }
 });

 function paginate(key, selector, host, size) {
  const items = Array.from(document.querySelectorAll(selector));
  if (key === 'Pages de modèles') items.sort((a,b) =>
   Number(b.hasAttribute('data-saved-template')) - Number(a.hasAttribute('data-saved-template')));
  let view = controls.get(key);
  if (!items.length || !host) {
   if (view) view.nav.hidden = true;
   return;
  }
  if (!view) {
   const nav = document.createElement('nav');
   nav.className = 'client-viewport-pages';
   nav.setAttribute('aria-label', key);
   nav.innerHTML = '<button type="button" aria-label="Page précédente">←</button><span aria-live="polite"></span><button type="button" aria-label="Page suivante">→</button>';
   const [back, next] = nav.querySelectorAll('button');
   view = {nav, back, next, index:0, count:0, items:[], size};
   back.addEventListener('click', () => { view.index--; paint(view); });
   next.addEventListener('click', () => { view.index++; paint(view); });
   controls.set(key, view);
  }
  if (!view.nav.isConnected) host.after(view.nav);
  const first = items[0].dataset.productionColor;
  if (items.length !== view.items.length || first !== view.first) view.index = 0;
  const selected = items.findIndex(item => item.dataset.productionColor && item.getAttribute('aria-pressed') === 'true');
  if (selected >= 0 && items[selected].dataset.productionColor !== view.selected) view.index = Math.floor(selected / size);
  view.selected = items[selected]?.dataset.productionColor;
  view.first = first;
  view.items = items;
  view.size = size;
  paint(view);
 }

 function paint(view) {
  view.count = Math.ceil(view.items.length / view.size);
  view.index = Math.max(0, Math.min(view.index, view.count - 1));
  view.items.forEach((item, index) => {
   item.classList.toggle('client-viewport-off-page', Math.floor(index / view.size) !== view.index);
  });
  view.nav.hidden = view.count <= 1;
  view.back.disabled = view.index === 0;
  view.next.disabled = view.index + 1 >= view.count;
  const status = view.nav.querySelector('span');
  const label = `${view.index + 1} / ${view.count}`;
  if (status.textContent !== label) status.textContent = label;
 }

 function sync() {
  frame = 0;
  const state = body.dataset.clientEntry;
  if (!state) return;
  const stage = body.dataset.clientStage;
  const current = state + stage;
  if (current !== lastState) {
   body.removeAttribute('data-client-preview');
   preview.textContent = 'Voir le dessin';
   lastState = current;
  }
  const wide = innerWidth >= 780;
  const short = innerHeight < 760;
  preview.hidden = state !== 'measures';
  if (!localDossier.isConnected) $('#client-entry')?.append(localDossier);
  localDossier.hidden = state !== 'choice' || !$('#production-items [data-item-quantity]');
  if (state === 'models') {
   paginate('Pages de modèles', '#client-saved-options [data-saved-template], #client-standard-options [data-client-profile]',
    $('#client-model-options'), wide ? 8 : short ? 4 : 6);
  } else if (state === 'measures' && stage === '2') {
   paginate('Pages de mesures', '#production-dimensions .segment-editor > .segment-row, #production-dimensions .dimension-fields > label',
    $('#production-dimensions'), wide && !short ? 4 : 2);
  } else if (state === 'measures' && stage === '5') {
   paginate('Pages de couleurs', '#production-color-grid [data-production-color]',
    $('#production-color-grid'), wide ? 8 : 4);
  }
 }

 function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
 }
 // The existing configurator regenerates lists on model, search and color changes.
 new MutationObserver(schedule).observe(main,{childList:true,subtree:true});
 new MutationObserver(schedule).observe(body,{attributes:true,attributeFilter:['data-client-entry','data-client-stage']});
 window.addEventListener('resize',schedule);
 schedule();
})();
