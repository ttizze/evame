# フェーズ2移行計画: page-list-queries.server.ts

## 現状分析

### `fetchPagesWithTransform`が取得しているデータ構造

```typescript
// PrismaのselectPageListFieldsが返す構造
{
  // ページ基本情報
  id, slug, createdAt, status, sourceLocale, parentId, order,
  
  // ユーザー情報
  user: { id, name, handle, image, createdAt, updatedAt, profile, twitterHandle, totalPoints, isAI, plan },
  
  // コンテンツ（セグメント）
  content: {
    segments: [
      {
        id, number, text,
        segmentType: { key, label },
        segmentTranslations: [
          {
            segmentId, userId, id, locale, text, point, createdAt,
            user: { ...selectUserFields() }
          } // point desc, createdAt desc でソート、1件のみ
        ]
      } // number: 0 のセグメントのみ
    ]
  },
  
  // タグ
  tagPages: [
    { tag: { id, name } }
  ],
  
  // カウント
  _count: {
    pageComments: number,
    children: number
  }
}
```

## 移行戦略

### アプローチ: 複数クエリに分割して後で結合

Drizzleでは複雑なネストしたリレーションを1つのクエリで取得するのが難しいため、以下のように分割：

1. **メインクエリ**: ページ + ユーザー + カウント（サブクエリ）
2. **セグメントクエリ**: ページIDのリストに対して一括取得
3. **タグクエリ**: ページIDのリストに対して一括取得
4. **後処理**: JavaScriptでデータを結合

### 実装ステップ

#### ステップ1: メインクエリ（ページ + ユーザー + カウント）

```typescript
// WHERE条件の構築ヘルパー
function buildWhereConditions(where: Prisma.PageWhereInput): SQL | undefined {
  const conditions: SQL[] = [];
  
  if (where.status) conditions.push(eq(pages.status, where.status));
  if (where.userId) conditions.push(eq(pages.userId, where.userId));
  if (where.parentId === null) conditions.push(isNull(pages.parentId));
  else if (where.parentId !== undefined) conditions.push(eq(pages.parentId, where.parentId));
  if (where.id?.in) conditions.push(inArray(pages.id, where.id.in));
  
  // content.segments.some 条件（検索用）
  if (where.content?.segments?.some) {
    // サブクエリで実装
  }
  
  // tagPages.some 条件（タグ検索用）
  if (where.tagPages?.some) {
    // サブクエリで実装
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined;
}

// ORDER BY条件の構築ヘルパー
function buildOrderBy(orderBy?: Prisma.PageOrderByWithRelationInput | Prisma.PageOrderByWithRelationInput[]) {
  if (!orderBy) return [desc(pages.createdAt)];
  
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  const drizzleOrders: SQL[] = [];
  
  for (const order of orders) {
    if (order.createdAt) {
      drizzleOrders.push(order.createdAt === 'desc' ? desc(pages.createdAt) : pages.createdAt);
    }
    if (order.likePages?._count) {
      // サブクエリでlikePagesのカウントを取得してソート
    }
  }
  
  return drizzleOrders.length > 0 ? drizzleOrders : [desc(pages.createdAt)];
}
```

#### ステップ2: セグメント取得クエリ

```typescript
async function fetchSegmentsForPages(
  pageIds: number[],
  locale: string
) {
  if (pageIds.length === 0) return [];
  
  // セグメント（number: 0のみ）とセグメント翻訳を取得
  const segmentsWithTranslations = await db
    .select({
      segment: segments,
      segmentType: {
        key: segmentTypes.key,
        label: segmentTypes.label,
      },
      translation: {
        id: segmentTranslations.id,
        segmentId: segmentTranslations.segmentId,
        userId: segmentTranslations.userId,
        locale: segmentTranslations.locale,
        text: segmentTranslations.text,
        point: segmentTranslations.point,
        createdAt: segmentTranslations.createdAt,
      },
      translationUser: {
        id: users.id,
        name: users.name,
        handle: users.handle,
        image: users.image,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        profile: users.profile,
        twitterHandle: users.twitterHandle,
        totalPoints: users.totalPoints,
        isAI: users.isAI,
        plan: users.plan,
      },
    })
    .from(segments)
    .innerJoin(segmentTypes, eq(segments.segmentTypeId, segmentTypes.id))
    .leftJoin(segmentTranslations, and(
      eq(segments.id, segmentTranslations.segmentId),
      eq(segmentTranslations.locale, locale)
    ))
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
  
  // 各セグメントに対して最良の翻訳を1件のみ取得（DISTINCT ON相当）
  // または、取得後にJavaScriptで処理
}
```

**問題**: `DISTINCT ON`が必要（各セグメントに対して最良の翻訳を1件のみ）

**解決策**: 
- PostgreSQLの`DISTINCT ON`を使用（raw SQL）
- または、取得後にJavaScriptで`pickBestTranslation`相当の処理

#### ステップ3: タグ取得クエリ

```typescript
async function fetchTagsForPages(pageIds: number[]) {
  if (pageIds.length === 0) return [];
  
  return await db
    .select({
      pageId: tagPages.pageId,
      tag: tags,
    })
    .from(tagPages)
    .innerJoin(tags, eq(tagPages.tagId, tags.id))
    .where(inArray(tagPages.pageId, pageIds));
}
```

#### ステップ4: カウント取得（サブクエリ）

```typescript
// メインクエリに含める
const pageCommentsCount = sql<number>`(
  SELECT COUNT(*)::int
  FROM ${pageComments}
  WHERE ${pageComments.pageId} = ${pages.id}
  AND ${pageComments.isDeleted} = false
)`;

const childrenCount = sql<number>`(
  SELECT COUNT(*)::int
  FROM ${pages} AS children
  WHERE children.parent_id = ${pages.id}
  AND children.status = 'PUBLIC'
)`;
```

#### ステップ5: データ結合

```typescript
// 取得したデータを結合
const pageForLists = rawPages.map((page) => {
  const pageSegments = segmentsByPageId.get(page.id) || [];
  const pageTags = tagsByPageId.get(page.id) || [];
  
  return {
    ...page,
    content: {
      segments: pickBestTranslation(pageSegments),
    },
    tagPages: pageTags.map(tag => ({ tag })),
    _count: {
      pageComments: page.pageCommentsCount,
      children: page.childrenCount,
    },
  };
});
```

## 課題と解決策

### 課題1: DISTINCT ON（セグメント翻訳の最良1件のみ）

**解決策A**: PostgreSQLの`DISTINCT ON`を使用（raw SQL）

```typescript
const segmentsWithBestTranslation = await db.execute(sql`
  SELECT DISTINCT ON (s.id)
    s.*,
    st.*,
    u.*
  FROM ${segments} s
  INNER JOIN ${segmentTypes} st ON s.segment_type_id = st.id
  LEFT JOIN LATERAL (
    SELECT *
    FROM ${segmentTranslations} st2
    WHERE st2.segment_id = s.id
      AND st2.locale = ${locale}
    ORDER BY st2.point DESC, st2.created_at DESC
    LIMIT 1
  ) st ON true
  LEFT JOIN ${users} u ON st.user_id = u.id
  WHERE s.content_id = ANY(${pageIds})
    AND s.number = 0
`);
```

**解決策B**: 取得後にJavaScriptで処理（シンプルだが非効率）

```typescript
// 全翻訳を取得してから、各セグメントに対して最良の1件を選択
const segments = await db.select(...).from(segments)...
// JavaScriptでグループ化して最良の1件を選択
```

**推奨**: 解決策A（パフォーマンス重視）

### 課題2: 複雑なWHERE条件（content.segments.some, tagPages.some）

**解決策**: サブクエリまたはEXISTS句を使用

```typescript
// content.segments.some 条件
if (where.content?.segments?.some) {
  const segmentCondition = where.content.segments.some;
  if (segmentCondition.text?.contains) {
    conditions.push(
      exists(
        db
          .select()
          .from(segments)
          .where(
            and(
              eq(segments.contentId, pages.id),
              ilike(segments.text, `%${segmentCondition.text.contains}%`),
              segmentCondition.number !== undefined 
                ? eq(segments.number, segmentCondition.number)
                : undefined
            )
          )
      )
    );
  }
}

// tagPages.some 条件
if (where.tagPages?.some?.tag?.name) {
  conditions.push(
    exists(
      db
        .select()
        .from(tagPages)
        .innerJoin(tags, eq(tagPages.tagId, tags.id))
        .where(
          and(
            eq(tagPages.pageId, pages.id),
            eq(tags.name, where.tagPages.some.tag.name)
          )
        )
    )
  );
}
```

### 課題3: ソート（likePages._count）

**解決策**: サブクエリでカウントを取得してソート

```typescript
const likeCount = sql<number>`(
  SELECT COUNT(*)::int
  FROM ${likePages}
  WHERE ${likePages.pageId} = ${pages.id}
)`;

// ORDER BYで使用
.orderBy(desc(likeCount), desc(pages.createdAt))
```

## 実装順序

1. ✅ インポート文の更新
2. ⏳ WHERE条件構築ヘルパーの実装
3. ⏳ ORDER BY条件構築ヘルパーの実装
4. ⏳ メインクエリの実装（ページ + ユーザー + カウント）
5. ⏳ セグメント取得クエリの実装（DISTINCT ON使用）
6. ⏳ タグ取得クエリの実装
7. ⏳ データ結合処理の実装
8. ⏳ `fetchPagesWithTransform`の完成
9. ⏳ その他の関数の移行（`fetchPaginatedNewPageLists`, `fetchPaginatedPopularPageLists`, `fetchChildPages`, `searchPagesByTitle`, `searchPagesByTag`, `searchPagesByContent`）

## 注意事項

- `pickBestTranslation`は既存の関数を使用（変更不要）
- 型定義は型推論に任せる（明示的な型指定は最小限に）
- パフォーマンステストを実施（特にセグメント取得部分）
- エラーハンドリングを追加

