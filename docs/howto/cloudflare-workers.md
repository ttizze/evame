# Cloudflare Workers のデプロイ

デジタル仏教は Cloudflare Workers 上で TanStack Start を実行します。Worker の設定ファイルとバインディングは、デプロイ対象の環境ごとに管理します。

## 前提

```bash
nix develop
bunx wrangler login
```

ローカル開発では本番の認証情報や本番 Turso Database を使わず、`.env` に開発用の値を設定します。`.env.example` の秘密値は空欄のまま保ちます。

## シークレットと変数

`TranslationWorkerEnv` と `createAuth` が参照する名前だけを登録します。次の値は Worker secret として登録します。

```bash
bunx wrangler secret put TURSO_AUTH_TOKEN
bunx wrangler secret put AUTH_SECRET
bunx wrangler secret put AUTH_RESEND_KEY
bunx wrangler secret put AUTH_GOOGLE_SECRET
bunx wrangler secret put OPENAI_API_KEY
bunx wrangler secret put DEEPSEEK_API_KEY
bunx wrangler secret put ENCRYPTION_KEY
bunx wrangler secret put GCP_SERVICE_ACCOUNT_PRIVATE_KEY
```

`TURSO_DATABASE_URL`、`APP_BASE_URL`、`EMAIL_FROM`、`AUTH_GOOGLE_ID`、`GCP_PROJECT_ID`、`GCP_REGION`、`GCP_SERVICE_ACCOUNT_EMAIL` は Worker の非秘密変数として設定します。環境変数名は [`docs/requirements.md`](../requirements.md) と `.env.example` を正本とします。

`GCP_SERVICE_ACCOUNT_PRIVATE_KEY` は PEM の秘密鍵です。`secret put` の入力プロンプトへ安全な経路で値を渡し、シェル履歴やログへ出力しません。値をファイルや環境変数から登録する場合も、PEM の実改行を保持するか、改行を `\\n` として保存してください。Worker の provider adapter が `\\n` を実改行へ戻します。秘密鍵 JSON 全体や秘密値をコマンド引数、Git、Nix storeへ置きません。

Gemini の API key はユーザー単位で暗号化された Turso Database の値を使います。旧来の API key や access token は登録せず、環境変数 fallback もありません。

利用しない AI プロバイダーの secret は登録しません。値が必要な処理を有効にする場合だけ、対象環境へ登録します。`TRANSLATION_QUEUE` は環境変数や secret ではなく Cloudflare binding なので、Wrangler 設定だけで管理します。

## 翻訳ジョブ用 Cloudflare Queues

翻訳ジョブは `TRANSLATION_QUEUE` producer binding から Cloudflare Queues に投入します。ローカル・staging・production でキューを分け、production のキューをローカル開発に使いません。

初回だけ、キュー本体と dead-letter queue を作成します。

```bash
bunx wrangler queues create digital-buddhism-translations
bunx wrangler queues create digital-buddhism-translations-dlq
```

[`wrangler.jsonc`](../../wrangler.jsonc) の Wrangler 設定には、次の関係を定義します。

- producer binding: `TRANSLATION_QUEUE` → `digital-buddhism-translations`
- 通常 consumer: `digital-buddhism-translations`
- dead-letter queue: `digital-buddhism-translations-dlq`
- 通常 consumer の `max_retries`、バッチサイズ、タイムアウト
- DLQ consumer: `digital-buddhism-translations-dlq`（同一 Worker）

設定後に `just deploy` を実行します。通常 consumer は `wrangler.jsonc` の `max_retries` を超えたメッセージを dead-letter queue へ送り、同一 Worker の DLQ consumer がジョブ ID の状態を `FAILED` にして `ack` します。キューの削除や名前変更は、未処理メッセージとデプロイ済み Worker の binding を確認してから行います。

### 再試行と DLQ の運用

`wrangler.jsonc` の通常 consumer に設定した `max_retries` が同じメッセージの再試行上限です。処理失敗時はジョブ ID を相関キーにして再試行し、上限を超えたメッセージは `digital-buddhism-translations-dlq` に隔離します。同一 Worker の DLQ consumer は payload を再検証し、ジョブ ID の状態を `FAILED` に記録してからメッセージを `ack` します。これにより DLQ message 自体を再試行しません。DLQ を再投入する前に、対象ジョブが `FAILED` または再実行可能な状態であること、同じジョブ ID の二重登録が起きないことを確認します。メッセージ本文、AI プロンプト、認証情報をログや通知へコピーしません。

## Observability・Logs・Analytics

`wrangler.jsonc` の Observability 設定を Worker の可観測性の正本とします。デプロイ後は Cloudflare Dashboard の Workers > Observability で invocation logs、エラー、ステータス、レイテンシーを確認し、必要な短時間の調査だけ `bunx wrangler tail` で行います。Cloudflare Analytics では route/status 単位の匿名集計を確認し、アプリケーション側に解析用の秘密値や個人識別子を追加しません。

アプリケーションログは JSON の次の最小フィールドだけを使います。

```json
{"event":"translation_job_failed","requestId":"request-id","route":"/api/translation-jobs","status":503,"durationMs":120,"jobId":"job-id"}
```

メールアドレス、Cookie、認証トークン、Turso の URL・トークン、AI provider key、プロンプト、翻訳本文、投票値、Queue payload はログへ出力しません。これらが混入したログを Cloudflare Logs や `wrangler tail` から転記しないでください。

## ビルドとデプロイ

```bash
just install
just biome
just typecheck
just test
just build
just deploy
```

デプロイ前に、対象環境の Worker 名・ドメイン・Turso Database が正しいことを確認します。CI からデプロイする場合も、専用の Cloudflare API token と本番用 secret を GitHub Actions secret で管理し、ログへ出力しません。

## 動作確認とロールバック

デプロイ後は公開トップページ、仏典詳細、複数ロケールの翻訳表示、認証済みユーザーの翻訳案投稿・投票、AI 翻訳ジョブの作成と状態遷移を確認します。翻訳案が「仏典所有者の upvote → `point` → `createdAt`」の順に表示されること、未認証ユーザーが投稿・投票できないことも確認します。

```bash
bunx wrangler tail
```

異常がある場合は Cloudflare のデプロイ履歴から直前の正常な Worker バージョンへ戻します。Queue consumer の失敗は Cloudflare Logs、ジョブ状態、DLQ の件数を併せて確認します。DB マイグレーションはアプリのロールバックより先に後方互換性を確認してください。
