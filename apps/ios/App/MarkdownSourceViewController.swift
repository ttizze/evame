import UIKit

/// CommonMark/GFM全体を直接編集できる原文画面。本文の所有者へ確定した原文だけを返す。
@MainActor
final class MarkdownSourceViewController: UIViewController, UITextViewDelegate {
  private let text = UITextView()
  private var committed: String
  private let onChange: (String) -> Void

  init(source: String, onChange: @escaping (String) -> Void) {
    committed = source
    self.onChange = onChange
    super.init(nibName: nil, bundle: nil)
    title = "Markdown"
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    text.translatesAutoresizingMaskIntoConstraints = false
    text.font = .monospacedSystemFont(ofSize: 15, weight: .regular)
    text.text = committed
    text.delegate = self
    text.accessibilityLabel = String(localized: "Markdown原文")
    text.accessibilityIdentifier = "editor.markdown-source"
    text.autocorrectionType = .no
    text.smartQuotesType = .no
    text.smartDashesType = .no
    text.textContainerInset = UIEdgeInsets(top: 16, left: 16, bottom: 24, right: 16)
    view.addSubview(text)
    NSLayoutConstraint.activate([
      text.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      text.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      text.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      text.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
    ])
    navigationItem.rightBarButtonItem = UIBarButtonItem(
      systemItem: .done,
      primaryAction: UIAction { [weak self] _ in
        self?.view.endEditing(true)
        self?.navigationController?.popViewController(animated: true)
      })
    navigationItem.rightBarButtonItem?.accessibilityIdentifier = "editor.source.done"
  }

  func textViewDidChange(_ textView: UITextView) {
    guard textView.markedTextRange == nil, textView.text != committed else { return }
    committed = textView.text
    onChange(committed)
  }

  func textViewDidEndEditing(_ textView: UITextView) { textViewDidChange(textView) }
}
