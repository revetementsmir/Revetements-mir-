const TEST_REF='hxtztkmbfpmzrieccwsg';
export function environmentURL(environment,href=location.href,moduleURL=import.meta.url){
  const current=new URL(href),directory=new URL('./',moduleURL);
  const isTest=directory.pathname.endsWith('/test/');
  const root=isTest?new URL('../',directory):directory;
  const target=new URL(environment==='test'?'test/responsive.html':'responsive.html',root);
  target.search=current.search;target.searchParams.delete('recette');
  return target;
}
export function mountEnvironmentSwitch(workspace){
  const isTest=Boolean(window.MIRTestEnvironment?.environment==='test');
  const nav=document.createElement('nav');nav.className='mir-environment-switch';nav.setAttribute('aria-label','Environnement MIR');nav.dataset.responsiveToolbarAction='true';
  const links={};
  for(const [id,label]of [['test','TEST'],['production','PRODUCTION']]){
    const link=document.createElement('a');link.textContent=label;link.dataset.mirEnvironment=id;
    if((id==='test')===isTest)link.setAttribute('aria-current','page');
    links[id]=link;nav.append(link);
  }
  const status=document.createElement('span');status.setAttribute('role','status');status.textContent=isTest?'MIR TEST · données de recette':'PRODUCTION · données réelles';nav.append(status);
  const style=document.createElement('style');style.textContent='.mir-environment-switch{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font:12px/1.4 system-ui}.mir-environment-switch a{display:inline-flex;align-items:center;min-height:44px;padding:8px 12px;border:1px solid #7d887a;border-radius:7px;text-decoration:none;color:#17301f;background:white;font-weight:750}.mir-environment-switch a[aria-current=page]{color:white;background:#27452d}.mir-environment-switch a[data-mir-environment=test][aria-current=page]{background:#74420b}.mir-environment-switch a[aria-disabled=true]{opacity:.5;cursor:not-allowed}.mir-environment-switch span{padding-inline:5px}';document.head.append(style);
  let available=false,disposed=false;
  function update(){links.production.href=environmentURL('production').href;if(available)links.test.href=environmentURL('test').href;}
  links.test.setAttribute('aria-disabled','true');links.test.title='Vérification de MIR TEST…';update();
  const refresh=()=>{update();queueMicrotask(update);};workspace.addEventListener('click',refresh,true);workspace.addEventListener('change',refresh);
  workspace.querySelector('.preview-workspace-toolbar').append(nav);
  const manifest=new URL('mir-test-environment.json',environmentURL('test'));
  fetch(manifest,{cache:'no-store',credentials:'omit'}).then(async response=>{
    if(!response.ok)throw Error('Site TEST non publié');const data=await response.json();
    if(data.environment!=='test'||data.projectRef!==TEST_REF||! /^[a-f0-9]{40}$/.test(data.revision))throw Error('Site TEST non vérifié');
    if(disposed)return;available=true;links.test.removeAttribute('aria-disabled');links.test.title='Ouvrir MIR TEST';update();
  }).catch(()=>{if(!disposed)links.test.title='MIR TEST indisponible — aucun basculement vers la production';});
  return()=>{disposed=true;workspace.removeEventListener('click',refresh,true);workspace.removeEventListener('change',refresh);nav.remove();style.remove();};
}
