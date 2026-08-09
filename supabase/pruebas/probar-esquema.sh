#!/usr/bin/env bash
# Levanta un Postgres desechable, aplica la migración y comprueba que las
# restricciones rechacen lo que tienen que rechazar. No toca ninguna base real.
#
#   ./supabase/pruebas/probar-esquema.sh
#
# Necesita Postgres instalado localmente (initdb, pg_ctl, psql).
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
datos="${PGDATA_PRUEBA:-/var/tmp/pgjubileo}"
puerto="${PGPUERTO_PRUEBA:-55432}"
socket=/var/tmp

export PATH="/usr/lib/postgresql/16/bin:$PATH"

limpiar() {
  pg_ctl -D "$datos" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$datos"
}
trap limpiar EXIT

limpiar
mkdir -p "$datos"
initdb -D "$datos" -A trust -U postgres >/dev/null
pg_ctl -D "$datos" -l "$datos/log" -o "-k $socket -p $puerto -c listen_addresses=" -w start >/dev/null

psql -h "$socket" -p "$puerto" -U postgres -q -c 'create database jubileo'
psql -h "$socket" -p "$puerto" -U postgres -d jubileo -q -v ON_ERROR_STOP=1 \
  -c 'create extension if not exists "pgcrypto"' \
  -f "$raiz/supabase/pruebas/00-supabase-simulado.sql"

# Todas las migraciones, en orden. Nombrarlas a mano dejaría a las nuevas sin
# probar en silencio, que es justo lo que la regla de "solo hacia adelante"
# vuelve peligroso: nadie edita 0001, así que todo lo nuevo vive en las de
# después.
echo "Aplicando las migraciones…"
for migracion in "$raiz"/supabase/migraciones/[0-9]*.sql; do
  echo "  · $(basename "$migracion")"
  psql -h "$socket" -p "$puerto" -U postgres -d jubileo -q -v ON_ERROR_STOP=1 -f "$migracion"
done

salida=""
for prueba in 01-restricciones 02-modo-pareja 03-rls 04-reglas-del-esquema 05-cortesia 06-semanas 07-iconos 08-puente; do
  echo
  echo "=== $prueba ==="
  parcial=$(psql -h "$socket" -p "$puerto" -U postgres -d jubileo \
    -f "$raiz/supabase/pruebas/$prueba.sql" 2>&1 | grep -v '^$')
  echo "$parcial"
  salida="$salida"$'\n'"$parcial"
done

echo
echo "Columnas de dinero que no sean bigint (tiene que salir vacío):"
psql -h "$socket" -p "$puerto" -U postgres -d jubileo -tAc \
  "select table_name||'.'||column_name||' es '||data_type
     from information_schema.columns
    where table_schema='public' and column_name like '%cents%' and data_type<>'bigint'"

echo
if grep -qE 'FALLA|^psql:.*ERROR' <<<"$salida"; then
  echo "Hay comprobaciones que no se comportan como deben."
  exit 1
fi
echo "El esquema aplica, las restricciones se comportan y las políticas aíslan el hogar."
