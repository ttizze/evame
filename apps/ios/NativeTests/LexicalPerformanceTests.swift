import Foundation
import Testing
import UIKit

@testable import EvameEditorPrototype

@Suite(.serialized)
@MainActor
struct LexicalPerformanceTests {
  @Test("現在の入力欄で三百チェック項目・長い段落・画像リストの操作時間と内容を確認する", arguments: ["checklist", "paragraph", "images"])
  func representativeEditingLatency(_ scenario: String) throws {
    let source: String
    switch scenario {
    case "checklist": source = (0..<300).map { "- [ ] 項目\($0) 日本語の本文abc" }.joined(separator: "\n")
    case "images":
      source =
        "- 親\n" + (0..<30).map { "- 項目\($0) ![画像](assets/\($0).png)" }.joined(separator: "\n")
    default: source = String(repeating: "日本語と英字の本文abc。", count: 1000)
    }
    let fixture = try LexicalFixture(source)
    defer { fixture.window.isHidden = true }
    let editor = fixture.editor
    let initial = editor.snapshot.markdown
    let target = scenario == "checklist" ? 150 : scenario == "images" ? 1 : 0
    let text = editor.text as NSString
    let range =
      scenario == "checklist"
      ? text.range(of: "項目150 日本語の本文abc")
      : scenario == "images" ? text.range(of: "項目0") : NSRange(location: 0, length: text.length)
    editor.selectedRange = NSRange(location: NSMaxRange(range), length: 0)
    var milliseconds = [Double]()
    for _ in 0..<40 {
      let start = ContinuousClock.now
      if scenario == "images" {
        editor.indent(true)
        editor.indent(false)
      } else {
        editor.insertText("追")
        editor.textViewDidChange(editor)
      }
      let elapsed = start.duration(to: .now).components
      milliseconds.append(Double(elapsed.seconds) * 1000 + Double(elapsed.attoseconds) / 1e15)
    }
    if scenario == "images" {
      #expect(editor.snapshot.markdown == initial)
    } else {
      let expected = (source as NSString).replacingCharacters(
        in: NSRange(location: NSMaxRange(range), length: 0), with: String(repeating: "追", count: 40)
      )
      #expect(
        editor.snapshot.units[target].runs?.compactMap { $0.text }.joined().hasSuffix(
          String(repeating: "追", count: 40)) == true)
      let saved = editor.snapshot.markdown
      editor.load(saved)
      #expect(editor.snapshot.markdown == saved)
      if scenario == "paragraph" { #expect(editor.text == expected) }
      if scenario == "checklist" {
        #expect(editor.snapshot.units.count == 300)
        #expect(
          editor.snapshot.units.enumerated().allSatisfy { index, unit in
            unit.listItems.last?.checked == false
              && unit.runs?.compactMap { $0.text }.joined() == "項目\(index) 日本語の本文abc"
                + (index == 150 ? String(repeating: "追", count: 40) : "")
          })
      }
    }
    let sorted = milliseconds.sorted()
    let result: [String: Any] = [
      "scenario": scenario, "firstSampleMilliseconds": milliseconds[0],
      "medianMilliseconds": sorted[sorted.count / 2],
      "p95Milliseconds": sorted[Int(Double(sorted.count - 1) * 0.95)],
      "samplesMilliseconds": milliseconds,
    ]
    let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    Attachment.record(data, named: "lexical-\(scenario)-latency.json")
    print("LEXICAL_EDITING_LATENCY \(String(decoding: data, as: UTF8.self))")
  }
}
