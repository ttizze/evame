import EditorCore
import Markdown
import UIKit

/// Webの48pxのアイコン列を、選択を奪わないキーボードアクセサリとして表示する。
@MainActor
final class EditorKeyboardMenu: UIView {
  enum Command {
    case block(MarkdownDocument.BlockAction)
    case format(NSAttributedString.Key)
    case image, link, undo, redo, done
    case markdown(any Markdown.Markup, [Int], NSRange, [any InlineMarkup])
    case split([any InlineMarkup], [any InlineMarkup])
  }

  private let more = UIButton(type: .system)
  private var commands: [(UIButton, Command)] = []

  init(onCommand: @escaping (Command) -> Void) {
    super.init(frame: CGRect(x: 0, y: 0, width: 0, height: 48))
    autoresizingMask = [.flexibleWidth]
    backgroundColor = .systemBackground
    accessibilityIdentifier = "editor.keyboard-menu"
    let scroll = UIScrollView()
    scroll.accessibilityIdentifier = "editor.keyboard-actions"
    scroll.showsHorizontalScrollIndicator = false
    scroll.translatesAutoresizingMaskIntoConstraints = false
    addSubview(scroll)
    let buttons = UIStackView()
    buttons.axis = .horizontal
    buttons.translatesAutoresizingMaskIntoConstraints = false
    scroll.addSubview(buttons)
    let items: [(Command, String, String, String)] = [
      (.block(.indent), String(localized: "字下げ"), "indent-increase", "indent"),
      (.block(.outdent), String(localized: "字下げを戻す"), "indent-decrease", "outdent"),
      (.block(.heading(2)), String(localized: "見出し2"), "heading-2", "h2"),
      (.block(.heading(3)), String(localized: "見出し3"), "heading-3", "h3"),
      (.block(.heading(4)), String(localized: "見出し4"), "heading-4", "h4"),
      (.format(.editorStrong), String(localized: "太字"), "bold", "bold"),
      (.format(.editorEmphasis), String(localized: "斜体"), "italic", "italic"),
      (.format(.strikethroughStyle), String(localized: "取消線"), "strikethrough", "strike"),
      (.format(.editorCode), String(localized: "インラインコード"), "code", "code"),
      (.block(.bulletList), String(localized: "箇条書き"), "list", "bullet"),
      (.block(.orderedList), String(localized: "番号付きリスト"), "list-ordered", "ordered"),
      (.link, String(localized: "リンク"), "link", "link"),
      (.image, String(localized: "画像"), "image", "image"),
    ]
    for (command, label, icon, identifier) in items {
      let button = UIButton(type: .system)
      button.setImage(UIImage(named: "editor-" + icon), for: .normal)
      button.accessibilityLabel = label
      button.accessibilityIdentifier = "editor." + identifier
      button.tintColor = .secondaryLabel
      button.layer.cornerRadius = 6
      button.widthAnchor.constraint(equalToConstant: 40).isActive = true
      button.addAction(UIAction { _ in onCommand(command) }, for: .touchUpInside)
      buttons.addArrangedSubview(button)
      commands.append((button, command))
    }
    more.setImage(UIImage(systemName: "ellipsis"), for: .normal)
    more.accessibilityLabel = String(localized: "その他の編集操作")
    more.accessibilityIdentifier = "editor.more"
    more.showsMenuAsPrimaryAction = true
    more.widthAnchor.constraint(equalToConstant: 40).isActive = true
    buttons.addArrangedSubview(more)
    let done = UIButton(type: .system)
    done.setImage(UIImage(systemName: "keyboard.chevron.compact.down"), for: .normal)
    done.accessibilityLabel = String(localized: "キーボードを閉じる")
    done.accessibilityIdentifier = "editor.done"
    done.translatesAutoresizingMaskIntoConstraints = false
    done.addAction(UIAction { _ in onCommand(.done) }, for: .touchUpInside)
    addSubview(done)
    let border = UIView()
    border.backgroundColor = .separator
    border.translatesAutoresizingMaskIntoConstraints = false
    addSubview(border)
    NSLayoutConstraint.activate([
      scroll.leadingAnchor.constraint(equalTo: leadingAnchor),
      scroll.topAnchor.constraint(equalTo: topAnchor),
      scroll.bottomAnchor.constraint(equalTo: bottomAnchor),
      scroll.trailingAnchor.constraint(equalTo: done.leadingAnchor),
      buttons.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor),
      buttons.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor),
      buttons.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor),
      buttons.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor),
      buttons.heightAnchor.constraint(equalTo: scroll.frameLayoutGuide.heightAnchor),
      done.widthAnchor.constraint(equalToConstant: 44),
      done.trailingAnchor.constraint(equalTo: trailingAnchor),
      done.topAnchor.constraint(equalTo: topAnchor),
      done.bottomAnchor.constraint(equalTo: bottomAnchor),
      border.leadingAnchor.constraint(equalTo: leadingAnchor),
      border.trailingAnchor.constraint(equalTo: trailingAnchor),
      border.topAnchor.constraint(equalTo: topAnchor),
      border.heightAnchor.constraint(equalToConstant: 0.5),
    ])
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
  override var intrinsicContentSize: CGSize { CGSize(width: UIView.noIntrinsicMetric, height: 48) }

  func update(
    blockActions: (
      enabled: Set<MarkdownDocument.BlockAction>, selected: Set<MarkdownDocument.BlockAction>
    ),
    formats: Set<NSAttributedString.Key>, allowsInline: Bool, canFormatCode: Bool,
    isComposing: Bool, moreMenu: UIMenu
  ) {
    for (button, command) in commands {
      let enabled: Bool
      let selected: Bool
      switch command {
      case .block(let action):
        enabled = blockActions.enabled.contains(action)
        selected = blockActions.selected.contains(action)
      case .format(let key):
        enabled = allowsInline && (key != .editorCode || canFormatCode)
        selected = formats.contains(key)
      default:
        enabled = allowsInline
        selected = false
      }
      button.isEnabled = enabled && !isComposing
      button.isSelected = selected
      button.accessibilityTraits = selected ? [.button, .selected] : .button
      button.backgroundColor = selected ? .secondarySystemFill : .clear
      button.tintColor = selected ? .label : .secondaryLabel
    }
    more.menu = moreMenu
    more.isEnabled = !isComposing
  }
}
