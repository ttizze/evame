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
  generate|test|build-for-testing|test-without-building|test-ui-shard) ;;
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
  *) echo 'Usage: bash scripts/ios.sh generate | test|build-for-testing|test-without-building <destination> [xcodebuild options] | test-ui-shard <destination> <index> <count> | comrak-probe <simulator UUID> | test-lexical <destination> | test-textual | test-vditor <destination>' >&2; exit 2 ;;
esac
if [[ "$1" != generate && -z "${2:-}" ]]; then
  echo "$1 にはシミュレータの destination が必要です。" >&2
  exit 2
fi

if [[ "$1" == test-without-building || "$1" == test-ui-shard ]]; then
  test_runs=(apps/ios/DerivedData/Build/Products/*.xctestrun)
  if [[ ${#test_runs[@]} != 1 || ! -f "${test_runs[0]}" ]]; then
    echo 'build-for-testing の成果物が1つ必要です。' >&2
    exit 1
  fi
  test_options=(test-without-building -xctestrun "${test_runs[0]}" -destination "$2" -derivedDataPath apps/ios/DerivedData -parallel-testing-enabled NO)
  if [[ "$1" == test-ui-shard ]]; then
    result_directory=$(mktemp -d apps/ios/DerivedData/ui-shard-XXXXXX)
    enumeration="$result_directory/tests.json"
    filters="$result_directory/filters.txt"
    xcodebuild "${test_options[@]}" -only-testing:EditorUITests -enumerate-tests -test-enumeration-style flat -test-enumeration-format json -test-enumeration-output-path "$enumeration"
    bun scripts/ios-test-shard.mjs "$enumeration" "${3:?shard index is required}" "${4:?shard count is required}" > "$filters"
    selected_tests=()
    while IFS= read -r identifier; do
      selected_tests+=("-only-testing:$identifier")
    done < "$filters"
    xcodebuild "${test_options[@]}" "${selected_tests[@]}" -resultBundlePath "$result_directory/Run.xcresult"
    xcrun xcresulttool get test-results summary --path "$result_directory/Run.xcresult" > "$result_directory/summary.json"
    # shellcheck disable=SC2016 # テンプレート展開はBunが行う。
    bun -e '
      const result = await Bun.file(process.argv[1]).json();
      if (result.passedTests !== Number(process.argv[2]) || result.skippedTests !== 0) {
        throw new Error(`Expected ${process.argv[2]} UI tests, got ${result.passedTests} passed and ${result.skippedTests} skipped`);
      }
    ' "$result_directory/summary.json" "${#selected_tests[@]}"
  else
    xcodebuild "${test_options[@]}" "${@:3}"
  fi
  exit
fi

# LexicalのモデルはPCのエディタと同じ依存をルートのロックファイルから使う。
bun install --frozen-lockfile
bun apps/ios/LexicalModel/build.mjs
bun tests/editor-matrix.mjs

xcodegen generate --spec apps/ios/project.yml
resolved_dir=apps/ios/EvameEditorPrototype.xcodeproj/project.xcworkspace/xcshareddata/swiftpm
mkdir -p "$resolved_dir"
cp apps/ios/Package.resolved "$resolved_dir/Package.resolved"

if [[ "$1" == test || "$1" == build-for-testing ]]; then
  # 旧モデルは比較用のテストだけが使い、アプリには含めない。
  (cd apps/ios/EditorModel && bun install --frozen-lockfile)
  bun apps/ios/EditorModel/build.mjs
  xcrun swift test --package-path apps/ios --disable-automatic-resolution
  xcodebuild \
    -project apps/ios/EvameEditorPrototype.xcodeproj \
    -scheme EvameEditorPrototype \
    -destination "$2" \
    -derivedDataPath apps/ios/DerivedData \
    -parallel-testing-enabled NO \
    -onlyUsePackageVersionsFromResolvedFile \
    "$1" "${@:3}"
fi
