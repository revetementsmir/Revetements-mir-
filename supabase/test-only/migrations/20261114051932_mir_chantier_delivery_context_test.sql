-- Tighten the existing delivery issue contract, retaining its signature and objects.
begin;
do $$begin if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'MIR TEST prerequisite required';end if;end$$;
create or replace function public.mir_delivery_issue(org uuid,job uuid,p_order uuid,line uuid,supplier_order uuid,comment text,photo text,request_id uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare result uuid;target uuid;prior mir_core.delivery_issues;begin
 if not coalesce(mir_core.job_allowed(org,job),false) or request_id is null or coalesce(length(btrim(comment)),0) not between 1 and 1200 then raise exception 'Signalement invalide' using errcode='22023';end if;
 if not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=job and not j.archived) then raise exception 'Chantier fermé' using errcode='42501';end if;
 if p_order is not null and not exists(select 1 from mir_core.orders o where o.organization_id=org and o.id=p_order and o.job_id=job) then raise exception 'Commande étrangère au chantier' using errcode='42501';end if;
 if line is not null and (p_order is null or not exists(select 1 from mir_core.order_lines l where l.organization_id=org and l.id=line and l.order_id=p_order)) then raise exception 'Article étranger à la commande' using errcode='42501';end if;
 if supplier_order is not null and not exists(select 1 from mir_core.orders o where o.organization_id=org and o.id=supplier_order and o.kind='supplier' and o.job_id=job) then raise exception 'Commande fournisseur étrangère au chantier' using errcode='42501';end if;
 if coalesce(photo,'')<>'' and (split_part(photo,'/',1)<>org::text or split_part(photo,'/',2) not in('issue','delivery','problem') or split_part(photo,'/',3)<>job::text or split_part(photo,'/',4)<>auth.uid()::text or photo like '%..%' or not exists(select 1 from storage.objects o where o.bucket_id='mir-internal' and o.name=photo)) then raise exception 'Photo inaccessible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||auth.uid()::text||request_id::text,0));
 select * into prior from mir_core.delivery_issues i where i.organization_id=org and i.reported_by=auth.uid() and i.client_request_id=request_id;
 if found then if prior.job_id is distinct from job or prior.order_id is distinct from p_order or prior.order_line_id is distinct from line or prior.supplier_order_id is distinct from supplier_order or prior.comment<>btrim(comment) or coalesce(prior.photo_path,'')<>coalesce(photo,'') then raise exception 'Clé déjà utilisée pour un autre signalement' using errcode='22023';end if;return prior.id;end if;
 insert into mir_core.delivery_issues(organization_id,job_id,order_id,order_line_id,supplier_order_id,reported_by,client_request_id,comment,photo_path) values(org,job,p_order,line,supplier_order,auth.uid(),request_id,btrim(comment),nullif(photo,'')) returning id into result;
 insert into mir_core.job_activity(organization_id,job_id,activity_type,entity_id,actor_id,payload) values(org,job,'delivery_issue',result,auth.uid(),jsonb_build_object('status','open','orderId',p_order,'lineId',line,'comment',btrim(comment),'photoPath',nullif(photo,'')));
 for target in select p.user_id from mir_core.staff_capabilities p where p.organization_id=org and p.active and p.staff_role='assistant' loop insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) values(org,target,'delivery_issue','Problème de livraison',jsonb_build_object('view','material-issue','jobId',job,'issueId',result),result);end loop;return result;
end$$;
commit;
