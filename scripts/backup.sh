#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

destino="backups/tareas_$(date +%Y%m%d_%H%M%S).sql"
temporal="$destino.tmp"
trap 'rm -f "$temporal"' EXIT

if ! command -v docker >/dev/null 2>&1; then
  echo "No se encontro docker. En Windows ejecutar desde Git Bash, no desde WSL." >&2
  exit 1
fi

if ! docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' > "$temporal"; then
  echo "No se pudo generar el backup. Verificar que el stack este en marcha (docker compose ps)." >&2
  exit 1
fi

if ! grep -q 'PostgreSQL database dump' "$temporal"; then
  echo "El resultado no es un dump de PostgreSQL; no se guardo." >&2
  exit 1
fi

mv "$temporal" "$destino"
echo "Backup creado: $destino ($(wc -c < "$destino") bytes)"
