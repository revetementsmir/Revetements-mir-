-- Employee-facing metadata only. The canonical dossier and private URLs remain authoritative.
begin;
create function public.mir_studio_site_document_index(org uuid,job uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$begin
 if mir_core.job_dossier_allowed(org,job) is not true then raise exception 'Dossier chantier inaccessible' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('documentId',d.id,'version',d.version,'pageCount',5,'status',s.snapshot->>'status','current',d.version=(select max(newer.version) from mir_core.job_documents newer where newer.organization_id=org and newer.job_id=job and newer.family_id=d.family_id)) order by d.created_at desc,d.id)
 from mir_core.studio_site_snapshots s join mir_core.job_documents d on(d.organization_id,d.id)=(s.organization_id,s.document_id) where s.organization_id=org and d.job_id=job),'[]');
end$$;
revoke all on function public.mir_studio_site_document_index(uuid,uuid) from public,anon;
grant execute on function public.mir_studio_site_document_index(uuid,uuid) to authenticated;
commit;
