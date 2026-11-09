import WebKit
import XCTest

@testable import VditorProbe

@MainActor
final class VditorWKTests: XCTestCase {
  func test実際のWKWebViewでも公式全例の保存結果を記録する() async throws {
    let app = try XCTUnwrap(UIApplication.shared.delegate as? VditorApp)
    let controller = try XCTUnwrap(app.window?.rootViewController as? VditorViewController)
    let web = controller.web
    let deadline = Date().addingTimeInterval(15)
    while Date() < deadline {
      if (try? await web.evaluateJavaScript(
        "typeof window.runCorpus === 'function' && typeof window.ready !== 'undefined'")) as? Bool
        == true
      {
        break
      }
      try await Task.sleep(for: .milliseconds(50))
    }
    let rows = try await web.callAsyncJavaScript(
      "return await window.runCorpus();", arguments: [:], in: nil, contentWorld: .page)
    let cases = try XCTUnwrap(rows as? [[String: Any]])
    XCTAssertEqual(cases.count, 1329)
    XCTAssertEqual(cases.filter { $0["error"] != nil }.count, 0)
    let directory = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(
      "evame-vditor-\(UUID().uuidString)")
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let output = directory.appendingPathComponent("wk-corpus.json")
    try JSONSerialization.data(withJSONObject: cases, options: [.sortedKeys]).write(to: output)
    print("VDITOR_WK_CORPUS \(output.path)")
  }
}
