import Foundation
import Markdown
import Testing

private let lexicalReportDirectory =
  ProcessInfo.processInfo.environment["EVAME_LEXICAL_REPORT_DIR"] ?? NSTemporaryDirectory()
  + "evame-lexical-reports-\(UUID().uuidString)"

@Test("公式CommonMarkとGFMの全例を同じ入力から保存して比較する", arguments: lexicalModes)
func lexicalCorpus(_ mode: String) throws {
  #if SWIFT_PACKAGE
    let bundle = Bundle.module
  #else
    let bundle = Bundle(for: LexicalSession.self)
  #endif
  let session = try LexicalSession(mode)
  var results = [[String: Any]]()
  for name in ["commonmark-0.31.2", "gfm-0.29"] {
    let url = try #require(
      bundle.url(forResource: name, withExtension: "json", subdirectory: "Generated"))
    let cases = try #require(
      try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [[String: Any]])
    #expect(cases.count == (name.hasPrefix("commonmark") ? 652 : 677))
    for entry in cases {
      let source = try #require(entry["markdown"] as? String)
      var result: [String: Any] = [
        "corpus": name, "example": entry["example"]!, "source": source,
        "expectedHtml": entry["html"]!,
      ]
      do {
        let output = try session.request(["action": "load", "source": source])
        let markdown = try #require(output["markdown"] as? String)
        let original = tree(Document(parsing: source, options: [.disableSmartOpts]))
        let restored = tree(Document(parsing: markdown, options: [.disableSmartOpts]))
        let before = try JSONSerialization.data(withJSONObject: original, options: .sortedKeys)
        let after = try JSONSerialization.data(withJSONObject: restored, options: .sortedKeys)
        result["markdown"] = markdown
        result["astEqual"] = before == after
        if before != after {
          result["before"] = original
          result["after"] = restored
        }
      } catch {
        result["error"] = String(describing: error)
        result["astEqual"] = false
      }
      results.append(result)
    }
  }
  try FileManager.default.createDirectory(
    atPath: lexicalReportDirectory, withIntermediateDirectories: true)
  let url = URL(fileURLWithPath: lexicalReportDirectory).appendingPathComponent("\(mode).json")
  try JSONSerialization.data(withJSONObject: results, options: [.prettyPrinted, .sortedKeys]).write(
    to: url)
  let differences = results.filter { $0["astEqual"] as? Bool != true }
  print(
    "LEXICAL_CORPUS \(mode): \(results.count - differences.count)/\(results.count), report=\(url.path)"
  )
  #expect(differences.count == 0, "\(mode): \(differences.count)件の構造・内容の差。正規化と内容喪失の切り分けはレポートで行う")
}

private func tree(_ node: any Markup) -> [String: Any] {
  var attributes = [String: Any]()
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
    "children": node.children.filter { ($0 as? Markdown.Text)?.string != "" }.map(tree),
  ]
}
