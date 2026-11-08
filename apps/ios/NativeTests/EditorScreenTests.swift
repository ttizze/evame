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

  @Test("本文の日本語を変換中のまま画面を閉じても、未確定の文字を確定して保存する")
  func closeWhileComposing() throws {
    let store = try store()
    let document = try store.createDocument()
    let controller = LexicalEditorViewController(store: store, document: document)
    let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    window.rootViewController = UINavigationController(rootViewController: controller)
    window.makeKeyAndVisible()
    defer { window.isHidden = true }
    let editor = try #require(
      controller.view.subviews.first { $0.accessibilityIdentifier == "editor.text" } as? UITextView)
    _ = editor.becomeFirstResponder()
    editor.setMarkedText("かな", selectedRange: NSRange(location: 2, length: 0))
    #expect(editor.markedTextRange != nil)
    controller.viewWillDisappear(false)
    #expect(try store.document(id: document.id)?.body.contains("かな") == true)
  }
}
