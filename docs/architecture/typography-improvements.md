# タイポグラフィ設定の問題点と改善案

本ドキュメントは、[tak-dcxi氏のTypography CSS Gist](https://gist.github.com/tak-dcxi/0f8b924d6dd81aaeb58dc2e287f2ab3a) を参考に、現在の `globals.css` および `tailwind.config.ts` の問題点を整理したものです。

---

## 1. font-family の問題

### 現在の設定

```css
body {
  font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
}
```

### 問題点

- **`system-ui` は日本語環境で Yu Gothic UI にフォールバックする**
  - Windows の日本語環境では `system-ui` が Yu Gothic UI を返す
  - Yu Gothic UI はウェイトが少なく、字間も詰まっているため本文向きではない
  - **`system-ui` が含まれている時点で問題**

### 推奨設定

#### 方針A: シンプルに `sans-serif` のみ（最も推奨）

```css
body {
  font-family: sans-serif;
}
```

- ユーザーのブラウザ設定を尊重（アクセシビリティ的にも望ましい）
- Windows 11/10 では Noto Sans JP がプリインストールされているため、`sans-serif` でも十分きれいに表示される
- macOS では Hiragino Sans、iOS では Hiragino Sans、Android では Noto Sans CJK JP

#### 方針B: Noto Sans JP を明示的に使いたい場合

```css
@font-face {
  font-family: 'Local Noto Sans JP';
  src:
    local('Noto Sans JP'),           /* Windows */
    local('Noto Sans CJK JP Regular'); /* Android */
}

body {
  font-family: "Local Noto Sans JP", "Noto Sans JP", sans-serif;
}
```

- ローカルフォントを優先することでWebフォントのロードを省略できる
- フォールバックとして `sans-serif` を指定

#### 方針C: 欧文フォントを指定したい場合

```css
body {
  font-family: "Inter", sans-serif;
}
```

- 欧文フォント + `sans-serif` の組み合わせ
- 日本語は `sans-serif` でブラウザに任せる
- **`system-ui` は入れない**

### 絶対にやってはいけないこと

```css
/* NG: system-ui が含まれている */
font-family: ui-sans-serif, system-ui, sans-serif;
```

---

## 2. テキストの折り返し設定の欠如

### 現在の設定

```css
.prose {
  word-break: break-word;
}
```

### 問題点

- **`overflow-wrap: anywhere` が未設定**
  - 長い英単語やURLがコンテナからはみ出す可能性がある
- **`line-break: strict` が未設定**
  - 日本語の禁則処理（句読点が行頭に来ない等）が適用されない

### 推奨設定

```css
:where(:root) {
  overflow-wrap: anywhere;
  line-break: strict;
}
```

---

## 3. 日本語における斜体（italic）のリセットがない

### 現在の設定

斜体に関する設定なし。

### 問題点

- 日本語フォントは一般的に斜体（イタリック体）を持たない
- ブラウザは斜体がないフォントを無理やり傾けて表示する（faux italic）
- これは可読性を損なう

### 推奨設定

```css
:where(em:lang(ja)) {
  font-weight: bolder;
  font-style: normal;
}

:where(:is(address, i, cite, em, dfn):lang(ja)) {
  font-style: unset;
}
```

---

## 4. line-height（行間）の最適化

### 現在の設定

Tailwind デフォルトのまま（要素によって異なる）。

### 問題点

- **アクセシビリティ基準（WCAG）では行間 1.5 以上を推奨**
- 日本語の本文は 1.7〜2.0 が読みやすい
- 英語の本文は 1.5〜1.8 が適切

### 推奨設定

```css
body {
  line-height: 1.7; /* 日本語向け */
}

:where(p, li, dd) {
  line-height: 1.8;
}
```

---

## 5. text-wrap（テキストの折り返しバランス）の未設定

### 現在の設定

設定なし。

### 問題点

- 見出しで1文字だけ次の行に送られる「orphan」が発生しうる
- `text-wrap: balance` を使えば見出しの行長を均等にできる
- `text-wrap: pretty` を使えば本文の最終行が短くなりすぎるのを防げる

### 推奨設定

```css
:where(:is(h1, h2, h3, h4, h5, h6, caption)) {
  text-wrap: balance;
}

:where(p:lang(en)) {
  text-wrap: pretty;
}
```

---

## 6. font-feature-settings（OpenType機能）の未活用

### 現在の設定

設定なし。

### 問題点

- **日本語見出しで `font-feature-settings: "palt"` が未設定**
  - `palt`（プロポーショナルメトリクス）を有効にすると字間が自然になる
  - 見出しなど大きな文字では特に効果的
- **`font-variant-numeric: tabular-nums` の未設定**
  - 数値を縦に並べる表などで桁が揃わない

### 推奨設定

```css
:where(h1, h2, h3, h4, h5, h6, caption) {
  &:lang(ja) {
    font-feature-settings: "palt";
  }
}

/* 数値を等幅にしたい場合のユーティリティ */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

---

## 7. font-kerning の設定がない

### 現在の設定

設定なし。

### 問題点

- 英語テキストではカーニング（字間調整）が重要
- 日本語の本文ではカーニングは不要（むしろ不自然になる）
- 日本語見出しでは `palt` と併用でカーニングが有効

### 推奨設定

```css
:where(:lang(en)) {
  font-kerning: normal;
}

:where(:lang(ja)) {
  font-kerning: none;
}

:where(h1, h2, h3, h4, h5, h6, caption) {
  font-kerning: normal;
}
```

---

## 8. text-autospace（日本語・英語間のスペース）の未設定

### 現在の設定

設定なし。

### 問題点

- `text-autospace: normal` を設定すると、日本語と英数字の間に自動でスペースが入る
- 現在は Chrome 123+ でサポート
- 手動でスペースを入れる必要がなくなる

### 推奨設定

```css
:where(:root) {
  text-autospace: normal;
}

/* コードやフォーム要素では無効化 */
:where(pre, code, input, textarea, [contenteditable]) {
  text-autospace: no-autospace;
}
```

---

## 9. 文節区切りでの改行（word-break: auto-phrase）の未活用

### 現在の設定

設定なし。

### 問題点

- 日本語テキストが単語の途中で改行されることがある
- `word-break: auto-phrase` を使えば文節単位で改行できる
- Chrome 119+ でサポート

### 推奨設定

```css
:where(h1, h2, h3, h4, h5, h6, caption) {
  &:lang(ja) {
    @supports (word-break: auto-phrase) {
      word-break: auto-phrase;
      text-wrap: balance;
    }
  }
}
```

---

## 10. 流体タイポグラフィの未実装

### 現在の設定

固定サイズのフォントのみ。

### 問題点

- レスポンシブデザインでビューポートに応じたフォントサイズ調整がない
- `clamp()` を使った流体タイポグラフィが未実装

### 推奨設定

```css
.-fluid-text {
  --fluid-min: 14;
  --fluid-max: 18;
  --fluid-min-vw: 375;
  --fluid-max-vw: 1280;

  font-size: clamp(
    calc(var(--fluid-min) / 16 * 1rem),
    calc(
      (var(--fluid-max) - var(--fluid-min)) /
      (var(--fluid-max-vw) - var(--fluid-min-vw)) * 100vw +
      (var(--fluid-min) - var(--fluid-min-vw) *
      (var(--fluid-max) - var(--fluid-min)) /
      (var(--fluid-max-vw) - var(--fluid-min-vw))) / 16 * 1rem
    ),
    calc(var(--fluid-max) / 16 * 1rem)
  );
}
```

---

## まとめ：優先度別の改善項目

### 高優先度（すぐに対応すべき）

| 項目 | 理由 |
|------|------|
| font-family の修正 | Yu Gothic UI問題の回避 |
| overflow-wrap / line-break | テキストはみ出し・禁則処理 |
| 日本語斜体のリセット | 可読性向上 |

### 中優先度（品質向上）

| 項目 | 理由 |
|------|------|
| text-wrap: balance | 見出しの見栄え改善 |
| font-feature-settings: palt | 見出しの字間改善 |
| line-height の最適化 | アクセシビリティ・可読性 |

### 低優先度（将来対応）

| 項目 | 理由 |
|------|------|
| text-autospace | ブラウザサポートがまだ限定的 |
| word-break: auto-phrase | ブラウザサポートがまだ限定的 |
| 流体タイポグラフィ | 設計変更が必要 |

---

## 参考リンク

- [元Gist（tak-dcxi氏）](https://gist.github.com/tak-dcxi/0f8b924d6dd81aaeb58dc2e287f2ab3a)
- [WCAG 2.1 - 1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html)
- [CSS text-wrap: balance](https://developer.chrome.com/blog/css-text-wrap-balance)
- [CSS word-break: auto-phrase](https://developer.chrome.com/blog/css-i18n-features)
