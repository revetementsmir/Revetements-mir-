-- Run only in MIR TEST, inside one rolled-back transaction. No email or order is sent.
begin;
do $$ begin if current_database() is null or not exists(select 1 from mir_core.organizations where name='MIR TEST') then raise exception 'MIR TEST required';end if;end $$;
create temporary table account_qa as
select (array_agg(m.user_id order by m.user_id) filter(where m.role='client'))[1] c1,
(array_agg(m.user_id order by m.user_id) filter(where m.role='client'))[2] c2,
(array_agg(m.user_id) filter(where m.role='admin'))[1] admin_id,
gen_random_uuid() address_id,gen_random_uuid() job1,gen_random_uuid() job2,gen_random_uuid() order1,gen_random_uuid() order2,null::text invitation
from mir_core.memberships m join mir_core.account_settings s on s.organization_id=m.organization_id where m.active;
alter table account_qa add column recipient_email text;
update account_qa q set recipient_email=u.email from auth.users u where u.id=q.c1;
grant select,update on account_qa to authenticated;
do $$ begin assert (select c1 is not null and c2 is not null and admin_id is not null from account_qa),'Three existing MIR TEST identities required';end $$;
insert into mir_core.jobs(organization_id,id,name) select s.organization_id,id,'QA account private '||id from mir_core.account_settings s cross join account_qa q cross join lateral unnest(array[q.job1,q.job2]) id;
select set_config('request.jwt.claim.sub',(select c1::text from account_qa),true);
set local role authenticated;
do $$ declare result jsonb;aid uuid;begin
 result:=public.mir_account_snapshot();assert result->>'role'='client','Only server membership supplies a client role';
 assert jsonb_array_length(result->'addresses')=0,'New private address book';
 aid:=public.mir_account_save_address('{"recipient":"QA ONLY","line1":"123 Test","line2":"","city":"Quebec","province":"QC","postalCode":"G1A 1A1","country":"Canada","user_id":"00000000-0000-0000-0000-000000000001","role":"admin"}');
 update account_qa set address_id=aid;
 assert not exists(select 1 from mir_core.customer_addresses where id=aid and (address?'user_id' or address?'role')),'Ignore ownership and role input';
 begin perform public.mir_portal_snapshot();raise exception 'Client reached team portal';exception when insufficient_privilege then null;end;
 begin perform public.mir_admin_publish_model((result->>'organizationId')::uuid,gen_random_uuid(),0,'{}');raise exception 'Client reached admin';exception when insufficient_privilege then null;end;
 begin insert into mir_core.customer_addresses(user_id,address) select c2,'{}'::jsonb from account_qa;raise exception 'Cross-owner insert accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select c2::text from account_qa),true);
set local role authenticated;
do $$ declare result jsonb;begin
 result:=public.mir_account_snapshot();assert result->>'role'='client';assert jsonb_array_length(result->'addresses')=0,'Second client sees first client address';
 assert (select count(*) from mir_core.customer_addresses)=0,'RLS leaked another address';
 begin perform public.mir_account_save_address('{"recipient":"QA","line1":"Other","city":"Quebec","province":"QC","postalCode":"123","country":"CA"}',(select address_id from account_qa));raise exception 'Cross-owner address update accepted';exception when insufficient_privilege then null;end;
 assert not public.mir_account_remove_address((select address_id from account_qa)),'Cross-owner delete accepted';
end $$;
reset role;
insert into mir_core.orders(organization_id,id,owner_id,kind) select s.organization_id,q.order1,q.c1,'client' from mir_core.account_settings s cross join account_qa q;
insert into mir_core.orders(organization_id,id,owner_id,kind) select s.organization_id,q.order2,q.c2,'client' from mir_core.account_settings s cross join account_qa q;
select set_config('request.jwt.claim.sub',(select c1::text from account_qa),true);
set local role authenticated;
do $$ declare result jsonb;begin result:=public.mir_account_snapshot();assert exists(select 1 from jsonb_array_elements(result->'orders') x where x->>'id'=(select order1::text from account_qa)),'Own order missing';assert not exists(select 1 from jsonb_array_elements(result->'orders') x where x->>'id'=(select order2::text from account_qa)),'Other client order leaked';end $$;
reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from account_qa),true);
set local role authenticated;
do $$ declare result jsonb;begin
 result:=public.mir_account_create_invitation((select recipient_email from account_qa),array[(select job1 from account_qa)],gen_random_uuid());
 update account_qa set invitation=split_part(result->>'activationPath','invitation=',2);
 assert length((select invitation from account_qa))=43,'Invitation token format';
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select c2::text from account_qa),true);
set local role authenticated;
do $$ begin
 begin perform public.mir_portal_accept_invitation((select invitation from account_qa));raise exception 'Invitation accepted by wrong identity';exception when insufficient_privilege then null;end;
 begin perform public.mir_account_create_invitation('qa-other@example.invalid','{}',gen_random_uuid());raise exception 'Client invited an employee';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select c1::text from account_qa),true);
set local role authenticated;
do $$ declare result jsonb;begin
 perform public.mir_portal_accept_invitation((select invitation from account_qa));
 result:=public.mir_portal_snapshot();assert jsonb_array_length(result->'jobs')=1,'Employee job scope';assert result->'jobs'->0->>'id'=(select job1::text from account_qa),'Unassigned job leaked';
 assert result->'jobs'->0->'assignedMemberIds' ? (select c1::text from account_qa),'Portal adapter lost verified assignment';
 assert result->'orders'='[]'::jsonb and jsonb_typeof(result->'sharedOrders')='array','Do not invent legacy quantities';
 assert (public.mir_portal_accept_invitation((select invitation from account_qa))->>'alreadyAccepted')::boolean,'Invitation retry must be idempotent';
end $$;
reset role;
do $$ begin
 assert not has_function_privilege('anon','public.mir_account_snapshot()','execute'),'Anonymous snapshot grant';
 assert not has_function_privilege('anon','public.mir_account_save_address(jsonb,uuid)','execute'),'Anonymous address write';
 assert not has_function_privilege('authenticated','mir_core.account_identity()','execute'),'Private identity helper exposed';
end $$;
rollback;
select 'PASS: two clients, own orders/addresses, RLS, confirmed existing identities, server roles, valid invitation and assigned jobs, retry, anonymous and admin refusals; all fixtures rolled back' as result;
