#!/usr/bin/env bash
# Sobe um Postgres temporário, aplica as migrations sobre um "stub" do Supabase
# e roda os testes de RLS/análises. Requer os binários do PostgreSQL 15+ no PATH
# (ou em /usr/lib/postgresql/<versão>/bin).
set -euo pipefail
cd "$(dirname "$0")/.."

PG_BIN="${PG_BIN:-$( (ls -d /usr/lib/postgresql/*/bin 2>/dev/null || true) | sort -V | tail -1)}"

# Sem PostgreSQL instalado na máquina: usa o Postgres do Supabase local (docker),
# num banco temporário separado — os dados de desenvolvimento não são tocados.
if [ -z "$PG_BIN" ] || [ ! -x "$PG_BIN/initdb" ]; then
  CONTAINER="${PG_CONTAINER:-supabase_db_rodata}"
  if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
    echo "Instale o PostgreSQL 15+ ou suba o Supabase local (npm run db:start)." >&2
    exit 1
  fi
  DB="rodata_test_$$"
  PSQL=(docker exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q)
  trap '"${PSQL[@]}" -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
  "${PSQL[@]}" -d postgres -c "create database $DB template template0" >/dev/null
  # o Supabase já cria o schema "extensions" e os papéis; o stub só completa o que faltar
  "${PSQL[@]}" -d "$DB" < supabase/tests/auth_stub.sql
  for f in supabase/migrations/*.sql; do "${PSQL[@]}" -d "$DB" < "$f"; done
  for f in supabase/tests/*.test.sql; do echo "▶ $f"; "${PSQL[@]}" -d "$DB" < "$f"; done
  exit 0
fi
export PATH="$PG_BIN:$PATH"
DATA="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
# o Postgres não roda como root: em containers, usa o usuário "postgres"
run() { if [ "$(id -u)" = "0" ]; then sudo -u postgres "$@"; else "$@"; fi; }
[ "$(id -u)" = "0" ] && chown -R postgres "$DATA"

cleanup() { run "$PG_BIN/pg_ctl" -D "$DATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

run "$PG_BIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null
run "$PG_BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/log" start -w >/dev/null

PSQL=(psql -h /tmp -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f supabase/tests/auth_stub.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
for f in supabase/tests/*.test.sql; do echo "▶ $f"; "${PSQL[@]}" -f "$f"; done
