# Drizzle移行計画

## 現状

- ✅ Drizzleスキーマは完全に定義済み (`src/drizzle/schema.ts`)
- ✅ Drizzleクライアントは実装済み (`src/drizzle/index.ts`)
- ✅ 認証は既にDrizzleを使用 (`src/auth.ts`)
- ⚠️ Prismaは約146箇所で使用中

## 移行方針

### 原則
1. **段階的移行**: 一度に全てを移行せず、機能単位で順次移行
2. **後方互換性**: 移行中はPrismaとDrizzleを併用可能にする
3. **テスト駆動**: 各フェーズでテストを実行し、動作確認
4. **低リスク優先**: 依存関係が少ない機能から移行

### 移行順序の優先度

#### 優先度1: シンプルなクエリ（依存関係が少ない）
- 単一テーブルのSELECT
- シンプルなWHERE句
- 例: `getPageById`, ユーザー情報取得など

#### 優先度2: 中程度の複雑さ
- JOINを含むクエリ
- フィルタリングとソート
- 例: ページリスト取得、検索機能

#### 優先度3: 複雑なクエリ
- ネストしたリレーション
- 集約関数
- 例: `fetchPagesWithTransform`, 統計情報取得

#### 優先度4: ミューテーション
- CREATE/UPDATE/DELETE操作
- 例: ページ作成、コメント投稿、いいね機能

#### 優先度5: トランザクション
- 複数テーブルにまたがる操作
- 例: ページとセグメントの一括更新

#### 優先度6: 型定義
- `@prisma/client`からの型インポートをDrizzle型に置き換え

## 移行手順（各機能ごと）

### 1. クエリファイルの移行

**Before (Prisma):**
```typescript
import { prisma } from "@/lib/prisma";

export async function getPageById(pageId: number) {
  return await prisma.page.findUnique({
    where: { id: pageId },
    include: { user: true },
  });
}
```

**After (Drizzle):**
```typescript
import { db } from "@/drizzle";
import { pages, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function getPageById(pageId: number) {
  const result = await db
    .select({
      page: pages,
      user: users,
    })
    .from(pages)
    .leftJoin(users, eq(pages.userId, users.id))
    .where(eq(pages.id, pageId))
    .limit(1);
  
  return result[0] ? { ...result[0].page, user: result[0].user } : null;
}
```

### 2. ミューテーションファイルの移行

**Before (Prisma):**
```typescript
import { prisma } from "@/lib/prisma";

export async function createPage(data: PageData) {
  return await prisma.page.create({
    data,
  });
}
```

**After (Drizzle):**
```typescript
import { db } from "@/drizzle";
import { pages } from "@/drizzle/schema";

export async function createPage(data: PageData) {
  const [newPage] = await db
    .insert(pages)
    .values(data)
    .returning();
  
  return newPage;
}
```

### 3. トランザクション処理の移行

**Before (Prisma):**
```typescript
await prisma.$transaction(async (tx) => {
  await tx.page.create({ data: pageData });
  await tx.segment.createMany({ data: segments });
});
```

**After (Drizzle):**
```typescript
import { db } from "@/drizzle";

await db.transaction(async (tx) => {
  await tx.insert(pages).values(pageData);
  await tx.insert(segments).values(segments);
});
```

## 移行チェックリスト（各機能ごと）

### 基本チェックリスト
- [ ] クエリ/ミューテーション関数をDrizzleに書き換え
- [ ] 型定義をDrizzle型に更新
- [ ] テストファイルを更新（存在する場合）
- [ ] 動作確認（手動テスト）
- [ ] 既存のPrismaコードを削除
- [ ] インポート文を整理

### 最適化チェックリスト
- [ ] 不要な変換処理（`map()`, `Number()`など）を削除
- [ ] 不要なインターフェース型定義を削除
- [ ] 複数のクエリを`Promise.all`で並列実行またはJOINで統合
- [ ] 共通化できるクエリパターンを関数化
- [ ] 戻り値の型を明示的に指定しない（型推論に任せる）
- [ ] 使用していないPrismaのインポートを削除

## クエリ書き換えのルールとベストプラクティス

### 1. 不要な変換処理を削除する

**❌ 悪い例:**
```typescript
export async function fetchPopularTags(limit: number): Promise<PopularTag[]> {
  const result = await db
    .select({
      id: tags.id,
      name: tags.name,
      _count: {
        pages: count(tagPages.pageId),
      },
    })
    .from(tags)
    .leftJoin(tagPages, eq(tags.id, tagPages.tagId))
    .groupBy(tags.id, tags.name)
    .orderBy(desc(count(tagPages.pageId)))
    .limit(limit);

  // 不要な変換処理
  return result.map((tag) => ({
    id: tag.id,
    name: tag.name,
    _count: {
      pages: Number(tag._count.pages),
    },
  }));
}
```

**✅ 良い例:**
```typescript
export async function fetchPopularTags(limit: number) {
  return await db
    .select({
      id: tags.id,
      name: tags.name,
      _count: {
        pages: count(tagPages.pageId),
      },
    })
    .from(tags)
    .leftJoin(tagPages, eq(tags.id, tagPages.tagId))
    .groupBy(tags.id, tags.name)
    .orderBy(desc(count(tagPages.pageId)))
    .limit(limit);
}
```

**ルール:**
- Drizzleの型推論を活用し、クエリ結果をそのまま返す
- 不要な`map()`や`Number()`変換は削除
- 型定義も不要（Drizzleが自動推論）

### 2. 不要なインターフェース型定義を削除する

**❌ 悪い例:**
```typescript
interface PopularTag {
  id: number;
  name: string;
  _count: {
    pages: number;
  };
}

export async function fetchPopularTags(limit: number): Promise<PopularTag[]> {
  // ...
}
```

**✅ 良い例:**
```typescript
export async function fetchPopularTags(limit: number) {
  // Drizzleの型推論に任せる
  return await db.select(...);
}

// 型が必要な場合は、使用側で推論
export type PopularTag = Awaited<ReturnType<typeof fetchPopularTags>>[number];
```

**ルール:**
- 関数の戻り値型は明示的に指定しない（型推論に任せる）
- 型が必要な場合は`Awaited<ReturnType<...>>`を使用

### 3. 複数のクエリを最適化する

**❌ 悪い例（逐次実行）:**
```typescript
export async function getPageLikeAndCount(pageId: number, currentUserId: string) {
  // 1つ目のクエリ
  const [{ count: likeCount }] = await db
    .select({ count: count() })
    .from(likePages)
    .where(eq(likePages.pageId, pageId));

  // 2つ目のクエリ（逐次実行）
  let liked = false;
  if (currentUserId) {
    const existingLike = await db
      .select()
      .from(likePages)
      .where(and(eq(likePages.pageId, pageId), eq(likePages.userId, currentUserId)))
      .limit(1);
    liked = !!existingLike[0];
  }

  return { likeCount: Number(likeCount), liked };
}
```

**✅ 良い例（並列実行）:**
```typescript
export async function getPageLikeAndCount(pageId: number, currentUserId: string) {
  // Promise.allで並列実行
  const [likeCountResult, userLikeResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(likePages)
      .where(eq(likePages.pageId, pageId)),
    currentUserId
      ? db
          .select()
          .from(likePages)
          .where(
            and(
              eq(likePages.pageId, pageId),
              eq(likePages.userId, currentUserId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    likeCount: Number(likeCountResult[0]?.count ?? 0),
    liked: !!userLikeResult[0],
  };
}
```

**ルール:**
- 独立した複数のクエリは`Promise.all`で並列実行
- JOINで1つのクエリにまとめられる場合はJOINを優先

### 4. JOINでクエリを統合する

**❌ 悪い例（2つのクエリ）:**
```typescript
export async function fetchGeminiApiKeyByHandle(handle: string) {
  // 1つ目: ユーザー取得
  const user = await db
    .select()
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);
  
  if (!user[0]) return null;

  // 2つ目: APIキー取得
  const apiKey = await db
    .select()
    .from(geminiApiKeys)
    .where(eq(geminiApiKeys.userId, user[0].id))
    .limit(1);
  
  return apiKey[0] ?? null;
}
```

**✅ 良い例（1つのクエリ）:**
```typescript
export async function fetchGeminiApiKeyByHandle(handle: string) {
  const result = await db
    .select({ apiKey: geminiApiKeys.apiKey })
    .from(users)
    .innerJoin(geminiApiKeys, eq(users.id, geminiApiKeys.userId))
    .where(eq(users.handle, handle))
    .limit(1);

  return result[0]?.apiKey ?? null;
}
```

**ルール:**
- 関連するデータはJOINで1つのクエリにまとめる
- 必要なフィールドのみを`select`で指定

### 5. count()の型変換に注意する

**ルール:**
- Drizzleの`count()`は`bigint`を返す可能性がある
- 数値として使用する場合は`Number()`変換が必要
- ただし、型推論で`number`になる場合は変換不要

```typescript
// count()の結果を使用する場合
const [{ count: likeCount }] = await db
  .select({ count: count() })
  .from(likePages);

// bigintの可能性があるため、Number()変換が必要
return { likeCount: Number(likeCount) };
```

### 6. 共通化できるクエリパターンは関数化する

**✅ 良い例:**
```typescript
// 共通のセグメント選択フィールド
const segmentSelect = {
  id: segments.id,
  number: segments.number,
  text: segments.text,
} as const;

// 共通のセグメント取得関数
async function getSegments(where: SQL) {
  return await db.select(segmentSelect).from(segments).where(where);
}

// 各用途で再利用
export async function getPageSegments(pageId: number) {
  return await db
    .select(segmentSelect)
    .from(segments)
    .innerJoin(contents, eq(segments.contentId, contents.id))
    .innerJoin(pages, eq(contents.id, pages.id))
    .where(eq(pages.id, pageId));
}

export async function getAnnotationSegments(contentId: number) {
  return getSegments(eq(segments.contentId, contentId));
}
```

**ルール:**
- 同じパターンのクエリは共通関数に抽出
- `as const`で型を固定し、再利用性を高める

### 7. DISTINCT ONなどはraw SQLを使用する

**✅ 良い例:**
```typescript
export async function fetchTranslationJobs(pageId: number) {
  // DISTINCT ONはDrizzleのクエリビルダーで直接サポートされていないため、raw SQLを使用
  const result = await db.execute(
    sql`
      SELECT DISTINCT ON (locale) *
      FROM ${translationJobs}
      WHERE ${translationJobs.pageId} = ${pageId}
        AND ${translationJobs.status} = 'COMPLETED'
      ORDER BY ${translationJobs.locale} ASC, ${translationJobs.createdAt} DESC
    `,
  );
  return result.rows as InferSelectModel<typeof translationJobs>[];
}
```

**ルール:**
- PostgreSQL固有の機能（DISTINCT ONなど）は`sql`テンプレートを使用
- 型安全性を保つため、`InferSelectModel`で型アサーション

### 8. 戻り値の型は必要最小限に

**❌ 悪い例:**
```typescript
export async function fetchUserByHandle(
  handle: string,
): Promise<InferSelectModel<typeof users> | null> {
  // ...
}
```

**✅ 良い例:**
```typescript
export async function fetchUserByHandle(handle: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);
  return result[0] ?? null;
}
```

**ルール:**
- 戻り値の型は明示的に指定しない（型推論に任せる）
- 型が必要な場合は使用側で`Awaited<ReturnType<...>>`を使用

### 9. インポートの整理

**✅ 良い例:**
```typescript
// Drizzle関連のインポートをまとめる
import { db } from "@/drizzle";
import { pages, users } from "@/drizzle/schema";
import { eq, and, count, desc } from "drizzle-orm";

// 型が必要な場合のみインポート
import type { InferSelectModel } from "drizzle-orm";
```

**ルール:**
- Drizzle関連のインポートをまとめる
- 使用していないPrismaのインポートは削除
- 型インポートは`type`キーワードを使用

## 注意事項

### 1. リレーションの扱い
- Prismaの`include`はDrizzleでは明示的なJOINが必要
- 複雑なリレーションは複数クエリに分割する場合がある

### 2. 型安全性
- Drizzleはより厳密な型チェック
- `InferSelectModel`と`InferInsertModel`を活用
- ただし、不要な型定義は削除し、型推論に任せる

### 3. パフォーマンス
- Drizzleはより細かい制御が可能
- 必要に応じてクエリを最適化
- 複数のクエリは`Promise.all`で並列実行
- JOINで統合できる場合は統合する

### 4. エラーハンドリング
- Prismaのエラー型とDrizzleのエラー型は異なる
- エラーハンドリングロジックを更新

## 完了後のクリーンアップ

1. `prisma/schema.prisma`の削除
2. `src/lib/prisma.ts`の削除
3. `@prisma/client`依存関係の削除
4. Prisma関連のスクリプトの削除/更新
5. ドキュメントの更新

## 移行の実装例

### 例1: シンプルなクエリ（getPageById）

**移行前 (Prisma):**
```typescript
// src/app/[locale]/_db/queries.server.ts
import { prisma } from "@/lib/prisma";

export async function getPageById(pageId: number) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: {
      user: {
        select: selectUserFields(),
      },
    },
  });
  return page;
}
```

**移行後 (Drizzle):**
```typescript
// src/app/[locale]/_db/queries.server.ts
import { db } from "@/drizzle";
import { pages, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { Page, User } from "@/drizzle/types";

export async function getPageById(pageId: number): Promise<(Page & { user: User }) | null> {
  const result = await db
    .select({
      page: pages,
      user: users,
    })
    .from(pages)
    .leftJoin(users, eq(pages.userId, users.id))
    .where(eq(pages.id, pageId))
    .limit(1);
  
  if (!result[0]) return null;
  
  return {
    ...result[0].page,
    user: result[0].user,
  };
}
```

### 例2: 複雑なクエリ（ページリスト取得）

**移行前 (Prisma):**
```typescript
export async function fetchPagesWithTransform(
  where: Prisma.PageWhereInput,
  skip: number,
  take: number,
  locale: string,
) {
  const [rawPages, total] = await Promise.all([
    prisma.page.findMany({
      where,
      skip,
      take,
      select: selectPageListFields(locale),
    }),
    prisma.page.count({ where }),
  ]);
  return { pageForLists: rawPages, total };
}
```

**移行後 (Drizzle):**
```typescript
import { db } from "@/drizzle";
import { pages, users, contents, segments, segmentTranslations } from "@/drizzle/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

export async function fetchPagesWithTransform(
  where: { status?: string; userId?: string; parentId?: number | null },
  skip: number,
  take: number,
  locale: string,
) {
  // WHERE条件の構築
  const conditions = [];
  if (where.status) {
    conditions.push(eq(pages.status, where.status));
  }
  if (where.userId) {
    conditions.push(eq(pages.userId, where.userId));
  }
  if (where.parentId !== undefined) {
    conditions.push(eq(pages.parentId, where.parentId));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  // ページとユーザーを取得
  const rawPages = await db
    .select({
      page: pages,
      user: users,
    })
    .from(pages)
    .leftJoin(users, eq(pages.userId, users.id))
    .where(whereClause)
    .orderBy(desc(pages.createdAt))
    .limit(take)
    .offset(skip);
  
  // 総数を取得
  const [{ count: total }] = await db
    .select({ count: count() })
    .from(pages)
    .where(whereClause);
  
  // セグメントと翻訳を取得（必要に応じて別クエリで）
  // ここでは簡略化のため省略
  
  return { pageForLists: rawPages, total: Number(total) };
}
```

### 例3: ミューテーション（ページ作成）

**移行前 (Prisma):**
```typescript
export async function createPage(data: {
  id: number;
  slug: string;
  userId: string;
  mdastJson: Prisma.InputJsonValue;
}) {
  return await prisma.page.create({
    data,
  });
}
```

**移行後 (Drizzle):**
```typescript
import { db } from "@/drizzle";
import { pages } from "@/drizzle/schema";
import type { PageInsert } from "@/drizzle/types";

export async function createPage(data: PageInsert): Promise<Page> {
  const [newPage] = await db
    .insert(pages)
    .values(data)
    .returning();
  
  return newPage;
}
```

### 例4: トランザクション

**移行前 (Prisma):**
```typescript
await prisma.$transaction(async (tx) => {
  const page = await tx.page.create({ data: pageData });
  await tx.segment.createMany({ data: segments });
  return page;
});
```

**移行後 (Drizzle):**
```typescript
import { db } from "@/drizzle";
import { pages, segments } from "@/drizzle/schema";

const result = await db.transaction(async (tx) => {
  const [page] = await tx
    .insert(pages)
    .values(pageData)
    .returning();
  
  await tx.insert(segments).values(segments);
  
  return page;
});
```

## 型定義の移行

### Prisma型からDrizzle型への置き換え

**移行前:**
```typescript
import type { User, Page, SegmentTranslation } from "@prisma/client";
```

**移行後:**
```typescript
import type { User, Page, SegmentTranslation } from "@/drizzle/types";
```

### カスタム型の更新

**移行前:**
```typescript
// src/app/types.ts
import type { User } from "@prisma/client";

export type SanitizedUser = Omit<User, "email" | "provider" | "emailVerified" | "id">;
```

**移行後:**
```typescript
// src/app/types.ts
import type { User } from "@/drizzle/types";

export type SanitizedUser = Omit<User, "email" | "provider" | "emailVerified" | "id">;
```

## 参考リソース

- [Drizzle ORM ドキュメント](https://orm.drizzle.team/)
- [Prisma → Drizzle 移行ガイド](https://orm.drizzle.team/docs/migrations)
- [Drizzle Query Builder](https://orm.drizzle.team/docs/select)
- [Drizzle Relations](https://orm.drizzle.team/docs/relations)

