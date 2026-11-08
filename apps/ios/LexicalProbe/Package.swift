// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "EvameLexicalProbe",
  platforms: [.macOS(.v15), .iOS(.v18)],
  dependencies: [
    .package(url: "https://github.com/swiftlang/swift-markdown.git", exact: "0.9.0")
  ],
  targets: [
    .testTarget(
      name: "LexicalProbeTests",
      dependencies: [.product(name: "Markdown", package: "swift-markdown")],
      path: "Swift", resources: [.copy("Generated")])
  ])
