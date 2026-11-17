-- S2 additive metadata on the canonical immutable job document/version mechanism.
-- Applied to MIR TEST only by this task; no production fallback or new bucket.
begin;
create table mir_core.studio_site_snapshots(
 organization_id uuid not null,
 document_id uuid not null,
 project_id text not null check(length(project_id) between 6 and 120),
 building_id text not null check(length(building_id) between 1 and 120),
 schema_version integer not null default 1 check(schema_version=1),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and snapshot->>'schema'='mir-studio-site-1'),
 snapshot_sha256 text not null check(snapshot_sha256~'^[0-9a-f]{64}$'),
 pdf_sha256 text not null check(pdf_sha256~'^[0-9a-f]{64}$'),
 page_count integer not null default 5 check(page_count=5),
 created_at timestamptz not null default now(),
 primary key(organization_id,document_id),
 foreign key(organization_id,document_id) references mir_core.job_documents(organization_id,id)
);
create index mir_studio_site_project on mir_core.studio_site_snapshots(organization_id,project_id,building_id,created_at desc);
alter table mir_core.studio_site_snapshots enable row level security;
revoke all on mir_core.studio_site_snapshots from public,anon,authenticated;

-- Match existing job management, respecting the later TEST permission matrix when present.
create function mir_core.studio_site_manager(org uuid) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare allowed boolean;begin
 if to_regprocedure('mir_core.job_manager(uuid)') is not null then
  execute 'select mir_core.job_manager($1)' into allowed using org;return coalesce(allowed,false);
 end if;
 return coalesce(mir_core.has_role(org,array['admin']) or mir_core.staff_role(org) in ('boss','assistant'),false);
end$$;
revoke all on function mir_core.studio_site_manager(uuid) from public,anon,authenticated;

create function public.mir_studio_site_jobs(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$begin
 if not mir_core.studio_site_manager(org) then raise exception 'Accès chantier refusé' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'name',j.name) order by j.name,j.id) from mir_core.jobs j where j.organization_id=org and not j.archived),'[]');
end$$;

create function public.mir_studio_site_history(org uuid,job uuid,project text,building text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$begin
 if mir_core.job_dossier_allowed(org,job) is not true then raise exception 'Dossier chantier inaccessible' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('documentId',d.id,'familyId',d.family_id,'version',d.version,'objectPath',d.object_path,'name',d.name,'createdAt',d.created_at,'pdfSha256',s.pdf_sha256,'snapshotSha256',s.snapshot_sha256,'pageCount',s.page_count,'projectId',s.project_id,'buildingId',s.building_id,'status',s.snapshot->>'status','current',d.version=(select max(newer.version) from mir_core.job_documents newer where newer.organization_id=org and newer.job_id=job and newer.family_id=d.family_id)) order by d.created_at desc,d.id)
  from mir_core.studio_site_snapshots s join mir_core.job_documents d on (d.organization_id,d.id)=(s.organization_id,s.document_id) where s.organization_id=org and d.job_id=job and s.project_id=project and s.building_id=building),'[]');
end$$;

create function public.mir_studio_site_commit(org uuid,job uuid,family uuid,path text,name text,expected_version integer,site_snapshot jsonb,pdf_sha256 text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare d mir_core.job_documents;object_meta jsonb;last_version integer;digest text;existing mir_core.studio_site_snapshots;begin
 if auth.uid() is null or not mir_core.studio_site_manager(org) or not mir_core.job_storage_write(path)
  or split_part(path,'/',1)<>org::text or split_part(path,'/',2)<>job::text or split_part(path,'/',3)<>family::text or path !~ '\.pdf$'
 then raise exception 'Rattachement chantier non autorisé' using errcode='42501';end if;
 if jsonb_typeof(site_snapshot) is distinct from 'object' or site_snapshot->>'schema' is distinct from 'mir-studio-site-1' or site_snapshot->>'version' is distinct from '1'
  or coalesce(length(site_snapshot->>'projectId'),0) not between 6 and 120 or coalesce(length(site_snapshot->>'buildingId'),0) not between 1 and 120
  or site_snapshot->'viewOrder' is distinct from '["front","right","back","left","soffits"]'::jsonb or coalesce(site_snapshot->>'status','') not in ('draft','validated')
  or jsonb_typeof(site_snapshot->'walls') is distinct from 'array' or jsonb_typeof(site_snapshot->'openings') is distinct from 'array'
  or octet_length(site_snapshot::text)>3000000 or pdf_sha256 is null or pdf_sha256 !~ '^[0-9a-f]{64}$' or expected_version is null or expected_version<0
 then raise exception 'Cotation cinq vues invalide' using errcode='22023';end if;
 -- Exact immutable payload; no employee RPC returns its raw settings or private internal data.
 digest:=encode(sha256(convert_to(site_snapshot::text,'UTF8')),'hex');
 perform 1 from mir_core.jobs j where j.organization_id=org and j.id=job and not j.archived for update;
 if not found then raise exception 'Chantier indisponible' using errcode='42501';end if;
 select * into d from mir_core.job_documents x where x.organization_id=org and x.object_path=path;
 if found then
  select * into existing from mir_core.studio_site_snapshots s where s.organization_id=org and s.document_id=d.id;
  if not found or existing.snapshot_sha256<>digest or existing.pdf_sha256<>mir_studio_site_commit.pdf_sha256 then raise exception 'Révision déjà figée avec un autre contenu' using errcode='40001';end if;
 else
  select coalesce(max(x.version),0) into last_version from mir_core.job_documents x where x.organization_id=org and x.job_id=job and x.family_id=family;
  if last_version<>expected_version then raise exception 'Le dossier a changé. Relisez sa version.' using errcode='40001';end if;
  if exists(select 1 from mir_core.job_documents x join mir_core.studio_site_snapshots s on (s.organization_id,s.document_id)=(x.organization_id,x.id) where x.organization_id=org and x.job_id=job and x.family_id=family and (s.project_id<>site_snapshot->>'projectId' or s.building_id<>site_snapshot->>'buildingId')) then raise exception 'Famille rattachée à un autre bâtiment' using errcode='22023';end if;
  if to_regprocedure('public.mir_job_document_commit(uuid,uuid,text,text,integer)') is not null then
   execute 'select (jsonb_populate_record(null::mir_core.job_documents,public.mir_job_document_commit($1,$2,$3,$4,$5))).*' into d using job,family,path,name,expected_version;
  else
   select o.metadata into object_meta from storage.objects o where o.bucket_id='mir-job-documents' and o.name=path and o.owner_id=auth.uid()::text;
   if object_meta is null or coalesce(object_meta->>'mimetype','')<>'application/pdf' or coalesce((object_meta->>'size')::bigint,0) not between 1 and 20971520 then raise exception 'PDF privé absent ou invalide' using errcode='22023';end if;
   insert into mir_core.job_documents(organization_id,job_id,family_id,version,name,object_path,mime,size_bytes,created_by) values(org,job,family,last_version+1,name,path,'application/pdf',(object_meta->>'size')::bigint,auth.uid()) returning * into d;
  end if;
  if (site_snapshot->>'revision')::integer<>d.version then raise exception 'Révision PDF différente de la version chantier' using errcode='40001';end if;
  insert into mir_core.studio_site_snapshots(organization_id,document_id,project_id,building_id,snapshot,snapshot_sha256,pdf_sha256)
   values(org,d.id,site_snapshot->>'projectId',site_snapshot->>'buildingId',site_snapshot,digest,pdf_sha256);
 end if;
 return jsonb_build_object('ok',true,'documentId',d.id,'jobId',job,'projectId',site_snapshot->>'projectId','buildingId',site_snapshot->>'buildingId','familyId',d.family_id,'version',d.version,'pageCount',5,'pdfSha256',pdf_sha256,'snapshotSha256',digest);
end$$;
revoke all on function public.mir_studio_site_jobs(uuid),public.mir_studio_site_history(uuid,uuid,text,text),public.mir_studio_site_commit(uuid,uuid,uuid,text,text,integer,jsonb,text) from public,anon;
grant execute on function public.mir_studio_site_jobs(uuid),public.mir_studio_site_history(uuid,uuid,text,text),public.mir_studio_site_commit(uuid,uuid,uuid,text,text,integer,jsonb,text) to authenticated;
commit;
