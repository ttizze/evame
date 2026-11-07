import Markdown

extension MarkdownDocument {
  public func backspacingBlock(in index: Int, path: [Int]) throws -> (
    document: Self, index: Int, path: [Int], before: [any InlineMarkup]
  )? {
    guard blocks.indices.contains(index), blocks[index].kind == .editable,
      let node = blocks[index].markup.descendant(at: path),
      node is Paragraph || node is Heading || node is CodeBlock
    else { return nil }
    if node is Heading || node is CodeBlock {
      let result = try applying(.paragraph, in: index, path: path)
      return (result.document, index, result.path, [])
    }
    let root = blocks[index].markup
    let parentPath = Array(path.dropLast())
    if path.last == 0, root.descendant(at: parentPath) is ListItem,
      parentPath.last == 0
    {
      let result = try applying(.outdent, in: index, path: path)
      return (result.document, index, result.path, [])
    }
    if path.last == 0, let quote = root.descendant(at: parentPath) as? BlockQuote {
      var parts: [any BlockMarkup] = [node as! any BlockMarkup]
      if quote.childCount > 1 {
        parts.append(BlockQuote(quote.blockChildren.dropFirst()))
      }
      let result = try replacingBlock(
        in: index, path: parentPath, with: Document(parts), focusPath: [0])
      return (result.document, index, result.path, [])
    }
    var roots = root is Document ? Array(root.children) : [root]
    var modelPath = root is Document ? path : [0] + path
    var targetIndex = index
    // 原文を保持した表やHTMLを越えず、直前の文書ブロックだけを演算対象へ含める。
    if path.allSatisfy({ $0 == 0 }), index > 0 {
      for previousIndex in (0..<index).reversed() {
        let block = blocks[previousIndex]
        if block.markup is Document && block.markup.childCount == 0 { continue }
        if block.kind == .editable {
          let previous = block.markup is Document ? Array(block.markup.children) : [block.markup]
          roots = previous + roots
          modelPath[0] += previous.count
          targetIndex = previousIndex
        }
        break
      }
    }
    let parts = try roots.map { node -> any BlockMarkup in
      guard let block = node as? any BlockMarkup else { throw EditError.invalidBlock }
      return block
    }
    guard let result = try EditorModel.backspace(Document(parts), path: modelPath) else {
      return nil
    }
    let single = result.markup.childCount == 1
    let replacement = single ? result.markup.child(at: 0)! : result.markup
    var changed = try replacingStructure(in: targetIndex, with: replacement)
    if targetIndex != index { changed = try changed.removingBlock(in: index) }
    return (
      changed, targetIndex, single ? Array(result.path.dropFirst()) : result.path, result.before
    )
  }
}
