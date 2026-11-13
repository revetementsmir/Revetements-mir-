import {createMirContext} from './mir-responsive-context.mjs';

export const MIR_VIEW_ROUTES = Object.freeze({
  'index.html':null, 'contact.html':null,
  'boutique.html':'commerce', 'produit.html':'commerce', 'selection.html':'commerce',
  'pliage.html':'pliage', 'production.html':'production', 'chantier.html':'chantier',
  'entrepot.html':'entrepot', 'coordination.html':'coordination', 'calepinage.html':'calepinage',
  'plan.html':'plan', 'realisations.html':'realisations', 'materiaux.html':'catalogue',
  'estimation.html':'estimation'
});

export function resolveMirViewURL(value, base) {
  const url = new URL(value, base), directory = new URL('./', base);
  if (url.origin !== directory.origin || !url.pathname.startsWith(directory.pathname)) throw new TypeError('Cette vue accepte uniquement les écrans MIR du même site.');
  const pageName = url.pathname.slice(directory.pathname.length) || 'index.html';
  if (!Object.hasOwn(MIR_VIEW_ROUTES,pageName)) throw new TypeError('Cet écran MIR ne dispose pas de montage Responsive.');
  url.pathname = directory.pathname + pageName;
  return {url,pageName};
}

export function rebaseMirCSSUrls(text, base) {
  return String(text).replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi, (all, quote, value) => {
    if (/^(?:data:|blob:|#)/i.test(value)) return all;
    return `url("${new URL(value,base).href.replace(/"/g,'%22')}")`;
  });
}

export function scopeMirSelector(selector) {
  return selector.replace(/:root\b/g, ':scope')
    .replace(/(^|[\s>+~,(])(?:html|body)(?=[.#:[\s>+~),]|$)/g, '$1:scope')
    .replace(/(:scope(?:[.#][\w-]+|\[[^\]]+\])*)\s+(?:>\s*)?:scope/g, '$1');
}
const viewportUnits = text => text.replace(/(\d*\.?\d+)(?:d|s|l)?vw\b/g,'$1cqw').replace(/(\d*\.?\d+)(?:d|s|l)?vh\b/g,'$1cqh');
function scopeRules(rules, base) {
  return [...rules].map(rule => {
    if (rule.type === 1) return `${scopeMirSelector(rule.selectorText)}{${viewportUnits(rebaseMirCSSUrls(rule.style.cssText,base))}}`;
    if (rule.type === 4) {
      const body = scopeRules(rule.cssRules,base);
      return rule.conditionText.split(',').map(branch => {
        const size = [], environment = [];
        for (const term of branch.trim().split(/\s+and\s+/i)) (/^\((?:(?:min|max)-)?(?:width|height|orientation|aspect-ratio)\s*[:<=>]/i.test(term) ? size : environment).push(term);
        let content = size.length ? `@container mir-page ${size.join(' and ')}{${body}}` : body;
        if (environment.length) content = `@media ${environment.join(' and ')}{${content}}`;
        return content;
      }).join('\n');
    }
    if (rule.cssRules && rule.type !== 7 && rule.type !== 8) return rule.cssText.slice(0,rule.cssText.indexOf('{')+1) + scopeRules(rule.cssRules,base) + '}';
    return viewportUnits(rebaseMirCSSUrls(rule.cssText,base));
  }).join('\n');
}
async function readStyles(parsed, source, context) {
  const CSSSheet = context.page.ownerDocument.defaultView.CSSStyleSheet;
  if (!CSSSheet) throw new Error('Ce navigateur ne peut pas isoler les styles MIR.');
  const contents = await Promise.all([...parsed.querySelectorAll('link[rel~="stylesheet"],style')].map(async node => {
    let base = source.href, text = node.textContent;
    if (node.tagName === 'LINK') {
      base = new URL(node.getAttribute('href'),source).href;
      if (new URL(base).origin !== source.origin) throw new Error('Feuille de style MIR externe non autorisée.');
      const response = await context.fetch(base,{credentials:'same-origin',cache:'no-cache'});
      if(!response.ok) throw new Error('Styles MIR indisponibles : HTTP ' + response.status);
      text = await response.text();
    }
    // No MIR page styles currently contain @import. Fail explicitly if that changes;
    // a constructed stylesheet would otherwise silently discard the dependency.
    if (/@import\s/i.test(text.replace(/\/\*[\s\S]*?\*\//g,''))) throw new Error('Cette feuille MIR requiert un import de styles explicite.');
    const sheet = new CSSSheet(); sheet.replaceSync(text);
    const result = scopeRules(sheet.cssRules,base);
    return node.getAttribute('media') ? `@media ${node.getAttribute('media')}{${result}}` : result;
  }));
  return `@scope ([data-mir-responsive-page]) {${contents.join('\n')}}`;
}
function preparePage(parsed, document, source) {
  const page = document.createElement('div'); page.dataset.mirResponsivePage = 'true';
  for(const attribute of parsed.body.attributes) page.setAttribute(attribute.name,attribute.value);
  for(const name of parsed.documentElement.classList) page.classList.add(name);
  for(const attribute of parsed.documentElement.attributes) if(attribute.name.startsWith('data-')) page.setAttribute(attribute.name,attribute.value);
  page.dataset.mirResponsiveEntry = 'true';
  for(const child of [...parsed.body.childNodes]) page.append(document.importNode(child,true));
  page.querySelectorAll('script,base,link[rel~="stylesheet"]').forEach(node => node.remove());
  for(const node of [page,...page.querySelectorAll('*')]) {
    for(const attribute of [...node.attributes]) if(/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
    for(const name of ['href','src','poster','action']) if(node.hasAttribute(name)) {
      const value = node.getAttribute(name);
      if(!value || value.startsWith('#') || /^(?:data:|blob:|mailto:|tel:)/i.test(value)) continue;
      const target = new URL(value,source);
      if(!/^https?:$/.test(target.protocol)) { node.removeAttribute(name); continue; }
      node.setAttribute(name,target.href);
    }
    if(node.hasAttribute('srcset')) node.setAttribute('srcset',node.getAttribute('srcset').split(',').map(item => {
      const [path,...descriptors] = item.trim().split(/\s+/); return new URL(path,source).href + (descriptors.length ? ' ' + descriptors.join(' ') : '');
    }).join(', '));
    if(node.hasAttribute('style')) node.setAttribute('style',viewportUnits(rebaseMirCSSUrls(node.getAttribute('style'),source)));
  }
  return page;
}

const baseStyles = `:host{display:block;position:relative;transform:translateZ(0);width:100%;height:100%;min-width:0;min-height:0;container:mir-page/size;overflow:hidden;isolation:isolate;color-scheme:normal}
  [data-mir-responsive-page]{position:relative;isolation:isolate;width:100%;height:100%;min-height:100%;overflow:auto;overscroll-behavior:contain;font:16px/1.5 Arial,sans-serif}
  [data-mir-view-error]{margin:0;padding:20px;font:14px/1.5 system-ui;color:#7f1d1d;background:#fff}
`;

export function createMirView({container,slot,url,onNavigate = () => {},sessionGateway = {}} = {}) {
  if(!container?.ownerDocument) throw new TypeError('Un conteneur MIR est requis.');
  const document = container.ownerDocument, win = document.defaultView;
  const base = new URL('./', url || document.baseURI);
  const host = document.createElement('div'); host.className = 'mir-responsive-live'; host.dataset.mirResponsiveSlot = String(slot || 'view');
  Object.assign(host.style,{width:'100%',height:'100%',minWidth:'0',minHeight:'0'});
  const root = host.attachShadow({mode:'open'}); container.append(host);
  const baseStyle = document.createElement('style'); baseStyle.textContent = baseStyles; root.append(baseStyle);
  let current = null, pending = null, pendingRequest = null, generation = 0, disposed = false;
  const showError = error => {
    if(disposed || error?.name === 'AbortError') return;
    root.querySelector('[data-mir-view-error]')?.remove();
    const message = document.createElement('p'); message.dataset.mirViewError = 'true'; message.setAttribute('role','alert');
    message.textContent = error?.message || 'Cet écran MIR ne peut pas être ouvert.'; root.append(message);
  };
  function disposeMounted(mounted) {
    if(!mounted || mounted.disposed) return; mounted.disposed = true;
    mounted.controller.abort();
    for(const component of mounted.components.reverse()) { try {component?.dispose?.();} catch {} }
    mounted.context.dispose(); mounted.page.remove(); mounted.style.remove();
  }
  async function navigate(value, options = {}) {
    if(disposed) throw new Error('Cette vue MIR est fermée.');
    const resolved = resolveMirViewURL(value,current?.context.url || base), token = ++generation;
    pending?.controller.abort(); pendingRequest?.abort();
    const controller = new AbortController(), services = {...(sessionGateway.services || {})};
    pendingRequest = controller;
    let parsed;
    try {
      const response = await win.fetch(resolved.url,{credentials:'same-origin',cache:'no-cache',signal:controller.signal});
      if(!response.ok) throw new Error('Écran MIR indisponible : HTTP ' + response.status);
      if(response.redirected && new URL(response.url).origin !== base.origin) throw new Error('La connexion MIR doit être ouverte dans son site officiel.');
      parsed = new win.DOMParser().parseFromString(await response.text(),'text/html');
    } catch(error) {
      if(pendingRequest === controller) pendingRequest = null;
      if(token === generation) showError(error);
      throw error;
    }
    const scripts = [...parsed.querySelectorAll('script[src]')].map(node => ({src:new URL(node.getAttribute('src'),resolved.url).href,type:node.type || 'classic'}));
    const page = preparePage(parsed,document,resolved.url), style = document.createElement('style');
    const context = createMirContext({root,page,viewport:container,url:resolved.url,sourceTitle:parsed.title,services,signal:controller.signal,
      onNavigate(next,detail) { return navigate(next,detail).catch(showError); },
      onURLChange(next,detail) { onNavigate(next,{...detail,slot,context,local:true}); }
    });
    Object.assign(context,{slot,pageName:resolved.pageName,scripts,services});
    const mounted = {context,page,style,controller,components:[]}; pending = mounted;
    try {
      style.textContent = await readStyles(parsed,resolved.url,context);
      if(parsed.querySelector('link[data-mir-pdf-style]')) style.dataset.mirPdfStyle = '';
      if(disposed || token !== generation || controller.signal.aborted) throw new DOMException('Navigation annulée.','AbortError');
      // Legacy factory registration is allowed to inspect its real, connected DOM.
      // Its DOMContentLoaded/load events remain local until finishMount below.
      disposeMounted(current); current = null;
      root.querySelector('[data-mir-view-error]')?.remove(); root.append(style,page);
      const prepared = await sessionGateway.prepare?.({scripts,context,pageName:resolved.pageName,signal:context.signal});
      if(prepared) { Object.assign(services,prepared.services || prepared); Object.assign(context.window,prepared.services || prepared); }
      const factory = sessionGateway.factories?.[resolved.pageName] || sessionGateway.factories?.[MIR_VIEW_ROUTES[resolved.pageName]];
      const commerce = context.window.MIRCommerce, menu = context.window.MIRPublicMenu;
      if(MIR_VIEW_ROUTES[resolved.pageName] && !factory && !sessionGateway.mountPage && !(MIR_VIEW_ROUTES[resolved.pageName] === 'commerce' && typeof commerce?.mount === 'function')) {
        throw new Error('Le contrôleur indépendant MIR « ' + MIR_VIEW_ROUTES[resolved.pageName] + ' » n’est pas disponible.');
      }
      if(disposed || token !== generation || controller.signal.aborted) throw new DOMException('Navigation annulée.','AbortError');
      const mount = factory || sessionGateway.mountPage;
      if(mount) mounted.components.push(mount(context));
      else if(MIR_VIEW_ROUTES[resolved.pageName] === 'commerce') mounted.components.push(commerce.mount({...context,onURLChange:context.updateURL,context}));
      if(scripts.some(script => /\/mir-public-menu\.js(?:[?#]|$)/.test(script.src)) && menu?.init) mounted.components.push(menu.init(context.window,{...context,context}));
      context.finishMount();
      for(let i=0; i<mounted.components.length; i++) {
        const component = await mounted.components[i]; mounted.components[i] = component;
        if(context.signal.aborted) {component?.dispose?.(); throw new DOMException('Navigation annulée.','AbortError');}
        await component?.ready;
      }
      if(disposed || token !== generation || controller.signal.aborted) throw new DOMException('Navigation annulée.','AbortError');
      current = mounted; pending = null; if(pendingRequest === controller) pendingRequest = null;
      if(resolved.url.hash) { const target = root.getElementById?.(decodeURIComponent(resolved.url.hash.slice(1))); target?.scrollIntoView?.(); }
      context.updateViewport();
      onNavigate(new URL(context.url),{...options,slot,context,local:false});
      return context;
    } catch(error) {
      disposeMounted(mounted); if(pending === mounted) pending = null; if(pendingRequest === controller) pendingRequest = null;
      if(token === generation) showError(error);
      throw error;
    }
  }
  root.addEventListener('click',event => {
    if(event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !current) return;
    const link = event.composedPath().find(node => node?.matches?.('a[href]'));
    if(!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const value = link.getAttribute('href');
    if(value?.startsWith('#')) {
      event.preventDefault(); current.context.updateURL(new URL(value,current.context.url)); root.getElementById?.(decodeURIComponent(value.slice(1)))?.scrollIntoView?.(); return;
    }
    let resolved; try {resolved = resolveMirViewURL(value,current.context.url);} catch {return;}
    event.preventDefault(); void navigate(resolved.url).catch(() => {});
  });
  root.addEventListener('submit',event => {
    const form = event.target;
    if(event.defaultPrevented || !current || form.method.toLowerCase() !== 'get') return;
    let resolved; try {resolved = resolveMirViewURL(form.getAttribute('action') || current.context.url,current.context.url);} catch {return;}
    const data = new win.FormData(form,event.submitter); resolved.url.search = new URLSearchParams(data).toString();
    event.preventDefault(); void navigate(resolved.url).catch(() => {});
  });
  const ready = navigate(url || new URL('index.html',base));
  return {host,root,ready,navigate,getContext() {return current?.context || null;},dispose() {
    if(disposed) return; disposed = true; generation++; pendingRequest?.abort(); pending?.controller.abort(); disposeMounted(current); disposeMounted(pending); current = pending = null; host.remove();
  }};
}
