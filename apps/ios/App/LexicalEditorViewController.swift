import PhotosUI
import UIKit

/// Lexicalの文書を1つの入力欄で編集する画面。実アカウントや同期APIには接続しない。
@MainActor
final class LexicalEditorViewController: UIViewController, PHPickerViewControllerDelegate {
  private var editor: LexicalTextView!
  private let menu = UIStackView()
  private var menuButtons: [(UIButton, (LexicalDocument.Snapshot) -> Bool)] = []
  private let more = UIButton(type: .system)

  override func viewDidLoad() {
    super.viewDidLoad()
    title = String(localized: "編集")
    navigationItem.prompt = String(localized: "本文は保存・同期されません。")
    view.backgroundColor = .systemBackground
    do {
      guard let url = Bundle.main.url(forResource: "round-trip", withExtension: "md") else {
        throw CocoaError(.fileNoSuchFile)
      }
      editor = try LexicalTextView(
        document: LexicalDocument(), markdown: try String(contentsOf: url, encoding: .utf8),
        pasteboard: .general)
    } catch {
      showError()
      return
    }
    editor.translatesAutoresizingMaskIntoConstraints = false
    editor.inputAccessoryView = keyboardMenu()
    editor.onChange = { [weak self] in self?.updateMenu() }
    editor.onTableTap = { [weak self] unit in self?.showTable(unit) }
    editor.onFailure = { [weak self] in self?.showError() }
    view.addSubview(editor)
    NSLayoutConstraint.activate([
      editor.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      editor.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      editor.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      editor.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
    ])
    navigationItem.rightBarButtonItems = [
      UIBarButtonItem(
        image: UIImage(systemName: "doc.text.magnifyingglass"),
        primaryAction: UIAction { [weak self] _ in self?.showMarkdown() }),
      UIBarButtonItem(
        systemItem: .add,
        menu: UIMenu(children: [
          UIAction(title: String(localized: "段落")) { [weak self] _ in
            self?.editor.appendMarkdown(String(localized: "新しい段落"))
          },
          UIAction(title: String(localized: "見出し")) { [weak self] _ in
            self?.editor.appendMarkdown("## " + String(localized: "新しい見出し"))
          },
          UIAction(title: String(localized: "リスト")) { [weak self] _ in
            self?.editor.appendMarkdown(
              "- " + String(localized: "新しい項目") + "\n- " + String(localized: "次の項目"))
          },
          UIAction(title: String(localized: "表")) { [weak self] _ in
            self?.editor.appendMarkdown(
              "| " + String(localized: "見出し") + " | " + String(localized: "値")
                + " |\n| --- | --- |\n| " + String(localized: "内容") + " | "
                + String(localized: "値") + " |")
          },
          UIAction(title: String(localized: "写真")) { [weak self] _ in self?.pickPhoto() },
        ])),
    ]
    navigationItem.rightBarButtonItems?.first?.accessibilityLabel = String(localized: "Markdownを確認")
    updateMenu()
  }

  // MARK: キーボード上の書式メニュー

  private func keyboardMenu() -> UIView {
    let bar = UIView(frame: CGRect(x: 0, y: 0, width: 0, height: 48))
    bar.autoresizingMask = [.flexibleWidth]
    bar.backgroundColor = .systemBackground
    bar.accessibilityIdentifier = "editor.keyboard-menu"
    let scroll = UIScrollView()
    scroll.showsHorizontalScrollIndicator = false
    scroll.accessibilityIdentifier = "editor.keyboard-actions"
    scroll.translatesAutoresizingMaskIntoConstraints = false
    bar.addSubview(scroll)
    menu.axis = .horizontal
    menu.translatesAutoresizingMaskIntoConstraints = false
    scroll.addSubview(menu)
    let items: [(String, String, String, () -> Void, (LexicalDocument.Snapshot) -> Bool)] = [
      ("字下げ", "indent-increase", "indent", { [weak self] in self?.editor.indent(true) }, { _ in false }),
      ("字下げを戻す", "indent-decrease", "outdent", { [weak self] in self?.editor.indent(false) }, { _ in false }),
      ("見出し2", "heading-2", "h2", { [weak self] in self?.editor.setBlock("h2") }, { $0.block?.level == 2 }),
      ("見出し3", "heading-3", "h3", { [weak self] in self?.editor.setBlock("h3") }, { $0.block?.level == 3 }),
      ("見出し4", "heading-4", "h4", { [weak self] in self?.editor.setBlock("h4") }, { $0.block?.level == 4 }),
      ("太字", "bold", "bold", { [weak self] in self?.editor.format("bold") }, { $0.formats.contains("bold") }),
      ("斜体", "italic", "italic", { [weak self] in self?.editor.format("italic") }, { $0.formats.contains("italic") }),
      ("取消線", "strikethrough", "strike", { [weak self] in self?.editor.format("strikethrough") }, { $0.formats.contains("strikethrough") }),
      ("インラインコード", "code", "code", { [weak self] in self?.editor.format("code") }, { $0.formats.contains("code") }),
      ("箇条書き", "list", "bullet", { [weak self] in self?.editor.setBlock("bullet") }, { $0.listKind == "bullet" }),
      ("番号付きリスト", "list-ordered", "ordered", { [weak self] in self?.editor.setBlock("number") }, { $0.listKind == "number" }),
      ("リンク", "link", "link", { [weak self] in self?.editLink() }, { $0.link != nil }),
      ("画像", "image", "image", { [weak self] in self?.pickPhoto() }, { _ in false }),
    ]
    for (label, icon, identifier, action, selected) in items {
      let button = UIButton(type: .system, primaryAction: UIAction { _ in action() })
      button.setImage(UIImage(named: "editor-" + icon), for: .normal)
      button.accessibilityLabel = String(localized: String.LocalizationValue(label))
      button.accessibilityIdentifier = "editor." + identifier
      button.layer.cornerRadius = 6
      button.widthAnchor.constraint(equalToConstant: 40).isActive = true
      menu.addArrangedSubview(button)
      menuButtons.append((button, selected))
    }
    more.setImage(UIImage(systemName: "ellipsis"), for: .normal)
    more.accessibilityLabel = String(localized: "その他の編集操作")
    more.accessibilityIdentifier = "editor.more"
    more.showsMenuAsPrimaryAction = true
    more.widthAnchor.constraint(equalToConstant: 40).isActive = true
    menu.addArrangedSubview(more)
    let done = UIButton(
      type: .system, primaryAction: UIAction { [weak self] _ in self?.view.endEditing(true) })
    done.setImage(UIImage(systemName: "keyboard.chevron.compact.down"), for: .normal)
    done.accessibilityLabel = String(localized: "キーボードを閉じる")
    done.accessibilityIdentifier = "editor.done"
    done.translatesAutoresizingMaskIntoConstraints = false
    bar.addSubview(done)
    let border = UIView()
    border.backgroundColor = .separator
    border.translatesAutoresizingMaskIntoConstraints = false
    bar.addSubview(border)
    NSLayoutConstraint.activate([
      scroll.leadingAnchor.constraint(equalTo: bar.leadingAnchor),
      scroll.topAnchor.constraint(equalTo: bar.topAnchor),
      scroll.bottomAnchor.constraint(equalTo: bar.bottomAnchor),
      scroll.trailingAnchor.constraint(equalTo: done.leadingAnchor),
      menu.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor),
      menu.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor),
      menu.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor),
      menu.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor),
      menu.heightAnchor.constraint(equalTo: scroll.frameLayoutGuide.heightAnchor),
      done.widthAnchor.constraint(equalToConstant: 44),
      done.trailingAnchor.constraint(equalTo: bar.trailingAnchor),
      done.topAnchor.constraint(equalTo: bar.topAnchor),
      done.bottomAnchor.constraint(equalTo: bar.bottomAnchor),
      border.leadingAnchor.constraint(equalTo: bar.leadingAnchor),
      border.trailingAnchor.constraint(equalTo: bar.trailingAnchor),
      border.topAnchor.constraint(equalTo: bar.topAnchor),
      border.heightAnchor.constraint(equalToConstant: 0.5),
    ])
    return bar
  }

  private func updateMenu() {
    guard let editor else { return }
    let composing = editor.markedTextRange != nil
    for (button, selected) in menuButtons {
      let isSelected = selected(editor.snapshot)
      button.isEnabled = !composing
      button.isSelected = isSelected
      button.accessibilityTraits = isSelected ? [.button, .selected] : .button
      button.backgroundColor = isSelected ? .secondarySystemFill : .clear
      button.tintColor = isSelected ? .label : .secondaryLabel
    }
    more.isEnabled = !composing
    more.menu = UIMenu(children: [
      UIAction(title: String(localized: "段落")) { [weak self] _ in self?.editor.setBlock("paragraph") },
      UIAction(title: String(localized: "チェックリスト"), image: UIImage(named: "editor-list-todo")) {
        [weak self] _ in self?.editor.setBlock("check")
      },
      UIAction(title: String(localized: "引用"), image: UIImage(named: "editor-quote")) {
        [weak self] _ in self?.editor.setBlock("quote")
      },
      UIAction(title: String(localized: "コードブロック"), image: UIImage(named: "editor-square-code")) {
        [weak self] _ in self?.editor.setBlock("code")
      },
      UIAction(
        title: String(localized: "元に戻す"), image: UIImage(systemName: "arrow.uturn.backward"),
        attributes: editor.undoManager?.canUndo == true ? [] : .disabled
      ) { [weak self] _ in self?.editor.undoManager?.undo() },
      UIAction(
        title: String(localized: "やり直す"), image: UIImage(systemName: "arrow.uturn.forward"),
        attributes: editor.undoManager?.canRedo == true ? [] : .disabled
      ) { [weak self] _ in self?.editor.undoManager?.redo() },
    ])
  }

  // MARK: リンク・写真・表・原文

  private func editLink() {
    let selection = editor.selectedRange
    let alert = UIAlertController(
      title: String(localized: "リンク"), message: nil, preferredStyle: .alert)
    alert.addTextField { [current = editor.snapshot.link] field in
      field.placeholder = "URL"
      field.text = current
      field.keyboardType = .URL
      field.autocapitalizationType = .none
      field.autocorrectionType = .no
    }
    alert.addAction(
      UIAlertAction(title: String(localized: "キャンセル"), style: .cancel) { [weak self] _ in
        self?.editor.becomeFirstResponder()
      })
    alert.addAction(
      UIAlertAction(title: String(localized: "適用"), style: .default) { [weak self, weak alert] _ in
        guard let self else { return }
        self.editor.becomeFirstResponder()
        self.editor.selectedRange = selection
        self.editor.setLink(
          alert?.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "")
      })
    present(alert, animated: true)
  }

  private func pickPhoto() {
    var configuration = PHPickerConfiguration()
    configuration.filter = .images
    configuration.selectionLimit = 1
    let picker = PHPickerViewController(configuration: configuration)
    picker.delegate = self
    present(picker, animated: true)
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    let selection = editor.selectedRange
    guard let provider = results.first?.itemProvider, provider.canLoadObject(ofClass: UIImage.self)
    else {
      picker.dismiss(animated: true)
      return
    }
    // 写真が読み込めるまでモーダルを保ち、選択位置の本文が先に編集されるのを防ぐ。
    let loading = UIActivityIndicatorView(style: .large)
    loading.center = CGPoint(x: picker.view.bounds.midX, y: picker.view.bounds.midY)
    loading.accessibilityLabel = String(localized: "画像を読み込み中")
    picker.view.addSubview(loading)
    loading.startAnimating()
    provider.loadObject(ofClass: UIImage.self) { [weak self, weak picker] object, _ in
      let image = object as? UIImage
      Task { @MainActor in
        guard let self, let picker else { return }
        guard let image else {
          picker.dismiss(animated: true) { self.showError() }
          return
        }
        let name = "assets/\(UUID().uuidString).png"
        self.editor.images[name] = image
        self.editor.selectedRange = selection
        self.editor.insertImage(source: name, alt: String(localized: "写真"))
        picker.dismiss(animated: true)
      }
    }
  }

  private func showTable(_ unit: Int) {
    view.endEditing(true)
    let controller = UIViewController()
    controller.title = String(localized: "表を編集")
    controller.view.backgroundColor = .systemBackground
    let scroll = UIScrollView()
    scroll.translatesAutoresizingMaskIntoConstraints = false
    controller.view.addSubview(scroll)
    let grid = UIStackView()
    grid.axis = .vertical
    grid.spacing = 1
    grid.translatesAutoresizingMaskIntoConstraints = false
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
    for (row, cells) in editor.tableCells(unit).enumerated() {
      let rowView = UIStackView()
      rowView.distribution = .fillEqually
      rowView.spacing = 1
      for (column, markdown) in cells.enumerated() {
        // セルの書式はMarkdownの記法で編集し、確定したセルだけLexicalへ取り込む。
        let field = UITextField()
        field.text = markdown
        field.font = row == 0 ? .boldSystemFont(ofSize: 16) : .systemFont(ofSize: 16)
        field.backgroundColor = .secondarySystemBackground
        field.accessibilityIdentifier = "editor.table-cell"
        field.addAction(
          UIAction { [weak self, weak field] _ in
            self?.editor.setTableCell(
              unit: unit, row: row, column: column, markdown: field?.text ?? "")
          }, for: .editingDidEnd)
        field.widthAnchor.constraint(greaterThanOrEqualToConstant: 140).isActive = true
        field.heightAnchor.constraint(greaterThanOrEqualToConstant: 44).isActive = true
        rowView.addArrangedSubview(field)
      }
      grid.addArrangedSubview(rowView)
    }
    navigationController?.pushViewController(controller, animated: true)
  }

  private func showMarkdown() {
    view.endEditing(true)
    let controller = MarkdownSourceViewController(source: editor.snapshot.markdown) {
      [weak self] source in self?.editor.load(source)
    }
    navigationController?.pushViewController(controller, animated: true)
  }

  private func showError() {
    // 続けて拒否された操作の警告は、表示中の警告と重ねない。
    guard presentedViewController == nil else { return }
    let alert = UIAlertController(
      title: String(localized: "編集を反映できませんでした"),
      message: String(localized: "原稿を保持しています。Markdown表示で内容を確認してください。"), preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "OK", style: .default))
    present(alert, animated: true)
  }
}
