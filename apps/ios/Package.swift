// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "EvameEditor",
  platforms: [.iOS(.v18), .macOS(.v15)],
  products: [.library(name: "EditorCore", targets: ["EditorCore"])],
  dependencies: [
    .package(url: "https://github.com/swiftlang/swift-markdown.git", exact: "0.9.0")
  ],
  targets: [
    .target(
      name: "EditorCore", dependencies: [.product(name: "Markdown", package: "swift-markdown")],
      resources: [.process("Resources")]),
    .testTarget(
      name: "EditorCoreTests", dependencies: ["EditorCore"], resources: [.copy("Fixtures")]),
  ]
)
