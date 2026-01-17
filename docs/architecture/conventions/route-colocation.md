# ルート内コロケーション規約

このドキュメントは「このルートのことはこのフォルダだけ見れば分かる」を実現するための配置ルールです。

## 基本方針
- ルート配下で必要なコードを完結させる
- ルート内の責務を `layer` ごとに分ける
- `_` は **Next.js のルート除外用** に限定する
- コンポーネント専用ロジックはそのコンポーネント配下へ置く
- コンポーネントは責務ごとに分割し、分割したものは同一コンポーネント配下にまとめる

## ディレクトリ構造（例）

```
src/app/[locale]/route-a/
  _components/            # route-a 専用の UI
    component-a/
      service/            # component-a 専用のサービス
        service-a.ts
        service-b/
          domain/
          db/
  _db/                    # route-a 専用の DB アクセス
  _domain/                # route-a 専用のドメイン
  _service/               # route-a 専用のサービス
  _hooks/                 # route-a 専用の hooks
  _utils/                 # route-a 専用の純粋ヘルパー
  page.tsx
```

## 各レイヤーの役割

### `service/`
- ユースケース（サービス）のフロー定義
- `domain/` と `db/` を組み合わせて副作用をオーケストレーション
- 基本は「1サービス = 1ファイル」。複雑な場合のみサブフォルダ化

### `domain/`
- 純粋ビジネスロジック（I/O 禁止）
- 複数サービスで共有する場合はルート直下の `_domain/`

### `db/`
- DB アクセス（Kysely）
- サービス層からのみ呼び出す
- ルート全体で使う場合は `_db/`

### `utils/`
- 純粋な小ヘルパー（I/O 禁止）
- ドメインの意味を持つなら `domain/` に昇格

## 配置ルール

- **ルート直下**: `_components/`, `_db/`, `_domain/`, `_service/`, `_utils/` など（`_` 付き）
- **コンポーネント配下**: `service/`, `domain/`, `db/`, `utils/`, `hooks/` など（`_` なし）
- **サービス配下**: `domain/`, `db/` など（`_` なし）

## 依存方向

- `service` → `domain` / `db` / `utils` ✅
- `domain` → `utils` ✅
- `domain` → `db` ❌（必ず service 経由）
- `utils` → `db` ❌
- `components` → `service` / `domain` / `db` / `utils` ✅

## 共有の扱い（例外ではなくルール）

### ルート内共有
- 同一ルート内で複数箇所から使うものは、ルート直下の `_service/_domain/_db/_hooks/_utils` に置く

### API ルート内共有
- API ルートで完結するものは `src/app/api/{route}/_domain` や `src/app/api/{route}/_types` に置く
- API から UI 側が参照する型も、API ルート内に配置する

### Shadcn 由来の `utils`
- `cn` を含む `utils.ts` は `src/lib/utils.ts` に置く（運用上の固定例外）

## types の配置ルール

- **UI/API 共有型**: 使用する境界に最も近い場所へ置く
- **ルート内専用型**: そのルート配下へ置く

## 禁止事項

- `src/lib` に業務ロジックやユースケースを追加しない
- `domain` から `db` を直接参照しない
- `_` 付きディレクトリをコンポーネント配下に作らない

## 運用ルール

- 単独参照のものは最も近いスコープへ移動
- 3件以上で同一関心ならディレクトリ化
- 変更後は `bun run typecheck` と `bun run biome` を実行

## テスト方針

- **`domain/`**: ユニットテストを厚めに。分岐・境界値の責務はここで担保
- **`utils/`**: シンプルなものは省略可。複雑になったら `domain/` に昇格してテストを書く
- **`db/`**: 必要箇所だけ統合テスト（テスト DB）。複雑クエリや重要な制約を優先
- **`service/`**: ハッピーパス＋主要な異常系を押さえ、どの domain/db をどうオーケストレーションするかを確認
