#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

if [ $# -ne 1 ] || [ ! -f "$1" ]; then
  echo "Uso: scripts/restore.sh backups/<archivo>.sql" >&2
  exit 1
fi

docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q' < "$1"

echo "Restauracion completada desde: $1"
