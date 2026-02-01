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
