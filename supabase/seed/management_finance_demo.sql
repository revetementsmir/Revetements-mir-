-- MIR TEST only. Never apply to production: realistic management/finance fixtures.
do $$
declare org uuid;author uuid;client_id uuid:=gen_random_uuid();demo_job_id uuid;begin
 select id into org from mir_core.organizations where upper(name) like '%TEST%' order by name limit 1;
 if org is null then raise exception 'MIR TEST organization required';end if;
 select user_id into author from mir_core.memberships where organization_id=org and active and role='admin' limit 1;
 select id into demo_job_id from mir_core.jobs where organization_id=org and not archived order by name limit 1;
 if author is null or demo_job_id is null then raise exception 'MIR TEST admin and job required';end if;
 insert into mir_core.clients(organization_id,id,name,email,phone,address,created_by) values(org,client_id,'Construction Tremblay','comptes@tremblay.example','418-555-0135','141, rue du Chantier, Québec',author);
 insert into mir_core.estimates(organization_id,number,client_id,job_id,status,title,contract_value,estimated_cost,created_by) values
 (org,'S-DEMO-241',client_id,demo_job_id,'draft','Revêtement résidence Tremblay',84500,64200,author),
 (org,'S-DEMO-242',client_id,demo_job_id,'boss_approval','Agrandissement commercial',126000,101500,author),
 (org,'S-DEMO-243',client_id,demo_job_id,'sent','Réfection façade nord',39750,30200,author),
 (org,'S-DEMO-244',client_id,demo_job_id,'accepted','Revêtement et soffite',55200,41800,author);
 insert into mir_core.change_orders(organization_id,job_id,number,description,reason,amount,delay_days,status,created_by) values(org,demo_job_id,'AV-DEMO-01','Reprise du mur arrière et solins','Condition découverte au démontage',4850,2,'approval',author);
 insert into mir_core.job_finances values(org,demo_job_id,125000,4850,90000,94000,98500,74,now()) on conflict(organization_id,job_id) do update set contract_value=excluded.contract_value,accepted_extras=excluded.accepted_extras,estimated_cost=excluded.estimated_cost,committed_cost=excluded.committed_cost,actual_cost=excluded.actual_cost,progress_percent=excluded.progress_percent;
 insert into mir_core.invoices(organization_id,number,client_id,job_id,status,due_date,total,paid_amount,created_by) values
 (org,'F-DEMO-118',client_id,demo_job_id,'draft',current_date+30,18750,0,author),
 (org,'F-DEMO-119',client_id,demo_job_id,'partial',current_date+7,24000,12000,author),
 (org,'F-DEMO-120',client_id,demo_job_id,'overdue',current_date-12,16750,0,author);
end$$;
