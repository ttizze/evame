import XCTest

/// 文書全体を1つの入力欄で編集する画面を、実際のキーボード入力とボタン操作で確かめる。
@MainActor
final class EditorUITests: XCTestCase {
  private var app: XCUIApplication!
  private var editor: XCUIElement { app.textViews["editor.text"] }

  override func setUp() {
    continueAfterFailure = false
    app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]
    app.launch()
    XCTAssertTrue(editor.waitForExistence(timeout: 10))
  }

  /// 先頭の見出しの右端を押して、カーソルを見出しの末尾へ置く。
  private func tapEndOfHeading() {
    editor.coordinate(withNormalizedOffset: .zero)
      .withOffset(CGVector(dx: editor.frame.width - 24, dy: 32)).tap()
    XCTAssertTrue(app.buttons["editor.done"].waitForExistence(timeout: 5))
  }

  /// キーボードを閉じてMarkdown表示を開き、書き出されたMarkdownを返す。
  private func markdown() -> String {
    if app.buttons["editor.done"].exists { app.buttons["editor.done"].tap() }
    app.navigationBars.buttons["Markdownを確認"].tap()
    let source = app.textViews["editor.markdown-source"]
    XCTAssertTrue(source.waitForExistence(timeout: 5))
    return source.value as? String ?? ""
  }

  /// 横にスクロールするキーボード上のメニューで、指定のボタンが押せる位置まで送る。
  private func menuButton(_ identifier: String) -> XCUIElement {
    let button = app.buttons[identifier]
    let menu = app.scrollViews["editor.keyboard-actions"]
    for _ in 0..<4 where !button.isHittable { menu.swipeLeft() }
    XCTAssertTrue(button.isHittable, identifier)
    return button
  }

  private func scrollTo(_ element: XCUIElement) {
    for _ in 0..<8 where !element.isHittable { editor.swipeUp() }
    XCTAssertTrue(element.isHittable)
  }

  func test見出しの末尾に入力するとMarkdownの見出しへ反映し他の内容を保つ() {
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "共通テスト文書の表示"
    screenshot.lifetime = .keepAlways
    add(screenshot)
    tapEndOfHeading()
    app.typeText("test")
    let source = markdown()
    XCTAssertTrue(source.hasPrefix("# 日本語の執筆 👩🏽‍💻test\n"), source)
    XCTAssertTrue(source.contains("[^note]: 脚注の内容。"), source)
    XCTAssertTrue(source.contains("[reference]: https://example.com/reference"), source)
  }

  func test斜体ボタンで日本語と英字を入力し解除後の文字と区別できる() {
    tapEndOfHeading()
    app.typeText("\n")
    let italic = menuButton("editor.italic")
    italic.tap()
    XCTAssertTrue(italic.isSelected)
    app.typeText("日本語italic")
    italic.tap()
    XCTAssertFalse(italic.isSelected)
    app.typeText("通常plain")
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "日本語と英字の斜体と解除後の通常文字"
    screenshot.lifetime = .keepAlways
    add(screenshot)
    let source = markdown()
    XCTAssertTrue(source.contains("\n*日本語italic*通常plain\n"), source)
  }

  func test太字ボタンで入力した文字とMarkdown記法で入力した文字が太字になる() {
    tapEndOfHeading()
    app.typeText("\n")
    let bold = menuButton("editor.bold")
    bold.tap()
    app.typeText("bold")
    bold.tap()
    app.typeText(" **markdown**")
    let source = markdown()
    XCTAssertTrue(source.contains("**bold** **markdown**"), source)
  }

  func test見出しボタンで見出しの段階を変えて入力を続けられる() {
    tapEndOfHeading()
    let h2 = menuButton("editor.h2")
    h2.tap()
    XCTAssertTrue(h2.isSelected)
    app.typeText("menu")
    let source = markdown()
    XCTAssertTrue(source.hasPrefix("## 日本語の執筆 👩🏽‍💻menu\n"), source)
  }

  func testリスト記法で入力し改行すると次の項目を続けて書ける() {
    tapEndOfHeading()
    app.typeText("\n- one\ntwo")
    let source = markdown()
    XCTAssertTrue(source.contains("\n- one\n- two\n"), source)
  }

  func test空のリスト項目でBackspaceを押すと前の項目の末尾へ入力を続ける() {
    tapEndOfHeading()
    app.typeText("\n- one\n")
    app.typeText(XCUIKeyboardKey.delete.rawValue + "X")
    let source = markdown()
    XCTAssertTrue(source.contains("\n- oneX\n"), source)
  }

  func test入れ子のリストは文字のある項目の改行で深さを保ち空の項目の改行だけ一段戻る() {
    tapEndOfHeading()
    app.typeText("\n- parent\nchild")
    menuButton("editor.indent").tap()
    app.typeText("\nnext\n\nouter")
    let source = markdown()
    XCTAssertTrue(source.contains("\n- parent\n  - child\n  - next\n- outer\n"), source)
  }

  func test番号付きリストを字下げして戻しても同じ項目へ入力を続けられる() {
    tapEndOfHeading()
    app.typeText("\n1. a\nb")
    menuButton("editor.indent").tap()
    menuButton("editor.outdent").tap()
    app.typeText("続き")
    let source = markdown()
    XCTAssertTrue(source.contains("\n1. a\n2. b続き\n"), source)
  }

  func testチェック項目の改行で空の項目へ入力し空の項目の改行でリストを抜ける() {
    tapEndOfHeading()
    app.typeText("\n")
    menuButton("editor.more").tap()
    app.buttons["チェックリスト"].tap()
    app.typeText("牛乳\n買い物\n\n外側")
    var source = markdown()
    XCTAssertTrue(source.contains("\n- [ ] 牛乳\n- [ ] 買い物\n\n外側\n"), source)
    // 原文を編集してMarkdownから読み込み直しても、チェック項目のまま編集を続けられる。
    let sourceView = app.textViews["editor.markdown-source"]
    sourceView.coordinate(withNormalizedOffset: CGVector(dx: 0.02, dy: 0.02)).tap()
    sourceView.typeText("再読み込み\n\n")
    app.navigationBars.buttons["editor.source.done"].tap()
    XCTAssertTrue((editor.value as? String)?.hasPrefix("再読み込み\n") == true)
    let box = app.buttons.matching(
      NSPredicate(format: "identifier == %@ AND label == %@", "editor.checkbox", "牛乳")
    ).firstMatch
    XCTAssertTrue(box.waitForExistence(timeout: 5))
    XCTAssertEqual(box.value as? String, "未完了")
    box.tap()
    source = markdown()
    XCTAssertTrue(source.contains("\n- [x] 牛乳\n- [ ] 買い物\n"), source)
  }

  func testチェックボックスを押すと完了と未完了が切り替わる() {
    let box = app.buttons.matching(
      NSPredicate(format: "identifier == %@ AND label == %@", "editor.checkbox", "未完了")
    ).firstMatch
    scrollTo(box)
    XCTAssertEqual(box.value as? String, "未完了")
    box.tap()
    let source = markdown()
    XCTAssertTrue(source.contains("- [x] 完了\n- [x] 未完了"), source)
  }

  func test表のセルを編集して本文へ戻っても変更を保持する() {
    let table = app.buttons["editor.table"]
    scrollTo(table)
    table.tap()
    let cell = app.textFields.matching(identifier: "editor.table-cell").element(boundBy: 2)
    XCTAssertTrue(cell.waitForExistence(timeout: 5))
    XCTAssertEqual(cell.value as? String, "日本語")
    cell.tap()
    app.typeText("cell")
    app.navigationBars.buttons.element(boundBy: 0).tap()
    let source = markdown()
    XCTAssertTrue(source.contains("| 日本語cell |"), source)
    XCTAssertTrue(source.contains("| パイプ \\| "), source)
    XCTAssertTrue(source.contains("---: |"), source)
  }

  func test段落の追加をUndoで戻しRedoでやり直せる() {
    let original = editor.value as? String
    tapEndOfHeading()
    app.typeText("\n")
    let added = editor.value as? String
    XCTAssertNotEqual(added, original)
    menuButton("editor.more").tap()
    app.buttons["元に戻す"].tap()
    XCTAssertEqual(editor.value as? String, original)
    menuButton("editor.more").tap()
    app.buttons["やり直す"].tap()
    XCTAssertEqual(editor.value as? String, added)
  }

  func testMarkdown原文を編集して戻ると本文を置き換え古い変更をUndoで戻さない() {
    tapEndOfHeading()
    app.typeText("old")
    _ = markdown()
    let source = app.textViews["editor.markdown-source"]
    source.coordinate(withNormalizedOffset: CGVector(dx: 0.02, dy: 0.02)).tap()
    source.typeText("source-latest\n\n")
    app.navigationBars.buttons["editor.source.done"].tap()
    XCTAssertTrue((editor.value as? String)?.hasPrefix("source-latest\n") == true)
    tapEndOfHeading()
    menuButton("editor.more").tap()
    let undo = app.buttons["元に戻す"]
    XCTAssertTrue(undo.waitForExistence(timeout: 5))
    XCTAssertFalse(undo.isEnabled)
  }

  func test写真の選択を開いてキャンセルしても入力を続けられる() {
    tapEndOfHeading()
    menuButton("editor.image").tap()
    let cancel = app.buttons.matching(NSPredicate(format: "label IN %@", ["キャンセル", "Cancel"]))
      .firstMatch
    XCTAssertTrue(cancel.waitForExistence(timeout: 10))
    cancel.tap()
    XCTAssertTrue(app.buttons["editor.done"].waitForExistence(timeout: 5))
    app.typeText("photocancel")
    XCTAssertTrue(markdown().hasPrefix("# 日本語の執筆 👩🏽‍💻photocancel\n"))
  }
}
