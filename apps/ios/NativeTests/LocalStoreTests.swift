import Foundation
import Testing

@testable import EvameEditorPrototype

@MainActor
struct LocalStoreTests {
  private func directory() throws -> URL {
    let url = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    return url
  }

  @Test("新しい文書はWebと同じ形のslugを持つ空の下書きとして一覧に出る")
  func createDocument() throws {
    let store = try LocalStore(directory: directory())
    let document = try store.createDocument()
    #expect(document.slug.wholeMatch(of: /[0-9a-z]{12}/) != nil)
    #expect(document.title == "")
    #expect(document.body == "")
    #expect(try store.documents().map(\.id) == [document.id])
  }

  @Test("題名と本文を保存すると更新日時が進み、同じ内容を保存しても進まない")
  func saveDraft() throws {
    let store = try LocalStore(directory: directory())
    let document = try store.createDocument()
    try store.save(id: document.id, title: "題名", body: "本文")
    let saved = try #require(try store.document(id: document.id))
    #expect(saved.title == "題名")
    #expect(saved.body == "本文")
    #expect(saved.updatedAt > document.updatedAt)
    try store.save(id: document.id, title: "題名", body: "本文")
    #expect(try store.document(id: document.id) == saved)
  }

  @Test("アプリを終了して開き直しても、保存した文書が残る")
  func persistence() throws {
    let url = try directory()
    let id = try {
      let store = try LocalStore(directory: url)
      let document = try store.createDocument()
      try store.save(id: document.id, title: "残る題名", body: "残る本文")
      return document.id
    }()
    let reopened = try LocalStore(directory: url)
    #expect(try reopened.document(id: id)?.title == "残る題名")
    #expect(try reopened.document(id: id)?.body == "残る本文")
  }

  @Test("一覧は最後に編集した文書から並ぶ")
  func order() throws {
    let store = try LocalStore(directory: directory())
    let first = try store.createDocument()
    let second = try store.createDocument()
    try store.save(id: first.id, title: "後で編集", body: "")
    #expect(try store.documents().map(\.id) == [first.id, second.id])
  }

  @Test("写真をファイルとして保存し、本文から参照する名前で読み出せる")
  func images() throws {
    let store = try LocalStore(directory: directory())
    let data = Data([0xFF, 0xD8, 0xFF, 0xD9])
    let source = try store.saveImage(data)
    #expect(source.wholeMatch(of: /local-image\/[0-9A-F-]{36}\.jpg/) != nil)
    #expect(FileManager.default.contents(atPath: try #require(store.imageFile(source)).path) == data)
    #expect(store.imageFile("https://example.com/a.jpg") == nil)
    #expect(store.imageFile("local-image/../documents.sqlite") == nil)
  }
}
