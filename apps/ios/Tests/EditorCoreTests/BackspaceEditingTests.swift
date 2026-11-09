import Foundation
import Markdown
import Testing

@testable import EditorCore

@Test("画像のある段落を結合しても代替テキストと画像参照を保持する")
func joinedImageAlternativeText() throws {
  let document = MarkdownDocument(source: "前 ![foo `bar`](/image)\n\n後\n")
  let result = try #require(try document.backspacingBlock(in: 1, path: []))
  let paragraph = try #require(Document(parsing: result.document.source).child(at: 0) as? Paragraph)
  let image = try #require(paragraph.child(at: 1) as? Markdown.Image)
  #expect((image.child(at: 0) as? Markdown.Text)?.string == "foo ")
  #expect((image.child(at: 1) as? InlineCode)?.code == "bar")
  #expect(image.source == "/image")
  #expect((paragraph.child(at: 0) as? Markdown.Text)?.string == "前 ")
  #expect((paragraph.child(at: 2) as? Markdown.Text)?.string == "後")
}

@Test("リストや引用を解除しても内部のリンク定義を使う外側のリンクを壊さない")
func backspaceKeepsDefinitionsInsideContainers() throws {
  for source in [
    "- [site]: https://example.com \"題名\"\n  本文\n\n[リンク][site]\n",
    "> [site]: https://example.com \"題名\"\n> 本文\n\n[リンク][site]\n",
  ] {
    let document = MarkdownDocument(source: "前\n\n" + source)
    let path = document.blocks[1].markup is UnorderedList ? [0, 0] : [0]
    let result = try #require(try document.backspacingBlock(in: 1, path: path))
    let parsed = Document(parsing: result.document.source)
    let link = try #require(parsed.child(at: parsed.childCount - 1)?.child(at: 0) as? Link)
    #expect(link.destination == "https://example.com")
    #expect(link.title == "題名")
    let edited = try result.document.replacingInlines(
      in: result.index, path: result.path, with: [Markdown.Text("再入力")])
    let reopened = Document(parsing: edited.source)
    #expect(
      (reopened.child(at: reopened.childCount - 1)?.child(at: 0) as? Link)?.destination
        == "https://example.com")
    #expect(edited.source.components(separatedBy: "[site]:").count == 2)
    let joined = try #require(try edited.backspacingBlock(in: result.index, path: result.path))
    let merged = Document(parsing: joined.document.source)
    #expect(
      (merged.child(at: merged.childCount - 1)?.child(at: 0) as? Link)?.destination
        == "https://example.com")
  }
}

@Test("段落の間にあるリンク定義をBackspaceの結合で消さない")
func backspaceKeepsReferenceDefinitions() throws {
  let source = "前\n\n[site]: https://example.com \"題名\"\n\n後\n\n[リンク][site]\n"
  let result = try #require(try MarkdownDocument(source: source).backspacingBlock(in: 1, path: []))
  #expect(result.document.source.contains("[site]: https://example.com \"題名\""))
  let parsed = Document(parsing: result.document.source)
  let link = try #require(parsed.child(at: parsed.childCount - 1)?.child(at: 0) as? Link)
  #expect(link.destination == "https://example.com")
  #expect(link.title == "題名")
}

@Test("段落を結合してもリンクの題名と入れ子の装飾と画像の説明を保持する")
func backspacePreservesInlineStructure() throws {
  for source in [
    "[**前**](https://example.com \"題名\")", "_**_前_**_", "**`前`**",
    "[**前**と後](https://example.com \"題名\")", "**a *b* c**", "_a **_b_** c_",
    "[一](https://example.com \"題名1\")[二](https://example.com \"題名2\")",
    "**前![説明](assets/photo.png \"画像題名\")後**",
    "![**説明**](assets/photo.png \"画像題名\")",
  ] {
    let original = MarkdownDocument(source: source + "\n\n後\n")
    let paragraph = try #require(original.blocks[0].markup as? Paragraph)
    let expected = Paragraph(Array(paragraph.inlineChildren) + [Markdown.Text("後")])
    let result = try #require(try original.backspacingBlock(in: 1, path: []))
    #expect(
      result.document.source == (try MarkdownSource.serialize(expected)) + "\n", "元の本文: \(source)")
  }
}

@Test("段落の先頭でBackspaceを押すと前の段落へ結合し装飾と他の原文を保持する")
func joinParagraphsBackward() throws {
  let source = "前 **太字**\n\n後\n\n<div>保持</div>\n"
  let result = try #require(try MarkdownDocument(source: source).backspacingBlock(in: 1, path: []))
  #expect(result.document.source == "前 **太字**後\n\n<div>保持</div>\n")
  #expect(result.index == 0)
  #expect(result.path == [])
  #expect(Paragraph(result.before).plainText == "前 太字")
  let edited = try result.document.replacingInlines(
    in: result.index, path: result.path, with: [Markdown.Text("再入力")])
  #expect(edited.source == "再入力\n\n<div>保持</div>\n")
}

@Test("改行で作った同じブロック内の空段落をBackspaceで消して元へ戻る")
func removeSplitParagraph() throws {
  let split = try MarkdownDocument(source: "前\n\n次\n").splittingBlock(
    in: 0, path: [], before: [Markdown.Text("前")], after: [])
  let joined = try #require(try split.document.backspacingBlock(in: 0, path: split.path))
  #expect(joined.document.source == "前\n\n次\n")
  #expect(Paragraph(joined.before).plainText == "前")
}

@Test("リストの最初の項目でBackspaceを押すと本文を残してリストを解除する")
func leaveListByBackspace() throws {
  for source in ["- 本文\n- 次\n", "3. 本文\n4. 次\n", "- [x] 本文\n- [ ] 次\n"] {
    let result = try #require(
      try MarkdownDocument(source: source).backspacingBlock(in: 0, path: [0, 0]))
    #expect(result.document.blocks[0].markup.descendant(at: result.path) is Paragraph)
    #expect(!result.document.blockActions(in: 0, path: result.path).selected.contains(.bulletList))
    #expect(!result.document.blockActions(in: 0, path: result.path).selected.contains(.orderedList))
    #expect(!result.document.blockActions(in: 0, path: result.path).selected.contains(.checkList))
    #expect(result.document.source.hasPrefix("本文\n"))
    #expect(result.before.isEmpty)
  }
}

@Test("リストの次の項目でBackspaceを押すと前の項目へ結合し入れ子を保持する")
func joinListItemsBackward() throws {
  let result = try #require(
    try MarkdownDocument(source: "- 前\n- 後\n  - 子\n").backspacingBlock(in: 0, path: [1, 0]))
  #expect(result.document.source == "- 前後\n  - 子\n")
  #expect(result.path == [0, 0])
  #expect(Paragraph(result.before).plainText == "前")
}

@Test("入れ子リストの先頭のBackspaceは一段だけ字下げを戻す")
func liftNestedListBackward() throws {
  let result = try #require(
    try MarkdownDocument(source: "- 親\n  - 子\n- 次\n").backspacingBlock(in: 0, path: [0, 1, 0, 0]))
  #expect(result.document.source == "- 親\n- 子\n- 次\n")
  #expect(result.path == [1, 0])
}

@Test("見出しとコードの先頭では一回のBackspaceで文字を消さず段落へ戻す")
func removeBlockFormatBackward() throws {
  for source in ["## 本文\n", "```swift\n本文\n```\n"] {
    let result = try #require(
      try MarkdownDocument(source: source).backspacingBlock(in: 0, path: []))
    #expect(result.document.blocks[0].markup.descendant(at: result.path) is Paragraph)
    #expect(result.document.source.hasPrefix("本文"))
    #expect(result.before.isEmpty)
  }
}

@Test("引用の先頭でBackspaceを押すと最初の段落だけ引用の外へ戻す")
func liftQuoteBackward() throws {
  let result = try #require(
    try MarkdownDocument(source: "> 最初\n>\n> 次\n").backspacingBlock(in: 0, path: [0]))
  #expect(result.document.source == "最初\n\n> 次\n")
}

@Test("文書の先頭と表と保持したHTMLを越えるBackspaceでは原稿を変更しない")
func backspaceBoundaries() throws {
  #expect(try MarkdownDocument(source: "本文\n").backspacingBlock(in: 0, path: []) == nil)
  for source in ["<div>保持</div>\n\n本文\n", "| 表 |\n| --- |\n\n本文\n"] {
    let document = MarkdownDocument(source: source)
    #expect(try document.backspacingBlock(in: 1, path: []) == nil)
    #expect(document.source == source)
  }
}
