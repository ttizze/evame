# ルートコロケーション運用ルール

このドキュメントは「このルートのことはこのフォルダだけ見れば全部わかる」を実現するための配置ルールです。
既存のアーキテクチャ文書とは別に、実装の現状と運用ルールを明文化します。


## 基本方針
- ルート配下で必要なコードを完結させる
- ルート内の責務を `layer` ごとに分ける
- `_` は「Next.js のルート除外用」トップレベルにのみ使う
- コンポーネント専用のロジックはそのコンポーネント配下へ置く

## ディレクトリ構造

```
route-a/
  _components/            # route-a 専用のUIコンポーネント
    component-a/
      service/           # component-a 専用のサービス
        service-a.ts
        service-b/        # 複雑なサービスはサブフォルダにまとめる
          domain/
          db/
  _db/                    # route-a 専用のDBアクセス
    queries.server.ts
  _domain/                # route-a 専用のドメイン
    domain-a.ts
  _service/               # route-a 専用のサービス
    service-a.ts
  _hooks/                 # route-a 専用のhooks
  _utils/                 # route-a 専用の純粋ヘルパー
  page.tsx
  route-b/                 # 別のルート
    _domain/               # route-b 専用のドメイン
      domain-a.ts
    _db/                   # route-b 専用のDBアクセス
      queries.server.ts
    _service/              # route-b 専用のサービス
      service-a.ts
    page.tsx
```

## 各レイヤーの役割

### `service/`
- ユースケース（サービス）のフロー定義
- `domain/` と `db/` を組み合わせて副作用をオーケストレーション
- 基本は「1サービス = 1ファイル」。複雑な場合はサブフォルダに `domain/` や `db/` を配置

### `domain/`
- 純粋ビジネスロジック、ドメインの意味を持つ（I/O禁止）
- 複数サービスで共有する場合はルート直下の `_domain/`、サービス/コンポーネント専用は各配下の `domain/`

### `db/`
- DB kysely
- サービス層からのみ呼び出される
- ルート全体で使う場合は `_db/`、サービス/コンポーネント専用は各配下の `db/`

### `utils/`（任意）
- 純粋な小ヘルパー（I/O禁止）。汎用的な技術的ヘルパーでドメインに依存しない｡ドメインの意味を持つなら `domain/` に昇格

## 配置ルール

- **ルート直下**: `_components/`, `_db/`, `_domain/`, `_service/`, `_utils/` など（`_` 付き）
- **コンポーネント配下**: `service/`, `domain/`, `db/`, `utils/`, `hooks/` など（`_` なし）
- **サービス配下**: `domain/`, `db/` など（`_` なし）
- コンポーネント間で共有するロジックはルート直下の `_domain/` や `_db/` に配置

## 依存方向

- route 内の依存方向:
  - `service/` → `domain/`, `db/`, `utils/` ✅
  - `domain/` → `utils/` ✅
  - `domain/` → `db/` ❌（必ず service 経由）
  - `utils/` → `db/` ❌
  - `components/` → `service/`, `domain/`, `db/`, `utils/` ✅

## 共有の扱い（例外ではなくルール）

### 1. ルート内共有

同一ルート内で複数箇所から使うものは、ルート直下の `_service/_domain/_db/_hooks/_utils` に置く。

例:
```
src/app/[locale]/_service/
src/app/[locale]/_hooks/
src/app/[locale]/_utils/
```

### 2. API ルート内共有

API ルートで完結するものは `src/app/api/{route}/_domain` や `src/app/api/{route}/_types` に配置。
API から UI 側が参照する型も、API ルート内に配置する。

### 3. Shadcn の utils

`cn` を含む Shadcn 由来の `utils.ts` は `src/lib/utils.ts` に置く（運用上の固定例外）。

## types の配置ルール

- **UI/API 共有型**: 使用する境界に最も近い場所へ置く
  - 例: `src/app/api/notifications/_types/notification.ts`
  - 例: `src/app/api/page-likes/_types/like-state.ts`
- **ルート内専用型**: そのルート配下へ置く

## 禁止事項

- `src/lib` に業務ロジックやユースケースを追加しない（Shadcn 由来 utils 以外）
- `domain` から `db` を直接参照しない
- `_` 付きディレクトリをコンポーネント配下に作らない

## 運用ルール

- 単独参照のものは最も近いスコープへ移動
- 3件以上で同一関心ならディレクトリ化する
- 変更後は `bun run typecheck` と `bun run biome` を実行する


## テスト方針

- **`domain/`**: ユニットテストを厚めに。分岐・境界値の責務はここで担保
- **`utils/`**: シンプルなものは省略可。複雑になったら `domain/` に昇格してテストを書く
- **`db/`**: 必要箇所だけ統合テスト（テスト DB）。複雑クエリや重要な制約を優先
- **`service/`**: ハッピーパス＋主要な異常系を押さえ、どの domain/db をどうオーケストレーションするかを確認
