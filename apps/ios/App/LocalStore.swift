import Foundation
import SQLite3

/// 端末に保存した文書。
struct StoredDocument: Equatable {
  let id: UUID
  let slug: String
  let title: String
  let body: String
  let updatedAt: Date
}

/// 文書をSQLite、写真をアプリのファイル領域へ保存する。ネットワークの成否に関係なく、編集はここへ保存した時点で残る。
@MainActor
final class LocalStore {
  // 閉じる処理だけを終了時に行う。接続はメインスレッドからだけ使う。
  nonisolated(unsafe) private let database: OpaquePointer
  private let imageDirectory: URL

  /// 保存形式の移行。`PRAGMA user_version`に適用済みの数を記録し、未適用のものだけを順に適用する。
  private static let migrations = [
    """
    CREATE TABLE documents (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      updated_at REAL NOT NULL
    )
    """
  ]

  init(directory: URL) throws {
    imageDirectory = directory.appending(path: "images")
    try FileManager.default.createDirectory(at: imageDirectory, withIntermediateDirectories: true)
    var handle: OpaquePointer?
    guard sqlite3_open(directory.appending(path: "documents.sqlite").path, &handle) == SQLITE_OK,
      let handle
    else { throw StoreError.open }
    database = handle
    let applied = try version()
    for (index, migration) in Self.migrations.enumerated() where index >= applied {
      try execute("BEGIN")
      do {
        try execute(migration)
        try execute("PRAGMA user_version = \(index + 1)")
        try execute("COMMIT")
      } catch {
        try? execute("ROLLBACK")
        throw error
      }
    }
  }

  deinit { sqlite3_close(database) }

  enum StoreError: Error {
    case open
    case sqlite(String)
  }

  private static let columns = "id, slug, title, body, updated_at"

  func documents() throws -> [StoredDocument] {
    try query("SELECT \(Self.columns) FROM documents ORDER BY updated_at DESC, rowid DESC")
  }

  func document(id: UUID) throws -> StoredDocument? {
    try query("SELECT \(Self.columns) FROM documents WHERE id = ?", [id.uuidString]).first
  }

  /// Webの新規作成と同じ形（英小文字と数字の12文字）のslugで、空の文書を作る。
  func createDocument() throws -> StoredDocument {
    let alphabet = Array("0123456789abcdefghijklmnopqrstuvwxyz")
    let slug = String((0..<12).map { _ in alphabet.randomElement()! })
    let id = UUID()
    try execute(
      "INSERT INTO documents (id, slug, title, body, updated_at) VALUES (?, ?, '', '', ?)",
      [id.uuidString, slug, Date().timeIntervalSince1970])
    return try document(id: id)!
  }

  /// 題名と本文を保存する。内容が変わったときだけ更新日時を進める。
  func save(id: UUID, title: String, body: String) throws {
    try execute(
      """
      UPDATE documents SET title = ?, body = ?, updated_at = ?
      WHERE id = ? AND (title != ? OR body != ?)
      """,
      [title, body, Date().timeIntervalSince1970, id.uuidString, title, body])
  }

  /// 写真をファイルとして保存し、本文から参照する名前を返す。
  func saveImage(_ data: Data) throws -> String {
    let name = "\(UUID().uuidString).jpg"
    try data.write(to: imageDirectory.appending(path: name), options: .atomic)
    return "local-image/\(name)"
  }

  /// 本文の画像の参照名が端末に保存した写真なら、そのファイルを返す。
  func imageFile(_ source: String) -> URL? {
    guard source.wholeMatch(of: /local-image\/[0-9A-F-]{36}\.jpg/) != nil else { return nil }
    return imageDirectory.appending(path: String(source.dropFirst("local-image/".count)))
  }

  // MARK: SQLite

  private func version() throws -> Int {
    let statement = try prepare("PRAGMA user_version", [])
    defer { sqlite3_finalize(statement) }
    guard sqlite3_step(statement) == SQLITE_ROW else { throw error() }
    return Int(sqlite3_column_int64(statement, 0))
  }

  private func execute(_ sql: String, _ values: [Any] = []) throws {
    let statement = try prepare(sql, values)
    defer { sqlite3_finalize(statement) }
    guard sqlite3_step(statement) == SQLITE_DONE else { throw error() }
  }

  private func query(_ sql: String, _ values: [Any] = []) throws -> [StoredDocument] {
    let statement = try prepare(sql, values)
    defer { sqlite3_finalize(statement) }
    var rows: [StoredDocument] = []
    var step = sqlite3_step(statement)
    while step == SQLITE_ROW {
      let text = { (column: Int32) in String(cString: sqlite3_column_text(statement, column)) }
      guard let id = UUID(uuidString: text(0)) else { throw error() }
      rows.append(
        StoredDocument(
          id: id, slug: text(1), title: text(2), body: text(3),
          updatedAt: Date(timeIntervalSince1970: sqlite3_column_double(statement, 4))))
      step = sqlite3_step(statement)
    }
    // 途中でエラーになった読み取りを、行が少ない成功として返さない。
    guard step == SQLITE_DONE else { throw error() }
    return rows
  }

  private func prepare(_ sql: String, _ values: [Any]) throws -> OpaquePointer? {
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK else {
      throw error()
    }
    // SQLiteが文字列を読み終える前に解放しないよう、コピーを指示する。
    let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
    for (index, value) in values.enumerated() {
      let position = Int32(index + 1)
      switch value {
      case let text as String: sqlite3_bind_text(statement, position, text, -1, transient)
      case let number as Double: sqlite3_bind_double(statement, position, number)
      default: sqlite3_bind_null(statement, position)
      }
    }
    return statement
  }

  private func error() -> StoreError {
    StoreError.sqlite(String(cString: sqlite3_errmsg(database)))
  }
}
