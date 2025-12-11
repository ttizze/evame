# Drizzle移行計画 V2（修正版）

## 現状分析

### 移行済み
- ✅ Drizzleスキーマ定義 (`src/drizzle/schema.ts`)
- ✅ Drizzleクライアント (`src/drizzle/index.ts`)
- ✅ 認証 (`src/auth.ts`)
- ✅ シンプルなクエリ（`page-utility-queries.server.ts`, `getPageById`）
- ✅ 一部のミューテーション

### 問題点
1. **Prisma型への依存が残っている**
   - `Prisma.PageWhereInput`, `Prisma.PageOrderByWithRelationInput`が関数の引数型として使われている
   - `fetchPagesWithTransform`がPrisma型に依存

2. **Prisma/Drizzleの混在**
   - `queries.server.ts`にPrisma版とDrizzle版が混在
   - `selectPageListFields`などのPrisma固有ヘルパーが残っている

3. **複雑なクエリの移行が停滞**
   - `page-list-queries.server.ts`の移行が複雑化
   - 一度に全てを移行しようとして可読性が低下

## 新しい移行方針

### 原則の変更

#### ❌ 旧方針: 機能単位で移行
- 問題: 1つのファイルに複雑なクエリが集約され、一度に移行する必要がある

#### ✅ 新方針: **使用側から段階的に移行（ボトムアップ）**
- 各クエリ関数を個別に移行
- Prisma型への依存を段階的に削除
- 移行済み関数は即座に使用可能

### 移行戦略

#### 1. **型依存の削除を優先**
- Prisma型（`Prisma.PageWhereInput`など）を引数型として使っている関数を特定
- これらをまずDrizzle用の独自型に置き換え
- 移行中も型安全性を保つ

#### 2. **小さな単位で移行**
- 1つのクエリ関数 = 1つの移行単位
- 複雑なクエリも、内部で呼ばれる関数ごとに分割して移行

#### 3. **共通パターンの抽出**
- よく使われるクエリパターンを小さなヘルパー関数に抽出
- 例: `fetchPageWithUser`, `fetchSegmentsForPage`, `fetchTagsForPage`

## 具体的な移行手順

### フェーズ1: 型依存の削除（最優先）

#### ステップ1.1: Prisma型をDrizzle型に置き換え

**対象ファイル:**
- `src/app/[locale]/_db/page-list-queries.server.ts`
  - `fetchPagesWithTransform`の引数型

**Before:**
```typescript
export async function fetchPagesWithTransform(
  where: Prisma.PageWhereInput,  // ❌ Prisma型
  skip: number,
  take: number,
  locale: string,
  orderBy?: Prisma.PageOrderByWithRelationInput | Prisma.PageOrderByWithRelationInput[],
)
```

**After:**
```typescript
// 独自の型定義を作成
type PageWhereInput = {
  status?: PageStatus;
  userId?: string;
  parentId?: number | null;
  id?: { in?: number[] };
  // content.segments.some は別途処理（後述）
  // tagPages.some は別途処理（後述）
};

type PageOrderByInput = 
  | { createdAt: "asc" | "desc" }
  | { likePages: { _count: "asc" | "desc" } };

export async function fetchPagesWithTransform(
  where: PageWhereInput,  // ✅ 独自型
  skip: number,
  take: number,
  locale: string,
  orderBy?: PageOrderByInput | PageOrderByInput[],
)
```

**メリット:**
- Prismaへの依存を削除
- 使用側での型エラーを段階的に修正可能
- 移行中も型安全性を保てる

#### ステップ1.2: 複雑なWHERE条件を関数として分割

**Before:**
```typescript
const where: Prisma.PageWhereInput = {
  status: "PUBLIC",
  content: {
    segments: {
      some: { text: { contains: query, mode: "insensitive" }, number: 0 }
    }
  }
};
```

**After:**
```typescript
// 検索用の関数を作成
async function searchPagesBySegmentText(
  query: string,
  skip: number,
  take: number,
  locale: string,
) {
  // 1. 該当するセグメントを持つページIDを取得
  const matchedPageIds = await db
    .selectDistinct({ pageId: segments.contentId })
    .from(segments)
    .where(
      and(
        eq(segments.number, 0),
        ilike(segments.text, `%${query}%`)
      )
    );

  if (matchedPageIds.length === 0) {
    return { pageForLists: [], total: 0 };
  }

  // 2. ページIDでfetchPagesWithTransformを呼び出し
  return fetchPagesWithTransform(
    { id: { in: matchedPageIds.map(p => p.pageId) }, status: "PUBLIC" },
    skip,
    take,
    locale,
  );
}
```

**メリット:**
- 複雑なWHERE条件を独立した関数に分離
- 各関数を個別に移行・テスト可能
- 再利用可能

### フェーズ2: クエリ関数の個別移行

#### ステップ2.1: 小さなクエリヘルパーを先に移行

移行順序（依存関係が少ない順）:

1. **`fetchPagesBasic`** - ページの基本情報のみ（ユーザー情報含む）
   ```typescript
   async function fetchPagesBasic(
     where: PageWhereInput,
     orderBy?: PageOrderByInput | PageOrderByInput[],
     limit?: number,
     offset?: number,
   ) {
     // ページ + ユーザーのみ
   }
   ```

2. **`fetchSegmentsForPages`** - 複数ページのセグメントを一括取得
   ```typescript
   async function fetchSegmentsForPages(
     pageIds: number[],
     locale: string,
   ) {
     // セグメント + セグメントタイプ + 最良の翻訳
   }
   ```

3. **`fetchTagsForPages`** - 複数ページのタグを一括取得
   ```typescript
   async function fetchTagsForPages(pageIds: number[]) {
     // タグのみ
   }
   ```

4. **`fetchCountsForPages`** - 複数ページのカウントを一括取得
   ```typescript
   async function fetchCountsForPages(pageIds: number[]) {
     // pageComments数、children数
   }
   ```

#### ステップ2.2: `fetchPagesWithTransform`を再実装

**アプローチ: 複数クエリに分割して後で結合**

```typescript
export async function fetchPagesWithTransform(
  where: PageWhereInput,
  skip: number,
  take: number,
  locale: string,
  orderBy?: PageOrderByInput | PageOrderByInput[],
): Promise<{ pageForLists: PageForList[]; total: number }> {
  // 1. 基本情報を取得
  const [pages, total] = await Promise.all([
    fetchPagesBasic(where, orderBy, take, skip),
    fetchPageCount(where),
  ]);

  if (pages.length === 0) {
    return { pageForLists: [], total: 0 };
  }

  const pageIds = pages.map(p => p.id);

  // 2. 関連データを並列取得
  const [segmentsMap, tagsMap, countsMap] = await Promise.all([
    fetchSegmentsForPages(pageIds, locale).then(segments => 
      groupBy(segments, s => s.pageId)
    ),
    fetchTagsForPages(pageIds).then(tags =>
      groupBy(tags, t => t.pageId)
    ),
    fetchCountsForPages(pageIds).then(counts =>
      new Map(counts.map(c => [c.pageId, c]))
    ),
  ]);

  // 3. データを結合
  const pageForLists: PageForList[] = pages.map(page => ({
    ...page,
    content: {
      segments: pickBestTranslation(segmentsMap.get(page.id) ?? []),
    },
    tagPages: (tagsMap.get(page.id) ?? []).map(tag => ({ tag })),
    _count: countsMap.get(page.id) ?? { pageComments: 0, children: 0 },
  }));

  return { pageForLists, total };
}
```

**メリット:**
- 各ヘルパー関数を個別にテスト可能
- キャッシュや最適化がしやすい
- 可読性が高い

### フェーズ3: 使用側の移行

#### ステップ3.1: 検索関数の移行

以下の関数を個別に移行:

1. `searchPagesByTitle` → `searchPagesBySegmentText`を使用
2. `searchPagesByTag` → `fetchPagesWithTransform`にタグフィルタを追加
3. `searchPagesByContent` → `searchPagesBySegmentText`を使用

#### ステップ3.2: ページ詳細の移行

`fetch-page-detail.server.ts`を移行:

1. `fetchPageDetail`をDrizzleに移行
2. `fetchCommentarySegmentsAsFallback`をDrizzleに移行

### フェーズ4: クリーンアップ

#### ステップ4.1: Prisma固有のヘルパーを削除

- `selectPageListFields`（Prisma版）を削除
- `selectSegmentFields`（Prisma版）を削除
- `selectUserFields`（Prisma版）を削除（Drizzle版に統一）

#### ステップ4.2: 型定義の整理

- `@prisma/client`からの型インポートを削除
- Drizzle型に統一

#### ステップ4.3: テストの更新

- テストファイルでPrismaをモックしている箇所をDrizzleに更新

## 実装の優先順位

### 最優先（型依存の削除）
1. ✅ `page-list-queries.server.ts`の型定義を独自型に変更
2. ✅ `fetchPagesWithTransform`の引数型を変更

### 高優先度（基盤の構築）
3. ✅ `fetchPagesBasic`の実装
4. ✅ `fetchSegmentsForPages`の実装
5. ✅ `fetchTagsForPages`の実装
6. ✅ `fetchCountsForPages`の実装

### 中優先度（主要機能の移行）
7. ✅ `fetchPagesWithTransform`の再実装
8. ✅ `searchPagesByTitle`, `searchPagesByTag`, `searchPagesByContent`の移行
9. ✅ `fetchPageDetail`の移行

### 低優先度（クリーンアップ）
10. ✅ Prisma固有ヘルパーの削除
11. ✅ 型定義の整理
12. ✅ テストの更新

## 各フェーズのチェックリスト

### フェーズ1: 型依存の削除
- [ ] `PageWhereInput`型を定義
- [ ] `PageOrderByInput`型を定義
- [ ] `fetchPagesWithTransform`の引数型を変更
- [ ] 使用側の型エラーを修正

### フェーズ2: クエリ関数の移行
- [ ] `fetchPagesBasic`を実装
- [ ] `fetchSegmentsForPages`を実装
- [ ] `fetchTagsForPages`を実装
- [ ] `fetchCountsForPages`を実装
- [ ] `fetchPagesWithTransform`を再実装
- [ ] 動作確認（手動テスト）

### フェーズ3: 使用側の移行
- [ ] `searchPagesByTitle`を移行
- [ ] `searchPagesByTag`を移行
- [ ] `searchPagesByContent`を移行
- [ ] `fetchPageDetail`を移行
- [ ] 動作確認（手動テスト）

### フェーズ4: クリーンアップ
- [ ] Prisma固有ヘルパーを削除
- [ ] `@prisma/client`の型インポートを削除
- [ ] テストファイルを更新
- [ ] 動作確認（全機能テスト）

## 注意事項

### 1. 型安全性の維持
- Prisma型を削除する前に、代替の型定義を必ず作成
- 移行中も型エラーを残さない

### 2. パフォーマンス
- 複数クエリに分割する際は、`Promise.all`で並列実行
- 必要に応じてキャッシュを検討

### 3. テスト
- 各関数を移行したら即座にテスト
- 既存のテストが通ることを確認

### 4. 段階的移行
- 一度に全てを移行せず、1関数ずつ移行
- 移行済み関数は即座に使用可能にする

## 参考: 実装例

### 型定義の例

```typescript
// src/app/[locale]/_db/types.ts
import type { PageStatus } from "@/drizzle/types";

export type PageWhereInput = {
  status?: PageStatus;
  userId?: string;
  parentId?: number | null;
  id?: { in?: number[] };
};

export type PageOrderByInput = 
  | { createdAt: "asc" | "desc" }
  | { likePages: { _count: "asc" | "desc" } };
```

### ヘルパー関数の例

```typescript
// src/app/[locale]/_db/page-list-helpers.server.ts
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/drizzle";
import { pages, users, pageComments, segments, segmentTranslations, segmentTypes, tags, tagPages, likePages } from "@/drizzle/schema";
import type { PageStatus } from "@/drizzle/types";
import type { PageWhereInput, PageOrderByInput } from "./types";

// WHERE条件をDrizzle SQLに変換
export function buildWhereCondition(where: PageWhereInput) {
  const conditions = [];
  
  if (where.status) {
    conditions.push(eq(pages.status, where.status));
  }
  if (where.userId) {
    conditions.push(eq(pages.userId, where.userId));
  }
  if (where.parentId === null) {
    conditions.push(isNull(pages.parentId));
  } else if (where.parentId !== undefined) {
    conditions.push(eq(pages.parentId, where.parentId));
  }
  if (where.id?.in) {
    conditions.push(inArray(pages.id, where.id.in));
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined;
}

// ORDER BY条件をDrizzle SQLに変換
export function buildOrderBy(orderBy?: PageOrderByInput | PageOrderByInput[]) {
  if (!orderBy) {
    return [desc(pages.createdAt)];
  }
  
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  const drizzleOrders = [];
  
  for (const order of orders) {
    if ("createdAt" in order) {
      drizzleOrders.push(
        order.createdAt === "desc" ? desc(pages.createdAt) : pages.createdAt
      );
    }
    if ("likePages" in order) {
      const likeCount = sql<number>`(
        SELECT COUNT(*)::int
        FROM ${likePages}
        WHERE ${likePages.pageId} = ${pages.id}
      )`;
      drizzleOrders.push(
        order.likePages._count === "desc" ? desc(likeCount) : likeCount
      );
    }
  }
  
  return drizzleOrders.length > 0 ? drizzleOrders : [desc(pages.createdAt)];
}
```

## 実装の詳細: 複雑な部分の対応

### セグメント翻訳の最良1件取得（DISTINCT ON問題）

**問題**: 各セグメントに対して、`point DESC, createdAt DESC`でソートした最良の翻訳を1件のみ取得したい。

**解決策1: LATERAL JOIN（推奨）**
```typescript
async function fetchSegmentsForPages(pageIds: number[], locale: string) {
  if (pageIds.length === 0) return [];
  
  // PostgreSQLのLATERAL JOINを使用
  const result = await db.execute(sql`
    SELECT DISTINCT ON (s.id)
      s.id,
      s.content_id,
      s.number,
      s.text,
      s.segment_type_id,
      st.key as segment_type_key,
      st.label as segment_type_label,
      st2.id as translation_id,
      st2.segment_id,
      st2.user_id,
      st2.locale,
      st2.text as translation_text,
      st2.point,
      st2.created_at as translation_created_at,
      u.id as translation_user_id,
      u.name as translation_user_name,
      u.handle as translation_user_handle,
      u.image as translation_user_image,
      u.created_at as translation_user_created_at,
      u.updated_at as translation_user_updated_at,
      u.profile as translation_user_profile,
      u.twitter_handle as translation_user_twitter_handle,
      u.total_points as translation_user_total_points,
      u.is_ai as translation_user_is_ai,
      u.plan as translation_user_plan
    FROM ${segments} s
    INNER JOIN ${segmentTypes} st ON s.segment_type_id = st.id
    LEFT JOIN LATERAL (
      SELECT *
      FROM ${segmentTranslations} st2
      WHERE st2.segment_id = s.id
        AND st2.locale = ${locale}
      ORDER BY st2.point DESC, st2.created_at DESC
      LIMIT 1
    ) st2 ON true
    LEFT JOIN ${users} u ON st2.user_id = u.id
    WHERE s.content_id = ANY(${pageIds})
      AND s.number = 0
    ORDER BY s.id, st2.point DESC NULLS LAST, st2.created_at DESC NULLS LAST
  `);
  
  // 結果を型安全に変換
  return result.rows.map(row => ({
    id: row.id,
    contentId: row.content_id,
    number: row.number,
    text: row.text,
    segmentType: {
      key: row.segment_type_key,
      label: row.segment_type_label,
    },
    segmentTranslations: row.translation_id ? [{
      id: row.translation_id,
      segmentId: row.segment_id,
      userId: row.translation_user_id,
      locale: row.locale,
      text: row.translation_text,
      point: row.point,
      createdAt: row.translation_created_at,
      user: {
        id: row.translation_user_id,
        name: row.translation_user_name,
        handle: row.translation_user_handle,
        image: row.translation_user_image,
        createdAt: row.translation_user_created_at,
        updatedAt: row.translation_user_updated_at,
        profile: row.translation_user_profile,
        twitterHandle: row.translation_user_twitter_handle,
        totalPoints: row.translation_user_total_points,
        isAI: row.translation_user_is_ai,
        plan: row.translation_user_plan,
      },
    }] : [],
  }));
}
```

**解決策2: 取得後にJavaScriptで処理（シンプルだが非効率）**
```typescript
async function fetchSegmentsForPages(pageIds: number[], locale: string) {
  if (pageIds.length === 0) return [];
  
  // 全翻訳を取得
  const allSegments = await db
    .select({
      segment: segments,
      segmentType: {
        key: segmentTypes.key,
        label: segmentTypes.label,
      },
      translation: segmentTranslations,
      translationUser: users,
    })
    .from(segments)
    .innerJoin(segmentTypes, eq(segments.segmentTypeId, segmentTypes.id))
    .leftJoin(
      segmentTranslations,
      and(
        eq(segments.id, segmentTranslations.segmentId),
        eq(segmentTranslations.locale, locale)
      )
    )
    .leftJoin(users, eq(segmentTranslations.userId, users.id))
    .where(
      and(
        inArray(segments.contentId, pageIds),
        eq(segments.number, 0)
      )
    )
    .orderBy(
      desc(segmentTranslations.point),
      desc(segmentTranslations.createdAt)
    );
  
  // セグメントごとにグループ化し、最良の翻訳を1件のみ選択
  const segmentsMap = new Map();
  
  for (const row of allSegments) {
    const segmentId = row.segment.id;
    
    if (!segmentsMap.has(segmentId)) {
      segmentsMap.set(segmentId, {
        ...row.segment,
        segmentType: row.segmentType,
        segmentTranslations: [],
      });
    }
    
    // 最初の翻訳のみ追加（既にソート済み）
    const segment = segmentsMap.get(segmentId);
    if (row.translation && segment.segmentTranslations.length === 0) {
      segment.segmentTranslations.push({
        ...row.translation,
        user: row.translationUser,
      });
    }
  }
  
  return Array.from(segmentsMap.values());
}
```

**推奨**: 解決策1（LATERAL JOIN）がパフォーマンスが良い。ただし、型安全性のため、raw SQLの結果を型アサーションする必要がある。

### カウント取得の最適化

```typescript
async function fetchCountsForPages(pageIds: number[]) {
  if (pageIds.length === 0) return [];
  
  // 1つのクエリで全カウントを取得
  const result = await db.execute(sql`
    SELECT 
      p.id as page_id,
      COALESCE((
        SELECT COUNT(*)::int
        FROM ${pageComments} pc
        WHERE pc.page_id = p.id
          AND pc.is_deleted = false
      ), 0) as page_comments_count,
      COALESCE((
        SELECT COUNT(*)::int
        FROM ${pages} children
        WHERE children.parent_id = p.id
          AND children.status = 'PUBLIC'
      ), 0) as children_count
    FROM ${pages} p
    WHERE p.id = ANY(${pageIds})
  `);
  
  return result.rows.map(row => ({
    pageId: row.page_id,
    pageComments: row.page_comments_count,
    children: row.children_count,
  }));
}
```

### タグ取得の実装

```typescript
async function fetchTagsForPages(pageIds: number[]) {
  if (pageIds.length === 0) return [];
  
  const result = await db
    .select({
      pageId: tagPages.pageId,
      tag: {
        id: tags.id,
        name: tags.name,
      },
    })
    .from(tagPages)
    .innerJoin(tags, eq(tagPages.tagId, tags.id))
    .where(inArray(tagPages.pageId, pageIds));
  
  return result;
}
```

## 実装チェックリスト（詳細版）

### フェーズ1: 型依存の削除
- [ ] `src/app/[locale]/_db/types.ts`を作成
- [ ] `PageWhereInput`型を定義
- [ ] `PageOrderByInput`型を定義
- [ ] `page-list-queries.server.ts`のインポートを更新
- [ ] `fetchPagesWithTransform`の引数型を変更
- [ ] 使用側（`searchPagesByTitle`など）の型エラーを確認
- [ ] 型エラーを修正（一時的に`as any`などで回避しても可）

### フェーズ2-1: 基本クエリの実装
- [ ] `src/app/[locale]/_db/page-list-helpers.server.ts`を作成
- [ ] `buildWhereCondition`を実装
- [ ] `buildOrderBy`を実装
- [ ] `fetchPagesBasic`を実装（ページ + ユーザー）
- [ ] `fetchPageCount`を実装
- [ ] テスト: 基本的なページ取得が動作することを確認

### フェーズ2-2: 関連データ取得の実装
- [ ] `fetchSegmentsForPages`を実装（LATERAL JOIN版またはJavaScript版）
- [ ] `fetchTagsForPages`を実装
- [ ] `fetchCountsForPages`を実装
- [ ] テスト: 各関数が正しくデータを取得することを確認

### フェーズ2-3: 統合関数の実装
- [ ] `fetchPagesWithTransform`を再実装
- [ ] `pickBestTranslation`が正しく動作することを確認
- [ ] テスト: 全体が正しく動作することを確認

### フェーズ3: 使用側の移行
- [ ] `searchPagesByTitle`を移行
- [ ] `searchPagesByTag`を移行
- [ ] `searchPagesByContent`を移行
- [ ] `fetchPaginatedNewPageLists`の動作確認
- [ ] `fetchPaginatedPopularPageLists`の動作確認
- [ ] `fetchChildPages`の動作確認

### フェーズ4: クリーンアップ
- [ ] Prisma固有のヘルパー（`selectPageListFields`など）を削除
- [ ] `@prisma/client`の型インポートを削除
- [ ] テストファイルを更新
- [ ] 動作確認（全機能テスト）

## デバッグのヒント

### 問題1: 型エラーが多すぎる
**解決策**: 
- 一時的に`as any`を使用して型チェックを回避
- 段階的に型を修正

### 問題2: パフォーマンスが悪い
**解決策**:
- `Promise.all`で並列実行しているか確認
- 不要なデータ取得がないか確認
- インデックスが正しく設定されているか確認

### 問題3: DISTINCT ONが正しく動作しない
**解決策**:
- PostgreSQLのバージョンを確認（9.5以降が必要）
- `ORDER BY`の順序を確認（DISTINCT ONの列が最初に来る必要がある）

## まとめ

### 変更点
- **旧**: 機能単位で一度に移行 → 複雑化
- **新**: 使用側から段階的に移行 → シンプル

### メリット
1. **型安全性**: Prisma型への依存を早期に削除
2. **段階的移行**: 1関数ずつ移行可能
3. **可読性**: 小さなヘルパー関数で可読性向上
4. **テスト容易性**: 各関数を個別にテスト可能
5. **パフォーマンス**: クエリを最適化しやすい

### 次のステップ
1. **フェーズ1から開始**: 型定義の作成（`types.ts`）
2. **各ステップで動作確認**: 1関数ずつテスト
3. **段階的に移行を進める**: 無理せず1つずつ

### 移行の目安
- **フェーズ1**: 1-2時間（型定義の作成と置き換え）
- **フェーズ2**: 4-6時間（クエリ関数の実装）
- **フェーズ3**: 2-3時間（使用側の移行）
- **フェーズ4**: 1-2時間（クリーンアップ）

**合計**: 約8-13時間（テスト含む）

