import Foundation
import JavaScriptCore

/// JavaScriptCore上のLexical文書。PCと同じMarkdown変換と編集操作を持ち、画面へは表示単位だけを返す。
@MainActor
final class LexicalDocument {
  enum Failure: Error {
    case missingModel
    case javascript(String)
  }

  private let context: JSContext

  init() throws {
    guard let url = Bundle.main.url(forResource: "LexicalModel", withExtension: "js"),
      let context = JSContext()
    else { throw Failure.missingModel }
    self.context = context
    context.evaluateScript(try String(contentsOf: url, encoding: .utf8))
    if let exception = context.exception { throw Failure.javascript(exception.toString()) }
  }

  func request(_ input: [String: Any]) throws -> Snapshot {
    context.exception = nil
    let data = try JSONSerialization.data(withJSONObject: input)
    let result = context.objectForKeyedSubscript("evameEditorRequest")?.call(
      withArguments: [String(decoding: data, as: UTF8.self)])
    if let exception = context.exception { throw Failure.javascript(exception.toString()) }
    return try JSONDecoder().decode(Snapshot.self, from: Data((result?.toString() ?? "").utf8))
  }

  struct Snapshot: Decodable {
    let markdown: String
    let undoDepth: Int
    let units: [Unit]
    let selection: Selection?
    let formats: [String]
    let blockType: String?
    let link: String?
    /// 装飾ノード（区切り線・画像など）を選択している。
    let nodeSelected: Bool
    /// Lexicalが操作を拒否した理由。文書はLexicalが戻した後の状態。
    let failure: String?
    let clipboard: [String: String?]?
    let cells: [[String]]?
  }

  struct Unit: Decodable {
    let block: Block?
    let runs: [Run]?
    let atomic: Decorator?
    let context: Context
    let listItems: [ListItem]
  }

  struct Block: Decodable {
    let type: String
    let level: Int?
  }

  struct ListItem: Decodable {
    let label: String
    let checked: Bool?
    let value: Int
    let depth: Int
    let quote: Int
    let footnote: Bool
  }

  struct Run: Decodable {
    let text: String?
    let formats: [String]?
    let link: String?
    let decorator: Decorator?
  }

  struct Decorator: Decodable {
    let type: String
    let src: String?
    let alt: String?
    let url: String?
    let value: String?
    let identifier: String?
    let label: String?
    let rows: Int?
    let columns: Int?
  }

  struct Context: Decodable {
    let lists: [List]
    let quote: Int
    let footnote: String?

    struct List: Decodable {
      let kind: String
    }
  }

  struct Selection: Decodable {
    let anchor: Position
    let focus: Position
  }

  struct Position: Decodable {
    let unit: Int
    let offset: Int
  }
}
