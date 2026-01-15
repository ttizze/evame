# ADR: セクション分割ページネーション

- 日付: 2026-01-15
- ステータス: 未採用
- 関連要件: `docs/requirements.md` の「静的生成の最優先」

## 背景

長い本文（数千セグメント）を一度にレンダリングすると、SSR/水和/DOM サイズの負担が大きい。
SEO も保ちつつ読みやすい表示を実現したい。

## 問題

- 1 ページで全文を出すと重い
- SEO のために全文到達性を確保したい
- スクロールで読み進められる UI が望ましい

## 判断

本体 URL は軽量表示（無限スクロール）にし、クローラ用にセクション URL を用意する。

- **本体 URL**: `/user/.../page/...`
  - section=0 を SSR で描画
  - 以降のセクションは API で取得し HTML を追記
- **クローラ用 URL**: `/user/.../page/.../section/[n]`
  - SSR でセクション単位の HTML を返す
  - `rel="prev/next"` を付けて全文到達性を担保
  - canonical は本体 URL に統一

## 代替案

A. HTML のみ挿入（採用）
- 追加セクションは HTML を追記
- 追加分のクライアント水和は行わない

B. ウィンドウ化
- 表示範囲外のセクションを DOM から外す
- 高さプレースホルダでスクロール位置を維持

C. セクションルートのみ
- 本体 URL も SSR で全文を出す
- 初期表示が重い

## 影響

- API にセクション取得エンドポイントが必要
- 追加セクションは `dangerouslySetInnerHTML` になるため、クライアント側の動的 UI は効かない
- SEO は section ルートで担保する

## 実装メモ（任意）

- セクション取得 API: `src/app/api/page-sections/route.ts`
- section=0 の SSR: `fetchPageContext` + `ContentWithTranslations`
