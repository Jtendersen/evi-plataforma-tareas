#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

if [ $# -ne 1 ] || [ ! -f "$1" ]; then
  echo "Uso: bash scripts/restore.sh backups/<archivo>.sql" >&2
  exit 1
fi

if ! grep -q 'PostgreSQL database dump' "$1"; then
  echo "El archivo no es un dump de PostgreSQL; no se restauro nada." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "No se encontro docker. En Windows ejecutar desde Git Bash, no desde WSL." >&2
  exit 1
fi

if ! docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q' < "$1"; then
  echo "La restauracion fallo. Verificar que el stack este en marcha (docker compose ps)." >&2
  exit 1
fi

echo "Restauracion completada desde: $1"
