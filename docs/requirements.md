# 要件・仕様（1枚）

## 目的
- ユーザー投稿テキストに翻訳・注釈・解説を付けて共有しやすくする
- 多言語対応の読みやすい閲覧体験を提供する

## 必須条件（実装前提）
- **静的生成を最優先**: ルート全体を dynamic にしない
- `layout` / `provider` では `useSearchParams` / `useQueryState` を使わない
- URL 同期は必要最小の Client Component に限定する
- `useSearchParams` / `useQueryState` を使う場合は、使用箇所の直近に `Suspense` を置く

## 表示モード同期（displayMode）
- `displayMode` の URL 同期は UI 操作コンポーネント（例: `DisplayModeCycle`）に限定する
- provider は状態共有のみを担当し、副作用（URL/クッキー同期）を持たせない

## 測り方（確認方法）
- `next build` の出力でルートが不要に dynamic 化されていないこと
- `bun run typecheck` / `bun run biome` が通ること
- 変更した画面・ルートで最低限の手動動作確認を行うこと

## 決まり（運用ルール）
- コード配置は `docs/architecture/conventions/route-colocation.md` に従う
- 変更は最小限で、シンプルさを最優先する
- `useMemo` / `useCallback` を使用しない
- `useEffect` は必要な場合のみ
- 不要なコードは削除する
