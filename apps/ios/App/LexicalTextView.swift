import UIKit

/// 文書全体を1つの入力欄で編集する。文書の正本はLexicalDocumentが持ち、入力欄は表示と入力の受付だけを担う。
/// 確定した入力をLexicalの選択と操作へ変換し、結果の文書と選択から表示を作り直す。
@MainActor
final class LexicalTextView: UITextView, UITextViewDelegate {
  private static let lexicalPasteboardType = "app.evame.lexical-editor"
  private static let baseSize: CGFloat = 17
  private let document: LexicalDocument
  private let pasteboard: UIPasteboard
  private(set) var snapshot: LexicalDocument.Snapshot
  /// Lexicalが操作を拒否した最初の例外。Lexicalは文書を直前の状態へ戻し、入力欄もその表示に揃える。
  private(set) var failure: Error? {
    didSet { if failure != nil { onFailure() } }
  }
  /// 画像の表示に使う。写真から追加した画像と、URLから読み込んだ画像を名前で引く。
  var images: [String: UIImage] = [:]
  /// 文書・選択・書式が変わったことを画面の所有者へ伝える。
  var onChange: () -> Void = {}
  var onTableTap: (Int) -> Void = { _ in }
  /// Lexicalが操作を拒否するたびに画面の所有者へ伝える。
  var onFailure: () -> Void = {}
  private var rendered = ""
  private var unitStarts = [Int]()
  private var isRendering = false
  private var loadingImages = Set<String>()
  private var overlays = [UIView]()
  private var overlayWidth: CGFloat = 0
  /// 利用者の1操作でLexicalの履歴が増えた件数。UIKitのUndoを1操作単位でLexicalの履歴へ対応させる。
  private var undoSteps = [Int]()
  private var redoSteps = [Int]()
  private lazy var history = LexicalUndoManager(view: self)

  init(document: LexicalDocument, markdown: String, pasteboard: UIPasteboard) throws {
    self.document = document
    self.pasteboard = pasteboard
    snapshot = try document.request(["action": "load", "markdown": markdown])
    // 本文を読み込めないまま空の編集画面を開くと、編集の続きで本文を失うため開かない。
    if let message = snapshot.failure { throw LexicalDocument.Failure.javascript(message) }
    super.init(frame: .zero, textContainer: nil)
    delegate = self
    accessibilityIdentifier = "editor.text"
    textContainerInset = UIEdgeInsets(top: 16, left: 20, bottom: 32, right: 20)
    keyboardDismissMode = .interactive
    render()
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  override var undoManager: UndoManager? { history }

  // MARK: 位置の変換

  private func length(_ unit: LexicalDocument.Unit) -> Int {
    guard let runs = unit.runs else { return 1 }
    return runs.reduce(0) { $0 + ($1.text.map { ($0 as NSString).length } ?? 1) }
  }

  /// 入力欄の位置を、それを含む表示単位と単位内の位置へ変換する。区切りの改行は前の単位の末尾とする。
  private func position(_ location: Int) -> [String: Int] {
    for (index, unit) in snapshot.units.enumerated() {
      let end = unitStarts[index] + length(unit)
      if location <= end || index == snapshot.units.count - 1 {
        return ["unit": index, "offset": min(max(location - unitStarts[index], 0), length(unit))]
      }
    }
    return ["unit": 0, "offset": 0]
  }

  private func select(_ range: NSRange) -> [String: Any] {
    [
      "action": "select", "anchor": position(range.location),
      "focus": position(NSMaxRange(range)),
    ]
  }

  // MARK: 表示

  private func render() {
    isRendering = true
    defer { isRendering = false }
    let output = NSMutableAttributedString()
    unitStarts = []
    for (index, unit) in snapshot.units.enumerated() {
      unitStarts.append(output.length)
      output.append(attributed(unit))
      if index < snapshot.units.count - 1 {
        output.append(NSAttributedString(string: "\n", attributes: base(unit)))
      }
    }
    rendered = output.string
    // attributedTextへ代入すると選択が文末へ移り、UIKitが後から文末までスクロールする。
    // 文字の保存先を置き換えて、スクロール位置を保ったまま選択だけを戻す。
    textStorage.setAttributedString(output)
    if let selection = snapshot.selection {
      let start = unitStarts[selection.anchor.unit] + selection.anchor.offset
      let end = unitStarts[selection.focus.unit] + selection.focus.offset
      selectedRange = NSRange(location: min(start, end), length: abs(end - start))
    }
    typingAttributes = typing()
    overlayWidth = 0
    setNeedsLayout()
  }

  private func font(_ unit: LexicalDocument.Unit) -> UIFont {
    if unit.context.footnote != nil { return .systemFont(ofSize: 14) }
    switch (unit.block?.type, unit.block?.level) {
    case ("heading", 1): return .systemFont(ofSize: 28, weight: .bold)
    case ("heading", 2): return .systemFont(ofSize: 24, weight: .bold)
    case ("heading", 3): return .systemFont(ofSize: 20, weight: .semibold)
    case ("heading", _): return .systemFont(ofSize: 18, weight: .semibold)
    case ("code", _): return .monospacedSystemFont(ofSize: 15, weight: .regular)
    default: return .systemFont(ofSize: Self.baseSize)
    }
  }

  private func indentation(_ unit: LexicalDocument.Unit) -> CGFloat {
    CGFloat(unit.context.lists.count) * 28 + CGFloat(unit.context.quote) * 16
      + (unit.context.footnote == nil ? 0 : 16)
  }

  private func base(_ unit: LexicalDocument.Unit) -> [NSAttributedString.Key: Any] {
    let paragraph = NSMutableParagraphStyle()
    paragraph.firstLineHeadIndent = indentation(unit)
    paragraph.headIndent = indentation(unit)
    paragraph.paragraphSpacing = unit.block?.type == "heading" ? 10 : 6
    var attributes: [NSAttributedString.Key: Any] = [
      .font: font(unit), .paragraphStyle: paragraph,
      .foregroundColor: unit.context.quote > 0 || unit.context.footnote != nil
        ? UIColor.secondaryLabel : UIColor.label,
    ]
    if unit.block?.type == "code" { attributes[.backgroundColor] = UIColor.tertiarySystemFill }
    return attributes
  }

  private func styled(_ attributes: [NSAttributedString.Key: Any], formats: [String], link: String?)
    -> [NSAttributedString.Key: Any]
  {
    var attributes = attributes
    var font = attributes[.font] as? UIFont ?? .systemFont(ofSize: Self.baseSize)
    if formats.contains("code") {
      font = .monospacedSystemFont(ofSize: font.pointSize - 1, weight: .regular)
      attributes[.backgroundColor] = UIColor.tertiarySystemFill
    }
    if formats.contains("bold"),
      let descriptor = font.fontDescriptor.withSymbolicTraits(
        font.fontDescriptor.symbolicTraits.union(.traitBold))
    {
      font = UIFont(descriptor: descriptor, size: font.pointSize)
    }
    // 日本語の代替フォントにも斜体が効くよう、書体の指定ではなく描画行列で傾ける。
    if formats.contains("italic") {
      font = UIFont(
        descriptor: font.fontDescriptor.withMatrix(
          CGAffineTransform(a: 1, b: 0, c: 0.2, d: 1, tx: 0, ty: 0)),
        size: font.pointSize)
    }
    attributes[.font] = font
    if formats.contains("strikethrough") {
      attributes[.strikethroughStyle] = NSUnderlineStyle.single.rawValue
    }
    if link != nil {
      attributes[.foregroundColor] = UIColor.link
      attributes[.underlineStyle] = NSUnderlineStyle.single.rawValue
    }
    return attributes
  }

  private func typing() -> [NSAttributedString.Key: Any] {
    guard let selection = snapshot.selection,
      snapshot.units.indices.contains(selection.focus.unit)
    else { return base(snapshot.units.first!) }
    return styled(
      base(snapshot.units[selection.focus.unit]), formats: snapshot.formats, link: snapshot.link)
  }

  private func attributed(_ unit: LexicalDocument.Unit) -> NSAttributedString {
    let attributes = base(unit)
    if let atomic = unit.atomic {
      return NSAttributedString(
        attachment: attachment(atomic, font: attributes[.font] as! UIFont, block: true),
        attributes: attributes)
    }
    let output = NSMutableAttributedString()
    for run in unit.runs ?? [] {
      let style = styled(attributes, formats: run.formats ?? [], link: run.link)
      if let text = run.text {
        // 段落内の改行は区切りの改行と区別するため、表示だけ行区切り文字にする。
        output.append(
          NSAttributedString(
            string: text.replacingOccurrences(of: "\n", with: "\u{2028}"), attributes: style))
      } else if let decorator = run.decorator {
        output.append(
          NSAttributedString(
            attachment: attachment(decorator, font: style[.font] as! UIFont, block: false),
            attributes: style))
      }
    }
    return output
  }

  private var availableWidth: CGFloat {
    max(
      (bounds.width > 0 ? bounds.width : 360) - textContainerInset.left - textContainerInset.right
        - textContainer.lineFragmentPadding * 2, 100)
  }

  private func attachment(_ decorator: LexicalDocument.Decorator, font: UIFont, block: Bool)
    -> NSTextAttachment
  {
    let attachment = NSTextAttachment()
    switch decorator.type {
    case "image":
      let src = decorator.src ?? ""
      if let image = images[src] {
        let scale = min(1, availableWidth / max(image.size.width, 1))
        attachment.image = image
        attachment.bounds = CGRect(
          x: 0, y: 0, width: image.size.width * scale, height: image.size.height * scale)
        return attachment
      }
      loadImage(src)
      attachment.image = chip(
        "🖼 " + (decorator.alt?.isEmpty == false ? decorator.alt! : src), font: font)
    case "table":
      attachment.image = chip(
        String(localized: "表を編集") + " · \(decorator.rows ?? 0) × \(decorator.columns ?? 0)",
        font: .systemFont(ofSize: 15, weight: .medium), fill: true)
    case "tweet": attachment.image = chip("𝕏 " + (decorator.url ?? ""), font: font, fill: true)
    case "horizontalrule":
      attachment.image = UIGraphicsImageRenderer(size: CGSize(width: availableWidth, height: 16))
        .image { context in
          UIColor.separator.setFill()
          context.fill(CGRect(x: 0, y: 7.5, width: availableWidth, height: 1))
        }
    case "footnote-reference":
      attachment.image = chip(
        "[^\(decorator.label ?? decorator.identifier ?? "")]",
        font: .systemFont(ofSize: font.pointSize * 0.75))
    case "definition":
      attachment.image = chip(
        "[\(decorator.label ?? decorator.identifier ?? "")]: \(decorator.url ?? "")",
        font: .systemFont(ofSize: 13))
    default:
      attachment.image = chip(
        decorator.value ?? decorator.type,
        font: .monospacedSystemFont(ofSize: block ? 13 : font.pointSize - 2, weight: .regular))
    }
    if let image = attachment.image {
      attachment.bounds = CGRect(
        x: 0, y: block ? 0 : font.descender, width: image.size.width, height: image.size.height)
    }
    return attachment
  }

  /// 編集できない部品を、本文と同じ行に置ける小さな札として描く。
  private func chip(_ text: String, font: UIFont, fill: Bool = false) -> UIImage {
    let label = NSAttributedString(
      string: text, attributes: [.font: font, .foregroundColor: UIColor.secondaryLabel])
    let size = label.size()
    let width = fill ? availableWidth : min(ceil(size.width) + 12, availableWidth)
    let height = ceil(size.height) + 6
    return UIGraphicsImageRenderer(size: CGSize(width: width, height: height)).image { _ in
      UIColor.secondarySystemFill.setFill()
      UIBezierPath(
        roundedRect: CGRect(x: 0, y: 0, width: width, height: height), cornerRadius: 6
      ).fill()
      label.draw(
        with: CGRect(x: 6, y: 3, width: width - 12, height: height - 6),
        options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine], context: nil)
    }
  }

  private func loadImage(_ src: String) {
    guard let url = URL(string: src), ["http", "https"].contains(url.scheme ?? ""),
      loadingImages.insert(src).inserted
    else { return }
    Task { [weak self] in
      guard let (data, _) = try? await URLSession.shared.data(from: url),
        let image = UIImage(data: data), let self
      else { return }
      images[src] = image
      // 日本語の変換中に表示を作り直すと未確定の文字が消えるため、次の編集の表示まで待つ。
      if markedTextRange == nil { render() }
    }
  }

  // MARK: リストの記号・チェックボックス・引用の線

  override func layoutSubviews() {
    super.layoutSubviews()
    guard overlayWidth != bounds.width else { return }
    overlayWidth = bounds.width
    for overlay in overlays { overlay.removeFromSuperview() }
    overlays = []
    let left = textContainerInset.left + textContainer.lineFragmentPadding
    for (index, unit) in snapshot.units.enumerated() {
      guard let start = position(from: beginningOfDocument, offset: unitStarts[index]),
        let end = position(from: start, offset: length(unit))
      else { continue }
      let first = caretRect(for: start)
      if unit.context.quote > 0 {
        let bar = UIView(
          frame: CGRect(
            x: left + CGFloat(unit.context.quote - 1) * 16, y: first.minY, width: 3,
            height: caretRect(for: end).maxY - first.minY))
        bar.backgroundColor = .separator
        add(bar)
      }
      if unit.atomic?.type == "table", let range = textRange(from: start, to: end) {
        // 表は本文中では1つの部品として表示し、押すと表の編集画面を開く。
        let button = UIButton(
          type: .custom, primaryAction: UIAction { [weak self] _ in self?.onTableTap(index) })
        button.accessibilityLabel = String(localized: "表を編集")
        button.accessibilityIdentifier = "editor.table"
        button.frame = firstRect(for: range)
        add(button)
      }
      guard unit.block?.type == "listitem", let list = unit.context.lists.last else { continue }
      let frame = CGRect(x: left + indentation(unit) - 26, y: first.minY, width: 24, height: first.height)
      if list.kind == "check" {
        let checked = unit.block?.checked == true
        let button = UIButton(
          type: .system,
          primaryAction: UIAction { [weak self] _ in self?.toggleChecked(index) })
        button.setImage(UIImage(systemName: checked ? "checkmark.square.fill" : "square"), for: .normal)
        button.accessibilityLabel = unit.runs?.compactMap(\.text).joined()
        button.accessibilityValue = checked ? String(localized: "完了") : String(localized: "未完了")
        button.accessibilityIdentifier = "editor.checkbox"
        button.frame = frame
        add(button)
      } else {
        let marker = UILabel(frame: frame)
        marker.text =
          list.kind == "number"
          ? "\(unit.block?.value ?? 1)." : ["•", "◦", "▪"][(unit.context.lists.count - 1) % 3]
        marker.font = font(unit)
        marker.textAlignment = .right
        marker.textColor = .secondaryLabel
        add(marker)
      }
    }
  }

  private func add(_ overlay: UIView) {
    addSubview(overlay)
    overlays.append(overlay)
  }

  // MARK: 編集

  /// Lexicalへ要求を送り、文書と選択を最新にする。拒否された場合もLexicalが戻した後の文書を使い、失敗を記録する。
  private func send(_ request: [String: Any]) -> Bool {
    do {
      snapshot = try document.request(request)
      guard let message = snapshot.failure else { return true }
      failure = failure ?? LexicalDocument.Failure.javascript(message)
    } catch {
      failure = failure ?? error
    }
    return false
  }

  /// Lexicalへの要求を1操作として送り、増えた履歴の件数を記録して表示を作り直す。
  private func edit(_ requests: [[String: Any]]) {
    // 変換中の文字はLexicalにないため、書式ボタンなどの操作で表示を作り直すと消える。
    guard markedTextRange == nil else { return }
    let before = snapshot.undoDepth
    for request in requests {
      guard send(request) else { break }
    }
    if snapshot.undoDepth > before {
      undoSteps.append(snapshot.undoDepth - before)
      redoSteps.removeAll()
    }
    render()
    onChange()
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

  func format(_ format: String) { edit([select(selectedRange), ["action": "format", "format": format]]) }
  func setBlock(_ type: String) { edit([select(selectedRange), ["action": "block", "type": type]]) }
  func indent(_ increase: Bool) {
    edit([select(selectedRange), ["action": "command", "name": increase ? "indent" : "outdent"]])
  }
  func setLink(_ url: String) { edit([select(selectedRange), ["action": "link", "url": url]]) }
  func insertImage(source: String, alt: String) {
    edit([select(selectedRange), ["action": "insertImage", "src": source, "alt": alt]])
  }
  func appendMarkdown(_ markdown: String) { edit([["action": "appendMarkdown", "markdown": markdown]]) }
  func load(_ markdown: String) {
    edit([["action": "load", "markdown": markdown]])
    undoSteps.removeAll()
    redoSteps.removeAll()
  }
  func tableCells(_ unit: Int) -> [[String]] {
    (try? document.request(["action": "tableCells", "unit": unit]).cells) ?? []
  }
  func setTableCell(unit: Int, row: Int, column: Int, markdown: String) {
    edit([
      ["action": "setTableCell", "unit": unit, "row": row, "column": column, "markdown": markdown]
    ])
  }
  private func toggleChecked(_ unit: Int) { edit([["action": "toggleChecked", "unit": unit]]) }

  override func toggleBoldface(_ sender: Any?) { format("bold") }
  override func toggleItalics(_ sender: Any?) { format("italic") }

  func textView(
    _ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String
  ) -> Bool {
    guard text == "\n", markedTextRange == nil else { return true }
    edit(replacement(range, with: text))
    return false
  }

  func textViewDidChange(_ textView: UITextView) {
    // 変換の開始・取り消しも画面へ伝え、変換中は書式ボタンを無効にする。
    guard markedTextRange == nil, self.text != rendered else { return onChange() }
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
    // 絵文字などのサロゲートペアの途中で区切ると、片方だけの不正な文字をLexicalへ送るため文字の境界まで広げる。
    if prefix > 0, UTF16.isLeadSurrogate(old.character(at: prefix - 1)) { prefix -= 1 }
    if suffix > 0, UTF16.isTrailSurrogate(old.character(at: old.length - suffix)) { suffix -= 1 }
    let range = NSRange(location: prefix, length: old.length - suffix - prefix)
    let inserted = new.substring(
      with: NSRange(location: prefix, length: new.length - suffix - prefix))
    edit(replacement(range, with: inserted.replacingOccurrences(of: "\u{2028}", with: "\n")))
  }

  func textViewDidChangeSelection(_ textView: UITextView) {
    guard !isRendering, markedTextRange == nil, text == rendered else { return }
    // 書式ボタンの状態と入力待ちの書式を、カーソル位置のLexicalの選択に合わせる。
    _ = send(select(selectedRange))
    typingAttributes = typing()
    onChange()
  }

  // 区切り線や画像を選択している間は、PCと同じく文字の入力で置き換えない。削除はそのまま通す。
  override func insertText(_ text: String) {
    guard !snapshot.nodeSelected else { return }
    super.insertText(text)
  }

  override func setMarkedText(_ markedText: String?, selectedRange: NSRange) {
    guard !snapshot.nodeSelected else { return }
    super.setMarkedText(markedText, selectedRange: selectedRange)
  }

  override func unmarkText() {
    super.unmarkText()
    textViewDidChange(self)
  }

  override func deleteBackward() {
    let start = position(selectedRange.location)
    // 段落・項目の先頭では、リストや引用の解除と結合をLexicalのBackspaceに任せる。
    if markedTextRange == nil, selectedRange.length == 0, start["offset"] == 0 {
      edit([select(selectedRange), ["action": "command", "name": "backspace"]])
      return
    }
    super.deleteBackward()
  }

  /// 選択範囲をLexical形式と平文でクリップボードへ書き、書けたかどうかを返す。
  private func writeSelection() -> Bool {
    guard send(select(selectedRange)), send(["action": "copy"]), let copied = snapshot.clipboard
    else { return false }
    var item = [String: Any]()
    if let lexical = copied["application/x-lexical-editor"] ?? nil {
      item[Self.lexicalPasteboardType] = Data(lexical.utf8)
    }
    item["public.utf8-plain-text"] = (copied["text/plain"] ?? nil) ?? ""
    pasteboard.items = [item]
    return true
  }

  override func copy(_ sender: Any?) {
    guard selectedRange.length > 0, markedTextRange == nil else { return }
    _ = writeSelection()
  }

  override func cut(_ sender: Any?) {
    // クリップボードへ書けなかった内容は消さない。
    guard selectedRange.length > 0, markedTextRange == nil, writeSelection() else { return }
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
      return pasteboard.hasStrings || pasteboard.contains(pasteboardTypes: [Self.lexicalPasteboardType])
    }
    if action == #selector(toggleUnderline(_:)) { return false }
    return super.canPerformAction(action, withSender: sender)
  }

  // 変換中の文字はLexicalにないため、Undo/Redoで表示を作り直すと消える。
  fileprivate var canUndo: Bool { markedTextRange == nil && !undoSteps.isEmpty }
  fileprivate var canRedo: Bool { markedTextRange == nil && !redoSteps.isEmpty }

  fileprivate func step(_ name: String) {
    guard markedTextRange == nil,
      let steps = name == "undo" ? undoSteps.popLast() : redoSteps.popLast()
    else { return }
    // 途中で拒否された場合は、実際に戻した件数だけを反対側の履歴へ移す。
    var done = 0
    while done < steps, send(["action": "command", "name": name]) { done += 1 }
    if done > 0 { name == "undo" ? redoSteps.append(done) : undoSteps.append(done) }
    render()
    onChange()
  }
}

/// UIKitのUndo操作をLexicalの履歴へ送る。UIKitが入力欄の文字に対して記録する履歴は使わない。
private final class LexicalUndoManager: UndoManager {
  private weak var view: LexicalTextView?

  init(view: LexicalTextView) {
    self.view = view
    super.init()
    // UITextViewが文字の変更ごとに登録する取り消し操作は使わないため、溜めない。
    disableUndoRegistration()
  }

  override var canUndo: Bool { view?.canUndo ?? false }
  override var canRedo: Bool { view?.canRedo ?? false }
  override func undo() { view?.step("undo") }
  override func redo() { view?.step("redo") }
}
