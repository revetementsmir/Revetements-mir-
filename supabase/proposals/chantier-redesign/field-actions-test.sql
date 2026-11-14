-- Manual MIR TEST installation only. No production automatic migration.
begin;
do $$begin if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'MIR TEST prerequisite required';end if;end$$;
create or replace function mir_core.job_dossier_allowed(org uuid,jid uuid,member uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select coalesce(member is not null
 and exists(select 1 from mir_core.memberships m where m.organization_id=org and m.user_id=member and m.active)
 and (
   mir_core.has_role(org,array['admin'])
   or mir_core.staff_role(org,member) in ('boss','assistant')
   or mir_core.job_allowed(org,jid,member)
   or (mir_core.staff_role(org,member)='warehouse' and exists(
     select 1 from mir_core.delivery_run_orders dro
     join mir_core.delivery_runs dr on (dr.organization_id,dr.id)=(dro.organization_id,dro.run_id)
     where dro.organization_id=org and dro.job_id=jid
       and (dr.driver_id=member or mir_core.staff_role(org,member)='warehouse')
   ))
 ),false);
$$;

-- A person may report a job problem before the office has formed a team.
alter table mir_core.field_issues alter column team_id drop not null;
alter table mir_core.field_issues add column if not exists details jsonb not null default '{}'::jsonb;
alter table mir_core.field_issues add column if not exists response text not null default '';
alter table mir_core.field_issues add column if not exists updated_by uuid references auth.users(id);
alter table mir_core.field_issues add column if not exists updated_at timestamptz;
create table if not exists mir_core.field_action_receipts(
 organization_id uuid not null,actor_id uuid not null,request_id uuid not null,job_id uuid not null,kind text not null,payload jsonb not null,result jsonb not null,
 primary key(organization_id,actor_id,request_id),foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id));
alter table mir_core.field_action_receipts enable row level security;
revoke all on mir_core.field_action_receipts from public,anon,authenticated;
create or replace function public.mir_field_action(org uuid,job uuid,request_id uuid,kind text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare prior mir_core.field_action_receipts; eid uuid:=gen_random_uuid();tid uuid; photo text:=coalesce(payload->>'photoPath','');note text:=btrim(coalesce(payload->>'note',''));urg text:=coalesce(payload->>'urgency','normal');result jsonb;
begin
 if auth.uid() is null or not coalesce(mir_core.job_allowed(org,job),false) or coalesce(mir_core.staff_role(org),'') not in('employe','chef_equipe') then raise exception 'Accès chantier refusé' using errcode='42501';end if;
 if not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=job and not j.archived) then raise exception 'Chantier fermé' using errcode='42501';end if;
 if request_id is null or coalesce(kind,'') not in('photo','issue','tool') or coalesce(jsonb_typeof(payload),'null')<>'object' or length(payload::text)>6000 or length(note)>1200 or coalesce(urg,'') not in('normal','urgent','critical') then raise exception 'Demande invalide' using errcode='22023';end if;
 if exists(select 1 from jsonb_each(payload) x where jsonb_typeof(x.value)<>'string' or not (x.key=any(case kind when 'photo' then array['note','photoPath','stage'] when 'issue' then array['note','photoPath','urgency'] else array['note','photoPath','urgency','tool'] end))) then raise exception 'Champ non autorisé' using errcode='22023';end if;
 if (kind<>'photo' and length(note)<1) or(kind='tool' and length(btrim(coalesce(payload->>'tool',''))) not between 1 and 120) or(kind='photo' and (photo='' or coalesce(payload->>'stage','') not in('before','during','after'))) then raise exception 'Informations requises' using errcode='22023';end if;
 if photo<>'' and (split_part(photo,'/',1)<>org::text or split_part(photo,'/',2) not in('problem','extra','issue') or split_part(photo,'/',3)<>job::text or split_part(photo,'/',4)<>auth.uid()::text or photo like '%..%' or not exists(select 1 from storage.objects o where o.bucket_id='mir-internal' and o.name=photo)) then raise exception 'Photo inaccessible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||auth.uid()::text||request_id::text,0));
 select * into prior from mir_core.field_action_receipts r where r.organization_id=org and r.actor_id=auth.uid() and r.request_id=mir_field_action.request_id;
 if found then if prior.job_id<>job or prior.kind<>kind or prior.payload<>payload then raise exception 'Clé déjà utilisée pour une autre demande' using errcode='22023';end if;return prior.result;end if;
 select a.team_id into tid from mir_core.team_day_assignments a where a.organization_id=org and a.job_id=job and a.work_date=current_date order by a.created_at desc limit 1;
 if kind in('issue','tool') then insert into mir_core.field_issues(organization_id,id,job_id,team_id,note,photo_path,urgency,reported_by,client_request_id,details) values(org,eid,job,tid,case when kind='tool' then left('Outil : '||btrim(payload->>'tool')||' — '||note,1200) else note end,nullif(photo,''),urg,auth.uid(),request_id,payload||jsonb_build_object('kind',kind));end if;
 insert into mir_core.job_activity(organization_id,job_id,activity_type,entity_id,actor_id,payload) values(org,job,case when kind='photo' then 'photo' else 'field_issue' end,eid,auth.uid(),payload||jsonb_build_object('kind',kind,'status','open'));
 insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) select org,s.user_id,'field_issue',case when kind='tool' then 'Outil brisé' when kind='photo' then 'Photo de chantier' else 'Problème chantier' end,jsonb_build_object('view','job','jobId',job,'entityId',eid),eid from mir_core.staff_capabilities s join mir_core.memberships m on(m.organization_id,m.user_id)=(s.organization_id,s.user_id) where s.organization_id=org and s.active and m.active and s.staff_role in('assistant','boss');
 result:=jsonb_build_object('ok',true,'id',eid,'jobId',job,'status','open');insert into mir_core.field_action_receipts values(org,auth.uid(),request_id,job,kind,payload,result);return result;
end$$;
create or replace function public.mir_field_job_snapshot(org uuid,job uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$begin
 if auth.uid() is null or not coalesce(mir_core.job_dossier_allowed(org,job),false) then raise exception 'Dossier inaccessible' using errcode='42501';end if;
 return jsonb_build_object('jobId',job,'issues',coalesce((select jsonb_agg(to_jsonb(i)-'client_request_id' order by i.created_at desc) from (select * from mir_core.field_issues x where x.organization_id=org and x.job_id=job order by x.created_at desc limit 50) i),'[]'::jsonb));end$$;
create or replace function public.mir_field_issue_decide(org uuid,issue uuid,decision text,response text,request_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare i mir_core.field_issues;r text:=mir_core.staff_role(org);prior mir_core.field_action_receipts;body jsonb;result jsonb;begin
 select * into i from mir_core.field_issues x where x.organization_id=org and x.id=issue for update;
 if i.id is null or auth.uid() is null or coalesce(r,'') not in('assistant','boss','warehouse') or not coalesce(mir_core.job_dossier_allowed(org,i.job_id),false) or(r='warehouse' and coalesce(i.details->>'kind','')<>'tool') then raise exception 'Traitement non autorisé' using errcode='42501';end if;
 if not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=i.job_id and not j.archived) then raise exception 'Chantier fermé' using errcode='42501';end if;
 if request_id is null or coalesce(decision,'') not in('in_progress','resolved') or coalesce(length(btrim(response)),0) not between 1 and 1200 then raise exception 'Réponse requise' using errcode='22023';end if;
 body:=jsonb_build_object('issue',issue,'decision',decision,'response',btrim(response));
 perform pg_advisory_xact_lock(hashtextextended(org::text||auth.uid()::text||request_id::text,0));
 select * into prior from mir_core.field_action_receipts x where x.organization_id=org and x.actor_id=auth.uid() and x.request_id=mir_field_issue_decide.request_id;
 if found then if prior.kind<>'decision' or prior.job_id<>i.job_id or prior.payload<>body then raise exception 'Clé déjà utilisée pour une autre demande' using errcode='22023';end if;return prior.result;end if;
 update mir_core.field_issues x set status=decision,response=btrim(mir_field_issue_decide.response),updated_by=auth.uid(),updated_at=now() where x.organization_id=org and x.id=issue;
 insert into mir_core.job_activity(organization_id,job_id,activity_type,entity_id,actor_id,payload) values(org,i.job_id,'field_issue',issue,auth.uid(),jsonb_build_object('status',decision,'response',btrim(response),'kind',i.details->>'kind'));
 result:=jsonb_build_object('ok',true,'id',issue,'jobId',i.job_id,'status',decision);insert into mir_core.field_action_receipts values(org,auth.uid(),request_id,i.job_id,'decision',body,result);return result;end$$;

revoke all on function public.mir_field_action(uuid,uuid,uuid,text,jsonb),public.mir_field_job_snapshot(uuid,uuid),public.mir_field_issue_decide(uuid,uuid,text,text,uuid) from public,anon;
grant execute on function public.mir_field_action(uuid,uuid,uuid,text,jsonb),public.mir_field_job_snapshot(uuid,uuid),public.mir_field_issue_decide(uuid,uuid,text,text,uuid) to authenticated;
commit;
