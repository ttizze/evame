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

  override func viewDidLoad() {
    super.viewDidLoad()
    title = String(localized: "編集の試作")
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
          UIAction(title: String(localized: "写真")) { [weak self] _ in self?.pickPhoto() },
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
    notice.text = String(localized: "入力・選択・Undoを確認するための試作です。本文は保存・同期されません。")
    notice.font = .preferredFont(forTextStyle: .footnote)
    notice.textColor = .secondaryLabel
    notice.numberOfLines = 0
    content.addArrangedSubview(notice)
    status.font = .preferredFont(forTextStyle: .caption1)
    status.textColor = .secondaryLabel
    status.text = String(localized: "検証用サンプル")
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
        content.addArrangedSubview(renderNode(block.markup, blockIndex: index, path: []))
      }
    }
  }

  private func renderNode(_ node: any Markup, blockIndex: Int, path: [Int]) -> UIView {
    if node is Paragraph, node.childCount == 1, let image = node.child(at: 0) as? Markdown.Image {
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
    if node is Paragraph || node is Heading || node is Table.Cell {
      let level = (node as? Heading)?.level
      let isCell = node is Table.Cell
      let font: UIFont =
        level == 1
        ? .preferredFont(forTextStyle: .largeTitle)
        : level != nil
          ? .preferredFont(forTextStyle: .title2)
          : isCell && path.first == 0
            ? .preferredFont(forTextStyle: .headline) : .preferredFont(forTextStyle: .body)
      // 見出し階層とセル種別だけを渡し、古い文書オブジェクトを閉じ込めない。
      return NativeTextView(
        markup: node, font: font, allowsLineBreaks: !isCell && (level.map { $0 <= 2 } ?? true)
      ) {
        [weak self] inlines in
        let replacement: any Markup =
          if let level { Heading(level: level, inlines) } else if isCell {
            Table.Cell(inlines)
          } else { Paragraph(inlines) }
        self?.replace(blockIndex: blockIndex, path: path, with: replacement)
      }
    }
    if let code = node as? CodeBlock {
      let language = code.language
      return NativeTextView(
        markup: Paragraph(Markdown.Text(code.code)),
        font: .monospacedSystemFont(ofSize: 15, weight: .regular), allowsLineBreaks: true
      ) { [weak self] inlines in
        self?.replace(
          blockIndex: blockIndex, path: path,
          with: CodeBlock(language: language, Paragraph(inlines).plainText))
      }
    }
    if node is ThematicBreak {
      let divider = UIView()
      divider.backgroundColor = .separator
      divider.heightAnchor.constraint(equalToConstant: 1).isActive = true
      return divider
    }
    let stack = UIStackView()
    stack.axis = .vertical
    stack.spacing = 4
    if node is BlockQuote {
      stack.isLayoutMarginsRelativeArrangement = true
      stack.layoutMargins = UIEdgeInsets(top: 4, left: 16, bottom: 4, right: 4)
      stack.backgroundColor = .secondarySystemBackground
    }
    for (index, child) in node.children.enumerated() {
      let childView = renderNode(child, blockIndex: blockIndex, path: path + [index])
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

  private func replace(blockIndex: Int, path: [Int], with markup: any Markup) {
    do {
      document = try document.replacingNode(in: blockIndex, path: path, with: markup)
      status.text = String(localized: "入力を反映（未保存）")
    } catch { showError() }
  }

  private func append(_ source: String) {
    view.endEditing(true)
    document = document.appending(source)
    render()
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
        let editor = renderNode(cell, blockIndex: index, path: path + [column])
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
    let controller = UIViewController()
    controller.title = "Markdown"
    let text = UITextView()
    text.isEditable = false
    text.font = .monospacedSystemFont(ofSize: 14, weight: .regular)
    text.text = document.source
    controller.view = text
    navigationController?.pushViewController(controller, animated: true)
  }

  private func pickPhoto() {
    view.endEditing(true)
    var configuration = PHPickerConfiguration()
    configuration.filter = .images
    configuration.selectionLimit = 1
    let picker = PHPickerViewController(configuration: configuration)
    picker.delegate = self
    present(picker, animated: true)
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    guard let provider = results.first?.itemProvider, provider.canLoadObject(ofClass: UIImage.self)
    else { return }
    provider.loadObject(ofClass: UIImage.self) { [weak self] object, _ in
      guard let image = object as? UIImage else { return }
      Task { @MainActor in
        let name = "assets/\(UUID().uuidString).png"
        self?.assets[name] = image
        self?.append("![\(String(localized: "写真"))](\(name))")
      }
    }
  }

  private func showError() {
    let alert = UIAlertController(
      title: String(localized: "編集を反映できませんでした"),
      message: String(localized: "原稿を保持しています。Markdown表示で内容を確認してください。"), preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "OK", style: .default))
    present(alert, animated: true)
  }
}
