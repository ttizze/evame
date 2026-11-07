import EditorCore
import Markdown
import PhotosUI
import UIKit

/// 編集試作用の画面。実アカウントや同期APIには接続しない。
@MainActor
final class EditorViewController: UIViewController, PHPickerViewControllerDelegate {
  private var document = MarkdownDocument(source: "")
  private let content = UIStackView()
  private let status = UILabel()
  private var assets: [String: UIImage] = [:]
  private var photoInsertion: (editor: NativeTextView, selection: NSRange)?

  override func viewDidLoad() {
    super.viewDidLoad()
    title = String(localized: "編集")
    view.backgroundColor = .systemBackground
    navigationItem.rightBarButtonItems = [
      UIBarButtonItem(
        image: UIImage(systemName: "doc.text.magnifyingglass"),
        primaryAction: UIAction { [weak self] _ in self?.showMarkdown() }),
      UIBarButtonItem(
        systemItem: .add,
        menu: UIMenu(children: [
          UIAction(title: String(localized: "段落")) { [weak self] _ in
            self?.append(String(localized: "新しい段落"))
          },
          UIAction(title: String(localized: "見出し")) { [weak self] _ in
            self?.append("## " + String(localized: "新しい見出し"))
          },
          UIAction(title: String(localized: "リスト")) { [weak self] _ in
            self?.append("- " + String(localized: "新しい項目") + "\n- " + String(localized: "次の項目"))
          },
          UIAction(title: String(localized: "表")) { [weak self] _ in
            self?.append(
              "| " + String(localized: "見出し") + " | " + String(localized: "値")
                + " |\n| --- | --- |\n| " + String(localized: "内容") + " | " + String(localized: "値")
                + " |")
          },
          UIAction(title: String(localized: "写真")) { [weak self] _ in self?.pickPhoto(into: nil) },
        ])),
    ]
    navigationItem.rightBarButtonItems?.first?.accessibilityLabel = String(localized: "Markdownを確認")
    let scroll = UIScrollView()
    scroll.keyboardDismissMode = .interactive
    scroll.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(scroll)
    content.axis = .vertical
    content.spacing = 12
    content.translatesAutoresizingMaskIntoConstraints = false
    scroll.addSubview(content)
    NSLayoutConstraint.activate([
      scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      scroll.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
      content.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor, constant: 20),
      content.bottomAnchor.constraint(
        equalTo: scroll.contentLayoutGuide.bottomAnchor, constant: -32),
      content.leadingAnchor.constraint(
        equalTo: scroll.contentLayoutGuide.leadingAnchor, constant: 24),
      content.trailingAnchor.constraint(
        equalTo: scroll.contentLayoutGuide.trailingAnchor, constant: -24),
      content.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor, constant: -48),
    ])
    do {
      guard let url = Bundle.main.url(forResource: "round-trip", withExtension: "md") else {
        throw CocoaError(.fileNoSuchFile)
      }
      document = MarkdownDocument(source: try String(contentsOf: url, encoding: .utf8))
      render()
    } catch { showError() }
  }

  private func render() {
    for child in content.arrangedSubviews { child.removeFromSuperview() }
    let notice = UILabel()
    notice.text = String(localized: "本文は保存・同期されません。")
    notice.font = .preferredFont(forTextStyle: .footnote)
    notice.textColor = .secondaryLabel
    notice.numberOfLines = 0
    content.addArrangedSubview(notice)
    status.font = .preferredFont(forTextStyle: .caption1)
    status.textColor = .secondaryLabel
    status.text = String(localized: "サンプル文書")
    content.addArrangedSubview(status)
    for (index, block) in document.blocks.enumerated() {
      if block.kind == .preserved {
        let preserved = UITextView()
        preserved.isEditable = false
        preserved.isScrollEnabled = false
        preserved.font = .preferredFont(forTextStyle: .footnote)
        preserved.backgroundColor = .secondarySystemBackground
        preserved.text = String(localized: "原文を保持（読み取り専用）") + "\n" + block.source
        content.addArrangedSubview(preserved)
      } else if block.kind == .table, let table = block.markup as? Table {
        let button = UIButton(type: .system)
        button.setTitle(
          String(localized: "表を編集") + " · \(table.head.childCount) × \(table.body.childCount + 1)",
          for: .normal)
        button.backgroundColor = .secondarySystemBackground
        button.layer.cornerRadius = 12
        button.heightAnchor.constraint(greaterThanOrEqualToConstant: 52).isActive = true
        button.addAction(
          UIAction { [weak self] _ in self?.showTable(at: index) }, for: .touchUpInside)
        content.addArrangedSubview(button)
      } else {
        content.addArrangedSubview(
          renderNode(block.markup, blockIndex: index, path: [], reusing: nil))
      }
    }
  }

  private func renderNode(
    _ node: any Markup, blockIndex: Int, path: [Int],
    reusing input: (editor: NativeTextView, path: [Int], selection: NSRange, slot: UIStackView)?
  ) -> UIView {
    if input?.path != path, node is Paragraph, node.childCount == 1,
      let image = node.child(at: 0) as? Markdown.Image
    {
      let stack = UIStackView()
      stack.axis = .vertical
      stack.spacing = 8
      let preview = UIImageView(image: assets[image.source ?? ""] ?? UIImage(systemName: "photo"))
      preview.contentMode = .scaleAspectFit
      preview.clipsToBounds = true
      preview.heightAnchor.constraint(equalToConstant: 200).isActive = true
      preview.accessibilityLabel = image.plainText
      stack.addArrangedSubview(preview)
      let caption = UILabel()
      caption.font = .preferredFont(forTextStyle: .caption1)
      caption.textColor = .secondaryLabel
      caption.numberOfLines = 0
      caption.text = image.plainText + "\n" + (image.source ?? "")
      stack.addArrangedSubview(caption)
      return stack
    }
    if node is Paragraph || node is Heading || node is Table.Cell || node is CodeBlock {
      let level = (node as? Heading)?.level
      let isCell = node is Table.Cell
      let code = node as? CodeBlock
      let style: UIFont.TextStyle =
        switch level {
        case 1: .largeTitle
        case 2: .title1
        case 3: .title2
        case 4: .headline
        case 5: .subheadline
        case 6: .footnote
        default: isCell && path.first == 0 ? .headline : .body
        }
      let preferred = UIFont.preferredFont(forTextStyle: style)
      let font: UIFont =
        code != nil
        ? .monospacedSystemFont(ofSize: 15, weight: .regular)
        : level == nil
          ? preferred
          : UIFont(
            descriptor: preferred.fontDescriptor.withSymbolicTraits(.traitBold)
              ?? preferred.fontDescriptor, size: preferred.pointSize)
      let markup: any Markup = code.map { Paragraph(Markdown.Text($0.code)) } ?? node
      let allowsLineBreaks = !isCell && (level.map { $0 <= 2 } ?? true)
      let onChange: ([any InlineMarkup]) -> Void = { [weak self] inlines in
        guard let self else { return }
        do {
          document = try document.replacingInlines(in: blockIndex, path: path, with: inlines)
          status.text = String(localized: "編集中（未保存）")
        } catch { showError() }
      }
      let onCommand: (NativeTextView, EditorKeyboardMenu.Command) -> Void = {
        [weak self] editor, command in
        self?.handle(command, editor: editor, blockIndex: blockIndex, path: path)
      }
      let editor: NativeTextView
      if let input, input.path == path {
        editor = input.editor
        editor.rebind(
          markup: markup, font: font, allowsLineBreaks: allowsLineBreaks,
          allowsInlineFormatting: code == nil, selection: input.selection, onCommand: onCommand,
          onChange: onChange)
      } else {
        editor = NativeTextView(
          markup: markup, font: font, allowsLineBreaks: allowsLineBreaks,
          allowsInlineFormatting: code == nil, onCommand: onCommand, onChange: onChange)
      }
      editor.blockActions = document.blockActions(in: blockIndex, path: path)
      editor.attributedText.enumerateAttribute(
        .editorImage, in: NSRange(location: 0, length: editor.attributedText.length)
      ) { value, range, _ in
        if let source = (value as? Markdown.Image)?.source, let image = assets[source] {
          editor.setImagePreview(image, at: range.location)
        }
      }
      return input?.path == path ? input!.slot : editor
    }
    if node is ThematicBreak {
      let divider = UIView()
      divider.backgroundColor = .separator
      divider.heightAnchor.constraint(equalToConstant: 1).isActive = true
      return divider
    }
    let stack = UIStackView()
    stack.axis = .vertical
    stack.spacing = node is Document ? 12 : 4
    if node is BlockQuote {
      stack.isLayoutMarginsRelativeArrangement = true
      stack.layoutMargins = UIEdgeInsets(top: 4, left: 16, bottom: 4, right: 4)
      stack.backgroundColor = .secondarySystemBackground
    }
    for (index, child) in node.children.enumerated() {
      let childView = renderNode(
        child, blockIndex: blockIndex, path: path + [index], reusing: input)
      if let item = child as? ListItem {
        let row = UIStackView()
        row.alignment = .firstBaseline
        row.spacing = 8
        let marker = UILabel()
        marker.font = .preferredFont(forTextStyle: .body)
        marker.text =
          item.checkbox.map { $0 == .checked ? "☑" : "☐" }
          ?? (node as? OrderedList).map { "\($0.startIndex + UInt(index))." } ?? "•"
        marker.widthAnchor.constraint(greaterThanOrEqualToConstant: 24).isActive = true
        marker.setContentHuggingPriority(.required, for: .horizontal)
        row.addArrangedSubview(marker)
        row.addArrangedSubview(childView)
        stack.addArrangedSubview(row)
      } else {
        stack.addArrangedSubview(childView)
      }
    }
    return stack
  }

  private func handle(
    _ command: EditorKeyboardMenu.Command, editor: NativeTextView, blockIndex: Int, path: [Int]
  ) {
    do {
      switch command {
      case .block(let action):
        let result = try document.applying(action, in: blockIndex, path: path)
        changeStructure(
          to: result.document, from: (blockIndex, path), to: (blockIndex, result.path),
          editor: editor, selection: editor.selectedRange)
      case .markdown(let markup, let suffix, let selection, let previous):
        // Undoでは記法を入力した状態へ戻せるよう、変換直前の内容も保存する。
        document = try document.replacingInlines(
          in: blockIndex, path: path, with: previous)
        let changed = try document.replacingBlock(
          in: blockIndex, path: path, with: markup, focusPath: suffix)
        changeStructure(
          to: changed.document, from: (blockIndex, path), to: (blockIndex, changed.path),
          editor: editor, selection: selection)
      case .image: pickPhoto(into: editor)
      case .split(let before, let after):
        let result = try document.splittingBlock(
          in: blockIndex, path: path, before: before, after: after)
        changeStructure(
          to: result.document, from: (blockIndex, path), to: (blockIndex, result.path),
          editor: editor, selection: NSRange(location: 0, length: 0))
      case .backspace:
        guard let result = try document.backspacingBlock(in: blockIndex, path: path) else { return }
        let offset = RichTextCodec.attributed(
          Paragraph(result.before), font: .preferredFont(forTextStyle: .body)
        ).length
        changeStructure(
          to: result.document, from: (blockIndex, path), to: (result.index, result.path),
          editor: editor, selection: NSRange(location: offset, length: 0))
      case .link: editLink(in: editor)
      default: break
      }
    } catch { showError() }
  }

  private func changeStructure(
    to changed: MarkdownDocument, from previousAddress: (index: Int, path: [Int]),
    to address: (index: Int, path: [Int]),
    editor: NativeTextView, selection: NSRange
  ) {
    let previous = document
    let previousSelection = editor.selectedRange
    editor.undoManager?.registerUndo(withTarget: self) { target in
      target.changeStructure(
        to: previous, from: address, to: previousAddress,
        editor: editor, selection: previousSelection)
    }
    document = changed
    // 先頭の2行は説明と状態。変更した範囲を作り直して入力欄とUndoを引き継ぐ。
    let indices =
      min(previousAddress.index, address.index)...max(previousAddress.index, address.index)
    let previousViews = indices.map { content.arrangedSubviews[$0 + 2] }
    UIView.performWithoutAnimation {
      let slot = UIStackView()
      for (offset, index) in indices.enumerated() {
        let markup = document.blocks[index].markup
        let replacement = renderNode(
          markup, blockIndex: index, path: [],
          reusing: index == address.index ? (editor, address.path, selection, slot) : nil)
        replacement.isHidden = markup is Document && markup.childCount == 0
        content.insertArrangedSubview(replacement, at: indices.lowerBound + offset + 2)
      }
      // 入力欄をウィンドウから外すと、改行中のUIKitがキーボードを閉じてしまう。
      // 新しい配置を先に接続し、同じウィンドウ内で入力欄だけを移動する。
      let parent = slot.superview as! UIStackView
      let position = parent.arrangedSubviews.firstIndex(of: slot)!
      parent.insertArrangedSubview(editor, at: position)
      slot.removeFromSuperview()
      for previous in previousViews where previous !== editor { previous.removeFromSuperview() }
      view.layoutIfNeeded()
      editor.becomeFirstResponder()
    }
    status.text = String(localized: "編集中（未保存）")
  }

  private func editLink(in editor: NativeTextView) {
    let selection = editor.selectedRange
    let current = editor.selectedLink?.destination
    let alert = UIAlertController(
      title: String(localized: "リンク"), message: nil, preferredStyle: .alert)
    alert.addTextField { field in
      field.placeholder = "URL"
      field.text = current
      field.keyboardType = .URL
      field.autocapitalizationType = .none
      field.autocorrectionType = .no
    }
    alert.addAction(
      UIAlertAction(title: String(localized: "キャンセル"), style: .cancel) { _ in
        editor.becomeFirstResponder()
      })
    alert.addAction(
      UIAlertAction(title: String(localized: "適用"), style: .default) { [weak alert] _ in
        editor.becomeFirstResponder()
        editor.selectedRange = selection
        editor.setLink(
          alert?.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "")
      })
    navigationController?.topViewController?.present(alert, animated: true)
  }

  private func append(_ source: String) {
    view.endEditing(true)
    document = document.appending(source)
    render()
    status.text = String(localized: "編集中（未保存）")
  }

  private func showTable(at index: Int) {
    view.endEditing(true)
    guard let table = document.blocks[index].markup as? Table else { return }
    let controller = UIViewController()
    controller.title = String(localized: "表を編集")
    controller.view.backgroundColor = .systemBackground
    let grid = UIStackView()
    grid.axis = .vertical
    grid.spacing = 1
    grid.translatesAutoresizingMaskIntoConstraints = false
    let scroll = UIScrollView()
    scroll.translatesAutoresizingMaskIntoConstraints = false
    controller.view.addSubview(scroll)
    scroll.addSubview(grid)
    NSLayoutConstraint.activate([
      scroll.topAnchor.constraint(equalTo: controller.view.safeAreaLayoutGuide.topAnchor),
      scroll.bottomAnchor.constraint(equalTo: controller.view.keyboardLayoutGuide.topAnchor),
      scroll.leadingAnchor.constraint(equalTo: controller.view.leadingAnchor, constant: 16),
      scroll.trailingAnchor.constraint(equalTo: controller.view.trailingAnchor, constant: -16),
      grid.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor, constant: 16),
      grid.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor, constant: -16),
      grid.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor),
      grid.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor),
      grid.widthAnchor.constraint(greaterThanOrEqualTo: scroll.frameLayoutGuide.widthAnchor),
    ])
    let rows: [(any Markup, [Int])] =
      [(table.head, [0])] + table.body.children.enumerated().map { ($0.element, [1, $0.offset]) }
    for (row, path) in rows {
      let rowView = UIStackView()
      rowView.distribution = .fillEqually
      rowView.spacing = 1
      for (column, cell) in row.children.enumerated() {
        let editor = renderNode(cell, blockIndex: index, path: path + [column], reusing: nil)
        if let text = editor as? UITextView, table.columnAlignments.indices.contains(column) {
          switch table.columnAlignments[column] {
          case .center: text.textAlignment = .center
          case .right: text.textAlignment = .right
          default: text.textAlignment = .left
          }
        }
        editor.backgroundColor = .secondarySystemBackground
        editor.widthAnchor.constraint(greaterThanOrEqualToConstant: 140).isActive = true
        rowView.addArrangedSubview(editor)
      }
      grid.addArrangedSubview(rowView)
    }
    navigationController?.pushViewController(controller, animated: true)
  }

  private func showMarkdown() {
    view.endEditing(true)
    let controller = MarkdownSourceViewController(source: document.source) { [weak self] source in
      self?.document = MarkdownDocument(source: source)
      self?.render()
      self?.status.text = String(localized: "編集中（未保存）")
    }
    navigationController?.pushViewController(controller, animated: true)
  }

  private func pickPhoto(into editor: NativeTextView?) {
    photoInsertion = editor.map { ($0, $0.selectedRange) }
    view.endEditing(true)
    var configuration = PHPickerConfiguration()
    configuration.filter = .images
    configuration.selectionLimit = 1
    let picker = PHPickerViewController(configuration: configuration)
    picker.delegate = self
    navigationController?.topViewController?.present(picker, animated: true)
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    let insertion = photoInsertion
    photoInsertion = nil
    guard let provider = results.first?.itemProvider, provider.canLoadObject(ofClass: UIImage.self)
    else {
      picker.dismiss(animated: true) { insertion?.editor.becomeFirstResponder() }
      return
    }
    // 写真が読み込めるまでモーダルを保ち、選択位置の本文が先に編集されるのを防ぐ。
    let loading = UIActivityIndicatorView(style: .large)
    loading.center = CGPoint(x: picker.view.bounds.midX, y: picker.view.bounds.midY)
    loading.autoresizingMask = [
      .flexibleLeftMargin, .flexibleRightMargin, .flexibleTopMargin, .flexibleBottomMargin,
    ]
    loading.accessibilityLabel = String(localized: "画像を読み込み中")
    picker.view.addSubview(loading)
    loading.startAnimating()
    provider.loadObject(ofClass: UIImage.self) { [weak self, weak picker] object, _ in
      let image = object as? UIImage
      Task { @MainActor in
        guard let self, let picker, picker.presentingViewController != nil, !picker.isBeingDismissed
        else { return }
        guard let image else {
          picker.dismiss(animated: true) { self.showError() }
          return
        }
        let name = "assets/\(UUID().uuidString).png"
        self.assets[name] = image
        if let insertion {
          insertion.editor.insertImage(
            Markdown.Image(source: name, [Markdown.Text(String(localized: "写真"))]),
            preview: image, selection: insertion.selection)
        } else {
          self.append("![\(String(localized: "写真"))](\(name))")
        }
        picker.dismiss(animated: true) { insertion?.editor.becomeFirstResponder() }
      }
    }
  }

  private func showError() {
    let alert = UIAlertController(
      title: String(localized: "編集を反映できませんでした"),
      message: String(localized: "原稿を保持しています。Markdown表示で内容を確認してください。"), preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "OK", style: .default))
    navigationController?.topViewController?.present(alert, animated: true)
  }
}
