import Foundation
import Markdown
import Testing

@testable import EditorCore

@Test("公式の全構文ケースを開いて各入力欄を保存しても本文と構造を失わない", arguments: ["commonmark-0.31.2", "gfm-0.29"])
func officialMarkdownCorpus(_ name: String) throws {
  let url = try #require(
    Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures/Upstream"))
  let data = try Data(contentsOf: url)
  let cases = try #require(try JSONSerialization.jsonObject(with: data) as? [[String: Any]])
  #expect(cases.count == (name.hasPrefix("commonmark") ? 652 : 677))
  for test in cases {
    let source = try #require(test["markdown"] as? String)
    let example = try #require(test["example"] as? Int)
    let document = MarkdownDocument(source: source)
    let expected = try JSONSerialization.data(
      withJSONObject: corpusTree(Document(parsing: source, options: [.disableSmartOpts])),
      options: .sortedKeys)
    #expect(document.source == source, "\(name) #\(example): 原文の保持")
    for (index, block) in document.blocks.enumerated() where block.kind != .preserved {
      var pending: [(any Markup, [Int])] = [(block.markup, [])]
      while let (node, path) = pending.popLast() {
        let inlines: [any InlineMarkup]
        switch node {
        case is Paragraph, is Heading, is Table.Cell:
          inlines = Array((node as! any InlineContainer).inlineChildren)
        case let code as CodeBlock:
          inlines = [Markdown.Text(code.code)]
        default:
          pending += node.children.enumerated().map { ($0.element, path + [$0.offset]) }
          continue
        }
        do {
          let changed = try document.replacingInlines(in: index, path: path, with: inlines)
          let parsed = Document(parsing: changed.source, options: [.disableSmartOpts])
          let actual = try JSONSerialization.data(
            withJSONObject: corpusTree(parsed), options: .sortedKeys)
          #expect(
            actual == expected,
            "\(name) #\(example), 入力欄 \(index):\(path), 出力: \(String(reflecting: changed.source)), 構造: \(parsed.debugDescription(options: []))"
          )
        } catch {
          Issue.record(error, "\(name) #\(example), 入力欄 \(index):\(path)")
        }
      }
    }
  }
}

// 空のTextは内容を持たないため除外し、ソース位置以外の本文・書式・URL・題名・一覧属性を比較する。
private func corpusTree(_ node: any Markup) -> [String: Any] {
  var attributes: [String: Any] = [:]
  switch node {
  case let text as Markdown.Text: attributes["text"] = text.string
  case let code as InlineCode: attributes["code"] = code.code
  case let code as CodeBlock:
    attributes["code"] = code.code
    attributes["language"] = code.language
  case let heading as Heading: attributes["level"] = heading.level
  case let link as Link:
    attributes["destination"] = link.destination
    attributes["title"] = link.title
  case let image as Markdown.Image:
    attributes["source"] = image.source
    attributes["title"] = image.title
  case let list as OrderedList: attributes["start"] = list.startIndex
  case let item as ListItem: attributes["checkbox"] = item.checkbox.map { String(describing: $0) }
  case let table as Table:
    attributes["alignments"] = table.columnAlignments.map { String(describing: $0) }
  case let html as HTMLBlock: attributes["html"] = html.rawHTML
  case let html as InlineHTML: attributes["html"] = html.rawHTML
  default: break
  }
  return [
    "type": String(describing: type(of: node)), "attributes": attributes,
    "children": node.children.filter { ($0 as? Markdown.Text)?.string != "" }.map(corpusTree),
  ]
}
