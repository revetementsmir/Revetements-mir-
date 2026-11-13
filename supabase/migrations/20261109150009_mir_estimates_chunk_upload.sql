begin;
alter table mir_estimates.requests add column uploads jsonb not null default '{}' check(jsonb_typeof(uploads)='object' and octet_length(uploads::text)<=20000);
create or replace function mir_estimates.rpc(action text,body jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 cfg mir_estimates.settings%rowtype;r mir_estimates.requests%rowtype;
 request_id uuid;cap text;amount bigint;used bigint;key_name text;token uuid;
begin
 -- One short transaction serializes quota admissions and state transitions across workers.
 perform pg_advisory_xact_lock(724191109);
 select * into strict cfg from mir_estimates.settings where singleton;
 if action='config' then return to_jsonb(cfg)-'singleton';end if;
 if action='rate' then
  key_name:='rate:'||(body->>'key')||':'||to_char(clock_timestamp(),'YYYYMMDDHH24MI');
  insert into mir_estimates.counters(key,amount) values(key_name,1) on conflict(key) do update set amount=mir_estimates.counters.amount+1 returning mir_estimates.counters.amount into amount;
  delete from mir_estimates.counters where key like 'rate:%' and updated_at<now()-interval '1 day';
  return jsonb_build_object('allowed',amount<=12);
 end if;
 if action='prepare' then
  request_id:=(body->>'id')::uuid;
  select * into r from mir_estimates.requests where id=request_id for update;
  if found then
   if r.resume_hash<>body->>'resumeHash' then raise exception 'CAPABILITY';end if;
   if r.content_hash<>body->>'contentHash' then raise exception 'IDEMPOTENCY_CONFLICT';end if;
   if r.state in ('rejected','cleaning') then raise exception 'UPLOAD_REJECTED';end if;
   if r.state='expired' then
    amount:=jsonb_array_length(r.files)*20971520;
    select coalesce(sum(reserved_bytes),0) into used from mir_estimates.requests;
    if used+amount>cfg.storage_budget_bytes then raise exception 'STORAGE_QUOTA';end if;
    update mir_estimates.requests set state='uploading',reserved_bytes=amount,upload_until=now()+interval '125 minutes',updated_at=now() where id=request_id returning * into r;
   elsif r.state='uploading' then
    update mir_estimates.requests set upload_until=now()+interval '125 minutes',updated_at=now() where id=request_id returning * into r;
   end if;
  else
   if pg_database_size(current_database())>419430400 then raise exception 'DATABASE_QUOTA';end if;
   key_name:='new:'||to_char(now(),'YYYYMMDD');select coalesce((select c.amount from mir_estimates.counters c where c.key=key_name),0) into used;
   if used>=cfg.daily_requests then raise exception 'DAILY_QUOTA';end if;
   amount:=jsonb_array_length(body->'files')*20971520;
   select greatest(coalesce(sum(reserved_bytes),0),(select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects)) into used from mir_estimates.requests;
   if used+amount>cfg.storage_budget_bytes then raise exception 'STORAGE_QUOTA';end if;
   insert into mir_estimates.requests(id,request_number,organization_id,resume_hash,content_hash,payload,files,reserved_bytes)
   values(request_id,'MIR-'||to_char(now(),'YYYYMMDD')||'-'||upper(replace(request_id::text,'-','')),cfg.organization_id,body->>'resumeHash',body->>'contentHash',body->'payload',body->'files',amount) returning * into r;
   insert into mir_estimates.counters(key,amount) values(key_name,1) on conflict(key) do update set amount=mir_estimates.counters.amount+1;
  end if;
  return jsonb_build_object('record',to_jsonb(r),'uploaded',coalesce((select jsonb_agg(f->>'id') from jsonb_array_elements(r.files) f join storage.objects o on o.bucket_id='mir-estimates' and o.name=r.id::text||'/'||(f->>'id')||'.pdf' and (o.metadata->>'size')::bigint=(f->>'bytes')::bigint),'[]'));
 end if;
 if action in ('claim','seal','received','uncertain','reject','release','upload_session') then
  request_id:=(body->>'id')::uuid;select * into r from mir_estimates.requests where id=request_id for update;
  if not found or r.resume_hash<>body->>'resumeHash' then raise exception 'CAPABILITY';end if;
  if r.state='received' then return to_jsonb(r);end if;
  if action='claim' then
   if r.state in ('rejected','expired','cleaning') then raise exception 'UPLOAD_REJECTED';end if;
   if r.lease_until>now() then raise exception 'BUSY';end if;
   if r.first_attempt_at<now()-interval '23 hours' then raise exception 'RECONCILIATION_REQUIRED';end if;
   token:=(body->>'lease')::uuid;
   update mir_estimates.requests set lease_token=token,lease_until=now()+interval '130 seconds',updated_at=now() where id=request_id returning * into r;
   return to_jsonb(r);
  end if;
  if r.lease_token is distinct from (body->>'lease')::uuid or r.lease_until<=now() then raise exception 'BUSY';end if;
  if action='seal' then
   if r.first_attempt_at is null then
    key_name:='email-day:'||to_char(now(),'YYYYMMDD');select coalesce((select c.amount from mir_estimates.counters c where c.key=key_name),0) into used;
    if used>=cfg.daily_emails then raise exception 'DAILY_QUOTA';end if;
    key_name:='email-month:'||to_char(now(),'YYYYMM');select coalesce((select c.amount from mir_estimates.counters c where c.key=key_name),0) into used;
    if used>=cfg.monthly_emails then raise exception 'MONTHLY_QUOTA';end if;
    insert into mir_estimates.counters(key,amount) values('email-day:'||to_char(now(),'YYYYMMDD'),1),('email-month:'||to_char(now(),'YYYYMM'),1)
    on conflict(key) do update set amount=mir_estimates.counters.amount+1;
   end if;
   update mir_estimates.requests set state='sending',notification=coalesce(notification,body->'notification'),first_attempt_at=coalesce(first_attempt_at,now()),reserved_bytes=(select coalesce(sum((f->>'bytes')::bigint),0) from jsonb_array_elements(files) f),updated_at=now() where id=request_id returning * into r;
  elsif action='received' then
   if r.state<>'sending' or nullif(body->>'messageId','') is null then raise exception 'RECEIPT_REQUIRED';end if;
   update mir_estimates.requests set state='received',message_id=body->>'messageId',accepted_at=now(),lease_token=null,lease_until=null,updated_at=now() where id=request_id returning * into r;
  elsif action='reject' then
   update mir_estimates.requests set state='rejected',lease_token=null,lease_until=null,updated_at=now() where id=request_id returning * into r;
  elsif action='uncertain' then
   update mir_estimates.requests set state=case when first_attempt_at is null then 'uploading' else 'uncertain' end,lease_token=null,lease_until=null,updated_at=now() where id=request_id returning * into r;
  elsif action='upload_session' then
   if r.first_attempt_at is not null or r.state<>'uploading' or octet_length(body->>'session')>3000 or (body->>'fileId') !~ '^[1-5]$' then raise exception 'UPLOAD_REJECTED';end if;
   update mir_estimates.requests set uploads=jsonb_set(uploads,array[body->>'fileId'],to_jsonb(body->>'session'),true),updated_at=now() where id=request_id returning * into r;
  elsif action='release' then
   update mir_estimates.requests set lease_token=null,lease_until=null where id=request_id returning * into r;
  end if;
  return to_jsonb(r);
 end if;
 if action='read' then
  select * into r from mir_estimates.requests where id=(body->>'id')::uuid;
  if not found then raise exception 'NOT_FOUND';end if;
  return to_jsonb(r);
 end if;
 if action='egress' then
  amount:=(body->>'bytes')::bigint;if amount<0 or amount>41943040 then raise exception 'INPUT';end if;
  key_name:='read:'||to_char(now(),'YYYYMM');
  select coalesce((select c.amount from mir_estimates.counters c where c.key=key_name),0) into used;
  if used+amount>cfg.read_budget_bytes then raise exception 'EGRESS_QUOTA';end if;
  insert into mir_estimates.counters(key,amount) values(key_name,amount) on conflict(key) do update set amount=mir_estimates.counters.amount+excluded.amount;
  return jsonb_build_object('allowed',true);
 end if;
 if action='cleanup_claim' then
  select * into r from mir_estimates.requests where first_attempt_at is null and ((state in ('uploading','rejected') and upload_until<now()) or (state='cleaning' and lease_until<now())) order by upload_until limit 1 for update;
  if not found then return null;end if;
  update mir_estimates.requests set state='cleaning',lease_token=(body->>'lease')::uuid,lease_until=now()+interval '130 seconds' where id=r.id returning * into r;
  return to_jsonb(r);
 end if;
 if action='cleanup_done' then
  update mir_estimates.requests set state='expired',reserved_bytes=0,lease_token=null,lease_until=null where id=(body->>'id')::uuid and state='cleaning' and lease_token=(body->>'lease')::uuid returning * into r;
  if not found then raise exception 'BUSY';end if;return jsonb_build_object('removed',r.id);
 end if;
 raise exception 'INPUT';
end $$;
commit;
