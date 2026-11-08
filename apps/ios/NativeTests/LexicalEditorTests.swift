import Foundation
import Testing
import UIKit

@testable import EvameEditorPrototype

@MainActor
private final class LexicalFixture {
  let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
  let pasteboard = UIPasteboard.withUniqueName()
  let store: LocalStore
  let editor: LexicalTextView

  init(_ markdown: String) throws {
    let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    store = try LocalStore(directory: directory)
    editor = try LexicalTextView(
      document: LexicalDocument(), markdown: markdown, pasteboard: pasteboard,
      imageFile: store.imageFile)
    let controller = UIViewController()
    window.rootViewController = controller
    controller.view.addSubview(editor)
    editor.frame = CGRect(x: 0, y: 0, width: 390, height: 700)
    editor.overrideUserInterfaceStyle = .light
    editor.backgroundColor = .white
    window.makeKeyAndVisible()
    window.layoutIfNeeded()
    _ = editor.becomeFirstResponder()
  }

  var markdown: String { editor.snapshot.markdown.trimmingCharacters(in: .newlines) }

  /// 入力欄と同じ装飾付き文字列を、選択できない同じ大きさのUITextViewで描いて撮る。
  /// UIKitの選択範囲の表示は非同期に残るため、文字の描画だけを比べる。
  func pixels() -> Data {
    let mirror = UITextView(frame: editor.frame)
    mirror.isEditable = false
    mirror.isSelectable = false
    mirror.textContainerInset = editor.textContainerInset
    mirror.backgroundColor = .white
    mirror.overrideUserInterfaceStyle = .light
    mirror.attributedText = editor.attributedText
    window.addSubview(mirror)
    defer { mirror.removeFromSuperview() }
    mirror.layoutIfNeeded()
    return UIGraphicsImageRenderer(bounds: mirror.bounds).image {
      mirror.layer.render(in: $0.cgContext)
    }.pngData() ?? Data()
  }
}

@Suite(.serialized)
@MainActor
struct LexicalEditorTests {
  @Test("共通テスト文書を開くと見出し・リスト・表などを1つの入力欄に表示し、Markdownを保つ")
  func opensSampleDocument() throws {
    let url = try #require(Bundle.main.url(forResource: "round-trip", withExtension: "md"))
    let source = try String(contentsOf: url, encoding: .utf8)
    let fixture = try LexicalFixture(source)
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    #expect(editor.text.hasPrefix("日本語の執筆 👩🏽‍💻\n入力中の強調と斜体"))
    #expect(editor.snapshot.units.contains { $0.atomic?.type == "table" })
    #expect(editor.snapshot.units.contains { $0.block?.checked == true })
    // 表の列幅は書き出し時に揃えるため、セルの内容だけを確かめる。
    #expect(fixture.markdown.contains("| 日本語    | **100** |"))
    #expect(fixture.markdown.contains("[^note]: 脚注の内容。"))
    #expect(editor.failure == nil)
  }

  @Test("段落とリスト項目にまたがる選択をBackspaceで消すと、表示とMarkdownが同じ構造で結合する")
  func crossBlockDeletion() throws {
    let fixture = try LexicalFixture("あいう\n\n- かきく\n- さしす")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 1, length: 5)
    editor.deleteBackward()
    #expect(editor.text == "あく\nさしす")
    #expect(fixture.markdown == "あく\n\n* さしす" || fixture.markdown == "あく\n\n- さしす")
    #expect(editor.selectedRange == NSRange(location: 1, length: 0))
    #expect(editor.failure == nil)
  }

  @Test("引用やリストの先頭でBackspaceを押すと、文書の先頭でも段落へ戻し、段落の先頭では前の段落へ結合する")
  func backspaceAtBlockStart() throws {
    for (source, location, expected) in [
      ("本文\n\n> 引用", 3, "本文\n\n引用"), ("> 引用", 0, "引用"), ("- 項目", 0, "項目"),
      ("あ\n\nい", 2, "あい"),
    ] {
      let fixture = try LexicalFixture(source)
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      editor.selectedRange = NSRange(location: location, length: 0)
      editor.deleteBackward()
      #expect(fixture.markdown == expected, "\(source)")
      #expect(editor.failure == nil, "\(source)")
    }
  }

  @Test("表の部品を押すと、その表の編集画面を開く操作を呼ぶ")
  func tableButton() throws {
    let fixture = try LexicalFixture("本文\n\n| 名前 | 値 |\n| --- | --- |\n| a | b |")
    defer { fixture.window.isHidden = true }
    var tapped: Int?
    fixture.editor.onTableTap = { tapped = $0 }
    fixture.editor.layoutIfNeeded()
    var pending: [UIView] = [fixture.editor]
    var button: UIButton?
    while let view = pending.popLast() {
      if view.accessibilityIdentifier == "editor.table" { button = view as? UIButton }
      pending += view.subviews
    }
    try #require(button).sendActions(for: .touchUpInside)
    #expect(tapped == 1)
  }

  @Test("ブロックをまたぐ選択へ日本語を変換中はモデルを変えず、確定後に置き換える")
  func composition() throws {
    let fixture = try LexicalFixture("あいう\n\n- かきく")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    let loaded = fixture.markdown
    editor.selectedRange = NSRange(location: 1, length: 5)
    editor.setMarkedText("にほんご", selectedRange: NSRange(location: 4, length: 0))
    #expect(fixture.markdown == loaded)
    editor.setMarkedText("日本語", selectedRange: NSRange(location: 3, length: 0))
    editor.unmarkText()
    #expect(editor.text == "あ日本語く")
    #expect(fixture.markdown == "あ日本語く")
    #expect(editor.failure == nil)
  }

  @Test("リスト項目の末尾でReturnを押すと次の項目になり、空の項目でもう一度押すとリストを抜ける")
  func listReturn() throws {
    let fixture = try LexicalFixture("- 項目")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 2, length: 0)
    editor.insertText("\n")
    editor.insertText("次")
    #expect(editor.snapshot.units.map { $0.block?.type } == ["listitem", "listitem"])
    editor.insertText("\n")
    editor.insertText("\n")
    #expect(editor.snapshot.units.last?.block?.type == "paragraph")
    #expect(editor.failure == nil)
  }

  @Test("チェックボックスは項目の文字と完了状態を読み上げ、押すと完了状態が切り替わりMarkdownにも反映する")
  func checkbox() throws {
    let fixture = try LexicalFixture("- [ ] 牛乳")
    defer { fixture.window.isHidden = true }
    func box() throws -> UIButton {
      fixture.editor.layoutIfNeeded()
      var pending: [UIView] = [fixture.editor]
      while let view = pending.popLast() {
        if view.accessibilityIdentifier == "editor.checkbox", let button = view as? UIButton {
          return button
        }
        pending += view.subviews
      }
      throw CocoaError(.featureUnsupported)
    }
    #expect(try box().accessibilityLabel == "牛乳")
    #expect(try box().accessibilityValue == String(localized: "未完了"))
    try box().sendActions(for: .touchUpInside)
    #expect(fixture.markdown == "- [x] 牛乳")
    #expect(try box().accessibilityValue == String(localized: "完了"))
    #expect(fixture.editor.failure == nil)
  }

  @Test("太字・取消線・インラインコードを選択範囲に付けて外せる")
  func inlineFormats() throws {
    for (format, marker) in [("bold", "**"), ("strikethrough", "~~"), ("code", "`")] {
      let fixture = try LexicalFixture("本文")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      editor.selectedRange = NSRange(location: 0, length: 2)
      editor.format(format)
      #expect(fixture.markdown == "\(marker)本文\(marker)", "\(format)")
      #expect(editor.snapshot.formats.contains(format))
      editor.format(format)
      #expect(fixture.markdown == "本文", "\(format)")
      #expect(editor.failure == nil)
    }
  }

  @Test("太字を外した直後に空白を入力すると、空白の後ろへカーソルを置いて続けて入力できる")
  func spaceAfterFormatOff() throws {
    let fixture = try LexicalFixture("# 見出し\n\n後")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 3, length: 0)
    editor.insertText("\n")
    editor.format("bold")
    for character in "bold" { editor.insertText(String(character)) }
    editor.format("bold")
    editor.insertText(" ")
    #expect(editor.selectedRange == NSRange(location: 9, length: 0))
    editor.insertText("x")
    #expect(fixture.markdown == "# 見出し\n\n**bold** x\n\n後")
    // 空白の入力ではLexicalの更新が連鎖する。連鎖の回数の上限（100回）を超えて入力を続けられる。
    for _ in 0..<150 {
      editor.insertText(" ")
      editor.insertText("y")
    }
    #expect(fixture.markdown.hasSuffix(String(repeating: " y", count: 150) + "\n\n後"))
    #expect(editor.failure == nil)
  }

  @Test("Lexicalが操作を拒否しても途中の変更を残さず、拒否のたびに失敗を伝えて次の入力を正しく反映する")
  func failureRecovery() throws {
    let fixture = try LexicalFixture("| a |\n| - |\n| b |\n\n後")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    var failures = 0
    editor.onFailure = { failures += 1 }
    editor.setTableCell(unit: 0, row: 0, column: 5, markdown: "x")
    editor.setTableCell(unit: 0, row: 0, column: 5, markdown: "x")
    #expect(editor.failure != nil)
    #expect(failures == 2)
    editor.selectedRange = NSRange(location: 3, length: 0)
    editor.insertText("x")
    #expect(fixture.markdown == "| a |\n| - |\n| b |\n\n後x")
  }

  @Test("区切り線の直後の空段落でBackspaceを押すと区切り線を選択し、カーソルを文末へ飛ばさない")
  func backspaceAfterDecorator() throws {
    let fixture = try LexicalFixture("本文\n\n---\n\n後")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 4, length: 0)
    editor.insertText("\n")
    #expect(editor.snapshot.units.count == 4)
    editor.deleteBackward()
    #expect(editor.selectedRange == NSRange(location: 3, length: 1))
    let markdown = fixture.markdown
    #expect(markdown == "本文\n\n***\n\n後" || markdown == "本文\n\n---\n\n後")
    // PCと同じく、選択した区切り線は書式ボタン・文字・Returnの入力で置き換えず、もう一度のBackspaceで消す。
    editor.format("bold")
    #expect(editor.snapshot.nodeSelected)
    editor.insertText("x")
    editor.insertText("\n")
    #expect(fixture.markdown == markdown)
    editor.deleteBackward()
    #expect(fixture.markdown == "本文\n\n後")
    #expect(editor.failure == nil)
  }

  @Test("日本語の変換中は書式ボタンやUndoを使っても未確定の文字と文書を変えず、変換の開始を画面へ伝える")
  func compositionBlocksEditing() throws {
    let fixture = try LexicalFixture("本文")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 2, length: 0)
    editor.insertText("!")
    var changes = 0
    editor.onChange = { changes += 1 }
    editor.setMarkedText("にほ", selectedRange: NSRange(location: 2, length: 0))
    #expect(changes > 0)
    editor.format("bold")
    #expect(editor.undoManager?.canUndo == false)
    editor.undoManager?.undo()
    #expect(editor.markedTextRange != nil)
    #expect(editor.text == "本文!にほ")
    #expect(fixture.markdown == "本文!")
    editor.unmarkText()
    #expect(fixture.markdown == "本文!にほ")
    #expect(editor.undoManager?.canUndo == true)
  }

  @Test("絵文字を同じ先頭の符号を持つ別の絵文字へ置き換えても、文字を壊さない")
  func surrogateReplacement() throws {
    let fixture = try LexicalFixture("a👩b")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 1, length: 2)
    editor.insertText("👨")
    #expect(fixture.markdown == "a👨b")
    #expect(editor.failure == nil)
  }

  @Test("PCと同じく、行頭の---と空白で区切り線になり、URLを入力するとリンクになる")
  func inputShortcuts() throws {
    let fixture = try LexicalFixture("本文")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 2, length: 0)
    editor.insertText("\n")
    for character in "--- https://example.com " { editor.insertText(String(character)) }
    #expect(editor.snapshot.units.map { $0.atomic?.type } == [nil, "horizontalrule", nil])
    #expect(editor.snapshot.units.last?.runs?.first?.link == "https://example.com")
    #expect(editor.failure == nil)
  }

  @Test("Markdownを読み込んだ直後に文書の先頭へ入力した文字もUndoで戻せる")
  func undoFirstInputAfterLoad() throws {
    let fixture = try LexicalFixture("前の文書")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.load("# 新しい文書")
    editor.selectedRange = NSRange(location: 0, length: 0)
    editor.insertText("x")
    #expect(fixture.markdown == "# x新しい文書")
    #expect(editor.undoManager?.canUndo == true)
    editor.undoManager?.undo()
    #expect(fixture.markdown == "# 新しい文書")
  }

  @Test("空のチェック項目だけのリストもMarkdownから読み込み直すとチェック項目のまま入力できる")
  func loneEmptyCheckItemAfterReload() throws {
    let fixture = try LexicalFixture("本文")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 2, length: 0)
    editor.insertText("\n")
    editor.setBlock("check")
    #expect(editor.snapshot.units.last?.block?.checked == false)
    editor.load(editor.snapshot.markdown)
    #expect(editor.snapshot.units.last?.block?.checked == false)
    #expect(editor.text == "本文\n")
    editor.selectedRange = NSRange(location: 3, length: 0)
    editor.insertText("買い物")
    #expect(fixture.markdown == "本文\n\n- [ ] 買い物")
    #expect(editor.failure == nil)
  }

  @Test("再読み込みした空のチェック項目へ入力・Undo/Redo・Return・Backspaceができる")
  func emptyCheckItemAfterReload() throws {
    let fixture = try LexicalFixture("- [ ] 牛乳\n-")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    #expect(editor.snapshot.units.map { $0.block?.checked } == [false, false])
    editor.selectedRange = NSRange(location: 3, length: 0)
    editor.insertText("買い物")
    #expect(fixture.markdown == "- [ ] 牛乳\n- [ ] 買い物")
    editor.undoManager?.undo()
    #expect(fixture.markdown == "- [ ] 牛乳\n- [ ] &#x20;")
    editor.undoManager?.redo()
    #expect(fixture.markdown == "- [ ] 牛乳\n- [ ] 買い物")
    editor.selectedRange = NSRange(location: 6, length: 0)
    editor.insertText("\n")
    editor.insertText("\n")
    #expect(editor.snapshot.units.last?.block?.type == "paragraph")
    editor.deleteBackward()
    editor.insertText("!")
    #expect(fixture.markdown == "- [ ] 牛乳\n- [ ] 買い物!")
    #expect(editor.failure == nil)
  }

  @Test("日本語・英字と太字併用の斜体で描画が傾き、解除すると元に戻る")
  func italicRendering() throws {
    for source in ["日本語", "English", "**日本語**", "**English**"] {
      let fixture = try LexicalFixture(source)
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      let all = NSRange(location: 0, length: editor.text.utf16.count)
      let plain = fixture.pixels()
      editor.selectedRange = all
      editor.format("italic")
      #expect(editor.snapshot.formats.contains("italic"))
      #expect(fixture.pixels() != plain, "\(source)")
      editor.selectedRange = all
      editor.format("italic")
      #expect(fixture.pixels() == plain, "\(source)")
    }
  }

  @Test("見出し・リスト・引用・コードへ段落の種類を切り替え、もう一度押すと戻る")
  func blockTypes() throws {
    for (type, expected) in [
      ("h2", "## 本文"), ("bullet", "* 本文"), ("number", "1. 本文"), ("check", "* [ ] 本文"),
      ("quote", "> 本文"),
    ] {
      let fixture = try LexicalFixture("本文")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      editor.selectedRange = NSRange(location: 1, length: 0)
      editor.setBlock(type)
      #expect(
        fixture.markdown == expected
          || fixture.markdown == expected.replacingOccurrences(of: "* ", with: "- "), "\(type)")
      editor.setBlock(type)
      #expect(fixture.markdown == "本文", "\(type)")
      #expect(editor.failure == nil)
    }
  }

  @Test("選択した文字へリンクを付け、端末に保存した写真を挿入するとMarkdownの画像として表示する")
  func linkAndImage() throws {
    let fixture = try LexicalFixture("リンク先")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 0, length: 4)
    editor.setLink("https://example.com")
    #expect(fixture.markdown == "[リンク先](https://example.com)")
    editor.selectedRange = NSRange(location: 4, length: 0)
    let source = try fixture.store.saveImage(
      try #require(UIImage(systemName: "star")?.jpegData(compressionQuality: 0.8)))
    editor.insertImage(source: source, alt: "写真")
    #expect(fixture.markdown.contains("![写真](\(source))"))
    #expect(editor.attributedText.attribute(.attachment, at: 4, effectiveRange: nil) != nil)
    #expect(editor.failure == nil)
  }

  @Test("表のセルをMarkdownで編集すると書式を含めて表へ反映する")
  func tableCell() throws {
    let fixture = try LexicalFixture("| 名前 | 値 |\n| --- | ---: |\n| a | b |")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    #expect(editor.tableCells(0) == [["名前", "値"], ["a", "b"]])
    editor.setTableCell(unit: 0, row: 1, column: 1, markdown: "**太字**")
    #expect(fixture.markdown.contains("| a  | **太字** |") || fixture.markdown.contains("| a | **太字** |"))
    #expect(fixture.markdown.contains("---:"))
    #expect(editor.failure == nil)
  }

  @Test("書式の変更をUIKitのUndoで戻し、Redoで再び付ける")
  func undoRedo() throws {
    let fixture = try LexicalFixture("本文")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 0, length: 2)
    editor.format("bold")
    let undo = try #require(editor.undoManager)
    undo.undo()
    #expect(fixture.markdown == "本文")
    #expect(!undo.canUndo)
    undo.redo()
    #expect(fixture.markdown == "**本文**")
  }

  @Test("ブロックをまたいでコピーし、別の段落の末尾へ貼り付けると段落とリスト項目の構造で入る")
  func copyPaste() throws {
    let fixture = try LexicalFixture("あいう\n\n- かきく\n\n末尾")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 1, length: 5)
    editor.copy(nil)
    #expect(fixture.pasteboard.string == "いう\nかき")
    editor.selectedRange = NSRange(location: editor.text.utf16.count, length: 0)
    editor.paste(nil)
    #expect(editor.text == "あいう\nかきく\n末尾いう\nかき")
    #expect(editor.failure == nil)
  }

  @Test("Markdownの原文を取り込むと文書を置き換え、Undoで前の文書へ戻らない")
  func loadMarkdown() throws {
    let fixture = try LexicalFixture("前の文書")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 4, length: 0)
    editor.insertText("追記")
    editor.load("# 新しい文書")
    #expect(fixture.markdown == "# 新しい文書")
    #expect(editor.undoManager?.canUndo == false)
  }
}
