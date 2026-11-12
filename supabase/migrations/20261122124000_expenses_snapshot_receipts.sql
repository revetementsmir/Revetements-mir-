-- Phase 4 UI projection: receipt identifiers only; binary access remains Storage ACL + short URL RPC.
begin;
create or replace function public.mir_expense_snapshot(org uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare r text:=mir_core.expense_role(org);begin
 if r is null then raise exception 'Accès MIR requis' using errcode='42501';end if;
 return jsonb_build_object('role',r,'categories',coalesce((select jsonb_agg(jsonb_build_object('code',c.code,'label',c.label) order by c.position) from mir_core.expense_categories c where c.organization_id=org and c.active),'[]'),'expenses',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'employeeId',e.employee_id,'jobId',e.job_id,'date',e.expense_date,'supplier',e.supplier,'category',e.category_code,'beforeTax',e.amount_before_tax,'tps',e.tps_amount,'tvq',e.tvq_amount,'total',e.total_amount,'note',e.note,'status',e.status,'reason',e.decision_reason,'updatedAt',e.updated_at,'receiptCount',(select count(*) from mir_core.expense_receipts x where x.organization_id=org and x.expense_id=e.id),'receipts',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'fileName',x.file_name,'mimeType',x.mime_type,'sizeBytes',x.size_bytes,'createdAt',x.created_at) order by x.created_at) from mir_core.expense_receipts x where x.organization_id=org and x.expense_id=e.id),'[]')) order by e.updated_at desc) from mir_core.expenses e where e.organization_id=org and mir_core.expense_visible(org,e.id)),'[]'));
end$$;
revoke all on function public.mir_expense_snapshot(uuid) from public,anon;
grant execute on function public.mir_expense_snapshot(uuid) to authenticated;
commit;
