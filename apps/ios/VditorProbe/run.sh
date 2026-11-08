#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$repo_root"
bun install --frozen-lockfile
(cd apps/ios/VditorProbe && bun install --frozen-lockfile)
bun apps/ios/VditorProbe/build.mjs
bunx playwright install chromium webkit
browser_status=0
bunx playwright test --config apps/ios/VditorProbe/playwright.config.mjs || browser_status=$?
bash scripts/ios.sh generate
native_status=0
xcodebuild -project apps/ios/EvameEditorPrototype.xcodeproj -scheme VditorProbe \
  -destination "${1:?xcodebuild destination is required}" \
  -derivedDataPath apps/ios/.build/vditor-derived \
  -parallel-testing-enabled NO -onlyUsePackageVersionsFromResolvedFile test || native_status=$?
if [[ "$native_status" != 0 ]]; then exit "$native_status"; fi
exit "$browser_status"
