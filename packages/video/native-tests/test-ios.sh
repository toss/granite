#!/usr/bin/env bash
set -euo pipefail
: "${IOS_TEST_DESTINATION:?Set IOS_TEST_DESTINATION to an xcodebuild iOS Simulator destination}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
export GRANITE_VIDEO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
NATIVE_TEST_WORK_DIR="${NATIVE_TEST_WORK_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/granite-video-tests.XXXXXX")}"
mkdir -p "$NATIVE_TEST_WORK_DIR"
# Resolve /tmp symlinks before Yarn creates relative portal links.
NATIVE_TEST_WORK_DIR="$(cd "$NATIVE_TEST_WORK_DIR" && pwd -P)"
ruby "$SCRIPT_DIR/prepare-ios.rb" "$NATIVE_TEST_WORK_DIR"
cd "$NATIVE_TEST_WORK_DIR"
# This generated fixture has no checked-in lockfile.
YARN_ENABLE_IMMUTABLE_INSTALLS=false corepack yarn install --mode=skip-build
export NODE_OPTIONS="${NODE_OPTIONS:-} --preserve-symlinks"
cd ios
pod install
xcodebuild test -workspace NativeVideoTests.xcworkspace -scheme GraniteVideo-Unit-ProviderTests \
  -configuration Debug -destination "$IOS_TEST_DESTINATION" \
  -derivedDataPath "$NATIVE_TEST_WORK_DIR/DerivedData" \
  -parallel-testing-enabled NO -jobs 2 CODE_SIGNING_ALLOWED=NO COMPILER_INDEX_STORE_ENABLE=NO "$@"
