import Foundation
import SQLite3
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

  @Test("保存失敗後に変更を戻した場合も、一覧から再編集して再試行できる", arguments: [false, true])
  func failedSaveKeepsDraft(_ revert: Bool) throws {
    let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    let store = try LocalStore(directory: directory)
    let document = try store.createDocument()
    let (controller, window) = openInWindow(store, document)
    defer { window.isHidden = true }
    let editor: UITextView = try #require(view("editor.text", in: controller.view))
    let title: UITextField = try #require(view("editor.title", in: controller.view))
    title.text = "未保存の題名"
    editor.insertText("未保存の本文")
    var blocker: OpaquePointer?
    #expect(sqlite3_open(directory.appending(path: "documents.sqlite").path, &blocker) == SQLITE_OK)
    defer { sqlite3_exec(blocker, "ROLLBACK", nil, nil, nil); sqlite3_close(blocker) }
    #expect(sqlite3_exec(blocker, "BEGIN IMMEDIATE", nil, nil, nil) == SQLITE_OK)
    // ウインドウの初回表示が完了する前でも、実際に閉じるときのライフサイクルを確実に送る。
    controller.viewWillDisappear(false)
    if revert {
      title.text = ""
      editor.selectedRange = NSRange(location: 0, length: editor.text.utf16.count)
      editor.insertText("")
      controller.viewWillDisappear(false)
    }
    let expectedTitle = revert ? "" : "未保存の題名"
    let expectedBody = revert ? "" : "未保存の本文"
    #expect(try store.document(id: document.id)?.body == "")
    window.isHidden = true
    let (reopened, reopenedWindow) = openInWindow(store, try #require(try store.document(id: document.id)))
    defer { reopenedWindow.isHidden = true }
    let restoredEditor: UITextView = try #require(view("editor.text", in: reopened.view))
    let restoredTitle: UITextField = try #require(view("editor.title", in: reopened.view))
    #expect(restoredTitle.text == expectedTitle)
    #expect(restoredEditor.text == expectedBody)
    #expect(sqlite3_exec(blocker, "ROLLBACK", nil, nil, nil) == SQLITE_OK)
    reopened.viewWillDisappear(false)
    #expect(try store.document(id: document.id)?.title == expectedTitle)
    #expect(try store.document(id: document.id)?.body == expectedBody)
    #expect(store.unsavedDrafts[document.id] == nil)
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

  private func openInWindow(_ store: LocalStore, _ document: StoredDocument) -> (
    LexicalEditorViewController, UIWindow
  ) {
    let controller = LexicalEditorViewController(store: store, document: document)
    let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    window.rootViewController = UINavigationController(rootViewController: controller)
    window.makeKeyAndVisible()
    return (controller, window)
  }

  private func view<T: UIView>(_ identifier: String, in root: UIView) -> T? {
    var pending = [root]
    while let view = pending.popLast() {
      if view.accessibilityIdentifier == identifier, let found = view as? T { return found }
      pending += view.subviews
    }
    return nil
  }

  @Test("入力の直後にアプリが裏へ回ると、保存の待ち時間を待たずにすぐ保存する")
  func saveOnBackground() throws {
    let store = try store()
    let document = try store.createDocument()
    let (controller, window) = openInWindow(store, document)
    defer { window.isHidden = true }
    let editor: UITextView = try #require(view("editor.text", in: controller.view))
    _ = editor.becomeFirstResponder()
    editor.insertText("裏へ回る直前")
    NotificationCenter.default.post(name: UIApplication.didEnterBackgroundNotification, object: nil)
    #expect(try store.document(id: document.id)?.body.contains("裏へ回る直前") == true)
  }

  @Test("題名を変換中のまま画面を閉じても、未確定の文字を確定して保存する")
  func closeWhileComposingTitle() throws {
    let store = try store()
    let document = try store.createDocument()
    let (controller, window) = openInWindow(store, document)
    defer { window.isHidden = true }
    let title: UITextField = try #require(view("editor.title", in: controller.view))
    _ = title.becomeFirstResponder()
    title.setMarkedText("だいめい", selectedRange: NSRange(location: 4, length: 0))
    controller.viewWillDisappear(false)
    #expect(title.markedTextRange == nil)
    #expect(try store.document(id: document.id)?.title == "だいめい")
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
