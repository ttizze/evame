#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../../.." && pwd)"
lexical_derived_dir="$repo_root/apps/ios/.build/lexical-derived"
lexical_report_dir="$(mktemp -d "${TMPDIR:-/tmp}/evame-lexical-reports.XXXXXX")"
echo "LEXICAL_RUN macOS reports=$lexical_report_dir, DerivedData=$lexical_derived_dir"
cd "$repo_root"
bun install --frozen-lockfile
(cd apps/ios/LexicalProbe && bun install --frozen-lockfile)
bun apps/ios/LexicalProbe/build.mjs
bash scripts/ios.sh generate
xcrun swift build --build-tests --package-path apps/ios/LexicalProbe --disable-automatic-resolution
mac_status=0
EVAME_LEXICAL_REPORT_DIR="$lexical_report_dir" xcrun swift test \
  --package-path apps/ios/LexicalProbe --disable-automatic-resolution --skip-build || mac_status=$?
xcodebuild -project apps/ios/EvameEditorPrototype.xcodeproj -scheme LexicalProbe \
  -destination "${1:?xcodebuild destination is required}" \
  -derivedDataPath "$lexical_derived_dir" \
  -parallel-testing-enabled NO -onlyUsePackageVersionsFromResolvedFile build-for-testing
native_status=0
xcodebuild -project apps/ios/EvameEditorPrototype.xcodeproj -scheme LexicalProbe \
  -destination "${1:?xcodebuild destination is required}" \
  -derivedDataPath "$lexical_derived_dir" \
  -parallel-testing-enabled NO -onlyUsePackageVersionsFromResolvedFile test-without-building || native_status=$?
if [[ "$native_status" != 0 ]]; then exit "$native_status"; fi
exit "$mac_status"
