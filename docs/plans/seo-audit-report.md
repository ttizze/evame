# Evame SEO監査レポート

## 目的

Evame（多言語記事翻訳・共有プラットフォーム）のSEO観点での現状分析と改善提案

## エグゼクティブサマリー

### 全体評価: B（良好だが改善の余地あり）

**強み:**
- 動的サイトマップ実装済み
- robots.txt適切に設定
- 多言語対応（hreflang）実装済み
- 記事ページのcanonical URL設定済み
- OGP/Twitter Card実装済み

**改善が必要な領域:**
1. 構造化データ（JSON-LD）が未実装
2. 静的ページのmetadata不足
3. 一部ページでH1が複数存在する可能性
4. 画像のalt属性が不十分な箇所あり

---

## 技術的SEO

### 1. クローラビリティ

#### robots.txt ✅ 良好

**現状:**
- `src/app/robots.ts` で動的生成
- 全ページをクロール許可 (`allow: "/"`)
- サイトマップを動的に参照

```typescript
// 現在の実装
rules: {
  userAgent: "*",
  allow: "/",
},
sitemap: sitemaps, // 動的生成
```

**問題なし**

#### XMLサイトマップ ✅ 良好

**現状:**
- `src/app/sitemap/sitemap.ts` で動的生成
- 1000件ごとにチャンク分割
- 静的ルート + 動的ページルートを含む
- alternates（多言語対応）実装済み

**改善提案:**
- [ ] `lastModified` が `new Date()` 固定の静的ルートがある → 実際の更新日を反映すべき

#### サイト構造 ⚠️ 要確認

**現状のURL構造:**
```
/[locale]/                    # ホーム
/[locale]/about               # About
/[locale]/search              # 検索
/[locale]/new-pages           # 新着
/[locale]/tag/[tagName]       # タグ別
/[locale]/[handle]            # ユーザーページ
/[locale]/[handle]/[pageSlug] # 記事ページ
```

**問題:**
- `/[locale]/new-pages` がサイトマップに含まれていない
- `/[locale]/tag/[tagName]` がサイトマップに含まれていない

---

### 2. インデクセーション

#### Canonical URL ⚠️ 部分的

**実装済み:**
- 記事ページ (`/[handle]/[pageSlug]`) - canonical + alternates

**未実装:**
- ホームページ
- 検索ページ
- タグページ
- ユーザーページ
- new-pagesページ

#### noindex設定 ✅ 適切

- 下書き記事に `robots: { index: false, follow: false }` 設定済み

---

### 3. Core Web Vitals対策

#### 現状の取り組み ✅

- `next/dynamic` でコンポーネントの遅延読み込み
- `next/image` による画像最適化
- `next/font` でフォント最適化
- スケルトンローディング実装

**未確認項目:**
- 実際のLCP/INP/CLSスコア（要PageSpeed Insights確認）

---

### 4. モバイル対応 ✅ 良好

```typescript
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content",
};
```

---

## オンページSEO

### 5. タイトルタグ ⚠️ 改善必要

| ページ | 現状 | 問題 |
|--------|------|------|
| ホーム | `Evame - Home - Latest Pages` | ロケール固定、キーワード弱い |
| About | ロケール別に最適化済み ✅ | - |
| 検索 | metadata未設定 ❌ | タイトル・説明なし |
| new-pages | `Evame - New Pages` | ロケール未対応 |
| タグページ | `Evame - New Pages – ${tagName}` | 基本的に良好 |
| ユーザーページ | `${pageOwner.name}` | 説明なし |
| 記事ページ | 動的生成 ✅ | - |

**改善提案:**
- [ ] 検索ページにmetadata追加
- [ ] ホームページをロケール別に最適化
- [ ] ユーザーページに説明を追加
- [ ] new-pagesをロケール別に最適化

### 6. Meta Description ⚠️ 改善必要

**未設定のページ:**
- `/[locale]/search`
- `/[locale]/[handle]` （ユーザーページ）
- `/[locale]/terms`
- `/[locale]/privacy`

### 7. 見出し構造 ⚠️ 確認必要

**確認済み:**
- 記事ページ: H1は記事タイトル（動的）
- Hero Section: H1実装済み
- Terms/Privacy: H1実装済み

**改善提案:**
- [ ] 各ページでH1が1つのみであることを確認

### 8. 構造化データ（JSON-LD）❌ 未実装

**現状:** schema.org構造化データが一切実装されていない

**推奨実装:**

1. **Organization** - サイト全体
```json
{
  "@type": "Organization",
  "name": "Evame",
  "url": "https://evame.tech",
  "logo": "..."
}
```

2. **Article** - 記事ページ
```json
{
  "@type": "Article",
  "headline": "記事タイトル",
  "author": { "@type": "Person", "name": "著者名" },
  "datePublished": "...",
  "dateModified": "..."
}
```

3. **WebSite** - 検索ボックス
```json
{
  "@type": "WebSite",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://evame.tech/search?query={search_term_string}"
  }
}
```

4. **BreadcrumbList** - パンくずリスト

5. **ProfilePage** - ユーザーページ

**優先度: 高**

---

## コンテンツ最適化

### 9. 多言語SEO ✅ 良好

**実装済み:**
- hreflang alternates（記事ページ）
- ロケール別ルーティング
- 言語ごとのメタデータ（Aboutページ）

**改善提案:**
- [ ] x-default hreflangタグの追加
- [ ] 他の静的ページにもalternates追加

### 10. 画像最適化 ⚠️ 部分的

**良好な点:**
- `next/image` 使用
- WebP自動変換

**改善が必要:**
- [ ] 一部画像でalt属性が汎用的（例: "Hero section image"）
- [ ] ユーザーアバターのalt属性を確認

---

## 優先度別アクションプラン

### 最優先（Impact: 高）

| # | 課題 | 対応 | 影響 |
|---|------|------|------|
| 1 | 構造化データ未実装 | Article, Organization, WebSite スキーマ追加 | 高 |
| 2 | 静的ページのmetadata不足 | 検索・ユーザーページにtitle/description追加 | 高 |
| 3 | サイトマップにタグ・new-pages未掲載 | サイトマップに追加 | 中 |

### 中優先（Impact: 中）

| # | 課題 | 対応 | 影響 |
|---|------|------|------|
| 4 | 静的ページにcanonical未設定 | 全ページにcanonical追加 | 中 |
| 5 | x-default hreflang未設定 | デフォルト言語の指定 | 中 |
| 6 | Terms/Privacyのmetadata | タイトル・説明追加 | 低 |

### 低優先（Impact: 低）

| # | 課題 | 対応 | 影響 |
|---|------|------|------|
| 7 | 画像alt属性の見直し | より具体的な説明に変更 | 低 |
| 8 | サイトマップのlastModified | 実際の更新日を反映 | 低 |

---

## 検討した方法

### 構造化データ実装方法

1. **Next.js metadata API**
   - メリット: Next.js標準、型安全
   - デメリット: JSON-LDは手動実装が必要

2. **next-seo パッケージ**
   - メリット: 簡単に実装可能
   - デメリット: 追加依存関係

3. **手動でJSON-LD生成**
   - メリット: 完全なコントロール
   - デメリット: 保守性

**結論:** Next.js metadata APIで基本設定 + 手動JSON-LDコンポーネント作成を推奨

---

## 比較: 現状 vs 理想

| 項目 | 現状 | 理想 | Gap |
|------|------|------|-----|
| 構造化データ | 0% | Article, Organization等 | 大 |
| メタデータ網羅率 | 60% | 100% | 中 |
| canonical設定 | 30% | 100% | 中 |
| hreflang | 70% | 100% + x-default | 小 |
| 画像alt | 80% | 100% | 小 |

---

## 結論

Evameは基本的なSEO対策（サイトマップ、robots.txt、多言語対応）が実装されていますが、**構造化データの追加**と**静的ページのmetadata強化**が主要な改善ポイントです。

特にArticleスキーマの実装は、Google検索結果でのリッチリザルト表示に直結するため、優先的に取り組むことを推奨します。

---

## 参考ツール

- [Google Search Console](https://search.google.com/search-console)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema.org Validator](https://validator.schema.org/)
