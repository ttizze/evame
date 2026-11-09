import Foundation
import Markdown
import Testing

let lexicalModes = ["legacy", "mdast", "pc"]

@Test("同じ本文を読み込んで日本語を入力し保存する", arguments: lexicalModes)
func lexicalInsert(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "本文"])
  _ = try session.request(["action": "select", "field": 0, "start": 2, "end": 2])
  let result = try session.request(["action": "insert", "text": "続き"])
  #expect(result["text"] as? String == "本文続き")
  #expect((result["markdown"] as? String)?.trimmingCharacters(in: .newlines) == "本文続き")
}

@Test("文字のあるリスト項目の改行で同じ種類と深さの次項目を作る", arguments: lexicalModes)
func lexicalListReturn(_ mode: String) throws {
  for source in ["- 項目", "3. 項目", "- 親\n  - 子", "- [ ] 項目"] {
    let session = try LexicalSession(mode)
    let initial = try session.request(["action": "load", "source": source])
    let fields = try #require(initial["fields"] as? [[String: Any]])
    let index = fields.count - 1
    let text = try #require(fields[index]["text"] as? String)
    _ = try session.request([
      "action": "select", "field": index, "start": text.utf16.count, "end": text.utf16.count,
    ])
    let result = try session.request(["action": "command", "name": "enter"])
    let next = try #require(result["fields"] as? [[String: Any]])
    #expect(next.count == fields.count + 1, "\(mode): \(source)")
    #expect(next.last?["text"] as? String == "")
    let beforeList = try #require(fields[index]["lists"] as? [[String: Any]])
    let afterList = try #require(next.last?["lists"] as? [[String: Any]])
    #expect(beforeList.count == afterList.count)
    #expect(beforeList.last?["kind"] as? String == afterList.last?["kind"] as? String)
    if source.hasPrefix("3.") { #expect((result["markdown"] as? String)?.contains("4.") == true) }
  }
}

@Test("空のリスト項目だけ改行でリストを抜ける", arguments: lexicalModes)
func lexicalEmptyListReturn(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "- 項目"])
  _ = try session.request(["action": "select", "field": 0, "start": 2, "end": 2])
  _ = try session.request(["action": "command", "name": "enter"])
  let result = try session.request(["action": "command", "name": "enter"])
  let fields = try #require(result["fields"] as? [[String: Any]])
  #expect(fields.last?["type"] as? String == "paragraph")
  #expect(fields.count == 2)
}

@Test("字下げと解除で番号と後続入力を保持する", arguments: lexicalModes)
func lexicalIndent(_ mode: String) throws {
  let session = try LexicalSession(mode)
  let before = try session.request(["action": "load", "source": "3. 一\n4. 二"])
  _ = try session.request(["action": "select", "field": 1, "start": 1, "end": 1])
  _ = try session.request(["action": "command", "name": "indent"])
  let restored = try session.request(["action": "command", "name": "outdent"])
  #expect(restored["markdown"] as? String == before["markdown"] as? String)
  let typed = try session.request(["action": "insert", "text": "続き"])
  #expect((typed["markdown"] as? String)?.contains("二続き") == true)
}

@Test("段落先頭のBackspaceで前の段落へ結合する", arguments: lexicalModes)
func lexicalJoin(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "前\n\n後"])
  _ = try session.request(["action": "select", "field": 1, "start": 0, "end": 0])
  let result = try session.request(["action": "command", "name": "backspace"])
  #expect(result["text"] as? String == "前後")
  #expect((result["fields"] as? [Any])?.count == 1)
}

@Test("UTF16の選択範囲を置換して前後の絵文字を壊さない", arguments: lexicalModes)
func lexicalSelection(_ mode: String) throws {
  let session = try LexicalSession(mode)
  let text = "A👩🏽‍💻B"
  _ = try session.request(["action": "load", "source": text])
  _ = try session.request(["action": "select", "field": 0, "start": 1, "end": text.utf16.count - 1])
  let result = try session.request(["action": "insert", "text": "日本語"])
  #expect(result["text"] as? String == "A日本語B")
}

@Test("入力をUndoしてRedoで本文を復元する", arguments: lexicalModes)
func lexicalHistory(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "本文"])
  _ = try session.request(["action": "select", "field": 0, "start": 2, "end": 2])
  _ = try session.request(["action": "insert", "text": "続き"])
  let undone = try session.request(["action": "command", "name": "undo"])
  #expect(undone["text"] as? String == "本文")
  let redone = try session.request(["action": "command", "name": "redo"])
  #expect(redone["text"] as? String == "本文続き")
}

@Test("装飾の境界を越えた選択と入力後のカーソルを段落内のUTF16位置で返す", arguments: lexicalModes)
func lexicalSelectionOffsets(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "**前後**次👩🏽‍💻"])
  let selected = try session.request([
    "action": "select", "field": 0, "start": 1, "end": "前後次👩🏽‍💻".utf16.count,
  ])
  let range = try #require(selected["selection"] as? [String: Any])
  #expect(range["anchor"] as? Int == 1)
  #expect(range["focus"] as? Int == "前後次👩🏽‍💻".utf16.count)
  let typed = try session.request(["action": "insert", "text": "続き"])
  #expect(typed["text"] as? String == "前続き")
  #expect((typed["selection"] as? [String: Any])?["anchor"] as? Int == 3)
}

@Test("太字と斜体を重ねて適用し解除して保存する", arguments: lexicalModes)
func lexicalFormats(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "日本語English"])
  _ = try session.request(["action": "select", "field": 0, "start": 0, "end": 10])
  _ = try session.request(["action": "command", "name": "format", "format": "bold"])
  let both = try session.request(["action": "command", "name": "format", "format": "italic"])
  let parsed = Document(parsing: try #require(both["markdown"] as? String))
  let traits = markdownTextTraits(parsed, bold: false, italic: false)
  #expect(traits.map(\.text).joined() == "日本語English")
  #expect(traits.allSatisfy { $0.bold && $0.italic })
  _ = try session.request(["action": "command", "name": "format", "format": "italic"])
  let plain = try session.request(["action": "command", "name": "format", "format": "bold"])
  #expect((plain["markdown"] as? String)?.trimmingCharacters(in: .newlines) == "日本語English")
}

@Test("リスト内のコードを保存しても外側へ移動しない", arguments: lexicalModes)
func lexicalNestedCode(_ mode: String) throws {
  let session = try LexicalSession(mode)
  let output = try session.request(["action": "load", "source": "- foo\n\n\t\tbar\n"])
  let parsed = Document(parsing: try #require(output["markdown"] as? String))
  #expect(parsed.childCount == 1)
  let list = try #require(parsed.child(at: 0) as? UnorderedList)
  #expect(list.child(at: 0)?.children.contains { $0 is CodeBlock } == true)
}

@Test("未使用の参照定義を保存後に新しいリンクから解決できる", arguments: lexicalModes)
func lexicalUnusedDefinition(_ mode: String) throws {
  let session = try LexicalSession(mode)
  let output = try session.request(["action": "load", "source": "本文\n\n[ref]: /target \"題名\"\n"])
  let source = try #require(output["markdown"] as? String) + "\n\n[参照][ref]\n"
  let document = Document(parsing: source)
  var nodes: [any Markup] = [document]
  var links = [Link]()
  while let node = nodes.popLast() {
    if let link = node as? Link { links.append(link) }
    nodes += node.children
  }
  #expect(links.contains { $0.destination == "/target" && $0.title == "題名" })
}

@Test("リスト内コードをコードの入力欄と入れ子の文脈で読み込む", arguments: lexicalModes)
func lexicalNestedCodeField(_ mode: String) throws {
  let session = try LexicalSession(mode)
  let output = try session.request(["action": "load", "source": "- foo\n\n\t\tbar\n"])
  let fields = try #require(output["fields"] as? [[String: Any]])
  let code = try #require(fields.first { $0["type"] as? String == "code" })
  #expect(code["text"] as? String == "  bar")
  let lists = try #require(code["lists"] as? [[String: Any]])
  #expect(lists.count == 1)
  #expect(lists.first?["kind"] as? String == "bullet")
}

@Test("画像ノードとして読み込みURLと題名を保存して再解析する", arguments: lexicalModes)
func lexicalImage(_ mode: String) throws {
  let session = try LexicalSession(mode)
  let output = try session.request(["action": "load", "source": "![説明](/image.png \"題名\")"])
  var nodes = [try #require(output["root"] as? [String: Any])]
  var images = [[String: Any]]()
  while let node = nodes.popLast() {
    if node["type"] as? String == "image" { images.append(node) }
    nodes += node["children"] as? [[String: Any]] ?? []
  }
  #expect(images.count == 1)
  let image =
    Document(parsing: try #require(output["markdown"] as? String)).child(at: 0)?.child(at: 0)
    as? Markdown.Image
  #expect(image?.source == "/image.png")
  #expect(image?.title == "題名")
}

@Test("表の配置とセルのパイプを保存して再解析する", arguments: lexicalModes)
func lexicalTable(_ mode: String) throws {
  let session = try LexicalSession(mode)
  let output = try session.request([
    "action": "load", "source": "| 左 | 右 |\n| :--- | ---: |\n| a\\|b | c |\n",
  ])
  let table = Document(parsing: try #require(output["markdown"] as? String)).child(at: 0) as? Table
  #expect(table?.columnAlignments == [.left, .right])
  #expect((table?.body.child(at: 0)?.child(at: 0) as? Table.Cell)?.plainText == "a|b")
}

@Test("DOMなしの文字削除コマンドで英字と絵文字を削除する", arguments: lexicalModes)
func lexicalDirectCharacterDeletion(_ mode: String) throws {
  for source in ["AB", "A👩🏽‍💻"] {
    do {
      let session = try LexicalSession(mode)
      _ = try session.request(["action": "load", "source": source])
      _ = try session.request([
        "action": "select", "field": 0, "start": source.utf16.count, "end": source.utf16.count,
      ])
      let result = try session.request(["action": "command", "name": "backspace"])
      #expect(result["text"] as? String == "A")
    } catch { Issue.record(error, "\(mode): \(source)") }
  }
}

@Test("不正な選択範囲を拒否した後も次の文書操作へ例外を持ち越さない", arguments: lexicalModes)
func lexicalInvalidSelection(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "本文"])
  #expect(throws: LexicalSession.Failure.self) {
    try session.request(["action": "select", "field": 0, "start": 0, "end": 99])
  }
  _ = try session.request(["action": "select", "field": 0, "start": 2, "end": 2])
  let result = try session.request(["action": "insert", "text": "続き"])
  #expect(result["text"] as? String == "本文続き")
}

@Test("別々のエディターで本文と書式を混ぜずに更新する", arguments: lexicalModes)
func lexicalDocumentIsolation(_ mode: String) throws {
  let first = try LexicalSession(mode)
  let second = try LexicalSession(mode)
  _ = try first.request(["action": "load", "source": "一"])
  _ = try second.request(["action": "load", "source": "二"])
  _ = try first.request(["action": "select", "field": 0, "start": 1, "end": 1])
  _ = try first.request(["action": "insert", "text": "続き"])
  #expect(try first.request(["action": "read"])["text"] as? String == "一続き")
  #expect(try second.request(["action": "read"])["text"] as? String == "二")
}

@Test("内側の書式が違う段落を結合しても同じ外側のリンクを分裂させない", arguments: lexicalModes)
func lexicalOuterLinkJoin(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "[**前**](/url)\n\n[*後*](/url)"])
  _ = try session.request(["action": "select", "field": 1, "start": 0, "end": 0])
  let output = try session.request(["action": "command", "name": "backspace"])
  let source = try #require(output["markdown"] as? String)
  let document = Document(parsing: source)
  let paragraph = try #require(document.child(at: 0) as? Paragraph)
  #expect(paragraph.childCount == 1)
  let link = try #require(paragraph.child(at: 0) as? Link)
  #expect(link.destination == "/url")
  #expect(link.plainText == "前後")
  #expect(link.children.contains { $0 is Strong })
  #expect(link.children.contains { $0 is Emphasis })
}

@Test("段落へ入力した空白とタブとUnicode文字を保存して再解析する", arguments: lexicalModes)
func lexicalLiteralText(_ mode: String) throws {
  for text in ["    行頭", "行末  ", " \t本文", "前\u{2028}後", "👩🏽‍💻"] {
    let session = try LexicalSession(mode)
    _ = try session.request(["action": "load", "source": "元の文字"])
    let output = try session.request([
      "action": "replaceField", "field": 0, "runs": [["text": text, "formats": [String]()]],
    ])
    let paragraph =
      Document(parsing: try #require(output["markdown"] as? String)).child(at: 0) as? Paragraph
    #expect(paragraph?.plainText == text, "\(mode): \(text.debugDescription)")
  }
}

func markdownTextTraits(_ node: any Markup, bold: Bool, italic: Bool)
  -> [(text: String, bold: Bool, italic: Bool)]
{
  let bold = bold || node is Strong
  let italic = italic || node is Emphasis
  if let text = node as? Markdown.Text { return [(text.string, bold, italic)] }
  return node.children.flatMap { markdownTextTraits($0, bold: bold, italic: italic) }
}
