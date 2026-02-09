# DB リセット

開発中のデータを初期化したい場合の手順です。

```bash
bun run db:reset
bun run db:migrate
bun run seed
```

`db:reset` は `scripts/reset-db.sh` を実行します。

## ブランチDB用テンプレートの更新

ブランチDB作成時のテンプレートを更新したい場合は、`DB_TEMPLATE_NAME` を指定して以下を実行します。

```bash
bun run db:template:update
```

`db:template:update` は、`DATABASE_URL` のDBを丸ごと `DB_TEMPLATE_NAME` のDBへ複製します（スキーマ・データ含む）。

注意:
- `DB_TEMPLATE_NAME` は `DATABASE_URL` のDB名と別名にしてください（同名だとエラーになります）
- 実行時にコピー元DB/コピー先DBの接続は強制切断されます
