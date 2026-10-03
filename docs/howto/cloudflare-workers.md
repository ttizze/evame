# Cloudflare Workers の運用

全コマンドは `nix develop` 内で実行する。TanStack Start の Workers エントリーは `src/server.ts`。`bun run build` が Static Assets と Worker を `dist` に生成し、Wrangler は生成された設定をデプロイする。

## 接続先

`wrangler.jsonc` の Worker 名は `evame-start`。既存の `evame` Worker は上書きしない。

| binding | 接続先 | 用途 |
| --- | --- | --- |
| `ASSETS` | `dist/client` | JS・CSS・フォント・ロゴ |
| `UPLOADS` | R2 `eveeve` | 既存の画像ストレージ |
| `IMAGES` | Cloudflare Images | 幅 2560 以下、JPEG quality 80 へ圧縮 |
| `SETTINGS` | KV `evame-settings` | `maintenance` を JSON boolean で保存 |
| `CF_VERSION_METADATA` | デプロイされた Worker の version | Sentry の release |

開発時の binding はローカルストレージを使う。画像は開発専用の `/api/uploads/$` で表示する。本番は従来の `https://images.evame.tech/` を使う。

## 環境変数と秘密値

開発は `.env.example` を `.env` にコピーする。`bun run dev` はブランチ用の `DATABASE_URL` を Workers に渡すためプロセス環境変数を読み込む。`.dev.vars` を併用しない。`.env` と `.dev.vars` は Git に追加しない。

本番は Workers secrets に次を設定する。値を `wrangler.jsonc`、ビルド成果物、ログ、PR に含めない。

- 認証・DB: `DATABASE_URL`、`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、`AUTH_RESEND_KEY`、`EMAIL_FROM`、`ENCRYPTION_KEY`
- 翻訳: `QSTASH_TOKEN`、`QSTASH_CURRENT_SIGNING_KEY`、`QSTASH_NEXT_SIGNING_KEY`、`QSTASH_PUBLISH_BASE_URL`、`GCP_PROJECT_ID`、`GCP_REGION`、`GCP_SERVICE_ACCOUNT_CREDENTIALS`。利用する場合は `OPENAI_API_KEY`、`DEEPSEEK_API_KEY` も設定する
- 表示・監視: `CF_IMAGE_HOST`、`GOOGLE_ANALYTICS_ID`、`SENTRY_ENVIRONMENT`

`GCP_SERVICE_ACCOUNT_CREDENTIALS` は Vertex AI を実行できるサービスアカウントの JSON。Vercel の OIDC 設定は Workers で使えない。既存のモデル・プロンプト・安全設定は維持する。別用途のサービスアカウントを流用しない。

`BETTER_AUTH_SECRET`、`ENCRYPTION_KEY`、DB、画像ホストを維持すれば既存データとログイン状態を引き継げる。本番の `BETTER_AUTH_URL` と QStash の公開先は `https://evame.tech`。プレビューでログインする場合はその URL に合わせ、Google の許可済み callback も一致させる。

秘密値の一括登録は値を含む JSON ファイルを Git 外に置き、権限を `600` にして実行する。Sentry のアップロード用 `SENTRY_AUTH_TOKEN` はビルド環境だけに設定し、Worker に渡さない。

```bash
bun x wrangler secret bulk /absolute/path/to/worker-secrets.json
bun run build
bun run test:deployment
bun x wrangler deploy
```

## 本番への切り替え

1. Biome・typecheck・全テスト・Workers 上の成果物テストを通す。
2. `evame-start` の workers.dev プレビューにデプロイし、DB、ログイン、記事保存、画像、翻訳、通知、OG、サイトマップを確認する。
3. 全機能の認証と接続先が揃ってから `evame.tech` のルートを Worker に切り替える。既存の Cloudflare キャッシュ Worker とルートを先に確認する。
4. 切り替え後も Google ログイン、Tiptap 保存、画像、翻訳を確認する。Sentry の正常な認証リダイレクトや本文の中断がエラーにならないことを確認する。

既存の Vercel デプロイは切り替え検証まで維持する。問題があれば Cloudflare のルートを元に戻し、既存の Vercel オリジンへ戻せる状態にしておく。継続デプロイの環境では Nix と Bun の lockfile を使い、`bun run deploy` を実行する。

## GitHub Actions の継続デプロイ

`.github/workflows/ci.yaml` は `main` の push または `main` を対象にした手動実行で、Biome・typecheck・全テスト・ビルド・成果物テストの成功後に同じ成果物をデプロイする。並行デプロイは行わない。PR は検証だけを実行し、Sentry 送信を無効化する。

リポジトリの Actions secrets に `CLOUDFLARE_API_TOKEN` と `SENTRY_AUTH_TOKEN` を設定する。Cloudflare のデプロイ先アカウントと Worker は `wrangler.jsonc` に定義する。既存のキャッシュ削除用トークンは Workers を更新できないため、デプロイ用には `evame-start` の更新・デプロイに必要な権限を持つトークンを使う。Sentry のアップロード用トークンは本番ビルドのステップだけに渡し、Worker secret には登録しない。

本番のルートを追加した際は `wrangler.jsonc` にも反映し、以降のデプロイで維持する。本番切り替え時は Worker の `SENTRY_DSN` と `SENTRY_ENVIRONMENT` を本番用に設定する。
