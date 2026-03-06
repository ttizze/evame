# Cloudflare Full Migration Design

## Goal

Evame を Vercel 前提の Next.js 運用から切り離し、OpenNext 経由で Cloudflare Workers 上で本番運用できる状態に移行する。
今回の完了条件は、Cloudflare 上へ実デプロイし、公開 URL で主要機能が動作していることを確認すること。

## Current State

- Next.js 16 App Router
- 現行デプロイ前提は Vercel
- `@vercel/edge-config` によるメンテナンス切替
- `@vercel/functions/oidc` による GCP 認証
- `@aws-sdk/client-s3` で R2 へアップロード
- `cacheComponents: true` を有効化
- `better-auth` を利用
- `next/og` で `public/` から `fs` 読み込みあり

## Migration Principles

- Vercel 固有依存は残さない
- Cloudflare ネイティブな binding / secret / storage に寄せる
- まず build 成功ではなく、Workers runtime で 500 を出さないことを優先する
- 変更は TDD で進める
- 1 回で全置換しつつも、変更単位は小さく保つ

## Target Architecture

### Deployment

- `@opennextjs/cloudflare` を導入する
- `wrangler.jsonc` と `open-next.config.ts` を追加する
- `preview` と `deploy` は OpenNext + Wrangler 経由へ統一する

### Runtime Bindings

- メンテナンスフラグは Cloudflare KV へ移す
- 画像アップロードは R2 binding を優先し、Workers runtime で AWS SDK 依存を避ける
- 増分キャッシュは OpenNext の Cloudflare 向け cache を使う
- 必要な env/secret は `.dev.vars` と `wrangler secret` へ分離する

### Auth / External Services

- GCP 認証は Vercel OIDC をやめ、サービスアカウント JSON かそれに準ずる secret へ置換する
- Sentry は Next.js SDK を維持しつつ、Workers runtime で問題ない構成へ調整する

### Rendering / App Behavior

- `proxy.ts` ではなく `middleware.ts` を使う
- `better-auth + cacheComponents` に起因する PPR 実行時エラーを解消する
- `next/og` の `fs` 読み込みは Workers で壊れない実装へ変更する

## Main Risks

### 1. `better-auth` と PPR の衝突

Workers runtime では静的シェル生成中の `crypto` 利用が厳密に検査されるため、`better-auth` が内部で乱数生成を行う経路を遅延評価に寄せる必要がある。

### 2. `nodejs_compat` 下でも不安定な Node 依存

`pg`、`sharp`、`fs` などの依存は build または runtime で問題化しやすい。Workers 専用 entrypoint があるものは `serverExternalPackages` を見直す。

### 3. 本番環境変数の移行漏れ

Vercel に存在する env を Cloudflare の plain env / secret / binding に正しく振り分ける必要がある。

## Execution Order

1. OpenNext / Wrangler の最小構成を追加する
2. `middleware` 化と Vercel 依存の置換ポイントを作る
3. `better-auth` と runtime blocker を TDD で潰す
4. R2 / KV / secret 参照を Cloudflare 前提へ寄せる
5. `.dev.vars` と `wrangler.jsonc` を整備する
6. ローカル preview で主要ページ確認
7. Cloudflare へ deploy して公開 URL を確認

## Verification

- 変更ごとのユニットテスト
- 影響範囲の integration テスト
- `bun run biome`
- `bun run typecheck`
- `bun run test -- --run` または対象テスト
- `bun run preview` でローカル確認
- `bun run deploy` 後に公開 URL で HTTP 応答と主要ページ確認
