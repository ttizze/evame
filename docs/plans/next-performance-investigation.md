# 次のパフォーマンス調査計画（初期JS/RSC）

## 目的
- 初期JSの発生源を特定し、FCP悪化要因を絞り込む
- `/ja` の RSC payload サイズとストリーミング順序を可視化し、ボトルネックを特定する

## 現状
- `/[locale]` の Suspense 分割で FCP は大幅改善したが、初期JS/ストリーミングの詳細な原因は未確定
- `_rsc` の多重リクエストや初期チャンクの肥大が疑われるが、根拠が不足

## 実装
### 行うこと
- bundle analyzer で初期JSの発生源を特定する
  理由: どのチャンク/依存が初期に必要になっているかを可視化するため
- `next/script` の使用箇所と読み込み順序を確認する
  理由: ブロッキング/早期ロードがあると FCP が悪化するため
- `/ja` の RSC payload サイズとストリーミング順序を計測する
  理由: RSCの配信順とサイズが初期描画を遅らせている可能性があるため

## 結果
- bundle analyzer で `/.next/analyze/nodejs.html` を生成（ビルドはタイムアウト）
  - 初期JSの発生源はレポートで確認可能
- `next/script` の使用は無し（`rg -n "next/script" src`）
  - 直接的な script ブロッキングは確認できず
- RSC/HTML payload サイズは約 1.24MB で、`view=both` の差分はほぼ無し
- `/ja?view=both` のストリーミングは 254 チャンク、最初のチャンクは約 533ms、最後は約 3408ms
- 初期JSチャンク上位は `docs/plans/next-performance-investigation-log.md` に記録

## 次の改善候補（UX変更を含む）
- 初期JSの発生源: `/.next/analyze/nodejs.html` を生成（bundle analyzer）
1. /ja のサーバー描画量を減らす
   - 対象: AboutSection + NewPageList + NewPageListByTag
   - 例: 下部セクションを「Moreクリックで取得」に変更、または表示数を減らす
   - 期待: HTML/RSCサイズを大きく削減 → FCP/TTFB改善
2. リストのデータ量を削る
   - 対象: PageList 周辺の取得フィールド、PageLikeListClient
   - 例: いいね情報は後読み/別リクエスト、カードのサマリのみ先に出す
   - 期待: RSC payload削減、クライアントJS削減
3. RSCの多重リクエスト削減
   - 対象: /ja/search などの _rsc 多発
   - 例: prefetch/先読みの抑制、必要時のみ
   - 期待: ネットワーク/サーバー負荷低減（FCPは限定的）
4. 初期JSチャンク削減
   - analyzerで大きいチャンクの依存を切る（共通UI/アイコン/リッチUIを遅延）
   - 期待: main thread負荷の緩和

この先は表示内容・UX変更が必須なので、どこまで削ってOKかだけ教えてください。
例: 「/ja のタグ別リストは初期非表示でOK」など。
