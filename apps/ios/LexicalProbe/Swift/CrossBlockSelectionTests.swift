import Foundation
import Markdown
import Testing

@Test("段落の途中からリスト項目の途中までを選択して削除すると残りが段落へ結合する", arguments: lexicalModes)
func crossBlockDelete(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "あいう\n\n- かきく\n- さしす"])
  _ = try session.request([
    "action": "selectAcross", "anchor": ["field": 0, "offset": 1],
    "focus": ["field": 1, "offset": 2],
  ])
  let result = try session.request(["action": "command", "name": "backspace"])
  #expect(try blocks(result) == ["paragraph:あく", "- さしす"])
}

@Test("後ろから前へ向けたブロックをまたぐ選択も同じように削除する", arguments: lexicalModes)
func crossBlockBackwardDelete(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "あいう\n\n- かきく\n- さしす"])
  _ = try session.request([
    "action": "selectAcross", "anchor": ["field": 1, "offset": 2],
    "focus": ["field": 0, "offset": 1],
  ])
  let result = try session.request(["action": "command", "name": "backspace"])
  #expect(try blocks(result) == ["paragraph:あく", "- さしす"])
}

@Test("見出しから段落とリスト項目までの選択を入力で置き換えると見出しへ結合しカーソルが入力の後ろに来る", arguments: lexicalModes)
func crossBlockReplace(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "# 見出し\n\n段落\n\n- 項目"])
  _ = try session.request([
    "action": "selectAcross", "anchor": ["field": 0, "offset": 2],
    "focus": ["field": 2, "offset": 1],
  ])
  let result = try session.request(["action": "insert", "text": "日本語"])
  #expect(try blocks(result) == ["heading1:見出日本語目"])
  let selection = try #require(result["selection"] as? [String: Any])
  #expect(selection["field"] as? Int == 0)
  #expect(selection["anchor"] as? Int == 5)
  #expect(selection["focusField"] as? Int == 0)
  #expect(selection["focus"] as? Int == 5)
}

@Test("ブロックをまたぐ削除をUndoすると元の構造へ戻りRedoで再び削除する", arguments: lexicalModes)
func crossBlockHistory(_ mode: String) throws {
  let session = try LexicalSession(mode)
  let loaded = try session.request(["action": "load", "source": "あいう\n\n- かきく\n- さしす"])
  _ = try session.request([
    "action": "selectAcross", "anchor": ["field": 0, "offset": 1],
    "focus": ["field": 1, "offset": 2],
  ])
  let deleted = try session.request(["action": "command", "name": "backspace"])
  let undone = try session.request(["action": "command", "name": "undo"])
  #expect(undone["markdown"] as? String == loaded["markdown"] as? String)
  #expect(try blocks(undone) == ["paragraph:あいう", "- かきく", "- さしす"])
  let redone = try session.request(["action": "command", "name": "redo"])
  #expect(redone["markdown"] as? String == deleted["markdown"] as? String)
}

@Test("ブロックをまたいでコピーした範囲を別の段落の末尾へ貼り付けると段落とリスト項目の構造で入る", arguments: lexicalModes)
func crossBlockCopyPaste(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "あいう\n\n- かきく\n\n末尾"])
  _ = try session.request([
    "action": "selectAcross", "anchor": ["field": 0, "offset": 1],
    "focus": ["field": 1, "offset": 2],
  ])
  let copied = try session.request(["action": "copy"])
  let clipboard = try #require(copied["clipboard"] as? [String: Any])
  #expect(clipboard["text/plain"] as? String == "いう\nかき")
  _ = try session.request(["action": "select", "field": 2, "start": 2, "end": 2])
  let pasted = try session.request(["action": "paste", "clipboard": clipboard])
  #expect(try blocks(pasted) == ["paragraph:あいう", "- かきく", "paragraph:末尾いう", "- かき"])
}

@Test("文字だけのクリップボードは選択範囲の位置へ文字として貼り付ける", arguments: lexicalModes)
func crossBlockPlainPaste(_ mode: String) throws {
  let session = try LexicalSession(mode)
  _ = try session.request(["action": "load", "source": "あいう\n\n- かきく"])
  _ = try session.request([
    "action": "selectAcross", "anchor": ["field": 0, "offset": 1],
    "focus": ["field": 1, "offset": 2],
  ])
  let pasted = try session.request(["action": "paste", "clipboard": ["text/plain": "外部"]])
  #expect(try blocks(pasted) == ["paragraph:あ外部く"])
}

/// 保存したMarkdownを再解析し、トップレベルのブロックとリスト項目を文字で並べる。
func blocks(_ result: [String: Any]) throws -> [String] {
  let document = Document(parsing: try #require(result["markdown"] as? String))
  return document.children.flatMap { block -> [String] in
    if let heading = block as? Heading { return ["heading\(heading.level):\(heading.plainText)"] }
    if let list = block as? UnorderedList {
      return list.listItems.map { item in
        "- " + item.children.map { ($0 as? Paragraph)?.plainText ?? "\(type(of: $0))" }.joined()
      }
    }
    if let paragraph = block as? Paragraph { return ["paragraph:\(paragraph.plainText)"] }
    return ["\(type(of: block))"]
  }
}
