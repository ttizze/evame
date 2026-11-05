# PostgreSQLからTursoへの移行

DBのみ移行し、記事・コメント・翻訳・通知・階層・認証・CLI同期を維持する。TursoのlibSQLとHTTP接続を使用する。並列書き込みのプレビュー機能には依存しない。

## 実装と開発

- `src/drizzle/schema.ts` と初期マイグレーションがSQLiteのスキーマ。PostgreSQLの旧マイグレーションはGit履歴に残る。
- `src/db/index.ts` はリクエストごとにKysely接続を所有し、レスポンス完了後に破棄する。
- `src/db/turso-value-codec.ts` は日時をUTCのepochミリ秒、真偽値を0/1、JSON・配列をJSON文字列として保存し、取得時に既存のアプリ型へ戻す。認証日時のISO文字列も同じ値へ変換する。
- `src/db/search-values-plugin.ts` は記事本文・タグ名・ユーザー名のUnicode小文字を保存する。SQLite標準LIKEの非ASCII文字の制限を補い、検索の大小文字無視を維持する。
- `src/db/transaction.ts` はSQLiteの書き込み競合時に限り、DB操作全体を上限付きで再試行する。メール・翻訳API・キュー投入をコールバックへ含めない。
- 翻訳の選択は所有者の賛成票・得点・作成日時の順位を維持し、SQLiteのウィンドウ関数で各段落の1件を選ぶ。

開発は `bun run db:dev` を起動し、別のNixシェルで `bun run db:migrate`、`bun run seed`、`bun run dev` を実行する。各ワークツリーのDBファイルは独立する。

HTTPサーバーは `nix/libsql-server.nix` で公式バイナリとSHA-256を固定する。開発・テストともlocalhostにだけ待ち受ける。

ローカルファイル用SDKには[競合後のコミットでロックを残す既知の問題](https://github.com/tursodatabase/libsql-client-ts/issues/361)があるため、並行保存テストとWorkers成果物テストは本番と同じTurso HTTPプロトコルを使用する。通常のユニットテストは独立したローカルファイルを使用する。

## 試験移行

`nix develop` 内で、保護された環境変数として `POSTGRES_SOURCE_URL` にNeonの接続文字列を設定する。コマンド引数・ログへ接続文字列を書かない。

```bash
bun scripts/migrate-postgres-to-turso.ts .data/turso-export.db
```

コピー先は新規のローカル `.db` のみ。既存データがある場合は中断する。コピー元には `REPEATABLE READ READ ONLY` を使用する。ユーザーデータと認証データを含むため、ファイルとログは非公開で管理する。

テーブルごとの全行を主キー順に読み、Tursoの保存形式へ変換してコピーする。コピー後は全行のハッシュと件数、外部キー、`integrity_check` を照合する。IDと認証トークン、日時、JSONの値を保持する。

## 本番切り替え

コピー先は公式の[SQLiteファイル要件](https://docs.turso.tech/api-reference/databases/upload)（WAL・4096バイトページ・auto_vacuum無効・UTF-8）を確認し、WALをチェックポイントしてからアップロードする。移行スクリプトがこの準備を行う。

1. 試験移行したDBでログイン・記事作成/編集・本文SSR・翻訳・コメント・検索を検証する。
2. 書き込みを停止し、QStashの実行中ジョブも完了させてから、本番切り替え用スナップショットを新しいファイルへ再取得する。試験移行後の更新を取りこぼさない。
3. 新規Turso DBへ検証済みSQLiteファイルをインポートする。既存Turso DBを上書きしない。
4. Workers secretsとGitHub Actions secretsの両方へ `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` を設定する。トークンをソース・出力へ含めない。
5. この変更をデプロイし、既存記事の閲覧URL、ログイン、非公開記事の作成・編集、公開本文SSRを確認してから書き込みを再開する。
6. 切り替え確認までNeonを保持する。Tursoへ新規書き込みが発生した後は、古いNeonへ接続だけ戻さない。書き込み差分を移すか、Turso上で修正を前進デプロイする。

DB用のPostgreSQL依存は移行ツールの開発依存としてだけ残る。WorkersはNeonやPostgreSQLへ接続しない。
