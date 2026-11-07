import Foundation
import Markdown

/// 編集した葉だけをCommonMark/GFMへ戻す。コンテナと未編集範囲は原文を使う。
public enum MarkdownSource {
  public enum EncodingError: Error { case unsupportedMarkup, multilineTableCell }

  public static func serialize(_ markup: any Markup) throws -> String {
    switch markup {
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
      // 最長の連続バッククォートより長いフェンスを選ぶ。
      let runs = code.code.ranges(of: /`+/).map { code.code[$0].count }
      let fence = String(repeating: "`", count: max(3, (runs.max() ?? 0) + 1))
      return fence + (code.language ?? "") + "\n" + code.code
        + (code.code.hasSuffix("\n") ? "" : "\n") + fence
    default: throw EncodingError.unsupportedMarkup
    }
  }

  private static func inlineChildren(_ markup: any Markup, inTable: Bool) throws -> String {
    try markup.children.map { try inline($0, inTable: inTable) }.joined()
  }

  private static func inline(_ markup: any Markup, inTable: Bool) throws -> String {
    switch markup {
    case let text as Markdown.Text:
      var escaped = ""
      for scalar in text.string.unicodeScalars {
        if (33...47).contains(scalar.value) || (58...64).contains(scalar.value)
          || (91...96).contains(scalar.value) || (123...126).contains(scalar.value)
        {
          escaped += "\\"
        }
        escaped.unicodeScalars.append(scalar)
      }
      // 行端の空白がインデントや意図しない改行にならないようにする。
      if escaped.hasPrefix(" ") { escaped = "&#32;" + escaped.dropFirst() }
      if escaped.hasSuffix(" ") { escaped = escaped.dropLast() + "&#32;" }
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
    case is Emphasis: return "*" + (try inlineChildren(markup, inTable: inTable)) + "*"
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
