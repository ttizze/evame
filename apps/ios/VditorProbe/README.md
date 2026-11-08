# VditorをブラウザーとWKWebViewで評価する

Vditor **4.0.1**（最新安定版を2026-11-08に確認）を固定した比較用の画面・テスト。PCのLexical、既存のiPhoneアプリ、保存APIは変更していない。Vditorの採用・アプリ移行・TestFlight配信を完了したものではない。

## 結果

2026-11-08、Playwright 1.63.0のヘッドレスChromium・WebKit（DOMを持つブラウザープロセス）と、Xcode 26.6 / iOS Simulator 26.5の実際のWKWebViewで実行した。すべてWYSIWYGモードを使う。PlaywrightのiPhoneプロファイルは画面・タッチ・UAのエミュレーションであり、iOS実行とは分ける。

| 公式例 | 保存前後のHTML構造一致 | 比較用remarkと公式期待HTMLの一致 |
| --- | ---: | ---: |
| CommonMark 0.31.2 | 553 / 652 | 652 / 652 |
| GFM 0.29 | 578 / 677 | 664 / 677 |
| 合計 | **1,131 / 1,329** | 1,316 / 1,329 |

全1,329例の入力と保存結果はChromium・WebKit・WKWebViewで一致した。Vditorの`setValue`→`getValue`を通したMarkdownを、保存前と同じremark設定でHTMLへ変換する。HTMLの属性順序・文字参照・末尾LF1文字を正規化し、本文中の空白を残して比較する。これは描画ピクセルや編集モデル全体の一致ではなく、不一致198件をそのまま不具合数としない。HTMLの安全化、別仕様、正規化による差も含まれる。公式GFMと現在のremarkの自動リンク等の差13件も別に記録する。

[Lexical評価](../LexicalProbe/README.md)の同じHTML比較では、標準Markdown723、公式MDAST1,012、PC変換1,091 / 1,329だった。Vditorの数値は高いが、Lexical側はheadlessの変換設定、Vditor側は完成したブラウザーエディターであり、この数値だけで編集機能や品質全般の優劣を決めない。

ブラウザーは30条件を2環境で実行し、**48成功・12未達**。未達は下記の5操作条件と公式全例比較の各2環境分で、削除・skip・成功する期待値への変更はしていない。

成功した操作:

- 文字のある箇条書き・番号付き・入れ子・チェック項目のReturnで次の項目を作る。番号も継続する。
- Backspaceによる通常文字・絵文字の削除、段落結合、リスト解除、UTF16選択の置換、改行のUndo/Redo。
- 日本語・英字の斜体適用と解除、太字併用。各4条件で文字部分のスクリーンショットが変化し、解除すると元へ戻ることを確認した。タグやボタンの状態だけの判定ではない。
- Markdownのリスト入力、合成したcompositionイベント中の記法変換抑制、確定後の入力。実際の日本語キーボードの候補操作とは別の検証である。
- 画像のURL・題名、表セルのエスケープしたパイプ、表セル編集後の再読み込み、リスト内のインデントコード。
- 合成したHTML貼り付けイベントでの日本語・太字・斜体。システムクリップボード経由のコピー・貼り付けは未検証。
- Unicode区切り文字U+2028と日本語・絵文字の直接入力後の保存。

## 未達と切り分け

- **空の入れ子項目のReturn**: 親リストの次項目へ戻る条件を満たさず、今回の入力では親項目の中の通常段落になる。文字のある項目のReturnは同じ深さを保つ。
- **参照定義の題名**: 未使用の定義のURLは残り、後から追加した参照リンクも解決するが、`[ref]: https://example.test/path "題名"`の題名が消える。Vditorの編集DOMは参照を`a`以外で表すため、DOMタグを固定せず出力HTMLのリンク先とtitleで判定する。
- **直接入力した空白**: 段落へ入力した先頭4空白・末尾2空白・先頭空白＋タブの3条件は、保存後に文字または段落の意味が変わる。
- **全例の具体的な差**: CommonMark例16の行末バックスラッシュによる強制改行が通常改行へ変わる。例23で参照の題名が消える。例123のコード内にバッククォート3個がある場合、保存側も3個のフェンスを使い、再解析後にコードブロックが分かれる。この3例は、CommonMark/GFM向けの追加設定を外した対照エディターでも同じ保存結果となった。したがって今回の拡張無効化だけに原因を帰さない。
- **WKWebViewの日本語入力直後のReturnの不安定さ**: XCTestの`typeText("一つ\n次")`で`- 一\n- つ次\n`となる事象を観測した。同じテストが成功する実行もあったが、確認を強めた最終実行でも再発した。英字`first\nnext`は成功した。XCTestの入力注入・タップ位置・IME・選択更新の影響はまだ分離しておらず、実機での不具合と断定しない。iOSの最終結果はWK全例記録1件・書式/UndoRedoのUI1件が成功し、日本語の改行を含むリストUI1件が失敗。Backspace後も文書全体を照合し、誤った項目構造を成功扱いにしない。

Markdown文法の自作補正は追加していない。いまの状態では「そのまま入れればEvameの受け入れ条件を全部満たす」とは判断しない。

## キーボード上メニュー

比較用iOSアプリは本文をWKWebView、太字・斜体・Undo・RedoのボタンをUIKitに置き、`keyboardLayoutGuide`へ追従させる。iOSのUIテストで次を確認した。

- ボタンがキーボードの上にあり、タップでキーボードを閉じない。
- 斜体を有効にして日本語・英字を入力し、解除後に通常文字を入力できる。
- ネイティブボタンからUndo/Redoしても保存内容が戻る。

この接続は、Vditor内蔵ツールバーのイベントを呼んでいる。4.0.1はiPhoneで`touchstart`を使うため、そこへ接続した。公開された汎用書式コマンドAPIではなく、バージョンとDOMへの依存がある。WKWebView内部クラスの差し替えやprivate APIは使わない。

実機、実キーボードの候補選択、複数ブロック選択、キーボードのドラッグ開閉、画像アップロード、ブロック並べ替え、性能、同期は未検証。既存のProseMirror公式133操作テストもVditorへ全件移植したものではない。表・画像の基本編集ができることと、Evameの全編集機能を維持できることを分ける。

## 再実行と配置

```sh
nix develop --command bash scripts/ios.sh test-vditor \
  'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5'
```

既知の未達があるため**非0終了**する。ブラウザーの未達でもiOSまで実行する。依存は専用の`package.json`と`bun.lock`に固定し、ルートのPlaywrightを使用する。必要なブラウザーは同じ版のPlaywrightでインストールする。通常アプリのTestFlightビルドには組み込まない。

- `build.mjs`・`index.html`: Vditorのnpm同梱スクリプト・Lute・CSS・日本語辞書・アイコンと既存の公式例を`apps/ios/.build/vditor-web`へ配置する。CDNや外部APIへ接続せず、両環境が同じファイルを使う。キャッシュ、自動スペース・用語補正、数式や独自記法等は無効にし、安全化は有効にする。
- `corpus.js`: 両ブラウザーとWKWebViewから呼ぶ同じ全例実行処理。Markdownの文法は実装しない。
- `browser.spec.mjs`・`playwright.config.mjs`・`server.mjs`: 実ブラウザーの操作とHTML比較。テストサーバーはlocalhostだけで待ち受ける。ブラウザーレポートは`apps/ios/.build/vditor-browser-results`へ出力し、実行開始時にPlaywrightが初期化する。部分実行では前回の全例レポートも消える。
- `App.swift`・`WKTests.swift`・`UITests.swift`: 本体と別のiOSターゲット。全例レポートは実行ごとの新規UUIDディレクトリへ書き、ログの`VDITOR_WK_CORPUS`行へ出力先を示す。WKのテストは全例の実行・記録を検証し、意味の比較は下記レポート処理が担う。
- `report.mjs`: Chromium・WebKit・WKWebViewの全件数、入力、保存結果の一致をアサートする。ブラウザーの各`corpus.json`とWKのJSONを指定する。
- `../markdown-html.mjs`: LexicalのレポートとVditorの比較で共有する純粋なHTML正規化。異なる比較規則で候補の成績を変えないため、共通祖先へ置く。共有化前後で既存のLexicalレポート全体が一致することも検証した。

```sh
nix develop --command bun apps/ios/VditorProbe/report.mjs \
  "$chromium_corpus_json" "$webkit_corpus_json" "$wk_corpus_json" \
  /tmp/evame-vditor-comparison.json
```

公式資料: [4.0.1リリース](https://github.com/Vanessa219/vditor/releases/tag/v4.0.1)、[設定・メソッド](https://github.com/Vanessa219/vditor/blob/v4.0.1/README_en_US.md)、[キーボードのレイアウト](https://developer.apple.com/videos/play/wwdc2021/10259/)。
