begin;
create function public.mir_admin_member_permissions(p_member_id uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare a jsonb;org uuid;begin a:=public.mir_account_snapshot();org:=(a->>'organizationId')::uuid;if a->>'role'<>'admin' then raise exception 'Administration requise' using errcode='42501';end if;return jsonb_build_object('coordination',exists(select 1 from mir_core.coordination_access where organization_id=org and user_id=p_member_id and active),'warehouse',exists(select 1 from mir_core.warehouse_access where organization_id=org and user_id=p_member_id and active),'jobs',exists(select 1 from mir_core.admin_permissions where organization_id=org and user_id=p_member_id and jobs),'estimates',exists(select 1 from mir_core.admin_permissions where organization_id=org and user_id=p_member_id and estimates));end$$;
create function public.mir_admin_invite(p_profile_id uuid,p_job_ids uuid[],p_request_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare a jsonb;org uuid;p mir_core.staff_profiles;r jsonb;begin
 a:=public.mir_account_snapshot();org:=(a->>'organizationId')::uuid;if a->>'role'<>'admin' then raise exception 'Administration requise' using errcode='42501';end if;
 select * into p from mir_core.staff_profiles where organization_id=org and id=p_profile_id for update;
 if not found or p.suspended or exists(select 1 from mir_core.memberships where organization_id=org and user_id=p.user_id and not active) then raise exception 'Employé introuvable ou suspendu' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('mir-invite-'||p.email,0));
 if not exists(select 1 from mir_core.account_invitations where organization_id=org and request_id=p_request_id) then update mir_core.account_invitations set revoked_at=now() where organization_id=org and email=p.email and revoked_at is null and accepted_at is null;end if;
 r:=public.mir_account_create_invitation(p.email,p_job_ids,p_request_id);
 delete from mir_core.staff_job_assignments where organization_id=org and profile_id=p.id and job_id in(select id from mir_core.jobs where organization_id=org and not archived);
 insert into mir_core.staff_job_assignments select org,p.id,jid from unnest(p_job_ids) jid on conflict do nothing;
 return r;
end$$;
create function public.mir_admin_search(p_search text) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare a jsonb;org uuid;hits jsonb;begin
 a:=public.mir_account_snapshot();org:=(a->>'organizationId')::uuid;if a->>'role' not in('employee','admin') then raise exception 'Accès équipe requis' using errcode='42501';end if;
 if length(trim(coalesce(p_search,'')))<1 or length(p_search)>160 then return '[]';end if;
 select coalesce(jsonb_agg(x),'[]') into hits from(select jsonb_build_object('type','job','id',j.id,'label',concat_ws(' · ',j.job_number,j.name,j.delivery_address)) x from mir_core.jobs j where j.organization_id=org and mir_core.job_allowed(org,j.id) and position(lower(p_search) in lower(concat_ws(' ',j.job_number,j.name,j.delivery_address)))>0 limit 50) s;
 hits:=hits||(select coalesce(jsonb_agg(x),'[]') from(select jsonb_build_object('type',case when o.kind='supplier' then 'purchase' else 'order' end,'id',o.id,'jobId',o.job_id,'label',coalesce(o.order_number,r.snapshot->>'number',o.id::text)) x from mir_core.orders o join mir_core.order_revisions r on(r.organization_id,r.order_id,r.revision)=(o.organization_id,o.id,o.revision) where o.organization_id=org and (mir_core.coordination_allowed(org) or (o.kind='employee' and o.owner_id=auth.uid() and mir_core.job_allowed(org,o.job_id))) and position(lower(p_search) in lower(coalesce(o.order_number,r.snapshot->>'number',o.id::text)))>0 limit 50)s);
 return hits;
end$$;
revoke all on function public.mir_admin_member_permissions(uuid),public.mir_admin_invite(uuid,uuid[],uuid),public.mir_admin_search(text) from public,anon;grant execute on function public.mir_admin_member_permissions(uuid),public.mir_admin_invite(uuid,uuid[],uuid),public.mir_admin_search(text) to authenticated;
commit;
