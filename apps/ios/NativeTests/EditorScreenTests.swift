import Foundation
import Testing
import UIKit

@testable import EvameEditorPrototype

@MainActor
struct EditorScreenTests {
  private func store() throws -> LocalStore {
    let url = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    return try LocalStore(directory: url)
  }

  @Test("文書を開いて何も変えずに閉じても、本文の整形だけで保存せず更新日時も変わらない")
  func openAndCloseKeepsDocument() throws {
    let store = try store()
    let created = try store.createDocument()
    // 表の列幅などはLexicalの書き出しで整形されるが、開いただけでは利用者の変更ではない。
    try store.save(id: created.id, title: "題", body: "| a | bb |\n| - | - |\n| ccc | d |")
    let saved = try #require(try store.document(id: created.id))
    let controller = LexicalEditorViewController(store: store, document: saved)
    controller.loadViewIfNeeded()
    controller.viewWillDisappear(false)
    #expect(try store.document(id: created.id) == saved)
  }
}
