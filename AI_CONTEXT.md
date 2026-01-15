# AI_CONTEXT

このファイルは AI に渡す前提の要約です。**必ず `AGENTS.md` を先に読み**、本書と合わせて解釈してください。

## 目的
- 仕様・制約・構造の誤解を防ぐ
- 変更の影響範囲を限定し、安全に最小変更で進める

## 誤解しやすい点
- このリポジトリは **Next.js アプリがルート直下** にあり、`/next` 配下ではありません。
- **DB は Kysely をランタイムで使用**し、**Drizzle はスキーマ/マイグレーション用**です。
- 認証は **better-auth** を利用しています（`src/auth.ts`）。
- i18n は `next-intl` で、`src/app/[locale]` が基本ルートです。

## 必読リンク
- 作業ルール: `AGENTS.md`
- 要件: `docs/requirements.md`
- アーキテクチャ: `docs/architecture.md`
- ルート配置ルール: `docs/architecture/conventions/route-colocation.md`

## 実装上の重要な制約（抜粋）
- **最小変更**・**シンプル優先**・**過剰分割禁止**
- `useMemo` / `useCallback` は使用しない
- `useEffect` は必要な場合のみ
- 変更後は `bun run typecheck` と `bun run biome` を実行

## 置き場所の原則
- ルート内で完結させる（コロケーション）
- 同一関心が 3 件以上ならディレクトリ化
- 共有ロジックは「最も近い境界」に置く

