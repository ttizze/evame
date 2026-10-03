# アーキテクチャ概要

Evame は TanStack Start を使った翻訳・注釈プラットフォームです。
本ドキュメントは「全体像」「主要コンポーネント」「依存関係」「データの流れ」を最短で理解するための入口です。

## 技術スタック（現行）

- フレームワーク: TanStack Start + TanStack Router
- ビルド・サーバー: Vite + Nitro
- 言語: TypeScript
- UI: React 19 + Tailwind CSS + Radix UI 系コンポーネント
- i18n: use-intl
- DB: PostgreSQL
- DB アクセス: Kysely（ランタイム） + Drizzle（スキーマ/マイグレーション）
- 認証: better-auth

## リポジトリ構成（要約）

```
/
├── src/
│   ├── routes/              # 画面・API のルート境界と loader/head
│   ├── app/                 # 機能ごとの UI・service/domain/db
│   ├── router.tsx           # リクエストごとの Router 作成
│   ├── start.ts             # リクエスト・Server Function middleware
│   ├── server.ts            # サーバーエントリと Sentry
│   ├── client.tsx           # ブラウザーの hydration
│   ├── components/          # 共有 UI
│   ├── db/                  # DB 接続・型・シード
│   ├── drizzle/             # スキーマとマイグレーション
│   ├── i18n/                # i18n 設定
│   ├── lib/                 # 汎用ユーティリティ（業務ロジック禁止）
│   └── utils/               # 共有ユーティリティ
├── docs/                    # ドキュメント
└── ...
```

詳細な配置ルールは `docs/architecture/conventions/route-colocation.md` を参照してください。

## 主要コンポーネントと責務

### ルート境界（`src/routes`）
- `createFileRoute` で画面・API・sitemap・robots.txt を登録
- `__root.tsx` が HTML、`HeadContent`、`Scripts` とエラー境界を管理
- `$locale.tsx` が locale 検証、翻訳メッセージ、テーマなどの provider を管理
- loader は Server Function を呼び、head は loader の結果や locale からメタデータを構成
- `routeTree.gen.ts` は自動生成ファイルなので直接編集しない

### 機能実装（`src/app`）
- ルートが使用する UI・業務ロジック・DB 操作を管理
- `[locale]` や `(common-layout)` は機能の配置名であり、URL を登録しない
- API の handler と service/domain/db は `src/app/api` に置く

### 共有 UI（`src/components`）
- 複数ルートから参照される UI を集約
- ルート専用コンポーネントは各ルート内へ配置

### サービス／ドメイン
- ルート直下の `_service` / `_domain` / `_db` でルート内の共有ロジックを整理
- コンポーネント専用のロジックはそのコンポーネント配下へ

### DB レイヤー
- `src/db` で接続・型・シードを管理
- 取得/更新ロジックはルート内の `_db` や `db/` に置く

### 認証
- `src/auth.ts` がエントリポイント
- better-auth + magic link を中心に構成

### i18n
- `src/i18n` に設定を集約
- `$locale` を基本ルートとし、`IntlProvider` で翻訳メッセージとタイムゾーンを設定
- `NEXT_LOCALE` cookie は移行前の言語設定を引き継ぐため維持する

## データの流れ（代表パターン）

1. loader が `createServerFn` で定義した Server Function を呼ぶ
2. Server Function 内で入力検証・認証を行い、service や DB 層からデータを取得
3. 初回はサーバーで画面を描画し、ブラウザーで hydration。画面遷移時は同じ loader をブラウザーから実行
4. 更新は POST の Server Function で認証・認可を検証し、成功後に必要な Router/SWR のデータを再取得

通常のコンポーネントと loader はサーバー・ブラウザーの両方で動きます。DB 接続や秘密の環境変数は Server Function の handler または API handler 内でのみ使用します。ブラウザー API が必要な UI は `ClientOnly` で囲みます。

## 実行・検証

プロジェクトコマンドは Nix 環境で実行します。依存関係は `bun.lock` に固定します。

- 開発: `bun run dev`（Vite、ポート 3000）
- 本番ビルド: `bun run build`（Nitro の `.output` を生成）
- 本番起動: `bun run start`（Node で `.output/server/index.mjs` を実行）
- 検証: `bun run lint`、`bun run typecheck`、`bun run test --run`
- Vercel: `vercel.json` の `tanstack-start` と Nitro の Vercel 出力を使用

## 依存方向（要約）

- `service` → `domain` / `db` / `utils`
- `domain` → `utils`（`db` へ直接依存しない）
- `components` → `service` / `domain` / `db` / `utils`

詳細は `docs/architecture/conventions/route-colocation.md` を参照してください。

## 既存機能の維持

移行では既存機能を維持する。記事作成・編集のTiptap UIは`src/app/[locale]/(edit-layout)`、URL境界と認証loaderは`src/routes`に置く。保存・公開・タグ・翻訳設定・画像アップロードはServer Functionsを使用する。コメント・返信・削除・翻訳・通知、ページ管理・公開状態の切替・削除も移行対象に含む。
