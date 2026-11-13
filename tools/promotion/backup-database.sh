#!/usr/bin/env bash
set -euo pipefail
: "${MIR_PG_SERVICE:?Set MIR_PG_SERVICE to a libpq service name}"
: "${MIR_BACKUP_DIR:?Set MIR_BACKUP_DIR to a new protected directory}"
umask 077
mkdir -p "$MIR_BACKUP_DIR"
pg_dumpall --database="service=$MIR_PG_SERVICE" --roles-only --file="$MIR_BACKUP_DIR/roles.sql"
pg_dump --dbname="service=$MIR_PG_SERVICE" --schema-only --file="$MIR_BACKUP_DIR/schema.sql"
pg_dump --dbname="service=$MIR_PG_SERVICE" --data-only --format=custom --exclude-schema=supabase_migrations --exclude-table-data=storage.buckets_vectors --exclude-table-data=storage.vector_indexes --file="$MIR_BACKUP_DIR/data.dump"
pg_dump --dbname="service=$MIR_PG_SERVICE" --schema=supabase_migrations --data-only --format=custom --file="$MIR_BACKUP_DIR/migration-history.dump"
sha256sum "$MIR_BACKUP_DIR/roles.sql" "$MIR_BACKUP_DIR/schema.sql" "$MIR_BACKUP_DIR/data.dump" "$MIR_BACKUP_DIR/migration-history.dump" > "$MIR_BACKUP_DIR/SHA256SUMS"
echo "Database backup complete: $MIR_BACKUP_DIR"
