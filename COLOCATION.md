# コロケーション規約

機能ごと（feature-first）にコードをまとめ、「この機能はこのフォルダだけ見れば全部わかる」を目指す。

## ディレクトリ構造

```
feature-name/
  domain/              # 純粋ロジック（I/Oなし）
    sub-feature/       # 関連するdomainロジックをまとめる（必要に応じて）
  db/                  # DBアクセス（Prisma等）
  _use-case-name/      # 内部実装のユースケース（外部からimport禁止）
    application/       # ユースケースのフロー
    domain/            # このユースケース専用の純粋ロジック
      sub-feature/     # 関連するdomainロジックをまとめる（必要に応じて）
    utils/             # 小さな汎用的なヘルパー関数
```

## 各ディレクトリの役割

### `feature/domain/`
- 複数ユースケースで使う純粋ロジック（ビジネスロジック）
- 外部I/Oなし（Prisma、fetch等禁止）
- 他のfeatureでも使いたくなったら上の階層に昇格
- 関連するコードはサブフォルダでまとめる（例: `feature/domain/file-parsing/`）

### `feature/utils/`（オプション）
- feature全体で使う小さな汎用的なヘルパー関数（テストするほどでもない）
- データ変換、文字列処理、ソートなど
- 純粋関数でI/Oなし

### `feature/db/`
- このfeature専用のDBアクセス層
- PrismaやSQLはここに集約
- `application/`から呼ばれる

### `feature/_xxx/application/`
- ユースケースのフロー定義
- `domain/`のロジックと`db/`のリポジトリを組み合わせる
- 他のユースケースを呼ぶこともある

### `feature/_xxx/domain/`
- このユースケース専用の純粋ロジック
- 再利用したくなったら`feature/domain/`に昇格
- 関連するコードはサブフォルダでまとめる（例: `feature/_xxx/domain/validation/`）

### `feature/_xxx/utils/`
- 小さな汎用的なヘルパー関数（テストするほどでもない）
- データ変換、文字列処理、ソートなど
- 純粋関数でI/Oなし（`domain/`と同じ制約）
- `domain/`よりも小さく、より汎用的な処理

### `_xxx/`（アンダースコア）
- 「内部実装詳細」のサイン
- 親ユースケースの外からimport禁止

## 依存関係のルール

```
application/ → domain/ ✅
application/ → utils/ ✅
application/ → db/ ✅
domain/ → utils/ ✅
domain/ → db/ ❌（必ずapplication経由）
utils/ → db/ ❌（必ずapplication経由）
外部 → _xxx/ ❌（内部実装）
```

## テスト方針

- **`domain/`**: ユニットテスト（ロジック・分岐・境界値）
- **`utils/`**: テスト不要（シンプルなヘルパー関数）
- **`db/`**: 必要なところだけテストDBで統合テスト
- **`application/`**: ハッピーパス + 最小限のケース

