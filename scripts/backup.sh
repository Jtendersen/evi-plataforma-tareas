#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

destino="backups/tareas_$(date +%Y%m%d_%H%M%S).sql"

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' > "$destino"

if [ ! -s "$destino" ]; then
  rm -f "$destino"
  echo "El backup quedo vacio" >&2
  exit 1
fi

echo "Backup creado: $destino ($(wc -c < "$destino") bytes)"
