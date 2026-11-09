begin;
create or replace function public.mir_portal_command(p_request_id uuid,p_command text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare a jsonb;org uuid;uid uuid:=auth.uid();old mir_core.portal_operations;result jsonb;target uuid;ids uuid[];j mir_core.jobs;oid uuid;line jsonb;item mir_core.catalogue_items;spec jsonb;qty numeric;col jsonb;fmt jsonb;lid uuid;key text;profile mir_core.staff_profiles;begin
 a:=public.mir_account_snapshot();org:=(a->>'organizationId')::uuid;
 if a->>'role' not in ('admin','employee') then raise exception 'Accès équipe actif requis' using errcode='42501';end if;
 perform 1 from mir_core.memberships m where m.organization_id=org and m.user_id=uid and m.active for share;
 if not found then raise exception 'Accès suspendu' using errcode='42501';end if;
 if p_request_id is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>200000 then raise exception 'Action invalide' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||uid::text||p_request_id::text,0));
 select * into old from mir_core.portal_operations p where p.organization_id=org and p.actor_id=uid and p.request_id=p_request_id;
 if found then
  if old.command<>p_command or old.payload<>p_payload then raise exception 'Cette opération a déjà un autre contenu' using errcode='22023';end if;
  return jsonb_build_object('ok',true,'result',old.result,'snapshot',public.mir_portal_snapshot(),'replayed',true);
 end if;
 if p_command in ('CREATE_JOB','UPDATE_JOB') then
  if not mir_core.job_manager(org) then raise exception 'Permission de gestion des chantiers requise' using errcode='42501';end if;
  if length(trim(coalesce(p_payload->>'name',''))) not between 1 and 160 or length(trim(coalesce(p_payload->>'number',''))) not between 1 and 40 or length(coalesce(p_payload->>'address',''))>300 then raise exception 'Numéro, nom et adresse du chantier à vérifier' using errcode='22023';end if;
  if p_command='CREATE_JOB' then
   insert into mir_core.jobs(organization_id,name,job_number,delivery_address,team,foreman,required_date) values(org,trim(p_payload->>'name'),trim(p_payload->>'number'),coalesce(p_payload->>'address',''),coalesce(p_payload->>'team',''),coalesce(p_payload->>'foreman',''),nullif(p_payload->>'requiredDate','')::date) returning * into j;
  else
   update mir_core.jobs set name=trim(p_payload->>'name'),job_number=trim(p_payload->>'number'),delivery_address=coalesce(p_payload->>'address',''),team=coalesce(p_payload->>'team',''),foreman=coalesce(p_payload->>'foreman',''),required_date=nullif(p_payload->>'requiredDate','')::date,archived=coalesce((p_payload->>'archived')::boolean,false),revision=revision+1 where organization_id=org and id=(p_payload->>'jobId')::uuid and revision=(p_payload->>'revision')::integer returning * into j;
   if not found then raise exception 'Chantier modifié. Rechargez sa fiche.' using errcode='40001';end if;
  end if;result:=jsonb_build_object('jobId',j.id,'number',j.job_number);
 elsif p_command='ASSIGN_MEMBER_JOBS' then
  if not mir_core.job_manager(org) then raise exception 'Gestion des chantiers requise' using errcode='42501';end if;
  target:=(p_payload->>'memberId')::uuid;
  perform 1 from mir_core.memberships where organization_id=org and user_id=target and active and role='employee' for update;
  if not found then raise exception 'Employé actif requis' using errcode='42501';end if;
  select coalesce(array_agg(distinct value::uuid),'{}') into ids from jsonb_array_elements_text(p_payload->'jobIds');
  if cardinality(ids)>100 or exists(select 1 from unnest(ids) id where not exists(select 1 from mir_core.jobs candidate where candidate.organization_id=org and candidate.id=id and not candidate.archived)) then raise exception 'Chantier inaccessible' using errcode='42501';end if;
  delete from mir_core.job_memberships where organization_id=org and user_id=target and not(job_id=any(ids)) and job_id in(select id from mir_core.jobs where organization_id=org and not archived);
  insert into mir_core.job_memberships select org,id,target from unnest(ids) id on conflict do nothing;
  select * into profile from mir_core.staff_profiles where organization_id=org and user_id=target;
  if found then delete from mir_core.staff_job_assignments where organization_id=org and profile_id=profile.id and job_id in(select id from mir_core.jobs where organization_id=org and not archived);insert into mir_core.staff_job_assignments select org,profile.id,id from unnest(ids) id on conflict do nothing;end if;
  result:=jsonb_build_object('memberId',target,'jobIds',to_jsonb(ids));
 elsif p_command='SET_MEMBER_ACTIVE' then
  if a->>'role'<>'admin' then raise exception 'Administration requise' using errcode='42501';end if;
  target:=(p_payload->>'memberId')::uuid;
  if target=uid then raise exception 'Votre propre accès ne peut pas être suspendu ici' using errcode='22023';end if;
  update mir_core.memberships set active=(p_payload->>'active')::boolean where organization_id=org and user_id=target and role='employee';
  if not found then raise exception 'Employé introuvable' using errcode='22023';end if;
  update mir_core.staff_profiles set suspended=not (p_payload->>'active')::boolean,revision=revision+1,updated_at=now() where organization_id=org and user_id=target;
  if not (p_payload->>'active')::boolean then update mir_core.account_invitations set revoked_at=coalesce(revoked_at,now()) where organization_id=org and accepted_at is null and email=(select lower(email) from auth.users where id=target);end if;
  result:=jsonb_build_object('memberId',target,'active',(p_payload->>'active')::boolean);
 elsif p_command='SAVE_STAFF' then
  if a->>'role'<>'admin' then raise exception 'Administration requise' using errcode='42501';end if;
  if length(trim(coalesce(p_payload->>'name',''))) not between 1 and 160 or coalesce(p_payload->>'email','')!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Nom et courriel valides requis' using errcode='22023';end if;
  select * into profile from mir_core.staff_profiles where organization_id=org and id=nullif(p_payload->>'profileId','')::uuid for update;
  if found then
   if profile.user_id is not null and lower(trim(p_payload->>'email'))<>profile.email then raise exception 'Un compte lié conserve son courriel de connexion. Préparez une nouvelle invitation pour une autre adresse.' using errcode='22023';end if;
   if profile.revision<>(p_payload->>'revision')::integer then raise exception 'Fiche modifiée. Rechargez-la.' using errcode='40001';end if;
   update mir_core.staff_profiles set name=trim(p_payload->>'name'),email=lower(trim(p_payload->>'email')),team=coalesce(p_payload->>'team',''),revision=revision+1,updated_at=now() where organization_id=org and id=profile.id returning * into profile;
  else insert into mir_core.staff_profiles(organization_id,name,email,team,user_id) values(org,trim(p_payload->>'name'),lower(trim(p_payload->>'email')),coalesce(p_payload->>'team',''),(select m.user_id from mir_core.memberships m join auth.users u on u.id=m.user_id where m.organization_id=org and m.role='employee' and lower(u.email)=lower(trim(p_payload->>'email')))) returning * into profile;end if;
  result:=jsonb_build_object('profileId',profile.id,'revision',profile.revision);
 elsif p_command='SET_PERMISSIONS' then
  if a->>'role'<>'admin' then raise exception 'Administration requise' using errcode='42501';end if;
  target:=(p_payload->>'memberId')::uuid;
  perform public.mir_coordination_grant(org,target,coalesce((p_payload->>'coordination')::boolean,false));
  perform public.mir_warehouse_grant_access(org,target,coalesce((p_payload->>'warehouse')::boolean,false));
  insert into mir_core.admin_permissions values(org,target,coalesce((p_payload->>'jobs')::boolean,false),coalesce((p_payload->>'estimates')::boolean,false)) on conflict(organization_id,user_id) do update set jobs=excluded.jobs,estimates=excluded.estimates;
  result:=jsonb_build_object('memberId',target);
 elsif p_command='SAVE_SUPPLIER' then
  if a->>'role'<>'admin' then raise exception 'Administration requise' using errcode='42501';end if;
  if length(trim(coalesce(p_payload->>'name',''))) not between 1 and 160 or coalesce(p_payload->>'email','')!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Nom et courriel fournisseur requis' using errcode='22023';end if;
  target:=coalesce(nullif(p_payload->>'supplierId','')::uuid,gen_random_uuid());
  insert into mir_core.suppliers(organization_id,id,name,email,verified_at) values(org,target,trim(p_payload->>'name'),lower(trim(p_payload->>'email')),case when (p_payload->>'confirmed')::boolean then now() end) on conflict(organization_id,id) do update set name=excluded.name,email=excluded.email;
  if coalesce((p_payload->>'confirmed')::boolean,false) then update mir_core.suppliers set verified_at=now() where organization_id=org and id=target;end if;
  result:=jsonb_build_object('supplierId',target);
 elsif p_command='PUBLISH_CATALOGUE' then
  if a->>'role'<>'admin' then raise exception 'Administration requise' using errcode='42501';end if;
  spec:=p_payload->'item';
  if jsonb_typeof(spec)<>'object' or length(coalesce(spec->>'id','')) not between 1 and 100 or length(coalesce(spec->>'name','')) not between 1 and 180 or length(coalesce(spec->>'unit','')) not between 1 and 35 or coalesce((spec->>'quantityStep')::numeric,1)<=0 then raise exception 'Référence catalogue invalide' using errcode='22023';end if;
  select * into item from mir_core.catalogue_items where organization_id=org and channel='store' and specification->>'id'=spec->>'id' for update;
  if found then update mir_core.catalogue_items set name=spec->>'name',specification=spec,published=true,archived=false where organization_id=org and id=item.id returning * into item;
  else insert into mir_core.catalogue_items(organization_id,name,channel,published,specification) values(org,spec->>'name','store',true,spec) returning * into item;end if;
  result:=jsonb_build_object('catalogueId',item.id);
 elsif p_command='CREATE_ORDER' then
  select * into j from mir_core.jobs where organization_id=org and id=(p_payload->>'jobId')::uuid and not archived for share;
  if not found or not mir_core.job_allowed(org,j.id) then raise exception 'Choisissez un chantier assigné et actif' using errcode='42501';end if;
  if jsonb_typeof(p_payload->'lines')<>'array' or jsonb_array_length(p_payload->'lines') not between 1 and 100 then raise exception 'Ajoutez au moins un article valide' using errcode='22023';end if;
  if p_payload->>'deliveryMode' not in ('delivery','pickup') or length(coalesce(p_payload->>'note',''))>4000 then raise exception 'Mode de livraison ou note invalide' using errcode='22023';end if;
  oid:=gen_random_uuid();
  insert into mir_core.orders(organization_id,id,kind,owner_id,job_id,order_number,status) values(org,oid,'employee',uid,j.id,'CMD-'||upper(substr(replace(oid::text,'-',''),1,12)),'approved');
  insert into mir_core.order_revisions(organization_id,order_id,revision,snapshot) values(org,oid,1,jsonb_build_object('job',coalesce(j.job_number||' · ','')||j.name,'address',j.delivery_address,'team',j.team,'jobId',j.id,'jobSnapshot',to_jsonb(j),'note',coalesce(p_payload->>'note',''),'deliveryMode',p_payload->>'deliveryMode'));
  for line in select value from jsonb_array_elements(p_payload->'lines') loop
   select * into item from mir_core.catalogue_items c where c.organization_id=org and c.channel='store' and c.published and not c.archived and (c.specification->>'id'=line->>'itemId' or c.id::text=line->>'itemId');
   if not found then raise exception 'Article indisponible. Actualisez le magasin.' using errcode='22023';end if;
   qty:=(line->>'quantity')::numeric;spec:=item.specification;col:=null;fmt:=null;
   if qty is null or qty<=0 or qty>100000 or qty<>trunc(qty) or mod(qty,coalesce((spec->>'quantityStep')::numeric,1))<>0 then raise exception 'Quantité invalide' using errcode='22023';end if;
   if coalesce(spec->>'colorPolicy','none')<>'none' and line->>'colorId' is not null then select value into col from jsonb_array_elements(spec->'colors') where value->>'id'=line->>'colorId';if col is null then raise exception 'Teinte incompatible' using errcode='22023';end if;end if;
   if spec->>'colorPolicy'='required' and col is null then raise exception 'Choisissez une teinte' using errcode='22023';end if;
   if coalesce(jsonb_array_length(spec->'formats'),0)>1 and line->>'formatId' is null then raise exception 'Choisissez un format' using errcode='22023';end if;
   if line->>'formatId' is not null then select value into fmt from jsonb_array_elements(spec->'formats') where value->>'id'=line->>'formatId';if fmt is null then raise exception 'Format incompatible' using errcode='22023';end if;end if;
   if coalesce(jsonb_array_length(spec->'measureFields'),0)>0 then raise exception 'Cette référence cotée nécessite le configurateur de pliage validé' using errcode='22023';end if;
   key:=jsonb_build_array(spec->>'id',spec->>'unit',spec->>'brand',coalesce(col->>'id',spec->>'baseColorId'),'[]'::jsonb)::text;
   -- Match the established browser stock identity byte for byte.
   key:=replace(replace(key,', ',','),': ',':');
   if coalesce(jsonb_array_length(spec->'formats'),0)>1 then key:=left(key,length(key)-1)||','||to_jsonb(fmt->>'id')::text||']';end if;
   spec:=spec||jsonb_build_object('itemId',spec->>'id','colorId',coalesce(col->>'id',spec->>'baseColorId'),'colorName',coalesce(col->>'name',spec->>'baseColorName'),'formatId',case when jsonb_array_length(spec->'formats')>1 then fmt->>'id' end,'format',fmt,'manufacturerReference',coalesce(fmt->>'manufacturerCode',spec->>'manufacturerReference'),'stockKey',key,'dimensionsIn','{}'::jsonb,'snapshot',spec);
   insert into mir_core.order_lines(organization_id,order_id,revision,quantity,unit,specification) values(org,oid,1,qty,spec->>'unit',spec) returning id into lid;
  end loop;
  insert into mir_core.order_events(organization_id,order_id,event_type,details) values(org,oid,'employee_submitted',jsonb_build_object('jobId',j.id,'requestId',p_request_id));
  result:=jsonb_build_object('orderId',oid,'jobId',j.id);
 else raise exception 'Action non disponible dans cette version' using errcode='0A000';end if;
 insert into mir_core.portal_operations values(org,uid,p_request_id,p_command,p_payload,result,now());
 insert into mir_core.admin_events(organization_id,actor_id,event_type,subject_id,details) values(org,uid,p_command,coalesce(j.id,target,oid,profile.id),result);
 return jsonb_build_object('ok',true,'result',result,'snapshot',public.mir_portal_snapshot());
end$$;

commit;
