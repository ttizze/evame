import Foundation
import Testing
import UIKit

@testable import EvameEditorPrototype

@MainActor
final class LexicalFixture {
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
    #expect(editor.snapshot.units.contains { $0.listItems.last?.checked == true })
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
    #expect(editor.snapshot.units.map { $0.listItems.last?.depth } == [1, 1])
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
    #expect(editor.snapshot.units.last?.listItems.last?.checked == false)
    editor.load(editor.snapshot.markdown)
    #expect(editor.snapshot.units.last?.listItems.last?.checked == false)
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
    #expect(editor.snapshot.units.map { $0.listItems.last?.checked } == [false, false])
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
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    let photo = UIGraphicsImageRenderer(size: CGSize(width: 40, height: 30), format: format)
      .image { context in
        UIColor.red.setFill()
        context.fill(CGRect(x: 0, y: 0, width: 40, height: 30))
      }
    let source = try fixture.store.saveImage(try #require(photo.jpegData(compressionQuality: 0.8)))
    editor.insertImage(source: source, alt: "写真")
    #expect(fixture.markdown.contains("![写真](\(source))"))
    let shown = { (view: LexicalTextView) in
      (view.attributedText.attribute(.attachment, at: 4, effectiveRange: nil) as? NSTextAttachment)?
        .image?.size
    }
    #expect(shown(editor) == CGSize(width: 40, height: 30))
    // 保存した本文を開き直しても、写真をファイルから表示する。
    let reopened = try LexicalTextView(
      document: LexicalDocument(), markdown: editor.snapshot.markdown, pasteboard: fixture.pasteboard,
      imageFile: fixture.store.imageFile)
    #expect(shown(reopened) == CGSize(width: 40, height: 30))
    #expect(editor.failure == nil)
  }

  @Test("カーソルの位置にPCと同じ見出し行つきの3×3の表を入れる")
  func insertTable() throws {
    let fixture = try LexicalFixture("前の段落\n\n後の段落")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 4, length: 0)
    let unit = try #require(editor.insertTable())
    #expect(editor.snapshot.units.map { $0.atomic?.type } == [nil, "table", nil])
    #expect(unit == 1)
    #expect(editor.tableCells(unit).map(\.count) == [3, 3, 3])
    #expect(fixture.markdown.hasPrefix("前の段落\n\n|"))
    #expect(fixture.markdown.hasSuffix("|\n\n後の段落"))
    #expect(editor.failure == nil)
  }

  @Test("コードブロックはWebと同じく、行の幅いっぱいの濃い背景に明るい等幅の文字で表示する")
  func codeBlockLooks() throws {
    let fixture = try LexicalFixture("前\n\n```\nlet a = 1\nlet b = 2\n```\n\n後")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.layoutIfNeeded()
    var pending: [UIView] = [editor]
    var background: UIView?
    while let view = pending.popLast() {
      if view.accessibilityIdentifier == "editor.code-block" { background = view }
      pending += view.subviews
    }
    let block = try #require(background)
    #expect(block.frame.width > editor.bounds.width - 60)
    let start = try #require(editor.position(from: editor.beginningOfDocument, offset: 2))
    let end = try #require(editor.position(from: start, offset: 19))
    #expect(block.frame.minY <= editor.caretRect(for: start).minY)
    #expect(block.frame.maxY >= editor.caretRect(for: end).maxY)
    let color = try #require(
      editor.attributedText.attribute(.foregroundColor, at: 2, effectiveRange: nil) as? UIColor)
    var white: CGFloat = 0
    color.getWhite(&white, alpha: nil)
    #expect(white > 0.8)
    #expect(editor.attributedText.attribute(.backgroundColor, at: 2, effectiveRange: nil) == nil)
    editor.selectedRange = NSRange(location: 2, length: 0)
    editor.setBlock("paragraph")
    editor.layoutIfNeeded()
    #expect(!editor.subviews.contains { $0.accessibilityIdentifier == "editor.code-block" })
  }

  /// 本文の文字からブロックの先頭と末尾のカーソル位置を求め、各背景が上下に同じ余白で囲むことを確かめる。
  private func expectCodeBackgrounds(_ editor: LexicalTextView, phase: String) throws {
    editor.layoutIfNeeded()
    let backgrounds = editor.subviews.filter {
      $0.accessibilityIdentifier == "editor.code-block"
    }.sorted { $0.frame.minY < $1.frame.minY }
    try #require(backgrounds.count == 2)
    let separator = (editor.text as NSString).range(of: "\n間の段落\n")
    try #require(separator.location != NSNotFound)
    let ranges = [
      NSRange(location: 0, length: separator.location),
      NSRange(location: NSMaxRange(separator), length: editor.text.utf16.count - NSMaxRange(separator)),
    ]
    for (index, range) in ranges.enumerated() {
      let start = try #require(editor.position(from: editor.beginningOfDocument, offset: range.location))
      let end = try #require(editor.position(from: start, offset: range.length))
      let first = editor.caretRect(for: start)
      let last = editor.caretRect(for: end)
      #expect(abs(backgrounds[index].frame.minY - (first.minY - 8)) < 1,
        "\(phase)の\(index + 1)個目: 背景\(backgrounds[index].frame)、先頭\(first)")
      #expect(abs(backgrounds[index].frame.maxY - (last.maxY + 8)) < 1,
        "\(phase)の\(index + 1)個目: 背景\(backgrounds[index].frame)、末尾\(last)")
    }
  }

  @Test("2つのコードブロックの片方で改行を繰り返してスクロールしても、両方の背景が文字を囲む")
  func codeBlockBackgroundsFollowNewlines() throws {
    let fixture = try LexicalFixture("```\nfirst()\n```\n\n間の段落\n\n```\nsecond()\n```")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.frame.size.height = 220
    for label in ["first()", "second()"] {
      let range = (editor.text as NSString).range(of: label)
      editor.selectedRange = NSRange(location: NSMaxRange(range), length: 0)
      for step in 0..<25 {
        editor.insertText("line\(step)")
        editor.insertText("\n")
        editor.scrollRangeToVisible((editor.text as NSString).range(of: "second()"))
        try expectCodeBackgrounds(editor, phase: "\(label)で\(step + 1)回改行後")
      }
      editor.undoManager?.undo()
      try expectCodeBackgrounds(editor, phase: "改行のUndo後")
      editor.undoManager?.redo()
      try expectCodeBackgrounds(editor, phase: "改行のRedo後")
      let image = UIGraphicsImageRenderer(bounds: editor.bounds).image {
        editor.layer.render(in: $0.cgContext)
      }
      Attachment.record(image, named: "code-backgrounds-\(label)-newlines", as: .png)
    }
    #expect(editor.failure == nil)
  }

  @Test("コードブロックの空行で改行を続けて通常の段落へ抜けても、後のコード背景がずれない")
  func codeBlockBackgroundAfterLeavingCode() throws {
    let fixture = try LexicalFixture("```\nfirst()\n```\n\n間の段落\n\n```\nsecond()\n```")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.frame.size.height = 220
    editor.selectedRange = NSRange(location: 7, length: 0)
    for step in 0..<25 {
      editor.insertText("\n")
      editor.layoutIfNeeded()
      editor.scrollRangeToVisible((editor.text as NSString).range(of: "second()"))
      editor.layoutIfNeeded()
      let backgrounds = editor.subviews.filter {
        $0.accessibilityIdentifier == "editor.code-block"
      }.sorted { $0.frame.minY < $1.frame.minY }
      try #require(backgrounds.count == 2)
      let range = (editor.text as NSString).range(of: "second()")
      let start = try #require(editor.position(from: editor.beginningOfDocument, offset: range.location))
      #expect(abs(backgrounds[1].frame.minY - (editor.caretRect(for: start).minY - 8)) < 1,
        "\(step + 1)回改行後の後続コード背景")
    }
    #expect(fixture.markdown.hasPrefix("```\nfirst()\n```"))
    #expect(editor.failure == nil)
  }

  @Test("片方のコードブロックで変換中の文字が増減しても、両方の背景が文字を囲む",
    arguments: [String(repeating: "日本語のコメント", count: 12), "日本語\n次の行\nさらに次の行", "日"], [0, 7])
  func codeBlockBackgroundsWhileComposing(_ composition: String, selectionLength: Int) throws {
    for label in ["first()", "second()"] {
      let fixture = try LexicalFixture("```\nfirst()\n```\n\n間の段落\n\n```\nsecond()\n```")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      let original = editor.snapshot.markdown
      let range = (editor.text as NSString).range(of: label)
      editor.selectedRange = NSRange(location: NSMaxRange(range) - selectionLength, length: selectionLength)
      editor.setMarkedText(composition, selectedRange: NSRange(location: composition.utf16.count, length: 0))
      #expect(editor.snapshot.markdown == original)
      try expectCodeBackgrounds(editor, phase: "\(label)で変換中")
      if composition.count > 10, selectionLength == 0 {
        let image = UIGraphicsImageRenderer(bounds: editor.bounds).image {
          editor.layer.render(in: $0.cgContext)
        }
        Attachment.record(image, named: "code-backgrounds-\(label)-composing", as: .png)
      }
      editor.unmarkText()
      try expectCodeBackgrounds(editor, phase: "変換確定後")
      editor.undoManager?.undo()
      try expectCodeBackgrounds(editor, phase: "変換確定のUndo後")
      #expect(editor.snapshot.markdown == original)
      editor.undoManager?.redo()
      try expectCodeBackgrounds(editor, phase: "変換確定のRedo後")
      #expect(editor.failure == nil)
    }
  }

  @Test("本文をスクロールしても、チェックボックスは同じ部品のまま残る")
  func checkboxSurvivesScroll() throws {
    let paragraphs = (0..<60).map { "段落\($0)" }.joined(separator: "\n\n")
    let fixture = try LexicalFixture("- [ ] 項目\n\n\(paragraphs)")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.layoutIfNeeded()
    let checkbox = try #require(editor.subviews.first { $0.accessibilityIdentifier == "editor.checkbox" })
    editor.setContentOffset(CGPoint(x: 0, y: 200), animated: false)
    editor.layoutIfNeeded()
    #expect(editor.contentOffset.y == 200)
    #expect(editor.subviews.contains { $0 === checkbox })
  }

  /// 本文の文字の位置を探し、後続の引用線・リスト記号・表の部品がその文字に揃うことを確かめる。
  private func expectDecorationsFollowText(_ editor: LexicalTextView, phase: String) throws {
    editor.layoutIfNeeded()
    func range(of text: String) throws -> UITextRange {
      let found = (editor.text as NSString).range(of: text)
      try #require(found.location != NSNotFound)
      let start = try #require(editor.position(from: editor.beginningOfDocument, offset: found.location))
      let end = try #require(editor.position(from: start, offset: found.length))
      return try #require(editor.textRange(from: start, to: end))
    }
    let firstQuote = editor.caretRect(for: try range(of: "引用の一").start)
    let secondQuote = editor.caretRect(for: try range(of: "引用の二").start)
    let bars = editor.subviews.filter { $0.accessibilityIdentifier == "editor.quote-bar" }
      .sorted { $0.frame.minY < $1.frame.minY }
    try #require(bars.count == 2)
    #expect(abs(bars[0].frame.minY - firstQuote.minY) < 1, "\(phase)の1つ目の引用線の先頭")
    #expect(abs(bars[0].frame.maxY - secondQuote.minY) < 1, "\(phase)の1つ目の引用線の末尾")
    #expect(abs(bars[1].frame.minY - secondQuote.minY) < 1, "\(phase)の2つ目の引用線の先頭")
    let marker = try #require(editor.subviews.compactMap { $0 as? UILabel }.first { $0.text == "•" })
    #expect(abs(marker.frame.minY - editor.caretRect(for: try range(of: "項目").start).minY) < 1,
      "\(phase)のリスト記号")
    let table = try #require(editor.subviews.first { $0.accessibilityIdentifier == "editor.table" })
    #expect(abs(table.frame.minY - editor.firstRect(for: try range(of: "\u{FFFC}")).minY) < 1,
      "\(phase)の表")
  }

  @Test("前の段落で変換や選択の置換をしても、後続の引用線・リスト記号・表が文字に揃う",
    arguments: [String(repeating: "日本語のコメント", count: 12), "日本語\n次の行\nさらに次の行", "日"], [0, 1, 4])
  func decorationsFollowComposition(_ composition: String, selectionLength: Int) throws {
    let fixture = try LexicalFixture(
      "先頭\n\n次の段落\n\n> 引用の一\n>\n> 引用の二\n\n- 項目\n\n| a | b |\n| - | - |\n| c | d |")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    // 長さ4は先頭の段落から次の段落までまたぐ選択にする。
    editor.selectedRange = NSRange(location: 1, length: selectionLength)
    editor.setMarkedText(composition, selectedRange: NSRange(location: composition.utf16.count, length: 0))
    try expectDecorationsFollowText(editor, phase: "変換中")
    editor.unmarkText()
    try expectDecorationsFollowText(editor, phase: "変換確定後")
    editor.undoManager?.undo()
    try expectDecorationsFollowText(editor, phase: "変換確定のUndo後")
    #expect(editor.failure == nil)
  }

  @Test("引用の末尾で複数行になる文字を変換しても、引用線が変換中の文字の末尾まで届く",
    arguments: [String(repeating: "日本語のコメント", count: 12), "日本語\n次の行\nさらに次の行"])
  func quoteBarCoversComposition(_ composition: String) throws {
    let fixture = try LexicalFixture("> 引用")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: (editor.text as NSString).length, length: 0)
    editor.setMarkedText(composition, selectedRange: NSRange(location: composition.utf16.count, length: 0))
    editor.layoutIfNeeded()
    let marked = try #require(editor.markedTextRange)
    let bar = try #require(editor.subviews.first { $0.accessibilityIdentifier == "editor.quote-bar" })
    #expect(bar.frame.maxY >= editor.caretRect(for: marked.end).maxY)
  }

  @Test("表の直前で複数行の文字を変換しても、表の編集ボタンが表の位置に残る")
  func tableButtonStaysDuringComposition() throws {
    let fixture = try LexicalFixture("前\n\n| a | b |\n| - | - |\n| c | d |")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    let before = (editor.text as NSString).range(of: "\u{FFFC}")
    try #require(before.location != NSNotFound)
    editor.selectedRange = NSRange(location: before.location, length: 0)
    let composition = "日本語\n次の行"
    editor.setMarkedText(composition, selectedRange: NSRange(location: composition.utf16.count, length: 0))
    try #require(editor.markedTextRange != nil)
    editor.layoutIfNeeded()
    let found = (editor.text as NSString).range(of: "\u{FFFC}")
    let start = try #require(editor.position(from: editor.beginningOfDocument, offset: found.location))
    let end = try #require(editor.position(from: start, offset: found.length))
    let attachment = editor.firstRect(for: try #require(editor.textRange(from: start, to: end)))
    let table = try #require(editor.subviews.first { $0.accessibilityIdentifier == "editor.table" })
    #expect(abs(table.frame.minY - attachment.minY) < 1)
  }

  @Test("コードブロックで日本語を変換中に行が増えても、濃い背景が未確定の文字まで覆う")
  func codeBlockWhileComposing() throws {
    let fixture = try LexicalFixture("```\nlet a = 1\n```\n\n後")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 9, length: 0)
    editor.setMarkedText(
      String(repeating: "日本語のコメント", count: 6), selectedRange: NSRange(location: 0, length: 0))
    editor.layoutIfNeeded()
    var pending: [UIView] = [editor]
    var background: UIView?
    while let view = pending.popLast() {
      if view.accessibilityIdentifier == "editor.code-block" { background = view }
      pending += view.subviews
    }
    let marked = try #require(editor.markedTextRange)
    #expect(try #require(background).frame.maxY >= editor.caretRect(for: marked.end).maxY)
  }

  @Test("引用の中の段落の間も、次が見出しでも線を途切れさせない")
  func quoteBarContinues() throws {
    let fixture = try LexicalFixture("> ## 引用の見出し\n>\n> 見出しの後の段落\n\n後")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.layoutIfNeeded()
    var pending: [UIView] = [editor]
    var bars: [UIView] = []
    while let view = pending.popLast() {
      if view.accessibilityIdentifier == "editor.quote-bar" { bars.append(view) }
      pending += view.subviews
    }
    let sorted = bars.sorted { $0.frame.minY < $1.frame.minY }
    #expect(sorted.count == 2)
    #expect(sorted[0].frame.maxY >= sorted[1].frame.minY)
  }

  @Test("メニューや「> 」の入力で作った引用も、読み込んだ引用と同じ斜体と太い線で表示する")
  func createdQuoteLooks() throws {
    for create in ["menu", "shortcut"] {
      let fixture = try LexicalFixture("前\n\n引用文")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      if create == "menu" {
        editor.selectedRange = NSRange(location: 2, length: 0)
        editor.setBlock("quote")
      } else {
        editor.selectedRange = NSRange(location: 2, length: 0)
        editor.insertText(">")
        editor.insertText(" ")
      }
      editor.layoutIfNeeded()
      let start = editor.text.utf16.count - 3
      let font = try #require(
        editor.attributedText.attribute(.font, at: start, effectiveRange: nil) as? UIFont)
      #expect(
        font.fontDescriptor.fontAttributes[.init(rawValue: "NSCTFontMatrixAttribute")] != nil,
        "\(create)")
      var pending: [UIView] = [editor]
      var bar: UIView?
      while let view = pending.popLast() {
        if view.accessibilityIdentifier == "editor.quote-bar" { bar = view }
        pending += view.subviews
      }
      #expect(bar != nil, "\(create)")
      #expect(fixture.markdown == "前\n\n> 引用文", "\(create)")
    }
  }

  @Test("引用の中でReturnを押すと同じ引用に次の行を作り、空の行でもう一度押すと引用を抜ける")
  func quoteReturn() throws {
    for create in ["menu", "loaded"] {
      let fixture = try LexicalFixture(create == "menu" ? "引用文" : "> 引用文")
      defer { fixture.window.isHidden = true }
      let editor = fixture.editor
      if create == "menu" {
        editor.selectedRange = NSRange(location: 0, length: 0)
        editor.setBlock("quote")
      }
      editor.selectedRange = NSRange(location: 3, length: 0)
      editor.insertText("\n")
      editor.insertText("次の行")
      #expect(fixture.markdown == "> 引用文\n>\n> 次の行", "\(create)")
      #expect(editor.snapshot.units.map(\.context.quote) == [1, 1], "\(create)")
      editor.insertText("\n")
      editor.insertText("\n")
      editor.insertText("外")
      #expect(fixture.markdown == "> 引用文\n>\n> 次の行\n\n外", "\(create)")
      #expect(editor.failure == nil, "\(create)")
    }
  }

  @Test("Returnで行を足した引用も、メニューでもう一度引用を選ぶと入れ子にせず解除する")
  func unquoteAfterReturn() throws {
    let fixture = try LexicalFixture("引用文")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 0, length: 0)
    editor.setBlock("quote")
    editor.selectedRange = NSRange(location: 3, length: 0)
    editor.insertText("\n")
    editor.insertText("次の行")
    #expect(fixture.markdown == "> 引用文\n>\n> 次の行")
    editor.setBlock("quote")
    #expect(fixture.markdown == "引用文\n\n次の行")
    #expect(editor.snapshot.units.map(\.context.quote) == [0, 0])
    #expect(editor.failure == nil)
  }

  @Test("引用はWebと同じく、本文と同じ濃さの斜体の文字と太い線で表示する")
  func quoteLooks() throws {
    let fixture = try LexicalFixture("前\n\n> 引用文")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.layoutIfNeeded()
    let font = try #require(
      editor.attributedText.attribute(.font, at: 2, effectiveRange: nil) as? UIFont)
    // 傾きの行列はバイト列として入るため、属性があることで斜体を確かめる（通常の段落にはない）。
    #expect(
      font.fontDescriptor.fontAttributes[.init(rawValue: "NSCTFontMatrixAttribute")] != nil)
    #expect(
      editor.attributedText.attribute(.foregroundColor, at: 2, effectiveRange: nil) as? UIColor
        == .label)
    var pending: [UIView] = [editor]
    var bar: UIView?
    while let view = pending.popLast() {
      if view.accessibilityIdentifier == "editor.quote-bar" { bar = view }
      pending += view.subviews
    }
    #expect(try #require(bar).frame.width >= 4)
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
