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
  generate|test|build-for-testing|test-without-building) ;;
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
  *) echo 'Usage: bash scripts/ios.sh generate | {test|build-for-testing|test-without-building} <destination> [xcodebuild options] | comrak-probe <simulator UUID> | test-lexical <destination> | test-textual | test-vditor <destination>' >&2; exit 2 ;;
esac
if [[ "$1" != generate && -z "${2:-}" ]]; then
  echo "$1 にはシミュレータの destination が必要です。" >&2
  exit 2
fi

if [[ "$1" != test-without-building ]]; then
  # LexicalのモデルはPCのエディタと同じ依存をルートのロックファイルから使う。
  bun install --frozen-lockfile
  bun apps/ios/LexicalModel/build.mjs
  bun tests/editor-matrix.mjs

  xcodegen generate --spec apps/ios/project.yml
  resolved_dir=apps/ios/EvameEditorPrototype.xcodeproj/project.xcworkspace/xcshareddata/swiftpm
  mkdir -p "$resolved_dir"
  cp apps/ios/Package.resolved "$resolved_dir/Package.resolved"
  if [[ "$1" == generate ]]; then exit; fi
  # 旧モデルは比較用のテストだけが使い、アプリには含めない。
  (cd apps/ios/EditorModel && bun install --frozen-lockfile)
  bun apps/ios/EditorModel/build.mjs
  xcrun swift test --package-path apps/ios --disable-automatic-resolution
fi

# UI状態も扱うNativeテストは、従来どおりSimulator上の並列実行を無効にする。
xcodebuild_arguments=(-destination "$2" -parallel-testing-enabled NO)
if [[ "$1" == test-without-building ]]; then
  shopt -s nullglob
  test_runs=(apps/ios/DerivedData/Build/Products/*.xctestrun)
  if [[ "${#test_runs[@]}" != 1 ]]; then
    echo 'Build/Products 内にビルド済みの .xctestrun が一つ必要です。' >&2
    exit 1
  fi
  xcodebuild_arguments+=(-xctestrun "${test_runs[0]}")
else
  xcodebuild_arguments+=(
    -project apps/ios/EvameEditorPrototype.xcodeproj
    -scheme EvameEditorPrototype
    -derivedDataPath apps/ios/DerivedData
    -onlyUsePackageVersionsFromResolvedFile
  )
fi
if [[ "$1" == build-for-testing ]]; then
  xcodebuild "${xcodebuild_arguments[@]}" build-for-testing "${@:3}"
else
  mkdir -p apps/ios/DerivedData
  result_directory=$(mktemp -d apps/ios/DerivedData/test-result-XXXXXX)
  xcodebuild "${xcodebuild_arguments[@]}" "$1" "${@:3}" -resultBundlePath "$result_directory/Run.xcresult"
  xcrun xcresulttool get test-results summary --path "$result_directory/Run.xcresult" > "$result_directory/summary.json"
  # shellcheck disable=SC2016 # テンプレート展開はBunが行う。
  bun -e '
    const result = await Bun.file(process.argv[1]).json();
    if (!(result.passedTests > 0) || result.skippedTests !== 0) {
      throw new Error(`No completed tests or skipped tests: ${result.passedTests} passed, ${result.skippedTests} skipped`);
    }
  ' "$result_directory/summary.json"
fi
