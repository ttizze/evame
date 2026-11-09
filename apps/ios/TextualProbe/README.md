# TextualのiPhone向け評価

[`gonzalezreal/textual`](https://github.com/gonzalezreal/textual) **0.5.0**を固定した独立Probe。TextualのMarkdown属性解析とiOS向けSwiftUI表示・選択APIを確認する。既存アプリの編集実装やSwift Markdownは変更しない。

## 結論

TextualはネイティブWYSIWYG Markdownエディターではなく、`InlineText`/`StructuredText`でMarkdownを`AttributedString`へ解析して描画する表示エンジンである。`.textual.textSelection(.enabled)`による選択・コピーは提供する。

0.5.0の公式UIKit実装は`UITextInteraction`を`.nonEditable`で作成し、`UITextInput.isEditable`を`false`にしている。`insertText`、`deleteBackward`、`replace`、`setMarkedText`、`unmarkText`はno-opである。Return、Backspace、IME、Undo/Redo、Markdown書き出し・保存往復・参照定義保持をTextualだけでは実現できないため、EvameのiPhone編集エンジンには不採用とする。

表示・選択APIがアプリへコンパイルできることと、Foundation `AttributedString`へ太字・斜体・リスト・表・リンク・画像URLを属性化できることは確認した。ただし公式スナップショットには5件の不一致があり、実機での表示・選択操作は未検証なので、本番の表示ライブラリとしての採用可否は追加確認が必要である。

## 調査根拠

- 公式リポジトリ: <https://github.com/gonzalezreal/textual>
- 固定タグ: <https://github.com/gonzalezreal/textual/tree/0.5.0>
- Package.swift: <https://github.com/gonzalezreal/textual/blob/0.5.0/Package.swift>
- README: <https://github.com/gonzalezreal/textual/blob/0.5.0/README.md>
- Markdown parser: <https://github.com/gonzalezreal/textual/blob/0.5.0/Sources/Textual/MarkdownParser/AttributedStringMarkdownParser.swift>
- iOS UIKit input bridge: <https://github.com/gonzalezreal/textual/blob/0.5.0/Sources/Textual/Internal/TextInteraction/UIKit/UITextInteractionView%2BUITextInput.swift>

0.5.0は`macOS 15`・`iOS 18`以上、MIT。mainの最新コミットは`01b51875a5406eefc95f52a058cb059e7bc94dc4`（2026-06-15）で、GitHub APIの比較ではmainと0.5.0が同一コミットだった。0.5.0が最新安定タグで、リポジトリはArchivedではない（調査日: 2026-11-08）。

## 実行

rootのNix環境から、共通のiOS検証入口で実行する。

```sh
nix develop --command bash scripts/ios.sh test-textual
```

`run.sh`は`--disable-automatic-resolution`付きで`swift test`、macOS向け`swift build`、iOS SDK向け`swift build`を行う。依存は`Package.resolved`で固定し、iOSコンパイルの最小ターゲットは`arm64-apple-ios18.0-simulator`である。署名・シミュレーターへのインストール・実UI起動は行わない。

## Probe結果

| 検証 | 結果 |
| --- | ---: |
| `TextualProbeTests`（属性を直接確認する日本語テスト） | 8 / 8 成功 |
| macOS向けSwift Package build | 成功 |
| `arm64-apple-ios18.0-simulator`向けSwiftUI build | 成功 |

8テストは、日本語/英字の太字・斜体、入れ子箇条書き、開始番号付きリスト、表の列配置、参照リンク/画像URL、見出し/コード、タスク記法/取消線、エスケープ記号を直接確認する。タスク記法はFoundation parser上ではチェック状態ではなく`[ ]`/`[x]`という文字列として残る。

CommonMark/GFM公式全例は合否判定に使っていない。Textualの公開入力はHTMLではなく`AttributedString`で、Markdown書き出しAPIがないため、表示側だけで保存往復やHTML仕様準拠を判定できないためである。

## 公式iOSテストの補足

0.5.0の公式iOSテストターゲットをiOS 26.5・iPhone 16の専用シミュレーターで実行した結果は、**160テスト中149成功・5失敗・6スキップ**（終了コード65）。失敗は`BlockQuoteTests` 2件、`OrderedListTests.upperRomanList` 1件の画像スナップショットと、`TextLayoutCollectionTests` 2件のレイアウトJSONスナップショットだった。実機では未実行である。

```sh
nix develop --command xcodebuild \
  -workspace "$source_dir/.swiftpm/xcode/package.xcworkspace" \
  -scheme Textual \
  -destination "id=$simulator_id" \
  -derivedDataPath /tmp/evame-textual-derived \
  -clonedSourcePackagesDirPath /tmp/evame-textual-cloned \
  -skipPackagePluginValidation test
```

`source_dir`は0.5.0をcloneしたディレクトリ、`simulator_id`はrootが使っていない専用シミュレーターのUUIDを指定する。公式テストの選択モデル・表示スナップショットはこの補足結果を参照するが、編集操作の提供を意味しない。

TextualがFoundation parserを利用していることは、Swift Markdown 0.9.0のparser/writer問題を直接証明しない。Textualの表示解析とSwift Markdownの`format()`でエスケープが失われる問題は別経路として扱う。
