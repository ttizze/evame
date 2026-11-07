import Foundation
import JavaScriptCore
import Markdown
import Synchronization

/// UIKitへ依存しないモデル変換。実行環境だけを排他制御して再利用し、文書や選択は保持しない。
enum EditorModel {
  enum Command: String { case backspace, indent, outdent }

  private static let contexts = Mutex<[String: JSContext]>([:])

  static func referenceDefinitions(in source: String) throws -> String {
    guard source.contains("]:") else { return "" }
    return try run("evameReferenceDefinitions", script: "MarkdownModel", input: source)
  }

  static func run(_ function: String, script: String, input: String) throws -> String {
    try contexts.withLock { contexts in
      let context: JSContext
      if let cached = contexts[script] {
        context = cached
      } else {
        guard let url = Bundle.module.url(forResource: script, withExtension: "js"),
          let created = JSContext()
        else { throw MarkdownDocument.EditError.invalidBlock }
        created.evaluateScript(try String(contentsOf: url, encoding: .utf8))
        guard created.exception == nil else { throw MarkdownDocument.EditError.invalidBlock }
        contexts[script] = created
        context = created
      }
      context.exception = nil
      guard
        let output = context.objectForKeyedSubscript(function)?.call(withArguments: [input])?
          .toString(),
        context.exception == nil
      else { throw MarkdownDocument.EditError.invalidBlock }
      return output
    }
  }

  static func applying(_ command: Command, to document: Document, path: [Int]) throws -> (
    markup: Document, path: [Int], before: [any InlineMarkup]
  )? {
    let input: [String: Any] = [
      "command": command.rawValue, "doc": try nodes(document, marks: [])[0], "path": path,
    ]
    let data = try JSONSerialization.data(withJSONObject: input)
    let json = String(decoding: data, as: UTF8.self)
    let output = try run("evameEditorCommand", script: "EditorModel", input: json)
    if output == "null" { return nil }
    guard let result = try JSONSerialization.jsonObject(with: Data(output.utf8)) as? [String: Any],
      let root = result["doc"] as? [String: Any], let path = result["path"] as? [Int],
      let prefix = result["before"] as? [[String: Any]],
      let document = try markup(root) as? Document
    else { throw MarkdownDocument.EditError.invalidBlock }
    return (document, path, try inlines(prefix))
  }

  private static func nodes(_ node: any Markup, marks: [[String: Any]]) throws -> [[String: Any]] {
    let type: String
    var attributes: [String: Any] = [:]
    var content: [[String: Any]] = []
    switch node {
    case let text as Markdown.Text:
      return text.string.isEmpty ? [] : [["type": "text", "text": text.string, "marks": marks]]
    case is Strong, is Emphasis, is Strikethrough, is Link, is InlineCode:
      var changed = marks
      let level =
        (marks.flatMap { ($0["attrs"] as? [String: Any])?["evameLevels"] as? [Int] ?? [] }.max()
          ?? -1) + 1
      attributes["evameLevels"] = [level]
      let name: String
      switch node {
      case is Strong: name = "strong"
      case is Emphasis: name = "em"
      case is Strikethrough: name = "strike"
      case let link as Link:
        name = "link"
        attributes["href"] = link.destination ?? ""
        attributes["title"] = link.title
      default: name = "code"
      }
      if name == "strong" || name == "em" {
        let index = changed.firstIndex { $0["type"] as? String == name }
        let previous =
          index.flatMap { changed[$0]["attrs"] as? [String: Any] }?["evameLevels"] as? [Int] ?? []
        let mark: [String: Any] = ["type": name, "attrs": ["evameLevels": previous + [level]]]
        if let index { changed[index] = mark } else { changed.append(mark) }
      } else {
        changed.append(["type": name, "attrs": attributes])
      }
      if let code = node as? InlineCode {
        return code.code.isEmpty ? [] : [["type": "text", "text": code.code, "marks": changed]]
      }
      return try node.children.flatMap { try nodes($0, marks: changed) }
    case is Markdown.Image, is Table:
      var result: [String: Any] = [
        "type": node is Table ? "table" : "image",
        "attrs": ["source": try MarkdownSource.serialize(node)],
      ]
      if node is Markdown.Image { result["marks"] = marks }
      return [result]
    case is SoftBreak, is LineBreak:
      type = "hard_break"
      attributes["soft"] = node is SoftBreak
    case let code as CodeBlock:
      type = "code_block"
      attributes["language"] = code.language
      content = code.code.isEmpty ? [] : [["type": "text", "text": code.code]]
    case is Document: type = "doc"
    case is Paragraph: type = "paragraph"
    case let heading as Heading:
      type = "heading"
      attributes["level"] = heading.level
    case is BlockQuote: type = "blockquote"
    case let list as OrderedList:
      type = "ordered_list"
      attributes["order"] = list.startIndex
    case is UnorderedList: type = "bullet_list"
    case let item as ListItem:
      type = "list_item"
      attributes["checkbox"] = item.checkbox.map { $0 == .checked ? "checked" : "unchecked" }
    case is ThematicBreak: type = "horizontal_rule"
    default: throw MarkdownDocument.EditError.invalidBlock
    }
    if !(node is CodeBlock) {
      content = try node.children.flatMap { try nodes($0, marks: []) }
    }
    var result: [String: Any] = ["type": type, "attrs": attributes, "content": content]
    if node is any InlineMarkup { result["marks"] = marks }
    return [result]
  }

  private static func inlines(_ values: [[String: Any]]) throws -> [any InlineMarkup] {
    let ordered = values.map { value in
      var value = value
      let layers = (value["marks"] as? [[String: Any]] ?? []).enumerated().flatMap { index, mark in
        let levels = (mark["attrs"] as? [String: Any])?["evameLevels"] as? [Int] ?? []
        return (levels.isEmpty ? [index] : levels).map { (level: $0, mark: mark) }
      }.sorted { $0.level < $1.level }
      value["marks"] = layers.map { layer in
        var mark = layer.mark
        var attributes = mark["attrs"] as? [String: Any] ?? [:]
        attributes.removeValue(forKey: "evameLevels")
        mark["attrs"] = attributes
        return mark
      }
      return value
    }
    var result = [any InlineMarkup]()
    var index = 0
    while index < ordered.count {
      guard let mark = (ordered[index]["marks"] as? [[String: Any]])?.first else {
        guard let inline = try markup(ordered[index]) as? any InlineMarkup else {
          throw MarkdownDocument.EditError.invalidBlock
        }
        result.append(inline)
        index += 1
        continue
      }
      // 内側の装飾が違っても、同じ外側のリンクや強調は一つの範囲として復元する。
      var group = [[String: Any]]()
      while index < ordered.count,
        let marks = ordered[index]["marks"] as? [[String: Any]], let first = marks.first,
        NSDictionary(dictionary: mark).isEqual(to: first)
      {
        var value = ordered[index]
        value["marks"] = Array(marks.dropFirst())
        group.append(value)
        index += 1
      }
      let content = try inlines(group)
      let attributes = mark["attrs"] as? [String: Any] ?? [:]
      switch mark["type"] as? String {
      case "em": result.append(Emphasis(content))
      case "strong": result.append(Strong(content))
      case "strike": result.append(Strikethrough(content))
      case "code": result.append(InlineCode(Paragraph(content).plainText))
      case "link":
        result.append(
          Link(
            destination: attributes["href"] as? String, title: attributes["title"] as? String,
            [Markdown.Text]()
          ).withUncheckedChildren(content) as! Link)
      default: throw MarkdownDocument.EditError.invalidBlock
      }
    }
    return result
  }

  private static func markup(_ value: [String: Any]) throws -> any Markup {
    let attributes = value["attrs"] as? [String: Any] ?? [:]
    let children = value["content"] as? [[String: Any]] ?? []
    switch value["type"] as? String {
    case "doc", "blockquote", "list_item":
      let blocks = try children.map { child -> any BlockMarkup in
        guard let block = try markup(child) as? any BlockMarkup else {
          throw MarkdownDocument.EditError.invalidBlock
        }
        return block
      }
      if value["type"] as? String == "doc" { return Document(blocks) }
      if value["type"] as? String == "blockquote" { return BlockQuote(blocks) }
      let checkbox = attributes["checkbox"] as? String
      return ListItem(checkbox: checkbox.map { $0 == "checked" ? .checked : .unchecked }, blocks)
    case "paragraph": return Paragraph(try inlines(children))
    case "heading": return Heading(level: attributes["level"] as? Int ?? 1, try inlines(children))
    case "code_block":
      let text = try Paragraph(inlines(children)).plainText
      return CodeBlock(language: attributes["language"] as? String, text)
    case "ordered_list", "bullet_list":
      let items = try children.map { child -> ListItem in
        guard let item = try markup(child) as? ListItem else {
          throw MarkdownDocument.EditError.invalidBlock
        }
        return item
      }
      if value["type"] as? String == "bullet_list" { return UnorderedList(items) }
      var list = OrderedList(items)
      list.startIndex = UInt(attributes["order"] as? Int ?? 1)
      return list
    case "horizontal_rule": return ThematicBreak()
    case "text": return Markdown.Text(value["text"] as? String ?? "")
    case "hard_break": return attributes["soft"] as? Bool == true ? SoftBreak() : LineBreak()
    case "image", "table":
      guard let source = attributes["source"] as? String,
        let block = Document(parsing: source, options: [.disableSmartOpts]).child(at: 0)
      else { throw MarkdownDocument.EditError.invalidBlock }
      if value["type"] as? String == "table", block is Table { return block }
      if value["type"] as? String == "image", let image = block.child(at: 0) as? Markdown.Image {
        return image
      }
      throw MarkdownDocument.EditError.invalidBlock
    default: throw MarkdownDocument.EditError.invalidBlock
    }
  }
}
