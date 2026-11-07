// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "EvameEditor",
  platforms: [.iOS(.v18), .macOS(.v15)],
  products: [.library(name: "EditorCore", targets: ["EditorCore"])],
  dependencies: [
    .package(url: "https://github.com/swiftlang/swift-markdown.git", exact: "0.7.3")
  ],
  targets: [
    .target(
      name: "EditorCore", dependencies: [.product(name: "Markdown", package: "swift-markdown")]),
    .testTarget(
      name: "EditorCoreTests", dependencies: ["EditorCore"], resources: [.copy("Fixtures")]),
  ]
)
