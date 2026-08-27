# アーキテクチャ

デジタル仏教は、移行元 Evame の仏典データを引き継ぎ、翻訳を世界中の読者とともに改善する TanStack Start アプリケーションです。トップページを仏典翻訳の一覧とし、認証済みユーザーは翻訳案の投稿と投票を行えます。AI 翻訳ジョブも翻訳案を提案します。記事投稿やコメント機能は持ちません。

実行環境は Cloudflare Workers、永続データベースは Turso Database です。

## 技術スタック

- フレームワーク: TanStack Start
- ルーティング: TanStack Router（ファイルベース）
- 実行環境: Cloudflare Workers
- DB: Turso Database
- DB クライアント: `@tursodatabase/serverless`
- UI: React + TypeScript
- UI コンポーネント: Tailwind CSS + shadcn/ui
- 認証: Better Auth のセッション境界
- パッケージ管理: Bun
- 開発環境: Nix flake
- タスクランナー: `just`
- デプロイ CLI: Wrangler

## リクエストの流れ

```text
Browser
  │
  ▼
Cloudflare Worker
  │  TanStack Start route
  ├───────────────┬──────────────────┐
  ▼               ▼                  ▼
public loader   auth/session      job serverFn
  │               │                  │
  ▼               ▼                  ▼
public query   domain + db       queue/provider
  │               │                  │
  └───────┬───────┴──────────────────┘
          ▼
 @tursodatabase/serverless
          │
          ▼
     Turso Database
```

読み取りルートは loader で公開済みデータを取得し、可能な限り静的生成またはキャッシュ可能なレスポンスとして返します。URL のロケールに対応する UI と翻訳案を表示し、翻訳案の投稿と投票は、認証・入力検証・更新・結果の返却を `createServerFn` の serverFn 境界で行います。AI 翻訳ジョブはリクエストと非同期実行を分離します。

ロケールは現行の 21 locale を維持するグローバルな多言語モデルとし、日本語を既定の中心にはしません。各 locale の URL は、その locale の UI と翻訳案を選択する入力です。

## 責務と配置

移行後の基本配置は次のとおりです。実装上のファイル名が異なる場合も、依存方向と責務をこの境界に合わせます。

```text
src/
├── routes/       # TanStack Router のページ、loader、serverFn/API 境界
├── components/   # 複数ルートで使う UI
├── domain/       # 仏典、翻訳、投票、ジョブの純粋なルール
├── db/           # Turso Database クライアント、読み取り、更新、マイグレーション
├── seo/          # locale metadata、canonical、sitemap、robots の生成
└── styles/       # アプリケーションのスタイル
```

- `routes`: HTTP 入出力、セッションの入口、画面の組み立てを担当する
- `domain`: DB や Worker API に依存せず、投票可否・表示順・ジョブ状態を決める
- `db`: Turso Database からデータを取得・更新する。表示用の業務判断は `domain` に置く
- `seo`: URL、metadata、JSON-LD、公開 URL 一覧を決定論的に生成する。sitemap の公開判定は `published_at IS NOT NULL` の query に限定する
- `components`: ルートに依存しない共有 UI を担当する

依存は `routes → domain/db/components`、`db → @tursodatabase/serverless` の一方向とします。ブラウザに DB トークンや AI プロバイダーキーを渡しません。

## データベース

Turso Database の HTTP 接続を提供します。アプリケーションは `@tursodatabase/serverless` のクライアントをリクエスト境界で利用し、Postgres の接続プールや WebSocket に依存しません。

主なデータの関係は次のとおりです。

```text
scriptures ──< segments ──< translations ──< translation_votes >── users
     │
     └──< translation_jobs
```

- `scriptures`: 仏典の識別子、slug、所有者、公開状態、メタデータ
- `segments`: 仏典内の節・セグメントと順序。既存の `COMMENTARY` 注釈セグメントもここで保持する
- `translations`: 節、ロケール、本文、投稿者、表示用メタデータ
- `translation_votes`: ユーザーと翻訳案の一意な投票
- `translation_jobs`: 対象節、ロケール、依頼者、状態。ジョブ ID 自体を冪等キーとして扱う
- `users`: 認証主体と投稿者・投票者の識別子

投票の一意性はアプリケーションの分岐だけでなく、Turso Database の一意制約でも保証します。公開用クエリは公開済みの仏典・翻訳案だけを返します。

### 翻訳案の表示順位

同じ節・同じロケールの翻訳案は、次の順に並べます。

1. 仏典所有者の upvote がある翻訳案
2. `point` の降順
3. `createdAt` の降順

仏典所有者の upvote は対象仏典の翻訳案だけに適用します。同じ `createdAt` の候補は ID などの補助キーで決定的に並べ、リクエストごとに順序を変えません。

### マイグレーション

- マイグレーションはリポジトリ内の SQL を正本とする
- `just migrate` は `TURSO_DATABASE_URL` で指定した DB に順番に適用する
- 開発・CI・本番はそれぞれの DB を明示し、DB を暗黙に切り替えない
- PostgreSQL の `CREATE DATABASE ... TEMPLATE`、`pg_restore`、Docker の DB コンテナは使用しない
- 破壊的なリセットは通常のマイグレーションに含めず、専用の開発 DB で明示的に実行する

## 認証と翻訳操作

認証は Worker で検証可能なセッション境界に閉じ込めます。翻訳案の投稿・投票 serverFn/API は次の順に処理します。

1. セッションからユーザーを取得する
2. セグメント ID、ロケール、本文、投票値をスキーマ検証する
3. 対象が公開対象であることを確認する
4. 翻訳案またはユーザーごとの投票を追加・変更・削除する
5. 更新後の翻訳案、投票数、投票状態を返す

認証なしの読み取りは許可しますが、翻訳案の投稿・投票は拒否します。秘密値は Worker secret に置き、ログや HTML に出力しません。

## AI 翻訳ジョブ

AI 翻訳は同期リクエストに閉じ込めず、次の境界に分けます。

1. 認証済みユーザーの serverFn/API が対象節・ロケールを検証し、`PENDING` ジョブを作る
2. 作成したジョブ ID を冪等キーとして Cloudflare Queues の `TRANSLATION_QUEUE` binding へ投入する
3. Worker のジョブ処理が provider routing に従い、Gemini・OpenAI・DeepSeek または既存の Vertex/provider adapter を fetch ベースの境界経由で呼ぶ
4. 成功時に翻訳案と `COMPLETED` 状態を保存し、対象の読み取りキャッシュを無効化する
5. 失敗時に秘密値やプロンプトを公開せず、`FAILED` と再実行情報を記録する

再送で翻訳案やジョブが二重登録されないよう、ジョブ ID を冪等キーとしてデータベース制約と更新条件で検証します。キュー名、producer binding、consumer、dead-letter queue は Wrangler 設定で管理し、アプリケーションの環境変数には置きません。

## Cloudflare Workers

Worker のリクエスト処理では、Node.js 固有の API やネイティブバイナリを import しません。特に `fs`、`child_process`、`pg`、ネイティブ画像処理ライブラリを公開ルートの依存にしないことを境界条件とします。

開発・検証・デプロイは次の入口に統一します。

```bash
nix develop
just install
just dev
just build
just deploy
```

Wrangler のバインディングと環境変数は環境ごとに管理します。ローカル開発では専用の Turso Database を使い、本番 Worker の URL やトークンを流用しません。設定の詳細は [`docs/howto/cloudflare-workers.md`](../howto/cloudflare-workers.md) を参照してください。

## 静的生成とキャッシュ

- 仏典一覧、本文、公開翻訳案は静的生成または短いキャッシュ TTL を優先する
- 投票状態、投稿者、セッション依存部分は読み取りキャッシュに混ぜない
- 投票・翻訳案投稿・ジョブ完了後は対象翻訳の表示順と本文だけを再取得または無効化する
- ユーザーごとのレスポンスを共有キャッシュへ保存しない

## SEO

SEO の純粋な生成処理は `src/seo/metadata.ts` と `src/seo/sitemap.ts` に置き、HTTP の入出力は次の route に限定します。

- `/$locale` と `/$locale/$slug` の `head` で locale 別 title、description、canonical、OG/X metadata を返す。既存 copy がある `en`、`ja`、`zh`、`ko`、`es` は各言語の文言を使い、追加 locale は英語 copy へ明示的に fallback する
- 各公開ページに 21 locale の `hreflang` と `x-default` alternate を付ける。構造化データは TanStack Router の `{ "script:ld+json": object }` metadata descriptor で JSON-LD として出力する
- `/sitemap.xml` は `published_at IS NOT NULL` の仏典だけを Turso Database から読み、各 locale の URL を XML で返す
- `/robots.txt` は API とログイン画面を除外し、sitemap の絶対 URL を返す
- OG image は公開静的 asset `/bg-ogp.png` を使い、セッション・投票状態・秘密値を metadata や JSON-LD に含めない
- canonical は新 URL を正本とし、移行元 Evame の旧 URL redirect/互換層は持たない

## Cloudflare の可観測性と Queue 運用

- `wrangler.jsonc` の `observability.enabled` と `observability.logs` を Cloudflare Workers Observability の正本とする。Cloudflare Logs で invocation、エラー、ステータス、レイテンシーを検索する
- 利用状況の集計は Cloudflare Analytics を使い、解析用の秘密値をアプリケーションへ追加しない。必要な集計は匿名の route/status 単位に限定する
- アプリケーションのログは JSON の `event`、`requestId`、`route`、`status`、`durationMs`、`jobId` などに限定する。メール、Cookie、認証トークン、DB URL、AI キー、プロンプト、翻訳本文、投票値はログへ出さない
- `TRANSLATION_QUEUE` consumer の `max_retries` と `dead_letter_queue` は Wrangler で管理する。再試行上限を超えたメッセージは `digital-buddhism-translations-dlq` に隔離し、DLQ の再投入前に job ID と失敗理由（秘密値を除く）を確認する
- Queue の失敗は job の `FAILED` 状態と Cloudflare Logs の相関 ID で追跡し、DLQ の payload をそのままログへ出力しない

## 検証

ローカルと CI の基本検証は同じ `just` タスクを使います。

```bash
just biome
just typecheck
just test
just build
```

DB を含む変更は専用の Turso Database でマイグレーションを適用して確認します。CI は Postgres コンテナ、Docker Compose、共有本番 DB に依存しません。
