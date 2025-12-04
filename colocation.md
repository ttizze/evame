# colocation

機能ごと（feature-first）にコードをまとめ、「この機能はこのフォルダだけ見れば全部わかる」を目指す。

## 基本概念

- **feature** = まとまりのある機能単位
- **layer** = feature の中の役割（application / domain / db / utils）
- **`_`** = Next.js のルート除外専用（route files を置かないバケツ）
- **内部実装かどうか** = 「どこから import してよいか」という運用ルールで区別（記号では区別しない）

## ディレクトリ構造

feature 直下には「レイヤ名」だけ置く。ユースケース名のフォルダを feature 直下に混在させない。

```
feature-name/
  application/          # ユースケースのフロー
    use-case-name.ts
    another-use-case.ts
    complex-use-case/   # そのユースケース専用の domain/ や db/ がある場合のサブフォルダ（コロケーション原則）
      application/      # このユースケースのフロー
        index.ts
        prepare-input.ts
      domain/           # このユースケース専用の純粋ロジック
        validation.ts
      db/               # このユースケース専用の DB アクセス
        query.ts
  domain/               # 複数ユースケースで使う純粋ロジック（I/Oなし）
    sub-feature/
      logic-a.ts
      logic-b.ts
    another-sub-feature/
      helper.ts
  db/                   # feature 専用の DB アクセス（Prisma 等）
    query.ts
    mutation.ts
  utils/                # feature 内で使う小さな純粋ヘルパー（オプション）
    formatter.ts
    sorter.ts
```

## 各レイヤーの役割

### `feature/application/`
- ユースケースのフロー定義
- `domain/` のロジックと `db/` のリポジトリを組み合わせる層
- 基本は「1ユースケース = 1ファイル」
- **そのユースケースでしか使わない `domain/` や `db/` がある場合は、コロケーション原則に従ってサブフォルダを切る**
- サブフォルダ内では、`application/`, `domain/`, `db/` のレイヤー構造を維持する
- 1ファイルで収まらない場合は、サブフォルダ内の `application/` に複数ファイルを配置する

### `feature/domain/`
- 複数ユースケースで使う純粋ロジック（ビジネスロジック）
- 外部 I/O なし（Prisma、fetch 等禁止）
- 他の feature でも使いたくなったら、必要に応じて上位（shared/domain/ 等）に昇格
- 関連するロジックはサブフォルダでまとめる
- **1ユースケースでしか使わないドメインロジックは、そのユースケースのサブフォルダ内に `domain/` を置く（コロケーション原則）**

### `feature/db/`
- この feature 専用の DB アクセス層
- Prisma や SQL はここに集約
- `application/` からだけ呼ばれる
- **1ユースケースでしか使わない DB アクセスは、そのユースケースのサブフォルダ内に `db/` を置く（コロケーション原則）**

### `feature/utils/`（オプション）
- feature 全体で使う小さな純粋ヘルパー
- データ変換、文字列処理、ソートなど
- I/O 禁止
- 「ドメインの意味を持つロジック」は `domain/`、「ただの形式変換・小技」は `utils/` に寄せる

## 内部実装の扱い（記号を使わない）


**ポリシー：**
- feature の **外** から import してよいのは：`feature/application/`（or その index.ts）だけ
- feature の **中** では：
  - `application/` → `domain/`, `db/`, `utils/` を自由に使ってよい
  - `domain/` → `utils/` は OK
  - `domain/` → `db/` は禁止（必ず application 経由）

これを守ることで、「内部実装かどうか」を名前ではなく **依存方向と import 規約** で表現する。

## Next.js App Router との組み合わせ

### `_`（アンダースコア）の意味
`_` は Next.js のルート除外専用とする。「内部実装」の意味では使わない。

```
page/[pageSlug]/
  page.tsx                 # ルートの入口
  _db/                     # このルート専用のDBアクセス（route files を置かない）
    queries.server.ts
  _components/             # このルート専用のUIとfeature
    PageClient.tsx
    feature-name/          # 画面内の feature
      application/
        use-case.ts
      domain/
      db/
```

**ルール：**
- `src/app/...` 直下で `page.tsx` を置かないバケツには `_` を付ける（`_components`, `_db`, `_hooks`）
- `_components` の下は「普通の feature フォルダ」として扱い、feature/application / feature/domain / feature/db / feature/utils のルールを適用
- 「内部ユースケースだから `_xxx`」みたいに `_` を二重の意味で使わない

## 依存関係のルール

```
application/ → domain/ ✅
application/ → utils/ ✅
application/ → db/ ✅
domain/ → utils/ ✅
utils/ → domain/ ❌（避ける）
domain/ → db/ ❌（必ず application 経由）
utils/ → db/ ❌（必ず application 経由）

他 feature → feature/application/** ✅（公開API）
他 feature → feature/domain/** ❌
他 feature → feature/db/** ❌
他 feature → feature/utils/** ❌
```
## テスト方針

- **`domain/`**: ユニットテスト（ロジック・分岐・境界値）を厚めに書く
- **`utils/`**: シンプルなものはテスト省略可。複雑になってきたら `domain/` に昇格させてテストを書く
- **`db/`**: 必要なところだけテスト DB で統合テスト。生 SQL / 複雑クエリ / 重要なビジネスルールが絡むところを優先
- **`application/`**: ハッピーパス + 最小限のケース。「どの domain/db をどの順で呼ぶか」の確認用。分岐の網羅は `domain/` 側でやる
