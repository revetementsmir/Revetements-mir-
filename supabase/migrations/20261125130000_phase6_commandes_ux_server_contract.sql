-- Phase 6 UX Commandes + Pliages: raccord serveur réel du panier, des favoris et du chantier à confirmer.
-- Additif et fail-closed. Aucun envoi fournisseur, courriel ou dossier chantier n'est créé ici.
begin;

do $$ begin
 if to_regclass('mir_core.orders') is null
    or to_regclass('mir_core.order_revisions') is null
    or to_regclass('mir_core.order_lines') is null
    or to_regclass('mir_core.order_events') is null
    or to_regclass('mir_core.order_shortcut_favorites') is null then
  raise exception 'Socle Commandes UX absent: installation refusée';
 end if;
end $$;

alter table mir_core.orders
 add column if not exists ux_status text not null default 'draft',
 add column if not exists job_id uuid,
 add column if not exists pending_job_original_reference text,
 add column if not exists pending_job_reference text,
 add column if not exists pending_job_match_status text not null default 'matched',
 add column if not exists pending_job_created_by uuid references auth.users(id),
 add column if not exists pending_job_created_at timestamptz,
 add column if not exists submitted_at timestamptz;

do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='mir_core.orders'::regclass and conname='orders_ux_status_check') then
  alter table mir_core.orders add constraint orders_ux_status_check check(ux_status in ('draft','submitted','cancelled'));
 end if;
 if not exists(select 1 from pg_constraint where conrelid='mir_core.orders'::regclass and conname='orders_pending_job_check') then
  alter table mir_core.orders add constraint orders_pending_job_check check(
   pending_job_match_status in ('matched','to_confirm')
   and ((pending_job_match_status='matched' and pending_job_reference is null
      and (job_id is not null or pending_job_original_reference is null))
    or (pending_job_match_status='to_confirm' and job_id is null
      and length(btrim(pending_job_reference)) between 1 and 200
      and pending_job_original_reference=pending_job_reference))
  );
 end if;
 if not exists(select 1 from pg_constraint where conrelid='mir_core.orders'::regclass and conname='orders_job_fk') then
  alter table mir_core.orders add constraint orders_job_fk foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id);
 end if;
end $$;

create table if not exists mir_core.order_ux_receipts(
 organization_id uuid not null references mir_core.organizations(id),
 user_id uuid not null references auth.users(id),
 request_id uuid not null,
 action text not null check(action in ('draft_save','submit','create_submit','favorite','job_link')),
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 result jsonb not null check(jsonb_typeof(result)='object'),
 created_at timestamptz not null default now(),
 primary key(organization_id,user_id,request_id)
);
alter table mir_core.order_ux_receipts enable row level security;
revoke all on mir_core.order_ux_receipts from public,anon,authenticated;

create index if not exists orders_ux_owner_status_idx on mir_core.orders(organization_id,owner_id,ux_status,created_at desc);
create index if not exists orders_ux_pending_job_idx on mir_core.orders(organization_id,pending_job_match_status,created_at desc) where pending_job_match_status='to_confirm';

create or replace function mir_core.order_ux_role(org uuid) returns text
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select case when auth.uid() is null then null else mir_core.staff_role(org,auth.uid()) end;
$$;
revoke all on function mir_core.order_ux_role(uuid) from public,anon,authenticated;

create or replace function mir_core.order_ux_replay(org uuid,request_id uuid,action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare prior mir_core.order_ux_receipts;
begin
 if auth.uid() is null or request_id is null then raise exception 'Référence de requête requise' using errcode='22023';end if;
 select * into prior from mir_core.order_ux_receipts r where r.organization_id=org and r.user_id=auth.uid() and r.request_id=order_ux_replay.request_id;
 if not found then return null;end if;
 if prior.action is distinct from action or prior.payload is distinct from payload then raise exception 'Référence réutilisée avec un autre contenu' using errcode='22023';end if;
 return prior.result||jsonb_build_object('idempotent',true);
end $$;
revoke all on function mir_core.order_ux_replay(uuid,uuid,text,jsonb) from public,anon,authenticated;

create or replace function mir_core.order_ux_receipt(org uuid,request_id uuid,action text,payload jsonb,result jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
begin
 insert into mir_core.order_ux_receipts(organization_id,user_id,request_id,action,payload,result)
 values(org,auth.uid(),request_id,action,payload,result);
 return result||jsonb_build_object('receiptId',request_id,'idempotent',false);
end $$;
revoke all on function mir_core.order_ux_receipt(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;

create or replace function mir_core.order_ux_validate_payload(org uuid,data jsonb) returns void
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare line jsonb;item uuid;quantity_text text;catalogue_row mir_core.catalogue_items;
begin
 if jsonb_typeof(data) is distinct from 'object' or data - array['jobId','jobReference','lines','note','deliveryMode'] <> '{}'::jsonb
    or jsonb_typeof(data->'lines') is distinct from 'array' or jsonb_array_length(data->'lines') not between 1 and 100
    or coalesce(data->>'deliveryMode','delivery') not in ('delivery','pickup') or length(coalesce(data->>'note',''))>2000 then
  raise exception 'Commande invalide' using errcode='22023';
 end if;
 for line in select value from jsonb_array_elements(data->'lines') loop
  quantity_text:=line->>'quantity';
  if jsonb_typeof(line) is distinct from 'object'
     or line - array['itemId','quantity','colorId','formatId','dimensionsIn','specification'] <> '{}'::jsonb
     or quantity_text is null or quantity_text!~'^[1-9][0-9]{0,4}$'
     or jsonb_typeof(coalesce(line->'dimensionsIn','{}'::jsonb)) is distinct from 'object'
     or jsonb_typeof(coalesce(line->'specification','{}'::jsonb)) is distinct from 'object'
     or octet_length(line::text)>262144 then
   raise exception 'Ligne ou quantité invalide' using errcode='22023';
  end if;
  begin item:=(line->>'itemId')::uuid;exception when invalid_text_representation then item:=null;end;
  catalogue_row:=null;
  if item is not null then
   select * into catalogue_row from mir_core.catalogue_items c where c.organization_id=org and c.id=item and c.channel='store' and c.published and not c.archived;
  end if;
  if catalogue_row.id is null and not(coalesce(line->'specification'->>'kind','')='fold'
    and jsonb_typeof(line->'specification'->'instanceSnapshot')='object') then
   raise exception 'Article ou pliage indisponible' using errcode='42501';
  end if;
 end loop;
end $$;
revoke all on function mir_core.order_ux_validate_payload(uuid,jsonb) from public,anon,authenticated;

create or replace function mir_core.order_ux_write_revision(org uuid,order_id uuid,data jsonb,revision_no integer) returns void
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare line jsonb;item uuid;catalogue_row mir_core.catalogue_items;line_spec jsonb;unit_name text;model uuid;model_version integer;
begin
 insert into mir_core.order_revisions(organization_id,order_id,revision,snapshot,created_by)
 values(org,order_id,revision_no,jsonb_build_object(
  'schema','mir-order-ux-1','jobId',nullif(data->>'jobId',''),'jobReference',nullif(btrim(coalesce(data->>'jobReference','')),''),
  'deliveryMode',coalesce(data->>'deliveryMode','delivery'),'note',coalesce(data->>'note',''),'lines',data->'lines'),auth.uid());
 for line in select value from jsonb_array_elements(data->'lines') loop
  item:=null;catalogue_row:=null;model:=null;model_version:=null;
  begin item:=(line->>'itemId')::uuid;exception when invalid_text_representation then item:=null;end;
  if item is not null then select * into catalogue_row from mir_core.catalogue_items c where c.organization_id=org and c.id=item;end if;
  if catalogue_row.id is not null then
   line_spec:=jsonb_build_object('kind',case when coalesce((catalogue_row.specification->>'customBending')::boolean,false) then 'fold' else 'material' end,
    'catalogueItemId',catalogue_row.id,'catalogueSnapshot',catalogue_row.specification||jsonb_build_object('id',catalogue_row.id,'name',catalogue_row.name),
    'configuration',line-'quantity');
   unit_name:=coalesce(nullif(catalogue_row.specification->>'unit',''),'unité');
  else
   line_spec:=jsonb_build_object('kind','fold','itemRef',line->>'itemId','configuration',line-'quantity',
    'templateSnapshot',line->'specification'->'templateSnapshot','instanceSnapshot',line->'specification'->'instanceSnapshot');
   unit_name:='pièce';
   begin model:=(line->'specification'->'instanceSnapshot'->>'templateId')::uuid;exception when invalid_text_representation then model:=null;end;
   if model is not null then select p.version into model_version from mir_core.model_publications p where p.organization_id=org and p.model_id=model and p.store and not p.archived;end if;
  end if;
  insert into mir_core.order_lines(organization_id,order_id,revision,quantity,unit,specification,model_id,model_version)
  values(org,order_id,revision_no,(line->>'quantity')::integer,unit_name,line_spec,model,model_version);
 end loop;
end $$;
revoke all on function mir_core.order_ux_write_revision(uuid,uuid,jsonb,integer) from public,anon,authenticated;

create or replace function public.mir_order_draft_save(org uuid,request_id uuid,order_id uuid,data jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare role_name text:=mir_core.order_ux_role(org);prior jsonb;result jsonb;oid uuid;rev integer;job uuid;reference text;
begin
 if role_name is null or role_name not in('employe','chef_equipe') then raise exception 'Employé actif requis' using errcode='42501';end if;
 perform mir_core.order_ux_validate_payload(org,data);
 prior:=mir_core.order_ux_replay(org,request_id,'draft_save',jsonb_build_object('orderId',order_id,'data',data));if prior is not null then return prior;end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||auth.uid()::text,0));
 prior:=mir_core.order_ux_replay(org,request_id,'draft_save',jsonb_build_object('orderId',order_id,'data',data));if prior is not null then return prior;end if;
 job:=nullif(data->>'jobId','')::uuid;reference:=left(btrim(coalesce(data->>'jobReference','')),200);
 if job is not null and not exists(select 1 from mir_core.jobs j join mir_core.job_memberships jm on(jm.organization_id,jm.job_id)=(j.organization_id,j.id) where j.organization_id=org and j.id=job and not j.archived and jm.user_id=auth.uid()) then raise exception 'Chantier non autorisé' using errcode='42501';end if;
 if job is null and length(reference)<1 then raise exception 'Référence chantier requise' using errcode='22023';end if;
 if order_id is null then
  insert into mir_core.orders(organization_id,kind,owner_id,ux_status,job_id,pending_job_original_reference,pending_job_reference,pending_job_match_status,pending_job_created_by,pending_job_created_at)
  values(org,'employee',auth.uid(),'draft',job,case when job is null then reference end,case when job is null then reference end,case when job is null then 'to_confirm' else 'matched' end,case when job is null then auth.uid() end,case when job is null then now() end) returning id,revision into oid,rev;
 else
  select o.id,o.revision+1 into oid,rev from mir_core.orders o where o.organization_id=org and o.id=order_id and o.owner_id=auth.uid() and o.kind='employee' and o.ux_status='draft' for update;
  if not found then raise exception 'Brouillon indisponible' using errcode='42501';end if;
  update mir_core.orders set revision=rev,job_id=job,pending_job_original_reference=case when job is null then coalesce(pending_job_original_reference,reference) else pending_job_original_reference end,
   pending_job_reference=case when job is null then reference end,pending_job_match_status=case when job is null then 'to_confirm' else 'matched' end,
   pending_job_created_by=case when job is null then coalesce(pending_job_created_by,auth.uid()) else pending_job_created_by end,
   pending_job_created_at=case when job is null then coalesce(pending_job_created_at,now()) else pending_job_created_at end where organization_id=org and id=oid;
 end if;
 perform mir_core.order_ux_write_revision(org,oid,data,rev);
 insert into mir_core.order_events(organization_id,order_id,event_type,details,actor_id) values(org,oid,'draft-saved',jsonb_build_object('revision',rev,'jobMatchStatus',case when job is null then 'to_confirm' else 'matched' end,'originalReference',case when job is null then reference end),auth.uid());
 result:=jsonb_build_object('orderId',oid,'revision',rev,'status','draft','lineCount',jsonb_array_length(data->'lines'),'jobMatchStatus',case when job is null then 'to_confirm' else 'matched' end,'originalJobReference',case when job is null then reference end);
 return mir_core.order_ux_receipt(org,request_id,'draft_save',jsonb_build_object('orderId',order_id,'data',data),result);
end $$;

create or replace function public.mir_order_submit(org uuid,request_id uuid,order_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare role_name text:=mir_core.order_ux_role(org);prior jsonb;result jsonb;o mir_core.orders;
begin
 if role_name is null or role_name not in('employe','chef_equipe') then raise exception 'Employé actif requis' using errcode='42501';end if;
 prior:=mir_core.order_ux_replay(org,request_id,'submit',jsonb_build_object('orderId',order_id));if prior is not null then return prior;end if;
 select * into o from mir_core.orders where organization_id=org and id=order_id and owner_id=auth.uid() and kind='employee' for update;
 prior:=mir_core.order_ux_replay(org,request_id,'submit',jsonb_build_object('orderId',order_id));if prior is not null then return prior;end if;
 if not found or o.ux_status<>'draft' then raise exception 'Brouillon indisponible' using errcode='40001';end if;
 if not exists(select 1 from mir_core.order_lines l where l.organization_id=org and l.order_id=o.id and l.revision=o.revision) then raise exception 'Commande vide' using errcode='22023';end if;
 update mir_core.orders set ux_status='submitted',submitted_at=now() where organization_id=org and id=o.id;
 insert into mir_core.order_events(organization_id,order_id,event_type,details,actor_id) values(org,o.id,'request-submitted',jsonb_build_object('revision',o.revision,'supplierSent',false,'emailSent',false),auth.uid());
 result:=jsonb_build_object('orderId',o.id,'revision',o.revision,'status','submitted','submittedAt',now(),'supplierSent',false,'emailSent',false);
 return mir_core.order_ux_receipt(org,request_id,'submit',jsonb_build_object('orderId',order_id),result);
end $$;

create or replace function public.mir_order_create_submit(org uuid,request_id uuid,data jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare role_name text:=mir_core.order_ux_role(org);prior jsonb;result jsonb;oid uuid;rev integer:=1;job uuid;reference text;
begin
 if role_name is null or role_name not in('employe','chef_equipe') then raise exception 'Employé actif requis' using errcode='42501';end if;
 perform mir_core.order_ux_validate_payload(org,data);
 prior:=mir_core.order_ux_replay(org,request_id,'create_submit',data);if prior is not null then return prior;end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||auth.uid()::text||request_id::text,0));
 prior:=mir_core.order_ux_replay(org,request_id,'create_submit',data);if prior is not null then return prior;end if;
 job:=nullif(data->>'jobId','')::uuid;reference:=left(btrim(coalesce(data->>'jobReference','')),200);
 if job is not null and not exists(select 1 from mir_core.jobs j join mir_core.job_memberships jm on(jm.organization_id,jm.job_id)=(j.organization_id,j.id) where j.organization_id=org and j.id=job and not j.archived and jm.user_id=auth.uid()) then raise exception 'Chantier non autorisé' using errcode='42501';end if;
 if job is null and length(reference)<1 then raise exception 'Référence chantier requise' using errcode='22023';end if;
 insert into mir_core.orders(organization_id,kind,owner_id,ux_status,job_id,pending_job_original_reference,pending_job_reference,pending_job_match_status,pending_job_created_by,pending_job_created_at,submitted_at)
 values(org,'employee',auth.uid(),'submitted',job,case when job is null then reference end,case when job is null then reference end,case when job is null then 'to_confirm' else 'matched' end,case when job is null then auth.uid() end,case when job is null then now() end,now()) returning id into oid;
 perform mir_core.order_ux_write_revision(org,oid,data,rev);
 insert into mir_core.order_events(organization_id,order_id,event_type,details,actor_id) values
 (org,oid,'draft-saved',jsonb_build_object('revision',rev,'jobMatchStatus',case when job is null then 'to_confirm' else 'matched' end,'originalReference',case when job is null then reference end),auth.uid()),
 (org,oid,'request-submitted',jsonb_build_object('revision',rev,'supplierSent',false,'emailSent',false),auth.uid());
 result:=jsonb_build_object('orderId',oid,'revision',rev,'status','submitted','lineCount',jsonb_array_length(data->'lines'),'jobMatchStatus',case when job is null then 'to_confirm' else 'matched' end,'originalJobReference',case when job is null then reference end,'supplierSent',false,'emailSent',false);
 return mir_core.order_ux_receipt(org,request_id,'create_submit',data,result);
end $$;

create or replace function public.mir_order_shortcut_update(org uuid,request_id uuid,kind text,item_id uuid,favorite boolean,requested_position integer default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare role_name text:=mir_core.order_ux_role(org);prior jsonb;payload jsonb;result jsonb;next_position integer;existing_position integer;
begin
 if role_name is null or role_name not in('employe','chef_equipe') or kind is null or kind not in('material','fold') then raise exception 'Employé actif requis' using errcode='42501';end if;
 payload:=jsonb_build_object('kind',kind,'itemId',item_id,'favorite',favorite,'position',requested_position);
 prior:=mir_core.order_ux_replay(org,request_id,'favorite',payload);if prior is not null then return prior;end if;
 if not exists(select 1 from mir_core.catalogue_items c where c.organization_id=org and c.id=item_id and c.channel='store' and c.published and not c.archived
   and case when kind='fold' then coalesce((c.specification->>'customBending')::boolean,false) or jsonb_typeof(c.specification->'measureFields')='array'
            else not coalesce((c.specification->>'customBending')::boolean,false) and jsonb_typeof(c.specification->'measureFields') is distinct from 'array' end)
 then raise exception 'Article indisponible pour ce type de raccourci' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||auth.uid()::text||kind,0));
 prior:=mir_core.order_ux_replay(org,request_id,'favorite',payload);if prior is not null then return prior;end if;
 select f.position into existing_position from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=auth.uid() and f.shortcut_kind=kind and f.catalogue_item_id=item_id;
 if not favorite then
  delete from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=auth.uid() and f.shortcut_kind=kind and f.catalogue_item_id=item_id;
 elsif existing_position is null then
  if (select count(*) from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=auth.uid() and f.shortcut_kind=kind)>=6 then raise exception 'Maximum de six favoris atteint' using errcode='22023';end if;
  next_position:=coalesce(requested_position,(select coalesce(max(f.position),0)+1 from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=auth.uid() and f.shortcut_kind=kind));
  if next_position not between 1 and 6 or exists(select 1 from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=auth.uid() and f.shortcut_kind=kind and f.position=next_position) then raise exception 'Position invalide' using errcode='22023';end if;
  insert into mir_core.order_shortcut_favorites(organization_id,user_id,shortcut_kind,catalogue_item_id,position) values(org,auth.uid(),kind,item_id,next_position);
 end if;
 result:=jsonb_build_object('kind',kind,'itemId',item_id,'favorite',favorite,'count',(select count(*) from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=auth.uid() and f.shortcut_kind=kind),
  'items',coalesce((select jsonb_agg(f.catalogue_item_id order by f.position) from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=auth.uid() and f.shortcut_kind=kind),'[]'::jsonb));
 return mir_core.order_ux_receipt(org,request_id,'favorite',payload,result);
end $$;

create or replace function public.mir_order_shortcut_snapshot(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare role_name text:=mir_core.order_ux_role(org);
begin
 if role_name is null or role_name not in('employe','chef_equipe') then raise exception 'Employé actif requis' using errcode='42501';end if;
 return jsonb_build_object('favorites',coalesce((select jsonb_agg(f.catalogue_item_id order by f.shortcut_kind,f.position) from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=auth.uid()),'[]'::jsonb),
  'material',coalesce((select jsonb_agg(f.catalogue_item_id order by f.position) from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=auth.uid() and f.shortcut_kind='material'),'[]'::jsonb),
  'fold',coalesce((select jsonb_agg(f.catalogue_item_id order by f.position) from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=auth.uid() and f.shortcut_kind='fold'),'[]'::jsonb));
end $$;

create or replace function public.mir_order_pending_jobs(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
begin
 if not mir_core.coordination_allowed(org) then raise exception 'Adjointe, Boss ou Admin requis' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('orderId',o.id,'originalReference',o.pending_job_original_reference,'currentReference',o.pending_job_reference,'createdBy',o.pending_job_created_by,'createdAt',o.pending_job_created_at,'status',o.pending_job_match_status) order by o.created_at) from mir_core.orders o where o.organization_id=org and o.ux_status='submitted' and o.pending_job_match_status='to_confirm'),'[]'::jsonb);
end $$;

create or replace function public.mir_order_link_job(org uuid,request_id uuid,order_id uuid,job_id uuid,reason text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare prior jsonb;payload jsonb;result jsonb;o mir_core.orders;
begin
 if not mir_core.coordination_allowed(org) then raise exception 'Adjointe, Boss ou Admin requis' using errcode='42501';end if;
 if length(btrim(coalesce(reason,'')))<3 or not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=mir_order_link_job.job_id and not j.archived) then raise exception 'Rattachement invalide' using errcode='22023';end if;
 payload:=jsonb_build_object('orderId',order_id,'jobId',mir_order_link_job.job_id,'reason',btrim(reason));
 prior:=mir_core.order_ux_replay(org,request_id,'job_link',payload);if prior is not null then return prior;end if;
 select * into o from mir_core.orders where organization_id=org and id=order_id and ux_status='submitted' and pending_job_match_status='to_confirm' for update;
 prior:=mir_core.order_ux_replay(org,request_id,'job_link',payload);if prior is not null then return prior;end if;
 if not found then raise exception 'Commande à confirmer introuvable' using errcode='40001';end if;
 update mir_core.orders set job_id=mir_order_link_job.job_id,pending_job_match_status='matched',pending_job_reference=null where organization_id=org and id=o.id;
 insert into mir_core.order_events(organization_id,order_id,event_type,details,actor_id) values(org,o.id,'job-linked',jsonb_build_object('previousStatus',o.pending_job_match_status,'originalReference',o.pending_job_original_reference,'jobId',job_id,'reason',btrim(reason)),auth.uid());
 result:=jsonb_build_object('orderId',o.id,'jobId',job_id,'status','matched','originalJobReference',o.pending_job_original_reference);
 return mir_core.order_ux_receipt(org,request_id,'job_link',payload,result);
end $$;

-- Le portail relit les favoris et commandes depuis la source serveur après chaque mutation.
create or replace function public.mir_portal_snapshot() returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare account jsonb;org uuid;uid uuid;shared jsonb;members jsonb;catalogue jsonb;jobs jsonb;orders jsonb;favorite_ids jsonb;
begin
 account:=public.mir_account_snapshot();org:=(account->>'organizationId')::uuid;uid:=(account->>'userId')::uuid;
 if account->>'role' not in ('employee','admin') then raise exception 'Accès équipe MIR requis' using errcode='42501',detail='ACCESS_DENIED';end if;
 shared:=public.mir_shared_snapshot(org);
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(u.raw_user_meta_data->>'full_name',u.email),'email',u.email,'role',m.role,'active',m.active)),'[]') into members
 from mir_core.memberships m join auth.users u on u.id=m.user_id where m.organization_id=org and (account->>'role'='admin' or m.user_id=uid);
 select coalesce(jsonb_agg(c.specification||jsonb_build_object('id',c.id,'name',c.name,'active',true)),'[]') into catalogue
 from mir_core.catalogue_items c where c.organization_id=org and c.channel='store' and c.published and not c.archived;
 select coalesce(jsonb_agg(j||jsonb_build_object('assignedMemberIds',(select coalesce(jsonb_agg(jm.user_id),'[]') from mir_core.job_memberships jm where jm.organization_id=org and jm.job_id=(j->>'id')::uuid and (account->>'role'='admin' or jm.user_id=uid)))),'[]') into jobs from jsonb_array_elements(shared->'jobs') j;
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'jobId',o.job_id,'jobReference',o.pending_job_original_reference,'jobMatchStatus',o.pending_job_match_status,
  'requestedById',o.owner_id,'status',o.ux_status,'createdAt',o.created_at,'submittedAt',o.submitted_at,
  'lines',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'itemId',coalesce(l.specification->>'catalogueItemId',l.specification->>'itemRef'),'quantity',l.quantity,'requestedQty',l.quantity,'unit',l.unit,'specification',l.specification) order by l.id)
   from mir_core.order_lines l where l.organization_id=org and l.order_id=o.id and l.revision=o.revision),'[]'::jsonb)) order by o.created_at desc),'[]') into orders
 from mir_core.orders o where o.organization_id=org and o.owner_id=uid and o.kind='employee';
 select coalesce(jsonb_agg(f.catalogue_item_id order by f.shortcut_kind,f.position),'[]') into favorite_ids
 from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=uid;
 return jsonb_build_object('mode','connected','demo',false,'actorId',uid,'members',members,'jobs',jobs,'planVersions','[]'::jsonb,'catalogue',catalogue,
  'orders',orders,'sharedOrders',shared->'orders','deliveries','[]'::jsonb,'movements','[]'::jsonb,'inventory','{}'::jsonb,
  'favorites',jsonb_build_object(uid::text,favorite_ids),'capabilities',jsonb_build_object('documents',false,'checkout',false));
end $$;
revoke all on function public.mir_portal_snapshot() from public,anon;
grant execute on function public.mir_portal_snapshot() to authenticated;

-- L'ancienne RPC sans clé d'idempotence n'est plus un contrat client.
revoke all on function public.mir_order_shortcut_set(uuid,text,uuid,boolean,integer) from public,anon,authenticated;

do $$ declare sig text;begin
 foreach sig in array array[
  'public.mir_order_draft_save(uuid,uuid,uuid,jsonb)',
  'public.mir_order_submit(uuid,uuid,uuid)',
  'public.mir_order_create_submit(uuid,uuid,jsonb)',
  'public.mir_order_shortcut_update(uuid,uuid,text,uuid,boolean,integer)',
  'public.mir_order_shortcut_snapshot(uuid)',
  'public.mir_order_pending_jobs(uuid)',
  'public.mir_order_link_job(uuid,uuid,uuid,uuid,text)'
 ] loop
  execute format('revoke all on function %s from public,anon',sig);
  execute format('grant execute on function %s to authenticated',sig);
 end loop;
end $$;

commit;
