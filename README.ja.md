# Evame

[English README](README.md)

Evame は、ユーザー投稿テキストに翻訳・注釈・解説を付けて共有するためのプロジェクトです。

## 最短で動かす（開発）
以降のプロジェクトツールチェーンコマンドは、すべて `nix develop` 内で実行してください。
対応環境は Apple silicon macOS と aarch64/x86_64 Linux です。Intel Mac は、固定している nixpkgs が `x86_64-darwin` のサポートを終了したため非対応です。

```bash
nix develop
```

1. 依存関係をインストール
   ```bash
   bun install
   ```
2. 環境変数を用意
   ```bash
   cp .env.example .env
   openssl rand -base64 32
   openssl rand -hex 32
   ```
   base64 の値を `BETTER_AUTH_SECRET`、hex の値を `ENCRYPTION_KEY` に設定してください。認証に使う Google・Resend も設定します。メンテナンスは `wrangler.jsonc` の `SETTINGS` KV binding の `maintenance`（JSON boolean）で切り替えます。
   公開サイトURLは `VITE_PUBLIC_DOMAIN`、画像ホストはサーバー側の `CF_IMAGE_HOST`、CLI の接続先は `EVAME_BASE_URL` を使います。
3. DB を起動
   ```bash
   docker compose up -d
   ```
4. マイグレーションとシード
   ```bash
   bun run db:migrate
   bun run seed
   ```
5. 開発サーバー起動
   ```bash
   bun run dev
   ```
6. `http://localhost:3000` を開く

## 主要リンク

- ドキュメント入口: `docs/README.md`
- Cloudflare の運用手順: `docs/howto/cloudflare-workers.md`
- AI 向け前提: `AI_CONTEXT.md`
- AI 運用ルール: `AGENTS.md`

## このリポジトリの構成（要約）

- `src/routes`: TanStack Start のルート
- `src/app`: ルートから使う機能実装
- `src/db`: DB 接続・型・シード
- `src/drizzle`: スキーマとマイグレーション
- `src/components`: 共有 UI

詳細は `docs/architecture/architecture.md` を参照してください。
