# PostgreSQL から Turso への移行

`DATABASE_URL` の PostgreSQL を読み取り、root slug `tipitaka` から到達する
`status = ARCHIVE` かつ `source_locale = pi` の PAGE ツリーを Turso へ移行する。
書き込み先は `TURSO_DATABASE_URL` と
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

移行対象は全ユーザー（`handle`、プロフィール、ポイント、AI判定、画像、プラン、
provider、SNS、メール確認状態、作成・更新日時を含む）と、Better Authの `accounts`、
`sessions`、`verifications`、およびユーザーの `gemini_api_keys` である。認証のtoken・
OAuth列とGemini API keyは復号・再暗号化せず、旧DBの暗号文をparameterized statementで
そのまま移す。これらの値はログ・件数レポートへ出力しない。実行前に
`information_schema.columns` を照合し、旧schemaで確認できないGeminiのtimestamp列は
要求しない。

記事側は上記の ARCHIVE + pi PAGE、`PRIMARY`/`COMMENTARY` segment、その翻訳、対応する
投票、PAGE間の annotation link、および対象 scripture に属する翻訳 job である。
旧DBではこのTipitaka木が ARCHIVE でも、移行先には `published_at` を元の値のまま保存
する。元の `published_at` が非nullなら移行先で閲覧可能になり、nullの場合に現在時刻を
補完することはない。PUBLIC の一般記事、PAGE_COMMENT と、その由来の翻訳・投票・link
は含めない。

## 旧schema全テーブルの扱い

移行対象は `origin/main` のschemaを棚卸ししたうえで、次の契約に固定する。

| 旧テーブル | 扱い | 選択条件・備考 |
| --- | --- | --- |
| `users`、`accounts`、`sessions`、`verifications`、`gemini_api_keys` | 全件保持 | Better Auth列・セッションtoken・Gemini暗号文は無変換で保持。custom magic-link表はないため移行しない |
| `personal_access_tokens`、`notifications`、`user_settings` | 全件保持 | PAT hash、通知の既存参照ID、設定配列を保持。通知の旧記事/コメント参照列は履歴値として保存し、除外対象へのFKは作らない |
| `segment_types`、`segment_metadata_types`、`tags`、`translation_contexts` | 全件保持 | ユーザーFKは検証する |
| `import_runs`、`import_files` | 条件付き | 選択した ARCHIVE + pi Tipitaka PAGEの `contents.import_file_id` から到達できるファイルと、そのrunだけ保持。未到達行は除外件数へ計上 |
| `pages`、`segments`、`segment_translations`、`translation_jobs`、`translation_votes`、`segment_annotation_links` | 条件付き | 指定rootから到達する ARCHIVE + pi `PAGE` のみ。segmentは `PRIMARY`/`COMMENTARY`、従属行は移行済みIDに限定 |
| `page_locale_translation_proofs`、`like_pages`、`page_views`、`tag_pages` | 条件付き | 選択されたPAGEだけ。タグ本体は全件保持 |
| `segment_metadata` | 条件付き | 選択されたsegmentと既存metadata typeの両方に結び付く行だけ |
| `contents` | 直接移行しない | PAGEの階層・識別子は`scriptures`へ変換し、一般記事を含む未選択contentは除外 |
| `page_comments`、PAGE_COMMENT由来の行 | 除外 | 記事コメントと、そのsegment/translation/vote/linkは移行しない |
| `follows` | 除外 | 新target契約に含めないことを明示決定済み |

一般記事（PAGEでない記事）、PUBLIC一般記事、ARCHIVE + pi でないページ、および root外の
枝はTipitaka木に含めない。import
系はPAGEからの外部キー到達を確認できないものを勝手に全件移さず、READMEの契約どおり
除外する。`users.total_points` は再計算せず旧値をそのまま保持する。

旧 job の `COMPLETED` 以外の状態は `FAILED` に正規化し、空のエラーには再実行を
促す固定文を設定する。旧 schema では翻訳と job の直接参照がないため、AI翻訳の
`ai_job_id` は scripture と locale の job が一意に対応するときだけ設定する。
