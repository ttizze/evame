# Cloudflare Full Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Evame を OpenNext 経由で Cloudflare Workers へ完全移行し、公開 URL で動作確認まで完了する。

**Architecture:** Vercel 固有依存を Cloudflare の bindings / secrets / Workers runtime 前提へ置換する。最初に OpenNext の土台を入れ、その後に runtime blocker を TDD で潰し、最後に deploy と実機確認を行う。

**Tech Stack:** Bun, Next.js 16 App Router, OpenNext Cloudflare, Wrangler, Vitest, Cloudflare Workers/KV/R2

---

### Task 1: Worktree baseline と設計書を固定する

**Files:**
- Create: `docs/plans/2026-03-06-cloudflare-full-migration-design.md`
- Create: `docs/plans/2026-03-06-cloudflare-full-migration.md`

**Step 1: baseline を確認する**

Run: `bun run test -- --run`
Expected: unit は通るが、`docker compose exec test_neon` 前提の integration が環境依存で落ちうる

**Step 2: 設計書を作成する**

- Cloudflare へ寄せる構成
- Vercel 依存の置換先
- runtime blocker
- verification 方針

**Step 3: 実装計画を作成する**

- 小さな変更単位へ分解する
- 各段階で TDD を徹底する

**Step 4: Commit**

Run: `git add docs/plans/2026-03-06-cloudflare-full-migration-design.md docs/plans/2026-03-06-cloudflare-full-migration.md && git commit -m "docs: add cloudflare migration design"`

### Task 2: OpenNext と Wrangler の最小構成を追加する

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`
- Create: `open-next.config.ts`
- Create: `wrangler.jsonc`
- Create: `cloudflare-env.d.ts` または型生成用設定

**Step 1: failing test または build failure を先に確認する**

Run: `bunx opennextjs-cloudflare build`
Expected: 設定不足または未対応依存で失敗する

**Step 2: 最小構成を追加する**

- `@opennextjs/cloudflare`, `wrangler` を追加
- `preview`, `deploy`, `cf-typegen` scripts を追加
- `initOpenNextCloudflareForDev()` を `next.config.ts` に導入
- `wrangler.jsonc` を `.open-next/worker.js` 前提で作る

**Step 3: build を再実行する**

Run: `bun run deploy -- --dry-run` または `bunx opennextjs-cloudflare build`
Expected: 次の blocker まで進む

**Step 4: Commit**

Run: `git add package.json bun.lock next.config.ts open-next.config.ts wrangler.jsonc && git commit -m "feat: add opennext cloudflare foundation"`

### Task 3: Middleware と Vercel Edge Config 依存を置換する

**Files:**
- Move/Modify: `src/proxy.ts` -> `src/middleware.ts`
- Create or Modify: `src/app/_service/cloudflare-env.ts` など関連ファイル
- Test: 近接するテストファイル

**Step 1: failing test を書く**

- メンテナンスフラグが `true` のとき `/maintenance` へ rewrite される
- `false` のとき i18n middleware が通る

**Step 2: test が正しく fail することを確認する**

Run: `bun run test -- --run <target-test>`
Expected: `@vercel/edge-config` 依存や未実装で fail

**Step 3: 最小実装を入れる**

- `@vercel/edge-config` を除去
- Cloudflare KV または env から maintenance flag を読む
- `middleware.ts` 化する

**Step 4: test を再実行する**

Run: `bun run test -- --run <target-test>`
Expected: PASS

**Step 5: Commit**

Run: `git add src/middleware.ts src/proxy.ts <test-files> && git commit -m "feat: migrate maintenance middleware to cloudflare"`

### Task 4: GCP 認証を Vercel OIDC から secret ベースへ置換する

**Files:**
- Modify: `src/app/api/translate/chunk/_infra/google-auth.ts`
- Modify: `src/app/api/translate/chunk/_infra/vertexai.ts`
- Test: 近接するテストファイル

**Step 1: failing test を書く**

- secret があれば auth client を構築する
- secret がなければ既存の local fallback を維持する

**Step 2: fail を確認する**

Run: `bun run test -- --run <target-test>`
Expected: Vercel OIDC 前提で fail

**Step 3: 最小実装を入れる**

- `@vercel/functions/oidc` を削除
- GCP credential JSON または分割 env を利用する

**Step 4: test を再実行する**

Run: `bun run test -- --run <target-test>`
Expected: PASS

**Step 5: Commit**

Run: `git add src/app/api/translate/chunk/_infra/google-auth.ts src/app/api/translate/chunk/_infra/vertexai.ts <test-files> && git commit -m "feat: migrate gcp auth for cloudflare"`

### Task 5: Workers runtime blocker を潰す

**Files:**
- Modify: 認証参照箇所周辺
- Modify: `src/db/index.ts`
- Modify: `src/drizzle/index.ts`
- Modify: `src/app/api/og/route.tsx`
- Modify: `src/app/[locale]/(common-layout)/opengraph-image.tsx`
- Test: 対応する近接テスト

**Step 1: failure を再現する**

Run: `bun run preview` または `bunx opennextjs-cloudflare build`
Expected: `better-auth`, `fs`, `pg`, `sharp` などの Workers 非互換で失敗する

**Step 2: failing test を追加する**

- 動的データ境界を越える前に乱数生成へ触れないこと
- OG 生成が Workers 互換の asset 読み込みで動くこと

**Step 3: 最小実装を入れる**

- `better-auth` 参照を遅延させる
- Node 固有依存を減らす
- Workers 互換の asset 読み込みへ変更する

**Step 4: preview/build を再実行する**

Run: `bun run preview`
Expected: ローカル preview が起動し主要ページが表示できる

**Step 5: Commit**

Run: `git add <changed-files> && git commit -m "fix: resolve cloudflare runtime blockers"`

### Task 6: R2 / cache / env の Cloudflare binding を実装する

**Files:**
- Modify: `src/app/[locale]/_infrastructure/upload/r2-client.ts`
- Modify: `src/app/_service/cloudflare-loader.ts`
- Modify: `open-next.config.ts`
- Modify: `wrangler.jsonc`
- Create: `.dev.vars.example` または関連 docs

**Step 1: failing test を書く**

- upload が binding 経由で URL を返す
- env の解決ルールが壊れない

**Step 2: fail を確認する**

Run: `bun run test -- --run <target-test>`
Expected: 現状の AWS SDK 前提で fail

**Step 3: 最小実装を入れる**

- R2 binding 優先でアップロードする
- preview 用 `.dev.vars` を整備する
- OpenNext cache binding を有効にする

**Step 4: test を再実行する**

Run: `bun run test -- --run <target-test>`
Expected: PASS

**Step 5: Commit**

Run: `git add <changed-files> && git commit -m "feat: add cloudflare bindings and cache config"`

### Task 7: Vercel env を Cloudflare 向けに移送する

**Files:**
- Create: `.dev.vars` (gitignore 対象)
- Modify: `docs/` 内の運用ドキュメント

**Step 1: Vercel から env を pull する**

Run: `vercel env pull .env.vercel.production`
Expected: Production env が取得できる

**Step 2: Cloudflare 用に分類する**

- plain env
- `wrangler secret put` 対象
- KV / R2 / service binding 対象

**Step 3: `.dev.vars` と secret 投入コマンドを準備する**

Run: `wrangler secret put <NAME>` を必要数実行
Expected: 本番 Worker に secret が入る

**Step 4: Commit**

Run: `git add docs <tracked-files> && git commit -m "docs: document cloudflare env migration"`

### Task 8: 検証と deploy を完了する

**Files:**
- Modify: 必要な不具合修正ファイル

**Step 1: 品質ゲートを通す**

Run: `bun run biome && bun run typecheck && bun run test -- --run`
Expected: 変更起因の失敗がない

**Step 2: ローカル preview を確認する**

Run: `bun run preview`
Expected: middleware, top page, locale page, api/og が確認できる

**Step 3: Cloudflare へ deploy する**

Run: `bun run deploy`
Expected: `https://<name>.<subdomain>.workers.dev` が発行される

**Step 4: 公開 URL を検証する**

- `/`
- `/ja`
- maintenance 対象 route
- `api/og` など主要 API

**Step 5: review と PR**

Run: `git status && git log --oneline --decorate -5`
Run: `gh pr create --fill`
Expected: PR 作成完了
