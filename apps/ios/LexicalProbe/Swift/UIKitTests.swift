#if canImport(UIKit) && !SWIFT_PACKAGE
  import EditorCore
  import Foundation
  import Markdown
  import Testing
  import UIKit
  import XCTest

  @testable import EvameEditorPrototype

  @MainActor
  private final class NativeFixture {
    let session: LexicalSession
    let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    var editor: NativeTextView!
    var snapshot: [String: Any]
    var field = 0
    var failure: Error?
    var pasted: XCTestExpectation?

    init(_ mode: String, source: String) throws {
      session = try LexicalSession(mode)
      snapshot = try session.request(["action": "load", "source": source])
      editor = NativeTextView(
        markup: try markup(0), font: .systemFont(ofSize: 20), allowsLineBreaks: true,
        allowsInlineFormatting: true,
        onCommand: { [weak self] editor, command in self?.command(editor, command) },
        onChange: { [weak self] nodes in self?.commit(nodes) })
      editor.blockActions = MarkdownDocument(source: "本文").blockActions(in: 0, path: [])
      let controller = UIViewController()
      window.rootViewController = controller
      controller.view.addSubview(editor)
      editor.frame = CGRect(x: 12, y: 72, width: 350, height: 160)
      window.makeKeyAndVisible()
      window.layoutIfNeeded()
    }

    private func markup(_ index: Int) throws -> any Markup {
      let source = snapshot["markdown"] as? String ?? ""
      var leaves = [any Markup]()
      func visit(_ node: any Markup) {
        if node is Paragraph || node is Heading || node is CodeBlock || node is Table.Cell {
          leaves.append(node)
        } else {
          node.children.forEach(visit)
        }
      }
      visit(Document(parsing: source))
      if index < leaves.count { return leaves[index] }
      guard let fields = snapshot["fields"] as? [[String: Any]], index < fields.count,
        fields[index]["text"] as? String == ""
      else { throw LexicalSession.Failure.invalidResponse }
      return Paragraph()
    }

    private func commit(_ nodes: [any InlineMarkup]) {
      do {
        snapshot = try session.request([
          "action": "replaceField", "field": field, "runs": nativeRuns(nodes, formats: []),
        ])
        pasted?.fulfill()
      } catch { failure = error }
    }

    private func render(_ selection: NSRange) throws {
      editor.rebind(
        markup: try markup(field), font: .systemFont(ofSize: 20), allowsLineBreaks: true,
        allowsInlineFormatting: true, selection: selection,
        onCommand: { [weak self] editor, command in self?.command(editor, command) },
        onChange: { [weak self] nodes in self?.commit(nodes) })
      editor.blockActions = MarkdownDocument(source: "本文").blockActions(in: 0, path: [])
    }

    private func restore(_ root: [String: Any], field index: Int, selection: NSRange) {
      let previous = snapshot["root"] as? [String: Any] ?? [:]
      let previousField = field
      let previousSelection = editor.selectedRange
      editor.undoManager?.registerUndo(withTarget: self) {
        $0.restore(previous, field: previousField, selection: previousSelection)
      }
      do {
        snapshot = try session.request([
          "action": "restore", "root": root, "field": index, "start": selection.location,
          "end": NSMaxRange(selection),
        ])
        field = index
        try render(selection)
      } catch { failure = error }
    }

    private func command(_ view: NativeTextView, _ command: EditorKeyboardMenu.Command) {
      let name: String
      switch command {
      case .split: name = "enter"
      case .backspace: name = "backspace"
      default: return
      }
      let previous = snapshot["root"] as? [String: Any] ?? [:]
      let previousField = field
      let selection = view.selectedRange
      do {
        _ = try session.request([
          "action": "select", "field": field, "start": selection.location,
          "end": NSMaxRange(selection),
        ])
        snapshot = try session.request(["action": "command", "name": name])
        view.undoManager?.registerUndo(withTarget: self) {
          $0.restore(previous, field: previousField, selection: selection)
        }
        guard let next = snapshot["selection"] as? [String: Any], let index = next["field"] as? Int,
          index >= 0, let anchor = next["anchor"] as? Int
        else { throw LexicalSession.Failure.invalidResponse }
        field = index
        try render(NSRange(location: anchor, length: 0))
      } catch { failure = error }
    }
  }

  private func nativeRuns(_ nodes: [any InlineMarkup], formats: [String]) throws -> [[String: Any]]
  {
    try nodes.flatMap { node -> [[String: Any]] in
      switch node {
      case let text as Markdown.Text: return [["text": text.string, "formats": formats]]
      case let code as InlineCode: return [["text": code.code, "formats": formats + ["code"]]]
      case is SoftBreak, is LineBreak: return [["break": true]]
      case is Strong:
        return try nativeRuns(
          node.children.map { $0 as! any InlineMarkup }, formats: formats + ["bold"])
      case is Emphasis:
        return try nativeRuns(
          node.children.map { $0 as! any InlineMarkup }, formats: formats + ["italic"])
      case is Strikethrough:
        return try nativeRuns(
          node.children.map { $0 as! any InlineMarkup }, formats: formats + ["strikethrough"])
      default: throw LexicalSession.Failure.invalidResponse
      }
    }
  }

  @Suite(.serialized)
  @MainActor
  struct LexicalUIKitTests {
    @Test("実際のUIKit削除で絵文字と選択範囲を削除しLexicalへ反映する", arguments: lexicalModes)
    func deletion(_ mode: String) throws {
      let fixture = try NativeFixture(mode, source: "A👩🏽‍💻B")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor!
      #expect(editor.becomeFirstResponder())
      editor.selectedRange = NSRange(location: editor.text.utf16.count - 1, length: 0)
      editor.deleteBackward()
      editor.textViewDidChange(editor)
      #expect(editor.text == "AB")
      #expect(fixture.snapshot["text"] as? String == "AB")
      editor.selectedRange = NSRange(location: 0, length: 1)
      editor.deleteBackward()
      editor.textViewDidChange(editor)
      #expect(fixture.snapshot["text"] as? String == "B")
      #expect(fixture.failure == nil)
    }

    @Test("日本語の未確定入力をLexicalへ送らず確定後だけ反映する", arguments: lexicalModes)
    func composition(_ mode: String) throws {
      let fixture = try NativeFixture(mode, source: "前")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor!
      #expect(editor.becomeFirstResponder())
      editor.selectedRange = NSRange(location: 1, length: 0)
      editor.setMarkedText("にほん", selectedRange: NSRange(location: 3, length: 0))
      editor.textViewDidChange(editor)
      #expect(editor.markedTextRange != nil)
      #expect(fixture.snapshot["text"] as? String == "前")
      editor.unmarkText()
      #expect(fixture.snapshot["text"] as? String == "前にほん")
      #expect(fixture.failure == nil)
    }

    @Test("UIKitの改行で次項目を作りUndoとRedoで文書とカーソルを戻す", arguments: lexicalModes)
    func returnHistory(_ mode: String) throws {
      let fixture = try NativeFixture(mode, source: "- 項目")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor!
      #expect(editor.becomeFirstResponder())
      editor.selectedRange = NSRange(location: 2, length: 0)
      let before = fixture.snapshot["markdown"] as? String
      let history = try #require(editor.undoManager)
      history.removeAllActions()
      history.beginUndoGrouping()
      #expect(
        !editor.textView(editor, shouldChangeTextIn: editor.selectedRange, replacementText: "\n"))
      history.endUndoGrouping()
      #expect(editor.text.isEmpty)
      #expect((fixture.snapshot["fields"] as? [Any])?.count == 2)
      history.undo()
      #expect(fixture.snapshot["markdown"] as? String == before)
      #expect(editor.text == "項目")
      #expect(editor.selectedRange == NSRange(location: 2, length: 0))
      history.redo()
      #expect(editor.text.isEmpty)
      #expect((fixture.snapshot["fields"] as? [Any])?.count == 2)
      #expect(fixture.failure == nil)
    }

    @Test(
      "実際の斜体操作で日本語と英字と太字併用の描画を変え解除で戻す", arguments: lexicalModes,
      ["日本語", "English", "**日本語**", "**English**"])
    func italicDrawing(_ mode: String, _ source: String) throws {
      let fixture = try NativeFixture(mode, source: source)
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor!
      let originalMarkdown = fixture.snapshot["markdown"] as? String
      editor.selectedRange = NSRange(location: 0, length: editor.text.utf16.count)
      func pixels() throws -> Data {
        editor.layoutIfNeeded()
        let image = UIGraphicsImageRenderer(bounds: editor.bounds).image {
          editor.layer.render(in: $0.cgContext)
        }
        Attachment.record(image, named: "Lexical-\(mode)-\(source)", as: .png)
        return try #require(image.cgImage?.dataProvider?.data) as Data
      }
      let original = try pixels()
      editor.toggleItalics(nil)
      #expect(try pixels() != original)
      let markdown = try #require(fixture.snapshot["markdown"] as? String)
      let traits = markdownTextTraits(Document(parsing: markdown), bold: false, italic: false)
      #expect(traits.map(\.text).joined() == editor.text)
      #expect(traits.allSatisfy { $0.italic })
      editor.toggleItalics(nil)
      #expect(try pixels() == original)
      #expect(fixture.snapshot["markdown"] as? String == originalMarkdown)
      #expect(fixture.failure == nil)
    }

    @Test("装飾付きの実コピーと貼り付けをLexicalへ保存しUndoとRedoする", arguments: lexicalModes)
    func clipboard(_ mode: String) async throws {
      let fixture = try NativeFixture(mode, source: "")
      defer { fixture.window.isHidden = true }
      let source = NativeTextView(
        markup: Paragraph(Emphasis(Strong(Markdown.Text("日本語English")))),
        font: .systemFont(ofSize: 20), allowsLineBreaks: true, allowsInlineFormatting: true,
        onCommand: { _, _ in }, onChange: { _ in })
      source.selectedRange = NSRange(location: 0, length: source.text.utf16.count)
      let clipboard = UIPasteboard.general
      let previous = clipboard.items
      defer { clipboard.items = previous }
      source.copy(nil)
      let editor = fixture.editor!
      #expect(editor.becomeFirstResponder())
      fixture.pasted = XCTestExpectation(description: "貼り付けをLexicalへ反映")
      let history = try #require(editor.undoManager)
      history.removeAllActions()
      history.beginUndoGrouping()
      editor.paste(nil)
      let result = await XCTWaiter.fulfillment(of: [fixture.pasted!], timeout: 5)
      fixture.pasted = nil
      history.endUndoGrouping()
      #expect(result == .completed)
      let markdown = try #require(fixture.snapshot["markdown"] as? String)
      let traits = markdownTextTraits(Document(parsing: markdown), bold: false, italic: false)
      #expect(traits.map(\.text).joined() == "日本語English")
      #expect(traits.allSatisfy { $0.bold && $0.italic })
      history.undo()
      #expect(fixture.snapshot["text"] as? String == "")
      history.redo()
      #expect(fixture.snapshot["text"] as? String == "日本語English")
      #expect(fixture.failure == nil)
    }
  }
#endif
