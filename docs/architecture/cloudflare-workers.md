# Cloudflare Workers デプロイ (OpenNext)

Next.js 16.2 で stable になった Adapter API を実装した公式アダプタ
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) を使って、
このアプリを Cloudflare Workers (Node.js 互換ランタイム) で動かすための構成。

## 構成ファイル

| ファイル | 役割 |
| --- | --- |
| `wrangler.jsonc` | Worker 本体・バインディング定義 |
| `open-next.config.ts` | OpenNext のキャッシュ戦略 |
| `.dev.vars.example` | `wrangler dev` / `preview` 用の環境変数の雛形 |
| `public/_headers` | 静的アセットの Cache-Control |

## コマンド

```bash
bun run preview   # ローカルの workerd 上でビルドして動作確認
bun run deploy    # ビルドして Cloudflare にデプロイ
bun run upload    # 新バージョンをアップロードのみ (gradual deployment 用)
bun run cf-typegen # バインディングの型 (cloudflare-env.d.ts) を生成
```

`next dev` は今まで通り動く。`next.config.ts` の `initOpenNextCloudflareForDev()`
により、dev 中でも `getCloudflareContext()` でバインディングにアクセスできる。

## 初回デプロイ前に必要な作業

1. R2 バケット作成: `bunx wrangler r2 bucket create evame-next-inc-cache`
   (ISR / `"use cache"` のキャッシュ本体。バインディング名 `NEXT_INC_CACHE_R2_BUCKET`)
2. シークレット登録: `bunx wrangler secret put DATABASE_URL` など、
   Vercel の環境変数に相当するものを登録する
   (ビルド時に必要な変数は Workers Builds の環境変数 or CI 側で設定)
3. Durable Objects (`DOQueueHandler` / `DOShardedTagCache`) は
   初回デプロイ時に `migrations` で自動作成される

## キャッシュ戦略

`cacheComponents: true`(`"use cache"` / `revalidateTag`)を使っているため、
フル構成にしてある:

- **incrementalCache**: R2 (`r2IncrementalCache`)
- **queue**: Durable Object (`doQueue`) — ISR の再検証
- **tagCache**: Sharded Durable Object (`doShardedTagCache`) — `revalidateTag`
- `enableCacheInterception` は PPR (cacheComponents) と併用不可のため無効

トラフィックが増えて R2 読み込みがボトルネックになったら
`withRegionalCache` + cache purge の導入を検討する
(<https://opennext.js.org/cloudflare/caching> 参照)。

## ランタイム互換性メモ

- **DB**: 本番は `@neondatabase/serverless`(fetch/WebSocket ベース)なので
  Workers でそのまま動く。`pg` はローカル (`db.localtest.me`) のみ。
- **画像**: `next/image` は既に独自の Cloudflare Images loader
  (`src/app/_service/cloudflare-loader.ts`) を使用。アップロードも R2 直行。
- **proxy.ts**: `@vercel/edge-config` によるメンテナンスフラグは
  `EDGE_CONFIG` がある環境(= Vercel)のみ動作し、Workers ではスキップされる。
  Workers でも使いたければ KV に置き換える。
- **sharp** (`upload-image.ts`): ネイティブバイナリのため workerd では動かない。
  Workers 移行時はアップロード画像のリサイズを
  [Cloudflare Images binding](https://developers.cloudflare.com/images/transform-images/bindings/)
  へ置き換える必要がある。
- **Vertex AI 認証** (`google-auth.ts`): `getVercelOidcToken()` は Vercel 専用。
  Workers では GCP のサービスアカウントキー等に置き換える。
- **Sentry**: `withSentryConfig`(ビルド時の sourcemap upload)はそのまま動くが、
  サーバーサイドの実行時計測は Workers では
  [`@sentry/cloudflare` + OpenNext 向け設定](https://docs.sentry.io/platforms/javascript/guides/cloudflare/frameworks/nextjs/)
  への移行が必要。
- `runtime = "edge"` の指定は使用していない (OpenNext は edge runtime 非対応)。
