#if canImport(UIKit) && !SWIFT_PACKAGE
  import UIKit

  /// 文書全体を1つの入力欄に表示する。文書の正本はLexicalが持ち、入力欄は表示と入力の受付だけを担う。
  /// 確定した入力をLexicalの選択と操作へ変換し、結果の文書と選択から表示を作り直す。
  @MainActor
  final class DocumentTextView: UITextView, UITextViewDelegate {
    private static let lexicalPasteboardType = "app.evame.lexical-editor"
    private let session: LexicalSession
    private let pasteboard: UIPasteboard
    private(set) var snapshot: [String: Any]
    /// Lexicalが操作を拒否した最初の例外。入力欄は直前の文書の表示を保つ。
    private(set) var failure: Error?
    private var rendered = ""
    /// 利用者の1操作でLexicalの履歴が増えた件数。UIKitのUndoを1操作単位でLexicalの履歴へ対応させる。
    private var undoSteps = [Int]()
    private var redoSteps = [Int]()
    private lazy var history = LexicalUndoManager(view: self)

    init(session: LexicalSession, source: String, pasteboard: UIPasteboard) throws {
      self.session = session
      self.pasteboard = pasteboard
      snapshot = try session.request(["action": "load", "source": source])
      super.init(frame: .zero, textContainer: nil)
      delegate = self
      font = .systemFont(ofSize: 20)
      render()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override var undoManager: UndoManager? { history }

    private var fields: [[String: Any]] { snapshot["fields"] as? [[String: Any]] ?? [] }
    private var undoDepth: Int { snapshot["undoDepth"] as? Int ?? 0 }

    /// 入力欄の位置を、それを含む段落・項目の番号と段落内のUTF16位置へ変換する。区切りの改行は前の段落の末尾とする。
    private func position(_ location: Int) -> [String: Int] {
      var start = 0
      for (index, field) in fields.enumerated() {
        let length = (field["text"] as? String ?? "").utf16.count
        if location <= start + length || index == fields.count - 1 {
          return ["field": index, "offset": min(max(location - start, 0), length)]
        }
        start += length + 1
      }
      return ["field": 0, "offset": 0]
    }

    private func location(field: Int, offset: Int) -> Int {
      fields.prefix(field).reduce(0) { $0 + ($1["text"] as? String ?? "").utf16.count + 1 } + offset
    }

    private func render() {
      let output = NSMutableAttributedString()
      for (index, field) in fields.enumerated() {
        // 段落内の改行は区切りの改行と区別するため、表示だけ行区切り文字にする。
        let text = (field["text"] as? String ?? "").replacingOccurrences(
          of: "\n", with: "\u{2028}")
        output.append(
          NSAttributedString(
            string: index == fields.count - 1 ? text : text + "\n", attributes: attributes(field)))
      }
      rendered = output.string
      attributedText = output
      if let selection = snapshot["selection"] as? [String: Any],
        let field = selection["field"] as? Int, let anchor = selection["anchor"] as? Int,
        let focusField = selection["focusField"] as? Int, let focus = selection["focus"] as? Int
      {
        let start = location(field: field, offset: anchor)
        let end = location(field: focusField, offset: focus)
        selectedRange = NSRange(location: min(start, end), length: abs(end - start))
      }
      let current = position(selectedRange.location)["field"] ?? 0
      if fields.indices.contains(current) { typingAttributes = attributes(fields[current]) }
    }

    private func attributes(_ field: [String: Any]) -> [NSAttributedString.Key: Any] {
      let depth = (field["lists"] as? [Any])?.count ?? 0
      let paragraph = NSMutableParagraphStyle()
      paragraph.firstLineHeadIndent = CGFloat(depth) * 24
      paragraph.headIndent = CGFloat(depth) * 24
      paragraph.paragraphSpacing = 8
      switch field["type"] as? String {
      case "heading": return [.font: UIFont.boldSystemFont(ofSize: 26), .paragraphStyle: paragraph]
      case "code":
        return [
          .font: UIFont.monospacedSystemFont(ofSize: 17, weight: .regular),
          .paragraphStyle: paragraph,
        ]
      case "quote":
        paragraph.firstLineHeadIndent += 16
        paragraph.headIndent += 16
        return [
          .font: UIFont.systemFont(ofSize: 20), .foregroundColor: UIColor.secondaryLabel,
          .paragraphStyle: paragraph,
        ]
      default:
        return [
          .font: UIFont.systemFont(ofSize: 20), .foregroundColor: UIColor.label,
          .paragraphStyle: paragraph,
        ]
      }
    }

    /// Lexicalへの要求を1操作として送り、増えた履歴の件数を記録して表示を作り直す。
    private func edit(_ requests: [[String: Any]]) {
      let before = undoDepth
      do {
        for request in requests { snapshot = try session.request(request) }
      } catch {
        failure = failure ?? error
      }
      if undoDepth > before {
        undoSteps.append(undoDepth - before)
        redoSteps.removeAll()
      }
      render()
    }

    private func select(_ range: NSRange) -> [String: Any] {
      [
        "action": "selectAcross", "anchor": position(range.location),
        "focus": position(NSMaxRange(range)),
      ]
    }

    /// 確定した文字列で範囲を置き換える要求。改行はLexicalの段落分割として送る。
    private func replacement(_ range: NSRange, with text: String) -> [[String: Any]] {
      var requests = [select(range)]
      if text.isEmpty {
        if range.length > 0 { requests.append(["action": "command", "name": "backspace"]) }
        return requests
      }
      for (index, part) in text.components(separatedBy: "\n").enumerated() {
        if index > 0 { requests.append(["action": "command", "name": "enter"]) }
        if !part.isEmpty { requests.append(["action": "insert", "text": part]) }
      }
      return requests
    }

    func textView(
      _ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String
    ) -> Bool {
      guard text == "\n", markedTextRange == nil else { return true }
      edit(replacement(range, with: text))
      return false
    }

    func textViewDidChange(_ textView: UITextView) {
      guard markedTextRange == nil, self.text != rendered else { return }
      // UIKitが反映した確定入力を、カーソル位置を基準に表示前の文字列との差分として取り出す。
      let old = rendered as NSString
      let new = self.text as NSString
      let cursor = selectedRange.location
      var suffix = 0
      while suffix < min(old.length, new.length - cursor),
        old.character(at: old.length - 1 - suffix) == new.character(at: new.length - 1 - suffix)
      {
        suffix += 1
      }
      var prefix = 0
      while prefix < min(old.length, new.length) - suffix,
        old.character(at: prefix) == new.character(at: prefix)
      {
        prefix += 1
      }
      let range = NSRange(location: prefix, length: old.length - suffix - prefix)
      let inserted = new.substring(
        with: NSRange(location: prefix, length: new.length - suffix - prefix))
      edit(replacement(range, with: inserted.replacingOccurrences(of: "\u{2028}", with: "\n")))
    }

    override func unmarkText() {
      super.unmarkText()
      textViewDidChange(self)
    }

    override func deleteBackward() {
      let start = position(selectedRange.location)
      // 段落・項目の先頭では、リストや引用の解除と結合をLexicalのBackspaceに任せる。
      // 文書の先頭ではLexicalがDOMの選択で削除範囲を探して失敗するため送らない。
      if markedTextRange == nil, selectedRange.length == 0, start["offset"] == 0,
        selectedRange.location > 0
      {
        edit([select(selectedRange), ["action": "command", "name": "backspace"]])
        return
      }
      super.deleteBackward()
    }

    override func copy(_ sender: Any?) {
      guard selectedRange.length > 0, markedTextRange == nil else { return }
      do {
        _ = try session.request(select(selectedRange))
        let copied = try session.request(["action": "copy"])
        guard let clipboard = copied["clipboard"] as? [String: Any] else { return }
        var item = [String: Any]()
        if let lexical = clipboard["application/x-lexical-editor"] as? String {
          item[Self.lexicalPasteboardType] = Data(lexical.utf8)
        }
        item["public.utf8-plain-text"] = clipboard["text/plain"] as? String ?? ""
        pasteboard.items = [item]
      } catch {
        failure = failure ?? error
      }
    }

    override func cut(_ sender: Any?) {
      guard selectedRange.length > 0, markedTextRange == nil else { return }
      copy(sender)
      edit(replacement(selectedRange, with: ""))
    }

    override func paste(_ sender: Any?) {
      guard markedTextRange == nil else { return }
      var clipboard = ["text/plain": pasteboard.string ?? ""]
      if let data = pasteboard.data(forPasteboardType: Self.lexicalPasteboardType) {
        clipboard["application/x-lexical-editor"] = String(decoding: data, as: UTF8.self)
      }
      edit([select(selectedRange), ["action": "paste", "clipboard": clipboard]])
    }

    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
      if action == #selector(paste(_:)) {
        return pasteboard.hasStrings
          || pasteboard.contains(pasteboardTypes: [Self.lexicalPasteboardType])
      }
      return super.canPerformAction(action, withSender: sender)
    }

    fileprivate var canUndo: Bool { !undoSteps.isEmpty }
    fileprivate var canRedo: Bool { !redoSteps.isEmpty }

    fileprivate func step(_ name: String) {
      guard let steps = name == "undo" ? undoSteps.popLast() : redoSteps.popLast() else { return }
      do {
        for _ in 0..<steps { snapshot = try session.request(["action": "command", "name": name]) }
      } catch {
        failure = failure ?? error
      }
      if name == "undo" { redoSteps.append(steps) } else { undoSteps.append(steps) }
      render()
    }
  }

  /// UIKitのUndo操作をLexicalの履歴へ送る。UIKitが入力欄の文字に対して記録する履歴は使わない。
  private final class LexicalUndoManager: UndoManager {
    private weak var view: DocumentTextView?

    init(view: DocumentTextView) {
      self.view = view
      super.init()
    }

    override var canUndo: Bool { view?.canUndo ?? false }
    override var canRedo: Bool { view?.canRedo ?? false }
    override func undo() { view?.step("undo") }
    override func redo() { view?.step("redo") }
  }
#endif
