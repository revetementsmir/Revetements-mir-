'use strict';
/* MIR — garde-fous de la remise à zéro locale de l'atelier. */
const assert=require('node:assert/strict');
const R=require('../dist/mir-workshop-reset.js');
function mem(init={}){
 const map=new Map(Object.entries(init));
 return {getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),dump:()=>Object.fromEntries(map)};
}
let n=0;
function test(label,fn){fn();n++;console.log('PASS '+label);}
const initial=()=>({
 'mir_production_templates_v1':JSON.stringify({version:1,records:[{id:'M-Test-1'},{id:'M-Test-2'}]}),
 'mir_production_admin_dossier_v1':JSON.stringify({version:1,order:{id:'DOS-001',items:[{id:'P001'}]}}),
 'mir-bending-v1':JSON.stringify({version:1,project:'Job test',items:[{id:'Q001'}]}),
 'mir_production_requests_v1':JSON.stringify({version:1,requests:[{id:'REQ-001'}]}),
 'mir_production_client_dossier_v1':JSON.stringify({version:1,order:{id:'CLIENT-001',items:[{id:'C001'}]}}),
 'mir_production_employee_dossier_v1':JSON.stringify({version:1,order:{id:'EMP-001',items:[]}}),
 'mir_production_admin_orders_v1':JSON.stringify([{id:'PO-001'}]),
 'mir_admin_procurement_v1':JSON.stringify({version:1,suppliers:[{id:'unico',name:'Contact MIR modifié',verified:true}],orders:[{id:'F-PO-001'}]}),
 'mir_plan_project_v1':JSON.stringify({id:'plan-intact'}),
 'autre_application':JSON.stringify({token:'non pertinent'})
});
test('La remise à zéro sélectionne les profils, le brouillon admin et la liste rapide uniquement',()=>{
 const ids=R.GROUPS.filter(g=>g.selected).map(g=>g.id);
 assert.deepEqual(ids,['models','work','quick']);
 assert.deepEqual(R.scopeKeys(ids),['mir_production_templates_v1','mir_production_admin_dossier_v1','mir-bending-v1']);
});
test('Les catégories affichent la quantité de données présentes',()=>{
 const s=mem(initial()),p=R.preview(s,['models','work','quick','orders']);
 assert.equal(p[0].entries,2);assert.equal(p[1].entries,1);assert.equal(p[2].entries,1);
 assert.equal(p[3].stored,2);
});
test('Sauvegarde portable avant effacement : octets stockés intacts',()=>{
 const s=mem(initial()),backup=R.backup(s,['models','work']);
 assert.equal(backup.schema,'mir-workshop-reset-backup-v1');
 assert.equal(backup.entries.mir_production_templates_v1,s.getItem('mir_production_templates_v1'));
 assert.equal(backup.entries.mir_production_admin_dossier_v1,s.getItem('mir_production_admin_dossier_v1'));
 assert.equal(backup.entries.mir_admin_procurement_v1,undefined);
});
test('Réinitialisation standard : modèles et brouillons effacés, commandes et clients préservés',()=>{
 const s=mem(initial()),before=s.dump();
 const result=R.clear(s,['models','work','quick']);
 assert.equal(result.ok,true);
 for(const key of ['mir_production_templates_v1','mir_production_admin_dossier_v1','mir-bending-v1'])assert.equal(s.getItem(key),null);
 for(const key of ['mir_production_requests_v1','mir_production_client_dossier_v1','mir_production_employee_dossier_v1','mir_production_admin_orders_v1','mir_admin_procurement_v1','mir_plan_project_v1','autre_application'])assert.equal(s.getItem(key),before[key],key+' doit être préservé');
});
test('Suppression des archives uniquement sur choix exprès, contacts fournisseurs conservés',()=>{
 const s=mem(initial()),data=JSON.parse(s.getItem('mir_admin_procurement_v1'));
 const result=R.clear(s,['orders']);
 assert.equal(result.ok,true);
 assert.equal(s.getItem('mir_production_admin_orders_v1'),null);
 const after=JSON.parse(s.getItem('mir_admin_procurement_v1'));
 assert.deepEqual(after.suppliers,data.suppliers);assert.deepEqual(after.orders,[]);
 assert.ok(s.getItem('mir_production_templates_v1'),'Aucun modèle supprimé par une action archives');
});
test('Réinitialisation ciblée des dossiers client et employé sans toucher le Studio',()=>{
 const s=mem(initial());R.clear(s,['other']);
 assert.equal(s.getItem('mir_production_client_dossier_v1'),null);
 assert.equal(s.getItem('mir_production_employee_dossier_v1'),null);
 assert.ok(s.getItem('mir_plan_project_v1'));
});
test('Archives illisibles : aucune suppression partielle',()=>{
 const i=initial();i.mir_admin_procurement_v1='cassé !';
 const s=mem(i),previous=s.dump(),result=R.clear(s,['models','orders']);
 assert.equal(result.ok,false);assert.deepEqual(s.dump(),previous);
});
test('Stockage indisponible pendant la suppression : restauration des valeurs',()=>{
 const i=initial(),s=mem(i),real=s.removeItem;let failed=false;
 s.removeItem=key=>{if(key==='mir_production_admin_dossier_v1'&&!failed){failed=true;throw new Error('Quota / erreur simulée');}real(key);};
 const result=R.clear(s,['models','work']);
 assert.equal(result.ok,false);
 assert.equal(result.restored,true);
 assert.deepEqual(s.dump(),i);
});
test('Aucune catégorie et nom de clé inconnue ne déclenchent un effacement',()=>{
 const s=mem(initial()),previous=s.dump();
 assert.equal(R.clear(s,[]).ok,false);
 assert.equal(R.clear(s,['autre']).ok,false);
 assert.deepEqual(s.dump(),previous);
});
console.log('MIR nettoyage atelier : '+n+' tests réussis');
