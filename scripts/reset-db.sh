#!/bin/bash

set -e

# データベース接続情報
DB_HOST="${DB_HOST:-db.localtest.me}"
DB_PORT="${DB_PORT:-5434}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-main}"
BACKUP_FILE="${BACKUP_FILE:-database.bak}"

if [ -n "${DATABASE_URL:-}" ]; then
	mapfile -t db_parts < <(node -e 'const u=new URL(process.env.DATABASE_URL);const host=u.hostname;const port=u.port||"5432";const user=decodeURIComponent(u.username||"");const pass=decodeURIComponent(u.password||"");const db=u.pathname.replace(/^\\//,"");console.log([host,port,user,pass,db].join("\\n"));')
	DB_HOST="${db_parts[0]}"
	DB_PORT="${db_parts[1]}"
	DB_USER="${db_parts[2]}"
	DB_PASSWORD="${db_parts[3]}"
	DB_NAME="${db_parts[4]}"
	if [ -z "${DB_NAME:-}" ]; then
		echo "DATABASE_URL にDB名が含まれていません"
		exit 1
	fi
fi

# パスワードを環境変数に設定（psqlとpg_restoreで使用）
export PGPASSWORD="$DB_PASSWORD"

echo "🔄 Resetting database..."

# 1. スキーマを削除して再作成
echo "📦 Dropping and recreating schema..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
DO \$\$
DECLARE
    sch text := current_schema();
BEGIN
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', sch);
    EXECUTE format('CREATE SCHEMA %I', sch);
END\$\$;
EOF

# スキーマが削除されたことを確認
echo "✅ Schema dropped and recreated"

# 2. バックアップを復元
echo "📥 Restoring backup from $BACKUP_FILE..."
# --cleanを削除：すでにスキーマを削除しているので、純粋にリストアのみ行う
pg_restore --verbose --no-acl --no-owner \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  "$BACKUP_FILE"

echo "✅ Database reset complete!"
