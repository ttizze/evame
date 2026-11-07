import Markdown
import UIKit

/// UIKitに選択・IME・Undoの所有権を残し、確定した入力だけを文書へ渡す。
@MainActor
final class NativeTextView: UITextView, UITextViewDelegate {
  private let baseFont: UIFont
  private let onChange: ([any InlineMarkup]) -> Void
  private let allowsLineBreaks: Bool
  private var committed: NSAttributedString

  init(
    markup: any Markup, font: UIFont, allowsLineBreaks: Bool,
    onChange: @escaping ([any InlineMarkup]) -> Void
  ) {
    baseFont = font
    self.onChange = onChange
    self.allowsLineBreaks = allowsLineBreaks
    committed = RichTextCodec.attributed(markup, font: font)
    super.init(frame: .zero, textContainer: nil)
    attributedText = committed
    delegate = self
    isScrollEnabled = false
    backgroundColor = .clear
    textContainerInset = UIEdgeInsets(top: 8, left: 0, bottom: 8, right: 0)
    adjustsFontForContentSizeCategory = true
    returnKeyType = allowsLineBreaks ? .default : .done
    accessibilityLabel = (markup as? PlainTextConvertibleMarkup)?.plainText
    typingAttributes = [.font: font, .foregroundColor: UIColor.label]
    let toolbar = UIToolbar()
    let done = UIBarButtonItem(
      systemItem: .done, primaryAction: UIAction { [weak self] _ in self?.resignFirstResponder() })
    done.accessibilityIdentifier = "editor.done"
    toolbar.items = [
      UIBarButtonItem(
        title: String(localized: "太字"),
        primaryAction: UIAction { [weak self] _ in self?.toggleStyle(.editorStrong) }),
      UIBarButtonItem(
        title: String(localized: "斜体"),
        primaryAction: UIAction { [weak self] _ in self?.toggleStyle(.editorEmphasis) }),
      UIBarButtonItem(
        title: String(localized: "取消線"),
        primaryAction: UIAction { [weak self] _ in self?.toggleStyle(.strikethroughStyle) }),
      .flexibleSpace(),
      UIBarButtonItem(
        image: UIImage(systemName: "arrow.uturn.backward"),
        primaryAction: UIAction { [weak self] _ in self?.undoManager?.undo() }),
      UIBarButtonItem(
        image: UIImage(systemName: "arrow.uturn.forward"),
        primaryAction: UIAction { [weak self] _ in self?.undoManager?.redo() }),
      done,
    ]
    toolbar.sizeToFit()
    inputAccessoryView = toolbar
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  override func unmarkText() {
    super.unmarkText()
    textViewDidChange(self)
  }

  func textViewDidChange(_ textView: UITextView) {
    invalidateIntrinsicContentSize()
    guard markedTextRange == nil, !attributedText.isEqual(to: committed) else { return }
    committed = NSAttributedString(attributedString: attributedText)
    onChange(RichTextCodec.inlines(committed))
  }

  func textView(
    _ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String
  ) -> Bool {
    if !allowsLineBreaks && text == "\n" {
      resignFirstResponder()
      return false
    }
    return allowsLineBreaks || !text.contains(where: \.isNewline)
  }

  func textViewDidChangeSelection(_ textView: UITextView) {
    // 画像や改行の属性が、その直後に入力した文字へ継承されるのを防ぐ。
    typingAttributes.removeValue(forKey: .editorImage)
    typingAttributes.removeValue(forKey: .attachment)
    typingAttributes.removeValue(forKey: .editorSoftBreak)
  }

  func toggleStyle(_ key: NSAttributedString.Key) {
    guard markedTextRange == nil else { return }
    let selection = selectedRange
    let current =
      selection.length == 0
      ? typingAttributes[key]
      : attributedText.attribute(key, at: selection.location, effectiveRange: nil)
    if selection.length == 0 {
      var attributes = typingAttributes
      if current == nil {
        attributes[key] = key == .strikethroughStyle ? 1 : true
      } else {
        attributes.removeValue(forKey: key)
      }
      let sample = NSMutableAttributedString(string: " ", attributes: attributes)
      typingAttributes = RichTextCodec.styled(sample, font: baseFont).attributes(
        at: 0, effectiveRange: nil)
      return
    }
    let changed = NSMutableAttributedString(attributedString: attributedText)
    if current == nil {
      changed.addAttribute(key, value: key == .strikethroughStyle ? 1 : true, range: selection)
    } else {
      changed.removeAttribute(key, range: selection)
    }
    replaceText(RichTextCodec.styled(changed, font: baseFont), selection: selection)
  }

  private func replaceText(_ text: NSAttributedString, selection: NSRange) {
    let previous = NSAttributedString(attributedString: attributedText)
    let previousSelection = selectedRange
    undoManager?.registerUndo(withTarget: self) { target in
      target.replaceText(previous, selection: previousSelection)
    }
    attributedText = text
    selectedRange = selection
    textViewDidChange(self)
  }
}
