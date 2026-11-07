import Markdown

extension MarkdownDocument {
  public enum BlockAction: Hashable {
    case heading(Int)
    case paragraph, bulletList, orderedList, checkList, quote, codeBlock, indent, outdent
  }

  public func blockActions(in index: Int, path: [Int]) -> (
    enabled: Set<BlockAction>, selected: Set<BlockAction>
  ) {
    guard blocks.indices.contains(index), blocks[index].kind == .editable,
      let node = blocks[index].markup.descendant(at: path),
      node is Paragraph || node is Heading || node is CodeBlock
    else { return ([], []) }
    let root = blocks[index].markup
    var enabled: Set<BlockAction> = [
      .paragraph, .bulletList, .orderedList, .checkList, .quote, .codeBlock,
    ]
    enabled.formUnion((1...6).map(BlockAction.heading))
    var selected = Set<BlockAction>()
    if let heading = node as? Heading { selected.insert(.heading(heading.level)) }
    if node is CodeBlock { selected.insert(.codeBlock) }
    for depth in 0..<path.count {
      let ancestor = root.descendant(at: Array(path.prefix(depth)))
      if ancestor is BlockQuote { selected.insert(.quote) }
      if let list = ancestor as? any ListItemContainer {
        selected.subtract([.bulletList, .orderedList, .checkList])
        selected.insert(
          list is OrderedList
            ? .orderedList
            : list.listItems.contains { $0.checkbox != nil } ? .checkList : .bulletList)
        enabled.insert(.outdent)
        if path[depth] > 0 { enabled.insert(.indent) } else { enabled.remove(.indent) }
      }
    }
    return (enabled, selected)
  }

  public func applying(_ action: BlockAction, in index: Int, path: [Int]) throws -> (
    document: Self, path: [Int]
  ) {
    let actions = blockActions(in: index, path: path)
    guard actions.enabled.contains(action),
      let node = blocks[index].markup.descendant(at: path)
    else { throw EditError.invalidBlock }
    let root = blocks[index].markup
    let listDepth = (0..<path.count).last {
      root.descendant(at: Array(path.prefix($0))) is any ListItemContainer
    }
    var target = path
    var targetPath = path
    let replacement: any Markup
    let inlines: [any InlineMarkup] =
      (node as? any InlineContainer).map { Array($0.inlineChildren) }
      ?? [Markdown.Text((node as? CodeBlock)?.code ?? "")]
    switch action {
    case .heading(let level):
      // ATX見出しの中の改行はスペースと同じ意味になる。
      func singleLine(_ markup: any Markup) -> any Markup {
        if markup is SoftBreak || markup is LineBreak { return Markdown.Text(" ") }
        if let text = markup as? Markdown.Text {
          return Markdown.Text(String(text.string.map { $0.isNewline ? Character(" ") : $0 }))
        }
        return markup.withUncheckedChildren(markup.children.map(singleLine))
      }
      let content =
        level > 2
        ? inlines.map { singleLine($0) as! any InlineMarkup } : inlines
      replacement =
        (node as? Heading)?.level == level ? Paragraph(inlines) : Heading(level: level, content)
    case .paragraph:
      replacement = Paragraph(inlines)
    case .codeBlock:
      replacement =
        node is CodeBlock
        ? Paragraph(inlines) : CodeBlock((node as? any PlainTextConvertibleMarkup)?.plainText ?? "")
    case .quote:
      if let depth = (0..<path.count).last(where: {
        root.descendant(at: Array(path.prefix($0))) is BlockQuote
      }),
        let quote = root.descendant(at: Array(path.prefix(depth))) as? BlockQuote
      {
        target = Array(path.prefix(depth))
        replacement = Document(quote.blockChildren)
      } else {
        replacement = BlockQuote(Paragraph(inlines))
        targetPath += [0]
      }
    case .bulletList, .orderedList, .checkList:
      if let depth = listDepth,
        let list = root.descendant(at: Array(path.prefix(depth))) as? any ListItemContainer
      {
        if actions.selected.contains(action) {
          return try applying(.outdent, in: index, path: path)
        }
        target = Array(path.prefix(depth))
        let items = list.listItems.map { item -> ListItem in
          var item = item
          item.checkbox = action == .checkList ? .unchecked : nil
          return item
        }
        replacement = action == .orderedList ? OrderedList(items) : UnorderedList(items)
      } else {
        let item = ListItem(checkbox: action == .checkList ? .unchecked : nil, Paragraph(inlines))
        replacement = action == .orderedList ? OrderedList([item]) : UnorderedList([item])
        targetPath += [0, 0]
      }
    case .indent, .outdent:
      guard let depth = listDepth,
        let list = root.descendant(at: Array(path.prefix(depth))) as? any ListItemContainer
      else { throw EditError.invalidBlock }
      let itemIndex = path[depth]
      let items = Array(list.listItems)
      let item = items[itemIndex]
      let tail = Array(path.dropFirst(depth + 1))
      target = Array(path.prefix(depth))
      if action == .indent {
        var siblings = items
        var previous = Array(items[itemIndex - 1].children)
        let nestedIndex: Int
        let nestedItemIndex: Int
        if let nested = previous.last as? any ListItemContainer,
          (nested is OrderedList) == (list is OrderedList)
        {
          nestedIndex = previous.count - 1
          nestedItemIndex = nested.childCount
          previous[nestedIndex] = nested.withUncheckedChildren(Array(nested.children) + [item])
        } else {
          nestedIndex = previous.count
          nestedItemIndex = 0
          previous.append(list is OrderedList ? OrderedList([item]) : UnorderedList([item]))
        }
        siblings[itemIndex - 1] = items[itemIndex - 1].withUncheckedChildren(previous) as! ListItem
        siblings.remove(at: itemIndex)
        replacement = list.withUncheckedChildren(siblings)
        targetPath = target + [itemIndex - 1, nestedIndex, nestedItemIndex] + tail
      } else if depth >= 2,
        let outer = root.descendant(at: Array(path.prefix(depth - 2))) as? any ListItemContainer
      {
        let parentIndex = path[depth - 2]
        let nestedIndex = path[depth - 1]
        var outerItems = Array(outer.children)
        var parentChildren = Array(outerItems[parentIndex].children)
        let before = Array(items.prefix(itemIndex))
        if before.isEmpty {
          parentChildren.remove(at: nestedIndex)
        } else {
          parentChildren[nestedIndex] = list.withUncheckedChildren(before)
        }
        outerItems[parentIndex] = outerItems[parentIndex].withUncheckedChildren(parentChildren)
        let after = Array(items.dropFirst(itemIndex + 1))
        let lifted =
          after.isEmpty
          ? item
          : item.withUncheckedChildren(Array(item.children) + [list.withUncheckedChildren(after)])
        outerItems.insert(lifted, at: parentIndex + 1)
        target = Array(path.prefix(depth - 2))
        replacement = outer.withUncheckedChildren(outerItems)
        targetPath = target + [parentIndex + 1] + tail
      } else {
        var parts = [any BlockMarkup]()
        if itemIndex > 0 {
          parts.append(
            list.withUncheckedChildren(items.prefix(itemIndex).map { $0 as any Markup })
              as! any BlockMarkup)
        }
        let offset = parts.count
        parts += item.blockChildren
        if itemIndex + 1 < items.count {
          var following = list.withUncheckedChildren(
            items.suffix(from: itemIndex + 1).map { $0 as any Markup })
          if var ordered = following as? OrderedList {
            ordered.startIndex += UInt(itemIndex + 1)
            following = ordered
          }
          parts.append(following as! any BlockMarkup)
        }
        replacement = Document(parts)
        targetPath = target + [offset + (tail.first ?? 0)] + tail.dropFirst()
      }
    }
    let changed = try root.replacingDescendant(at: target, with: replacement)
    let focus = replacementFocusPath(
      target: target, childPath: Array(targetPath.dropFirst(target.count)),
      splices: replacement is Document)
    return (try replacingStructure(in: index, with: changed), focus)
  }

  public func splittingBlock(
    in index: Int, path: [Int], before: [any InlineMarkup], after: [any InlineMarkup]
  ) throws -> (document: Self, path: [Int]) {
    guard blocks.indices.contains(index), let node = blocks[index].markup.descendant(at: path),
      node is Paragraph || node is Heading
    else { throw EditError.invalidBlock }
    let root = blocks[index].markup
    let parentPath = Array(path.dropLast())
    let beforeBlock: any BlockMarkup =
      (node as? Heading).map { Heading(level: $0.level, before) } ?? Paragraph(before)
    if !path.isEmpty, let item = root.descendant(at: parentPath) as? ListItem,
      let childIndex = path.last, parentPath.count > 0,
      let list = root.descendant(at: Array(parentPath.dropLast())) as? any ListItemContainer
    {
      if before.isEmpty && after.isEmpty {
        let cleared = try replacingInlines(in: index, path: path, with: [])
        return try cleared.applying(.outdent, in: index, path: path)
      }
      let children = Array(item.children)
      let first = item.withUncheckedChildren(
        Array(children.prefix(childIndex)) + [beforeBlock])
      let second = ListItem(
        checkbox: item.checkbox == nil ? nil : .unchecked,
        ([Paragraph(after)] + children.dropFirst(childIndex + 1)).map { $0 as! any BlockMarkup })
      var items = Array(list.children)
      let itemIndex = parentPath.last!
      items.replaceSubrange(itemIndex...itemIndex, with: [first, second])
      let listPath = Array(parentPath.dropLast())
      let changed = try root.replacingDescendant(
        at: listPath, with: list.withUncheckedChildren(items))
      return (try replacingStructure(in: index, with: changed), listPath + [itemIndex + 1, 0])
    }
    if before.isEmpty && after.isEmpty, !path.isEmpty,
      let quote = root.descendant(at: parentPath) as? BlockQuote, let childIndex = path.last
    {
      var parts = [any BlockMarkup]()
      let children = Array(quote.children)
      if childIndex > 0 {
        parts.append(BlockQuote(children.prefix(childIndex).map { $0 as! any BlockMarkup }))
      }
      let focus = parts.count
      parts.append(Paragraph())
      if childIndex + 1 < children.count {
        parts.append(BlockQuote(children.dropFirst(childIndex + 1).map { $0 as! any BlockMarkup }))
      }
      return try replacingBlock(
        in: index, path: parentPath, with: Document(parts), focusPath: [focus])
    }
    if node is Heading, before.isEmpty && after.isEmpty {
      return try replacingBlock(in: index, path: path, with: Paragraph(), focusPath: [])
    }
    return try replacingBlock(
      in: index, path: path, with: Document([beforeBlock, Paragraph(after)]), focusPath: [1])
  }
}

extension Markup {
  func descendant(at path: [Int]) -> (any Markup)? {
    var node: any Markup = self
    for index in path {
      guard index >= 0, let child = node.child(at: index) else { return nil }
      node = child
    }
    return node
  }

  func replacingDescendant(at path: [Int], with replacement: any Markup) throws -> any Markup {
    guard let index = path.first else { return replacement }
    guard index >= 0, let child = child(at: index) else {
      throw MarkdownDocument.EditError.invalidBlock
    }
    var children = Array(children)
    if path.count == 1, let forest = replacement as? Document {
      children.replaceSubrange(index...index, with: Array(forest.children))
    } else {
      children[index] = try child.replacingDescendant(
        at: Array(path.dropFirst()), with: replacement)
    }
    return withUncheckedChildren(children)
  }
}

func replacementFocusPath(target: [Int], childPath: [Int], splices: Bool) -> [Int] {
  guard splices, let index = target.last, let child = childPath.first else {
    return target + childPath
  }
  return Array(target.dropLast()) + [index + child] + childPath.dropFirst()
}
