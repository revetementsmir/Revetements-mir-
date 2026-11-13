'use strict';
const TEST='hxtztkmbfpmzrieccwsg.supabase.co';
const routes=new Set(['index.html','native-pdf.html','chantier.html','entrepot.html','coordination.html','production.html','calepinage.html','plan.html','espace-partage.html']);
function allowedRequest(value,origin='https://localhost'){
 try{const u=new URL(value,origin);if(u.username||u.password||u.port&&u.port!=='443')return false;
  if(u.origin===origin)return true;
  if(u.protocol!=='https:'||u.hostname!==TEST)return false;
  if(u.pathname.startsWith('/auth/'))return ['/auth/v1/token','/auth/v1/user','/auth/v1/logout'].includes(u.pathname);
  return ['/rest/v1/','/storage/v1/','/realtime/v1/'].some(p=>u.pathname.startsWith(p));
 }catch{return false;}
}
function allowedRoute(value,origin='https://localhost'){try{const u=new URL(value,origin);return u.origin===origin&&routes.has(u.pathname.slice(1)||'index.html');}catch{return false;}}
function external(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname!=='localhost'&&!u.hostname.endsWith('supabase.co');}catch{return false;}}
module.exports={TEST,allowedRequest,allowedRoute,external};
