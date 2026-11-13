// Per-view browser services for MIR's explicit controller factories.
// This is a UI scope, not a security boundary or an authentication substitute.
export function matchMirMedia(query, size, environment = () => true) {
  return String(query).split(',').some(branch => {
    let valid = true;
    const rest = branch.replace(/\(\s*((?:min-|max-)?(?:width|height|aspect-ratio)|orientation)\s*:\s*([^)]*)\)/gi, (_, feature, value) => {
      feature = feature.toLowerCase(); value = value.trim().toLowerCase();
      const axis = feature.endsWith('height') ? size.height : size.width;
      let result = false;
      if (feature === 'orientation') result = value === (size.width > size.height ? 'landscape' : 'portrait');
      else if (feature.endsWith('aspect-ratio')) {
        const parts = value.split('/').map(Number), ratio = parts[0] / (parts[1] || 1), current = size.width / Math.max(1, size.height);
        result = Number.isFinite(ratio) && (feature.startsWith('min-') ? current >= ratio : feature.startsWith('max-') ? current <= ratio : Math.abs(current - ratio) < 0.001);
      } else {
        const amount = /^([\d.]+)(px|em|rem)?$/.exec(value), limit = amount ? Number(amount[1]) * (amount[2] && amount[2] !== 'px' ? 16 : 1) : NaN;
        result = Number.isFinite(limit) && (feature.startsWith('min-') ? axis >= limit : feature.startsWith('max-') ? axis <= limit : axis === limit);
      }
      valid &&= result;
      return '';
    }).replace(/^\s*(?:only\s+)?(?:screen|all)\s*/i, '').split(/\band\b/i).map(term => term.trim()).filter(Boolean).join(' and ');
    return valid && (!rest || environment(rest));
  });
}

export function createMirContext({root, page, viewport, url, sourceTitle, onNavigate = () => {}, onURLChange = () => {}, services = {}, signal} = {}) {
  if (!root || !page || !viewport) throw new TypeError('Une racine, une page et un viewport sont requis.');
  const doc = page.ownerDocument, realWindow = doc.defaultView;
  const route = url instanceof URL ? url : new URL(url, doc.baseURI);
  const lifecycle = new AbortController(), removers = [], timers = new Set(), intervals = new Set(), frames = new Set(), media = new Set(), observers = new Set();
  const localWindowEvents = new realWindow.EventTarget();
  let disposed = false, mounted = false, title = String(sourceTitle ?? doc.title ?? '');
  const documentHandlers = new Map();
  const sharedEvents = new Set(['storage', 'pagehide', 'beforeunload', 'online', 'offline']);
  const domEvents = /^(?:pointer|mouse|touch|key|focus|blur|click|dblclick|contextmenu|wheel)/;
  const activePointers = new Set(), windowListeners = [];
  const ownsEvent = event => (event.composedPath?.() || []).some(node => node === root || node === page || node === root.host);
  const dimensions = () => ({width: viewport.clientWidth || 1, height: viewport.clientHeight || 1});
  function listen(target, type, fn, options) {
    if (disposed) return;
    target.addEventListener(type, fn, options);
    removers.push(() => target.removeEventListener(type, fn, options));
  }
  function updateURL(next, {replace = false, navigate = false, state = null} = {}) {
    if (disposed) return;
    const target = new URL(String(next), route);
    if (target.origin !== route.origin) throw new TypeError('La navigation de cette vue doit rester sur MIR.');
    if (navigate) return onNavigate(target, {replace, state});
    route.href = target.href;
    onURLChange(new URL(route), {replace, state});
  }
  const location = new Proxy({}, {
    get(_, key) {
      if (key === 'assign' || key === 'replace') return value => updateURL(value, {navigate:true, replace:key === 'replace'});
      if (key === 'reload') return () => updateURL(route, {navigate:true, replace:true});
      if (key === 'toString' || key === Symbol.toPrimitive) return () => route.href;
      return route[key];
    },
    set(_, key, value) { const next = new URL(route); next[key] = value; updateURL(next, {navigate:true}); return true; }
  });
  let historyState = null;
  const history = {
    get state() { return historyState; },
    pushState(state, unused, next) { historyState = state; if (next != null) updateURL(next, {state}); },
    replaceState(state, unused, next) { historyState = state; if (next != null) updateURL(next, {replace:true, state}); },
    back() { services.onHistory?.(-1); }, forward() { services.onHistory?.(1); }, go(delta) { services.onHistory?.(delta); }
  };
  const cssEscape = text => realWindow.CSS?.escape ? realWindow.CSS.escape(String(text)) : String(text).replace(/[^\w-]/g, '\\$&');
  const localSelector = selector => String(selector).replace(/:root\b/g,'[data-mir-responsive-page]').replace(/(^|[\s>+~,(])(?:html|body)(?=[.#:[\s>+~),]|$)/g,'$1[data-mir-responsive-page]')
    .replace(/(\[data-mir-responsive-page\](?:[.#][\w-]+|\[[^\]]+\])*)\s+(?:>\s*)?\[data-mir-responsive-page\]/g,'$1');
  function queryAll(selector) {
    const local = localSelector(selector), nodes = [];
    if(page.matches?.(local)) nodes.push(page);
    nodes.push(...page.querySelectorAll(local));
    // Styles are siblings of the owned page in its open ShadowRoot. Keep that
    // explicit head lookup, but never search another route's business subtree.
    if(!disposed && /(^|[\s>+~,(])(?:style|link)(?=[.#:[\s>+~),]|$)/i.test(local)) {
      for(const node of root.querySelectorAll(local)) if(node.parentNode === root && /^(STYLE|LINK)$/.test(node.nodeName)) nodes.push(node);
    }
    return [...new Set(nodes)];
  }
  let windowProxy;
  const documentProxy = new Proxy(doc, {get(target, key) {
    if(key === 'title') return title;
    if(typeof key === 'string' && /^on[a-z]+$/.test(key)) return documentHandlers.get(key)?.handler || null;
    if (key === 'body' || key === 'documentElement' || key === 'scrollingElement') return page;
    if (key === 'head') return root;
    if (key === 'defaultView') return windowProxy;
    if (key === 'location') return location;
    if (key === 'baseURI' || key === 'URL' || key === 'documentURI') return route.href;
    if (key === 'readyState') return mounted ? 'complete' : 'loading';
    if (key === 'activeElement') return page.contains(root.activeElement) ? root.activeElement : page;
    if (key === 'querySelector') return selector => queryAll(selector)[0] || null;
    if (key === 'querySelectorAll') return queryAll;
    if (key === 'getElementById') return id => queryAll('#' + cssEscape(id))[0] || null;
    if (key === 'getElementsByClassName') return name => queryAll('.' + String(name).split(/\s+/).map(cssEscape).join('.'));
    if (key === 'getElementsByTagName') return queryAll;
    if (key === 'getElementsByName') return name => queryAll('[name]').filter(node => node.getAttribute('name') === String(name));
    if (key === 'addEventListener') return (type, fn, options) => listen(type === 'visibilitychange' ? doc : root, type, fn, options);
    if (key === 'removeEventListener') return (type, fn, options) => (type === 'visibilitychange' ? doc : root).removeEventListener(type, fn, options);
    if (key === 'dispatchEvent') return event => root.dispatchEvent(event);
    if (key === 'elementFromPoint') return (x,y) => {const node = root.elementFromPoint?.(x,y);return node && page.contains(node) ? node : null;};
    if (key === 'elementsFromPoint') return (x,y) => (root.elementsFromPoint?.(x,y) || []).filter(node => page.contains(node));
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },set(target,key,value) {
    if(key === 'title') {title = String(value);return true;}
    if(typeof key === 'string' && /^on[a-z]+$/.test(key)) {
      const previous = documentHandlers.get(key);
      if(previous) previous.target.removeEventListener(previous.type,previous.listener);
      documentHandlers.delete(key);
      if(typeof value === 'function' && !disposed) {
        const type = key.slice(2), eventTarget = type === 'visibilitychange' ? doc : type === 'load' ? localWindowEvents : root;
        const listener = event => {if(!disposed) {const result=value.call(documentProxy,event);if(result === false) event.preventDefault();}};
        documentHandlers.set(key,{handler:value,target:eventTarget,type,listener});listen(eventTarget,type,listener);
      }
      return true;
    }
    return Reflect.set(target,key,value,target);
  }});
  function matchMedia(query) {
    const target = new realWindow.EventTarget();
    const item = {query:String(query), target, matches:matchMirMedia(query, dimensions(), q => realWindow.matchMedia(q).matches), onchange:null};
    const result = {
      media:item.query, get matches() { return item.matches; }, get onchange() { return item.onchange; }, set onchange(fn) { item.onchange = fn; },
      addEventListener(type, fn, options) { listen(target,type,fn,options); }, removeEventListener(type,fn,options) { target.removeEventListener(type,fn,options); },
      addListener(fn) { listen(target,'change',fn); }, removeListener(fn) { target.removeEventListener('change',fn); }, dispatchEvent(event) { return target.dispatchEvent(event); }
    };
    media.add(item);
    const environmental = realWindow.matchMedia?.(String(query).replace(/\([^)]*(?:width|height|orientation|aspect-ratio)[^)]*\)/gi,'(min-width: 0px)'));
    if (environmental) listen(environmental,'change',updateViewport);
    return result;
  }
  function updateViewport() {
    if (disposed) return;
    for (const item of media) {
      const next = matchMirMedia(item.query, dimensions(), q => realWindow.matchMedia(q).matches);
      if (next === item.matches) continue;
      item.matches = next;
      const event = new realWindow.Event('change'); Object.defineProperties(event, {matches:{value:next}, media:{value:item.query}});
      item.target.dispatchEvent(event); item.onchange?.(event);
    }
    localWindowEvents.dispatchEvent(new realWindow.Event('resize'));
  }
  const namespace = Object.create(null);
  Object.assign(namespace, services);
  const observerConstructors = {};
  for(const name of ['MutationObserver','ResizeObserver','IntersectionObserver']) {
    const Native = realWindow[name];
    if(typeof Native !== 'function') continue;
    observerConstructors[name] = class extends Native {
      constructor(callback, options) {
        if(typeof callback !== 'function') throw new TypeError('Un callback observateur est requis.');
        super((...args) => {if(!disposed && !lifecycle.signal.aborted) callback.apply(args[1],args);},options);
        if(disposed) super.disconnect(); else observers.add(this);
      }
      observe(...args) {if(!disposed && !lifecycle.signal.aborted) return super.observe(...args);}
    };
  }
  Object.assign(namespace,observerConstructors);
  const visualViewport = {get width(){return dimensions().width;},get height(){return dimensions().height;},offsetLeft:0,offsetTop:0,pageLeft:0,pageTop:0,scale:1,
    addEventListener:(type,fn,options) => listen(localWindowEvents,type,fn,options),removeEventListener:(type,fn,options) => localWindowEvents.removeEventListener(type,fn,options)};
  listen(root,'pointerdown',event => activePointers.add(event.pointerId));
  listen(realWindow,'pointerup',event => queueMicrotask(() => activePointers.delete(event.pointerId)));
  listen(realWindow,'pointercancel',event => queueMicrotask(() => activePointers.delete(event.pointerId)));
  function addWindowListener(type,fn,options) {
    const target = sharedEvents.has(type) || domEvents.test(type) ? realWindow : localWindowEvents;
    const listener = domEvents.test(type) ? event => {if(ownsEvent(event) || activePointers.has(event.pointerId)) {if(typeof fn === 'function') fn.call(windowProxy,event); else fn.handleEvent(event);}} : fn;
    windowListeners.push({type,fn,options,target,listener}); listen(target,type,listener,options);
  }
  function removeWindowListener(type,fn,options) {
    for(const item of windowListeners) if(item.type === type && item.fn === fn && !!(typeof item.options === 'object' ? item.options?.capture : item.options) === !!(typeof options === 'object' ? options?.capture : options)) item.target.removeEventListener(type,item.listener,item.options);
  }
  windowProxy = new Proxy(realWindow, {
    get(target,key) {
      if (Object.prototype.hasOwnProperty.call(namespace,key)) return namespace[key];
      if (key === 'window' || key === 'self' || key === 'globalThis' || key === 'parent' || key === 'top') return windowProxy;
      if (key === 'document') return documentProxy;
      if (key === 'location') return location;
      if (key === 'history') return history;
      if (key === 'innerWidth') return dimensions().width;
      if (key === 'innerHeight') return dimensions().height;
      if (key === 'visualViewport') return visualViewport;
      if (key === 'matchMedia') return matchMedia;
      if (key === 'scrollX' || key === 'pageXOffset') return page.scrollLeft;
      if (key === 'scrollY' || key === 'pageYOffset') return page.scrollTop;
      if (key === 'scrollTo' || key === 'scrollBy') return (...args) => page[key](...args);
      if (key === 'localStorage' || key === 'sessionStorage') return services[key] || target[key];
      if (key === 'addEventListener') return addWindowListener;
      if (key === 'removeEventListener') return removeWindowListener;
      if (key === 'dispatchEvent') return event => localWindowEvents.dispatchEvent(event);
      if (key === 'setTimeout') return (fn,ms,...args) => { const id = target.setTimeout(() => {timers.delete(id); if(!disposed)fn(...args);},ms); timers.add(id); return id; };
      if (key === 'clearTimeout') return id => { timers.delete(id); target.clearTimeout(id); };
      if (key === 'setInterval') return (fn,ms,...args) => { const id = target.setInterval(() => {if(!disposed)fn(...args);},ms); intervals.add(id); return id; };
      if (key === 'clearInterval') return id => { intervals.delete(id); target.clearInterval(id); };
      if (key === 'requestAnimationFrame') return fn => { const id = target.requestAnimationFrame(time => {frames.delete(id); if(!disposed)fn(time);}); frames.add(id); return id; };
      if (key === 'cancelAnimationFrame') return id => {frames.delete(id); target.cancelAnimationFrame(id);};
      const value = Reflect.get(target,key,target);
      return typeof value === 'function' && !/^[A-Z]/.test(String(key)) ? value.bind(target) : value;
    },
    set(_,key,value) { namespace[key] = value; return true; },
    deleteProperty(_,key) { delete namespace[key]; return true; }
  });
  const fetch = (input, options = {}) => {
    const combined = options.signal ? AbortSignal.any([lifecycle.signal, options.signal]) : lifecycle.signal;
    return (services.fetch || realWindow.fetch.bind(realWindow))(typeof input === 'string' || input instanceof URL ? new URL(input,route) : input, {...options,signal:combined});
  };
  namespace.fetch = fetch;
  const resize = realWindow.ResizeObserver ? new realWindow.ResizeObserver(updateViewport) : null;
  resize?.observe(viewport);
  listen(page,'scroll',() => localWindowEvents.dispatchEvent(new realWindow.Event('scroll')), {passive:true});
  function finishMount() {
    if(disposed || mounted) return false;
    mounted = true;
    root.dispatchEvent(new realWindow.Event('readystatechange'));
    root.dispatchEvent(new realWindow.Event('DOMContentLoaded'));
    if(!disposed) localWindowEvents.dispatchEvent(new realWindow.Event('load'));
    return true;
  }
  function dispose() {
    if(disposed) return;
    disposed = true; lifecycle.abort(); resize?.disconnect();
    for(const remove of removers.splice(0)) remove();
    for(const id of timers) realWindow.clearTimeout(id);
    for(const id of intervals) realWindow.clearInterval(id);
    for(const id of frames) realWindow.cancelAnimationFrame(id);
    for(const observer of observers) observer.disconnect();
    timers.clear(); intervals.clear(); frames.clear(); media.clear(); observers.clear(); activePointers.clear(); windowListeners.length = 0; documentHandlers.clear();
  }
  if(signal?.aborted) dispose(); else if(signal) {signal.addEventListener('abort',dispose,{once:true}); removers.push(() => signal.removeEventListener('abort',dispose));}
  return {root,page,viewport,url:route,document:documentProxy,window:windowProxy,globalThis:windowProxy,location,history,fetch,matchMedia,...observerConstructors,localStorage:services.localStorage || realWindow.localStorage,sessionStorage:services.sessionStorage || realWindow.sessionStorage,signal:lifecycle.signal,updateURL,updateViewport,finishMount,dispose,
    setTimeout:windowProxy.setTimeout,clearTimeout:windowProxy.clearTimeout,setInterval:windowProxy.setInterval,clearInterval:windowProxy.clearInterval,requestAnimationFrame:windowProxy.requestAnimationFrame,cancelAnimationFrame:windowProxy.cancelAnimationFrame};
}
