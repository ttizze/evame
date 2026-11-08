import SwiftUI

@main
struct PrototypeApp: App {
  var body: some Scene {
    WindowGroup { PrototypeScreen().ignoresSafeArea(edges: .bottom) }
  }
}

private struct PrototypeScreen: UIViewControllerRepresentable {
  func makeUIViewController(context: Context) -> UINavigationController {
    UINavigationController(rootViewController: LexicalEditorViewController())
  }

  func updateUIViewController(_ controller: UINavigationController, context: Context) {}
}
