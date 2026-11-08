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
    documents = (try? store.documents()) ?? []
    tableView.reloadData()
    let empty = UILabel()
    empty.text = String(localized: "文書がありません")
    empty.textAlignment = .center
    empty.textColor = .secondaryLabel
    tableView.backgroundView = documents.isEmpty ? empty : nil
  }

  private func createDocument() {
    guard let document = try? store.createDocument() else { return }
    open(document)
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
    content.secondaryText =
      (document.status == "PUBLIC" ? String(localized: "公開中") : String(localized: "下書き"))
      + " · " + document.updatedAt.formatted(date: .abbreviated, time: .shortened)
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
