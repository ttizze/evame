import Foundation
import Markdown

/// 入力されたMarkdown記号だけを認識する。IMEや選択範囲の更新は入力欄が所有する。
public enum MarkdownInput {
  public static func inlineShortcut(in text: String, before caret: Int) -> (
    range: NSRange, markup: any InlineMarkup
  )? {
    guard caret > 0, caret <= text.utf16.count else { return nil }
    let prefix = (text as NSString).substring(to: caret)
    guard let last = prefix.last, "*_~`)".contains(last) else { return nil }
    let start =
      prefix.lastIndex(where: \.isNewline).map { prefix.index(after: $0) } ?? prefix.startIndex
    let line = prefix[start...]
    let lineOffset = prefix.utf16.count - line.utf16.count
    for index in line.indices where "*_~`[!".contains(line[index]) {
      let before = line[..<index]
      if "*_~`".contains(line[index]) && before.last == line[index] { continue }
      let slashes = before.reversed().prefix { $0 == "\\" }.count
      if slashes % 2 == 1
        || (line[index] == "_" && (before.last?.isLetter == true || before.last?.isNumber == true))
      {
        continue
      }
      let candidate = String(line[index...])
      guard
        let paragraph = Document(parsing: candidate, options: [.disableSmartOpts]).child(at: 0)
          as? Paragraph,
        paragraph.childCount == 1, let markup = paragraph.child(at: 0) as? any InlineMarkup,
        !(markup is Markdown.Text), !(markup is SoftBreak), !(markup is LineBreak)
      else { continue }
      return (
        NSRange(location: lineOffset + before.utf16.count, length: candidate.utf16.count), markup
      )
    }
    return nil
  }

  public static func blockPrefix(in text: String) -> Int? {
    let pattern =
      #"\A(?:#{1,6} |[-+*] \[[xX ]\] |\[[xX ]\] |[-+*] |[0-9]{1,9}[.)] |> |```[^\s`]*\n)"#
    guard let range = text.range(of: pattern, options: .regularExpression) else { return nil }
    return text[range].utf16.count
  }

  public static func block(prefix: String, inlines: [any InlineMarkup]) throws -> (
    markup: any Markup, path: [Int]
  ) {
    if prefix.hasPrefix("```") {
      let language = String(prefix.dropFirst(3)).trimmingCharacters(in: .whitespacesAndNewlines)
      return (
        CodeBlock(language: language.isEmpty ? nil : language, Paragraph(inlines).plainText), []
      )
    }
    let source =
      (prefix.hasPrefix("[") ? "- " : "") + prefix
      + (try MarkdownSource.serialize(Paragraph(inlines)))
    let parsed = Document(parsing: source, options: [.disableSmartOpts])
    guard parsed.childCount > 0 else {
      throw MarkdownDocument.EditError.invalidBlock
    }
    var root: any Markup = parsed.childCount == 1 ? parsed.child(at: 0)! : parsed
    var path = [Int]()
    var node: any Markup = root
    while !(node is Paragraph) && !(node is Heading) {
      if node.childCount == 0 {
        root =
          try root.replacingDescendant(at: path, with: node.withUncheckedChildren([Paragraph()]))
      }
      path.append(0)
      guard let child = root.descendant(at: path) else {
        throw MarkdownDocument.EditError.invalidBlock
      }
      node = child
    }
    return (root, path)
  }
}
