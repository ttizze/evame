# セクション分割ページネーション設計

## 問題

長い本文（5000セグメント、11MB HTML）を一度にレンダリングすると重い。

## 要件

- SEO: 検索結果は本体URLに出したい
- SEO: クローラが全文に到達できればOK（初期HTMLに全文は必須ではない）
- スクロールで自動読み込み（ページ移動なし）
- 長文でもスクロールが重くならない（DOM増加・水和・レイアウトを抑える）

## 設計

### 全体像（推奨）

- **本体URL**: `/user/.../page/...`
  - ユーザー向けの軽量表示（無限スクロール）
  - canonical は本体URL（検索結果も本体URL）
- **クロール用セクションURL**: `/user/.../page/.../section/[n]`
  - 各セクションを SSR で HTML として返す
  - `rel="prev/next"` とセクションリンクを置き、クローラが 0→N を辿れる
  - canonical は本体URL（重複回避、分割URLが検索結果に出るのを抑える）

これにより「検索で来たユーザーは軽い本体URL」「クローラは section で全文到達」が両立できる。

### 実装の現状（このリポの今の流れ / 現時点）

現状は「section=0 だけ SSR し、追加セクションは無限スクロールで追記」する。
（長文でも初期HTMLと初期水和を小さくする）

### 取得APIの設計（これから整理する）

「ページ表示」と「追加セクション取得」は要件が違うので、取得APIも用途で分ける。
こうすると責務が明確になり、`options` が肥大化しない。

#### `fetchPage(slug, locale)`

本体ページ（SSR）のための取得。分割するかどうかの判定もここで行う（service）。

- 返すもの
  - `segments` に title segment（`number=0`）が含まれる
  - `mdastJson`（section=0 のみ、または分割しないページなら全文）
  - `segments`（その `mdastJson` に必要な分だけ）
  - `section / totalSections / hasMoreSections`
- 「短いページは分割しない」を内部で吸収する
  - `totalSegments < 500` の場合、`totalSections=1` として全文を返してよい

#### `fetchPageSection(slug, locale, section)`

無限スクロール（`/api/page-sections`）のための取得。

- 返すもの
  - `mdastJson`（指定 section のみ）
  - `segments`（その section に必要な分だけ）
  - `section / totalSections / hasMoreSections`
- title（`number=0`）は返さない
  - title は本体ページで1回だけ取って表示する（`fetchPage` で取得する）
  - section取得は本文追加が目的なので title は不要

### 内部共通化（重複させない）

用途別APIは分けつつ、内部は共通化して1回の実装で済むようにする。

- `countSegmentsByContentId(page.id)`（= DBの `segments` 件数。分割するかの判定用）
- `sliceMdastSection(mdastJson, section)`（セクション分割）
  - `sliceMdastSection` 自体は「境界に沿って slice する」だけ。`500` 判定は `fetchPage` 側（service）で行う
- `collectSegmentNumbersFromMdast(mdastSlice)` → `fetchSegmentsByNumbers(...)`（必要segmentsだけ）
- title（`number=0`）は section=0（初期表示）側で含める

### `meta`（ページ付帯情報）の設計方針

`fetchPageMetaBySlug(slug)` のように「いったん meta をまとめて取る」設計は便利だが、用途によっては過剰取得になりやすい。
特に `/api/page-sections` は複数回呼ばれるので、不要な付帯情報が混ざるとコストが雪だるま式に増える。

#### 用語整理（このルートでの前提）

- **Page core**: 「セクション分割と本文レンダリング」に最低限必要なもの
  - 例: `page.id / page.slug / page.status / page.mdastJson / page.user(必要なら)`
- **Page decorations**: 画面に付け足す情報（本文の切り出しには不要）
  - 例: `tags / counts（comments, children）/ viewCount / translationJobs`

#### ルール

- `meta` という名前を使うなら **含めるものを明文化**する（曖昧な“なんでも詰め合わせ”にしない）
- 1リクエストで完結する SSR 取得（`fetchPage`）は「利便性のためのまとめ取り」を許容してよい
- 複数回呼ばれる API（`fetchPageSection` / `/api/page-sections`）は **core のみ**を取得し、decorations は取らない
- service は「用途に必要なデータだけ」を組み立て、`_db` は「クエリ部品」に徹する
  - 例: `fetchPageCoreBySlug` と `fetchPageDecorationsByPageId` を分け、必要な側だけを service で合成する

#### 期待する効果

- 「section取得で tags/counts を毎回引く」みたいな隠れコストを防げる
- `fetchPage` 側の返却形（SSR都合）と `fetchPageSection` 側（無限スクロール都合）で責務が混ざりにくい
- “meta” の拡張が起きても、影響範囲を service 内に閉じ込められる

実装上は、`fetchPage` / `fetchPageAllSection` / `fetchPageSection` は `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_service/fetch-page.server.ts` に置く。

DBクエリの部品（`fetchPageBasicBySlug` など）は `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_db/fetch-page-detail.server.ts` に置く。

この構造なら「長いときだけ分割」でも短いときでも破綻しない。

#### 1) 本体ページ（`/[locale]/user/[handle]/page/[pageSlug]`）

- `page.tsx` → `fetchPageContext(slug, locale)` を呼ぶ
- `fetchPageContext` → `fetchPage(slug, locale)` で **表示に必要な** `mdastJson(section=0 or 全文)` と `segments` を取得する
- `PageContent` → `ContentWithTranslations` → `mdastToReact({ mdast: pageDetail.mdastJson, segments: pageDetail.content.segments })`
  - `mdastToReact` は `rehype-react` + `WrapSegment` により `data-number-id` をキーに `segments` を差し込む
  - クリックで翻訳UIを開く等の挙動は、`interactive=true`（デフォルト）のレンダリングで実現している
  - タイトルは `segments(number=0)` を `<h1>` で描画する

#### 2) セクション分割（実装済み）

- `fetchPageSection(slug, locale, section)` が **section 単位**で `mdastJson` と `segments` を返す
- `SectionLoader` が `GET /api/page-sections?slug=...&locale=...&section=n` で次の section を取得して追記する
- セクション境界は `###`（mdast の `heading depth=3`）を基準にし、`totalSegments < 500` の場合は分割しない

#### `fetchPageAllSection(slug, locale)`

常に全文を返す取得（分割しない）。
About など「必ず全文で良い」用途向け。

#### 3) `/api/page-sections` は何のため？

`/api/page-sections` は **無限スクロール用**のエンドポイント。

- 目的: 本体ページの初期表示を軽くするため、追加セクションを「必要になったタイミングで」取得する
- 想定クライアント: `SectionLoader`（IntersectionObserver）
- 返すもの: **HTML文字列ではなく** `{ mdastJson, segments, section, hasMore, totalSections }` の JSON
  - 受け取った mdast をクライアントで React としてレンダして追記する（`dangerouslySetInnerHTML` は使わない）
- SEO目的ではない（クローラに全文を辿らせるのは `/section/[n]` の SSR ルートでやる）

#### 3) 翻訳の「最良」選択（DBクエリ）

- `fetchSegments` は `DISTINCT ON(segmentTranslations.segmentId)` で各セグメントの翻訳を1件に絞る
  - 現状の実装は `point / createdAt` で決めている

### データ構造

```
mdast = {
  type: "root",
  children: [node0, node1, ..., node1073]
}
```

各nodeに`data.hProperties["data-number-id"]`でセグメント番号が埋め込まれている。

### セクション分割

見出し（heading）単位で分割する。

- **基本方針**: 「見出し（例: `depth=3`）をセクション開始点」とし、その見出しから次の見出し直前までを1セクションにする
- **このリポの想定**: Tipitaka系の本文は `### ...`（= `depth=3`）で小見出しが付くことが多いので、基本は `depth=3` を境界にする
- **section=0**: 本文先頭〜最初の見出し直前（導入）を 0 とする（導入が無い場合は最初の見出しから開始）
- **見出しが無い場合**: フォールバックとして固定幅（例: Nノード）や「全体を1セクション」にする
- **分割しない条件（くっつける）**: mdast 全体の `data-number-id` 数（= `totalSegments`）が **500未満** のときは、分割せず「全体を1セクション」として扱ってよい（この判定は `fetchPage` 側のポリシー）

mdast の `children` が `[node0, node1, ...]` の配列だとして、擬似コード:

```
starts = [0] + indexesWhere(node.type==="heading" && node.depth===3)
rawTotalSections = starts.length
totalSegments = countUniqueDataNumberId(mdast)

// 「分割するか」の判定は fetchPage 側のポリシー
if (totalSegments < 500) {
  // 分割しない: section=0 が全文
  mdast = { type:"root", children }
  totalSections = 1
  hasMore = false
} else {
  // 分割する: section(i) は starts に沿って slice
  section(i) = children.slice(starts[i], starts[i+1] ?? children.length)
  totalSections = rawTotalSections
}
```

セクション内で必要な `segments` は「そのセクションの mdast に含まれる `data.hProperties["data-number-id"]` を集めて」取得する。
（セグメント番号の連番を前提にしない）

#### 典型的な mdast と分割例

Tipitaka系 Markdown（`### 1. Brahmajālasuttaṃ` みたいな見出し）を mdast にすると、概ねこういう `children` になる想定。
（実物はもっとノード種があるけど、分割に必要なところだけ抜粋）

```
mdast = {
  type: "root",
  children: [
    // 導入（見出し前）
    { type: "paragraph", data: { hProperties: { "data-number-id": 0 } } },
    { type: "paragraph", data: { hProperties: { "data-number-id": 1 } } },

    // ### 1. ...
    { type: "heading", depth: 3, children: [{ type: "text", value: "1. Brahmajālasuttaṃ" }] },
    { type: "paragraph", data: { hProperties: { "data-number-id": 2 } } },
    { type: "paragraph", data: { hProperties: { "data-number-id": 3 } } },

    // ### 2. ...
    { type: "heading", depth: 3, children: [{ type: "text", value: "2. ..." }] },
    { type: "paragraph", data: { hProperties: { "data-number-id": 4 } } },
  ]
}
```

このときの境界と section はこうなる:

```
boundaries = [0, 2, 5] // children の「区切り位置」。0 は先頭なので必ず入れる。2/5 は ### 見出し（depth=3）の位置

// slice(a, b) は「a番目から b番目の直前まで（bは含まない）」を取り出す
section(0) = children.slice(0, 2)  // children[0], children[1]（見出しより前の導入）
section(1) = children.slice(2, 5)  // children[2]..children[4]（### 1 見出し〜次の ### 直前）
section(2) = children.slice(5, 7)  // children[5]..末尾（### 2 見出し〜末尾）
```

`collectSegmentNumbers(section(1))` の結果例:

```
[2, 3] // heading にも data-number-id が付いている場合は、それも含めて収集する
```

#### 分割した section はどんなデータになる？

上の `section(i)` は「`children` の一部分（配列）」だけど、実際にアプリ内で扱うときは **root を付け直した mdast** にする。
（`mdastToReact` / `unified` に渡すのは `type: "root"` を持つノードが前提のため）

例: `section(1)` を mdast として扱う場合:

```
mdastSection1 = {
  type: "root",
  children: children.slice(2, 5),
}
```

この `mdastSection1` に含まれるノードは「`### 1` の見出しノード + その本文ノード」一式で、次の見出し（`### 2`）は入らない。

同時に、DB取得用のセグメント番号は `collectSegmentNumbers(mdastSection1)` で集めた配列になる（例: `[2, 3]`）。

> root が無い（`children` 配列だけ）だと、`unified().run(...)` にそのまま渡せずエラーになりやすいので、この設計では「必ず root に包む」で統一する。

> `totalSegments < 500` の場合は「くっつける」ので、fetch 側で `totalSections=1` として「section=0=全文」を返す。

## 処理フロー

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 初期表示（SSR）                                           │
│                                                             │
│    fetchPageContext                                         │
│    ├─ fetchPage(slug, locale)                                │
│    │   └─ mdastJson(section=0 or 全文) + segments(必要分)     │
│    │   └─ title segment(number=0) を含めて返す                │
│    └─ return { pageDetail, ... }                            │
│                                                             │
│    ContentWithTranslations                                  │
│    ├─ <h1> は segments(number=0) を描画                      │
│    └─ mdastToReact({ mdast(section0), segments(section0) })  │
│                                                             │
│    結果: section=0 だけSSR（初期表示が軽い）                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 追加セクション（クライアント）                              │
│                                                             │
│    SectionLoader (IntersectionObserver)                     │
│    └─ 下までスクロール検知                                   │
│                                                             │
│    API: GET /api/page-sections?slug=xxx&section=1&locale=.. │
│    ├─ fetchPageSection(slug, locale, 1)                      │
│    │   └─ mdastJson(section=1) + segments(section=1)         │
│    └─ { mdastJson, segments, hasMore, section } を返す       │
│                                                             │
│    クライアント                                              │
│    └─ mdastToReactClient で React として追記                  │
└─────────────────────────────────────────────────────────────┘
```

## 実装状況（やることメモ）

### 完了

1. 見出し（`heading depth=3`）基準のセクション分割
2. `fetchPageSection(slug, locale, section)` で section 単位取得
3. `/api/page-sections`（無限スクロール用、JSON返却）
4. `SectionLoader`（クライアントで追加セクションを取得して追記）
5. タイトル（`number=0`）は初期表示で取得し、section取得には含めない

### これから（SEO担保）

1. **`/section/[n]` ルート追加**
   - `/[locale]/user/[handle]/page/[pageSlug]/section/[section]`
   - 追加先: `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/section/[section]/page.tsx`
   - SSRでそのsectionだけを描画（重くない）
   - `<link rel="prev/next">` と「全セクションリンク」を配置（0→N を辿れる）
   - canonical は本体URLに統一（重複回避・検索結果は本体に寄せる）

### 必要なら追加（さらに軽量化）

1. **セクション単位のウィンドウ化**
   - 「遠いセクション」はDOMから外し、高さプレースホルダを保持
   - 高さは表示時に計測してキャッシュ（スクロールジャンプを避ける）

### 解決案

→ まずはAで性能改善、SEOは `section/[n]` で担保し、必要ならBでさらに軽量化
