begin;
create temporary table mir_hours_probe_result(proof jsonb);
grant select,insert on mir_hours_probe_result to authenticated;
set local role authenticated;
do $probe$
declare
 org uuid:='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9';
 employee uuid:='3980647a-d83a-48ad-9d90-8fc2b314807f';
 assistant_id uuid:='27fdec90-d357-4490-8ed6-7ab005bf20ed';
 boss_id uuid:='9de59777-5df3-454c-9570-249bcda9b8c8';
 ja uuid:='7da20261-1114-4000-8000-000000000001';
 jb uuid:='7da20261-1114-4000-8000-000000000002';
 req uuid:=gen_random_uuid();dec_req uuid:=gen_random_uuid();transfer_req uuid:=gen_random_uuid();transfer_dec_req uuid:=gen_random_uuid();
 body jsonb;submitted jsonb;approved jsonb;before_row jsonb;after_row jsonb;snapshot jsonb;personal jsonb;personal_row jsonb;transfer_submitted jsonb;cid uuid;sid uuid;denied_assistant boolean:=false;denied_employee boolean:=false;denied_org boolean:=false;
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',assistant_id,'role','authenticated','iss','https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1')::text,true);
 body:=jsonb_build_object('kind','hours','workDate','2026-11-09','startedAt','2026-11-09T07:00:00-05:00','endedAt','2026-11-09T15:30:00-05:00','jobId',ja,'reason','QA-TEAMS-HOURS-HOSTED-PROBE');
 submitted:=public.mir_punch_management_action(org,req,'submit',employee,body);
 if submitted is distinct from public.mir_punch_management_action(org,req,'submit',employee,body) then raise exception 'Submission replay differs';end if;
 cid:=(submitted->>'correctionId')::uuid;
 begin perform public.mir_punch_management_action(org,gen_random_uuid(),'decide',employee,jsonb_build_object('correctionId',cid,'decision','approved','reason','QA-TEAMS-HOURS-HOSTED-PROBE'));exception when insufficient_privilege then denied_assistant:=true;end;
 if not denied_assistant then raise exception 'Assistant approval unexpectedly allowed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',boss_id,'role','authenticated','iss','https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1')::text,true);
 approved:=public.mir_punch_management_action(org,dec_req,'decide',employee,jsonb_build_object('correctionId',cid,'decision','approved','reason','QA-TEAMS-HOURS-HOSTED-PROBE'));
 sid:=(approved->>'shiftId')::uuid;
 snapshot:=public.mir_punch_management_snapshot(org,'2026-11-09','2026-11-09',employee);
 select value into before_row from jsonb_array_elements(snapshot->'days') where value#>>'{shift,id}'=sid::text;
 if before_row is null then raise exception 'New canonical shift missing';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',assistant_id,'role','authenticated','iss','https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1')::text,true);
 body:=jsonb_build_object('kind','transfer','shiftId',sid,'revision',before_row->>'revision','workDate','2026-11-09','at','2026-11-09T10:30:00-05:00','jobId',jb,'reason','QA-TEAMS-HOURS-HOSTED-PROBE');
 perform public.mir_punch_management_preview(org,employee,body);
 transfer_submitted:=public.mir_punch_management_action(org,transfer_req,'submit',employee,body);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',boss_id,'role','authenticated','iss','https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1')::text,true);
 body:=jsonb_build_object('correctionId',transfer_submitted->>'correctionId','decision','approved','reason','QA-TEAMS-HOURS-HOSTED-PROBE');
 approved:=public.mir_punch_management_action(org,transfer_dec_req,'decide',employee,body);
 if approved is distinct from public.mir_punch_management_action(org,transfer_dec_req,'decide',employee,body) then raise exception 'Decision replay differs';end if;
 snapshot:=public.mir_punch_management_snapshot(org,'2026-11-09','2026-11-09',employee);
 select value into after_row from jsonb_array_elements(snapshot->'days') where value#>>'{shift,id}'=sid::text;
 if jsonb_array_length(after_row->'segments')<>2
 or after_row#>>'{segments,0,endedAt}' is distinct from after_row#>>'{segments,1,startedAt}'
 or (after_row#>>'{segments,1,startedAt}')::timestamptz is distinct from '2026-11-09T10:30:00-05:00'::timestamptz
 or after_row#>>'{shift,started_at}' is distinct from before_row#>>'{shift,started_at}'
 or after_row#>>'{shift,ended_at}' is distinct from before_row#>>'{shift,ended_at}'
 or after_row#>>'{totals,paidSeconds}' is distinct from before_row#>>'{totals,paidSeconds}'
 then raise exception 'Transfer boundary, shift or total changed unexpectedly';end if;
 begin perform public.mir_punch_management_snapshot(gen_random_uuid(),'2026-11-09','2026-11-09',employee);exception when insufficient_privilege then denied_org:=true;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',employee,'role','authenticated','iss','https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1')::text,true);
 begin perform public.mir_punch_management_snapshot(org,'2026-11-09','2026-11-09',employee);exception when insufficient_privilege then denied_employee:=true;end;
 personal:=public.mir_punch_snapshot(org,employee);
 select value into personal_row from jsonb_array_elements(personal->'week') where value->>'id'=sid::text;
 if personal_row#>>'{totals,paidSeconds}' is distinct from after_row#>>'{totals,paidSeconds}' then raise exception 'Personal and management totals differ';end if;
 if not denied_employee or not denied_org then raise exception 'Permission isolation failed';end if;
 insert into mir_hours_probe_result values(jsonb_build_object('testProject','hxtztkmbfpmzrieccwsg','transport','authenticated SQL with controlled claims, not HTTP or physical GPS','transaction','ROLLBACK','assistantCannotApprove',denied_assistant,'employeeManagementDenied',denied_employee,'foreignOrganizationDenied',denied_org,'submissionReplayStable',true,'decisionReplayStable',true,'sameCanonicalShift',true,'transferAt','2026-11-09T10:30:00-05:00','segments',after_row->'segments','totals',after_row->'totals','personalSnapshotCallable',personal is not null));
end $probe$;
reset role;
select proof from mir_hours_probe_result;
rollback;
