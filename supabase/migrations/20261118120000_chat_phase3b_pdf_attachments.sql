do $$
declare
  bucket storage.buckets%rowtype;
begin
  select * into bucket from storage.buckets where id = 'mir-internal' for update;
  if not found then raise exception 'mir-internal bucket is missing'; end if;
  if bucket.public or bucket.file_size_limit is distinct from 10485760 then
    raise exception 'mir-internal bucket privacy or size limit is incompatible';
  end if;
  if bucket.allowed_mime_types is distinct from array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
     and bucket.allowed_mime_types is distinct from array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']::text[] then
    raise exception 'mir-internal MIME policy is incompatible';
  end if;
  update storage.buckets
     set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']::text[]
   where id = 'mir-internal';
end $$;
