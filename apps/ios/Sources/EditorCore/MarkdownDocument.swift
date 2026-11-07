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
  private var edits:
    [[Int]: (range: Range<Int>, source: String, markup: any Markup, definitions: String?)] = [:]

  public var source: String { applyingEdits(in: 0..<originalSource.utf8.count) }

  public var blocks: [Block] {
    originalBlocks.enumerated().map { index, block in
      Block(
        markup: updatedMarkup(block.markup, address: [index]), kind: block.kind,
        source: edits[[index]]?.source ?? applyingEdits(in: block.range), range: block.range)
    }
  }

  public init(source: String) {
    originalSource = source
    let bytes = Array(source.utf8)
    originalBlocks = Document(parsing: source, options: [.disableSmartOpts]).children.compactMap {
      markup in
      guard let sourceRange = markup.editableSourceRange,
        let contentRange = Self.byteRange(
          sourceRange, before: markup.followingSourceStart, bytes: bytes)
      else { return nil }
      let lineStart = bytes[..<contentRange.lowerBound].lastIndex(of: 10).map { $0 + 1 } ?? 0
      var range =
        (bytes[lineStart..<contentRange.lowerBound].allSatisfy { $0 == 32 || $0 == 9 }
          ? lineStart : contentRange.lowerBound)..<contentRange.upperBound
      // Setext見出しの範囲に取り込まれた先行リンク定義は、見出しの編集対象から外す。
      if markup is Heading {
        let source = String(decoding: bytes[range], as: UTF8.self)
        if source.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("[") {
          var prefixLength = 0
          for end in source.indices where source[end].isNewline {
            let prefix = String(source[...end])
            if Document(parsing: prefix, options: [.disableSmartOpts]).childCount == 0 {
              prefixLength = prefix.utf8.count
            }
          }
          range = (range.lowerBound + prefixLength)..<range.upperBound
        }
      }
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

  func replacingNode(in blockIndex: Int, path: [Int], with replacement: any Markup) throws
    -> Self
  {
    guard originalBlocks.indices.contains(blockIndex), originalBlocks[blockIndex].kind != .preserved
    else { throw EditError.invalidBlock }
    if let edit = edits[[blockIndex]] {
      let markup = try edit.markup.replacingDescendant(at: path, with: replacement)
      return try replacingStructure(in: blockIndex, with: markup)
    }
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
    if node is CodeBlock || (node is Table.Cell && node.range == nil) {
      let markup = try blocks[blockIndex].markup.replacingDescendant(at: path, with: replacement)
      return try replacingStructure(in: blockIndex, with: markup)
    }
    let bytes = Array(originalSource.utf8)
    guard let sourceRange = node.editableSourceRange,
      let nodeRange = Self.byteRange(sourceRange, before: node.followingSourceStart, bytes: bytes)
    else {
      throw EditError.invalidBlock
    }
    let range = path.isEmpty ? originalBlocks[blockIndex].range : nodeRange
    let raw = String(decoding: bytes[range], as: UTF8.self)
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
      content =
        String(raw.prefix { $0 == " " || $0 == "\t" }) + content
        + String(raw.reversed().prefix { $0 == " " || $0 == "\t" }.reversed())
    } else {
      content += String(raw.reversed().prefix { $0.isNewline }.reversed())
    }
    var changed = self
    changed.edits[[blockIndex] + path] = (range, content, replacement, nil)
    return changed
  }

  // 構造を変えたブロックのアドレスを固定し、空の項目も編集中は保持する。
  func replacingStructure(in index: Int, with markup: any Markup) throws -> Self {
    guard originalBlocks.indices.contains(index), originalBlocks[index].kind != .preserved else {
      throw EditError.invalidBlock
    }
    let trailingNewlines = String(
      originalBlocks[index].source.reversed().prefix { $0.isNewline }.reversed())
    let body = try MarkdownSource.serialize(markup)
    let definitions = try preservedDefinitions(in: index)
    let source = body + (definitions.isEmpty ? "" : "\n\n" + definitions) + trailingNewlines
    var changed = self
    changed.edits = edits.filter { $0.key.first != index }
    changed.edits[[index]] = (originalBlocks[index].range, source, markup, definitions)
    return changed
  }

  // 削除したルートも編集中は空のDocumentとして残し、他の入力欄のアドレスを変えない。
  func removingBlock(in index: Int) throws -> Self {
    guard originalBlocks.indices.contains(index), originalBlocks[index].kind == .editable else {
      throw EditError.invalidBlock
    }
    var lower = originalBlocks[index].range.lowerBound
    if index > 0 {
      let gap = Array(originalSource.utf8)[originalBlocks[index - 1].range.upperBound..<lower]
      if gap.allSatisfy({ [9, 10, 13, 32].contains($0) }) {
        lower = originalBlocks[index - 1].range.upperBound
      }
    }
    var changed = self
    let definitions = try preservedDefinitions(in: index)
    changed.edits = edits.filter { $0.key.first != index }
    changed.edits[[index]] = (
      lower..<originalBlocks[index].range.upperBound,
      definitions.isEmpty ? "" : "\n\n" + definitions, Document(), definitions
    )
    return changed
  }

  private func preservedDefinitions(in index: Int) throws -> String {
    if let definitions = edits[[index]]?.definitions { return definitions }
    return try EditorModel.referenceDefinitions(in: originalBlocks[index].source)
  }

  public func replacingBlock(in index: Int, path: [Int], with markup: any Markup, focusPath: [Int])
    throws
    -> (document: Self, path: [Int])
  {
    guard markup is any BlockMarkup || markup is Document else { throw EditError.invalidBlock }
    guard blocks.indices.contains(index) else { throw EditError.invalidBlock }
    let current = blocks[index].markup
    guard let target = current.descendant(at: path), target is any BlockMarkup || target is Document
    else {
      throw EditError.invalidBlock
    }
    if let list = markup as? UnorderedList, list.childCount == 1,
      let task = list.child(at: 0) as? ListItem, task.checkbox != nil, path.count >= 2,
      var item = current.descendant(at: Array(path.dropLast())) as? ListItem,
      let childIndex = path.last, let paragraph = task.child(at: 0)
    {
      var children = Array(item.children)
      children[childIndex] = paragraph
      item.checkbox = task.checkbox
      let root = try current.replacingDescendant(
        at: Array(path.dropLast()), with: item.withUncheckedChildren(children))
      return (try replacingStructure(in: index, with: root), path + focusPath.dropFirst(2))
    }
    let root = try current.replacingDescendant(at: path, with: markup)
    return (
      try replacingStructure(in: index, with: root),
      replacementFocusPath(target: path, childPath: focusPath, splices: markup is Document)
    )
  }

  public func replacingInlines(in index: Int, path: [Int], with inlines: [any InlineMarkup]) throws
    -> Self
  {
    guard blocks.indices.contains(index), let node = blocks[index].markup.descendant(at: path)
    else {
      throw EditError.invalidBlock
    }
    let replacement: any Markup
    switch node {
    case let heading as Heading: replacement = Heading(level: heading.level, inlines)
    case let code as CodeBlock:
      replacement = CodeBlock(language: code.language, Paragraph(inlines).plainText)
    case is Table.Cell: replacement = Table.Cell(inlines)
    case is Paragraph: replacement = Paragraph(inlines)
    default: throw EditError.invalidBlock
    }
    return try replacingNode(in: index, path: path, with: replacement)
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

  private static func byteRange(
    _ range: SourceRange, before boundary: SourceLocation?, bytes: [UInt8]
  ) -> Range<Int>? {
    var starts = [0]
    for (offset, byte) in bytes.enumerated() where byte == 10 { starts.append(offset + 1) }
    guard starts.indices.contains(range.lowerBound.line - 1),
      starts.indices.contains(range.upperBound.line - 1)
    else { return nil }
    let lower = starts[range.lowerBound.line - 1] + range.lowerBound.column - 1
    var upper = starts[range.upperBound.line - 1] + range.upperBound.column - 1
    if let boundary, starts.indices.contains(boundary.line - 1) {
      let column = boundary.line > range.lowerBound.line ? 0 : boundary.column - 1
      upper = min(upper, starts[boundary.line - 1] + column)
    }
    guard lower >= 0, upper >= lower, upper <= bytes.count else { return nil }
    return lower..<upper
  }
}

extension Markup {
  fileprivate var editableSourceRange: SourceRange? {
    guard let range else { return nil }
    if self is Heading, let content = child(at: 0)?.range,
      content.lowerBound.line > range.lowerBound.line
    {
      let start = SourceLocation(
        line: content.lowerBound.line, column: range.lowerBound.column,
        source: range.lowerBound.source)
      return start..<range.upperBound
    }
    return range
  }

  // Setext見出しなどでパーサーの終了位置が次の兄弟へ及んでも、読み込みと編集の両方で本文を保護する。
  fileprivate var followingSourceStart: SourceLocation? {
    var node: any Markup = self
    while let parent = node.parent {
      if let following = parent.child(at: node.indexInParent + 1) {
        return following.range?.lowerBound
      }
      node = parent
    }
    return nil
  }
}
