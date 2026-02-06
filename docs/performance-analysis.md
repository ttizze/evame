# evame.tech トップページ パフォーマンス分析

日時: 2026-02-06
対象: https://evame.tech/ja (iPhone Safari)

## 添付データ

- `performance-analysis-evame.tech.har` — Safari Web Inspector ネットワーク HAR
- `performance-analysis-evame.tech-recording.json` — Safari タイムライン記録 (5.55秒)

## 計測結果サマリ

| 指標 | 値 |
|------|-----|
| DOMContentLoaded | 3,748ms |
| Load | 3,848ms |
| HTML 転送サイズ (Brotli) | 27.6KB |
| HTML 展開後サイズ | 313KB |
| JS/CSS/フォント (34ファイル) | 全てキャッシュヒット |
| 総転送サイズ (キャッシュ除く) | 106KB |
| CPU ピーク | 77.6% (メインスレッド 43.0%) @ 2,027ms |

## ウォーターフォール

```
0ms        HTML リクエスト開始
│  TTFB: 57ms (Vercel キャッシュ HIT)
│  受信: 1,603ms ← ★ ボトルネック①
│
76~89ms    JS/CSS/フォント 34個 → 全てディスクキャッシュ (0ms)
│
1,600ms    HTML 受信完了 → JS 解析開始
│
1,600~1,700ms  JS 解析 + 初期スクリプト実行 (100ms)
│  JS: 46ms / レイアウト: 40ms / composite: 9ms
│
1,700~1,900ms  ハイドレーション + 初期レンダリング (200ms) ← ★ ボトルネック②
│  JS: 82ms / レイアウト: 39ms / composite: 119ms
│  CPU: 77.6% (ピーク)
│
1,886ms    favicon, hero-rays-dark.svg ダウンロード開始
1,984ms    /api/auth/get-session (TTFB 145ms)
2,050ms    RSC リクエスト 6個 (各 50~130ms)
│
2,200ms~   60fps で安定
│
3,748ms    DOMContentLoaded
3,848ms    Load
```

## ボトルネック詳細

### 1. HTML ダウンロードに 1,603ms (全体の 41%)

HTML は Brotli 圧縮で 27.6KB まで縮められているが、受信 (receive) に 1,603ms かかっている。TTFB は 57ms で高速なので、iPhone の回線速度がボトルネック。

この間、ブラウザは 1 フレームが 1,587ms 間更新されない状態 (0.6fps) になる。

#### HTML が大きい原因

| 内容 | サイズ |
|------|--------|
| インライン `<script>` タグ (170個) | 179KB |
| うち RSC ペイロード (71チャンク) | 167KB |
| マークアップ本体 | 128KB |
| `<style>` タグ | 1KB |
| **合計** | **314KB** |

トップページに記事一覧 21件分の `<article>` データと RSC ハイドレーションデータがすべて埋め込まれている。

### 2. ハイドレーション + composite で 200ms (CPU 77.6%)

1,700~1,900ms に CPU 使用率が 77.6% に跳ね上がる。

内訳:
- **composite (レイヤー合成): 119ms** — `hero-rays-dark.svg` (1,968本の `<line>` 要素 + CSS アニメーション) の初期コンポジットが重い。80ms + 55ms の 2 回のスパイクが発生
- **JS 実行: 82ms** — React ハイドレーション
- **recalculate-styles + layout: 39ms**

### 3. /api/auth/get-session の TTFB 145ms

ハイドレーション後に認証チェック API が呼ばれ、レスポンスまで 145ms。この間ログイン状態に依存する UI が確定しない。

### 4. RSC リクエスト 6個のウォーターフォール

2,050~2,280ms にかけて RSC のストリーミングリクエストが連鎖的に発生。各 TTFB が 50~130ms。

## リソース構成

### JS バンドル (31ファイル, 1,784KB 非圧縮)

今回は全てキャッシュヒットだったが、初回訪問時には問題になる。

| バンドル | サイズ | 推定内容 |
|---------|--------|---------|
| `87ee366f...js` | 280KB | Zod + 巨大データ (emoji 等) |
| `49fd86bc...js` | 218KB | UI コンポーネント群 (ContextMenu 等) |
| Google Tag Manager | 437KB | GA4 |
| `52ff6319...js` | 83KB | Google Analytics 関連 |
| `bf130ea...js` | 59KB | Radix UI + react-hook-form + next-intl |
| `8c3f82...js` | 56KB | Radix UI + シンタックスハイライト |
| その他 25ファイル | 651KB | React, next-intl, lucide 等 |

### レイアウトからの不要な依存読み込み

共通レイアウト (`app/[locale]/(common-layout)/layout.tsx`) から以下が芋づる式に読み込まれている:

```
layout.tsx (全ページに適用)
├── TranslationFormOnClick (記事ページの翻訳投票 — トップでも使用)
│   └── dompurify (60KB) + html-react-parser (25KB) + swr
├── HeaderUserSlot
│   ├── StartButton → LoginDialog → zod (50KB)
│   ├── LocaleSelector → cmdk (15KB)
│   └── NotificationsDropdown → swr + Radix
├── FloatingControls → ShareDialog → react-share (20KB)
└── Sentry (replay + profiling + tracing = 200-300KB)
```

### その他

| リソース | サイズ | 備考 |
|---------|--------|------|
| hero-rays-dark.svg | 352KB (gzip 79KB) | 1,968本の `<line>` + CSS アニメーション |
| Tailwind CSS | 110KB | purge 最適化の余地あり |
| フォント (woff2) | 47KB | |

## 改善提案

### P0: HTML 軽量化 (最もインパクト大)

- トップページの記事一覧件数を減らす (21件 → 5~10件)
- RSC ペイロードの削減
- → 圧縮後 HTML サイズが減り、低速回線でのダウンロード時間が短縮

### P1: hero-rays-dark.svg の最適化

- 1,968本の `<line>` を削減 (視覚的に差が出ない範囲で 1/3~1/2 に)
- または静的画像 + CSS アニメーションに置換
- → 初期 composite の 119ms スパイクが改善

### P2: 遅延読み込み

- `LoginDialog` を `next/dynamic` で遅延ロード → zod (50KB) 削減
- `ShareDialog` を `next/dynamic` で遅延ロード → react-share (20KB) 削減
- Sentry の replay/profiling を `lazyLoadIntegration()` に → 200KB+ 削減

### P3: 認証 API

- `/api/auth/get-session` のレスポンスを高速化またはキャッシュ (現在 TTFB 145ms)
