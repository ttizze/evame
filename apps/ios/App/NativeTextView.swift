import EditorCore
import Markdown
import UIKit
import UniformTypeIdentifiers

/// 選択・IME・UndoはUIKitに残し、確定した入力と操作結果を文書の所有者へ渡す。
@MainActor
final class NativeTextView: UITextView, UITextViewDelegate, UITextPasteDelegate {
  private var baseFont: UIFont
  private var onChange: ([any InlineMarkup]) -> Void
  private var onCommand: (NativeTextView, EditorKeyboardMenu.Command) -> Void
  private var allowsLineBreaks: Bool
  private var committed: NSAttributedString
  private var typingUpdate:
    (range: NSRange, text: String, attributes: [NSAttributedString.Key: Any], pending: Bool)?
  var blockActions:
    (enabled: Set<MarkdownDocument.BlockAction>, selected: Set<MarkdownDocument.BlockAction>) = (
      [], []
    )
  {
    didSet {
      returnKeyType = blockActions.enabled.isEmpty && !allowsLineBreaks ? .done : .default
      updateMenu()
    }
  }

  init(
    markup: any Markup, font: UIFont, allowsLineBreaks: Bool, allowsInlineFormatting: Bool,
    onCommand: @escaping (NativeTextView, EditorKeyboardMenu.Command) -> Void,
    onChange: @escaping ([any InlineMarkup]) -> Void
  ) {
    baseFont = font
    self.onChange = onChange
    self.onCommand = onCommand
    self.allowsLineBreaks = allowsLineBreaks
    committed = RichTextCodec.attributed(markup, font: font)
    super.init(frame: .zero, textContainer: nil)
    allowsEditingTextAttributes = allowsInlineFormatting
    attributedText = committed
    delegate = self
    pasteDelegate = self
    isScrollEnabled = false
    backgroundColor = .clear
    textContainerInset = UIEdgeInsets(top: 8, left: 0, bottom: 8, right: 0)
    adjustsFontForContentSizeCategory = true
    returnKeyType = allowsLineBreaks ? .default : .done
    accessibilityLabel =
      (markup.parent as? ListItem)?.checkbox != nil
      ? String(localized: "チェック項目") : (markup as? any PlainTextConvertibleMarkup)?.plainText
    typingAttributes = [.font: font, .foregroundColor: UIColor.label]
    inputAccessoryView = EditorKeyboardMenu { [weak self] command in self?.perform(command) }
    updateMenu()
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  override func copy(_ sender: Any?) {
    guard allowsEditingTextAttributes, selectedRange.length > 0 else {
      super.copy(sender)
      return
    }
    let selection = attributedText.attributedSubstring(from: selectedRange)
    let exported = NSMutableAttributedString(attributedString: selection)
    // RTFDは描画行列を保持しないため、書き出す値だけ標準の斜体書体へ戻す。
    selection.enumerateAttributes(in: NSRange(location: 0, length: selection.length)) {
      attributes, range, _ in
      guard
        RichTextCodec.formatAttributes(attributes, font: baseFont)[.editorEmphasis] as? Bool
          == true
      else { return }
      let font = attributes[.font] as? UIFont ?? baseFont
      let descriptor = font.fontDescriptor.withMatrix(.identity).withSymbolicTraits(
        font.fontDescriptor.symbolicTraits.union(.traitItalic))
      exported.addAttribute(
        .font,
        value: descriptor.map { UIFont(descriptor: $0, size: font.pointSize) }
          ?? UIFont.italicSystemFont(ofSize: font.pointSize), range: range)
    }
    guard
      let data = try? exported.data(
        from: NSRange(location: 0, length: exported.length),
        documentAttributes: [.documentType: NSAttributedString.DocumentType.rtfd])
    else {
      super.copy(sender)
      return
    }
    UIPasteboard.general.items = [
      [
        UTType.flatRTFD.identifier: data, UTType.utf8PlainText.identifier: selection.string,
      ]
    ]
  }

  override func cut(_ sender: Any?) {
    guard isEditable, markedTextRange == nil, selectedRange.length > 0,
      !containsImage(in: selectedRange)
    else { return }
    copy(sender)
    super.deleteBackward()
  }

  override func toggleItalics(_ sender: Any?) { toggleStyle(.editorEmphasis) }
  override func toggleBoldface(_ sender: Any?) { toggleStyle(.editorStrong) }

  override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
    if action == #selector(toggleUnderline(_:)) { return false }
    if action == #selector(cut(_:)), containsImage(in: selectedRange) { return false }
    return super.canPerformAction(action, withSender: sender)
  }

  func textPasteConfigurationSupporting(
    _ textPasteConfigurationSupporting: any UITextPasteConfigurationSupporting,
    performPasteOf attributedString: NSAttributedString, to textRange: UITextRange
  ) -> UITextRange {
    guard markedTextRange == nil, attributedString.length > 0,
      allowsLineBreaks || !attributedString.string.contains(where: MarkdownInput.isLineEnding)
    else { return textRange }
    let input = NSMutableAttributedString(attributedString: attributedString)
    let text = attributedString.string as NSString
    for index in (0..<attributedString.length).reversed() {
      if text.character(at: index) == 0xFFFC,
        attributedString.attribute(.attachment, at: index, effectiveRange: nil) != nil,
        attributedString.attribute(.editorImage, at: index, effectiveRange: nil) == nil
      {
        input.deleteCharacters(in: NSRange(location: index, length: 1))
      }
    }
    guard input.length > 0 else { return textRange }
    // システムが読み込んだ書式をMarkdownへ戻し、入力欄と同じ表示へ揃えて挿入する。
    let replacement = RichTextCodec.attributed(
      Paragraph(
        allowsEditingTextAttributes
          ? RichTextCodec.inlines(input, font: baseFont)
          : [Markdown.Text(input.string)]), font: baseFont)
    let range = NSRange(
      location: offset(from: beginningOfDocument, to: textRange.start),
      length: offset(from: textRange.start, to: textRange.end))
    let changed = NSMutableAttributedString(attributedString: attributedText)
    changed.replaceCharacters(in: range, with: replacement)
    typingUpdate = nil
    replaceText(
      changed, selection: NSRange(location: range.location + replacement.length, length: 0))
    return selectedTextRange ?? textRange
  }

  override func deleteBackward() {
    if markedTextRange == nil, selectedRange == NSRange(location: 0, length: 0),
      !blockActions.enabled.isEmpty
    {
      onCommand(self, .backspace)
      return
    }
    super.deleteBackward()
  }

  func rebind(
    markup: any Markup, font: UIFont, allowsLineBreaks: Bool, allowsInlineFormatting: Bool,
    selection: NSRange,
    onCommand: @escaping (NativeTextView, EditorKeyboardMenu.Command) -> Void,
    onChange: @escaping ([any InlineMarkup]) -> Void
  ) {
    typingUpdate = nil
    baseFont = font
    self.allowsLineBreaks = allowsLineBreaks
    allowsEditingTextAttributes = allowsInlineFormatting
    self.onCommand = onCommand
    self.onChange = onChange
    committed = RichTextCodec.attributed(markup, font: font)
    attributedText = committed
    let location = min(selection.location, committed.length)
    selectedRange = NSRange(
      location: location, length: min(selection.length, committed.length - location))
    typingAttributes = [.font: font, .foregroundColor: UIColor.label]
    returnKeyType = allowsLineBreaks ? .default : .done
    accessibilityLabel =
      (markup.parent as? ListItem)?.checkbox != nil
      ? String(localized: "チェック項目") : (markup as? any PlainTextConvertibleMarkup)?.plainText
    invalidateIntrinsicContentSize()
    updateMenu()
  }

  override func unmarkText() {
    if let marked = markedTextRange {
      let range = NSRange(
        location: offset(from: beginningOfDocument, to: marked.start),
        length: offset(from: marked.start, to: marked.end))
      typingUpdate = (
        range, (text as NSString).substring(with: range),
        typingUpdate?.attributes ?? typingAttributes, true
      )
    }
    super.unmarkText()
    textViewDidChange(self)
  }

  func textViewDidChange(_ textView: UITextView) {
    invalidateIntrinsicContentSize()
    updateMenu()
    guard markedTextRange == nil else { return }
    if let update = typingUpdate, update.pending {
      if NSMaxRange(update.range) <= attributedText.length,
        (text as NSString).substring(with: update.range) == update.text
      {
        typingUpdate = (update.range, update.text, update.attributes, false)
        textStorage.addAttributes(update.attributes, range: update.range)
        typingAttributes = update.attributes
      } else {
        typingUpdate = nil
      }
    }
    guard !attributedText.isEqual(to: committed) else { return }
    if allowsEditingTextAttributes {
      if !blockActions.enabled.isEmpty, let length = MarkdownInput.blockPrefix(in: text),
        !committed.string.hasPrefix((text as NSString).substring(to: length)),
        let result = try? MarkdownInput.block(
          prefix: (text as NSString).substring(to: length),
          inlines: RichTextCodec.inlines(
            attributedText.attributedSubstring(
              from: NSRange(location: length, length: attributedText.length - length)),
            font: baseFont))
      {
        let selection = NSRange(
          location: max(0, selectedRange.location - length), length: selectedRange.length)
        onCommand(
          self,
          .markdown(
            result.markup, result.path, selection,
            RichTextCodec.inlines(attributedText, font: baseFont)))
        return
      }
      if selectedRange.length == 0,
        let shortcut = MarkdownInput.inlineShortcut(in: text, before: selectedRange.location),
        !containsImage(in: shortcut.range),
        attributedText.attribute(.editorCode, at: shortcut.range.location, effectiveRange: nil)
          == nil
      {
        let replacement = NSMutableAttributedString(
          attributedString: RichTextCodec.attributed(Paragraph(shortcut.markup), font: baseFont))
        let inherited = attributedText.attributes(at: shortcut.range.location, effectiveRange: nil)
          .filter { key, _ in
            [.editorStrong, .editorEmphasis, .strikethroughStyle, .link, .editorLinkTitle].contains(
              key)
          }
        replacement.addAttributes(
          inherited, range: NSRange(location: 0, length: replacement.length))
        let changed = NSMutableAttributedString(attributedString: attributedText)
        changed.replaceCharacters(in: shortcut.range, with: replacement)
        let previousTyping = currentTypingAttributes
        replaceText(
          RichTextCodec.styled(changed, font: baseFont),
          selection: NSRange(location: shortcut.range.location + replacement.length, length: 0))
        typingAttributes = previousTyping
        typingUpdate = (
          NSRange(location: selectedRange.location, length: 0), "", previousTyping, false
        )
        updateMenu()
        return
      }
    }
    commitChanges()
  }

  func textView(
    _ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String
  ) -> Bool {
    if text == "\n", markedTextRange == nil, allowsEditingTextAttributes,
      !blockActions.enabled.isEmpty
    {
      if range.location == attributedText.length, range.length == 0,
        self.text.range(of: #"\A```[^\s`]*\z"#, options: .regularExpression) != nil,
        let code = try? MarkdownInput.block(prefix: self.text + "\n", inlines: [])
      {
        onCommand(
          self,
          .markdown(
            code.markup, code.path, NSRange(location: 0, length: 0),
            RichTextCodec.inlines(attributedText, font: baseFont)))
        return false
      }
      let before = attributedText.attributedSubstring(
        from: NSRange(location: 0, length: range.location))
      let after = attributedText.attributedSubstring(
        from: NSRange(
          location: NSMaxRange(range), length: attributedText.length - NSMaxRange(range)))
      onCommand(
        self,
        .split(
          RichTextCodec.inlines(before, font: baseFont),
          RichTextCodec.inlines(after, font: baseFont)))
      return false
    }
    if !allowsLineBreaks && text == "\n" {
      resignFirstResponder()
      return false
    }
    let allowed = allowsLineBreaks || !text.contains(where: MarkdownInput.isLineEnding)
    if allowed && markedTextRange == nil {
      var attributes = currentTypingAttributes
      attributes.removeValue(forKey: .editorImage)
      attributes.removeValue(forKey: .attachment)
      attributes.removeValue(forKey: .editorSoftBreak)
      typingUpdate = (
        NSRange(location: range.location, length: text.utf16.count), text, attributes, true
      )
    }
    return allowed
  }

  func textViewDidChangeSelection(_ textView: UITextView) {
    if markedTextRange == nil {
      if let update = typingUpdate,
        selectedRange == NSRange(location: NSMaxRange(update.range), length: 0)
      {
        typingAttributes = update.attributes
      } else if typingUpdate?.pending == false {
        typingUpdate = nil
      }
      var attributes = typingAttributes
      attributes.removeValue(forKey: .editorImage)
      attributes.removeValue(forKey: .attachment)
      attributes.removeValue(forKey: .editorSoftBreak)
      typingAttributes = attributes
    }
    updateMenu()
  }

  func toggleStyle(_ key: NSAttributedString.Key) {
    guard markedTextRange == nil, allowsEditingTextAttributes else { return }
    guard key != .editorCode || !containsImage(in: selectedRange) else { return }
    let selection = selectedRange
    let current =
      selection.length == 0
      ? currentTypingAttributes[key]
      : RichTextCodec.formatAttributes(
        attributedText.attributes(at: selection.location, effectiveRange: nil), font: baseFont)[key]
    if selection.length == 0 {
      var attributes = currentTypingAttributes
      if current == nil || (key == .strikethroughStyle && current as? Int == 0) {
        attributes[key] = key == .strikethroughStyle ? 1 : true
      } else {
        attributes.removeValue(forKey: key)
      }
      typingAttributes = RichTextCodec.styled(
        NSAttributedString(string: " ", attributes: attributes), font: baseFont
      ).attributes(at: 0, effectiveRange: nil)
      typingUpdate = (NSRange(location: selection.location, length: 0), "", typingAttributes, false)
      updateMenu()
      return
    }
    let changed = NSMutableAttributedString(attributedString: attributedText)
    if current == nil || (key == .strikethroughStyle && current as? Int == 0) {
      changed.addAttribute(key, value: key == .strikethroughStyle ? 1 : true, range: selection)
    } else {
      changed.removeAttribute(key, range: selection)
    }
    replaceText(RichTextCodec.styled(changed, font: baseFont), selection: selection)
  }

  func setLink(_ destination: String) {
    guard markedTextRange == nil else { return }
    let changed = NSMutableAttributedString(attributedString: attributedText)
    var range = selectedRange
    if range.length == 0, let link = selectedLink { range = link.range }
    if range.length == 0 && !destination.isEmpty {
      changed.replaceCharacters(
        in: range, with: NSAttributedString(string: destination, attributes: typingAttributes))
      range.length = destination.utf16.count
    }
    if destination.isEmpty {
      changed.removeAttribute(.editorLinkTitle, range: range)
      changed.removeAttribute(.link, range: range)
    } else {
      changed.addAttribute(.link, value: destination, range: range)
    }
    replaceText(changed, selection: range)
  }

  var selectedLink: (range: NSRange, destination: String)? {
    guard attributedText.length > 0 else { return nil }
    var range = NSRange()
    let value = attributedText.attribute(
      .link, at: min(selectedRange.location, attributedText.length - 1), effectiveRange: &range)
    guard let destination = (value as? URL)?.absoluteString ?? value as? String else { return nil }
    return (range, destination)
  }

  func insertImage(_ image: Markdown.Image, preview: UIImage, selection: NSRange) {
    let changed = NSMutableAttributedString(attributedString: attributedText)
    let replacement = RichTextCodec.attributed(Paragraph(image), font: baseFont)
    changed.replaceCharacters(in: selection, with: replacement)
    replaceText(
      changed, selection: NSRange(location: selection.location + replacement.length, length: 0))
    setImagePreview(preview, at: selection.location)
  }

  func setImagePreview(_ image: UIImage, at location: Int) {
    guard image.size.width > 0, image.size.height > 0,
      let attachment = attributedText.attribute(.attachment, at: location, effectiveRange: nil)
        as? NSTextAttachment
    else { return }
    let scale = min(1, max(120, min(280, bounds.width)) / image.size.width, 220 / image.size.height)
    attachment.image = image
    attachment.bounds = CGRect(
      x: 0, y: -4, width: image.size.width * scale, height: image.size.height * scale)
    textStorage.addAttribute(
      .attachment, value: attachment, range: NSRange(location: location, length: 1))
    invalidateIntrinsicContentSize()
  }

  private func perform(_ command: EditorKeyboardMenu.Command) {
    if case .done = command {
      resignFirstResponder()
      return
    }
    guard markedTextRange == nil else { return }
    switch command {
    case .format(let key): toggleStyle(key)
    case .undo:
      undoManager?.undo()
      updateMenu()
    case .redo:
      undoManager?.redo()
      updateMenu()
    default: onCommand(self, command)
    }
  }

  private func commitChanges() {
    guard markedTextRange == nil, !attributedText.isEqual(to: committed) else { return }
    committed = NSAttributedString(attributedString: attributedText)
    onChange(RichTextCodec.inlines(committed, font: baseFont))
    updateMenu()
  }

  private func replaceText(_ text: NSAttributedString, selection: NSRange) {
    let previous = NSAttributedString(attributedString: attributedText)
    let previousSelection = selectedRange
    undoManager?.registerUndo(withTarget: self) { target in
      target.replaceText(previous, selection: previousSelection)
    }
    attributedText = text
    selectedRange = selection
    invalidateIntrinsicContentSize()
    commitChanges()
  }

  private var currentTypingAttributes: [NSAttributedString.Key: Any] {
    let attributes: [NSAttributedString.Key: Any]
    if let update = typingUpdate,
      selectedRange == NSRange(location: NSMaxRange(update.range), length: 0)
    {
      attributes = update.attributes
    } else {
      attributes = typingAttributes
    }
    return RichTextCodec.formatAttributes(attributes, font: baseFont)
  }

  private func containsImage(in range: NSRange) -> Bool {
    var found = false
    attributedText.enumerateAttribute(.editorImage, in: range) { value, _, stop in
      if value != nil {
        found = true
        stop.pointee = true
      }
    }
    return found
  }

  private func updateMenu() {
    guard let menu = inputAccessoryView as? EditorKeyboardMenu else { return }
    let attributes =
      selectedRange.length == 0 || selectedRange.location >= attributedText.length
      ? currentTypingAttributes
      : attributedText.attributes(at: selectedRange.location, effectiveRange: nil)
    let normalized = RichTextCodec.formatAttributes(attributes, font: baseFont)
    let formats = Set(
      [NSAttributedString.Key.editorStrong, .editorEmphasis, .editorCode, .strikethroughStyle]
        .filter {
          $0 == .strikethroughStyle
            ? (normalized[$0] as? Int ?? 0) != 0 : normalized[$0] as? Bool == true
        })
    let actions: [(MarkdownDocument.BlockAction, String, String)] = [
      (.paragraph, String(localized: "段落"), "type"),
      (.checkList, String(localized: "チェックリスト"), "list-todo"),
      (.quote, String(localized: "引用"), "quote"),
      (.codeBlock, String(localized: "コードブロック"), "square-code"),
    ]
    let blocks = actions.map { action, title, icon in
      UIAction(
        title: title, image: UIImage(named: "editor-" + icon),
        attributes: blockActions.enabled.contains(action) ? [] : .disabled,
        state: blockActions.selected.contains(action) ? .on : .off
      ) { [weak self] _ in self?.perform(.block(action)) }
    }
    let history = [
      UIAction(
        title: String(localized: "元に戻す"), image: UIImage(systemName: "arrow.uturn.backward"),
        attributes: undoManager?.canUndo == true ? [] : .disabled
      ) { [weak self] _ in self?.perform(.undo) },
      UIAction(
        title: String(localized: "やり直す"), image: UIImage(systemName: "arrow.uturn.forward"),
        attributes: undoManager?.canRedo == true ? [] : .disabled
      ) { [weak self] _ in self?.perform(.redo) },
    ]
    menu.update(
      blockActions: blockActions, formats: formats, allowsInline: allowsEditingTextAttributes,
      canFormatCode: !containsImage(in: selectedRange),
      isComposing: markedTextRange != nil,
      moreMenu: UIMenu(children: [
        UIMenu(options: .displayInline, children: blocks),
        UIMenu(options: .displayInline, children: history),
      ]))
  }
}
