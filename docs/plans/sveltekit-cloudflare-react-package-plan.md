# SvelteKit 一括移行（Cloudflare 前提）React/Next 依存 完全置換計画

## 目的
- React/Next 専用パッケージを **漏れなく** 置換または削除する。
- Cloudflare デプロイを前提に、Vercel 依存と Node 依存の詰まりどころを先に潰す。
- 「どの package を、何に、どの順序で」移すかを固定し、移行中の設計ブレをなくす。

## 前提
- デプロイ先は Cloudflare（Pages / Workers Runtime）。
- フレームワークは SvelteKit（`@sveltejs/adapter-cloudflare`）。
- 本計画の対象は `package.json` に存在する React/Next/Vercel 依存すべて。

## 調査サマリ（現行）
- `react` 依存ファイル: 114
- `next` 依存ファイル: 103
- `@radix-ui/react-*` 依存ファイル: 合計 22（18パッケージ）
- `react-select` 利用箇所: 3（ロケール複数選択2、タグ入力1）
- `next/cache` 利用箇所: 25（タグ再検証中心）
- Vercel 固有依存:
  - `@vercel/edge-config`（メンテナンスフラグ）
  - `@vercel/functions/oidc`（Vertex AI 認証）

## 完全置換表（使用中）
| 現行 package / API | 利用 | 役割 | 置換先 | 方針 |
|---|---:|---|---|---|
| `react` / `react-dom` | 114 / 1 | UI基盤・Portal | Svelte 5 | 全 `.tsx` を `.svelte` + `+page/+layout/+server` へ再実装 |
| `next`（`next/navigation` `next/link` `next/image` `next/server` `next/cache` 等） | 103 | ルーティング/SSR/API/画像/キャッシュ | SvelteKit 標準 API | ルーティングは `src/routes`、APIは `+server.ts`、画像は後述、キャッシュは Cloudflare 方針へ再設計 |
| `next-intl` | 17 | i18n ルーティングと文言 | SvelteKit `[locale]` + Paraglide | i18n を SvelteKit の locale ルートへ寄せる |
| `next-themes` | 3 | テーマ切替 | `mode-watcher` | `+layout.svelte` に `ModeWatcher` 配置 |
| `nextjs-toploader` | 2 | ページ遷移ローディング | 自前（SvelteKit ナビゲーションフック） | 依存削除。必要最小 UI で再実装 |
| `nuqs` | 22 | URLクエリ状態同期 | `$app/navigation` + `URLSearchParams` | ルート専用の小さな query-state utility を Svelte 化 |
| `@next/third-parties` | 1 | GA 読み込み | 直接 script/gtag | 同意後に script 注入（現行同等） |
| `@sentry/nextjs` | 3 | 監視 | `@sentry/sveltekit` | `hooks.server.ts` / `handleError` へ統合 |
| `@radix-ui/react-*`（18 packages） | 22 | UIプリミティブ | `bits-ui` + `shadcn-svelte` | コンポーネントを Svelte 側で再生成。既存 `src/components/ui` を段階的に置換 |
| `cmdk` | 1 | Command palette | `bits-ui` の `Command`/`Combobox` | 既存 locale selector の検索 UI を置換 |
| `@tiptap/react` | 7 | エディタ UI バインディング | `@tiptap/core` + Svelte 実装 | エディタコアは維持。UI バインディングのみ Svelte 化 |
| `lucide-react` | 61 | アイコン | `@lucide/svelte`（Svelte 5） | 使用箇所を機械置換 |
| `react-icons` | 2 | SNS/Google アイコン | SVG 資産化（または `@iconify/svelte`） | 依存削除優先で SVG 直接管理 |
| `react-select` / `react-select/creatable` | 3 | 複数選択・タグ追加 | `bits-ui` `Combobox`/`Select` | 下記「Select 詳細仕様」で完全置換 |
| `react-share` | 1 | SNS 共有ボタン | Web Share API + share URL 直生成 | 依存削除。必要SNSは URL テンプレートで代替 |
| `react-textarea-autosize` | 2 | 自動伸縮 textarea | Svelte action（自前） | 依存削除。`input` 時に `scrollHeight` 反映 |
| `react-tweet` | 2 | X 埋め込み | X widgets 直接埋め込み（script + blockquote） | 依存削除。SSR フォールバック付きで実装 |
| `html-react-parser` | 2 | HTML -> ReactNode | sanitize + `{@html}` | 返却型を `string` に統一 |
| `rehype-react` | 1 | hast -> ReactElement | `rehype-stringify` | markdown描画パイプラインを HTML 出力に再設計 |
| `linkify-react` | 1 | profile 文の linkify | 非 React 実装（文字列 linkify util） | 依存削除。`{@html}` 前に linkify |
| `sonner` | 14 | toast | `svelte-sonner` | `Toaster` を root layout に配置 |
| `better-auth/next-js`（subpath） | 1 | auth route handler | `better-auth/svelte-kit` | `hooks.server.ts` へ統合 |
| `better-auth/react`（subpath） | 1 | client auth hook | `better-auth/svelte` | `auth-client` を Svelte 用に置換 |
| `@upstash/qstash/nextjs`（subpath） | 1 | QStash 署名検証 | `@upstash/qstash` `Receiver.verify` | `+server.ts` で raw body 検証 |
| `@vercel/edge-config` | 1 | maintenance フラグ | Cloudflare KV | `maintenance` キーを KV 参照に置換 |
| `@vercel/functions/oidc` | 1 | GCP OIDC | GCP認証方式再設計（Service Account Secret 優先） | Vercel 前提コードを撤廃 |

## 完全置換表（未使用・削除対象）
| package | 利用 | 方針 |
|---|---:|---|
| `@next/bundle-analyzer` | 0 | 移行時に削除 |
| `@tabler/icons-react` | 0 | 削除 |
| `embla-carousel-react` | 0 | 削除 |
| `framer-motion` | 0 | 削除 |
| `next-router-mock` | 0 | 削除（Svelte 側テスト基盤へ） |
| `@types/react` / `@types/react-dom` | 0 | 削除 |
| `@vitejs/plugin-react` | 0（ビルド設定で使用） | `@sveltejs/vite-plugin-svelte` へ置換後削除 |
| `eslint-config-next` | 0 | ESLint 設定を SvelteKit 向けに置換後削除 |
| `eslint-plugin-react-hooks` | 0 | 削除 |
| `babel-plugin-react-compiler` | 0 | 削除 |

## Select 置換詳細（指摘箇所）
### 対象
- `src/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_components/header/locale-multi-selector/client.tsx`
- `src/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_components/header/translation-settings/components/multi-locale-select/index.tsx`
- `src/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_components/tag-input/index.tsx`

### 要件維持
- 複数選択
- 上限数（`maxSelectable`）制御
- 検索
- 新規タグ作成（creatable）
- キーボード操作
- 既存 action 呼び出し（保存・バリデーション）

### 実装方針
- `react-select` は不採用。
- `bits-ui` `Combobox` を共通コンポーネント化して以下を実現:
  - `type="multiple"` で複数選択
  - `onValueChange` で上限ガード
  - 入力値が候補にない場合の Enter で creatable 追加
  - hidden input で既存 action と互換
- 「タグ入力」は chips UI + Combobox の合成に統一。

### 完了条件
- 上記3ファイルから `react-select` / `react-select/creatable` import が 0。
- 既存のタグ追加/削除・ロケール保存の E2E シナリオが通る。

## Cloudflare 固有の追加設計
### デプロイ
- `@sveltejs/adapter-cloudflare` を採用。
- `wrangler.jsonc` に `main`, `assets`, `compatibility_flags` を設定。

### キャッシュと再検証（Next tag cache 代替）
- 基本: `Cache-Control` による CDN キャッシュ制御。
- 変更イベント時: Cloudflare Cache Purge API（URL単位）で明示 purge。
- クライアント再取得: SvelteKit の `invalidate` / `invalidateAll` を使用。

### Vercel 依存の置換
- メンテナンスフラグ: Edge Config -> Cloudflare KV
- Vertex AI 認証: Vercel OIDC -> Cloudflare で動く認証方式へ統一（Service Account Secret 優先）

### Workers 互換性で先に潰す箇所
- `node:fs` / `node:path` 利用（OG生成）: Worker 互換実装へ差し替え
- `node:crypto` 依存: Web Crypto で代替可能な箇所を優先移行
- ロガー（pino transport）: Workers 実行時の互換モードを事前検証

## 実施フェーズ（綿密版）
1. 基盤確定（Cloudflare）
- SvelteKit + adapter-cloudflare + wrangler を最小構成で起動
- Sentry / Better Auth / DB 接続の PoC を通す
- 完了条件: `wrangler dev` で最小ページと API が動作

2. 境界置換（Next/Vercel API）
- `next/server`, route handlers, middleware, auth handler, qstash verify を SvelteKit 境界へ置換
- 完了条件: API 15本相当の動作互換

3. UI プリミティブ置換
- `@radix-ui/react-*` / `cmdk` / `sonner` / `next-themes` / `nextjs-toploader` を置換
- 完了条件: `src/components/ui` とヘッダ周りのコンポーネントが Svelte 化

4. React 専用コンポーネント置換
- `react-select` / `react-textarea-autosize` / `react-share` / `react-icons` / `lucide-react`
- 完了条件: 該当依存 import 0

5. markdown / 埋め込み / 文字列描画再設計
- `rehype-react` / `html-react-parser` / `react-tweet` / `linkify-react` を撤去
- 完了条件: markdown, tweet, profile linkify の表示互換

6. テスト基盤移行
- `@testing-library/react` -> `@testing-library/svelte`
- Vitest 設定を Svelte 用に更新
- 完了条件: 主要ユニットテスト/E2E 通過

7. 依存削除と最終監査
- 未使用 React/Next 依存の一括削除
- 完了条件:
  - `rg -n \"from \\\"react|from \\\"next|@radix-ui/react|react-select|react-share|react-tweet|next-intl|next-themes|nuqs|sonner\" src` が 0
  - `bun run biome` / `bun run typecheck` / 全テスト通過

## リスクと対策
- リスク: `next/cache` 相当の即時反映差分
- 対策: 変更イベントで URL purge を標準化。TTL と purge 対象URLの台帳を用意

- リスク: `react-select` の UX 劣化（検索/作成/キーボード）
- 対策: 先に `TagInput` を PoC 化し、操作 parity を E2E で固定

- リスク: `react-tweet` 代替で埋め込み崩れ
- 対策: SSR フォールバック + client script hydration の2段構成

- リスク: Cloudflare Workers 互換（Node API）
- 対策: フェーズ1で Node API 依存箇所を互換監査し、互換未達を先に隔離

## 参考（公式）
- SvelteKit adapter-cloudflare: https://svelte.dev/docs/kit/adapter-cloudflare
- Cloudflare purge cache API: https://developers.cloudflare.com/api/resources/cache/methods/purge/
- Cloudflare cache by status code / custom cache key: https://developers.cloudflare.com/cache/how-to/configure-cache-status-code/ , https://developers.cloudflare.com/cache/how-to/cache-keys/
- Cloudflare Pages plugin for `@vercel/og`: https://developers.cloudflare.com/pages/functions/plugins/vercel-og/
- Bits UI（Command / Combobox / Select）: https://www.bits-ui.com/docs/introduction
- shadcn-svelte: https://www.shadcn-svelte.com/docs
- Lucide Svelte: https://lucide.dev/guide/packages/lucide-svelte
- Better Auth SvelteKit: https://www.better-auth.com/docs/integrations/svelte-kit
- QStash signature verify: https://upstash.com/docs/qstash/howto/signature
- Svelte Testing Library: https://testing-library.com/docs/svelte-testing-library/setup
- svelte-sonner: https://github.com/wobsoriano/svelte-sonner
- mode-watcher: https://github.com/svecosystem/mode-watcher
