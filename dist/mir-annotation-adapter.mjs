// Opt-in annotation entry only; ordinary MIR pages do not load this module.
const PROJECT = '7afd893e-adcb-494b-a82b-c4cf8b28f94e';
const pages = new Set(['index.html','boutique.html','produit.html','selection.html','pliage.html','production.html','chantier.html','entrepot.html','coordination.html','calepinage.html','plan.html','realisations.html','contact.html','materiaux.html']);
if (document.readyState === 'loading') await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, {once:true}));
const current = new URL(location.href).searchParams.get('page') || 'index.html';
const sourceUrl = new URL(current, location.href);
sourceUrl.search = location.search;
sourceUrl.searchParams.delete('page');
sourceUrl.hash = location.hash;
document.documentElement.dataset.previewWorkspace = 'true';
const workspace = document.createElement('div');
workspace.className = 'mir-annotation-workspace';
const toolbar = document.createElement('header');
toolbar.className = 'preview-workspace-toolbar mir-annotation-toolbar';
toolbar.setAttribute('aria-label', 'Annotations MIR');
const title = document.createElement('strong');
title.textContent = 'MIR · Annoter';
const dimensions = document.createElement('span');
const resize = () => { dimensions.textContent = `Vue réelle · ${innerWidth} × ${innerHeight} px`; };
resize();
window.addEventListener('resize', resize);
const help = document.createElement('span');
help.textContent = 'Clique sur Annoter, puis sur un élément. Copie tes notes avant de changer de page.';
toolbar.append(title, dimensions, help);
const surface = document.createElement('main');
surface.className = 'mir-annotation-surface';
surface.dataset.responsiveAnnotationRoot = 'true';
surface.setAttribute('aria-label', 'Véritable page MIR à annoter');
const content = [...document.body.childNodes].filter(node => node.nodeName !== 'SCRIPT');
surface.append(...content);
const stage = document.createElement('div');
stage.className = 'preview-stage';
const pane = document.createElement('section');
pane.id = 'mir-real-page-pane';
pane.className = 'preview-pane';
pane.dataset.kind = 'web';
const fitbox = document.createElement('div');
fitbox.className = 'preview-fitbox';
fitbox.append(surface);
pane.append(fitbox);
stage.append(pane);
workspace.append(toolbar, stage);
document.body.prepend(workspace);
const css = document.createElement('style');
css.textContent = `
  .mir-annotation-workspace { position:relative; z-index:0; }
  .mir-annotation-toolbar { position:sticky; top:0; z-index:2147483000; display:flex; align-items:center; flex-wrap:wrap; gap:10px; padding:10px 14px; background:#fff; color:#111; border-bottom:1px solid #bbb; font:14px/1.4 system-ui,sans-serif; }
  .mir-annotation-toolbar button { appearance:auto; width:auto; min-height:44px; margin:0; padding:8px 12px; border:1px solid #aaa; border-radius:6px; background:white; color:black; font:inherit; }
  .mir-annotation-toolbar span:last-of-type { flex:1 1 240px; }
  .mir-annotation-surface { margin:0; padding:0; max-width:none; width:100%; }
  .mir-annotation-toolbar ~ .preview-annotation-board { z-index:2147483100; }
`;
document.head.append(css);
try {
  const {mountAnnotationBoard,createAnnotationService} = await import('https://atelier.atelier-app-001.workers.dev/responsive/v1/entry.mjs');
  const board = mountAnnotationBoard(workspace, {
    projectId:PROJECT,
    title:'Les Revêtements MIR',
    service:createAnnotationService({projectId:PROJECT}),
    getContext:() => ({device:`Vue réelle · ${innerWidth} × ${innerHeight}`,interface:current,sourceUrl:sourceUrl.href}),
  });
  // Keep the central service in control of notes, privacy and native handoff.
  workspace.dataset.mirAnnotationReady = 'true';
  window.addEventListener('beforeunload', event => {
    if (board.getAnnotations().length || workspace.querySelector('textarea')?.value.trim()) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  window.addEventListener('pagehide', () => { board.dispose(); window.removeEventListener('resize',resize); }, {once:true});
} catch (error) {
  help.textContent = 'Annotations indisponibles : ' + error.message;
  help.setAttribute('role','alert');
}
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest?.('a[href]');
  if (!link || !surface.contains(link) || link.hasAttribute('download') || link.target === '_blank') return;
  const url = new URL(link.href, document.baseURI);
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL('./', document.baseURI).pathname)) return;
  const page = url.pathname.split('/').pop();
  if (!pages.has(page) || link.getAttribute('href').startsWith('#')) return;
  event.preventDefault();
  url.searchParams.set('page',page);
  const target = new URL('annoter.html', document.baseURI);
  target.search = url.search;
  target.hash = url.hash;
  location.assign(target.href);
});
