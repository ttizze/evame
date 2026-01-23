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

## 2. データフロー図

```
page.tsx
  └── fetchPageDetail(slug, locale) ← [page:${pageId}]
  └── PageContent({ pageDetail, locale })
        │
        ├── ContentWithTranslations({ pageDetail }) ← 即表示
        │     └── mdastToReact ← [page:${pageId}]
        │
        ├── Suspense [統計]
        │     └── PageStats({ pageId }) ← 遅延ロード
        │           ├── fetchPageCounts ← [page-counts:${pageId}]
        │           └── fetchPageViewCount ← [page-view-count:${pageId}]
        │
        ├── Suspense [FloatingControls]
        │     └── PageFloatingControls ← 遅延ロード
        │
        └── Suspense [コメント]
              └── CommentsSection({ pageId }) ← 遅延ロード
                    └── PageCommentList
                          └── listRootPageComments ← [page-comments:${pageId}]
                          └── PageCommentItem
                                ├── mdastToReact ← [comment:${commentId}]
                                └── listChildPageComments ← [page-comments:${pageId}]
```

## 3. タグキャッシュの実体

### タグ: `page:${pageId}`
**何をキャッシュしてる？**
- `fetchPageDetail(slug, locale)`
  - `src/app/[locale]/_db/fetch-page-detail.server.ts`
  - `"use cache" + cacheTag("page:${page.id}")`
- `ContentWithTranslations({ slug, locale })`
  - `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/content-with-translations.tsx`
  - `"use cache" + cacheTag("page:${pageId}")`
  - ページ本文コンポーネント全体（mdastToReact + TOC + タグ表示など）

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

### タグ: `page-comments:${pageId}`
**何をキャッシュしてる？**
- `listRootPageComments(pageId, locale)`
  - `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-list/_db/queries.server.ts`
  - `"use cache" + cacheTag("page-comments:${pageId}")`
  - ルートコメント一覧
- `listChildPageComments(parentId, pageId, locale)`
  - 同上
  - 返信コメント一覧

**何が変わると壊れる？**
- コメントの追加/削除

**更新する場所（updateTag）**
- Server Action（ユーザー操作直後）
  - コメント追加
  - コメント削除

### タグ: `comment:${commentId}`
**何をキャッシュしてる？**
- `mdastToReact({ contentId, contentType: "comment" })`
  - `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/mdast-to-react/server.tsx`
  - `"use cache" + cacheTag("comment:${contentId}")`
  - コメント本文のMDAST→React変換結果

**何が変わると壊れる？**
- コメント本文の編集

**更新する場所（updateTag）**
- Server Action（ユーザー操作直後）
  - コメント編集

### タグ: `page-counts:${pageId}`
**何をキャッシュしてる？**
- `fetchPageCounts(pageId)`
  - `src/app/[locale]/_db/fetch-page-detail.server.ts`
  - `"use cache" + cacheLife("seconds") + cacheTag("page-counts:${pageId}")`
  - コメント数、いいね数

**何が変わると壊れる？**
- コメント追加/削除、いいね追加/削除

**更新する場所（updateTag）**
- 短いTTL（seconds）なので自動更新
- 即時反映が必要な場合は updateTag を呼ぶ

### タグ: `page-view-count:${pageId}`
**何をキャッシュしてる？**
- `fetchPageViewCount(pageId)`
  - `src/app/[locale]/_db/page-utility-queries.server.ts`
  - `"use cache" + cacheLife("seconds") + cacheTag("page-view-count:${pageId}")`
  - 閲覧数

**何が変わると壊れる？**
- 閲覧数の増加

**更新する場所**
- 短いTTL（seconds）なので自動更新

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

## 4. まとめ（結論だけ）

- **基本はタグキャッシュだけを考えればいい**
- 主要タグ:
  - `page:${pageId}` - ページ本文
  - `page-comments:${pageId}` - コメント一覧
  - `comment:${commentId}` - コメント本文
  - `page-counts:${pageId}` - カウント（短TTL）
  - `page-view-count:${pageId}` - 閲覧数（短TTL）
  - `page-translation-jobs:${pageId}` - 翻訳ジョブ
- 更新は
  - **ユーザー操作 → updateTag**
  - **翻訳ジョブ完了 → revalidateTag**
  - **短TTLタグ → 自動更新**
