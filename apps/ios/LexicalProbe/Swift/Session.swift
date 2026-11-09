import Foundation
import JavaScriptCore

final class LexicalSession {
  enum Failure: Error {
    case javascript(String)
    case invalidResponse
  }
  private let context: JSContext

  init(_ mode: String) throws {
    #if SWIFT_PACKAGE
      let bundle = Bundle.module
    #else
      let bundle = Bundle(for: LexicalSession.self)
    #endif
    guard let url = bundle.url(forResource: mode, withExtension: "js", subdirectory: "Generated"),
      let context = JSContext()
    else { throw Failure.invalidResponse }
    self.context = context
    context.evaluateScript(try String(contentsOf: url, encoding: .utf8))
    if let exception = context.exception { throw Failure.javascript(exception.toString()) }
  }

  func request(_ input: [String: Any]) throws -> [String: Any] {
    context.exception = nil
    let data = try JSONSerialization.data(withJSONObject: input)
    let result = context.objectForKeyedSubscript("evameLexicalRequest")?.call(
      withArguments: [String(decoding: data, as: UTF8.self)])
    if let exception = context.exception { throw Failure.javascript(exception.toString()) }
    guard let json = result?.toString(),
      let result = try JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any]
    else { throw Failure.invalidResponse }
    return result
  }
}
