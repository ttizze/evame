import EditorCore
import Markdown
import Testing
import UIKit

@testable import EvameEditorPrototype

@MainActor
@Test("キーボード上へWebのアイコン列と太字・斜体・取消線を直接表示する")
func keyboardMenuItems() throws {
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text("本文")), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in }, onChange: { _ in }
  )
  let menu = try #require(editor.inputAccessoryView)
  var pending = [menu]
  var buttons = [UIButton]()
  while let view = pending.popLast() {
    if let button = view as? UIButton { buttons.append(button) }
    pending += view.subviews.reversed()
  }
  #expect(
    buttons.prefix(13).map(\.accessibilityIdentifier)
      == [
        "indent", "outdent", "h2", "h3", "h4", "bold", "italic", "strike", "code", "bullet",
        "ordered", "link", "image",
      ].map { "editor." + $0 })
  #expect(buttons.prefix(13).allSatisfy { $0.image(for: .normal) != nil })
  #expect(menu.intrinsicContentSize.height == 48)
}

@MainActor
@Test("太字のMarkdown記法を入力すると装飾へ変わりカーソルが日本語の直後に残る")
func typingInlineMarkdown() throws {
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: Paragraph(), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { output = $0 })
  editor.attributedText = NSAttributedString(string: "前👩🏽‍💻 **太字**")
  editor.selectedRange = NSRange(location: editor.text.utf16.count, length: 0)
  editor.textViewDidChange(editor)
  #expect(editor.text == "前👩🏽‍💻 太字")
  #expect(editor.selectedRange.location == editor.text.utf16.count)
  #expect(output.last is Strong)
}

@MainActor
@Test("日本語変換中のMarkdownは確定まで変換せず本文も通知しない")
func markedMarkdown() {
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: Paragraph(), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { output = $0 })
  editor.setMarkedText("**にほん**", selectedRange: NSRange(location: 7, length: 0))
  editor.textViewDidChange(editor)
  #expect(output.isEmpty)
  #expect(editor.text == "**にほん**")
  editor.unmarkText()
  #expect(editor.text == "にほん")
  #expect(output.first is Strong)
}

@MainActor
@Test("見出し記法の入力結果と記号を除いた選択位置を文書の所有者へ渡す")
func typingBlockMarkdown() throws {
  var heading: Heading?
  var selection: NSRange?
  let editor = NativeTextView(
    markup: Paragraph(), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true,
    onCommand: { _, command in
      if case .markdown(let markup, _, let range, _) = command {
        heading = markup as? Heading
        selection = range
      }
    }, onChange: { _ in })
  editor.blockActions = MarkdownDocument(source: "本文").blockActions(in: 0, path: [])
  editor.attributedText = NSAttributedString(string: "## 見出し")
  editor.selectedRange = NSRange(location: editor.text.utf16.count, length: 0)
  editor.textViewDidChange(editor)
  #expect(heading?.level == 2)
  #expect(heading?.plainText == "見出し")
  #expect(selection == NSRange(location: 3, length: 0))
}

@MainActor
@Test(
  "記号で始まる既存の段落へ追記しても見出し・リスト・引用へ変換しない",
  arguments: ["# 本文", "## 本文", "- 本文", "1. 本文", "> 本文", "[x] 本文"])
func editingLiteralBlockPrefix(_ text: String) {
  var converted = false
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text(text)), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true,
    onCommand: { _, command in
      if case .markdown = command { converted = true }
    }, onChange: { output = $0 })
  editor.blockActions = MarkdownDocument(source: "本文").blockActions(in: 0, path: [])
  editor.selectedRange = NSRange(location: editor.text.utf16.count, length: 0)
  editor.insertText("追記")
  editor.textViewDidChange(editor)
  #expect(!converted)
  #expect(Paragraph(output).plainText == text + "追記")
}

@MainActor
@Test("既存の本文の先頭で見出し記法を完成させると見出しへ変換する")
func completingBlockPrefix() {
  var heading: Heading?
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text("#本文")), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true,
    onCommand: { _, command in
      if case .markdown(let markup, _, _, _) = command { heading = markup as? Heading }
    }, onChange: { _ in })
  editor.blockActions = MarkdownDocument(source: "本文").blockActions(in: 0, path: [])
  editor.selectedRange = NSRange(location: 1, length: 0)
  editor.insertText(" ")
  editor.textViewDidChange(editor)
  #expect(heading?.level == 1)
  #expect(heading?.plainText == "本文")
}

@MainActor
@Test("一文字ずつ打った太字記法は最後の記号まで待って太字へ変換する")
func incrementalBoldMarkdown() throws {
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: Paragraph(), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { output = $0 })
  for character in "**markdown**" {
    editor.insertText(String(character))
    editor.textViewDidChange(editor)
  }
  #expect(editor.text == "markdown")
  #expect(output.first is Strong)
}

@MainActor
@Test("太字ボタンで入力を始めると入力文字へ太字属性を付ける")
func boldTypingAttributes() throws {
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text("前後")), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { output = $0 })
  editor.selectedRange = NSRange(location: 1, length: 0)
  editor.toggleStyle(.editorStrong)
  for character in "bold" {
    editor.insertText(String(character))
    editor.textViewDidChange(editor)
  }
  #expect(try MarkdownSource.serialize(Paragraph(output)) == "前**bold**後")
}

@MainActor
@Test("言語付きフェンスで改行すると本文を空のコードブロックへ変換する")
func codeFenceReturn() {
  var code: CodeBlock?
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text("```swift")), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true,
    onCommand: { _, command in
      if case .markdown(let markup, _, _, _) = command { code = markup as? CodeBlock }
    }, onChange: { _ in })
  editor.blockActions = MarkdownDocument(source: "本文").blockActions(in: 0, path: [])
  editor.selectedRange = NSRange(location: editor.text.utf16.count, length: 0)
  #expect(!editor.textView(editor, shouldChangeTextIn: editor.selectedRange, replacementText: "\n"))
  #expect(code?.language == "swift")
  #expect(code?.code == "")
}

@MainActor
@Test("画像は選択位置へプレビューとMarkdown参照を一緒に挿入する")
func keyboardImageInsertion() throws {
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text("前後")), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { output = $0 })
  let preview = try #require(UIImage(systemName: "star"))
  editor.insertImage(
    Markdown.Image(source: "assets/test.png", [Markdown.Text("写真")]), preview: preview,
    selection: NSRange(location: 1, length: 0))
  #expect(try MarkdownSource.serialize(Paragraph(output)) == "前![写真](<assets/test.png>)後")
  let attachment = try #require(
    editor.attributedText.attribute(.attachment, at: 1, effectiveRange: nil) as? NSTextAttachment)
  #expect(attachment.image === preview)
  editor.selectedRange = NSRange(location: 1, length: 1)
  editor.toggleStyle(.editorCode)
  #expect(
    editor.attributedText.attribute(.editorImage, at: 1, effectiveRange: nil) is Markdown.Image)
  #expect(output.contains { $0 is Markdown.Image })
}

@MainActor
@Test("標準の太字フォントを貼り付けても太字を保持し見出しの基本フォントは装飾と混同しない")
func nativeFontFormatting() {
  let bold = UIFont.boldSystemFont(ofSize: 17)
  let text = NSAttributedString(string: "太字", attributes: [.font: bold])
  #expect(RichTextCodec.inlines(text, font: .systemFont(ofSize: 17)).first is Strong)
  #expect(RichTextCodec.inlines(text, font: bold).first is Markdown.Text)
}
