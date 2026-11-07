# iPhone編集画面の試作

SwiftUIの画面にUIKitの`UITextView`を組み込んだ検証用アプリ。最低対応OSは試作ではiOS 18とする。本番アプリの対応OSやエディタ基盤を確定するものではない。

見出し、太字・斜体・取り消し線、リンク、リスト、引用、コード、画像の表示・取り込み、表の専用編集画面、Markdown原文の編集を試せる。脚注やHTMLなど見た目での編集に対応しないブロックは原文を保持する。

キーボード上には移行前Webと同じLucideアイコンで字下げ・字下げ解除・見出し2/3/4・太字・斜体・取消線・インラインコード・箇条書き・番号付きリスト・リンク・画像を直接並べる。高さ48ptの列を横スクロールでき、適用中の書式を強調する。その他メニューには段落・チェックリスト・引用・コードブロック・Undo/Redoを置く。表のセルや変換中の入力では使えない操作を無効にする。

見出し・リスト・引用の接頭辞、言語付きコードフェンス、太字・斜体・取消線・コード・リンクなどのMarkdown記法を確定入力後に変換する。Returnで段落・リスト項目を分割する。文字のある項目は同じ深さへ続け、空の項目だけ一段戻す。最も外側の空項目ではリストを抜ける。先頭のBackspaceではリスト・引用・見出しの解除や前の段落との結合を行い、元の入力欄・カーソル・Undoを引き継ぐ。原文画面からはCommonMark/GFM全体を直接編集できる。

ログイン・SQLite・同期・公開・書き出しは未実装。検証用の固定サンプルだけを扱い、本文と取り込んだ画像はメモリ上に置く。終了すると変更は消える。保存済みや同期済みとは表示しない。

## 環境と実行

- macOS、Xcode **26.6 (17F113)**、iOS Simulator **26.5**。
- XcodeとApple SDKはAppleの配布物を使う。`DEVELOPER_DIR`で選択し、スクリプトでバージョンを検証する。
- XcodeGenは既存の`flake.lock`で固定したNix環境から使う。
- Swift依存は`Package.swift`と`Package.resolved`で固定する。生成したXcodeプロジェクトにも同じロックを渡す。
- 構造の結合にはProseMirrorのモデル演算をJavaScriptCore上で使う。UIKitの画面とIMEを維持し、DOMやWebViewは作らない。依存は`EditorModel/package.json`と`bun.lock`に固定し、`scripts/ios.sh`から同じJSとライセンスを生成する。
- CIはNix環境に合わせてArm64の`macos-26`を使い、`.github/workflows/ios.yml`から同じスクリプトを実行する。

リポジトリのルートで実行する。スクリプトは必要に応じて`nix develop`へ入り直す。

```sh
bash scripts/ios.sh generate
open apps/ios/EvameEditorPrototype.xcodeproj

bash scripts/ios.sh test 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5'
```

純粋ロジックだけの検証:

```sh
nix develop --command xcrun swift test --package-path apps/ios --disable-automatic-resolution
```

実機での入力評価では、生成したプロジェクトの署名設定を自分の開発チームに合わせ、`CODE_SIGNING_ALLOWED=YES`で実行する。チームIDや認証情報はリポジトリに保存しない。

TestFlightへの配信には`Config/TestFlightExportOptions.plist`を使う。アーカイブを作成し、ローカルへの書き出しで配布署名を検証してからアップロードする。署名とApp Store Connectの認証情報はKeychainとCLI引数から渡す。アイコンは`public/favicon.svg`を白背景・余白付きの1024px画像に描画したもの。

編集アイコンはロック済み`lucide-react`の定義からベクターPDFを生成する。再生成は`nix develop --command nix shell --inputs-from . nixpkgs#librsvg --command node scripts/ios-icons.mjs`。ライセンスはアプリの`Resources/Lucide-LICENSE.txt`に同梱する。

## 配置と責務

- `Sources/EditorCore/MarkdownDocument.swift`: domain。原文の保持と編集範囲の置換。`App/EditorViewController.swift`から使う。空の段落への再入力中もアドレスを固定し、別の段落へ編集を誤反映しない。
- `Sources/EditorCore/BlockEditing.swift`: domain。見出し・リスト・引用の変換、字下げ、Return時の分割と入力先の決定。文書を所有する`EditorViewController.swift`が結果を反映する。
- `Sources/EditorCore/BackspaceEditing.swift`: domain。Backspace時の書式解除・結合範囲・入力先を決定する。`EditorModel.swift`はutilsとしてMarkdownとProseMirrorの不変モデルを変換し、`EditorModel/model.mjs`の結合演算を呼ぶ。`EditorModel/references.mjs`はMDASTからリンク定義を抽出し、リストや引用を解除しても他の段落からの参照を保持する。文書の反映とUIKitのUndoは`EditorViewController.swift`が所有する。
- `Sources/EditorCore/MarkdownSource.swift`と`MarkdownInput.swift`: utils。CommonMark/GFMの変換と入力記法の認識を担う。文書更新と入力欄の両方から使うためEditorCoreに置く。通常の入力は葉の原文だけを置換し、構造を変えた場合も他のトップレベルブロックや参照定義は保持する。
- `App/NativeTextView.swift`: 入力・選択・IME・Undoを所有するUIKitの入力欄。未確定入力を文書へ反映せず、確定後に内容だけを画面側へ渡す。
- `App/RichTextCodec.swift`: ネイティブ装飾とMarkdownのインライン要素の変換。入力欄とネイティブテストの近くに置く。
- `App/EditorKeyboardMenu.swift`: `NativeTextView.swift`専用の横スクロールするキーボードアクセサリ。表示と操作イベントだけを持つ。
- `App/MarkdownSourceViewController.swift`: 原文の入力を所有し、確定した変更を親画面へ返す。
- `App/EditorViewController.swift`: 編集文書と画像の状態を所有し、入力結果を反映する。表は比較候補のひとつとして専用画面で試す。
- `Tests/EditorCoreTests/Fixtures/round-trip.md`: Webとの往復検証にも使う共通候補データ。実ユーザーの原稿や画像は含まない。

`byteRange`は取り込みと編集置換の2箇所で使用する。UTF-8の列番号とSwift文字列の位置を別々に換算すると、日本語・絵文字の編集範囲を壊すため集約している。

`replacementFocusPath`はメニュー変換とMarkdown変換から使用する。複数ブロックへ分割した際の挿入位置を別々に計算すると、選択や後続入力が別の段落を更新するため集約している。`formatAttributes`はMarkdownへの変換とメニュー状態の判定から使用し、UIKitの標準フォント属性と独自書式の判断を揃える。入力欄は次の挿入へ引き継ぐ属性と範囲を保持し、UIKitが文字の境界で独自属性を落としても太字などを継続する。

## 受入確認

自動テストは原文の保持、編集箇所以外の保持、記号・URL・画像・表の変換、未確定入力、画面上の編集を検証する。実APIによる正規化済みMDASTの等価性や翻訳・投票の維持を証明するものではない。

公式ケースは`Tests/EditorCoreTests/Fixtures/Upstream`へ全件を保存する。

- CommonMark 0.31.2の652例とGFM 0.29-gfmの677例を使い、原文の保持と全編集可能な入力欄の保存・再解析を検証する。本文、入れ子の装飾、コード、URLと題名、番号、チェック状態、表の配置を比較する。空のTextとソース位置は内容に含めない。期待HTMLも原典どおり保存している。
- ProseMirrorの操作テスト133件は、コミット`52a84a842774fadec3b167bcdbd56085ec6c85df`のテスト本体を変更せず、同梱するモデル演算と同じ依存版・JavaScriptCoreで実行する。macOSのEditorCoreテストとiOS SimulatorのNativeTestsの両方から同じ検証を呼ぶ。UIKitとの接続は、文字・選択範囲の削除、項目と段落の結合、Undo/Redo後のカーソル、継続入力、IME、画面操作のテストで確認する。
- `scripts/ios-editor-fixtures.mjs`は出典のSHA-256とケース数を照合して再取得する。通常のテストは保存したケースを使い、ネットワークを必要としない。再取得は`nix develop --command node scripts/ios-editor-fixtures.mjs`。

CommonMark仕様とGFM仕様のテストデータはJohn MacFarlaneとGitHubの貢献者によるもので、[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)に従う。出典は[CommonMark](https://spec.commonmark.org/0.31.2/spec.json)と[GFM](https://github.github.com/gfm/)。GFMのHTMLから全例を抽出し、表示用の空白・タブ表現を元の文字へ戻している。ProseMirrorのテストはMITライセンスで、原文の許諾表示を`Upstream/ProseMirror-LICENSE.txt`に保存し、アプリに含む全依存のライセンスを`Resources/EditorModel-LICENSES.txt`へ同梱する。

`followingSourceStart`と`editableSourceRange`は文書の読み込みと葉の置換から使用する。Setext見出しの範囲が次の段落やリンク定義へ及ぶパーサーの位置情報を両方で補正し、隣の本文や参照URLを失わないよう同じ境界を使う。

`EditorModel.run`は構造の結合と参照定義の保持で共有する。JSContextの生成・例外検出を同じ経路にし、演算に失敗した際は元の原稿を維持する。参照定義の解析コードは別ファイルに分け、通常の結合では読み込んだコードを実行しない。

`preservedDefinitions`は構造の置換と削除で共有する。初回に保持した定義を両方の操作で引き継がないと、リスト解除後の再編集や段落結合で外側のリンクが失われるため、参照元の選択を共通にして編集状態へ保持する。

実機では次を確認してから、エディタ基盤と永続保存形式を確定する。

- 日本語を変換中に候補を選び直す。確定・取り消し・カーソル移動で文字が欠けたり重複したりしない。
- 絵文字を含む範囲を選択し、装飾・コピー・貼り付け・Undo/Redoを試す。
- 入れ子のリストと引用、表のセルで入力とUndo/Redoを試す。
- 写真を追加して画像表示とMarkdown参照を確認する。
- 表の専用画面と本文内編集を比較し、操作方式を決める。

ブロックをまたぐ選択、追加メニューによるブロック追加のUndo、表の行列の追加削除、外部画像のダウンロード、クリップボードからの画像取り込みは未実装。写真は追加メニューかキーボード上の画像ボタンから取り込む。本文入力はブロックごとのUIKit入力欄で検証する。これらを満たすまで完成した本番エディタとして扱わない。

表のセルと3〜6段階目の見出しは1行の入力欄として扱う。見出しのReturnでは次の段落を作る。1・2段階目の複数行見出しはSetext形式で保持する。
