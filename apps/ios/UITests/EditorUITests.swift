import XCTest

@MainActor
final class EditorUITests: XCTestCase {
  func test見出しを編集してMarkdown表示で確認する() {
    let app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]
    app.launch()
    let heading = app.textViews["日本語の執筆 👩🏽‍💻"]
    XCTAssertTrue(heading.waitForExistence(timeout: 10))
    heading.tap()
    heading.typeText("test")
    app.buttons["editor.done"].tap()
    app.navigationBars.buttons["Markdownを確認"].tap()
    XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 5))
    XCTAssertTrue((app.textViews.firstMatch.value as? String)?.contains("test") == true)
    XCTAssertTrue((app.textViews.firstMatch.value as? String)?.contains("[^note]: 脚注の内容。") == true)
  }

  func test表のセルを編集して本文へ戻っても変更を保持する() {
    let app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]
    app.launch()
    let button = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "表を編集")).firstMatch
    for _ in 0..<6 where !button.isHittable { app.swipeUp() }
    XCTAssertTrue(button.isHittable)
    button.tap()
    let cell = app.textViews["日本語"]
    XCTAssertTrue(cell.waitForExistence(timeout: 5))
    cell.tap()
    cell.typeText("cell")
    app.buttons["editor.done"].tap()
    app.navigationBars.buttons.element(boundBy: 0).tap()
    app.navigationBars.buttons["Markdownを確認"].tap()
    XCTAssertTrue((app.textViews.firstMatch.value as? String)?.contains("cell") == true)
    XCTAssertTrue(
      (app.textViews.firstMatch.value as? String)?.contains("| パイプ \\| | `code` |") == true)
  }

  func test見出しボタンで書式を変えても入力とMarkdown出力を続けられる() {
    let app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]
    app.launch()
    let heading = app.textViews["日本語の執筆 👩🏽‍💻"]
    XCTAssertTrue(heading.waitForExistence(timeout: 10))
    heading.tap()
    app.buttons["editor.h2"].tap()
    XCTAssertTrue(app.buttons["editor.h2"].isSelected)
    app.typeText("menu")
    app.buttons["editor.done"].tap()
    app.navigationBars.buttons["Markdownを確認"].tap()
    let source = app.textViews.firstMatch.value as? String ?? ""
    XCTAssertTrue(source.hasPrefix("## "))
    XCTAssertTrue(source.contains("menu"))
    XCTAssertTrue(source.contains("[^note]: 脚注の内容。"))
  }

  func test太字を直接押して入力したMarkdown記法も装飾に変わる() {
    let app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]
    app.launch()
    let heading = app.textViews["日本語の執筆 👩🏽‍💻"]
    XCTAssertTrue(heading.waitForExistence(timeout: 10))
    heading.tap()
    let bold = app.buttons["editor.bold"]
    XCTAssertTrue(bold.isHittable)
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "キーボード上の編集メニュー"
    screenshot.lifetime = .keepAlways
    add(screenshot)
    bold.tap()
    app.typeText("bold")
    bold.tap()
    app.typeText(" **markdown**")
    app.buttons["editor.done"].tap()
    app.navigationBars.buttons["Markdownを確認"].tap()
    let source = app.textViews.firstMatch.value as? String ?? ""
    XCTAssertTrue(source.contains("**bold**"), source)
    XCTAssertTrue(source.contains("**markdown**"), source)
    XCTAssertFalse(source.contains("\\*\\*markdown"))
  }

  func testMarkdown原文を直接編集して本文へ戻っても入力を保持する() {
    let app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]
    app.launch()
    app.navigationBars.buttons["Markdownを確認"].tap()
    let source = app.textViews["editor.markdown-source"]
    XCTAssertTrue(source.waitForExistence(timeout: 5))
    source.tap()
    source.typeText("\n\n## source-edit\n")
    app.navigationBars.buttons["editor.source.done"].tap()
    app.navigationBars.buttons["Markdownを確認"].tap()
    XCTAssertTrue((source.value as? String)?.contains("## source-edit") == true)
    XCTAssertTrue((source.value as? String)?.contains("[^note]: 脚注の内容。") == true)
  }

  func testリスト記法で入力し改行すると次の項目を続けて書ける() {
    let app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]
    app.launch()
    let heading = app.textViews["日本語の執筆 👩🏽‍💻"]
    XCTAssertTrue(heading.waitForExistence(timeout: 10))
    heading.tap()
    app.typeText("\n- one\ntwo")
    app.buttons["editor.done"].tap()
    app.navigationBars.buttons["Markdownを確認"].tap()
    let source = app.textViews.firstMatch.value as? String ?? ""
    XCTAssertTrue(source.contains("- one\n- two"), source)
  }

  func test横スクロール先の画像ボタンから写真選択を開いてキャンセルしても入力を続けられる() {
    let app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]
    app.launch()
    let heading = app.textViews["日本語の執筆 👩🏽‍💻"]
    XCTAssertTrue(heading.waitForExistence(timeout: 10))
    heading.tap()
    let menu = app.scrollViews["editor.keyboard-actions"]
    let image = app.buttons["editor.image"]
    for _ in 0..<3 where !image.isHittable { menu.swipeLeft() }
    XCTAssertTrue(image.isHittable)
    image.tap()
    let cancel = app.buttons.matching(NSPredicate(format: "label IN %@", ["キャンセル", "Cancel"]))
      .firstMatch
    XCTAssertTrue(cancel.waitForExistence(timeout: 10))
    cancel.tap()
    XCTAssertTrue(app.buttons["editor.done"].waitForExistence(timeout: 5))
    app.typeText("photocancel")
    app.buttons["editor.done"].tap()
    app.navigationBars.buttons["Markdownを確認"].tap()
    XCTAssertTrue((app.textViews.firstMatch.value as? String)?.contains("photocancel") == true)
  }
}
