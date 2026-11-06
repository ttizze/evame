# 公開HTMLとデータ更新

## 公開ページ

公開トップ・記事・著者・新着・タグ・検索・About・規約は `reader/` のAstroで描画する。最初のHTMLに一覧・本文・コメントを含める。トップの長い説明はAboutに移し、未ログインでも新着・人気記事を主役にする。

これはビルド時の全記事SSGではなく、初回リクエストでHTMLを生成してCloudflare Workers Cacheへ保存する構成。キャッシュ命中時はAstroもDBも実行されない。コールドミス時だけAstroからBACKEND bindingで `/api/reader-data` を呼ぶ。ビルドではDBを読まない。

- `evame-start`: 同一ドメインの入口、メンテナンス判定、編集・管理、認証とAPI。公開GET/HEADはDB接続を作らずREADER bindingへ渡す。
- `evame-reader`: Astro。BACKEND binding経由で公開データを取得する。workers.devとバージョンURLは公開しない。
- `reader/src/pages/[...path].astro`: 安全な公開結果だけ `Astro.cache.set({maxAge:3600,tags:["evame-reader"]})` を設定する。
- 下書きプレビューは所有者だけに表示し、検索と同様に共有キャッシュへ保存しない。セッションや所有者判定は共有HTMLに含めない。
- Xの埋め込みは専用islandから、該当する要素がある場合だけ実装を読み込み、本文全体を起動しない。JavaScript無効時はリンクを表示する。
- ヘッダーの認証表示、投稿、いいね、翻訳、通知などの操作部分だけをReact islandとして起動する。本文全体のhydrationは行わない。
- Gatewayは外側のレスポンスを `private, no-store` にし、内部キャッシュ制御・タグを除去して言語Cookieを付ける。認証Cookie付きでも公開HTMLは共通で、個人の状態はprivate APIから取得する。

## 書き込みと無効化

`src/app/_domain/reader-cache-policy.ts` が無効化の対象を決め、`src/server.ts` が書き込み後にREADERの非公開POST `/__invalidate` を呼ぶ。Reader自身が `cache.purge({tags:["evame-reader"]})` を実行し、受付成功を待ってから保存レスポンスを返す。公開記事の編集・公開切替・削除、プロフィール・階層の変更、コメント、翻訳更新が対象となる。

下書きの自動保存、いいね、画像アップロード、Geminiキー設定では公開HTMLを無効化しない。いいね状態はSWRで更新する。翻訳の投入だけでは消さず、翻訳チャンクはジョブ完了時に無効化する。更新に失敗した操作も無効化しない。内部の変更判定ヘッダーはGatewayで除去する。

無効化に失敗した場合は書き込み全体を再実行しない。成功レスポンスを返さずエラーを通知する。DBへの変更は完了している可能性がある。CloudflareのpurgeにはFree tier相当のレート制限（補充5回/分、バースト25回）があるため、高頻度の公開書き込みではこの制約に注意する。TTLによる失効も最大1時間で行う。purgeの成功は受付を意味し、世界中への反映にはCloudflare Instant Purgeの伝播時間がある。

ローカルworkerdに `cache.purge` がない場合は共有キャッシュを明示的に無効にする。ローカルの成果物テストだけでは実CDNのHIT/purgeを証明できない。Cloudflare上で同じURLのMISS→HIT、無効化後の本文・一覧更新と非公開記事404を確認する。

## 操作データ

| データ | 所有者と更新 |
| --- | --- |
| コメント | Comments islandがSWRを所有。投稿・返信・削除後に対象ページを再取得し、静的な件数表示も更新 |
| いいね | ページ内で一括取得し、API結果と楽観的更新をSWRへ反映 |
| 段落の翻訳・投票 | 既存の翻訳APIとSWR。追加・削除・投票後に再取得 |
| 通知 | 認証後に取得。既読操作後にSWRを更新 |
| 編集・管理 | TanStack StartのServer FunctionとRouter loaderを維持 |

`/api/reader-data`、`/api/reader-comments`、`/api/reader-state`、`/api/page-markdown`、`/api/reader-actions` はprivate/no-store。POSTは同一オリジン・認証・権限を検証する。DBと認証処理はAPI配下のserviceに置き、BrowserからServer Functionの実装を直接呼ばない。

## ビルドとデプロイ

`bun run build` はAstroとTanStackを順にビルドし、Astroのハッシュ付きアセットをGateway側へコピーする。Reader、Gatewayの順にデプロイする。DBスキーマ変更がある場合は後方互換のマイグレーションを先に行う。

`bun run test:deployment` はローカルHTTP DBと2つのWorkerで、保存・編集・本文SSR・21言語のトップ・非公開化を検証する。`bun run test:deployment:browser` はChromiumでJavaScript無効の閲覧とログイン後の操作も検証する。翻訳キューはローカルの偽HTTPサーバーへ送信し、サーバー・ブラウザーのSentry送信を無効にする。

## 公式仕様

- [Astro Islands](https://docs.astro.build/en/concepts/islands/)
- [Cloudflare Workers Cache](https://developers.cloudflare.com/workers/cache/)
- [purgeの範囲・伝播・制限](https://developers.cloudflare.com/workers/cache/purge/)
