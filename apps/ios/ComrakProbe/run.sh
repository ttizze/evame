#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
probe_dir="$PWD"
simulator_id="${1:?simulator UUID is required}"
export CARGO_TARGET_DIR="$probe_dir/target"
(cd ../../.. && bun install --frozen-lockfile)

if [[ "$(rustc --version)" != 'rustc 1.98.0 (88d9e12ae 2026-08-18)' ]]; then
  echo 'nix develop .#comrak と rust-toolchain.toml のRustを使ってください。' >&2
  exit 1
fi
xcrun swift-format lint --strict Probe.swift
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
roundtrip_status=0
# 評価対象ライブラリの不一致があっても、別の検証であるSwift/iOS接続まで実行する。
# 最後に元のテスト終了コードを返す。不一致を成功へ変えない。
cargo test --locked || roundtrip_status=$?
cargo run --locked --bin corpus -- ../Tests/EditorCoreTests/Fixtures/Upstream > target/corpus.json
if bun report.mjs target/corpus.json target/report.json; then
  report_status=0
else
  report_status=$?
  # 2は比較の不一致。依存不足・JSON破損など集計自体の失敗は即座に返す。
  if [[ "$report_status" != 2 ]]; then
    exit "$report_status"
  fi
fi

for target in aarch64-apple-darwin aarch64-apple-ios aarch64-apple-ios-sim; do
  cargo build --locked --release --lib --target "$target"
done

for platform in macosx iphonesimulator; do
  sdk_path="$(xcrun --sdk "$platform" --show-sdk-path)"
  if [[ "$platform" == macosx ]]; then
    swift_target=arm64-apple-macos15.0
    rust_target=aarch64-apple-darwin
  else
    swift_target=arm64-apple-ios18.0-simulator
    rust_target=aarch64-apple-ios-sim
  fi
  SDKROOT="$sdk_path" xcrun swiftc -target "$swift_target" -sdk "$sdk_path" \
    -import-objc-header ComrakProbe.h Probe.swift \
    "target/$rust_target/release/libevame_comrak_probe.a" -o "target/ComrakProbe-$platform"
done
target/ComrakProbe-macosx "$probe_dir/target/corpus.json"
xcrun simctl bootstatus "$simulator_id" -b
xcrun simctl spawn "$simulator_id" "$probe_dir/target/ComrakProbe-iphonesimulator" "$probe_dir/target/corpus.json"
if [[ "$roundtrip_status" != 0 ]]; then
  exit "$roundtrip_status"
fi
exit "$report_status"
