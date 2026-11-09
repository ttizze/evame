import XCTest

@MainActor
final class VditorUITests: XCTestCase {
  func testリストの改行とBackspaceを実際のWebViewで入力する() {
    for (first, next) in [("一つ", "次"), ("first", "next")] {
      let app = XCUIApplication()
      app.launchArguments = [
        "--sample", "list", "-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP",
      ]
      app.launch()
      XCTAssertTrue(app.staticTexts["準備完了"].waitForExistence(timeout: 15))
      let input = app.webViews.textViews.firstMatch
      XCTAssertTrue(input.waitForExistence(timeout: 5))
      input.tap()
      app.typeText("\(first)\n\(next)")
      app.buttons["原文"].tap()
      let source = app.textViews["vditor.source"]
      XCTAssertTrue(source.waitForExistence(timeout: 5))
      XCTAssertEqual(source.value as? String, "- \(first)\n- \(next)\n")
      app.buttons["原文"].tap()
      app.typeText(XCUIKeyboardKey.delete.rawValue)
      app.buttons["原文"].tap()
      XCTAssertEqual(source.value as? String, "- \(first)\n- \(next.dropLast())\n")
      app.terminate()
    }
  }

  func testネイティブのキーボード上メニューで斜体を適用しUndoRedoして入力を続ける() {
    let app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]
    app.launch()
    XCTAssertTrue(app.staticTexts["準備完了"].waitForExistence(timeout: 15))
    let input = app.webViews.textViews.firstMatch
    XCTAssertTrue(input.waitForExistence(timeout: 5))
    input.tap()
    let keyboard = app.keyboards.firstMatch
    XCTAssertTrue(keyboard.waitForExistence(timeout: 5))
    let italic = app.buttons["vditor.italic"]
    XCTAssertTrue(italic.isHittable)
    XCTAssertLessThanOrEqual(italic.frame.maxY, keyboard.frame.minY + 1)
    italic.tap()
    XCTAssertTrue(keyboard.exists, "書式ボタンでキーボードを閉じない")
    app.typeText("斜体italic")
    italic.tap()
    app.typeText("通常")
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "WebViewとネイティブメニュー"
    screenshot.lifetime = .keepAlways
    add(screenshot)
    app.buttons["原文"].tap()
    let source = app.textViews["vditor.source"]
    XCTAssertTrue(source.waitForExistence(timeout: 5))
    XCTAssertTrue(
      (source.value as? String ?? "").contains("*斜体italic*通常"), source.value as? String ?? "")
    let beforeUndo = source.value as? String
    app.buttons["原文"].tap()
    app.buttons["vditor.undo"].tap()
    app.buttons["原文"].tap()
    XCTAssertNotEqual(source.value as? String, beforeUndo, "Undoで実際に内容が変わる")
    app.buttons["原文"].tap()
    app.buttons["vditor.redo"].tap()
    app.buttons["原文"].tap()
    XCTAssertEqual(source.value as? String, beforeUndo, "Redoで内容全体が元へ戻る")
  }
}
