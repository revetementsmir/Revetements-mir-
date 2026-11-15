begin;
create temporary table mir_guard_probe_ids as select gen_random_uuid() sid,gen_random_uuid() gid,gen_random_uuid() aid;
create temporary table mir_guard_probe_results(proof jsonb);
grant select on mir_guard_probe_ids to authenticated;
grant select,insert on mir_guard_probe_results to authenticated;
insert into mir_core.punch_shifts(organization_id,id,employee_id,work_date,started_at,ended_at,status,device_id)
select '8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9',sid,'9de59777-5df3-454c-9570-249bcda9b8c8','2026-11-09','2026-11-09T07:00:00-05:00','2026-11-09T08:00:00-05:00','review','QA-TEAMS-HOURS-GUARD-PROBE' from mir_guard_probe_ids;
insert into mir_core.punch_segments(organization_id,id,shift_id,job_id,segment_type,started_at,ended_at,created_by)
select '8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9',gid,sid,'7da20261-1114-4000-8000-000000000001','job','2026-11-09T07:00:00-05:00','2026-11-09T08:00:00-05:00','9de59777-5df3-454c-9570-249bcda9b8c8' from mir_guard_probe_ids;
insert into mir_core.hr_requests(organization_id,id,employee_id,request_type,start_date,end_date,employee_note,status,day_part,start_time,end_time,decided_by,decided_at,client_request_id)
select '8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9',aid,'3980647a-d83a-48ad-9d90-8fc2b314807f','appointment','2026-11-09','2026-11-09','QA-TEAMS-HOURS-GUARD-PROBE','approved','partial','10:00','12:00','9de59777-5df3-454c-9570-249bcda9b8c8',now(),gen_random_uuid() from mir_guard_probe_ids;
set local role authenticated;
do $probe$
declare org uuid:='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9';pid uuid;result jsonb;absence jsonb;snapshot jsonb;journal jsonb;direct_denied boolean:=false;management_denied boolean:=false;aid uuid;
begin
 perform set_config('request.jwt.claims','{"sub":"9de59777-5df3-454c-9570-249bcda9b8c8","role":"authenticated","iss":"https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1"}',true);
 result:=public.mir_punch_management_action(org,gen_random_uuid(),'period',null,jsonb_build_object('operation','period_save','label','QA-TEAMS-HOURS-GUARD-PROBE','startsOn','2026-11-09','endsOn','2026-11-09','reason','QA-TEAMS-HOURS-GUARD-PROBE'));
 pid:=(result->>'periodId')::uuid;
 if pid is null then raise exception 'Missing probe period';end if;
 begin perform public.mir_punch_admin(org,'approve_period',jsonb_build_object('periodId',pid,'reason','QA-TEAMS-HOURS-GUARD-PROBE'));exception when insufficient_privilege then direct_denied:=true;end;
 begin perform public.mir_punch_management_action(org,gen_random_uuid(),'period',null,jsonb_build_object('operation','approve_period','periodId',pid,'reason','QA-TEAMS-HOURS-GUARD-PROBE'));exception when insufficient_privilege then management_denied:=true;end;
 if not direct_denied or not management_denied then raise exception 'Self approval allowed';end if;
 snapshot:=public.mir_punch_management_snapshot(org,'2026-11-09','2026-11-09','3980647a-d83a-48ad-9d90-8fc2b314807f');
 select i.aid into aid from mir_guard_probe_ids i;
 select value into absence from jsonb_array_elements(snapshot->'absences') where value->>'id'=aid::text;
 if absence->>'dayPart' is distinct from 'partial' or absence->>'startTime' is distinct from '10:00:00' or absence->>'endTime' is distinct from '12:00:00' then raise exception 'Partial absence lost';end if;
 journal:=public.mir_punch_journal(org,jsonb_build_object('weekStart','2026-11-09','weekEnd','2026-11-15'),25,null);
 if not exists(select 1 from jsonb_array_elements(journal->'items') where value->>'actor_name'='Boss MIR Recette') then raise exception 'Audit author missing';end if;
 insert into mir_guard_probe_results values(jsonb_build_object('transport','authenticated SQL with controlled TEST claims','transaction','ROLLBACK','ownPeriodDirectDenied',direct_denied,'ownPeriodManagementDenied',management_denied,'partialAbsence',absence,'existingPaginatedJournalAuthorVerified',true));
end $probe$;
reset role;
select proof from mir_guard_probe_results;
rollback;
