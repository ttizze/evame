# Cloudflare Workers の運用

全コマンドは `nix develop` 内で実行する。TanStack Start の入口は `src/server.ts`、Astro Readerの入口は `reader/src/worker.ts`。`bun run build` がそれぞれのWorkerとStatic Assetsを `dist` と `reader/dist` に生成し、Wranglerは生成された設定をデプロイする。

## 接続先

`wrangler.jsonc` のWorker名は `evame-start`、`reader/wrangler.jsonc` は `evame-reader`。既存の `evame` Workerは上書きしない。Readerはworkers.devとバージョンURLを公開せず、service binding経由で接続する。

| binding | 接続先 | 用途 |
| --- | --- | --- |
| `ASSETS` | `dist/client` | JS・CSS・フォント・ロゴ |
| `UPLOADS` | R2 `eveeve` | 既存の画像ストレージ |
| `IMAGES` | Cloudflare Images | 幅 2560 以下、JPEG quality 80 へ圧縮 |
| `SETTINGS` | KV `evame-settings` | `maintenance` を JSON boolean で保存 |
| `CF_VERSION_METADATA` | デプロイされた Worker の version | Sentry の release |
| `READER` | `evame-reader` | 公開HTMLの配信とキャッシュ無効化 |

Readerは `BACKEND` bindingから `evame-start` の公開データAPIを呼び、専用の `ASSETS` bindingで生成アセットを配信する。DB・認証の秘密値は `evame-start` だけに設定する。

開発時の binding はローカルストレージを使う。画像は開発専用の `/api/uploads/$` で表示する。本番は従来の `https://images.evame.tech/` を使う。

## 環境変数と秘密値

開発は `.env.example` を `.env` にコピーする。`bun run db:dev` でローカルTursoを起動し、別のNixシェルでマイグレーションとseedを実行する。`bun run dev` は `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` を Workers に渡すためプロセス環境変数を読み込む。`.dev.vars` を併用しない。`.env` と `.dev.vars` は Git に追加しない。

本番は Workers secrets に次を設定する。値を `wrangler.jsonc`、ビルド成果物、ログ、PR に含めない。

- 認証・DB: `TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`、`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、`AUTH_RESEND_KEY`、`EMAIL_FROM`、`ENCRYPTION_KEY`
- 翻訳: `QSTASH_TOKEN`、`QSTASH_CURRENT_SIGNING_KEY`、`QSTASH_NEXT_SIGNING_KEY`、`QSTASH_PUBLISH_BASE_URL`、`GCP_PROJECT_ID`、`GCP_REGION`、`GCP_SERVICE_ACCOUNT_CREDENTIALS`。利用する場合は `OPENAI_API_KEY`、`DEEPSEEK_API_KEY` も設定する
- 表示・監視: `CF_IMAGE_HOST`、`GOOGLE_ANALYTICS_ID`、`SENTRY_ENVIRONMENT`

`GCP_SERVICE_ACCOUNT_CREDENTIALS` は Vertex AI を実行できるサービスアカウントの JSON。Vercel の OIDC 設定は Workers で使えない。既存のモデル・プロンプト・安全設定は維持する。別用途のサービスアカウントを流用しない。

`BETTER_AUTH_SECRET`、`ENCRYPTION_KEY`、DB、画像ホストを維持すれば既存データとログイン状態を引き継げる。本番の `BETTER_AUTH_URL` と QStash の公開先は `https://evame.tech`。プレビューでログインする場合はその URL に合わせ、Google の許可済み callback も一致させる。

秘密値の一括登録は値を含む JSON ファイルを Git 外に置き、権限を `600` にして実行する。Sentry のアップロード用 `SENTRY_AUTH_TOKEN` はビルド環境だけに設定し、Worker に渡さない。

```bash
bun x wrangler secret bulk /absolute/path/to/worker-secrets.json
bun run build
bun run test:deployment
bun x wrangler deploy --config reader/dist/server/wrangler.json
bun x wrangler deploy --config dist/server/wrangler.json
```

## 本番への切り替え

1. Biome・typecheck・全テスト・Workers 上の成果物テストを通す。
2. `evame-start` の workers.dev プレビューにデプロイし、DB、ログイン、記事保存、画像、翻訳、通知、OG、サイトマップを確認する。
3. 全機能の認証と接続先が揃ってから `evame.tech` のルートを Worker に切り替える。既存の Cloudflare キャッシュ Worker とルートを先に確認する。
4. 切り替え後も Google ログイン、Tiptap 保存、画像、翻訳を確認する。Sentry の正常な認証リダイレクトや本文の中断がエラーにならないことを確認する。

切り替え検証後、旧Vercelプロジェクト `ttizzes-projects/evame` は廃止済み。`evame.tech` のDNSは、CloudflareでプロキシされたAレコードを予約アドレス `192.0.2.0` に向け、`evame.tech/*` を `evame-start` に接続する。Vercelをオリジンや切り戻し先として使わない。継続デプロイの環境では Nix と Bun の lockfile を使い、`bun run deploy` を実行する。

## GitHub Actions の継続デプロイ

`.github/workflows/ci.yaml` は `main` のpushまたは `main` を対象にした手動実行で、Biome・typecheck・全テストの成功後、本番DBのマイグレーション、ビルド、成果物テスト、ReaderとGatewayのデプロイを順に行う。マイグレーションに失敗した場合はデプロイしない。並行デプロイは行わない。PRはローカルのテストDBで検証し、Sentry送信を無効化する。

リポジトリのActions secretsに本番用の `TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`、`CLOUDFLARE_API_TOKEN`、`SENTRY_AUTH_TOKEN` を設定する。本番用のDB接続設定は `main` のマイグレーションだけに渡す。Cloudflareのデプロイ先はそれぞれの `wrangler.jsonc` に定義する。デプロイ用のアカウントトークン `evame-github-deploy` は、Specified Workersで `evame-start` と `evame-reader` の両方にIndividual Workers Editor権限を設定する。片方だけでは新しいWorkerへのアクセスが拒否される。既存のキャッシュ削除用トークンはデプロイには使わない。Sentryのアップロード用トークンは本番ビルドだけに渡し、Worker secretには登録しない。

本番の `evame.tech/*` ルートは Cloudflare のゾーン側で `evame-start` に接続する。`wrangler.jsonc` に `routes` を指定せず、CIは既存Workerのバージョンだけを更新する。Wranglerはルートが未指定なら既存の接続を変更しないため、CIトークンにゾーンのルート更新権限を追加する必要はない。`images.evame.tech` はこのルートの対象に含めない。

テーブル・カラムを廃止するときは、先に旧コードと共存できるDB変更と参照を外したコードをデプロイする。その本番反映を確認してから、次のマイグレーションでDB構造を削除する。CIはマイグレーションを先に実行するため、参照を外すコードとテーブル削除を同じデプロイにまとめない。

本番切り替え時は Worker の `BETTER_AUTH_URL` を `https://evame.tech`、`SENTRY_DSN` と `SENTRY_ENVIRONMENT` を本番用に設定する。Workerのロールバックは、戻すバージョンが現在のDB構造と互換な場合にだけ行う。DBマイグレーションはWorkerのロールバックでは戻らないため、テーブル削除などの非互換な変更後は、現在のDB構造に合わせた修正を前進デプロイする。NeonはTursoへの本番切り替えと整合性確認が完了するまで保持する。Upstash QStashのリソースと請求元のMarketplace連携は維持する。

DB切り替えの手順は [Turso移行](turso-migration.md) を参照する。
