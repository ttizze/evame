# Cloudflare Workers の運用

全コマンドは `nix develop` 内で実行する。TanStack Start の入口は `src/server.ts`、Astro Readerの入口は `reader/src/worker.ts`。`bun run build` がそれぞれのWorkerとStatic Assetsを `dist` と `reader/dist` に生成し、Wranglerは生成された設定をデプロイする。

## CIのテスト実行

ユニットテストはNodeとDOMの2プロジェクトに分ける。既定はNodeで、JSXを持つテストとDOMを使うエディター・認証クライアントのテストだけjsdomを起動する。全ファイルの実行とファイル間の隔離は維持する。iPhoneモデルの公式例・操作fixtureは、同じJavaScriptのコンパイル結果だけを再利用し、実行コンテキストは各例で新しく作る。

通常のWebだけの変更ではiPhoneワークフローを起動しない。ルートの `package.json`・`bun.lock` だけがiPhoneの対象にかかる場合は、Linuxで同梱モデルとライセンスを再生成し、コミット済みの生成物との一致を確認する。一致したときだけMacでのビルドとSimulatorテストを省く。生成物の差分・差分判定失敗・判定未確定は成功にしない。

iPhone本体・共有エディター・パッチ・操作fixture・Nix・iPhone検証設定の変更と手動実行では、Macでの全検証を維持する。所要時間はGitHub Actionsの `checks` とiPhone各ジョブで実測し、ローカル計測と区別する。

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
bun run prepare:reader-assets
bun run deploy:workers
```

## PRのプレビュー

同じリポジトリ内のPRは、既存のNix CIが成功すると `preview` jobでCloudflare標準の[Worker Previews](https://developers.cloudflare.com/workers/previews/get-started/)を自動更新する。GitHubのdeploymentリンクから開く。URLは `https://pr-<PR番号>-evame-start.reimei.workers.dev/ja`。PR #1140は `https://pr-1140-evame-start.reimei.workers.dev/ja/auth/login`。forkからのPRでは秘密値を渡さず、プレビューをデプロイしない。

ログインはメールのリンクを使う。CIは `VITE_AUTH_GOOGLE_ENABLED=false` とプレビューの `VITE_PUBLIC_DOMAIN` を指定してビルドし、`BETTER_AUTH_URL` も同じoriginに揃える。Origin検証は有効のまま。本番はGoogle・メールの両方を維持する。

GatewayとReaderのコードはPRごとに分かれる。DBは全プレビュー共用の専用Turso DB `evame-preview` を使い、本番データはコピーしない。プレビュー間では同じテストアカウント・文書を参照するため、DBスキーマの互換性がない複数PRの同時検証には使わない。画像のR2と読み取り専用maintenanceのKVは既存bindingを利用する。

GitHub secret `EVAME_PREVIEW_SECRETS` に、専用DBの `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`、専用の `BETTER_AUTH_SECRET` / `ENCRYPTION_KEY` / `PREVIEW_READER_SECRET`、送信用の `AUTH_RESEND_KEY` をJSONで登録する。翻訳などの外部サービスを試す場合は必要な秘密値も加える。値はソース・ログ・PRへ含めない。DBトークンはこのテストDBだけに限定し、更新時はsecretを差し替えてプレビューjobを再実行する。

`scripts/preview-workers.mjs` は専用DBのマイグレーション・seed後、`evame-start` 配下の `reader-pr-<PR番号>` と `pr-<PR番号>` という2つの独立したPreviewへ順にデプロイする。本番ReaderのURLは非公開のまま維持するため、ReaderのPreviewも公開Preview URLを持つGateway側を親Workerとして使う。PRごとの通常Worker作成や本番デプロイは行わない。生成済みWrangler設定をそのまま使い、親Workerは `--worker-name`、動的URLはCLIの変数指定で渡す。秘密値ファイルだけを `.data/native-preview-pr-<PR番号>` に権限 `600` で作る。

Cloudflareの[現在の制約](https://developers.cloudflare.com/workers/previews/resources/#limitations)では、Previewのservice bindingは接続先Workerの本番を呼ぶ。そのためプレビュー設定にservice bindingは追加せず、Gatewayは対応するReaderのPreview URLへ秘密ヘッダー付きで接続する。[`global_fetch_strictly_public`](https://developers.cloudflare.com/workers/runtime-apis/fetch/) を両Workerで有効にし、HTTP呼び出しを公開URLどおりにルーティングする。Readerは直接アクセスを拒否し、同じPRのGatewayのデータAPIから描画する。HTMLとアセットはReaderが所有する。本番は既存のservice bindingとキャッシュを維持し、プレビューではHTML共有キャッシュを無効にする。CIはデプロイ後に実URLの認証APIとReader HTMLを取得できることも確認する。

CIの成功に加えて、実際のプレビューURLでログイン画面、Cookieによるセッション取得、記事の作成・編集・再読み込みを確認する。メール受信からの確認と、テスト用アカウントのセッションでの確認を区別して記録する。

## 本番への切り替え

1. Biome・typecheck・全テスト・Workers 上の成果物テストを通す。
2. `evame-start` の workers.dev プレビューにデプロイし、DB、ログイン、記事保存、画像、翻訳、通知、OG、サイトマップを確認する。
3. 全機能の認証と接続先が揃ってから `evame.tech` のルートを Worker に切り替える。既存の Cloudflare キャッシュ Worker とルートを先に確認する。
4. 切り替え後も Google ログイン、Tiptap 保存、画像、翻訳を確認する。Sentry の正常な認証リダイレクトや本文の中断がエラーにならないことを確認する。

切り替え検証後、旧Vercelプロジェクト `ttizzes-projects/evame` は廃止済み。`evame.tech` のDNSは、CloudflareでプロキシされたAレコードを予約アドレス `192.0.2.0` に向け、`evame.tech/*` を `evame-start` に接続する。Vercelをオリジンや切り戻し先として使わない。継続デプロイの環境では Nix と Bun の lockfile を使い、`bun run deploy` を実行する。

## GitHub Actions の継続デプロイ

ビルド済みWorkersは一度だけ生成して全ブラウザー検証へ共有する。エディターはChromium・WebKitそれぞれでD&D・コピーとチェック操作・階層と並べ替え・書式変更の4群へ分け、Readerは独立して検証する。ジョブごとにDBを作成し、操作群ごとに新しいブラウザーコンテキストと記事を用意する。全群を維持し、失敗・キャンセル・スキップがあれば`ci-check`で本番デプロイとPRプレビューを止める。ローカルの`bun run test:deployment:browser`は既定で全群を実行する。1群だけ再現する場合は`EVAME_BROWSER_TYPE=webkit EVAME_BROWSER_SUITE=editor-lists-structure`のように指定する。

`.github/workflows/ci.yaml` は `main` のpushまたは `main` を対象にした手動実行で、Biome・typecheck・全テストの成功後、本番DBのマイグレーション、ビルド、成果物テスト、GatewayとReaderのデプロイを順に行う。マイグレーションに失敗した場合はデプロイしない。並行デプロイは行わない。PRはローカルのテストDBで検証し、Sentry送信を無効化する。

Astroの `/_astro/*` はGatewayへコピーせず、READER bindingからHTMLと同じReaderのStatic Assetsへ転送する。Gatewayを先に更新し、旧Readerでも動くAPIを維持してから、HTMLとアセットを1つのReaderバージョンとして切り替える。Gatewayの更新に失敗した場合はReaderを更新しない。Readerの更新に失敗した場合は旧Readerとそのアセットが引き続き動作するため、失敗したデプロイを再実行する。公開表示の切り戻しは互換性を確認したReaderバージョンへ行う。初回だけはGatewayから参照する前に非公開Readerを作成しておく。

切り替え前のHTMLを開いているブラウザーのため、配信対象から外れた時点から30日間、旧ハッシュ付きアセットをReaderに残す。`prepare:reader-assets` は `.data/reader-assets/active.json` に記録した直前の配信ファイルを失効させず、過去の履歴を成果物へ含める。`deploy:workers` は両Workerの更新後だけ次の配信ファイルを確定し、失敗時は旧記録を維持する。CIは履歴をmainの成功したデプロイ間で保存・復元する。初回やCIキャッシュ消失時は公開トップ・そこから参照する公開ページとJS依存を認証なしで回収する。ビルド自体ではネットワーク取得しない。

回収元は既存Gatewayの `https://evame-start.reimei.workers.dev` とする。カスタムドメインのbot制限でCIの取得が拒否されるため、既存のWorker公開URLを使う。Readerのworkers.dev公開設定は無効のままにする。

リポジトリのActions secretsに本番用の `TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`、`CLOUDFLARE_API_TOKEN`、`SENTRY_AUTH_TOKEN` を設定する。本番用のDB接続設定は `main` のマイグレーションだけに渡す。Cloudflareのデプロイ先はそれぞれの `wrangler.jsonc` に定義する。デプロイ用のアカウントトークン `evame-github-deploy` は、Specified Workersで `evame-start` と `evame-reader` の両方にIndividual Workers Editor権限を設定する。片方だけでは新しいWorkerへのアクセスが拒否される。既存のキャッシュ削除用トークンはデプロイには使わない。Sentryのアップロード用トークンは本番ビルドだけに渡し、Worker secretには登録しない。

本番の `evame.tech/*` ルートは Cloudflare のゾーン側で `evame-start` に接続する。`wrangler.jsonc` に `routes` を指定せず、CIは既存Workerのバージョンだけを更新する。Wranglerはルートが未指定なら既存の接続を変更しないため、CIトークンにゾーンのルート更新権限を追加する必要はない。`images.evame.tech` はこのルートの対象に含めない。

テーブル・カラムを廃止するときは、先に旧コードと共存できるDB変更と参照を外したコードをデプロイする。その本番反映を確認してから、次のマイグレーションでDB構造を削除する。CIはマイグレーションを先に実行するため、参照を外すコードとテーブル削除を同じデプロイにまとめない。

本番切り替え時は Worker の `BETTER_AUTH_URL` を `https://evame.tech`、`SENTRY_DSN` と `SENTRY_ENVIRONMENT` を本番用に設定する。Workerのロールバックは、戻すバージョンが現在のDB構造と互換な場合にだけ行う。DBマイグレーションはWorkerのロールバックでは戻らないため、テーブル削除などの非互換な変更後は、現在のDB構造に合わせた修正を前進デプロイする。NeonはTursoへの本番切り替えと整合性確認が完了するまで保持する。Upstash QStashのリソースと請求元のMarketplace連携は維持する。

DB切り替えの手順は [Turso移行](turso-migration.md) を参照する。
