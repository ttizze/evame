#if canImport(UIKit) && !SWIFT_PACKAGE
  import Foundation
  import Testing
  import UIKit

  @MainActor
  private final class DocumentFixture {
    let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    let pasteboard = UIPasteboard.withUniqueName()
    let editor: DocumentTextView

    init(_ mode: String, source: String) throws {
      editor = try DocumentTextView(
        session: LexicalSession(mode), source: source, pasteboard: pasteboard)
      let controller = UIViewController()
      window.rootViewController = controller
      controller.view.addSubview(editor)
      editor.frame = CGRect(x: 12, y: 72, width: 350, height: 400)
      window.makeKeyAndVisible()
      window.layoutIfNeeded()
      _ = editor.becomeFirstResponder()
    }
  }

  @Suite(.serialized)
  @MainActor
  struct LexicalDocumentTextViewTests {
    @Test("1つの入力欄で段落とリスト項目にまたがる選択をBackspaceで削除すると表示とモデルが同じ構造で結合する", arguments: lexicalModes)
    func crossBlockDeletion(_ mode: String) throws {
      let fixture = try DocumentFixture(mode, source: "あいう\n\n- かきく\n- さしす")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      #expect(editor.text == "あいう\nかきく\nさしす")
      editor.selectedRange = NSRange(location: 1, length: 5)
      editor.deleteBackward()
      #expect(editor.text == "あく\nさしす")
      #expect(try blocks(editor.snapshot) == ["paragraph:あく", "- さしす"])
      #expect(editor.selectedRange == NSRange(location: 1, length: 0))
      #expect(editor.failure == nil)
    }

    @Test("ブロックをまたぐ選択へ日本語を変換中はモデルを変えず確定後に選択範囲を置き換える", arguments: lexicalModes)
    func crossBlockComposition(_ mode: String) throws {
      let fixture = try DocumentFixture(mode, source: "あいう\n\n- かきく\n- さしす")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      let loaded = try #require(editor.snapshot["markdown"] as? String)
      editor.selectedRange = NSRange(location: 1, length: 5)
      editor.setMarkedText("にほんご", selectedRange: NSRange(location: 4, length: 0))
      #expect(editor.markedTextRange != nil)
      #expect(editor.snapshot["markdown"] as? String == loaded)
      editor.setMarkedText("日本語", selectedRange: NSRange(location: 3, length: 0))
      #expect(editor.snapshot["markdown"] as? String == loaded)
      editor.unmarkText()
      #expect(editor.text == "あ日本語く\nさしす")
      #expect(try blocks(editor.snapshot) == ["paragraph:あ日本語く", "- さしす"])
      #expect(editor.selectedRange == NSRange(location: 4, length: 0))
      #expect(editor.failure == nil)
    }

    @Test("リスト項目の末尾でReturnを入力すると次の項目を作りカーソルを移す", arguments: lexicalModes)
    func listReturn(_ mode: String) throws {
      let fixture = try DocumentFixture(mode, source: "- かきく")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      editor.selectedRange = NSRange(location: 3, length: 0)
      editor.insertText("\n")
      editor.insertText("次")
      #expect(editor.text == "かきく\n次")
      #expect(try blocks(editor.snapshot) == ["- かきく", "- 次"])
      #expect(editor.selectedRange == NSRange(location: 5, length: 0))
      #expect(editor.failure == nil)
    }

    @Test("段落の先頭でBackspaceを押すと前の段落へ結合する", arguments: lexicalModes)
    func joinAtBlockStart(_ mode: String) throws {
      let fixture = try DocumentFixture(mode, source: "前\n\n後")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      editor.selectedRange = NSRange(location: 2, length: 0)
      editor.deleteBackward()
      #expect(editor.text == "前後")
      #expect(try blocks(editor.snapshot) == ["paragraph:前後"])
      #expect(editor.selectedRange == NSRange(location: 1, length: 0))
      #expect(editor.failure == nil)
    }

    @Test("文字の途中で入力とBackspaceを行うと絵文字を壊さずモデルへ反映する", arguments: lexicalModes)
    func typingAndEmojiDeletion(_ mode: String) throws {
      let fixture = try DocumentFixture(mode, source: "A👩🏽‍💻B")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      editor.selectedRange = NSRange(location: editor.text.utf16.count - 1, length: 0)
      editor.deleteBackward()
      #expect(editor.text == "AB")
      editor.insertText("日本語")
      #expect(editor.text == "A日本語B")
      #expect(try blocks(editor.snapshot) == ["paragraph:A日本語B"])
      #expect(editor.selectedRange == NSRange(location: 4, length: 0))
      #expect(editor.failure == nil)
    }

    @Test("文書先頭の引用でBackspaceを押すと段落へ戻す", arguments: lexicalModes)
    func quoteAtDocumentStart(_ mode: String) throws {
      let fixture = try DocumentFixture(mode, source: "> 引用")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      editor.selectedRange = NSRange(location: 0, length: 0)
      editor.deleteBackward()
      #expect(try blocks(editor.snapshot) == ["paragraph:引用"])
      #expect(editor.text == "引用")
      #expect(editor.failure == nil)
    }

    @Test("何も変えない貼り付けの後のUndoは直前の入力だけを戻し、それ以上は戻せない", arguments: lexicalModes)
    func undoAfterEmptyPaste(_ mode: String) throws {
      let fixture = try DocumentFixture(mode, source: "あいう")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      editor.selectedRange = NSRange(location: 3, length: 0)
      editor.insertText("え")
      fixture.pasteboard.items = []
      editor.paste(nil)
      #expect(editor.text == "あいうえ")
      let undoManager = try #require(editor.undoManager)
      undoManager.undo()
      #expect(editor.text == "あいう")
      #expect(!undoManager.canUndo)
      #expect(editor.failure == nil)
    }

    @Test("ブロックをまたいでコピーし別の段落の末尾へ貼り付けると段落とリスト項目の構造で入る", arguments: lexicalModes)
    func crossBlockCopyPaste(_ mode: String) throws {
      let fixture = try DocumentFixture(mode, source: "あいう\n\n- かきく\n\n末尾")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      editor.selectedRange = NSRange(location: 1, length: 5)
      editor.copy(nil)
      #expect(fixture.pasteboard.string == "いう\nかき")
      editor.selectedRange = NSRange(location: editor.text.utf16.count, length: 0)
      editor.paste(nil)
      #expect(
        try blocks(editor.snapshot) == ["paragraph:あいう", "- かきく", "paragraph:末尾いう", "- かき"])
      #expect(editor.text == "あいう\nかきく\n末尾いう\nかき")
      #expect(editor.failure == nil)
    }

    // Lexicalは貼り付けの最後がリストのとき、挿入位置の後ろの文字をリスト項目へ結合せず段落に残す。
    @Test("ブロックをまたいで切り取り同じ位置へ貼り付けると文字は失わず後ろの文字は段落として残る", arguments: lexicalModes)
    func crossBlockCut(_ mode: String) throws {
      let fixture = try DocumentFixture(mode, source: "あいう\n\n- かきく")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      editor.selectedRange = NSRange(location: 1, length: 5)
      editor.cut(nil)
      #expect(editor.text == "あく")
      #expect(try blocks(editor.snapshot) == ["paragraph:あく"])
      editor.paste(nil)
      #expect(try blocks(editor.snapshot) == ["paragraph:あいう", "- かき", "paragraph:く"])
      #expect(editor.text == "あいう\nかき\nく")
      #expect(editor.failure == nil)
    }

    @Test("ブロックをまたぐ削除をUIKitのUndoで戻しRedoで再び削除する", arguments: lexicalModes)
    func crossBlockUndo(_ mode: String) throws {
      let fixture = try DocumentFixture(mode, source: "あいう\n\n- かきく\n- さしす")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      editor.selectedRange = NSRange(location: 1, length: 5)
      editor.deleteBackward()
      let undoManager = try #require(editor.undoManager)
      #expect(undoManager.canUndo)
      undoManager.undo()
      #expect(editor.text == "あいう\nかきく\nさしす")
      #expect(try blocks(editor.snapshot) == ["paragraph:あいう", "- かきく", "- さしす"])
      #expect(undoManager.canRedo)
      undoManager.redo()
      #expect(editor.text == "あく\nさしす")
      #expect(try blocks(editor.snapshot) == ["paragraph:あく", "- さしす"])
      #expect(editor.failure == nil)
    }
  }
#endif
