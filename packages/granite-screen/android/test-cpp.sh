#!/bin/bash
# Build and run host-side C++ unit tests for granite-screen FileReader.
#
# Prerequisites:
#   - CMake >= 3.14
#   - C++17 compiler (clang or gcc)
#   - Internet access (gtest is fetched via CMake FetchContent on first build)
#
# Usage:
#   ./packages/granite-screen/android/test-cpp.sh
#
# The test binary is built in /tmp/granite-screen-test-build.
# Re-running the script will rebuild only changed files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="${SCRIPT_DIR}/src/test/cpp"
BUILD_DIR="/tmp/granite-screen-test-build"

echo "==> Configuring (${SRC_DIR})"
cmake -S "${SRC_DIR}" -B "${BUILD_DIR}" -DCMAKE_BUILD_TYPE=Release 2>&1

echo ""
echo "==> Building"
cmake --build "${BUILD_DIR}" --parallel 2>&1

echo ""
echo "==> Running tests"
ctest --test-dir "${BUILD_DIR}" --output-on-failure -V 2>&1
