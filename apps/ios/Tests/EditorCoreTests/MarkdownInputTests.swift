import Foundation
import Markdown
import Testing

@testable import EditorCore

@Test("日本語と絵文字の後へ入力した太字・斜体・取消線・コード・リンクを変換する")
func inlineMarkdownInput() throws {
  for (source, expected) in [
    ("前👩🏽‍💻 **太字**", "Strong"), ("前 *斜体*", "Emphasis"),
    ("前 ~~取消~~", "Strikethrough"), ("前 `a * b`", "InlineCode"),
    ("前 [リンク](https://example.com)", "Link"),
  ] {
    let result = try #require(MarkdownInput.inlineShortcut(in: source, before: source.utf16.count))
    #expect(String(describing: type(of: result.markup)) == expected)
    #expect(result.range.location > 0)
  }
}

@Test("閉じていない記号とエスケープと単語内の下線は変換しない")
func incompleteAndEscapedInput() {
  #expect(MarkdownInput.inlineShortcut(in: "123_b_", before: 6) == nil)
  for source in ["**未完", "**太字*", "***複合**", "\\*文字*", "a_b_", "`未完", "[リンク](未完", "普通の日本語"] {
    #expect(MarkdownInput.inlineShortcut(in: source, before: source.utf16.count) == nil)
  }
}

@Test("複数行の本文を見出しへ変換しても後続行を捨てない")
func multilineBlockInput() throws {
  let result = try MarkdownInput.block(
    prefix: "### ", inlines: [Markdown.Text("見出し"), SoftBreak(), Markdown.Text("次の本文")])
  let source = try MarkdownSource.serialize(result.markup)
  #expect(source == "### 見出し\n\n次の本文")
}

@Test("見出し・リスト・引用・言語付きコードフェンスの入力接頭辞を認識する")
func blockMarkdownInput() throws {
  for prefix in ["# ", "### ", "- ", "1. ", "> ", "```swift\n"] {
    let length = try #require(MarkdownInput.blockPrefix(in: prefix + "本文"))
    #expect(length == prefix.utf16.count)
    let result = try MarkdownInput.block(prefix: prefix, inlines: [Markdown.Text("本文")])
    let node = try #require(result.markup.descendant(at: result.path))
    let text = (node as? any PlainTextConvertibleMarkup)?.plainText ?? (node as? CodeBlock)?.code
    #expect(text?.trimmingCharacters(in: .newlines) == "本文")
  }
  #expect(MarkdownInput.blockPrefix(in: "文中の ## 記号") == nil)
}

@Test("空の箇条書き・チェックリスト・引用にも入力欄を保持する")
func emptyMarkdownInput() throws {
  for prefix in ["- ", "- [x] ", "> "] {
    let result = try MarkdownInput.block(prefix: prefix, inlines: [])
    #expect(result.markup.descendant(at: result.path) is Paragraph)
    #expect((result.markup.descendant(at: result.path) as? Paragraph)?.plainText == "")
  }
}

@Test("字下げ後にMarkdownでブロックを変更しても他の項目と未対応の原文を保持する")
func typedBlockWithinList() throws {
  let document = MarkdownDocument(source: "- 一\n- 二\n\n<div>保持</div>\n")
  let heading = try document.replacingBlock(
    in: 0, path: [1, 0], with: Heading(level: 3, Markdown.Text("見出し")), focusPath: [])
  #expect(heading.document.source.contains("- ### 見出し"))
  #expect(heading.document.source.hasSuffix("\n\n<div>保持</div>\n"))
}

@Test("リスト作成後にチェック記法を入力しても項目を入れ子にせずチェック状態を反映する")
func incrementalCheckList() throws {
  let document = MarkdownDocument(source: "- 項目\n- 次\n")
  let prefix = "[x] "
  #expect(MarkdownInput.blockPrefix(in: prefix) == prefix.utf16.count)
  let block = try MarkdownInput.block(prefix: prefix, inlines: [Markdown.Text("完了")])
  let result = try document.replacingBlock(
    in: 0, path: [0, 0], with: block.markup, focusPath: block.path)
  #expect(result.path == [0, 0])
  #expect(result.document.source == "- [x] 完了\n- 次\n")
}
