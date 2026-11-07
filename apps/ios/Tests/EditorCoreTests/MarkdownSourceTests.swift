import Markdown
import Testing

@testable import EditorCore

@Test(
  "入力した記号や行端の空白を文字のまま往復する",
  arguments: [
    "*装飾ではない*", "[文字](url)", "<b>&amp;</b>", "    行頭", "行末  ", "👩🏽‍💻と日本語", "# 見出しではない", "a | b",
    "\\文字\\", "\t本文", " \t本文", "\t", "本文\t",
  ])
func literalText(_ text: String) throws {
  let source = try MarkdownSource.serialize(Paragraph(Markdown.Text(text)))
  let paragraph = try #require(Document(parsing: source).child(at: 0) as? Paragraph)
  #expect(paragraph.plainText == text)
  #expect(paragraph.childCount == 1)
}

@Test("改行後のタブもインデントコードへ変えず段落の文字として往復する")
func literalTabAfterLineBreak() throws {
  let source = try MarkdownSource.serialize(
    Paragraph(Markdown.Text("前"), SoftBreak(), Markdown.Text("\t続き")))
  let paragraph = try #require(Document(parsing: source).child(at: 0) as? Paragraph)
  #expect(paragraph.childCount == 3)
  #expect(paragraph.child(at: 1) is SoftBreak)
  #expect((paragraph.child(at: 2) as? Markdown.Text)?.string == "\t続き")
}

@Test("リンクと画像のURLと題名を引用符や括弧ごと往復する")
func destinationsAndTitles() throws {
  let destination = "https://example.com/a(b)?x=1&y=2"
  let title = "題名と\"引用\""
  let link = Link(destination: destination, title: title, [Markdown.Text("リンク")])
  let image = Markdown.Image(source: destination, title: title, [Markdown.Text("画像")])
  let paragraph = Paragraph([link as any InlineMarkup, image])
  let parsed = try #require(
    Document(parsing: MarkdownSource.serialize(paragraph)).child(at: 0) as? Paragraph)
  #expect((parsed.child(at: 0) as? Link)?.destination == destination)
  #expect((parsed.child(at: 0) as? Link)?.title == title)
  #expect((parsed.child(at: 1) as? Markdown.Image)?.source == destination)
  #expect((parsed.child(at: 1) as? Markdown.Image)?.title == title)
}

@Test("コード内のバッククォートと空白をフェンスと混同しない", arguments: ["`内容`", "a``b", " 空白 ", "   ", "a * b"])
func codeSpans(_ code: String) throws {
  let source = try MarkdownSource.serialize(Paragraph(InlineCode(code)))
  #expect((Document(parsing: source).child(at: 0)?.child(at: 0) as? InlineCode)?.code == code)
}

@Test("コードブロック内の三連バッククォートでフェンスが閉じない")
func fencedCode() throws {
  let code = "let text = \"```\"\n\n"
  let source = try MarkdownSource.serialize(CodeBlock(language: "swift", code))
  let restored = try #require(Document(parsing: source).child(at: 0) as? CodeBlock)
  #expect(restored.code == code)
  #expect(restored.language == "swift")
}

@Test("表のセルのパイプを列の区切りへ変えない")
func tablePipes() throws {
  let source = "| 見出し |\n| --- |\n| 内容 |\n"
  let cell = Table.Cell(Markdown.Text("a | b"), InlineCode("c|d"))
  let changed = try MarkdownDocument(source: source).replacingNode(
    in: 0, path: [1, 0, 0], with: cell)
  let table = try #require(Document(parsing: changed.source).child(at: 0) as? Table)
  let row = try #require(table.body.child(at: 0) as? Table.Row)
  #expect(row.childCount == 1)
  #expect((row.child(at: 0)?.child(at: 0) as? Markdown.Text)?.string == "a | b")
  #expect((row.child(at: 0)?.child(at: 1) as? InlineCode)?.code == "c|d")
}

@Test("表のセルへの改行は黙って削除せず拒否する")
func rejectMultilineCell() {
  #expect(throws: MarkdownSource.EncodingError.self) {
    try MarkdownSource.serialize(Table.Cell(Markdown.Text("本文"), LineBreak(), Markdown.Text("次")))
  }
}

@Test("複数行の見出しを編集しても見出しの階層と改行を保持する")
func multilineHeading() throws {
  let heading = Heading(level: 2, Markdown.Text("最初"), SoftBreak(), Markdown.Text("次の行"))
  let source = try MarkdownSource.serialize(heading)
  let parsed = try #require(Document(parsing: source).child(at: 0) as? Heading)
  #expect(parsed.level == 2)
  #expect(parsed.plainText == heading.plainText)
  #expect(parsed.child(at: 1) is SoftBreak)
}

@Test("Markdownで表現できない3段階目の複数行見出しを黙って段落へ変換しない")
func rejectMultilineATXHeading() {
  #expect(throws: MarkdownSource.EncodingError.self) {
    try MarkdownSource.serialize(
      Heading(level: 3, Markdown.Text("最初"), LineBreak(), Markdown.Text("次")))
  }
}
