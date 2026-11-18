'use strict';
// Preview-only build of the existing MIR client. Never deploys or changes a backend.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {build}=require('./build-mir-test.cjs');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.prestige-preview');
if(fs.existsSync(output))fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output);
const revision=/^[a-f0-9]{40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA||'')?process.env.VERCEL_GIT_COMMIT_SHA:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const captureManifest=path.join(root,'docs/verification/prestige-20261117/captures-gallery-manifest.json');
if(fs.existsSync(captureManifest))cp.execFileSync(process.execPath,[path.join(root,'scripts/export-prestige-gallery.cjs'),'--manifest',captureManifest,'--archive'],{cwd:root,stdio:'pipe'});
build(path.join(root,'dist'),path.join(output,'test'),revision);
// Estimation 04 can save actual PDF files to its existing IndexedDB draft in
// this offline preview. The limits come from the real service contract. This
// read-only local configuration never enables submission or simulates receipt.
const {LIMITS,PROJECT_DETAILS_VERSION}=require('../supabase/functions/_shared/estimate-contract.mjs');
const estimatePreview=path.join(output,'test','estimate-preview-api');
fs.mkdirSync(estimatePreview,{recursive:true});
fs.writeFileSync(path.join(estimatePreview,'config'),JSON.stringify({enabled:false,preview:true,limits:LIMITS,projectDetailsVersion:PROJECT_DETAILS_VERSION,transport:'multipart'}));
fs.appendFileSync(path.join(output,'test','mir-estimate-config.js'),`\nif(location.pathname.endsWith('/estimation.html'))window.MIREstimateConfig=Object.freeze({environment:'test',preview:true,apiBase:new URL('estimate-preview-api',location.href).href});\n`);
// This layer exists only in the generated preview. It never changes live Auth,
// application endpoints, account state, business forms or the drawing engines.
function previewGuard(){
 'use strict';
 const root=new URL('./',document.currentScript.src);
 const local=input=>{const u=new URL(typeof input==='object'&&input?.url?input.url:String(input),location.href);return ['blob:','data:'].includes(u.protocol)||(u.origin===location.origin&&u.pathname.startsWith(root.pathname));};
 const readOnly=method=>['GET','HEAD'].includes(String(method||'GET').toUpperCase());
 const fail=()=>new Error('PREVIEW_EXTERNAL_REQUEST_DISABLED');
 const fetcher=window.fetch.bind(window);
 window.fetch=(input,init)=>{try{if(!local(input)||!readOnly(init?.method||input?.method))throw fail();return fetcher(input,init);}catch(error){return Promise.reject(error);}};
 const open=XMLHttpRequest.prototype.open;
 XMLHttpRequest.prototype.open=function(method,url,...args){if(!local(url)||!readOnly(method))throw fail();return open.call(this,method,url,...args);};
 for(const key of ['WebSocket','EventSource'])if(window[key])window[key]=class{constructor(){throw fail();}};
 navigator.sendBeacon=()=>false;
 const popup=window.open.bind(window);
 window.open=(url,...args)=>url&&local(url)?popup(url,...args):null;
 const blockedForm=form=>form.matches('form[id^="auth-"],form[id^="portal-"],#estimate-form,#mir-help-create,#mir-help-reply,#account-address-form')||!local(form.action)||!readOnly(form.method);
 window.addEventListener('submit',event=>{if(blockedForm(event.target)){event.preventDefault();event.stopImmediatePropagation();}},true);
 const submit=HTMLFormElement.prototype.submit;
 HTMLFormElement.prototype.submit=function(){if(!blockedForm(this))return submit.call(this);};
 // Keep offline file downloads (including PDF/JSON Blob URLs) usable.
 window.addEventListener('click',event=>{const anchor=event.target.closest?.('a[href]');if(anchor&&!local(anchor.href)){event.preventDefault();event.stopImmediatePropagation();}},true);
 function accountNotice(){
  if(!location.pathname.endsWith('/chantier.html'))return;
  const query=new URLSearchParams(location.search);
  if(query.get('clientLocale')!=='1'||['invite','invitation','token'].some(key=>query.has(key)))return;
  const notice=document.createElement('p');notice.dataset.mirPreviewAccountNotice='true';notice.setAttribute('role','status');notice.style.cssText='max-width:1200px;margin:20px auto;padding:14px 20px;border:1px solid #d4c6b3;border-radius:4px;background:#eee8de;color:#242522;font:14px/1.5 system-ui';
  const sync=()=>{
   const invitation=document.querySelector('[data-mir-invitation="true"]')||sessionStorage.getItem('mir_portal_invitation_v1');
   const eligible=!invitation&&['login','client','loading'].includes(document.body.dataset.portalMode||'login')&&window.MIRPortalActiveClient?.getStatus?.().phase!=='ready';
   notice.hidden=!eligible;
   const text=document.documentElement.lang==='en-CA'?'TEST preview: sign-in and submissions are disabled.':'Aperçu TEST : connexion et envois désactivés.';
   if(notice.textContent!==text)notice.textContent=text;
   if(eligible)document.querySelectorAll('form[id^="auth-"] button[type="submit"],form[id^="auth-"] button:not([type]),form[id^="auth-"] input[type="submit"]').forEach(button=>{if(!button.disabled)button.disabled=true;});
  };
  (document.querySelector('#portal-main')||document.body).prepend(notice);sync();
  new MutationObserver(sync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-portal-mode']});
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',accountNotice,{once:true}):accountNotice();
}
const guard='/* Generated visual preview only; never shipped in the application source. */\n('+previewGuard.toString()+')();\n';
fs.writeFileSync(path.join(output,'test','mir-prestige-preview-guard.js'),guard);
// The public Studio state remains separate from the tools available on TEST.
fs.writeFileSync(path.join(output,'test','studio-public.html'),fs.readFileSync(path.join(root,'ops/studio-public/under-construction.html'),'utf8').replace('<head>','<head><meta name="robots" content="noindex,nofollow"><script src="mir-test-guard.js"></script>'));
const policy="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' data: blob:; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";
function protect(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
 const file=path.join(directory,entry.name);if(entry.isDirectory()){protect(file);continue;}if(!entry.name.endsWith('.html'))continue;
 const script=path.relative(directory,path.join(output,'test','mir-prestige-preview-guard.js')).split(path.sep).join('/');
 const testScript=path.relative(directory,path.join(output,'test','mir-test-guard.js')).split(path.sep).join('/');
 let html=fs.readFileSync(file,'utf8').replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/ig,'');
 const protection='<meta http-equiv="Content-Security-Policy" content="'+policy+'"><script src="'+script+'"></script>'+(/<script\b[^>]*src=["'][^"']*mir-test-guard\.js["']/i.test(html)?'':'<script src="'+testScript+'"></script>');
 if(/<head(?:\s[^>]*)?>/i.test(html))html=html.replace(/<head(?:\s[^>]*)?>/i,match=>match+protection);
 else if(/<html(?:\s[^>]*)?>/i.test(html))html=html.replace(/<html(?:\s[^>]*)?>/i,match=>match+'<head>'+protection+'</head>');
 else html='<head>'+protection+'</head>'+html;
 fs.writeFileSync(file,html);
}}
protect(path.join(output,'test'));
// Static hosts that support _headers also apply the policy to worker responses.
fs.writeFileSync(path.join(output,'_headers'),'/*\n  Content-Security-Policy: '+policy+'\n  X-Robots-Tag: noindex, nofollow\n');
fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><html lang="fr-CA"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=test/index.html"><title>MIR · Aperçu TEST</title><a href="test/index.html">Ouvrir l’aperçu MIR TEST</a></html>');
fs.writeFileSync(path.join(output,'robots.txt'),'User-agent: *\nDisallow: /\n');
console.log(JSON.stringify({output,revision,environment:'visual-test',externalRequests:false}));
