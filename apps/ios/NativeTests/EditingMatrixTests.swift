import Foundation
import Markdown
import Testing
import UIKit

@testable import EvameEditorPrototype

private final class EditingFixtureBundle: NSObject {}
private let matrixData: Data = {
  let url = Bundle(for: EditingFixtureBundle.self).url(
    forResource: "matrix", withExtension: "json", subdirectory: "EditingFixtures")!
  return try! Data(contentsOf: url)
}()
private let matrixNames = (try! JSONSerialization.jsonObject(with: matrixData) as! [[String: Any]])
  .map { $0["name"] as! String }

private let projectionData = try! Data(
  contentsOf: Bundle(for: EditingFixtureBundle.self).url(
    forResource: "projection", withExtension: "json", subdirectory: "EditingFixtures")!)
private let projectionNames =
  (try! JSONSerialization.jsonObject(with: projectionData) as! [[String: Any]]).map {
    $0["name"] as! String
  }

private let paragraphEditData = try! Data(
  contentsOf: Bundle(for: EditingFixtureBundle.self).url(
    forResource: "paragraph-edits", withExtension: "json", subdirectory: "EditingFixtures")!)
private let paragraphEditNames =
  (try! JSONSerialization.jsonObject(with: paragraphEditData) as! [[String: Any]]).map {
    $0["name"] as! String
  }

@Suite(.serialized)
@MainActor
struct EditingMatrixTests {
  @Test(
    "リスト内の引用・コード・見出しへ入力しても書式メニューはPCと同じ種類を選択する",
    arguments: [
      ["- > 引用", "quote"], ["- ```\n  code\n  ```", "code"], ["> ## 見出し", "h2"],
    ])
  func currentBlockType(_ sample: [String]) throws {
    let fixture = try LexicalFixture(sample[0])
    defer { fixture.window.isHidden = true }
    fixture.editor.selectedRange = NSRange(location: 0, length: 0)
    fixture.editor.insertText("追")
    #expect(fixture.editor.snapshot.blockType == sample[1])
    #expect(fixture.editor.failure == nil)
  }

  @Test("複数段落のリスト項目で空行・入力位置・Undo/Redoと保存を保つ", arguments: paragraphEditNames)
  func paragraphEditing(_ name: String) throws {
    let rows = try JSONSerialization.jsonObject(with: paragraphEditData) as! [[String: Any]]
    let entry = try #require(rows.first { $0["name"] as? String == name })
    let fixture = try LexicalFixture("- 前半\n\n  中間\n\n  後半\n\n後の段落")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    let original = fixture.markdown
    let unit = entry["unit"] as! Int
    let action = entry["action"] as! String
    editor.selectedRange = NSRange(
      location: unit * 3 + (action == "enter" ? 2 : 0), length: action == "delete" ? 2 : 0)
    switch action {
    case "delete": editor.insertText("")
    case "enter": editor.insertText("\n")
    default: editor.deleteBackward()
    }
    let text = (entry["text"] as! [String]).map {
      $0.replacingOccurrences(of: "\n", with: "\u{2028}")
    }
    let caret = entry["caret"] as! [String: Int]
    let location =
      text.prefix(caret["unit"]!).reduce(0) { $0 + $1.utf16.count + 1 } + caret["offset"]!
    #expect(editor.text == text.joined(separator: "\n"))
    #expect(editor.selectedRange == NSRange(location: location, length: 0))
    let after = editor.text
    editor.undoManager?.undo()
    #expect(fixture.markdown == original)
    editor.undoManager?.redo()
    #expect(editor.text == after)
    #expect(editor.selectedRange.location == location)
    editor.insertText("追")
    let edited = editor.text!
    #expect((edited as NSString).substring(with: NSRange(location: location, length: 1)) == "追")
    editor.load(fixture.markdown)
    #expect(editor.text == edited)
    #expect(editor.failure == nil)
  }

  @Test("複数行の太字を一度で解除し、入力・Undo/Redoと保存・再読み込みでも保つ")
  func removeMultilineBold() throws {
    let fixture = try LexicalFixture("**a\nb**")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 0, length: 3)
    editor.format("bold")
    #expect(fixture.markdown == "a\nb")
    editor.undoManager?.undo()
    #expect(fixture.markdown == "**a\nb**")
    editor.undoManager?.redo()
    #expect(fixture.markdown == "a\nb")
    editor.load(fixture.markdown)
    #expect(fixture.markdown == "a\nb")
    #expect(editor.failure == nil)
  }

  @Test("空の脚注も段落から書き始め、保存・再読み込み・Undo/Redoで本文を保つ")
  func emptyFootnote() throws {
    let fixture = try LexicalFixture("[^note]:")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    #expect(editor.text.isEmpty)
    editor.insertText("注")
    #expect(editor.text == "注")
    #expect(fixture.markdown.hasPrefix("[^note]:"))
    #expect(fixture.markdown.contains("注"))
    editor.undoManager?.undo()
    #expect(editor.text.isEmpty)
    editor.undoManager?.redo()
    #expect(editor.text == "注")
    editor.load(fixture.markdown)
    #expect(editor.text == "注")
    #expect(editor.failure == nil)
  }

  @Test(
    "CR・LF・CRLFは1回の改行になり、Unicodeの区切り文字は入力して保存しても保持する",
    arguments: ["\r", "\n", "\r\n", "\u{2028}", "\u{2029}", "\u{85}"])
  func newlines(_ separator: String) throws {
    let fixture = try LexicalFixture("前後")
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    editor.selectedRange = NSRange(location: 1, length: 0)
    editor.insertText(separator)
    let expected = ["\r", "\n", "\r\n"].contains(separator) ? "前\n\n後" : "前" + separator + "後"
    #expect(fixture.markdown == expected)
    editor.undoManager?.undo()
    #expect(fixture.markdown == "前後")
    editor.undoManager?.redo()
    #expect(fixture.markdown == expected)
    editor.load(fixture.markdown)
    #expect(fixture.markdown == expected)
    #expect(editor.failure == nil)
  }

  @Test("リスト内の全段落を表示し、各段落の入力・Undoとチェック操作で内容を保つ", arguments: projectionNames)
  func projection(_ name: String) throws {
    let rows = try JSONSerialization.jsonObject(with: projectionData) as! [[String: Any]]
    let entry = try #require(rows.first { $0["name"] as? String == name })
    let fixture = try LexicalFixture(try #require(entry["markdown"] as? String))
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    let text = try #require(entry["text"] as? [String])
    let original = fixture.markdown
    #expect(editor.text == text.joined(separator: "\n"))
    for index in text.indices {
      let offset =
        text.prefix(index).reduce(0) { $0 + $1.utf16.count + 1 } + text[index].utf16.count
      editor.selectedRange = NSRange(location: offset, length: 0)
      editor.insertText("追")
      var expected = text
      expected[index] += "追"
      #expect(editor.text == expected.joined(separator: "\n"))
      editor.undoManager?.undo()
      #expect(editor.text == text.joined(separator: "\n"))
      #expect(fixture.markdown == original)
    }
    if name.hasPrefix("チェック") {
      editor.layoutIfNeeded()
      let button = try #require(
        editor.subviews.compactMap { $0 as? UIButton }.first {
          $0.accessibilityIdentifier == "editor.checkbox"
        })
      button.sendActions(for: .touchUpInside)
      #expect(fixture.markdown.contains("- [x]"))
      #expect(editor.text == text.joined(separator: "\n"))
      editor.undoManager?.undo()
      #expect(fixture.markdown == original)
    }
    #expect(editor.failure == nil)
  }

  @Test("各ブロックの位置と作成方法を総当たりし、入力・保存・Undo/Redoを確認する", arguments: matrixNames)
  func editing(_ name: String) throws {
    let rows = try JSONSerialization.jsonObject(with: matrixData) as! [[String: Any]]
    let entry = try #require(rows.first { $0["name"] as? String == name })
    let fixture = try LexicalFixture(try #require(entry["source"] as? String))
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    if let create = entry["create"] as? String { editor.setBlock(create) }
    if let input = entry["input"] as? String {
      for character in input + (entry["empty"] as? Bool == true ? "" : "甲乙丙") {
        editor.insertText(String(character))
      }
    }
    let unit = try #require(entry["unit"] as? Int)
    let location = editor.snapshot.units.prefix(unit).reduce(0) { length, item in
      length + (item.runs?.reduce(0) { $0 + (($1.text as NSString?)?.length ?? 1) } ?? 1) + 1
    }
    editor.selectedRange = NSRange(location: location + (entry["offset"] as! Int), length: 0)
    let beforeMarkdown = fixture.markdown
    let beforeText = editor.text
    let beforeSelection = editor.selectedRange
    let action = try #require(entry["action"] as? String)
    switch action {
    case "enter": editor.insertText("\n")
    case "backspace": editor.deleteBackward()
    case "block": editor.setBlock(try #require(entry["argument"] as? String))
    case "outdent": editor.indent(false)
    default: Issue.record("未知の操作 \(action)")
    }
    #expect(editor.failure == nil)
    let afterMarkdown = fixture.markdown
    let afterText = editor.text
    let afterSelection = editor.selectedRange
    if afterMarkdown != beforeMarkdown || afterText != beforeText {
      let undo = try #require(editor.undoManager)
      #expect(undo.canUndo)
      undo.undo()
      #expect(fixture.markdown == beforeMarkdown)
      #expect(editor.text == beforeText)
      let restoredSelection =
        action == "backspace" && (entry["offset"] as! Int) > 0
        ? NSRange(location: beforeSelection.location - 1, length: 1) : beforeSelection
      #expect(editor.selectedRange == restoredSelection)
      #expect(undo.canRedo)
      undo.redo()
      #expect(fixture.markdown == afterMarkdown)
      #expect(editor.text == afterText)
      #expect(editor.selectedRange == afterSelection)
    }
    if action == "enter" || entry["empty"] as? Bool == true { editor.insertText("追") }
    let expected = try #require(entry["expected"] as? String)
    // HTMLFormatter tests the meaning after saving, independent of marker style.
    #expect(HTMLFormatter.format(fixture.markdown) == HTMLFormatter.format(expected))
    let saved = fixture.markdown
    editor.load(saved)
    #expect(HTMLFormatter.format(fixture.markdown) == HTMLFormatter.format(expected))
    #expect(editor.failure == nil)
  }
}
