import Foundation
import Markdown
import Testing

@testable import EditorCore

@Test(
  "CRだけの改行やLFとCRLFが混在しても中央の段落だけを編集して前後を保持する",
  arguments: ["p\r\rq\n\nr\n", "p\r\rq\r\rr\r", "p\r\n\r\nq\r\rr\n", "p\n\nq\r\n\r\nr\r"])
func mixedLineEndingSourcePositions(_ source: String) throws {
  let document = MarkdownDocument(source: source)
  #expect(document.blocks.count == 3)
  let changed = try document.replacingInlines(in: 1, path: [], with: [Markdown.Text("編集")])
  #expect(changed.source == source.replacingOccurrences(of: "q", with: "編集"))
  #expect(changed.blocks.compactMap { ($0.markup as? Paragraph)?.plainText } == ["p", "編集", "r"])
}

@Test(
  "Unicodeの区切り文字を含む段落の後を編集しても元の本文と位置を保持する",
  arguments: ["\u{2028}", "\u{2029}", "\u{85}", "\u{b}", "\u{c}"])
func sourcePositionsAcrossUnicodeSeparator(_ separator: String) throws {
  let document = MarkdownDocument(source: "前\(separator)後\n\n次\n")
  let changed = try document.replacingInlines(in: 1, path: [], with: [Markdown.Text("編集")])
  #expect(changed.source == "前\(separator)後\n\n編集\n")
  let trailing = try MarkdownDocument(source: "末尾\(separator)").replacingInlines(
    in: 0, path: [], with: [Markdown.Text("変更\(separator)")])
  #expect(trailing.source == "変更\(separator)")
}

@Test("日本語と絵文字を含む原稿を開いて閉じても元のMarkdownを保持する")
func unchangedJapaneseDocument() throws {
  let source = "\n# 日本語👩🏽‍💻\n\n本文 **太字**。\r\n\r\n末尾  \n"
  #expect(MarkdownDocument(source: source).source == source)
}

@Test("見出しだけを編集すると参照リンクと未対応の構文をそのまま残す")
func replacingHeadingPreservesOtherBlocks() throws {
  let source = "# 古い見出し\n\n[リンク][site]\n\n[^note]: 脚注\n\n[site]: https://example.com \"参照\"\n"
  let document = MarkdownDocument(source: source)
  let changed = try document.replacingNode(
    in: 0, path: [], with: Heading(level: 2, Markdown.Text("新しい見出し👋")))
  #expect(changed.source == source.replacingOccurrences(of: "# 古い見出し", with: "## 新しい見出し👋"))
  #expect(document.source == source)
}

@Test("表と入れ子リストと画像とHTMLを含む共通原稿を変更せず往復できる")
func fixtureRoundTrip() throws {
  let url = try #require(
    Bundle.module.url(forResource: "round-trip", withExtension: "md", subdirectory: "Fixtures"))
  let source = try String(contentsOf: url, encoding: .utf8)
  let document = MarkdownDocument(source: source)
  #expect(document.source == source)
  #expect(document.blocks.contains { $0.kind == .table })
  #expect(document.blocks.contains { $0.kind == .preserved })
}

@Test("範囲外の編集を拒否して元の原稿を保持する")
func invalidBlockIndex() {
  let document = MarkdownDocument(source: "本文")
  #expect(throws: MarkdownDocument.EditError.self) {
    try document.replacingNode(in: -1, path: [], with: Paragraph())
  }
  #expect(throws: MarkdownDocument.EditError.self) {
    try document.replacingNode(in: 1, path: [], with: Paragraph())
  }
  #expect(document.source == "本文")
}

@Test("空の原稿に最初の段落を追加できる")
func emptyDocument() {
  let document = MarkdownDocument(source: "")
  #expect(document.blocks.isEmpty)
  #expect(document.appending("本文").source == "本文\n")
}

@Test("原稿の末尾にブロックを追加しても既存の空白と定義を保持する")
func appendBlock() {
  let source = "本文\n\n[site]: https://example.com\n"
  #expect(MarkdownDocument(source: source).appending("- 項目").source == source + "\n- 項目\n")
}

@Test("入れ子リストの項目を編集しても番号とチェック状態と他の段落を保持する")
func replaceNestedListItem() throws {
  let document = MarkdownDocument(source: "3. 親\n   - [x] 子\n\n別の段落\n")
  let paragraph = Paragraph(Markdown.Text("更新した子"))
  let changed = try document.replacingNode(in: 0, path: [0, 1, 0, 0], with: paragraph)
  let list = try #require(changed.blocks.first?.markup as? OrderedList)
  #expect(list.startIndex == 3)
  #expect(changed.source.contains("[x] 更新した子"))
  #expect(changed.source.hasSuffix("\n\n別の段落\n"))
}

@Test("読み取り専用ブロックは編集操作を拒否する")
func preserveUnsupportedBlock() {
  let document = MarkdownDocument(source: "<details>元の情報</details>\n")
  #expect(throws: MarkdownDocument.EditError.self) {
    try document.replacingNode(in: 0, path: [], with: Paragraph(Markdown.Text("消えた")))
  }
}

@Test("表のセルだけを編集して列の配置と他のセルを保持する")
func replaceTableCell() throws {
  let source = "| 名前 | 数 |\n| :--- | ---: |\n| 古い値 | **10** |\n"
  let changed = try MarkdownDocument(source: source).replacingNode(
    in: 0, path: [1, 0, 0], with: Table.Cell(Markdown.Text("新しい値")))
  let table = try #require(Document(parsing: changed.source).child(at: 0) as? Table)
  #expect(table.columnAlignments == [.left, .right])
  #expect((table.head.child(at: 0) as? Table.Cell)?.plainText == "名前")
  #expect((table.head.child(at: 1) as? Table.Cell)?.plainText == "数")
  let row = try #require(table.body.child(at: 0) as? Table.Row)
  #expect((row.child(at: 0) as? Table.Cell)?.plainText == "新しい値")
  let number = try #require(row.child(at: 1)?.child(at: 0) as? Strong)
  #expect((number.child(at: 0) as? Markdown.Text)?.string == "10")
}

@Test("引用内の段落に改行を挿入しても引用の外へ出ない")
func replaceMultilineQuote() throws {
  let source = "> 最初\n> 続き\n\n外側\n"
  let changed = try MarkdownDocument(source: source).replacingNode(
    in: 0, path: [0], with: Paragraph(Markdown.Text("変更"), SoftBreak(), Markdown.Text("次の行")))
  #expect(changed.source == "> 変更\n> 次の行\n\n外側\n")
}

@Test("段落を空にしてから再入力しても次の段落を上書きしない")
func emptyThenRetype() throws {
  let document = MarkdownDocument(source: "最初\n\n次の段落\n")
  let empty = try document.replacingNode(in: 0, path: [], with: Paragraph())
  let changed = try empty.replacingNode(in: 0, path: [], with: Paragraph(Markdown.Text("再入力")))
  #expect(changed.source == "再入力\n\n次の段落\n")
}

@Test("入力したMarkdown記号を装飾として解釈せず文字のまま保存する")
func escapeTypedSyntax() throws {
  let text = "*そのまま* [文字](url) <b> &amp; | `"
  let changed = try MarkdownDocument(source: "元の本文\n").replacingNode(
    in: 0, path: [], with: Paragraph(Markdown.Text(text)))
  #expect((Document(parsing: changed.source).child(at: 0) as? Paragraph)?.plainText == text)
  #expect(Document(parsing: changed.source).child(at: 0)?.childCount == 1)
}
