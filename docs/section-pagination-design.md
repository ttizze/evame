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

### 実装の現状（このリポの今の流れ）

#### 1) 本体ページ（`/[locale]/user/[handle]/page/[pageSlug]`）

- `page.tsx` → `fetchPageContext(slug, locale)` を呼ぶ
- `fetchPageContext` は `fetchPageSection(slug, locale, 0)` で section=0 のみ取得して `pageDetail` 形式に組み直す
- `ContentWithTranslations` が section=0 を SSR で描画する（`mdastToReact`）
- `SectionLoader` が画面下の IntersectionObserver で `GET /api/page-sections?slug=...&section=n&locale=...` を呼び、返ってきた `html` を追記する

#### 2) セクションAPI（`/api/page-sections`）

- `fetchPageSection(slug, locale, section)` で DB から「その section に必要な segments + mdast slice」を取得
  - segments: `segments.number` を `section * SEGMENTS_PER_SECTION .. < +SEGMENTS_PER_SECTION` で絞る
  - mdast: `sliceMdast(page.mdastJson, section)` で `children` を固定幅スライス
- 取得した `mdast` と `segments` を元に、サーバで HTML 文字列を生成して `{ html, hasMore, section }` を返す
  - 追加セクションは `dangerouslySetInnerHTML` で挿入されるため、Client Component の水和は発生しない
  - その代わり、翻訳表示は HTML 生成時に「翻訳ノードを直後に挿入」して見た目を合わせる

#### 3) 翻訳の「最良」選択（DBクエリ）

- `fetchSegments` は `DISTINCT ON(segmentTranslations.segmentId)` で各セグメントの翻訳を1件に絞る
- `locale=ja` の場合は「日本語らしい文字（ひらがな/カタカナ/漢字）を含む翻訳」を優先してから point / createdAt で決める
  - 原文コピーの翻訳が “最良” になって表示されない問題を避けるため

### データ構造

```
mdast = {
  type: "root",
  children: [node0, node1, ..., node1073]
}
```

各nodeに`data.hProperties["data-number-id"]`でセグメント番号が埋め込まれている。

### セクション分割

```
section=0 → { type: "root", children: children.slice(0, 100) }
section=1 → { type: "root", children: children.slice(100, 200) }
section=2 → { type: "root", children: children.slice(200, 300) }
...
```

1セクション = 100ノード（固定）

## 処理フロー

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 初期表示（SSR）                                           │
│                                                             │
│    fetchPageContext                                         │
│    ├─ fetchPageDetail(slug, locale, { section: 0 })         │
│    │   └─ segments[0:100] を取得                            │
│    ├─ sliceMdast(mdastJson, 0)                              │
│    │   └─ mdast.children[0:100] を取得                      │
│    └─ return { pageDetail, hasMoreSections, totalSections } │
│                                                             │
│    ContentWithTranslations                                  │
│    └─ mdastToReact({ mdast, segments }) → React → HTML      │
│                                                             │
│    結果: section=0 のHTMLのみ出力（SEO対応）                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. スクロール時（クライアント）                               │
│                                                             │
│    SectionLoader (IntersectionObserver)                     │
│    └─ 下までスクロール検知                                   │
│                                                             │
│    API: GET /api/page-sections?slug=xxx&section=1           │
│    ├─ fetchPageSection(slug, locale, section)               │
│    │   ├─ segments[100:200] を取得                          │
│    │   └─ sliceMdast(mdastJson, 1)                          │
│    ├─ mdast → HTML string（unified/rehype）                 │
│    └─ { html, hasMore, section } を返す                      │
│                                                             │
│    クライアント                                              │
│    └─ dangerouslySetInnerHTML で追加                        │
└─────────────────────────────────────────────────────────────┘
```

## 現在の進捗

### 完了

1. **sliceMdast** - mdast.childrenをセクション分割
   - `src/app/[locale]/(common-layout)/_lib/slice-mdast.ts`

2. **fetchPageSection** - セクション単位でmdast+segmentsを返す
   - `src/app/[locale]/_db/fetch-page-detail.server.ts`

3. **fetchPageContext** - 初期表示をsection=0のみに
   - `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_lib/fetch-page-context.ts`

4. **API** - セクション取得（HTML文字列）
   - `src/app/api/page-sections/route.ts`

### 未完了

5. **型エラー修正**
   - `MdastRoot` と `JsonValue` の互換性問題

6. **無限スクロールクライアントコンポーネント**
   - `src/app/[locale]/(common-layout)/_components/section-loader/client.tsx`
   - IntersectionObserverでスクロール検知
   - APIからHTML取得
   - dangerouslySetInnerHTMLで追加

7. **ContentWithTranslationsの修正**
   - SectionLoaderを組み込む
   - hasMoreSections, slug, localeを渡す

## 課題

### dangerouslySetInnerHTMLの問題

追加セクションをHTMLで挿入すると、クライアントコンポーネント（翻訳表示のトグル等）が動かない。

### 解決案

A. **HTMLのみ挿入（現在の方針）**
   - 追加セクションは原文のみ表示
   - 翻訳トグル等は動かない
   - シンプル

B. **ウィンドウ化（セクション単位）**
   - 画面から遠いセクションは DOM から外す（代わりに高さプレースホルダを置く）
   - 高さは「一度表示したセクションを計測→キャッシュ」して維持する
   - DOM増加による重さを根本から抑えられる

C. **クロール用 `section/[n]` ルートを追加**
   - SEO要件（クローラが全文に到達）を満たすための SSR HTML を提供する
   - canonical は本体URLに統一し、検索結果は本体URLに寄せる

→ まずはAで性能改善、SEOは `section/[n]` で担保し、必要ならBでさらに軽量化
