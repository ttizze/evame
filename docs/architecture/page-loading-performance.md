# ページ読み込みパフォーマンス

## 最適化結果 (2026-01-23 計測)

**測定ページ**: `/ja/user/evame/page/tipitaka?displayMode=both` (254子ページ)

### 今回の変更

1. **fetchPageCounts + fetchPageViewCount を Promise.all で並列化**
2. **CachedPageBody コンポーネントを分離** - Navigation, Content, ChildPages, Comments をまとめてキャッシュ
3. **以下のクエリに `"use cache"` 追加:**
   - fetchChildPagesTree
   - fetchPageNavigationData
   - listRootPageComments
4. **PageStatsContent を Suspense でラップ** - キャッシュされたコンテンツを先に表示し、Stats は後からストリーミング

### 本番環境 (`npm run build` + `npm run start` + 本番DB)

#### 変更前

| 回 | TTFB |
|----|------|
| 1 | 201ms |
| 2 | 35ms |
| 3 | 38ms |
| 4 | 25ms |
| 5 | 29ms |

#### 変更後

| 回 | TTFB |
|----|------|
| 1 | 205ms |
| 2 | 41ms |
| 3 | 26ms |
| 4 | 34ms |
| 5 | 26ms |

#### 比較

| 回 | Before | After (cache) | After (cache+Suspense) |
|----|--------|---------------|------------------------|
| 1 | 201ms | 205ms | 206ms |
| 2 | 35ms | 41ms | 28ms |
| 3 | 38ms | 26ms | 42ms |
| 4 | 25ms | 34ms | 24ms |
| 5 | 29ms | 26ms | 24ms |

**結論**: TTFBは誤差範囲。Suspenseは最初のバイト送出タイミングには影響しない（ストリーミング開始後のFCPに影響）。

各コンポーネントのキャッシュは効いている:
- page-navigation: 150ms → 3ms
- child-pages: 320ms → 3ms
- page-comment-list: 150ms → 2ms
- content-with-translations: 100ms → 3ms
- PageStats: 100ms（キャッシュなし、リアルタイム）

### ローカル開発環境 (`npm run dev` + ローカルDB)

#### 変更前

| 項目 | 1回目（コールド） | 2回目 | 3回目 |
|------|------------------|-------|-------|
| **TTFB** | 4249ms | 275ms | 189ms |

#### 変更後

| 項目 | 1回目（コールド） | 2回目 | 3回目 |
|------|------------------|-------|-------|
| **TTFB** | 3850ms | 566ms | 521ms |

#### 比較

| 項目 | Before | After | 変化 |
|------|--------|-------|------|
| 1回目（コールド） | 4249ms | 3850ms | -399ms (9%改善) |
| 2回目 | 275ms | 566ms | **+291ms (悪化)** |
| 3回目 | 189ms | 521ms | **+332ms (悪化)** |

**結論**: ローカルdevモードでは`"use cache"`のシリアライズオーバーヘッドでウォームリクエストが悪化。本番では発生しない。

---

## 概要

`/user/[handle]/page/[pageSlug]` ページの読み込みパフォーマンスに関する調査と最適化結果。

## 測定環境

- Next.js 16.1.1 (Turbopack)
- ローカル開発環境 (dev mode)
- PostgreSQL: Docker (Neon emulator) on localhost:5435
- 測定ページ: `/ja/user/evame/page/tipitaka?displayMode=both` (13 segments)

## 最終測定結果

### リクエスト全体

| 項目 | 1回目 (コールド) | 2回目 (キャッシュ) | 3回目 (キャッシュ) |
|------|-----------------|-------------------|-------------------|
| **Total** | 6.1s | 1.77s | 2.1s |
| Compile | 2.1s | 70ms | 44ms |
| Render | 3.7s | 1.69s | 2.1s |
| **TTFB** | - | ~200ms | ~200ms |
| **FCP** | - | ~1.7s | ~2s |

### 内部処理時間 (キャッシュ後)

| 処理 | 時間 | 備考 |
|------|------|------|
| fetchPageDetail | 8-21ms | ✅ キャッシュ済み |
| fetchPageCounts | 8-23ms | ✅ キャッシュ済み |
| fetchPageNavigationData | 10-38ms | ✅ キャッシュ追加 |
| listRootPageComments | 7-35ms | ✅ キャッシュ追加 |
| fetchChildPagesTree | 10-40ms | ✅ キャッシュ追加 |
| **mdastToReact** | 3-4ms | ✅ キャッシュ済み |
| ContentWithTranslations | 21-61ms | ✅ キャッシュ済み |
| **合計** | ~150-200ms | - |

### ボトルネック: mdastToReact

| 処理 | 1回目 | キャッシュ後 |
|------|-------|-------------|
| `processor.run` | **796ms** | 3.4ms |
| `stringify` | 2ms | 0.3ms |

#### 遅い原因 (1回目)
1. **remarkEmbedder**: oEmbed APIへのHTTPリクエスト
2. **remarkLinkCard**: リンクプレビュー取得のHTTPリクエスト
3. **rehypePrettyCode**: シンタックスハイライト処理

これらはキャッシュにより2回目以降は3-4msに改善。

### Render時間ギャップの原因と解決

| 項目 | 値 |
|------|-----|
| コンポーネント合計 | ~150-200ms |
| Next.js報告のrender | 1.6-2.1s |
| **ギャップ** | ~1.4-1.9s |

#### 原因特定

**主要因: Uncached data outside Suspense**

```
Error: Route "/[locale]/user/[handle]/page/[pageSlug]":
Uncached data or `connection()` was accessed outside of `<Suspense>`.
This delays the entire page from rendering.
```

`fetchPageCounts` と `fetchPageViewCount` がキャッシュされておらず、Suspense境界外で呼ばれていたため、ページ全体のレンダリングをブロックしていた。

**その他の要因:**
- DOMノード数: 4910個 → RSCシリアライズのオーバーヘッド
- 16個のクライアントコンポーネント境界
- React Server Components のストリーミングオーバーヘッド

#### 解決策

1. **fetchPageCounts/fetchPageViewCountにキャッシュ追加** (`cacheLife("seconds")`)
   - キャッシュを追加することで、Suspense境界外での呼び出しでもページ全体のブロックを回避

**Note**: レイアウトは `params.then()` パターンをSuspense内で使用する形式を維持。これはNext.js 16の[Runtime Data Rules](https://nextjs.org/docs/app/getting-started/cache-components#runtime-data)に準拠するため。`params` はランタイムデータであり、Suspense境界内でのみアクセスする必要がある。

## 実施した最適化

### 1. キャッシュ追加

以下の関数に `"use cache"` を追加:

```typescript
// src/app/[locale]/_db/fetch-page-detail.server.ts
export async function fetchPageCounts(pageId: number) {
  "use cache";
  cacheLife("seconds");  // 短いTTLで最新性とパフォーマンスのバランス
  cacheTag(`page-counts:${pageId}`);
  ...
}

// src/app/[locale]/_db/page-utility-queries.server.ts
export async function fetchPageViewCount(pageId: number) {
  "use cache";
  cacheLife("seconds");
  cacheTag(`page-view-count:${pageId}`);
  ...
}

// src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-list/_db/queries.server.ts
export async function listRootPageComments(...) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`page-comments:${pageId}`);
  ...
}

export async function listChildPageComments(...) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`comment-replies:${parentId}`);
  ...
}

// src/app/[locale]/_db/page-tree.server.ts
export async function fetchChildPagesTree(...) {
  "use cache";
  cacheLife("max");
  cacheTag(`page-children:${parentId}`);
  ...
}

// src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/page-navigation/_db/queries.server.ts
export async function fetchPageNavigationData(...) {
  "use cache";
  cacheLife("max");
  cacheTag(`page-navigation:${pageId}`);
  ...
}
```

### 2. 並列クエリ実行

```typescript
// src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/page-content.tsx
const [pageCounts, pageViewCount] = await Promise.all([
  fetchPageCounts(pageDetail.id),
  fetchPageViewCount(pageDetail.id),
]);
```

### 3. PageStats の Suspense ラップ

```typescript
// src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/page-content.tsx
export async function PageContent({ pageDetail, locale }: PageContentProps) {
  return (
    <article>
      {/* キャッシュされる部分 - 即座に表示 */}
      <CachedPageBody locale={locale} pageDetail={pageDetail} />

      {/* キャッシュされない部分: Stats - Suspenseでストリーミング */}
      <Suspense fallback={<PageStatsFallback />}>
        <PageStatsContent
          annotationTypes={annotationTypes}
          pageId={pageDetail.id}
          sourceLocale={pageDetail.sourceLocale}
          userLocale={locale}
        />
      </Suspense>
    </article>
  );
}
```

これにより:
- CachedPageBody（Navigation, Content, ChildPages, Comments）がキャッシュから即座に表示
- PageStatsContent（閲覧数、いいね数、コメント数）は非同期でストリーミング表示
- **注意**: TTFBは変わらない（最初のバイト送出タイミングは同じ）
- FCPの改善が期待できる（キャッシュ済みコンテンツが先に表示される）

## 改善効果

### Before (キャッシュなし)

| 処理 | 時間 |
|------|------|
| listRootPageComments | 909ms |
| fetchChildPagesTree | 78ms |
| mdastToReact | 796ms |

### After (キャッシュあり)

| 処理 | 時間 | 改善率 |
|------|------|--------|
| listRootPageComments | 7-35ms | **26-130x** |
| fetchChildPagesTree | 10-40ms | **2-8x** |
| mdastToReact | 3-4ms | **200x** |

## 重要な知見

### 1. 本番DBへの誤接続に注意

`npm run start` (production mode) は `DATABASE_URL` 環境変数を使用する。ローカルテスト時に本番DBに接続すると:

- 接続確立: ~500ms (ネットワーク遅延)
- クエリ実行: ~100ms/query (ネットワーク往復)

**対策**: ローカルでproductionをテストする場合は `.env.local` でローカルDBを指定する。

### 2. mdastToReact の処理内容

```typescript
const processor = unified()
  .use(remarkTweet)           // Tweet埋め込み変換
  .use(remarkEmbedder, {...}) // oEmbed (HTTP)
  .use(remarkLinkCard, {...}) // リンクカード (HTTP)
  .use(remarkRehype, {...})   // mdast → hast
  .use(rehypeRaw)             // raw HTML parse
  .use(rehypeSlug)            // slug追加
  .use(rehypePrettyCode, {...}) // シンタックスハイライト
  .use(rehypeReact, {...});   // React変換
```

HTTPリクエストを伴うプラグインがボトルネック。キャッシュ必須。

### 3. キャッシュタグ設計

| タグ | 用途 | TTL | Invalidation タイミング |
|-----|------|-----|------------------------|
| `page:{id}` | ページ全体 | max | ページ更新時 |
| `page-counts:{pageId}` | コメント/いいね数 | seconds | コメント/いいね追加時 |
| `page-view-count:{pageId}` | 閲覧数 | seconds | 閲覧時 |
| `page-comments:{pageId}` | コメント一覧 | minutes | コメント追加/削除時 |
| `comment-replies:{parentId}` | 返信一覧 | minutes | 返信追加/削除時 |
| `page-children:{parentId}` | 子ページ一覧 | max | 子ページ追加/削除時 |
| `page-navigation:{pageId}` | ナビゲーション | max | ページ構造変更時 |

## 測定方法

```bash
# Dev サーバー起動
npm run dev

# パフォーマンス測定 (Puppeteer)
cd ~/.claude/skills/chrome-devtools/scripts
node performance.js --url "http://localhost:3000/ja/user/evame/page/tipitaka?displayMode=both"
```

## RSCシリアライゼーションボトルネックの特定と解決

### 問題

コンポーネント処理時間（~100-150ms）とTTFB（~1800ms）の間に**~1650msのギャップ**が存在。

調査の結果、**ChildPages（子ページツリー、254ノード）**がボトルネックと判明:

| 状態 | TTFB |
|------|------|
| ChildPagesあり（254ノード） | ~1800ms |
| ChildPagesなし | ~665ms |
| **差分** | **~1135ms** |

### 原因

React Server Componentsのシリアライゼーションは、再帰的なツリー構造で指数関数的に遅くなる:
- 2階層: ~920ms
- 3階層: ~2100ms
- 全階層（254ノード）: ~1800ms

### 解決策

1. **ツリー深度を2階層に制限** (`page-tree.server.ts`)
   ```typescript
   function buildTree(nodes, parentId, maxDepth = 2, currentDepth = 0) {
     if (currentDepth >= maxDepth) return [];
     // ...
   }
   ```

2. **Suspense境界の追加** (`page-content.tsx`)
   - ChildPages, ContentWithTranslations, PageCommentListをSuspenseでラップ
   - FCPの改善（ストリーミング有効化）

### 結果

| 指標 | Before | After | 改善 |
|------|--------|-------|------|
| TTFB | ~1800ms | ~787ms | **56%削減** |

### 今後の改善候補

1. **ツリーの遅延読み込み**: 2階層以降をクライアントサイドで展開時に取得
2. **remarkLinkCard の最適化**: cache: true でファイルキャッシュ有効化
3. **rehypePrettyCode の遅延ロード**: コードブロックがある場合のみ実行

## 関連ファイル

- `src/app/[locale]/_db/fetch-page-detail.server.ts` - ページデータ取得、fetchPageCounts
- `src/app/[locale]/_db/page-utility-queries.server.ts` - fetchPageViewCount
- `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/content-with-translations.tsx` - コンテンツ表示
- `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/mdast-to-react/server.tsx` - Markdown処理
- `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/page-content.tsx` - ページコンテンツ
- `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-list/_db/queries.server.ts` - コメントクエリ
- `src/app/[locale]/_db/page-tree.server.ts` - ページツリー
- `src/app/[locale]/(common-layout)/layout.tsx` - レイアウト（Suspense境界）
