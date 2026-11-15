# 公開表示の単一Worker統合

## 採用する構成

Astroの公開表示とTanStack Startの編集・管理・APIを同じ `evame-start` Workerへ統合する。Reader専用WorkerとGateway専用Workerを廃止し、HTML用R2を使わない。画像用R2は維持する。

公開本文と一覧は最初のHTMLに含める。同じWorker内の `PublicPages` entrypointだけにCloudflare Workers Cacheを適用する。HITではDB取得・Astro描画・Reactの起動を待たず、cold missだけDBを読みAstroでサーバー生成する。記事保存ごとのビルド・デプロイ、全URLの事前生成、生成用Cron・Queue・Durable Objectは導入しない。

`reader/` はAstroのソースと中間ビルドを置くディレクトリとして残る。独立した配信先ではなく、サーバーコードとJS/CSSをルートの `dist` へ取り込む。公開HTML・Astroアセット・編集・APIは1つのWorkerから配信する。

## 保存と無効化

保存・公開・非公開・削除の実APIがDBの変更キーを読み、記事・関連一覧のタグを永続化してから `PublicPages.purge()` を呼ぶ。成功後に取得した版だけを削除し、後続変更を残す。purge失敗は保存成功にせず、DB差分のない同内容の再保存でも保留タグを回収する。保存の完了に全言語・全形式・一覧全ページのHTML生成を含めない。

公開クエリは既存ルートと同じ規則で解析する。404・下書きプレビュー・検索と個人情報は共有キャッシュへ保存しない。更新対象は実際の一覧条件に合わせ、新着・著者一覧の親記事と、子記事を含むタグ一覧を区別する。

## 検証

全コマンドをNix環境で実行する。Wrangler test harnessはNodeを使う。ローカルSentryはサーバーとブラウザーの両方で無効にする。

```sh
SENTRY_DSN="" VITE_SENTRY_DSN="" nix develop --command bun run build
nix develop --command bun run test:deployment
nix develop --command node scripts/check-reader-connected.mjs
nix develop --command bun run test:deployment:browser
```

成果物テストでは認証・画像保存・原文書き出し・新規保存・編集・本文と階層のSSR・公開/非公開・削除を確認する。接続検証は隔離DBと専用認証値を使い、並行保存・同内容再保存と保留タグ回収、Chromium/WebKitとPC/モバイルの編集・再読み込みを確認する。結果は `.data/reader-connected-<UUID>/result.json` に残す。

Cloudflare Previewでは実際のHITとpurge後の更新を確認する。ローカルのcache.purge未対応環境はキャッシュを無効にするため、ローカル成功をCDN検証済みとして扱わない。検証完了と本番反映は実行結果を確認してから記録する。

## 比較検証で分かったこと

従来の3 Worker構成もキャッシュHIT時にDB取得を省略していた。共有キャッシュは新しい高速化ではなく、今回の変更はWorker間通信と独立デプロイを削除して構成を簡単にするもの。

先行検証ではAstroの差分静的ビルドとStatic AssetsへのHTML配信を確認したが、HTML1ファイルの更新でもmanifestと新しいWorkerバージョンが必要で、CLI経由のデプロイに約9.5秒かかった。記事保存ごとの再デプロイを避けるため採用しない。

HTML用R2の検証では記事単位の差し替えで再デプロイを省けたが、依存タグの版照合・競合制御・世代管理・再生成が増えた。今回の方針ではこれらの試験コードを削除し、既存のAstro描画と共有キャッシュを単一Worker内で使う。

## 本番への切り替え

[Cloudflare運用](../howto/cloudflare-workers.md)に従い、旧JS/CSSを30日保持した単一Workerをデプロイし、共有キャッシュを無効化する。既存 `evame.tech/*` を `evame-start` へ切り替え、既存記事・本文・階層・目次・ログイン・保存を確認する。確認後に旧Reader/Gateway Workerを削除する。
