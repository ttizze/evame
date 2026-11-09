#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

swift test --disable-automatic-resolution
swift build --disable-automatic-resolution

# iOS向けのSwiftUI表示・選択APIも、iOS SDKを明示してコンパイルする。UIの実描画・タップ操作は
# 別検証であり、この独立Packageではシミュレーターへアプリをインストールしない。
sdk_path="$(xcrun --sdk iphonesimulator --show-sdk-path)"
swift build \
  --disable-automatic-resolution \
  --package-path "$PWD" \
  --sdk "$sdk_path" \
  --triple arm64-apple-ios18.0-simulator
