const clone = (v) => JSON.parse(JSON.stringify(v));

function norm(v){return String(v??'').trim()}

export function normalizePrincipal(input={}){
  const role=norm(input.role);
  if(!['admin','employee'].includes(role)) throw new Error('Rôle invalide');
  return {userId:norm(input.userId),organizationId:norm(input.organizationId),role,assignedChantiers:[...(input.assignedChantiers||[])].map(String)};
}

function sameOrg(principal,resource){return !!principal.organizationId && principal.organizationId===norm(resource?.organizationId)}
function assigned(principal,resource){return principal.assignedChantiers.includes(norm(resource?.chantierId))}

export function canReadDossier(principalInput,dossier){
  const p=normalizePrincipal(principalInput);
  if(!sameOrg(p,dossier)) return false;
  if(p.role==='admin') return true;
  return assigned(p,dossier) && dossier?.employeeVisibility==='published';
}

export function canWriteDossier(principalInput,dossier){
  const p=normalizePrincipal(principalInput);
  return sameOrg(p,dossier) && p.role==='admin';
}

export function canReadProduction(principalInput,dossier){
  const p=normalizePrincipal(principalInput);
  return sameOrg(p,dossier) && p.role==='admin';
}

export function canReadPublishedDocument(principalInput,{dossier,document}){
  const p=normalizePrincipal(principalInput);
  if(!sameOrg(p,dossier)) return false;
  if(document?.accessPolicy?.visibility!=='private' || document?.accessPolicy?.serverAuthorizationRequired!==true) return false;
  if(p.role==='admin') return true;
  return assigned(p,dossier) && dossier?.employeeVisibility==='published' && document?.accessPolicy?.audience==='assigned-employees';
}

export function canManageInventory(principalInput,resource){
  const p=normalizePrincipal(principalInput);
  return sameOrg(p,resource) && p.role==='admin';
}

export function canPlaceEmployeeOrder(principalInput,{organizationId,chantierId}){
  const p=normalizePrincipal(principalInput);
  return p.role==='employee' && p.organizationId===norm(organizationId) && p.assignedChantiers.includes(norm(chantierId));
}

export function policyDecision(action,principal,resource){
  switch(action){
    case 'dossier.read': return canReadDossier(principal,resource);
    case 'dossier.write': return canWriteDossier(principal,resource);
    case 'production.read': return canReadProduction(principal,resource);
    case 'inventory.manage': return canManageInventory(principal,resource);
    default: return false;
  }
}

export function rlsContract(){
  return clone({
    enforcement:'server-required',
    warning:'Le contrôle client ne remplace jamais RLS/API serveur.',
    claims:{organizationId:'app_metadata.organization_id',role:'app_metadata.role'},
    rules:[
      'admin: organisation identique pour dossiers/production/inventaire',
      'employee: organisation identique + chantier assigné + dossier publié employé',
      'documents: stockage privé + autorisation serveur + audience assignée',
      'employee: jamais accès production brute',
    ],
  });
}
