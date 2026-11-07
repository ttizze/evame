import Foundation
import Markdown

/// Markdownだけを正本とし、変更しないブロックとブロック間の原文を保持する。
public struct MarkdownDocument {
  public enum Kind: Equatable {
    case editable, table, preserved
  }

  public struct Block {
    public let markup: any Markup
    public let kind: Kind
    public let source: String
    fileprivate let range: Range<Int>
  }

  public enum EditError: Error { case invalidBlock }

  private let originalSource: String
  private let originalBlocks: [Block]
  // 編集セッション中は元のアドレスを固定する。空になった段落にも再入力できる。
  private var edits: [[Int]: (range: Range<Int>, source: String, markup: any Markup)] = [:]

  public var source: String { applyingEdits(in: 0..<originalSource.utf8.count) }

  public var blocks: [Block] {
    originalBlocks.enumerated().map { index, block in
      Block(
        markup: updatedMarkup(block.markup, address: [index]), kind: block.kind,
        source: applyingEdits(in: block.range), range: block.range)
    }
  }

  public init(source: String) {
    originalSource = source
    let bytes = Array(source.utf8)
    originalBlocks = Document(parsing: source, options: [.disableSmartOpts]).children.compactMap {
      markup in
      guard let sourceRange = markup.range, let range = Self.byteRange(sourceRange, bytes: bytes)
      else { return nil }
      let raw = String(decoding: bytes[range], as: UTF8.self)
      let kind: Kind
      if raw.contains("[^") || !Self.canEdit(markup) {
        kind = .preserved
      } else if markup is Table {
        kind = .table
      } else {
        kind = .editable
      }
      return Block(markup: markup, kind: kind, source: raw, range: range)
    }
  }

  public func appending(_ block: String) -> Self {
    let source = self.source
    let separator =
      source.isEmpty || source.hasSuffix("\n\n") ? "" : source.hasSuffix("\n") ? "\n" : "\n\n"
    return Self(source: source + separator + block + "\n")
  }

  public func replacingNode(in blockIndex: Int, path: [Int], with replacement: any Markup) throws
    -> Self
  {
    guard originalBlocks.indices.contains(blockIndex), originalBlocks[blockIndex].kind != .preserved
    else { throw EditError.invalidBlock }
    var node = originalBlocks[blockIndex].markup
    for index in path {
      guard index >= 0, let child = node.child(at: index) else { throw EditError.invalidBlock }
      node = child
    }
    switch (node, replacement) {
    case (is Paragraph, is Paragraph), (is Heading, is Heading),
      (is CodeBlock, is CodeBlock), (is Table.Cell, is Table.Cell):
      break
    default: throw EditError.invalidBlock
    }
    let bytes = Array(originalSource.utf8)
    guard let sourceRange = node.range, let range = Self.byteRange(sourceRange, bytes: bytes) else {
      throw EditError.invalidBlock
    }
    var prefix = ""
    var ancestor = node.parent
    while let parent = ancestor {
      if parent is BlockQuote { prefix = "> " + prefix }
      if let item = parent as? ListItem {
        let width =
          (item.parent as? OrderedList).map {
            String($0.startIndex + UInt(item.indexInParent)).count + 2
          } ?? 2
        prefix = String(repeating: " ", count: width) + prefix
      }
      ancestor = parent.parent
    }
    var content = try MarkdownSource.serialize(replacement).replacingOccurrences(
      of: "\n", with: "\n" + prefix)
    if node is Table.Cell {
      let raw = String(decoding: bytes[range], as: UTF8.self)
      content =
        String(raw.prefix { $0 == " " || $0 == "\t" }) + content
        + String(raw.reversed().prefix { $0 == " " || $0 == "\t" }.reversed())
    }
    var changed = self
    changed.edits[[blockIndex] + path] = (range, content, replacement)
    return changed
  }

  private func applyingEdits(in range: Range<Int>) -> String {
    let bytes = Array(originalSource.utf8)
    var result = ""
    var cursor = range.lowerBound
    for edit in edits.values.sorted(by: { $0.range.lowerBound < $1.range.lowerBound })
    where edit.range.lowerBound >= range.lowerBound && edit.range.upperBound <= range.upperBound {
      result += String(decoding: bytes[cursor..<edit.range.lowerBound], as: UTF8.self) + edit.source
      cursor = edit.range.upperBound
    }
    return result + String(decoding: bytes[cursor..<range.upperBound], as: UTF8.self)
  }

  private func updatedMarkup(_ markup: any Markup, address: [Int]) -> any Markup {
    if let edit = edits[address] { return edit.markup }
    guard markup.childCount > 0 else { return markup }
    return markup.withUncheckedChildren(
      markup.children.enumerated().map { index, child in
        updatedMarkup(child, address: address + [index])
      })
  }

  private static func canEdit(_ markup: any Markup) -> Bool {
    switch markup {
    case is Paragraph, is Heading, is Strong, is Emphasis, is Strikethrough,
      is Markdown.Text, is SoftBreak, is LineBreak, is InlineCode, is Link,
      is Markdown.Image, is OrderedList, is UnorderedList, is ListItem,
      is BlockQuote, is CodeBlock, is Table, is Table.Head, is Table.Body,
      is Table.Row, is Table.Cell, is ThematicBreak:
      return markup.children.allSatisfy { canEdit($0) }
    default: return false
    }
  }

  private static func byteRange(_ range: SourceRange, bytes: [UInt8]) -> Range<Int>? {
    var starts = [0]
    for (offset, byte) in bytes.enumerated() where byte == 10 { starts.append(offset + 1) }
    guard starts.indices.contains(range.lowerBound.line - 1),
      starts.indices.contains(range.upperBound.line - 1)
    else { return nil }
    let lower = starts[range.lowerBound.line - 1] + range.lowerBound.column - 1
    let upper = starts[range.upperBound.line - 1] + range.upperBound.column - 1
    guard lower >= 0, upper >= lower, upper <= bytes.count else { return nil }
    return lower..<upper
  }
}
