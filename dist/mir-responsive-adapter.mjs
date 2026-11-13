import {isolatePageStyles} from './mir-responsive-styles.mjs';
if(document.readyState==='loading') await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
const PROJECT='7afd893e-adcb-494b-a82b-c4cf8b28f94e';
const params=new URL(location.href).searchParams;
const current=params.get('page')||'index.html';
const sourceUrl=new URL(current,location.href);sourceUrl.search=location.search;
for(const key of ['page','layout','phone','tablet','desktop'])sourceUrl.searchParams.delete(key);
sourceUrl.hash=location.hash;
const page=document.createElement('div');page.dataset.mirResponsivePage='true';
for(const attribute of document.body.attributes)page.setAttribute(attribute.name,attribute.value);
page.classList.add(...document.documentElement.classList);
for(const attribute of document.documentElement.attributes)if(attribute.name.startsWith('data-'))page.setAttribute(attribute.name,attribute.value);
page.append(...[...document.body.childNodes].filter(node=>node.nodeName!=='SCRIPT'));
// Async MIR controllers query the document while the shared toolkit imports.
// Keep their real nodes connected throughout mounting, not in a detached tree.
document.body.append(page);
let restoreStyles;
try{restoreStyles=isolatePageStyles();}catch(error){document.body.append(page);const alert=document.createElement('p');alert.setAttribute('role','alert');alert.textContent='Styles de prévisualisation indisponibles : '+error.message;document.body.prepend(alert);throw error;}
document.body.removeAttribute('style');
const css=document.createElement('style');css.textContent=`
  .mir-live-viewport{width:100%;height:100%;container:mir-page/size;overflow:hidden;transform:translateZ(0);background:white;color:#26332b}
  .ap-device-content.mir-live-viewport{height:auto;container-name:mir-page}
  [data-mir-responsive-page]{position:relative;isolation:isolate;min-height:100%;width:100%;font:16px/1.5 Arial,sans-serif}
  .mir-live-viewport>[data-mir-responsive-page]{height:100%;overflow:auto;overscroll-behavior:contain}
  html[data-preview-workspace] .web-document{padding:0!important;overflow:hidden!important}
  .mir-responsive-notice{padding:8px 16px;font:12px/1.5 system-ui;color:#52664c;background:#f5f7f0}
`;document.head.append(css);
try {
  const {mountResponsiveWorkspace,attachDeviceChrome,mountAnnotationBoard,createAnnotationService}=await import('https://atelier.atelier-app-001.workers.dev/responsive/v1/entry.mjs');
  let context;
  const notify=()=>document.dispatchEvent(new CustomEvent('mir:responsive-viewport'));
  function device(id){
    const frame=document.createElement('section');frame.id=id;
    const chrome=attachDeviceChrome(frame);
    const viewport=document.createElement('div');viewport.className='ap-device-content mir-live-viewport';viewport.dataset.mirResponsiveViewport='true';frame.append(viewport);
    return {frame,phone:frame,viewport,setDevice(preset){chrome.setDevice(preset);notify();},setScale(scale){frame.style.setProperty('--preview-scale',String(scale));},dispose(){chrome.dispose();frame.remove();}};
  }
  const primary=device('mir-responsive-device'),secondary=device('mir-responsive-secondary');
  const webViewport=document.createElement('div');webViewport.className='mir-live-viewport';webViewport.dataset.mirResponsiveViewport='true';
  const relocate=()=>{if(!context)return;const target=context.state.layout==='web'?webViewport:primary.viewport;if(page.parentElement!==target)target.append(page);notify();};
  // MIR's legacy pages are single live documents. Do not clone controllers,
  // duplicate element IDs, or present a noninteractive second copy as real.
  const query=new URLSearchParams(location.search);if(!['phone','tablet','web'].includes(query.get('layout')))query.set('layout','phone');
  const api=await mountResponsiveWorkspace({
    projectId:PROJECT,title:'Les Revêtements MIR',query,
    adapters:{createPrimary:()=>primary,createSecondary:()=>secondary},
    web:{title:'MIR',mount(root){root.append(webViewport);return {showPage(){},dispose(){webViewport.remove();}};}},
    annotations:false,
    afterMount(value){
      context=value;
      for(const button of value.workspace.querySelectorAll('[data-layout="phone-tablet"],[data-layout="phone-web"]'))button.remove();
      const notice=document.createElement('div');notice.className='mir-responsive-notice';
      notice.textContent='Vrais écrans MIR · une vue active à la fois. Les vues simultanées nécessitent encore des contrôleurs indépendants. Annotations en mémoire : copier avant de changer de page.';
      value.workspace.querySelector('.preview-workspace-toolbar').append(notice);
      const observer=new MutationObserver(relocate);
      for(const pane of value.workspace.querySelectorAll('.preview-pane'))observer.observe(pane,{attributes:true,attributeFilter:['hidden']});
      const resize=new ResizeObserver(notify);resize.observe(primary.viewport);resize.observe(webViewport);
      relocate();
      return ()=>{observer.disconnect();resize.disconnect();};
    }
  });
  const board=mountAnnotationBoard(context.workspace,{projectId:PROJECT,title:'Les Revêtements MIR',service:createAnnotationService({projectId:PROJECT}),getContext:()=>({sourceUrl:sourceUrl.href,interface:current,device:context.state.layout+' · '+(context.state.layout==='web'?context.state.desktop:context.state.layout==='tablet'?context.state.tablet:context.state.phone)})});
  const syncClasses=()=>{page.className=[...new Set([...document.body.classList,...document.documentElement.classList])].join(' ');};
  const classes=new MutationObserver(syncClasses);classes.observe(document.body,{attributes:true,attributeFilter:['class']});classes.observe(document.documentElement,{attributes:true,attributeFilter:['class']});syncClasses();
  context.workspace.dataset.mirResponsiveReady='true';
  window.addEventListener('beforeunload',event=>{if(board.getAnnotations().length||document.querySelector('.annotation-editor textarea')?.value.trim()){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pagehide',()=>{classes.disconnect();board.dispose();api.dispose();},{once:true});
}catch(error){restoreStyles();document.body.append(page);const alert=document.createElement('p');alert.setAttribute('role','alert');alert.textContent='Responsive Atelier indisponible : '+error.message;document.body.prepend(alert);}
document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest?.('a[href]');if(!link||!page.contains(link)||link.target==='_blank'||link.hasAttribute('download')||link.getAttribute('href').startsWith('#'))return;
  const url=new URL(link.href,document.baseURI);if(url.origin!==location.origin)return;
  const name=link.getAttribute('href').startsWith('?')?current:url.pathname.split('/').pop();
  const allowed=new Set(['index.html','boutique.html','produit.html','selection.html','pliage.html','production.html','chantier.html','entrepot.html','coordination.html','calepinage.html','plan.html','realisations.html','contact.html','materiaux.html']);
  if(!allowed.has(name))return;event.preventDefault();const target=new URL('responsive.html',document.baseURI);target.search=url.search;target.searchParams.set('page',name);
  for(const key of ['layout','phone','tablet','desktop'])if(new URL(location.href).searchParams.has(key))target.searchParams.set(key,new URL(location.href).searchParams.get(key));target.hash=url.hash;location.assign(target.href);
});
