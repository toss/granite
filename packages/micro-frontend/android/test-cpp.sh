#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/src/test/cpp"
BUILD_DIR="/tmp/granite-micro-frontend-test-build"
CMAKE_BIN="${CMAKE_BIN:-cmake}"

"${CMAKE_BIN}" -S "${SOURCE_DIR}" -B "${BUILD_DIR}" -DCMAKE_BUILD_TYPE=Release
"${CMAKE_BIN}" --build "${BUILD_DIR}" --parallel 2
"${CMAKE_BIN}" --build "${BUILD_DIR}" --target test
