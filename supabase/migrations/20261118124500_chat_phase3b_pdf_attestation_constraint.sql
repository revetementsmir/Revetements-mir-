do $guard$
declare definition text;
begin
 select pg_get_constraintdef(oid) into definition
 from pg_constraint
 where conrelid='mir_core.chat_file_validations'::regclass
   and conname='chat_file_validations_inspector_check';
 if definition is distinct from 'CHECK ((inspector = ANY (ARRAY[''png-crc-inflate-v1''::text, ''jpeg-signature-v1''::text, ''webp-signature-v1''::text, ''heif-signature-v1''::text])))' then
  raise exception 'chat_file_validations inspector constraint incompatible';
 end if;
end$guard$;

alter table mir_core.chat_file_validations
 drop constraint chat_file_validations_inspector_check,
 add constraint chat_file_validations_inspector_check
 check(inspector in('png-crc-inflate-v1','jpeg-signature-v1','webp-signature-v1','heif-signature-v1','pdf-structure-v1'));
