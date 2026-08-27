# Cloudflare Workers のデプロイ

デジタル仏教は Cloudflare Workers 上で TanStack Start を実行します。Worker の設定ファイルとバインディングは、デプロイ対象の環境ごとに管理します。

## 前提

```bash
nix develop
bunx wrangler login
```

ローカル開発では本番の認証情報や本番 Turso Database を使わず、`.env` に開発用の値を設定します。`.env.example` の秘密値は空欄のまま保ちます。

## シークレットと変数

Turso Database の認証トークン、認証プロバイダーの秘密値、AI プロバイダーのキーは Worker secret として登録します。

```bash
bunx wrangler secret put TURSO_AUTH_TOKEN
bunx wrangler secret put AUTH_RESEND_KEY
bunx wrangler secret put OPENAI_API_KEY
bunx wrangler secret put DEEPSEEK_API_KEY
bunx wrangler secret put GEMINI_API_KEY
```

`TURSO_DATABASE_URL`、`APP_BASE_URL`、`EMAIL_FROM`、公開ドメイン、`TRANSLATION_MAX_ATTEMPTS` など秘密ではない値は Worker の環境変数として設定します。環境変数名は [`docs/requirements.md`](../requirements.md) と `.env.example` を正本とします。

利用しない AI プロバイダーの secret は登録しません。値が必要な処理を有効にする場合だけ、対象環境へ登録します。Cloudflare Queues の名前や binding は secret ではなく Wrangler 設定で管理します。

## 翻訳ジョブ用 Cloudflare Queues

翻訳ジョブは `TRANSLATION_QUEUE` producer binding から Cloudflare Queues に投入します。ローカル・staging・production でキューを分け、production のキューをローカル開発に使いません。

初回だけ、キュー本体と dead-letter queue を作成します。

```bash
bunx wrangler queues create digital-buddhism-translations
bunx wrangler queues create digital-buddhism-translations-dlq
```

[`wrangler.jsonc`](../../wrangler.jsonc) の Wrangler 設定には、次の関係を定義します。

- producer binding: `TRANSLATION_QUEUE` → `digital-buddhism-translations`
- consumer: `digital-buddhism-translations`
- dead-letter queue: `digital-buddhism-translations-dlq`
- consumer の再試行回数・バッチサイズ・タイムアウト

設定後に `just deploy` を実行します。consumer は最大再試行回数を超えたメッセージを dead-letter queue へ送り、原因を Worker のログとジョブ状態で追跡します。キューの削除や名前変更は、未処理メッセージとデプロイ済み Worker の binding を確認してから行います。

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

異常がある場合は Cloudflare のデプロイ履歴から直前の正常な Worker バージョンへ戻します。DB マイグレーションはアプリのロールバックより先に後方互換性を確認してください。
