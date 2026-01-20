# Cache Components 設計ドキュメント

## 現在の実装（実装済み）

### ファイル構成
```
/[locale]/user/[handle]/page/[pageSlug]/
├── page.tsx                              # ルート（アクセス制御、Suspense、metadata）
├── _components/
│   ├── page-content.tsx                  # ページ本体
│   ├── content-with-translations.tsx     # コンテンツ表示
│   ├── page-view-counter/index.tsx       # 閲覧数（サーバーコンポーネント、キャッシュなし）
│   └── preview-banner.tsx                # プレビューバナー
├── _service/
│   ├── generate-page-metadata.ts         # メタデータ生成
│   └── fetch-page-translation-jobs.ts    # 翻訳ジョブ取得（キャッシュ）
└── _db/ (共有)
    └── fetch-page-detail.server.ts       # ページ詳細取得（キャッシュ）
```

### データフロー
```
page.tsx
  ├─ generateMetadata()
  │    └─ fetchPageDetail (キャッシュ) ─────────┐
  │    └─ fetchPageTranslationJobs (キャッシュ) │  同一リクエスト内で
  │                                             │  キャッシュヒット
  └─ Page() ─ Suspense                          │
       └─ fetchPageDetail (キャッシュ) ─────────┤
       └─ アクセス制御                           │
            └─ PageContent                      │
                 └─ fetchPageDetail (キャッシュ)┘
                 └─ PageViewCounter (キャッシュなし、毎回DB)
```

### キャッシュ戦略
| 関数 | キャッシュ | タグ | 更新タイミング |
|------|-----------|------|----------------|
| `fetchPageDetail` | ✅ `cacheLife("max")` | `page:{pageId}` | ページ編集時 |
| `fetchPageTranslationJobs` | ✅ `cacheLife("max")` | `page-translation-jobs:{pageId}` | 翻訳完了時 |
| `PageViewCounter` | ❌ なし | - | 毎アクセス（increment + fetch） |

### アクセス制御
```
PUBLIC ページ  → 誰でもアクセス可能
DRAFT ページ   → ?preview=true + オーナーのみ
ARCHIVE ページ → fetchPageDetail が null を返す（404）
```

### 設計上のトレードオフ

#### fetchPageDetail の複数回呼び出し
同一リクエスト内で `fetchPageDetail` が3回呼ばれる：
1. `generateMetadata` で1回
2. `page.tsx` の Suspense 内で1回（アクセス制御用）
3. `PageContent` で1回

**なぜこの設計か:**
- キャッシュが効くため実際のDB呼び出しは1回
- 各コンポーネントが自己完結し、責務が明確
- props drilling を避けられる

**代替案（採用せず）:**
- `pageDetail` を props で渡す → 型が複雑、コンポーネント間の結合度が上がる

---

## Cache Components の基本概念

### 概念図
```
┌─────────────────────────────────────────────────────────────┐
│                        リクエスト                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  静的シェル（Static Shell）                                  │
│  ビルド時に生成されるHTML                                    │
│  - layout の構造                                            │
│  - 静的なコンポーネント                                      │
│  - use cache でキャッシュされたデータ                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  動的部分（Suspense 境界内）                                 │
│  リクエスト時に解決されるデータ                              │
│  - params（動的ルート）                                      │
│  - cookies / headers                                        │
│  - searchParams                                             │
└─────────────────────────────────────────────────────────────┘
```

### キャッシュできるもの・できないもの

| 種類 | キャッシュ | 説明 |
|------|-----------|------|
| `use cache` 関数の結果 | ✅ できる | DB取得などをキャッシュ |
| 静的な JSX | ✅ できる | 静的シェルに含まれる |
| `params`（動的ルート） | ❌ できない | リクエスト毎に異なる |
| `cookies()` / `headers()` | ❌ できない | リクエスト固有 |
| `searchParams` | ❌ できない | リクエスト固有 |

### 動的ルートでもデータはキャッシュできる

**重要**: 動的ルートでも `use cache` 関数のデータはキャッシュできる。

```tsx
// page.tsx
export default function Page({ params }) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <PageBody slug={slug} />
      ))}
    </Suspense>
  );
}

async function PageBody({ slug }) {
  const data = await fetchData(slug);  // キャッシュされる
  return <div>{data.title}</div>;
}

async function fetchData(slug: string) {
  "use cache";
  cacheLife("max");
  return db.query(slug);
}
```

### なぜ Suspense が必要か

`params` はリクエスト毎に異なるため、`await params` した時点でページ全体が「動的」になってしまう。
Suspense で囲むことで「静的シェルを先に返し、動的部分は後から埋める」という動作になる。

```tsx
// ❌ これだとページ全体が動的になる
export default async function Page({ params }) {
  const { slug } = await params;
  const data = await fetchData(slug);
  return <div>{data.title}</div>;
}

// ✅ 静的シェルを先に返し、動的部分は後から
export default function Page({ params }) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(async ({ slug }) => {
        const data = await fetchData(slug);
        return <div>{data.title}</div>;
      })}
    </Suspense>
  );
}
```

---

## 補足

### `use cache` 関数内での制約
- `notFound()` や例外を投げる処理は避ける
- 代わりに `null` を返し、呼び出し元で `notFound()` を呼ぶ
- 理由: キャッシュ関数は値を返すべきで、例外はキャッシュの動作を不安定にする

### 開発環境でのキャッシュ動作
- 開発環境（`npm run dev`）では `use cache` のキャッシュは効かない
- キャッシュの確認は本番ビルド（`npm run build`）で行う
- ビルド出力で `◐ (Partial Prerender)` と表示されれば Cache Components が正常に機能している

### `generateStaticParams` と Cache Components の関係
- `generateStaticParams` はビルド時にパスを静的生成する機能（SSG）
- `use cache` はデータ取得のキャッシュ機能
- **両者は独立しており、併用も可能**

| ケース | generateStaticParams | use cache |
|--------|---------------------|-----------|
| ビルド時に全ページを事前生成したい | ✅ 必要 | 任意 |
| リクエスト時に動的生成 + キャッシュ | 不要 | ✅ 必要 |

### layout での Suspense が必要なケース
route group（例: `(common-layout)`）の layout で `await params` する場合、子ルートに動的パスがあると Suspense が必要になる。

```
/[locale]/layout.tsx                    → generateStaticParams で locale を静的化 → Suspense 不要
/[locale]/(common-layout)/layout.tsx    → 子に /user/[handle]/page/[pageSlug] がある → Suspense 必要
```

### metadata で cookies() を使う場合
metadata 内で `cookies()` を直接呼ぶ場合は `connection()` マーカーが必要。
現在の実装では `cookies()` を使っていないため不要。

```tsx
// cookies() を使う場合のみ必要
import { connection } from 'next/server'

const Connection = async () => {
  await connection()
  return null
}

function DynamicMarker() {
  return <Suspense><Connection /></Suspense>
}
```
