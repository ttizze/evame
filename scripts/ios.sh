#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"
if [[ -z "${IN_NIX_SHELL:-}" ]]; then
  if [[ "${1:-}" == comrak-probe ]]; then
    exec nix develop .#comrak --command bash scripts/ios.sh "$@"
  fi
  exec nix develop --command bash scripts/ios.sh "$@"
fi

if [[ "$(xcodebuild -version)" != $'Xcode 26.6\nBuild version 17F113' ]]; then
  echo 'Xcode 26.6 (17F113) を DEVELOPER_DIR で指定してください。' >&2
  exit 1
fi

case "${1:-}" in
  generate|test) ;;
  comrak-probe)
    bash apps/ios/ComrakProbe/run.sh "${2:?simulator UUID is required}"
    exit
    ;;
  test-lexical)
    bash apps/ios/LexicalProbe/run.sh "${2:?xcodebuild destination is required}"
    exit
    ;;
  test-textual)
    bash apps/ios/TextualProbe/run.sh
    exit
    ;;
  test-vditor)
    bash apps/ios/VditorProbe/run.sh "${2:?xcodebuild destination is required}"
    exit
    ;;
  *) echo 'Usage: bash scripts/ios.sh generate | test <xcodebuild destination> | comrak-probe <simulator UUID> | test-lexical <xcodebuild destination> | test-textual | test-vditor <xcodebuild destination>' >&2; exit 2 ;;
esac
if [[ "$1" == test && -z "${2:-}" ]]; then
  echo 'test にはシミュレータの destination が必要です。' >&2
  exit 2
fi

(cd apps/ios/EditorModel && bun install --frozen-lockfile)
bun apps/ios/EditorModel/build.mjs
# LexicalのモデルはPCのエディタと同じ依存をルートのロックファイルから使う。
bun install --frozen-lockfile
bun apps/ios/LexicalModel/build.mjs
bun tests/editor-matrix.mjs

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
