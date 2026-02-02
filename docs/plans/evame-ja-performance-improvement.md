# Evame /ja パフォーマンス改善計画

## 目的
- `/ja` の初期表示（FCP/LCP）を短縮し、体感速度を上げる。
- 初期描画をブロックしている要因を特定し、最小変更で改善する。

## 現状
- 計測（2026-02-02）
  - Desktop: TTFB 約12–13ms / FCP 約3.4s
  - Mobile: TTFB 約12ms / FCP 約7.7s
  - URL は `https://evame.tech/ja?view=both` として計測された
- Trace 解析
  - firstPaint は早いが firstContentfulPaint まで約3.08s遅延
  - 長い main-thread タスクはほぼ無し（CPUボトルネックではない可能性）
- Network 解析
  - script が33本、fetch が14本、/ja/search のRSC fetchが複数回
  - `/api/auth/get-session` が初期に発火
- ローカル本番相当（build + start）5回平均（2026-02-02）
  - baseline: Desktop FCP 3262.4ms / TTFB 165.42ms, Mobile FCP 2804.8ms / TTFB 140.10ms

## 仮説
- A: ヘッダーの `Link href="/search"` による prefetch が `/ja/search` の RSC を初期に複数回発火させ、FCPを遅らせている。
- B: `authClient.useSession()` の初期 fetch がヘッダーの表示を遅らせ、FCPを遅らせている。
- C: 初期JS分割が多く、hydration/評価待ちが発生している。

## 実装
### 行うこと
1. **/search の prefetch を止めて効果を計測**
   - 変更候補: `src/app/[locale]/(common-layout)/_components/header/user-slot.client.tsx`
   - 予想: `/ja/search` のRSC fetchが減り、FCPが短縮される
   - 理由: 初期表示に不要なRSC fetchが発生している可能性が高い

2. **セッション取得の影響範囲を分離して計測**
   - 変更候補: `src/app/[locale]/(common-layout)/_components/header/user-slot.client.tsx`
   - 予想: `useSession` が初期描画をブロックしていれば、FCPが短縮される
   - 理由: `/api/auth/get-session` が初期に発火しており、ヘッダーが描画待ちになっている疑い

3. **初期JSの発生源を特定**
   - 変更候補: ビルド解析（Next.js bundle analyzer）または `next/script` 使用箇所の確認
   - 予想: 初期JSの不要分を遅延/削減し、FCP/LCPが短縮される
   - 理由: script が33本と多く、初期評価待ちが発生している可能性

### 計測方法
- Puppeteer（chrome-devtools skill）で Desktop/Mobile を再計測
- Network log で `/ja/search` と `/api/auth/get-session` の発火有無・回数を比較
- 変更前後のFCPの差分を記録

## 結果
### こうしたらこうなった（5回平均）
| 条件 | Desktop FCP (ms) | Desktop TTFB (ms) | Mobile FCP (ms) | Mobile TTFB (ms) |
| --- | ---: | ---: | ---: | ---: |
| baseline（prefetch=on, session=on） | 3262.4 | 165.42 | 2804.8 | 140.10 |
| prefetch=off, session=on | 3213.6 | 153.62 | 3248.0 | 144.88 |
| prefetch=on, session=off | 3372.0 | 184.88 | 3326.4 | 101.22 |
| prefetch=off, session=off | 3313.6 | 181.54 | 2572.0 | 116.52 |
| view query sync=off, prefetch=on, session=on | 3088.0 | 139.32 | 2764.8 | 121.30 |
| final default（view query auto-sync off） | 3153.6 | 238.44 | 2664.0 | 127.34 |
| Suspense streaming（About + lists） | 1452.0 | 193.52 | 1541.6 | 165.18 |
| framer-motion削除（SpreadAnimation CSS化） | 1547.2 | 184.12 | 1536.8 | 186.44 |

### 原因はこれで
- `/search` の prefetch を止めても FCP が安定して短縮されないため、**RSC prefetch は主因ではない**可能性が高い。
- `useSession` を無効化しても FCP が改善しないため、**セッション取得は主因ではない**可能性が高い。
- `view` クエリの自動同期を止めた場合に **Desktop/Mobile とも FCP が改善**したため、**初期URL書き換えが FCP を遅らせている可能性**がある。
- FCP の遅延は **初期JS/初期RSCの到着・評価・ストリーミングのいずれか**に起因している可能性が高い。
- すべて `?view=both` で計測されているため、**表示モードによる負荷**が混入している可能性がある。
- About とリストの **Suspense 分割で FCP が大幅改善**したため、**サーバー描画のブロッキングが主要因**だった可能性が高い。

### こう改善された
- `view` クエリの自動同期を廃止した最終状態で **FCP が改善**（Desktop 3262.4ms → 3153.6ms、Mobile 2804.8ms → 2664.0ms）。
- `/[locale]` を Suspense で分割ストリーミングした結果、**FCP が大幅改善**（Desktop 3262.4ms → 1452.0ms、Mobile 2804.8ms → 1541.6ms）。
- framer-motion削除は **Suspense分割と同等水準**（Desktop 1547.2ms / Mobile 1536.8ms）で、追加効果は限定的。

## 次の改善方針（実行予定）
- 初期JSの発生源を特定（bundle analyzer / `next/script` / 初期チャンクの依存関係）
- `/ja` の RSC payload サイズとストリーミング順序を確認

## 最終まとめ
- **効果が大きかった対応**: `/[locale]` の About/リストを Suspense で分割ストリーミング
  - Desktop FCP: 3262.4ms → 1452.0ms
  - Mobile FCP: 2804.8ms → 1541.6ms
- **効果が限定的だった対応**: view クエリの自動同期廃止
  - Desktop FCP: 3262.4ms → 3153.6ms
  - Mobile FCP: 2804.8ms → 2664.0ms
- **主因の結論**: `/[locale]` で初期描画をブロックする server component が多く、Suspense 分割でストリーミングすることで FCP が大きく改善した
