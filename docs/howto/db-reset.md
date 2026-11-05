# ローカルDBの初期化

すべてのコマンドを `nix develop` 内で実行する。開発用DBはワークツリー内の `evame.db`。Workersは `http://127.0.0.1:8081` のTurso開発サーバーへ接続する。

1. `bun run dev` と `bun run db:dev` を停止する。
2. 必要なデータを保持する場合は、`evame.db` と存在する `evame.db-wal` / `evame.db-shm` を同じバックアップ先へ移動する。
3. `bun run db:dev` を起動する。空のDBが作成される。
4. 別のNixシェルで `bun run db:migrate`、`bun run seed`、`bun run dev` を実行する。

本番TursoのURLやトークンを `.env` に設定して初期化しない。テストは `.data/tests` にファイルごとの独立したDBを作成し、本番の接続設定を使用しない。
