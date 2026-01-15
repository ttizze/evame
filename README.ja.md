# Evame

[English README](README.md)

Evame は、ユーザー投稿テキストに翻訳・注釈・解説を付けて共有するためのプロジェクトです。

## 最短で動かす（開発）

1. 依存関係をインストール
   ```bash
   bun install
   ```
2. 環境変数を用意
   ```bash
   cp .env.example .env
   openssl rand -base64 32
   ```
   生成した文字列を `.env` に設定してください。
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

- 入口: `docs/README.md`
- 要件: `docs/requirements.md`
- 全体像: `docs/architecture.md`
- ルート配置ルール: `docs/architecture/conventions/route-colocation.md`
- ADR: `docs/adr/README.md`
- HowTo: `docs/howto/README.md`
- AI 向け前提: `AI_CONTEXT.md`
- AI 運用ルール: `AGENTS.md`

## このリポジトリの構成（要約）

- `src/app`: Next.js App Router
- `src/db`: DB 接続・型・シード
- `src/drizzle`: スキーマとマイグレーション
- `src/components`: 共有 UI

詳細は `docs/architecture.md` を参照してください。
