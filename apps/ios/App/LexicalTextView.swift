import CoreText
import UIKit
import UniformTypeIdentifiers

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
  /// 表示した画像を参照名で引く。端末に保存した写真はファイルから、URLの画像は通信で読み込む。
  private var images: [String: UIImage] = [:]
  /// 端末に保存した写真の参照名からファイルを引く。端末の写真でなければnil。
  private let imageFile: (String) -> URL?
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

  init(
    document: LexicalDocument, markdown: String, pasteboard: UIPasteboard,
    imageFile: @escaping (String) -> URL?
  ) throws {
    self.document = document
    self.pasteboard = pasteboard
    self.imageFile = imageFile
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
    // Webの引用と同じく、斜体のやや太い文字にする。
    if unit.context.quote > 0, unit.block?.type == "paragraph" {
      return slanted(.systemFont(ofSize: Self.baseSize, weight: .medium))
    }
    switch (unit.block?.type, unit.block?.level) {
    case ("heading", 1): return .systemFont(ofSize: 28, weight: .bold)
    case ("heading", 2): return .systemFont(ofSize: 24, weight: .bold)
    case ("heading", 3): return .systemFont(ofSize: 20, weight: .semibold)
    case ("heading", _): return .systemFont(ofSize: 18, weight: .semibold)
    case ("code", _): return .monospacedSystemFont(ofSize: 15, weight: .regular)
    default: return .systemFont(ofSize: Self.baseSize)
    }
  }

  private func indentation(lists: Int, quote: Int, footnote: Bool) -> CGFloat {
    CGFloat(lists) * 28 + CGFloat(quote) * 16 + (footnote ? 16 : 0)
  }

  private func base(_ unit: LexicalDocument.Unit) -> [NSAttributedString.Key: Any] {
    let paragraph = NSMutableParagraphStyle()
    paragraph.firstLineHeadIndent = indentation(
      lists: unit.context.lists.count, quote: unit.context.quote,
      footnote: unit.context.footnote != nil)
    paragraph.headIndent = indentation(
      lists: unit.context.lists.count, quote: unit.context.quote,
      footnote: unit.context.footnote != nil)
    paragraph.paragraphSpacing = unit.block?.type == "heading" ? 10 : 6
    var foreground = unit.context.footnote == nil ? UIColor.label : .secondaryLabel
    if unit.block?.type == "code" {
      // Webのコードブロックと同じく、濃い背景（重ねて描く）の内側に明るい文字を余白つきで置く。
      paragraph.firstLineHeadIndent += 12
      paragraph.headIndent += 12
      paragraph.tailIndent = -12
      paragraph.paragraphSpacingBefore = 10
      paragraph.paragraphSpacing = 14
      foreground = UIColor(white: 0.9, alpha: 1)
    }
    return [.font: font(unit), .paragraphStyle: paragraph, .foregroundColor: foreground]
  }

  /// 日本語の代替フォントにも斜体が効くよう、書体の指定ではなく描画行列で傾ける。
  private func slanted(_ font: UIFont) -> UIFont {
    UIFont(
      descriptor: font.fontDescriptor.withMatrix(
        CGAffineTransform(a: 1, b: 0, c: 0.2, d: 1, tx: 0, ty: 0)),
      size: font.pointSize)
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
    if formats.contains("italic") { font = slanted(font) }
    attributes[.font] = font
    if formats.contains("strikethrough") {
      attributes[.strikethroughStyle] = NSUnderlineStyle.single.rawValue
    }
    if link != nil {
      attributes[.link] = link
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
    if decorator.type == "image", let src = decorator.src {
      if images[src] == nil, let file = imageFile(src) {
        images[src] = UIImage(contentsOfFile: file.path)
      }
      if let image = images[src] {
        let imageAttachment = ImageAttachment(data: nil, ofType: nil)
        imageAttachment.image = image
        return imageAttachment
      }
    }
    let attachment = NSTextAttachment()
    switch decorator.type {
    case "image":
      let src = decorator.src ?? ""
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
    let decoratedUnits = snapshot.units.enumerated().filter { _, unit in
      unit.block?.type == "code" || unit.context.quote > 0
        || unit.atomic?.type == "table" || !unit.listItems.isEmpty
    }
    guard !decoratedUnits.isEmpty else { return }
    // 画面外の文字は推定位置のことがある。範囲ごとの位置取得で配置が動かないよう先に確定する。
    if let textLayoutManager, let range = textLayoutManager.textContentManager?.documentRange {
      textLayoutManager.ensureLayout(for: range)
    }
    let left = textContainerInset.left + textContainer.lineFragmentPadding
    let markedStart = markedTextRange.map { offset(from: beginningOfDocument, to: $0.start) }
    let markedLengthChange = textStorage.length - (rendered as NSString).length
    // 未確定入力はUIKitだけが持つ。後続のブロックも、変換前の文書ではなく現在の表示位置へ合わせる。
    func textPosition(at sourceOffset: Int) -> UITextPosition? {
      let location: Int
      if let markedStart, sourceOffset > markedStart {
        location = max(markedStart, sourceOffset + markedLengthChange)
      } else {
        location = sourceOffset
      }
      return position(from: beginningOfDocument, offset: location)
    }
    for (index, unit) in decoratedUnits {
      guard let start = textPosition(at: unitStarts[index]),
        let end = textPosition(at: unitStarts[index] + length(unit))
      else { continue }
      let first = caretRect(for: start)
      // 変換中の文字は表示単位の長さに含まれないため、この単位の中にあれば下端をその末尾まで伸ばす。
      var bottom = caretRect(for: end).maxY
      if let marked = markedTextRange, offset(from: start, to: marked.start) >= 0,
        offset(from: marked.start, to: end) >= 0
      {
        bottom = max(bottom, caretRect(for: marked.end).maxY)
      }
      if unit.block?.type == "code" {
        // 文字の後ろに描くため、入力欄の文字より下に重ねる。
        let x =
          left
          + indentation(
            lists: unit.context.lists.count, quote: unit.context.quote,
            footnote: unit.context.footnote != nil)
        let background = UIView(
          frame: CGRect(
            x: x, y: first.minY - 8,
            width: bounds.width - textContainerInset.right - textContainer.lineFragmentPadding - x,
            height: bottom - first.minY + 16))
        background.backgroundColor = UIColor(
          red: 31 / 255, green: 41 / 255, blue: 55 / 255, alpha: 1)
        background.layer.cornerRadius = 6
        background.isUserInteractionEnabled = false
        background.accessibilityIdentifier = "editor.code-block"
        insertSubview(background, at: 0)
        overlays.append(background)
      }
      if unit.context.quote > 0 {
        // 同じ引用の次の単位があれば、段落の間隔も含めてその先頭まで線をつなげる。
        if snapshot.units.indices.contains(index + 1),
          snapshot.units[index + 1].context.quote >= unit.context.quote,
          let next = textPosition(at: unitStarts[index + 1])
        {
          bottom = max(bottom, caretRect(for: next).minY)
        }
        let bar = UIView(
          frame: CGRect(
            x: left + CGFloat(unit.context.quote - 1) * 16, y: first.minY, width: 4,
            height: bottom - first.minY))
        bar.backgroundColor = .systemGray3
        bar.accessibilityIdentifier = "editor.quote-bar"
        add(bar)
      }
      if unit.atomic?.type == "table", let attachment = position(from: end, offset: -1),
        let range = textRange(from: attachment, to: end)
      {
        // 表は本文中では1つの部品として表示し、押すと表の編集画面を開く。直前の変換中の文字は範囲に含めない。
        let button = UIButton(
          type: .custom, primaryAction: UIAction { [weak self] _ in self?.onTableTap(index) })
        button.accessibilityLabel = String(localized: "表を編集")
        button.accessibilityIdentifier = "editor.table"
        button.frame = firstRect(for: range)
        add(button)
      }

      for (itemIndex, item) in unit.listItems.enumerated() {
        guard item.depth > 0, item.depth <= unit.context.lists.count else { continue }
        let list = unit.context.lists[item.depth - 1]
        let frame = CGRect(
          x: left + indentation(lists: item.depth, quote: item.quote, footnote: item.footnote) - 26,
          y: first.minY, width: 24, height: first.height)
        if list.kind == "check" {
          let checked = item.checked == true
          let button = UIButton(
            type: .system,
            primaryAction: UIAction { [weak self] _ in self?.toggleChecked(index, item: itemIndex) }
          )
          button.setImage(
            UIImage(systemName: checked ? "checkmark.square.fill" : "square"), for: .normal)
          button.accessibilityLabel = item.label
          button.accessibilityValue = checked ? String(localized: "完了") : String(localized: "未完了")
          button.accessibilityIdentifier = "editor.checkbox"
          button.frame = frame
          add(button)
        } else {
          let marker = UILabel(frame: frame)
          marker.text =
            list.kind == "number" ? "\(item.value)." : ["•", "◦", "▪"][(item.depth - 1) % 3]
          marker.font = font(unit)
          marker.textAlignment = .right
          marker.textColor = .secondaryLabel
          add(marker)
        }
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

  func format(_ format: String) {
    edit([select(selectedRange), ["action": "format", "format": format]])
  }
  func setBlock(_ type: String) {
    edit([select(selectedRange), ["action": "block", "type": type]])
  }
  func indent(_ increase: Bool) {
    edit([select(selectedRange), ["action": "command", "name": increase ? "indent" : "outdent"]])
  }
  func setLink(_ url: String) { edit([select(selectedRange), ["action": "link", "url": url]]) }
  /// カーソルの位置に表を入れ、入れた表の表示単位を返す。
  func insertTable() -> Int? {
    edit([select(selectedRange), ["action": "insertTable"]])
    guard let unit = snapshot.selection?.focus.unit,
      snapshot.units.indices.contains(unit), snapshot.units[unit].atomic?.type == "table"
    else { return nil }
    return unit
  }
  func insertImage(source: String, alt: String) {
    edit([select(selectedRange), ["action": "insertImage", "src": source, "alt": alt]])
  }
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
  private func toggleChecked(_ unit: Int, item: Int) {
    edit([["action": "toggleChecked", "unit": unit, "item": item]])
  }

  override func toggleBoldface(_ sender: Any?) { format("bold") }
  override func toggleItalics(_ sender: Any?) { format("italic") }

  func textView(
    _ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String
  ) -> Bool {
    guard text == "\n", markedTextRange == nil else { return true }
    edit([select(range), ["action": "insert", "text": text]])
    return false
  }

  func textViewDidChange(_ textView: UITextView) {
    // 変換の開始・取り消しも画面へ伝え、変換中は書式ボタンを無効にする。
    guard markedTextRange == nil, self.text != rendered else {
      // 変換中の文字で行が増えても、コードブロックの背景などの重ねた表示を追いつかせる。
      overlayWidth = 0
      setNeedsLayout()
      return onChange()
    }
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
    edit([select(range), ["action": "insert", "text": inserted]])
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
    let selection = attributedText.attributedSubstring(from: selectedRange)
    let exported = NSMutableAttributedString(attributedString: selection)
    selection.enumerateAttribute(.font, in: NSRange(location: 0, length: selection.length)) {
      value, range, _ in
      guard let font = value as? UIFont, CTFontGetMatrix(font).c != 0 else { return }
      let name =
        font.fontDescriptor.symbolicTraits.contains(.traitBold)
        ? "Helvetica-BoldOblique" : "Helvetica-Oblique"
      exported.addAttribute(
        .font,
        value: UIFont(name: name, size: font.pointSize)
          ?? UIFont.italicSystemFont(ofSize: font.pointSize), range: range)
    }
    if let plain = copied["text/plain"] ?? nil, plain.utf16.count == exported.length {
      let characters = plain as NSString
      for index in (0..<characters.length).reversed() where characters.character(at: index) == 10 {
        exported.replaceCharacters(in: NSRange(location: index, length: 1), with: "\n")
      }
    }
    if let data = try? exported.data(
      from: NSRange(location: 0, length: exported.length),
      documentAttributes: [.documentType: NSAttributedString.DocumentType.rtfd])
    {
      item[UTType.flatRTFD.identifier] = data
    }
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
    edit([select(selectedRange), ["action": "insert", "text": ""]])
  }

  override func paste(_ sender: Any?) {
    guard markedTextRange == nil else { return }
    var clipboard = ["text/plain": pasteboard.string ?? ""]
    if let data = pasteboard.data(forPasteboardType: Self.lexicalPasteboardType) {
      clipboard["application/x-lexical-editor"] = String(decoding: data, as: UTF8.self)
    } else {
      for (type, format) in [
        (UTType.flatRTFD.identifier, NSAttributedString.DocumentType.rtfd),
        (UTType.rtf.identifier, .rtf),
      ] {
        guard let data = pasteboard.data(forPasteboardType: type),
          let source = try? NSAttributedString(
            data: data, options: [.documentType: format], documentAttributes: nil)
        else { continue }
        var runs = [[String: Any]]()
        source.enumerateAttributes(in: NSRange(location: 0, length: source.length)) {
          attributes, range, _ in
          let font = attributes[.font] as? UIFont
          let traits = font?.fontDescriptor.symbolicTraits ?? []
          var formats = [String]()
          if traits.contains(.traitBold) { formats.append("bold") }
          if traits.contains(.traitItalic) || font.map({ CTFontGetMatrix($0).c != 0 }) == true {
            formats.append("italic")
          }
          if traits.contains(.traitMonoSpace) { formats.append("code") }
          if let strike = attributes[.strikethroughStyle] as? Int, strike != 0 {
            formats.append("strikethrough")
          }
          let link = (attributes[.link] as? URL)?.absoluteString ?? attributes[.link] as? String
          let text = source.attributedSubstring(from: range).string
          runs.append([
            "text": attributes[.attachment] == nil
              ? text : text.replacingOccurrences(of: "\u{fffc}", with: ""), "formats": formats,
            "link": link ?? "",
          ])
        }
        guard runs.contains(where: { ($0["text"] as? String)?.isEmpty == false }) else { return }
        edit([select(selectedRange), ["action": "pasteAttributed", "runs": runs]])
        return
      }
    }
    edit([select(selectedRange), ["action": "paste", "clipboard": clipboard]])
  }

  override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
    if action == #selector(paste(_:)) {
      return pasteboard.hasStrings
        || pasteboard.contains(pasteboardTypes: [
          Self.lexicalPasteboardType, UTType.flatRTFD.identifier, UTType.rtf.identifier,
        ])
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

/// UIKitの両テキストレイアウトから、現在の行幅に合わせて写真の大きさを求める。
private final class ImageAttachment: NSTextAttachment {
  override func attachmentBounds(
    for _: [NSAttributedString.Key: Any], location _: any NSTextLocation,
    textContainer _: NSTextContainer?, proposedLineFragment: CGRect, position _: CGPoint
  ) -> CGRect {
    Self.imageBounds(size: image?.size ?? .zero, width: proposedLineFragment.width)
  }

  override func attachmentBounds(
    for _: NSTextContainer?, proposedLineFragment lineFrag: CGRect,
    glyphPosition _: CGPoint, characterIndex _: Int
  ) -> CGRect {
    Self.imageBounds(size: image?.size ?? .zero, width: lineFrag.width)
  }

  private static func imageBounds(size: CGSize, width: CGFloat) -> CGRect {
    guard size.width > 0 else { return .zero }
    let scale = min(1, max(1, width) / size.width)
    return CGRect(
      origin: .zero,
      size: CGSize(width: size.width * scale, height: size.height * scale))
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
