import EditorCore
import Markdown
import Testing
import UIKit

@testable import EvameEditorPrototype

@MainActor
@Test("太字の中の斜体とリンクの題名と画像を装飾付きテキストから復元する")
func richTextRoundTrip() throws {
  let source = "**太字と*斜体***、[参照](https://example.com \"題名\")、![画像](assets/photo.png \"画像の題名\")"
  let paragraph = try #require(Document(parsing: source).child(at: 0) as? Paragraph)
  let text = RichTextCodec.attributed(paragraph, font: .preferredFont(forTextStyle: .body))
  let restored = Paragraph(RichTextCodec.inlines(text, font: .preferredFont(forTextStyle: .body)))
  let parsed = try #require(
    Document(parsing: MarkdownSource.serialize(restored)).child(at: 0) as? Paragraph)
  #expect(parsed.format() == paragraph.format())
  #expect(parsed.children.compactMap { ($0 as? Link)?.title }.first == "題名")
  #expect(parsed.children.compactMap { ($0 as? Markdown.Image)?.title }.first == "画像の題名")
}

@MainActor
@Test("コード内の記号と日本語とソフト改行と明示改行を保持する")
func breaksAndCode() throws {
  let source = "日本語👋と`a * b`\n次の行  \n改行後"
  let paragraph = try #require(Document(parsing: source).child(at: 0) as? Paragraph)
  let text = RichTextCodec.attributed(paragraph, font: .preferredFont(forTextStyle: .body))
  #expect(
    Paragraph(RichTextCodec.inlines(text, font: .preferredFont(forTextStyle: .body))).format()
      == paragraph.format())
}

@MainActor
@Test("太字の範囲内の一部だけ斜体にしても太字を分裂させない")
func overlappingStyles() {
  let text = NSMutableAttributedString(string: "太字斜体", attributes: [.editorStrong: true])
  text.addAttribute(.editorEmphasis, value: true, range: NSRange(location: 2, length: 2))
  let paragraph = Paragraph(RichTextCodec.inlines(text, font: .preferredFont(forTextStyle: .body)))
  #expect(paragraph.childCount == 1)
  #expect(paragraph.child(at: 0) is Strong)
  #expect(paragraph.child(at: 0)?.child(at: 1) is Emphasis)
}

@MainActor
@Test("日本語変換中は変更通知を待ち確定後に一度だけ本文を反映する")
func markedTextDoesNotCommit() {
  var changes = [String]()
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text("")), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { changes.append(Paragraph($0).plainText) })
  editor.setMarkedText("にほん", selectedRange: NSRange(location: 3, length: 0))
  editor.textViewDidChange(editor)
  #expect(changes.isEmpty)
  editor.unmarkText()
  editor.textViewDidChange(editor)
  #expect(changes.last == "にほん")
  #expect(changes.count == 1)
}

@MainActor
@Test("日本語の選択範囲を装飾してUndoとRedoを行っても選択と本文を保つ")
func formattingUndoAndSelection() throws {
  let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
  let controller = UIViewController()
  window.rootViewController = controller
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text("日本語👩🏽‍💻")), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in }, onChange: { _ in }
  )
  controller.view.addSubview(editor)
  window.makeKeyAndVisible()
  defer { window.isHidden = true }
  #expect(editor.becomeFirstResponder())
  let undo = try #require(editor.undoManager)
  let selection = NSRange(location: 0, length: 3)
  editor.selectedRange = selection
  undo.beginUndoGrouping()
  editor.toggleStyle(.editorStrong)
  undo.endUndoGrouping()
  #expect(
    editor.attributedText.attribute(.editorStrong, at: 0, effectiveRange: nil) as? Bool == true)
  #expect(editor.selectedRange == selection)
  undo.undo()
  #expect(editor.attributedText.attribute(.editorStrong, at: 0, effectiveRange: nil) == nil)
  #expect(editor.text == "日本語👩🏽‍💻")
  #expect(editor.selectedRange == selection)
  undo.redo()
  #expect(
    editor.attributedText.attribute(.editorStrong, at: 0, effectiveRange: nil) as? Bool == true)
}

@MainActor
@Test("表のセルでは改行を含む入力を拒否して通常の日本語入力を許可する")
func tableCellInput() {
  let editor = NativeTextView(
    markup: Table.Cell(Markdown.Text("セル")), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: false, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { _ in })
  let selection = NSRange(location: 0, length: 0)
  #expect(!editor.textView(editor, shouldChangeTextIn: selection, replacementText: "次\nの行"))
  #expect(editor.textView(editor, shouldChangeTextIn: selection, replacementText: "日本語"))
}

@MainActor
@Test("他のアプリから貼り付けた標準の装飾付きリンクを保持する")
func pastedLink() throws {
  let url = try #require(URL(string: "https://example.com"))
  let text = NSAttributedString(string: "リンク", attributes: [.link: url, .strikethroughStyle: 0])
  let paragraph = Paragraph(RichTextCodec.inlines(text, font: .preferredFont(forTextStyle: .body)))
  let link = try #require(paragraph.child(at: 0) as? Link)
  #expect(link.destination == "https://example.com")
  #expect(link.child(at: 0) is Markdown.Text)
}

@MainActor
@Test("同じURLへ隣り合うリンクの異なる題名をそれぞれ保持する")
func adjacentLinkTitles() throws {
  let paragraph = try #require(
    Document(parsing: "[一](https://example.com \"題名1\")[二](https://example.com \"題名2\")").child(
      at: 0) as? Paragraph)
  let text = RichTextCodec.attributed(paragraph, font: .preferredFont(forTextStyle: .body))
  let restored = Paragraph(RichTextCodec.inlines(text, font: .preferredFont(forTextStyle: .body)))
  #expect(restored.children.compactMap { ($0 as? Link)?.title } == ["題名1", "題名2"])
}
