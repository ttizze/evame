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
    app.toolbars.buttons["editor.done"].tap()
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
    app.toolbars.buttons["editor.done"].tap()
    app.navigationBars.buttons.element(boundBy: 0).tap()
    app.navigationBars.buttons["Markdownを確認"].tap()
    XCTAssertTrue((app.textViews.firstMatch.value as? String)?.contains("cell") == true)
    XCTAssertTrue(
      (app.textViews.firstMatch.value as? String)?.contains("| パイプ \\| | `code` |") == true)
  }
}
