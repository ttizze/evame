# About Page Structure

## ビジョン

**Evame — 言葉の壁がないインターネット。**

---

## コピー体系

### ブランドタグライン
> **Evame — 言葉の壁がないインターネット。**

使用箇所:
- ヘッダーロゴ横
- OGP / meta description
- SNSシェア

### Hero
```
言葉の壁がないインターネット。

母国語で書く。世界が読む。

[Start Now]
```

### Final CTA
```
書く人がいて、読む人がいる。
言葉が違っても。

[Get Started]
```

---

## ページ構成

```
[Header: Evame — 言葉の壁がないインターネット。]

┌─ 1. Hero ──────────────────────────┐
│  言葉の壁がないインターネット。    │
│  母国語で書く。世界が読む。        │
│           [Start Now]              │
└────────────────────────────────────┘
              ↓
┌─ 2. Founder Story ─────────────────┐
│  なぜ作ったか                      │
│  「言葉の壁で読みたいものが        │
│   読めなかった。だから作った。」   │
└────────────────────────────────────┘
              ↓
┌─ 3. BentoGrid ─────────────────────┐
│  書く → 届く → 磨く → 読む        │
│  ┌─────────┐ ┌─────────┐          │
│  │ 書く    │ │ 届く    │          │
│  └─────────┘ └─────────┘          │
│  ┌─────────┐ ┌─────────┐          │
│  │ 磨く    │ │ 読む    │          │
│  └─────────┘ └─────────┘          │
└────────────────────────────────────┘
              ↓
┌─ 4. Final CTA ─────────────────────┐
│  書く人がいて、読む人がいる。      │
│  言葉が違っても。                  │
│          [Get Started]             │
└────────────────────────────────────┘
```

---

## セクション詳細

### 1. Hero Section
- **目的**: 第一印象、ビジョン + ベネフィット
- **コンポーネント**: `hero-section/server.tsx`
- **コンテンツ**:
  - タイトル: 「言葉の壁がないインターネット。」
  - サブテキスト: 「母国語で書く。世界が読む。」
- **ビジュアル**: HeroRays (animated)

### 2. Founder Story
- **目的**: 共感を生む、なぜ作ったか
- **コンポーネント**: `founder-section.tsx`
- **コンテンツ**:
  ```
  読みたいものがあった。
  ブッダの言葉。でも日本語の完訳は戦前のものしかない。
  言葉の壁で、読めなかった。

  だから作った。言葉の壁がないインターネットを。
  ```
- **ビジュアル**: 引用風レイアウト、創業者写真

### 3. BentoGrid (Feature Cards)
- **目的**: 機能をストーリーで紹介
- **コンポーネント**: `bento-grid.tsx`
- **コンテンツ**: 4カード「書く→届く→磨く→読む」

| カード | タイトル | 説明 |
|--------|----------|------|
| 1. 書く | 母国語で書くだけ | 翻訳の手間なし、書くことに集中 |
| 2. 届く | 自動で世界に翻訳 | 5言語以上に自動翻訳、世界の読者に |
| 3. 磨く | 読者と一緒に | 投票で翻訳を改善、集合知で品質向上 |
| 4. 読む | 原文と訳を並べて | 語学学習にも、正確な理解にも |

### 4. Final CTA
- **目的**: 感情で締める、コンバージョン
- **コンポーネント**: server.tsx内
- **コンテンツ**:
  - テキスト: 「書く人がいて、読む人がいる。言葉が違っても。」
  - ボタン: 「Get Started」

---

## 多言語対応

### 英語版コピー

**Brand tagline:**
> Evame — An internet without language walls.

**Hero:**
```
An internet without language walls.

Write in your language. The world reads.

[Start Now]
```

**Final CTA:**
```
Writers and readers.
Even when they speak different languages.

[Get Started]
```

**BentoGrid:**
| Card | Title | Description |
|------|-------|-------------|
| 1. Write | Just write in your language | No translation work, focus on writing |
| 2. Reach | Auto-translated worldwide | 5+ languages, reach global readers |
| 3. Refine | Together with readers | Voting improves quality, collective wisdom |
| 4. Read | Side-by-side view | For learning, for precise understanding |

---

## 参考文献

- [Cortes Design - Breaking down the "Perfect" SaaS Landing page](https://www.cortes.design/post/saas-landing-page-breakdown-example)
- [involve.me - Landing Page Structure: Anatomy & Best Practices](https://www.involve.me/blog/landing-page-structure)
- [KlientBoost - 51 High-Converting SaaS Landing Pages](https://www.klientboost.com/landing-pages/saas-landing-page/)

### 具体例

#### sizu.me (静かなインターネット)
- ビジョン先行型: 「しずかなインターネット」がヘッダー
- 感情訴求: 「静かさ」という感情で差別化
- Evameへの示唆: ビジョンをタグラインに

#### Basecamp
- 問題提起型: "Wrestling with projects?"
- 創業者の哲学をフッターでリンク
- Evameへの示唆: Founder Storyで問題提起

---

## ファイル構成

```
about-section/
├── server.tsx                 # メインエントリ
├── bento-grid.tsx             # Feature showcase (書く→届く→磨く→読む)
├── hero-section/
│   ├── server.tsx             # Hero
│   └── hero-rays.tsx          # 視覚効果
├── founder-section.tsx        # 有効化予定
├── service/
│   └── fetch-about-page.ts    # DB fetch
│
# 削除候補:
├── problem-solution-section/  # BentoGridに統合済み
├── product-showcase.tsx       # BentoGridに統合
├── stats-section.tsx          # 実績ができてから
├── feature-cards.tsx          # BentoGridと重複
└── about-section.client.tsx   # 未使用
```

---

## TODO

1. [x] Hero文言をDBに反映
   - JA: 「言葉の壁がないインターネット。」「母国語で書く。世界が読む。」
   - EN: "An internet without language walls." "Write in your language. The world reads."
   - 全5言語更新済み (ja, en, zh, ko, es)

2. [x] BentoGridを「書く→届く→磨く→読む」に再構成

3. [x] Founder Storyを有効化
   - 「言葉の壁」問題にフォーカスした短いストーリー
   - コピー更新済み

4. [x] Final CTAセクションを追加
   - 「書く人がいて、読む人がいる。言葉が違っても。」
   - final-cta.tsx作成、server.tsxに組み込み

5. [ ] 不要ファイル削除
   - problem-solution-section/
   - feature-cards.tsx
   - about-section.client.tsx

6. [x] OGP / meta descriptionを更新
   - 「Evame — 言葉の壁がないインターネット。」
   - about/page.tsxのmetadata更新

---

## Screenshots

```
public/about/bento/
├── hero-crop.png
├── bilingual.png
├── bilingual-content.png
└── article.png
```
