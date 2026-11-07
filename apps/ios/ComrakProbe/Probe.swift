import Foundation

enum ProbeError: Error { case invalidResponse }

func evaluate(_ source: String, gfm: Bool, replacement: String?) throws -> [String: Any] {
  let result = source.withCString { sourcePointer in
    let bytes = UnsafeRawPointer(sourcePointer).assumingMemoryBound(to: UInt8.self)
    if let replacement {
      return replacement.withCString {
        evame_comrak_probe(
          bytes, source.utf8.count, gfm,
          UnsafeRawPointer($0).assumingMemoryBound(to: UInt8.self), replacement.utf8.count)
      }
    }
    return evame_comrak_probe(bytes, source.utf8.count, gfm, nil, 0)
  }
  guard let result else { throw ProbeError.invalidResponse }
  defer { evame_comrak_probe_free(result) }
  guard
    let json = try JSONSerialization.jsonObject(with: Data(String(cString: result).utf8))
      as? [String: Any]
  else { throw ProbeError.invalidResponse }
  return json
}

let expected =
  try JSONSerialization.jsonObject(
    with: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))) as! [[String: Any]]
precondition(expected.count == 1329)
for entry in expected {
  let result = try evaluate(
    entry["source"] as! String, gfm: (entry["corpus"] as! String).hasPrefix("gfm"), replacement: nil
  )
  for key in ["markdown", "html", "roundtripHtml"] {
    precondition(
      result[key] as! String == entry[key] as! String, "Swift/C/Rust \(key): \(entry["example"]!)")
  }
  let treeEqual = (result["tree"] as! NSArray).isEqual(to: result["roundtripTree"] as! [Any])
  precondition(treeEqual == entry["treeEqual"] as! Bool)
}

let edits = [
  ("元の文字\n", "日本語👩🏽‍💻 *記号*末尾"),
  ("| 見出し |\n| --- |\n| 内容 |\n", "a | b"),
  ("- [ ] 項目\n- [x] 完了\n", "編集"),
  ("3. 項目\n   - 子\n4. 後続\n", "編集"),
  ("[参照][ref]\n\n[ref]: /url \"題名\"\n", "編集"),
]
for (source, replacement) in edits {
  let result = try evaluate(source, gfm: true, replacement: replacement)
  precondition(result["html"] as! String == result["roundtripHtml"] as! String)
  precondition((result["tree"] as! NSArray).isEqual(to: result["roundtripTree"] as! [Any]))
}
let nulInput = try evaluate("原文\u{0}末尾", gfm: false, replacement: nil)
precondition(nulInput["html"] as! String == "<p>原文�末尾</p>\n")
for source in ["- [ ]\n- [x] 完了\n", "- [ ] &#x20;\n- [x] 完了\n"] {
  let result = try evaluate(source, gfm: true, replacement: nil)
  precondition(
    result["roundtripHtml"] as! String
      == "<ul>\n<li><input type=\"checkbox\" disabled=\"\" /> </li>\n<li><input type=\"checkbox\" checked=\"\" disabled=\"\" /> 完了</li>\n</ul>\n"
  )
}
precondition(evame_comrak_probe(nil, 0, true, nil, 0) == nil)
var invalid: UInt8 = 0xff
precondition(evame_comrak_probe(&invalid, 1, true, nil, 0) == nil)
evame_comrak_probe_free(nil)
print("Swift → C → Rust: 1329例がホスト結果と一致、編集5例・空チェック2例・不正入力2例・NULL解放の確認成功")
