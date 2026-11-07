import Markdown
import Testing

@testable import EditorCore

@Test("本文を見出しに変え同じ見出しを押すと段落へ戻し他の原文を保持する")
func headingToggle() throws {
  let source = "本文 **太字**\n\n[site]: https://example.com\n"
  let heading = try MarkdownDocument(source: source).applying(.heading(2), in: 0, path: [])
  #expect(heading.document.source == "## 本文 **太字**\n\n[site]: https://example.com\n")
  #expect(heading.path.isEmpty)
  let paragraph = try heading.document.applying(.heading(2), in: 0, path: heading.path)
  #expect(paragraph.document.source == source)
}

@Test("見出しから箇条書きへ変えてから番号付きリストに変えて本文を編集する")
func listConversionAndEditing() throws {
  let list = try MarkdownDocument(source: "## 本文👩🏽‍💻\n").applying(.bulletList, in: 0, path: [])
  #expect(list.path == [0, 0])
  #expect(list.document.source == "- 本文👩🏽‍💻\n")
  let ordered = try list.document.applying(.orderedList, in: 0, path: list.path)
  #expect(ordered.document.source == "1. 本文👩🏽‍💻\n")
  let edited = try ordered.document.replacingNode(
    in: 0, path: ordered.path, with: Paragraph(Markdown.Text("編集後")))
  #expect(edited.source == "1. 編集後\n")
}

@Test("リストの二番目を字下げして戻すと内容と順序と番号を保つ")
func listIndentAndOutdent() throws {
  let source = "3. 親\n4. 子 **装飾**\n5. 次\n\n外側\n"
  let indented = try MarkdownDocument(source: source).applying(.indent, in: 0, path: [1, 0])
  #expect(indented.path == [0, 1, 0, 0])
  #expect(indented.document.source.contains("3. 親\n   1. 子 **装飾**"))
  let restored = try indented.document.applying(.outdent, in: 0, path: indented.path)
  #expect(restored.document.source == source)
}

@Test("先頭のリスト項目は字下げせず一番外側の項目を字下げ解除すると段落へ戻る")
func listBoundaries() throws {
  let document = MarkdownDocument(source: "- 一\n- 二\n")
  #expect(!document.blockActions(in: 0, path: [0, 0]).enabled.contains(.indent))
  let lifted = try document.applying(.outdent, in: 0, path: [0, 0])
  #expect(lifted.document.source == "一\n\n- 二\n")
  #expect(lifted.path == [0])
}

@Test("見出しの文字を消してからリストへ変えても再入力できる")
func emptyBlockFormatting() throws {
  let empty = try MarkdownDocument(source: "本文\n").replacingNode(in: 0, path: [], with: Paragraph())
  let list = try empty.applying(.bulletList, in: 0, path: [])
  let edited = try list.document.replacingNode(
    in: 0, path: list.path, with: Paragraph(Markdown.Text("再入力")))
  #expect(edited.source == "- 再入力\n")
}

@Test("表のセルや読み取り専用のHTMLにはブロック書式を適用しない")
func protectedBlocks() throws {
  let table = MarkdownDocument(source: "| セル |\n| --- |\n| 内容 |\n")
  #expect(table.blockActions(in: 0, path: [1, 0, 0]).enabled.isEmpty)
  #expect(throws: MarkdownDocument.EditError.self) {
    try table.applying(.heading(2), in: 0, path: [1, 0, 0])
  }
  #expect(MarkdownDocument(source: "<div>保持</div>").blockActions(in: 0, path: []).enabled.isEmpty)
}

@Test("リストの途中で改行すると後半と入れ子を次の項目へ移す")
func splitListItem() throws {
  let document = MarkdownDocument(source: "- 最初\n- 前後\n  - 子\n\n外側\n")
  let result = try document.splittingBlock(
    in: 0, path: [1, 0], before: [Markdown.Text("前")], after: [Markdown.Text("後")])
  #expect(result.path == [2, 0])
  #expect(result.document.source == "- 最初\n- 前\n- 後\n  - 子\n\n外側\n")
}

@Test("リスト内の見出しを途中で改行しても前半の見出し階層を保持する")
func splitHeadingInList() throws {
  let result = try MarkdownDocument(source: "- ## 前後\n").splittingBlock(
    in: 0, path: [0, 0], before: [Markdown.Text("前")], after: [Markdown.Text("後")])
  #expect(result.document.source == "- ## 前\n- 後\n")
  #expect(result.path == [1, 0])
}

@Test("空のリストで改行するとリストを抜けて見出しの末尾では段落へ進む")
func leaveListAndHeading() throws {
  let empty = try MarkdownDocument(source: "項目\n").applying(.bulletList, in: 0, path: [])
  let result = try empty.document.splittingBlock(in: 0, path: empty.path, before: [], after: [])
  #expect(result.document.blocks[0].markup.descendant(at: result.path) is Paragraph)
  #expect(!result.document.blockActions(in: 0, path: result.path).selected.contains(.bulletList))
  let heading = try MarkdownDocument(source: "## 見出し\n").splittingBlock(
    in: 0, path: [], before: [Markdown.Text("見出し")], after: [])
  #expect(heading.path == [1])
  #expect(heading.document.blocks[0].markup.descendant(at: heading.path) is Paragraph)
}

@Test("入れ子の番号付きリストを選択したときは直近のリストだけを選択状態にする")
func nearestListState() {
  let state = MarkdownDocument(source: "- 親\n  1. 子\n").blockActions(in: 0, path: [0, 1, 0, 0])
  #expect(state.selected.contains(.orderedList))
  #expect(!state.selected.contains(.bulletList))
}

@Test("複数行の装飾を見出し3へ変えてもテキストと装飾を保持する")
func multilineStyledHeading() throws {
  let result = try MarkdownDocument(source: "**前\n後**\n").applying(.heading(3), in: 0, path: [])
  #expect(result.document.source == "### **前 後**\n")
}

@Test("番号付きリストで改行すると番号を継続しチェックリストの新項目は未完了になる")
func orderedAndTaskListReturn() throws {
  let ordered = try MarkdownDocument(source: "3. 最初\n4. 次\n").splittingBlock(
    in: 0, path: [0, 0], before: [Markdown.Text("前")], after: [Markdown.Text("後")])
  #expect(ordered.document.source == "3. 前\n4. 後\n5. 次\n")
  let task = try MarkdownDocument(source: "- [x] 完了\n").splittingBlock(
    in: 0, path: [0, 0], before: [Markdown.Text("完了")], after: [Markdown.Text("次")])
  #expect(task.document.source == "- [x] 完了\n- [ ] 次\n")
}

@Test(
  "入れ子のリストは文字のある項目の改行で深さを保ち空の項目の改行だけ一段戻る",
  arguments: ["- 子", "3. 子", "- [x] 子"])
func nestedListReturn(_ item: String) throws {
  let document = MarkdownDocument(source: "- 親\n\n  \(item)\n")
  let next = try document.splittingBlock(
    in: 0, path: [0, 1, 0, 0], before: [Markdown.Text("子")], after: [])
  #expect(next.path == [0, 1, 1, 0])
  let root = try #require(next.document.blocks[0].markup as? UnorderedList)
  let nested = try #require(root.descendant(at: [0, 1]) as? any ListItemContainer)
  let items = Array(nested.listItems)
  #expect(nested.childCount == 2)
  #expect((items[0].child(at: 0) as? Paragraph)?.plainText == "子")
  if let ordered = nested as? OrderedList { #expect(ordered.startIndex == 3) }
  if item.contains("[x]") { #expect(items[1].checkbox == .unchecked) }
  let reopened = Document(parsing: next.document.source)
  let reopenedList = reopened.descendant(at: [0, 0, 1]) as? any ListItemContainer
  #expect(reopenedList?.childCount == 2)
  if item.hasPrefix("3.") { #expect((reopenedList as? OrderedList)?.startIndex == 3) }
  let lifted = try next.document.splittingBlock(in: 0, path: next.path, before: [], after: [])
  #expect(lifted.path == [1, 0])
  #expect(lifted.document.blocks[0].markup.childCount == 2)
  #expect(lifted.document.blocks[0].markup.descendant(at: [0, 1])?.childCount == 1)
}
