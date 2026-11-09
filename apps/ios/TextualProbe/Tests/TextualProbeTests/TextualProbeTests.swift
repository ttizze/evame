import Foundation
import Textual
import XCTest

@MainActor
final class TextualProbeTests: XCTestCase {
  func test日本語と英字の太字と斜体がinline属性になる() throws {
    let attributedString = try AttributedStringMarkdownParser.markdown()
      .attributedString(for: "*日本語* **日本語太字** ***日本語併用*** _italic_ **bold** ***both***")

    XCTAssertEqual(String(attributedString.characters), "日本語 日本語太字 日本語併用 italic bold both")
    let expected = [
      "日本語": (bold: false, italic: true), "日本語太字": (bold: true, italic: false),
      "日本語併用": (bold: true, italic: true), "italic": (bold: false, italic: true),
      "bold": (bold: true, italic: false), "both": (bold: true, italic: true),
    ]
    for (text, flags) in expected {
      let run = try XCTUnwrap(
        attributedString.runs.first { String(attributedString[$0.range].characters) == text })
      XCTAssertEqual(run.inlinePresentationIntent?.contains(.stronglyEmphasized), flags.bold, text)
      XCTAssertEqual(run.inlinePresentationIntent?.contains(.emphasized), flags.italic, text)
    }
  }

  func test入れ子箇条書きがlistItem属性になる() throws {
    let attributedString = try AttributedStringMarkdownParser.markdown()
      .attributedString(for: "- 一つ\n- 二つ\n  - 入れ子")
    for (text, depth) in [("二つ", 1), ("入れ子", 2)] {
      let run = try XCTUnwrap(
        attributedString.runs.first { String(attributedString[$0.range].characters) == text })
      let kinds = try XCTUnwrap(run.presentationIntent).components.map(\.kind)
      XCTAssertEqual(
        kinds.filter { if case .unorderedList = $0 { true } else { false } }.count, depth)
      XCTAssertEqual(
        kinds.filter { if case .listItem = $0 { true } else { false } }.count, depth)
    }
  }

  func test番号付きリストが開始番号を保つ() throws {
    let attributedString = try AttributedStringMarkdownParser.markdown()
      .attributedString(for: "3. 三つ\n4. 四つ")
    let kinds = attributedString.runs
      .compactMap(\.presentationIntent)
      .flatMap(\.components)
      .map(\.kind)

    XCTAssertTrue(kinds.contains { if case .orderedList = $0 { true } else { false } })
    XCTAssertTrue(
      kinds.contains {
        if case .listItem(let ordinal) = $0 {
          ordinal == 3
        } else {
          false
        }
      })
  }

  func test表の列配置とセルがpresentationIntentになる() throws {
    let attributedString = try AttributedStringMarkdownParser.markdown()
      .attributedString(for: "| A | B |\n| --- | :---: |\n| 一 | 二 |")
    let intents = attributedString.runs.compactMap(\.presentationIntent)

    XCTAssertTrue(
      intents.contains {
        $0.components.contains {
          if case .table(let columns) = $0.kind {
            columns.map(\.alignment) == [.left, .center]
          } else {
            false
          }
        }
      })
    XCTAssertTrue(
      intents.contains {
        $0.components.contains { if case .tableCell = $0.kind { true } else { false } }
      })
  }

  func test参照リンクと画像URL属性を解析する() throws {
    let attributedString = try AttributedStringMarkdownParser.markdown()
      .attributedString(
        for: "[参照][id] ![画像](https://example.com/image.png)\n\n[id]: https://example.com"
      )

    XCTAssertEqual(String(attributedString.characters), "参照 画像")
    XCTAssertTrue(attributedString.runs.contains { $0.link == URL(string: "https://example.com") })
    XCTAssertTrue(
      attributedString.runs.contains { $0.imageURL == URL(string: "https://example.com/image.png") }
    )
  }

  func test見出しとコードブロック属性を解析する() throws {
    let attributedString = try AttributedStringMarkdownParser.markdown()
      .attributedString(for: "## 見出し\n\n```swift\nlet value = 1\n```")
    let kinds = attributedString.runs
      .compactMap(\.presentationIntent)
      .flatMap(\.components)
      .map(\.kind)

    XCTAssertTrue(kinds.contains { if case .header(level: 2) = $0 { true } else { false } })
    XCTAssertTrue(
      kinds.contains {
        if case .codeBlock(let languageHint) = $0 {
          languageHint == "swift"
        } else {
          false
        }
      })
  }

  func testタスク記法はチェック状態ではなく文字として残る() throws {
    let attributedString = try AttributedStringMarkdownParser.markdown()
      .attributedString(for: "- [ ] 未完了\n- [x] 完了\n\n~~取消線~~")

    let plainText = String(attributedString.characters)
    XCTAssertTrue(plainText.contains("[ ]"))
    XCTAssertTrue(plainText.contains("[x]"))
    XCTAssertTrue(
      attributedString.runs.compactMap(\.inlinePresentationIntent)
        .contains { $0.contains(.strikethrough) }
    )
  }

  func testエスケープした記号は文字として残る() throws {
    let attributedString = try AttributedStringMarkdownParser.markdown()
      .attributedString(for: #"\*文字としての記号\* \_そのまま\_"#)

    XCTAssertEqual(String(attributedString.characters), "*文字としての記号* _そのまま_")
  }
}
