# LP（ランディングページ）構成見直し実装プラン

**作成日**: 2026-01-30
**ステータス**: 文言確定・実装待ち
**関連ドキュメント**:
- [ADR: Heroコピー決定](../adr/20260130-about-hero-copy.md)
- [LPコンテンツ全文言](./lp-content-copy.md)

## 目的

CVR最適化の観点から、LPコンテンツの構成を見直し、コンバージョン率を向上させる。

## 対象範囲

**AboutSectionコンポーネント** (`src/app/[locale]/(common-layout)/_components/about-section/`)
- topページ（未ログイン時のみ表示）
- aboutページ（常に表示）

## 背景

**ユーザー状況:**
- 訪問者: ほとんどが初見の未ログインユーザー
- 表示場所: topページ（未ログイン時のみ）、aboutページ（常時）
- 目的: 記事を書いてもらう（CVR重視）
- 競合: Medium/note
- 差別化: 18言語対応（無料は2言語まで）

**主要な改善点（CRO専門家の評価を反映）:**
- ✅ Social Proof追加（実績の可視化）
- ✅ Problem Section追加（課題の明確化）
- ✅ Comparison追加（Medium/note差別化）
- ✅ FAQ追加（不安解消）
- ✅ Founder Storyを早期配置（感情的共感を優先）
- ❌ How It Works削除（BentoGridと重複）

## 新しい構成（CVR最適化）

```
1. Hero                    ← 既存更新（ADR決定済みコピー）
2. Social Proof Bar        ← NEW（実績表示・DB駆動）
3. Founder Story           ← 既存更新（位置移動 + テキスト追加）
4. Problem                 ← NEW（問題提起）
5. BentoGrid              ← 既存更新（コピー改善）
6. Comparison              ← NEW（Medium/note比較）
7. FAQ                     ← NEW（疑問解消・FAQ4変更）
8. Final CTA               ← 既存更新（コピー改善）
```

**変更点（CRO専門家の推奨を反映）:**
- ❌ How It Works削除（BentoGridと重複のため）
- 🔄 Founder Storyを3番目に移動（感情的共感を早期に構築）
- ✏️ FAQ4をSEOに変更（Comparison Sectionとの重複解消）

## データ管理方針

### すべてDB駆動
- 全セクションをDB駆動で実装
- 多言語対応が必須

### 既存データの扱い
- **既存セグメント（旧0-15）は破棄**
- 全体を再設計、表示順序に合わせて番号を割り当て
- マイグレーション: 既存削除 → 新規投入

**詳細な文言とセグメント情報は [lp-content-copy.md](./lp-content-copy.md) を参照**

## 実装概要

### 既存コンポーネント更新
- Hero Section: コピー更新
- BentoGrid: コピー改善
- Founder Story: テキスト4追加、位置変更
- Final CTA: サブテキスト追加

### 新規コンポーネント作成
- Social Proof Bar: 実績数値表示
- Problem Section: 課題提起
- Comparison Section: Medium/note比較
- FAQ Section: よくある質問5つ

### 削除
- ~~How It Works Section~~: BentoGridと重複のため削除

---

## メインコンテナの構成順序

```tsx
1. HeroSection
2. SocialProofBar
3. FounderSection ← 位置変更
4. ProblemSection
5. BentoGrid (Write/Reach/Refine/Read)
6. ComparisonSection
7. FAQSection ← FAQ4変更（Medium比較→SEO）
8. FinalCTA
```

---

## 変更履歴

### 2026-01-30
- 初版作成
- CRO専門家の評価を反映:
  - How It Works削除（BentoGridと重複）
  - Founder Storyを3番目に移動
  - FAQ4変更（Medium比較→SEO）
