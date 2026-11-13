import {createMirView,resolveMirViewURL} from './mir-responsive-view.mjs';
import {mountMirWorkspaceStyles} from './mir-responsive-styles.mjs';

export const MIR_PROJECT_ID = '7afd893e-adcb-494b-a82b-c4cf8b28f94e';
export const MIR_RESPONSIVE_ENTRY = 'https://atelier.atelier-app-001.workers.dev/responsive/v1/entry.mjs';
const slotKeys = Object.freeze({primary:'mir-primary',secondary:'mir-secondary',web:'mir-web'});
const toolKeys = ['page','layout','phone','tablet','desktop','device','zoom','interface','responsive-update','responsive-library',...Object.values(slotKeys)];
function withoutCapability(hash) {return hash.replace(/^#/,'').split('&').filter(part => !part.startsWith('atelier-dictation=')).join('&');}

export function readMirLaunchURL(href) {
  const launcher = new URL(href),baseUrl = new URL('./',launcher),pageName = launcher.searchParams.get('page') || 'index.html';
  const source = resolveMirViewURL(pageName,baseUrl).url;
  source.search = launcher.search;
  for(const key of toolKeys) source.searchParams.delete(key);
  source.hash = withoutCapability(launcher.hash);
  const urls = Object.fromEntries(Object.entries(slotKeys).map(([slot,key]) => [slot,launcher.searchParams.has(key) ? resolveMirViewURL(launcher.searchParams.get(key),baseUrl).url : new URL(source)]));
  return {launcher,baseUrl,pageName,url:source,urls,query:new URLSearchParams(launcher.search)};
}

export function updateMirLaunchURL(href,{slot,url}) {
  if(!Object.hasOwn(slotKeys,slot)) throw new TypeError('Vue MIR inconnue.');
  const launcher = new URL(href),base = new URL('./',launcher),source = resolveMirViewURL(url,base).url;
  source.hash = withoutCapability(source.hash);
  launcher.searchParams.set(slotKeys[slot],source.pathname.slice(base.pathname.length) + source.search + source.hash);
  return launcher;
}

export function createMirSlotRenderer({urls,sessionGateway,onNavigate = () => {},createView = createMirView} = {}) {
  const views = new Map();
  function render({container,slot = 'web'}) {
    if(!Object.hasOwn(slotKeys,slot)) throw new TypeError('Vue MIR inconnue.');
    views.get(slot)?.dispose();
    const runtime = createView({container,slot,url:new URL(urls[slot]),sessionGateway,
      onNavigate(url,options) {onNavigate(url,{...options,slot});}
    });
    views.set(slot,runtime);
    // Registration is synchronous; ready is awaited once the common workspace
    // connects all three actual render containers to the document.
    void runtime.ready.catch(() => {});
    return {setDevice() {runtime.getContext()?.updateViewport();},dispose() {
      runtime.dispose(); if(views.get(slot) === runtime) views.delete(slot);
    }};
  }
  return {views,render,ready() {return Promise.all([...views.values()].map(view => view.ready));},dispose() {for(const view of views.values()) view.dispose(); views.clear();}};
}

export function annotationContextForMirView({element,pane} = {},views) {
  let node = element, slot;
  while(node) {
    if(node.dataset?.mirResponsiveSlot) {slot = node.dataset.mirResponsiveSlot;break;}
    node = node.parentElement || node.getRootNode?.()?.host || null;
  }
  const context = views.get(slot)?.getContext();
  return context ? {sourceUrl:context.url.href,interface:context.pageName,device:pane?.dataset?.kind || slot} : {};
}

export async function mountMirResponsive({document = globalThis.document,window = globalThis.window,library,sessionGateway,createView = createMirView} = {}) {
  const launch = readMirLaunchURL(window.location.href);
  const toolkit = library || await import(MIR_RESPONSIVE_ENTRY);
  const gateway = sessionGateway || (await import('./mir-responsive-gateway.mjs')).createMirSessionGateway({baseUrl:launch.baseUrl});
  const removeStyles = mountMirWorkspaceStyles(document);
  let workspaceContext,board,disposed=false;
  const renderer = createMirSlotRenderer({urls:launch.urls,sessionGateway:gateway,createView,onNavigate(url,{slot,...detail}) {
    if(disposed) return;
    const next = updateMirLaunchURL(window.location.href,{slot,url});
    window.history.replaceState(window.history.state,'',next);
    const link = workspaceContext?.workspace.querySelector('#preview-web-pane .web-toolbar a');
    if(slot === 'web' && link) link.href = url.href;
    if(!detail.local) workspaceContext?.fit();
  }});
  let api;
  try {
    api = await toolkit.mountResponsiveWorkspace({
      projectId:MIR_PROJECT_ID,title:'Les Revêtements MIR',query:launch.query,
      renderApp:renderer.render,
      web:{title:'MIR',openUrl:launch.urls.web.href,mount(container) {
        const result=renderer.render({container,slot:'web'});
        return {showPage() {},dispose:result.dispose};
      }},
      annotations:false,
      afterMount(context) {
        workspaceContext=context;
        document.querySelector('#mir-responsive-loading')?.remove();
        context.workspace.dataset.mirResponsiveMode='independent';
      }
    });
    board = toolkit.mountAnnotationBoard(workspaceContext.workspace,{
      projectId:MIR_PROJECT_ID,title:'Les Revêtements MIR',
      service:toolkit.createAnnotationService({projectId:MIR_PROJECT_ID}),
      getContext:target => annotationContextForMirView(target,renderer.views)
    });
    await renderer.ready();
    workspaceContext.workspace.dataset.mirResponsiveReady='true';
    workspaceContext.fit();
  } catch(error) {
    board?.dispose(); api?.dispose(); renderer.dispose(); gateway.dispose?.(); removeStyles(); throw error;
  }
  const beforeUnload = event => {
    if(board.getAnnotations().length || document.querySelector('.annotation-editor textarea')?.value.trim()) {event.preventDefault();event.returnValue='';}
  };
  const dispose = () => {
    if(disposed) return; disposed=true;
    window.removeEventListener('beforeunload',beforeUnload); window.removeEventListener('pagehide',dispose);
    board.dispose(); api.dispose(); renderer.dispose(); gateway.dispose?.(); removeStyles();
  };
  window.addEventListener('beforeunload',beforeUnload); window.addEventListener('pagehide',dispose,{once:true});
  return {workspace:workspaceContext.workspace,views:renderer.views,annotations:board,setLayout:api.setLayout,fit:api.fit,dispose};
}
