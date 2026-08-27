# デジタル仏教

[English README](README.md)

デジタル仏教は、仏典を読み、翻訳を世界中の読者とともに改善する多言語サービスです。公開された仏典と翻訳は誰でも閲覧できます。認証済みユーザーは翻訳案を投稿し、翻訳案に投票できます。AI 翻訳ジョブも翻訳案を提案し、コミュニティで確認できます。

トップページは仏典翻訳の一覧です。記事・ページの投稿、独立したコメント・返信、フォロー、いいね、通知は現在の対象外です。

## 最短で動かす

対応する開発環境は Nix flake です。Bun、Node.js、`just` が提供されます。Wrangler などのプロジェクト CLI は、ロック済みの依存関係から `bunx` 経由で実行します。

```bash
nix develop
cp .env.example .env
```

`.env` の Turso Database と認証関連の値を設定してください。翻訳ジョブを実行する場合は AI プロバイダーの値も設定します。

```bash
just install
just migrate
just dev
```

`http://localhost:5173` を開きます。Turso Database には開発専用データベースを用意してください。`just migrate` は `TURSO_DATABASE_URL` で指定したデータベースに、リポジトリ内のマイグレーションを適用します。

PostgreSQL サーバーや Docker サービスは必要ありません。

## 検証とデプロイ

```bash
just biome
just typecheck
just test
just build
just deploy
```

デプロイ先の Cloudflare アカウントに、Worker のシークレットと変数をあらかじめ設定してください。詳細は [`docs/howto/cloudflare-workers.md`](docs/howto/cloudflare-workers.md) を参照してください。

## アーキテクチャ

- UI とルーティング: TanStack Start / TanStack Router
- 実行環境とデプロイ: Cloudflare Workers
- データベース: Turso Database、`@tursodatabase/serverless` で接続
- パッケージ管理: Bun

ドキュメントの入口は [`docs/README.md`](docs/README.md) です。アーキテクチャと実行環境の境界は [`docs/architecture/architecture.md`](docs/architecture/architecture.md) にまとめています。

## リポジトリの構成

```text
src/
├── routes/       # TanStack Router のファイルベースルート
├── components/   # 共有 UI
├── db/           # Turso Database クライアント、クエリ、更新、マイグレーション
├── domain/       # 仏典・翻訳・投票・ジョブの業務ルール
└── styles/       # アプリケーションのスタイル
docs/             # 要件、アーキテクチャ、運用手順
```
