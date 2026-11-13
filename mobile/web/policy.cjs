'use strict';
const TEST='hxtztkmbfpmzrieccwsg.supabase.co';
const routes=new Set(['index.html','native-checks.html','native-pdf.html','chantier.html','entrepot.html','coordination.html','production.html','calepinage.html','espace-partage.html']);
function allowedRequest(value,origin='https://localhost'){
 try{const u=new URL(value,origin);if(u.username||u.password||u.port&&u.port!=='443')return false;
  if(u.origin===origin)return true;
  if(u.protocol!=='https:'||u.hostname!==TEST)return false;
  if(/^\/rest\/v1\/rpc\/mir_(?:client_|estimate_)/.test(decodeURIComponent(u.pathname)))return false;
  if(u.pathname.startsWith('/auth/'))return ['/auth/v1/token','/auth/v1/user','/auth/v1/logout'].includes(u.pathname);
  return ['/rest/v1/','/storage/v1/','/realtime/v1/'].some(p=>u.pathname.startsWith(p));
 }catch{return false;}
}
function allowedRoute(value,origin='https://localhost'){try{
 const u=new URL(value,origin),p=u.searchParams;
 if(u.origin!==origin||!routes.has(u.pathname.slice(1)||'index.html')||p.has('estimate'))return false;
 // The employee folding tool shares an engine with the public configurator.
 // Only its store/profile variant is an internal journey, never public panels.
 if(['mode','source','kind'].some(key=>p.getAll(key).length>1))return false;
 if(p.get('mode')==='client')return u.pathname==='/production.html'&&p.get('source')==='store'&&p.get('kind')==='profile';
 return true;
}catch{return false;}}
function external(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname!=='localhost'&&!u.hostname.endsWith('supabase.co')&&!['revetementsmir.com','www.revetementsmir.com','revetementsmir.github.io'].includes(u.hostname);}catch{return false;}}
module.exports={TEST,allowedRequest,allowedRoute,external};
