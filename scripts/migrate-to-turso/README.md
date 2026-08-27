# PostgreSQL から Turso への移行

`DATABASE_URL` の PostgreSQL を読み取り、公開状態の `tipitaka` PAGE ツリーを
Turso へ移行する。書き込み先は `TURSO_DATABASE_URL` と
`TURSO_AUTH_TOKEN` で指定する。値はコマンドライン引数へ渡さず、環境変数または
秘密管理機能から供給する。

```sh
bun run scripts/migrate-to-turso/cli.ts --dry-run
bun run scripts/migrate-to-turso/cli.ts --batch-size 100
```

`--dry-run` は PostgreSQL の読み取り、計画生成、除外件数の報告だけを行い、Turso
へ接続しない。本実行は外部キー順に parameterized upsert を分割実行した後、移行
対象のキーだけを再カウントして報告件数と照合する。同じ計画を再実行しても既存
主キーまたは複合キーを更新するため、重複行を作らない。

移行対象は公開 PAGE、`PRIMARY`/`COMMENTARY` segment、その翻訳、翻訳作者・投票者・
scripture所有者として必要な最小ユーザー、対応する投票、PAGE間の annotation link、
および対象 scripture に属する翻訳 job である。PAGE_COMMENT と、その由来の翻訳・
投票・link は含めない。認証アカウント秘密値、session、token、OAuth列は取得しない。

旧 job の `COMPLETED` 以外の状態は `FAILED` に正規化し、空のエラーには再実行を
促す固定文を設定する。旧 schema では翻訳と job の直接参照がないため、AI翻訳の
`ai_job_id` は scripture と locale の job が一意に対応するときだけ設定する。
