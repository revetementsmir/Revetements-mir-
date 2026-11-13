#!/usr/bin/env bash
set -euo pipefail
: "${MIR_PG_SERVICE:?Set MIR_PG_SERVICE to a disposable restore target}"
: "${MIR_BACKUP_DIR:?Set MIR_BACKUP_DIR to the verified backup directory}"
cd "$MIR_BACKUP_DIR"
sha256sum --check SHA256SUMS
if [[ "${MIR_RESTORE_ROLES:-NO}" == "YES" ]]; then
  psql "service=$MIR_PG_SERVICE" --single-transaction --set=ON_ERROR_STOP=1 --file=roles.sql
fi
psql "service=$MIR_PG_SERVICE" --single-transaction --set=ON_ERROR_STOP=1 --file=schema.sql
pg_restore --dbname="service=$MIR_PG_SERVICE" --exit-on-error --single-transaction data.dump
pg_restore --dbname="service=$MIR_PG_SERVICE" --exit-on-error --single-transaction migration-history.dump
echo "Restore completed on the explicitly selected disposable target."
