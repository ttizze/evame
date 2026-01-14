# Requirements

## 静的生成の最優先
- ルート全体を dynamic にしないことを最優先とする。
- `layout`/`provider` では `useSearchParams` / `useQueryState` を使用しない。
- URL 同期は必要最小の Client Component に限定する。
- `useSearchParams`/`useQueryState` を使う場合は、使用箇所の直近で `Suspense` を置く。

## URL 同期（displayMode）
- `displayMode` の URL 同期は `DisplayModeCycle` など操作 UI に限定する。
- provider は状態共有のみを担当し、副作用（URL/クッキー同期）は持たせない。

