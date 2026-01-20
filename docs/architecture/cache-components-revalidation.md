# Cache Components と revalidate の仕組み（このプロジェクト版）

このドキュメントは、
**「何がキャッシュされているのか」**
**「どの操作で更新されるのか」**
を 1 ページで理解できるように書き直したものです。

## 1. このプロジェクトは「タグキャッシュ」だけ使う

- **対象**: Server Component / server function の返り値
- **仕組み**: `use cache` でキャッシュし、`cacheTag` でタグ付けする
- **更新方法**:
  - Server Action → `updateTag`（即時反映）
  - Route Handler → `revalidateTag`（外部イベント/非同期）

## 2. タグキャッシュの実体

### タグ: `page:${pageId}`
**何をキャッシュしてる？**
- `fetchPageDetail(slug, locale)`
  - `src/app/[locale]/_db/fetch-page-detail.server.ts`
  - `"use cache" + cacheTag("page:${page.id}")`

**何が変わると壊れる？**
- ページ本文/翻訳/投票/タグ/公開状態 など

**更新する場所（updateTag / revalidateTag）**
- Server Action（ユーザー操作直後）
  - ページ本文編集
  - 翻訳の投票
  - 翻訳の手動追加
  - 翻訳の削除
  - ページタグ編集
  - 公開ステータス変更
- Route Handler（翻訳ジョブ完了）
  - `/api/translate/chunk`

### タグ: `page-translation-jobs:${pageId}`
**何をキャッシュしてる？**
- `fetchCompletedTranslationJobs(pageId)`
  - `src/app/[locale]/_db/page-utility-queries.server.ts`
  - `"use cache" + cacheTag("page-translation-jobs:${pageId}")`

**何が変わると壊れる？**
- 翻訳ジョブの完了状態

**更新する場所**
- Route Handler（翻訳ジョブ完了）
  - `/api/translate/chunk`

## 3. まとめ（結論だけ）

- **基本はタグキャッシュだけを考えればいい**
- `page:${pageId}` と `page-translation-jobs:${pageId}` の2つだけ
- 更新は
  - **ユーザー操作 → updateTag**
  - **翻訳ジョブ完了 → revalidateTag**
