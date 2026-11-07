#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"
if [[ -z "${IN_NIX_SHELL:-}" ]]; then
  exec nix develop --command bash scripts/ios.sh "$@"
fi

if [[ "$(xcodebuild -version)" != $'Xcode 26.6\nBuild version 17F113' ]]; then
  echo 'Xcode 26.6 (17F113) を DEVELOPER_DIR で指定してください。' >&2
  exit 1
fi

case "${1:-}" in
  generate|test) ;;
  *) echo 'Usage: bash scripts/ios.sh generate | test <xcodebuild destination>' >&2; exit 2 ;;
esac
if [[ "$1" == test && -z "${2:-}" ]]; then
  echo 'test にはシミュレータの destination が必要です。' >&2
  exit 2
fi

xcodegen generate --spec apps/ios/project.yml
resolved_dir=apps/ios/EvameEditorPrototype.xcodeproj/project.xcworkspace/xcshareddata/swiftpm
mkdir -p "$resolved_dir"
cp apps/ios/Package.resolved "$resolved_dir/Package.resolved"

if [[ "$1" == test ]]; then
  xcrun swift test --package-path apps/ios --disable-automatic-resolution
  xcodebuild \
    -project apps/ios/EvameEditorPrototype.xcodeproj \
    -scheme EvameEditorPrototype \
    -destination "$2" \
    -derivedDataPath apps/ios/DerivedData \
    -parallel-testing-enabled NO \
    -onlyUsePackageVersionsFromResolvedFile \
    test
fi
