import Foundation
import Markdown

/// 編集した構造をCommonMark/GFMへ戻す。未編集範囲は文書側で原文を使う。
public enum MarkdownSource {
  public enum EncodingError: Error { case unsupportedMarkup, multilineTableCell }

  public static func serialize(_ markup: any Markup) throws -> String {
    switch markup {
    case let document as Document:
      return try document.children.map(serialize).joined(separator: "\n\n")
    case let quote as BlockQuote:
      return try quote.children.map(serialize).joined(separator: "\n\n").components(
        separatedBy: "\n"
      ).map { "> " + $0 }.joined(separator: "\n")
    case let list as any ListItemContainer:
      return try list.listItems.enumerated().map { index, item in
        let marker = (list as? OrderedList).map { "\($0.startIndex + UInt(index)). " } ?? "- "
        let check = item.checkbox.map { $0 == .checked ? "[x] " : "[ ] " } ?? ""
        var body = ""
        for (offset, child) in item.children.enumerated() {
          if offset > 0 {
            // 1以外で始まる番号付きリストは、空行なしでは前の段落の続きになる。
            let continuesList =
              child is any ListItemContainer && ((child as? OrderedList)?.startIndex ?? 1) == 1
            body += continuesList ? "\n" : "\n\n"
          }
          body += try serialize(child)
        }
        return marker + check
          + body.replacingOccurrences(
            of: "\n", with: "\n" + String(repeating: " ", count: marker.count))
      }.joined(separator: "\n")
    case is ThematicBreak:
      return "---"
    case let table as Table:
      let rows = [Array(table.head.children)] + table.body.children.map { Array($0.children) }
      var lines = try rows.map { row in
        "| " + (try row.map { try inlineChildren($0, inTable: true) }.joined(separator: " | "))
          + " |"
      }
      lines.insert(
        "| "
          + table.columnAlignments.map { alignment in
            switch alignment {
            case .left: ":---"
            case .right: "---:"
            case .center: ":---:"
            default: "---"
            }
          }.joined(separator: " | ") + " |", at: 1)
      return lines.joined(separator: "\n")
    case let heading as Heading:
      let content = try inlineChildren(heading, inTable: false)
      if content.contains("\n") {
        guard heading.level <= 2,
          !heading.plainText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else {
          throw EncodingError.unsupportedMarkup
        }
        return content + "\n" + (heading.level == 1 ? "===" : "---")
      }
      return String(repeating: "#", count: heading.level) + " " + content
    case let paragraph as Paragraph:
      return try inlineChildren(paragraph, inTable: false)
    case let cell as Table.Cell:
      return try inlineChildren(cell, inTable: true)
    case let code as CodeBlock:
      // 情報文字列にバッククォートがある場合はチルダを使い、本文中の連続記号より長くする。
      let character = code.language?.contains("`") == true ? "~" : "`"
      let runs = code.code.ranges(of: character == "`" ? /`+/ : /~+/).map { code.code[$0].count }
      let fence = String(repeating: character, count: max(3, (runs.max() ?? 0) + 1))
      let language =
        code.language.map {
          " "
            + $0.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(
              of: "&", with: "&amp;")
        } ?? ""
      return fence + language + "\n" + code.code
        + (code.code.isEmpty || code.code.hasSuffix("\n") ? "" : "\n") + fence
    default: throw EncodingError.unsupportedMarkup
    }
  }

  private static func inlineChildren(_ markup: any Markup, inTable: Bool) throws -> String {
    var content = try markup.children.map { try inline($0, inTable: inTable) }.joined()
    if content.hasPrefix(" ") { content = "&#32;" + content.dropFirst() }
    if content.hasSuffix(" ") { content = content.dropLast() + "&#32;" }
    return content
  }

  private static func inline(_ markup: any Markup, inTable: Bool) throws -> String {
    switch markup {
    case let text as Markdown.Text:
      var escaped = ""
      for scalar in text.string.unicodeScalars {
        if [9, 10, 13].contains(scalar.value) {
          escaped += "&#\(scalar.value);"
          continue
        }
        if (33...47).contains(scalar.value) || (58...64).contains(scalar.value)
          || (91...96).contains(scalar.value) || (123...126).contains(scalar.value)
        {
          escaped += "\\"
        }
        escaped.unicodeScalars.append(scalar)
      }
      return escaped
    case let code as InlineCode:
      let runs = code.code.ranges(of: /`+/).map { code.code[$0].count }
      let fence = String(repeating: "`", count: (runs.max() ?? 0) + 1)
      let padding =
        code.code.hasPrefix("`") || code.code.hasSuffix("`")
          || (code.code.hasPrefix(" ") && code.code.hasSuffix(" ")
            && !code.code.allSatisfy { $0 == " " })
        ? " " : ""
      let content = inTable ? code.code.replacingOccurrences(of: "|", with: "\\|") : code.code
      return fence + padding + content + padding + fence
    case is Strong: return "**" + (try inlineChildren(markup, inTable: inTable)) + "**"
    case is Emphasis:
      var depth = 0
      var ancestor = markup.parent
      while ancestor is Emphasis {
        depth += 1
        ancestor = ancestor?.parent
      }
      let delimiter = depth.isMultiple(of: 2) ? "*" : "_"
      return delimiter + (try inlineChildren(markup, inTable: inTable)) + delimiter
    case is Strikethrough: return "~~" + (try inlineChildren(markup, inTable: inTable)) + "~~"
    case is SoftBreak, is LineBreak:
      if inTable { throw EncodingError.multilineTableCell }
      return markup is SoftBreak ? "\n" : "\\\n"
    case let link as Link:
      return "[" + (try inlineChildren(link, inTable: inTable)) + "]"
        + destination(link.destination ?? "", title: link.title, inTable: inTable)
    case let image as Markdown.Image:
      return "![" + (try inlineChildren(image, inTable: inTable)) + "]"
        + destination(image.source ?? "", title: image.title, inTable: inTable)
    default: throw EncodingError.unsupportedMarkup
    }
  }

  private static func destination(_ url: String, title: String?, inTable: Bool) -> String {
    var escaped = url.replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: "<", with: "\\<").replacingOccurrences(of: ">", with: "\\>")
      .replacingOccurrences(of: "\n", with: "%0A").replacingOccurrences(of: "\r", with: "%0D")
      .replacingOccurrences(of: "&", with: "&amp;")
    if inTable { escaped = escaped.replacingOccurrences(of: "|", with: "\\|") }
    let suffix =
      title.map {
        " \""
          + $0.replacingOccurrences(of: "\\", with: "\\\\")
          .replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "\"", with: "\\\"")
          .replacingOccurrences(of: "|", with: inTable ? "\\|" : "|") + "\""
      } ?? ""
    return "(<" + escaped + ">" + suffix + ")"
  }
}
