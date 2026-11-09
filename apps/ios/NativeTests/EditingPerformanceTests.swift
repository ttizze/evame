import EditorCore
import Foundation
import Markdown
import Testing
import UIKit

@testable import EvameEditorPrototype

@MainActor
@Test("三百項目のチェックリストへ連続入力して対象だけを更新し応答時間を記録する")
func largeChecklistTypingLatency() throws {
  let values = (0..<300).map { "項目\($0) 日本語の本文abc" }
  var document = MarkdownDocument(source: values.map { "- [ ] \($0)\n" }.joined())
  let markup = try #require(document.blocks[0].markup.child(at: 150)?.child(at: 0))
  let editor = NativeTextView(
    markup: markup, font: .systemFont(ofSize: 17), allowsLineBreaks: true,
    allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { inlines in
      do { document = try document.replacingInlines(in: 0, path: [150, 0], with: inlines) } catch {
        Issue.record(error)
      }
    })
  editor.selectedRange = NSRange(location: editor.text.utf16.count, length: 0)
  var milliseconds = [Double]()
  for _ in 0..<40 {
    let start = ContinuousClock.now
    editor.insertText("追")
    editor.textViewDidChange(editor)
    let elapsed = start.duration(to: .now).components
    milliseconds.append(Double(elapsed.seconds) * 1000 + Double(elapsed.attoseconds) / 1e15)
  }
  var expected = values
  expected[150] += String(repeating: "追", count: 40)
  let list = try #require(Document(parsing: document.source).child(at: 0) as? UnorderedList)
  #expect(list.listItems.map { ($0.child(at: 0) as? Paragraph)?.plainText } == expected)
  #expect(list.listItems.allSatisfy { $0.checkbox == .unchecked })
  let sorted = milliseconds.sorted()
  let result: [String: Any] = [
    "scenario": "type-in-300-checklist-items", "firstSampleMilliseconds": milliseconds[0],
    "medianMilliseconds": sorted[sorted.count / 2],
    "p95Milliseconds": sorted[Int(Double(sorted.count - 1) * 0.95)],
    "samplesMilliseconds": milliseconds,
  ]
  let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
  Attachment.record(data, named: "checklist-latency.json")
  print("EDITING_LATENCY \(String(decoding: data, as: UTF8.self))")
}

@MainActor
@Test("長い段落への連続入力と画像の多いリストの字下げを内容を保持して処理する", arguments: [false, true])
func representativeEditingLatency(_ images: Bool) throws {
  let source =
    images
    ? "- 親\n" + (0..<30).map { "- 項目\($0) ![画像](assets/\($0).png)\n" }.joined()
    : String(repeating: "日本語と英字の本文abc。", count: 1000)
  var document = MarkdownDocument(source: source)
  let editor = NativeTextView(
    markup: document.blocks[0].markup, font: .systemFont(ofSize: 17),
    allowsLineBreaks: true, allowsInlineFormatting: true, onCommand: { _, _ in },
    onChange: { document = try! document.replacingInlines(in: 0, path: [], with: $0) })
  editor.selectedRange = NSRange(location: editor.text.utf16.count, length: 0)
  var milliseconds = [Double]()
  for _ in 0..<40 {
    let start = ContinuousClock.now
    if images {
      let indented = try document.applying(.indent, in: 0, path: [1, 0])
      document = try indented.document.applying(.outdent, in: 0, path: indented.path).document
    } else {
      editor.insertText("追")
      editor.textViewDidChange(editor)
    }
    let elapsed = start.duration(to: .now).components
    milliseconds.append(Double(elapsed.seconds) * 1000 + Double(elapsed.attoseconds) / 1e15)
  }
  if images {
    #expect(Document(parsing: document.source).format() == Document(parsing: source).format())
  } else {
    #expect(document.source == source + String(repeating: "追", count: 40))
  }
  let sorted = milliseconds.sorted()
  let result: [String: Any] = [
    "scenario": images ? "indent-outdent-30-images" : "type-\(source.utf16.count)-characters",
    "firstSampleMilliseconds": milliseconds[0], "medianMilliseconds": sorted[sorted.count / 2],
    "p95Milliseconds": sorted[Int(Double(sorted.count - 1) * 0.95)],
    "samplesMilliseconds": milliseconds,
  ]
  let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
  Attachment.record(data, named: images ? "list-latency.json" : "typing-latency.json")
  print("EDITING_LATENCY \(String(decoding: data, as: UTF8.self))")
}
