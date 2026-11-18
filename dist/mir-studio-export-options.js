/* Client PDF presentation preference only; never saved into project data. */
(function () {
  'use strict';
  function mount() {
    const query = new URLSearchParams(location.search);
    if (location.pathname.split('/').pop() !== 'plan.html' || query.has('embed') || query.get('context') === 'admin' || query.get('mode') === 'atelier' || document.body.dataset.mirStudioLayout !== 'materials-bottom') return;
    const button = document.getElementById('export-pdf');
    if (!button || document.getElementById('mir-studio-pdf-details')) return;
    const label = document.createElement('label');
    label.className = 'mir-studio-pdf-option';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.id = 'mir-studio-pdf-details';
    const caption = document.createElement('span');
    caption.setAttribute('data-mir-source-color', '');
    label.append(input, caption); button.before(label);
    function language() {
      caption.textContent = String(window.MIRClientLocale?.getLocale?.() || document.documentElement.lang).startsWith('en')
        ? 'Include dimensions and technical details' : 'Inclure les cotes et détails techniques';
    }
    language(); window.addEventListener('mir:client-locale-changed', language);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount, {once:true}) : mount();
})();
