#!/usr/bin/env bash
# Teste de restauração: restaura o backup mais recente num banco TEMPORÁRIO e confere contagens.
# Uso: DATABASE_URL=postgresql://user:pass@host:5432/salvemaria ./scripts/restore-test.sh
set -euo pipefail
: "${DATABASE_URL:?defina DATABASE_URL}"
DIR="${BACKUP_DIR:-./backups}"
LATEST="$(ls -1t "$DIR"/*.sql.gz | head -n1)"
TMP_DB="salvemaria_restore_test"
ADMIN_URL="${DATABASE_URL%/*}/postgres"
echo "Restaurando $LATEST em $TMP_DB ..."
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $TMP_DB" -c "CREATE DATABASE $TMP_DB"
gunzip -c "$LATEST" | psql "${DATABASE_URL%/*}/$TMP_DB" -v ON_ERROR_STOP=1 -q
echo "Contagens no banco restaurado:"
psql "${DATABASE_URL%/*}/$TMP_DB" -c 'SELECT (SELECT count(*) FROM "Product") AS produtos, (SELECT count(*) FROM "Material") AS materiais, (SELECT count(*) FROM "Order") AS pedidos, (SELECT count(*) FROM "User") AS usuarios'
psql "$ADMIN_URL" -c "DROP DATABASE $TMP_DB"
echo "OK: restauração validada."
