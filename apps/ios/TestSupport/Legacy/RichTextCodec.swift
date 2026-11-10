import CoreText
import EditorCore
import Markdown
import UIKit

extension NSAttributedString.Key {
  static let editorStrong = Self("evame.strong")
  static let editorEmphasis = Self("evame.emphasis")
  static let editorCode = Self("evame.code")
  static let editorLinkTitle = Self("evame.linkTitle")
  static let editorImage = Self("evame.image")
  static let editorSoftBreak = Self("evame.softBreak")
}

@MainActor
enum RichTextCodec {
  static func attributed(_ markup: any Markup, font: UIFont) -> NSAttributedString {
    let result = NSMutableAttributedString()
    func append(_ node: any Markup, attributes: [NSAttributedString.Key: Any]) {
      // 標準GFM writerの空チェック項目の埋め草は入力欄の文字にしない。原文は文書側に残す。
      if node.isEmptyTaskItemPlaceholder { return }
      var attributes = attributes
      switch node {
      case let text as Markdown.Text:
        result.append(NSAttributedString(string: text.string, attributes: attributes))
        return
      case let code as InlineCode:
        attributes[.editorCode] = true
        result.append(NSAttributedString(string: code.code, attributes: attributes))
        return
      case let image as Markdown.Image:
        let attachment = NSTextAttachment()
        attachment.image = UIImage(systemName: "photo")
        attachment.bounds = CGRect(x: 0, y: -4, width: 28, height: 28)
        let item = NSMutableAttributedString(attachment: attachment)
        item.addAttributes(
          attributes.merging([.editorImage: image]) { _, value in value },
          range: NSRange(location: 0, length: item.length))
        result.append(item)
        return
      case is SoftBreak:
        attributes[.editorSoftBreak] = true
        result.append(NSAttributedString(string: "\n", attributes: attributes))
        return
      case is LineBreak:
        result.append(NSAttributedString(string: "\n", attributes: attributes))
        return
      case is Strong: attributes[.editorStrong] = true
      case is Emphasis: attributes[.editorEmphasis] = true
      case is Strikethrough: attributes[.strikethroughStyle] = NSUnderlineStyle.single.rawValue
      case let link as Link:
        attributes[.link] = link.destination ?? ""
        if let title = link.title { attributes[.editorLinkTitle] = title }
      default: break
      }
      for child in node.children { append(child, attributes: attributes) }
    }
    append(markup, attributes: [.font: font, .foregroundColor: UIColor.label])
    return styled(result, font: font)
  }

  static func styled(_ text: NSAttributedString, font: UIFont) -> NSAttributedString {
    let styled = NSMutableAttributedString(attributedString: text)
    text.enumerateAttributes(in: NSRange(location: 0, length: text.length)) {
      attributes, range, _ in
      var traits = font.fontDescriptor.symbolicTraits
      if attributes[.editorStrong] as? Bool == true { traits.insert(.traitBold) }
      let styledFont: UIFont
      if attributes[.editorCode] as? Bool == true {
        styledFont = .monospacedSystemFont(ofSize: font.pointSize, weight: .regular)
      } else {
        styledFont = UIFont(
          descriptor: font.fontDescriptor.withSymbolicTraits(traits) ?? font.fontDescriptor,
          size: font.pointSize)
      }
      // italicの書体指定だけでは日本語の代替フォントが傾かないため、描画行列で傾ける。
      let displayFont =
        attributes[.editorEmphasis] as? Bool == true
        ? UIFont(
          descriptor: styledFont.fontDescriptor.withMatrix(
            CGAffineTransform(a: 1, b: 0, c: 0.2, d: 1, tx: 0, ty: 0)),
          size: font.pointSize)
        : styledFont
      styled.addAttribute(.font, value: displayFont, range: range)
    }
    return styled
  }

  static func formatAttributes(_ source: [NSAttributedString.Key: Any], font: UIFont)
    -> [NSAttributedString.Key: Any]
  {
    var attributes = source
    let sourceFont = source[.font] as? UIFont
    let traits = sourceFont?.fontDescriptor.symbolicTraits ?? []
    let base = font.fontDescriptor.symbolicTraits
    for (key, trait): (NSAttributedString.Key, UIFontDescriptor.SymbolicTraits) in [
      (.editorStrong, .traitBold), (.editorEmphasis, .traitItalic), (.editorCode, .traitMonoSpace),
    ] where traits.contains(trait) && !base.contains(trait) {
      attributes[key] = true
    }
    if let sourceFont {
      let matrix = CTFontGetMatrix(sourceFont)
      if matrix.b == 0, matrix.c != 0, matrix.c != CTFontGetMatrix(font).c {
        attributes[.editorEmphasis] = true
      }
    }
    return attributes
  }

  static func inlines(_ source: NSAttributedString, font: UIFont) -> [any InlineMarkup] {
    let text = NSMutableAttributedString(attributedString: source)
    source.enumerateAttributes(in: NSRange(location: 0, length: source.length)) {
      attributes, range, _ in
      text.addAttributes(formatAttributes(attributes, font: font), range: range)
    }
    let keys: [NSAttributedString.Key] = [
      .link, .editorStrong, .editorEmphasis, .strikethroughStyle, .editorCode,
    ]
    func read(_ range: NSRange, depth: Int) -> [any InlineMarkup] {
      guard range.length > 0 else { return [] }
      if depth < keys.count {
        var result: [any InlineMarkup] = []
        text.enumerateAttribute(keys[depth], in: range) { value, part, _ in
          guard value != nil, !(keys[depth] == .strikethroughStyle && (value as? Int) == 0) else {
            result += read(part, depth: depth + 1)
            return
          }
          if keys[depth] == .editorCode {
            result += read(part, depth: depth + 1).map {
              if let text = $0 as? Markdown.Text { return InlineCode(text.string) }
              return $0
            }
            return
          }
          if keys[depth] == .link {
            text.enumerateAttribute(.editorLinkTitle, in: part) { title, linkRange, _ in
              let destination = text.attribute(.link, at: linkRange.location, effectiveRange: nil)
              let link = Link(
                destination: (destination as? URL)?.absoluteString ?? (destination as? String)
                  ?? "",
                title: title as? String, [Markdown.Text]())
              result.append(link.withUncheckedChildren(read(linkRange, depth: depth + 1)) as! Link)
            }
            return
          }
          let children = read(part, depth: depth + 1)
          switch keys[depth] {
          case .editorStrong: result.append(Strong(children))
          case .editorEmphasis: result.append(Emphasis(children))
          case .strikethroughStyle: result.append(Strikethrough(children))
          default: break
          }
        }
        return result
      }
      var result: [any InlineMarkup] = []
      var pending = ""
      func flush() {
        if !pending.isEmpty {
          result.append(Markdown.Text(pending))
          pending = ""
        }
      }
      var offset = range.location
      for character in (text.string as NSString).substring(with: range) {
        if let image = text.attribute(.editorImage, at: offset, effectiveRange: nil)
          as? Markdown.Image
        {
          flush()
          result.append(image)
        } else if MarkdownInput.isLineEnding(character) {
          flush()
          result.append(
            text.attribute(.editorSoftBreak, at: offset, effectiveRange: nil) != nil
              ? SoftBreak() : LineBreak())
        } else {
          pending.append(character)
        }
        offset += character.utf16.count
      }
      flush()
      return result
    }
    return read(NSRange(location: 0, length: text.length), depth: 0)
  }
}
