# 公開HTMLのR2保存と単一Worker統合

## 構成

Astroの公開表示とTanStack Startの編集・管理・APIを同じ `evame-start` Workerへ統合する。Reader専用WorkerとGateway専用Workerは廃止する。公開本文と一覧は最初のHTMLに含め、`PUBLIC_HTML` R2 bindingへ保存する。画像用R2は維持する。

R2のHITではDB接続・Astro描画・Reactの起動を待たない。初回または変更後の閲覧時に、同じWorker内の `PublicPages` entrypointでAstro生成する。記事保存ごとのビルド・デプロイ、全URLの事前生成、生成用Cron・Queue・Durable Objectは導入しない。

Astroの生成コードは `PublicPages.fetch`、TanStack Startの編集・APIコードは通常入口のDB処理内で動的に読み込む。R2のHIT時には両アプリのモジュールを起動しない。

`reader/` はAstroソースと中間ビルドの配置先として残る。サーバーコードとJS/CSSはルートの `dist` へ取り込み、公開HTML・Astroアセット・編集・APIを1つのWorkerから配信する。

## 保存と更新の反映

DB更新と同じtransactionで `reader_publication_changes` へ変更キーと単調増加する版を記録する。保存・公開・非公開・削除の実APIは、この保留行をR2の追記式変更記録へ反映してから成功を返す。完了後は取得したkeyとrevisionが一致する行だけを削除し、後続更新を残す。R2反映失敗は保存成功にせず、DB差分のない同内容の再保存でも保留行を回収する。

閲覧はR2のGET一回でHTMLを返す。保存側は、生成中の索引と、変更した依存キーの索引だけをLISTし、同じDBの全Worker版にある該当HTMLを保存応答前に無効化する。サイト全体のHTMLを走査しない。各索引のLISTはmetadataだけを取得して全ページをたどり、無効化は最大8件ずつ実行する。本文の取得やAstro生成は保存側では行わない。

コールドミスや期限切れでは、DB版の取得より先に固有キーの生成中索引を登録する。索引はHTMLキー・取得時のETag・版を持つ。同じHTMLキーへの生成前PUTは行わず、未キャッシュURLへの並行閲覧でも登録の書き込み制限を避ける。保存側は生成中索引が示すHTMLも無効化し、HTMLがまだない場合も条件付きで失効マーカーを作る。生成完了時は最初に取得したHTMLのETagと一致する場合、または未作成のままの場合だけ登録できる。これにより保存応答後の遅いfillと古い変更記録の再送が最新版を巻き戻さない。

HTMLを登録する前に依存キーごとの完成済み索引を永続化し、登録後に生成中索引を削除する。保存側は生成中→完成済みの順に読み、索引の移動と重なっても変更を取りこぼさない。HTMLのmetadataはDB版と固有の生成識別子だけを持ち、索引と生成識別子が違う古い参照は回収する。同内容の再生成でも本文中の生成識別子が変わり、ETagの再利用を防ぐ。HTMLは生成開始から1時間で失効する。変更記録が保存済みでも無効化を再試行し、R2反映失敗はDBの保留行を残す。`Server-Timing`と接続検証の結果にR2・maintenance・保存後のGETの時間を残す。

キーは `html/<DB URL hash>/<Worker version>/<URL hash>`、`changes/<DB URL hash>/<revision>/<tag hash>`、`pending/<DB URL hash>/<generation>`、`dependencies/<DB URL hash>/<tag hash>/<generation>` とする。DB URLをSHA-256でハッシュ化し、URL自体をR2キーへ残さない。同じDBのWorker版は変更記録と索引を共有し、旧版へ戻しても非公開化・削除を巻き戻さない。異なるDBを使うPreviewは全prefixで分離する。4prefixのlifecycleを2日とし、1時間有効なHTMLより先に索引や変更記録が失効しないようにする。

保存の完了に全言語・全形式・一覧全ページのHTML生成を含めない。更新対象は実際の一覧条件に合わせ、新着・著者一覧の親記事と、子記事を含むタグ一覧を区別する。404・下書きプレビュー・検索・個人情報・認証Cookieを含む応答はR2へ共有保存しない。

配置は、R2 bindingを直接呼ぶ `src/app/_infra/reader-html.ts`、DBの保留行を読み書きする `src/db/queries.ts` と `mutations.ts`、保存完了を調整する `src/app/_service/update-reader-publication.ts` に分ける。`src/server.ts` の公開入口と更新APIから共通で利用する。

## 検証

全コマンドをNix環境で実行する。Wrangler test harnessはNodeを使う。ローカルSentryはサーバーとブラウザーの両方で無効にする。

```sh
SENTRY_DSN="" VITE_SENTRY_DSN="" nix develop --command bun run build
nix develop --command bun run test:deployment
nix develop --command node scripts/check-reader-connected.mjs
nix develop --command bun run test:deployment:browser
```

成果物テストでは認証・画像保存・原文書き出し・新規保存・編集・本文と階層のSSR・公開/非公開・削除を確認する。R2境界のユニットテストでは、同じDBを使うWorker版をまたぐ非公開化と旧版への切り戻し、異なるDB間の分離を確認する。接続検証は隔離DBと専用認証値を使い、R2 HIT、並行保存、反映失敗、同内容再保存と保留行回収、非公開化後の遅延fillを確認する。`EVAME_CONNECTED_BROWSER=true` ではChromium/WebKitとPC/モバイルの編集・再読み込みも確認する。結果は `.data/reader-connected-<UUID>/result.json` に残す。

ローカルはWranglerのR2実装を使う。Cloudflare Previewでも実際のHITと保存・非公開化・削除後の反映を確認する。ローカル成功だけでCloudflareの実配信を検証済みにしない。

## 本番への切り替え

[Cloudflare運用](../howto/cloudflare-workers.md)に従い、HTML用R2 bucketとlifecycleを用意する。本番DBマイグレーション後に、旧JS/CSSを30日保持した単一Workerをデプロイする。新WorkerのHTML保存先はversionで分離されるため、デプロイ後の一括purgeは不要。

既存 `evame.tech/*` を `evame-start` へ切り替え、既存記事・本文・階層・目次・ログイン・保存と、ブラウザーキャッシュなしで旧JS/CSSを取得できることを確認する。確認後に旧Reader/Gateway Workerを削除する。検証・本番反映の完了は実行結果を確認してから記録する。
