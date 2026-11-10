import SwiftUI

@main
struct PrototypeApp: App {
  var body: some Scene {
    WindowGroup { PrototypeScreen().ignoresSafeArea(edges: .bottom) }
  }
}

private struct PrototypeScreen: UIViewControllerRepresentable {
  func makeUIViewController(context: Context) -> UINavigationController {
    guard let store = try? openStore() else {
      let failure = UIViewController()
      let label = UILabel()
      label.text = String(localized: "端末の保存領域を開けませんでした")
      label.textAlignment = .center
      failure.view = label
      return UINavigationController(rootViewController: failure)
    }
    return UINavigationController(rootViewController: DocumentListViewController(store: store))
  }

  func updateUIViewController(_ controller: UINavigationController, context: Context) {}

  /// 端末の保存領域を開く。UIテストは起動引数で保存領域を空にし、共通のテスト文書を入れて始める。
  @MainActor
  private func openStore() throws -> LocalStore {
    let directory = URL.applicationSupportDirectory.appending(path: "Evame")
    #if DEBUG
      // 配布版では保存領域を消す引数を受け付けない。
      let arguments = ProcessInfo.processInfo.arguments
      if arguments.contains("-UITestResetStore") {
        try? FileManager.default.removeItem(at: directory)
      }
    #endif
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let store = try LocalStore(directory: directory)
    #if DEBUG
      if arguments.contains("-UITestSampleDocument"),
        let url = Bundle.main.url(forResource: "round-trip", withExtension: "md")
      {
        let document = try store.createDocument()
        try store.save(
          id: document.id, title: "共通テスト文書", body: try String(contentsOf: url, encoding: .utf8))
      }
    #endif
    return store
  }
}
