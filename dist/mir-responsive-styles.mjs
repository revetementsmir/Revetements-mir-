// Only preview containers are adjusted here. MIR's own styles live inside each
// open ShadowRoot and are adapted by mir-responsive-view.mjs.
export function mountMirWorkspaceStyles(document = globalThis.document) {
  const style=document.createElement('style');style.dataset.mirResponsiveStyles='true';
  style.textContent=`
    html[data-preview-workspace] .web-document:has(.mir-responsive-live){padding:0!important;overflow:hidden!important}
    html[data-preview-workspace] .ap-device-content:has(.mir-responsive-live){overflow:hidden}
    .mir-responsive-live{display:block;width:100%;height:100%;min-width:0;min-height:0}
  `;
  document.head.append(style);
  return () => style.remove();
}
