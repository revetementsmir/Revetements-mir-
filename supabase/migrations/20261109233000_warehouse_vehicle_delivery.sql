-- MIR warehouse, vehicle, inspection and delivery operations.
-- Private schema, deny-all direct tables; authenticated access is through checked RPCs.
begin;

create table mir_core.vehicles(
 organization_id uuid not null references mir_core.organizations,
 id uuid not null default gen_random_uuid(), internal_number text not null,
 name text not null, vehicle_type text not null check(vehicle_type in('truck','van','car','trailer','mobile_equipment')),
 make text not null default '', model text not null default '', model_year integer check(model_year between 1900 and 2200),
 plate text not null default '', vin text not null default '', photo_path text,
 current_odometer numeric(12,1) not null default 0 check(current_odometer>=0), capacity_kg numeric(12,2) check(capacity_kg>0),
 status text not null default 'available' check(status in('available','assigned','loading','delivering','at_job','maintenance','out_of_service','archived')),
 primary_driver uuid, backup_driver uuid, team_id uuid, assignment_start date, assignment_end date,
 notes text not null default '' check(length(notes)<=4000), archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(organization_id,id), unique(organization_id,internal_number), unique(organization_id,name),
 foreign key(organization_id,primary_driver) references mir_core.memberships(organization_id,user_id),
 foreign key(organization_id,backup_driver) references mir_core.memberships(organization_id,user_id),
 foreign key(organization_id,team_id) references mir_core.teams(organization_id,id),
 check(assignment_end is null or assignment_start is null or assignment_end>=assignment_start)
);
create table mir_core.vehicle_authorizations(
 organization_id uuid not null, vehicle_id uuid not null, employee_id uuid not null,
 kind text not null check(kind in('primary','backup','authorized','temporary')),
 starts_at timestamptz not null default now(), ends_at timestamptz, approved_by uuid not null references auth.users(id), reason text not null default '',
 primary key(organization_id,vehicle_id,employee_id,kind,starts_at),
 foreign key(organization_id,vehicle_id) references mir_core.vehicles(organization_id,id),
 foreign key(organization_id,employee_id) references mir_core.memberships(organization_id,user_id),
 check(ends_at is null or ends_at>starts_at), check(kind<>'temporary' or length(btrim(reason))>0)
);
create table mir_core.vehicle_qr_tokens(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), vehicle_id uuid not null,
 token_hash text not null check(token_hash~'^[a-f0-9]{32}$'), active boolean not null default true,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), disabled_at timestamptz,
 primary key(organization_id,id), unique(organization_id,token_hash),
 foreign key(organization_id,vehicle_id) references mir_core.vehicles(organization_id,id)
);
create unique index vehicle_one_active_qr on mir_core.vehicle_qr_tokens(organization_id,vehicle_id) where active;
create table mir_core.vehicle_qr_scans(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), token_id uuid, vehicle_id uuid,
 scanned_by uuid not null references auth.users(id), accepted boolean not null, reason text not null, scanned_at timestamptz not null default now(),
 primary key(organization_id,id), foreign key(organization_id,token_id) references mir_core.vehicle_qr_tokens(organization_id,id),
 foreign key(organization_id,vehicle_id) references mir_core.vehicles(organization_id,id)
);
create table mir_core.inventory_locations(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), location_type text not null check(location_type in('warehouse','vehicle','trailer','job','return','quarantine')),
 name text not null, vehicle_id uuid, job_id uuid, active boolean not null default true,
 primary key(organization_id,id), unique(organization_id,name),
 foreign key(organization_id,vehicle_id) references mir_core.vehicles(organization_id,id),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id),
 check((location_type in('vehicle','trailer'))=(vehicle_id is not null)), check((location_type='job')=(job_id is not null))
);
create table mir_core.delivery_runs(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), vehicle_id uuid not null, trailer_id uuid,
 driver_id uuid not null references auth.users(id), status text not null default 'loading' check(status in('loading','ready','loaded','en_route','arrived','partial','delivered','failed','returning','completed','cancelled')),
 started_loading_at timestamptz not null default now(), departed_at timestamptz, arrived_at timestamptz, completed_at timestamptz,
 gps_enabled boolean not null default false, last_position jsonb, last_position_at timestamptz, start_odometer numeric(12,1), end_odometer numeric(12,1),
 client_request_id uuid not null, primary key(organization_id,id), unique(organization_id,driver_id,client_request_id),
 foreign key(organization_id,vehicle_id) references mir_core.vehicles(organization_id,id),
 foreign key(organization_id,trailer_id) references mir_core.vehicles(organization_id,id)
);
create unique index one_open_run_per_vehicle on mir_core.delivery_runs(organization_id,vehicle_id) where status not in('completed','cancelled');
create table mir_core.delivery_run_orders(
 organization_id uuid not null, run_id uuid not null, order_id uuid not null, job_id uuid not null,
 desired_at timestamptz, priority text not null default 'normal' check(priority in('normal','high','urgent')),
 status text not null default 'to_prepare' check(status in('to_prepare','preparing','ready','loaded','en_route','arrived','partial','delivered','failed','returned','cancelled')),
 primary key(organization_id,run_id,order_id), foreign key(organization_id,run_id) references mir_core.delivery_runs(organization_id,id),
 foreign key(organization_id,order_id) references mir_core.orders(organization_id,id), foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id)
);
create table mir_core.delivery_load_items(
 organization_id uuid not null, run_id uuid not null, order_id uuid, order_line_id uuid, job_id uuid,
 item_key text not null, item_name text not null, requested_qty numeric(15,3) not null check(requested_qty>=0), scanned_qty numeric(15,3) not null default 0 check(scanned_qty>=0),
 loaded_qty numeric(15,3) not null default 0 check(loaded_qty>=0), delivered_qty numeric(15,3) not null default 0 check(delivered_qty>=0), returned_qty numeric(15,3) not null default 0 check(returned_qty>=0), damaged_qty numeric(15,3) not null default 0 check(damaged_qty>=0),
 unit text not null default 'unité', issue text, replacement_key text, photo_path text, note text not null default '', updated_at timestamptz not null default now(),
 primary key(organization_id,run_id,item_key), foreign key(organization_id,run_id) references mir_core.delivery_runs(organization_id,id),
 foreign key(organization_id,order_id) references mir_core.orders(organization_id,id), foreign key(organization_id,order_line_id) references mir_core.order_lines(organization_id,id),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id), check(delivered_qty+returned_qty+damaged_qty<=loaded_qty)
);
create table mir_core.inventory_transfers(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), item_key text not null, item_name text not null,
 quantity numeric(15,3) not null check(quantity>0), from_location uuid, to_location uuid not null,
 run_id uuid, order_id uuid, job_id uuid, vehicle_id uuid, employee_id uuid not null references auth.users(id),
 reason text not null check(reason in('load','deliver','return','damage','correction','adjustment')), reverses_id uuid,
 client_request_id uuid not null, created_at timestamptz not null default now(), primary key(organization_id,id), unique(organization_id,employee_id,client_request_id),
 foreign key(organization_id,from_location) references mir_core.inventory_locations(organization_id,id), foreign key(organization_id,to_location) references mir_core.inventory_locations(organization_id,id),
 foreign key(organization_id,run_id) references mir_core.delivery_runs(organization_id,id), foreign key(organization_id,order_id) references mir_core.orders(organization_id,id),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id), foreign key(organization_id,vehicle_id) references mir_core.vehicles(organization_id,id),
 foreign key(organization_id,reverses_id) references mir_core.inventory_transfers(organization_id,id), check(from_location is null or from_location<>to_location)
);
create index inventory_transfer_trace on mir_core.inventory_transfers(organization_id,item_key,created_at desc);
create table mir_core.inspection_rules(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), phase text not null check(phase in('pre_load','pre_departure','delivery','return')),
 code text not null, label text not null, requirement text not null check(requirement in('disabled','optional','required')),
 vehicle_type text, vehicle_id uuid, trailer_only boolean not null default false, position integer not null default 0,
 photo_required boolean not null default false, comment_required boolean not null default false, failure_blocks boolean not null default false,
 approver_role text not null default 'boss_admin' check(approver_role in('boss','admin','boss_admin')), active boolean not null default true,
 primary key(organization_id,id), unique nulls not distinct(organization_id,phase,code,vehicle_type,vehicle_id,trailer_only),
 foreign key(organization_id,vehicle_id) references mir_core.vehicles(organization_id,id)
);
create table mir_core.run_inspections(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), run_id uuid not null, phase text not null check(phase in('pre_load','pre_departure','delivery','return')),
 status text not null default 'open' check(status in('open','blocked','approved','completed')), created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), completed_at timestamptz,
 primary key(organization_id,id), unique(organization_id,run_id,phase), foreign key(organization_id,run_id) references mir_core.delivery_runs(organization_id,id)
);
create table mir_core.inspection_results(
 organization_id uuid not null, inspection_id uuid not null, rule_id uuid not null,
 result text not null check(result in('conform','problem','na')), comment text not null default '', photo_path text,
 answered_by uuid not null references auth.users(id), answered_at timestamptz not null default now(),
 primary key(organization_id,inspection_id,rule_id), foreign key(organization_id,inspection_id) references mir_core.run_inspections(organization_id,id),
 foreign key(organization_id,rule_id) references mir_core.inspection_rules(organization_id,id)
);
create table mir_core.delivery_approvals(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), run_id uuid not null, inspection_id uuid, rule_id uuid,
 requested_by uuid not null references auth.users(id), reason text not null check(length(btrim(reason))>0),
 status text not null default 'pending' check(status in('pending','approved','refused')), decided_by uuid references auth.users(id), decision_reason text, requested_at timestamptz not null default now(), decided_at timestamptz,
 primary key(organization_id,id), foreign key(organization_id,run_id) references mir_core.delivery_runs(organization_id,id),
 foreign key(organization_id,inspection_id) references mir_core.run_inspections(organization_id,id), foreign key(organization_id,rule_id) references mir_core.inspection_rules(organization_id,id)
);
create table mir_core.delivery_proofs(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), run_id uuid not null, job_id uuid not null,
 outcome text not null check(outcome in('delivered','partial','client_absent','wrong_address','access_impossible','damaged','returned')),
 recipient_name text, signature_path text, photo_path text, position jsonb, comment text not null default '', received_by uuid, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 primary key(organization_id,id), foreign key(organization_id,run_id) references mir_core.delivery_runs(organization_id,id), foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id)
);
create table mir_core.vehicle_maintenance(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), vehicle_id uuid not null,
 kind text not null check(kind in('oil','tires','brakes','repair','inspection','registration','insurance','odometer','other')),
 performed_at date, due_date date, due_odometer numeric(12,1), alert_enabled boolean not null default true, alert_days integer not null default 30 check(alert_days in(7,14,30)),
 odometer numeric(12,1), notes text not null default '', document_path text, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 primary key(organization_id,id), foreign key(organization_id,vehicle_id) references mir_core.vehicles(organization_id,id)
);
create table mir_core.logistics_audit(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), actor_id uuid not null references auth.users(id),
 action text not null, entity_type text not null, entity_id uuid, details jsonb not null default '{}' check(jsonb_typeof(details)='object'), created_at timestamptz not null default now(),
 primary key(organization_id,id)
);

do $$declare t text;begin foreach t in array array['vehicles','vehicle_authorizations','vehicle_qr_tokens','vehicle_qr_scans','inventory_locations','delivery_runs','delivery_run_orders','delivery_load_items','inventory_transfers','inspection_rules','run_inspections','inspection_results','delivery_approvals','delivery_proofs','vehicle_maintenance','logistics_audit'] loop
 execute format('alter table mir_core.%I enable row level security',t);execute format('revoke all on mir_core.%I from public,anon,authenticated',t);end loop;end$$;

-- Initial fleet and global locations for every existing organization.
insert into mir_core.vehicles(organization_id,internal_number,name,vehicle_type,make,model) select id,'V-001','Ford F-250','truck','Ford','F-250' from mir_core.organizations on conflict do nothing;
insert into mir_core.vehicles(organization_id,internal_number,name,vehicle_type,make,model) select id,'V-002','Mercedes Sprinter','van','Mercedes-Benz','Sprinter' from mir_core.organizations on conflict do nothing;
insert into mir_core.inventory_locations(organization_id,location_type,name) select id,'warehouse','Entrepôt' from mir_core.organizations on conflict do nothing;
insert into mir_core.inventory_locations(organization_id,location_type,name) select id,'return','Retour' from mir_core.organizations on conflict do nothing;
insert into mir_core.inventory_locations(organization_id,location_type,name) select id,'quarantine','Quarantaine' from mir_core.organizations on conflict do nothing;
insert into mir_core.inventory_locations(organization_id,location_type,name,vehicle_id)
 select v.organization_id,case when v.vehicle_type='trailer' then 'trailer' else 'vehicle' end,v.name,v.id from mir_core.vehicles v on conflict do nothing;

insert into mir_core.inspection_rules(organization_id,phase,code,label,requirement,position,photo_required,comment_required,failure_blocks) select o.id,'pre_load',x.code,x.label,x.req,x.pos,x.photo,x.comment,x.block from mir_core.organizations o cross join(values
 ('vehicle_qr','Scanner le QR du véhicule','required',10,false,false,true),('driver_authorized','Conducteur autorisé','required',20,false,true,true),('order_scan','Scanner la commande','required',30,false,false,true),('item_scan','Scanner chaque article','required',40,false,false,true),('manual_entry','Saisie manuelle si le QR ne fonctionne pas','optional',50,false,true,false),('damaged_photo','Photo pour un article endommagé','required',60,true,true,true),('quantity_difference','Justifier une quantité différente','required',70,false,true,true),('replacement_approval','Approbation du remplacement','required',80,false,true,true),('unassociated_items','Aucun article hors commande','required',90,false,true,true),('vehicle_capacity','Capacité du véhicule','optional',100,false,true,false)
 )x(code,label,req,pos,photo,comment,block) on conflict do nothing;
insert into mir_core.inspection_rules(organization_id,phase,code,label,requirement,position,photo_required,comment_required,failure_blocks) select o.id,'pre_departure',x.code,x.label,x.req,x.pos,x.photo,x.comment,x.block from mir_core.organizations o cross join(values
 ('odometer','Kilométrage','optional',10,false,false,false),('fuel','Carburant ou charge','optional',20,false,false,false),('exterior_photo','Photo extérieure','optional',30,true,false,false),('visible_damage','Dommage visible','required',40,true,true,true),('dashboard','Voyants du tableau de bord','required',50,false,true,true),('tires','Pneus','required',60,false,true,true),('lights','Feux','required',70,false,true,true),('brakes','Freins','required',80,false,true,true),('mirrors','Rétroviseurs','required',90,false,true,true),('windshield','Pare-brise','required',100,false,true,true),('plate','Plaque visible','required',110,false,false,true),('documents','Documents du véhicule','required',120,false,false,true),('load_secured','Chargement attaché','required',130,true,true,true),('doors','Portes fermées','required',140,false,false,true),('rain','Matériel protégé contre la pluie','optional',150,true,true,false),('order_compare','Articles comparés à la commande','required',160,false,false,true),('partials','Commandes partielles acceptées','optional',170,false,true,false),('trailer_hitch','Remorque correctement attachée','required',180,false,true,true),('safety_chains','Chaînes de sécurité','required',190,false,true,true),('trailer_lights','Lumières de remorque','required',200,false,true,true),('employee_comment','Commentaire de l’employé','optional',210,false,true,false),('final_confirmation','Confirmation finale','required',220,false,false,true)
 )x(code,label,req,pos,photo,comment,block) on conflict do nothing;

create function mir_core.vehicle_authorized(org uuid,vehicle uuid,member uuid default auth.uid()) returns boolean language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select mir_core.staff_role(org,member) in('admin','boss') or exists(select 1 from mir_core.vehicle_authorizations a where a.organization_id=org and a.vehicle_id=vehicle and a.employee_id=member and a.starts_at<=now() and(a.ends_at is null or a.ends_at>now()));$$;
revoke all on function mir_core.vehicle_authorized(uuid,uuid,uuid) from public,anon;grant execute on function mir_core.vehicle_authorized(uuid,uuid,uuid) to authenticated;

create function public.mir_logistics_snapshot(org uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare r text:=mir_core.staff_role(org);begin
 if r not in('warehouse','chef_equipe','boss','admin') then raise exception 'Accès logistique requis' using errcode='42501';end if;
 return jsonb_build_object('role',r,
  'vehicles',coalesce((select jsonb_agg(to_jsonb(v)-'vin' order by v.name) from mir_core.vehicles v where v.organization_id=org and not v.archived and(r in('admin','boss','warehouse') or mir_core.vehicle_authorized(org,v.id))),'[]'),
  'runs',coalesce((select jsonb_agg(to_jsonb(d) order by d.started_loading_at desc) from mir_core.delivery_runs d where d.organization_id=org and(r in('admin','boss','warehouse') or d.driver_id=auth.uid() or exists(select 1 from mir_core.delivery_run_orders ro where ro.organization_id=org and ro.run_id=d.id and mir_core.job_allowed(org,ro.job_id)))),'[]'),
  'runOrders',coalesce((select jsonb_agg(to_jsonb(ro)) from mir_core.delivery_run_orders ro where ro.organization_id=org and exists(select 1 from mir_core.delivery_runs d where d.organization_id=org and d.id=ro.run_id and(r in('admin','boss','warehouse') or d.driver_id=auth.uid() or mir_core.job_allowed(org,ro.job_id)))),'[]'),
  'items',coalesce((select jsonb_agg(to_jsonb(i)) from mir_core.delivery_load_items i where i.organization_id=org and exists(select 1 from mir_core.delivery_runs d where d.organization_id=org and d.id=i.run_id and(r in('admin','boss','warehouse') or d.driver_id=auth.uid() or(i.job_id is not null and mir_core.job_allowed(org,i.job_id))))),'[]'),
  'rules',coalesce((select jsonb_agg(to_jsonb(x) order by x.phase,x.position) from mir_core.inspection_rules x where x.organization_id=org and x.active),'[]'),
  'inspections',coalesce((select jsonb_agg(to_jsonb(i)) from mir_core.run_inspections i join mir_core.delivery_runs d on(d.organization_id,d.id)=(i.organization_id,i.run_id) where i.organization_id=org and(r in('admin','boss','warehouse') or d.driver_id=auth.uid())),'[]'),
  'inventory',coalesce((select jsonb_agg(jsonb_build_object('locationId',z.id,'location',z.name,'type',z.location_type,'itemKey',z.item_key,'itemName',z.item_name,'quantity',z.quantity)) from(select l.id,l.name,l.location_type,t.item_key,max(t.item_name) item_name,sum(case when t.to_location=l.id then t.quantity else -t.quantity end) quantity from mir_core.inventory_locations l join mir_core.inventory_transfers t on t.organization_id=l.organization_id and(l.id=t.from_location or l.id=t.to_location) where l.organization_id=org group by l.id,l.name,l.location_type,t.item_key having sum(case when t.to_location=l.id then t.quantity else -t.quantity end)<>0)z),'[]'));
end$$;

create function public.mir_admin_logistics_action(org uuid,action text,entity uuid,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare v uuid;token uuid;rule uuid;begin
 if mir_core.staff_role(org)<>'admin' or jsonb_typeof(payload)<>'object' then raise exception 'Admin requis' using errcode='42501';end if;
 if action='vehicle_save' then
  if entity is null then insert into mir_core.vehicles(organization_id,internal_number,name,vehicle_type,make,model,model_year,plate,vin,capacity_kg,status,notes) values(org,btrim(payload->>'internalNumber'),btrim(payload->>'name'),payload->>'type',coalesce(payload->>'make',''),coalesce(payload->>'model',''),nullif(payload->>'year','')::int,coalesce(payload->>'plate',''),coalesce(payload->>'vin',''),nullif(payload->>'capacityKg','')::numeric,coalesce(payload->>'status','available'),coalesce(payload->>'notes','')) returning id into v;
  else update mir_core.vehicles set name=coalesce(nullif(btrim(payload->>'name'),''),name),status=coalesce(nullif(payload->>'status',''),status),notes=coalesce(payload->>'notes',notes),updated_at=now() where organization_id=org and id=entity returning id into v;end if;
  insert into mir_core.inventory_locations(organization_id,location_type,name,vehicle_id) select org,case when vehicle_type='trailer' then 'trailer' else 'vehicle' end,name,id from mir_core.vehicles where organization_id=org and id=v on conflict do nothing;
 elsif action='qr_regenerate' then update mir_core.vehicle_qr_tokens set active=false,disabled_at=now() where organization_id=org and vehicle_id=entity and active;token:=gen_random_uuid();insert into mir_core.vehicle_qr_tokens(organization_id,vehicle_id,token_hash,created_by) values(org,entity,md5(token::text),auth.uid());v:=entity;
 elsif action='qr_disable' then update mir_core.vehicle_qr_tokens set active=false,disabled_at=now() where organization_id=org and vehicle_id=entity and active;v:=entity;
 elsif action='assign' then insert into mir_core.vehicle_authorizations(organization_id,vehicle_id,employee_id,kind,starts_at,ends_at,approved_by,reason) values(org,entity,(payload->>'employeeId')::uuid,payload->>'kind',coalesce(nullif(payload->>'startsAt','')::timestamptz,now()),nullif(payload->>'endsAt','')::timestamptz,auth.uid(),coalesce(payload->>'reason',''));v:=entity;
 elsif action='rule_save' then rule:=coalesce(entity,gen_random_uuid());insert into mir_core.inspection_rules(organization_id,id,phase,code,label,requirement,vehicle_type,vehicle_id,trailer_only,position,photo_required,comment_required,failure_blocks,approver_role) values(org,rule,payload->>'phase',payload->>'code',payload->>'label',payload->>'requirement',nullif(payload->>'vehicleType',''),nullif(payload->>'vehicleId','')::uuid,coalesce((payload->>'trailerOnly')::boolean,false),coalesce((payload->>'position')::int,0),coalesce((payload->>'photoRequired')::boolean,false),coalesce((payload->>'commentRequired')::boolean,false),coalesce((payload->>'failureBlocks')::boolean,false),coalesce(payload->>'approverRole','boss_admin')) on conflict(organization_id,id) do update set label=excluded.label,requirement=excluded.requirement,vehicle_type=excluded.vehicle_type,vehicle_id=excluded.vehicle_id,trailer_only=excluded.trailer_only,position=excluded.position,photo_required=excluded.photo_required,comment_required=excluded.comment_required,failure_blocks=excluded.failure_blocks,approver_role=excluded.approver_role;v:=rule;
 elsif action='maintenance_save' then insert into mir_core.vehicle_maintenance(organization_id,vehicle_id,kind,performed_at,due_date,due_odometer,alert_enabled,alert_days,odometer,notes,document_path,created_by) values(org,entity,payload->>'kind',nullif(payload->>'performedAt','')::date,nullif(payload->>'dueDate','')::date,nullif(payload->>'dueOdometer','')::numeric,coalesce((payload->>'alertEnabled')::boolean,true),coalesce((payload->>'alertDays')::int,30),nullif(payload->>'odometer','')::numeric,coalesce(payload->>'notes',''),nullif(payload->>'documentPath',''),auth.uid()) returning id into v;
 else raise exception 'Action admin inconnue' using errcode='22023';end if;
 insert into mir_core.logistics_audit(organization_id,actor_id,action,entity_type,entity_id,details) values(org,auth.uid(),action,'logistics',v,payload);
 return jsonb_build_object('id',v,'qrToken',token);
end$$;

create function public.mir_logistics_action(org uuid,request_id uuid,action text,entity uuid,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare r text:=mir_core.staff_role(org);run mir_core.delivery_runs;vehicle mir_core.vehicles;tokenrow mir_core.vehicle_qr_tokens;loc_from uuid;loc_to uuid;q numeric;item text;inspection uuid;rule mir_core.inspection_rules;transfer uuid;begin
 if r not in('warehouse','boss','admin') or request_id is null or jsonb_typeof(payload)<>'object' then raise exception 'Accès entrepôt requis' using errcode='42501';end if;
 if action='begin_run' then
  select q.* into tokenrow from mir_core.vehicle_qr_tokens q where q.organization_id=org and q.active and q.token_hash=md5(payload->>'vehicleToken');
  if not found then raise exception 'QR désactivé ou véhicule indisponible' using errcode='42501';end if;
  select v.* into vehicle from mir_core.vehicles v where v.organization_id=org and v.id=tokenrow.vehicle_id;
  if not found or vehicle.status in('maintenance','out_of_service','archived') then raise exception 'QR désactivé ou véhicule indisponible' using errcode='42501';end if;
  if not mir_core.vehicle_authorized(org,vehicle.id) then insert into mir_core.vehicle_qr_scans(organization_id,token_id,vehicle_id,scanned_by,accepted,reason) values(org,tokenrow.id,vehicle.id,auth.uid(),false,'Conducteur non autorisé');raise exception 'Conducteur non autorisé' using errcode='42501';end if;
  insert into mir_core.delivery_runs(organization_id,vehicle_id,trailer_id,driver_id,client_request_id,gps_enabled,start_odometer) values(org,vehicle.id,nullif(payload->>'trailerId','')::uuid,auth.uid(),request_id,coalesce((payload->>'gpsEnabled')::boolean,false),nullif(payload->>'odometer','')::numeric) returning * into run;update mir_core.vehicles set status='loading' where organization_id=org and id=vehicle.id;
  insert into mir_core.vehicle_qr_scans(organization_id,token_id,vehicle_id,scanned_by,accepted,reason) values(org,tokenrow.id,vehicle.id,auth.uid(),true,'Chargement commencé');
 elsif action='attach_order' then select * into run from mir_core.delivery_runs where organization_id=org and id=entity and driver_id=auth.uid() and status='loading' for update;if not found then raise exception 'Tournée non autorisée' using errcode='42501';end if;insert into mir_core.delivery_run_orders(organization_id,run_id,order_id,job_id,desired_at,priority,status) values(org,run.id,(payload->>'orderId')::uuid,(payload->>'jobId')::uuid,nullif(payload->>'desiredAt','')::timestamptz,coalesce(payload->>'priority','normal'),'preparing') on conflict do nothing;
 elsif action='load_item' then select * into run from mir_core.delivery_runs where organization_id=org and id=entity and driver_id=auth.uid() and status='loading' for update;if not found then raise exception 'Chargement non autorisé' using errcode='42501';end if;q:=(payload->>'quantity')::numeric;item:=btrim(payload->>'itemKey');if q<=0 or item='' then raise exception 'Article ou quantité invalide' using errcode='22023';end if;
  select id into loc_from from mir_core.inventory_locations where organization_id=org and location_type='warehouse';select id into loc_to from mir_core.inventory_locations where organization_id=org and vehicle_id=run.vehicle_id;
  insert into mir_core.inventory_transfers(organization_id,item_key,item_name,quantity,from_location,to_location,run_id,order_id,job_id,vehicle_id,employee_id,reason,client_request_id) values(org,item,coalesce(nullif(payload->>'itemName',''),item),q,loc_from,loc_to,run.id,nullif(payload->>'orderId','')::uuid,nullif(payload->>'jobId','')::uuid,run.vehicle_id,auth.uid(),'load',request_id) on conflict(organization_id,employee_id,client_request_id) do nothing returning id into transfer;
  if transfer is not null then insert into mir_core.delivery_load_items(organization_id,run_id,order_id,order_line_id,job_id,item_key,item_name,requested_qty,scanned_qty,loaded_qty,unit,issue,replacement_key,photo_path,note) values(org,run.id,nullif(payload->>'orderId','')::uuid,nullif(payload->>'lineId','')::uuid,nullif(payload->>'jobId','')::uuid,item,coalesce(nullif(payload->>'itemName',''),item),coalesce((payload->>'requestedQty')::numeric,q),q,q,coalesce(payload->>'unit','unité'),nullif(payload->>'issue',''),nullif(payload->>'replacementKey',''),nullif(payload->>'photoPath',''),coalesce(payload->>'note','')) on conflict(organization_id,run_id,item_key) do update set scanned_qty=mir_core.delivery_load_items.scanned_qty+excluded.scanned_qty,loaded_qty=mir_core.delivery_load_items.loaded_qty+excluded.loaded_qty,issue=coalesce(excluded.issue,mir_core.delivery_load_items.issue),photo_path=coalesce(excluded.photo_path,mir_core.delivery_load_items.photo_path),note=excluded.note,updated_at=now();end if;
 elsif action='complete_load' then update mir_core.delivery_runs set status='ready' where organization_id=org and id=entity and driver_id=auth.uid() and status='loading' returning * into run;if not found then raise exception 'Chargement non autorisé' using errcode='42501';end if;
  insert into mir_core.run_inspections(organization_id,run_id,phase,created_by) values(org,run.id,'pre_departure',auth.uid()) on conflict do nothing;
 elsif action='inspection_answer' then select i.id into inspection from mir_core.run_inspections i join mir_core.delivery_runs d on(d.organization_id,d.id)=(i.organization_id,i.run_id) where i.organization_id=org and i.id=entity and(d.driver_id=auth.uid() or r in('boss','admin'));if not found then raise exception 'Inspection non autorisée' using errcode='42501';end if;select * into rule from mir_core.inspection_rules where organization_id=org and id=(payload->>'ruleId')::uuid and active;if rule.photo_required and coalesce(payload->>'result','')='problem' and nullif(payload->>'photoPath','') is null then raise exception 'Photo obligatoire' using errcode='22023';end if;if rule.comment_required and coalesce(payload->>'result','')='problem' and length(btrim(coalesce(payload->>'comment','')))=0 then raise exception 'Commentaire obligatoire' using errcode='22023';end if;insert into mir_core.inspection_results(organization_id,inspection_id,rule_id,result,comment,photo_path,answered_by) values(org,inspection,rule.id,payload->>'result',coalesce(payload->>'comment',''),nullif(payload->>'photoPath',''),auth.uid()) on conflict(organization_id,inspection_id,rule_id) do update set result=excluded.result,comment=excluded.comment,photo_path=excluded.photo_path,answered_by=auth.uid(),answered_at=now();
 elsif action='start_delivery' then select * into run from mir_core.delivery_runs where organization_id=org and id=entity and driver_id=auth.uid() and status='ready' for update;if not found then raise exception 'Départ non autorisé' using errcode='42501';end if;
  if exists(select 1 from mir_core.inspection_rules x where x.organization_id=org and x.phase='pre_departure' and x.active and x.requirement='required' and(x.vehicle_id is null or x.vehicle_id=run.vehicle_id) and(x.vehicle_type is null or x.vehicle_type=(select vehicle_type from mir_core.vehicles where organization_id=org and id=run.vehicle_id)) and(not x.trailer_only or run.trailer_id is not null) and not exists(select 1 from mir_core.run_inspections i join mir_core.inspection_results z on(z.organization_id,z.inspection_id)=(i.organization_id,i.id) where i.organization_id=org and i.run_id=run.id and i.phase='pre_departure' and z.rule_id=x.id and z.result in('conform','na'))) then raise exception 'Vérifications obligatoires incomplètes' using errcode='42501';end if;
  if exists(select 1 from mir_core.run_inspections i join mir_core.inspection_results z on(z.organization_id,z.inspection_id)=(i.organization_id,i.id) join mir_core.inspection_rules x on(x.organization_id,x.id)=(z.organization_id,z.rule_id) where i.organization_id=org and i.run_id=run.id and z.result='problem' and x.failure_blocks and not exists(select 1 from mir_core.delivery_approvals a where a.organization_id=org and a.run_id=run.id and a.rule_id=x.id and a.status='approved')) then raise exception 'Départ bloqué: approbation requise' using errcode='42501';end if;
  update mir_core.delivery_runs set status='en_route',departed_at=now() where organization_id=org and id=run.id;update mir_core.vehicles set status='delivering' where organization_id=org and id=run.vehicle_id;
 elsif action='arrive' then update mir_core.delivery_runs set status='arrived',arrived_at=now() where organization_id=org and id=entity and driver_id=auth.uid() and status='en_route' returning * into run;if not found then raise exception 'Arrivée non autorisée' using errcode='42501';end if;update mir_core.vehicles set status='at_job' where organization_id=org and id=run.vehicle_id;
 elsif action='deliver_item' then select * into run from mir_core.delivery_runs where organization_id=org and id=entity and driver_id=auth.uid() and status in('arrived','partial') for update;if not found then raise exception 'Livraison non autorisée' using errcode='42501';end if;q:=(payload->>'quantity')::numeric;item:=payload->>'itemKey';select id into loc_from from mir_core.inventory_locations where organization_id=org and vehicle_id=run.vehicle_id;select id into loc_to from mir_core.inventory_locations where organization_id=org and job_id=(payload->>'jobId')::uuid;if loc_to is null then insert into mir_core.inventory_locations(organization_id,location_type,name,job_id) values(org,'job','Chantier '||(payload->>'jobId'),(payload->>'jobId')::uuid) returning id into loc_to;end if;insert into mir_core.inventory_transfers(organization_id,item_key,item_name,quantity,from_location,to_location,run_id,order_id,job_id,vehicle_id,employee_id,reason,client_request_id) values(org,item,coalesce(payload->>'itemName',item),q,loc_from,loc_to,run.id,nullif(payload->>'orderId','')::uuid,(payload->>'jobId')::uuid,run.vehicle_id,auth.uid(),'deliver',request_id);update mir_core.delivery_load_items set delivered_qty=delivered_qty+q,updated_at=now() where organization_id=org and run_id=run.id and item_key=item and delivered_qty+returned_qty+damaged_qty+q<=loaded_qty;if not found then raise exception 'Quantité supérieure au chargement' using errcode='22023';end if;
 elsif action='delivery_proof' then select * into run from mir_core.delivery_runs where organization_id=org and id=entity and driver_id=auth.uid() and status in('arrived','partial') for update;if not found then raise exception 'Preuve non autorisée' using errcode='42501';end if;insert into mir_core.delivery_proofs(organization_id,run_id,job_id,outcome,recipient_name,signature_path,photo_path,position,comment,received_by,created_by) values(org,run.id,(payload->>'jobId')::uuid,payload->>'outcome',nullif(payload->>'recipientName',''),nullif(payload->>'signaturePath',''),nullif(payload->>'photoPath',''),payload->'position',coalesce(payload->>'comment',''),nullif(payload->>'receivedBy','')::uuid,auth.uid());update mir_core.delivery_runs set status=case when payload->>'outcome'='delivered' then 'delivered' else 'partial' end where organization_id=org and id=run.id;
 elsif action='return_item' then select * into run from mir_core.delivery_runs where organization_id=org and id=entity and driver_id=auth.uid() and status in('partial','delivered','returning','arrived') for update;if not found then raise exception 'Retour non autorisé' using errcode='42501';end if;q:=(payload->>'quantity')::numeric;item:=payload->>'itemKey';select id into loc_from from mir_core.inventory_locations where organization_id=org and vehicle_id=run.vehicle_id;select id into loc_to from mir_core.inventory_locations where organization_id=org and location_type=case when coalesce((payload->>'damaged')::boolean,false) then 'quarantine' else 'return' end;insert into mir_core.inventory_transfers(organization_id,item_key,item_name,quantity,from_location,to_location,run_id,vehicle_id,employee_id,reason,client_request_id) values(org,item,coalesce(payload->>'itemName',item),q,loc_from,loc_to,run.id,run.vehicle_id,auth.uid(),case when coalesce((payload->>'damaged')::boolean,false) then 'damage' else 'return' end,request_id);update mir_core.delivery_load_items set returned_qty=returned_qty+case when coalesce((payload->>'damaged')::boolean,false) then 0 else q end,damaged_qty=damaged_qty+case when coalesce((payload->>'damaged')::boolean,false) then q else 0 end where organization_id=org and run_id=run.id and item_key=item and delivered_qty+returned_qty+damaged_qty+q<=loaded_qty;
 elsif action='finish_run' then update mir_core.delivery_runs set status='completed',completed_at=now(),end_odometer=nullif(payload->>'odometer','')::numeric,gps_enabled=false,last_position=null where organization_id=org and id=entity and driver_id=auth.uid() and status in('partial','delivered','returning') returning * into run;if not found then raise exception 'Fin de tournée non autorisée' using errcode='42501';end if;update mir_core.vehicles set status='available',current_odometer=greatest(current_odometer,coalesce(run.end_odometer,current_odometer)) where organization_id=org and id=run.vehicle_id;
 elsif action='approval_request' then insert into mir_core.delivery_approvals(organization_id,run_id,inspection_id,rule_id,requested_by,reason) values(org,entity,nullif(payload->>'inspectionId','')::uuid,nullif(payload->>'ruleId','')::uuid,auth.uid(),btrim(payload->>'reason')) returning id into transfer;
 elsif action='approval_decide' then if r not in('boss','admin') or payload->>'decision' not in('approved','refused') or length(btrim(coalesce(payload->>'reason','')))=0 then raise exception 'Boss ou Admin requis' using errcode='42501';end if;update mir_core.delivery_approvals set status=payload->>'decision',decided_by=auth.uid(),decision_reason=btrim(payload->>'reason'),decided_at=now() where organization_id=org and id=entity and status='pending';
 else raise exception 'Action logistique inconnue' using errcode='22023';end if;
 insert into mir_core.logistics_audit(organization_id,actor_id,action,entity_type,entity_id,details) values(org,auth.uid(),action,'delivery_run',coalesce(run.id,entity),payload);
 return jsonb_build_object('ok',true,'id',coalesce(run.id,transfer,entity));
end$$;

-- Vehicle and delivery media remain private; entity is a vehicle/run/job UUID.
create or replace function mir_core.internal_object_allowed(object_name text,writing boolean default false) returns boolean language plpgsql stable security definer set search_path=pg_catalog,mir_core,storage as $$declare parts text[];org uuid;scope text;entity uuid;owner uuid;r text;begin
 parts:=storage.foldername(object_name);if cardinality(parts)<>4 then return false;end if;begin org:=parts[1]::uuid;entity:=parts[3]::uuid;owner:=parts[4]::uuid;exception when others then return false;end;scope:=parts[2];
 if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=auth.uid() and active and role in('admin','employee')) or(writing and owner<>auth.uid()) then return false;end if;r:=mir_core.staff_role(org);
 if scope='message' then return mir_core.conversation_allowed(org,entity);end if;if scope in('extra','issue','receipt','material','problem','report') then return mir_core.job_allowed(org,entity);end if;
 if scope='vehicle' then return r='admin' or exists(select 1 from mir_core.vehicles v where v.organization_id=org and v.id=entity and r in('boss','warehouse'));end if;
 if scope in('delivery','inspection','signature') then return exists(select 1 from mir_core.delivery_runs d where d.organization_id=org and d.id=entity and(r in('admin','boss','warehouse') or d.driver_id=auth.uid()));end if;return false;end$$;

revoke all on function public.mir_logistics_snapshot(uuid),public.mir_admin_logistics_action(uuid,text,uuid,jsonb),public.mir_logistics_action(uuid,uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.mir_logistics_snapshot(uuid),public.mir_admin_logistics_action(uuid,text,uuid,jsonb),public.mir_logistics_action(uuid,uuid,text,uuid,jsonb) to authenticated;
commit;
