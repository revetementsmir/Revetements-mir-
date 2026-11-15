begin;
create temporary table mir_legacy_probe_ids as select gen_random_uuid() sid,gen_random_uuid() gid;
create temporary table mir_legacy_probe_results(proof jsonb);
grant select on mir_legacy_probe_ids to authenticated;
grant insert,select on mir_legacy_probe_results to authenticated;
insert into mir_core.punch_shifts(organization_id,id,employee_id,work_date,started_at,ended_at,status,auto_break_minutes,device_id)
select '8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9',sid,'3980647a-d83a-48ad-9d90-8fc2b314807f','2026-11-09','2026-11-09T07:00:00-05:00','2026-11-09T15:30:00-05:00','review',15,'QA-TEAMS-HOURS-LEGACY-PROBE' from mir_legacy_probe_ids;
insert into mir_core.punch_segments(organization_id,id,shift_id,job_id,segment_type,started_at,ended_at,created_by)
select '8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9',gid,sid,'7da20261-1114-4000-8000-000000000001','job','2026-11-09T07:00:00-05:00','2026-11-09T15:30:00-05:00','3980647a-d83a-48ad-9d90-8fc2b314807f' from mir_legacy_probe_ids;
set local role authenticated;
do $probe$
declare org uuid:='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9';employee uuid:='3980647a-d83a-48ad-9d90-8fc2b314807f';sid uuid;cid uuid;request_id uuid:=gen_random_uuid();snapshot jsonb;current_row jsonb;preview jsonb;decision jsonb;receipt jsonb;after_row jsonb;missing_denied boolean:=false;stale_denied boolean:=false;
begin
 select i.sid into sid from mir_legacy_probe_ids i;
 perform set_config('request.jwt.claims','{"sub":"3980647a-d83a-48ad-9d90-8fc2b314807f","role":"authenticated","iss":"https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1"}',true);
 cid:=public.mir_punch_correction(org,null,jsonb_build_object('type','wrong_out','shiftId',sid,'proposedAt','2026-11-09T16:00:00-05:00','explanation','QA-TEAMS-HOURS-LEGACY-PROBE'));
 perform set_config('request.jwt.claims','{"sub":"9de59777-5df3-454c-9570-249bcda9b8c8","role":"authenticated","iss":"https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1"}',true);
 snapshot:=public.mir_punch_management_snapshot(org,'2026-11-09','2026-11-09',employee);
 select value into current_row from jsonb_array_elements(snapshot->'days') where value#>>'{shift,id}'=sid::text;
 preview:=public.mir_punch_management_preview(org,employee,jsonb_build_object('legacyCorrectionId',cid));
 decision:=jsonb_build_object('correctionId',cid,'decision','approved','reason','QA-TEAMS-HOURS-LEGACY-PROBE');
 begin perform public.mir_punch_management_action(org,gen_random_uuid(),'decide',employee,decision);exception when serialization_failure then missing_denied:=true;end;
 begin perform public.mir_punch_management_action(org,gen_random_uuid(),'decide',employee,decision||jsonb_build_object('revision','invalid-old-revision'));exception when serialization_failure then stale_denied:=true;end;
 if not missing_denied or not stale_denied then raise exception 'Unreviewed legacy approval allowed';end if;
 decision:=decision||jsonb_build_object('revision',preview#>>'{original,revision}');
 receipt:=public.mir_punch_management_action(org,request_id,'decide',employee,decision);
 if receipt is distinct from public.mir_punch_management_action(org,request_id,'decide',employee,decision) then raise exception 'Legacy receipt changed on replay';end if;
 snapshot:=public.mir_punch_management_snapshot(org,'2026-11-09','2026-11-09',employee);
 select value into after_row from jsonb_array_elements(snapshot->'days') where value#>>'{shift,id}'=sid::text;
 if (after_row#>>'{shift,ended_at}')::timestamptz is distinct from '2026-11-09T16:00:00-05:00'::timestamptz or after_row#>>'{totals,paidSeconds}' is distinct from preview#>>'{totals,paidSeconds}' then raise exception 'Approved result differs from preview';end if;
 insert into mir_legacy_probe_results values(jsonb_build_object('transport','authenticated SQL with controlled TEST claims','transaction','ROLLBACK','legacyCorrectionId',cid,'shiftId',sid,'missingRevisionDenied',missing_denied,'staleRevisionDenied',stale_denied,'currentRevisionApproved',true,'receiptReplayStable',true,'actualMatchesPreview',true,'paidSeconds',after_row#>'{totals,paidSeconds}','endedAt',after_row#>'{shift,ended_at}'));
end $probe$;
reset role;
select proof from mir_legacy_probe_results;
rollback;
