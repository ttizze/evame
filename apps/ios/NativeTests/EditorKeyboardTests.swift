import EditorCore
import Markdown
import Testing
import UIKit

@testable import EvameEditorPrototype

@MainActor
@Test("変換中や表のセルの先頭のBackspaceで文書の構造を変更しない", arguments: ["変換中", "表のセル"])
func backspaceDuringCompositionAndInTable(_ scenario: String) {
  var called = false
  var output = [any InlineMarkup]()
  let markup: any Markup = scenario == "表のセル" ? Table.Cell() : Paragraph()
  let editor = NativeTextView(
    markup: markup, font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: scenario != "表のセル", allowsInlineFormatting: true,
    onCommand: { _, _ in called = true }, onChange: { output = $0 })
  if scenario == "変換中" {
    editor.blockActions = MarkdownDocument(source: "本文").blockActions(in: 0, path: [])
    editor.setMarkedText("にほん", selectedRange: NSRange(location: 0, length: 0))
    #expect(editor.markedTextRange != nil)
  }
  editor.deleteBackward()
  #expect(!called)
  #expect(output.isEmpty)
}

@MainActor
@Test("Backspaceで結合してUndoとRedoを行っても入力欄とカーソルを保つ", arguments: ["リスト内", "元の段落間"])
func structuralBackspaceHistory(_ scenario: String) throws {
  let controller = EditorViewController()
  let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
  window.rootViewController = controller
  window.makeKeyAndVisible()
  window.layoutIfNeeded()
  defer { window.isHidden = true }
  controller.loadViewIfNeeded()
  var pending = [controller.view!]
  var editors = [NativeTextView]()
  while let view = pending.popLast() {
    if let editor = view as? NativeTextView { editors.append(editor) }
    pending += view.subviews.reversed()
  }
  let editor = try #require(scenario == "リスト内" ? editors.first : editors.dropFirst().first)
  #expect(editor.becomeFirstResponder())
  if scenario == "リスト内" {
    editor.selectedRange = NSRange(location: editor.text.utf16.count, length: 0)
    for text in ["\n", "- ", "前", "\n"] {
      if editor.textView(editor, shouldChangeTextIn: editor.selectedRange, replacementText: text) {
        editor.insertText(text)
        editor.textViewDidChange(editor)
      }
    }
    #expect(editor.text.isEmpty)
  }
  editor.selectedRange = NSRange(location: 0, length: 0)
  let before = editor.text
  let undo = try #require(editor.undoManager)
  undo.removeAllActions()
  undo.beginUndoGrouping()
  editor.deleteBackward()
  undo.endUndoGrouping()
  let joined = editor.text
  #expect(joined != before)
  #expect(editor.isFirstResponder)
  undo.undo()
  #expect(editor.text == before)
  #expect(editor.selectedRange == NSRange(location: 0, length: 0))
  undo.redo()
  #expect(editor.text == joined)
  #expect(editor.isFirstResponder)
  editor.insertText("続き")
  #expect(editor.text.contains("続き"))
  #expect(controller.presentedViewController == nil)
}

@MainActor
@Test("空の項目と本文の先頭のBackspaceを文書の所有者へ渡す", arguments: ["", "本文"])
func backspaceAtBlockStart(_ text: String) {
  var called = false
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text(text)), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true,
    onCommand: { _, _ in called = true }, onChange: { _ in })
  editor.blockActions = MarkdownDocument(source: "本文").blockActions(in: 0, path: [])
  editor.selectedRange = NSRange(location: 0, length: 0)
  editor.deleteBackward()
  #expect(called)
}

@MainActor
@Test("本文内のBackspaceは絵文字と選択範囲をUIKitの規則で削除する")
func backspaceCharactersAndSelection() {
  var called = false
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text("A👩🏽‍💻B")), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true,
    onCommand: { _, _ in called = true }, onChange: { _ in })
  editor.blockActions = MarkdownDocument(source: "本文").blockActions(in: 0, path: [])
  editor.selectedRange = NSRange(location: editor.text.utf16.count - 1, length: 0)
  editor.deleteBackward()
  #expect(editor.text == "AB")
  editor.selectedRange = NSRange(location: 0, length: 1)
  editor.deleteBackward()
  #expect(editor.text == "B")
  #expect(!called)
}

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
  let parsed = try #require(
    Document(parsing: MarkdownSource.serialize(Paragraph(output))).child(at: 0) as? Paragraph)
  #expect((parsed.child(at: 0) as? Markdown.Text)?.string == "前")
  let image = try #require(parsed.child(at: 1) as? Markdown.Image)
  #expect(image.source == "assets/test.png")
  #expect(image.plainText == "写真")
  #expect((parsed.child(at: 2) as? Markdown.Text)?.string == "後")
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
