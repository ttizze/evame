# Turso Database のマイグレーションと初期化

デジタル仏教のデータベースは Turso Database です。PostgreSQL のブランチ DB、テンプレート DB、Docker コンテナは使用しません。

## マイグレーション

`.env` の `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` に、Turso Database の開発専用データベースを設定してから実行します。

```bash
nix develop
just install
just migrate
```

`just migrate` はリポジトリ内の未適用マイグレーションを順番に適用します。CI や本番のデータベースをローカル開発の接続先に設定しないでください。

## 開発データを作り直す場合

通常は破壊的なリセットを行わず、追加のマイグレーションと決定的な fixture で必要な状態を作ります。開発 DB を空に戻す必要がある場合は、Turso Database の管理画面または CLI で、対象を開発専用 DB と確認してから DB を再作成します。その後、次を実行します。

```bash
just migrate
```

本番 DB の削除・再作成・全消去はこの手順の対象外です。実行前に対象 URL を確認し、必要なデータをバックアップしてください。
