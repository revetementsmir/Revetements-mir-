-- Default delivery and return checks. Admin can disable, make optional/required,
-- reorder or override them per vehicle/type through inspection_rules.
begin;
insert into mir_core.inspection_rules(organization_id,phase,code,label,requirement,position,photo_required,comment_required,failure_blocks)
select o.id,'delivery',x.code,x.label,x.req,x.pos,x.photo,x.comment,x.block from mir_core.organizations o cross join(values
 ('gps_tracking','GPS actif pendant la tournée','optional',10,false,false,false),
 ('share_eta','Partager l’heure estimée','optional',20,false,false,false),
 ('notify_leader','Notifier le chef d’équipe','required',30,false,false,false),
 ('confirm_arrival','Confirmer l’arrivée','required',40,false,false,true),
 ('unload_scan','Scanner au déchargement','required',50,false,false,true),
 ('delivery_photo','Photo de livraison','optional',60,true,false,false),
 ('recipient_name','Nom du réceptionnaire','optional',70,false,false,false),
 ('signature','Signature','optional',80,false,false,false),
 ('job_qr','QR du chantier','optional',90,false,false,false),
 ('proof_position','Position GPS de la preuve','optional',100,false,false,false),
 ('partial_comment','Commentaire pour livraison partielle','required',110,false,true,true),
 ('unattended_approval','Approbation si aucun réceptionnaire','required',120,true,true,true),
 ('return_damage_photo','Photo pour retour ou dommage','required',130,true,true,true)
)x(code,label,req,pos,photo,comment,block) on conflict do nothing;
insert into mir_core.inspection_rules(organization_id,phase,code,label,requirement,position,photo_required,comment_required,failure_blocks)
select o.id,'return',x.code,x.label,x.req,x.pos,x.photo,x.comment,x.block from mir_core.organizations o cross join(values
 ('remaining_material','Matériel restant dans le véhicule','required',10,false,true,true),
 ('partial_orders','Commandes partielles','required',20,false,true,true),
 ('returns','Retours','required',30,false,true,true),
 ('damaged_products','Produits endommagés','required',40,true,true,true),
 ('end_odometer','Kilométrage final','optional',50,false,false,false),
 ('incidents','Incidents de tournée','optional',60,true,true,false),
 ('return_inspection','Inspection de retour','optional',70,false,true,false)
)x(code,label,req,pos,photo,comment,block) on conflict do nothing;
commit;
