# トップページ パフォーマンス調査計画

## 1. 目的

トップページだけが遅い原因を特定し、改善する。

## 2. 確認済みの事実（コード分析）

### 2.1 共通レイアウト（全ページ共通）

`src/app/[locale]/(common-layout)/layout.tsx` は以下の構造:

```tsx
<Suspense fallback={<LayoutSkeleton />}>
  {params.then(async ({ locale }) => {
    const messages = await getMessages();
    return (
      <NextIntlClientProvider ...>
        <Header /> + <main>{children}</main> + <Footer />
      </NextIntlClientProvider>
    );
  })}
</Suspense>
```

- **全ページがこの構造を通る**（トップも記事も同じ）
- `getMessages()` は JSON import（~2KB）
- Header/Footer/children は全て Suspense 内
- → **ここが原因なら記事ページも遅いはず。違う。**

### 2.2 トップページ（ログイン時）

`src/app/[locale]/(common-layout)/page.tsx`:

```tsx
export default async function HomePage(props) {
  const { locale } = await props.params;
  await loadSearchParams(props.searchParams);   // ← searchParams を await
  return (
    <div>
      <Suspense fallback={<SectionSkeleton />}>
        <AboutSection locale={locale} topPage={true} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <NewPageList ... />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <PopularPageList ... />
      </Suspense>
    </div>
  );
}
```

- **ページコンポーネント自体が `async`**
- `await props.params` + `await loadSearchParams(props.searchParams)` がトップレベルにある
- 3つの Suspense 境界を持つ

AboutSection（ログイン時）:
```tsx
const currentUser = await getCurrentUser();
// → auth.api.getSession({ headers: await headers() })
//   → DB: セッション検証
//   → DB: SELECT * FROM users
//   → DB: SELECT * FROM geminiApiKeys
if (topPage && currentUser) return <FloatingControls />;
```

NewPageList / PopularPageList:
- `fetchPaginatedNewPageListsForTopPage()` → `"use cache"` 12時間
- 中身: `buildPageListQuery()` = 4 JOIN + 3 スカラーサブクエリ + `DISTINCT ON`
- 追加: `fetchTagsMap()` + `fetchTotalCount()` = 計3クエリ/リスト

### 2.3 記事ページ（PUBLIC）

`src/app/[locale]/(common-layout)/[handle]/[pageSlug]/page.tsx`:

```tsx
export default function Page({ params }) {        // ← async ではない！
  return (
    <Suspense fallback={<PageSkeleton />}>
      {params.then(async ({ pageSlug, locale }) => {
        const pageDetail = await fetchPageDetail(pageSlug, locale);
        // PUBLIC の場合 getCurrentUser() を呼ばない
        return <PageContent ... />;
      })}
    </Suspense>
  );
}
```

- **ページコンポーネントは同期関数**（`function Page`、`async` なし）
- `params.then()` は Suspense 内
- `fetchPageDetail` は `cacheLife("max")` → 永続キャッシュ
- `getCurrentUser()` は PUBLIC ページでは呼ばれない → `headers()` なし

### 2.4 auth.ts の customSession

```typescript
customSession(async ({ session }) => {
  const currentUser = await db.selectFrom("users").selectAll()...     // 直列クエリ1
  const geminiApiKey = await db.selectFrom("geminiApiKeys").selectAll()... // 直列クエリ2
  return { user: { ... }, session };
})
```

- `getSession()` 1回 = better-auth 内部クエリ + 上記2クエリ = **計3回のDBラウンドトリップ（直列）**

### 2.5 DB接続

```typescript
// src/db/index.ts
// 本番: Neon Serverless（WebSocket接続）
pool = new NeonPool({ connectionString });  // 設定なし（デフォルト）
```

- Neon Serverless はコールドコネクション時にレイテンシが発生する

## 3. トップページと記事ページの決定的な違い

| 観点 | トップページ | 記事ページ（PUBLIC） |
|------|------------|-------------------|
| ページコンポーネント | **`async function`** | **同期 `function`** |
| トップレベル await | `params` + `searchParams` | なし（Suspense内で処理） |
| `headers()` 呼び出し | あり（`getCurrentUser()`） | **なし** |
| DBクエリ（auth） | 3回（直列） | **0回** |
| DBクエリ（データ） | 6クエリ × 2セット | `fetchPageDetail` 1つ |
| キャッシュ寿命 | 12時間 | **永続（"max"）** |
| Suspense の位置 | async 関数の return 内 | **コンポーネント直下** |

### 3.1 最も重要な構造的違い

**記事ページ**: 同期関数 → Suspense を即座に返す → fallback が即表示可能
```
function Page() {
  return <Suspense fallback={skeleton}>{async content}</Suspense>
}
// → skeleton は即座にレンダリングツリーに存在する
```

**トップページ**: async 関数 → await 完了後に初めて Suspense を返す → fallback が遅延
```
async function HomePage() {
  await params;           // ← ここでブロック
  await searchParams;     // ← ここでブロック
  return <Suspense fallback={skeleton}>...</Suspense>
}
// → skeleton は await 完了まで存在しない
```

## 4. 未確認事項（要測定）

- [ ] PPR が実際に有効か（ビルド出力で確認）
- [ ] `await loadSearchParams(props.searchParams)` の実際の所要時間
- [ ] Neon コールドコネクションの実測レイテンシ
- [ ] `getCurrentUser()` の実測所要時間（3クエリ合計）
- [ ] `buildPageListQuery()` のコールドキャッシュ時の実測所要時間
- [ ] Vercel サーバーレス関数のコールドスタート時間

## 5. 仮説

### 仮説1: ページコンポーネントの async 構造が原因（有力）

トップページは `async function` で `await searchParams` がトップレベルにある。
この await が完了するまで、内部の Suspense fallback（SectionSkeleton）がレンダリングツリーに存在しない。

記事ページは同期関数で Suspense を即返すため、fallback が即座に表示される。

**検証方法**: トップページを記事ページと同じパターン（同期関数 + `params.then()`）に書き換えて比較する。

### 仮説2: `headers()` による完全動的化 + DB レイテンシ（併発）

`getCurrentUser()` → `headers()` でルート全体が動的化。
PPR が有効でも、ページコンポーネントが async のため、静的シェルにページ内の Suspense fallback が含まれない。
さらに Neon コールドコネクション + auth 3クエリの直列実行で数百ms〜数秒の遅延。

### 仮説3: `await loadSearchParams(props.searchParams)` が想定より遅い

nuqs の `createLoader` + `searchParams` Promise の解決に予想外の時間がかかっている可能性。

## 6. 改善案

### 案A: ページ構造を記事ページと同じパターンに変更（仮説1対応）

```tsx
// Before: async function
export default async function HomePage(props) {
  const { locale } = await props.params;
  await loadSearchParams(props.searchParams);
  return (
    <div>
      <Suspense><AboutSection /></Suspense>
      ...
    </div>
  );
}

// After: 同期関数 + params.then()
export default function HomePage(props) {
  return (
    <Suspense fallback={<TopPageSkeleton />}>
      {props.params.then(async ({ locale }) => {
        await loadSearchParams(props.searchParams);
        return (
          <div>
            <Suspense><AboutSection /></Suspense>
            ...
          </div>
        );
      })}
    </Suspense>
  );
}
```

**メリット**: Suspense fallback が即座にレンダリング可能になる
**リスク**: 実際の計測で効果を確認する必要がある

### 案B: `getCurrentUser()` をクッキー存在チェックに置換

```tsx
// AboutSection
import { cookies } from "next/headers";
const cookieStore = await cookies();
const hasSession = cookieStore.has("better-auth.session_token")
  || cookieStore.has("__Secure-better-auth.session_token");
if (topPage && hasSession) return <FloatingControls />;
```

**メリット**: DB 3クエリ → 0。ちらつきなし。
**リスク**: 期限切れクッキーでの誤判定（軽微）

### 案C: customSession の並列化

```typescript
// auth.ts
customSession(async ({ session }) => {
  const [currentUser, geminiApiKey] = await Promise.all([
    db.selectFrom("users").selectAll().where("id", "=", session.userId).executeTakeFirst(),
    db.selectFrom("geminiApiKeys").selectAll().where("userId", "=", session.userId).executeTakeFirst(),
  ]);
  // ...
})
```

**メリット**: auth の DB 待ち時間を半減。全ページに効く。
**リスク**: なし

### 案D: Neon 接続プーリング有効化

DATABASE_URL に `?pgbouncer=true` を追加、または Neon の pooler エンドポイントを使用。

**メリット**: コールドコネクションの遅延を削減
**リスク**: 設定変更のみ

## 7. 推奨実施順序

1. **案A**（構造変更）— Suspense fallback を即表示可能にする
2. **案B**（auth 軽量化）— DB クエリ削減
3. **案C**（並列化）— 全ページの auth 高速化
4. **案D**（DB 接続）— インフラ改善
5. 計測して効果を確認
