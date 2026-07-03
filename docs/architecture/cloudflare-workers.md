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
- **画像表示**: `next/image` は既に独自の Cloudflare Images loader
  (`src/app/_service/cloudflare-loader.ts`) を使用。
- **画像アップロード** (`upload-image.ts`): sharp(ネイティブバイナリのため
  workerd 非対応)を
  [Cloudflare Images binding](https://developers.cloudflare.com/images/transform-images/bindings/)
  (`IMAGES`) に置き換え済み。binding が無い環境では元画像をそのままアップロードする。
  保存先は従来どおり R2 (S3 API 経由)。
- **メンテナンスフラグ** (`middleware.ts`): Vercel Edge Config を Workers KV に置き換え済み。
  使うには `wrangler kv namespace create MAINTENANCE_KV` で作成し、
  `wrangler.jsonc` の `kv_namespaces` のコメントを外して id を設定する。
  ON/OFF は `wrangler kv key put --binding=MAINTENANCE_KV maintenance true`(削除で解除)。
  binding が無い環境では常に OFF。
- **Vertex AI 認証** (`google-auth.ts`): Vercel OIDC をサービスアカウントキーに置き換え済み。
  `wrangler secret put GCP_SERVICE_ACCOUNT_KEY` でキーの JSON を登録する。
  未設定なら ADC(ローカル開発)にフォールバックする。
- **Sentry**: `@sentry/nextjs` は OpenNext + Workers をそのままサポートしている
  (`nodejs_compat` + `compatibility_date >= 2025-08-16` が条件。設定済み)。
  <https://docs.sentry.io/platforms/javascript/guides/cloudflare/frameworks/nextjs/>
- `runtime = "edge"` の指定は使用していない (OpenNext は edge runtime 非対応)。
