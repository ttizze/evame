import UIKit
import WebKit

@main
final class VditorApp: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let window = UIWindow(frame: UIScreen.main.bounds)
    window.rootViewController = VditorViewController()
    window.makeKeyAndVisible()
    self.window = window
    return true
  }
}

@MainActor
final class VditorViewController: UIViewController, WKNavigationDelegate {
  let web = WKWebView()
  private let source = UITextView()
  private let status = UILabel()

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    web.navigationDelegate = self
    web.accessibilityIdentifier = "vditor.web"
    status.text = "読み込み中"
    status.accessibilityIdentifier = "vditor.status"
    source.isEditable = false
    source.isHidden = true
    source.font = .monospacedSystemFont(ofSize: 14, weight: .regular)
    source.accessibilityIdentifier = "vditor.source"
    let showSource = UIButton(type: .system)
    showSource.setTitle("原文", for: .normal)
    showSource.addAction(
      UIAction { [weak self] _ in
        guard let self else { return }
        Task { @MainActor in
          do {
            self.source.text =
              try await self.web.evaluateJavaScript("window.editor.getValue()") as? String
            self.source.isHidden.toggle()
          } catch { self.status.text = String(describing: error) }
        }
      }, for: .touchUpInside)
    let header = UIStackView(arrangedSubviews: [status, showSource])
    header.distribution = .fillEqually
    let toolbar = UIStackView()
    toolbar.accessibilityIdentifier = "vditor.keyboard-toolbar"
    toolbar.distribution = .fillEqually
    for (name, command) in [("太字", "bold"), ("斜体", "italic"), ("戻す", "undo"), ("やり直す", "redo")] {
      let button = UIButton(type: .system)
      button.setTitle(name, for: .normal)
      button.accessibilityIdentifier = "vditor.\(command)"
      button.addAction(
        UIAction { [weak self] _ in
          guard let self else { return }
          // Vditor 4.0.1 binds toolbar actions to touchstart on iPhone.
          // Reuse its own formatting/history action; do not implement Markdown here.
          self.web.evaluateJavaScript(
            "document.querySelector('.vditor-toolbar [data-type=\"\(command)\"]').dispatchEvent(new Event('touchstart', {bubbles:true,cancelable:true}))"
          ) { [weak self] _, error in
            if let error { self?.status.text = String(describing: error) }
          }
        }, for: .touchUpInside)
      toolbar.addArrangedSubview(button)
    }
    for child in [header, web, source, toolbar] {
      child.translatesAutoresizingMaskIntoConstraints = false
      view.addSubview(child)
    }
    NSLayoutConstraint.activate([
      header.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      header.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      header.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      header.heightAnchor.constraint(equalToConstant: 40),
      web.topAnchor.constraint(equalTo: header.bottomAnchor),
      web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      web.bottomAnchor.constraint(equalTo: toolbar.topAnchor),
      toolbar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      toolbar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      toolbar.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
      toolbar.heightAnchor.constraint(equalToConstant: 44),
      source.topAnchor.constraint(equalTo: header.bottomAnchor),
      source.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      source.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      source.bottomAnchor.constraint(equalTo: toolbar.topAnchor),
    ])
    let url = Bundle.main.url(
      forResource: "index", withExtension: "html", subdirectory: "vditor-web")!
    web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    let arguments = ProcessInfo.processInfo.arguments
    let index = arguments.firstIndex(of: "--sample")
    let sample = index.flatMap { arguments.indices.contains($0 + 1) ? arguments[$0 + 1] : nil }
    let markdown = sample == "list" ? "- \n" : "日本語English\n"
    Task { @MainActor in
      do {
        _ = try await web.callAsyncJavaScript(
          "await window.ready; window.editor.setValue(markdown, true); document.querySelector('.vditor-toolbar').style.display='none'; return true;",
          arguments: ["markdown": markdown], in: nil, contentWorld: .page)
        status.text = "準備完了"
      } catch { status.text = String(describing: error) }
    }
  }

  func webView(
    _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction
  ) async -> WKNavigationActionPolicy {
    navigationAction.request.url?.isFileURL == true ? .allow : .cancel
  }
}
