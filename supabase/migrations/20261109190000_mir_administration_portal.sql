-- Administrative operations on the existing MIR records, scoped by verified identity.
begin;
alter table mir_core.jobs add column job_number text, add column delivery_address text not null default '', add column team text not null default '', add column foreman text not null default '', add column required_date date, add column revision integer not null default 1, add column created_at timestamptz not null default now();
create unique index mir_jobs_number on mir_core.jobs(organization_id,lower(job_number)) where job_number is not null;
alter table mir_core.orders add column job_id uuid, add column order_number text;
alter table mir_core.orders add foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id);
create unique index mir_orders_number on mir_core.orders(organization_id,order_number) where order_number is not null;
create index mir_orders_job on mir_core.orders(organization_id,job_id);
create table mir_core.staff_profiles(
 organization_id uuid not null references mir_core.organizations, id uuid not null default gen_random_uuid(),
 user_id uuid references auth.users, name text not null check(length(name) between 1 and 160),email text not null check(length(email)<=254),team text not null default '',suspended boolean not null default false,
 revision integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(organization_id,id),unique(organization_id,email),unique(organization_id,user_id));
create table mir_core.staff_job_assignments(organization_id uuid not null,profile_id uuid not null,job_id uuid not null,primary key(organization_id,profile_id,job_id),foreign key(organization_id,profile_id) references mir_core.staff_profiles,foreign key(organization_id,job_id) references mir_core.jobs);
create table mir_core.admin_permissions(organization_id uuid not null,user_id uuid not null,jobs boolean not null default false,estimates boolean not null default false,foreign key(organization_id,user_id) references mir_core.memberships,primary key(organization_id,user_id));
create table mir_core.portal_operations(organization_id uuid not null,actor_id uuid not null references auth.users,request_id uuid not null,command text not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(organization_id,actor_id,request_id));
create table mir_core.admin_events(organization_id uuid not null,id uuid primary key default gen_random_uuid(),actor_id uuid not null references auth.users,event_type text not null,subject_id uuid,details jsonb not null default '{}',created_at timestamptz not null default now());
do $$declare t text;begin foreach t in array array['staff_profiles','staff_job_assignments','admin_permissions','portal_operations','admin_events'] loop execute format('alter table mir_core.%I enable row level security',t);execute format('revoke all on mir_core.%I from public,anon,authenticated',t);end loop;end$$;
create function mir_core.job_manager(org uuid) returns boolean language sql stable security definer set search_path=pg_catalog,mir_core as $$select mir_core.has_role(org,array['admin']) or (mir_core.coordination_allowed(org) and exists(select 1 from mir_core.admin_permissions p where p.organization_id=org and p.user_id=auth.uid() and p.jobs))$$;
create function mir_core.job_allowed(org uuid,jid uuid) returns boolean language sql stable security definer set search_path=pg_catalog,mir_core as $$select mir_core.job_manager(org) or (mir_core.has_role(org,array['employee']) and exists(select 1 from mir_core.job_memberships m where m.organization_id=org and m.job_id=jid and m.user_id=auth.uid()))$$;
revoke all on function mir_core.job_manager(uuid),mir_core.job_allowed(uuid,uuid) from public,anon;grant execute on function mir_core.job_manager(uuid),mir_core.job_allowed(uuid,uuid) to authenticated;
-- Keep the legacy snapshot envelope, enriching the same records.
alter function public.mir_portal_snapshot() rename to mir_portal_snapshot_legacy;
revoke all on function public.mir_portal_snapshot_legacy() from public,anon,authenticated;
create function public.mir_portal_snapshot() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare a jsonb;org uuid;uid uuid;out jsonb;rows jsonb;begin
 a:=public.mir_account_snapshot();org:=(a->>'organizationId')::uuid;uid:=auth.uid();out:=public.mir_portal_snapshot_legacy();
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'name',j.name,'number',j.job_number,'address',j.delivery_address,'team',j.team,'foreman',j.foreman,'requiredDate',j.required_date,'archived',j.archived,'revision',j.revision,'assignedMemberIds',(select coalesce(jsonb_agg(m.user_id),'[]') from mir_core.job_memberships m where m.organization_id=org and m.job_id=j.id)) order by j.created_at desc),'[]') into rows from mir_core.jobs j where j.organization_id=org and mir_core.job_allowed(org,j.id) and not j.archived;
 out:=jsonb_set(out,'{jobs}',rows);
 select coalesce(jsonb_agg(c.specification||jsonb_build_object('catalogueId',c.id,'id',coalesce(c.specification->>'id',c.id::text),'name',c.name,'active',true)),'[]') into rows from mir_core.catalogue_items c where c.organization_id=org and c.channel='store' and c.published and not c.archived;
 out:=jsonb_set(out,'{catalogue}',rows);
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'number',o.order_number,'jobId',o.job_id,'memberId',o.owner_id,'createdAt',o.created_at,'note',r.snapshot->>'note','deliveryMode',r.snapshot->>'deliveryMode','jobSnapshot',r.snapshot->'jobSnapshot','lines',(select coalesce(jsonb_agg(l.specification||jsonb_build_object('id',l.id,'quantity',l.quantity,'requestedQty',l.quantity,'deliveredQty',coalesce(f.delivered_qty,0),'cancelledQty',coalesce(f.cancelled_qty,0),'reservedQty',0,'unit',l.unit)),'[]') from mir_core.order_lines l left join mir_core.warehouse_fulfillment f on(f.organization_id,f.order_line_id)=(l.organization_id,l.id) where l.organization_id=org and l.order_id=o.id)) order by o.created_at desc),'[]') into rows from mir_core.orders o join mir_core.order_revisions r on(r.organization_id,r.order_id,r.revision)=(o.organization_id,o.id,o.revision) where o.organization_id=org and o.kind='employee' and o.job_id is not null and (mir_core.job_manager(org) or (o.owner_id=uid and mir_core.job_allowed(org,o.job_id)));
 out:=jsonb_set(out,'{orders}',rows);
 return out||jsonb_build_object('permissions',jsonb_build_object('admin',a->>'role'='admin','jobs',mir_core.job_manager(org),'coordination',mir_core.coordination_allowed(org),'warehouse',mir_core.warehouse_allowed(org),'estimates',a->>'role'='admin' or (mir_core.coordination_allowed(org) and exists(select 1 from mir_core.admin_permissions p where p.organization_id=org and p.user_id=uid and p.estimates))));
end$$;
revoke all on function public.mir_portal_snapshot() from public,anon;grant execute on function public.mir_portal_snapshot() to authenticated;
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
  if cardinality(ids)>100 or exists(select 1 from unnest(ids) id where not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=id and not j.archived)) then raise exception 'Chantier inaccessible' using errcode='42501';end if;
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
-- Invitation acceptance may never reactivate an explicitly suspended employee.
create or replace function public.mir_portal_accept_invitation(p_token text) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare identity jsonb;uid uuid;inv mir_core.account_invitations;jid uuid;profile mir_core.staff_profiles;begin
 identity:=mir_core.account_identity();uid:=(identity->>'id')::uuid;
 if p_token is null or p_token!~'^[A-Za-z0-9_-]{43}$' then raise exception 'Invitation invalide' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('mir-invite-'||lower(identity->>'email'),0));
 select * into inv from mir_core.account_invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or inv.revoked_at is not null or inv.expires_at<=now() or lower(identity->>'email')<>inv.email or (inv.accepted_by is not null and inv.accepted_by<>uid) then raise exception 'Invitation expirée, révoquée ou destinée à une autre adresse' using errcode='42501',detail='INVITATION_INVALID';end if;
 perform 1 from mir_core.memberships where organization_id=inv.organization_id and user_id=uid and not active for update;
 if found or exists(select 1 from mir_core.staff_profiles where organization_id=inv.organization_id and email=inv.email and suspended) then raise exception 'Accès suspendu. Contactez MIR.' using errcode='42501';end if;
 if inv.accepted_by=uid then return jsonb_build_object('ok',true,'alreadyAccepted',true);end if;
 insert into mir_core.memberships(organization_id,user_id,role,active) values(inv.organization_id,uid,'employee',true) on conflict(organization_id,user_id) do update set role=case when memberships.role='admin' then 'admin' else 'employee' end;
 update mir_core.staff_profiles set user_id=uid,revision=revision+1,updated_at=now() where organization_id=inv.organization_id and email=inv.email;
 foreach jid in array inv.job_ids loop
  insert into mir_core.job_memberships values(inv.organization_id,jid,uid) on conflict do nothing;
  insert into mir_core.staff_job_assignments select inv.organization_id,p.id,jid from mir_core.staff_profiles p where p.organization_id=inv.organization_id and p.user_id=uid on conflict do nothing;
 end loop;
 update mir_core.account_invitations set accepted_by=uid,accepted_at=now() where id=inv.id;
 return jsonb_build_object('ok',true);
end$$;
commit;
