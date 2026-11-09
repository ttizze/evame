import Foundation
import JavaScriptCore
import Testing

@Test("同梱する編集モデルの全操作ケースをiPhoneと同じJavaScriptCoreで実行する")
func upstreamEditingCommands() throws {
  #if SWIFT_PACKAGE
    let bundle = Bundle.module
    let subdirectory: String? = "Fixtures/Upstream"
  #else
    let bundle = try #require(
      Bundle.allBundles.first { $0.bundleURL.lastPathComponent == "NativeTests.xctest" })
    let subdirectory: String? = nil
  #endif
  let url = try #require(
    bundle.url(forResource: "ProseMirrorTests", withExtension: "js", subdirectory: subdirectory))
  let catalog = try #require(
    bundle.url(forResource: "prosemirror-cases", withExtension: "json", subdirectory: subdirectory))
  let cases = try #require(
    try JSONSerialization.jsonObject(with: Data(contentsOf: catalog)) as? [[String: Any]])
  let context = try #require(JSContext())
  context.evaluateScript(try String(contentsOf: url, encoding: .utf8))
  #expect(context.exception == nil)
  let json = try #require(context.objectForKeyedSubscript("evameReferenceResults")?.toString())
  let data = try #require(json.data(using: .utf8))
  let results = try #require(try JSONSerialization.jsonObject(with: data) as? [[String: Any]])
  #expect(cases.count == 133)
  #expect(results.count == cases.count)
  for (result, reference) in zip(results, cases) {
    #expect(result["command"] as? String == reference["command"] as? String)
    #expect(result["name"] as? String == reference["name"] as? String)
    #expect(
      result["error"] is NSNull,
      "\(result["command"] ?? ""): \(result["name"] ?? ""): \(result["error"] ?? "")")
  }
}
