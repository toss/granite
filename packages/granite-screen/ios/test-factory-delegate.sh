#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
source_dir="$script_dir/ReactNativeHosting"
fixture_dir="$script_dir/__tests__/factory-delegate"
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/granite-factory-test.XXXXXX")"
trap 'rm -rf "$build_dir"' EXIT

# Exercise both RN's older public flag and RN87's header without that selector.
for legacy in 1 0; do
  output_dir="$build_dir/$legacy"
  mkdir -p "$output_dir"
  for source in "$source_dir/GraniteNativeFactoryDelegate.m" "$fixture_dir/Fixture.m"; do
    xcrun clang -fobjc-arc -fmodules -DGRANITE_TEST_LEGACY_DELEGATE="$legacy" \
      -I "$source_dir" -I "$fixture_dir" \
      -c "$source" -o "$output_dir/$(basename "$source").o"
  done
  xcrun swiftc -I "$fixture_dir" -import-objc-header "$fixture_dir/Fixture.h" \
    -Xcc "-I$source_dir" -Xcc "-DGRANITE_TEST_LEGACY_DELEGATE=$legacy" \
    -module-cache-path "$output_dir/module-cache" \
    "$source_dir/GraniteNativeFactoryDelegateImpl.swift" "$fixture_dir/main.swift" \
    "$output_dir/GraniteNativeFactoryDelegate.m.o" "$output_dir/Fixture.m.o" \
    -framework Foundation -o "$output_dir/test"
  "$output_dir/test"
done
