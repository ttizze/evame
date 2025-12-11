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

## テスト関連の移行戦略

### 現状分析

#### 既に移行済み
- ✅ **テストファクトリー** (`src/tests/factories.ts`): Drizzleを使用してテストデータを作成
- ✅ **一部の統合テスト**: Drizzleを使用（例: `sync-annotation-links-by-paragraph-number/index.integration.test.ts`）

#### 移行が必要
- ❌ **テストDBマネージャー** (`src/tests/test-db-manager.ts`): Prismaクライアント管理が残っている
- ❌ **DBヘルパー** (`src/tests/db-helpers.ts`): `resetDatabase`, `setupMasterData`, `getSegmentTypeId`がPrismaを使用
- ❌ **統合テストファイル**: 約20ファイルがPrismaを直接使用（`import { prisma } from "@/lib/prisma"`）

### テスト移行の原則

#### 1. **テストインフラを先に移行**
- テストの基盤（DB管理、ヘルパー）を先に移行
- 個別のテストファイルは後から段階的に移行

#### 2. **統合テストを優先**
- モックを使わない統合テストから移行
- 実際のDBを使うテストは移行が容易

#### 3. **段階的な移行**
- 一度に全てを移行せず、機能単位で移行
- 移行済みのテストは即座に動作確認

### フェーズ別テスト移行計画

#### フェーズ0: テストインフラの移行（最優先）

**目的**: テストの基盤をDrizzleに移行し、以降のテスト移行を容易にする

##### ステップ0.1: `db-helpers.ts`の移行

**Before:**
```typescript
// src/tests/db-helpers.ts
import { prisma } from "@/lib/prisma";

export async function resetDatabase() {
  await prisma.$connect();
  await prisma.segmentAnnotationLink.deleteMany();
  // ... 他のテーブルも同様
}
```

**After:**
```typescript
// src/tests/db-helpers.ts
import { db } from "@/drizzle";
import {
  segmentAnnotationLinks,
  segmentMetadata,
  // ... 他のテーブル
} from "@/drizzle/schema";

export async function resetDatabase() {
  // 外部キー制約の順序に注意して削除
  await db.delete(segmentAnnotationLinks);
  await db.delete(segmentMetadata);
  // ... 他のテーブルも同様
}
```

**チェックリスト:**
- [ ] `resetDatabase`をDrizzleに移行
- [ ] `setupMasterData`をDrizzleに移行
- [ ] `getSegmentTypeId`をDrizzleに移行
- [ ] 既存のテストが動作することを確認

##### ステップ0.2: `test-db-manager.ts`の移行

**変更点:**
- `resetPrismaClient`を削除または`resetDrizzleClient`に置き換え（必要に応じて）
- `runMigrations`から`prisma generate`を削除（Drizzleのみに）

**Before:**
```typescript
function runMigrations(dbUrl: string, silent = false): void {
  const env = { ...process.env, DATABASE_URL: dbUrl };
  execSync("bunx drizzle-kit migrate", { env, stdio });
  execSync("bunx prisma generate", { env, stdio }); // ❌ 削除
}
```

**After:**
```typescript
function runMigrations(dbUrl: string, silent = false): void {
  const env = { ...process.env, DATABASE_URL: dbUrl };
  execSync("bunx drizzle-kit migrate", { env, stdio });
  // Prisma Client生成は不要
}
```

**チェックリスト:**
- [ ] `runMigrations`から`prisma generate`を削除
- [ ] `resetPrismaClient`を削除（またはDrizzle用に変更）
- [ ] グローバルセットアップが動作することを確認

#### フェーズ1: 統合テストの移行（機能単位）

**方針**: 機能ごとにテストを移行。移行済みの機能のテストから開始。

##### ステップ1.1: ページリスト関連のテスト

**対象**: `page-list-queries.server.ts`のテスト（新規作成が必要な場合）

**アプローチ:**
1. テストファイルを作成: `src/app/[locale]/_db/page-list-queries.server.integration.test.ts`
2. `fetchPagesWithTransform`のテストを実装
3. 各ヘルパー関数（`fetchPagesBasic`, `fetchSegmentsForPages`など）のテストを実装

**チェックリスト:**
- [ ] `fetchPagesBasic`のテスト
- [ ] `fetchSegmentsForPages`のテスト
- [ ] `fetchTagsForPages`のテスト
- [ ] `fetchCountsForPages`のテスト
- [ ] `fetchPagesWithTransform`の統合テスト
- [ ] `searchPagesByTitle`, `searchPagesByTag`, `searchPagesByContent`のテスト

##### ステップ1.2: 既存の統合テストを移行

**移行順序（依存関係が少ない順）:**

1. **ページ詳細関連** (`fetch-page-detail.server.ts`のテスト)
2. **ミューテーション関連** (`mutations.server.ts`のテスト)
3. **アクション関連** (`action.ts`のテスト)

**移行パターン:**

**Before:**
```typescript
import { prisma } from "@/lib/prisma";

it("should fetch page", async () => {
  const page = await prisma.page.findFirst();
  // テストロジック
});
```

**After:**
```typescript
import { db } from "@/drizzle";
import { pages } from "@/drizzle/schema";

it("should fetch page", async () => {
  const [page] = await db.select().from(pages).limit(1);
  // テストロジック
});
```

**チェックリスト（各テストファイル）:**
- [ ] Prismaのインポートを削除
- [ ] Drizzleのインポートを追加
- [ ] クエリをDrizzle構文に変更
- [ ] テストが動作することを確認

#### フェーズ2: モックテストの移行（低優先度）

**対象**: Prismaをモックしているユニットテスト

**注意点:**
- 統合テストを優先し、モックテストは後回しでも可
- モックが必要な場合は、Drizzleクライアントをモック

**移行パターン:**

**Before:**
```typescript
vi.mock("@/lib/prisma", () => ({
  prisma: {
    page: {
      findMany: vi.fn(),
    },
  },
}));
```

**After:**
```typescript
vi.mock("@/drizzle", () => ({
  db: {
    select: vi.fn(),
  },
}));
```

**推奨:**
- モックテストは統合テストに置き換えることを検討
- 実際のDBを使うテストの方が信頼性が高い

### テスト移行のチェックリスト（全体）

#### フェーズ0: テストインフラ
- [ ] `src/tests/db-helpers.ts`をDrizzleに移行
  - [ ] `resetDatabase`を移行
  - [ ] `setupMasterData`を移行
  - [ ] `getSegmentTypeId`を移行
- [ ] `src/tests/test-db-manager.ts`を更新
  - [ ] `runMigrations`から`prisma generate`を削除
  - [ ] `resetPrismaClient`を削除または更新
- [ ] 既存のテストが動作することを確認

#### フェーズ1: 統合テストの移行
- [ ] ページリスト関連のテストを作成
- [ ] ページ詳細関連のテストを移行
- [ ] ミューテーション関連のテストを移行
- [ ] アクション関連のテストを移行

#### フェーズ2: モックテストの移行（オプション）
- [ ] Prismaをモックしているテストを特定
- [ ] Drizzle用のモックに変更、または統合テストに置き換え

### テスト移行の注意事項

#### 1. テストデータの作成
- `factories.ts`は既にDrizzleを使用しているため、そのまま利用可能
- 新しいファクトリー関数が必要な場合は、Drizzleで実装

#### 2. トランザクションの扱い
- Drizzleのトランザクションは`db.transaction()`を使用
- テスト内でトランザクションを使う場合は、Drizzle構文に変更

#### 3. 型安全性
- Drizzleの型を活用して、テストでも型安全性を保つ
- `InferSelectModel`, `InferInsertModel`などを使用

#### 4. パフォーマンス
- 統合テストは実際のDBを使用するため、テスト時間が増える可能性
- テストDBのクローン機能（`setupDbPerFile`）を活用して並列実行を維持

### テスト移行の目安

- **フェーズ0（テストインフラ）**: 2-3時間
- **フェーズ1（統合テスト）**: 4-6時間（テストファイル数による）
- **フェーズ2（モックテスト）**: 1-2時間（オプション）

**合計**: 約7-11時間（フェーズ2含む）

### 推奨される移行順序

1. **まずテストインフラを移行**（フェーズ0）
   - これにより、以降のテスト移行が容易になる
   - 既存のテストが動作することを確認

2. **新機能のテストをDrizzleで作成**
   - 移行済みの機能（`page-list-queries`など）のテストを新規作成
   - 最初からDrizzleで書くことで、移行の手間を省く

3. **既存テストを段階的に移行**（フェーズ1）
   - 機能単位で移行
   - 移行後は即座に動作確認

4. **モックテストは最後**（フェーズ2）
   - 統合テストを優先
   - モックテストは必要に応じて移行または削除

## @rawsql-ts/pg-testkit によるテストインフラの置き換え（検討案）

### 概要

[`@rawsql-ts/pg-testkit`](https://zenn.dev/mkmonaka/articles/c2413d99ae67bb) は「ZeroTableDependency (ZTD)」という手法で、テーブルを作成せずにSQLテストを実行できるライブラリです。

**メリット:**
- マイグレーション、シーディング、クリーンアップが不要
- テストDBのクローンが不要（空のDB 1つでOK）
- データ競合問題を解消し、並列実行に対応
- 高速なテスト実行

### 制約事項

**⚠️ 重要な制約:**
- **ストアドプロシージャ/関数**: 対応不可
- **トリガー**: 対応不可
- **View**: 対応不可

**現在のプロジェクトの状況:**
- ✅ View: 使用していない
- ⚠️ トリガー: `updated_at`の自動更新のみ（`set_updated_at`, `set_updatedat`）
- ⚠️ ストアドプロシージャ: `set_updated_at()`, `set_updatedat()`が存在

### 適用可能性の検討

#### ケース1: 完全適用（推奨度: 低）

**問題点:**
- トリガーが使われているため、ZTDの制約に抵触
- `updated_at`の自動更新がテストで重要な場合、動作しない可能性

**対応策:**
- テストで`updated_at`を手動で設定
- トリガーに依存しないテスト設計に変更

#### ケース2: 部分的適用（推奨度: 中）

**方針:**
- トリガーに依存しないテストのみZTDを使用
- トリガーが必要なテストは従来方式を維持

**メリット:**
- 段階的に導入可能
- リスクが低い

**デメリット:**
- 2つのテストインフラを管理する必要がある

#### ケース3: トリガーをアプリケーション層に移動（推奨度: 高）

**方針:**
- トリガーを削除し、Drizzleのフックやアプリケーション層で`updated_at`を更新
- これによりZTDの制約を回避

**メリット:**
- ZTDを完全に適用可能
- テストが高速化
- アプリケーション層で制御できるため、柔軟性が向上

**デメリット:**
- 既存のトリガーを削除する必要がある
- アプリケーション層での更新処理を実装する必要がある

### 実装例（ケース3を採用した場合）

#### 1. テストクライアントのセットアップ

```typescript
// src/tests/pg-testkit-setup.ts
import { Client } from "pg";
import { createPgTestkitClient } from "@rawsql-ts/pg-testkit";
import * as path from "node:path";

// DDLファイルのパス（Drizzleのスキーマから生成）
const ddlPath = path.resolve(__dirname, "../../drizzle");

export const testClient = createPgTestkitClient({
  connectionFactory: () => new Client({
    connectionString: process.env.TEST_DB || "postgres://postgres:postgres@db.localtest.me:5435/main",
  }),

  // DDLからCREATE TABLEを読み込む
  ddl: {
    directories: [ddlPath],
    extensions: [".sql"],
  },

  // テスト用のfixtures（必要に応じて）
  tableRows: [],
});
```

#### 2. テストDBマネージャーの置き換え

**Before:**
```typescript
// 複雑なDBクローン処理
export async function setupDbPerFile(fileUrl: string) {
  const fileId = getFileId(fileUrl);
  const dbName = `${baseDbName}_test_${fileId}`;
  cloneTemplateDatabase(dbName);
  process.env.DATABASE_URL = buildDbUrl(dbName);
}
```

**After:**
```typescript
// シンプルに空のDBに接続するだけ
export async function setupDbPerFile(fileUrl: string) {
  // 空のDBに接続（テーブルは不要）
  process.env.DATABASE_URL = "postgres://postgres:postgres@db.localtest.me:5435/main";
  // pg-testkitが自動的にCTEに置き換える
}
```

#### 3. テストファイルでの使用例

```typescript
// src/app/[locale]/_db/page-list-queries.server.integration.test.ts
import { testClient } from "@/tests/pg-testkit-setup";
import { db } from "@/drizzle";
import { fetchPagesWithTransform } from "./page-list-queries.server";

// pg-testkitでDrizzleクライアントをラップ
const wrappedDb = testClient.adaptDrizzle(db);

describe("fetchPagesWithTransform", () => {
  it("should fetch pages", async () => {
    // fixturesでテストデータを定義
    const client = testClient.withFixtures({
      tableRows: [
        {
          tableName: "users",
          rows: [
            { id: "user1", handle: "testuser", name: "Test User", email: "test@example.com" },
          ],
        },
        {
          tableName: "pages",
          rows: [
            { id: 1, slug: "test-page", userId: "user1", status: "PUBLIC" },
          ],
        },
      ],
    });

    // ラップされたDBを使用
    const result = await fetchPagesWithTransform(
      { status: "PUBLIC" },
      0,
      10,
      "en",
    );

    expect(result.pageForLists).toHaveLength(1);
  });
});
```

### 移行手順（ケース3を採用した場合）

#### ステップ1: トリガーの削除とアプリケーション層への移行

1. **Drizzleスキーマからトリガー定義を削除**
   - マイグレーションファイルから`CREATE TRIGGER`を削除
   - `set_updated_at()`, `set_updatedat()`関数を削除

2. **アプリケーション層で`updated_at`を更新**
   - Drizzleの`update`時に`updated_at`を明示的に設定
   - または、Drizzleのフック機能を使用

```typescript
// 例: 更新時に自動的にupdated_atを設定
await db.update(pages)
  .set({ 
    ...data,
    updatedAt: new Date(), // 明示的に設定
  })
  .where(eq(pages.id, pageId));
```

#### ステップ2: @rawsql-ts/pg-testkitの導入

1. **パッケージのインストール**
   ```bash
   bun add -D @rawsql-ts/pg-testkit
   ```

2. **テストセットアップファイルの作成**
   - `src/tests/pg-testkit-setup.ts`を作成
   - DDLファイルのパスを設定

3. **テストDBマネージャーの置き換え**
   - `setupDbPerFile`を簡素化
   - DBクローン処理を削除

#### ステップ3: 既存テストの移行

1. **テストファイルを段階的に移行**
   - 新しいテストからZTDを使用
   - 既存テストは動作確認しながら移行

2. **fixturesの定義**
   - テストデータをfixturesとして定義
   - 再利用可能なfixturesを作成

### メリット・デメリットの比較

| 項目 | 従来方式 | ZTD方式 |
|------|---------|---------|
| **DB作成** | テストファイルごとにクローン | 不要（空のDB 1つ） |
| **マイグレーション** | 必要 | 不要（DDLから読み込み） |
| **シーディング** | 必要 | fixturesで定義 |
| **クリーンアップ** | 必要 | 不要（書き込みしない） |
| **並列実行** | 競合に注意が必要 | 問題なし |
| **テスト速度** | やや遅い | 高速 |
| **トリガー対応** | ✅ 対応可能 | ❌ 対応不可 |
| **導入コスト** | 低（既存） | 中（トリガー削除が必要） |

### 推奨事項

1. **短期**: ケース2（部分的適用）を検討
   - トリガーに依存しないテストからZTDを導入
   - リスクを抑えながら効果を検証

2. **長期**: ケース3（トリガー削除 + 完全適用）を検討
   - トリガーをアプリケーション層に移動
   - ZTDを完全に適用してテストを高速化

3. **検証**: まずは小規模なテストで試行
   - 1つのテストファイルでZTDを試す
   - 効果と問題点を確認してから本格導入

### 参考リンク

- [@rawsql-ts/pg-testkit 公式ドキュメント](https://zenn.dev/mkmonaka/articles/c2413d99ae67bb)
- [GitHub: rawsql-ts/pg-testkit](https://github.com/rawsql-ts/pg-testkit)

