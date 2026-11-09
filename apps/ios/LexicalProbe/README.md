# Lexical JSをJavaScriptCoreとUIKitで評価する

Lexical **0.53.0**を固定した独立した評価用テスト。WebView・DOMを作らず、JavaScriptCore内のモデルと既存のUIKit入力欄を接続する。アプリ本体のEditorCoreは変更していない。`pc`はPCのエディタと同じ`src/app/[locale]/_components/editor/markdown.ts`をそのまま読み込み、複製しない。

## 結果と判断

2026-11-08、Xcode 26.6・iOS Simulator 26.5で検証した。入力、リストの改行、段落結合、選択、Undo/Redo、太字・斜体は動く。PCと共有する変換（`pc`）は、CommonMark/GFMをLexical公式の`@lexical/mdast`に任せ、Evameの画像・X埋め込み・HTML・脚注・参照定義の対応だけを足したもの。3方式の中で最も多くの例を保存前後で保ち、共通テスト文書（`Tests/EditorCoreTests/Fixtures/round-trip.md`）は保存前後の表示が一致した。

| 比較経路 | CommonMarkのAST一致 | GFMのAST一致 | 合計 | 同じremark設定での保存前後のHTML構造一致 |
| --- | ---: | ---: | ---: | ---: |
| 標準 `@lexical/markdown` (`legacy`) | 356 / 652 | 378 / 677 | 734 / 1,329 | 723 / 1,329 |
| 公式の実験的 `@lexical/mdast`のみ (`mdast`) | 513 / 652 | 539 / 677 | 1,052 / 1,329 | 1,012 / 1,329 |
| PCと共有する変換 (`pc`) | 599 / 652 | 626 / 677 | 1,225 / 1,329 | 1,203 / 1,329 |

以前の自前の変換は同じ比較で1,077 / 1,329と1,091 / 1,329だった。`pc`でHTML構造が異なる126例のうち、文字やURLまで変わるのは13例で、残りは強調の入れ子やリストの詰め方など構造・書式の違い。

3経路の全例についてmacOSとiOSのレポートが完全一致した。ASTはSwift Markdown 0.9.0の解析結果を比較し、位置・記法・空のTextを除外する。**不一致数は不具合数ではなく、一致しても編集モデルでの保持は示さない。** 記法を通常の文字として素通しし、保存後だけ元の構造へ戻る例があるため、コードや画像ノードも別に検査する。HTML構造比較も描画ピクセルの比較ではなく、要素・属性・テキストの比較である。たとえばCommonMark例354はSwift側のASTに差があってもremarkでの表示は変わらず、画像説明の装飾もHTMLのalt文字列だけでは区別できない。

HTML比較器自体を公式の期待HTMLとも比較した。CommonMarkは652 / 652一致、GFMは664 / 677一致。残る13例にはGFM 0.29と現在のremark-gfmの自動リンク等の違いがあるため、公式期待値との不一致を候補変換の不具合として数えない。HTMLをDOMへ解析して文字参照や空要素の表現を揃え、属性順序と最終LF1文字も正規化する。本文中の空白は保持する。

## 切り分けできた問題

- **リスト内のコード**: `- foo\n\n\t\tbar\n`のリスト内コードは、公式MDASTと`pc`ではモデルと保存後の構造を保つ。標準Markdown経路は元の記法を出力するため保存後の構造は保持するが、モデル上ではコードが外側の通常段落になる。保存往復と編集モデルの正しさも区別する。
- **未使用の参照定義**: 標準Markdownと公式MDASTのみでは保存時に消え、保存後に同じ参照名の新しいリンクを追加しても解決できない。`pc`は定義をノードとして保持する。参照形式のリンクと画像は読み込み時に通常のリンクと画像へ解決する。
- **機能設定の不足**: 公式MDASTのCommonMark/GFM拡張だけでは、アプリ固有のImageNodeの対応付けがなく画像URL・題名が失われ、HTMLは文字列になり、脚注は解析されない。`pc`は公式の拡張の仕組みで画像・X埋め込み・HTML・脚注・参照定義の対応を足して保持する。HTMLはDOMを使わず値をそのまま持つノードで扱い、段落の外にあるものはブロック、文中のものは行内にする。標準Markdownの既定transformerには表の対応がなく、セルのパイプを保存できない。これらをパーサー単体のバグとは判断しない。
- **画像の素通し**: 標準Markdownは`!`とLinkNodeに分けるため、保存後に画像として再解析できても画像ノードにはなっていない。画像の検査はこの経路も未達とする。
- **入力文字の保存**: 標準Markdownでは、段落へ直接入力した4つの先頭空白やタブがコードブロックへ変わり、末尾空白も失われる。公式MDASTと`pc`は今回の5入力を保持する。Unicode区切り文字・絵文字も別に確認する。
- **DOM依存の文字削除**: `DELETE_CHARACTER_COMMAND`を文字位置で直接実行すると3方式とも`window object not found`になる。段落先頭の結合は動く。UIKitの実際の`deleteBackward()`で文字と絵文字を削除してLexicalへ反映する経路は成功する。DOMを偽装して失敗を隠していない。

## 操作とネイティブ接続の範囲

`OperationTests.swift`は19項目を3方式で実行し、57条件となる。入力、箇条書き・番号・入れ子・タスク項目のReturn、空項目の解除、字下げ、段落結合、UTF16選択、履歴、太字・斜体、画像、表、参照定義、異常後の復旧、別文書の分離、外側のリンクを保持した結合、文字の保存、コード入力欄の文脈を確認する。上記の未達条件はテストを赤のまま残し、成功扱いにしない。

`UIKitTests.swift`は実際の`NativeTextView`を使い、次の**24条件**が成功した。

- 実際の文字・絵文字・選択範囲の削除: 3方式。
- 日本語の未確定入力中はモデルを更新せず、確定後に反映: 3方式。
- Return後の次項目、UIKitのUndo/Redo、カーソル復元: 3方式。
- 日本語・英字と太字併用の斜体適用・解除: 4入力 × 3方式。描画ピクセルが変わり、解除で戻ることを確認し、画像をテスト結果へ添付。
- 装飾付きRTFDの実コピー・貼り付けとUndo/Redo: 3方式。

`CrossBlockSelectionTests.swift`は、ブロックをまたぐ選択を6項目×3方式でモデルに対して検証する。段落とリスト項目にまたがる範囲の削除（前向き・後ろ向き）、見出し・段落・リスト項目にまたがる範囲の入力による置換と置換後のカーソル、削除のUndo/Redoによる構造と保存結果の復元、またいだ範囲のコピーと別段落への貼り付け、文字だけのクリップボードの貼り付けを確認する。2026-11-08にmacOSとiOS Simulator 26.5の両方で18条件すべて成功した。文字位置での直接の`DELETE_CHARACTER_COMMAND`はDOMを要求するが、範囲選択の削除はDOMなしで動く。コピーと貼り付けは`@lexical/clipboard`の公式関数を使う。標準の書き出しのうちHTMLだけはDOMを必要とするため、Lexical形式とプレーンテキストの2形式で受け渡す。UIKitとの接続は次の`DocumentTextViewTests.swift`で確認する。

`DocumentTextView.swift`は、文書全体を1つの`UITextView`に表示するテスト用の接続。Lexicalが文書と選択の正本を持ち、入力欄は段落・項目を改行で区切った表示と入力の受付だけを担う。日本語の変換中はUIKitに任せてLexicalを変えず、確定した変更だけをカーソル位置を基準にした差分としてLexicalの選択・入力・削除へ変換する。Returnと段落・項目の先頭のBackspaceはLexicalのコマンドへ送り、標準の動作に任せる。ただし文書の先頭では送らない。コピー・切り取り・貼り付けは前述の公式関数を通し、アプリ内ではLexical形式も渡す。Undo/RedoはUIKitの`undoManager`からLexicalの履歴へ1操作単位で送り、UIKitが文字に対して記録する履歴は使わない。1操作の件数は`HistoryExtension`の履歴が実際に増えた数で数え、何も変えない操作では記録しない。操作ごとにLexicalの文書と選択から表示を作り直す。Lexicalが操作を拒否した場合は例外を`failure`へ記録して直前の表示を保ち、各テストの最後に例外がないことを確認する。

`DocumentTextViewTests.swift`は実際の`UITextView`で10項目×3方式の30条件を確認し、2026-11-08にiOS Simulator 26.5で9項目27条件が成功した。テストは名前付きの専用クリップボードを使い、端末共通のクリップボードを読み書きしない。成功したのは、段落とリスト項目にまたがる選択のBackspace、またいだ選択への日本語の未確定入力と確定、リスト項目のReturn、段落先頭のBackspaceによる結合、絵文字の削除と入力、またいだ範囲のコピーと貼り付け、切り取りと同じ位置への貼り付け、UIKitのUndo/Redo、何も変えない貼り付けの後のUndo。切り取った範囲を同じ位置へ貼り付けると、Lexicalは最後に貼り付けたリストへ後ろの文字を結合せず段落として残す（`RangeSelection.insertNodes`の標準動作。PCの貼り付けも同じ関数を通る）。文字は失わないが、元の構造とは異なる。

**文書先頭のBackspace（未達）**: 文書の先頭にある引用でBackspaceを押しても、段落へ戻らない（文書の先頭のリスト項目も同じ扱いになる）。前に結合できるブロックがない位置では、Lexicalの`RangeSelection.deleteCharacter`がDOMの選択（`getWindow`）で削除範囲を広げようとし、headlessでは`window object not found`になる。前にブロックがある位置では例外にならず、段落同士の結合を確認した。前にブロックがある引用・リスト項目の先頭で解除されるか結合されるかは確認していない。DOMを偽装して隠すことはせず、テストを赤のまま残す。採用する場合は、この位置の扱いを別途設計する必要がある。

表示は段落の種類と字下げの深さによる書体と字下げだけで、行内の書式、リストの記号、チェックボックス、画像、表、ブロックのドラッグ＆ドロップは描かない。テストはUIKitのAPIを直接呼ぶため、実キーボードでの変換候補の操作、選択ハンドルによる範囲選択、実機での性能は確認していない。

`UIKitTests.swift`の接続はテスト専用の1入力欄であり、どちらの接続も完成したアプリではない。入力の接続は文字・太字・斜体・取消線・コード・改行に限る。リンク・画像を含むネイティブ編集、Markdown入力ショートカット、実キーボードからの候補操作、実機の全画面操作・性能・同期はこのProbeでは検証していない。表示側にも現行のSwift MarkdownとRichTextCodecを使うため、Swiftの接続を全廃できる証明ではない。

既存のProseMirror公式133操作テストは現行EditorCore用であり、Lexicalへ移植・全件成功したとは扱わない。現行アプリの回帰検証は通常の`test`で別に行う。

## 再実行

リポジトリのルートから実行する。Bun・Swiftの依存は各lockfileに固定し、共通のiOS入口でXcodeの版を確認する。

```sh
nix develop --command bash scripts/ios.sh test-lexical \
  'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5'
```

未達の受け入れ条件があるため、このコマンドは**非0終了**する。コンパイルに成功した場合はmacOSの検証が失敗してもiOSの検証まで実行する。DerivedDataは`apps/ios/.build/lexical-derived`の1つのキャッシュを再利用し、通常アプリのビルドと分ける。

macOSの全例レポートはスクリプトが作る実行ごとの一時ディレクトリへ出力する。iOSはテストプロセスごとのUUID付きディレクトリを使い、以前のレポートが混ざらないようにする。macOS/iOS両方の出力先はログの`LEXICAL_CORPUS`行に表示する。そのディレクトリを指定すると、プラットフォーム間の一致とHTML比較を再検証できる。レポートとxcresultは失敗分析のため保持する。

```sh
nix develop --command bun apps/ios/LexicalProbe/report.mjs \
  "$mac_report_dir" "$ios_report_dir" /tmp/evame-lexical-comparison.json
```

## 配置と標準API

- `legacy.mjs`・`mdast.mjs`・`pc.mjs`: 各ライブラリのimport/export設定だけを持つ。`pc.mjs`はPCの`MarkdownExtension`をそのまま使う。`build.mjs`から同じ版のLexicalを1インスタンスに解決する。
- `editor.mjs`: 共通の公式拡張を設定する。Headless・RichText・List・CheckList・Link・Historyを有効にする。ブラウザーのない環境では履歴が既定で無効になるため、`HistoryExtension`へ`disabled: false`を明示する。AbortController/AbortSignalは既存の`abort-controller`を使い、独自実装しない。`pc`もPCの変換関数にProbe共通の操作設定を組み合わせた結果であり、ブラウザー版全体の動作ではない。番号保持を明示しており、表・自動リンク・入力ショートカット等のPCプラグインは再現していない。
- `session.mjs`: テスト境界。JSContextごとに1つのエディターを所有し、公開APIで選択・コマンド・文書復元・コピー・貼り付けを行う。入力欄内の選択とブロックをまたぐ選択は、同じ`select`で位置を検証して設定する。Markdownの文法・エスケープは実装しない。`fieldOffset`は選択のanchor/focusの両方から使い、ノード内位置を段落内UTF16位置と誤認してカーソルをずらさないため共有する。anchorとfocusはそれぞれが属する入力欄から位置を数える。
- `Swift/Session.swift`・`CorpusTests.swift`・`OperationTests.swift`・`CrossBlockSelectionTests.swift`: macOS/iOS共通の実行と検証。公式ケースは既存の`Tests/EditorCoreTests/Fixtures/Upstream`から生成時にコピーする。出典・ライセンスも既存の[説明](../README.md)に従う。
- `markdownTextTraits`はモデル書式・斜体描画・貼り付けの検査から使う。Strong/Emphasisの入れ子順や`***`等の記法を固定せず、保存後の各文字が持つ書式を同じ基準で確認するため共有する。
- `Swift/DocumentTextView.swift`・`DocumentTextViewTests.swift`: 文書全体を1つの入力欄で編集するテスト用UIKit接続と、その検証。入力欄の位置とLexicalの段落内位置の変換、確定入力の差分取得、Undoの対応を同じ型に置く。
- `Swift/UIKitTests.swift`: テスト用UIKit接続。状態の反映と構造操作のUndoは入力欄を所有するfixtureへ集める。モデルのUndoとUIKitのUndoは別に検証する。
- `report.mjs`: 検証レポートの追加分析。両プラットフォームの全件一致をアサートし、元の公式期待HTMLと保存前後のremark出力を別々に記録する。

`@lexical/mdast`は0.53.0でも**experimental**であり、公式READMEは安定した本番APIとして`@lexical/markdown`を案内している。CommonMark/GFMの解析器が準拠していても、エディターのノードへの対応付け・保持・保存の契約は別に検証する。

公式資料: [headless](https://lexical.dev/docs/packages/lexical-headless)、[Markdown](https://lexical.dev/docs/packages/lexical-markdown)、[0.53.0 MDAST README](https://github.com/facebook/lexical/blob/v0.53.0/packages/lexical-mdast/README.md)、[選択](https://lexical.dev/docs/concepts/selection)。
