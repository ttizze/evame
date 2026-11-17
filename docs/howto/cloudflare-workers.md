# Cloudflare Workers の運用

全コマンドは `nix develop` 内で実行する。公開表示・TanStack Startの編集・APIの入口は `src/server.ts`。Astroのビルドは `reader/` に置き、`bun run build` がそのサーバーコードとJS/CSSを `dist` へ取り込む。デプロイするWorkerは `evame-start` の1つだけで、CI・ローカル検証・本番公開で同じ成果物を使う。

## CIのテスト実行

ユニットテストはNodeとDOMの2プロジェクトに分ける。既定はNodeで、JSXを持つテストとDOMを使うエディター・認証クライアントのテストだけjsdomを起動する。全ファイルの実行とファイル間の隔離は維持する。iPhoneモデルの公式例・操作fixtureは、同じJavaScriptのコンパイル結果だけを再利用し、実行コンテキストは各例で新しく作る。

通常のWebだけの変更ではiPhoneワークフローを起動しない。ルートの `package.json`・`bun.lock` だけがiPhoneの対象にかかる場合は、Linuxで同梱モデルとライセンスを再生成し、コミット済みの生成物との一致を確認する。一致したときだけMacでのビルドとSimulatorテストを省く。生成物の差分・差分判定失敗・判定未確定は成功にしない。

iPhone本体・共有エディター・パッチ・操作fixture・Nix・iPhone検証設定の変更と手動実行では、Macでの全検証を維持する。所要時間はGitHub Actionsの `checks` とiPhone各ジョブで実測し、ローカル計測と区別する。

## 接続先

ルートの `wrangler.jsonc` が `evame-start` を定義する。`reader/wrangler.jsonc` はAstroの中間ビルド専用でデプロイしない。Reader専用Worker・Gateway専用WorkerとWorker間のservice bindingは廃止する。

| binding | 接続先 | 用途 |
| --- | --- | --- |
| `ASSETS` | `dist/client` | Astroと編集画面のJS/CSS・静的ファイル |
| `UPLOADS` | R2 `eveeve` | 既存の画像ストレージ |
| `PUBLIC_HTML` | R2 `evame-public-html`（Previewは `evame-public-html-preview`） | 公開HTMLと追記式変更記録 |
| `IMAGES` | Cloudflare Images | 幅2560以下、JPEG quality 80へ圧縮 |
| `SETTINGS` | KV `evame-settings` | `maintenance` をJSON booleanで保存 |
| `CF_VERSION_METADATA` | Workerのversion | Sentryのrelease |

公開GET/HEADはR2 GET一回で保存HTMLを返し、HIT時はDB接続とAstro描画を省略する。初回・変更後は同じWorker内の `PublicPages` entrypointでAstro生成する。時間経過やWorkerデプロイでは失効させない。`/_astro/*` は同じWorkerのStatic Assetsを優先し、404ならR2の保存アセットを返す。`/api/home-feed` は保存しない部分更新応答として扱う。認証・編集・APIとSentryの設定は同じWorkerに維持する。

開発時のbindingはローカルストレージを使う。画像は開発専用の `/api/uploads/$` で表示する。本番は従来の `https://images.evame.tech/` を使う。

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
bun run deploy:workers
```

## DB移行中の停止

Workers secret `DATABASE_MIGRATION` は `evame-start` に設定する。通常入口と `PublicPages` の両方でDB・共有HTMLキャッシュの呼び出し前に停止を判定する。画面用KVの `maintenance` では代替しない。

```bash
printf '%s' true | nix develop --command bun x wrangler secret put DATABASE_MIGRATION --config wrangler.jsonc
```

公開URLの `/ja` と `https://evame-start.reimei.workers.dev/api/auth/get-session` がともに503・`Retry-After: 60`を返すことを確認する。実行中のQStashジョブとDBへの書き込みが完了してから、[DB移行手順](turso-migration.md#本番切り替え)へ進む。停止中のQStash要求は503で再試行させる。

移行と接続先の検証後、同じWorkerのsecretを `false` に戻し、公開HTML・認証・保存の再開を確認する。

```bash
printf '%s' false | nix develop --command bun x wrangler secret put DATABASE_MIGRATION --config wrangler.jsonc
```

## PRのプレビュー

同じリポジトリ内のPRは、既存のNix CIが成功すると `preview` jobでCloudflare標準の[Worker Previews](https://developers.cloudflare.com/workers/previews/get-started/)を自動更新する。GitHubのdeploymentリンクから開く。URLは `https://pr-<PR番号>-evame-start.reimei.workers.dev/ja`。PR #1140は `https://pr-1140-evame-start.reimei.workers.dev/ja/auth/login`。forkからのPRでは秘密値を渡さず、プレビューをデプロイしない。

ログインはメールのリンクを使う。CIは `VITE_AUTH_GOOGLE_ENABLED=false` とプレビューの `VITE_PUBLIC_DOMAIN` を指定してビルドし、`BETTER_AUTH_URL` も同じoriginに揃える。Origin検証は有効のまま。本番はGoogle・メールの両方を維持する。

PRごとに1つの標準Worker Previewを使う。DBは全プレビュー共用の専用Turso DB `evame-preview` を使い、本番データはコピーしない。DBスキーマの互換性がない複数PRの同時検証には使わない。画像のR2と読み取り専用maintenanceのKVは既存bindingを利用する。

GitHub secret `EVAME_PREVIEW_SECRETS` に専用DBの `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`、専用の `BETTER_AUTH_SECRET` / `ENCRYPTION_KEY`、送信用の `AUTH_RESEND_KEY` をJSONで登録する。翻訳などを試す場合は必要な秘密値も加える。値はソース・ログ・PRへ含めない。

`scripts/preview-workers.mjs` は専用DBのマイグレーション・seed後、`evame-start` 配下の `pr-<PR番号>` をデプロイする。通常Workerは追加しない。生成済み設定を使い、専用の秘密値ファイルだけを `.data/native-preview-pr-<PR番号>` に権限 `600` で作る。公開表示も編集APIも同じPreview内で動作するため、service bindingが本番を向く制約を受けない。実URLでログイン・編集・再読み込みと公開/非公開・削除・保留タグの回収を検証する。

## 本番への切り替え

1. Biome・typecheck・全テスト・Workers 上の成果物テストを通す。
2. `evame-start` の workers.dev プレビューにデプロイし、DB、ログイン、記事保存、画像、翻訳、通知、OG、サイトマップを確認する。
3. 全機能の認証と接続先が揃ってから `evame.tech` のルートを Worker に切り替える。既存の Cloudflare キャッシュ Worker とルートを先に確認する。
4. 切り替え後も Google ログイン、Lexical 保存、画像、翻訳を確認する。Sentry の正常な認証リダイレクトや本文の中断がエラーにならないことを確認する。

切り替え検証後、旧Vercelプロジェクト `ttizzes-projects/evame` は廃止済み。`evame.tech` のDNSは、CloudflareでプロキシされたAレコードを予約アドレス `192.0.2.0` に向け、切り替え完了後の `evame.tech/*` は `evame-start` に接続する。Vercelをオリジンや切り戻し先として使わない。継続デプロイの環境では Nix と Bun の lockfile を使い、`bun run deploy` を実行する。

## GitHub Actions の継続デプロイ

ビルド済みWorkersは一度だけ生成して全ブラウザー検証へ共有する。エディターはChromium・WebKitそれぞれでD&D・コピーとチェック操作・階層と並べ替え・書式変更の4群へ分け、Readerは独立して検証する。ジョブごとにDBを作成し、操作群ごとに新しいブラウザーコンテキストと記事を用意する。全群を維持し、失敗・キャンセル・スキップがあれば`ci-check`で本番デプロイとPRプレビューを止める。ローカルの`bun run test:deployment:browser`は既定で全群を実行する。1群だけ再現する場合は`EVAME_BROWSER_TYPE=webkit EVAME_BROWSER_SUITE=editor-lists-structure`のように指定する。

`.github/workflows/ci.yaml` は `main` のpushまたは `main` を対象にした手動実行で、Biome・typecheck・全テストの成功後、本番DBのマイグレーション、ビルド、成果物テスト、単一Workerのデプロイを行う。マイグレーションに失敗した場合はデプロイしない。並行デプロイは行わない。PRはローカルのテストDBで検証し、Sentry送信を無効化する。

Astroのサーバー成果物とJS/CSSをルートの `dist` に含める。`deploy:workers` は公開アセットをR2へ保存してから `dist/server/wrangler.json` を1回デプロイする。HTMLのR2キーは `html/<DB URL hash>/<URL hash>` とし、同じDBの全Worker版でHTML・更新記録・依存索引を共有する。デプロイ後も保存HTMLを維持し、旧版へ戻しても新版での非公開化・削除が反映される。通常デプロイは公開ルートを変更しない。

`scripts/prepare-reader-storage.mjs` は本番と標準Previewで共用し、`dist/client/_astro` のアセットを `assets/_astro/` へR2 binding経由でMIMEとimmutable Cache-Control付きで保存する。通常デプロイではバケットの保持設定を変更しない。アップロード失敗時はデプロイしない。旧JS/CSSは削除期限を設けず、現行Static Assetsが404のとき同じWorkerのR2 bindingから配信する。CIのアセット履歴cacheは不要。ビルド自体ではネットワーク取得しない。

Actions secretsには本番用の `TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`、`CLOUDFLARE_API_TOKEN`、`SENTRY_AUTH_TOKEN` を設定する。本番DBはmainのマイグレーションだけに渡す。通常デプロイのトークンには既存の `evame-start` へのIndividual Workers Editor権限と、対象bucketのR2読み書き権限が必要。lifecycleの管理権限は初期設定にだけ使う。Sentryアップロード用トークンは本番ビルドだけに渡し、Worker secretには登録しない。

本番切り替え前に `PUBLIC_HTML` のbucketを用意する。`changes/`と`pending/`だけを2日で回収し、`html/`・`dependencies/`・`assets/`に削除期限を設けない。バケット作成後に `scripts/configure-reader-storage.mjs` をR2管理権限で一度実行し、既存の削除ルールを補正する。multipartの中断や他prefixの掃除は維持し、全体の削除ルールを外す場合も `changes/` と `pending/` の2日回収を補完する。Previewは別bucketを使い、その内部もDB URLのハッシュで分離する。同じDBのHTMLと変更記録をWorker versionで分割しない。R2 bindingには公開ドメインを付けず、HTMLはWorker経由で配信する。

```sh
nix develop --command bun x wrangler r2 bucket create evame-public-html
nix develop --command bun x wrangler r2 bucket create evame-public-html-preview
nix develop --command node scripts/configure-reader-storage.mjs dist/server/wrangler.json
nix develop --command node scripts/configure-reader-storage.mjs dist/server/wrangler.json --preview
```

固定文言やテンプレートの変更を既存HTMLへ反映するときは、対象URLの完全なURLをSHA-256したキー `html/<DB URL hash>/<URL hash>` を明示的に削除する。次のGETが最新版を生成する。通常のデプロイや記事更新で全HTMLを削除しない。

bucket作成・lifecycle設定にはAccountのR2管理権限が必要。通常のWorker更新権限と区別する。保存APIはDB更新と同時に永続化した保留行をR2へ反映してから成功を返し、失敗後は同内容の保存でも再試行する。HTML保存の同時fillに伴う429だけは生成応答を返して保存を省略できるが、変更記録の読み書き失敗は成功扱いしない。設計と検証項目は[公開HTMLのR2保存](../plans/incremental-static-reader.md)を参照する。

初回の本番ルート切り替えは `scripts/switch-public-route.mjs` で既存の `evame.tech/*` を `evame-gateway` から `evame-start` へ接続する。既に切り替え済みなら更新しない。未知のWorkerが所有する場合は停止する。切り替え用トークンには対象Zone Read・Workers Routes Writeが必要。DNS・画像配信・他のルートは変えない。単一Workerの公開・保存と旧JS/CSSの取得を本番で確認してから、旧Reader/GatewayのWorkerを削除する。

DBマイグレーションはWorkerのデプロイ前に適用する。更新途中の旧コードとの後方互換性は要求しないが、既存文書・翻訳・投票と認証データは保持する。

本番切り替え時は Worker の `BETTER_AUTH_URL` を `https://evame.tech`、`SENTRY_DSN` と `SENTRY_ENVIRONMENT` を本番用に設定する。Workerのロールバックは、戻すバージョンが現在のDB構造と互換な場合にだけ行う。DBマイグレーションはWorkerのロールバックでは戻らないため、テーブル削除などの非互換な変更後は、現在のDB構造に合わせた修正を前進デプロイする。NeonはTursoへの本番切り替えと整合性確認が完了するまで保持する。Upstash QStashのリソースと請求元のMarketplace連携は維持する。

DB切り替えの手順は [Turso移行](turso-migration.md) を参照する。
