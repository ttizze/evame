# Next.js -> SvelteKit 一括移行 事前調査（難易度・パッケージ互換）

## 更新
- Cloudflare 前提の詳細版（React/Next 依存の完全置換表）は `docs/plans/sveltekit-cloudflare-react-package-plan.md` を参照。

## 目的
- 一括移行の前に「簡単/難しい」を分解し、実装順と非互換パッケージの置換方針を固定する。
- Next.js 固有機能を SvelteKit でどう置き換えるかを先に決め、移行中の設計ブレを防ぐ。

## 現状
- 現行は Next.js App Router 構成。`src` は 526 ファイル、`src/app` は 444 ファイル。
- ルート境界は `page.tsx` 14、`layout.tsx` 4、`route.ts(x)` 15、`"use server"` は実装 23 ファイル。
- Next 依存の利用ファイル数（主要）:
  - `next/navigation` 37
  - `next/cache` 25
  - `next-intl` 20
  - `next/server` 17
  - `next/image` 17
- UI 層は React 前提が強い（`react` 114ファイル、`@radix-ui/react-*` 22ファイル、`@tiptap/react` 8ファイル）。
- 一方で DB/ドメイン/サーバー処理の一部はフレームワーク非依存で再利用可能（`next/*` と `react` の直接依存がない実装ファイルが多数）。

## 実装
### 行うこと
- 一括移行前に以下を凍結する:
  - 難易度マップ（高/中/低）
  - パッケージ互換マトリクス（採用/置換/削除）
  - 置換先の第一候補（1つ）と代替候補（必要時のみ）
  - キャッシュ/再検証の新仕様（Next のタグ更新との差分）
  理由: 一括移行は設計ミスが後半で爆発しやすく、先に判断を固定しないとリライトが二重化するため。

### 難易度マップ
#### 高（先に設計を固める）
- React UI 基盤の全面置換
  - 対象: `@radix-ui/react-*`, `react-*`, `@tiptap/react`, `@testing-library/react`。
  - 方針: UI は Svelte コンポーネントへ再実装。第一候補は `shadcn-svelte` + `bits-ui`。
- `next/cache`（`cacheTag`/`updateTag`/`revalidateTag`）の移行
  - 現行はタグベース再検証に依存。
  - 方針: SvelteKit + Cloudflare キャッシュ制御（`Cache-Control` + purge API）へ再設計。必要箇所は API 主導の明示 purge を追加する。
- `next-intl` の置換
  - 現行はルーティング + メッセージ解決を next-intl で統合。
  - 方針: SvelteKit の `[locale]` ルーティングに寄せる。i18n ライブラリは `paraglide` を第一候補とする。

#### 中（置換方針が明確）
- 認証
  - 現行: `better-auth/next-js`, `better-auth/react`。
  - 方針: `better-auth/svelte-kit` + `better-auth/svelte` に置換し、`hooks.server.ts` でハンドラをマウント。
- QStash 署名検証
  - 現行: `@upstash/qstash/nextjs`。
  - 方針: `@upstash/qstash` の `Receiver.verify` を `+server.ts` で直接利用。
- 監視/エラートラッキング
  - 現行: `@sentry/nextjs`。
  - 方針: `@sentry/sveltekit` に置換。
- 画像/OG
  - 現行: `next/image`, `next/og`。
  - 方針: 画像は `@sveltejs/enhanced-img`（ローカル静的）+ `@unpic/svelte`（リモート/CDN）を併用。OG は Cloudflare 対応実装（`@vercel/og` 互換または同等）へ寄せる。

#### 低（移植作業中心）
- Route Handler
  - 現行 API は `src/app/api/**/route.ts` に分離済み。
  - 方針: `src/routes/api/**/+server.ts` へ機械的に移植し、業務ロジックは再利用。
- DB/ドメイン
  - 現行の Kysely/Drizzle/業務ロジックは概ね再利用可能。
  - 方針: SvelteKit 側へ移設し import パスを更新。

### パッケージ互換マトリクス（主要）
| 現行 | 現状利用 | SvelteKit 対応 | 方針 | 難易度 |
|---|---:|---|---|---|
| `next`, `next/navigation`, `next/link`, `next/dynamic`, `next/form` | 多数 | 非互換 | SvelteKit ルーティング/`$app/navigation`/Form Actions へ置換 | 高 |
| `next/cache` | 多数 | 同等APIなし | Cloudflare キャッシュ + purge API + invalidate 設計へ再定義 | 高 |
| `next-intl` | 20ファイル | Next.js 専用 | `[locale]` ルーティング + `paraglide` 採用 | 高 |
| `@radix-ui/react-*` | 22ファイル | React 専用 | `bits-ui` + `shadcn-svelte` へ置換 | 高 |
| `@tiptap/react` | 8ファイル | React 専用 | `@tiptap/core` ベースで Svelte 実装へ置換 | 高 |
| `nuqs` | 12ファイル | React ルーター群向け | URLSearchParams + `$app/navigation` で置換 | 中 |
| `better-auth/next-js` | 1ファイル | 非互換 | `better-auth/svelte-kit` へ置換 | 中 |
| `better-auth/react` | 1ファイル | 非互換 | `better-auth/svelte` へ置換 | 中 |
| `@upstash/qstash/nextjs` | 1ファイル | 非互換 | `@upstash/qstash` `Receiver.verify` に置換 | 中 |
| `@sentry/nextjs` | 3ファイル | 非互換 | `@sentry/sveltekit` へ置換 | 中 |
| `next-themes` | 3ファイル | React/Next 依存 | `mode-watcher` へ置換 | 中 |
| `nextjs-toploader` | 2ファイル | Next 依存 | ルート遷移フック + `nprogress` 実装に置換 | 低 |
| `@next/third-parties/google` | 1ファイル | Next 依存 | 通常 script/gtag 実装へ置換 | 低 |
| `next/og` | 2ファイル | 非互換 | Cloudflare 対応 OG 実装を `+server.ts` で利用 | 中 |
| `next/image` | 17ファイル | 非互換 | `@sveltejs/enhanced-img` / `@unpic/svelte` / `<img>` | 中 |
| `sonner` | 14ファイル | React 専用 | `svelte-sonner` へ置換 | 低 |
| `@testing-library/react` | 24ファイル | React 専用 | `@testing-library/svelte` へ置換 | 中 |

### 一括移行の採用方針（v1）
- 採用:
  - フレームワーク: `@sveltejs/kit` + `@sveltejs/adapter-cloudflare`
  - i18n: `paraglide`
  - UI プリミティブ: `bits-ui` + `shadcn-svelte`
  - 認証: `better-auth/svelte-kit` + `better-auth/svelte`
  - 通知: `svelte-sonner`
  - テーマ: `mode-watcher`
  - テスト: `@testing-library/svelte` + Vitest + Playwright
- 非採用（削除対象）:
  - `next*`, `@next/*`, `next-intl`, `next-themes`, `nextjs-toploader`
  - React 専用 UI 依存（`@radix-ui/react-*`, `@tiptap/react`, `react-*` の UI 層）
- キャッシュ方針:
  - 旧: Next タグキャッシュの即時更新（`updateTag`/`revalidateTag`）
  - 新: ルート単位 ISR と HTTP キャッシュを基本に再設計し、即時性が必要な箇所のみ個別 invalidation を導入

### 参考資料（公式）
- SvelteKit Form Actions: https://svelte.dev/docs/kit/form-actions
- SvelteKit Hooks: https://svelte.dev/docs/kit/hooks
- SvelteKit Adapter Cloudflare: https://svelte.dev/docs/kit/adapter-cloudflare
- Svelte packages（paraglide / shadcn-svelte / bits-ui / enhanced-img / @unpic/svelte / testing-library）: https://svelte.dev/packages
- Better Auth SvelteKit: https://www.better-auth.com/docs/integrations/svelte-kit
- QStash 署名検証: https://upstash.com/docs/qstash/howto/signature
- nuqs 対応フレームワーク: https://nuqs.dev/docs/installation
- next-intl（Next.js 向け）: https://next-intl.dev/
- shadcn-svelte: https://www.shadcn-svelte.com/docs
- Bits UI: https://www.bits-ui.com/docs/introduction
- svelte-sonner: https://github.com/wobsoriano/svelte-sonner
- mode-watcher: https://github.com/svecosystem/mode-watcher
- Svelte Testing Library: https://testing-library.com/docs/svelte-testing-library/setup
- Cloudflare Pages plugin for `@vercel/og`: https://developers.cloudflare.com/pages/functions/plugins/vercel-og/

## 結果
- 一括移行前に必要な「難易度」「非互換パッケージ」「置換方針」を文書化した。
- 最重要リスクは `next/cache` のタグ再検証と React UI 基盤の全面置換であることを明確化した。
- 次工程は、この方針を前提に「実施順（Week単位）」を作ること。
