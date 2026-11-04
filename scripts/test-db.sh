#!/usr/bin/env bash
# Sobe um Postgres temporário, aplica as migrations sobre um "stub" do Supabase
# e roda os testes de RLS/análises. Requer os binários do PostgreSQL 15+ no PATH
# (ou em /usr/lib/postgresql/<versão>/bin).
set -euo pipefail
cd "$(dirname "$0")/.."

PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
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
