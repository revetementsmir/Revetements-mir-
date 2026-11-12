// MIR adapter only. The Responsive Atelier engine stays hosted on Atelier.
export const PROJECT_ID = '7afd893e-adcb-494b-a82b-c4cf8b28f94e';
export const PUBLIC_PAGES = ['index.html', 'realisations.html', 'contact.html', 'materiaux.html', 'boutique.html', 'produit.html', 'selection.html', 'pliage.html'];
const ENGINE = 'https://atelier.atelier-app-001.workers.dev/responsive/v1/entry.mjs';

// Adapt the existing stylesheet rules, not a second copy of the site's markup.
export function scopedRules(rules, rootClasses = []) {
  return Array.from(rules, rule => {
    if (rule.type === 1) {
      let selector = rule.selectorText.replace(/\bhtml\s+body\b/g, ':scope').replace(/:root|\bhtml\b|\bbody\b/g, ':scope');
      for (const name of rootClasses) selector = selector.replaceAll('.'+name, ':scope.'+name);
      selector = selector.replaceAll(':scope:scope', ':scope');
      return `${selector}{${rule.style.cssText.replace(/([\d.]+)vw\b/g, '$1cqw').replace(/([\d.]+)(?:dvh|svh|vh)\b/g, '$1cqh')}}`;
    }
    if (rule.type === 4) {
      const condition = rule.conditionText;
      // Width/height queries must measure the selected device, not the browser.
      if (/\b(?:width|height|orientation)\b/.test(condition) && !/prefers-|hover|pointer|print/.test(condition)) {
        return `@container mir-viewport ${condition.replace(/\bonly screen\s+and\s+|\bscreen\s+and\s+/g, '')}{${scopedRules(rule.cssRules, rootClasses)}}`;
      }
      return `@media ${condition}{${scopedRules(rule.cssRules, rootClasses)}}`;
    }
    if (rule.type === 12) return `@supports ${rule.conditionText}{${scopedRules(rule.cssRules, rootClasses)}}`;
    return rule.cssText;
  }).join('\n');
}

export async function startResponsive() {
  const query = new URLSearchParams(location.search);
  const page = location.pathname.split('/').pop() || 'index.html';
  if (query.get('responsive') !== 'atelier' || !PUBLIC_PAGES.includes(page)) return;
  const {mountResponsiveWorkspace} = await import(ENGINE);
  const sheets = [...document.styleSheets].filter(sheet => !sheet.disabled);
  // Fail before moving any DOM if a stylesheet cannot be safely scoped.
  const css = sheets.map(sheet => scopedRules(sheet.cssRules, [...document.body.classList])).join('\n');
  const root = document.createElement('div');
  root.className = `mir-responsive-page ${document.body.className}`;
  const originalClass = document.body.className;
  const originalNodes = [...document.body.childNodes];
  root.append(...originalNodes);
  document.body.className = '';
  const style = document.createElement('style');
  style.textContent = `
    body { margin:0; }
    .mir-responsive-viewport { container:mir-viewport / size; height:100%; width:100%; overflow:auto; position:relative; }
    .mir-responsive-page { display:flow-root; min-height:100%; position:relative; isolation:isolate; font:16px Arial,sans-serif; color:#18251d; background:#fafaf7; }
    .mir-responsive-page [hidden] { display:none!important; }
    .preview-workspace [data-layout*="-"] { display:none!important; }
    @scope (.mir-responsive-page) { ${css} }
  `;
  document.head.append(style);
  sheets.forEach(sheet => { sheet.disabled = true; });
  let primary, web, observer, sizeObserver, api;
  const viewport = container => {
    const host = document.createElement('div');
    host.className = 'mir-responsive-viewport';
    container.append(host);
    return host;
  };
  const restore = () => {
    observer?.disconnect();
    sizeObserver?.disconnect();
    document.body.prepend(...root.childNodes);
    document.body.className = originalClass;
    api?.dispose();
    style.remove();
    sheets.forEach(sheet => { sheet.disabled = false; });
  };
  // Legacy MIR scripts have one document-wide state. Keep one live tree.
  if (!['phone', 'tablet', 'web'].includes(query.get('layout'))) query.set('layout', 'phone');
  try {
    api = await mountResponsiveWorkspace({
      projectId: PROJECT_ID, title: 'Les Revêtements MIR', query,
      renderApp({container, slot}) { if (slot === 'primary') { primary = viewport(container); primary.append(root); } },
      renderWeb({container}) { web = viewport(container); },
      annotations: {atelierProjectId: PROJECT_ID, persistence: 'memory', autoConnect: false},
      afterMount({workspace, state, setLayout}) {
        const place = () => {
          if (!['phone', 'tablet', 'web'].includes(state.layout)) { setLayout('phone'); return; }
          const target = state.layout === 'web' ? web : primary;
          if (root.parentNode !== target) target.append(root);
          workspace.dataset.previewInterface = 'website';
        };
        observer = new MutationObserver(place);
        observer.observe(workspace.querySelector('.preview-stage'), {attributes:true, subtree:true, attributeFilter:['hidden']});
        place();
        const exit = document.createElement('a');
        const normal = new URL(location.href);
        for (const key of ['responsive','layout','phone','tablet','desktop']) normal.searchParams.delete(key);
        exit.href = normal.href; exit.textContent = 'Quitter l’aperçu';
        exit.dataset.responsiveToolbarAction = 'true';
        workspace.querySelector('.preview-workspace-toolbar').append(exit);
      }
    });
    document.documentElement.dataset.mirResponsive = 'ready';
    sizeObserver = new ResizeObserver(() => window.dispatchEvent(new Event('mir-responsive-resize')));
    sizeObserver.observe(root);
    window.MIRResponsive = {dispose: restore, workspace: api};
    // MIR is multipage: keep normal navigation and its existing initialization.
    // Only public allowlisted pages inherit preview mode; private links exit it.
    root.addEventListener('click', event => {
      const anchor = event.target.closest('a[href]');
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || url.pathname.slice(0,url.pathname.lastIndexOf('/')) !== location.pathname.slice(0,location.pathname.lastIndexOf('/'))) return;
      if (!PUBLIC_PAGES.includes(url.pathname.split('/').pop())) return;
      if (anchor.getAttribute('href').startsWith('#')) return;
      url.searchParams.set('responsive','atelier');
      const state = api.getState();
      for (const key of ['layout','phone','tablet','desktop']) url.searchParams.set(key,state[key]);
      anchor.href = url.href;
    });
  } catch (error) { restore(); throw error; }
}

if (typeof document !== 'undefined') {
  const start = () => startResponsive().catch(error => {
    console.error('Responsive Atelier indisponible', error);
    const notice = document.createElement('p');
    notice.setAttribute('role','alert');
    notice.textContent = 'Responsive Atelier n’a pas pu démarrer. Le site MIR reste accessible; réessayez en rechargeant la page.';
    document.body.prepend(notice);
  });
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, {once:true});
}
