# CLIアップロードとGitHub同期の統合仕様（最小構成）

## 目的
- CLIアップロードとGitHub同期を同時に提供しつつ、仕様を最小構成で破綻させない
- アプリ編集を常に許可し、外部入力との競合を安全に検出する
- 判定ロジックは1つに統一し、CLI/GitHubはUXだけ分離する

## ドキュメント境界
- 本書は「同期判定・適用ロジック」の仕様のみを扱う
- GitHub接続・認可・運用の詳細は `docs/plans/github-integration-design.md` で管理する

## 用語
- `Revision`: 外部入力の版ID
  - CLI/GitHub共通で、同一アルゴリズムで計算した「ページ単位ハッシュ」
- `new_revision`: 当該slugに今回適用したい新しい外部Revision
- `expected_revision`: 当該slugでクライアント/イベントが「現在これのはず」と主張する期待Revision
- `UPSERT_INPUT`: 外部差分で「追加または更新」として渡される入力
- `DELETE_INPUT`: 外部差分で「削除」として渡される入力
- `contentChecksum`: body部分（frontmatter除外）のSHA256hex値
- `new_checksum`: 外部入力のbody部分から算出した `contentChecksum`
- `page現在checksum`: DBの `pages.content_checksum`（`body` 保存時に自動計算）
- `差分プレビュー`: DBを書き換えず、変更分類だけ返す実行（永続化しない）

## 同期元の識別
- 同期の整合性管理は `expected_revision` / `last_synced_revision` のみで行う
- `pages` テーブルに同期元（CLI / GitHub）を識別するカラムは持たない
- デバッグ時は `last_synced_revision`（最後に適用された版）と `expected_revision_mismatch` エラー（何とずれたか）で追跡できる
- GitHub Webhookの受信履歴は `webhook_deliveries` テーブルで別途記録される

## ファイル→slugマッピング
- ファイル名（拡張子除去）がそのままslugになる
  - 例: `my-first-post.md` → slug = `my-first-post`
- リポジトリルート直下のフラット構成（サブディレクトリ非対応）
- slug命名規則: `[0-9a-z\-]{1,50}`（小文字英数字とハイフンのみ）
- CLI: 作業ディレクトリ直下の `.md` ファイルが対象
- GitHub: `file_glob` で絞り込んだ `.md` ファイルが対象

## Revision生成仕様（具体）
- 1 slug = 1ファイル（slugとファイルは1対1）
- 共通アルゴリズム（ページ単位）:
  1. `"{relativePath}\t{contentChecksum}\t{published_at_or_empty}\t{title}"` を作る
     - `relativePath`: ファイル名そのもの（例: `my-post.md`）。`{slug}.md` と等価
     - `contentChecksum`: body部分（frontmatter除外）のSHA256hex
     - `published_at_or_empty`: ISO8601 UTC文字列（例: `2024-01-01T00:00:00Z`）。未設定時は空文字 `""`
     - `title`: ページタイトル文字列
  2. 上記文字列を `sha256` した値を当該slugの `Revision` とする
- GitHub:
  - `UPSERT_INPUT`: `new_revision` は `push.after` の対象ファイル、`expected_revision` は `push.before` の同一ファイルから計算する
  - `DELETE_INPUT`: `expected_revision` は `push.before` の削除対象ファイルから計算する（`new_revision` は持たない）
- CLI:
  - `UPSERT_INPUT`: `new_revision` はローカルファイルから計算する
  - `expected_revision` はCLIローカル状態（例: `.evame/state.json`）に保持した「slugごとの前回適用Revision」を送る
  - `DELETE_INPUT`: `expected_revision` は同ローカル状態の削除対象slugの値を送る
- 初回push時の `expected_revision`:
  - GitHub: `push.before` が all-zeros（初回push / ブランチ新規作成）→ `expected_revision = null`
  - CLI: `.evame/state.json` に該当slugが存在しない → `expected_revision = null`
  - `expected_revision = null` の判定:
    - slug未使用 → `AUTO_APPLY`（新規作成）
    - slug既存・`last_synced_revision = NULL`（アプリ起点）→ Revision比較で判定（B.1 に従う）
    - slug既存・`last_synced_revision != NULL` → `CONFLICT(expected_revision_mismatch)`

## 同期入力フォーマット（仕様）
- `expected_revision` は「入力ごと（slugごと）」に持つ
- 例（概念）:
  - `UPSERT_INPUT`: `{ slug, expected_revision, new_revision, new_checksum }`
  - `DELETE_INPUT`: `{ slug, expected_revision }`

## Frontmatter仕様（CLI/GitHub共通）
- フォーマット: YAML frontmatter
  ```yaml
  ---
  title: "ページタイトル"                  # 必須
  published_at: "2024-01-01T00:00:00Z"   # 任意、ISO8601 UTC
  ---
  本文（Markdown）
  ```
- フィールド:
  - `title`（必須）: `pages.title` にマッピング
  - `published_at`（任意）: `pages.published_at` にマッピング。省略時は `null`（= DRAFT）
- `status` はfrontmatterに含めない（`published_at` と削除操作から導出する）
- body: frontmatter以降のMarkdown本文 → `pages.body` にマッピング
- 不正時は `422 Unprocessable Entity` を返す（`title` 欠落、`published_at` が不正な日時形式など）

## テーブル構造（SQLではなく構造定義）

### 1. `pages`（既存中心）
- `id`
- `slug`（一意）
- `title`
- `body`
- `content_checksum`（`body` のSHA256hex。保存時に自動計算）
- `status`（`DRAFT` / `PUBLIC`）
- `published_at`（公開開始日時。`PUBLIC` 判定に使う）
- `last_synced_revision`（このページに最後に適用した外部Revision）
- `updated_at`

### 2. `archived_pages`（削除履歴）
- `id`
- `original_page_id`（元の `pages.id`）
- `slug`（一意制約なし。同一slugが複数回アーカイブされうる）
- `title`
- `body`
- `content_checksum`
- `published_at`
- `last_synced_revision`
- `archived_by`（`app` / `cli` / `github`）
- `archived_at`

## 共通判定ロジック（CLI/GitHub共通）

### A. リクエスト前処理
1. `expected_revision -> new_revision` の外部差分から、slug単位の入力を作る
   - 追加/更新ファイル: `UPSERT_INPUT`
   - 削除ファイル: `DELETE_INPUT`
2. 各入力slugについて、サーバーDBの `pages.slug` で対象ページを照合する
3. `UPSERT_INPUT` で対象ページが存在し、`new_revision == page.last_synced_revision` なら `NO_CHANGE` として扱う（冪等）
4. 対象ページが存在し、`page.last_synced_revision != NULL` かつ `expected_revision != page.last_synced_revision` なら `409(expected_revision_mismatch)` で拒否する
   - `expected_revision_mismatch` は「当該slugの期待Revisionがサーバーの当該ページ最新同期Revisionと一致しない」ことを意味する

### B. ページ単位の分類（slugのみ）
判定起点:
- 新規/更新/衝突の一次判定は、サーバーDBの `pages.slug` 照合結果で行う
- クライアント（CLI/GitHub）の「新規のつもり/更新のつもり」は判定根拠にしない

1. `UPSERT_INPUT`（外部で追加/更新されたslug）
   - `slug` 未使用（対象ページなし）: `AUTO_APPLY(UPSERT)`（新規作成）
   - `slug` 既存（対象ページあり）: 次で判定
     - `page.last_synced_revision == NULL`（アプリ起点ページ）のとき:
       - ページの現在状態（`slug→relativePath`, `title`, `content_checksum`, `published_at`）から同一アルゴリズムでRevisionを算出し `new_revision` と比較:
         - 一致: `NO_CHANGE`
         - 不一致: `CONFLICT(app_owned_page_conflict)`
     - `page.last_synced_revision != NULL` かつ `expected_revision == page.last_synced_revision` のとき:
       - `AUTO_APPLY(UPSERT)`（A.3で同一Revisionは既にNO_CHANGE判定済み）
     - `page.last_synced_revision != NULL` かつ `expected_revision != page.last_synced_revision` のとき:
       - `CONFLICT(expected_revision_mismatch)`（前処理で即時拒否）
2. `DELETE_INPUT`（外部で削除されたslug）
   - `slug` 未使用（対象ページなし）: `NO_CHANGE`
   - `slug` 既存（対象ページあり）:
     - `page.last_synced_revision != NULL` かつ `expected_revision == page.last_synced_revision`: `AUTO_APPLY(DELETE)`
     - それ以外: `CONFLICT(delete_conflict)`

誤解しやすい点:
- 「CLI新規のつもりで送ったが slug が既存」は通常の更新判定になる。即 `slug_collision` にはしない。
- `slug` 既存の判定基準は、同期時点でのサーバーDB `pages.slug` 照合結果のみ。

### C. 適用ルール
- `AUTO_APPLY` のみなら適用して完了
- 1件でも `CONFLICT` があれば自動適用しない
- 適用成功時:
  - `AUTO_APPLY(UPSERT)`: 対象ページの `last_synced_revision = new_revision`
  - `AUTO_APPLY(DELETE)`: `pages` から削除し `archived_pages` に移動（同一トランザクション）

### D. 原子性（判定→適用）
- トランザクションスコープはslug単位
- 各slugの判定と適用は同一トランザクションで実行する
- 判定対象の既存ページ行は `SELECT ... FOR UPDATE` で先にロックする
- ロック取得後のスナップショットで判定し、そのまま適用してコミットする
- ロック待ちタイムアウト時は `409(concurrent_update_conflict)` を返し、再試行させる
- 全体の流れ:
  1. 全slugを分類（読み取りのみ、ロックなし）
  2. 1件でも `CONFLICT` があれば全体を拒否（書き込みなし）
  3. 全て `AUTO_APPLY` / `NO_CHANGE` なら、各slugを個別トランザクションで適用
  4. 適用中に競合が発生した場合は、そのslugのみ失敗として結果に含める

## CLIとGitHubのUX分離

### CLI
- `evame push`（既定）
  - 共通判定を実行
  - `CONFLICT=0` なら適用して終了
  - `CONFLICT>0` なら非0終了 + 競合一覧を表示
- `evame push --interactive`
  - 同一判定結果をTUI表示
  - 競合項目ごとに解決アクションを選択し、解決後に1回で適用
  - 解決アクション:
    - `APPLY_NEW`: 外部入力を適用する（UPSERT→上書き、DELETE→削除）。`last_synced_revision` を `new_revision` に更新
    - `KEEP_APP`: サーバーの現在版を維持し、`last_synced_revision` を `new_revision` に更新する（以降の同期で同一入力との再競合を防ぐ）
    - `DELETE_APP`: サーバーのページを削除する（`archived_pages` に移動）。外部入力の内容は適用しない
    - `SKIP`: 当該slugの処理をスキップする（状態変更なし。次回pushで再判定される）

### GitHub
- Webhook受信後に共通判定を実行
- `CONFLICT=0` なら自動適用
- `CONFLICT>0` なら適用せず終了
- GitHub Check Runに競合理由を返し、次のcommitで再試行させる

## アプリ編集の扱い
- アプリ編集は常に許可
- 編集したページは `last_synced_revision = NULL` にする
- 次回外部入力時に `app_owned_page_conflict` を確実に検出する
- アプリで `published_at` を更新した場合は、その時点で公開判定を再評価する
- アプリ起点ページ（`last_synced_revision=NULL`）に外部更新が来た場合:
  - 内容一致のみ `NO_CHANGE`
  - 内容差分は常に `CONFLICT(app_owned_page_conflict)`

## アプリ削除の扱い
- アプリからページを削除 → `pages` から削除し `archived_pages` に移動（`archived_by = 'app'`）
- 復元:
  - slug が `pages` に存在しない → `archived_pages` から `pages` に移動して復元（`last_synced_revision = NULL`）
  - slug が `pages` に既に存在する → 復元をブロック（「このslugは使用中です」）
- 外部削除（CLI/GitHub）の復元はアプリUIでは行わない（再pushで対応）

## 公開仕様
- `status`: `DRAFT` / `PUBLIC`
- `published_at`: 公開開始日時（この日時に公開される）
- 予約公開は `published_at` に未来日時を設定して行う（専用カラムは持たない）
- 外部入力（CLI/GitHub）では frontmatter の `published_at` から設定する（省略時は `null` = DRAFT）
- 削除されたページは `archived_pages` に移動するため、`pages` テーブルに削除状態は持たない

### 公開判定
評価順（上から優先）:
1. `published_at = NULL` -> `DRAFT`
2. `published_at > now` -> `DRAFT`（公開待ち）
3. `published_at <= now` -> `PUBLIC`

## 全パターン網羅（判定結果一覧）

### App入力

| No | 入力 | 事前状態 | 判定 | 既定動作 |
|---|---|---|---|---|
| 1 | App新規 | `published_at=NULL` | DRAFT | 下書き作成（`last_synced_revision=NULL`） |
| 2 | App新規 | `published_at > now` | DRAFT | 予約公開として作成（`last_synced_revision=NULL`） |
| 3 | App新規 | `published_at <= now` | PUBLIC | 即時公開で作成（`last_synced_revision=NULL`） |
| 4 | App更新 | 既存ページ本文を編集 | 許可 | 保存 + `last_synced_revision=NULL` |
| 5 | App更新 | 直前が外部同期ページ | 許可 | 保存 + `last_synced_revision=NULL` |
| 6 | App更新 | `published_at=NULL` に変更 | DRAFT | 非公開化 |
| 7 | App更新 | `published_at > now` に変更 | DRAFT | 予約公開として待機 |
| 8 | App更新 | `published_at <= now` に変更 | PUBLIC | 即時公開（または公開維持） |
| 9 | App削除 | 既存ページ | 許可 | `archived_pages` に移動 |
| 10 | App復元 | slug未使用 | 許可 | `archived_pages` → `pages` に移動（`last_synced_revision=NULL`） |
| 11 | App復元 | slug使用中 | ブロック | 「このslugは使用中です」 |

### CLI入力

| No | 入力 | 事前状態 | 判定 | 既定動作 |
|---|---|---|---|---|
| 12 | CLI `UPSERT_INPUT` | slug未使用 | AUTO_APPLY | 新規作成 |
| 13 | CLI `UPSERT_INPUT` | slug既存・アプリ起点ページ・同内容 | NO_CHANGE | 何もしない |
| 14 | CLI `UPSERT_INPUT` | slug既存・アプリ起点ページ・内容差分 | CONFLICT | 停止して一覧表示 |
| 15 | CLI `UPSERT_INPUT` | slug既存・外部同期ページ・`expected` 一致・同内容（`new==last_synced` 含む） | NO_CHANGE | 何もしない |
| 16 | CLI `UPSERT_INPUT` | slug既存・外部同期ページ・`expected` 一致・内容差分 | AUTO_APPLY | 上書き更新 |
| 17 | CLI `UPSERT_INPUT` | slug既存・外部同期ページ・`expected` 不一致 | CONFLICT | 409で拒否 |
| 18 | CLI `DELETE_INPUT` | slug未使用 | NO_CHANGE | 何もしない |
| 19 | CLI `DELETE_INPUT` | slug既存・外部同期ページ・`expected` 一致 | AUTO_APPLY | `archived_pages` に移動 |
| 20 | CLI `DELETE_INPUT` | slug既存・アプリ起点ページ or `expected` 不一致 | CONFLICT | 停止して一覧表示 |

### GitHub入力

| No | 入力 | 事前状態 | 判定 | 既定動作 |
|---|---|---|---|---|
| 21 | GitHub `UPSERT_INPUT` | slug未使用 | AUTO_APPLY | 新規作成 |
| 22 | GitHub `UPSERT_INPUT` | slug既存・アプリ起点ページ・同内容 | NO_CHANGE | 何もしない |
| 23 | GitHub `UPSERT_INPUT` | slug既存・アプリ起点ページ・内容差分 | CONFLICT | Check失敗で停止 |
| 24 | GitHub `UPSERT_INPUT` | slug既存・外部同期ページ・`expected` 一致・同内容（`new==last_synced` 含む） | NO_CHANGE | 何もしない |
| 25 | GitHub `UPSERT_INPUT` | slug既存・外部同期ページ・`expected` 一致・内容差分 | AUTO_APPLY | 上書き更新 |
| 26 | GitHub `UPSERT_INPUT` | slug既存・外部同期ページ・`expected` 不一致 | CONFLICT | 409で拒否 |
| 27 | GitHub `DELETE_INPUT` | slug未使用 | NO_CHANGE | 何もしない |
| 28 | GitHub `DELETE_INPUT` | slug既存・外部同期ページ・`expected` 一致 | AUTO_APPLY | `archived_pages` に移動 |
| 29 | GitHub `DELETE_INPUT` | slug既存・アプリ起点ページ or `expected` 不一致 | CONFLICT | Check失敗で停止 |

> **補足: `expected_revision = null`（初回push）の対応関係**
> - slug未使用 → #12/#21（AUTO_APPLY、新規作成）
> - slug既存・`last_synced_revision = NULL`（アプリ起点）→ #13-14/#22-23（Revision比較で NO_CHANGE or CONFLICT）
> - slug既存・`last_synced_revision != NULL` → #17/#26（null は不一致として `expected_revision_mismatch`）

### 公開判定

| No | 入力 | 事前状態 | 判定 | 既定動作 |
|---|---|---|---|---|
| 30 | 公開判定 | `published_at = NULL` | DRAFT | 非公開 |
| 31 | 公開判定 | `published_at > now` | DRAFT | 予約公開として待機 |
| 32 | 公開判定 | `published_at <= now` | PUBLIC | 公開扱い |

## 困りやすいケースと対策
1. GitHub連続pushの順不同到着  
対策: 対象ページの `last_synced_revision` と `expected_revision` を比較し、不一致を即拒否して巻き戻しを防ぐ。

2. CLIローカル状態が古い  
対策: `expected_revision_mismatch` を返して再取得を要求する。

3. slug変更と旧slug削除が同時発生  
対策: 「新規 + 削除」として別判定し、削除側は競合条件で安全停止する。

4. App編集と外部更新が衝突  
対策: アプリ編集時に `last_synced_revision=NULL` に戻し、内容差分がある外部入力は `app_owned_page_conflict` で停止する。

5. 判定後にアプリ編集が割り込む  
対策: 判定対象を `FOR UPDATE` でロックし、同一トランザクションで適用まで完了させる。

6. 同一更新の再送（リトライ）  
対策: `expected_revision` 不一致チェックより先に `new_revision == page.last_synced_revision` を `NO_CHANGE` として扱う。

7. `expected_revision` をリクエスト全体で1値として設計してしまう
対策: 入力フォーマットは「slugごとに expected_revision を持つ」前提で実装する。

8. CLIとGitHubが同時にpushする
対策: 判定ロジックはCLI/GitHub共通であり、slug単位の `FOR UPDATE` ロックで直列化される。先にロックを取得した方が適用され、後続は `expected_revision_mismatch` で再試行となる。特別な分岐は不要。

## API仕様

### エンドポイント一覧
| メソッド | パス | 用途 | 認証 |
|---------|------|------|------|
| POST | `/api/sync/push` | CLI同期（適用） | APIキー |
| POST | `/api/sync/preview` | 差分プレビュー（CLI/GitHub共通） | APIキー / GitHub App |
| POST | `/api/github/webhook` | GitHub Webhook受信 | Webhook署名検証 |

### 同期リクエスト（push / preview 共通）
```json
{
  "inputs": [
    {
      "type": "UPSERT",
      "slug": "my-post",
      "expected_revision": "abc123...",
      "new_revision": "def456...",
      "new_checksum": "789abc...",
      "title": "記事タイトル",
      "body": "本文...",
      "published_at": "2024-01-01T00:00:00Z"
    },
    {
      "type": "DELETE",
      "slug": "old-post",
      "expected_revision": "111aaa..."
    }
  ]
}
```

### リクエスト制約
- 1リクエストあたりの最大入力数: 100件
- 1入力あたりの `body` 最大サイズ: 1MB
- リクエスト全体の最大サイズ: 10MB
- 制限超過時は `413 Payload Too Large` を返す

### 同期レスポンス（push / preview 共通）
```json
{
  "status": "applied",
  "results": [
    { "slug": "my-post", "action": "AUTO_APPLY", "detail": "UPSERT", "new_revision": "def456..." },
    { "slug": "old-post", "action": "AUTO_APPLY", "detail": "DELETE" },
    { "slug": "unchanged", "action": "NO_CHANGE" }
  ]
}
```

`status` の値:
- `applied`: 全slug適用完了
- `no_change`: 全slug変更なし
- `conflict`: 1件以上の競合あり（適用なし）
- `partial`: 一部slug適用成功・一部失敗（D.4: 適用中に競合検出）
- `preview`: プレビュー実行（適用なし）

競合時のレスポンス:
```json
{
  "status": "conflict",
  "results": [
    { "slug": "my-post", "action": "AUTO_APPLY", "detail": "UPSERT" },
    {
      "slug": "conflict-post",
      "action": "CONFLICT",
      "reason": "app_owned_page_conflict",
      "server_checksum": "current...",
      "server_revision": null
    }
  ]
}
```

### HTTPステータス
- `200 OK`: 適用完了 / NO_CHANGE / プレビュー結果
- `202 Accepted`: GitHub Webhook受理（非同期処理）
- `401 Unauthorized`: APIキー不正 / Webhook署名不正
- `409 Conflict`: 1件以上の競合あり（レスポンスbodyに競合詳細）
- `413 Payload Too Large`: リクエスト制約超過（入力数・bodyサイズ・全体サイズ）
- `422 Unprocessable Entity`: frontmatter不正、公開日時不正

## CLI仕様

### 認証
- APIキーで認証する
- APIキーはプロジェクト設定画面で発行し、CLI側は環境変数 `EVAME_API_KEY` または `.evame/config.json` に保持する

### ローカル状態: `.evame/state.json`
```json
{
  "slugs": {
    "my-post": {
      "last_applied_revision": "abc123...",
      "last_applied_at": "2024-01-01T00:00:00Z"
    },
    "another-post": {
      "last_applied_revision": "def456...",
      "last_applied_at": "2024-01-02T00:00:00Z"
    }
  }
}
```
- `last_applied_revision`: push成功時にサーバーレスポンスから取得して保存
- 該当slugが存在しない場合は `expected_revision = null` として送信（初回push）
- `.evame/state.json` は `.gitignore` に含める

### コマンド
- `evame push`: 同期実行。競合があれば非0終了 + 競合一覧を表示
- `evame push --dry-run`: 差分プレビューのみ（`/api/sync/preview` を呼ぶ）
- `evame push --interactive`: 競合時にTUIで解決方法を選択
- `evame status`: ローカル状態とサーバー状態の差分を表示

## 実装配置（既存構成に沿う）
- CLI同期入口: `src/app/api/sync/push/route.ts`
- 差分プレビュー入口: `src/app/api/sync/preview/route.ts`
- GitHub Webhook入口: `src/app/api/github/webhook/route.ts`
- 判定/適用オーケストレーション: `src/app/[locale]/_service/import/orchestrate-import.server.ts`
- ファイル適用: `src/app/[locale]/_service/import/apply-import-file.server.ts`
- アプリ編集ユースケース: `src/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_components/edit-page-client/service/upsert-page-and-segments/index.ts`
