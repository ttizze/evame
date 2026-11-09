import Foundation
import Markdown

/// Swiftの構造をMDASTへ渡す。記法の生成はWebと同じライブラリが担う。
public enum MarkdownSource {
  public enum EncodingError: Error { case unsupportedMarkup, multilineTableCell }

  public static func serialize(_ markup: any Markup) throws -> String {
    let data = try JSONSerialization.data(withJSONObject: node(markup))
    return try EditorModel.run(
      "evameMarkdownSource", script: "MarkdownModel", input: String(decoding: data, as: UTF8.self))
  }

  private static func node(_ markup: any Markup) throws -> [String: Any] {
    var result: [String: Any]
    switch markup {
    case let text as Markdown.Text: return ["type": "text", "value": text.string]
    case let code as InlineCode: return ["type": "inlineCode", "value": code.code]
    case is SoftBreak: return ["type": "text", "value": "\n"]
    case is LineBreak: return ["type": "break"]
    case let code as CodeBlock:
      return [
        "type": "code",
        "value": code.code.hasSuffix("\n") ? String(code.code.dropLast()) : code.code,
        "lang": code.language as Any? ?? NSNull(),
      ]
    case is ThematicBreak: return ["type": "thematicBreak"]
    case let image as Markdown.Image:
      result = [
        "type": "image", "url": image.source ?? "", "title": image.title as Any? ?? NSNull(),
      ]
    case let link as Link:
      result = [
        "type": "link", "url": link.destination ?? "", "title": link.title as Any? ?? NSNull(),
      ]
    case let heading as Heading:
      if heading.level > 2, containsBreak(heading) { throw EncodingError.unsupportedMarkup }
      result = ["type": "heading", "depth": heading.level]
    case let table as Table:
      return [
        "type": "table",
        "align": table.columnAlignments.map { alignment -> Any in
          switch alignment {
          case .left: "left"
          case .right: "right"
          case .center: "center"
          default: NSNull()
          }
        },
        "children": try ([table.head as any Markup] + Array(table.body.children)).map(node),
      ]
    case is Table.Head, is Table.Row: result = ["type": "tableRow"]
    case is Table.Cell:
      if containsBreak(markup) { throw EncodingError.multilineTableCell }
      result = ["type": "tableCell"]
    case let list as OrderedList:
      result = ["type": "list", "ordered": true, "start": list.startIndex, "spread": false]
    case is UnorderedList: result = ["type": "list", "ordered": false, "spread": false]
    case let item as ListItem:
      result = [
        "type": "listItem", "spread": false,
        "checked": item.checkbox.map { $0 == .checked } as Any? ?? NSNull(),
      ]
    case is Document: result = ["type": "root"]
    case is Paragraph: result = ["type": "paragraph"]
    case is BlockQuote: result = ["type": "blockquote"]
    case is Strong: result = ["type": "strong"]
    case is Emphasis: result = ["type": "emphasis"]
    case is Strikethrough: result = ["type": "delete"]
    default: throw EncodingError.unsupportedMarkup
    }
    // 文書・引用の空段落を除き、隣接リストの分離を標準writerへ任せる。
    // リスト項目の段落は標準GFMのチェック状態の出力に必要なので残す。
    result["children"] = try markup.children.filter {
      !((markup is Document || markup is BlockQuote) && $0 is Paragraph && $0.childCount == 0)
    }.map(node)
    return result
  }

  private static func containsBreak(_ markup: any Markup) -> Bool {
    markup is SoftBreak || markup is LineBreak || markup.children.contains(where: containsBreak)
  }
}
