# iPhone編集画面の試作

SwiftUIの画面にUIKitの`UITextView`を組み込んだ検証用アプリ。最低対応OSは試作ではiOS 18とする。本番アプリの対応OSやエディタ基盤を確定するものではない。

見出し、太字・斜体・取り消し線、リンク、リスト、引用、コード、画像の表示・取り込み、表の専用編集画面、Markdown表示を試せる。脚注やHTMLなど編集に対応しないブロックは原文を保持する。

ログイン・SQLite・同期・公開・書き出しは未実装。検証用の固定サンプルだけを扱い、本文と取り込んだ画像はメモリ上に置く。終了すると変更は消える。保存済みや同期済みとは表示しない。

## 環境と実行

- macOS、Xcode **26.6 (17F113)**、iOS Simulator **26.5**。
- XcodeとApple SDKはAppleの配布物を使う。`DEVELOPER_DIR`で選択し、スクリプトでバージョンを検証する。
- XcodeGenは既存の`flake.lock`で固定したNix環境から使う。
- Swift依存は`Package.swift`と`Package.resolved`で固定する。生成したXcodeプロジェクトにも同じロックを渡す。
- CIはNix環境に合わせて`macos-26-arm64`を使い、`.github/workflows/ios.yml`から同じスクリプトを実行する。

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

## 配置と責務

- `Sources/EditorCore/MarkdownDocument.swift`: domain。原文の保持と編集範囲の置換。`App/EditorViewController.swift`から使う。空の段落への再入力中もアドレスを固定し、別の段落へ編集を誤反映しない。
- `Sources/EditorCore/MarkdownSource.swift`: utils。CommonMark/GFMの文法変換を担う技術補助。主な利用元が`MarkdownDocument.swift`だけなので同じEditorCoreに近接配置し、編集した葉だけを変換する。コンテナや参照定義は再生成しない。
- `App/NativeTextView.swift`: 入力・選択・IME・Undoを所有するUIKitの入力欄。未確定入力を文書へ反映せず、確定後に内容だけを画面側へ渡す。
- `App/RichTextCodec.swift`: ネイティブ装飾とMarkdownのインライン要素の変換。入力欄とネイティブテストの近くに置く。
- `App/EditorViewController.swift`: 編集文書と画像の状態を所有し、入力結果を反映する。表は比較候補のひとつとして専用画面で試す。
- `Tests/EditorCoreTests/Fixtures/round-trip.md`: Webとの往復検証にも使う共通候補データ。実ユーザーの原稿や画像は含まない。

`byteRange`は取り込みと編集置換の2箇所で使用する。UTF-8の列番号とSwift文字列の位置を別々に換算すると、日本語・絵文字の編集範囲を壊すため集約している。

## 受入確認

自動テストは原文の保持、編集箇所以外の保持、記号・URL・画像・表の変換、未確定入力、画面上の編集を検証する。実APIによる正規化済みMDASTの等価性や翻訳・投票の維持を証明するものではない。

実機では次を確認してから、エディタ基盤と永続保存形式を確定する。

- 日本語を変換中に候補を選び直す。確定・取り消し・カーソル移動で文字が欠けたり重複したりしない。
- 絵文字を含む範囲を選択し、装飾・コピー・貼り付け・Undo/Redoを試す。
- 入れ子のリストと引用、表のセルで入力とUndo/Redoを試す。
- 写真を追加して画像表示とMarkdown参照を確認する。
- 表の専用画面と本文内編集を比較し、操作方式を決める。

ブロックをまたぐ選択、ブロック追加のUndo、リスト項目・表の行列の追加削除、外部画像のダウンロード、クリップボードからの画像取り込みは未実装。写真は追加メニューから取り込む。本文入力はブロックごとのUIKit入力欄で検証する。これらを満たすまで完成した本番エディタとして扱わない。

表のセルと3〜6段階目の見出しは1行の入力欄として扱う。1・2段階目の複数行見出しはSetext形式で保持する。
