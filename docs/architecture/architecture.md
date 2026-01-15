# アーキテクチャ概要

Evame は Next.js（App Router）を中心に構成された翻訳・注釈プラットフォームです。
本ドキュメントは「全体像」「主要コンポーネント」「依存関係」「データの流れ」を最短で理解するための入口です。

## 技術スタック（現行）

- フレームワーク: Next.js 16（App Router）
- 言語: TypeScript
- UI: React 19 + Tailwind CSS + Radix UI 系コンポーネント
- i18n: next-intl
- DB: PostgreSQL
- DB アクセス: Kysely（ランタイム） + Drizzle（スキーマ/マイグレーション）
- 認証: better-auth

## リポジトリ構成（要約）

```
/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # 共有 UI
│   ├── db/                  # DB 接続・型・シード
│   ├── drizzle/             # スキーマとマイグレーション
│   ├── i18n/                # i18n 設定
│   ├── lib/                 # 汎用ユーティリティ（業務ロジック禁止）
│   └── utils/               # 共有ユーティリティ
├── docs/                    # ドキュメント
└── ...
```

詳細な配置ルールは `docs/architecture/conventions/route-colocation.md` を参照してください。

## 主要コンポーネントと責務

### App Router（`src/app`）
- 画面・ルート・API ルート（Route Handler）を管理
- `src/app/[locale]` が多言語対応の基点
- ルート内のコードはコロケーションルールで完結させる

### 共有 UI（`src/components`）
- 複数ルートから参照される UI を集約
- ルート専用コンポーネントは各ルート内へ配置

### サービス／ドメイン
- ルート直下の `_service` / `_domain` / `_db` でルート内の共有ロジックを整理
- コンポーネント専用のロジックはそのコンポーネント配下へ

### DB レイヤー
- `src/db` で接続・型・シードを管理
- 取得/更新ロジックはルート内の `_db` や `db/` に置く

### 認証
- `src/auth.ts` がエントリポイント
- better-auth + magic link を中心に構成

### i18n
- `src/i18n` に設定を集約
- ルートは `src/app/[locale]` を基本とする

## データの流れ（代表パターン）

1. ルートコンポーネントが Server Component として描画
2. 必要なデータ取得はルート配下の `service` または `_db` 経由で実行
3. 取得結果を Server Component でレンダリング
4. ユーザー操作が必要な箇所のみ Client Component を使用

## 依存方向（要約）

- `service` → `domain` / `db` / `utils`
- `domain` → `utils`（`db` へ直接依存しない）
- `components` → `service` / `domain` / `db` / `utils`

詳細は `docs/architecture/conventions/route-colocation.md` を参照してください。
