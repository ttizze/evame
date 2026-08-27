# 要件・仕様（現行正本）

本書は、移行元 Evame からデジタル仏教へ移行した後のサービス境界を定義します。現行の正本は、仏典翻訳の閲覧、認証済みユーザーによる翻訳案の投稿と投票、AI 翻訳ジョブによる翻訳案の提案です。

明示的に削除した機能を除き、移行元 Evame の既存仕様と観測可能な挙動は維持します。移行元の URL を正本として維持し、新しい scripture 専用 URL や旧 URL の互換・redirect は導入しません。

## 目的

- 仏典の原文と複数言語の翻訳を世界中の読者へ提供する
- 読者と翻訳協力者が、翻訳案を比較して改善できるようにする
- AI の提案と人の投票を組み合わせ、翻訳品質を継続的に高める
- 静的コンテンツを優先し、世界中から安定して閲覧できるようにする

トップページは仏典翻訳の一覧です。一般的な記事投稿サービスやコメント中心のコミュニティを目的にしません。

## 対象ユーザー

- **読者**: 認証なしで公開済みの仏典と翻訳を閲覧する
- **翻訳協力者**: 認証後、翻訳案を投稿し、翻訳案へ投票する
- **AI 翻訳ジョブの利用者**: 認証後、対象の節に翻訳案の生成を依頼する

## 機能要件

### 仏典と翻訳の閲覧

- 公開済みの仏典を一覧で表示する
- 仏典ごとに原文の区切り（節またはセグメント）と翻訳を表示する
- URL のロケールに対応する UI と翻訳案を表示する
- 利用可能なロケールを選択でき、特定の一言語を既定の表示先に固定しない
- 原文と選択した翻訳を同じ文脈で比較できる
- 翻訳が存在しない場合は、原文を隠さず不足を明示する
- トップページは仏典翻訳の一覧を表示する

### 翻訳案の投稿

- 認証済みユーザーは、公開対象の節に対して任意のロケールの翻訳案を投稿できる
- 投稿には対象セグメント、ロケール、本文を含める
- ロケールと本文はサーバー側で検証し、空の本文や不正なロケールを保存しない
- 翻訳案は既存の仏典・節と紐づけ、記事・ページそのものを新規投稿する機能は持たない
- 投稿者の識別子と登録日時を保存し、表示に必要な範囲だけを公開する
- 同じ節・同じロケールの重複候補は許可するが、表示順は投票結果で決定する

### 翻訳案の選択

- 同じ節・同じロケールに複数の翻訳案がある場合、次の順で表示する
  1. 仏典所有者の upvote がある翻訳案
  2. `point` の降順
  3. `createdAt` の降順
- 仏典所有者の upvote は、その仏典の翻訳案を並べる場合だけ優先する
- 同じ日時の候補も ID などの補助キーで決定的に並べる
- 表示する翻訳案と投票数は同じデータ取得結果に基づき、画面間で矛盾させない

### 認証済みユーザーの投票

- 投票 serverFn/API は認証済みユーザーだけが実行できる
- 未認証ユーザーが投票しようとした場合は、ログインへ誘導する
- 1 ユーザーが同じ翻訳案に持てる有効な投票は 1 件までとする
- 投票の追加、取り消し、変更の結果を次の表示に反映する
- データベースの一意制約とトランザクションで二重投票を防ぐ
- 投票対象が公開されていない、または存在しない場合は更新しない

### AI 翻訳ジョブ

- 認証済みユーザーは、許可された対象・ロケールに対して翻訳ジョブを作成できる
- ジョブの状態は `PENDING` / `IN_PROGRESS` / `COMPLETED` / `FAILED` で管理する
- ジョブは外部のキューまたは Worker の非同期処理から実行できる
- provider routing は provider adapter の境界に閉じ、Gemini・OpenAI・DeepSeek と、既存の Vertex/provider routing 方針を設定に応じて選択する
- 完了時は翻訳案を保存し、対象の読み取りキャッシュを無効化する
- 失敗時は秘密値やプロンプトを公開せず、再実行可能な状態を記録する
- 同じジョブの再送で翻訳案や課金対象の二重登録が起きないよう idempotent にする

## 対象外

現在のスコープは、仏典の閲覧、翻訳案の投稿・生成、認証投票です。次の機能は実装・UI・データモデルの対象にしません。

- 記事・ページそのものの一般ユーザー投稿や編集
- 独立したコメント、翻訳コメント、返信
- 既存の `COMMENTARY` 注釈セグメントはデータとして保持するが、独立したコメント機能としては提供しない
- いいね、フォロー、通知、ランキング以外のソーシャル機能
- 課金、Premium プラン、管理画面からの手動プラン変更
- ユーザーが自由に作成する仏典以外のコンテンツ

将来これらを追加する場合は、要件とデータモデルを先に更新します。過去の検討記録に残るコメント関連の記述は、現行要件では復活させません。

## 画面と境界（代表）

- `/$locale`: 仏典翻訳のトップ一覧
- `/$locale/$handle/$pageSlug`: 仏典の原文・翻訳案・投票状態
- `/$locale/auth/login`: 認証画面
- `src/routes/$locale/-scripture-data.ts` の serverFn: 仏典一覧・詳細取得、翻訳案投稿、投票、AI 翻訳ジョブの作成・状態取得
- `/api/auth/*`: Better Auth の認証 API（catch-all route）
- `/api/translation-jobs`: AI 翻訳ジョブを作成する POST API
- `/sitemap.xml`: 公開済み仏典と 21 locale の公開 URL
- `/robots.txt`: クロール規則と sitemap の場所

origin/main の既存 UI コンポーネント、shadcn の配置、URLを正本として維持します。既存ファイルの移動・複製・ディレクトリ再編は行わず、TanStack Router の `src/routes` には不可避な最小 route 定義だけを置き、元配置のコンポーネントを import します。実際の URL は上記の維持 URL を TanStack Router のルート境界で実装し、serverFn/API の境界とともに変更時はこの一覧を更新します。

## 権限とアクセス

- 認証は Better Auth の境界で扱い、セッション検証を公開ページやクライアント表示の条件にしない
- 公開済みの仏典と翻訳案は認証なしで閲覧できる
- 翻訳案の投稿と AI 翻訳ジョブの作成は認証済みユーザーだけが行える
- 投票の追加・取り消し・変更は認証済みユーザーだけが行える
- サーバー側でセッション、入力、対象レコードを検証する
- クライアント側の表示制御を権限チェックの代わりにしない
- 投稿・ジョブ・投票の境界で CSRF、リプレイ、レート制限を認証方式の設計に合わせて考慮する

## ロケール

- グローバルな多言語サービスとして、現行の 21 locale を維持し、日本語中心にはしない
- ルートは `[locale]` を基点とする
- 原文と翻訳案のロケールはデータ上で区別する
- 翻訳案は特定の一言語に固定せず、許可されたロケールを対象にする
- ロケール別ページでは、対象ロケールの UI、原文、翻訳案、投票状態を一貫して表示する
- 画面のラベル、認証導線、エラーメッセージは各ロケールで翻訳する
- URL のロケールが未対応の場合は既定ロケールへ安全にフォールバックするか、404 を返す

## データ整合性

- 仏典は安定した識別子と表示用 slug を持つ
- 仏典は翻訳順位に使う所有者を持つ
- 節・セグメントは仏典内で安定した順序を持つ
- 翻訳案は節、ロケール、本文、投稿者と紐づく
- 投票は翻訳案 ID とユーザー ID の組み合わせで一意とする
- AI ジョブは対象節・ロケール・依頼者・状態を持ち、ジョブ ID を冪等キーとして扱う
- 公開状態はデータベース側で表現し、非公開データを公開用クエリから返さない
- 表示順・投票数の更新は同じトランザクション境界で整合性を保つ

## 実行環境と配信

- フレームワーク: TanStack Start / TanStack Router
- 実行環境: Cloudflare Workers
- データベース: Turso Database
- DB クライアント: `@tursodatabase/serverless`
- UI: React、Tailwind CSS、shadcn/ui
- パッケージ管理: Bun
- 開発環境: Nix flake と `just`

Cloudflare Workers のリクエスト処理では Node.js 専用 API（`fs`、`child_process`、`pg`、ネイティブ画像ライブラリなど）に依存しません。DB 接続は `@tursodatabase/serverless` の HTTP ベース接続を利用します。AI プロバイダーとキューも Worker から利用可能な fetch ベースの境界に置きます。

## 静的生成・SEO

- 読み取りページは静的生成またはキャッシュ可能なレスポンスを優先する
- 投票、翻訳案投稿、AI ジョブなど認証が必要な処理だけを動的なサーバー境界に置く
- `/robots.txt` は API と認証画面をクロール対象外にし、`/sitemap.xml` の場所を示す
- `/sitemap.xml` は公開済み仏典の `/$locale/$handle/$pageSlug` と、現行 21 locale の一覧だけを掲載する。非公開・未存在の仏典を含めない
- `/$locale` と `/$locale/$handle/$pageSlug` は現行 21 locale すべてに title と description を返す。移行元で既存の copy がある `en`、`ja`、`zh`、`ko`、`es` は各言語の copy を再利用し、追加 locale は未翻訳文を混在させず英語 copy へ明示的に fallback する
- 公開ページには現在の URL の絶対 canonical、21 locale の `hreflang` alternate と `x-default` を設定する。移行元の URL を正本として維持し、新しい scripture 専用 URL や旧 URL の互換・redirect は導入しない
- 公開ページには `og:title`、`og:description`、`og:url`、`og:image` と X の `summary_large_image` card を設定する
- 公開一覧と仏典詳細には schema.org の JSON-LD 構造化データを設定する。セッションや投票状態など個人別データは含めない
- セッション、投票の内部 ID、プロンプト、秘密値を HTML やログに出力しない

### Cloudflare の可観測性

- Worker の Observability と invocation logs は Wrangler の設定で有効化し、エラー・レイテンシー・HTTP ステータスを Cloudflare の Logs で追跡する
- 利用状況の集計は Cloudflare Analytics で行う。アプリケーションに解析用の秘密値を追加せず、個人を識別する値をイベントへ送らない
- アプリケーションログは JSON の構造化ログとし、`event`、`requestId`、`route`、`status`、`durationMs`、`jobId` などの最小フィールドだけを記録する。メールアドレス、Cookie、認証トークン、DB URL、AI キー、プロンプト、翻訳本文は記録しない
- Queue consumer は Wrangler の `max_retries` と `dead_letter_queue` を正本とする。再試行上限を超えたメッセージは DLQ で隔離し、本文や秘密値をログへ出さずにジョブ ID で原因を追跡する

## 環境変数

`.env.example` は名前だけを示し、秘密値は空欄にします。現行 Worker の `TranslationWorkerEnv` と `createAuth` が受け取る環境変数は次のとおりです。

- アプリケーションと DB: `APP_BASE_URL`、`TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`
- 認証: `AUTH_SECRET`、`AUTH_RESEND_KEY`、`EMAIL_FROM`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`
- AI provider routing: `OPENAI_API_KEY`、`DEEPSEEK_API_KEY`、`ENCRYPTION_KEY`、`GCP_PROJECT_ID`、`GCP_REGION`、`GCP_SERVICE_ACCOUNT_EMAIL`、`GCP_SERVICE_ACCOUNT_PRIVATE_KEY`

`TURSO_AUTH_TOKEN`、`AUTH_SECRET`、`AUTH_RESEND_KEY`、`AUTH_GOOGLE_SECRET`、`OPENAI_API_KEY`、`DEEPSEEK_API_KEY`、`ENCRYPTION_KEY`、`GCP_SERVICE_ACCOUNT_PRIVATE_KEY` は秘密値として扱います。`GCP_SERVICE_ACCOUNT_PRIVATE_KEY` は PEM の秘密鍵で、`.env` や Wrangler secret へ登録する際に改行を `\\n` として保存しても Worker 側で実改行へ正規化します。鍵の内容をログ、HTML、Git、Nix store に出力しません。

Gemini の API key はユーザー単位で暗号化して Turso Database に保存する既存仕様を使い、旧来の API key や access token の環境変数 fallback は提供しません。Vertex provider の認証には上記 GCP サービスアカウント項目を使います。

ローカル開発と CI は専用の Turso Database を使います。本番データベースをテストやローカルのマイグレーション先にしません。翻訳ジョブのキューは Cloudflare Queues の `TRANSLATION_QUEUE` binding を使い、キュー名や consumer 設定は Wrangler で管理します。

`TRANSLATION_QUEUE` は Cloudflare の binding であり、環境変数や Worker secret として登録しません。

通常 Queue の consumer は `wrangler.jsonc` の `max_retries` を再試行上限として使います。上限に達したメッセージは同じ設定の dead-letter queue（DLQ）へ移送され、同一 Worker の DLQ consumer がジョブ ID を使って `FAILED` を記録した後に `ack` します。DLQ consumer はメッセージ本文や秘密値をログへ出力せず、アプリケーション環境変数で再試行回数を上書きしません。

## 検証

変更後は次を実行します。

```bash
just install
just biome
just typecheck
just test
just build
```

DB スキーマを変更した場合は、専用の開発データベースに対して `just migrate` を実行します。CI は Postgres、Docker、共有本番データベースに依存しません。
