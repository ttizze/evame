# colocation

各ルート配下で必要なコードをまとめ、「このルートのことはこのフォルダだけ見れば全部わかる」を目指す。

## 基本概念

- **route** = ルート（画面や編集体験など）
- **layer** = route の中の役割（component / service / domain / db / utils）
- **`_`** = Next.js のルート除外専用（`page.tsx` を置かないトップレベルのフォルダに付ける）
- コンポーネントでしか使わないコードはコンポーネント配下、共通のコードはルート直下に配置

## ディレクトリ構造

```
route-a/
  _components/            # route-a 専用のUIコンポーネント
    component-a/
      service/            # component-a 専用で使うユースケース（サービス）
        service-a.ts
        service-b/        # 複雑なサービスはサブフォルダにまとめる
          domain/
          db/
  _db/                    # route-a 専用で使うDBアクセス
    queries.server.ts
  _domain/                 # route-a 専用で使うドメインロジック
    domain-a.ts
  _service/                # route-a 専用で使うユースケース（サービス）
    service-a.ts
  _utils/                  # route-a 専用で使う純粋なヘルパー
    utils.ts
  page.tsx
  route-b/          # 別のルート
    _domain/           # route-b 専用で使うドメインロジック
      domain-a.ts
    _db/               # route-b 専用で使うDBアクセス
      queries.server.ts
    _service/          # route-b 専用で使うユースケース（サービス）
      service-a.ts
      service-b/        # 複雑なサービスはサブフォルダにまとめる
        domain/
        db/            # route-b 専用で使うDBアクセス
    page.tsx
```

## 各レイヤーの役割

### `service/`
- ユースケース（サービス）のフロー定義
- `domain/` と `db/` を組み合わせて副作用をオーケストレーション
- 基本は「1サービス = 1ファイル」。複雑な場合はサブフォルダに `domain/` や `db/` を配置

### `domain/`
- 純粋ビジネスロジック（I/O禁止）
- 複数サービスで共有する場合はルート直下の `_domain/`、サービス/コンポーネント専用は各配下の `domain/`

### `db/`
- DB アクセス層（Prisma / SQL）
- サービス層からのみ呼び出される
- ルート全体で使う場合は `_db/`、サービス/コンポーネント専用は各配下の `db/`

### `utils/`（任意）
- 純粋な小ヘルパー（I/O禁止）。ドメインの意味を持つなら `domain/` に昇格

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

## テスト方針

- **`domain/`**: ユニットテストを厚めに。分岐・境界値の責務はここで担保
- **`utils/`**: シンプルなものは省略可。複雑になったら `domain/` に昇格してテストを書く
- **`db/`**: 必要箇所だけ統合テスト（テスト DB）。複雑クエリや重要な制約を優先
- **`service/`**: ハッピーパス＋主要な異常系を押さえ、どの domain/db をどうオーケストレーションするかを確認
