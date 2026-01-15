# DB リセット

開発中のデータを初期化したい場合の手順です。

```bash
bun run db:reset
bun run db:migrate
bun run seed
```

`db:reset` は `scripts/reset-db.sh` を実行します。
