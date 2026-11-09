// swift-tools-version: 6.0

import PackageDescription

let package = Package(
  name: "TextualProbe",
  platforms: [
    .macOS(.v15),
    .iOS(.v18),
  ],
  dependencies: [
    .package(url: "https://github.com/gonzalezreal/textual.git", exact: "0.5.0")
  ],
  targets: [
    .target(
      name: "TextualProbe",
      dependencies: [.product(name: "Textual", package: "textual")]
    ),
    .testTarget(
      name: "TextualProbeTests",
      dependencies: [
        .product(name: "Textual", package: "textual")
      ]
    ),
  ]
)
