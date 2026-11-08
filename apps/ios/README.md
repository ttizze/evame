# iPhone編集画面の試作

SwiftUIの画面にUIKitの`UITextView`を組み込んだ検証用アプリ。最低対応OSは試作ではiOS 18とする。本番アプリの対応OSやエディタ基盤を確定するものではない。

見出し、太字・斜体・取り消し線、リンク、リスト、引用、コード、画像の表示・取り込み、表の専用編集画面、Markdown原文の編集を試せる。脚注やHTMLなど見た目での編集に対応しないブロックは原文を保持する。

キーボード上には移行前Webと同じLucideアイコンで字下げ・字下げ解除・見出し2/3/4・太字・斜体・取消線・インラインコード・箇条書き・番号付きリスト・リンク・画像を直接並べる。高さ48ptの列を横スクロールでき、適用中の書式を強調する。その他メニューには段落・チェックリスト・引用・コードブロック・Undo/Redoを置く。表のセルや変換中の入力では使えない操作を無効にする。

見出し・リスト・引用の接頭辞、言語付きコードフェンス、太字・斜体・取消線・コード・リンクなどのMarkdown記法を確定入力後に変換する。Returnで段落・リスト項目を分割する。文字のある項目は同じ深さへ続け、空の項目だけ一段戻す。最も外側の空項目ではリストを抜ける。先頭のBackspaceではリスト・引用・見出しの解除や前の段落との結合を行い、元の入力欄・カーソル・Undoを引き継ぐ。原文画面からはCommonMark/GFM全体を直接編集できる。

ログイン・SQLite・同期・公開・書き出しは未実装。検証用の固定サンプルだけを扱い、本文と取り込んだ画像はメモリ上に置く。終了すると変更は消える。保存済みや同期済みとは表示しない。

## 環境と実行

JavaScriptを使わない変換候補の[Comrak評価](ComrakProbe/README.md)は、既存アプリと分離して実行する。評価結果と未達の条件を記録しており、アプリの移行完了を示すものではない。

[Lexical JS + JavaScriptCore/UIKitの評価](LexicalProbe/README.md)では、標準Markdown・公式MDASTのみ・PCと共有する変換を公式全例で比較する。[Textualの評価](TextualProbe/README.md)は、表示・選択APIと属性解析を確認し、編集エンジンとしては採用しない。いずれも本体のエディター移行とは分けている。

[Vditorの評価](VditorProbe/README.md)では、ブラウザーとWKWebViewで同じWYSIWYG画面を動かし、公式全例、編集操作、ネイティブのキーボード上メニューを検証する。JavaScriptCore/UIKit入力の構成とは分けて比較する。

- macOS、Xcode **26.6 (17F113)**、iOS Simulator **26.5**。
- XcodeとApple SDKはAppleの配布物を使う。`DEVELOPER_DIR`で選択し、スクリプトでバージョンを検証する。
- XcodeGenは既存の`flake.lock`で固定したNix環境から使う。
- Markdownの解析には`swift-markdown` **0.9.0**を使う。Swift依存は`Package.swift`と`Package.resolved`で固定し、生成したXcodeプロジェクトにも同じロックを渡す。
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

- `Sources/EditorCore/MarkdownDocument.swift`: domain。原文の保持と編集範囲の置換。`App/EditorViewController.swift`から使う。空の段落への再入力中もアドレスを固定し、別の段落へ編集を誤反映しない。通常の入力は葉の原文だけを置換し、表のセルとチェック項目は記法の文脈を保つため、それぞれ表・リスト全体を標準ライブラリで書き出す。他のトップレベルブロックや参照定義は保持する。
- `Sources/EditorCore/BlockEditing.swift`: domain。見出し・リスト・引用の変換、字下げ、Return時の分割と入力先の決定。文書を所有する`EditorViewController.swift`が結果を反映する。
- `Sources/EditorCore/BackspaceEditing.swift`: domain。Backspace時の書式解除・結合範囲・入力先を決定する。`EditorModel.swift`はutilsとしてMarkdownとProseMirrorの不変モデルを変換し、`EditorModel/model.mjs`の標準の結合・字下げ・字下げ解除コマンドを呼ぶ。リスト内の見出し・コードも扱い、表は専用画面で編集する内容を一つのブロックとして保持する。文書の反映とUIKitのUndoは`EditorViewController.swift`が所有する。
- `Sources/EditorCore/MarkdownSource.swift`: utils。SwiftのASTをMDASTのデータ形状へ変換する。`EditorModel/markdown.mjs`がWebと同じ`mdast-util-to-markdown`とGFM拡張で記法を生成し、参照定義の抽出も同じ接続で行う。エスケープ、フェンス、リスト記法、表の区切りは自作しない。`MarkdownDocument.swift`と`MarkdownInput.swift`から使うためEditorCoreへ置く。
- `Sources/EditorCore/MarkdownInput.swift`: utils。確定入力の記法とCommonMarkの行末を認識する。
- `App/NativeTextView.swift`: 入力・選択・IME・Undoを所有するUIKitの入力欄。未確定入力を文書へ反映せず、確定後に内容だけを画面側へ渡す。
- コピー・切り取りでは表示用の傾きを標準の斜体書体へ戻したRTFDと平文を渡す。貼り付けはUIKitの読み込み後に`RichTextCodec`で対応する書式へ揃え、同じ入力欄が挿入・選択・Undoを所有する。取り込めない添付だけを除き、前後の文字と対応する書式は貼り付ける。実際の`copy`・`cut`・`paste`を通し、書式・描画用フォント・Undo/Redoを確認する。クリップボードには独自形式を追加しない。
- 等幅の複数行は行ごとのインラインコードと改行へ戻し、空行や行頭記号も保存・再解析で保持する。CommonMarkの行末であるCRLF・CRはLFへ揃え、それ以外のUnicodeの区切り文字は既存の段落や表のセルを編集しても文字のまま保持する。画像はクリップボードから復元できないため、画像を含む選択の切り取りを無効にして元の内容を残す。
- `App/RichTextCodec.swift`: ネイティブ装飾とMarkdownのインライン要素の変換。入力欄とネイティブテストの近くに置く。
- `App/EditorKeyboardMenu.swift`: `NativeTextView.swift`専用の横スクロールするキーボードアクセサリ。表示と操作イベントだけを持つ。
- `App/MarkdownSourceViewController.swift`: 原文の入力を所有し、確定した変更を親画面へ返す。
- `App/EditorViewController.swift`: 編集文書と画像の状態を所有し、入力結果を反映する。表は比較候補のひとつとして専用画面で試す。
- `Tests/EditorCoreTests/Fixtures/round-trip.md`: Webとの往復検証にも使う共通候補データ。実ユーザーの原稿や画像は含まない。

`byteRange`は取り込みと編集置換の2箇所で使用する。UTF-8の列番号とSwift文字列の位置を別々に換算すると、日本語・絵文字の編集範囲を壊すため集約している。

保存の記法生成には`mdast-util-to-markdown` 2.2.3と`mdast-util-gfm` 3.1.0を使う。Swift側はデータ形状とコード末尾の改行表現の違いを接続する。画像説明の装飾やリンクも失わないよう、画像ハンドラーではライブラリのリンク出力へ画像の接頭辞を付ける。画像と表は、構造コマンドへ渡す際も標準ライブラリで生成したMarkdownごと保持する。テストは表の区切り文字の本数を固定せず、配置・値・書式を確認し、公式全例では画像説明の構造・文字・URLも比較する。

`swift-markdown` 0.9.0の`format()`では、正規の`\*文字\*`を解析してから出力してもエスケープが失われることを確認した。同種の報告は[公式issue #108](https://github.com/swiftlang/swift-markdown/issues/108)にもある。これは解析器のCommonMark準拠と区別し、記法生成を自作する理由にはしない。

`replacementFocusPath`はメニュー変換とMarkdown変換から使用する。複数ブロックへ分割した際の挿入位置を別々に計算すると、選択や後続入力が別の段落を更新するため集約している。`formatAttributes`はMarkdownへの変換とメニュー状態の判定から使用し、UIKitの標準フォント属性と独自書式の判断を揃える。斜体は日本語の代替フォントにも反映するよう`UIFontDescriptor`の描画行列で傾け、傾きを持つフォントの貼り付けもMarkdownの強調へ戻す。入力欄は次の挿入へ引き継ぐ属性と範囲を保持し、UIKitが文字の境界で独自属性を落としても太字などを継続する。

## 受入確認

自動テストは原文の保持、編集箇所以外の保持、記号・URL・画像・表の変換、未確定入力、画面上の編集を検証する。実APIによる正規化済みMDASTの等価性や翻訳・投票の維持を証明するものではない。

公式ケースは`Tests/EditorCoreTests/Fixtures/Upstream`へ全件を保存する。

- CommonMark 0.31.2の652例とGFM 0.29-gfmの677例を使い、原文の保持と全編集可能な入力欄の保存・再解析を検証する。本文、入れ子の装飾、コード、URLと題名、番号、チェック状態、表の配置を比較する。空のTextとソース位置は内容に含めない。期待HTMLも原典どおり保存している。
- ProseMirrorの操作テスト133件は、コミット`52a84a842774fadec3b167bcdbd56085ec6c85df`のテスト本体を変更せず、同梱するモデル演算と同じ依存版・JavaScriptCoreで実行する。macOSのEditorCoreテストとiOS SimulatorのNativeTestsの両方から同じ検証を呼ぶ。UIKitとの接続は、文字・選択範囲の削除、項目と段落の結合、Undo/Redo後のカーソル、継続入力、IME、画面操作のテストで確認する。
- 斜体は日本語・英字と太字併用の4条件で、通常表示と適用後の描画ピクセルが異なり、解除後は元へ戻ることを比較する。3状態の画像をテスト結果へ添付し、貼り付け・未確定入力・Undo/Redo・実キーボードでの入力も確認する。
- `scripts/ios-editor-fixtures.mjs`は出典のSHA-256とケース数を照合して再取得する。通常のテストは保存したケースを使い、ネットワークを必要としない。再取得は`nix develop --command node scripts/ios-editor-fixtures.mjs`。

CommonMark仕様とGFM仕様のテストデータはJohn MacFarlaneとGitHubの貢献者によるもので、[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)に従う。出典は[CommonMark](https://spec.commonmark.org/0.31.2/spec.json)と[GFM](https://github.github.com/gfm/)。GFMのHTMLから全例を抽出し、表示用の空白・タブ表現を元の文字へ戻している。ProseMirrorのテストはMITライセンスで、原文の許諾表示を`Upstream/ProseMirror-LICENSE.txt`に保存し、アプリに含む全依存のライセンスを`Resources/EditorModel-LICENSES.txt`へ同梱する。

`followingSourceStart`と`editableSourceRange`は文書の読み込みと葉の置換から使用する。Setext見出しの範囲が次の段落やリンク定義へ及ぶパーサーの位置情報を両方で補正し、隣の本文や参照URLを失わないよう同じ境界を使う。

`EditorModel.run`は構造コマンドとMarkdown入出力から共有する。スクリプトごとのJSContextを`Synchronization.Mutex`で排他制御して再利用し、入力のたびにライブラリを評価し直さない。文書と選択は呼び出し内だけに置き、エラーも次の演算へ持ち越さない。長い段落の連続入力・画像30枚のリスト操作・300項目のチェックリスト入力は、内容の保持と40回の応答時間をネイティブテストで記録する。`containsBreak`は表のセルと3段階目以降の見出しから使い、表現できない改行を黙って削除しない。

番号付きリストの字下げ解除では、標準コマンドのトランザクションから分割後の後続リストを特定し、元の開始番号と項目位置を引き継ぐ。文書・引用の空段落は出力対象から省き、隣接するリストの分離は標準writerへ任せる。リスト項目内の空段落は、標準GFMのチェック状態の出力に必要なので残す。中央の空項目から抜けた直後と、続けて段落へ入力した後、チェック項目の末尾で改行した後の保存・再解析も確認する。

標準GFM writerは空のチェック項目に空白を出力し、Webのremarkでも空白を持つ項目として解析される。この原文と解析結果は変更せず、UIKitの表示ではチェック項目の先頭段落が書式のない空白1文字だけなら空の入力欄として扱う。再読み込み後も入力の先頭へ空白を増やさず、Undo/RedoとReturnでの解除を確認する。通常の段落や、複数の空白・タブ・装飾のある空白には適用しない。

`isEmptyTaskItemPlaceholder`は`RichTextCodec`の表示、`BlockEditing`のReturn、`BackspaceEditing`の削除から共有する。空白を原稿から一律に除かず、表示と構造操作が同じ埋め草を認識するため、判定を一箇所に置く。読み上げ名は埋め草の表現に依存させず、チェック項目に属する入力欄を「チェック項目」とする。

`preservedDefinitions`は構造の置換と削除で共有する。初回に保持した定義を両方の操作で引き継がないと、リスト解除後の再編集や段落結合で外側のリンクが失われるため、参照元の選択を共通にして編集状態へ保持する。

`toggleStyle`はキーボード上のボタンとUIKit標準の太字・斜体アクションから共有する。両方で同じ変換を使わないと、日本語の表示とMarkdownの書式がずれる。対応しない下線操作は標準メニューにも出さない。

`MarkdownInput.isLineEnding`は原文の位置計算・末尾保持、記法認識、見出し変換、UIKitの入力・貼り付け・装飾変換から使う。CommonMarkの行末を別々に判定すると、Unicodeの区切り文字で編集範囲や保存内容が変わるため一つに揃える。

実機では次を確認してから、エディタ基盤と永続保存形式を確定する。

- 日本語を変換中に候補を選び直す。確定・取り消し・カーソル移動で文字が欠けたり重複したりしない。
- 絵文字を含む範囲を選択し、装飾・コピー・貼り付け・Undo/Redoを試す。
- 入れ子のリストと引用、表のセルで入力とUndo/Redoを試す。
- 写真を追加して画像表示とMarkdown参照を確認する。
- 表の専用画面と本文内編集を比較し、操作方式を決める。

ブロックをまたぐ選択、追加メニューによるブロック追加のUndo、表の行列の追加削除、外部画像のダウンロード、クリップボードからの画像取り込みは未実装。写真は追加メニューかキーボード上の画像ボタンから取り込む。本文入力はブロックごとのUIKit入力欄で検証する。これらを満たすまで完成した本番エディタとして扱わない。

表のセルと3〜6段階目の見出しは1行の入力欄として扱う。見出しのReturnでは次の段落を作る。1・2段階目の複数行見出しはSetext形式で保持する。
