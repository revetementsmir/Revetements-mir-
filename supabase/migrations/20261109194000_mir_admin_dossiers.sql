begin;
create table mir_core.job_documents(organization_id uuid not null, id uuid not null default gen_random_uuid(),job_id uuid not null,family_id uuid not null,version integer not null check(version>0),name text not null check(length(name) between 1 and 180),object_path text not null unique,mime text not null,size_bytes bigint not null check(size_bytes>0 and size_bytes<=20971520),created_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),primary key(organization_id,id),unique(organization_id,job_id,family_id,version),foreign key(organization_id,job_id) references mir_core.jobs);
create index mir_job_documents_job on mir_core.job_documents(organization_id,job_id,family_id,version desc);
alter table mir_core.job_documents enable row level security;
revoke all on mir_core.job_documents from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('mir-job-documents','mir-job-documents',false,20971520,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create function mir_core.job_storage_read(path text) returns boolean language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$begin return exists(select 1 from mir_core.job_documents d where d.object_path=path and mir_core.job_allowed(d.organization_id,d.job_id));end$$;
create function mir_core.job_storage_write(path text) returns boolean language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare org uuid;jid uuid;begin
 if array_length(string_to_array(path,'/'),1)<>4 then return false;end if;org:=split_part(path,'/',1)::uuid;jid:=split_part(path,'/',2)::uuid;
 return mir_core.job_manager(org) and exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=jid and not archived) and split_part(path,'/',3)~'^[0-9a-f-]{36}$' and split_part(path,'/',4)~'^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$';exception when invalid_text_representation then return false;end$$;
revoke all on function mir_core.job_storage_read(text),mir_core.job_storage_write(text) from public,anon;grant execute on function mir_core.job_storage_read(text),mir_core.job_storage_write(text) to authenticated;
create policy mir_job_document_read on storage.objects for select to authenticated using(bucket_id='mir-job-documents' and mir_core.job_storage_read(name));
create policy mir_job_document_insert on storage.objects for insert to authenticated with check(bucket_id='mir-job-documents' and mir_core.job_storage_write(name));
-- No UPDATE/DELETE policy: every version has its own immutable private object.
create function public.mir_job_document_commit(p_job_id uuid,p_family_id uuid,p_object_path text,p_name text,p_expected_version integer) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare a jsonb;org uuid;v integer;obj storage.objects;d mir_core.job_documents;begin
 a:=public.mir_account_snapshot();org:=(a->>'organizationId')::uuid;
 if not mir_core.job_manager(org) or not mir_core.job_storage_write(p_object_path) or split_part(p_object_path,'/',2)<>p_job_id::text or split_part(p_object_path,'/',3)<>p_family_id::text then raise exception 'Publication non autorisée' using errcode='42501';end if;
 perform 1 from mir_core.jobs where organization_id=org and id=p_job_id for update;
 select * into d from mir_core.job_documents where organization_id=org and object_path=p_object_path;
 if found then return to_jsonb(d);end if;
 select coalesce(max(version),0) into v from mir_core.job_documents where organization_id=org and job_id=p_job_id and family_id=p_family_id;
 if v<>p_expected_version then raise exception 'Une autre révision a été publiée. Actualisez le dossier.' using errcode='40001';end if;
 select * into obj from storage.objects where bucket_id='mir-job-documents' and name=p_object_path and owner_id=auth.uid()::text;
 if not found or coalesce((obj.metadata->>'size')::bigint,0) not between 1 and 20971520 then raise exception 'Téléversement incomplet ou invalide' using errcode='22023';end if;
 insert into mir_core.job_documents(organization_id,job_id,family_id,version,name,object_path,mime,size_bytes) values(org,p_job_id,p_family_id,v+1,p_name,p_object_path,obj.metadata->>'mimetype',(obj.metadata->>'size')::bigint) returning * into d;
 return to_jsonb(d);
end$$;
revoke all on function public.mir_job_document_commit(uuid,uuid,text,text,integer) from public,anon;grant execute on function public.mir_job_document_commit(uuid,uuid,text,text,integer) to authenticated;
create function public.mir_job_detail(p_job_id uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare a jsonb;org uuid;out jsonb;begin
 a:=public.mir_account_snapshot();org:=(a->>'organizationId')::uuid;
 if not mir_core.job_allowed(org,p_job_id) then raise exception 'Chantier inaccessible' using errcode='42501';end if;
 select to_jsonb(j)||jsonb_build_object('documents',(select coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('author',coalesce(p.name,u.raw_user_meta_data->>'full_name','Équipe MIR')) order by d.created_at desc),'[]') from mir_core.job_documents d join auth.users u on u.id=d.created_by left join mir_core.staff_profiles p on p.organization_id=org and p.user_id=d.created_by where d.organization_id=org and d.job_id=j.id),'orders',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'number',o.order_number,'createdAt',o.created_at,'coordinationId',c.id,'warehouseShippedAt',c.shipped_at)),'[]') from mir_core.orders o left join mir_core.coordination_orders c on(c.organization_id,c.employee_order_id)=(o.organization_id,o.id) where o.organization_id=org and o.job_id=j.id and (mir_core.job_manager(org) or o.owner_id=auth.uid())),'canManage',mir_core.job_manager(org)) into out from mir_core.jobs j where j.organization_id=org and j.id=p_job_id;
 if out is null then raise exception 'Chantier introuvable' using errcode='42501';end if;return out;
end$$;
revoke all on function public.mir_job_detail(uuid) from public,anon;grant execute on function public.mir_job_detail(uuid) to authenticated;
create function public.mir_administration(p_search text default '') returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare a jsonb;org uuid;uid uuid:=auth.uid();snap jsonb;staff jsonb;jobs jsonb;hits jsonb;begin
 a:=public.mir_account_snapshot();org:=(a->>'organizationId')::uuid;snap:=public.mir_portal_snapshot();
 if not (mir_core.coordination_allowed(org) or mir_core.warehouse_allowed(org) or mir_core.job_manager(org)) then raise exception 'Administration non autorisée' using errcode='42501';end if;
 if a->>'role'='admin' then
  select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('status',case when p.suspended or m.active=false then 'suspended' when p.user_id is null then 'pending' else 'active' end,'jobs',(select coalesce(jsonb_agg(j.job_id),'[]') from mir_core.staff_job_assignments j where j.organization_id=org and j.profile_id=p.id)) order by p.name),'[]') into staff from mir_core.staff_profiles p left join mir_core.memberships m on(m.organization_id,m.user_id)=(p.organization_id,p.user_id) where p.organization_id=org;
 else staff:='[]';end if;
 select coalesce(jsonb_agg(jsonb_build_object('type','job','id',j.id,'label',concat_ws(' · ',j.job_number,j.name,j.delivery_address))),'[]') into hits from mir_core.jobs j where j.organization_id=org and mir_core.job_allowed(org,j.id) and not j.archived and (coalesce(p_search,'')='' or position(lower(p_search) in lower(concat_ws(' ',j.job_number,j.name,j.delivery_address)))>0);
 if coalesce(p_search,'')<>'' and mir_core.coordination_allowed(org) then
  hits:=hits||(select coalesce(jsonb_agg(jsonb_build_object('type','order','id',o.id,'jobId',o.job_id,'label',coalesce(o.order_number,o.id::text))),'[]') from mir_core.orders o where o.organization_id=org and o.kind='employee' and position(lower(p_search) in lower(coalesce(o.order_number,o.id::text)))>0);
  hits:=hits||(select coalesce(jsonb_agg(jsonb_build_object('type','purchase','id',o.id,'label',coalesce(r.snapshot->>'number',o.id::text))),'[]') from mir_core.orders o join mir_core.order_revisions r on(r.organization_id,r.order_id,r.revision)=(o.organization_id,o.id,o.revision) where o.organization_id=org and o.kind='supplier' and position(lower(p_search) in lower(coalesce(r.snapshot->>'number',o.id::text)))>0);
 end if;
 return jsonb_build_object('snapshot',snap,'staff',staff,'results',hits,'today',jsonb_build_object('toSort',case when mir_core.coordination_allowed(org) then (select count(*) from mir_core.orders o where o.organization_id=org and o.kind='employee' and o.status<>'cancelled' and not exists(select 1 from mir_core.coordination_orders c where c.organization_id=org and c.employee_order_id=o.id)) else 0 end,'preparations',case when mir_core.warehouse_allowed(org) then (select count(*) from mir_core.coordination_orders c where c.organization_id=org and c.shipped_at is null) else 0 end,'purchaseDrafts',case when mir_core.coordination_allowed(org) then (select count(*) from mir_core.orders where organization_id=org and kind='supplier' and status='draft') else 0 end));
end$$;
revoke all on function public.mir_administration(text) from public,anon;grant execute on function public.mir_administration(text) to authenticated;
commit;
