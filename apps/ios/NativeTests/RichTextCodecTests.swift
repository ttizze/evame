import CoreText
import EditorCore
import Markdown
import Testing
import UIKit
import XCTest

@testable import EvameEditorPrototype

@MainActor
@Test("空のチェック項目を開き直しても余分な空白を入力せずUndo後のReturnでリストを抜ける", arguments: [false, true])
func reopenedEmptyTaskInput(_ cleared: Bool) throws {
  let original = MarkdownDocument(source: "- [x] 完了\n")
  let saved =
    try cleared
    ? original.replacingInlines(in: 0, path: [0, 0], with: [])
    : original.splittingBlock(in: 0, path: [0, 0], before: [Markdown.Text("完了")], after: [])
      .document
  var document = MarkdownDocument(source: saved.source)
  let path = [cleared ? 0 : 1, 0]
  let paragraph = try path.reduce(try #require(document.blocks.first?.markup)) {
    try #require($0.child(at: $1))
  }
  var exited = false
  let editor = NativeTextView(
    markup: paragraph, font: .systemFont(ofSize: 17), allowsLineBreaks: true,
    allowsInlineFormatting: true,
    onCommand: { _, command in
      if case .split(let before, let after) = command {
        do {
          let result = try document.splittingBlock(in: 0, path: path, before: before, after: after)
          exited = !result.document.blockActions(in: 0, path: result.path).selected.contains(
            .checkList)
        } catch { Issue.record(error) }
      }
    },
    onChange: { inlines in
      do { document = try document.replacingInlines(in: 0, path: path, with: inlines) } catch {
        Issue.record(error)
      }
    })
  editor.blockActions = document.blockActions(in: 0, path: path)
  #expect(document.source == saved.source)
  #expect(editor.text.isEmpty)
  editor.selectedRange = NSRange(location: editor.text.utf16.count, length: 0)
  editor.insertText("買い物")
  editor.textViewDidChange(editor)
  let body = try path.reduce(
    try #require(MarkdownDocument(source: document.source).blocks.first?.markup)
  ) {
    try #require($0.child(at: $1))
  }
  #expect((body as? Paragraph)?.plainText == "買い物")
  editor.undoManager?.undo()
  #expect(editor.text.isEmpty)
  editor.undoManager?.redo()
  #expect(editor.text == "買い物")
  editor.undoManager?.undo()
  #expect(!editor.textView(editor, shouldChangeTextIn: editor.selectedRange, replacementText: "\n"))
  #expect(exited)
}

@MainActor
@Test("空チェック項目の表示対応で通常の段落や複数の空白やタブや装飾付き空白を削らない")
func taskPlaceholderPreservesLiteralWhitespace() throws {
  let font = UIFont.systemFont(ofSize: 17)
  for paragraph in [Paragraph(), Paragraph(Markdown.Text(" "))] {
    let list = UnorderedList([ListItem(checkbox: .unchecked, paragraph)])
    let markup = try #require(list.child(at: 0)?.child(at: 0))
    let editor = NativeTextView(
      markup: markup, font: font, allowsLineBreaks: true, allowsInlineFormatting: true,
      onCommand: { _, _ in }, onChange: { _ in })
    #expect(editor.accessibilityLabel == String(localized: "チェック項目"))
  }
  #expect(RichTextCodec.attributed(Paragraph(Markdown.Text(" ")), font: font).string == " ")
  for inlines: [any InlineMarkup] in [
    [Markdown.Text("  ")], [Markdown.Text("\t")], [Strong(Markdown.Text(" "))],
  ] {
    let list = UnorderedList([ListItem(checkbox: .unchecked, Paragraph(inlines))])
    let paragraph = try #require(list.child(at: 0)?.child(at: 0) as? Paragraph)
    #expect(RichTextCodec.attributed(paragraph, font: font).string == paragraph.plainText)
  }
  let list = UnorderedList([
    ListItem(checkbox: .unchecked, Paragraph(Markdown.Text("先頭")), Paragraph(Markdown.Text(" ")))
  ])
  let second = try #require(list.child(at: 0)?.child(at: 1))
  #expect(RichTextCodec.attributed(second, font: font).string == " ")
}

@MainActor
@Test(
  "斜体ボタンで日本語と英字の字形が変わり解除で元に戻る",
  arguments: ["日本語かな", "Italic text"], [false, true])
func italicButtonAppearance(_ text: String, _ bold: Bool) throws {
  let font = UIFont.systemFont(ofSize: 32, weight: bold ? .bold : .regular)
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text(text)), font: font,
    allowsLineBreaks: true, allowsInlineFormatting: true,
    onCommand: { _, _ in }, onChange: { output = $0 })
  let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
  let controller = UIViewController()
  window.rootViewController = controller
  controller.view.addSubview(editor)
  editor.frame = CGRect(x: 0, y: 0, width: 320, height: 96)
  editor.overrideUserInterfaceStyle = .light
  editor.backgroundColor = .white
  window.makeKeyAndVisible()
  defer { window.isHidden = true }
  editor.selectedRange = NSRange(location: 0, length: text.utf16.count)
  var pending = [try #require(editor.inputAccessoryView)]
  var italic: UIButton?
  while let view = pending.popLast() {
    if view.accessibilityIdentifier == "editor.italic" { italic = view as? UIButton }
    pending += view.subviews
  }
  let button = try #require(italic)
  func pixels(_ state: String) throws -> Data {
    editor.layoutIfNeeded()
    let image = UIGraphicsImageRenderer(bounds: editor.bounds).image {
      editor.layer.render(in: $0.cgContext)
    }
    let name = "evame-italic-\(text == "Italic text" ? "latin" : "ja")-\(bold)-\(state).png"
    Attachment.record(image, named: name, as: .png)
    return try #require(image.cgImage?.dataProvider?.data) as Data
  }
  let plain = try pixels("plain")
  button.sendActions(for: .touchUpInside)
  #expect(button.isSelected)
  #expect(output.first is Emphasis)
  #expect(try pixels("italic") != plain)
  button.sendActions(for: .touchUpInside)
  #expect(!button.isSelected)
  #expect(output.first is Markdown.Text)
  #expect(try pixels("restored") == plain)
}

@MainActor
@Test("傾いたフォントの装飾付き文字列をMarkdownの斜体へ戻せる")
func pastedObliqueFont() throws {
  let font = UIFont.systemFont(ofSize: 17)
  let text = RichTextCodec.attributed(
    Paragraph(Emphasis(Markdown.Text("日本語"))), font: font)
  let displayed = try #require(text.attribute(.font, at: 0, effectiveRange: nil) as? UIFont)
  let pasted = NSAttributedString(string: "日本語", attributes: [.font: displayed])
  #expect(RichTextCodec.inlines(pasted, font: font).first is Emphasis)
}

@MainActor
@Test(
  "斜体の日本語と英字とコードをコピーや切り取りで別の入力欄へ貼り付けても書式を保つ",
  .serialized, arguments: [false, true], [false, true])
func italicClipboardRoundTrip(_ cut: Bool, _ code: Bool) async throws {
  let clipboard = UIPasteboard.general
  let previous = clipboard.items
  clipboard.items = []
  defer { clipboard.items = previous }
  let pasted = XCTestExpectation(description: "斜体の貼り付けを本文へ反映する")
  var output = [any InlineMarkup]()
  let font = UIFont.systemFont(ofSize: 17)
  let content: any InlineMarkup = code ? InlineCode("日本語italic") : Markdown.Text("日本語italic")
  let expected = code ? "*`日本語italic`*" : "*日本語italic*"
  let source = NativeTextView(
    markup: Paragraph(Emphasis(content)), font: font,
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { _ in })
  let destination = NativeTextView(
    markup: Paragraph(), font: font, allowsLineBreaks: true, allowsInlineFormatting: true,
    onCommand: { _, _ in },
    onChange: {
      output = $0
      pasted.fulfill()
    })
  let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
  let controller = UIViewController()
  window.rootViewController = controller
  controller.view.addSubview(source)
  controller.view.addSubview(destination)
  source.frame = CGRect(x: 0, y: 0, width: 320, height: 96)
  destination.frame = CGRect(x: 0, y: 120, width: 320, height: 96)
  window.makeKeyAndVisible()
  window.layoutIfNeeded()
  defer { window.isHidden = true }
  #expect(source.becomeFirstResponder())
  source.selectedRange = NSRange(location: 0, length: source.text.utf16.count)
  if cut { source.cut(nil) } else { source.copy(nil) }
  #expect(source.text == (cut ? "" : "日本語italic"))
  #expect(clipboard.string == "日本語italic")
  #expect(clipboard.types.contains("com.apple.flat-rtfd"))
  print("斜体コピーの形式: \(clipboard.types)")
  #expect(destination.becomeFirstResponder())
  let history = try #require(destination.undoManager)
  history.removeAllActions()
  history.beginUndoGrouping()
  destination.paste(nil)
  let result = await XCTWaiter.fulfillment(of: [pasted], timeout: 5)
  history.endUndoGrouping()
  #expect(result == .completed)
  let displayed = try #require(
    destination.attributedText.attribute(.font, at: 0, effectiveRange: nil) as? UIFont)
  #expect(CTFontGetMatrix(displayed).c > 0)
  #expect(try MarkdownSource.serialize(Paragraph(output)) == expected)
  history.undo()
  #expect(destination.text.isEmpty)
  history.redo()
  #expect(try MarkdownSource.serialize(Paragraph(output)) == expected)
}

@MainActor
@Test("標準の編集メニューでも日本語の斜体を適用し未対応の下線操作を表示しない")
func systemItalicEditingAction() throws {
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text("日本語")), font: .systemFont(ofSize: 17),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { output = $0 })
  editor.selectedRange = NSRange(location: 0, length: editor.text.utf16.count)
  editor.toggleItalics(nil)
  #expect(output.first is Emphasis)
  let displayed = try #require(
    editor.attributedText.attribute(.font, at: 0, effectiveRange: nil) as? UIFont)
  #expect(CTFontGetMatrix(displayed).c > 0)
  #expect(!editor.canPerformAction(#selector(editor.toggleUnderline(_:)), withSender: nil))
}

@MainActor
@Test("表への改行と保持できない画像の貼り付けを拒否し元の本文を保持する", arguments: [false, true])
func unsupportedPaste(_ image: Bool) throws {
  var changed = false
  let editor = NativeTextView(
    markup: Paragraph(Markdown.Text("保持")), font: .systemFont(ofSize: 17),
    allowsLineBreaks: image, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { _ in changed = true })
  let attachment = NSTextAttachment()
  attachment.image = UIImage(systemName: "star")
  let input =
    image ? NSAttributedString(attachment: attachment) : NSAttributedString(string: "前\n後")
  let range = try #require(
    editor.textRange(from: editor.beginningOfDocument, to: editor.beginningOfDocument))
  _ = editor.textPasteConfigurationSupporting(editor, performPasteOf: input, to: range)
  #expect(editor.text == "保持")
  #expect(!changed)
}

@MainActor
@Test("画像付き文章の貼り付けでは対応しない添付だけを除いて文字と太字を保持する", arguments: [false, true])
func textAroundUnsupportedAttachment(_ copiedInsideApp: Bool) throws {
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: Paragraph(), font: .systemFont(ofSize: 17),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { output = $0 })
  let input: NSMutableAttributedString
  if copiedInsideApp {
    let original = RichTextCodec.attributed(
      Paragraph(
        Markdown.Text("前"), Markdown.Image(source: "assets/photo.png", [Markdown.Text("画像")]),
        Strong(Markdown.Text("後"))),
      font: .systemFont(ofSize: 17))
    let data = try original.data(
      from: NSRange(location: 0, length: original.length),
      documentAttributes: [.documentType: NSAttributedString.DocumentType.rtfd])
    input = try NSMutableAttributedString(
      data: data, options: [.documentType: NSAttributedString.DocumentType.rtfd],
      documentAttributes: nil)
  } else {
    input = NSMutableAttributedString(string: "前")
    let attachment = NSTextAttachment()
    attachment.image = UIImage(systemName: "star")
    input.append(NSAttributedString(attachment: attachment))
    input.append(
      NSAttributedString(string: "後", attributes: [.font: UIFont.boldSystemFont(ofSize: 17)]))
  }
  let range = try #require(editor.selectedTextRange)
  _ = editor.textPasteConfigurationSupporting(editor, performPasteOf: input, to: range)
  #expect(editor.text == "前後")
  #expect((output.last as? Strong)?.plainText == "後")
  editor.undoManager?.undo()
  #expect(editor.text.isEmpty)
  editor.undoManager?.redo()
  #expect(editor.text == "前後")
}

@MainActor
@Test(
  "表のセルへCommonMarkの行末でない区切り文字を入力や貼り付けできる",
  arguments: ["\u{2028}", "\u{2029}", "\u{85}", "\u{b}", "\u{c}"], [false, true])
func singleLineUnicodeInput(_ separator: String, _ paste: Bool) throws {
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: Paragraph(), font: .systemFont(ofSize: 17),
    allowsLineBreaks: false, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { output = $0 })
  let text = "前\(separator)後"
  if paste {
    _ = editor.textPasteConfigurationSupporting(
      editor, performPasteOf: NSAttributedString(string: text),
      to: try #require(editor.selectedTextRange))
  } else {
    editor.insertText(text)
    editor.textViewDidChange(editor)
  }
  let saved = try MarkdownDocument(source: "| 見出し |\n| --- |\n| |\n").replacingInlines(
    in: 0, path: [1, 0, 0], with: output)
  let table = try #require(saved.blocks.first?.markup as? Table)
  #expect((table.body.child(at: 0)?.child(at: 0) as? Table.Cell)?.plainText == text)
}

@MainActor
@Test(
  "複数行を等幅で貼り付けたりコードにしても保存と再解析で改行と文字を保つ",
  arguments: [false, true], ["\n", "\r\n", "\r"])
func multilineInlineCode(_ paste: Bool, _ newline: String) throws {
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: paste ? Paragraph() : Paragraph(Markdown.Text("a\(newline)\(newline)- b")),
    font: .systemFont(ofSize: 17), allowsLineBreaks: true, allowsInlineFormatting: true,
    onCommand: { _, _ in }, onChange: { output = $0 })
  if paste {
    let input = NSAttributedString(
      string: "a\(newline)\(newline)- b",
      attributes: [.font: UIFont.monospacedSystemFont(ofSize: 17, weight: .regular)])
    let range = try #require(
      editor.textRange(from: editor.beginningOfDocument, to: editor.beginningOfDocument))
    _ = editor.textPasteConfigurationSupporting(editor, performPasteOf: input, to: range)
  } else {
    editor.selectedRange = NSRange(location: 0, length: editor.text.utf16.count)
    editor.toggleStyle(.editorCode)
  }
  let source = try MarkdownSource.serialize(Paragraph(output))
  let parsed = Document(parsing: source)
  #expect(parsed.childCount == 1)
  let paragraph = try #require(parsed.child(at: 0) as? Paragraph)
  #expect(RichTextCodec.attributed(paragraph, font: .systemFont(ofSize: 17)).string == "a\n\n- b")
  #expect(paragraph.children.filter { $0 is LineBreak }.count == 2)
  #expect(paragraph.children.compactMap { ($0 as? InlineCode)?.code } == ["a", "- b"])
}

@MainActor
@Test(
  "既存の段落や表のセルを編集してもCommonMarkの行末ではない区切り文字を保持する",
  arguments: ["\u{2028}", "\u{2029}", "\u{85}", "\u{b}", "\u{c}"], [false, true])
func existingUnicodeSeparators(_ separator: String, _ table: Bool) throws {
  let original = "前\(separator)後"
  let document = MarkdownDocument(
    source: table ? "| 見出し |\n| --- |\n| \(original) |\n" : original)
  let block = try #require(document.blocks.first)
  let path = table ? [1, 0, 0] : []
  let markup = try path.reduce(block.markup) { try #require($0.child(at: $1)) }
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: markup, font: .systemFont(ofSize: 17),
    allowsLineBreaks: !table, allowsInlineFormatting: true,
    onCommand: { _, _ in }, onChange: { output = $0 })
  editor.selectedRange = NSRange(location: editor.text.utf16.count, length: 0)
  editor.insertText("追")
  editor.textViewDidChange(editor)
  let changed = try document.replacingInlines(in: 0, path: path, with: output)
  let restored = try #require(changed.blocks.first)
  let result = try path.reduce(restored.markup) { try #require($0.child(at: $1)) }
  #expect(RichTextCodec.attributed(result, font: .systemFont(ofSize: 17)).string == original + "追")
}

@MainActor
@Test("画像を含む選択は切り取りを無効にして本文と画像を失わない")
func imageCutPreservesContent() {
  var changed = false
  let editor = NativeTextView(
    markup: Paragraph(
      Markdown.Text("本文"), Markdown.Image(source: "assets/photo.png", [Markdown.Text("画像")])),
    font: .systemFont(ofSize: 17), allowsLineBreaks: true, allowsInlineFormatting: true,
    onCommand: { _, _ in }, onChange: { _ in changed = true })
  editor.selectedRange = NSRange(location: 0, length: editor.text.utf16.count)
  let original = NSAttributedString(attributedString: editor.attributedText)
  #expect(!editor.canPerformAction(#selector(editor.cut(_:)), withSender: nil))
  editor.cut(nil)
  #expect(editor.attributedText.isEqual(to: original))
  #expect(!changed)
}

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
@Test(
  "日本語の選択範囲を太字や斜体にしてUndoとRedoを行っても選択と本文を保つ",
  arguments: [NSAttributedString.Key.editorStrong, .editorEmphasis])
func formattingUndoAndSelection(_ key: NSAttributedString.Key) throws {
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
  editor.toggleStyle(key)
  undo.endUndoGrouping()
  #expect(
    editor.attributedText.attribute(key, at: 0, effectiveRange: nil) as? Bool == true)
  #expect(editor.selectedRange == selection)
  undo.undo()
  #expect(editor.attributedText.attribute(key, at: 0, effectiveRange: nil) == nil)
  #expect(editor.text == "日本語👩🏽‍💻")
  #expect(editor.selectedRange == selection)
  undo.redo()
  #expect(
    editor.attributedText.attribute(key, at: 0, effectiveRange: nil) as? Bool == true)
}

@MainActor
@Test("斜体で日本語を変換中は保存せず確定と解除の後も書式を区別する")
func italicCompositionAndTyping() throws {
  var output = [any InlineMarkup]()
  let editor = NativeTextView(
    markup: Paragraph(), font: .preferredFont(forTextStyle: .body),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { output = $0 })
  editor.toggleStyle(.editorEmphasis)
  editor.setMarkedText("にほん", selectedRange: NSRange(location: 3, length: 0))
  editor.textViewDidChange(editor)
  #expect(output.isEmpty)
  editor.unmarkText()
  #expect(try MarkdownSource.serialize(Paragraph(output)) == "*にほん*")
  editor.toggleStyle(.editorEmphasis)
  editor.insertText("通常")
  editor.textViewDidChange(editor)
  #expect(try MarkdownSource.serialize(Paragraph(output)) == "*にほん*通常")
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
