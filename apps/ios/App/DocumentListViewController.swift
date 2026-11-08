import UIKit

/// 端末に保存した文書の一覧。新しい文書を作り、選んだ文書の編集画面を開く。
@MainActor
final class DocumentListViewController: UITableViewController {
  private let store: LocalStore
  private var documents: [StoredDocument] = []

  init(store: LocalStore) {
    self.store = store
    super.init(style: .insetGrouped)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  override func viewDidLoad() {
    super.viewDidLoad()
    title = String(localized: "文書")
    navigationController?.navigationBar.prefersLargeTitles = true
    tableView.register(UITableViewCell.self, forCellReuseIdentifier: "document")
    navigationItem.rightBarButtonItem = UIBarButtonItem(
      systemItem: .add, primaryAction: UIAction { [weak self] _ in self?.createDocument() })
    navigationItem.rightBarButtonItem?.accessibilityLabel = String(localized: "新しい文書")
    navigationItem.rightBarButtonItem?.accessibilityIdentifier = "documents.new"
  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    // 読み取りに失敗したときは、文書がない状態と区別して伝える。
    let message: String?
    do {
      documents = try store.documents()
      message = documents.isEmpty ? String(localized: "文書がありません") : nil
    } catch {
      documents = []
      message = String(localized: "端末の保存領域を開けませんでした")
    }
    tableView.reloadData()
    let label = UILabel()
    label.text = message
    label.textAlignment = .center
    label.textColor = .secondaryLabel
    label.numberOfLines = 0
    tableView.backgroundView = message == nil ? nil : label
  }

  private func createDocument() {
    do {
      open(try store.createDocument())
    } catch {
      let alert = UIAlertController(
        title: String(localized: "端末に保存できませんでした"), message: nil, preferredStyle: .alert)
      alert.addAction(UIAlertAction(title: "OK", style: .default))
      present(alert, animated: true)
    }
  }

  private func open(_ document: StoredDocument) {
    navigationController?.pushViewController(
      LexicalEditorViewController(store: store, document: document), animated: true)
  }

  override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    documents.count
  }

  override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath)
    -> UITableViewCell
  {
    let document = documents[indexPath.row]
    let cell = tableView.dequeueReusableCell(withIdentifier: "document", for: indexPath)
    var content = UIListContentConfiguration.subtitleCell()
    content.text = document.title.isEmpty ? String(localized: "無題") : document.title
    content.secondaryText = document.updatedAt.formatted(date: .abbreviated, time: .shortened)
    content.secondaryTextProperties.color = .secondaryLabel
    cell.contentConfiguration = content
    cell.accessoryType = .disclosureIndicator
    cell.accessibilityIdentifier = "documents.row"
    return cell
  }

  override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    tableView.deselectRow(at: indexPath, animated: true)
    open(documents[indexPath.row])
  }
}
